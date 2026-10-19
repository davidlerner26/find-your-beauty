import { Component, computed, input, model, signal } from '@angular/core';
import { DateRange } from '../../models/professional';
import { toDateKey } from '../../utils/slots';

export type PendingRange = { start: string | null; end: string | null };

type Cell = { key: string; day: number; disabled: boolean } | null;

// Calendar to pick a period: the first click sets the start, the second sets the end.
// A new click after that starts over. Clicking the same day twice picks a single day.
@Component({
  selector: 'app-date-range-picker',
  templateUrl: './date-range-picker.html',
  styleUrl: './date-range-picker.scss',
})
export class DateRangePicker {
  readonly range = model<PendingRange>({ start: null, end: null });
  // Earliest day that can be picked ("yyyy-mm-dd")
  readonly min = input('');
  // Periods that are already taken: shown on the calendar and not selectable
  readonly blocked = input<DateRange[]>([]);

  protected readonly weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  protected readonly month = signal(this.startOfMonth(new Date()));

  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.month()),
  );

  protected readonly cells = computed<Cell[]>(() => {
    const month = this.month();
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const blanks: Cell[] = Array(month.getDay()).fill(null);

    return [
      ...blanks,
      ...Array.from({ length: total }, (_, i): Cell => {
        const key = toDateKey(new Date(month.getFullYear(), month.getMonth(), i + 1));
        return { key, day: i + 1, disabled: !!this.min() && key < this.min() };
      }),
    ];
  });

  protected blockedBand(key: string) {
    const range = this.blocked().find((r) => key >= r.start && key <= r.end);
    if (!range) return null;
    return { first: key === range.start, last: key === range.end };
  }

  protected readonly canGoBack = computed(
    () => !this.min() || toDateKey(this.month()) > this.min().slice(0, 8) + '01',
  );

  protected changeMonth(delta: number) {
    const month = this.month();
    this.month.set(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  }

  protected pick(key: string) {
    const { start, end } = this.range();

    if (!start || end) {
      this.range.set({ start: key, end: null });
    } else if (key < start) {
      // Picked an earlier day: it becomes the start
      this.range.set({ start: key, end: start });
    } else {
      this.range.set({ start, end: key });
    }
  }

  protected isStart(key: string) {
    return this.range().start === key;
  }

  protected isEnd(key: string) {
    const { start, end } = this.range();
    return (end ?? start) === key;
  }

  protected inRange(key: string) {
    const { start, end } = this.range();
    return !!start && !!end && key > start && key < end;
  }

  private startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
}
