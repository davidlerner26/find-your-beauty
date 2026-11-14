import { computed, Directive, ElementRef, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { ProfessionalPanel } from '../services/professional-panel';
import { Professionals } from '../services/professionals';
import { PATHS } from './paths';
import { opensInPanel, WIDE_SCREEN_QUERY } from './professional-panel';

// A link to the page of a professional. On a wide screen a professional with no place on the map opens as a panel
// on the screen the client is on; any other click goes to the page, as `routerLink` does. The address stays in the
// `href`, so "open in a new tab" works.
@Directive({
  selector: '[appProfessionalLink]',
  host: {
    '[attr.href]': 'isAnchor ? href() : null',
    '(click)': 'open($event)',
  },
})
export class ProfessionalLink {
  // null: nothing to open (a link with no address, like `routerLink` with null)
  readonly id = input.required<string | null>({ alias: 'appProfessionalLink' });

  // A part of the page to go to (`#avaliacoes`)
  readonly fragment = input<string>();

  private readonly router = inject(Router);
  private readonly panel = inject(ProfessionalPanel);
  private readonly professionals = inject(Professionals);

  protected readonly isAnchor =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'A';
  protected readonly href = computed(() => {
    const id = this.id();
    const fragment = this.fragment();
    return id ? PATHS.professional(id) + (fragment ? `#${fragment}` : '') : null;
  });

  protected open(event: MouseEvent) {
    const id = this.id();
    const href = this.href();
    if (!id || !href) return;
    // A link inside a card that is a link too: the inner one already took the click
    if (event.defaultPrevented) return;
    // A modified click (new tab, new window) is the browser's
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button) return;
    event.preventDefault();

    const wide = window.matchMedia(WIDE_SCREEN_QUERY).matches;
    if (opensInPanel(this.professionals.byId(id), wide)) {
      this.panel.open(id);
      const fragment = this.fragment();
      // The panel is drawn in the next turn: then the part of the page is there to be shown
      if (fragment) setTimeout(() => document.getElementById(fragment)?.scrollIntoView(), 0);
    } else {
      void this.router.navigateByUrl(href);
    }
  }
}
