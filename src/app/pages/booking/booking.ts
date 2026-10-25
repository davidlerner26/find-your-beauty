import { MatIconModule } from '@angular/material/icon';
import { Component, computed, effect, ElementRef, input, signal } from '@angular/core';
import { roundMoney } from '../../utils/money';
import { PricePipe } from '../../utils/price.pipe';
import { Spinner } from '../../components/spinner/spinner';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DEFAULT_AVAILABILITY } from '../../models/professional';
import { Auth } from '../../services/auth';
import { Bookings } from '../../services/bookings';
import { Feedback } from '../../services/feedback';
import { Users } from '../../services/users';
import { missingProfileData } from '../../models/user';
import { Professionals } from '../../services/professionals';
import { priceAt } from '../../utils/pricing';
import { busyIdsFor, freeStartTimes, isWorkingDay, toDateKey } from '../../utils/slots';
import { INTL_LOCALE } from '../../utils/locale';

type Day = { date: Date; weekday: string; number: number; disabled: boolean };

@Component({
  selector: 'app-booking',
  imports: [PricePipe, Spinner, FormsModule, RouterLink, MatIconModule],
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
    const ids = (this.servicos() ?? '').split(',');
    return this.artist()?.services.filter((service) => ids.includes(service.id)) ?? [];
  });
  // The price follows the start time: before a day and time are chosen, the normal prices
  private totalAt(day: Date | null, time: string | null) {
    return roundMoney(
      this.selectedServices().reduce((sum, service) => sum + (day && time ? priceAt(service, day, time) : service.price), 0),
    );
  }

  protected readonly total = computed(() => this.totalAt(this.selectedDay(), this.selectedTime()));

  // Price of a time slot when it is different from the normal total
  protected timePrice(time: string) {
    const day = this.selectedDay();
    const price = this.totalAt(day, time);
    return price !== this.totalAt(null, null) ? price : null;
  }

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

  // Where the professional attends: only a client of a professional that accepts both can choose
  protected readonly canChoosePlace = computed(() => this.artist()?.serviceMode === 'both');
  // At home is the default whenever it is possible
  protected readonly place = signal<'home' | 'studio'>('home');
  protected readonly effectivePlace = computed<'home' | 'studio'>(() => {
    const mode = this.artist()?.serviceMode;
    if (mode === 'both') return this.place();
    return mode === 'home' ? 'home' : 'studio';
  });

  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat(INTL_LOCALE, { month: 'long', year: 'numeric' }).format(this.month()),
  );

  protected readonly isCurrentMonth = computed(
    () => this.month().getTime() === new Date(this.today.getFullYear(), this.today.getMonth(), 1).getTime(),
  );

  protected readonly days = computed<Day[]>(() => {
    const month = this.month();
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const weekday = new Intl.DateTimeFormat(INTL_LOCALE, { weekday: 'short' });

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

  protected readonly canCheckout = computed(() => !!this.selectedDay() && !!this.selectedTime() && !this.saving());
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  // The first thing the page does is to show the next day the professional can attend
  private firstDayPicked = false;

  constructor(
    private readonly location: Location,
    private readonly router: Router,
    protected readonly professionals: Professionals,
    private readonly auth: Auth,
    private readonly bookings: Bookings,
    private readonly users: Users,
    private readonly host: ElementRef<HTMLElement>,
    private readonly feedback: Feedback,
  ) {
    effect(() => {
      if (!this.artist() || this.firstDayPicked) return;
      this.firstDayPicked = true;
      void this.pickNextAvailableDay();
    });

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

  // Selects the next day with a free time (looks up to 120 days ahead) and brings it into view
  private async pickNextAvailableDay() {
    const id = this.id();
    let busy = new Map<string, Set<string>>();
    try {
      busy = await this.professionals.busyFrom(id, toDateKey(this.today));
    } catch (error) {
      console.error('Failed to load busy days', error);
    }

    for (let offset = 0; offset < 120; offset++) {
      const date = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate() + offset);
      const free = freeStartTimes(date, this.availability(), this.duration(), busy.get(toDateKey(date)) ?? new Set());
      if (!free.length) continue;

      this.month.set(new Date(date.getFullYear(), date.getMonth(), 1));
      this.selectedDay.set(date);
      // Waits for the day list to render, then scrolls the strip to the chosen day
      setTimeout(() => this.host.nativeElement.querySelector('.day.selected')?.scrollIntoView({ inline: 'center', block: 'nearest' }), 100);
      return;
    }
  }

  // Finalizar: requests the booking. The professional confirms it afterwards.
  protected async checkout() {
    const artist = this.artist();
    const day = this.selectedDay();
    const time = this.selectedTime();
    const services = this.selectedServices();
    if (!artist || !day || !time || !services.length) return;

    if (!this.auth.user()) {
      this.router.navigate(['/entrar']);
      return;
    }

    // All the data of the profile is required: checked again here, in case it changed
    let clientAddress = '';
    this.saving.set(true);
    try {
      const profile = await this.users.get(this.auth.user()!.uid);
      clientAddress = profile?.address?.trim() ?? '';
      const missing = missingProfileData(profile);
      if (missing.length) {
        this.error.set(`Complete seus dados no perfil para agendar. Falta: ${missing.join(', ')}.`);
        return;
      }
    } catch (error) {
      console.error('Failed to check the profile data', error);
      this.error.set($localize`Não foi possível verificar seus dados. Tente novamente.`);
      return;
    } finally {
      this.saving.set(false);
    }

    const date = toDateKey(day);
    const [hour, minute] = time.split(':').map(Number);
    const place = this.effectivePlace();
    const durationMinutes = services.reduce((sum, service) => sum + service.durationMinutes, 0);

    this.error.set('');
    this.saving.set(true);
    try {
      await this.bookings.create({
        professionalId: artist.id,
        professionalUid: artist.ownerUid ?? null,
        professionalName: artist.name,
        services: services.map((service) => ({
          id: service.id,
          name: service.name,
          price: priceAt(service, day, time),
          durationMinutes: service.durationMinutes,
        })),
        startsAt: new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute),
        durationMinutes,
        total: this.total(),
        notes: this.notes.trim(),
        busyIds: busyIdsFor(date, time, durationMinutes, this.availability().slotMinutes),
        place,
        ...(place === 'home' ? { clientAddress } : {}),
        paymentStatus: 'pending',
      });
      this.feedback.show($localize`Agendamento solicitado! Você será avisado quando o profissional responder.`, 5000);
      this.router.navigate(['/agenda']);
    } catch (error) {
      console.error('Failed to create booking', error);
      // Slots can only be created once, so a denied write means someone took this time first
      this.error.set(
        (error as { code?: string }).code === 'permission-denied'
          ? $localize`Este horário acabou de ser ocupado. Escolha outro.`
          : $localize`Não foi possível enviar a solicitação. Tente novamente.`,
      );
    } finally {
      this.saving.set(false);
    }
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
