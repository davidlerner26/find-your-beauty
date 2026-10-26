import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

// Arrows to go through the photos of a row that scrolls sideways (the `target`). They take the place of the dots on
// wide screens; on phones they don't show, the finger does the job.
@Component({
  selector: 'app-carousel-arrows',
  imports: [MatIconModule],
  template: `
    <button
      i18n-aria-label
      type="button"
      class="arrow prev"
      aria-label="Foto anterior"
      (click)="go($event, -1)"
    >
      <mat-icon>chevron_left</mat-icon>
    </button>
    <button
      i18n-aria-label
      type="button"
      class="arrow next"
      aria-label="Próxima foto"
      (click)="go($event, 1)"
    >
      <mat-icon>chevron_right</mat-icon>
    </button>
  `,
  styleUrl: './carousel-arrows.scss',
})
export class CarouselArrows {
  readonly target = input.required<HTMLElement>();

  // One photo at a time; after the last one it goes back to the first
  protected go(event: Event, step: -1 | 1) {
    // The photo can be inside a link or a card that opens something
    event.preventDefault();
    event.stopPropagation();

    const el = this.target();
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    if (step === 1 && atEnd) el.scrollTo({ left: 0, behavior: 'smooth' });
    else if (step === -1 && el.scrollLeft <= 1)
      el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    else el.scrollBy({ left: step * el.clientWidth, behavior: 'smooth' });
  }
}
