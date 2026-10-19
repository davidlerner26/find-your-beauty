import { Component, computed, effect, input, signal } from '@angular/core';
import { roundMoney } from '../../utils/money';
import { PricePipe } from '../../utils/price.pipe';
import { Spinner } from '../../components/spinner/spinner';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DEFAULT_AVAILABILITY } from '../../models/professional';
import { Professionals } from '../../services/professionals';
import { freeStartTimes, isWorkingDay, toDateKey } from '../../utils/slots';

type Day = { date: Date; weekday: string; number: number; disabled: boolean };

@Component({
  selector: 'app-booking',
  imports: [PricePipe, Spinner, FormsModule, RouterLink],
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
})
export class Booking {
  readonly id = input.required<string>();
  readonly servicos = input<string>('');

  protected readonly artist = computed(() =>
    this.professionals.byId(this.id()),
  );

  protected readonly selectedServices = computed(() => {
    const ids = this.servicos().split(',');
    return this.artist()?.services.filter((service) => ids.includes(service.id)) ?? [];
  });
  protected readonly total = computed(() =>
    roundMoney(this.selectedServices().reduce((sum, service) => sum + service.price, 0)),
  );

  private readonly availability = computed(() => this.artist()?.availability ?? DEFAULT_AVAILABILITY);
  private readonly duration = computed(
    () => this.selectedServices().reduce((sum, service) => sum + service.durationMinutes, 0) || 60,
  );

  // Slots already taken on the selected day (null while loading)
  private readonly taken = signal<Set<string> | null>(null);

  protected readonly loadingTimes = computed(() => !!this.selectedDay() && this.taken() === null);

  protected readonly times = computed(() => {
    const day = this.selectedDay();
    const taken = this.taken();
    if (!day || !taken) return [];
    return freeStartTimes(day, this.availability(), this.duration(), taken);
  });

  private readonly today = this.startOfDay(new Date());
  protected readonly month = signal(new Date(this.today.getFullYear(), this.today.getMonth(), 1));
  protected readonly selectedDay = signal<Date | null>(null);
  protected readonly selectedTime = signal<string | null>(null);
  protected notes = '';

  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.month()),
  );

  protected readonly isCurrentMonth = computed(
    () => this.month().getTime() === new Date(this.today.getFullYear(), this.today.getMonth(), 1).getTime(),
  );

  protected readonly days = computed<Day[]>(() => {
    const month = this.month();
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });

    return Array.from({ length: total }, (_, i) => {
      const date = new Date(month.getFullYear(), month.getMonth(), i + 1);
      return {
        date,
        weekday: weekday.format(date).replace('.', ''),
        number: i + 1,
        disabled: date < this.today || !isWorkingDay(date, this.availability()),
      };
    });
  });

  protected readonly canCheckout = computed(() => !!this.selectedDay() && !!this.selectedTime());

  constructor(
    private readonly location: Location,
    private readonly router: Router,
    protected readonly professionals: Professionals,
  ) {
    // Loads the taken slots whenever the day changes
    effect((onCleanup) => {
      const day = this.selectedDay();
      const id = this.id();
      this.selectedTime.set(null);
      this.taken.set(null);
      if (!day) return;

      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.professionals
        .busyTimes(id, toDateKey(day))
        .then((taken) => !cancelled && this.taken.set(taken))
        .catch((error) => {
          console.error('Failed to load times', error);
          if (!cancelled) this.taken.set(new Set());
        });
    });
  }

  protected checkout() {
    const day = this.selectedDay();
    const time = this.selectedTime();
    if (!day || !time) return;

    const data = toDateKey(day);

    this.router.navigate(['/maquiadores', this.id(), 'pagamento'], {
      queryParams: {
        servicos: this.servicos(),
        data,
        horario: time,
        notas: this.notes.trim() || null,
      },
    });
  }

  protected goBack() {
    this.location.back();
  }

  protected changeMonth(delta: number) {
    const month = this.month();
    this.month.set(new Date(month.getFullYear(), month.getMonth() + delta, 1));
    this.selectedDay.set(null);
  }

  protected isSelected(day: Day) {
    return this.selectedDay()?.getTime() === day.date.getTime();
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}
