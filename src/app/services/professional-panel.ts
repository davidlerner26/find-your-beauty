import { Location } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { PATHS } from '../utils/paths';

// The page of a professional as a panel on the side of the screen the client is on (wide screens, professionals
// with no place on the map: see utils/professional-panel.ts). The address bar shows the page of the professional,
// so the link can be shared, but the router does not navigate: the screen underneath stays as it is.
@Injectable({ providedIn: 'root' })
export class ProfessionalPanel {
  private readonly location = inject(Location);

  readonly openId = signal<string | null>(null);

  constructor() {
    // The Back button of the browser takes the address bar back to the screen underneath
    this.location.subscribe(() => this.openId.set(null));
    // Any other navigation (a tab, a booking) leaves the panel behind
    inject(Router)
      .events.pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.openId.set(null));
  }

  open(id: string) {
    const url = PATHS.professional(id);
    // Another professional while the panel is open replaces the entry: Back still goes to the screen underneath
    if (this.openId()) this.location.replaceState(url);
    else this.location.go(url);
    this.openId.set(id);
  }

  close() {
    if (!this.openId()) return;
    this.openId.set(null);
    // Removes the entry that `open` added, so Back does not bring the panel back
    this.location.back();
  }
}
