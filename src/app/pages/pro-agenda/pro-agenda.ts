import { Component, computed } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Booking, BookingStatus } from '../../models/booking';
import { Auth } from '../../services/auth';
import { Bookings } from '../../services/bookings';
import { Professionals } from '../../services/professionals';
import { formatClock } from '../../utils/format-date';

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Aguardando',
  confirmed: 'Confirmado',
  declined: 'Recusado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

@Component({
  selector: 'app-pro-agenda',
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './pro-agenda.html',
  styleUrl: './pro-agenda.scss',
})
export class ProAgenda {
  protected readonly clock = formatClock;

  protected readonly profile = computed(() => this.professionals.byId(this.auth.user()?.uid ?? ''));

  protected readonly pending = computed(() =>
    this.bookings.received().filter((booking) => booking.status === 'pending'),
  );
  protected readonly upcoming = computed(() =>
    this.bookings.received().filter((booking) => booking.status === 'confirmed'),
  );
  protected readonly history = computed(() =>
    this.bookings
      .received()
      .filter((booking) => ['completed', 'declined', 'cancelled'].includes(booking.status))
      .reverse(),
  );

  constructor(
    private readonly auth: Auth,
    private readonly bookings: Bookings,
    private readonly professionals: Professionals,
  ) {}

  protected label(booking: Booking) {
    return STATUS_LABEL[booking.status];
  }

  protected dateLabel(booking: Booking) {
    return booking.startsAt.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
    });
  }

  protected answer(booking: Booking, status: 'confirmed' | 'declined' | 'completed') {
    this.bookings
      .setStatus(booking, status)
      .catch((error) => console.error('Failed to update booking', error));
  }
}
