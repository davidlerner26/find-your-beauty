import { effect, Injectable, signal, WritableSignal, inject } from '@angular/core';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Booking } from '../models/booking';
import { freesSlots, ProfessionalAnswer } from '../../../shared/domain';
import { Auth } from './auth';
import { APP_LANGUAGE } from '../utils/locale';
import { db } from './firebase';
import { log } from '../utils/log';
import { COLLECTIONS } from '../../../shared/domain';

@Injectable({ providedIn: 'root' })
export class Bookings {
  private readonly auth = inject(Auth);

  // Requests received by the logged in professional
  readonly received = signal<Booking[]>([]);
  // Bookings made by the logged in client
  readonly mine = signal<Booking[]>([]);
  readonly mineLoading = signal(true);

  constructor() {
    this.watch('professional', 'professionalUid', this.received);
    this.watch('client', 'clientUid', this.mine, this.mineLoading);
  }

  // Keeps `target` in sync with the bookings of the logged in user, sorted by date
  private watch(
    role: 'client' | 'professional',
    field: 'clientUid' | 'professionalUid',
    target: WritableSignal<Booking[]>,
    loading?: WritableSignal<boolean>,
  ) {
    effect((onCleanup) => {
      const uid = this.auth.user()?.uid;
      if (!uid || this.auth.role() !== role) {
        target.set([]);
        loading?.set(false);
        return;
      }

      loading?.set(true);
      const q = query(collection(db, COLLECTIONS.bookings), where(field, '==', uid));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((d): Booking => {
            const data = d.data();
            return {
              ...(data as Omit<Booking, 'id' | 'startsAt'>),
              id: d.id,
              startsAt: (data['startsAt'] as Timestamp).toDate(),
            };
          });
          list.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
          target.set(list);
          loading?.set(false);
        },
        (error) => {
          log.error('Failed to load bookings', error);
          loading?.set(false);
        },
      );
      onCleanup(unsubscribe);
    });
  }

  // The client requests a booking. A Cloud Function notifies both sides.
  async create(booking: Omit<Booking, 'id' | 'clientUid' | 'clientName' | 'status'>) {
    const user = this.auth.user();
    if (!user) throw new Error('not-authenticated');

    const clientName = user.displayName || user.email || 'Cliente';
    const bookingRef = doc(collection(db, COLLECTIONS.bookings));

    const batch = writeBatch(db);
    // One document per slot: it can only be created once, so two clients can't take the same slot
    for (const busyId of booking.busyIds) {
      batch.set(
        doc(db, COLLECTIONS.professionals, booking.professionalId, COLLECTIONS.busy, busyId),
        {
          date: busyId.split('_')[0],
          clientUid: user.uid,
          // The rules check the slot against this booking, created in the same batch
          bookingId: bookingRef.id,
        },
      );
    }
    batch.set(bookingRef, {
      ...booking,
      clientUid: user.uid,
      clientName,
      status: 'pending',
      // The language of the page: the e-mails about this booking go in it
      lang: APP_LANGUAGE,
      createdAt: serverTimestamp(),
    });
    await batch.commit();

    return bookingRef.id;
  }

  // The professional answers a request or concludes a booking. A Cloud Function notifies the client.
  async setStatus(booking: Booking, status: ProfessionalAnswer) {
    if (!booking.id) return;

    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTIONS.bookings, booking.id), {
      status,
      updatedAt: serverTimestamp(),
    });
    // A declined or cancelled booking frees its slots
    if (freesSlots(status)) {
      for (const busyId of booking.busyIds ?? []) {
        batch.delete(
          doc(db, COLLECTIONS.professionals, booking.professionalId, COLLECTIONS.busy, busyId),
        );
      }
    }
    await batch.commit();
  }

  // The client cancels a booking. The slots are freed and a Cloud Function notifies the professional.
  async cancel(booking: Booking) {
    if (!booking.id) return;

    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTIONS.bookings, booking.id), {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
    for (const busyId of booking.busyIds ?? []) {
      batch.delete(
        doc(db, COLLECTIONS.professionals, booking.professionalId, COLLECTIONS.busy, busyId),
      );
    }
    await batch.commit();
  }
}
