import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms',
  imports: [RouterLink],
  styleUrl: './legal.scss',
  template: `
    <a class="back" routerLink="/">← Voltar</a>
    <h1>Termos de Uso</h1>
    <p class="updated">Última atualização: 22 de outubro de 2026</p>

    <p>Ao criar uma conta ou usar o Find Your Beauty, você concorda com estes termos.</p>

    <h2>O que é o app</h2>
    <p>
      O Find Your Beauty é uma plataforma que aproxima clientes e profissionais de maquiagem e cabelo, e facilita o
      agendamento. O serviço em si é prestado pelo profissional, e a combinação do atendimento é entre ele e o cliente.
    </p>

    <h2>Contas</h2>
    <ul>
      <li>Você deve informar dados verdadeiros e manter a sua senha em segredo.</li>
      <li>Profissionais passam por aprovação da nossa equipe antes de aparecerem para os clientes.</li>
      <li>Podemos suspender contas que descumpram estes termos ou usem o app de forma indevida.</li>
    </ul>

    <h2>Agendamentos</h2>
    <p>
      O cliente solicita um horário e o profissional confirma ou recusa. Os preços e horários são definidos pelo
      profissional. Ambos podem cancelar um agendamento pelo app, e o horário volta a ficar disponível.
    </p>

    <h2>Conteúdo</h2>
    <p>
      Fotos, textos e avaliações que você publica são de sua responsabilidade e não podem violar direitos de terceiros nem
      conter conteúdo ofensivo ou ilegal. Você nos autoriza a exibi-los no app. Profissionais que conectam o Instagram
      autorizam a exibição das fotos mais recentes do feed no perfil.
    </p>

    <h2>Responsabilidade</h2>
    <p>
      Fazemos o possível para manter o app disponível e correto, mas não garantimos funcionamento ininterrupto e não nos
      responsabilizamos pela qualidade do serviço prestado pelos profissionais.
    </p>

    <h2>Mudanças</h2>
    <p>Podemos atualizar estes termos. Quando houver mudanças importantes, avisaremos pelo app ou por e-mail.</p>

    <h2>Contato</h2>
    <p><strong>contato@findyourbeauty.com.br</strong>. Veja também a <a routerLink="/privacidade">Política de Privacidade</a>.</p>
  `,
})
export class Terms {}
