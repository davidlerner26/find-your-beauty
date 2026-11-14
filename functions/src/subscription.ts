import { Firestore, Timestamp } from 'firebase-admin/firestore';

// What this code uses of Stripe Billing, so that the tests can stand in for it (the real client of the `stripe`
// package has all of this, see subscription-api.ts). The Pro subscription of the professionals: see
// docs/assinatura-pro.md.
export type StripeSubscription = {
  id: string;
  status: string;
  customer: string;
  cancel_at_period_end: boolean;
  // Seconds. Newer versions of the API keep it on the items, older ones on the subscription
  current_period_end?: number;
  items?: { data: { current_period_end?: number; price?: { id: string } }[] };
  metadata: Record<string, string>;
};

export type StripeEvent = {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
};

export interface BillingStripeLike {
  customers: {
    create(
      params: { email?: string; name?: string; metadata: Record<string, string> },
      options?: { idempotencyKey?: string },
    ): Promise<{ id: string }>;
    del(id: string): Promise<unknown>;
  };
  checkout: {
    sessions: {
      create(params: {
        mode: 'subscription';
        customer: string;
        line_items: { price: string; quantity: number }[];
        success_url: string;
        cancel_url: string;
        client_reference_id: string;
        allow_promotion_codes: boolean;
        subscription_data: { metadata: Record<string, string> };
      }): Promise<{ id: string; url: string | null }>;
    };
  };
  billingPortal: {
    sessions: {
      create(params: { customer: string; return_url: string }): Promise<{ url: string }>;
    };
  };
  subscriptions: {
    retrieve(id: string): Promise<StripeSubscription>;
    cancel(id: string): Promise<unknown>;
  };
  webhooks: {
    constructEvent(payload: Buffer | string, signature: string, secret: string): StripeEvent;
  };
}

// What is wrong with a request, in a way that the callables turn into an answer for the browser
export class SubscriptionError extends Error {
  constructor(readonly code: 'already-subscribed' | 'no-subscription' | 'no-price') {
    super(code);
  }
}

// The subscription gives the benefits while Stripe is charging it (or retrying the charge): `past_due` is a renewal
// that failed, and it keeps them for a few days after the period ended (Stripe tries the card again meanwhile).
const PRO_STATUSES = ['active', 'trialing', 'past_due'];
export const GRACE_MS = 3 * 86_400_000;

// Does a subscription in this state give the Pro benefits at `now`?
export const isProNow = (status: string, periodEnd: number | null, now: number) =>
  PRO_STATUSES.includes(status) && (periodEnd === null || now < periodEnd + GRACE_MS);

// The end of the paid period in milliseconds (null when Stripe did not say)
export const periodEndOf = (subscription: StripeSubscription) => {
  const seconds =
    subscription.items?.data[0]?.current_period_end ?? subscription.current_period_end;
  return typeof seconds === 'number' ? seconds * 1000 : null;
};

// What changed for the professional when a state of Stripe was applied (the e-mails depend on it)
export type Change = {
  uid: string;
  pro: boolean;
  wasPro: boolean;
  status: string;
  previousStatus: string | null;
  // False when the event was older than what was already applied
  applied: boolean;
};

export class Subscriptions {
  constructor(
    private readonly stripe: BillingStripeLike,
    private readonly db: Firestore,
    private readonly config: { priceId: string; appUrl: string },
  ) {}

  // Where the data of Stripe is kept: only the Cloud Functions read it (no rule opens `private`)
  private billing(uid: string) {
    return this.db.doc(`professionals/${uid}/private/billing`);
  }

  // The Stripe customer of a professional, made the first time it is needed
  async customerFor(uid: string, profile: { email?: string | null; name?: string | null }) {
    const ref = this.billing(uid);
    const saved = (await ref.get()).data()?.['customerId'] as string | undefined;
    if (saved) return saved;

    const customer = await this.stripe.customers.create(
      {
        ...(profile.email ? { email: profile.email } : {}),
        ...(profile.name ? { name: profile.name } : {}),
        metadata: { uid },
      },
      // The same professional asking twice at once gets the same customer
      { idempotencyKey: `pro-customer-${uid}` },
    );
    await ref.set({ customerId: customer.id }, { merge: true });
    return customer.id;
  }

  // The page of Stripe where she subscribes. The card number is typed there: it never reaches us.
  async checkout(uid: string, profile: { email?: string | null; name?: string | null }) {
    if (!this.config.priceId) throw new SubscriptionError('no-price');
    const status = (await this.billing(uid).get()).data()?.['status'] as string | undefined;
    if (status && isProNow(status, null, Date.now()))
      throw new SubscriptionError('already-subscribed');

    const customer = await this.customerFor(uid, profile);
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      line_items: [{ price: this.config.priceId, quantity: 1 }],
      success_url: `${this.config.appUrl}/pro/assinatura?assinatura=ok`,
      cancel_url: `${this.config.appUrl}/pro/assinatura`,
      client_reference_id: uid,
      allow_promotion_codes: true,
      // The webhook finds the professional by this
      subscription_data: { metadata: { uid } },
    });
    if (!session.url) throw new Error('Stripe gave no checkout address');
    return { url: session.url };
  }

  // The page of Stripe where she changes the card, sees the invoices and cancels
  async portal(uid: string) {
    const customer = (await this.billing(uid).get()).data()?.['customerId'] as string | undefined;
    if (!customer) throw new SubscriptionError('no-subscription');
    const session = await this.stripe.billingPortal.sessions.create({
      customer,
      return_url: `${this.config.appUrl}/pro/assinatura`,
    });
    return { url: session.url };
  }

  // What the page of the subscription shows. Read here because the Stripe data is private.
  async statusOf(uid: string) {
    const data = (await this.billing(uid).get()).data();
    if (!data?.['status']) return { subscribed: false as const };
    const periodEnd = (data['periodEnd'] as Timestamp | undefined)?.toMillis() ?? null;
    return {
      subscribed: true as const,
      status: data['status'] as string,
      pro: isProNow(data['status'] as string, periodEnd, Date.now()),
      periodEndMillis: periodEnd,
      cancelAtPeriodEnd: data['cancelAtPeriodEnd'] === true,
    };
  }

  // Checks the signature of the webhook (a forged call throws) and reads the event
  readEvent(payload: Buffer | string, signature: string, secret: string) {
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }

  // Applies what Stripe said. Returns what changed, or null when the event is not about a professional of ours.
  async handleEvent(event: StripeEvent): Promise<Change | null> {
    let subscription: StripeSubscription | null = null;
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as { mode?: string; subscription?: string | null };
      if (session.mode !== 'subscription' || !session.subscription) return null;
      subscription = await this.stripe.subscriptions.retrieve(session.subscription);
    } else if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      subscription = event.data.object as unknown as StripeSubscription;
    }
    if (!subscription) return null;

    const uid = subscription.metadata?.['uid'];
    if (!uid) return null;
    return this.apply(uid, subscription, event.created * 1000);
  }

  // Writes the state of the subscription: the private data and the `pro` of the public profile. An event older than
  // the one already applied is ignored (Stripe does not promise the order).
  private async apply(
    uid: string,
    subscription: StripeSubscription,
    eventAt: number,
  ): Promise<Change> {
    const periodEnd = periodEndOf(subscription);
    const now = Date.now();
    const pro = isProNow(subscription.status, periodEnd, now);
    const billing = this.billing(uid);
    const profile = this.db.doc(`professionals/${uid}`);

    return this.db.runTransaction(async (transaction) => {
      const [saved, existing] = await Promise.all([
        transaction.get(billing),
        transaction.get(profile),
      ]);
      const data = saved.data() ?? {};
      const previousStatus = (data['status'] as string | undefined) ?? null;
      const wasPro = existing.data()?.['pro'] === true;
      const change: Change = {
        uid,
        pro,
        wasPro,
        status: subscription.status,
        previousStatus,
        applied: false,
      };
      if (typeof data['eventAt'] === 'number' && data['eventAt'] > eventAt) return change;

      transaction.set(
        billing,
        {
          customerId: subscription.customer,
          subscriptionId: subscription.id,
          status: subscription.status,
          priceId: subscription.items?.data[0]?.price?.id ?? null,
          periodEnd: periodEnd === null ? null : Timestamp.fromMillis(periodEnd),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          eventAt,
        },
        { merge: true },
      );
      // The profile may be gone (the account was deleted while Stripe was still talking)
      if (existing.exists) {
        transaction.update(profile, {
          pro,
          proUntil: periodEnd === null ? null : Timestamp.fromMillis(periodEnd),
        });
      }
      return { ...change, applied: true };
    });
  }

  // Safety net, every night: a subscription whose period ended and that nobody renewed or cancelled (a webhook that
  // was lost) stops giving the benefits. Returns the professionals that were turned off.
  async reconcile(now = Date.now()) {
    const found = await this.db.collection('professionals').where('pro', '==', true).get();
    const off: string[] = [];
    for (const professional of found.docs) {
      const until = (professional.data()['proUntil'] as Timestamp | null | undefined)?.toMillis();
      // No end date: Stripe never said, so it is not for us to decide
      if (!until || now < until + GRACE_MS) continue;
      await professional.ref.update({ pro: false });
      off.push(professional.id);
    }
    return off;
  }

  // The subscription and the customer of Stripe go away with the account. Nothing to do for a professional that never
  // subscribed; something already gone at Stripe is not a failure. Any other failure stops the deletion.
  async deleteAccount(uid: string) {
    const data = (await this.billing(uid).get()).data();
    if (!data) return false;
    const gone = (error: unknown) => (error as { code?: string }).code === 'resource_missing';

    const subscriptionId = data['subscriptionId'] as string | undefined;
    if (subscriptionId) {
      await this.stripe.subscriptions.cancel(subscriptionId).catch((error) => {
        if (!gone(error)) throw error;
      });
    }
    const customerId = data['customerId'] as string | undefined;
    if (customerId) {
      await this.stripe.customers.del(customerId).catch((error) => {
        if (!gone(error)) throw error;
      });
    }
    return true;
  }
}
