import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteFooter } from '../../components/site-footer/site-footer';

@Component({
  selector: 'app-terms',
  imports: [RouterLink, SiteFooter],
  styleUrl: './legal.scss',
  template: `
    <a i18n class="back" routerLink="/">← Voltar</a>
    <h1 i18n>Termos de Uso</h1>
    <p i18n class="updated">Última atualização: 22 de outubro de 2026</p>

    <p i18n>Ao criar uma conta ou usar o Find Your Beauty, você concorda com estes termos.</p>

    <h2 i18n>O que é o app</h2>
    <p i18n>
      O Find Your Beauty é uma plataforma que aproxima clientes e profissionais de maquiagem e
      cabelo, e facilita o agendamento. O serviço em si é prestado pelo profissional, e a combinação
      do atendimento é entre ele e o cliente.
    </p>

    <h2 i18n>Contas</h2>
    <ul>
      <li i18n>Você deve informar dados verdadeiros e manter a sua senha em segredo.</li>
      <li i18n>
        Profissionais passam por aprovação da nossa equipe antes de aparecerem para os clientes.
      </li>
      <li i18n>
        Podemos suspender contas que descumpram estes termos ou usem o app de forma indevida.
      </li>
    </ul>

    <h2 i18n>Agendamentos</h2>
    <p i18n>
      O cliente solicita um horário e o profissional confirma ou recusa. Os preços e horários são
      definidos pelo profissional. Ambos podem cancelar um agendamento pelo app, e o horário volta a
      ficar disponível.
    </p>

    <h2 i18n>Conteúdo</h2>
    <p i18n>
      Fotos, textos e avaliações que você publica são de sua responsabilidade e não podem violar
      direitos de terceiros nem conter conteúdo ofensivo ou ilegal. Você nos autoriza a exibi-los no
      app. Profissionais que conectam o Instagram autorizam a exibição das fotos mais recentes do
      feed no perfil.
    </p>

    <h2 i18n>Responsabilidade</h2>
    <p i18n>
      Fazemos o possível para manter o app disponível e correto, mas não garantimos funcionamento
      ininterrupto e não nos responsabilizamos pela qualidade do serviço prestado pelos
      profissionais.
    </p>

    <h2 i18n>Mudanças</h2>
    <p i18n>
      Podemos atualizar estes termos. Quando houver mudanças importantes, avisaremos pelo app ou por
      e-mail.
    </p>

    <h2 i18n>Contato</h2>
    <p i18n>
      <strong>contato@findyourbeauty.com.br</strong>. Veja também a
      <a routerLink="/privacidade">Política de Privacidade</a>.
    </p>

    <app-site-footer />
  `,
})
export class Terms {}
