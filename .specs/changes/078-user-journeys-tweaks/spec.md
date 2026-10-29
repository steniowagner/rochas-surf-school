---
id: "078"
slug: user-journeys-tweaks
title: Reorder the flow page buttons and drop the set label
template: quick
status: in-review
created: 2026-10-29
started: 2026-10-29
base_commit: f1c075cd18d1cd547bf4db989e81ac3b86371c68
fronts: [web]
depends_on: []
---

# 078 — Reorder the flow page buttons and drop the set label

## Goal

Two small changes to the user journey pages for testers: each flow page leads with "All flows" before "See the
designs", and the test accounts page's cards no longer carry a "Set NN" label (the set number is already in each
email, `testeNN.…`).

## Context

- Requirements: [requirements.md → 6.1 Public web pages](../../../.docs/requirements.md#61-public-web-pages) — the
  user journey pages and the test accounts page; neither change alters what the section requires.
- Existing code this changes:
  - `apps/web/src/modules/user-journeys/pages/user-journey-flow/user-journey-flow.page.tsx` — renders "See the
    designs" (outline, opens the design page in a new tab) and then "All flows" (subtle, to `/{lang}/user-journeys`)
    above the journey board, whose first box is "Your name".
  - `apps/web/src/modules/user-journeys/pages/test-accounts/test-accounts.page.tsx` — renders one `ContentCard` per
    test set titled `userJourneys.testAccounts.set` ("Set {set}", spec 077 D-04).
  - `apps/web/src/components/content-card/` — `ContentCard { title: string; children }`: an `h2` section label over
    the content; used across the site.
  - `apps/web/e2e/user-journeys.e2e.ts` — `flow pages follow the language` and `test accounts page lists the 12
    sets in every language`.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | `ContentCard`'s `title` becomes optional; without one, the card renders no `h2`, only its content. Every existing caller keeps passing a title. | The test account cards keep the site's one card look instead of copying its classes into the page. |
| D-02 | `userJourneys.testAccounts.set` is removed from `Dictionary` and from the en, es and pt-br dictionaries. | Nothing reads it any more; the dictionaries hold no dead strings. |

## Expected Results

### ER-01 — The flow page leads with "All flows"

- **Front:** web
- **Behavior:** Given any of the four flow pages (`auth`, `student`, `instructor`, `admin`) in pt-br, es or en, then
  the "All flows" link ("Todos os fluxos", "Todos los flujos") comes before the "See the designs" link ("Ver os
  designs", "Ver los diseños") in the row above the "Your name" box.
- **Edge and error cases:** "All flows" still links to `/{lang}/user-journeys`; "See the designs" still links to
  `/{lang}/designs/<page>` with `target="_blank"`; both keep their variants (subtle, outline).
- **Verify by:** `apps/web/src/modules/user-journeys/pages/user-journey-flow/user-journey-flow.page.test.tsx` →
  `shows the flow's intro, its account, the links and every row`; `apps/web/e2e/user-journeys.e2e.ts` → `flow pages
  follow the language` (the order in every language), run by `node .specs/scripts/run-e2e.mjs 078`.

### ER-02 — Test account cards have no set label

- **Front:** web
- **Behavior:** Given `/{lang}/user-journeys/test-accounts` in pt-br, es or en, then none of its 12 cards shows a
  "Set NN" / "Conjunto NN" label or any heading; each still lists, in set order, its admin, instructor and student
  with the translated role, the name, the email and its "Copy email" button.
- **Edge and error cases:** every other `ContentCard` on the site (e.g. a flow page's "Account to use") still shows
  its title.
- **Verify by:** `apps/web/src/modules/user-journeys/pages/test-accounts/test-accounts.page.test.tsx` → `shows one
  card per set, in order, with the role, name and email of its three accounts` and `translates the labels but never
  the names`; `apps/web/e2e/user-journeys.e2e.ts` → `test accounts page lists the 12 sets in every language` (no
  heading in any card) and `index and flow pages link to the test accounts` ("Account to use" titled), run by
  `node .specs/scripts/run-e2e.mjs 078`.

## Tasks

### Web (`apps/web`)

- [x] **T-01** — In `src/modules/user-journeys/pages/user-journey-flow/user-journey-flow.page.tsx`, render "All
  flows" before "See the designs"; in `user-journey-flow.page.test.tsx` assert that order; in
  `e2e/user-journeys.e2e.ts` → `flow pages follow the language`, assert in every language that "All flows" comes
  before "See the designs".
  Covers: ER-01 · Done when: `npx vitest run src/modules/user-journeys/pages/user-journey-flow` and
  `npx playwright test e2e/user-journeys.e2e.ts -g "follow the language"` pass in `apps/web`.
  > ✅ 2026-10-29 20:30 — the flow page renders "All flows" (subtle, `/{lang}/user-journeys`) before "See the designs"
  > (outline, `target="_blank"`), both unchanged otherwise; the page test asserts the order with
  > `compareDocumentPosition`; the e2e helper `flowCtasOf` reads the two links in page order and is asserted in
  > `flow pages follow the language` (es, pt-br) and, so en is covered on all four flows, in
  > `flow pages show every test case`. Both e2e tests failed with the old order (HEAD's page restored temporarily:
  > "2 failed", Expected/Received swapped) and pass with the new one; files:
  > `apps/web/src/modules/user-journeys/pages/user-journey-flow/user-journey-flow.page.tsx`,
  > `apps/web/src/modules/user-journeys/pages/user-journey-flow/user-journey-flow.page.test.tsx`,
  > `apps/web/e2e/user-journeys.e2e.ts`; verified: `npx vitest run src/modules/user-journeys/pages/user-journey-flow`
  > (2 passed), `npx playwright test e2e/user-journeys.e2e.ts -g "follow the language|every test case"` (2 passed),
  > `npx eslint e2e/user-journeys.e2e.ts` (clean); deviations: the order is also asserted in
  > `flow pages show every test case`, because `flow pages follow the language` only opens es and pt-br

- [x] **T-02** — Make `title` optional in `src/components/content-card/` (D-01); stop passing it in
  `src/modules/user-journeys/pages/test-accounts/test-accounts.page.tsx`; remove `testAccounts.set` from
  `src/i18n/dictionary.types.ts` and `src/i18n/dictionaries/{en,es,pt-br}.ts` (D-02); update
  `test-accounts.page.test.tsx` and `e2e/user-journeys.e2e.ts` → `test accounts page lists the 12 sets in every
  language` to assert the cards have no heading.
  Covers: ER-02 · Done when: `npx vitest run src/modules/user-journeys src/components`, `npm run check-types` and
  `npx playwright test e2e/user-journeys.e2e.ts -g "test accounts"` pass in `apps/web`.
  > ✅ 2026-10-29 20:40 — `ContentCard`'s `title` is optional and its `h2` renders only when a title is given (every
  > other caller still passes one); the test accounts page renders its 12 cards without a title; `testAccounts.set`
  > is gone from `Dictionary` and the three dictionaries (no reference left in `src/` or `e2e/`). The page test
  > asserts no card has a heading and the pt-BR card shows no "Conjunto"; the e2e test asserts each card has no
  > heading in every language, while `index and flow pages link to the test accounts` still finds the titled
  > "Account to use" card; files: `apps/web/src/components/content-card/content-card.component.tsx`,
  > `apps/web/src/components/content-card/content-card.types.ts`,
  > `apps/web/src/modules/user-journeys/pages/test-accounts/test-accounts.page.tsx`,
  > `apps/web/src/modules/user-journeys/pages/test-accounts/test-accounts.page.test.tsx`,
  > `apps/web/src/i18n/dictionary.types.ts`, `apps/web/src/i18n/dictionaries/en.ts`,
  > `apps/web/src/i18n/dictionaries/es.ts`, `apps/web/src/i18n/dictionaries/pt-br.ts`,
  > `apps/web/e2e/user-journeys.e2e.ts`; verified: `npx vitest run src/modules/user-journeys src/components`
  > (16 files, 84 passed), `npm run check-types` (exit 0), `npx playwright test e2e/user-journeys.e2e.ts -g
  > "test accounts"` (8 passed), `npx eslint` on the touched files (clean); deviations: none

### Verification

- [x] **T-03** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0.
  > ✅ 2026-10-29 20:50 — every Verification Plan command run from the repo root, all passing:
  > `node .specs/scripts/run-related-tests.mjs 078` → RELATED TESTS PASSED (apps/web, 11 changed files);
  > `node .specs/scripts/check-coverage.mjs 078` → COVERAGE OK (no changed line to measure: the 8 source files are
  > under `apps/web/src/**`, excluded by technical-context; the other 3 are tests); `node .specs/scripts/run-e2e.mjs
  > 078` → E2E PASSED (web, 74 Playwright tests); `npx turbo run lint check-types build
  > --filter=@rochas-surf-school/web` → 9 successful. User journeys, in the browser at the dev server:
  > `/pt-br/user-journeys/student` shows "Todos os fluxos" then "Ver os designs"; `/pt-br/user-journeys/test-accounts`
  > at 375 × 812 shows 12 cards with no heading, no "Conjunto" and no horizontal scroll; files:
  > `.specs/changes/078-user-journeys-tweaks/spec.md`; deviations: none

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 078` — the related tests pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 078` — every line this spec adds or changes is covered
    (`apps/web/src/**` is excluded by technical-context, so web behavior is proven by the Vitest and Playwright
    tests)
  - `node .specs/scripts/run-e2e.mjs 078` — the web Playwright suite passes, including `e2e/user-journeys.e2e.ts`
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/web` — lint, type check and build pass
- User journeys (followed in a browser):
  - Open `/pt-br/user-journeys/student`: "Todos os fluxos" comes before "Ver os designs".
  - Open `/pt-br/user-journeys/test-accounts` at phone width: the 12 cards show no "Conjunto" label.

## Memory Impact

- `memory/product.md` — the test accounts page's cards carry no "Set 01" … "Set 12" title (the set number is in
  each email); the flow pages show "All flows" before "See the designs".
- `memory/technical-context.md` — `ContentCard`'s title is optional.

## Amendments

## Review
