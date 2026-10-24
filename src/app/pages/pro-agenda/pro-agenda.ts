import { Component, computed } from '@angular/core';
import { PricePipe } from '../../utils/price.pipe';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Booking, BookingStatus } from '../../models/booking';
import { Auth } from '../../services/auth';
import { Bookings } from '../../services/bookings';
import { Professionals } from '../../services/professionals';
import { formatClock } from '../../utils/format-date';
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
  selector: 'app-pro-agenda',
  imports: [CatalogPipe, PricePipe, RouterLink, NgTemplateOutlet],
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
      .filter((booking) => ['completed', 'declined', 'cancelled', 'cancelledByProfessional'].includes(booking.status))
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
    return booking.startsAt.toLocaleDateString(INTL_LOCALE, {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
    });
  }

  protected answer(booking: Booking, status: 'confirmed' | 'declined' | 'completed' | 'cancelledByProfessional') {
    // Cancelling a confirmed booking can't be undone: the client is told and the time is released
    if (status === 'cancelledByProfessional' && !confirm($localize`Cancelar este agendamento? A cliente será avisada.`)) return;

    this.bookings
      .setStatus(booking, status)
      .catch((error) => console.error('Failed to update booking', error));
  }
}
