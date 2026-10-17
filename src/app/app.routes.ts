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
  {
    path: 'entrar',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'cadastro',
    loadComponent: () => import('./pages/signup/signup').then((m) => m.Signup),
  },
  {
    path: 'mensagens',
    data: { tab: 'mensagens' },
    loadComponent: () => import('./pages/inbox/inbox').then((m) => m.Inbox),
  },
  {
    path: 'notificacoes',
    data: { tab: 'notificacoes' },
    loadComponent: () => import('./pages/inbox/inbox').then((m) => m.Inbox),
  },
  {
    path: 'mensagens/:id',
    loadComponent: () => import('./pages/chat/chat').then((m) => m.Chat),
  },
  { path: '**', redirectTo: '' },
];
