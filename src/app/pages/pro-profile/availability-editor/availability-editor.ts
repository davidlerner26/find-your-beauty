import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Availability, DateRange } from '../../../models/professional';
import { toDateKey } from '../../../utils/slots';
import {
  DateRangePicker,
  PendingRange,
} from '../../../components/date-range-picker/date-range-picker';
import { addBlockedRange, invalidDayKeys, rangeLabel } from '../profile-form';
import { WEEKDAYS } from '../weekdays';

// The days and hours the professional works, and the periods blocked for holidays and days off.
// The form hands over its hours and the editor changes them in place; it is told when to save.
@Component({
  selector: 'app-availability-editor',
  imports: [DateRangePicker, FormsModule],
  templateUrl: './availability-editor.html',
  styleUrl: './availability-editor.scss',
})
export class AvailabilityEditor {
  readonly availability = input.required<Availability>();
  // Blocking or unblocking a period is saved right away
  readonly changed = output<void>();

  protected readonly weekdays = WEEKDAYS;
  protected readonly today = toDateKey(new Date());
  protected readonly pending = signal<PendingRange>({ start: null, end: null });
  protected readonly rangeLabel = rangeLabel;

  // Days where the closing time isn't after the opening time
  protected get invalidDays() {
    return invalidDayKeys(
      this.availability(),
      this.weekdays.map(({ key }) => key),
    );
  }

  protected blockPending() {
    if (!this.pending().start) return;

    const availability = this.availability();
    availability.blockedRanges = addBlockedRange(availability.blockedRanges, this.pending());
    this.pending.set({ start: null, end: null });
    this.changed.emit();
  }

  protected unblock(range: DateRange) {
    const availability = this.availability();
    availability.blockedRanges = availability.blockedRanges.filter((r) => r !== range);
    this.changed.emit();
  }
}
