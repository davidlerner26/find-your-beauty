import { Component, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Spinner } from '../../components/spinner/spinner';
import { Instagram } from '../../services/instagram';
import { Professionals } from '../../services/professionals';

// Where Instagram sends the professional back (?code=... or ?error=...)
@Component({
  selector: 'app-pro-instagram',
  imports: [RouterLink, Spinner],
  template: `
    <div class="page">
      @if (error()) {
        <h1>Não foi possível conectar</h1>
        <p>{{ error() }}</p>
        <a routerLink="/pro/perfil">Voltar ao perfil</a>
      } @else {
        <app-spinner />
        <p>Conectando o seu Instagram...</p>
      }
    </div>
  `,
  styles: `
    .page {
      max-width: 28rem;
      margin: 0 auto;
      padding: 4rem 1.5rem;
      text-align: center;
      display: grid;
      gap: 1rem;
    }
  `,
})
export class ProInstagram {
  readonly code = input<string>();
  readonly state = input<string>();
  readonly error_description = input<string>();

  protected readonly error = signal('');

  constructor(
    private readonly instagram: Instagram,
    private readonly professionals: Professionals,
    private readonly router: Router,
  ) {
    // Inputs are set after the constructor
    queueMicrotask(() => this.finish());
  }

  private async finish() {
    const code = this.code();
    if (!code) {
      this.error.set(this.error_description() || 'O acesso não foi autorizado.');
      return;
    }

    try {
      await this.instagram.finish(code, this.state());
      await this.professionals.load();
      this.router.navigateByUrl('/pro/perfil');
    } catch (error) {
      console.error('Failed to connect Instagram', error);
      const message = (error as { message?: string }).message ?? '';
      this.error.set(
        message === 'invalid-state'
          ? 'A conexão expirou. Tente conectar de novo.'
          : message.replace(/^.*?Instagram:/, 'Instagram:') || 'Tente novamente em instantes.',
      );
    }
  }
}
