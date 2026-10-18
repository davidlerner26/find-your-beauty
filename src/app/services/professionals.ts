import { Injectable, signal } from '@angular/core';
import { collection, getDocs } from 'firebase/firestore';
import { Professional } from '../models/professional';
import { db } from './firebase';

@Injectable({ providedIn: 'root' })
export class Professionals {
  readonly list = signal<Professional[]>([]);
  readonly status = signal<'loading' | 'ready' | 'error'>('loading');

  constructor() {
    this.load();
  }

  async load() {
    this.status.set('loading');
    try {
      const snapshot = await getDocs(collection(db, 'professionals'));
      this.list.set(
        snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Professional),
      );
      this.status.set('ready');
    } catch (error) {
      console.error('Failed to load professionals', error);
      this.status.set('error');
    }
  }

  byId(id: string) {
    return this.list().find((professional) => professional.id === id);
  }
}
