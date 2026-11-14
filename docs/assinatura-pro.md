# Assinatura Pro (profissionais)

Uma assinatura **só para profissionais**. O cliente nunca paga nada no site. Tudo o que existe hoje continua
gratuito (Instagram incluído): o Pro só **soma** benefícios.

> **Está só no ambiente de teste (`develop`).** A produção não muda até o dono dizer "pode ir para produção".
> Veja "Ir para produção" no fim.

## Benefícios da primeira versão

- **Profissionais em destaque** na home: só assinantes, em rodízio (ordem embaralhada a cada visita). Sem
  assinantes, a seção não aparece.
- **Selo "Pro"** nos cards e na página do profissional.
- **Prioridade** na busca (sem ordem escolhida, assinantes vêm primeiro) e no mapa (pin com cor própria, desenhado
  por cima dos outros; a lista continua do mais perto para o mais longe).

Ideias para depois: painel de estatísticas, lembretes automáticos ao cliente e pedido de avaliação, galeria maior,
responder avaliações, link e QR code próprios, vídeo de apresentação, lista de espera, agenda em iCal, selo "Oferta"
com cupom, respostas rápidas no chat, resumo semanal por e-mail, suporte prioritário, equipe (assistentes).

## Como funciona

1. A profissional abre **Perfil → Assinatura Pro** (`/pro/assinatura`) e clica em **Assinar**. Ela vai para o
   **Stripe Checkout** (página da própria Stripe, o cartão nunca passa por nós) no modo assinatura.
2. A Stripe avisa o webhook `stripeWebhook` (assinado: a Function confere a assinatura). A Function grava os dados da
   Stripe em `professionals/{uid}/private/billing` (que nenhuma regra abre) e liga `pro: true` no documento público.
   Eventos fora de ordem ou repetidos não estragam nada. Chegam e-mails (pt/en/es) quando o Pro começa, quando uma
   renovação falha (`past_due`) e quando termina. A tela da assinatura lê o estado pela Function `getProStatus`.
3. **Gerenciar assinatura** abre o **portal de cobrança** da Stripe (trocar cartão, ver faturas, cancelar).
4. `pro` fica ligado enquanto a assinatura está `active`, `trialing` ou `past_due` (cobrança que falhou: segue até o
   fim do período já pago) e, depois de cancelada, até o fim do período pago. A Function diária `reconcileProDaily`
   desliga o `pro` de quem passou do fim do período.
5. `pro` e `proUntil` só as Functions escrevem: as regras do Firestore proíbem a dona do perfil de mudar.

O preço **não está no código**: é o `PRO_PRICE_ID` (um _Price_ recorrente em BRL criado na Stripe). Para mensal e
anual, são dois _Prices_.

## Trava de segurança (por que a produção não muda)

| Onde                                   | Teste (dev) | Produção         |
| -------------------------------------- | ----------- | ---------------- |
| `environment.features.proSubscription` | `true`      | `false`          |
| `functions/.env` `SUBSCRIPTIONS`       | `on`        | `off` (o padrão) |
| Stripe                                 | modo teste  | nada configurado |

Com a chave do app desligada, nada do Pro aparece (página, selo, prioridade, destaque). Com `SUBSCRIPTIONS=off`, as
Functions respondem "não disponível" e o webhook responde 404. Um teste (`features.spec.ts`) falha se alguém ligar a
chave em produção sem querer.

## Configurar o teste (uma vez)

1. Na Stripe, **Modo de teste** ligado: criar o produto "Find Your Beauty Pro" com um preço recorrente mensal em BRL
   e copiar o id do preço (`price_...`) para `PRO_PRICE_ID` em `functions/.env.dev`.
2. **Desenvolvedores → Webhooks**: adicionar o endereço da Function `stripeWebhook` do projeto de teste, com os eventos
   `checkout.session.completed`, `customer.subscription.updated` e `customer.subscription.deleted`. Copiar o segredo do webhook (`whsec_...`).
3. Guardar o segredo no projeto de teste (o comando pede o valor sem mostrá-lo):
   ```
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project dev
   ```
4. Ativar o **portal de cobrança** em _Configurações → Cobrança → Portal do cliente_ (permitir cancelar e trocar o
   cartão).
5. Publicar no teste: app primeiro, depois as regras e as Functions (`firebase deploy --project dev`).

Cartão de teste: `4242 4242 4242 4242`, qualquer data futura e qualquer CVC.

## Ir para produção (só quando o dono mandar)

Nada disto foi feito. Ordem:

1. Na Stripe em **modo real**: o produto e o preço Pro, o portal de cobrança e o webhook apontando para a Function de
   **produção**.
2. Segredos em produção: `STRIPE_SECRET_KEY` (a chave real, hoje há um texto qualquer porque não é usada) e
   `STRIPE_WEBHOOK_SECRET`. O Firebase exige os dois para publicar as Functions.
3. `functions/.env`: `SUBSCRIPTIONS=on` e `PRO_PRICE_ID` com o preço real.
4. `src/environments/environment.ts`: `proSubscription: true` e o teste de `features.spec.ts` junto.
5. Publicar: o **app primeiro** (merge de `develop` em `main`), depois as regras e as Functions
   (`firebase deploy --project default`).
6. Testar com uma assinatura real pequena e cancelar em seguida.
