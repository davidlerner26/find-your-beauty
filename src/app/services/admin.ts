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
import { professionalConverter } from '../models/converters';
import { db } from './firebase';
import { COLLECTIONS } from '../../../shared/domain';

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
      query(collection(db, COLLECTIONS.professionals), where('approved', '==', false)),
    );
    // Only the ones that finished the sign up (second step). Older accounts without `submitted` haven't.
    const list = snapshot.docs
      // A denied request leaves the list
      .filter((d) => d.data()['submitted'] === true && d.data()['rejected'] !== true)
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
    const snapshot = await getDoc(
      doc(db, COLLECTIONS.professionals, id).withConverter(professionalConverter),
    );
    return snapshot.exists() ? snapshot.data() : null;
  }

  // The CPF of a professional (private: only the owner and admins can read it)
  async cpfOf(id: string) {
    const snapshot = await getDoc(
      doc(db, COLLECTIONS.professionals, id, COLLECTIONS.private, 'identity'),
    );
    return (snapshot.data()?.['cpf'] as string | undefined) ?? '';
  }

  // Approving makes the profile public at once: it was complete when it was sent, so it is published
  // (unless the professional chose to hide it)
  async approve(id: string) {
    const snapshot = await getDoc(doc(db, COLLECTIONS.professionals, id));
    const visible = snapshot.data()?.['visible'] !== false;
    await updateDoc(doc(db, COLLECTIONS.professionals, id), {
      approved: true,
      rejected: false,
      published: visible,
    });
  }

  reject(id: string) {
    return updateDoc(doc(db, COLLECTIONS.professionals, id), { approved: false, rejected: true });
  }
}
