import { computed, effect, Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { Auth } from './auth';
import { Feedback } from './feedback';
import { db } from './firebase';
import { log } from '../utils/log';
import { COLLECTIONS } from '../../../shared/domain';
import { PATHS } from '../utils/paths';

// users/{uid}/favorites/{professionalId}: the professionals a client hearted
@Injectable({ providedIn: 'root' })
export class Favorites {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly feedback = inject(Feedback);

  readonly ids = signal<string[]>([]);
  // Visitors don't see the heart: favorites belong to an account
  readonly available = computed(() => !!this.auth.user());
  readonly loading = signal(true);

  constructor() {
    effect((onCleanup) => {
      const uid = this.auth.user()?.uid;
      if (!uid || this.auth.role() !== 'client') {
        this.ids.set([]);
        this.loading.set(!this.auth.ready());
        return;
      }

      this.loading.set(true);
      const unsubscribe = onSnapshot(
        collection(db, COLLECTIONS.users, uid, COLLECTIONS.favorites),
        (snapshot) => {
          this.ids.set(snapshot.docs.map((d) => d.id));
          this.loading.set(false);
        },
        (error) => {
          log.error('Failed to load favorites', error);
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
      this.router.navigate([PATHS.login]);
      return;
    }
    if (this.auth.role() !== 'client') return;

    const favorite = doc(db, COLLECTIONS.users, uid, COLLECTIONS.favorites, professionalId);
    const removing = this.has(professionalId);
    try {
      if (removing) await deleteDoc(favorite);
      else await setDoc(favorite, { createdAt: serverTimestamp() });
      this.feedback.show(
        removing ? $localize`Removido dos favoritos` : $localize`Adicionado aos favoritos`,
        2500,
      );
    } catch (error) {
      this.feedback.show($localize`Não foi possível atualizar os favoritos. Tente novamente.`);
      throw error;
    }
  }
}
