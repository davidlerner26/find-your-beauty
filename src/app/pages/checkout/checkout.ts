import { Location } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { formatDuration } from '../../models/professional';
import { Auth } from '../../services/auth';
import { Bookings } from '../../services/bookings';
import { CheckoutDraft } from '../../services/checkout-draft';
import { Feedback } from '../../services/feedback';
import { formatClock } from '../../utils/format-date';
import { INTL_LOCALE } from '../../utils/locale';
import { log } from '../../utils/log';
import { PATHS } from '../../utils/paths';
import { PricePipe } from '../../utils/price.pipe';
import { bookingErrorMessage } from '../booking/booking-request';

// How long the simulated payment takes, so that it feels like one
export const SIMULATED_PAYMENT_MS = 1200;

// The payment screen of the test environment, between "Finalizar" and the booking itself. The payment is only
// simulated (nothing is charged): "Pagar agora" creates the booking, with the payment still pending.
@Component({
  selector: 'app-checkout',
  imports: [MatIconModule, PricePipe],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly bookings = inject(Bookings);
  private readonly draft = inject(CheckoutDraft);
  private readonly feedback = inject(Feedback);

  // The professional of the route: the guard only lets in a booking that is for this one
  readonly id = input.required<string>();

  protected readonly request = this.draft.request;
  protected readonly paying = signal(false);
  protected readonly error = signal('');

  protected readonly dateLabel = computed(() =>
    this.request()?.startsAt.toLocaleDateString(INTL_LOCALE, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  );
  protected readonly timeLabel = computed(() => formatClock(this.request()?.startsAt ?? null));
  protected readonly durationLabel = computed(() =>
    formatDuration(this.request()?.durationMinutes ?? 0),
  );
  // The name on the card of the test: the client's own
  protected readonly holder = computed(
    () => this.auth.user()?.displayName || this.auth.user()?.email || '',
  );

  protected goBack() {
    this.location.back();
  }

  protected async pay() {
    const request = this.request();
    if (!request || this.paying()) return;

    this.error.set('');
    this.paying.set(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, SIMULATED_PAYMENT_MS));
      await this.bookings.create(request);
      this.draft.clear();
      this.feedback.show(
        $localize`Agendamento solicitado! Você será avisado quando o profissional responder.`,
        5000,
      );
      this.router.navigate([PATHS.agenda]);
    } catch (error) {
      log.error('Failed to create booking after the simulated payment', error);
      this.error.set(bookingErrorMessage(error));
    } finally {
      this.paying.set(false);
    }
  }
}
