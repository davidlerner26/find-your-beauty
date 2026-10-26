import { Injectable } from '@angular/core';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { userConverter } from '../models/converters';
import { UserProfile } from '../models/user';
import { APP_LANGUAGE } from '../utils/locale';
import { db } from './firebase';
import { COLLECTIONS } from '../../../shared/domain';

// What a new client account starts with
export type NewUser = Pick<UserProfile, 'firstName' | 'lastName' | 'email' | 'phone'> &
  Partial<Pick<UserProfile, 'cpf' | 'address' | 'addressPosition'>>;

// users/{uid}: the client's own data
@Injectable({ providedIn: 'root' })
export class Users {
  private ref(uid: string) {
    return doc(db, COLLECTIONS.users, uid).withConverter(userConverter);
  }

  // Returns null when the user has no document in `users`
  async get(uid: string) {
    const snapshot = await getDoc(this.ref(uid));
    return snapshot.exists() ? snapshot.data() : null;
  }

  async exists(uid: string) {
    return (await getDoc(this.ref(uid))).exists();
  }

  // Creates the client document. Nobody can make themselves an admin: the rules only accept `admin: false`.
  create(uid: string, data: NewUser) {
    return setDoc(doc(db, COLLECTIONS.users, uid), {
      ...data,
      admin: false,
      // The language of the page: the e-mails of the account go in it
      lang: APP_LANGUAGE,
      createdAt: serverTimestamp(),
    });
  }

  // Creates the document only when there is none yet. Returns true when it was created.
  async createIfMissing(uid: string, data: NewUser) {
    if (await this.exists(uid)) return false;
    await this.create(uid, data);
    return true;
  }

  // Saves the data the client can edit. Creates the document when it doesn't exist yet.
  update(
    uid: string,
    data: Pick<
      UserProfile,
      'firstName' | 'lastName' | 'phone' | 'cpf' | 'address' | 'addressPosition'
    >,
  ) {
    return setDoc(doc(db, COLLECTIONS.users, uid), data, { merge: true });
  }
}
