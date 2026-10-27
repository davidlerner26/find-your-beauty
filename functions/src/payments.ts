import { Firestore } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { CURRENCY, PaymentStatus, toCents } from './shared/domain';

// What this code uses of Stripe, so that the tests can stand in for it. The real client of the `stripe` package has
// all of this (see payments-api.ts).
export type PaymentIntent = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  customer: string | null;
  client_secret?: string | null;
  metadata: Record<string, string>;
};

export type StripePaymentMethod = {
  id: string;
  customer?: string | null;
  card?: { brand: string; last4: string; exp_month: number; exp_year: number };
};

export interface StripeLike {
  customers: {
    create(
      params: { email?: string; name?: string; metadata: Record<string, string> },
      options?: { idempotencyKey?: string },
    ): Promise<{ id: string }>;
  };
  setupIntents: {
    create(params: {
      customer: string;
      usage: 'off_session';
      automatic_payment_methods: { enabled: true };
    }): Promise<{ client_secret: string | null }>;
  };
  paymentMethods: {
    list(params: { customer: string; type: 'card' }): Promise<{ data: StripePaymentMethod[] }>;
    retrieve(id: string): Promise<StripePaymentMethod>;
    detach(id: string): Promise<unknown>;
  };
  paymentIntents: {
    create(
      params: {
        amount: number;
        currency: string;
        customer: string;
        payment_method: string;
        automatic_payment_methods: { enabled: true; allow_redirects: 'never' };
        capture_method: 'manual';
        confirm: true;
        description?: string;
        metadata: Record<string, string>;
      },
      options?: { idempotencyKey?: string },
    ): Promise<PaymentIntent>;
    retrieve(id: string): Promise<PaymentIntent>;
    update(id: string, params: { metadata: Record<string, string> }): Promise<PaymentIntent>;
    capture(id: string): Promise<PaymentIntent>;
    cancel(id: string): Promise<PaymentIntent>;
  };
  refunds: { create(params: { payment_intent: string }): Promise<unknown> };
}

export type Card = { id: string; brand: string; last4: string; expMonth: number; expYear: number };

export type Authorization =
  | { status: 'authorized'; paymentIntentId: string }
  // The bank asks the client to confirm (3D Secure): the browser finishes it with `clientSecret`
  | { status: 'requires_action'; paymentIntentId: string; clientSecret: string }
  | { status: 'failed'; code: string };

// What is wrong with a request, in a way that the callables turn into an answer for the browser
export class PaymentError extends Error {
  constructor(
    readonly code: 'card-not-found' | 'not-yours' | 'not-held',
    message?: string,
  ) {
    super(message ?? code);
  }
}

// A refusal of the card (declined, expired, not enough funds...): not a failure of ours
const cardRefusal = (error: unknown) => {
  const { type, code } = (error ?? {}) as { type?: string; code?: string };
  return type === 'StripeCardError' ? (code ?? 'card_declined') : null;
};

const STILL_HELD = [
  'requires_capture',
  'requires_action',
  'requires_payment_method',
  'requires_confirmation',
];

export class Payments {
  constructor(
    private readonly stripe: StripeLike,
    private readonly db: Firestore,
  ) {}

  // The Stripe customer of a user, made the first time it is needed. The id is kept where only the functions read.
  async customerFor(uid: string, profile: { email?: string | null; name?: string | null }) {
    const ref = this.db.doc(`users/${uid}/private/stripe`);
    const saved = (await ref.get()).data()?.['customerId'] as string | undefined;
    if (saved) return saved;

    const customer = await this.stripe.customers.create(
      {
        ...(profile.email ? { email: profile.email } : {}),
        ...(profile.name ? { name: profile.name } : {}),
        metadata: { uid },
      },
      // The same user asking twice at once gets the same customer
      { idempotencyKey: `customer-${uid}` },
    );
    await ref.set({ customerId: customer.id }, { merge: true });
    return customer.id;
  }

  // The secret that the browser needs to show the card form of Stripe and save the card. The card number is
  // typed in a form of Stripe: it never reaches this server.
  async createCardSetup(uid: string, profile: { email?: string | null; name?: string | null }) {
    const customer = await this.customerFor(uid, profile);
    const setup = await this.stripe.setupIntents.create({
      customer,
      usage: 'off_session',
      // The methods come from the Stripe dashboard (the API no longer takes a list)
      automatic_payment_methods: { enabled: true },
    });
    if (!setup.client_secret) throw new Error('Stripe gave no client secret');
    return { clientSecret: setup.client_secret };
  }

  async listCards(uid: string): Promise<Card[]> {
    const customer = (await this.db.doc(`users/${uid}/private/stripe`).get()).data()?.[
      'customerId'
    ];
    if (!customer) return [];

    const { data } = await this.stripe.paymentMethods.list({ customer, type: 'card' });
    return data.flatMap((method) =>
      method.card
        ? [
            {
              id: method.id,
              brand: method.card.brand,
              last4: method.card.last4,
              expMonth: method.card.exp_month,
              expYear: method.card.exp_year,
            },
          ]
        : [],
    );
  }

  // A card that belongs to the user (and only one of theirs)
  private async ownCard(uid: string, paymentMethodId: string) {
    const customer = (await this.db.doc(`users/${uid}/private/stripe`).get()).data()?.[
      'customerId'
    ];
    if (!customer) throw new PaymentError('card-not-found');

    const method = await this.stripe.paymentMethods.retrieve(paymentMethodId).catch(() => null);
    if (!method) throw new PaymentError('card-not-found');
    if (method.customer !== customer) throw new PaymentError('not-yours');
    return { customer, method };
  }

  async removeCard(uid: string, paymentMethodId: string) {
    await this.ownCard(uid, paymentMethodId);
    await this.stripe.paymentMethods.detach(paymentMethodId);
  }

  // Holds the amount on the card (nothing is taken yet). `attemptId` makes a retry of the same click harmless.
  async authorize(
    uid: string,
    request: {
      paymentMethodId: string;
      // In reais, calculated by the server from the services of the professional
      total: number;
      attemptId: string;
      description: string;
    },
  ): Promise<Authorization> {
    const { customer } = await this.ownCard(uid, request.paymentMethodId);

    try {
      const intent = await this.stripe.paymentIntents.create(
        {
          amount: toCents(request.total),
          currency: CURRENCY,
          customer,
          payment_method: request.paymentMethodId,
          automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
          capture_method: 'manual',
          confirm: true,
          description: request.description,
          metadata: { uid },
        },
        { idempotencyKey: `authorize-${uid}-${request.attemptId}` },
      );
      return this.describe(intent);
    } catch (error) {
      const code = cardRefusal(error);
      if (code) return { status: 'failed', code };
      throw error;
    }
  }

  // The browser finished the confirmation that the bank asked for: what became of the hold?
  async confirmAuthorization(uid: string, paymentIntentId: string): Promise<Authorization> {
    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.metadata['uid'] !== uid) throw new PaymentError('not-yours');
    return this.describe(intent);
  }

  private describe(intent: PaymentIntent): Authorization {
    if (intent.status === 'requires_capture') {
      return { status: 'authorized', paymentIntentId: intent.id };
    }
    if (intent.status === 'requires_action' && intent.client_secret) {
      return {
        status: 'requires_action',
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret,
      };
    }
    return { status: 'failed', code: 'card_declined' };
  }

  // The client gave up (the time was taken, or they left): the hold is lifted. Only the owner can do it.
  async cancelAuthorization(uid: string, paymentIntentId: string) {
    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.metadata['uid'] !== uid) throw new PaymentError('not-yours');
    if (intent.metadata['bookingId'])
      throw new PaymentError('not-held', 'The hold belongs to a booking');
    if (STILL_HELD.includes(intent.status)) await this.stripe.paymentIntents.cancel(intent.id);
  }

  // Is this hold the one for this booking? The browser says which hold it made: the server checks that it is the
  // client's own, for the right amount, still held, and not used by another booking.
  async verifyForBooking(
    booking: { clientUid: string; total: number; paymentIntentId?: string },
    bookingId: string,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!booking.paymentIntentId) return { ok: false, reason: 'no-payment' };

    const intent = await this.stripe.paymentIntents
      .retrieve(booking.paymentIntentId)
      .catch(() => null);
    if (!intent) return { ok: false, reason: 'unknown-payment' };
    if (intent.metadata['uid'] !== booking.clientUid)
      return { ok: false, reason: 'not-the-client' };
    if (intent.metadata['bookingId'] && intent.metadata['bookingId'] !== bookingId) {
      return { ok: false, reason: 'used-by-another-booking' };
    }
    if (intent.currency !== CURRENCY || intent.amount !== toCents(booking.total)) {
      return { ok: false, reason: 'wrong-amount' };
    }
    if (intent.status !== 'requires_capture') return { ok: false, reason: 'not-held' };

    await this.stripe.paymentIntents.update(intent.id, { metadata: { bookingId } });
    return { ok: true };
  }

  // The professional accepted: the held amount is taken
  async capture(paymentIntentId: string): Promise<PaymentStatus> {
    try {
      const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status === 'succeeded') return 'paid';
      if (intent.status !== 'requires_capture') return 'failed';

      const captured = await this.stripe.paymentIntents.capture(paymentIntentId);
      return captured.status === 'succeeded' ? 'paid' : 'failed';
    } catch (error) {
      logger.error('Capturing the payment failed', { paymentIntentId, error });
      return 'failed';
    }
  }

  // The booking will not happen: a hold is lifted, and money that was already taken is given back in full.
  // null when it could not be done (the hold then ends by itself in a few days).
  async release(paymentIntentId: string): Promise<PaymentStatus | null> {
    try {
      const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status === 'canceled') return 'released';
      if (intent.status === 'succeeded') {
        await this.stripe.refunds.create({ payment_intent: paymentIntentId });
        return 'refunded';
      }
      if (STILL_HELD.includes(intent.status)) {
        await this.stripe.paymentIntents.cancel(paymentIntentId);
        return 'released';
      }
      return null;
    } catch (error) {
      logger.error('Releasing the payment failed', { paymentIntentId, error });
      return null;
    }
  }
}
