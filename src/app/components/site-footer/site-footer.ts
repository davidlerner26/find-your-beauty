import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { COMPANY } from '../../company';

// The footer of the public pages: the legal pages, the contact and the company that runs the app
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  template: `
    <footer>
      <nav>
        <a i18n routerLink="/termos">Termos de Uso</a>
        <a i18n routerLink="/privacidade">Política de Privacidade</a>
        <a href="mailto:contato@findyourbeauty.com.br">contato@findyourbeauty.com.br</a>
      </nav>
      <p class="company">{{ company.name }} · CNPJ {{ company.cnpj }}</p>
    </footer>
  `,
  styleUrl: './site-footer.scss',
})
export class SiteFooter {
  protected readonly company = COMPANY;
}
