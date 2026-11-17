import { environment } from '../../environments/environment';
import {
  CHECKOUT_OVERRIDE_KEY,
  isCheckoutEnabled,
  isProSignupEnabled,
  isProSubscriptionEnabled,
} from './features';

const storage = (value: string | null) => ({ getItem: () => value });
const env = (name: string, checkout: boolean) => ({ name, features: { checkout } });

describe('isCheckoutEnabled', () => {
  it('follows the flag of the environment: on in dev, off in production', () => {
    expect(isCheckoutEnabled(env('dev', true), null)).toBe(true);
    expect(isCheckoutEnabled(env('prod', false), null)).toBe(false);
  });

  it('production cannot be switched on from the browser, whatever the storage says', () => {
    expect(isCheckoutEnabled(env('prod', false), storage('on'))).toBe(false);
    expect(isCheckoutEnabled(env('dev', true), storage('off'))).toBe(true);
  });

  it('the e2e build lets a test choose', () => {
    expect(CHECKOUT_OVERRIDE_KEY).toBe('e2e-checkout');
    expect(isCheckoutEnabled(env('e2e', true), storage('off'))).toBe(false);
    expect(isCheckoutEnabled(env('e2e', false), storage('on'))).toBe(true);
    expect(isCheckoutEnabled(env('e2e', true), storage(null))).toBe(true);
    expect(isCheckoutEnabled(env('e2e', true), storage('anything'))).toBe(true);
  });
});

describe('isProSignupEnabled', () => {
  it('follows the flag of the environment', () => {
    expect(isProSignupEnabled({ features: { proSubscriptionSignup: true } })).toBe(true);
    expect(isProSignupEnabled({ features: { proSubscriptionSignup: false } })).toBe(false);
  });
});

describe('isProSubscriptionEnabled', () => {
  it('follows the flag of the environment', () => {
    expect(isProSubscriptionEnabled({ features: { proSubscription: true } })).toBe(true);
    expect(isProSubscriptionEnabled({ features: { proSubscription: false } })).toBe(false);
  });
});

// environment.ts is the production file: the dev and e2e builds replace it with their own
describe('the production environment', () => {
  it('books straight away: the payment screen stays off until it is decided to bring it', () => {
    expect(environment.name).toBe('prod');
    expect(environment.features.checkout).toBe(false);
  });

  it('has no payments: no Stripe, no saved cards, and the booking carries no hold', () => {
    expect(environment.payments.provider).toBe('off');
    expect(environment.payments.stripePublishableKey).toBe('');
  });

  // The Pro plan is ready in production (the badge, the priority, the featured section: nothing shows while nobody
  // subscribes), but nobody can subscribe until the owner says to open it (docs/assinatura-pro.md). Opening it is the
  // go-live: change `proSubscriptionSignup` together with the checklist of that document (and SUBSCRIPTIONS_SIGNUP of the
  // functions).
  it('is ready for the Pro plan, but does not let anyone subscribe: no card, no page to subscribe', () => {
    expect(environment.features.proSubscription).toBe(true);
    expect(environment.features.proSubscriptionSignup).toBe(false);
  });
});
