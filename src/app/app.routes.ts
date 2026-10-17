import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/welcome/welcome').then((m) => m.Welcome),
  },
  {
    path: 'professionals',
    loadComponent: () =>
      import('./pages/professionals/professionals').then((m) => m.Professionals),
  },
  {
    path: 'sign-in',
    loadComponent: () => import('./pages/sign-in/sign-in').then((m) => m.SignIn),
  },
  {
    path: 'sign-up',
    loadComponent: () => import('./pages/sign-up/sign-up').then((m) => m.SignUp),
  },
  { path: '**', redirectTo: '' },
];
