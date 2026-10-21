import { Component, signal } from '@angular/core';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Messages } from './services/messages';

type Tab = { label: string; path: string; match: string[]; icon: string; badge?: boolean };

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

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly clientTabs: Tab[] = [
    {
      label: 'Início',
      path: '/',
      match: ['/'],
      icon: 'home',
    },
    {
      label: 'Explorar',
      path: '/explore',
      match: ['/explore'],
      icon: 'explore',
    },
    {
      label: 'Agenda',
      path: '/agenda',
      match: ['/agenda'],
      icon: 'calendar_today',
    },
    {
      label: 'Mensagens',
      path: '/mensagens',
      match: ['/mensagens', '/notificacoes'],
      icon: 'chat_bubble',
      badge: true,
    },
    {
      label: 'Perfil',
      path: '/perfil',
      match: ['/perfil'],
      icon: 'person',
    },
  ];

  private readonly proTabs: Tab[] = [
    {
      label: 'Agenda',
      path: '/pro',
      match: ['/pro'],
      icon: 'calendar_today',
    },
    {
      label: 'Mensagens',
      path: '/pro/mensagens',
      match: ['/pro/mensagens', '/pro/notificacoes'],
      icon: 'chat_bubble',
      badge: true,
    },
    {
      label: 'Perfil',
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
    return this.url().startsWith('/pro') ? this.proTabs : this.clientTabs;
  }

  protected get showTabs() {
    return TAB_SCREENS.includes(this.url()) || this.isAdminScreen;
  }

  protected isActive(tab: Tab) {
    return tab.match.includes(this.isAdminScreen ? this.lastTab() : this.url());
  }

  private get isAdminScreen() {
    return this.url().startsWith('/admin');
  }

  private setUrl(url: string) {
    this.url.set(url);
    // The professional area has its own look (see styles.scss)
    document.body.classList.toggle('pro-theme', url.startsWith('/pro'));
    if (TAB_SCREENS.includes(url)) this.lastTab.set(url);
  }

  private pathOf(url: string) {
    return url.split(/[?#]/)[0];
  }
}
