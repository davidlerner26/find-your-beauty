import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Messages } from './services/messages';

type Tab = { label: string; path: string; match: string[]; icon: string; badge?: boolean };

// Screens that show the bottom tab bar (the others, like details and chat, are full screen)
const TAB_SCREENS = ['/', '/explore', '/mensagens', '/notificacoes', '/perfil'];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly tabs: Tab[] = [
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
      label: 'Mensagens',
      path: '/mensagens',
      match: ['/mensagens', '/notificacoes'],
      icon: 'M6 3h12a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-3.500L12 21l-2.500-3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z',
      badge: true,
    },
    {
      label: 'Perfil',
      path: '/perfil',
      match: ['/perfil'],
      icon: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.500 0-9 2.200-9 5.500V22h18v-2.500c0-3.300-4.500-5.500-9-5.500z',
    },
  ];

  protected readonly url = signal('/');

  constructor(
    router: Router,
    protected readonly messages: Messages,
  ) {
    this.url.set(this.pathOf(router.url));
    router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.url.set(this.pathOf(event.urlAfterRedirects)));
  }

  protected get showTabs() {
    return TAB_SCREENS.includes(this.url());
  }

  protected isActive(tab: Tab) {
    return tab.match.includes(this.url());
  }

  private pathOf(url: string) {
    return url.split(/[?#]/)[0];
  }
}
