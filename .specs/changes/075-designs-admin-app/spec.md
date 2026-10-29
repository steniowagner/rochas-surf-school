---
id: "075"
slug: designs-admin-app
title: Admin app designs page
status: in-progress
started: 2026-10-29
base_commit: 0a47dbb52cb9d9a40eec0781a1c1e4b2a9151e77
created: 2026-10-29
fronts: [web, designs]
depends_on: []
---

# 075 — Admin app designs page

## Goal

People interested in the app can open `/{lang}/designs/admin-app` on the public site and see every screen an admin
sees: the home with its tools, the classes tab with its flags and the "+" button, a class with its tools and their
sheets, the forms that create and edit classes and locations, the notices, the enrolment and account requests,
enrolling a student, the people tab with role changes, the school's settings and rules, and the teaching, profile and
notifications screens. Each screen appears in every state the app draws, in the theme and language picked in the site
header. `admin-app.html` in `.docs/designs` is then generated from that page, in pt-BR with light and dark side by
side. It replaces the outdated European Portuguese prototype and its ratings. This is the last page of the designs
area that specs 071 to 074 started.

## Context

- Product: [product.md](../../memory/product.md). Relevant concepts:
  - the admin role, which runs classes, people, rules and requests, and the admin who also teaches (spec 070);
  - classes and their states, locations, trial guests, the waiting list, enrolment requests, registrations,
    reactivations, removed accounts, notices, the cancellation rules, the school rules and the school settings;
  - the public site's designs area (specs 071 to 074).
  - Out of scope → ratings and photos, which the designs drop.
- Requirements: [requirements.md → 6.1 Public web pages](../../../.docs/requirements.md#61-public-web-pages) is the
  designs area this spec adds a page to. The admin screens the page shows, as built, are in:
  - [1.2 Account lifecycle](../../../.docs/requirements.md#12-account-lifecycle)
  - [1.3 User profiles](../../../.docs/requirements.md#13-user-profiles)
  - [1.4 User roles](../../../.docs/requirements.md#14-user-roles)
  - [1.5 School rules](../../../.docs/requirements.md#15-school-rules)
  - [2.1 Notifications](../../../.docs/requirements.md#21-notifications)
  - [3.1 Class scheduling](../../../.docs/requirements.md#31-class-scheduling)
  - [3.2 Class locations](../../../.docs/requirements.md#32-class-locations)
  - [4.1 Class enrolment](../../../.docs/requirements.md#41-class-enrolment)
  - [4.2 Cancellation rules](../../../.docs/requirements.md#42-cancellation-rules)

  [user-journeys.md → header](../../../.docs/user-journeys.md#surf--skate-school-scheduling-platform---user-journeys):
  its "Designs" line describes how each `.html` is produced, and D-06 changes that for `admin-app.html`.
- Technical: [technical-context.md](../../memory/technical-context.md). Relevant sections:
  - Applications → `apps/web`: the `/designs` routes, `src/modules/designs/` and the dictionaries;
  - Automated validation: Vitest and Playwright on web;
  - Coverage: `apps/web/src/**` and `.docs/designs/**` are excluded.
- The decisions of the earlier design specs still apply:
  - **071** (`.specs/finished/20261028214702-071-designs-foundation-design-system/`): iOS frames, the app's copy
    through `appT` / `appRich`, unbuilt features left out, the fidelity rule (D-08), the app's glyphs, Fortaleza mock
    data, and the typed list of design pages.
  - **072** (`.specs/finished/20261028223253-072-designs-auth-flow/`): the web page is the source of its `.html`
    through `build-design.mjs`, given the page's slug (D-01, A-01); one frame per visual state, with the other messages
    in the note (D-02); mock texts typed by the school in the page's language (D-04).
  - **073** (`.specs/finished/20261028234010-073-designs-student-app/`): tall frames (D-02), and the backend's
    notification texts in the dictionaries (D-05).
  - **074** (`.specs/finished/20261029113016-074-designs-instructor-app/`): screens identical to another role's are
    drawn once, with notes pointing at that page's frames (D-02); shared mocks in `screens/shared/` with a `role` prop
    (D-03); the role's own mocks in `screens/<role>/`, and its sections in `components/<role>-app-*` (D-06).
- The web code this spec extends is in `apps/web/src/modules/designs/`:
  - the shared mocks `screens/shared/{classes-week,class-details,class-history,people,profile,edit-profile,profile-whatsapp,school-rules-read,notifications}-screen`
    and their `role` prop (`student` and `instructor` today);
  - the instructor mocks `screens/instructor/{home,teaching-classes,weekly-occupancy}-screen`;
  - the building blocks, among them `class-card`, `class-people`, `class-full-banner`, `person-sheet`,
    `decision-card`, `deny-sheet`, `segmented-control`, `step-tabs`, `week-month-calendar`, `discipline-filter`,
    `class-location-card` (its tinted map preview), `text-area`, `switch`, `checkbox`, `phone-number-field`, `toast`
    and the entry rows;
  - the data in `data/fortaleza.ts`, `data/instructor-app.ts` and `data/design-pages.ts`, and the notes in `i18n/`.
- The app code the page reproduces, as it renders for an approved admin:
  - the routes in `apps/mobile/src/app/(private)/admin/`;
  - `apps/mobile/src/modules/admin/`: the home (`admin.screen.tsx`, `admin-tool-row`), registrations and
    reactivations;
  - `modules/classes/`: `classes-week` with `header="title"`, `canCreate` and `showFlags`; `class-details` with
    `canEdit` and its hook's `showTools`, `deleteState`, `showNoInstructor`, `showNoDeadline` and `canTakeOut`;
    `class-tools-sheet`, `cancel-class-sheet`, `delete-class-sheet`, `new-class`, `edit-class`, `location-form` and
    their form components; `teaching-classes`, `teaching-class-history` and `weekly-occupancy` with `role="admin"`;
  - `modules/enrolment/`: `class-requests`, `enrol-student` and `take-out-sheet`;
  - `modules/people/`: the people tab with `canChangeRole` and `canSetInstructorFlag`, `person-role-actions`,
    `role-change-confirmation`, `remove-confirmation` and `removed-accounts`;
  - `modules/notices/`: `send-notice`, with and without a class;
  - `modules/school-settings/`, `modules/cancellation-rules/` and `modules/school-rules/` (`manage-school-rules` and its
    sheets);
  - the shared profile and notifications screens.
- Notification texts: `apps/backend/src/modules/notifications/push-messages.ts`.
- Current `admin-app.html`: its sources are in `.docs/designs/src/admin-app/` (`App Admin.dc.html`, `template.html`,
  `shell.html`, `bundle.json`). It is an x-dc prototype in European Portuguese with ratings ("Avaliações"). It has no
  loading, empty, error or toast states.
- What the page shows: [admin-app-inventory.md](admin-app-inventory.md), 112 frames in eleven sections, 21 of them
  tall.

## Scope

### In scope

- The `/{lang}/designs/admin-app` page with every frame of the inventory, its id and a note, following the header's
  theme and language, and its card on the designs index.
- The web building blocks and screen mocks it needs, and an `admin` role on the shared mocks.
- `admin-app.html` generated from that page (pt-BR, light and dark side by side) by `build-design.mjs`, with the old
  prototype's sources removed.

### Out of scope

- Ratings, photos and anything else the app doesn't have.
- Repeating on this page the states of screens an admin sees exactly as a student or an instructor does (D-02).
- A real map: the location form's map is drawn with tokens (D-07).
- Frames with the keyboard open, Android frames, and clickable prototypes.
- Changing any mobile or backend code or copy, and changing what the other design pages show.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The page shows only what an admin sees. That means the admin tab bar, the home with its two sections, the "Aulas" tab with the title, the "+" button and the flags, the class details with `canEdit` (tools, take-out, the no-instructor and no-deadline banners, the admin's full-banner line, no enrolment banner or footer), and the admin-only screens. The mock account is an admin who also teaches, so "Minhas aulas" shows; AD-01-02 is the home of an admin who doesn't teach. | Same rule as 073 D-01 and 074 D-01: one role per page. The instructor flag of spec 070 changes the home, so both forms are drawn. |
| D-02 | Some screens look the same to an admin as to another role, apart from the tab bar and the role label: my classes, history, weekly occupancy (as an instructor sees them), and people, profile with its sheets, edit profile, WhatsApp, school rules and notifications (as a student sees them). Each is drawn once, in its main frame, with a note naming the frames of the other page that show its other states (`ST-…` or `IN-…` ids). The people tab's admin-only sheets get their own frames (AD-09-02 to AD-09-06). | Same approach as 074 D-02: the page stays complete without about 45 frames that would repeat the other pages. |
| D-03 | The shared mocks get `role="admin"`: `classes-week-screen`, `class-details-screen`, `people-screen`, `profile-screen`, `edit-profile-screen` and `notifications-screen` where it changes what they draw. `screens/instructor/teaching-classes-screen` moves to `screens/shared/teaching-classes-screen` with `git mv`, and so does `weekly-occupancy-screen`; both take `role`. The student and instructor pages show the same frames as before. | One mock per app screen keeps the roles from drifting (074 D-03). The admin and the instructor share those two app screens (`TeachingClassesScreen` and `WeeklyOccupancyScreen` take `role`). |
| D-04 | The admin's mock data goes in `data/fortaleza.ts` and in a new `data/admin-app.ts`: the pending counts, the requests, the registrations, the reactivations, the removed accounts, the locations, the instructors to pick from, the rules, the settings, and the classes with no instructor or no deadline. The data is Fortaleza people and places. Notification rows use the backend's in-app texts for the types an admin receives (073 D-05). | Same mock data as the other pages (071 D-10, 074 D-04). |
| D-05 | Admin-only screen mocks live in `apps/web/src/modules/designs/screens/admin/`. The page sections are `components/admin-app-{home,classes,class,class-forms,notices,class-requests,accounts,enrol-student,people,school,more}/`, composed by `pages/admin-app/`. Each folder follows `.claude/rules/react.md`. | Same structure as the student and instructor pages (073 D-07, 074 D-06). |
| D-06 | `admin-app.html`'s sources are generated from `/pt-br/designs/admin-app` by `node .docs/designs/scripts/build-design.mjs admin-app` and packed with `pack.mjs`. `admin-app` joins the generator's slugs, and the old prototype (`App Admin.dc.html` and its template) is removed. | Same as 072 D-01: the web page is the single source of truth. |
| D-07 | The location form's full-screen map is drawn with tokens only, with no tiles, no third-party map and no network request. It uses the same tinted surface as `class-location-card`'s preview, with a few drawn streets and the shoreline, and the pin when a point is picked. | The mocks are presentational (071). A real map would need a tile service, and it would change between renders, so regenerating the `.html` would no longer be stable. |

## Expected Results

### ER-01 — admin-app.html shows the app's admin screens

- **Front:** designs
- **Behavior:** Given `.docs/designs/admin-app.html` opened in a browser, then it shows every entry of
  [admin-app-inventory.md](admin-app-inventory.md) with its id, in pt-BR. Each entry is drawn in light and dark side
  by side, matches the web page `/pt-br/designs/admin-app`, and its tall frames are drawn at their full height.
- **Edge and error cases:**
  - `.docs/designs/src/admin-app/App Admin.dc.html` no longer exists;
  - no European Portuguese wording and no ratings screen is left (for example "ecrã", "As minhas", "Avaliação");
  - regenerating the other four designs changes them only in the compiled CSS (072 A-01);
  - `pack.mjs --check` exits 0.
- **Verify by:**
  - `node .docs/designs/scripts/pack.mjs --check` exits 0;
  - `test ! -e ".docs/designs/src/admin-app/App Admin.dc.html"` passes;
  - `grep -rliE "ecrã|As minhas|avaliaç|avaliar" .docs/designs/src/admin-app` finds nothing;
  - the file opened in a browser shows every entry of the inventory.

### ER-02 — The designs index lists the admin app

- **Front:** web
- **Behavior:** Given `/{lang}/designs` for each of `pt-br`, `es` and `en`, then it shows a card for the admin app
  after the instructor app's. The card has its title and description in that language and links to
  `/{lang}/designs/admin-app`.
- **Edge and error cases:**
  - `/designs/admin-app` without a language redirects with 307 to the browser's language, or to pt-br when none
    matches;
  - the other cards don't change.
- **Verify by:** `apps/web/e2e/designs.e2e.ts` → `index lists the design pages in every language` and
  `redirects /designs/admin-app to the browser language`, run by `node .specs/scripts/run-e2e.mjs 075`.

### ER-03 — The admin app page shows every inventory frame

- **Front:** web
- **Behavior:** Given `/{lang}/designs/admin-app`, then for every id in [admin-app-inventory.md](admin-app-inventory.md)
  an element whose `data-design-id` is that id is visible. It shows the entry's title, its note and its iOS phone
  frame. The frame matches the app as an admin sees it, by 071's fidelity rule (D-08). The notes of D-02 entries name
  the other page's frames.
- **Edge and error cases:**
  - the eleven sections are in the inventory's order;
  - the page sets its translated `<title>` and description;
  - the tab screens draw the admin tab bar (Início, Aulas, Pessoas, Perfil);
  - no class-details frame shows an enrolment banner or a footer button;
  - the student and instructor app pages still show every one of their frames as before (D-03).
- **Verify by:**
  - `apps/web/e2e/designs.e2e.ts` → `admin app shows every inventory entry` (pt-br, es and en);
  - the existing `student app shows every inventory entry` and `instructor app shows every inventory entry`;
  - the reviewer walking the page against the mobile code.

### ER-04 — The admin app page follows the page language

- **Front:** web
- **Behavior:** Given `/{lang}/designs/admin-app`, then these are in that language:
  - the copy inside the frames, which is the app's copy;
  - the notification rows, which are the backend's texts;
  - the section titles and notes.

  For example, AD-01-01's "Ferramentas" section label is the pt-BR `admin.home.toolsSection` on `/pt-br`, the es-ES
  text on `/es` and the en-US text on `/en`.
- **Edge and error cases:**
  - choosing another language in the header opens the same page in that language;
  - interpolated values and plurals (counts, dates, names) are filled, with no `{{…}}` or raw tags on the page.
- **Verify by:** `apps/web/e2e/designs.e2e.ts` → `admin app follows the language`.

### ER-05 — The admin app page follows the header theme

- **Front:** web
- **Behavior:** Given `/{lang}/designs/admin-app`, when the visitor presses the header's theme toggle, then every
  frame switches to the other palette, and the choice is kept on reload.
- **Edge and error cases:** without a stored choice the page follows the OS color scheme.
- **Verify by:** `apps/web/e2e/designs.e2e.ts` → `admin app follows the theme toggle`. It checks that the computed
  background of the AD-01-01 frame changes between the light and dark `page` token values.

### ER-06 — The admin app page fits wide and phone viewports

- **Front:** web
- **Behavior:**
  - Given a 1600 px wide viewport, then the page's content is up to 1440 px wide.
  - Given a 375 px wide viewport, then `/{lang}/designs/admin-app` has no horizontal scroll, and the phone frames,
    tall ones included, are scaled down to fit.
- **Edge and error cases:** the existing e2e tests of the site and the other design pages keep passing.
- **Verify by:** `apps/web/e2e/designs.e2e.ts` → `design pages are wide` and `design pages fit a phone viewport`, both
  covering the admin app page.

## Tasks

### Web (`apps/web`)

- [ ] **T-01** — Add the building blocks of the admin's home, classes tab and class details to
  `apps/web/src/modules/designs/components/`, with the mobile names and props:
  - new: `admin-tool-row` (with and without a badge or a subtitle), `class-tools-sheet` with `class-tool-card`
    (enabled, danger, disabled), `cancel-class-sheet`, `delete-class-sheet` (available and not empty),
    `take-out-sheet` (student and guest) and `guests-warning`;
  - extended: `class-card` gets `showFlags` (the no-instructor and no-deadline chips); `class-people` gets the
    take-out action and the trial count; `class-full-banner` gets the admin's line.
  - Add any glyph they draw to the `app-icon` registry.
  - Each folder follows `.claude/rules/react.md` and has a Vitest test rendering its variants. Skill:
    [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).

  Covers: enabling · Done when: `npx vitest run src/modules/designs/components` passes in `apps/web` and
  `npm run check-types --workspace @rochas-surf-school/web` exits 0.

- [ ] **T-02** — Add the building blocks of the class and location forms to
  `apps/web/src/modules/designs/components/`, with the mobile names and props:
  - `form-section`, `date-range-calendar` (start, range and removed days), `date-range-summary`, `time-range-picker`
    with `time-range-hint`, `time-range-sheet`, `location-picker` (normal and managing, a removed location),
    `archive-location-sheet`, `capacity-stepper`, `instructor-picker` with `instructor-pill`;
  - for the location form: `location-address-card` (empty, resolving, picked), `location-search-header`,
    `my-location-button`, and a `location-map` drawn with tokens, with and without the pin (D-07).
  - Each folder follows `.claude/rules/react.md` and has a Vitest test rendering its variants. Skill:
    [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).

  Covers: enabling · Done when: `npx vitest run src/modules/designs/components` passes in `apps/web` and
  `npm run check-types --workspace @rochas-surf-school/web` exits 0.

- [ ] **T-03** — Add the building blocks of the requests, accounts, people, notices and school screens to
  `apps/web/src/modules/designs/components/`, with the mobile names and props:
  - `class-requests-group` (open, full with the waiting list) and `class-requests-skeleton`;
  - `registrations-skeleton`, `removed-account-row` and `removed-accounts-skeleton`;
  - `person-role-actions` (per role), `role-change-confirmation` and `remove-confirmation`, and `person-sheet` with
    `canChangeRole` and `canSetInstructorFlag`;
  - `class-message-card` and `send-notice-confirm-sheet`;
  - `school-settings-form` and `school-settings-skeleton`, `cancellation-rules-skeleton`;
  - `school-rule-editable-row`, `school-rule-sheet` (add and edit) and `delete-school-rule-sheet`;
  - the enrol-student students skeleton.
  - Reuse `decision-card` and `deny-sheet` where the app does.
  - Each folder follows `.claude/rules/react.md` and has a Vitest test rendering its variants. Skill:
    [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).

  Covers: enabling · Done when: `npx vitest run src/modules/designs/components` passes in `apps/web` and
  `npm run check-types --workspace @rochas-surf-school/web` exits 0.

- [ ] **T-04** — Give the shared mocks the admin's form (D-03).
  - `git mv` `screens/instructor/teaching-classes-screen` and `screens/instructor/weekly-occupancy-screen` to
    `screens/shared/`, and update the instructor page's imports.
  - Add `role="admin"` to these mocks:
    - `classes-week-screen`: the title header, the "+" button on today and later days, the flags, and the empty day's
      create action;
    - `class-details-screen`: the admin's states and sheets of AD-03-01 to AD-03-20;
    - `people-screen`: the admin tab bar and the admin sheets of AD-09-02 to AD-09-06;
    - `profile-screen` and `edit-profile-screen`: "Admin" and the admin's name;
    - `notifications-screen`, only if a role changes what it draws;
    - `teaching-classes-screen` and `weekly-occupancy-screen`.
  - Extend each screen's Vitest test with the admin's states, keeping the other roles'.
  - Skill: [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).

  Covers: ER-03 · Done when:
  - `npx vitest run src/modules/designs` passes in `apps/web`;
  - the e2e tests `student app shows every inventory entry` and `instructor app shows every inventory entry` still
    pass;
  - the student and instructor pages' static markup (pt-br, es, en) is the same as at the base commit.

- [ ] **T-05** — Write the first admin-only screen mocks in `screens/admin/` (D-05):
  - `home-screen` (AD-01-01 to AD-01-03);
  - `new-class-screen` (AD-04-01 to AD-04-06);
  - `location-form-screen` (AD-04-07 to AD-04-10);
  - `edit-class-screen` (AD-04-11 to AD-04-13);
  - `send-notice-screen` (AD-05-01 to AD-05-06, with and without a class).

  The mocks read the app copy through `appT` / `appRich`, take the admin's mock data from `data/fortaleza.ts` and
  `data/admin-app.ts` (D-04), and each has a Vitest test covering every state. Skill:
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).

  Covers: ER-03 · Done when: `npx vitest run src/modules/designs/screens` passes in `apps/web`.

- [ ] **T-06** — Write the other admin-only screen mocks in `screens/admin/`:
  - `class-requests-screen` (AD-06-01 to AD-06-09);
  - `registrations-screen` (AD-07-01 to AD-07-06);
  - `reactivations-screen` (AD-07-07 to AD-07-11);
  - `removed-accounts-screen` (AD-07-12 to AD-07-15);
  - `enrol-student-screen` (AD-08-01 to AD-08-09);
  - `school-settings-screen` (AD-10-01 to AD-10-04);
  - `cancellation-rules-screen` (AD-10-05 to AD-10-08);
  - `manage-school-rules-screen` (AD-10-09 to AD-10-15).

  As in T-05, the mocks read the app copy through `appT` / `appRich`, take their mock data from D-04's files, and
  each has a Vitest test covering every state. Skill:
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).

  Covers: ER-03 · Done when: `npx vitest run src/modules/designs/screens` passes in `apps/web`.

- [ ] **T-07** — Write the admin app page.
  - The eleven section components of D-05, composed by `pages/admin-app/`.
  - The route `src/app/[lang]/designs/admin-app/page.tsx` with `generateMetadata`.
  - The 112 ids in `data/admin-app-ids.ts`, each with its other messages, set as `data-design-id`, and
    `i18n/admin-app-note.ts`.
  - In the three dictionaries and `dictionary.types.ts`: the section titles, entry titles and notes (with the other
    messages and the `ST-…` and `IN-…` references of D-02), the admin's notification texts, the mock texts and the
    index card text.
  - `admin-app` added to `data/design-pages.ts`.
  - In `e2e/designs.e2e.ts`:
    - extend `index lists the design pages in every language` to the fifth card;
    - add `redirects /designs/admin-app to the browser language`, `admin app shows every inventory entry`,
      `admin app follows the language` and `admin app follows the theme toggle`;
    - run `design pages are wide` and `design pages fit a phone viewport` on the admin app page too.
  - Skill: [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).

  Covers: ER-02, ER-03, ER-04, ER-05, ER-06 · Done when:
  `npm run test:e2e --workspace @rochas-surf-school/web` passes and
  `npx turbo run lint check-types build --filter=@rochas-surf-school/web` succeeds.

### Designs (`.docs/designs`)

- [ ] **T-08** — Generate `admin-app.html` from the web page.
  - Add `admin-app` to the slugs of `.docs/designs/scripts/build-design.mjs`.
  - Run it for `admin-app`, which removes the old prototype sources.
  - Regenerate `design-system`, `auth-flow`, `student-app` and `instructor-app` so their compiled CSS is current.
  - Pack the five files.
  - Update the Designs commands in `CLAUDE.md` with the new slug.

  Covers: ER-01 · Done when:
  - `pack.mjs --check` exits 0;
  - `test ! -e ".docs/designs/src/admin-app/App Admin.dc.html"` passes;
  - `grep -rliE "ecrã|As minhas|avaliaç|avaliar" .docs/designs/src/admin-app` finds nothing;
  - the other four designs' sources changed only in their CSS;
  - a second run of the generator changes nothing;
  - `admin-app.html` opened in a browser shows the 112 entries in light and dark.

### Verification

- [ ] **T-09** — Run every command in the Verification Plan from the repo root; all pass. Record the output summary
  as evidence. Covers: all · Done when: every command exits 0, `check-coverage.mjs` prints `COVERAGE OK` and
  `run-e2e.mjs` prints `E2E PASSED`.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 075`: the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 075`: every line this spec adds or changes is covered
    (`apps/web/src/**` and `.docs/designs/**` are excluded by technical-context).
  - `node .specs/scripts/run-e2e.mjs 075`: the web Playwright suite passes, including the admin app tests of
    `e2e/designs.e2e.ts` and the existing student and instructor app tests.
  - `node --test .docs/designs/scripts/*.test.mjs`: the pack and unpack tests still pass.
  - `node .docs/designs/scripts/pack.mjs --check`: every `.html` matches its sources.
  - `test ! -e ".docs/designs/src/admin-app/App Admin.dc.html"`: the old prototype is gone.
  - `grep -rliE "ecrã|As minhas|avaliaç|avaliar" .docs/designs/src/admin-app`: finds nothing.
  - `npm test --workspace @rochas-surf-school/web` and
    `npx turbo run lint check-types build --filter=@rochas-surf-school/web`: the web tests, lint, type check and
    build pass.
- User journeys (followed in a browser):
  - Open `.docs/designs/admin-app.html`. Every inventory entry is there with its id, in pt-BR, light and dark side by
    side, and the tall frames are at full height. Spot-check frames against the mobile screens by 071's D-08.
  - Run the web app and open `/pt-br/designs/admin-app`, then switch the theme and the language from the header: the
    frames follow both. Open `/pt-br/designs/student-app` and `/pt-br/designs/instructor-app`, and check they still
    show their frames as before.

## Memory Impact

- `memory/product.md`: the designs area also shows the admin app (`/{lang}/designs/admin-app`). Source documents:
  `admin-app.html` is generated from that page, and the old prototype's ratings screens are gone. Every design file is
  now generated from the web.
- `memory/technical-context.md`: Applications → `apps/web` gains `src/modules/designs/screens/admin/`, the `admin`
  role of the shared screen mocks and the `admin-app` route. The designs commands: `build-design.mjs` also takes
  `admin-app`.
- `memory/structure.md`: `apps/web/src/modules/designs/screens/admin`, the moved
  `screens/shared/{teaching-classes,weekly-occupancy}-screen`, and `src/app/[lang]/designs/admin-app/`.
- `memory/modules.md`: None (no business module changes).

## Assumptions

- The notification texts follow `push-messages.ts` as it is when T-07 runs; a later change to those texts doesn't
  update the designs by itself.
- Where the inventory and the mobile code disagree, the frame follows the code (071 D-08), and the task's deviations
  record it.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)
- [Admin app inventory](admin-app-inventory.md)

## Amendments

## Review
