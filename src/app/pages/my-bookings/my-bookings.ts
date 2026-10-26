import { AddressPipe } from '../../utils/address';
import { MatIconModule } from '@angular/material/icon';
import { Component, computed, signal, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Toast } from '../../components/toast/toast';
import { Spinner } from '../../components/spinner/spinner';
import { Booking, BookingStatus } from '../../models/booking';
import { Auth } from '../../services/auth';
import { Bookings } from '../../services/bookings';
import { Professionals } from '../../services/professionals';
import { Feedback } from '../../services/feedback';
import { copyText } from '../../utils/clipboard';
import { T } from '../../utils/texts';
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
  imports: [
    AddressPipe,
    CatalogPipe,
    PricePipe,
    RouterLink,
    Spinner,
    Toast,
    NgTemplateOutlet,
    MatIconModule,
  ],
  templateUrl: './my-bookings.html',
  styleUrl: './my-bookings.scss',
})
export class MyBookings {
  protected readonly auth = inject(Auth);
  protected readonly bookings = inject(Bookings);
  private readonly professionals = inject(Professionals);
  private readonly feedback = inject(Feedback);

  protected readonly clock = formatClock;
  protected readonly t = T;

  // The address that was just copied (its button shows a check for a moment) and the message about it
  protected readonly copiedId = signal('');
  protected readonly toast = signal('');

  // Still going to happen: waiting for an answer or confirmed
  protected readonly upcoming = computed(() =>
    this.bookings.mine().filter((booking) => ['pending', 'confirmed'].includes(booking.status)),
  );
  protected readonly history = computed(() =>
    this.bookings
      .mine()
      .filter((booking) =>
        ['completed', 'declined', 'cancelled', 'cancelledByProfessional'].includes(booking.status),
      )
      .reverse(),
  );

  // Where the appointment is: the address of the professional (nothing for home visits)
  protected addressOf(booking: Booking) {
    const professional = this.professionals.byId(booking.professionalId);
    if (!professional || this.atHome(booking)) return '';
    return professional.address;
  }

  // The service is at the client's home (older bookings: the professional only attends at home)
  protected atHome(booking: Booking) {
    if (booking.place) return booking.place === 'home';
    return this.professionals.byId(booking.professionalId)?.serviceMode === 'home';
  }

  protected async copyAddress(booking: Booking, address: string) {
    await copyText(address);
    this.copiedId.set(booking.id ?? '');
    this.toast.set($localize`Endereço copiado`);
    setTimeout(() => {
      this.copiedId.set('');
      this.toast.set('');
    }, 2000);
  }

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
    if (
      !confirm($localize`Cancelar o agendamento com ${booking.professionalName}:professionalName:?`)
    )
      return;
    this.bookings
      .cancel(booking)
      .then(() => this.feedback.show($localize`Agendamento cancelado`))
      .catch((error) => {
        console.error('Failed to cancel booking', error);
        this.feedback.show($localize`Não foi possível cancelar. Tente novamente.`);
      });
  }
}
