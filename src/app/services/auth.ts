import { Injectable, signal } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly auth = getAuth(initializeApp(environment.firebase));
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
    await signInWithPopup(this.auth, this.googleProvider);
  }

  async signUpWithEmail(name: string, email: string, password: string) {
    const { user } = await createUserWithEmailAndPassword(this.auth, email.trim(), password);
    await updateProfile(user, { displayName: name.trim() });
    this.user.set({ ...user } as User);
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
}
