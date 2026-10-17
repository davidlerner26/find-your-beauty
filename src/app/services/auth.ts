import { Injectable, signal } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly auth = getAuth(initializeApp(environment.firebase));
  private readonly googleProvider = new GoogleAuthProvider();

  readonly user = signal<User | null>(null);

  constructor() {
    onAuthStateChanged(this.auth, (user) => this.user.set(user));
  }

  async signInWithGoogle() {
    await signInWithPopup(this.auth, this.googleProvider);
  }

  signOut() {
    return signOut(this.auth);
  }
}
