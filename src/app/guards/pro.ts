import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';
import { PATHS } from '../utils/paths';

// Only professional accounts get into /pro
export const proGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.whenReady;
  if (auth.role() === 'professional') return true;
  // Account created but the profile is not complete: back to the second step of the sign up
  if (auth.signupIncomplete()) return router.parseUrl(PATHS.proSignup);
  return router.parseUrl(auth.user() ? PATHS.home : PATHS.proLogin);
};
