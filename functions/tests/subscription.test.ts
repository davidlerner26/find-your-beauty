import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  GRACE_MS,
  isProNow,
  periodEndOf,
  SubscriptionError,
  Subscriptions,
} from '../src/subscription';
import { fakeBillingStripe } from './fake-billing-stripe';

// Runs against the Firestore emulator (npm run test:functions)
initializeApp({ projectId: 'demo-find-your-beauty' });
const db = getFirestore();

const clearAll = async () => {
  const response = await fetch(
    `http://${process.env['FIRESTORE_EMULATOR_HOST']}/emulator/v1/projects/demo-find-your-beauty/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  expect(response.ok).toBe(true);
};

const profile = { email: 'ana@example.com', name: 'Ana' };
const DAY = 86_400_000;

let fake: ReturnType<typeof fakeBillingStripe>;
let subs: Subscriptions;

beforeEach(async () => {
  await clearAll();
  fake = fakeBillingStripe();
  subs = new Subscriptions(fake.stripe, db, {
    priceId: 'price_pro',
    appUrl: 'https://dev.findyourbeauty.com.br',
  });
  await db.doc('professionals/p1').set({ name: 'Ana', approved: true, pro: false });
});

const publicProfile = async () => (await db.doc('professionals/p1').get()).data()!;
const billing = async () => (await db.doc('professionals/p1/private/billing').get()).data()!;
const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return null;
};

describe('isProNow', () => {
  const now = Date.now();

  it('is for a subscription that Stripe is charging, or retrying', () => {
    for (const status of ['active', 'trialing', 'past_due']) {
      expect(isProNow(status, now + DAY, now)).toBe(true);
    }
  });

  it('is not for a subscription that ended, or never got paid', () => {
    for (const status of ['canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused']) {
      expect(isProNow(status, now + DAY, now)).toBe(false);
    }
  });

  it('keeps a few days after the end of the period while the renewal is retried, not longer', () => {
    expect(isProNow('past_due', now - GRACE_MS + DAY, now)).toBe(true);
    expect(isProNow('past_due', now - GRACE_MS - DAY, now)).toBe(false);
  });

  it('trusts the status when Stripe said no end date', () => {
    expect(isProNow('active', null, now)).toBe(true);
  });
});

describe('periodEndOf', () => {
  it('reads the end of the period from the items (newer API) or from the subscription (older)', () => {
    const base = fake.subscription('p1', { current_period_end: undefined });
    expect(periodEndOf({ ...base, items: { data: [{ current_period_end: 100 }] } })).toBe(100_000);
    expect(periodEndOf({ ...base, current_period_end: 200 })).toBe(200_000);
    expect(periodEndOf(base)).toBeNull();
  });
});

describe('subscribing', () => {
  it('makes the Stripe customer once and keeps its id where only the functions read', async () => {
    const first = await subs.customerFor('p1', profile);
    const second = await subs.customerFor('p1', profile);

    expect(second).toBe(first);
    expect(fake.calls.customerCreate).toBe(1);
    expect((await billing())['customerId']).toBe(first);
  });

  it('sends the professional to the checkout of Stripe, with her id on the subscription', async () => {
    const { url } = await subs.checkout('p1', profile);

    expect(url).toContain('https://checkout.stripe.test/');
    expect(fake.calls.checkout).toBe(1);
  });

  it('refuses when there is no price configured', async () => {
    const without = new Subscriptions(fake.stripe, db, { priceId: '', appUrl: 'https://x.test' });

    const error = await rejection(without.checkout('p1', profile));

    expect(error).toBeInstanceOf(SubscriptionError);
    expect((error as SubscriptionError).code).toBe('no-price');
    expect(fake.calls.checkout).toBe(0);
  });

  it('does not let who already subscribes subscribe twice', async () => {
    fake.put(fake.subscription('p1'));
    await subs.handleEvent(
      fake.event('customer.subscription.updated', { ...fake.subscription('p1') }),
    );

    const error = await rejection(subs.checkout('p1', profile));

    expect((error as SubscriptionError).code).toBe('already-subscribed');
  });

  it('opens the portal only for who has a customer', async () => {
    expect(((await rejection(subs.portal('p1'))) as SubscriptionError).code).toBe(
      'no-subscription',
    );

    await subs.customerFor('p1', profile);
    const { url } = await subs.portal('p1');

    expect(url).toContain('https://billing.stripe.test/');
  });
});

describe('what Stripe says', () => {
  it('turns Pro on when the checkout is completed, and keeps the data of Stripe private', async () => {
    fake.put(fake.subscription('p1', { customer: 'cus_9' }));

    const change = await subs.handleEvent(
      fake.event('checkout.session.completed', {
        mode: 'subscription',
        subscription: 'sub_1',
      }),
    );

    expect(change).toMatchObject({ uid: 'p1', pro: true, wasPro: false, applied: true });
    const open = await publicProfile();
    expect(open['pro']).toBe(true);
    expect(open['proUntil']).toBeInstanceOf(Timestamp);
    // Nothing of Stripe goes to the public document
    expect(JSON.stringify(open)).not.toContain('cus_9');
    expect((await billing())['customerId']).toBe('cus_9');
    expect((await billing())['status']).toBe('active');
  });

  it('ignores a checkout that is not a subscription, or a subscription that is not from a professional', async () => {
    expect(
      await subs.handleEvent(fake.event('checkout.session.completed', { mode: 'payment' })),
    ).toBeNull();
    expect(
      await subs.handleEvent(
        fake.event('customer.subscription.updated', { ...fake.subscription('p1'), metadata: {} }),
      ),
    ).toBeNull();
    expect(await subs.handleEvent(fake.event('invoice.paid', {}))).toBeNull();
    expect((await publicProfile())['pro']).toBe(false);
  });

  it('keeps the benefits of a subscription cancelled to the end of the period, until it ends', async () => {
    const active = fake.subscription('p1', { cancel_at_period_end: true });
    await subs.handleEvent(fake.event('customer.subscription.updated', { ...active }));

    expect((await publicProfile())['pro']).toBe(true);
    expect((await billing())['cancelAtPeriodEnd']).toBe(true);

    const ended = await subs.handleEvent(
      fake.event(
        'customer.subscription.deleted',
        { ...active, status: 'canceled' },
        Math.floor(Date.now() / 1000) + 5,
      ),
    );

    expect(ended).toMatchObject({ pro: false, wasPro: true, applied: true });
    expect((await publicProfile())['pro']).toBe(false);
  });

  it('tells a renewal that failed (past_due) from the first time, for the e-mail', async () => {
    const t = Math.floor(Date.now() / 1000);
    await subs.handleEvent(
      fake.event('customer.subscription.updated', { ...fake.subscription('p1') }, t),
    );

    const failed = await subs.handleEvent(
      fake.event(
        'customer.subscription.updated',
        { ...fake.subscription('p1', { status: 'past_due' }) },
        t + 1,
      ),
    );

    expect(failed).toMatchObject({ status: 'past_due', previousStatus: 'active', pro: true });
  });

  it('ignores an event older than the one already applied', async () => {
    const t = Math.floor(Date.now() / 1000);
    await subs.handleEvent(
      fake.event(
        'customer.subscription.updated',
        { ...fake.subscription('p1', { status: 'canceled' }) },
        t,
      ),
    );

    const late = await subs.handleEvent(
      fake.event('customer.subscription.updated', { ...fake.subscription('p1') }, t - 60),
    );

    expect(late).toMatchObject({ applied: false });
    expect((await publicProfile())['pro']).toBe(false);
    expect((await billing())['status']).toBe('canceled');
  });

  it('applying the same event twice changes nothing more', async () => {
    const event = fake.event('customer.subscription.updated', { ...fake.subscription('p1') });

    await subs.handleEvent(event);
    const again = await subs.handleEvent(event);

    expect(again).toMatchObject({ pro: true, wasPro: true });
    expect((await publicProfile())['pro']).toBe(true);
  });

  it('does not bring a deleted profile back', async () => {
    await db.doc('professionals/p1').delete();

    await subs.handleEvent(
      fake.event('customer.subscription.updated', { ...fake.subscription('p1') }),
    );

    expect((await db.doc('professionals/p1').get()).exists).toBe(false);
  });

  it('refuses a webhook with a bad signature, and reads one with a good signature', () => {
    const body = JSON.stringify(fake.event('invoice.paid', {}));

    expect(() => subs.readEvent(body, 'forged', 'whsec_x')).toThrow('Bad signature');
    expect(subs.readEvent(body, 'valid-signature', 'whsec_x').type).toBe('invoice.paid');
  });
});

describe('the nightly job', () => {
  const setPro = (until: number | null) =>
    db.doc('professionals/p1').update({
      pro: true,
      proUntil: until === null ? null : Timestamp.fromMillis(until),
    });

  it('turns off who passed the end of the period and the days of grace', async () => {
    await setPro(Date.now() - GRACE_MS - DAY);

    expect(await subs.reconcile()).toEqual(['p1']);
    expect((await publicProfile())['pro']).toBe(false);
  });

  it('leaves alone who is still inside the period, or inside the days of grace', async () => {
    await setPro(Date.now() + DAY);
    expect(await subs.reconcile()).toEqual([]);

    await setPro(Date.now() - DAY);
    expect(await subs.reconcile()).toEqual([]);
    expect((await publicProfile())['pro']).toBe(true);
  });

  it('leaves alone who has no end date: Stripe never said, it is not for the job to decide', async () => {
    await setPro(null);

    expect(await subs.reconcile()).toEqual([]);
  });
});

describe('deleting the account', () => {
  it('cancels the subscription and removes the customer at Stripe', async () => {
    fake.put(fake.subscription('p1'));
    await subs.handleEvent(
      fake.event('customer.subscription.updated', { ...fake.subscription('p1') }),
    );

    expect(await subs.deleteAccount('p1')).toBe(true);

    expect(fake.cancelled).toEqual(['sub_1']);
    expect(fake.deletedCustomers).toEqual(['cus_1']);
  });

  it('has nothing to do for who never subscribed', async () => {
    expect(await subs.deleteAccount('p1')).toBe(false);
    expect(fake.cancelled).toEqual([]);
  });

  it('is not stopped by something that is already gone at Stripe', async () => {
    // The subscription is not at Stripe any more (cancel answers resource_missing)
    await db
      .doc('professionals/p1/private/billing')
      .set({ customerId: 'cus_1', subscriptionId: 'sub_gone' });

    expect(await subs.deleteAccount('p1')).toBe(true);
    expect(fake.deletedCustomers).toEqual(['cus_1']);
  });
});
