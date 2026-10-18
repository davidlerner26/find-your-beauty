import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

// Only professional accounts get into /pro
export const proGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.whenReady;
  if (auth.role() === 'professional') return true;
  return router.parseUrl(auth.user() ? '/' : '/pro/entrar');
};
