import { Injectable } from '@angular/core';
import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, Timestamp, where } from 'firebase/firestore';
import { Review } from '../models/professional';
import { Auth } from './auth';
import { db } from './firebase';

@Injectable({ providedIn: 'root' })
export class Reviews {
  constructor(private readonly auth: Auth) {}

  async list(professionalId: string) {
    const snapshot = await getDocs(
      query(collection(db, 'professionals', professionalId, 'reviews'), orderBy('createdAt', 'desc')),
    );
    return snapshot.docs.map((d): Review => {
      const data = d.data();
      return {
        id: d.id,
        author: data['author'],
        stars: data['stars'],
        text: data['text'],
        createdAt: (data['createdAt'] as Timestamp | null)?.toDate() ?? null,
      };
    });
  }

  // A completed booking with this professional (the rules require it to review). Null when there is none.
  async completedBookingId(professionalId: string) {
    const uid = this.auth.user()?.uid;
    if (!uid) return null;

    const snapshot = await getDocs(
      query(collection(db, 'bookings'), where('clientUid', '==', uid), where('professionalId', '==', professionalId)),
    );
    return snapshot.docs.find((d) => d.data()['status'] === 'completed')?.id ?? null;
  }

  // Creates or replaces the client's review. A Cloud Function updates the professional's rating.
  async save(professionalId: string, bookingId: string, stars: number, text: string) {
    const user = this.auth.user();
    if (!user) throw new Error('not-authenticated');

    await setDoc(doc(db, 'professionals', professionalId, 'reviews', user.uid), {
      clientUid: user.uid,
      author: user.displayName || 'Cliente',
      bookingId,
      stars,
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
  }

  // The client removes their own review. A Cloud Function updates the professional's rating.
  async remove(professionalId: string) {
    const uid = this.auth.user()?.uid;
    if (!uid) return;
    await deleteDoc(doc(db, 'professionals', professionalId, 'reviews', uid));
  }
}
