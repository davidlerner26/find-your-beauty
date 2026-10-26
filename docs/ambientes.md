# Ambientes: produção e teste

|                  | Produção                                   | Teste (dev)                                                       |
| ---------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| Endereço         | https://findyourbeauty.com.br              | https://dev.findyourbeauty.com.br                                 |
| Branch           | `main`                                     | `develop` (e previews de PR)                                      |
| Site no Netlify  | o principal                                | um segundo site, com `develop` como branch de produção            |
| Projeto Firebase | `find-your-beauty-5c993` (alias `default`) | `find-your-beauty-dev` (alias `dev`)                              |
| Config do app    | `src/environments/environment.ts`          | `src/environments/environment.dev.ts`                             |
| Build            | `npm run build`                            | `npm run build:dev`                                               |
| E-mails          | Resend, assunto normal                     | Resend, assunto com `[DEV]`, links para o endereço de teste       |
| Buscadores       | liberado                                   | `robots.txt` com `Disallow: /` e faixa "Ambiente de teste" no app |

Os dois ambientes são totalmente isolados: contas, agendamentos, fotos, regras e Functions de cada um vivem no próprio projeto Firebase.

## Fluxo de trabalho

1. Trabalhar na branch `develop`. O Netlify publica em `dev.findyourbeauty.com.br`.
2. Testar lá (cadastro, agendamento, e-mails).
3. Quando estiver bom, fazer o merge de `develop` em `main`. O Netlify publica em `findyourbeauty.com.br`.
4. Se mudou algo em `functions/`, `firestore.rules`, `storage.rules` ou `firestore.indexes.json`, publicar no Firebase de cada ambiente (veja "Comandos").

## Criar o projeto Firebase de teste (uma vez)

1. No [Console do Firebase](https://console.firebase.google.com), criar o projeto (sugestão de ID: `find-your-beauty-dev`) e ativar o plano Blaze (as Functions exigem).
2. **Authentication**: ativar E-mail/senha e Google. Em _Configurações > Domínios autorizados_, adicionar `dev.findyourbeauty.com.br` e `localhost`.
3. **Firestore** e **Storage**: criar os dois em `southamerica-east1`.
4. _Configurações do projeto > Seus apps_: registrar um app web e copiar o config para `src/environments/environment.dev.ts` (já preenchido para `find-your-beauty-dev`). Se o ID do projeto for outro, ajustar também `.firebaserc`; o arquivo `functions/.env.dev` não muda (usa o alias `dev`).
5. **Google Cloud > Credenciais**, na chave do Maps: adicionar os referenciadores `https://findyourbeauty.com.br/*`, `https://dev.findyourbeauty.com.br/*` e `http://localhost:4200/*` (ou criar uma chave só para teste e colocá-la em `environment.dev.ts`).
6. Segredo do Resend no projeto de teste: `firebase functions:secrets:set RESEND_API_KEY --project dev`.
7. Publicar tudo: `npm run deploy:dev`.
8. Criar uma conta no site de teste e, no Console de **teste**, colocar `admin: true` no documento dela em `users` (assim ela aprova profissionais em `/admin`).

## Netlify (uma vez)

O build escolhe o ambiente pela branch (`scripts/netlify-build.cjs`): `main` = produção, qualquer outra branch ou preview = teste.

**Segundo site para o teste (funciona com qualquer DNS):**

1. No Netlify, criar um segundo site a partir do mesmo repositório do GitHub.
2. Em _Site configuration > Build & deploy > Branches_, definir a **branch de produção = `develop`**.
3. Em _Domain management_, adicionar o domínio `dev.findyourbeauty.com.br`.
4. No DNS do domínio, criar um CNAME `dev` apontando para o endereço `NOME-DO-SITE-DEV.netlify.app` que o Netlify mostrar. O HTTPS é emitido sozinho.

(Branch subdomains do Netlify só funcionam com o DNS do domínio no Netlify DNS, e o prefixo é o nome da branch, por isso não usamos.)

Se criar uma chave nova (Maps ou Firebase) para teste, incluí-la em `SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES` no `netlify.toml`.

## Comandos

```
npm start              # app local falando com o Firebase de teste (ambiente dev)
npm run start:en       # idem, em inglês (start:es em espanhol)
npm run start:prod     # app local falando com o Firebase de produção
npm run build:dev      # build de teste (gera também o robots.txt)
npm run deploy:dev     # Functions, regras e índices no projeto de teste
npm run deploy:prod    # o mesmo no projeto de produção
```

## Dados de teste

`scripts/seed/seed.cjs` cria 20 maquiadoras fictícias no ambiente de **teste** (contas, perfis, avaliações e fotos). Ele recusa rodar na produção. Precisa da chave de conta de serviço do projeto de teste e de uma pasta com as fotos (`pool/` e `profile/`, fora do git):

```
GOOGLE_APPLICATION_CREDENTIALS=<chave do find-your-beauty-dev.json> SEED_IMAGES=<pasta> node scripts/seed/seed.cjs
# apagar tudo o que ele criou: acrescente --delete
```

As contas usam a senha `Seed@2026!` e e-mails `nome.sobrenome@seed.findyourbeauty.test`.

## Parâmetros das Functions

Ficam em arquivos `.env` carregados pelo Firebase:

- `functions/.env` (não vai para o git): valores de produção, como `RESEND_FROM` e `APP_URL=https://findyourbeauty.com.br`.
- `functions/.env.dev` (vai para o git, sem segredos): `APP_URL=https://dev.findyourbeauty.com.br`, `ENV_NAME=dev`, `INSTAGRAM_APP_ID=` (vazio, sem app de teste na Meta). Nos deploys de teste ele sobrescreve o `.env`.

Os segredos (`RESEND_API_KEY`, `INSTAGRAM_APP_SECRET`) são por projeto e nunca ficam no código.
