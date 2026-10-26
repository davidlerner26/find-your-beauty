import { computed, effect, Injectable, signal, inject } from '@angular/core';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { Notification } from '../models/message';
import { Auth } from './auth';
import { db } from './firebase';
import { log } from '../utils/log';

@Injectable({ providedIn: 'root' })
export class Notifications {
  private readonly auth = inject(Auth);

  readonly list = signal<Notification[]>([]);
  readonly loading = signal(true);
  readonly unreadTotal = computed(
    () => this.list().filter((notification) => notification.unread).length,
  );

  constructor() {
    effect((onCleanup) => {
      const uid = this.auth.user()?.uid;
      if (!uid) {
        this.list.set([]);
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      const q = query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          this.list.set(
            snapshot.docs.map((d) => {
              const data = d.data({ serverTimestamps: 'estimate' });
              return {
                id: d.id,
                icon: data['icon'],
                text: data['text'] ?? [],
                unread: !!data['unread'],
                createdAt:
                  data['createdAt'] instanceof Timestamp ? data['createdAt'].toDate() : null,
              };
            }),
          );
          this.loading.set(false);
        },
        (error) => {
          log.error('Failed to load notifications', error);
          this.loading.set(false);
        },
      );
      onCleanup(unsubscribe);
    });
  }

  // Opening a notification marks it as read
  async markAsRead(id: string) {
    const uid = this.auth.user()?.uid;
    if (!uid) return;
    await updateDoc(doc(db, 'users', uid, 'notifications', id), { unread: false });
  }
}
