import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  getFirestore,
  query,
  getDocs,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBGcq0sRf1RW7h4v9M-ZU-hR2RYstQnUzM',
  authDomain: 'find-your-beauty-5c993.firebaseapp.com',
  projectId: 'find-your-beauty-5c993',
  storageBucket: 'find-your-beauty-5c993.firebasestorage.app',
  messagingSenderId: '750848188331',
  appId: '1:750848188331:web:5cc3f9dfa3c2f562d13cee',
  measurementId: 'G-RJ4BYTFWDV',
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const provider = new GoogleAuthProvider();

export const auth = getAuth();

export const signInWithGoogle = () => {
  signInWithPopup(auth, provider)
    .then(() => {
      // This gives you a Google Access Token. You can use it to access the Google API.
      // const credential = GoogleAuthProvider.credentialFromResult(result);
      // const token = credential.accessToken;
      // console.log(token);
      // The signed-in user info.
      // const user = result.user;
      // console.log(user);
      // IdP data available using getAdditionalUserInfo(result)
      // ...
    })
    .catch((error) => {
      console.error(error);
    });
};

export const signOutUser = async () => await signOut(auth);

export const createAccount = async ({ name, email }) => {
  try {
    await addDoc(collection(db, 'users'), { name, email });
  } catch (e) {
    console.error('Error adding document: ', e);
  }
};

export const getProfessionalsAndDocuments = async () => {
  const collectionRef = collection(db, 'professionals');
  const q = query(collectionRef);

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((docSnapshot) => docSnapshot.data());
};

export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (userAuth) => {
        unsubscribe();
        resolve(userAuth);
      },
      reject,
    );
  });
};
