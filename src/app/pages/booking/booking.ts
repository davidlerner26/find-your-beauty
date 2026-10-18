import { Component, computed, input, signal } from '@angular/core';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MAKEUP_ARTISTS } from '../../data/makeup-artists';

type Day = { date: Date; weekday: string; number: number; disabled: boolean };

@Component({
  selector: 'app-booking',
  imports: [FormsModule],
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
})
export class Booking {
  readonly id = input.required<string>();
  readonly servicos = input<string>('');

  protected readonly artist = computed(() =>
    MAKEUP_ARTISTS.find((artist) => artist.id === this.id()),
  );

  protected readonly selectedServices = computed(() => {
    const ids = this.servicos().split(',');
    return this.artist()?.services.filter((service) => ids.includes(service.id)) ?? [];
  });
  protected readonly total = computed(() =>
    this.selectedServices().reduce((sum, service) => sum + service.price, 0),
  );

  protected readonly times = ['08:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

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
        disabled: date < this.today || date.getDay() === 0,
      };
    });
  });

  protected readonly canCheckout = computed(() => !!this.selectedDay() && !!this.selectedTime());

  constructor(
    private readonly location: Location,
    private readonly router: Router,
  ) {}

  protected checkout() {
    const day = this.selectedDay();
    const time = this.selectedTime();
    if (!day || !time) return;

    const pad = (n: number) => String(n).padStart(2, '0');
    const data = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;

    this.router.navigate(['/maquiadores', this.id(), 'pagamento'], {
      queryParams: { servicos: this.servicos(), data, horario: time },
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
