import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'explore',
    loadComponent: () => import('./pages/explore/explore').then((m) => m.Explore),
  },
  {
    path: 'maquiadores/:id',
    loadComponent: () =>
      import('./pages/artist-details/artist-details').then((m) => m.ArtistDetails),
  },
  {
    path: 'maquiadores/:id/agendar',
    loadComponent: () => import('./pages/booking/booking').then((m) => m.Booking),
  },
  {
    path: 'boas-vindas',
    loadComponent: () => import('./pages/onboarding/onboarding').then((m) => m.Onboarding),
  },
];
