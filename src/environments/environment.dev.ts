// Test environment (dev.findyourbeauty.com.br): its own Firebase project, so accounts, bookings and e-mails of the
// tests never touch the real ones. The `dev` build uses this file instead of environment.ts.
// The values below come from the web app of the dev project (Firebase Console > Project settings > Your apps).
export const environment = {
  name: 'dev',
  useEmulators: false,
  // The publishable key (pk_test_...) of the Stripe account in test mode. Public by design. Until it is filled in,
  // the payment screen keeps the simulated payment.
  payments: { provider: 'stripe' as 'off' | 'stripe' | 'fake', stripePublishableKey: '' },
  // Features that are only turned on in the test environment for now (production has them off)
  features: {
    featuredProfessionals: true,
    // A simulated payment screen comes before the booking is created: nothing is charged
    checkout: true,
  },
  // The same key of production works when the referrers of the key include dev.findyourbeauty.com.br
  googleMapsApiKey: 'AIzaSyB41b9p2_dNiCulzT_jafIeindOFuDcI-I',
  // Instagram API with Instagram Login. Empty = the connect button is disabled (there is no test app on Meta yet).
  instagramAppId: '',
  firebase: {
    apiKey: 'AIzaSyBwamplQdQ7d2BYMuD56DfVigkO1fuSpEw',
    authDomain: 'find-your-beauty-dev.firebaseapp.com',
    projectId: 'find-your-beauty-dev',
    storageBucket: 'find-your-beauty-dev.firebasestorage.app',
    messagingSenderId: '508397329043',
    appId: '1:508397329043:web:83e4a0ac4f69c17d8a8b66',
  },
};
