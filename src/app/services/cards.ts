import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { log } from '../utils/log';
import { Auth } from './auth';
import { PAYMENTS } from './payments';
import { SavedCard } from './payments.types';

// The cards that the signed in client saved, and the one chosen for the next payment
@Injectable({ providedIn: 'root' })
export class Cards {
  private readonly payments = inject(PAYMENTS);
  private readonly auth = inject(Auth);

  readonly available = this.payments.available;
  readonly list = signal<SavedCard[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);
  private readonly chosenId = signal<string | null>(null);

  // The one the client chose; the first one (the latest saved) until they choose
  readonly selected = computed<SavedCard | null>(
    () => this.list().find((card) => card.id === this.chosenId()) ?? this.list()[0] ?? null,
  );

  constructor() {
    // Another person signing in on the same browser must not see these
    effect(() => {
      if (this.auth.user()?.uid) return;
      this.list.set([]);
      this.chosenId.set(null);
    });
  }

  async load() {
    if (!this.available || !this.auth.user()) return;
    this.loading.set(true);
    this.failed.set(false);
    try {
      this.list.set(await this.payments.cards());
    } catch (error) {
      log.error('Failed to load the cards', error);
      this.failed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  select(id: string) {
    this.chosenId.set(id);
  }

  async remove(id: string) {
    await this.payments.removeCard(id);
    this.list.update((cards) => cards.filter((card) => card.id !== id));
  }
}
