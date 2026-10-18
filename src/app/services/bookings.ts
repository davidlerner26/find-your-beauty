import { effect, Injectable, signal } from '@angular/core';
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
import { Booking, BookingStatus } from '../models/booking';
import { Auth } from './auth';
import { db } from './firebase';

const notification = (text: { text: string; bold?: boolean }[]) => ({
  icon: 'calendar',
  text,
  unread: true,
  createdAt: serverTimestamp(),
});

@Injectable({ providedIn: 'root' })
export class Bookings {
  // Requests received by the logged in professional
  readonly received = signal<Booking[]>([]);

  constructor(private readonly auth: Auth) {
    effect((onCleanup) => {
      const uid = this.auth.user()?.uid;
      if (!uid || this.auth.role() !== 'professional') {
        this.received.set([]);
        return;
      }

      const q = query(collection(db, 'bookings'), where('professionalUid', '==', uid));
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
          this.received.set(list);
        },
        (error) => console.error('Failed to load bookings', error),
      );
      onCleanup(unsubscribe);
    });
  }

  // The client requests a booking. Saves it and notifies both sides in one write.
  async create(booking: Omit<Booking, 'id' | 'clientUid' | 'clientName' | 'status'>) {
    const user = this.auth.user();
    if (!user) throw new Error('not-authenticated');

    const clientName = user.displayName || user.email || 'Cliente';
    const bookingRef = doc(collection(db, 'bookings'));

    const batch = writeBatch(db);
    // One document per slot: it can only be created once, so two clients can't take the same slot
    for (const busyId of booking.busyIds) {
      batch.set(doc(db, 'professionals', booking.professionalId, 'busy', busyId), {
        date: busyId.split('_')[0],
        clientUid: user.uid,
      });
    }
    batch.set(bookingRef, {
      ...booking,
      clientUid: user.uid,
      clientName,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    batch.set(
      doc(collection(db, 'users', user.uid, 'notifications')),
      notification([
        { text: 'Você solicitou um horário com ' },
        { text: booking.professionalName, bold: true },
      ]),
    );
    if (booking.professionalUid) {
      batch.set(
        doc(collection(db, 'users', booking.professionalUid, 'notifications')),
        notification([{ text: 'Nova solicitação de ', bold: false }, { text: clientName, bold: true }]),
      );
    }
    await batch.commit();

    return bookingRef.id;
  }

  // The professional answers a request or concludes a booking, and the client is notified
  async setStatus(booking: Booking, status: Extract<BookingStatus, 'confirmed' | 'declined' | 'completed'>) {
    if (!booking.id) return;

    const verb = { confirmed: 'confirmou', declined: 'recusou', completed: 'concluiu' }[status];
    const batch = writeBatch(db);
    batch.update(doc(db, 'bookings', booking.id), { status, updatedAt: serverTimestamp() });
    // A declined booking frees its slots
    if (status === 'declined') {
      for (const busyId of booking.busyIds ?? []) {
        batch.delete(doc(db, 'professionals', booking.professionalId, 'busy', busyId));
      }
    }
    batch.set(
      doc(collection(db, 'users', booking.clientUid, 'notifications')),
      notification([
        { text: booking.professionalName, bold: true },
        { text: ` ${verb} o seu agendamento` },
      ]),
    );
    await batch.commit();
  }
}
