// End to end tests (Playwright): the app talks to the local Firebase emulators with a throwaway project, so nothing
// real is touched. There is no Google Maps key, which turns the map off. The `e2e` build uses this file instead of
// environment.ts.
export const environment = {
  name: 'e2e',
  useEmulators: true,
  features: {
    featuredProfessionals: true,
    checkout: true,
  },
  googleMapsApiKey: '',
  instagramAppId: '',
  firebase: {
    apiKey: 'demo-api-key',
    authDomain: 'demo-find-your-beauty.firebaseapp.com',
    projectId: 'demo-find-your-beauty',
    storageBucket: 'demo-find-your-beauty.appspot.com',
    messagingSenderId: '0',
    appId: '1:0:web:e2e',
  },
};
