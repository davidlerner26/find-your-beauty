import { Injectable, signal } from '@angular/core';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getAuth,
  deleteUser,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { DEFAULT_AVAILABILITY } from '../models/professional';
import { APP_LANGUAGE } from '../utils/locale';
import { db, firebaseApp } from './firebase';

export type SignUpData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cpf: string;
  address?: string;
  addressPosition?: { lat: number; lng: number };
  password: string;
};

export type Role = 'client' | 'professional';

// Clients that sign up with e-mail and password confirm the e-mail with a code. Accounts from before this
// existed are not asked to.
const VERIFICATION_FROM = new Date('2026-10-23T00:00:00-03:00').getTime();
const VERIFICATION_KEY = 'email-verification';

const functions = getFunctions(firebaseApp, 'southamerica-east1');
const call = <Request, Response>(name: string) => httpsCallable<Request, Response>(functions, name);

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
  // The e-mail waiting for its code (kept for a reload of the page). The password stays only in memory,
  // to sign in right after the code is accepted.
  readonly verification = signal<{ email: string; password: string | null } | null>(this.restoreVerification());
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
    if (area === 'professional' && this.role() !== 'professional' && !this.signupIncomplete()) {
      // A Google account with no account here (not even a client) has to sign up first
      const client = await getDoc(doc(db, 'users', user.uid)).catch(() => null);
      if (client && !client.exists()) {
        // Signing in with Google created the account in Firebase: it is removed, since the sign up wasn't done
        await deleteUser(user).catch(() => signOut(this.auth));
        throw { code: 'auth/professional-not-registered' };
      }
    }
    await this.requireArea(area);
  }

  async signUpWithEmail({ firstName, lastName, email, phone, cpf, address, addressPosition, password }: SignUpData) {
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
        cpf,
        address: address ?? '',
        addressPosition: addressPosition ?? { lat: 0, lng: 0 },
        admin: false,
        // The language of the page: the e-mails of the account go in it
        lang: APP_LANGUAGE,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to save user', error);
    }

    // Not signed in until the e-mail is confirmed with the code
    await signOut(this.auth);
    await this.startVerification(email.trim(), password);
  }

  private restoreVerification() {
    try {
      const email = sessionStorage.getItem(VERIFICATION_KEY);
      return email ? { email, password: null } : null;
    } catch {
      return null;
    }
  }

  // Remembers the e-mail and sends a first code
  async startVerification(email: string, password: string | null) {
    this.verification.set({ email, password });
    try {
      sessionStorage.setItem(VERIFICATION_KEY, email);
    } catch {
      // Without storage a reload forgets the e-mail
    }
    await this.sendVerificationCode(email).catch((error) => console.error('Failed to send the code', error));
  }

  async sendVerificationCode(email: string) {
    await call<{ email: string; lang: string }, { ok: boolean }>('sendVerificationCode')({ email, lang: APP_LANGUAGE });
  }

  // Checks the code, then signs in with the password the sign up used (or asks for the login when it was lost)
  async verifyEmail(code: string) {
    const pending = this.verification();
    if (!pending) return false;

    await call<{ email: string; code: string; lang: string }, { ok: boolean }>('verifyEmailCode')({
      email: pending.email,
      code,
      lang: APP_LANGUAGE,
    });
    this.verification.set(null);
    try {
      sessionStorage.removeItem(VERIFICATION_KEY);
    } catch {
      // ignored
    }
    if (!pending.password) return false;

    await this.signInWithEmail(pending.email, pending.password, true);
    return true;
  }

  // Professionals are separate accounts: the profile document id is the account uid
  async signUpProfessional({ firstName, lastName, email, phone, cpf, password }: SignUpData) {
    this.signupSubmitted.set(false);
    const { user } = await createUserWithEmailAndPassword(this.auth, email.trim(), password);
    const name = `${firstName.trim()} ${lastName.trim()}`;
    await updateProfile(user, { displayName: name });
    this.user.set({ ...user } as User);

    await this.createProfessionalDoc(user, name, email.trim(), phone);
    // The CPF is private: it is not in the public profile
    await setDoc(doc(db, 'professionals', user.uid, 'private', 'identity'), { cpf }).catch((error) =>
      console.error('Failed to save the CPF', error),
    );
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
      lang: APP_LANGUAGE,
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

    // A new account that never confirmed the e-mail goes to the code screen
    const user = this.auth.currentUser;
    const createdAt = Date.parse(user?.metadata.creationTime ?? '');
    if (user && !user.emailVerified && createdAt >= VERIFICATION_FROM && user.providerData.some((p) => p.providerId === 'password')) {
      await signOut(this.auth);
      await this.startVerification(email.trim(), password);
      throw { code: 'auth/email-not-verified' };
    }

    await this.requireArea('client');
  }

  async signInProfessional(email: string, password: string, remember = true) {
    await this.signInWithEmail(email, password, remember);
    await this.requireArea('professional');
  }

  // The e-mail with the link is sent by a Cloud Function (through Resend)
  async sendPasswordReset(email: string) {
    await httpsCallable(getFunctions(firebaseApp, 'southamerica-east1'), 'sendPasswordReset')({
      email: email.trim(),
      lang: APP_LANGUAGE,
    });
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
        lang: APP_LANGUAGE,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to save user', error);
    }
  }
}
