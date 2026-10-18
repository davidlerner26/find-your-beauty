import { Injectable } from '@angular/core';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Booking } from '../models/booking';
import { Auth } from './auth';
import { db } from './firebase';

@Injectable({ providedIn: 'root' })
export class Bookings {
  constructor(private readonly auth: Auth) {}

  // Saves the booking and a notification about it in one write. Returns the booking id.
  async create(booking: Booking) {
    const uid = this.auth.user()?.uid;
    if (!uid) throw new Error('not-authenticated');

    const bookingRef = doc(collection(db, 'users', uid, 'bookings'));
    const notificationRef = doc(collection(db, 'users', uid, 'notifications'));

    const batch = writeBatch(db);
    batch.set(bookingRef, { ...booking, createdAt: serverTimestamp() });
    batch.set(notificationRef, {
      icon: 'calendar',
      text: [
        { text: 'Você agendou um horário com ' },
        { text: booking.professionalName, bold: true },
      ],
      unread: true,
      createdAt: serverTimestamp(),
    });
    await batch.commit();

    return bookingRef.id;
  }
}
