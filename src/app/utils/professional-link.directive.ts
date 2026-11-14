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
  readonly id = input.required<string>({ alias: 'appProfessionalLink' });

  private readonly router = inject(Router);
  private readonly panel = inject(ProfessionalPanel);
  private readonly professionals = inject(Professionals);

  protected readonly isAnchor =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'A';
  protected readonly href = computed(() => PATHS.professional(this.id()));

  protected open(event: MouseEvent) {
    // A link inside a card that is a link too: the inner one already took the click
    if (event.defaultPrevented) return;
    // A modified click (new tab, new window) is the browser's
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button) return;
    event.preventDefault();

    const wide = window.matchMedia(WIDE_SCREEN_QUERY).matches;
    if (opensInPanel(this.professionals.byId(this.id()), wide)) {
      this.panel.open(this.id());
    } else {
      void this.router.navigateByUrl(this.href());
    }
  }
}
