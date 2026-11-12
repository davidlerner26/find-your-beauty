import { DOCUMENT, Location } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { log } from '../utils/log';

// How often an open tab asks whether there is a new version (it also asks every time it comes back into view)
const CHECK_EVERY_MS = 30 * 60 * 1000;
const RELOADED_KEY = 'app-update-reloaded-at';

// The service worker keeps a copy of the app and, left alone, keeps showing it until the page is opened a second time
// after a new version. This puts the new version on screen without losing what the user is doing: it is loaded when
// the tab is hidden or on the next navigation (the page is loaded again at the address that was going to open), never
// in the middle of a form. A copy that is broken (a file that no longer exists) is replaced at once.
@Injectable({ providedIn: 'root' })
export class AppUpdates {
  private readonly updates = inject(SwUpdate);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly document = inject(DOCUMENT);
  // A new version is ready and waits for a safe moment to be loaded
  private waiting = false;

  start() {
    if (!this.updates.isEnabled) return;

    this.updates.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => {
        this.waiting = true;
        if (this.document.hidden) this.reload();
      });

    // A copy that cannot be recovered (the service worker says so): nothing to wait for
    this.updates.unrecoverable.subscribe(({ reason }) => {
      log.warn('The copy of the app is broken, loading it again', reason);
      if (this.reloadedJustNow()) return;
      this.reload();
    });

    this.document.addEventListener('visibilitychange', () => {
      if (this.document.hidden) {
        if (this.waiting) this.reload();
      } else {
        this.check();
      }
    });

    // The next navigation loads the page again, at the address that was going to open
    this.router.events
      .pipe(filter((e): e is NavigationStart => e instanceof NavigationStart))
      .subscribe((event) => {
        if (this.waiting) this.reload(this.location.prepareExternalUrl(event.url));
      });

    this.check();
    setInterval(() => this.check(), CHECK_EVERY_MS);
  }

  // A copy that stays broken must not make the page load again and again: once is tried, then it is left alone
  private reloadedJustNow() {
    const window = this.document.defaultView;
    try {
      const last = Number(window?.sessionStorage.getItem(RELOADED_KEY) ?? 0);
      window?.sessionStorage.setItem(RELOADED_KEY, String(Date.now()));
      return Date.now() - last < 60_000;
    } catch {
      return false;
    }
  }

  private check() {
    this.updates
      .checkForUpdate()
      .catch((error) => log.warn('Could not look for a new version', error));
  }

  private reload(to?: string) {
    this.waiting = false;
    const window = this.document.defaultView;
    if (!window) return;
    if (to) window.location.assign(to);
    else window.location.reload();
  }
}
