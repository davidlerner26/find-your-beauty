import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { environment } from '../../environments/environment';

export const firebaseApp = initializeApp(environment.firebase);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const firebaseAuth = getAuth(firebaseApp);
export const functions = getFunctions(firebaseApp, 'southamerica-east1');

// The end to end tests run against the local emulators (ports in firebase.json), never a real project
if (environment.useEmulators) {
  connectAuthEmulator(firebaseAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
