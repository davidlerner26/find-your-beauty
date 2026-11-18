import { Component, computed, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TimeSheet } from './time-sheet';

// A time ("08:00") in a white field with a clock. Pressing it opens the picker. An empty value shows "--:--". It is used for
// the times of the prices by day and time (a time that is switched off by "Início do dia" or "Fim do dia" is `disabled`).
@Component({
  selector: 'app-time-field',
  imports: [MatIconModule, TimeSheet],
  template: `
    <button
      type="button"
      class="field"
      [disabled]="disabled()"
      [attr.aria-label]="ariaLabel()"
      (click)="open.set(true)"
    >
      <span class="value">{{ value() || '--:--' }}</span>
      <mat-icon aria-hidden="true">schedule</mat-icon>
    </button>
    @if (open()) {
      <app-time-sheet
        [heading]="label()"
        [labels]="[label()]"
        [times]="[value()]"
        (done)="save($event)"
        (cancelled)="open.set(false)"
      />
    }
  `,
  styleUrl: './time-field.scss',
})
export class TimeField {
  // What the field is ("A partir das", "Até as"): the title of the sheet and the name for screen readers
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly disabled = input(false);
  readonly valueChange = output<string>();

  protected readonly open = signal(false);
  protected readonly ariaLabel = computed(() => `${this.label()}: ${this.value() || '--:--'}`);

  protected save([time]: string[]) {
    this.open.set(false);
    this.valueChange.emit(time);
  }
}
