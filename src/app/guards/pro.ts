import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';
import { proSubscriptionEnabled } from '../utils/features';
import { PATHS } from '../utils/paths';

// Is the visitor a professional? `true`, or where to send them
const proAccess = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.whenReady;
  if (auth.role() === 'professional') return true;
  // Account created but the profile is not complete: back to the second step of the sign up
  if (auth.signupIncomplete()) return router.parseUrl(PATHS.proSignup);
  return router.parseUrl(auth.user() ? PATHS.home : PATHS.proLogin);
};

// Only professional accounts get into /pro
export const proGuard: CanActivateFn = () => proAccess();

// The page of the Pro subscription: a professional, and only where the subscription exists (the test environment for
// now: in production the address does not exist, it goes back to the profile)
export const proSubscriptionGuard: CanActivateFn = async () => {
  // `inject` only works before the first `await`
  const router = inject(Router);
  const access = await proAccess();
  if (access !== true) return access;
  return proSubscriptionEnabled() || router.parseUrl(PATHS.proProfile);
};

// The login and the sign up of the professional area are for visitors (and for a sign up that is still going):
// a client goes to the start and a professional to the agenda
export const proEntryGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.whenReady;
  if (auth.role() === 'client') return router.parseUrl(PATHS.home);
  if (auth.role() === 'professional') return router.parseUrl(PATHS.proHome);
  return true;
};

// The Instagram connection also happens during the sign up: Instagram sends the professional back here before the
// account is approved
export const proInstagramGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.whenReady;
  if (auth.role() === 'professional' || auth.signupIncomplete()) return true;
  return router.parseUrl(auth.user() ? PATHS.home : PATHS.proLogin);
};
