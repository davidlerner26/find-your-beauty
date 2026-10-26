import type { PaymentIntent, StripeLike, StripePaymentMethod } from '../src/payments';

// A Stripe that lives in memory, for the tests. A card whose id is `pm_declined` is refused by the bank and one
// whose id is `pm_3ds` asks the client to confirm (3D Secure).
export const fakeStripe = () => {
  const methods = new Map<string, StripePaymentMethod>();
  const intents = new Map<string, PaymentIntent>();
  const refunded: string[] = [];
  const calls = { customerCreate: 0, intentCreate: 0 };
  const state = { failNext: null as Error | null, counter: 0 };
  const memo = new Map<string, unknown>();

  // Stripe answers a repeated idempotency key with the first answer
  const once = <T>(key: string | undefined, make: () => T): T => {
    if (!key) return make();
    if (!memo.has(key)) memo.set(key, make());
    return memo.get(key) as T;
  };

  const failIfAsked = () => {
    if (!state.failNext) return;
    const error = state.failNext;
    state.failNext = null;
    throw error;
  };

  const stripe: StripeLike = {
    customers: {
      create: async (_params, options) =>
        once(options?.idempotencyKey, () => ({ id: `cus_${++calls.customerCreate}` })),
    },
    setupIntents: { create: async () => ({ client_secret: 'seti_secret_123' }) },
    paymentMethods: {
      list: async ({ customer }) => ({
        data: [...methods.values()].filter((method) => method.customer === customer),
      }),
      retrieve: async (id) => {
        const method = methods.get(id);
        if (!method) throw new Error(`No such PaymentMethod: ${id}`);
        return method;
      },
      detach: async (id) => {
        methods.delete(id);
      },
    },
    paymentIntents: {
      create: async (params, options) =>
        once(options?.idempotencyKey, () => {
          failIfAsked();
          calls.intentCreate++;
          if (params.payment_method === 'pm_declined') {
            throw Object.assign(new Error('Your card was declined.'), {
              type: 'StripeCardError',
              code: 'card_declined',
            });
          }
          const intent: PaymentIntent = {
            id: `pi_${calls.intentCreate}`,
            status: params.payment_method === 'pm_3ds' ? 'requires_action' : 'requires_capture',
            amount: params.amount,
            currency: params.currency,
            customer: params.customer,
            client_secret: `pi_${calls.intentCreate}_secret`,
            metadata: { ...params.metadata },
          };
          intents.set(intent.id, intent);
          return intent;
        }),
      retrieve: async (id) => {
        const intent = intents.get(id);
        if (!intent) throw new Error(`No such PaymentIntent: ${id}`);
        return intent;
      },
      update: async (id, params) => {
        const intent = intents.get(id)!;
        intent.metadata = { ...intent.metadata, ...params.metadata };
        return intent;
      },
      capture: async (id) => {
        failIfAsked();
        const intent = intents.get(id)!;
        intent.status = 'succeeded';
        return intent;
      },
      cancel: async (id) => {
        failIfAsked();
        const intent = intents.get(id)!;
        intent.status = 'canceled';
        return intent;
      },
    },
    refunds: {
      create: async ({ payment_intent }) => {
        refunded.push(payment_intent);
        return {};
      },
    },
  };

  const addCard = (customer: string, id = `pm_${++state.counter}`, last4 = '4242') => {
    methods.set(id, {
      id,
      customer,
      card: { brand: 'visa', last4, exp_month: 12, exp_year: 2099 },
    });
    return id;
  };

  return { stripe, addCard, intents, methods, refunded, calls, state };
};
