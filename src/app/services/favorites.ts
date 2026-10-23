import { computed, effect, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { Auth } from './auth';
import { db } from './firebase';

// users/{uid}/favorites/{professionalId}: the professionals a client hearted
@Injectable({ providedIn: 'root' })
export class Favorites {
  readonly ids = signal<string[]>([]);
  // Visitors don't see the heart: favorites belong to an account
  readonly available = computed(() => !!this.auth.user());
  readonly loading = signal(true);

  constructor(
    private readonly auth: Auth,
    private readonly router: Router,
  ) {
    effect((onCleanup) => {
      const uid = this.auth.user()?.uid;
      if (!uid || this.auth.role() !== 'client') {
        this.ids.set([]);
        this.loading.set(!this.auth.ready());
        return;
      }

      this.loading.set(true);
      const unsubscribe = onSnapshot(
        collection(db, 'users', uid, 'favorites'),
        (snapshot) => {
          this.ids.set(snapshot.docs.map((d) => d.id));
          this.loading.set(false);
        },
        (error) => {
          console.error('Failed to load favorites', error);
          this.loading.set(false);
        },
      );
      onCleanup(unsubscribe);
    });
  }

  has(professionalId: string) {
    return this.ids().includes(professionalId);
  }

  // Hearts or un-hearts. Visitors are sent to the login.
  async toggle(professionalId: string) {
    const uid = this.auth.user()?.uid;
    if (!uid) {
      this.router.navigate(['/entrar']);
      return;
    }
    if (this.auth.role() !== 'client') return;

    const favorite = doc(db, 'users', uid, 'favorites', professionalId);
    if (this.has(professionalId)) await deleteDoc(favorite);
    else await setDoc(favorite, { createdAt: serverTimestamp() });
  }
}
