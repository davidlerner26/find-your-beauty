import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CheckoutDraft } from '../services/checkout-draft';
import { checkoutEnabled } from '../utils/features';
import { PATHS } from '../utils/paths';

// The payment screen only exists where the feature is on, and only for a booking that was chosen on the booking
// screen: anything else (production, a reload, a link) goes back to choosing the day and the time.
export const checkoutGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const id = route.paramMap.get('id') ?? '';
  const request = inject(CheckoutDraft).request();

  if (checkoutEnabled() && request?.professionalId === id) return true;
  return router.parseUrl(PATHS.booking(id));
};
