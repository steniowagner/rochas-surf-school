---
id: "075"
slug: designs-admin-app
title: Admin app designs page
status: finished
reviewed_commit: d222d98acddfd44892632ac58ab2b4a1d2ff0cc7
started: 2026-10-29
base_commit: 0a47dbb52cb9d9a40eec0781a1c1e4b2a9151e77
created: 2026-10-29
fronts: [web, designs]
depends_on: []
finished: 2026-10-29
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

- [x] **T-01** — Add the building blocks of the admin's home, classes tab and class details to
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
  > ✅ 2026-10-29 12:36 — added the building blocks of the admin's home, classes tab and class details with the mobile names and props, each per `.claude/rules/react.md` with a Vitest test of its variants: `admin-tool-row` (with a subtitle and a badge, without a badge when the count is 0 or unknown, and without a subtitle: the title centered over two blank lines, as the app's), `class-tool-card` (enabled, danger, disabled), `class-tools-sheet` (people enrolled: the message and cancel subtitles with the count and delete disabled with `classTools.deleteEnrolled`; nobody enrolled: `classTools.nobody`, `classTools.nobodyToNotify` and delete enabled with `classTools.deleteEmpty`; started: `classTools.deleteStarted`), `cancel-class-sheet` (the audience sentence built as the app's hook does, the guests warning and the optional message; the general sentence when nobody is named), `delete-class-sheet` (`confirm` and `notEmpty`, with the class line), `take-out-sheet` (a student, with the summary and the optional reason; a trial guest, no reason), built on the existing `deny-sheet` as the app's is, and `guests-warning` (left out without guests). Extended: `class-people` takes `showTrialCount` (" · inclui N trial" on the capacity line) and `canTakeOut` (the "Retirar" button on each student row but an erased one's, and on each guest row), through `class-student-row`'s `takeOutLabel` and `class-guest-row`'s `takeOut`; `class-full-banner` takes `adminLine` (`classDetails.full.newRequestsWait` / `waitingListOff`). `class-card` already had `showFlags` (the no-instructor and no-deadline chips) since spec 071, with its test, so it needed no change. Glyphs added to the `app-icon` registry: the nine `MaterialCommunityIcons` of the admin's rows (`plus-circle-outline`, `calendar-month-outline`, `account-plus-outline`, `account-check-outline`, `account-off-outline`, `account-reactivate-outline`, `calendar-remove-outline`, `bullhorn-outline`, `tune-variant`) and `Ionicons:construct-outline` (the class's tools header button).
  > files: `apps/web/src/modules/designs/components/{admin-tool-row,class-tool-card,class-tools-sheet,cancel-class-sheet,delete-class-sheet,take-out-sheet,guests-warning}/*` (new), `apps/web/src/modules/designs/utils/audience.ts`, `apps/web/src/modules/designs/utils/audience.test.ts` (new), `apps/web/src/modules/designs/components/class-people/class-people.{component.tsx,types.ts,component.test.tsx}`, `apps/web/src/modules/designs/components/class-student-row/class-student-row.{component.tsx,types.ts,component.test.tsx}`, `apps/web/src/modules/designs/components/class-guest-row/class-guest-row.{component.tsx,types.ts,component.test.tsx}`, `apps/web/src/modules/designs/components/class-full-banner/class-full-banner.{component.tsx,types.ts,component.test.tsx}`, `apps/web/src/modules/designs/components/app-icon/app-icon.constants.ts`
  > verified: `npx vitest run src/modules/designs/components src/modules/designs/utils` in `apps/web` (127 files, 356 tests passed); `npm run check-types --workspace @rochas-surf-school/web` exits 0; the student and instructor app pages' static markup (`renderToStaticMarkup`, pt-br, es, en) is byte-identical to the base commit's
  > deviations: `class-card` was not changed (its `showFlags` already existed); `utils/audience.ts` mirrors the app's `joinAudience` (`modules/classes/utils/audience.ts`), which the cancel sheet uses; `class-tools-sheet.constants.ts` holds the delete subtitle keys of the app's hook (the mock has no state, so no hook file).

- [x] **T-02** — Add the building blocks of the class and location forms to
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
  > ✅ 2026-10-29 12:42 — added the building blocks of the class and location forms with the mobile names and props, each per `.claude/rules/react.md` with a Vitest test of its variants: `form-section` (label, hint, the "Gerir" action), `date-range-calendar` (the month, the weekday initials and the weeks with the blank days before the current month, the previous month disabled on the current one, and the summary under it but for a single day) with its child `calendar-day` (start and end on grape, the band and its rounded ends, a removed day struck out, today ringed, past and adjacent days faded), `date-range-summary` (`newClass.calendar.start`, `pickEnd` with clear, and a range with its removed days or `noneExcluded`), `time-range-picker` (chips selected on grape, blocked ones struck out, the dashed "Novo horário" chip, and the three hints) with `time-range-hint`, `time-range-sheet` (12:00 to 13:00 by default; `timeRangeSheet.endBeforeStart` and the disabled button when the end isn't after the start) with its child `time-wheel` (the iOS 24 h spinner the native picker draws), `location-picker` (normal: the chosen row on grape with its tick and "Novo local"; managing: the pencils, a removed location with `locationPicker.archived`, no add chip), `archive-location-sheet` (with and without `archiveLocation.kept`), `capacity-stepper` (the ends faded), `instructor-picker` (ticked rows, the spinner, the error with its retry) and `instructor-pill` (an instructor, the viewer's "Você"); for the location form: `location-address-card` (empty, resolving, picked from the map or from a suggestion), `location-search-header` (the back button and the search field, empty or typed), `my-location-button`, and `location-map`, drawn with tokens only (D-07: the `info-tint` surface of the class's map preview, the sea and the shore, a few streets, and the pin when a point is picked; no tiles and no request). `class-people` now draws its pills through `instructor-pill`, with the same markup. Glyphs added to the registry: `Ionicons:locate`, `Ionicons:remove` and `Ionicons:search-outline`.
  > files: `apps/web/src/modules/designs/components/{form-section,calendar-day,date-range-calendar,date-range-summary,time-range-hint,time-range-picker,time-range-sheet,time-wheel,location-picker,archive-location-sheet,capacity-stepper,instructor-picker,instructor-pill,location-address-card,location-search-header,my-location-button,location-map}/*` (new), `apps/web/src/modules/designs/components/class-people/class-people.component.tsx`, `apps/web/src/modules/designs/components/app-icon/app-icon.constants.ts`
  > verified: `npx vitest run src/modules/designs/components src/modules/designs/utils` in `apps/web` (144 files, 393 tests passed); `npm run check-types --workspace @rochas-surf-school/web` exits 0; `npx eslint src/modules/designs` clean; the student and instructor app pages' static markup (pt-br, es, en) is byte-identical to the base commit's
  > deviations: the mocks take what the app's hooks compute (the calendar's weeks and day states, the summary's labels, the time chips) as props, built by the mock data (T-05), so `date-range-calendar`, `date-range-summary` and `time-range-picker` have no hook; the children `calendar-day` (the app's) and `time-wheel` (the native spinner, which has no app component) are their own folders (react.md §5); `instructor-pill` takes the viewer's label (`viewerLabel`) instead of `isViewer`, since it has no locale.

- [x] **T-03** — Add the building blocks of the requests, accounts, people, notices and school screens to
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
  > ✅ 2026-10-29 12:48 — added the building blocks of the requests, accounts, people, notices and school screens with the mobile names and props, each per `.claude/rules/react.md` with a Vitest test of its variants: `class-requests-group` (an open class: the day block, the chips, the time, the place, the occupancy bar in the app's tones and `classRequests.spotsLeft`, its requests as embedded decision cards with `classRequests.askedAt`; a full class: `classRequests.full`, `classRequests.waitingList` with the positions "1º", "2º", `classRequests.fullNote` and "Inscrever" disabled) and `class-requests-skeleton`; `registrations-skeleton` (the reactivations draw it too, as in the app), `removed-account-row` with its child `removal-info-row`, and `removed-accounts-skeleton`; `person-role-actions` (per role, in the app's order and tones, then "Remover da plataforma"), `role-change-confirmation` (the seats note and the "Também é instrutor" checkbox for `promoteAdmin`, the danger button for `demoteStudent` / `adminToInstructor`) and `remove-confirmation` (student and staff); `person-sheet` gets `canChangeRole` (the role actions), `instructorFlag` (the "Também é instrutor" row the app's `canSetInstructorFlag` draws) and `step` (the role change's or the removal's confirmation in place of the details, by the first name); `class-message-card` (the class, "N pessoas recebem" with the summary of who they are, and the list opened with their role chips; an erased person can't be opened) and `send-notice-confirm-sheet`; `school-settings-form` (the waiting-list switch on and off with its line, the school's WhatsApp, Save) and `school-settings-skeleton`, `cancellation-rules-skeleton`; `school-rule-editable-row` (the moves, the first's up and the last's down disabled), `school-rule-sheet` (add and edit, with `saveNote` and the counters at the app's 60 / 300 limits) and `delete-school-rule-sheet`; `enrol-student-students-skeleton`. `decision-card` gets the app's `embedded` (no card of its own) and `pressable` (the chevron that opens the person). Glyphs added: `Feather:user-check`, `shield`, `user-minus`, `shield-off` (the role actions) and `Ionicons:settings-outline`.
  > files: `apps/web/src/modules/designs/components/{class-requests-group,class-requests-skeleton,registrations-skeleton,removed-account-row,removal-info-row,removed-accounts-skeleton,person-role-actions,role-change-confirmation,remove-confirmation,class-message-card,send-notice-confirm-sheet,school-settings-form,school-settings-skeleton,cancellation-rules-skeleton,school-rule-editable-row,school-rule-sheet,delete-school-rule-sheet,enrol-student-students-skeleton}/*` (new), `apps/web/src/modules/designs/components/person-sheet/person-sheet.{component.tsx,types.ts,component.test.tsx}`, `apps/web/src/modules/designs/components/decision-card/decision-card.{component.tsx,types.ts,component.test.tsx}`, `apps/web/src/modules/designs/components/app-icon/app-icon.constants.ts`
  > verified: `npx vitest run src/modules/designs/components src/modules/designs/utils` in `apps/web` (162 files, 428 tests passed); `npm run check-types --workspace @rochas-surf-school/web` exits 0; `npx eslint src/modules/designs` clean; the student and instructor app pages' static markup (pt-br, es, en) is byte-identical to the base commit's
  > deviations: `removal-info-row` is the app's child of `removed-account-row`, in its own folder (react.md §5); the role actions' lists and looks are in `person-role-actions.constants.ts`, and the role chips of the class message card in `class-message-card.constants.ts`, as the app's constants; the class message card computes its summary from its people, the app's `ClassMessageView` does it in the screen's hook; the person sheet's instructor flag is one optional boolean (`instructorFlag`: drawn when set, checked when true) rather than the app's `canSetInstructorFlag` plus the person's `isInstructor`.

- [x] **T-04** — Give the shared mocks the admin's form (D-03).
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
  > ✅ 2026-10-29 12:58 — `git mv` `screens/instructor/teaching-classes-screen` and `screens/instructor/weekly-occupancy-screen` to `screens/shared/` (the instructor page's sections import them from there). `role="admin"` added to: `classes-week-screen` (the instructor's form under the `tabs.classes` title with no back button, the "+" `HeaderButton` (`classesWeek.newClass`) on today and later days, today selected, the day's `adminDayClasses` with `showFlags` (no instructor, no deadline, full, started, cancelled), the empty day (Tuesday 8) with the `classesWeek.create` action, a new `pastEmpty` state (Friday 4, in the week 31 AGO – 6 SET, without the action or the "+"), and the admin tab bar); `class-details-screen` (the admin's states `open`, `noInstructor`, `noDeadline`, `full`, `noStudents`, `started`, `finished`, `classCancelled`, `takenOut` and the load states, through `adminScenarios` and `getClassDetailsView`: the tools `HeaderButton` while the class can change, the `classDetails.noInstructor` and `classDetails.noDeadline` banners (with the sport), the full banner's `classDetails.full.newRequestsWait`, the people opened with "Retirar" on a class that hasn't started and `classDetails.includesTrial`, no enrolment banner, note or footer; the sheets `tools`, `cancel`, `delete`, `deleteNotEmpty`, `takeOut`, `takeOutGuest` and `person`, with the app's counts (the message reaches the other instructor, the students and the pending request), and a toast with its values); `people-screen` (the admin tab bar, the directory with the signed-in admin, and `adminSheet`: a student's, an instructor's and another admin's sheet with the role actions and the instructor flag, and the role change's and the removal's confirmations); `profile-screen` and `edit-profile-screen` (Juliana Prado, "Admin", the admin tab bar). Admin mock data (D-04): `adminAccount` and `adminDayClasses` in `data/fortaleza.ts`; `adminTabs`, `adminDates` and `adminDirectory` in the new `data/admin-app.ts`. Each screen's test gained the admin's states; the other roles' are kept.
  > files: `apps/web/src/modules/designs/screens/shared/teaching-classes-screen/{index.ts,teaching-classes-screen.component.tsx,teaching-classes-screen.types.ts,teaching-classes-screen.component.test.tsx}` (moved from `screens/instructor/teaching-classes-screen/`), `apps/web/src/modules/designs/screens/shared/weekly-occupancy-screen/{index.ts,weekly-occupancy-screen.component.tsx,weekly-occupancy-screen.types.ts,weekly-occupancy-screen.component.test.tsx}` (moved from `screens/instructor/weekly-occupancy-screen/`), `apps/web/src/modules/designs/screens/shared/classes-week-screen/classes-week-screen.{component.tsx,types.ts,component.test.tsx}`, `apps/web/src/modules/designs/screens/shared/class-details-screen/class-details-screen.{component.tsx,constants.ts,types.ts,component.test.tsx}`, `apps/web/src/modules/designs/screens/shared/people-screen/people-screen.{component.tsx,types.ts,component.test.tsx}`, `apps/web/src/modules/designs/screens/shared/profile-screen/profile-screen.{component.tsx,types.ts,component.test.tsx}`, `apps/web/src/modules/designs/screens/shared/edit-profile-screen/edit-profile-screen.{component.tsx,types.ts,component.test.tsx}`, `apps/web/src/modules/designs/components/instructor-app-my-classes/instructor-app-my-classes.component.tsx`, `apps/web/src/modules/designs/components/instructor-app-occupancy/instructor-app-occupancy.component.tsx`, `apps/web/src/modules/designs/data/fortaleza.ts`, `apps/web/src/modules/designs/data/admin-app.ts` (new)
  > verified: `npx vitest run src/modules/designs` in `apps/web` (196 files, 619 tests passed); `npx playwright test e2e/designs.e2e.ts -g "student app shows every inventory entry|instructor app shows every inventory entry"` (2 passed); `npm run check-types --workspace @rochas-surf-school/web` exits 0; `npx eslint src/modules/designs` clean; the student and instructor app pages' static markup (`renderToStaticMarkup`, pt-br, es, en) is byte-identical to the base commit's
  > deviations: `teaching-classes-screen` and `weekly-occupancy-screen` were moved but take no `role`: in the app, `role` only picks the routes these screens open (`routes[role].classDetail`, `.myHistory`); they have no tab bar or role label, so the admin's frames are the instructor's (as 074 did for `notifications-screen`, which again gets no `role`); likewise the admin's history (AD-11-02) is `class-history-screen` with the instructor's `teachingHistory` form (the app's `TeachingClassHistoryScreen` with `role="admin"`). Following the code over the inventory (071 D-08): the class's tools stay on a started class (`showTools` is off only for finished and cancelled classes); the delete sheet's `notEmpty` form is drawn over the class that looked empty (the app shows it when the backend refuses the deletion). The admin account, Juliana Prado, isn't in the student page's directory, so the admin's People tab lists `adminDirectory` (the directory plus her); "another admin" is Bruno Costa. The empty day is Tuesday 8 (unmarked) and the past one Friday 4, since every day of today's week from Monday on is today or later.
  > fix 2026-10-29 13:22 — walking the page in the browser: the admin's people list opens only on a class still to happen or under way, not on a finished or cancelled one (`adminScenarios` in `class-details-screen.constants.ts`, with its test); `npx vitest run src/modules/designs/screens/shared/class-details-screen` (36 passed).

- [x] **T-05** — Write the first admin-only screen mocks in `screens/admin/` (D-05):
  - `home-screen` (AD-01-01 to AD-01-03);
  - `new-class-screen` (AD-04-01 to AD-04-06);
  - `location-form-screen` (AD-04-07 to AD-04-10);
  - `edit-class-screen` (AD-04-11 to AD-04-13);
  - `send-notice-screen` (AD-05-01 to AD-05-06, with and without a class).

  The mocks read the app copy through `appT` / `appRich`, take the admin's mock data from `data/fortaleza.ts` and
  `data/admin-app.ts` (D-04), and each has a Vitest test covering every state. Skill:
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).

  Covers: ER-03 · Done when: `npx vitest run src/modules/designs/screens` passes in `apps/web`.
  > ✅ 2026-10-29 13:03 — wrote the first admin-only screen mocks in `screens/admin/`, each per `.claude/rules/react.md`, reading the app copy through `appT`, with a Vitest test covering every state: `home-screen` (AD-01-01..03: the user header, the "Ferramentas" card with the six `admin-tool-row`s and the pending counts as badges, the "Escola" card with "Minhas aulas", the rules row (`schoolRulesEntryRow.adminSubtitle`), the weekly occupancy and the three admin rows, the admin tab bar; the admin who doesn't teach, with nothing waiting; the loading form; and a `toast` for the forms that go back to it); `new-class-screen` (AD-04-01..03: the form as it opens with every section's hint and the September calendar, the past days disabled; a filled batch, 14–18 September without the 16th, two times with the overlapping one blocked, Praia de Iracema, the notes, Juliana and Rafael, the summary line and `newClass.submit_other`; the "Novo horário" sheet over the empty form); `edit-class-screen` (AD-04-11..13 and AD-04-04: the class's form with its single day and time, the guests warning, `editClass.noteWithAudience` and `editClass.submit`; scrolled to the locations being managed, the class's removed place with `locationPicker.archived`; the started class with only the instructors; the spinner while it loads); `location-form-screen` (AD-04-07..10 and AD-04-05: the map drawn with tokens, the search header, my location and the panel with `locationSheet.pointHintEmpty`; the pin, the picked point and the name; "Editar local" with the notify checkbox and `locationSheet.notifyCount`; the duplicate name; "Remover local?" over the edit); `send-notice-screen` (AD-05-01..03, 05, 06: everyone with `notices.count.people`, the students with the notice typed, the confirm sheet; the message to the class with its card and its confirmation). Mock data (D-04): `adminHome`, `classLocations`, `classTeachers`, `noticeAudienceCounts` and `classMessagePeople` in `data/fortaleza.ts`; `rangeCalendar` (September as the app's `useDateRangeCalendar` lays it out), `timeChips` (the suggestions, with the overlapping ones blocked as the app's `useTimeRangePicker`) and the `classDate` and `shortDay` dates in `data/admin-app.ts`.
  > files: `apps/web/src/modules/designs/screens/admin/{home-screen,new-class-screen,edit-class-screen,location-form-screen,send-notice-screen}/{index.ts,*.component.tsx,*.types.ts,*.component.test.tsx}` (new), `apps/web/src/modules/designs/data/fortaleza.ts`, `apps/web/src/modules/designs/data/admin-app.ts`
  > verified: `npx vitest run src/modules/designs/screens` in `apps/web` (30 files, 173 tests passed); `npm run check-types --workspace @rochas-surf-school/web` exits 0; `npx eslint src/modules/designs` clean; the student and instructor pages' static markup is still byte-identical to the base commit's
  > deviations: following the code over the inventory (071 D-08): the home's rules row reads `schoolRulesEntryRow.title` ("Regras"), not "Regras da escola"; while loading (AD-01-03) the admin's home has no "Minhas aulas" row (the app's `TeachingClassesEntryRow` hides an admin's row until it knows she teaches), and the rules row keeps its top line when "Minhas aulas" is left out (it is `grouped="next"`); a removed location is only listed by the edit form (the class keeps its archived place), so AD-04-04 is the edit form scrolled to its managed locations; "Remover local?" (AD-04-05) is the location form's sheet (`ArchiveLocationSheet` is in `LocationFormScreen`), drawn over "Editar local"; the "classes created" (AD-04-06) and "notice sent" (AD-05-04) toasts show after the form goes back (`router.back()`), so they are drawn over the admin home, which opens both forms (`home-screen`'s `toast`); the edit form's save buttons wait for a change, so they are drawn disabled. The location form's frame keeps the status bar above the map (a full-bleed frame would print the light status bar over the light map). The app's limits (`CLASS_NOTES_MAX` 300, `CLASS_CAPACITY_MIN` 1 / `MAX` 20, `NOTICE_MESSAGE_MAX_LENGTH` 500) are constants in the mocks, since `@rochas-surf-school/classes` isn't a web dependency.

- [x] **T-06** — Write the other admin-only screen mocks in `screens/admin/`:
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
  > ✅ 2026-10-29 13:09 — wrote the other admin-only screen mocks in `screens/admin/`, each per `.claude/rules/react.md`, reading the app copy through `appT`, with a Vitest test covering every state: `class-requests-screen` (AD-06-01..09: the intro with `classRequests.requestsCount` · `classesCount`, the three classes' groups and the sport filter; scrolled to the full class with its waiting list; surf only; the deny sheet and the `classRequests.approved` toast; `classRequests.empty`; `classRequests.emptyFiltered.surf`, with only the skate class waiting; the skeletons and the load error, with the title in the header); `registrations-screen` (AD-07-01..06: `registrations.waiting` and the decision cards with their e-mails, the deny sheet, a new account's person sheet with its e-mail row, empty, loading, error); `reactivations-screen` (AD-07-07..11: `reactivations.waiting` and the cards with `reactivations.details`, the deny sheet, empty, loading (the registrations' skeleton, as the app), error); `removed-accounts-screen` (AD-07-12..15: `removedAccounts.count` and the cards with `people.removed.removedOn` / `deletedOn` (30 days later, the month first in English) and Restore, empty, loading, error); `enrol-student-screen` (AD-08-01..08: the step tabs on "Quem" with the students to pick, a student chosen with "Escolher aula" enabled, a search with no match, the students' skeleton, the trial guest's name, WhatsApp and note; the "Aula" step with today's classes (the full one faded), the sport filter and "Inscrever" disabled, a day without classes, the classes' skeletons); `school-settings-screen` (AD-10-01..04); `cancellation-rules-screen` (AD-10-05..08: surf with its rule, skate blank with the placeholder, loading, error); `manage-school-rules-screen` (AD-10-09..15: the rules with their moves and "Adicionar regra", the add, edit and delete sheets, empty with its action, loading, error). Mock data (D-04) in `data/fortaleza.ts`: `pendingRequestGroups`, `registrationRequests`, `reactivationRequests`, `removedAccounts`, `enrolStudents` and `enrolDayClasses`; in `data/admin-app.ts` the `dayBlock`, `longDate`, `removalDay` and `deletedOn` dates. Glyphs added: `Ionicons:radio-button-on` / `-off`, `refresh-outline` and `document-text-outline`.
  > files: `apps/web/src/modules/designs/screens/admin/{class-requests-screen,registrations-screen,reactivations-screen,removed-accounts-screen,enrol-student-screen,school-settings-screen,cancellation-rules-screen,manage-school-rules-screen}/{index.ts,*.component.tsx,*.types.ts,*.component.test.tsx}` (new), `apps/web/src/modules/designs/data/fortaleza.ts`, `apps/web/src/modules/designs/data/admin-app.ts`, `apps/web/src/modules/designs/components/app-icon/app-icon.constants.ts`
  > verified: `npx vitest run src/modules/designs/screens` in `apps/web` passes (the 8 new files: 30 tests); the whole designs suite `npx vitest run src/modules/designs` 209 files, 668 tests passed; `npm run check-types --workspace @rochas-surf-school/web` exits 0; `npx eslint src/modules/designs` clean; the student and instructor pages' static markup is still byte-identical to the base commit's
  > deviations: following the code over the inventory (071 D-08): the class requests' deny sheet has no label over its text area (the app passes no `showLabel`); the reactivations' loading state draws the registrations' skeleton and label (the app's `RegistrationsSkeleton`); the "Regras da escola" screen keeps the collapsing title in its loading, empty and error states (the app passes `header.headerOptions` there too), so the header shows no title; the enrol student's calendar marks the days with classes, its `enrolStudent.hasClasses` is only their screen-reader label. AD-06-02 is the list scrolled to the full class's group (the header then shows the collapsed title), and AD-06-07 shows a moment when only the skate class waits, so its intro counts that class alone. The enrol student's "done" toast (AD-08-09) shows after the screen goes back (`router.back()`), so it is drawn over the admin home (T-07), as the T-05 toasts.

- [x] **T-07** — Write the admin app page.
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
  > ✅ 2026-10-29 13:19 — wrote the admin app page: `data/admin-app-ids.ts` (the 112 ids `AD-01-01`…`AD-11-08` and each entry's other app messages, with the values they are drawn with), `i18n/admin-app-note.ts` (the note plus those messages), the eleven sections of D-05 `components/admin-app-{home,classes,class,class-forms,notices,class-requests,accounts,enrol-student,people,school,more}` (each entry a `DesignEntry` with its `data-design-id`), composed by `pages/admin-app/`, and the route `src/app/[lang]/designs/admin-app/page.tsx` with `generateMetadata`; `admin-app` added to `data/design-pages.ts` (the index's fifth card). The three dictionaries and `dictionary.types.ts` got `designs.pages.adminApp` and `adminApp` (titles, the eleven sections, the 112 entries' titles and notes — the D-02 ones naming the student page's `ST-…` and the instructor page's `IN-…` frames —, the mock class notes, cancellation rules and notice, and the in-app texts of the 17 notification types the backend sends an admin, from `push-messages.ts`: `registration.pending`, `enrolment.requested`, `reactivation.requested`, `enrolment.cancelled`, `class.noInstructor` (the admin's own) and, as an admin who teaches, `class.assigned`, `class.reminder`, `class.message`, `class.edited`, `class.unassigned`, `class.cancelled`, `class.deleted`, `location.changed`, `role.changed`, `reactivation.approved`, `account.restored`, `broadcast`). `notification-row` draws the app's icons of the five admin types (`Ionicons:hand-left-outline` added to the registry). `e2e/designs.e2e.ts`: the index test expects the fifth card, and adds `redirects /designs/admin-app to the browser language`, `admin app shows every inventory entry` (pt-br, es, en: every id visible with its frame, title and note, the eleven sections in order, `<title>` and description, the `ST-…` / `IN-…` references, no `{{…}}`, the admin tab bar, no enrolment banner or enrolment button in the class frames), `admin app follows the language` and `admin app follows the theme toggle` (AD-01-01's frame background light → dark → kept on reload); `design pages are wide` and `design pages fit a phone viewport` also visit the admin page.
  > files: `apps/web/src/app/[lang]/designs/admin-app/page.tsx`, `apps/web/src/modules/designs/pages/admin-app/{index.ts,admin-app.page.tsx,admin-app.types.ts,admin-app.page.test.tsx}`, `apps/web/src/modules/designs/components/admin-app-{home,classes,class,class-forms,notices,class-requests,accounts,enrol-student,people,school,more}/{index.ts,*.component.tsx,*.types.ts,*.component.test.tsx}`, `apps/web/src/modules/designs/data/admin-app-ids.ts`, `apps/web/src/modules/designs/data/design-pages.ts`, `apps/web/src/modules/designs/i18n/admin-app-note.ts`, `apps/web/src/modules/designs/i18n/admin-app-note.test.ts`, `apps/web/src/modules/designs/components/notification-row/notification-row.{component.tsx,component.test.tsx}`, `apps/web/src/modules/designs/components/app-icon/app-icon.constants.ts`, `apps/web/src/i18n/dictionary.types.ts`, `apps/web/src/i18n/dictionaries/{pt-br,es,en}.ts`, `apps/web/e2e/designs.e2e.ts`
  > verified: `npm run test:e2e --workspace @rochas-surf-school/web` (50 passed, the admin, student and instructor app tests among them); `npx turbo run lint check-types build --filter=@rochas-surf-school/web` (9 tasks successful); `npx vitest run src/modules/designs src/i18n` in `apps/web` (223 files, 720 tests passed); the student and instructor pages' static markup is still byte-identical to the base commit's
  > deviations: the class details' loaded frames AD-03-02..08 are tall too (the inventory marks only AD-03-01): the shared class details mock grows every loaded state to its content, as on the student and instructor pages, so the whole class shows; their notes say so. The toasts of AD-04-06, AD-05-04 and AD-08-09 are drawn over the admin home (T-05, T-06). The class message notification's title and every notice text are mock texts typed by an admin (072 D-04), like the instructor page's.
  > fix 2026-10-29 13:24 — checking the generated `admin-app.html`: a tall frame of a short class (AD-03-08) came out shorter than a phone, so the admin's class frames now follow the inventory: only AD-03-01 grows to its content, AD-03-02..08 are phone-height (`class-details-screen.component.tsx`, the student and instructor pages unchanged), and their notes no longer say they are tall; this supersedes the deviation above about AD-03-02..08. Files: `apps/web/src/modules/designs/screens/shared/class-details-screen/class-details-screen.{component.tsx,component.test.tsx}`, `apps/web/src/i18n/dictionaries/{pt-br,es,en}.ts`, `apps/web/src/modules/designs/pages/admin-app/admin-app.page.test.tsx`; `npx vitest run src/modules/designs src/i18n` (223 files, 720 tests passed), the student and instructor pages' markup still byte-identical.

### Designs (`.docs/designs`)

- [x] **T-08** — Generate `admin-app.html` from the web page.
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
  > ✅ 2026-10-29 13:26 — `admin-app` added to the slugs listed by `.docs/designs/scripts/build-design.mjs` (its usage comment: the script takes any page slug) and to the Designs commands in `CLAUDE.md`. With the web built and served on port 3100, ran `node .docs/designs/scripts/build-design.mjs admin-app` (it removed `src/admin-app/App Admin.dc.html` and wrote the template, the shared shell and fonts and the bundle), then `design-system`, `auth-flow`, `student-app` and `instructor-app`, and `pack.mjs` for the five.
  > files: `.docs/designs/scripts/build-design.mjs`, `CLAUDE.md`, `.docs/designs/src/admin-app/{template.html,shell.html,bundle.json,fonts.css}`, `.docs/designs/src/admin-app/App Admin.dc.html` (deleted), `.docs/designs/admin-app.html`, `.docs/designs/src/{design-system,auth-flow,student-app,instructor-app}/template.html`, `.docs/designs/{design-system,auth-flow,student-app,instructor-app}.html`
  > verified: `node .docs/designs/scripts/pack.mjs --check` exits 0 ("5 design file(s) match their sources"); `test ! -e ".docs/designs/src/admin-app/App Admin.dc.html"` passes; `grep -rliE "ecrã|As minhas|avaliaç|avaliar" .docs/designs/src/admin-app` finds nothing (exit 1); the other four templates are identical to HEAD's once their `<style>` blocks are set aside (only the compiled CSS changed); a second run of the generator for the five slugs and `pack.mjs` left no change in `git status`; `admin-app.html` served locally and opened in the browser pane: the 112 ids `AD-01-01`…`AD-11-08`, each drawn light and dark (224 frames), in pt-BR (`lang="pt-BR"`), the 21 tall entries of the inventory tall (42 frames, AD-03-01 at 1349 px, AD-11-08 at 1901 px), no `{{…}}` and none of the old wording
  > deviations: the browser pane can't open `file://` URLs, so the file was opened through a static server on localhost; the two temporary `.claude/launch.json` entries used to serve the web and the file were reverted. Opening the file showed a short class frame (AD-03-08) drawn tall and shorter than a phone, fixed in the web page before this generation (the T-07 fix). Eight of the inventory's tall entries (AD-07-01, AD-07-07, AD-07-12, AD-08-01, AD-10-05, AD-10-09, AD-11-03, AD-11-07) have mock content shorter than a phone, so their tall frames are 700–867 px high, as a tall frame is as high as its content (073 D-02) — the instructor page's IN-05-01..03 and IN-06-05 are drawn the same way.

### Verification

- [x] **T-09** — Run every command in the Verification Plan from the repo root; all pass. Record the output summary
  as evidence. Covers: all · Done when: every command exits 0, `check-coverage.mjs` prints `COVERAGE OK` and
  `run-e2e.mjs` prints `E2E PASSED`.
  > ✅ 2026-10-29 13:28 — ran the Verification Plan from the repo root: `node .specs/scripts/run-related-tests.mjs 075` → RELATED TESTS PASSED (apps/web, Vitest with coverage; the root `CLAUDE.md` has no test runner); `node .specs/scripts/check-coverage.mjs 075` → COVERAGE OK (327 changed source files: 245 excluded by technical-context — `apps/web/src/**`, `.docs/designs/**` —, 82 always excluded; no changed line to measure); `node .specs/scripts/run-e2e.mjs 075` → E2E PASSED (apps/web, 50 Playwright tests, the admin, instructor and student app tests among them; apps/backend not affected); `node --test .docs/designs/scripts/*.test.mjs` → 7 passed; `node .docs/designs/scripts/pack.mjs --check` → exit 0 (5 design files match their sources); `test ! -e ".docs/designs/src/admin-app/App Admin.dc.html"` → passes; `grep -rliE "ecrã|As minhas|avaliaç|avaliar" .docs/designs/src/admin-app` → nothing (exit 1); `npm test --workspace @rochas-surf-school/web` → 227 files, 736 tests passed; `npx turbo run lint check-types build --filter=@rochas-surf-school/web --force` → 9 tasks successful. User journeys: `admin-app.html` walked in the browser pane (T-08: 112 entries, light and dark, pt-BR, the tall frames at full height); the web page `/pt-br/designs/admin-app` walked in the browser pane (sections 01, 03, 04, 06 and 08 looked at against the mobile code, which led to the two fixes recorded under T-04 and T-07); the theme and language switching and the student and instructor pages' frames are covered by the e2e tests above.
  > files: none (verification only)
  > verified: as above
  > deviations: none

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

### Round 1 — 2026-10-29 — accepted

**Checks**

- lint ✅ · type check ✅ · build ✅ (`npx turbo run lint check-types build --filter=@rochas-surf-school/web --force`, 9 tasks, none cached)
- related tests ✅ `run-related-tests.mjs 075`: RELATED TESTS PASSED (apps/web, 183 files, 625 tests)
- coverage of the changed lines ✅ `check-coverage.mjs 075`: COVERAGE OK (327 changed files: 245 excluded by technical-context — `apps/web/src/**`, `.docs/designs/**` —, 82 always excluded); no coverage-ignore comments in the diff
- e2e ✅ `run-e2e.mjs 075`: E2E PASSED (apps/web, 50 Playwright tests)
- designs ✅ `pack.mjs --check` exits 0 (5 files) · `node --test .docs/designs/scripts/*.test.mjs` 7 passed · the old prototype is gone · the Portuguese-from-Portugal grep finds nothing
- the other four designs' templates are identical to the base commit's once their `<style>` blocks are set aside (only the compiled CSS changed)
- rerunning `build-design.mjs admin-app` against the current web build, then `pack.mjs admin-app`, leaves no change: the `.html` matches the page

**Expected Results**

- ER-01 ✅ — `admin-app.html` served locally: 112 ids `AD-01-01`…`AD-11-08`, 224 phone frames (light and dark), `lang="pt-BR"`, no `{{…}}` and no old wording; exactly the inventory's 21 tall entries are taller than 874 px or sized to their content, every other frame 874 px; the edge cases above pass
- ER-02 ✅ — `index lists the design pages in every language` (fifth card, its href, title and description in pt-br, es, en) and `redirects /designs/admin-app to the browser language` (307 to `/es/…`, and to `/pt-br/…` for `de`)
- ER-03 ✅ — `admin app shows every inventory entry` (pt-br, es, en: every id visible with its frame, title and note, 112 entries, the eleven sections in order, `<title>` and description, the `ST-…` / `IN-…` references, the admin tab bar, no enrolment banner or button on the AD-03 frames), and the student and instructor tests still pass. Walked the page against the mobile code: the home's two cards (rows, order, icons, badges, "Minhas aulas" only for an admin who teaches — `admin.screen.tsx`, `TeachingClassesEntryRow`), the class tools sheet (cards, subtitles, delete states — `class-tools-sheet.hook.ts`), the class details flags (`showTools`, `canTakeOut`, the banners — `class-details.screen.hook.ts`), the role actions per role and their looks (`constants/role-actions.ts`), the instructor flag only on an admin's sheet (`use-people-screen.hook.ts`), the location form's token-drawn map (D-07) and the 17 notification rows against `push-messages.ts`'s types
- ER-04 ✅ — `admin app follows the language`: AD-01-01's "Ferramentas" / "Herramientas" / "Tools", AD-06-01's interpolated counts, the notification row, the "other messages" label, and the header's language switch keeping the page
- ER-05 ✅ — `admin app follows the theme toggle` (AD-01-01's frame light → dark → kept on reload); and in the browser, with no stored choice and the OS set to dark, AD-01-01's frame draws the dark `page` (rgb(22, 27, 39))
- ER-06 ✅ — `design pages are wide` and `design pages fit a phone viewport` visit `/pt-br/designs/admin-app`; the rest of the suite passes

**Findings**

None.

**Notes**

- Eight tall entries (AD-07-01, AD-07-07, AD-07-12, AD-08-01, AD-10-05, AD-10-09, AD-11-03, AD-11-07) are 700–867 px high, shorter than a phone, because a tall frame is as high as its content (073 D-02); the instructor page draws IN-05-01..03 and IN-06-05 the same way (822 and 723 px). It follows the contract, but a stubby phone reads oddly, and the T-07 fix treated the same symptom on AD-03-08 as a defect. A minimum height of 874 px on tall frames, in the shared `phone-frame`, would fix both pages in a later spec.
- The deviations recorded under T-04 to T-07 (the code over the inventory, by 071 D-08) were checked where sampled and hold.
