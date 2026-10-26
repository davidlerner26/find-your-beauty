import { afterNextRender, DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Not hidden by the page (display: none or visibility: hidden)
const isShown = (item: HTMLElement) => {
  const style = getComputedStyle(item);
  return !item.hidden && style.display !== 'none' && style.visibility !== 'hidden';
};

// What a dialog needs for the keyboard and for screen readers: focus goes into it when it opens, Tab stays inside
// while it is open, Escape closes it, and focus goes back to where it was when it closes.
@Directive({
  selector: '[appDialog]',
  host: {
    tabindex: '-1',
    '(keydown.escape)': 'escape.emit()',
    // Angular matches key events with their modifiers: Tab and Shift+Tab are two different events
    '(keydown.tab)': 'keepFocusInside($event)',
    '(keydown.shift.tab)': 'keepFocusInside($event)',
    style: 'outline: none',
  },
})
export class DialogFocus {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly before = document.activeElement as HTMLElement | null;

  readonly escape = output<void>();

  constructor() {
    afterNextRender(() => this.host.focus({ preventScroll: true }));
    inject(DestroyRef).onDestroy(() => this.before?.focus?.({ preventScroll: true }));
  }

  protected keepFocusInside(event: Event) {
    const shift = (event as KeyboardEvent).shiftKey;
    const items = Array.from(this.host.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isShown);
    if (!items.length) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (shift && (active === first || active === this.host)) {
      event.preventDefault();
      last.focus();
    } else if (!shift && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
