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
import { DEFAULT_AVAILABILITY } from '../models/professional';
import { db, firebaseApp } from './firebase';

export type SignUpData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
};

export type Role = 'client' | 'professional';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly auth = getAuth(firebaseApp);
  private readonly googleProvider = new GoogleAuthProvider();
  private roleRequest = 0;
  private markReady!: () => void;

  readonly user = signal<User | null>(null);
  // null while logged out. A professional account has a document in `professionals/{uid}`.
  readonly role = signal<Role | null>(null);
  // false until Firebase tells us whether there is a session (and its role)
  readonly ready = signal(false);
  readonly whenReady = new Promise<void>((resolve) => (this.markReady = resolve));

  constructor() {
    onAuthStateChanged(this.auth, async (user) => {
      this.user.set(user);
      await this.resolveRole(user);
      this.ready.set(true);
      this.markReady();
    });
  }

  homePath() {
    return this.role() === 'professional' ? '/pro' : '/';
  }

  async signInWithGoogle() {
    const { user } = await signInWithPopup(this.auth, this.googleProvider);
    await this.resolveRole(user);
    if (this.role() === 'client') await this.createUserDocIfMissing(user);
  }

  async signUpWithEmail({ firstName, lastName, email, phone, password }: SignUpData) {
    const { user } = await createUserWithEmailAndPassword(this.auth, email.trim(), password);
    const name = `${firstName.trim()} ${lastName.trim()}`;
    await updateProfile(user, { displayName: name });
    this.user.set({ ...user } as User);
    await this.resolveRole(user);

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

  // Professionals are separate accounts: the profile document id is the account uid
  async signUpProfessional({ firstName, lastName, email, phone, password }: SignUpData) {
    const { user } = await createUserWithEmailAndPassword(this.auth, email.trim(), password);
    const name = `${firstName.trim()} ${lastName.trim()}`;
    await updateProfile(user, { displayName: name });
    this.user.set({ ...user } as User);

    await setDoc(doc(db, 'professionals', user.uid), {
      ownerUid: user.uid,
      name,
      email: email.trim(),
      phone,
      image: '',
      address: '',
      tags: [],
      rating: 0,
      reviewsCount: '0',
      views: '0',
      about: [],
      services: [],
      gallery: [],
      reviews: [],
      position: { lat: 0, lng: 0 },
      visible: true,
      published: false,
      availability: DEFAULT_AVAILABILITY,
    });
    await this.resolveRole(user);
  }

  async signInWithEmail(email: string, password: string) {
    const { user } = await signInWithEmailAndPassword(this.auth, email.trim(), password);
    await this.resolveRole(user);
  }

  async signInProfessional(email: string, password: string) {
    await this.signInWithEmail(email, password);
    if (this.role() !== 'professional') {
      await this.signOut();
      throw { code: 'auth/not-professional' };
    }
  }

  async sendPasswordReset(email: string) {
    await sendPasswordResetEmail(this.auth, email.trim());
  }

  signOut() {
    return signOut(this.auth);
  }

  private async resolveRole(user: User | null) {
    const request = ++this.roleRequest;
    let role: Role | null = null;

    if (user) {
      role = 'client';
      try {
        if ((await getDoc(doc(db, 'professionals', user.uid))).exists()) role = 'professional';
      } catch (error) {
        console.error('Failed to resolve role', error);
      }
    }

    // Ignore answers that were overtaken by a newer request
    if (request === this.roleRequest) this.role.set(role);
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
