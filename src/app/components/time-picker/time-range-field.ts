import { Component, computed, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TimeSheet } from './time-sheet';

// The opening and the closing of a day in one white field ("08:00 às 20:00") with a clock. Pressing it opens the picker, with
// a wheel of hours and one of minutes for each.
@Component({
  selector: 'app-time-range-field',
  imports: [MatIconModule, TimeSheet],
  template: `
    <button type="button" class="field" [attr.aria-label]="ariaLabel()" (click)="open.set(true)">
      <span class="value">{{ start() }} <span i18n>às</span> {{ end() }}</span>
      <mat-icon aria-hidden="true">schedule</mat-icon>
    </button>
    @if (open()) {
      <app-time-sheet
        [heading]="label()"
        [labels]="labels"
        [times]="[start(), end()]"
        (done)="save($event)"
        (cancelled)="open.set(false)"
      />
    }
  `,
  styleUrl: './time-field.scss',
})
export class TimeRangeField {
  // The day ("Segunda"): the title of the sheet and the name for screen readers
  readonly label = input.required<string>();
  readonly start = input.required<string>();
  readonly end = input.required<string>();
  readonly timesChange = output<{ start: string; end: string }>();

  protected readonly open = signal(false);
  protected readonly labels = [$localize`Abertura`, $localize`Fechamento`];
  protected readonly ariaLabel = computed(
    () => `${this.label()}: ${this.start()} ${$localize`às`} ${this.end()}`,
  );

  protected save([start, end]: string[]) {
    this.open.set(false);
    this.timesChange.emit({ start, end });
  }
}
