import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { missingProfileData } from '../models/user';
import { Auth } from '../services/auth';
import { Users } from '../services/users';
import { log } from '../utils/log';
import { PATHS } from '../utils/paths';

// Booking is for signed-in clients with all the profile data filled in:
// visitors go to the login, professionals back to the start, and a client with missing data to the
// professional's page, which says what is missing
export const clientGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const users = inject(Users);

  await auth.whenReady;
  const user = auth.user();
  if (!user) return router.parseUrl(PATHS.login);
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
