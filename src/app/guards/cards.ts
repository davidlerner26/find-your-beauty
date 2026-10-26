import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';
import { PAYMENTS } from '../services/payments';
import { PATHS } from '../utils/paths';

// The cards of a client: only where there are payments, and only for a signed in client
export const cardsGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (!inject(PAYMENTS).available) return router.parseUrl(PATHS.home);
  await auth.whenReady;
  if (!auth.user()) return router.parseUrl(PATHS.login);
  if (auth.role() !== 'client') return router.parseUrl(PATHS.home);
  return true;
};
