import { Injectable } from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Professional } from '../models/professional';
import { db } from './firebase';

export type PendingProfessional = {
  id: string;
  name: string;
  email: string;
  phone: string;
  rejected: boolean;
  createdAt: Date | null;
};

// Professionals sign up with `approved: false` and can only sign in after an admin approves them.
// A denied one keeps `approved: false` and gets `rejected: true`.
@Injectable({ providedIn: 'root' })
export class Admin {
  // Everyone who is not approved: waiting (oldest first) and denied
  async pending() {
    const snapshot = await getDocs(
      query(collection(db, 'professionals'), where('approved', '==', false)),
    );
    // Only the ones that finished the sign up (second step). Older accounts without `submitted` haven't.
    const list = snapshot.docs
      .filter((d) => d.data()['submitted'] === true)
      .map((d): PendingProfessional => {
        const data = d.data();
        return {
          id: d.id,
          name: data['name'] ?? '',
          email: data['email'] ?? '',
          phone: data['phone'] ?? '',
          rejected: data['rejected'] === true,
          createdAt: data['createdAt'] instanceof Timestamp ? data['createdAt'].toDate() : null,
        };
      });
    // Sorted here to avoid an index
    return list.sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  }

  // The whole profile, even if it is not published
  async get(id: string) {
    const snapshot = await getDoc(doc(db, 'professionals', id));
    return snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as Professional) : null;
  }

  approve(id: string) {
    return updateDoc(doc(db, 'professionals', id), { approved: true, rejected: false });
  }

  reject(id: string) {
    return updateDoc(doc(db, 'professionals', id), { approved: false, rejected: true });
  }
}
