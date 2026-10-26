import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { NewBooking } from '../pages/booking/booking-request';
import { CheckoutDraft } from '../services/checkout-draft';
import { checkoutGuard } from './checkout';

const route = (id: string) =>
  ({ paramMap: { get: () => id } }) as unknown as ActivatedRouteSnapshot;

const run = (id: string) => {
  const result = TestBed.runInInjectionContext(() =>
    checkoutGuard(route(id), {} as RouterStateSnapshot),
  );
  return result instanceof UrlTree ? result.toString() : result;
};

const booking = (professionalId: string) => ({ professionalId }) as NewBooking;

// The unit tests run with the production environment, where the payment screen is off
describe('checkoutGuard', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('sends everyone back to the booking screen where the feature is off (production)', () => {
    TestBed.inject(CheckoutDraft).set(booking('pro1'));
    expect(run('pro1')).toBe('/profissionais/pro1/agendar');
  });

  it('sends back a link that has no booking behind it', () => {
    expect(run('pro1')).toBe('/profissionais/pro1/agendar');
  });
});

describe('CheckoutDraft', () => {
  it('keeps the booking until it is cleared', () => {
    TestBed.configureTestingModule({});
    const draft = TestBed.inject(CheckoutDraft);
    expect(draft.request()).toBeNull();
    draft.set(booking('pro1'));
    expect(draft.request()?.professionalId).toBe('pro1');
    draft.clear();
    expect(draft.request()).toBeNull();
  });
});
