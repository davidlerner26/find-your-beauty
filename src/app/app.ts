import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Messages } from './services/messages';

type Tab = { label: string; path: string; match: string[]; icon: string; badge?: boolean };

// Screens that show the bottom tab bar (the others, like details and chat, are full screen)
const TAB_SCREENS = [
  '/',
  '/explore',
  '/agenda',
  '/favoritos',
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
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly clientTabs: Tab[] = [
    {
      label: 'Início',
      path: '/',
      match: ['/'],
      icon: 'M12 3 3 10.500V21h6v-6h6v6h6V10.500z',
    },
    {
      label: 'Explorar',
      path: '/explore',
      match: ['/explore'],
      icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.500 5.500-2 6-6 2 2-6z',
    },
    {
      label: 'Agenda',
      path: '/agenda',
      match: ['/agenda'],
      icon: 'M7 2v3H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2V2h-2v3H9V2zM5 10h14v10H5z',
    },
    {
      label: 'Mensagens',
      path: '/mensagens',
      match: ['/mensagens', '/notificacoes'],
      icon: 'M6 3h12a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-3.500L12 21l-2.500-3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z',
      badge: true,
    },
    {
      label: 'Favoritos',
      path: '/favoritos',
      match: ['/favoritos'],
      icon: 'M12 21.350l-1.450-1.320C5.400 15.360 2 12.280 2 8.500 2 5.420 4.420 3 7.500 3c1.740 0 3.410.81 4.500 2.090C13.090 3.810 14.760 3 16.500 3 19.580 3 22 5.420 22 8.500c0 3.780-3.400 6.860-8.550 11.540z',
    },
    {
      label: 'Perfil',
      path: '/perfil',
      match: ['/perfil'],
      icon: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.500 0-9 2.200-9 5.500V22h18v-2.500c0-3.300-4.500-5.500-9-5.500z',
    },
  ];

  private readonly proTabs: Tab[] = [
    {
      label: 'Agenda',
      path: '/pro',
      match: ['/pro'],
      icon: 'M7 2v3H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2V2h-2v3H9V2zM5 10h14v10H5z',
    },
    {
      label: 'Mensagens',
      path: '/pro/mensagens',
      match: ['/pro/mensagens', '/pro/notificacoes'],
      icon: 'M6 3h12a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-3.500L12 21l-2.500-3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z',
      badge: true,
    },
    {
      label: 'Perfil',
      path: '/pro/perfil',
      match: ['/pro/perfil'],
      icon: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.500 0-9 2.200-9 5.500V22h18v-2.500c0-3.300-4.500-5.500-9-5.500z',
    },
  ];

  protected readonly url = signal('/');
  // Last tab screen visited: it stays highlighted on /admin, which has no tab of its own
  private readonly lastTab = signal('/perfil');

  constructor(
    router: Router,
    protected readonly messages: Messages,
  ) {
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
