import { computed, Injectable, signal } from '@angular/core';

type Position = { lat: number; lng: number };

const DISMISSED_KEY = 'location-prompt-dismissed';

// Where the user is. The browser's own permission prompt only shows after the user agrees in our modal.
@Injectable({ providedIn: 'root' })
export class UserLocation {
  readonly position = signal<Position | null>(null);
  readonly permission = signal<PermissionState | 'unknown'>('unknown');
  readonly requesting = signal(false);
  private readonly dismissed = signal(this.readDismissed());

  // The modal is only worth showing while the browser would still ask
  readonly shouldAsk = computed(
    () => this.permission() === 'prompt' && !this.dismissed() && !this.position(),
  );

  constructor() {
    this.init();
  }

  // Asks the browser for the position. Resolves to false when it was denied or failed.
  request() {
    if (!navigator.geolocation) return Promise.resolve(false);

    this.requesting.set(true);
    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          this.position.set({ lat: coords.latitude, lng: coords.longitude });
          this.permission.set('granted');
          this.requesting.set(false);
          resolve(true);
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) this.permission.set('denied');
          this.requesting.set(false);
          resolve(false);
        },
        { timeout: 15_000 },
      );
    });
  }

  dismiss() {
    this.dismissed.set(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Storage can be blocked: it will just ask again next time
    }
  }

  private async init() {
    if (!navigator.geolocation) return;

    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      this.permission.set(status.state);
      status.onchange = () => this.permission.set(status.state);
    } catch {
      // Browsers without the Permissions API: assume it hasn't been asked yet
      this.permission.set('prompt');
    }

    // Already allowed before: no need to ask again
    if (this.permission() === 'granted') await this.request();
  }

  private readDismissed() {
    try {
      return localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  }
}
