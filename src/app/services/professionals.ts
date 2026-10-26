import { computed, Injectable, signal } from '@angular/core';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { Professional } from '../models/professional';
import { db } from './firebase';
import { log } from '../utils/log';

@Injectable({ providedIn: 'root' })
export class Professionals {
  readonly list = signal<Professional[]>([]);
  // What clients can see: professionals that haven't hidden their profile
  readonly published = computed(() =>
    this.list().filter(
      (professional) => professional.published !== false && professional.approved !== false,
    ),
  );
  readonly status = signal<'loading' | 'ready' | 'error'>('loading');

  constructor() {
    this.load();
    // The catalog follows the database: a profile that is approved or published shows up for everyone right away
    onSnapshot(
      collection(db, 'professionals'),
      (snapshot) => {
        this.list.set(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Professional));
        this.status.set('ready');
      },
      (error) => log.error('Failed to follow the professionals', error),
    );
  }

  async load() {
    this.status.set('loading');
    try {
      const snapshot = await getDocs(collection(db, 'professionals'));
      this.list.set(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Professional));
      this.status.set('ready');
    } catch (error) {
      log.error('Failed to load professionals', error);
      this.status.set('error');
    }
  }

  byId(id: string) {
    return this.list().find((professional) => professional.id === id);
  }

  // Slots already taken from `dateKey` on, by day: { "yyyy-mm-dd": Set of "HH:mm" }
  async busyFrom(id: string, dateKey: string) {
    const snapshot = await getDocs(
      query(collection(db, 'professionals', id, 'busy'), where('date', '>=', dateKey)),
    );
    const byDay = new Map<string, Set<string>>();
    for (const doc of snapshot.docs) {
      const [date, time] = doc.id.split('_');
      byDay.set(date, (byDay.get(date) ?? new Set<string>()).add(time));
    }
    return byDay;
  }

  // Slots ("HH:mm") already taken on a day: they live in professionals/{id}/busy, readable by anyone
  async busyTimes(id: string, dateKey: string) {
    const snapshot = await getDocs(
      query(collection(db, 'professionals', id, 'busy'), where('date', '==', dateKey)),
    );
    return new Set(snapshot.docs.map((doc) => doc.id.split('_')[1]));
  }
}
