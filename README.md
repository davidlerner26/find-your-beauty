# Find Your Beauty

A multilingual (Portuguese, English, Spanish) marketplace that connects clients with makeup artists and hair
stylists in Rio de Janeiro. Clients search by service, location and rating, book real-time slots and chat with
professionals; professionals manage their own profile and schedule, and an admin approves new accounts.

Angular 21 (standalone, zoneless, Signals, NgRx SignalStore) · Firebase (Auth, Firestore, Storage, Cloud
Functions) · installable PWA · Netlify.

- Production: https://findyourbeauty.com.br · Test environment: https://dev.findyourbeauty.com.br
- How the environments, Firebase projects and Netlify fit together: [docs/ambientes.md](docs/ambientes.md) (pt)
- How the code is organized and why: [docs/architecture.md](docs/architecture.md)
- Manual test plan: [docs/plano-de-testes.md](docs/plano-de-testes.md) (pt)

## Getting started

Node 22 and npm 11.

```bash
npm ci
npm ci --prefix functions
npm start            # the app on http://localhost:4200, using the Firebase of the TEST environment
```

`npm start` never touches production. `npm run start:en` and `npm run start:es` serve the other languages;
`npm run start:prod` talks to the production Firebase (careful).

## Scripts

| Command                                              | What it does                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| `npm start`                                          | Dev server against the test Firebase project                          |
| `npm run build` / `npm run build:dev`                | Production build / test-environment build (all three languages)       |
| `npm test`                                           | Unit tests (Vitest, through `ng test`)                                |
| `npm run test:rules`                                 | Firestore and Storage security rules, in the Firebase emulators       |
| `npm run test:functions`                             | Cloud Functions logic, in the Firestore emulator                      |
| `npm run e2e`                                        | Playwright end to end tests against the emulators (starts everything) |
| `npm run e2e -- e2e/login.spec.ts`                   | Only some e2e files (extra arguments go to Playwright)                |
| `npm run e2e:ui`                                     | Playwright UI mode                                                    |
| `npm run lint` / `npm run format:check`              | ESLint (Angular, accessibility) / Prettier                            |
| `npm run lint:styles`                                | Stylelint (tokens, mixins, no `!important`)                           |
| `npm run storybook`                                  | Catalog of the shared components on http://localhost:6006             |
| `npm run build-storybook` / `npm run test:storybook` | Static catalog in `storybook-static/` / open every story and run axe  |
| `npm run sync:shared` / `check:shared`               | Copy `shared/domain.ts` to the Cloud Functions / check the copy       |
| `npm run i18n`                                       | Extract the texts to `src/locale/messages.xlf`                        |
| `npm run deploy:dev` / `deploy:prod`                 | Functions, rules and indexes to the test / production Firebase        |

The emulator tests (`test:rules`, `test:functions`, `e2e`) need **Java 21 or newer** on the PATH.

## Before you push

GitHub Actions run the same checks as `npm run lint`, `format:check`, `check:shared`, `test`, `build`,
`build:dev`, `test:rules`, `test:functions`, `e2e` and the Storybook build with its story tests (see [.github/workflows/ci.yml](.github/workflows/ci.yml)).
Run the ones that touch your change; `npm run e2e` takes about a minute.

## Deploying

Netlify builds the site on every push: `main` is production, any other branch is the test environment.
Functions and rules are deployed by hand and **never before asking**: see [docs/ambientes.md](docs/ambientes.md).
When a change touches both the app and the Firestore rules, **deploy the app first**, then the rules (the app
sends fields that the new rules require; the old app would be refused by them).
