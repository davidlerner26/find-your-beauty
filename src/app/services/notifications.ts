import { effect, Injectable, signal } from '@angular/core';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { Notification } from '../models/message';
import { Auth } from './auth';
import { db } from './firebase';

@Injectable({ providedIn: 'root' })
export class Notifications {
  readonly list = signal<Notification[]>([]);
  readonly loading = signal(true);

  constructor(private readonly auth: Auth) {
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
                createdAt: data['createdAt'] instanceof Timestamp ? data['createdAt'].toDate() : null,
              };
            }),
          );
          this.loading.set(false);
        },
        (error) => {
          console.error('Failed to load notifications', error);
          this.loading.set(false);
        },
      );
      onCleanup(unsubscribe);
    });
  }
}
