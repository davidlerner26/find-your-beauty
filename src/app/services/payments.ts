import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';
import { FakePayments } from './fake-payments';
import { PaymentsApi } from './payments.types';
import { StripePayments } from './stripe-payments';

type Config = { provider: 'off' | 'stripe' | 'fake'; stripePublishableKey: string };

export const paymentsFor = (config: Config): PaymentsApi =>
  config.provider === 'fake'
    ? new FakePayments()
    : new StripePayments(config.provider === 'stripe' ? config.stripePublishableKey : '');

// What the screens ask for, so that a test can put another one in
export const PAYMENTS = new InjectionToken<PaymentsApi>('Payments', {
  providedIn: 'root',
  factory: () => paymentsFor(environment.payments),
});
