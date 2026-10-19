import { Component, computed, input, signal } from '@angular/core';
import { roundMoney } from '../../utils/money';
import { PricePipe } from '../../utils/price.pipe';
import { Spinner } from '../../components/spinner/spinner';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { formatDuration } from '../../models/professional';
import { Auth } from '../../services/auth';
import { Bookings } from '../../services/bookings';
import { Professionals } from '../../services/professionals';
import { DEFAULT_AVAILABILITY } from '../../models/professional';
import { busyIdsFor } from '../../utils/slots';

@Component({
  selector: 'app-checkout',
  imports: [PricePipe, Spinner, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  readonly id = input.required<string>();
  readonly servicos = input<string>('');
  readonly data = input<string>('');
  readonly horario = input<string>('');
  readonly notas = input<string>('');

  protected readonly artist = computed(() =>
    this.professionals.byId(this.id()),
  );

  protected readonly services = computed(() => {
    const ids = this.servicos().split(',');
    return this.artist()?.services.filter((service) => ids.includes(service.id)) ?? [];
  });

  protected readonly total = computed(() =>
    roundMoney(this.services().reduce((sum, service) => sum + service.price, 0)),
  );

  protected readonly duration = computed(() =>
    formatDuration(this.services().reduce((sum, service) => sum + service.durationMinutes, 0)),
  );

  protected readonly dateLabel = computed(() => {
    const [year, month, day] = this.data().split('-').map(Number);
    if (!year) return '-';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(
      new Date(year, month - 1, day),
    );
  });

  // Sample payment method until payments are integrated
  protected readonly card = { holder: 'Samantha Martin', number: '3124325***' };

  protected readonly paying = signal(false);
  protected readonly confirmed = signal(false);
  protected readonly error = signal('');

  constructor(
    private readonly location: Location,
    private readonly bookings: Bookings,
    protected readonly auth: Auth,
    protected readonly professionals: Professionals,
  ) {}

  protected async pay() {
    const artist = this.artist();
    const services = this.services();
    const [year, month, day] = this.data().split('-').map(Number);
    const [hour, minute] = this.horario().split(':').map(Number);

    if (!artist || !services.length || !year || Number.isNaN(hour)) {
      this.error.set('Dados do agendamento incompletos. Volte e escolha os serviços, o dia e o horário.');
      return;
    }

    this.error.set('');
    this.paying.set(true);
    try {
      await this.bookings.create({
        professionalId: artist.id,
        professionalUid: artist.ownerUid ?? null,
        professionalName: artist.name,
        services: services.map(({ id, name, price, durationMinutes }) => ({
          id,
          name,
          price,
          durationMinutes,
        })),
        startsAt: new Date(year, month - 1, day, hour, minute),
        durationMinutes: services.reduce((sum, service) => sum + service.durationMinutes, 0),
        total: this.total(),
        notes: this.notas(),
        busyIds: busyIdsFor(
          this.data(),
          this.horario(),
          services.reduce((sum, service) => sum + service.durationMinutes, 0),
          (artist.availability ?? DEFAULT_AVAILABILITY).slotMinutes,
        ),
        paymentStatus: 'pending',
      });
      this.confirmed.set(true);
    } catch (error) {
      console.error('Failed to create booking', error);
      // Slots can only be created once, so a denied write means someone took this time first
      this.error.set(
        (error as { code?: string }).code === 'permission-denied'
          ? 'Este horário acabou de ser ocupado. Volte e escolha outro.'
          : 'Não foi possível enviar a solicitação. Tente novamente.',
      );
    } finally {
      this.paying.set(false);
    }
  }

  protected goBack() {
    this.location.back();
  }
}
