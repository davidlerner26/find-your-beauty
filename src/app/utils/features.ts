import { environment } from '../../environments/environment';

type Env = { name: string; features: { checkout: boolean } };
type Store = Pick<Storage, 'getItem'>;

// The storage key that turns the payment screen off in the e2e build, so both ways of booking can be tested
export const CHECKOUT_OVERRIDE_KEY = 'e2e-checkout';

// Is the payment screen shown before a booking is made? It is a feature of the test environment: production
// books as soon as the client asks. Only the e2e build lets a test choose.
export const isCheckoutEnabled = (env: Env, storage: Store | null) => {
  if (env.name === 'e2e' && storage) {
    const override = storage.getItem(CHECKOUT_OVERRIDE_KEY);
    if (override === 'off') return false;
    if (override === 'on') return true;
  }
  return env.features.checkout;
};

export const checkoutEnabled = () => {
  try {
    return isCheckoutEnabled(environment, localStorage);
  } catch {
    // Storage can be blocked: the flag of the environment decides
    return isCheckoutEnabled(environment, null);
  }
};
