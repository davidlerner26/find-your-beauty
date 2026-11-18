import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { DialogFocus } from '../../utils/dialog.directive';
import { HOURS, joinTime, minuteOptions, splitTime } from '../../utils/time-wheel';
import { TimeWheel } from './time-wheel';

// The sheet of the time picker: a wheel of hours and one of minutes for each time (one time, or the opening and the closing
// of a day), with "Cancelar" and "Pronto". On a phone it comes up from the bottom; on a wide screen it is a card in the middle.
// It starts from `times` and only hands the new ones over when "Pronto" is pressed.
@Component({
  selector: 'app-time-sheet',
  imports: [DialogFocus, TimeWheel],
  template: `
    <div class="backdrop" role="presentation" (click)="cancelled.emit()"></div>
    <div
      class="sheet"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="heading()"
      appDialog
      (escape)="cancelled.emit()"
    >
      <header>
        <h2>{{ heading() }}</h2>
        <button i18n type="button" class="cancel" (click)="cancelled.emit()">Cancelar</button>
      </header>

      @for (block of blocks(); track $index; let i = $index) {
        <section>
          <h3>{{ block.label }}</h3>
          <div class="wheels">
            <div class="band" aria-hidden="true"></div>
            <app-time-wheel
              [values]="hours"
              [value]="draft()[i].hour"
              (valueChange)="setHour(i, $event)"
              [label]="block.label + ': ' + hourLabel"
            />
            <span class="colon" aria-hidden="true">:</span>
            <app-time-wheel
              [values]="block.minutes"
              [value]="draft()[i].minute"
              (valueChange)="setMinute(i, $event)"
              [label]="block.label + ': ' + minuteLabel"
            />
          </div>
        </section>
      }

      <button i18n type="button" class="done" (click)="finish()">Pronto</button>
    </div>
  `,
  styleUrl: './time-sheet.scss',
})
export class TimeSheet {
  readonly heading = input.required<string>();
  // The title of each time ("Abertura", "Fechamento")
  readonly labels = input.required<string[]>();
  // The times it starts from ("08:00"; anything else opens on 08:00)
  readonly times = input.required<string[]>();

  readonly done = output<string[]>();
  readonly cancelled = output<void>();

  protected readonly hours = HOURS;
  protected readonly hourLabel = $localize`Hora`;
  protected readonly minuteLabel = $localize`Minutos`;

  // What is being chosen, kept apart from the field until "Pronto"
  protected readonly draft = linkedSignal(() =>
    this.labels().map((_, i) => splitTime(this.times()[i] ?? '')),
  );

  // The wheels of each time: its label and the minutes it offers (the minute already saved is never lost)
  protected readonly blocks = computed(() =>
    this.labels().map((label, i) => ({
      label,
      minutes: minuteOptions(splitTime(this.times()[i] ?? '').minute),
    })),
  );

  constructor() {
    // The page behind does not scroll while the sheet is open
    const body = document.body;
    const before = body.style.overflow;
    body.style.overflow = 'hidden';
    inject(DestroyRef).onDestroy(() => (body.style.overflow = before));
  }

  protected setHour(index: number, hour: number) {
    this.draft.update((all) => all.map((time, i) => (i === index ? { ...time, hour } : time)));
  }

  protected setMinute(index: number, minute: number) {
    this.draft.update((all) => all.map((time, i) => (i === index ? { ...time, minute } : time)));
  }

  protected finish() {
    this.done.emit(this.draft().map(({ hour, minute }) => joinTime(hour, minute)));
  }
}
