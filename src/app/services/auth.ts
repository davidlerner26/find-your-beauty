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
  private markReady!: () => void;

  readonly user = signal<User | null>(null);
  // null while logged out. A professional account has a document in `professionals/{uid}`.
  readonly role = signal<Role | null>(null);
  // `admin: true` in the user's document (set by hand in the Firestore console; the rules check the same field)
  readonly isAdmin = signal(false);
  // A professional that created the account but didn't finish the profile yet (stays signed in)
  readonly signupIncomplete = signal(false);
  // The professional just sent the complete sign up: the screen tells her it is under review
  readonly signupSubmitted = signal(false);
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

  // Each login screen only takes the accounts of its own area
  private async requireArea(area: 'client' | 'professional') {
    const wrong =
      area === 'professional'
        ? this.role() !== 'professional' && !this.signupIncomplete()
        : this.role() !== 'client';
    if (!wrong) return;
    await this.signOut();
    throw { code: area === 'professional' ? 'auth/not-professional' : 'auth/not-client' };
  }

  async signInWithGoogle(remember = true, area: 'client' | 'professional' = 'client') {
    await this.remember(remember);
    this.pendingApproval.set(false);
    const { user } = await signInWithPopup(this.auth, this.googleProvider);
    if (await this.resolveRole(user)) {
      await signOut(this.auth);
      throw { code: 'auth/pending-approval' };
    }
    if (area === 'client' && this.role() === 'client') await this.createUserDocIfMissing(user);
    await this.requireArea(area);
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
    this.signupSubmitted.set(false);
    const { user } = await createUserWithEmailAndPassword(this.auth, email.trim(), password);
    const name = `${firstName.trim()} ${lastName.trim()}`;
    await updateProfile(user, { displayName: name });
    this.user.set({ ...user } as User);

    await this.createProfessionalDoc(user, name, email.trim(), phone);
    // Stays signed in: the second step of the sign up completes the profile
    await this.resolveRole(user);
  }

  // Sign up with a Google account: the account becomes a professional waiting for the profile step.
  // An account that is already a client can't also be a professional.
  async signUpProfessionalWithGoogle(remember = true) {
    await this.remember(remember);
    this.signupSubmitted.set(false);
    this.pendingApproval.set(false);
    const { user } = await signInWithPopup(this.auth, this.googleProvider);

    const [profile, client] = await Promise.all([
      getDoc(doc(db, 'professionals', user.uid)),
      getDoc(doc(db, 'users', user.uid)),
    ]);
    if (!profile.exists()) {
      if (client.exists()) {
        await signOut(this.auth);
        throw { code: 'auth/account-is-client' };
      }
      await this.createProfessionalDoc(user, user.displayName ?? '', user.email ?? '', user.phoneNumber ?? '');
    }

    if (await this.resolveRole(user)) {
      await signOut(this.auth);
      throw { code: 'auth/pending-approval' };
    }
  }

  private createProfessionalDoc(user: User, name: string, email: string, phone: string) {
    return setDoc(doc(db, 'professionals', user.uid), {
      ownerUid: user.uid,
      name,
      email,
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
  }

  async signInWithEmail(email: string, password: string, remember = true) {
    await this.remember(remember);
    this.pendingApproval.set(false);
    const { user } = await signInWithEmailAndPassword(this.auth, email.trim(), password);
    if (await this.resolveRole(user)) {
      await signOut(this.auth);
      throw { code: 'auth/pending-approval' };
    }
  }

  async signInClient(email: string, password: string, remember = true) {
    await this.signInWithEmail(email, password, remember);
    await this.requireArea('client');
  }

  async signInProfessional(email: string, password: string, remember = true) {
    await this.signInWithEmail(email, password, remember);
    await this.requireArea('professional');
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
    // Before closing the session, so the screen goes straight to the "under review" message
    this.signupSubmitted.set(true);
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
          // Not approved yet: no access to the app (the callers close the session).
          // A sign up that wasn't finished, or that an admin denied, goes back to the second step to be (re)sent.
          const data = profile.data();
          if (data['approved'] === false && (data['submitted'] !== true || data['rejected'] === true)) {
            role = null;
            incomplete = true;
          } else if (profile.data()['approved'] === false) {
            role = null;
            pending = true;
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
