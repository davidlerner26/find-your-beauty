# Working in this repository

Read [README.md](README.md) for the commands and [docs/architecture.md](docs/architecture.md) for the structure.

## Rules

- **Language.** Code, comments, commit messages and `docs/architecture.md` in English. The user speaks Portuguese:
  answer in Portuguese. Texts in the UI are written in Portuguese and translated (see "Texts" in the architecture
  doc). Never write "a cliente" / "as clientes" in pt/es texts: use a neutral or masculine form.
- **Commits.** Commit every change at the end of the work, with a short English message ending with the line
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (in the first commit command, never added afterwards).
  Do not push.
- **Ask before deploying** Functions, rules or anything on Netlify, and before anything outward facing.
- **Verify before saying it works.** For a change run what touches it: `npm run lint`, `npm run format:check`,
  `npm test -- --watch=false`, `npm run build`, and `npm run e2e` for anything a user can see. Report what failed.

## Conventions

- A page does not import `firebase/firestore`: add a method to a service.
- Pure logic goes in a function with a spec, not in the component.
- `log.error(...)`, not `console.error(...)`. Do not swallow errors with an empty `catch`.
- Routes with `PATHS`, collections with `COLLECTIONS`, booking statuses with the helpers of `shared/domain.ts`.
- After changing `shared/domain.ts` run `npm run sync:shared`.
- Interactive elements must work with the keyboard (the ESLint accessibility rules are errors). A dialog gets
  `appDialog`.
- A change to `firestore.rules` needs a test in `rules-tests/`; the app must be deployed before the rules.

## Gotchas

- A callable that answers 403 to the browser ("request was not authenticated" in its log) was not made public
  when it was created. `invoker: 'public'` in the code does not fix an existing one: delete it
  (`firebase functions:delete NAME --region southamerica-east1`) and deploy again. Check with an empty POST to
  `https://southamerica-east1-PROJECT.cloudfunctions.net/NAME`: 400 means it is reachable.
- The emulator tests need Java 21+. Brew may lack permissions: a JDK in a temporary folder on the PATH works.
- `ng test` cannot `vi.mock` relative imports; mock `firebase/*` modules or use TestBed providers.
- In e2e, `getByPlaceholder('Nome')` also matches "Sobrenome": use `{ exact: true }`.
