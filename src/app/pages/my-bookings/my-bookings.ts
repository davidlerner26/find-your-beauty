import { MatIconModule } from '@angular/material/icon';
import { Component, computed } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Spinner } from '../../components/spinner/spinner';
import { Booking, BookingStatus } from '../../models/booking';
import { Auth } from '../../services/auth';
import { Bookings } from '../../services/bookings';
import { formatClock } from '../../utils/format-date';
import { PricePipe } from '../../utils/price.pipe';
import { INTL_LOCALE } from '../../utils/locale';
import { CatalogPipe } from '../../utils/catalog.pipe';

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: $localize`Aguardando`,
  confirmed: $localize`Confirmado`,
  declined: $localize`Recusado`,
  completed: $localize`Concluído`,
  cancelled: $localize`Cancelado`,
  cancelledByProfessional: $localize`Cancelado pelo profissional`,
};

@Component({
  selector: 'app-my-bookings',
  imports: [CatalogPipe, PricePipe, RouterLink, Spinner, NgTemplateOutlet, MatIconModule],
  templateUrl: './my-bookings.html',
  styleUrl: './my-bookings.scss',
})
export class MyBookings {
  protected readonly clock = formatClock;

  // Still going to happen: waiting for an answer or confirmed
  protected readonly upcoming = computed(() =>
    this.bookings.mine().filter((booking) => ['pending', 'confirmed'].includes(booking.status)),
  );
  protected readonly history = computed(() =>
    this.bookings
      .mine()
      .filter((booking) => ['completed', 'declined', 'cancelled', 'cancelledByProfessional'].includes(booking.status))
      .reverse(),
  );

  constructor(
    protected readonly auth: Auth,
    protected readonly bookings: Bookings,
  ) {}

  protected label(booking: Booking) {
    return STATUS_LABEL[booking.status];
  }

  protected dateLabel(booking: Booking) {
    return booking.startsAt.toLocaleDateString(INTL_LOCALE, {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
    });
  }

  protected cancel(booking: Booking) {
    if (!confirm($localize`Cancelar o agendamento com ${booking.professionalName}:professionalName:?`)) return;
    this.bookings.cancel(booking).catch((error) => console.error('Failed to cancel booking', error));
  }
}
