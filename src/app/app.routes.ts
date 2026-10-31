import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin';
import { cardsGuard } from './guards/cards';
import { checkoutGuard } from './guards/checkout';
import { clientAreaGuard, clientEntryGuard, clientGuard } from './guards/client';
import { proEntryGuard, proGuard } from './guards/pro';
import { PATHS } from './utils/paths';

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
    path: 'profissionais/:id',
    loadComponent: () =>
      import('./pages/professional/professional').then((m) => m.ProfessionalPage),
  },
  {
    path: 'profissionais/:id/agendar',
    canActivate: [clientGuard],
    loadComponent: () => import('./pages/booking/booking').then((m) => m.Booking),
  },
  {
    path: 'profissionais/:id/pagamento',
    canActivate: [clientGuard, checkoutGuard],
    loadComponent: () => import('./pages/checkout/checkout').then((m) => m.Checkout),
  },
  {
    path: 'cartoes',
    canActivate: [cardsGuard],
    loadComponent: () => import('./pages/cards/cards').then((m) => m.CardsPage),
  },
  {
    path: 'verificar-email',
    loadComponent: () => import('./pages/verify-email/verify-email').then((m) => m.VerifyEmail),
  },
  {
    path: 'privacidade',
    loadComponent: () => import('./pages/legal/privacy').then((m) => m.Privacy),
  },
  {
    path: 'termos',
    loadComponent: () => import('./pages/legal/terms').then((m) => m.Terms),
  },
  {
    path: 'boas-vindas',
    loadComponent: () => import('./pages/onboarding/onboarding').then((m) => m.Onboarding),
  },
  {
    path: 'entrar',
    canActivate: [clientEntryGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'cadastro',
    canActivate: [clientEntryGuard],
    loadComponent: () => import('./pages/signup/signup').then((m) => m.Signup),
  },
  {
    path: 'mensagens',
    canActivate: [clientAreaGuard],
    data: { tab: 'mensagens', proPath: PATHS.proMessages },
    loadComponent: () => import('./pages/inbox/inbox').then((m) => m.Inbox),
  },
  {
    path: 'agenda',
    canActivate: [clientAreaGuard],
    loadComponent: () => import('./pages/my-bookings/my-bookings').then((m) => m.MyBookings),
  },
  {
    path: 'notificacoes',
    canActivate: [clientAreaGuard],
    data: { tab: 'notificacoes', proPath: PATHS.proNotifications },
    loadComponent: () => import('./pages/inbox/inbox').then((m) => m.Inbox),
  },
  {
    path: 'mensagens/:id',
    canActivate: [clientAreaGuard],
    data: { tab: 'mensagens', proPath: PATHS.proMessages },
    loadComponent: () => import('./pages/inbox/inbox').then((m) => m.Inbox),
  },
  {
    path: 'esqueci-senha',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'perfil',
    canActivate: [clientAreaGuard],
    data: { proPath: PATHS.proProfile },
    loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
  },
  {
    // Target of the link in the password reset e-mail (set as the action URL in the Firebase console)
    path: 'redefinir-senha',
    loadComponent: () =>
      import('./pages/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'busca',
    loadComponent: () => import('./pages/search/search').then((m) => m.Search),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/admin').then((m) => m.Admin),
  },
  {
    path: 'admin/profissionais/:id',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-professional/admin-professional').then((m) => m.AdminProfessional),
  },
  // Professional area
  {
    path: 'pro/entrar',
    canActivate: [proEntryGuard],
    data: { pro: true },
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'pro/cadastro',
    canActivate: [proEntryGuard],
    data: { pro: true },
    loadComponent: () => import('./pages/signup/signup').then((m) => m.Signup),
  },
  {
    path: 'pro',
    canActivate: [proGuard],
    loadComponent: () => import('./pages/pro-agenda/pro-agenda').then((m) => m.ProAgenda),
  },
  {
    path: 'pro/mensagens',
    canActivate: [proGuard],
    data: { tab: 'mensagens' },
    loadComponent: () => import('./pages/inbox/inbox').then((m) => m.Inbox),
  },
  {
    path: 'pro/notificacoes',
    canActivate: [proGuard],
    data: { tab: 'notificacoes' },
    loadComponent: () => import('./pages/inbox/inbox').then((m) => m.Inbox),
  },
  {
    path: 'pro/mensagens/:id',
    canActivate: [proGuard],
    data: { tab: 'mensagens' },
    loadComponent: () => import('./pages/inbox/inbox').then((m) => m.Inbox),
  },
  {
    path: 'pro/instagram',
    canActivate: [proGuard],
    loadComponent: () => import('./pages/pro-instagram/pro-instagram').then((m) => m.ProInstagram),
  },
  {
    path: 'pro/perfil',
    canActivate: [proGuard],
    loadComponent: () => import('./pages/pro-profile/pro-profile').then((m) => m.ProProfile),
  },
  { path: '**', redirectTo: '' },
];
