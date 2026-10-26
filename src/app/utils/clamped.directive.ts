import {
  afterNextRender,
  Directive,
  ElementRef,
  inject,
  input,
  OnDestroy,
  signal,
} from '@angular/core';

// Tells if a text with a line clamp is really cut (so a "Ler mais" button is only shown when it is needed).
// While the text is expanded the clamp is off, so the answer is not updated: the page keeps the button.
@Directive({ selector: '[appClamped]', exportAs: 'clamped' })
export class Clamped implements OnDestroy {
  readonly expanded = input(false, { alias: 'appClamped' });
  readonly clamped = signal(false);

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private observer?: ResizeObserver;

  constructor() {
    afterNextRender(() => {
      this.check();
      // The width changes when the screen turns, and with it the number of lines
      this.observer = new ResizeObserver(() => this.check());
      this.observer.observe(this.element);
    });
  }

  private check() {
    if (this.expanded()) return;
    this.clamped.set(this.element.scrollHeight > this.element.clientHeight + 1);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
