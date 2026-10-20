import { Injectable, signal } from '@angular/core';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
  verifyPasswordResetCode,
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
  // The pending account found by the last resolveRole was denied by an admin
  private deniedByAdmin = false;
  private markReady!: () => void;

  readonly user = signal<User | null>(null);
  // null while logged out. A professional account has a document in `professionals/{uid}`.
  readonly role = signal<Role | null>(null);
  // `admin: true` in the user's document (set by hand in the Firestore console; the rules check the same field)
  readonly isAdmin = signal(false);
  // A professional that created the account but didn't finish the profile yet (stays signed in)
  readonly signupIncomplete = signal(false);
  // true when the last sign in was a professional still waiting for an admin (that session is closed right away)
  readonly pendingApproval = signal(false);
  // false until Firebase tells us whether there is a session (and its role)
  readonly ready = signal(false);
  readonly whenReady = new Promise<void>((resolve) => (this.markReady = resolve));

  constructor() {
    onAuthStateChanged(this.auth, async (user) => {
      this.user.set(user);
      const pending = await this.resolveRole(user);
      // A professional waiting for approval can't stay signed in
      if (pending) await signOut(this.auth);
      this.ready.set(true);
      this.markReady();
    });
  }

  homePath() {
    if (this.signupIncomplete()) return '/pro/cadastro';
    return this.role() === 'professional' ? '/pro' : '/';
  }

  // Stay signed in after closing the browser (default), or only until the tab is closed
  private remember(remember: boolean) {
    return setPersistence(
      this.auth,
      remember ? browserLocalPersistence : browserSessionPersistence,
    );
  }

  async signInWithGoogle(remember = true) {
    await this.remember(remember);
    this.pendingApproval.set(false);
    const { user } = await signInWithPopup(this.auth, this.googleProvider);
    if (await this.resolveRole(user)) {
      await signOut(this.auth);
      throw { code: this.deniedByAdmin ? 'auth/rejected' : 'auth/pending-approval' };
    }
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
        admin: false,
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
      position: { lat: 0, lng: 0 },
      visible: true,
      published: false,
      availability: DEFAULT_AVAILABILITY,
      // Waits for an admin. `submitted` becomes true when the profile is complete (second step of the sign up).
      approved: false,
      submitted: false,
      admin: false,
      createdAt: serverTimestamp(),
    });
    // Stays signed in: the second step of the sign up completes the profile
    await this.resolveRole(user);
  }

  async signInWithEmail(email: string, password: string, remember = true) {
    await this.remember(remember);
    this.pendingApproval.set(false);
    const { user } = await signInWithEmailAndPassword(this.auth, email.trim(), password);
    if (await this.resolveRole(user)) {
      await signOut(this.auth);
      throw { code: this.deniedByAdmin ? 'auth/rejected' : 'auth/pending-approval' };
    }
  }

  async signInProfessional(email: string, password: string, remember = true) {
    await this.signInWithEmail(email, password, remember);
    if (this.role() !== 'professional' && !this.signupIncomplete()) {
      await this.signOut();
      throw { code: 'auth/not-professional' };
    }
  }

  async sendPasswordReset(email: string) {
    await sendPasswordResetEmail(this.auth, email.trim());
  }

  // Checks the code from the e-mail link. Returns the e-mail of the account.
  verifyResetCode(code: string) {
    return verifyPasswordResetCode(this.auth, code);
  }

  async confirmPasswordReset(code: string, password: string) {
    await confirmPasswordReset(this.auth, code, password);
  }

  // Changes the name shown in the app (messages, bookings, reviews)
  async updateName(name: string) {
    const user = this.auth.currentUser;
    if (!user) return;
    await updateProfile(user, { displayName: name });
    this.user.set({ ...user } as User);
  }

  // The profile is complete and was sent: now it waits for an admin, so the session is closed
  async finishSignup() {
    this.pendingApproval.set(true);
    this.signupIncomplete.set(false);
    await signOut(this.auth);
  }

  signOut() {
    return signOut(this.auth);
  }

  // Returns true when the account is a professional still waiting for approval
  private async resolveRole(user: User | null) {
    const request = ++this.roleRequest;
    let role: Role | null = null;
    let pending = false;
    let admin = false;
    let incomplete = false;

    if (user) {
      role = 'client';
      try {
        const [profile, account] = await Promise.all([
          getDoc(doc(db, 'professionals', user.uid)),
          getDoc(doc(db, 'users', user.uid)),
        ]);
        admin = account.data()?.['admin'] === true;
        if (profile.exists()) {
          // Not approved yet: no access to the app (the callers close the session)
          if (profile.data()['approved'] === false && profile.data()['submitted'] !== true) {
            role = null;
            incomplete = true;
          } else if (profile.data()['approved'] === false) {
            role = null;
            pending = true;
            this.deniedByAdmin = profile.data()['rejected'] === true;
            this.pendingApproval.set(true);
          } else {
            role = 'professional';
          }
        }
      } catch (error) {
        console.error('Failed to resolve role', error);
      }
    }

    // Ignore answers that were overtaken by a newer request
    if (request === this.roleRequest) {
      this.role.set(role);
      this.isAdmin.set(admin);
      this.signupIncomplete.set(incomplete);
    }
    return pending;
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
        admin: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to save user', error);
    }
  }
}
