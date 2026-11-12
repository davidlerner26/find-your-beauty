import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { missingProfileData } from '../models/user';
import { Auth } from '../services/auth';
import { Users } from '../services/users';
import { log } from '../utils/log';
import { PATHS } from '../utils/paths';

// Booking is for signed-in clients with all the profile data filled in:
// visitors go to the login, professionals to their agenda, and a client with missing data to the
// professional's page, which says what is missing
export const clientGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const users = inject(Users);

  await auth.whenReady;
  const user = auth.user();
  if (!user) return router.parseUrl(PATHS.login);
  if (auth.role() === 'professional') return router.parseUrl(PATHS.proHome);
  if (auth.role() !== 'client') return router.parseUrl(PATHS.home);

  try {
    if (missingProfileData(await users.get(user.uid)).length) {
      return router.parseUrl(PATHS.professional(route.paramMap.get('id') ?? ''));
    }
  } catch (error) {
    log.error('Failed to check the profile data', error);
  }
  return true;
};

// Every screen of the client (the start, the map, the search, the page of a professional, the agenda, messages,
// notifications, profile...) is closed to a signed in professional: she goes to the same screen of the professional
// area, given in the `proPath` of the route (her agenda when there is none). Visitors and clients get in (each
// screen tells a visitor to sign in).
export const clientAreaGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.whenReady;
  if (auth.role() !== 'professional') return true;
  return router.parseUrl((route.data['proPath'] as string | undefined) ?? PATHS.proHome);
};

// The login and the sign up of the client: a professional who is signed in has no use for them
export const clientEntryGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.whenReady;
  if (auth.role() === 'professional') return router.parseUrl(PATHS.proHome);
  return true;
};
