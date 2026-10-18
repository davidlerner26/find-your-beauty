import { Injectable, signal } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, firebaseApp } from './firebase';

export type SignUpData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
};

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly auth = getAuth(firebaseApp);
  private readonly googleProvider = new GoogleAuthProvider();

  readonly user = signal<User | null>(null);
  // false until Firebase tells us whether there is a session
  readonly ready = signal(false);

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.user.set(user);
      this.ready.set(true);
    });
  }

  async signInWithGoogle() {
    const { user } = await signInWithPopup(this.auth, this.googleProvider);
    await this.createUserDocIfMissing(user);
  }

  async signUpWithEmail({ firstName, lastName, email, phone, password }: SignUpData) {
    const { user } = await createUserWithEmailAndPassword(this.auth, email.trim(), password);
    const name = `${firstName.trim()} ${lastName.trim()}`;
    await updateProfile(user, { displayName: name });
    this.user.set({ ...user } as User);

    // The account already exists at this point, so a failure here must not fail the sign up
    try {
      await setDoc(doc(db, 'users', user.uid), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to save user', error);
    }
  }

  async signInWithEmail(email: string, password: string) {
    await signInWithEmailAndPassword(this.auth, email.trim(), password);
  }

  async sendPasswordReset(email: string) {
    await sendPasswordResetEmail(this.auth, email.trim());
  }

  signOut() {
    return signOut(this.auth);
  }

  private async createUserDocIfMissing(user: User) {
    try {
      const ref = doc(db, 'users', user.uid);
      if ((await getDoc(ref)).exists()) return;

      const [firstName = '', ...rest] = (user.displayName ?? '').trim().split(/\s+/);
      await setDoc(ref, {
        firstName,
        lastName: rest.join(' '),
        email: user.email,
        phone: user.phoneNumber ?? '',
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to save user', error);
    }
  }
}
