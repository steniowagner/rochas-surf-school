---
id: "077"
slug: test-accounts-page
title: Test accounts page for testers
status: accepted
created: 2026-10-29
started: 2026-10-29
base_commit: 8afe1d749ef35aa8e906eb17b725d60e31a37936
reviewed_commit: 714dc8491da52a84d6ac7b9fbcbabe28ec5eb280
fronts: [shared, backend, web]
depends_on: []
---

# 077 — Test accounts page for testers

## Goal

Testers of the app look up their test set's accounts on a page of the public site, `/{lang}/user-journeys/test-accounts`,
instead of relying only on the message the school sent: the page lists the 12 test sets of spec 076, each with
its admin, instructor and student account's name and email address, and never a sign-in code (the codes still
reach each tester only from the school). The page and the backend's `npm run test-accounts` read the sets from
one list in `@rochas-surf-school/shared`, so the emails and names a tester reads are always the accounts the
server creates.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: the review accounts (fixed sign-in codes,
  pre-approved) and the 12 test sets that spec 076 made of them; the public site in three languages.
- Requirements: [requirements.md → Review accounts](../../../.docs/requirements.md#review-accounts) — pre-approved
  accounts with a fixed code, which spec 076 extended to the 36 test accounts;
  [requirements.md → 6.1 Public web pages](../../../.docs/requirements.md#61-public-web-pages) — the public site in
  pt-br, es and en that this page joins.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Applications →
  `apps/web` (the `[lang]` routes, the dictionaries, `src/proxy.ts`), `packages/shared` (built to `dist/`, Jest
  tests in `packages/shared/test/`), Automated validation (Vitest + React Testing Library and Playwright on web,
  Vitest on backend, Jest on shared), Coverage (`apps/web/src/**` is excluded, so web behavior is proven by the
  Vitest and Playwright tests).
- Spec 076: [Decisions](../../finished/20261029160858-076-user-journeys-pages/spec.md#decisions) — D-21 (the 12
  sets: `testeNN.admin|instrutor|aluno@rochas-surf-school.test`, names "Admin|Instrutor|Aluno Teste <n>" with
  `<n>` spelled in Portuguese), D-22 (codes are never committed; the script prints them) and D-06 (no user
  journey page shows a code).
- Existing code this builds on:
  - `apps/backend/prisma/seed/test-accounts.ts` — `buildTestAccounts(randomCode?)` holds the set numbers, the
    three roles and the email domain itself and returns the 36 `ReviewAccount`s with random codes;
    `formatTestAccounts` prints the `REVIEW_ACCOUNTS` line and the hand-out table; tested by
    `test-accounts.spec.ts` and `print-test-accounts.spec.ts`.
  - `apps/backend/src/modules/auth/auth.config.ts` — `ReviewAccount { email, code, role: UserRole, name }`;
    `UserRole` (`modules/auth/src/user/model/user.entity.ts`) is `'student' | 'instructor' | 'admin'`.
  - `apps/web/src/app/[lang]/user-journeys/` — the layout (wide `SiteShell`, `robots: noindex, nofollow`), the
    index (`page.tsx`) and the `[flow]` route (`dynamicParams = false`); a static `test-accounts` folder takes
    precedence over `[flow]`.
  - `apps/web/src/modules/user-journeys/pages/{user-journeys-index,user-journey-flow}/` — the index (intro,
    "Before you start", the flow `LinkRow`s inside `data-testid="user-journey-flows"`) and the flow page (the
    "Account to use" `ContentCard`).
  - `apps/web/src/modules/user-journeys/components/journey-board/journey-board.hook.ts` — the "Copy results"
    pattern: `navigator.clipboard.writeText`, then a copied or failed state.
  - `apps/web/src/i18n/dictionaries/{en,es,pt-br}.ts` → `userJourneys` — the user journey labels.
  - `apps/web/e2e/user-journeys.e2e.ts` — the user journey e2e tests; the index and flow pages assert that their
    `main` shows no email address or 6-digit code, and the visibility test checks every user journey page is
    `noindex`.
  - `packages/shared/src/index.ts` — the package's exports; `PersonNameRule` and `EmailRule` live in
    `src/validation`.

## Scope

### In scope

- `testAccountSets` in `@rochas-surf-school/shared`: the 12 sets' set number, role, email and name, no codes.
- `buildTestAccounts` built from `testAccountSets`, with the same output as today.
- `/{lang}/user-journeys/test-accounts` in pt-br, es and en, statically generated, `noindex`, with a copy button
  per email.
- A "Test accounts" row on the user journeys index and a "See the test accounts" link in each flow page's
  "Account to use" block.

### Out of scope

- Showing, storing or committing any sign-in code; the `REVIEW_ACCOUNTS` format, `.env.example` and the seed.
- Changing the test sets (their number, emails, names or roles).
- Showing only one tester's set (a set picker, a query string, or a per-tester link).
- Linking the page from the site's home, the designs index or the site header.
- Any change to the mobile app.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | `packages/shared/src/test-accounts/test-account-sets.ts` exports `testAccountSets`: a readonly array of 12 `{ set, accounts }` in set order, `set` from `"01"` to `"12"`, `accounts` the three `{ role, email, name }` of spec 076 D-21 in the order admin, instructor, student (`role` is `"admin" \| "instructor" \| "student"`). It is exported from `packages/shared/src/index.ts` with its types (`TestAccountSet`, `TestAccount`). It holds no code. | One source for the page and the script (the user's choice), so they can't drift; shared is the package both apps already import. |
| D-02 | `buildTestAccounts(randomCode?)` maps `testAccountSets` (flattened, in order) to `ReviewAccount`s, adding one distinct random code each; its signature and output shape don't change, and `formatTestAccounts` and `print-test-accounts.ts` don't change. The set numbers, roles and email domain leave `test-accounts.ts`. | The script keeps working as spec 076 defined it; only where the list lives moves. |
| D-03 | The page is a static route, `apps/web/src/app/[lang]/user-journeys/test-accounts/page.tsx`, rendering `TestAccountsPage` from `src/modules/user-journeys/pages/test-accounts/`. It inherits the user journeys layout (wide `SiteShell`, `noindex, nofollow`); `src/proxy.ts`'s matcher already covers `/user-journeys/:path*`, so `/user-journeys/test-accounts` redirects to the browser's language without a change. | Next.js picks a static segment over `[flow]`; `test-accounts` can't be mistaken for a flow (the user's choice). |
| D-04 | The page shows `ScreenIntro` (title "Test accounts", the intro of D-07), an "All flows" link to `/{lang}/user-journeys`, then 12 cards in set order, one per set, titled "Set NN". Each card has three rows (admin, instructor, student): the translated role, the name as stored (e.g. "Admin Teste Um", never translated) and the email with a copy button. From 768 px the cards sit in a grid of two (three from 1024 px); below, one column. | Names are the accounts' real names in the app, so testers should read them as the app shows them; cards per set match how the school hands sets out (the user's choice). |
| D-05 | Each email has a "Copy email" button (`CopyEmailButton`, a client component in `src/modules/user-journeys/components/copy-email-button/`) at least 44 px tall: tapping it calls `navigator.clipboard.writeText(email)`; on success its label becomes "Copied" for 2 s, on failure the row shows "Couldn't copy the email. Try again." until the next tap. Each button keeps its own state. The button's accessible name includes the email ("Copy email teste01.admin@rochas-surf-school.test"). | Testers read the page on the phone they test with; the same pattern as "Copy results"; 44 px touch targets (design system section 08); a unique name per button for screen readers and tests. |
| D-06 | The index gets one `LinkRow` "Test accounts" (description "The email addresses of the 12 test sets — no codes.") between the "Before you start" card and the flow cards, outside `data-testid="user-journey-flows"`. Each flow page's "Account to use" card gets, after its text, a link "See the test accounts" to `/{lang}/user-journeys/test-accounts`. | Testers find the page from where they start and from where the account is named (the user's choice); the flow list keeps its four cards. |
| D-07 | Labels (en), in `userJourneys.testAccounts` of the dictionaries: metaTitle "Test accounts", title "Test accounts", intro "Each test set has one account per role. Use the set the school sent you: sign in with \"Continue with email\" → \"I have an account\", the account's email address and the code the school gave you. The codes are never on this page.", set "Set {set}", roles "Admin", "Instructor", "Student", copyEmail "Copy email", copied "Copied", copyFailed "Couldn't copy the email. Try again.", indexRow.title "Test accounts", indexRow.description "The email addresses of the 12 test sets — no codes.", seeTestAccounts "See the test accounts". pt-BR and es are translations; the dictionaries' type makes a missing key fail `check-types`. | Fixed strings the tests and the reviewer can match. |
| D-08 | The page's e2e tests assert that its `main` contains no 6-digit number; the existing "no email or code" assertions of the index and flow pages stay as they are. | The page shows emails by design, but spec 076 D-06 (no code on any page) still holds. |

## Expected Results

### ER-01 — One list of test sets feeds the script

- **Front:** shared, backend
- **Behavior:** Given `testAccountSets` from `@rochas-surf-school/shared`, then it has 12 sets, `"01"` to `"12"` in
  order, each with three accounts in the order admin, instructor, student, whose emails and names are those of
  spec 076 D-21 (e.g. set `"03"`: `teste03.admin@rochas-surf-school.test` "Admin Teste Três",
  `teste03.instrutor@rochas-surf-school.test` "Instrutor Teste Três", `teste03.aluno@rochas-surf-school.test`
  "Aluno Teste Três"). Given `buildTestAccounts()`, then its 36 accounts have exactly the emails, names and roles
  of `testAccountSets` flattened, in the same order, each with a distinct 6-digit code.
- **Edge and error cases:** the 36 emails are distinct and pass `EmailRule`; every name passes `PersonNameRule`; no
  account in `testAccountSets` has a `code` property; `npm run test-accounts --workspace apps/backend` still prints
  the `REVIEW_ACCOUNTS='…'` line and the 36-row table; the existing `test-accounts.spec.ts` and
  `print-test-accounts.spec.ts` assertions still pass.
- **Verify by:** `packages/shared/test/test-accounts/test-account-sets.test.ts` and
  `apps/backend/prisma/seed/test-accounts.spec.ts` → `mirrors testAccountSets`, run by
  `node .specs/scripts/run-related-tests.mjs 077`; `npm run test-accounts --workspace apps/backend`.

### ER-02 — The page lists the 36 accounts without codes

- **Front:** web
- **Behavior:** Given `/{lang}/user-journeys/test-accounts` for each of `pt-br`, `es` and `en`, then the page shows
  the title and intro of D-07 in that language, an "All flows" link to `/{lang}/user-journeys`, and 12 cards
  titled "Set 01" … "Set 12" (translated), in order; each card shows the translated role, the name and the email
  of its admin, instructor and student, matching `testAccountSets`.
- **Edge and error cases:** the page's `main` contains no 6-digit number; its `<head>` has
  `<meta name="robots" content="noindex, nofollow">`; `/de/user-journeys/test-accounts` answers 404; a browser
  whose first language is Spanish requesting `/user-journeys/test-accounts` gets 307 to
  `/es/user-journeys/test-accounts`; the four flow pages still render at their URLs.
- **Verify by:** `apps/web/e2e/user-journeys.e2e.ts` → `test accounts page lists the 12 sets in every language`
  and `redirects /user-journeys/test-accounts to the browser language`, and the visibility test extended to the
  page, run by `node .specs/scripts/run-e2e.mjs 077`;
  `apps/web/src/modules/user-journeys/pages/test-accounts/test-accounts.page.test.tsx` (12 cards, 36 emails from
  `testAccountSets`, the names untranslated).

### ER-03 — An email can be copied

- **Front:** web
- **Behavior:** Given the test accounts page, when the tester taps the "Copy email" button of
  `teste05.aluno@rochas-surf-school.test`, then that email is on the clipboard and that button's label is
  "Copied"; after 2 s it reads "Copy email" again.
- **Edge and error cases:** when `navigator.clipboard.writeText` rejects, the row shows "Couldn't copy the email.
  Try again." and the clipboard is unchanged; tapping another email's button changes only that button; each
  button is at least 44 px tall.
- **Verify by:** `apps/web/src/modules/user-journeys/components/copy-email-button/copy-email-button.component.test.tsx`
  (success, failure, the 2 s reset with fake timers), run by `node .specs/scripts/run-related-tests.mjs 077`;
  `apps/web/e2e/user-journeys.e2e.ts` → `copy an email on the test accounts page` (clipboard permission granted,
  reads the clipboard).

### ER-04 — Testers reach the page from the user journeys

- **Front:** web
- **Behavior:** Given `/{lang}/user-journeys`, then it shows a "Test accounts" row (D-06) linking to
  `/{lang}/user-journeys/test-accounts`; given any of the four flow pages, then its "Account to use" card has a
  "See the test accounts" link to `/{lang}/user-journeys/test-accounts`, in the same language.
- **Edge and error cases:** the index's `data-testid="user-journey-flows"` still holds exactly four links; the
  index and flow pages still show no email address or 6-digit code in their `main`; no page outside
  `/{lang}/user-journeys…` links to `/test-accounts`.
- **Verify by:** `apps/web/e2e/user-journeys.e2e.ts` → `index and flow pages link to the test accounts`, plus the
  existing `index lists the four flows in every language` and `flow pages show every test case`, run by
  `node .specs/scripts/run-e2e.mjs 077`.

### ER-05 — The page fits a phone and follows the theme

- **Front:** web
- **Behavior:** Given the test accounts page at 375 × 812 and at 1280 × 800, then the page has no horizontal
  scroll (`document.documentElement.scrollWidth <= window.innerWidth`) and every email is fully visible
  (wrapping, not clipped); in dark theme the cards use the dark palette.
- **Edge and error cases:** `grep -rnE "#[0-9a-fA-F]{3,6}\b|rgb\(" apps/web/src/modules/user-journeys` finds
  nothing (colors, type and radii come from the tokens).
- **Verify by:** `apps/web/e2e/user-journeys.e2e.ts` → `test accounts page fits a phone and a desktop`, run by
  `node .specs/scripts/run-e2e.mjs 077`; the grep above.

## Tasks

### Shared (`packages/shared`)

- [x] **T-01** — Add `src/test-accounts/test-account-sets.ts` (`testAccountSets`, `TestAccountSet`, `TestAccount`,
  D-01) and `src/test-accounts/index.ts`, export them from `src/index.ts`, and add
  `test/test-accounts/test-account-sets.test.ts`: 12 sets `"01"`–`"12"`, three accounts each in role order, the
  D-21 emails and names (a few literal checks plus the generated pattern), distinct emails passing `EmailRule`,
  names passing `PersonNameRule`, no `code` property.
  Covers: ER-01 · Done when: `npm test --workspace @rochas-surf-school/shared` passes and
  `npm run build --workspace @rochas-surf-school/shared` emits `dist/test-accounts/`.
  > ✅ 2026-10-29 22:20 — `testAccountSets` (12 sets built from the Portuguese set names, readonly, no code) with
  > `TestAccountSet` / `TestAccount`, exported through the `test-accounts` barrel; the test was written first and
  > failed (`testAccountSets` undefined) before the source existed; files:
  > `packages/shared/src/test-accounts/test-account-sets.ts`, `packages/shared/src/test-accounts/index.ts`,
  > `packages/shared/src/index.ts`, `packages/shared/test/test-accounts/test-account-sets.test.ts`; verified:
  > `npm test --workspace @rochas-surf-school/shared` (26 suites, 128 passed; `test-account-sets.ts` 100% covered),
  > `npm run build --workspace @rochas-surf-school/shared` (emits `dist/test-accounts/index.js`,
  > `test-account-sets.js` and their `.d.ts`); deviations: none

### Backend (`apps/backend`)

- [x] **T-02** — Change `prisma/seed/test-accounts.ts` to build its accounts from `testAccountSets` (D-02),
  removing its own set numbers, roles and domain; add to `prisma/seed/test-accounts.spec.ts` the test
  `mirrors testAccountSets` (emails, names and roles equal the flattened list, in order).
  Covers: ER-01 · Done when: `npx vitest run prisma/seed` passes in `apps/backend` and
  `npm run test-accounts --workspace apps/backend` prints the line and 36 table rows.
  > ✅ 2026-10-29 22:35 — `buildTestAccounts` now flattens `testAccountSets` and adds one distinct random code per
  > account; `SET_NUMBERS`, `SET_ROLES` and `EMAIL_DOMAIN` are gone; signature, output and `formatTestAccounts`
  > unchanged; added the test `mirrors testAccountSets`. It passes both before and after the source change (the
  > output is the same by design, D-02); it fails as soon as the script's list and the shared one differ; files:
  > `apps/backend/prisma/seed/test-accounts.ts`, `apps/backend/prisma/seed/test-accounts.spec.ts`; verified:
  > `npx vitest run prisma/seed` in `apps/backend` (4 files, 20 passed, the existing assertions unchanged),
  > `npm run test-accounts --workspace apps/backend` (the `REVIEW_ACCOUNTS='[…]'` line and 36 table rows),
  > `npm run check-types` and `npm run lint` in `apps/backend` (no error, no warning in `prisma/seed`);
  > deviations: none

### Web (`apps/web`)

- [x] **T-03** — Add the D-07 labels as `userJourneys.testAccounts` to `src/i18n/dictionaries/en.ts`, `pt-br.ts`
  and `es.ts` (and its type wherever the dictionary type is declared).
  Covers: enabling · Done when: `npx turbo run check-types --filter=@rochas-surf-school/web` passes.
  > ✅ 2026-10-29 22:45 — `userJourneys.testAccounts` (metaTitle, title, intro, set, roles, copyEmail, copied,
  > copyFailed, indexRow, seeTestAccounts) typed in `Dictionary` and filled with the D-07 English labels and their
  > pt-BR ("Contas de teste", "Conjunto {set}", "Instrutor", "Aluno"…) and es ("Cuentas de prueba", "Alumno"…)
  > translations; files: `apps/web/src/i18n/dictionary.types.ts`, `apps/web/src/i18n/dictionaries/en.ts`,
  > `apps/web/src/i18n/dictionaries/pt-br.ts`, `apps/web/src/i18n/dictionaries/es.ts`; verified:
  > `npx turbo run check-types --filter=@rochas-surf-school/web` (4 successful); deviations: none

- [x] **T-04** — Add `src/modules/user-journeys/components/copy-email-button/` (`copy-email-button.component.tsx`,
  `.hook.ts`, `.types.ts`, `index.ts`, following `.claude/rules/react.md`) implementing D-05, with
  `copy-email-button.component.test.tsx` (copied, the 2 s reset, failure, accessible name).
  Skill: [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-03 · Done when: `npx vitest run src/modules/user-journeys/components/copy-email-button` passes in
  `apps/web`.
  > ✅ 2026-10-29 22:55 — `CopyEmailButton` (client component, outline `Button`, so `min-h-11` = 44 px): the visible
  > label is "Copy email" / "Copied", and a `sr-only` copy of the email makes each button's name unique
  > ("Copy email teste01.admin@…"); `useCopyEmailButton` holds its own `CopyState` (reusing the "Copy results"
  > type), clears a failure on the next tap, writes the email with `navigator.clipboard.writeText`, and resets
  > "Copied" after 2 s; the failure shows as a `role="alert"` line under the button. Applied from
  > `vercel-react-best-practices`: only the email and three labels cross into the client component
  > (`server-serialization`), ternary conditional rendering (`rendering-conditional-render`). The test was
  > written first and failed (no component); files:
  > `apps/web/src/modules/user-journeys/components/copy-email-button/copy-email-button.component.tsx`,
  > `apps/web/src/modules/user-journeys/components/copy-email-button/copy-email-button.hook.ts`,
  > `apps/web/src/modules/user-journeys/components/copy-email-button/copy-email-button.types.ts`,
  > `apps/web/src/modules/user-journeys/components/copy-email-button/index.ts`,
  > `apps/web/src/modules/user-journeys/components/copy-email-button/copy-email-button.component.test.tsx`;
  > verified: `npx vitest run src/modules/user-journeys/components/copy-email-button` in `apps/web` (4 passed,
  > three runs: accessible name and 44 px, copied then reset after 2 s with fake timers, failure until the next
  > tap, only the tapped button changes), `npx eslint` on the folder (clean); deviations: none

- [x] **T-05** — Add `src/app/[lang]/user-journeys/test-accounts/page.tsx` (`generateMetadata` with the D-07
  metaTitle, `notFound()` for an unknown language) and `src/modules/user-journeys/pages/test-accounts/`
  (`test-accounts.page.tsx`, `.types.ts`, `index.ts`) implementing D-03 and D-04 from `testAccountSets`, with
  `test-accounts.page.test.tsx`; add to `e2e/user-journeys.e2e.ts` the tests `test accounts page lists the 12 sets
  in every language`, `redirects /user-journeys/test-accounts to the browser language`,
  `copy an email on the test accounts page` and `test accounts page fits a phone and a desktop`, and add the page
  to the visibility test's `noindex` loop.
  Covers: ER-02, ER-03, ER-05 · Done when: `npx vitest run src/modules/user-journeys/pages/test-accounts` passes
  and those e2e tests pass in `apps/web`.
  > ✅ 2026-10-29 23:25 — static route `test-accounts/page.tsx` (`generateMetadata` titled
  > "<metaTitle> — <User journeys> | <site>", `notFound()` for an unknown language; inherits the layout's wide
  > `SiteShell` and `noindex, nofollow`) rendering `TestAccountsPage`: `ScreenIntro` (title + intro), a subtle
  > "All flows" button link to `/{lang}/user-journeys`, and a `grid` (one column, two from `md` 768 px, three
  > from `lg` 1024 px, `data-testid="test-account-sets"`) of 12 `ContentCard`s titled `set` ("Set 01"…), each a
  > list of three rows: translated role, the stored name, the email (`wrap-anywhere`,
  > `data-testid="test-account-email"`) and its `CopyEmailButton` (only its three labels are passed to the client
  > component). The page test was written first and failed (no page). e2e: added `test accounts page lists the 12
  > sets in every language` (pt-br, es, en; title, intro, "All flows", 12 cards × 3 rows from `testAccountSets`,
  > no 6-digit number in `main`), `test accounts page answers 404 for an unknown language`,
  > `redirects /user-journeys/test-accounts to the browser language`, `copy an email on the test accounts page`
  > (clipboard granted: reads `teste05.aluno@…` back, only that button reads "Copied", ≥ 44 px, back to "Copy
  > email" after 2 s) and `test accounts page fits a phone and a desktop` (375 × 812 and 1280 × 800: no
  > horizontal scroll, every email inside its card; the theme toggle changes the card's background and
  > border), and `/test-accounts` to the visibility test's `noindex` loop. Checked that the fit test can fail: with
  > the emails forced to `whitespace-nowrap` it fails at 260 px (at 375 px the longest email already fits in its
  > card); files: `apps/web/src/app/[lang]/user-journeys/test-accounts/page.tsx`,
  > `apps/web/src/modules/user-journeys/pages/test-accounts/test-accounts.page.tsx`,
  > `apps/web/src/modules/user-journeys/pages/test-accounts/test-accounts.types.ts`,
  > `apps/web/src/modules/user-journeys/pages/test-accounts/index.ts`,
  > `apps/web/src/modules/user-journeys/pages/test-accounts/test-accounts.page.test.tsx`,
  > `apps/web/e2e/user-journeys.e2e.ts`; verified: `npx vitest run src/modules/user-journeys/pages/test-accounts`
  > (4 passed), `npx playwright test e2e/user-journeys.e2e.ts -g "test accounts|visibility|redirects"` (9 passed),
  > `npm run check-types` and `npx eslint` on the touched files (clean); deviations: the 404 check is its own test
  > (`test accounts page answers 404 for an unknown language`); in the copy test the "no alert" check is scoped to
  > `main`, because Next's route announcer is a `role="alert"` outside it

- [x] **T-06** — Add the "Test accounts" `LinkRow` to `src/modules/user-journeys/pages/user-journeys-index/` and the
  "See the test accounts" link to the "Account to use" card of `src/modules/user-journeys/pages/user-journey-flow/`
  (D-06), updating their page tests; add to `e2e/user-journeys.e2e.ts` the test
  `index and flow pages link to the test accounts`.
  Covers: ER-04 · Done when: `npm test --workspace @rochas-surf-school/web` and the user journeys e2e file pass.
  > ✅ 2026-10-29 23:40 — the index renders a `LinkRow` (icon `UsersRound`, `indexRow.title` / `.description`) to
  > `/{lang}/user-journeys/test-accounts` between the "Before you start" card and `data-testid="user-journey-flows"`
  > (still four links); the flow page's "Account to use" `ContentCard` gets, after its text, a "See the test
  > accounts" link (bold, underlined `text-ink`, `min-h-11`) to the same page. Page tests updated first and failed
  > before the change (the index row and the flow links missing). e2e: added `index and flow pages link to the
  > test accounts` (every language: the index row and its href, four flow cards, the link inside each flow's
  > "Account to use" section, no email or 6-digit code in the index's and flow pages' `main`, no
  > `/test-accounts` link on the home; then the student flow's link opens the page); files:
  > `apps/web/src/modules/user-journeys/pages/user-journeys-index/user-journeys-index.page.tsx`,
  > `apps/web/src/modules/user-journeys/pages/user-journeys-index/user-journeys-index.page.test.tsx`,
  > `apps/web/src/modules/user-journeys/pages/user-journey-flow/user-journey-flow.page.tsx`,
  > `apps/web/src/modules/user-journeys/pages/user-journey-flow/user-journey-flow.page.test.tsx`,
  > `apps/web/e2e/user-journeys.e2e.ts`; verified: `npm test --workspace @rochas-surf-school/web` (239 files, 805
  > passed), `npx playwright test e2e/user-journeys.e2e.ts` (24 passed), `npx eslint` on the touched files
  > (clean); deviations: none

### Verification

- [x] **T-07** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0 and the greps give the expected result.
  > ✅ 2026-10-29 23:59 — every Verification Plan command run from the repo root, all passing:
  > `node .specs/scripts/run-related-tests.mjs 077` → RELATED TESTS PASSED (backend, web, shared, and the suites of
  > mobile and every module that imports shared); `node .specs/scripts/check-coverage.mjs 077` → COVERAGE OK
  > (`test-account-sets.ts` and the changed lines of `test-accounts.ts` 100%; `apps/web/src/**` and the barrels
  > excluded by technical-context); `node .specs/scripts/run-e2e.mjs 077` (Postgres up) → E2E PASSED (backend 28
  > files / 817 tests, web 74 Playwright tests); `npm run test-accounts --workspace apps/backend` → one
  > `REVIEW_ACCOUNTS='[…]'` line and 36 table rows; `grep -rnE "#[0-9a-fA-F]{3,6}\b|rgb\(" apps/web/src/modules/user-journeys`
  > and `grep -rn "REVIEW_ACCOUNTS" apps/web packages/shared/src` → no match (exit 1);
  > `npx turbo run lint check-types build --filter=@rochas-surf-school/shared --filter=@rochas-surf-school/web` → 9
  > successful; `npx turbo run lint check-types --filter=@rochas-surf-school/backend` → 15 successful (the
  > backend's 11 lint warnings are older ones, none in `prisma/seed`). User journeys, in the built app
  > (`next start`) at 375 × 812: `/pt-br/user-journeys` → "Contas de teste" opens the page with the 12 sets,
  > "Admin" / "Instrutor" / "Aluno" and the names as stored ("Instrutor Teste Um"); from the student flow, "Ver as
  > contas de teste" in "Conta a usar" opens the same page; the theme toggle switches the cards between the dark
  > (`rgb(33, 39, 54)`) and light (`rgb(254, 252, 249)`) surfaces. Not covered by hand: the in-app browser denies
  > `clipboard-write` (`permissions.query` → `denied`), so there a tap showed the failure line under that row
  > only ("Não foi possível copiar o e-mail. Tente de novo."); a successful copy and paste is proven by the
  > Playwright test `copy an email on the test accounts page` (permission granted, reads the clipboard back). To
  > check it by hand: open the page on a phone, tap "Copiar e-mail" on any row, paste it in a note → that email;
  > files: `.specs/changes/077-test-accounts-page/spec.md`; deviations: none

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 077` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 077` — every line this spec adds or changes is covered
    (`apps/web/src/**` is excluded by technical-context).
  - `node .specs/scripts/run-e2e.mjs 077` — the web Playwright suite passes, including `e2e/user-journeys.e2e.ts`.
  - `npm run test-accounts --workspace apps/backend` — prints the `REVIEW_ACCOUNTS='…'` line and a 36-row table.
  - `grep -rnE "#[0-9a-fA-F]{3,6}\b|rgb\(" apps/web/src/modules/user-journeys` — finds nothing.
  - `grep -rn "REVIEW_ACCOUNTS" apps/web packages/shared/src` — finds nothing.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/shared --filter=@rochas-surf-school/web` —
    lint, type check and build pass.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/backend` — lint and type check pass.
- User journeys (followed in a browser):
  - At phone width, open `/pt-br/user-journeys`, tap "Contas de teste" (the pt-BR "Test accounts" row): the 12
    sets show, with Portuguese role labels and the names as in the app. Tap the copy button of one email and paste
    it somewhere: it is that email. Go back, open the student flow, tap the "See the test accounts" link in
    "Account to use": the same page opens.
  - Switch to dark theme: the cards follow it.

## Memory Impact

- `memory/product.md` — the user journey pages include a test accounts page listing the 12 test sets' emails and
  names (never codes), linked from the user journeys index and each flow page.
- `memory/technical-context.md` — `packages/shared` also exports `testAccountSets` (the test sets without codes),
  read by the backend's `npm run test-accounts` and by the web's test accounts page.
- `memory/structure.md` — `apps/web/src/app/[lang]/user-journeys/test-accounts/`,
  `apps/web/src/modules/user-journeys/{pages/test-accounts,components/copy-email-button}/` and
  `packages/shared/src/test-accounts/`.
- `memory/modules.md` — None (no business module changes).

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)
- [Spec 076](../../finished/20261029160858-076-user-journeys-pages/spec.md)

## Amendments

## Review

### Round 1 — 2026-10-29 — accepted

**Checks**

- lint ✅ · type check ✅ · build ✅ (packages/shared, apps/web; apps/backend lint + type check — its 11 lint
  warnings predate the spec, and its `oxlint` script covers `src/` and `test/` only, not `prisma/seed`)
- related tests ✅ apps/backend, apps/web, packages/shared, plus the whole suites of apps/mobile and the six
  modules that import shared
- coverage of the changed lines ✅ `COVERAGE OK` — `test-account-sets.ts` and the changed lines of
  `test-accounts.ts` 100%; `apps/web/src/**` and the barrels excluded by technical-context; no ignore comments
- e2e ✅ backend 28 files / 817 tests · web 74 Playwright tests (the `NoFallbackError` server logs come from the
  404 requests, which pass)
- `npm run test-accounts --workspace apps/backend` ✅ one `REVIEW_ACCOUNTS='[…]'` line + 36 table rows
- both greps ✅ no match (hex/`rgb(` in `modules/user-journeys`; `REVIEW_ACCOUNTS` in web and shared)

**Expected Results**

- ER-01 ✅ — `test-account-sets.test.ts` checks the 12 sets in order, role order, the D-21 emails and names
  (set 03 word for word, the generated pattern for all), 36 distinct emails passing `EmailRule`, names passing
  `PersonNameRule`, no `code`; `mirrors testAccountSets` compares the script's 36 accounts with the flattened list;
  the script prints the line and the table
- ER-02 ✅ — e2e per language (title, intro, "All flows", 12 cards × 3 rows from `testAccountSets`, no 6-digit
  number), 404 for `/de/…`, 307 to `/es/…`, `noindex` in the visibility loop; by hand at 375 × 812 in pt-br: 12
  cards, 36 emails, `noindex, nofollow`, no 6-digit number, names as stored
- ER-03 ✅ — component test (copied → reset after 2 s with fake timers, failure until the next tap, only the
  tapped button changes, name includes the email, `min-h-11`); e2e reads `teste05.aluno@…` back from the
  clipboard, one "Copied", ≥ 44 px, back after 2 s. By hand the pane denies `clipboard-write`: the tap showed the
  pt-BR failure line under that row only (button 53.6 px tall)
- ER-04 ✅ — e2e checks the index row, four flow links, each flow's "See the test accounts" inside "Account to
  use", no email/code on index and flow pages, no link on the home; by hand `/es/user-journeys/student` →
  "Ver las cuentas de prueba" opens `/es/user-journeys/test-accounts`; no file outside `user-journeys` in
  `apps/web/src` mentions `test-accounts`
- ER-05 ✅ — e2e at 375 × 812 and 1280 × 800 (no horizontal scroll, every email inside its card) and the theme
  toggle changing the card's colors; by hand: three columns at 1024 px, cards `rgb(33, 39, 54)` dark /
  `rgb(254, 252, 249)` light; the grep finds nothing

**Findings**

None.

**Notes**

- The successful copy-and-paste is proven by Playwright only (the in-app browser denies clipboard writes); a
  quick tap on a real phone before handing the page to testers would close that gap.
