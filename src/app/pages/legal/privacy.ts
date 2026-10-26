import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
  imports: [RouterLink],
  styleUrl: './legal.scss',
  template: `
    <a i18n class="back" routerLink="/">← Voltar</a>
    <h1 i18n>Política de Privacidade</h1>
    <p i18n class="updated">Última atualização: 22 de outubro de 2026</p>

    <p i18n>
      O Find Your Beauty conecta clientes a profissionais de maquiagem e cabelo. Esta política
      explica quais dados coletamos, para que usamos e como você pode controlá-los, de acordo com a
      Lei Geral de Proteção de Dados (LGPD).
    </p>

    <h2 i18n>Dados que coletamos</h2>
    <ul>
      <li i18n>
        <strong>Conta:</strong> nome, sobrenome, e-mail, celular e CPF. Quem entra com o Google
        também nos informa nome, e-mail e foto.
      </li>
      <li i18n>
        <strong>Endereço:</strong> do cliente, para atendimento a domicílio, e do profissional, para
        aparecer no mapa.
      </li>
      <li i18n>
        <strong>Profissionais:</strong> foto, serviços, preços, horários, galeria de trabalhos e
        Instagram.
      </li>
      <li i18n>
        <strong>Uso do app:</strong> agendamentos, avaliações, mensagens e arquivos enviados no
        chat.
      </li>
      <li i18n>
        <strong>Localização:</strong> somente se você permitir, para mostrar quem está perto.
      </li>
    </ul>

    <h2 i18n>Instagram</h2>
    <p i18n>
      O profissional pode conectar a conta profissional do Instagram. Pedimos apenas a permissão de
      leitura básica (<em>instagram_business_basic</em>). Com ela, lemos o nome de usuário e as 12
      fotos mais recentes do feed, copiamos essas fotos para o nosso armazenamento e as mostramos no
      perfil público do profissional. Guardamos a chave de acesso de forma restrita, sem acesso pelo
      aplicativo. Não publicamos nada no Instagram e não lemos mensagens.
    </p>
    <p i18n>
      Para remover o acesso, o profissional toca em <strong>Desconectar</strong> no perfil, ou
      remove o app em Configurações do Instagram &gt; Apps e sites. Em ambos os casos apagamos a
      chave de acesso e as fotos copiadas.
    </p>

    <h2 i18n>Para que usamos os dados</h2>
    <ul>
      <li i18n>Criar e manter a conta e permitir agendamentos entre cliente e profissional.</li>
      <li i18n>
        Enviar avisos por notificação e por e-mail sobre agendamentos, aprovação de cadastro e
        senha.
      </li>
      <li i18n>Verificar a identidade (CPF) e prevenir fraudes.</li>
      <li i18n>Mostrar profissionais próximos e melhorar o app.</li>
    </ul>

    <h2 i18n>Com quem compartilhamos</h2>
    <p i18n>
      Não vendemos dados. O CPF e os dados da conta só ficam visíveis para você e para a
      administração. Cliente e profissional veem os dados necessários para realizar o agendamento.
      Usamos serviços de terceiros para operar o app: Google Firebase (login, banco de dados,
      arquivos e funções), Google Maps (endereços e mapa), Resend (envio de e-mails) e Meta
      (Instagram, quando o profissional conecta).
    </p>

    <h2 i18n>Por quanto tempo guardamos</h2>
    <p i18n>
      Guardamos os dados enquanto a conta existir. Você pode pedir a exclusão a qualquer momento;
      depois disso, apagamos os dados, exceto os que precisamos manter por obrigação legal.
    </p>

    <h2 i18n>Seus direitos e exclusão de dados</h2>
    <p i18n>
      Você pode acessar, corrigir e pedir a exclusão dos seus dados, e revogar permissões. Edite os
      dados no seu perfil ou escreva para <strong>contato@findyourbeauty.com.br</strong> pedindo a
      exclusão. Respondemos em até 15 dias.
    </p>

    <h2 i18n>Contato</h2>
    <p i18n>Dúvidas sobre esta política: <strong>contato@findyourbeauty.com.br</strong>.</p>
  `,
})
export class Privacy {}
