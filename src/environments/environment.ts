// Production (findyourbeauty.com.br). The test environment (dev.findyourbeauty.com.br) is in environment.dev.ts and
// takes the place of this file in the `dev` build.
export const environment = {
  name: 'prod',
  // The address the site is known by (canonical links, social previews) and whether search engines may index it
  siteUrl: 'https://findyourbeauty.com.br',
  indexable: true,
  // Only the end to end tests connect to the local Firebase emulators (environment.e2e.ts)
  useEmulators: false,
  // Payments with Stripe: only the test environment has them (see services/payments.ts)
  payments: { provider: 'off' as 'off' | 'stripe' | 'fake', stripePublishableKey: '' },
  // Features that are only turned on in the test environment for now
  features: {
    // Connecting an Instagram account: off until Meta grants advanced access to instagram_business_basic (the review)
    instagramConnect: false,
    featuredProfessionals: false,
    // The payment screen before a booking is created (see utils/features.ts). Production books straight away.
    checkout: false,
    // The Pro plan of the professionals (see docs/assinatura-pro.md): the badge, the priority in the search and on the map,
    // the featured section. Ready in production, but nobody can subscribe yet (the next flag).
    proSubscription: true,
    // The way to subscribe: the card on the profile and the page /pro/assinatura. Off in production until the owner says to
    // open the subscription: change it together with the go-live checklist of that document (and SUBSCRIPTIONS_SIGNUP of the
    // functions).
    proSubscriptionSignup: false,
  },
  googleMapsApiKey: 'AIzaSyB41b9p2_dNiCulzT_jafIeindOFuDcI-I',
  // Instagram API with Instagram Login (public). Empty = the connect button is disabled.
  instagramAppId: '1138530759119798',
  firebase: {
    apiKey: 'AIzaSyBGcq0sRf1RW7h4v9M-ZU-hR2RYstQnUzM',
    authDomain: 'find-your-beauty-5c993.firebaseapp.com',
    projectId: 'find-your-beauty-5c993',
    storageBucket: 'find-your-beauty-5c993.firebasestorage.app',
    messagingSenderId: '750848188331',
    appId: '1:750848188331:web:5cc3f9dfa3c2f562d13cee',
  },
};
