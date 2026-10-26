import { StripePayments } from './stripe-payments';

// The Cloud Functions and Stripe.js are replaced: each callable answers what the test says
const answers = vi.hoisted(() => ({
  byName: {} as Record<string, (data: unknown) => unknown>,
  calls: [] as { name: string; data: unknown }[],
  handleNextAction: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  connectFunctionsEmulator: () => undefined,
  httpsCallable: (_functions: unknown, name: string) => async (data: unknown) => {
    answers.calls.push({ name, data });
    return { data: answers.byName[name](data) };
  },
}));
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: async () => ({ handleNextAction: answers.handleNextAction }),
}));

const request = {
  professionalId: 'pro1',
  serviceIds: ['s1', 's2'],
  startsAt: new Date(2099, 4, 8, 10, 0),
  cardId: 'pm_1',
};

beforeEach(() => {
  answers.calls.length = 0;
  answers.byName = {};
  answers.handleNextAction.mockReset();
});

describe('StripePayments', () => {
  it('is available only with a publishable key', () => {
    expect(new StripePayments('').available).toBe(false);
    expect(new StripePayments('pk_test_123').available).toBe(true);
  });

  it('sends the services and the time, never an amount: the server works the amount out', async () => {
    answers.byName['authorizePayment'] = () => ({
      status: 'authorized',
      paymentIntentId: 'pi_1',
      total: 150,
    });
    const hold = await new StripePayments('pk').hold(request);

    expect(hold).toEqual({ status: 'authorized', paymentIntentId: 'pi_1', total: 150 });
    const sent = answers.calls[0].data as Record<string, unknown>;
    expect(sent).toMatchObject({
      professionalId: 'pro1',
      serviceIds: ['s1', 's2'],
      startsAtMillis: request.startsAt.getTime(),
      paymentMethodId: 'pm_1',
    });
    expect(Object.keys(sent)).not.toContain('total');
    expect(Object.keys(sent)).not.toContain('amount');
    expect(typeof sent['attemptId']).toBe('string');
  });

  it('every payment is a new attempt: a retry after a refusal is not taken for the same one', async () => {
    answers.byName['authorizePayment'] = () => ({ status: 'failed', code: 'card_declined' });
    const payments = new StripePayments('pk');
    await payments.hold(request);
    await payments.hold(request);

    const [first, second] = answers.calls.map(
      (call) => (call.data as { attemptId: string }).attemptId,
    );
    expect(first).not.toBe(second);
  });

  it('passes the refusal of the card on', async () => {
    answers.byName['authorizePayment'] = () => ({ status: 'failed', code: 'insufficient_funds' });
    expect(await new StripePayments('pk').hold(request)).toEqual({
      status: 'failed',
      code: 'insufficient_funds',
    });
  });

  it('finishes the 3D Secure step of the bank and then asks what became of the hold', async () => {
    answers.byName['authorizePayment'] = () => ({
      status: 'requires_action',
      paymentIntentId: 'pi_9',
      clientSecret: 'secret_9',
      total: 80,
    });
    answers.byName['confirmAuthorization'] = () => ({
      status: 'authorized',
      paymentIntentId: 'pi_9',
    });
    answers.handleNextAction.mockResolvedValue({});

    expect(await new StripePayments('pk').hold(request)).toEqual({
      status: 'authorized',
      paymentIntentId: 'pi_9',
      total: 80,
    });
    expect(answers.handleNextAction).toHaveBeenCalledWith({ clientSecret: 'secret_9' });
    expect(answers.calls.map((call) => call.name)).toEqual([
      'authorizePayment',
      'confirmAuthorization',
    ]);
  });

  it('lets go of the hold when the client does not pass the bank step', async () => {
    answers.byName['authorizePayment'] = () => ({
      status: 'requires_action',
      paymentIntentId: 'pi_9',
      clientSecret: 'secret_9',
      total: 80,
    });
    answers.byName['cancelAuthorization'] = () => ({ ok: true });
    answers.handleNextAction.mockResolvedValue({ error: { code: 'authentication_failed' } });

    expect(await new StripePayments('pk').hold(request)).toEqual({
      status: 'failed',
      code: 'authentication_failed',
    });
    expect(answers.calls.at(-1)).toEqual({
      name: 'cancelAuthorization',
      data: { paymentIntentId: 'pi_9' },
    });
  });

  it('lists and removes cards, and lets go of a hold, through the functions', async () => {
    answers.byName['listCards'] = () => ({
      cards: [{ id: 'pm_1', brand: 'visa', last4: '4242', expMonth: 1, expYear: 2099 }],
    });
    answers.byName['removeCard'] = () => ({ ok: true });
    answers.byName['cancelAuthorization'] = () => ({ ok: true });
    const payments = new StripePayments('pk');

    expect((await payments.cards())[0].last4).toBe('4242');
    await payments.removeCard('pm_1');
    await payments.release('pi_1');
    expect(answers.calls.slice(1)).toEqual([
      { name: 'removeCard', data: { paymentMethodId: 'pm_1' } },
      { name: 'cancelAuthorization', data: { paymentIntentId: 'pi_1' } },
    ]);
  });
});
