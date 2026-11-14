import type { BillingStripeLike, StripeEvent, StripeSubscription } from '../src/subscription';

// A Stripe Billing that lives in memory, for the tests. The signature of a webhook is valid when it is `valid-signature`.
export const fakeBillingStripe = () => {
  const subscriptions = new Map<string, StripeSubscription>();
  const calls = { customerCreate: 0, checkout: 0, portal: 0 };
  const deletedCustomers: string[] = [];
  const cancelled: string[] = [];
  const memo = new Map<string, unknown>();

  const once = <T>(key: string | undefined, make: () => T): T => {
    if (!key) return make();
    if (!memo.has(key)) memo.set(key, make());
    return memo.get(key) as T;
  };
  const missing = (id: string) =>
    Object.assign(new Error(`No such object: ${id}`), { code: 'resource_missing' });

  const stripe: BillingStripeLike = {
    customers: {
      create: async (_params, options) =>
        once(options?.idempotencyKey, () => ({ id: `cus_${++calls.customerCreate}` })),
      del: async (id) => {
        if (deletedCustomers.includes(id)) throw missing(id);
        deletedCustomers.push(id);
      },
    },
    checkout: {
      sessions: {
        create: async (params) => {
          calls.checkout++;
          return { id: 'cs_1', url: `https://checkout.stripe.test/${params.customer}` };
        },
      },
    },
    billingPortal: {
      sessions: {
        create: async ({ customer }) => {
          calls.portal++;
          return { url: `https://billing.stripe.test/${customer}` };
        },
      },
    },
    subscriptions: {
      retrieve: async (id) => {
        const subscription = subscriptions.get(id);
        if (!subscription) throw missing(id);
        return subscription;
      },
      cancel: async (id) => {
        if (!subscriptions.has(id) || cancelled.includes(id)) throw missing(id);
        cancelled.push(id);
      },
    },
    webhooks: {
      constructEvent: (payload, signature) => {
        if (signature !== 'valid-signature') {
          throw Object.assign(new Error('Bad signature'), {
            type: 'StripeSignatureVerificationError',
          });
        }
        return JSON.parse(String(payload)) as StripeEvent;
      },
    },
  };

  const subscription = (
    uid: string,
    fields: Partial<StripeSubscription> & { id?: string } = {},
  ): StripeSubscription => ({
    id: fields.id ?? 'sub_1',
    status: 'active',
    customer: 'cus_1',
    cancel_at_period_end: false,
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 86_400,
    items: { data: [{ price: { id: 'price_pro' } }] },
    metadata: { uid },
    ...fields,
  });

  const event = (
    type: string,
    object: Record<string, unknown>,
    created = Math.floor(Date.now() / 1000),
  ): StripeEvent => ({ id: `evt_${type}_${created}`, type, created, data: { object } });

  return {
    stripe,
    calls,
    deletedCustomers,
    cancelled,
    subscription,
    event,
    // The subscription exists at Stripe (so it can be retrieved)
    put: (value: StripeSubscription) => subscriptions.set(value.id, value),
  };
};
