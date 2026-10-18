import { Injectable } from '@angular/core';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from '../models/user';
import { db } from './firebase';

@Injectable({ providedIn: 'root' })
export class Users {
  // Returns null when the user has no document in `users`
  async get(uid: string) {
    const snapshot = await getDoc(doc(db, 'users', uid));
    return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
  }
}
