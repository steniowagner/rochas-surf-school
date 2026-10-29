---
id: "076"
slug: user-journeys-pages
title: User journey pages for test users
status: in-progress
created: 2026-10-29
started: 2026-10-29
base_commit: 54a34ff6b6cc95d1e0c0909d36a52dc4b68843b4
fronts: [backend, web, designs]
depends_on: []
---

# 076 — User journey pages for test users

## Goal

The school is sending the app to test users. Each of them gets a link to a page on the public site that lists, for
one app flow (auth, student, instructor or admin), what to test: each case with what to prepare, the steps, the
expected behavior and the design frames it should match. While testing, they mark each case Approved or Denied, add
notes to any case, and "Copy results" puts a plain-text summary on the clipboard to send to the school. Their
progress is kept in their own browser, so they can test over several sessions. Each tester signs in with one of 12
test sets (an admin, an instructor and a student account), created when the backend is deployed from a value a
script prints, so no sign-in code ever reaches the public repository.

## Context

- Product: [product.md](../../memory/product.md). Relevant concepts:
  - the roles and the flows each account state opens (auth, onboarding, closed accounts, student, instructor, admin);
  - Current state: only what is built is tested; Out of scope (ratings, photos and the rest) is never a test case;
  - push delivery to real phones still needs the EAS project and the APNs / FCM credentials (spec 020), which is why
    D-18 judges notifications by the Notifications screen;
  - the review accounts (spec 001) sign in with fixed codes; this spec reuses them for the test sets (D-21) and never
    shows a code on the pages (D-06).
- Requirements: [requirements.md → 6.1 Public web pages](../../../.docs/requirements.md#61-public-web-pages) — the
  public site in three languages that these pages join;
  [requirements.md → Review accounts](../../../.docs/requirements.md#review-accounts) — one pre-approved account per
  role with a fixed code, which D-21 extends to the 36 test accounts. The test cases themselves describe behavior
  already specified in sections 1 to 4 of the same document; this spec doesn't change any of it.
- Technical: [technical-context.md](../../memory/technical-context.md). Relevant sections:
  - Applications → `apps/web`: the `[lang]` routes, `generateStaticParams` with `dynamicParams = false`, the
    `SiteShell` widths, the dictionaries in `src/i18n/dictionaries/`, `src/proxy.ts` and its matcher, the designs
    module (`src/modules/designs/`, the `*-ids.ts` inventories, `design-entry`);
  - Automated validation: Vitest + React Testing Library and Playwright on web;
  - Coverage: `apps/web/src/**` and `.docs/designs/**` are excluded, so the behavior is proven by Vitest and
    Playwright tests rather than by the coverage gate;
  - the designs commands in [CLAUDE.md](../../../CLAUDE.md): `build-design.mjs <slug>` and `pack.mjs --check`.
- Existing code this builds on:
  - `apps/web/src/app/[lang]/designs/` — the index (`page.tsx`, `LinkRow` cards), the wide layout and one route per
    design page; the user journey pages follow the same shape;
  - `apps/web/src/modules/designs/components/design-entry/` — renders each design frame as an `<article
    data-design-id>` with no `id`, so a URL can't point at a frame yet;
  - `apps/web/src/modules/designs/data/{auth-flow,student-app,instructor-app,admin-app}-ids.ts` — the design ids the
    rows link to;
  - `apps/web/src/components/{screen-intro,link-row,content-card,ui/button,site-shell}` — the site's building blocks
    (all links are plain `<a>`);
  - `apps/web/e2e/designs.e2e.ts` — the pattern for redirect, language and viewport e2e tests;
  - `apps/backend/src/modules/auth/auth.config.ts` (`parseReviewAccounts`: a JSON array of `{ email, code, role,
    name }`, any number of entries, distinct emails, 6-digit codes) and `apps/backend/prisma/seed/review-accounts.seed.ts`
    (upserts each one as an approved user with an email identity, resetting its role and status on every run); a
    review address gets no email when a code is requested
    (`modules/auth/src/sign-in-code/usecase/request-sign-in-code.usecase.ts`);
  - `packages/shared` → `PersonNameRule`: two or more words of letters only, so test names spell their number.
- The content of the pages: [journeys.md](journeys.md) — each flow's description and account, its groups, and its
  rows (19 auth, 28 student, 16 instructor, 33 admin), in English, approved by the user.

## Scope

### In scope

- `/{lang}/user-journeys` (index) and `/{lang}/user-journeys/{auth,student,instructor,admin}`, in pt-br, es and en,
  statically generated.
- The proxy redirect of `/user-journeys` and `/user-journeys/<flow>` to the browser's language.
- `robots: noindex, nofollow` on every user journey page.
- The rows of [journeys.md](journeys.md), in English and translated into pt-BR and Spanish.
- The results board on each flow page: Approved / Denied, the Notes column, the tester's name, the counter, "Copy
  results" and "Clear results", with the progress saved per flow in the browser's `localStorage`.
- An `id` on every design entry, so a row can link to its frame, and the five `.docs/designs/*.html` files
  regenerated with it.
- The 12 test sets: a script that prints the `REVIEW_ACCOUNTS` value for the 36 accounts (with random codes) and a
  hand-out table, and a comment in `apps/backend/.env.example` pointing at it.

### Out of scope

- Deploying the site or distributing the app to testers (TestFlight, Play internal testing): decided by the first
  spec that deploys (technical-context → Deployment).
- Storing results anywhere but the tester's own browser: no backend, no cookies, no `sessionStorage`, no sharing
  between browsers or testers.
- Committing sign-in codes to the repository, setting `REVIEW_ACCOUNTS` on a server, and handing the sets out to
  testers (the school does it with the script's output); showing any account's code on the pages.
- Removing the test accounts before launch (a later spec or a deploy step).
- Test cases for features that aren't built (Apple sign-in, ratings, instructor comments, photos, everything in
  product.md → Out of scope) or that take longer than a test session (the 30-day erasures).
- Any change to the mobile app or the backend.
- Linking the pages from the site's home or the designs index.
- A print layout, exporting to a file, or sending the results from the page.
- A user journey page for the design system (it isn't an app flow).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The pages live at `/{lang}/user-journeys` and `/{lang}/user-journeys/<flow>` with `lang` one of `pt-br`, `es`, `en`, and `src/proxy.ts` redirects `/user-journeys` and `/user-journeys/:path*` like the other unprefixed paths. | Every page of the site is under its language; the header's language picker switches by that prefix. |
| D-02 | Four flows: `auth` (everything before a role's home: sign-in, email and code, pending, onboarding, rules update, closed accounts), `student`, `instructor`, `admin`. Each role page repeats the shared features (people, profile, notifications) for that role. | Mirrors the four design pages; each tester gets one page with everything their account sees. |
| D-03 | Rows cover only behavior that is built and testable within one session. A row involving two roles belongs to the page of the person who acts; its expected behavior says what the other side sees. | Testers must not fail what doesn't exist; one owner per behavior avoids duplicates. |
| D-04 | Each row shows ID, Title, Before you start, Steps, Expected behavior, Design, Result and Notes. Result is two checkboxes, "Approved" and "Denied", that exclude each other: checking one clears the other, and clicking the checked one clears it. | What the user asked for, plus the preconditions and design links a tester needs. |
| D-05 | Rows link to the exact design frames: `DesignEntry` gets `id={id}`, and the five `.docs/designs/*.html` files are regenerated with `build-design.mjs`. | A tester compares one screen at a time; a section link would make them hunt for the frame. |
| D-06 | The pages never show a sign-in code. The index's "Before you start" tells testers to install the build the school sent and to use the test set the school sent them (D-21): one account per role, signed in with "Continue with email" → "I have an account" and the code the school gave them — no email arrives. The sign-up rows of the auth flow (AU-02, AU-04, AU-09…) need an email address or Google account of their own. | The pages are reachable by anyone with the link; codes travel only from the school to each tester. |
| D-07 | The pages aren't linked from the home page or the designs index, and their metadata sets `robots: { index: false, follow: false }`. | They are for invited testers, reached by the link the school sends. |
| D-08 | The index shows a title, an intro (what the test round is, how to use a flow page, that progress is kept in this browser only and must be sent with "Copy results"), the "Before you start" block (D-06) and one `LinkRow` per flow with its description and its number of test cases. | The index is where every tester starts. |
| D-09 | A flow page shows the flow's intro (eyebrow "User journeys", the flow's title and description), the account to use, a "See the designs" button, an "All flows" link to the index, the tester's name field, the counter, "Copy results" and "Clear results", then the rows grouped under the group headings of [journeys.md](journeys.md). Row ids are sequential per flow (`AU-NN`, `ST-NN`, `IN-NN`, `AD-NN`) and don't restart per group. | Groups mirror the design sections, so a tester can cross-check; stable ids make the copied results unambiguous. |
| D-10 | A "Your name" field sits at the top of each flow page, and every row has a "Notes" text field, shown whatever its result; changing the result keeps the note. Both go into the copied summary. | A bare "ST-07 denied" doesn't tell the school what broke or who sent it, and a tester may have a remark on an approved case too. |
| D-11 | [journeys.md](journeys.md) is the English content. pt-BR and Spanish are translations of it with the same ids, groups, order and design ids. A quoted app label uses that language's string from `@rochas-surf-school/app-messages`, and a notification title the one from `apps/backend/src/modules/notifications/push-messages.ts`; where journeys.md's English differs from `en-US.ts`, the app's string wins. | The testers read the labels they will see in the app. |
| D-12 | The four flow pages are one dynamic route, `src/app/[lang]/user-journeys/[flow]/page.tsx`, with `generateStaticParams` (3 languages × 4 flows) and `dynamicParams = false`, so an unknown flow answers 404. | Unlike the design pages, the four pages are the same page with different data. |
| D-13 | The flows' structure (slug, design page, groups, row ids and design ids) is locale-free, in `src/modules/user-journeys/data/user-journey-flows.ts`. The row and flow texts live in `src/modules/user-journeys/i18n/{en,pt-br,es}.ts`, typed so every row of the structure must have a title, before-you-start, steps and expected text. The page's own labels go into the site dictionaries under `userJourneys`. | About 100 rows × 4 texts × 3 languages would swamp the site dictionaries; a typed per-locale file makes a missing translation a type error. |
| D-14 | A design link's page comes from the id's prefix (`AF` → `auth-flow`, `ST` → `student-app`, `IN` → `instructor-app`, `AD` → `admin-app`), its URL is `/{lang}/designs/<page>#<id>` in the page's language, and it opens in a new tab (`target="_blank"`, `rel="noopener"`), like "See the designs". A row without a design shows "—". | An auth row may link a student frame (AU-17 → ST-05-07); a new tab keeps the tester's unsaved results. |
| D-15 | "Copy results" writes this text, in the page's language, with the browser's local date (`YYYY-MM-DD`) and "—" for an empty name: line 1 `<site name> — <"User journeys">: <flow title>`, line 2 `<"Tester">: <name>`, line 3 `<"Date">: <date>`, line 4 the counter, an empty line, then one line per row in order: `<id> — <title>: <"Approved" \| "Denied" \| "Not tested">`, followed by ` — <note>` for any row with a note (trimmed; a blank note counts as none). The button then reads "Copied" for 2 seconds; when the clipboard refuses, a message says the results couldn't be copied. | One fixed format the school can read and compare; the flow and tester lines say whose results they are. |
| D-16 | Each flow page saves its name, results and notes to `localStorage` under `rochas-surf-school:user-journeys:<flow>`, as JSON `{ "version": 1, "name": string, "results": { [rowId]: "approved" \| "denied" }, "notes": { [rowId]: string } }`, on every change, and restores them after it mounts. The key has no language, so `/en/…`, `/es/…` and `/pt-br/…` of a flow share the progress. A value that is missing, unparsable, of another version or with unknown row ids is ignored (unknown ids are dropped); when storage throws (blocked or full), the page keeps working in memory and shows nothing. Nothing else is stored: no cookies, no `sessionStorage`, no server. | The user wants testers to keep their progress across sessions; per-flow keys keep flows independent, and a broken value must never break the page. |
| D-17 | ~~While a name, a result or a note is set, the flow page asks for confirmation before it unloads (a `beforeunload` handler that calls `preventDefault`); with nothing set, it doesn't.~~ (removed: progress is saved in the browser since D-16 changed, so leaving loses nothing) | ~~Results that aren't saved shouldn't vanish on a stray reload or link.~~ |
| D-18 | Rows that involve a notification are judged by the Notifications screen (the bell). Each role flow's description says that a missing push alone isn't a failure. | Push delivery to real phones isn't set up yet (spec 020); the notification is always stored. |
| D-19 | Flow pages use the wide `SiteShell`. From 1024 px the rows are a `<table>` with column headers; below 768 px each row is a card whose fields carry their column label, with no horizontal page scroll; colors, type and radii come from the design tokens. | Testers read the page on their phone while testing; tokens keep light and dark working. |
| D-20 | Page labels (en): "User journeys", "Before you start", "Steps", "Expected behavior", "Design", "Result", "Approved", "Denied", "Not tested", "Notes", "Your name", "Copy results", "Copied", "Couldn't copy the results. Try again.", "Clear results", the confirmation "Clear every result and note of this flow?", "Your progress is saved in this browser.", "See the designs", "All flows", "Tester", "Date", the counter "{approved} approved · {denied} denied · {notTested} not tested", the case count "{count} test cases" ("1 test case"). Flow titles: "Auth", "Student app", "Instructor app", "Admin app". pt-BR and es are translations. | Fixed strings the tests and the reviewer can match. |
| D-21 | 12 test sets, `NN` from `01` to `12`, each of three accounts seeded approved through `REVIEW_ACCOUNTS`: `testeNN.admin@rochas-surf-school.test` (role `admin`, name "Admin Teste <n>"), `testeNN.instrutor@rochas-surf-school.test` (`instructor`, "Instrutor Teste <n>") and `testeNN.aluno@rochas-surf-school.test` (`student`, "Aluno Teste <n>"), where `<n>` is the number spelled in Portuguese: Um, Dois, Três, Quatro, Cinco, Seis, Sete, Oito, Nove, Dez, Onze, Doze. This departs from [Review accounts](../../../.docs/requirements.md#review-accounts) ("one pre-approved review account for each role"): the mechanism is the same, with more entries. | Every tester gets one account per role; `.test` is a reserved domain that never delivers mail, and a fixed code sends none; names spell the number because `PersonNameRule` allows letters only. |
| D-22 | The codes are never committed. `apps/backend/prisma/seed/test-accounts.ts` builds the 36 accounts of D-21 with distinct random 6-digit codes (`node:crypto` `randomInt`, zero-padded) and formats two outputs: the line `REVIEW_ACCOUNTS='<JSON array>'` and a Markdown hand-out table `\| Set \| Role \| Email \| Code \|` in set order (admin, instructor, student). `apps/backend/prisma/seed/print-test-accounts.ts` prints both, and `npm run test-accounts --workspace apps/backend` runs it with `tsx`. `apps/backend/.env.example` keeps `REVIEW_ACCOUNTS=""`, with a comment that the test sets' value comes from that command. | The repository is public: committed codes would give anyone the 12 admin accounts on any server deployed with them. CI copies `.env.example` too. |
| D-23 | "Clear results" asks with `window.confirm` ("Clear every result and note of this flow?"); confirming resets the flow's name, results and notes and removes its `localStorage` key; cancelling changes nothing. | Saved progress needs a way to start over. |

## Expected Results

### ER-01 — The index lists the four flows

- **Front:** web
- **Behavior:** Given `/{lang}/user-journeys` for each of `pt-br`, `es` and `en`, then the page shows the title
  "User journeys" (in that language), the intro of D-08, the "Before you start" block of D-06, and four cards in the
  order auth, student, instructor, admin, each with its title, its description and "19 test cases", "28 test
  cases", "16 test cases" and "33 test cases", linking to `/{lang}/user-journeys/<flow>`.
- **Edge and error cases:** `/de/user-journeys` answers 404; no user journey page shows an email address or a
  sign-in code (the review accounts, configured in the backend's `REVIEW_ACCOUNTS`, are never read by the web).
- **Verify by:** `apps/web/e2e/user-journeys.e2e.ts` → `index lists the four flows in every language`, run by
  `node .specs/scripts/run-e2e.mjs 076`; `grep -rn "REVIEW_ACCOUNTS" apps/web` finds nothing; the reviewer reads the
  `userJourneys` texts of the three dictionaries and finds no email address or code.

### ER-02 — Addresses without a language redirect

- **Front:** web
- **Behavior:** Given a browser whose first language is Spanish, when it requests `/user-journeys` or
  `/user-journeys/admin`, then the site answers 307 with `Location` `/es/user-journeys` or `/es/user-journeys/admin`.
- **Edge and error cases:** with `Accept-Language: de` the redirect goes to `/pt-br/…`; the existing redirects
  (`/`, `/designs/…`, the legal pages) are unchanged.
- **Verify by:** `apps/web/e2e/user-journeys.e2e.ts` → `redirects /user-journeys to the browser language`; the
  existing `redirect.e2e.ts` and `designs.e2e.ts` still pass (`run-e2e.mjs 076`).

### ER-03 — The pages are hidden from search and from the site's navigation

- **Front:** web
- **Behavior:** Given the index or any flow page in any language, then its `<head>` has
  `<meta name="robots" content="noindex, nofollow">`. Given `/{lang}` and `/{lang}/designs`, then neither has a
  link to `/{lang}/user-journeys`.
- **Edge and error cases:** the home, legal and design pages have no `noindex`.
- **Verify by:** `apps/web/e2e/user-journeys.e2e.ts` → `user journey pages are noindex and not linked`.

### ER-04 — A flow page shows its flow and every test case

- **Front:** web
- **Behavior:** Given `/{lang}/user-journeys/<flow>`, then the page shows the flow's title and description, the
  account to use, "See the designs" linking to `/{lang}/designs/<design page>`, "All flows" linking to
  `/{lang}/user-journeys`, and the group headings of [journeys.md](journeys.md) with their rows in order. Each row
  shows its id, title, before-you-start, steps, expected behavior, design links and the two result checkboxes; in
  `en`, each row's title is the one in journeys.md.
- **Edge and error cases:** `/{lang}/user-journeys/unknown` and `/{lang}/user-journeys/design-system` answer 404;
  in a browser with no saved progress, every row starts with neither box checked.
- **Verify by:** `apps/web/e2e/user-journeys.e2e.ts` → `flow pages show every test case` (row count per flow 19 /
  28 / 16 / 33, the first and last row id of each flow, an unknown flow's 404);
  `apps/web/src/modules/user-journeys/data/user-journey-flows.test.ts` (ids sequential, counts, groups), run by
  `node .specs/scripts/run-related-tests.mjs 076`; the reviewer compares the `en` titles with journeys.md.

### ER-05 — Approved and Denied exclude each other

- **Front:** web
- **Behavior:** Given a flow page with no result set, when the tester checks "Approved" on a row, then that row's
  "Approved" is checked and the counter reads "1 approved · 0 denied · N-1 not tested". When they then check
  "Denied" on the same row, "Approved" is cleared and the counter reads "0 approved · 1 denied · N-1 not tested".
  When they click the checked "Denied" again, the row has no result and the counter is back to "0 approved · 0
  denied · N not tested".
- **Edge and error cases:** results on one row never change another row; each checkbox's accessible name includes
  the row id (e.g. "Approved — ST-05").
- **Verify by:** `apps/web/src/modules/user-journeys/components/journey-board/journey-board.component.test.tsx` →
  `approved and denied exclude each other`; `apps/web/e2e/user-journeys.e2e.ts` → `results and counter`.

### ER-06 — Every row has notes

- **Front:** web
- **Behavior:** Given a flow page, then every row has a "Notes" text field, whatever its result. When the tester
  types a note on an untested row and then marks it "Approved", then "Denied", then clears the result, the note
  stays as typed.
- **Edge and error cases:** a note on one row never shows on another; the field's accessible name includes the row
  id (e.g. "Notes — ST-05").
- **Verify by:** `journey-board.component.test.tsx` → `every row has notes`.

### ER-07 — Copy results copies the summary

- **Front:** web
- **Behavior:** Given the flow page `/en/user-journeys/student` with the name "Ana", ST-01 approved with the note
  "Slow to load", ST-02 denied with the note "Arrows skip a week" and the other rows untested and without notes,
  when the tester taps "Copy results", then the clipboard holds exactly the D-15 text: `Rocha's Surf School — User
  journeys: Student app`, `Tester: Ana`, `Date: <today>`, `1 approved · 1 denied · 26 not tested`, an empty line,
  `ST-01 — The schedule opens on this week: Approved — Slow to load`, `ST-02 — Switch between week and month: Denied
  — Arrows skip a week`, then ST-03 to ST-28 each ending in `: Not tested`. The button reads "Copied" for 2 seconds.
- **Edge and error cases:** an empty name gives `Tester: —`; a row without a note, or with a blank one, has no
  ` — ` suffix; an untested row with a note ends in `: Not tested — <note>`; when
  `navigator.clipboard.writeText` rejects, "Couldn't copy the results. Try again." shows and the button keeps "Copy
  results".
- **Verify by:** `apps/web/src/modules/user-journeys/utils/results-summary.test.ts` (the text for each case);
  `journey-board.component.test.tsx` → `copy results` (success and rejection, clipboard mocked);
  `apps/web/e2e/user-journeys.e2e.ts` → `copy results puts the summary on the clipboard` (Chromium with clipboard
  permissions).

### ER-08 — Progress is saved in this browser

- **Front:** web
- **Behavior:** Given `/en/user-journeys/student` with the name "Ana", ST-01 approved and a note on ST-02, when the
  page is reloaded, then the name, the result, the note and the counter are as they were, and
  `localStorage["rochas-surf-school:user-journeys:student"]` holds them in the D-16 shape. When `/es/user-journeys/student`
  is opened in the same browser, then it shows the same progress.
- **Edge and error cases:** `/en/user-journeys/admin` is unaffected (every row untested, no name); a stored value
  that isn't valid JSON, has another `version` or names unknown row ids opens the page with that value ignored (the
  unknown ids dropped) and no error; when `localStorage` throws on read and write, the page still records results
  and notes in memory and shows no error; no cookie and no `sessionStorage` entry is written.
- **Verify by:** `apps/web/src/modules/user-journeys/utils/journey-progress-storage.test.ts` (save, restore, invalid
  JSON, other version, unknown ids, throwing storage); `apps/web/e2e/user-journeys.e2e.ts` → `progress is saved in
  this browser`.

### ~~ER-09 — Leaving with results asks first~~ (removed: progress is saved in the browser since ER-08 changed, so D-17's leave confirmation was removed)

- **Front:** web
- **Behavior:** ~~Given a flow page where a name, a result or a note is set, when a `beforeunload` event fires, then
  the page calls `preventDefault` on it (the browser asks before leaving). Given nothing is set, or everything was
  cleared again, then it doesn't.~~
- **Edge and error cases:** ~~the handler is removed when the page unmounts.~~
- **Verify by:** ~~`journey-board.component.test.tsx` → `asks before leaving only with results`.~~

### ER-10 — Design links open the frame

- **Front:** web
- **Behavior:** Given a row with design ids, then each id is a link to `/{lang}/designs/<page>#<id>`, the page
  chosen by the id's prefix (D-14), opening in a new tab; following it shows a page where the element with that `id`
  exists. "See the designs" opens `/{lang}/designs/<design page>` in a new tab. A row without design ids shows "—".
- **Edge and error cases:** AU-17's `ST-05-07` points to `student-app`; every design id in
  `user-journey-flows.ts` exists in its page's `*-ids.ts`.
- **Verify by:** `apps/web/src/modules/user-journeys/utils/design-href.test.ts`; `user-journey-flows.test.ts` →
  `every design id exists`; `apps/web/src/modules/designs/components/design-entry/design-entry.component.test.tsx` →
  the entry's `id`; `apps/web/e2e/user-journeys.e2e.ts` → `design links point at their frames` (each flow's first
  design link: the target page has `#<id>`).

### ER-11 — The page follows its language

- **Front:** web
- **Behavior:** Given `/es/user-journeys/student`, then the labels of D-20, the flow's title, description and
  account, the group headings and every row's texts are the Spanish ones (`i18n/es.ts` and the `es` dictionary),
  and the copied summary is in Spanish; likewise for `pt-br`. Switching the language in the header keeps the flow.
- **Edge and error cases:** no row in `es` or `pt-br` repeats its English title (every text is translated).
- **Verify by:** `apps/web/e2e/user-journeys.e2e.ts` → `flow pages follow the language`;
  `apps/web/src/modules/user-journeys/i18n/user-journey-texts.test.ts` (every row has non-empty texts in each
  language, and the `es` and `pt-br` titles differ from the `en` ones).

### ER-12 — The page fits a phone

- **Front:** web
- **Behavior:** Given a 375 × 812 viewport, then no user journey page scrolls sideways
  (`document.documentElement.scrollWidth <= 375`) and each row of a flow page shows its fields with their labels
  ("Before you start", "Steps", "Expected behavior", "Design", "Result", "Notes"). Given a 1280-wide viewport, then a flow
  page's rows are in a table with those column headers and "Notes".
- **Edge and error cases:** the checkboxes are at least 44 × 44 px touch targets (their label included).
- **Verify by:** `apps/web/e2e/user-journeys.e2e.ts` → `fits a phone and a desktop`.

### ER-13 — The page follows the theme

- **Front:** web
- **Behavior:** Given a flow page, when the header's theme toggle is pressed, then the page's background and text
  colors switch with the rest of the site.
- **Edge and error cases:** no color, font or radius in `src/modules/user-journeys/` is a raw value
  (`grep -rnE "#[0-9a-fA-F]{3,6}\b|rgb\(" apps/web/src/modules/user-journeys` finds nothing).
- **Verify by:** `apps/web/e2e/user-journeys.e2e.ts` → `follows the theme toggle`; the grep above.

### ER-14 — The design files carry the frame anchors

- **Front:** designs
- **Behavior:** Given the five `.docs/designs/*.html` files, then every element with `data-design-id="<id>"` also
  has `id="<id>"`, and every `.html` matches its sources.
- **Edge and error cases:** besides the `id` attributes (and compiled CSS), the generated sources don't change.
- **Verify by:** `node .docs/designs/scripts/pack.mjs --check` exits 0; for each of the five sources,
  `grep -o 'data-design-id="[^"]*"' .docs/designs/src/<slug>/template.html | wc -l` equals
  `grep -oE 'id="(DS|AF|ST|IN|AD)-[0-9]{2}-[0-9]{2}"' .docs/designs/src/<slug>/template.html | wc -l`.

### ER-15 — Clear results starts the flow over

- **Front:** web
- **Behavior:** Given a flow page with a name, results and notes, when the tester taps "Clear results" and confirms
  "Clear every result and note of this flow?", then the name, every result and every note are empty, the counter
  shows every row as not tested, and the flow's `localStorage` key is gone (a reload stays empty).
- **Edge and error cases:** cancelling the confirmation changes nothing; another flow's saved progress is untouched.
- **Verify by:** `journey-board.component.test.tsx` → `clear results` (`window.confirm` mocked to true and false);
  `apps/web/e2e/user-journeys.e2e.ts` → `clear results`.

### ER-16 — The script prints the 12 test sets

- **Front:** backend
- **Behavior:** Given `npm run test-accounts --workspace apps/backend`, then it prints a `REVIEW_ACCOUNTS='…'` line
  whose value `parseReviewAccounts` accepts as 36 accounts — 12 per role, with the emails and names of D-21 and
  distinct 6-digit codes — and a Markdown table with one row per account, in set order, with its set, role, email
  and code matching the line.
- **Edge and error cases:** every name passes `PersonNameRule`; two runs give different codes and the same emails
  and names; `apps/backend/.env.example` still has `REVIEW_ACCOUNTS=""`, and no 6-digit code of a test account
  appears in the repository.
- **Verify by:** `apps/backend/prisma/seed/test-accounts.spec.ts` and `apps/backend/prisma/seed/print-test-accounts.spec.ts`,
  run by `node .specs/scripts/run-related-tests.mjs 076`; `grep -n '^REVIEW_ACCOUNTS=""$' apps/backend/.env.example`
  finds the line.

## Tasks

### Backend (`apps/backend`)

- [x] **T-12** — Add the test-set generator of D-21 / D-22: `apps/backend/prisma/seed/test-accounts.ts`
  (`buildTestAccounts(randomCode?)` returning the 36 `ReviewAccount`s with distinct codes, and
  `formatTestAccounts(accounts)` returning the `REVIEW_ACCOUNTS='…'` line and the Markdown table),
  `apps/backend/prisma/seed/print-test-accounts.ts` (prints both), the `test-accounts` script (`tsx
  prisma/seed/print-test-accounts.ts`) in `apps/backend/package.json`, and the comment above `REVIEW_ACCOUNTS=""` in
  `apps/backend/.env.example`. Tests: `test-accounts.spec.ts` (36 accounts, 12 per role, the D-21 emails and names,
  every name passes `PersonNameRule`, distinct codes even when the random source repeats, the line parses with
  `parseReviewAccounts`, the table rows match) and `print-test-accounts.spec.ts` (importing it prints the line and
  the table, `console.log` mocked). Skill: [`nodejs-backend-patterns`](../../../.claude/skills/nodejs-backend-patterns).
  Covers: ER-16 · Done when: `npx vitest run prisma/seed` passes in `apps/backend`, and `npm run test-accounts
  --workspace apps/backend` prints 36 accounts.
  > ✅ 2026-10-29 14:51 — `buildTestAccounts(randomCode?)` builds the 36 accounts of D-21 (set order admin,
  > instructor, student; a repeated random code is drawn again) and `formatTestAccounts` returns the
  > `REVIEW_ACCOUNTS='…'` line and the `| Set | Role | Email | Code |` table; `print-test-accounts.ts` prints the line,
  > an empty line and the table; `test-accounts` script added; `.env.example` keeps `REVIEW_ACCOUNTS=""` with a
  > comment naming the command. Files: `apps/backend/prisma/seed/test-accounts.ts`,
  > `apps/backend/prisma/seed/test-accounts.spec.ts`, `apps/backend/prisma/seed/print-test-accounts.ts`,
  > `apps/backend/prisma/seed/print-test-accounts.spec.ts`, `apps/backend/package.json`, `apps/backend/.env.example`;
  > verified: `npx vitest run prisma/seed` (4 files, 19 passed); `npm run test-accounts --workspace apps/backend`
  > prints the line and 36 table rows; `npx tsc --noEmit` and `npx oxlint --type-aware prisma/seed` exit 0;
  > deviations: none (the skill `nodejs-backend-patterns` was loaded; it holds only general guidance for this
  > small script).

### Web (`apps/web`)

- [x] **T-01** — Give each design frame an anchor: render `id={id}` on the `<article>` of
  `apps/web/src/modules/designs/components/design-entry/design-entry.component.tsx`, and assert it in
  `design-entry.component.test.tsx`. Skill:
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-10 · Done when: `npx vitest run src/modules/designs` passes in `apps/web`.
  > ✅ 2026-10-29 14:56 — the entry's `<article>` renders `id={id}` next to `data-design-id`; a new test (seen
  > failing first) asserts the `id`. Files: `apps/web/src/modules/designs/components/design-entry/design-entry.component.tsx`,
  > `apps/web/src/modules/designs/components/design-entry/design-entry.component.test.tsx`; verified:
  > `npx vitest run src/modules/designs` (222 files, 715 passed); deviations: none.

- [x] **T-02** — Add the locale-free structure of the four flows (D-13) in
  `apps/web/src/modules/user-journeys/data/user-journey-flows.ts`: per flow its slug, design page slug, groups
  (a key each) and rows (id and design ids), exactly as in [journeys.md](journeys.md); export the flow slugs and a
  `RowId` type. Add `apps/web/src/modules/user-journeys/utils/design-href.ts` (D-14: prefix → page, URL with the
  locale and hash). Tests: `user-journey-flows.test.ts` (ids sequential per flow, counts 19 / 28 / 16 / 33, every
  design id exists in its page's `*-ids.ts`, unique ids) and `design-href.test.ts` (each prefix, AU-17's `ST-05-07`,
  an unknown prefix throws).
  Covers: ER-04, ER-10 · Done when: `npx vitest run src/modules/user-journeys` passes in `apps/web`.
  > ✅ 2026-10-29 15:05 — `userJourneyFlows` holds the 4 flows (design page, groups with a key each, rows with their
  > design ids) generated from journeys.md (96 rows: 19 / 28 / 16 / 33), `as const` so `RowId` and each flow's group
  > keys are literal types; design ids are typed as the union of the four `*EntryId` types, so a missing frame is a
  > type error too; `flowRows(flow)` and `isUserJourneyFlowSlug` added. `design-href.ts` maps the prefix to the page
  > and builds `/{lang}/designs/<page>#<id>`, throwing on an unknown prefix. Files:
  > `apps/web/src/modules/user-journeys/data/user-journey-flows.ts`,
  > `apps/web/src/modules/user-journeys/data/user-journey-flows.test.ts`,
  > `apps/web/src/modules/user-journeys/utils/design-href.ts`,
  > `apps/web/src/modules/user-journeys/utils/design-href.test.ts`; verified: `npx vitest run src/modules/user-journeys`
  > (2 files, 14 passed), `npx tsc --noEmit` and `npx eslint src/modules/user-journeys` exit 0; deviations: none.

- [x] **T-03** — Add the page labels of D-20 (with "Notes", "Clear results" and its confirmation, and the saved-progress
  line) and the index's texts (intro and "Before you start" of D-06 / D-08: the test sets, no code) to
  the site dictionaries under `userJourneys`: `apps/web/src/i18n/dictionary.types.ts` and
  `apps/web/src/i18n/dictionaries/{en,pt-br,es}.ts`, in the three languages.
  Covers: ER-11 · Done when: `npm run check-types --workspace @rochas-surf-school/web` exits 0.
  > ✅ 2026-10-29 15:14 — `Dictionary` gains `userJourneys` (meta title and description, `title`, the D-08 `intro`
  > paragraphs, the D-06 `beforeYouStart` block — the test sets, "Continue with email" → "I have an account" with
  > each language's app string, no email and no code —, `caseCount` one / other, and the D-20 `labels`), filled in en,
  > pt-br and es. Files: `apps/web/src/i18n/dictionary.types.ts`, `apps/web/src/i18n/dictionaries/en.ts`,
  > `apps/web/src/i18n/dictionaries/pt-br.ts`, `apps/web/src/i18n/dictionaries/es.ts`; verified:
  > `npm run check-types --workspace @rochas-surf-school/web` (exit 0); deviations: three labels beyond D-20's list,
  > needed by D-04 / D-09 — `id` ("ID") and `testCase` ("Title") for the table's first two column headers, and
  > `accountToUse` ("Account to use") for the flow page's account block.

- [x] **T-04** — Write the English texts of the flows and rows in `apps/web/src/modules/user-journeys/i18n/en.ts`
  with their type in `apps/web/src/modules/user-journeys/i18n/user-journey-texts.types.ts` (per flow: title,
  description, account, group titles; per row: title, before you start, steps, expected — a `Record` over `RowId`,
  so a missing row is a type error), from [journeys.md](journeys.md) and with the app's strings by D-11. Add
  `user-journey-texts.test.ts`: every row and group has non-empty texts in `en`.
  Covers: ER-04, ER-11 · Done when: `npx vitest run src/modules/user-journeys` passes and `check-types` exits 0.
  > ✅ 2026-10-29 15:30 — `UserJourneyTexts` types each flow's title, description, account and group titles (keyed by
  > that flow's group keys) and `rows` as `Record<RowId, …>`; `en.ts` holds the 4 flows and 96 rows of journeys.md
  > (titles unchanged). By D-11, the quoted labels were checked against `en-US.ts` / `push-messages.ts` and the app's
  > string replaced journeys.md's where they differ: AU-02 "What's your name?", AU-16 / AU-19 / ST-13 "Contact the
  > school", ST-01 "N/M spots", ST-05 "Max. N students · X spots left", ST-08 "Class full", IN-06 "Up next", AD-06
  > "Create class" (no "Create class on this day" string exists), AD-22 "Take out", AD-25 "Make instructor" / "Make
  > admin". By D-18, the student, instructor and admin descriptions end with a sentence saying a missing push alone
  > isn't a failure. Files: `apps/web/src/modules/user-journeys/i18n/user-journey-texts.types.ts`,
  > `apps/web/src/modules/user-journeys/i18n/en.ts`, `apps/web/src/modules/user-journeys/i18n/user-journey-texts.test.ts`;
  > verified: `npx vitest run src/modules/user-journeys` (3 files, 18 passed), `npx tsc --noEmit` exit 0; deviations:
  > none.

- [x] **T-05** — Translate them into Brazilian Portuguese in `apps/web/src/modules/user-journeys/i18n/pt-br.ts`,
  using the `pt-BR` app and notification strings (D-11), and extend `user-journey-texts.test.ts` to `pt-br`
  (non-empty, titles differ from `en`).
  Covers: ER-11 · Done when: `npx vitest run src/modules/user-journeys` passes and `check-types` exits 0.
  > ✅ 2026-10-29 15:52 — `pt-br.ts` translates the 4 flows (titles "Acesso", "App do aluno", "App do instrutor",
  > "App do admin"), their groups and the 96 rows; each quoted label was mapped by its key path from `en-US.ts` to
  > `pt-BR.ts` (e.g. "Pedir para entrar", "Anular pedido", "Terminar sessão" on the pending screen and "Sair" on
  > "Profile", "Promover a instrutor", "Retirar") and each notification title taken from `push-messages.ts`
  > ("Inscrição recusada", "Você foi retirado de uma aula", "Seu papel mudou"…); the Notifications screen is "Avisos".
  > `user-journey-texts.test.ts` now runs on `en` and `pt-br` and checks that no `pt-br` flow or row title repeats
  > the English one. Also fixed in `en.ts` a label T-04 missed: AD-28's "Talk to the school" → "Contact the school".
  > Files: `apps/web/src/modules/user-journeys/i18n/pt-br.ts`,
  > `apps/web/src/modules/user-journeys/i18n/user-journey-texts.test.ts`, `apps/web/src/modules/user-journeys/i18n/en.ts`;
  > verified: `npx vitest run src/modules/user-journeys` (3 files, 21 passed), `npx tsc --noEmit` exit 0; deviations:
  > none.

- [x] **T-06** — Translate them into Spanish in `apps/web/src/modules/user-journeys/i18n/es.ts`, using the `es-ES`
  app and notification strings, and extend `user-journey-texts.test.ts` to `es`.
  Covers: ER-11 · Done when: `npx vitest run src/modules/user-journeys` passes and `check-types` exits 0.
  > ✅ 2026-10-29 16:10 — `es.ts` translates the 4 flows (titles "Acceso", "App del alumno", "App del instructor",
  > "App del admin"), their groups and the 96 rows; quoted labels mapped by key path from `en-US.ts` to `es-ES.ts`
  > (e.g. "Pedir plaza", "Anular solicitud", "Cómo llegar", "Eliminar la cuenta", "Normas de la escuela" on the
  > rules-update screen and "Reglas de la escuela" on "Perfil", "Ascender a instructor") and notification titles
  > from `push-messages.ts` ("Inscripción rechazada", "Acceso quitado", "Te retiraron de una clase", "Tu rol
  > cambió"…); the Notifications screen is "Avisos". `user-journey-texts.test.ts` now covers `es` too (non-empty texts,
  > no title repeating the English one). Files: `apps/web/src/modules/user-journeys/i18n/es.ts`,
  > `apps/web/src/modules/user-journeys/i18n/user-journey-texts.test.ts`; verified: `npx vitest run
  > src/modules/user-journeys` (3 files, 24 passed), `npx tsc --noEmit` exit 0; deviations: none.

- [ ] **T-07** — Build the results board, a client component following `.claude/rules/react.md`, in
  `apps/web/src/modules/user-journeys/components/`: `journey-board` (state for name, results and notes, restored
  after mount and saved on every change, D-16; "Clear results", D-23), `journey-row` (the row as a table row from
  1024 px and a labelled card below 768 px, D-19; exclusive checkboxes, D-04; the Notes field, D-10; design links,
  D-14) and `results-summary` (name field, counter, "Copy results" with "Copied" and the failure message, D-15, and
  "Clear results"). Put the summary text in `apps/web/src/modules/user-journeys/utils/results-summary.ts` and the
  storage in `apps/web/src/modules/user-journeys/utils/journey-progress-storage.ts` (read, validate, write, remove;
  every storage call in `try` / `catch`). Tests: `journey-board.component.test.tsx` (`approved and denied exclude
  each other`, `every row has notes`, `copy results`, `clear results`, restoring saved progress),
  `results-summary.test.ts` and `journey-progress-storage.test.ts`. Skill:
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-05, ER-06, ER-07, ER-08, ER-12, ER-15 · Done when: `npx vitest run src/modules/user-journeys` passes in
  `apps/web`.

- [ ] **T-08** — Add the index: `apps/web/src/app/[lang]/user-journeys/layout.tsx` (wide `SiteShell`, `robots`
  noindex / nofollow, D-07), `apps/web/src/app/[lang]/user-journeys/page.tsx` (`generateMetadata`,
  `generateStaticParams` through the `[lang]` layout) rendering `apps/web/src/modules/user-journeys/pages/user-journeys-index/`
  (D-08), and `/user-journeys` and `/user-journeys/:path*` in the matcher of `apps/web/src/proxy.ts`. Write
  `apps/web/e2e/user-journeys.e2e.ts` with `index lists the four flows in every language`, `redirects /user-journeys to
  the browser language` and `user journey pages are noindex and not linked`. Skill:
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-01, ER-02, ER-03 · Done when: `npm run test:e2e --workspace apps/web -- user-journeys` passes.

- [ ] **T-09** — Add the flow pages: `apps/web/src/app/[lang]/user-journeys/[flow]/page.tsx` (D-12: the 12 static
  params, `dynamicParams = false`, `generateMetadata` with the flow title) rendering
  `apps/web/src/modules/user-journeys/pages/user-journey-flow/` (D-09), which picks the locale's texts from
  `i18n/{en,pt-br,es}.ts` and renders the intro, the account, "See the designs", "All flows" and the
  `journey-board`. Add to `apps/web/e2e/user-journeys.e2e.ts`: `flow pages show every test case`, `results and
  counter`, `copy results puts the summary on the clipboard`, `progress is saved in this browser`, `clear results`,
  `design links point at their frames`, `flow pages follow the language`, `fits a phone and a desktop` and `follows
  the theme toggle`. Skill: [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-04, ER-05, ER-07, ER-08, ER-10, ER-11, ER-12, ER-13, ER-15 · Done when:
  `npm run test:e2e --workspace apps/web -- user-journeys` passes and
  `npx turbo run lint check-types build --filter=@rochas-surf-school/web` succeeds.

### Designs (`.docs/designs`)

- [ ] **T-10** — Regenerate the five design files with the frame anchors: build the web and serve it with
  `next start -p 3100`, run `node .docs/designs/scripts/build-design.mjs <slug>` for `design-system`, `auth-flow`,
  `student-app`, `instructor-app` and `admin-app`, then `node .docs/designs/scripts/pack.mjs`.
  Covers: ER-14 · Done when: `pack.mjs --check` exits 0, the `data-design-id` and `id` counts of ER-14 match in the
  five templates, and `git diff --word-diff` of the templates shows only added `id="…"` attributes besides any
  compiled CSS.

### Verification

- [ ] **T-11** — Run every command in the Verification Plan from the repo root; all pass. Record the output summary
  as evidence. Covers: all · Done when: every command exits 0, `check-coverage.mjs` prints `COVERAGE OK` and
  `run-e2e.mjs` prints `E2E PASSED`.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 076`: the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 076`: every line this spec adds or changes is covered
    (`apps/web/src/**` and `.docs/designs/**` are excluded by technical-context).
  - `node .specs/scripts/run-e2e.mjs 076`: the web Playwright suite passes, including `e2e/user-journeys.e2e.ts` and
    the existing redirect, pages and designs tests.
  - `node .docs/designs/scripts/pack.mjs --check`: every `.html` matches its sources.
  - The ER-14 counts: for each slug of `design-system auth-flow student-app instructor-app admin-app`,
    `grep -o 'data-design-id="[^"]*"' .docs/designs/src/<slug>/template.html | wc -l` equals
    `grep -oE 'id="(DS|AF|ST|IN|AD)-[0-9]{2}-[0-9]{2}"' .docs/designs/src/<slug>/template.html | wc -l`.
  - `grep -rnE "#[0-9a-fA-F]{3,6}\b|rgb\(" apps/web/src/modules/user-journeys`: finds nothing.
  - `grep -rn "REVIEW_ACCOUNTS" apps/web`: finds nothing.
  - `grep -n '^REVIEW_ACCOUNTS=""$' apps/backend/.env.example`: finds the line (no code committed).
  - `npm run test-accounts --workspace apps/backend`: prints the `REVIEW_ACCOUNTS='…'` line and a 36-row table.
  - `npm test --workspace @rochas-surf-school/web` and
    `npx turbo run lint check-types build --filter=@rochas-surf-school/web`: the web tests, lint, type check and
    build pass.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/backend`: the backend's lint and type check pass.
- User journeys (followed in a browser):
  - Open `/pt-br/user-journeys` at phone width: the intro, "Before you start" (the test sets, no code) and the four
    cards. Open the student page, type a name, approve one row with a note, deny another with a note, tap "Copy
    results" and paste the text somewhere: it matches D-15 in Portuguese. Reload: everything is still there. Open
    `/en/user-journeys/student`: the same progress. Tap "Clear results" and confirm: everything is reset.
  - Follow a design link: the design page opens in a new tab at that frame.
  - Read a sample of rows in `es` and `pt-br` against [journeys.md](journeys.md): same meaning, the app's labels.

## Memory Impact

- `memory/product.md`: the public site also has user journey pages (`/{lang}/user-journeys` and one page per flow)
  for test users: the test cases of each flow, marked Approved / Denied with notes, saved only in the tester's
  browser, copied as text, not linked from the site and not indexed. The 12 test sets (an admin, an instructor and a
  student each, `testeNN.*@rochas-surf-school.test`) are review accounts created at deploy time; Review accounts in
  the requirements now allow more than one per role.
- `memory/technical-context.md`: Applications → `apps/web` gains `src/modules/user-journeys/` (the locale-free flow
  structure, the per-locale texts, the results board and its `localStorage` key per flow) and the `user-journeys`
  routes; the proxy matcher includes `/user-journeys`; design entries carry an `id` anchor
  (`/{lang}/designs/<page>#<id>`). `apps/backend`: `npm run test-accounts` prints the test sets' `REVIEW_ACCOUNTS`
  value with fresh codes; the codes live only in the server's environment.
- `memory/structure.md`: `apps/web/src/app/[lang]/user-journeys/` (index and `[flow]`) and
  `apps/web/src/modules/user-journeys/`.
- `memory/modules.md`: None (no business module changes).

## Assumptions

- The test build testers receive points at a backend where the school can approve accounts and change roles; the
  pages don't depend on it, but rows that need an admin's action do.
- The test cases describe the app as it is at this spec's base commit; a later spec that changes a tested behavior
  updates the matching rows.
- Whoever deploys the test server runs `npm run test-accounts`, sets the printed `REVIEW_ACCOUNTS` in the server's
  environment, runs the seed, and sends each tester their set's emails and codes privately. The seed restores each
  test account's role and approval on every run, undoing role changes and deletions testers made.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)
- [Test cases](journeys.md)

## Amendments

- 2026-10-29 — /spec-plan --amend — fronts: `web, designs` → `backend, web, designs`. Reason: the test sets are
  generated in the backend. Approved by the user.
- 2026-10-29 — /spec-plan --amend — Goal, Context (Requirements line gains Review accounts) and Scope: progress saved
  in the browser, the Notes column, "Clear results" and the test-set script are in scope; Out of scope "no
  `localStorage`" → only the tester's browser stores progress, plus "committing sign-in codes" and "removing the test
  accounts before launch". Reason: the user's amendment. Approved by the user.
- 2026-10-29 — /spec-plan --amend — D-04 changed: the row's columns → the same plus "Notes". Reason: notes on every
  row. Approved by the user.
- 2026-10-29 — /spec-plan --amend — D-06 changed: testers create their own account and ask for a role → testers use
  the test set the school sent them (D-21), with no code on the pages; sign-up rows need an address of their own.
  Reason: the 12 test sets. Approved by the user.
- 2026-10-29 — /spec-plan --amend — D-08 changed: the intro says results aren't saved → progress is kept in this
  browser only. D-09 changed: the flow page also has "Clear results". Reason: saved progress. Approved by the user.
- 2026-10-29 — /spec-plan --amend — D-10 changed: a "What went wrong?" field on denied rows → a "Notes" field on
  every row, kept when the result changes. D-15 changed: ` — <note>` on denied rows → on any row with a note.
  ER-06 changed: "A denied row asks what went wrong" → "Every row has notes". ER-07 changed: the example includes a
  note on an approved row. Reason: the user asked for a notes column on every row. Approved by the user.
- 2026-10-29 — /spec-plan --amend — D-16 changed: React state only, nothing stored, the note cleared when leaving
  Denied → saved per flow in `localStorage` (`rochas-surf-school:user-journeys:<flow>`, versioned) and restored, shared
  across languages, storage failures ignored. ER-08 changed: "Nothing is saved" → "Progress is saved in this
  browser". Reason: the user wants testers to keep their progress. Approved by the user.
- 2026-10-29 — /spec-plan --amend — D-17 removed (the leave confirmation) and ER-09 removed. Reason: with progress
  saved, leaving the page loses nothing. Approved by the user.
- 2026-10-29 — /spec-plan --amend — D-20 changed: "What went wrong?" → "Notes", plus "Clear results", its
  confirmation and the saved-progress line. Reason: the new controls. Approved by the user.
- 2026-10-29 — /spec-plan --amend — D-21, D-22 and D-23 added (the 12 test sets; codes generated by a script, never
  committed, `.env.example` keeps `REVIEW_ACCOUNTS=""`; "Clear results"). ER-15 and ER-16 added. Reason: the user
  asked for 36 test accounts in `REVIEW_ACCOUNTS`; the repository is public, so the user chose a script over
  committing the codes to `.env.example`. Approved by the user.
- 2026-10-29 — /spec-plan --amend — T-12 added (Covers: ER-16) in a new Backend group; T-03, T-07 and T-09 changed
  (the new labels and index texts; saving, notes and "Clear results" instead of the leave confirmation; the e2e test
  names). Verification Plan, Memory Impact and Assumptions updated. Reason: the changes above. Approved by the user.
- 2026-10-29 — /spec-plan --amend — [journeys.md](journeys.md) changed: each role flow's account → that role's
  account in the tester's test set; AD-26 "The school always keeps an admin" → "Mark yourself as also an
  instructor" (it can't happen with 12 admins). Reason: the test sets. Approved by the user.

## Review
