import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin';
import { cardsGuard } from './guards/cards';
import { checkoutGuard } from './guards/checkout';
import { clientAreaGuard, clientEntryGuard, clientGuard } from './guards/client';
import { proEntryGuard, proGuard, proInstagramGuard } from './guards/pro';
import { PATHS } from './utils/paths';
import { RouteSeo } from './services/seo';
import { environment } from '../environments/environment';
import { organizationJsonLd, websiteJsonLd } from './utils/seo';

// What each route says to the search engines (see services/seo.ts). A route that says nothing is left out of them.
const seo = (page: RouteSeo) => ({ seo: page });

export const routes: Routes = [
  {
    path: '',
    canActivate: [clientAreaGuard],
    data: seo({
      title: $localize`Maquiagem e cabelo perto de você`,
      path: '/',
      jsonLd: [organizationJsonLd(environment.siteUrl), websiteJsonLd(environment.siteUrl)],
    }),
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'explorar',
    canActivate: [clientAreaGuard],
    data: seo({
      title: $localize`Mapa de profissionais de beleza`,
      description: $localize`Veja no mapa os profissionais de maquiagem e cabelo mais perto de você.`,
      path: '/explorar',
    }),
    loadComponent: () => import('./pages/explore/explore').then((m) => m.Explore),
  },
  // The old address of the map (links, bookmarks, e-mails already sent): the query is kept
  { path: 'explore', redirectTo: 'explorar', pathMatch: 'full' },
  {
    path: 'explorar/:id',
    canActivate: [clientAreaGuard],
    // The page sets its own title when the professional is loaded (see pages/professional)
    data: seo({ title: $localize`Profissional de beleza`, dynamic: true }),
    loadComponent: () =>
      import('./pages/professional/professional').then((m) => m.ProfessionalPage),
  },
  // The old address of the page of a professional
  { path: 'profissionais/:id', redirectTo: 'explorar/:id', pathMatch: 'full' },
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
    canActivate: [clientAreaGuard],
    loadComponent: () => import('./pages/verify-email/verify-email').then((m) => m.VerifyEmail),
  },
  {
    path: 'privacidade',
    data: seo({ title: $localize`Política de Privacidade`, path: '/privacidade' }),
    loadComponent: () => import('./pages/legal/privacy').then((m) => m.Privacy),
  },
  {
    path: 'termos',
    data: seo({ title: $localize`Termos de Uso`, path: '/termos' }),
    loadComponent: () => import('./pages/legal/terms').then((m) => m.Terms),
  },
  {
    path: 'boas-vindas',
    canActivate: [clientAreaGuard],
    loadComponent: () => import('./pages/onboarding/onboarding').then((m) => m.Onboarding),
  },
  {
    path: 'entrar',
    canActivate: [clientEntryGuard],
    data: seo({ title: $localize`Entrar`, noindex: true }),
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
    data: {
      tab: 'mensagens',
      proPath: PATHS.proMessages,
      ...seo({ title: $localize`Mensagens`, noindex: true }),
    },
    loadComponent: () => import('./pages/inbox/inbox').then((m) => m.Inbox),
  },
  {
    path: 'agenda',
    canActivate: [clientAreaGuard],
    data: seo({ title: $localize`Agenda`, noindex: true }),
    loadComponent: () => import('./pages/my-bookings/my-bookings').then((m) => m.MyBookings),
  },
  {
    path: 'notificacoes',
    canActivate: [clientAreaGuard],
    data: {
      tab: 'notificacoes',
      proPath: PATHS.proNotifications,
      ...seo({ title: $localize`Notificações`, noindex: true }),
    },
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
    data: { proPath: PATHS.proProfile, ...seo({ title: $localize`Perfil`, noindex: true }) },
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
    canActivate: [clientAreaGuard],
    data: seo({
      title: $localize`Buscar profissionais de maquiagem e cabelo`,
      description: $localize`Busque profissionais de maquiagem e cabelo pelo nome, pelo serviço ou pelo preço e agende online.`,
      path: '/busca',
    }),
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
  {
    path: 'admin/perfis',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin-drafts/admin-drafts').then((m) => m.AdminDrafts),
  },
  {
    path: 'admin/perfis/:id',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin-draft/admin-draft').then((m) => m.AdminDraft),
  },
  {
    path: 'admin/usuarios',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin-users/admin-users').then((m) => m.AdminUsers),
  },
  // The link of the e-mail that invites a professional to claim a profile an admin made
  {
    path: 'convite/:draftId/:token',
    loadComponent: () => import('./pages/invite/invite').then((m) => m.Invite),
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
    canActivate: [proInstagramGuard],
    loadComponent: () => import('./pages/pro-instagram/pro-instagram').then((m) => m.ProInstagram),
  },
  {
    path: 'pro/perfil',
    canActivate: [proGuard],
    loadComponent: () => import('./pages/pro-profile/pro-profile').then((m) => m.ProProfile),
  },
  {
    path: '**',
    data: seo({ title: $localize`Página não encontrada`, noindex: true }),
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];
