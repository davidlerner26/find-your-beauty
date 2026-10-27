import { loadStripe, Stripe } from '@stripe/stripe-js';

const loaded = new Map<string, Promise<Stripe | null>>();

// Stripe.js is loaded from Stripe's own address (it has to be: it is what keeps the card number away from the
// app), once per key and only when a payment screen needs it
export const stripeFor = (publishableKey: string) => {
  if (!loaded.has(publishableKey))
    loaded.set(
      publishableKey,
      // The floating "stripe" badge of the test mode (their developer assistant) would stay on every screen
      loadStripe(publishableKey, { developerTools: { assistant: { enabled: false } } }),
    );
  return loaded.get(publishableKey)!;
};
