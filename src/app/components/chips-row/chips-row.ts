import {
  afterNextRender,
  Component,
  ElementRef,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

// A row of chips that scrolls sideways. On wide screens the arrows show next to the row (not over it) and only
// when there is something to see on that side; on phones the finger scrolls it.
@Component({
  selector: 'app-chips-row',
  imports: [MatIconModule],
  template: `
    @if (canBack()) {
      <button i18n-aria-label type="button" class="arrow" aria-label="Anterior" (click)="go(-1)">
        <mat-icon>chevron_left</mat-icon>
      </button>
    }
    <div #row class="row" (scroll)="update()"><ng-content /></div>
    @if (canForward()) {
      <button i18n-aria-label type="button" class="arrow" aria-label="Próximo" (click)="go(1)">
        <mat-icon>chevron_right</mat-icon>
      </button>
    }
  `,
  styleUrl: './chips-row.scss',
})
export class ChipsRow implements OnDestroy {
  private readonly row = viewChild.required<ElementRef<HTMLElement>>('row');
  protected readonly canBack = signal(false);
  protected readonly canForward = signal(false);
  private readonly observers: { disconnect(): void }[] = [];

  constructor() {
    afterNextRender(() => {
      const el = this.row().nativeElement;
      // The size of the row and its chips change (a window that is resized, a category that is turned off)
      const resize = new ResizeObserver(() => this.update());
      resize.observe(el);
      const mutation = new MutationObserver(() => this.update());
      mutation.observe(el, { childList: true, subtree: true });
      this.observers.push(resize, mutation);
      this.update();
    });
  }

  ngOnDestroy() {
    this.observers.forEach((observer) => observer.disconnect());
  }

  protected update() {
    const el = this.row().nativeElement;
    this.canBack.set(el.scrollLeft > 1);
    this.canForward.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  protected go(step: -1 | 1) {
    const el = this.row().nativeElement;
    el.scrollBy({ left: step * el.clientWidth * 0.8, behavior: 'smooth' });
  }
}
