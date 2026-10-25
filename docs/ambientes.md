# Ambientes: produção e teste

| | Produção | Teste (dev) |
|---|---|---|
| Endereço | https://findyourbeauty.com.br | https://dev.findyourbeauty.com.br |
| Branch | `main` | `develop` (e previews de PR) |
| Projeto Firebase | `find-your-beauty-5c993` (alias `default`) | `find-your-beauty-dev` (alias `dev`) |
| Config do app | `src/environments/environment.ts` | `src/environments/environment.dev.ts` |
| Build | `npm run build` | `npm run build:dev` |
| E-mails | Resend, assunto normal | Resend, assunto com `[DEV]`, links para o endereço de teste |
| Buscadores | liberado | `robots.txt` com `Disallow: /` e faixa "Ambiente de teste" no app |

Os dois ambientes são totalmente isolados: contas, agendamentos, fotos, regras e Functions de cada um vivem no próprio projeto Firebase.

## Fluxo de trabalho
1. Trabalhar na branch `develop`. O Netlify publica em `dev.findyourbeauty.com.br`.
2. Testar lá (cadastro, agendamento, e-mails).
3. Quando estiver bom, fazer o merge de `develop` em `main`. O Netlify publica em `findyourbeauty.com.br`.
4. Se mudou algo em `functions/`, `firestore.rules`, `storage.rules` ou `firestore.indexes.json`, publicar no Firebase de cada ambiente (veja "Comandos").

## Criar o projeto Firebase de teste (uma vez)
1. No [Console do Firebase](https://console.firebase.google.com), criar o projeto (sugestão de ID: `find-your-beauty-dev`) e ativar o plano Blaze (as Functions exigem).
2. **Authentication**: ativar E-mail/senha e Google. Em *Configurações > Domínios autorizados*, adicionar `dev.findyourbeauty.com.br` e `localhost`.
3. **Firestore** e **Storage**: criar os dois em `southamerica-east1`.
4. *Configurações do projeto > Seus apps*: registrar um app web e copiar o config para `src/environments/environment.dev.ts` (os campos `TODO-...`). Se o ID do projeto não for `find-your-beauty-dev`, ajustar também `.firebaserc` e o nome `functions/.env.<alias>` não muda (usa o alias `dev`).
5. **Google Cloud > Credenciais**, na chave do Maps: adicionar os referenciadores `https://findyourbeauty.com.br/*`, `https://dev.findyourbeauty.com.br/*` e `http://localhost:4200/*` (ou criar uma chave só para teste e colocá-la em `environment.dev.ts`).
6. Segredo do Resend no projeto de teste: `firebase functions:secrets:set RESEND_API_KEY --project dev`.
7. Publicar tudo: `npm run deploy:dev`.
8. Criar uma conta no site de teste e, no Console de **teste**, colocar `admin: true` no documento dela em `users` (assim ela aprova profissionais em `/admin`).

## Netlify (uma vez)
- Um site só. O `netlify.toml` já escolhe o build: `main` = `npm run build`; demais branches e previews = `npm run build:dev`.
- Em *Domain management > Branch subdomains*, ligar `dev.findyourbeauty.com.br` à branch `develop`, e no DNS criar o CNAME de `dev` para o endereço que o Netlify indicar.
- Se criar uma chave nova (Maps ou Firebase) para teste, incluí-la em `SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES` no `netlify.toml`.

## Comandos
```
npm run start:dev      # app local falando com o Firebase de teste
npm run build:dev      # build de teste (gera também o robots.txt)
npm run deploy:dev     # Functions, regras e índices no projeto de teste
npm run deploy:prod    # o mesmo no projeto de produção
```

## Parâmetros das Functions
Ficam em arquivos `.env` carregados pelo Firebase:
- `functions/.env` (não vai para o git): valores de produção, como `RESEND_FROM` e `APP_URL=https://findyourbeauty.com.br`.
- `functions/.env.dev` (vai para o git, sem segredos): `APP_URL=https://dev.findyourbeauty.com.br`, `ENV_NAME=dev`, `INSTAGRAM_APP_ID=` (vazio, sem app de teste na Meta). Nos deploys de teste ele sobrescreve o `.env`.

Os segredos (`RESEND_API_KEY`, `INSTAGRAM_APP_SECRET`) são por projeto e nunca ficam no código.
