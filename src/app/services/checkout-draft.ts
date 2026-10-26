import { Injectable, signal } from '@angular/core';
import { NewBooking } from '../pages/booking/booking-request';

// The booking the client chose and has not paid for yet: the booking screen leaves it here for the payment screen.
// It lives in memory only, so a reload of the payment screen sends the client back to choose again.
@Injectable({ providedIn: 'root' })
export class CheckoutDraft {
  readonly request = signal<NewBooking | null>(null);

  set(request: NewBooking) {
    this.request.set(request);
  }

  clear() {
    this.request.set(null);
  }
}
