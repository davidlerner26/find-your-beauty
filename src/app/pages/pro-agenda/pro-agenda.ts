import { MatIconModule } from '@angular/material/icon';
import { Component, computed, inject } from '@angular/core';
import { PricePipe } from '../../utils/price.pipe';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Booking, BookingStatus } from '../../models/booking';
import { Auth } from '../../services/auth';
import { Bookings } from '../../services/bookings';
import { Professionals } from '../../services/professionals';
import { Feedback } from '../../services/feedback';
import { formatClock } from '../../utils/format-date';
import { INTL_LOCALE } from '../../utils/locale';
import { CatalogPipe } from '../../utils/catalog.pipe';
import { log } from '../../utils/log';

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
  imports: [CatalogPipe, PricePipe, RouterLink, NgTemplateOutlet, MatIconModule],
  templateUrl: './pro-agenda.html',
  styleUrl: './pro-agenda.scss',
})
export class ProAgenda {
  private readonly auth = inject(Auth);
  private readonly bookings = inject(Bookings);
  private readonly professionals = inject(Professionals);
  private readonly feedback = inject(Feedback);

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
      .filter((booking) =>
        ['completed', 'declined', 'cancelled', 'cancelledByProfessional'].includes(booking.status),
      )
      .reverse(),
  );

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

  protected answer(
    booking: Booking,
    status: 'confirmed' | 'declined' | 'completed' | 'cancelledByProfessional',
  ) {
    // Cancelling a confirmed booking can't be undone: the client is told and the time is released
    if (
      status === 'cancelledByProfessional' &&
      !confirm(
        $localize`Tem certeza que deseja cancelar este agendamento? O cliente será avisado e o horário será liberado.`,
      )
    )
      return;

    const done = {
      confirmed: $localize`Agendamento confirmado. O cliente foi avisado.`,
      declined: $localize`Solicitação recusada. O cliente foi avisado.`,
      cancelledByProfessional: $localize`Agendamento cancelado. O cliente foi avisado.`,
      completed: $localize`Agendamento concluído`,
    }[status];
    this.bookings
      .setStatus(booking, status)
      .then(() => this.feedback.show(done))
      .catch((error) => {
        log.error('Failed to update booking', error);
        this.feedback.show($localize`Não foi possível atualizar o agendamento. Tente novamente.`);
      });
  }
}
