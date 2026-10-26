import { Location } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { formatDuration } from '../../models/professional';
import { Auth } from '../../services/auth';
import { Bookings } from '../../services/bookings';
import { Cards } from '../../services/cards';
import { CheckoutDraft } from '../../services/checkout-draft';
import { PAYMENTS } from '../../services/payments';
import { Feedback } from '../../services/feedback';
import { formatClock } from '../../utils/format-date';
import { INTL_LOCALE } from '../../utils/locale';
import { log } from '../../utils/log';
import { cardBrandLabel, paymentErrorMessage } from '../../utils/payment-errors';
import { PATHS } from '../../utils/paths';
import { PricePipe } from '../../utils/price.pipe';
import { bookingErrorMessage } from '../booking/booking-request';

// How long the simulated payment takes, so that it feels like one
export const SIMULATED_PAYMENT_MS = 1200;

// The payment screen of the test environment, between "Finalizar" and the booking itself. With Stripe, the client
// needs a saved card: "Pagar agora" holds the amount on it (the money is taken when the professional accepts) and
// then creates the booking. Until the Stripe key is filled in, the payment is only simulated.
@Component({
  selector: 'app-checkout',
  imports: [MatIconModule, PricePipe, RouterLink],
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
  private readonly payments = inject(PAYMENTS);
  protected readonly cards = inject(Cards);

  // The professional of the route: the guard only lets in a booking that is for this one
  readonly id = input.required<string>();

  // With Stripe the client pays with a saved card; without it the payment is simulated
  protected readonly withCards = this.payments.available;
  protected readonly paths = PATHS;
  protected readonly brandLabel = cardBrandLabel;
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

  constructor() {
    void this.cards.load();
  }

  protected goBack() {
    this.location.back();
  }

  // Can the client pay? With Stripe, only with a card
  protected readonly canPay = computed(() => !this.withCards || !!this.cards.selected());

  protected async pay() {
    const request = this.request();
    if (!request || this.paying() || !this.canPay()) return;

    this.error.set('');
    this.paying.set(true);
    let held: string | null = null;
    try {
      if (this.withCards) {
        const hold = await this.payments.hold({
          professionalId: request.professionalId,
          serviceIds: request.services.map((service) => service.id),
          startsAt: request.startsAt,
          cardId: this.cards.selected()!.id,
        });
        if (hold.status === 'failed') {
          this.error.set(paymentErrorMessage(hold.code));
          return;
        }
        held = hold.paymentIntentId;
      } else {
        await new Promise((resolve) => setTimeout(resolve, SIMULATED_PAYMENT_MS));
      }

      await this.bookings.create(held ? { ...request, paymentIntentId: held } : request);
      held = null;
      this.draft.clear();
      this.feedback.show(
        $localize`Agendamento solicitado! Você será avisado quando o profissional responder.`,
        5000,
      );
      this.router.navigate([PATHS.agenda]);
    } catch (error) {
      log.error('Failed to book after the payment step', error);
      this.error.set(bookingErrorMessage(error));
      // The booking did not happen (the time was taken meanwhile): the money held for it is let go
      if (held)
        await this.payments.release(held).catch((e) => log.error('Failed to release the hold', e));
    } finally {
      this.paying.set(false);
    }
  }
}
