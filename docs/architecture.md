# Architecture

How the code is organized and the reasons for the choices that are not obvious.

## Layout

```
src/app/
  pages/        one folder per routed screen (login, booking, pro-profile, ...)
  components/   pieces shared by screens (photo viewer, date range picker, spinner, ...)
  services/     Firebase access and app-wide state (Auth, Bookings, Professionals, Messages, ...)
  models/       types, plus converters.ts (Firestore documents -> models)
  guards/       route guards (admin, client, pro)
  utils/        pure helpers (cpf, money, phone, slots, ...), log, PATHS, form validators
shared/         domain.ts: what the app and the Cloud Functions both have to agree on
functions/      Cloud Functions (Node 22): e-mails, triggers, rate limits
e2e/            Playwright tests and their seed
rules-tests/    Firestore / Storage rules tests (emulator)
```

## Decisions

**Standalone, zoneless Angular with Signals.** No NgModules, no zone.js. State lives in signals. Services that are
only shared state stay plain services with signals (`Auth`, `Bookings`, `Messages`). A NgRx SignalStore is used
where a screen has real state with rules: `SearchStore` (text, filters, recents, results) and
`BookingFlowStore` (month, day, time, free times). Not classic NgRx: there is no need for actions and effects.

**Pure logic outside the components.** Anything that can be a function of its input is one, with its own spec:
`search-filter.ts` (filtering and sorting), `slots.ts`, `service-draft.ts`, `profile-form.ts`. Components call
them. Big screens are split in components with one job (`ServicesEditor`, `AvailabilityEditor`, `AddressField`
inside `pro-profile`).

**Pages never touch Firestore.** Reads and writes go through services (`Users`, `ProfessionalAccounts`,
`Professionals`, `Bookings`, ...). `models/converters.ts` is the only place where a document is trusted to have
the shape of a model. Collection names come from `COLLECTIONS` in `shared/domain.ts`.

**The security rules are the real backend.** The client talks to Firestore directly, so
[firestore.rules](../firestore.rules) validate what is written: the shape and sizes of bookings and messages,
the professional of a booking being real and approved, and a time slot (`busy/{slot}`) only being created together
with a booking that lists it (`getAfter`). Slots can only be created once, which is what stops double bookings.
Rules are tested in the emulator (`rules-tests/`).

**What cannot be checked in the rules is checked by a Cloud Function.** `onBookingCreated` recomputes the prices
and duration from the professional's services and rejects (cancels, frees the slots, tells the client) a booking
for services that do not exist. The callables that send e-mail (`sendPasswordReset`, `sendVerificationCode`,
`verifyEmailCode`) are rate limited per e-mail and per IP (`functions/src/rate-limit.ts`) and count code guesses
in a transaction.

**One copy of what the app and the functions share.** `shared/domain.ts` is the file that is edited. The
Cloud Functions are built from `functions/` alone, so they get a copy (`npm run sync:shared`), and a test fails
when the copy is old.

**Texts and languages.** Angular i18n with one build per language (`/`, `/en`, `/es`). Portuguese is the source:
write `$localize` in code and `i18n` in templates. A text that depends on state (an `aria-label` with a name) goes
in `utils/texts.ts` (`T`): an interpolated `aria-label="... {{ x }}"` on an `<a>` is silently dropped by Angular.
Translations are added by hand to `src/locale/messages.en.xlf` and `messages.es.xlf`; the build prints the id of a
message that has none, and the placeholder names in the translation must match the source.

**Errors.** Log with `log.error(message, error)` (`utils/log.ts`), never `console`. `AppErrorHandler` logs what
nobody caught and tells the user once every 10 seconds. A sink can be plugged in with `setLogSink` for an error
tracker.

**Logs in the Cloud Functions.** They use `firebase-functions/logger` with fields (`logger.error('Resend failed',
{ error, subject })`), so Cloud Logging can filter and alert on them, instead of `console.*` with text.

**Forms.** Reactive forms with validators from `utils/form-validators.ts` for forms that validate (login, signup,
password). Plain `ngModel` is fine for loose fields (search box, chat).

**Accessibility is checked, not hoped for.** The template accessibility rules of ESLint are errors, and an axe
scan runs in the e2e tests on the main screens. Dialogs use the `appDialog` directive (focus in, Tab trapped,
Escape closes, focus restored).

## Tests

| What                                 | Where              | Runs in                  |
| ------------------------------------ | ------------------ | ------------------------ |
| Pure logic, stores, services, guards | `src/**/*.spec.ts` | `npm test` (jsdom)       |
| Security rules                       | `rules-tests/`     | `npm run test:rules`     |
| Cloud Functions logic                | `functions/tests/` | `npm run test:functions` |
| Whole app on the emulators           | `e2e/`             | `npm run e2e`            |

The e2e build uses `src/environments/environment.e2e.ts`, which connects to the emulators and has no Google Maps
key (so the map and the address search are not part of the e2e tests). `e2e/support/seed.ts` resets the emulators
and creates two professionals, two clients and an admin.

When you refactor a screen without changing how it looks, compare screenshots before and after
(`expect(page).toHaveScreenshot()` with `maxDiffPixels: 0`); it caught real mistakes during the `pro-profile` split.

## Things that live outside the repository

- Firestore: a **TTL policy on `rateLimits.expiresAt`** (Firebase console), or the counters are never deleted.
- An error tracker (Sentry or similar) for the browser is not connected: `setLogSink` in `utils/log.ts` is where it
  plugs in. It needs an account and a DSN, and the errors would leave the app, so it is a decision for the owner.
- Firebase **App Check** is not set up (needs a reCAPTCHA provider in the console and an initialization call).
- Google Maps key referrers and the Resend secret are configured per project: see [ambientes.md](ambientes.md).
