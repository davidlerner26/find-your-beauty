import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

// Only accounts with `admin: true` get into /admin
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.whenReady;
  if (auth.isAdmin()) return true;
  return router.parseUrl('/');
};
