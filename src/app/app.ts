import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav>
      <a routerLink="/">
        <img src="logo.svg" alt="Logo Find your beauty" />
      </a>
      <div>
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
          Início
        </a>
        <a routerLink="/explore" routerLinkActive="active">Explorar</a>
      </div>
    </nav>
    <router-outlet />
  `,
  styles: `
    nav {
      position: sticky;
      top: 0;
      z-index: 10;
      height: 4rem;
      padding: 0 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #fff;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
    }

    img {
      height: 3rem;
    }

    div {
      display: flex;
      gap: 2rem;
    }

    div a {
      color: var(--muted);

      &.active {
        color: var(--primary);
        font-weight: 600;
      }
    }
  `,
})
export class App {}
