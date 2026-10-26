# Pagamentos com Stripe (ambiente de teste)

Só o ambiente de **teste** (dev) tem pagamentos, e só com a Stripe em **modo de teste**: nenhum cartão real é
cobrado. A produção continua agendando direto, sem pagamento.

## Como funciona

1. O cliente cadastra um cartão em **Perfil → Meus cartões**. O número é digitado num formulário da própria Stripe
   (Stripe Elements): ele nunca passa pelo nosso app nem pelas nossas Functions. Guardamos só o id do cliente na
   Stripe (`users/{uid}/private/stripe`, que nenhuma regra abre).
2. Na tela de pagamento, "Pagar agora" faz uma **reserva** no cartão (pré-autorização). O valor é calculado pelo
   servidor a partir dos serviços do profissional, nunca enviado pelo navegador. Se o banco pedir confirmação (3D
   Secure), a Stripe abre essa etapa.
3. O agendamento é criado com o id da reserva (`paymentIntentId`). A Function `onBookingCreated` confere que a
   reserva é do cliente, do valor certo, ainda ativa e não usada por outro agendamento. Se não for, cancela o
   agendamento.
4. Quando o profissional **aceita**, a Function `onBookingUpdated` **cobra** o valor reservado. Se ele **recusa**, ou
   o agendamento é cancelado, a reserva é **liberada**; se o valor já tinha sido cobrado, é **devolvido** por
   inteiro.

`paymentStatus` do agendamento: `pending` → `authorized` → `paid`; ou `released`, `refunded`, `failed`.

## Configurar (uma vez)

1. Crie uma conta em https://dashboard.stripe.com e deixe o **Modo de teste** ligado (chave no canto da tela).
2. Em **Desenvolvedores → Chaves de API**, copie a **chave publicável** (`pk_test_...`) e a **chave secreta**
   (`sk_test_...`).
3. Guarde a chave secreta como segredo do projeto de teste. O comando pede o valor sem mostrá-lo:
   ```
   firebase functions:secrets:set STRIPE_SECRET_KEY --project dev
   ```
4. **Produção também precisa do segredo**, só porque o Firebase exige que ele exista para publicar as Functions
   (em produção ele não é usado). Coloque qualquer texto, por exemplo `nao-usado`:
   ```
   firebase functions:secrets:set STRIPE_SECRET_KEY --project default
   ```
5. Cole a chave publicável (ela é pública por definição) em `src/environments/environment.dev.ts`, em
   `payments.stripePublishableKey`. Enquanto estiver vazia, a tela de pagamento continua com o pagamento simulado.
6. Em `functions/.env.dev`, troque `PAYMENTS=off` por `PAYMENTS=on`.
7. Publique no teste **tudo junto** (Functions, regras e app): `firebase deploy --project dev` e o push da
   `develop`. Com `PAYMENTS=on` as Functions recusam agendamentos sem reserva, então o app e as Functions têm de
   subir na mesma hora.

## Cartões de teste da Stripe

| Número                | O que acontece                          |
| --------------------- | --------------------------------------- |
| `4242 4242 4242 4242` | Aprovado                                |
| `4000 0000 0000 0002` | Recusado                                |
| `4000 0000 0000 9995` | Recusado por falta de saldo             |
| `4000 0025 0000 3155` | Pede a confirmação do banco (3D Secure) |

Qualquer validade futura e qualquer CVC. No painel da Stripe (modo de teste), **Pagamentos** mostra a reserva como
"Não capturado" até o profissional aceitar.

## O que ainda não existe

- **Repasse aos profissionais** (Stripe Connect): todo o valor cai na conta da Stripe da plataforma.
- **Webhooks**: o estado do pagamento só muda pelas ações do app (aceitar, recusar, cancelar). Disputas e
  expirações não são avisadas.
- A reserva na Stripe dura **7 dias**. Um agendamento que fique sem resposta mais que isso não consegue ser cobrado:
  o cartão é recusado na cobrança e o agendamento é cancelado.
- **Política de cancelamento**: cancelar um agendamento já cobrado devolve tudo. Não há taxa nem devolução parcial.
- Produção: não tem nada disso. Quando for levar para lá, é preciso a conta da Stripe do Brasil verificada.
