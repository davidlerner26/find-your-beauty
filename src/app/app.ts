import { Component, signal } from '@angular/core';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Auth } from './services/auth';
import { Messages } from './services/messages';

type Tab = { label: string; path: string; match: string[]; icon: string; badge?: boolean };

// The professional area is /pro and what is under it (not /profissionais, the public page of a professional)
const isProArea = (url: string) => url === '/pro' || url.startsWith('/pro/');

// Screens that show the bottom tab bar (the others, like details and chat, are full screen)
const TAB_SCREENS = [
  '/',
  '/explore',
  '/agenda',
  '/mensagens',
  '/notificacoes',
  '/perfil',
  '/pro',
  '/pro/mensagens',
  '/pro/notificacoes',
  '/pro/perfil',
];

// Sign in and welcome screens: no navigation bar (on wide screens)
const AUTH_SCREENS = [
  '/entrar',
  '/cadastro',
  '/pro/entrar',
  '/pro/cadastro',
  '/boas-vindas',
  '/verificar-email',
  '/esqueci-senha',
  '/redefinir-senha',
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly clientTabs: Tab[] = [
    {
      label: $localize`Início`,
      path: '/',
      match: ['/'],
      icon: 'home',
    },
    {
      label: $localize`Explorar`,
      path: '/explore',
      match: ['/explore'],
      icon: 'explore',
    },
    {
      label: $localize`Agenda`,
      path: '/agenda',
      match: ['/agenda'],
      icon: 'calendar_today',
    },
    {
      label: $localize`Mensagens`,
      path: '/mensagens',
      match: ['/mensagens', '/notificacoes'],
      icon: 'chat_bubble',
      badge: true,
    },
    {
      label: $localize`Perfil`,
      path: '/perfil',
      match: ['/perfil'],
      icon: 'person',
    },
  ];

  private readonly proTabs: Tab[] = [
    {
      label: $localize`Agenda`,
      path: '/pro',
      match: ['/pro'],
      icon: 'calendar_today',
    },
    {
      label: $localize`Mensagens`,
      path: '/pro/mensagens',
      match: ['/pro/mensagens', '/pro/notificacoes'],
      icon: 'chat_bubble',
      badge: true,
    },
    {
      label: $localize`Perfil`,
      path: '/pro/perfil',
      match: ['/pro/perfil'],
      icon: 'person',
    },
  ];

  protected readonly url = signal('/');
  // Last tab screen visited: it stays highlighted on /admin, which has no tab of its own
  private readonly lastTab = signal('/perfil');

  constructor(
    router: Router,
    protected readonly messages: Messages,
    protected readonly auth: Auth,
    icons: MatIconRegistry,
  ) {
    // Material Symbols (outlined), loaded in index.html
    icons.setDefaultFontSetClass('material-symbols-outlined');
    this.setUrl(this.pathOf(router.url));
    router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.setUrl(this.pathOf(event.urlAfterRedirects)));
  }

  protected get tabs() {
    return isProArea(this.url()) ? this.proTabs : this.clientTabs;
  }

  // The top bar (wide screens) has a screen of its own for the notifications; on phones they are a tab of the messages
  protected get topTabs(): Tab[] {
    const pro = isProArea(this.url());
    const notifications = pro ? '/pro/notificacoes' : '/notificacoes';
    return this.tabs.flatMap((tab) =>
      tab.badge
        ? [
            { ...tab, match: [tab.path] },
            { label: $localize`Notificações`, path: notifications, match: [notifications], icon: 'notifications' },
          ]
        : [tab],
    );
  }

  protected get showTabs() {
    return TAB_SCREENS.includes(this.url()) || this.isAdminScreen;
  }

  // Wide screens have a navigation bar on top instead of the tabs at the bottom (see app.scss)
  protected get showTopbar() {
    return !AUTH_SCREENS.includes(this.url());
  }

  // Screens that use the whole width on wide screens (the others stay in the centered column)
  protected get fullWidth() {
    return this.url() === '/explore' || AUTH_SCREENS.includes(this.url());
  }

  protected isActive(tab: Tab) {
    const url = this.isAdminScreen ? this.lastTab() : this.url();
    // A screen inside the tab counts too (/mensagens/:id is in Mensagens); the home and the agenda of the professional
    // are prefixes of other tabs, so they only match themselves
    return tab.match.some((path) => url === path || (path !== '/' && path !== '/pro' && url.startsWith(path + '/')));
  }

  private get isAdminScreen() {
    return this.url().startsWith('/admin');
  }

  private setUrl(url: string) {
    this.url.set(url);
    // The professional area has its own look (see styles.scss)
    document.body.classList.toggle('pro-theme', isProArea(url));
    if (TAB_SCREENS.includes(url)) this.lastTab.set(url);
  }

  private pathOf(url: string) {
    return url.split(/[?#]/)[0];
  }
}
