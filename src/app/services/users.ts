import { Injectable } from '@angular/core';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '../models/user';
import { db } from './firebase';

@Injectable({ providedIn: 'root' })
export class Users {
  // Returns null when the user has no document in `users`
  async get(uid: string) {
    const snapshot = await getDoc(doc(db, 'users', uid));
    return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
  }

  // Saves the data the client can edit. Creates the document when it doesn't exist yet.
  update(uid: string, data: Pick<UserProfile, 'firstName' | 'lastName' | 'phone'>) {
    return setDoc(doc(db, 'users', uid), data, { merge: true });
  }
}
