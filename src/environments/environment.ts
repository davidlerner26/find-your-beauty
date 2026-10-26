// Production (findyourbeauty.com.br). The test environment (dev.findyourbeauty.com.br) is in environment.dev.ts and
// takes the place of this file in the `dev` build.
export const environment = {
  name: 'prod',
  // Only the end to end tests connect to the local Firebase emulators (environment.e2e.ts)
  useEmulators: false,
  // Features that are only turned on in the test environment for now
  features: {
    featuredProfessionals: false,
    // The payment screen before a booking is created (see utils/features.ts). Production books straight away.
    checkout: false,
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
