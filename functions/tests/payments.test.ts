import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it } from 'vitest';
import { PaymentError, Payments } from '../src/payments';
import { fakeStripe } from './fake-stripe';

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

const profile = { email: 'maria@example.com', name: 'Maria' };

let fake: ReturnType<typeof fakeStripe>;
let payments: Payments;

beforeEach(async () => {
  await clearAll();
  fake = fakeStripe();
  payments = new Payments(fake.stripe, db);
});

// A user that already has a customer and a saved card
const withCard = async (uid = 'u1') => {
  const customer = await payments.customerFor(uid, profile);
  return { customer, card: fake.addCard(customer) };
};

const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return null;
};

describe('customers and cards', () => {
  it('makes the Stripe customer once and keeps its id where only the functions read', async () => {
    const first = await payments.customerFor('u1', profile);
    const second = await payments.customerFor('u1', profile);

    expect(second).toBe(first);
    expect(fake.calls.customerCreate).toBe(1);
    expect((await db.doc('users/u1/private/stripe').get()).data()).toEqual({ customerId: first });
  });

  it('two requests at the same time get the same customer', async () => {
    const [a, b] = await Promise.all([
      payments.customerFor('u1', profile),
      payments.customerFor('u1', profile),
    ]);
    expect(a).toBe(b);
    expect(fake.calls.customerCreate).toBe(1);
  });

  it('gives the browser the secret to save a card, and has no cards before one is saved', async () => {
    expect(await payments.listCards('u1')).toEqual([]);
    expect(await payments.createCardSetup('u1', profile)).toEqual({
      clientSecret: 'seti_secret_123',
    });
  });

  it('lists only what is safe to show of a card', async () => {
    const { card } = await withCard();
    expect(await payments.listCards('u1')).toEqual([
      { id: card, brand: 'visa', last4: '4242', expMonth: 12, expYear: 2099 },
    ]);
  });

  it("does not list or remove another user's card", async () => {
    await withCard('u1');
    const other = await payments.customerFor('u2', profile);
    const theirs = fake.addCard(other);

    expect(await payments.listCards('u1')).toHaveLength(1);
    expect(await rejection(payments.removeCard('u1', theirs))).toMatchObject({ code: 'not-yours' });
    expect(fake.methods.has(theirs)).toBe(true);
  });

  it('removes a card of the user, and says so for one that does not exist', async () => {
    const { card } = await withCard();
    await payments.removeCard('u1', card);
    expect(await payments.listCards('u1')).toEqual([]);

    expect(await rejection(payments.removeCard('u1', 'pm_nope'))).toBeInstanceOf(PaymentError);
    expect(await rejection(payments.removeCard('nobody', 'pm_nope'))).toMatchObject({
      code: 'card-not-found',
    });
  });
});

describe('authorize', () => {
  const request = (paymentMethodId: string, total = 100, attemptId = 'a1') => ({
    paymentMethodId,
    total,
    attemptId,
    description: 'Maquiagem com Ana',
  });

  it('holds the amount in centavos, in reais, without taking it', async () => {
    const { card } = await withCard();
    const result = await payments.authorize('u1', request(card, 0.1 + 0.2));

    expect(result).toEqual({ status: 'authorized', paymentIntentId: 'pi_1' });
    expect(fake.intents.get('pi_1')).toMatchObject({
      amount: 30,
      currency: 'brl',
      status: 'requires_capture',
      metadata: { uid: 'u1' },
    });
  });

  it('a refused card is an answer, not an error', async () => {
    await withCard();
    const customer = await payments.customerFor('u1', profile);
    const declined = fake.addCard(customer, 'pm_declined');

    expect(await payments.authorize('u1', request(declined))).toEqual({
      status: 'failed',
      code: 'card_declined',
    });
  });

  it('hands over the secret when the bank asks to confirm (3D Secure)', async () => {
    await withCard();
    const customer = await payments.customerFor('u1', profile);
    const needsBank = fake.addCard(customer, 'pm_3ds');

    expect(await payments.authorize('u1', request(needsBank))).toEqual({
      status: 'requires_action',
      paymentIntentId: 'pi_1',
      clientSecret: 'pi_1_secret',
    });
  });

  it("refuses another user's card and holds nothing", async () => {
    await withCard('u1');
    const other = await payments.customerFor('u2', profile);
    const theirs = fake.addCard(other);

    expect(await rejection(payments.authorize('u1', request(theirs)))).toMatchObject({
      code: 'not-yours',
    });
    expect(fake.calls.intentCreate).toBe(0);
  });

  it('the same attempt twice (a double click) holds the amount once', async () => {
    const { card } = await withCard();
    const first = await payments.authorize('u1', request(card, 100, 'same'));
    const second = await payments.authorize('u1', request(card, 100, 'same'));

    expect(second).toEqual(first);
    expect(fake.calls.intentCreate).toBe(1);
  });

  it('an error that is not of the card is not hidden', async () => {
    const { card } = await withCard();
    fake.state.failNext = new Error('Stripe is down');
    expect(await rejection(payments.authorize('u1', request(card)))).toMatchObject({
      message: 'Stripe is down',
    });
  });

  it('confirms what became of a hold after the bank step, for its owner only', async () => {
    const { card } = await withCard();
    await payments.authorize('u1', request(card));

    expect(await payments.confirmAuthorization('u1', 'pi_1')).toEqual({
      status: 'authorized',
      paymentIntentId: 'pi_1',
    });
    expect(await rejection(payments.confirmAuthorization('u2', 'pi_1'))).toMatchObject({
      code: 'not-yours',
    });
  });
});

describe('cancelAuthorization', () => {
  it('lifts a hold of the client that gave up', async () => {
    const { card } = await withCard();
    await payments.authorize('u1', {
      paymentMethodId: card,
      total: 50,
      attemptId: 'a',
      description: 'x',
    });

    await payments.cancelAuthorization('u1', 'pi_1');
    expect(fake.intents.get('pi_1')?.status).toBe('canceled');
  });

  it('a stranger cannot lift it, and neither can a hold that already belongs to a booking', async () => {
    const { card } = await withCard();
    await payments.authorize('u1', {
      paymentMethodId: card,
      total: 50,
      attemptId: 'a',
      description: 'x',
    });

    expect(await rejection(payments.cancelAuthorization('u2', 'pi_1'))).toMatchObject({
      code: 'not-yours',
    });

    await payments.verifyForBooking({ clientUid: 'u1', total: 50, paymentIntentId: 'pi_1' }, 'b1');
    expect(await rejection(payments.cancelAuthorization('u1', 'pi_1'))).toMatchObject({
      code: 'not-held',
    });
    expect(fake.intents.get('pi_1')?.status).toBe('requires_capture');
  });
});

describe('verifyForBooking', () => {
  const hold = async (total = 100) => {
    const { card } = await withCard();
    await payments.authorize('u1', {
      paymentMethodId: card,
      total,
      attemptId: 'a',
      description: 'x',
    });
  };
  const booking = (overrides = {}) => ({
    clientUid: 'u1',
    total: 100,
    paymentIntentId: 'pi_1',
    ...overrides,
  });

  it('accepts the hold of the client for the right amount, and ties it to the booking', async () => {
    await hold();
    expect(await payments.verifyForBooking(booking(), 'b1')).toEqual({ ok: true });
    expect(fake.intents.get('pi_1')?.metadata['bookingId']).toBe('b1');
    // The same booking asking again is fine (a retry of the trigger)
    expect(await payments.verifyForBooking(booking(), 'b1')).toEqual({ ok: true });
  });

  it.each([
    ['a booking with no payment', { paymentIntentId: undefined }, 'no-payment'],
    ['a payment that does not exist', { paymentIntentId: 'pi_999' }, 'unknown-payment'],
    ['the hold of someone else', { clientUid: 'u2' }, 'not-the-client'],
    ['a different amount (the total was changed)', { total: 1 }, 'wrong-amount'],
  ])('refuses %s', async (_name, overrides, reason) => {
    await hold();
    expect(await payments.verifyForBooking(booking(overrides), 'b1')).toEqual({
      ok: false,
      reason,
    });
  });

  it('refuses a hold that was lifted, and one that another booking already uses', async () => {
    await hold();
    await payments.verifyForBooking(booking(), 'b1');
    expect(await payments.verifyForBooking(booking(), 'b2')).toEqual({
      ok: false,
      reason: 'used-by-another-booking',
    });

    fake.intents.get('pi_1')!.status = 'canceled';
    fake.intents.get('pi_1')!.metadata = { uid: 'u1' };
    expect(await payments.verifyForBooking(booking(), 'b3')).toEqual({
      ok: false,
      reason: 'not-held',
    });
  });
});

describe('capture and release', () => {
  const held = async () => {
    const { card } = await withCard();
    await payments.authorize('u1', {
      paymentMethodId: card,
      total: 80,
      attemptId: 'a',
      description: 'x',
    });
    return 'pi_1';
  };

  it('takes the held amount when the professional accepts', async () => {
    const id = await held();
    expect(await payments.capture(id)).toBe('paid');
    expect(fake.intents.get(id)?.status).toBe('succeeded');
    // A retry finds it paid already
    expect(await payments.capture(id)).toBe('paid');
  });

  it('fails when the hold is gone or the bank refuses at that moment', async () => {
    const id = await held();
    fake.intents.get(id)!.status = 'canceled';
    expect(await payments.capture(id)).toBe('failed');

    const second = await held();
    fake.state.failNext = new Error('card_declined');
    expect(await payments.capture(second)).toBe('failed');
    expect(await payments.capture('pi_unknown')).toBe('failed');
  });

  it('lifts a hold that was not taken: nothing is charged and nothing is refunded', async () => {
    const id = await held();
    expect(await payments.release(id)).toBe('released');
    expect(fake.intents.get(id)?.status).toBe('canceled');
    expect(fake.refunded).toEqual([]);
    expect(await payments.release(id)).toBe('released');
  });

  it('gives back in full what was already taken', async () => {
    const id = await held();
    await payments.capture(id);
    expect(await payments.release(id)).toBe('refunded');
    expect(fake.refunded).toEqual([id]);
  });

  it('says nothing could be done when Stripe fails, so the status is left as it was', async () => {
    const id = await held();
    fake.state.failNext = new Error('Stripe is down');
    expect(await payments.release(id)).toBeNull();
    expect(await payments.release('pi_unknown')).toBeNull();
  });
});
