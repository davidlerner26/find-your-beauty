import { afterNextRender, Component, ElementRef, input, model, viewChild } from '@angular/core';
import { pad2 } from '../../utils/time-wheel';

// One column of the time picker: a list that snaps to a value, with the chosen one in the middle band. It is moved by
// scrolling (touch, wheel of the mouse), by a click on a value, or by the arrows of the keyboard.
@Component({
  selector: 'app-time-wheel',
  template: `
    <div
      #list
      class="wheel"
      role="spinbutton"
      tabindex="0"
      [attr.aria-label]="label()"
      [attr.aria-valuenow]="value()"
      [attr.aria-valuetext]="text(value())"
      [attr.aria-valuemin]="values()[0]"
      [attr.aria-valuemax]="values()[values().length - 1]"
      (scroll)="onScroll()"
      (keydown.arrowup)="step($event, -1)"
      (keydown.arrowdown)="step($event, 1)"
    >
      @for (item of values(); track item) {
        <button
          type="button"
          tabindex="-1"
          aria-hidden="true"
          class="item"
          [class.on]="item === value()"
          (click)="pick(item)"
        >
          {{ text(item) }}
        </button>
      }
    </div>
  `,
  styleUrl: './time-wheel.scss',
})
export class TimeWheel {
  readonly values = input.required<number[]>();
  readonly value = model.required<number>();
  readonly label = input.required<string>();

  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  protected readonly text = pad2;

  constructor() {
    // It opens on the current value
    afterNextRender(() => this.scrollToValue());
  }

  private itemHeight() {
    return this.list().nativeElement.firstElementChild?.getBoundingClientRect().height || 44;
  }

  private scrollToValue() {
    const index = Math.max(0, this.values().indexOf(this.value()));
    this.list().nativeElement.scrollTop = index * this.itemHeight();
  }

  // The value in the middle band follows the scroll
  protected onScroll() {
    const values = this.values();
    const index = Math.round(this.list().nativeElement.scrollTop / this.itemHeight());
    const next = values[Math.min(values.length - 1, Math.max(0, index))];
    if (next !== undefined && next !== this.value()) this.value.set(next);
  }

  protected pick(item: number) {
    this.value.set(item);
    this.scrollToValue();
  }

  protected step(event: Event, direction: 1 | -1) {
    event.preventDefault();
    const values = this.values();
    const next = values[values.indexOf(this.value()) + direction];
    if (next !== undefined) this.pick(next);
  }
}
