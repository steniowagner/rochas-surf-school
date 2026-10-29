---
id: "074"
slug: designs-instructor-app
title: Instructor app designs page
status: in-progress
created: 2026-10-29
started: 2026-10-29
base_commit: 00b7be834f502e3f1ec2645ae078a7d9719a6a9e
fronts: [web, designs]
depends_on: []
---

# 074 — Instructor app designs page

## Goal

People interested in the app can open `/{lang}/designs/instructor-app` on the public site and see every screen an
instructor sees — the home with its entry rows, the classes tab, a class in read-only form, their classes and the
history of the ones they taught, the weekly occupancy, and the people, profile and notifications tabs — in every state
the app draws, in the theme and language picked in the site header. `instructor-app.html` in `.docs/designs` is then
generated from that page, in pt-BR with light and dark side by side, replacing the outdated European Portuguese
prototype and its ratings.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: the instructor role (reads classes, never edits
  them), classes and their states, trial guests, weekly occupancy, notifications, the public site's designs area (specs
  071–073); Out of scope → ratings, which the designs drop.
- Requirements: [requirements.md → 6.1 Public web pages](../../../.docs/requirements.md#61-public-web-pages) — the
  designs area this spec adds a page to;
  [1.3 User profiles](../../../.docs/requirements.md#13-user-profiles),
  [1.4 User roles](../../../.docs/requirements.md#14-user-roles),
  [1.5 School rules](../../../.docs/requirements.md#15-school-rules),
  [2.1 Notifications](../../../.docs/requirements.md#21-notifications) and
  [3.1 Class scheduling](../../../.docs/requirements.md#31-class-scheduling) — the instructor screens the page shows,
  as built;
  [user-journeys.md → header](../../../.docs/user-journeys.md#surf--skate-school-scheduling-platform---user-journeys)
  — its "Designs" line describes how each `.html` is produced, which D-05 changes for `instructor-app.html`.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Applications →
  `apps/web` (the `/designs` routes, `src/modules/designs/`, the dictionaries), Automated validation (Vitest and
  Playwright on web), Coverage (`apps/web/src/**` and `.docs/designs/**` are excluded).
- The decisions of the earlier design specs still apply: 071 (`.specs/finished/20261028214702-071-designs-foundation-design-system/`)
  — iOS frames, the app's copy through `appT` / `appRich`, unbuilt features left out, the fidelity rule (D-08), the
  app's glyphs, Fortaleza mock data, the typed list of design pages; 072
  (`.specs/finished/20261028223253-072-designs-auth-flow/`) — the web page is the source of its `.html` through
  `build-design.mjs <slug>` (D-01, A-01), one frame per visual state with the other messages in the note (D-02), mock
  texts typed by the school in the page's language (D-04); 073 (`.specs/finished/20261028234010-073-designs-student-app/`
  on its branch) — tall frames (D-02), the backend's notification texts in the dictionaries (D-05), shared screen
  mocks in `screens/shared/` that take what a role changes as props (D-07).
- Spec 073's code is on `spec/073-designs-student-app` until its pull request is merged; this spec extends it: the
  shared mocks `screens/shared/{class-details,people,profile,notifications,edit-profile,profile-whatsapp,school-rules-read}-screen`
  (their props are student-only today, for example `ClassDetailsState` and `ProfileScreenProps`), the student screens
  `screens/student/{agenda,my-classes,my-history}-screen`, and the building blocks they use (`discipline-filter`,
  `class-people`, `person-sheet`, `history-list-header`, `history-day-label`, `profile-*`, `notification-row`, the
  `tall` option of `phone-frame`).
- The app code the page reproduces, as it renders for an approved instructor: the routes in
  `apps/mobile/src/app/(private)/instructor/`; `apps/mobile/src/modules/instructor/screens/instructor.screen.tsx`
  (the home); `modules/classes/` (`classes-week` with `header="hidden"`, `class-details` and its hook's
  `readOnlyNoteKey` and `canEdit` rules, `teaching-classes`, `teaching-class-history`, `weekly-occupancy`, and their
  components such as `ongoing-class-card`, `teaching-day-header`, `occupancy-*`, `week-picker-sheet` and the entry
  rows); `modules/school-rules/components/school-rules-entry-row`; and the shared people, profile and notifications
  screens.
- Notification texts: `apps/backend/src/modules/notifications/push-messages.ts`.
- Current `instructor-app.html`: sources in `.docs/designs/src/instructor-app/` (`App Instrutor.dc.html`,
  `template.html`, `shell.html`, `bundle.json`), an x-dc prototype in European Portuguese with a ratings screen, and no
  loading, empty, error or toast states.
- What the page shows: [instructor-app-inventory.md](instructor-app-inventory.md) — 49 frames in six sections.

## Scope

### In scope

- The `/{lang}/designs/instructor-app` page with every frame of the inventory, its id and a note, following the
  header's theme and language, and its card on the designs index.
- The web building blocks and screen mocks it needs, and a `role` on the shared mocks of spec 073 so they draw the
  instructor's form.
- `instructor-app.html` generated from that page (pt-BR, light and dark side by side) by `build-design.mjs`, with the
  old prototype's sources removed.

### Out of scope

- The admin's forms of the shared screens and the admin page (spec 075).
- Ratings and anything else the app doesn't have.
- Repeating on this page the states of screens an instructor sees exactly as a student does (D-02).
- Frames with the keyboard open, Android frames, clickable prototypes.
- Changing any mobile or backend code or copy, and changing what the other design pages show.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The page shows only what an instructor sees: the instructor tab bar, the home, the "Aulas" tab without the user header or a "create" button, the class details in their read-only form (the note from `readOnlyNoteKey`, no enrolment, no tools), and the instructor-only screens. | Same rule as 073 D-01: one role per page. |
| D-02 | Screens an instructor sees exactly as a student does, apart from the tab bar and the role label — people, profile with its sheets, edit profile, WhatsApp, school rules, and the notifications' loading, empty, error and toast states — are drawn once, in their main frame, with a note naming the student page's frames that show their other states (`ST-…` ids). | Same approach as 072's AF-03-14: the page stays complete without about 35 frames identical to the student page's. |
| D-03 | The shared mocks of spec 073 get a `role` prop (`student` by default) and draw the instructor's form from it; `screens/student/agenda-screen` moves to `screens/shared/classes-week-screen` with `git mv`, and `my-history-screen` to `screens/shared/class-history-screen`, both with `role`. The student page shows the same frames as before. | The classes tab and the history are the same app screens for both roles (`ClassesWeekScreen`, `ClassHistory`); one mock each keeps them from drifting, and 075 adds the admin's form the same way. |
| D-04 | The home's entry row counts and subtitles, the occupancy numbers and the classes are mock data in `data/fortaleza.ts` (Fortaleza classes taught by its instructors); notification rows use the backend's in-app texts for the types an instructor receives (073 D-05). | Same mock data as the other pages (071 D-10). |
| D-05 | `instructor-app.html`'s sources are generated from `/pt-br/designs/instructor-app` by `node .docs/designs/scripts/build-design.mjs instructor-app` and packed with `pack.mjs`; `instructor-app` joins the generator's slugs, and the old prototype (`App Instrutor.dc.html` and its template) is removed. | Same as 072 D-01: the web page is the single source of truth. |
| D-06 | Instructor-only screen mocks live in `apps/web/src/modules/designs/screens/instructor/`; the page sections are `components/instructor-app-{home,classes,class,my-classes,occupancy,more}/`, composed by `pages/instructor-app/`. Each folder follows `.claude/rules/react.md`. | Same structure as the student page (073 D-07). |

## Expected Results

### ER-01 — instructor-app.html shows the app's instructor screens

- **Front:** designs
- **Behavior:** Given `.docs/designs/instructor-app.html` opened in a browser, then it shows every entry of
  [instructor-app-inventory.md](instructor-app-inventory.md) with its id, in pt-BR, each in light and dark side by
  side, matching the web page `/pt-br/designs/instructor-app`, with the tall frames drawn at their full height.
- **Edge and error cases:** `.docs/designs/src/instructor-app/App Instrutor.dc.html` no longer exists; no European
  Portuguese wording and no ratings screen is left (for example "ecrã", "Já a seguir", "As minhas", "Avaliar");
  regenerating the other three designs changes them only in the compiled CSS (072 A-01); `pack.mjs --check` exits 0.
- **Verify by:** `node .docs/designs/scripts/pack.mjs --check` exiting 0,
  `test ! -e ".docs/designs/src/instructor-app/App Instrutor.dc.html"`,
  `grep -rliE "ecrã|Já a seguir|As minhas|avaliar" .docs/designs/src/instructor-app` finding nothing, and opening
  the file in a browser to walk the inventory.

### ER-02 — The designs index lists the instructor app

- **Front:** web
- **Behavior:** Given `/{lang}/designs` for each of `pt-br`, `es` and `en`, then it shows a card for the instructor
  app after the student app's, with its title and description in that language, linking to
  `/{lang}/designs/instructor-app`.
- **Edge and error cases:** `/designs/instructor-app` without a language redirects with 307 to the browser's
  language (pt-br when none matches); the other cards don't change; no card for the admin page.
- **Verify by:** `apps/web/e2e/designs.e2e.ts` → `index lists the design pages in every language` and
  `redirects /designs/instructor-app to the browser language`, run by `node .specs/scripts/run-e2e.mjs 074`.

### ER-03 — The instructor app page shows every inventory frame

- **Front:** web
- **Behavior:** Given `/{lang}/designs/instructor-app`, then for every id in
  [instructor-app-inventory.md](instructor-app-inventory.md) an element with `data-design-id="<id>"` is visible,
  showing the entry's title, its note and its iOS phone frame, which matches the app as an instructor sees it by 071's
  fidelity rule (D-08); the notes of D-02 entries name the student page's frames.
- **Edge and error cases:** the six sections are in the inventory's order; the page sets its translated `<title>` and
  description; the tab screens draw the instructor tab bar (Início, Aulas, Pessoas, Perfil); no class-details frame
  shows an enrolment banner, a footer button or the tools; the student app page still shows every one of its
  frames as before (D-03).
- **Verify by:** `apps/web/e2e/designs.e2e.ts` → `instructor app shows every inventory entry` (pt-br, es and en) and
  the existing `student app shows every inventory entry`, and the reviewer walking the page against the mobile code.

### ER-04 — The instructor app page follows the page language

- **Front:** web
- **Behavior:** Given `/{lang}/designs/instructor-app`, then the copy inside the frames is the app's copy in that
  language, the notification rows are the backend's texts in that language, and the section titles and notes are in
  that language: for example IN-03-01's note reads the pt-BR `classDetails.readOnly.teaches` on `/pt-br`, the es-ES
  text on `/es` and the en-US text on `/en`.
- **Edge and error cases:** choosing another language in the header opens the same page in that language;
  interpolated values and plurals (counts, dates, percentages) are filled, with no `{{…}}` or raw tags on the page.
- **Verify by:** `apps/web/e2e/designs.e2e.ts` → `instructor app follows the language`.

### ER-05 — The instructor app page follows the header theme

- **Front:** web
- **Behavior:** Given `/{lang}/designs/instructor-app`, when the visitor presses the header's theme toggle, then
  every frame switches to the other palette, and the choice is kept on reload.
- **Edge and error cases:** without a stored choice the page follows the OS color scheme.
- **Verify by:** `apps/web/e2e/designs.e2e.ts` → `instructor app follows the theme toggle` (the computed background
  of the IN-01-01 frame changes between the light and dark `page` token values).

### ER-06 — The instructor app page fits wide and phone viewports

- **Front:** web
- **Behavior:** Given a 1600 px wide viewport, then the page's content is up to 1440 px wide; given a 375 px wide
  viewport, then `/{lang}/designs/instructor-app` has no horizontal scroll and the phone frames, tall ones included,
  are scaled down to fit.
- **Edge and error cases:** the existing e2e tests of the site and the other design pages keep passing.
- **Verify by:** `apps/web/e2e/designs.e2e.ts` → `design pages are wide` and `design pages fit a phone viewport`,
  both covering the instructor app page.

## Tasks

### Web (`apps/web`)

- [x] **T-01** — Add to `apps/web/src/modules/designs/components/` the building blocks of the instructor screens,
  with the mobile names and props: `teaching-classes-entry-row` (assigned count, none, no subtitle),
  `school-rules-entry-row`, `weekly-occupancy-entry-row`, `ongoing-class-card`, `teaching-day-header`,
  `occupancy-week-bar`, `occupancy-stats`, `occupancy-map` (cells by tone, cancelled cell, selected cell, legend),
  `occupancy-map-skeleton` and `week-picker-sheet`; extend `class-people` with the instructor's rows ("you", no
  instructor assigned, trial guests) if 073 didn't draw them; add any glyph they draw to the `app-icon` registry.
  Each folder per `.claude/rules/react.md`, with a Vitest test rendering its variants. Skill:
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices). Covers: enabling · Done when:
  `npx vitest run src/modules/designs/components` passes in `apps/web` and
  `npm run check-types --workspace @rochas-surf-school/web` exits 0.
  > ✅ 2026-10-29 10:52 — added the instructor building blocks with the mobile names, each per `.claude/rules/react.md` with a Vitest test of its variants: `teaching-classes-entry-row` (count, none, no subtitle), `school-rules-entry-row` (instructor/admin subtitle, empty, no subtitle), `weekly-occupancy-entry-row`, `ongoing-class-card`, `teaching-day-header`, `occupancy-week-bar`, `occupancy-stats` (+ its child `occupancy-stat`), `occupancy-map` (+ its children `occupancy-cell`, with the app's tone thresholds in `occupancy-cell.constants.ts`, and `occupancy-legend`), `occupancy-map-skeleton` and `week-picker-sheet`; `class-people` now takes `guests` and `expanded` (a row per student, then the guests, with guest avatars among the stacked ones), with the children `class-student-row`, `class-guest-row` and `guest-avatar`. No new glyph was needed (`MaterialCommunityIcons:surfing`, `SimpleLineIcons:graph`, `Feather:home`, `Feather:user` were already in the registry).
  > files: `apps/web/src/app/globals.css`, `apps/web/src/modules/designs/utils/entry-row-container.ts`, `apps/web/src/modules/designs/utils/entry-row-container.types.ts`, `apps/web/src/modules/designs/utils/entry-row-container.test.ts`, `apps/web/src/modules/designs/components/{teaching-classes-entry-row,school-rules-entry-row,weekly-occupancy-entry-row,ongoing-class-card,teaching-day-header,occupancy-week-bar,occupancy-stat,occupancy-stats,occupancy-cell,occupancy-legend,occupancy-map,occupancy-map-skeleton,week-picker-sheet,class-student-row,class-guest-row,guest-avatar}/*` (new), `apps/web/src/modules/designs/components/class-people/class-people.{component.tsx,types.ts,component.test.tsx}`, `apps/web/src/modules/designs/components/calendar-month-grid/calendar-month-grid.{component.tsx,types.ts,component.test.tsx}`
  > verified: `npx vitest run src/modules/designs/components src/modules/designs/utils` in `apps/web` (113 files, 310 tests passed); `npm run check-types --workspace @rochas-surf-school/web` exits 0; the student app page's static markup (`renderToStaticMarkup`, pt-br, es and en) is byte-identical to the base commit's
  > deviations: small steps added inside the task — `globals.css` maps the `onGrape*` colors and the `occupancyCell` / `swatch` radii (tokens that existed but weren't Tailwind utilities on web); `calendar-month-grid` takes `dotPlacement` (`overlap` for the week picker, as the mobile grid); `utils/entry-row-container` mirrors the mobile helper the three entry rows share; the children `occupancy-stat`, `occupancy-cell`, `occupancy-legend`, `class-student-row`, `class-guest-row` and `guest-avatar` are their own folders (react.md §5), with the mobile names.

- [x] **T-02** — Give the shared mocks a `role` (D-03): `git mv` `screens/student/agenda-screen` to
  `screens/shared/classes-week-screen` and `screens/student/my-history-screen` to
  `screens/shared/class-history-screen` (renaming their components and types), update the student page's imports;
  add `role` to `classes-week-screen` (the instructor's: no user header or band, no enrolment on the cards),
  `class-history-screen` (the `teachingHistory` copy), `class-details-screen` (the instructor's read-only states of
  IN-03-01 to IN-03-14), `people-screen`, `profile-screen` and `notifications-screen` (the instructor tab bar, role
  label and notification rows). Extend each screen's Vitest test with the instructor's states, keeping the student's.
  Skill: [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices). Covers: ER-03 · Done
  when: `npx vitest run src/modules/designs` passes in `apps/web` and the student app's e2e test
  `student app shows every inventory entry` still passes.
  > ✅ 2026-10-29 11:20 — `git mv` `screens/student/agenda-screen` → `screens/shared/classes-week-screen` (`AgendaScreen` → `ClassesWeekScreen`, `AgendaState` → `ClassesWeekState`) and `screens/student/my-history-screen` → `screens/shared/class-history-screen` (`MyHistoryScreen` → `ClassHistoryScreen`, `MyHistoryState` → `ClassHistoryState`); the student page's sections import them. `role` (`student` by default) added to: `classes-week-screen` (instructor: the calendar at the top with today, Monday 7, selected, no user header or band, the day's cards without an enrolment, skate as the filtered sport, the instructor tab bar on "Aulas"), `class-history-screen` (the `teachingHistory` copy, with the intro that gives way to the header's title on the empty and error states, as the app's `ClassHistory withIntro`), `class-details-screen` (the instructor's states `teaches`, `notAssigned`, `noInstructor`, `full`, `guests`, `noStudents`, `started`, `finished`, `classCancelled` and the load states, and the sheets `person` and `rules`: the `readOnlyNoteKey` note under the people, no enrolment banner, footer or tools; the props are a union by `role`, and `getClassDetailsView` in the constants resolves either role's state into what the screen draws), `people-screen` and `profile-screen` (the instructor tab bar; "Instrutor" and Rafael Rocha in the profile header). `class-full-banner` draws its title only without `waitingList` (the instructor's). Instructor mock data: `data/instructor-app.ts` (tab bar, the instructor's dates) and, in `data/fortaleza.ts`, the signed-in instructor (Rafael Rocha), the other instructor, the trial guests and the day's classes (D-04). Each screen's test now covers the instructor's states, the student's kept.
  > files: `apps/web/src/modules/designs/screens/shared/classes-week-screen/{index.ts,classes-week-screen.component.tsx,classes-week-screen.types.ts,classes-week-screen.component.test.tsx}` (moved from `screens/student/agenda-screen/`), `apps/web/src/modules/designs/screens/shared/class-history-screen/{index.ts,class-history-screen.component.tsx,class-history-screen.types.ts,class-history-screen.component.test.tsx}` (moved from `screens/student/my-history-screen/`), `apps/web/src/modules/designs/screens/shared/class-details-screen/class-details-screen.{component.tsx,constants.ts,types.ts,component.test.tsx}`, `apps/web/src/modules/designs/screens/shared/people-screen/people-screen.{component.tsx,types.ts,component.test.tsx}`, `apps/web/src/modules/designs/screens/shared/profile-screen/profile-screen.{component.tsx,types.ts,component.test.tsx}`, `apps/web/src/modules/designs/components/class-full-banner/class-full-banner.{component.tsx,types.ts,component.test.tsx}`, `apps/web/src/modules/designs/components/student-app-agenda/student-app-agenda.component.tsx`, `apps/web/src/modules/designs/components/student-app-my-classes/student-app-my-classes.component.tsx`, `apps/web/src/modules/designs/data/fortaleza.ts`, `apps/web/src/modules/designs/data/instructor-app.ts`
  > verified: `npx vitest run src/modules/designs` in `apps/web` (142 files, 462 tests passed); `npx playwright test e2e/designs.e2e.ts -g "student app"` (4 passed, `student app shows every inventory entry` among them); `npm run check-types --workspace @rochas-surf-school/web` exits 0; the student app page's static markup (pt-br, es, en) is byte-identical to the base commit's
  > deviations: `notifications-screen` gets no `role`: it has no tab bar and no role label, and its rows come from `items`, so a `role` would change nothing it draws (the instructor's rows are passed by the page, T-04). Following the code over the inventory (071 D-08): IN-03-05 doesn't show `classDetails.includesTrial` — the app shows it only to admins (`showTrialCount={canEdit}`); IN-03-10's person sheet shows the WhatsApp row and no e-mail — class details opens `PersonSheet` without `email`. The instructor mock data was added here and in T-03 rather than all in T-04, since these mocks need it.

- [x] **T-03** — Write the instructor-only screen mocks in `screens/instructor/` (D-06): `home-screen` (IN-01-01 to
  IN-01-03), `teaching-classes-screen` (IN-04-01 to IN-04-07) and `weekly-occupancy-screen` (IN-05-01 to IN-05-07),
  reading the app copy through `appT` / `appRich`, with a Vitest test per screen covering every state. Skill:
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices). Covers: ER-03 · Done when:
  `npx vitest run src/modules/designs/screens` passes in `apps/web`.
  > ✅ 2026-10-29 11:35 — wrote the instructor-only screen mocks in `screens/instructor/`, each per `.claude/rules/react.md`, reading the app copy through `appT`, with a Vitest test covering every state: `home-screen` (IN-01-01..03: the user header on `page`, the "Escola" card with the three entry rows — assigned count, none, and no counts while loading — and the instructor tab bar on "Início"), `teaching-classes-screen` (IN-04-01..07: the intro that gives way to the title on the empty and error states, the history `HeaderButton`, the ongoing class card, the days "Hoje", "Amanhã" and the weekday name with their short dates, "Próxima" on the next class, the sport filter without a tab bar, surf-only and the empty, empty-filter, loading and error states), `weekly-occupancy-screen` (IN-05-01..07: the week bar for this and next week, the stats, the map with every tone, a cancelled cell and two classes at one time on Saturday, the default (emptiest) or the full class selected with its `ClassCard`, the week picker sheet over a phone-height frame, loading, empty and error). Mock data (D-04): `instructorHome`, `teachingClasses` and `occupancyClasses` in `data/fortaleza.ts`; `occupancyWeek` (days, rows per start time, stats over the classes not cancelled, the default selection, as the app's `weekly-occupancy` utils) and the week and month captions in `data/instructor-app.ts`.
  > files: `apps/web/src/modules/designs/screens/instructor/home-screen/{index.ts,home-screen.component.tsx,home-screen.types.ts,home-screen.component.test.tsx}`, `apps/web/src/modules/designs/screens/instructor/teaching-classes-screen/{index.ts,teaching-classes-screen.component.tsx,teaching-classes-screen.types.ts,teaching-classes-screen.component.test.tsx}`, `apps/web/src/modules/designs/screens/instructor/weekly-occupancy-screen/{index.ts,weekly-occupancy-screen.component.tsx,weekly-occupancy-screen.types.ts,weekly-occupancy-screen.component.test.tsx}`, `apps/web/src/modules/designs/data/fortaleza.ts`, `apps/web/src/modules/designs/data/instructor-app.ts`
  > verified: `npx vitest run src/modules/designs/screens` in `apps/web` passes (the 3 new files: 12 tests); the whole designs suite `npx vitest run src/modules/designs` 145 files, 474 tests passed; `npm run check-types --workspace @rochas-surf-school/web` exits 0
  > deviations: the history screen of IN-04-08..12 is the shared `class-history-screen` with `role="instructor"` (T-02, D-03), so it isn't in `screens/instructor/`.

- [x] **T-04** — Write the instructor app page: the six section components composed by `pages/instructor-app/`, the
  route `src/app/[lang]/designs/instructor-app/page.tsx` with `generateMetadata`, the 49 ids in
  `data/instructor-app-ids.ts` set as `data-design-id`; the section titles, entry titles, notes (with the other
  messages and the `ST-…` references of D-02), the instructor notification texts and the index card text in the three
  dictionaries and `dictionary.types.ts`; the instructor mock data in `data/fortaleza.ts` (D-04); add
  `instructor-app` to `data/design-pages.ts`. In `e2e/designs.e2e.ts`, extend
  `index lists the design pages in every language` to the fourth card, add
  `redirects /designs/instructor-app to the browser language`, `instructor app shows every inventory entry`,
  `instructor app follows the language` and `instructor app follows the theme toggle`, and run
  `design pages are wide` and `design pages fit a phone viewport` on the instructor app page too. Skill:
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices). Covers: ER-02, ER-03, ER-04,
  ER-05, ER-06 · Done when: `npm run test:e2e --workspace @rochas-surf-school/web` passes and
  `npx turbo run lint check-types build --filter=@rochas-surf-school/web` succeeds.
  > ✅ 2026-10-29 12:20 — wrote the instructor app page: `data/instructor-app-ids.ts` (the 49 ids `IN-<section>-<entry>` and each entry's other app messages, with the values they are drawn with: counts and the translated sport), `i18n/instructor-app-note.ts` (the note plus those messages), the six sections `components/instructor-app-{home,classes,class,my-classes,occupancy,more}` (each entry a `DesignEntry` with `data-design-id`), composed by `pages/instructor-app/`, and the route `src/app/[lang]/designs/instructor-app/page.tsx` with `generateMetadata`; `instructor-app` added to `data/design-pages.ts` (the index's fourth card). The three dictionaries and `dictionary.types.ts` got `designs.pages.instructorApp` and `instructorApp` (titles, sections, the 49 entries' titles and notes — the D-02 ones naming the student page's `ST-…` frames —, the mock class notes and cancellation rules, and the in-app texts of the 12 notification types the backend sends an instructor: `class.assigned`, `class.reminder`, `class.message`, `class.edited`, `class.unassigned`, `class.cancelled`, `class.deleted`, `location.changed`, `role.changed`, `reactivation.approved`, `account.restored`, `broadcast`, from `push-messages.ts`). `notification-row` draws the app's icons of `class.assigned`, `class.unassigned` and `class.deleted`. `e2e/designs.e2e.ts`: the index test expects the fourth card, and adds `redirects /designs/instructor-app to the browser language`, `instructor app shows every inventory entry` (pt-br, es, en: every id visible with its frame, title and note, the section order, `<title>` and description, no `{{…}}`, the instructor tab bar, no enrolment banner or enrolment/tools button in the class frames), `instructor app follows the language` and `instructor app follows the theme toggle` (IN-01-01's frame background light → dark → kept on reload); `design pages are wide` and `design pages fit a phone viewport` also visit the instructor page.
  > files: `apps/web/src/app/[lang]/designs/instructor-app/page.tsx`, `apps/web/src/modules/designs/pages/instructor-app/{index.ts,instructor-app.page.tsx,instructor-app.types.ts,instructor-app.page.test.tsx}`, `apps/web/src/modules/designs/components/instructor-app-{home,classes,class,my-classes,occupancy,more}/{index.ts,*.component.tsx,*.types.ts,*.component.test.tsx}`, `apps/web/src/modules/designs/data/instructor-app-ids.ts`, `apps/web/src/modules/designs/data/design-pages.ts`, `apps/web/src/modules/designs/data/fortaleza.ts`, `apps/web/src/modules/designs/i18n/instructor-app-note.ts`, `apps/web/src/modules/designs/i18n/instructor-app-note.test.ts`, `apps/web/src/modules/designs/components/notification-row/notification-row.{component.tsx,component.test.tsx}`, `apps/web/src/modules/designs/screens/shared/edit-profile-screen/edit-profile-screen.{component.tsx,types.ts,component.test.tsx}`, `apps/web/src/modules/designs/screens/shared/class-details-screen/class-details-screen.types.ts`, `apps/web/src/i18n/dictionary.types.ts`, `apps/web/src/i18n/dictionaries/{pt-br,es,en}.ts`, `apps/web/e2e/designs.e2e.ts`
  > verified: `npm run test:e2e --workspace @rochas-surf-school/web` (46 passed); `npx turbo run lint check-types build --filter=@rochas-surf-school/web` (9 tasks successful); `npx vitest run src/modules/designs src/i18n` in `apps/web` (154 files, 510 tests passed); the student app page's static markup is still byte-identical to the base commit's
  > deviations: `edit-profile-screen` also takes `role` (the instructor's name and e-mail in IN-06-03, instead of the student's), with its test; the class details' `texts.denialReason` / `takeOutReason` are optional, since the instructor's form has none; the instructor page's `h1` gets `hyphens-auto break-words`: "INSTRUTOR" at the wordmark's 104 px is wider than a 375 px column, which made the page scroll sideways (ER-06).

### Designs (`.docs/designs`)

- [ ] **T-05** — Add `instructor-app` to the slugs of `.docs/designs/scripts/build-design.mjs`; run it for
  `instructor-app`, which removes the old prototype sources; regenerate `design-system`, `auth-flow` and
  `student-app` so their compiled CSS is current; pack the four files; update the Designs commands in `CLAUDE.md`
  with the new slug. Covers: ER-01 · Done when: `pack.mjs --check` exits 0,
  `test ! -e ".docs/designs/src/instructor-app/App Instrutor.dc.html"` passes,
  `grep -rliE "ecrã|Já a seguir|As minhas|avaliar" .docs/designs/src/instructor-app` finds nothing, the other three
  designs' sources changed only in their CSS, a second run of the generator changes nothing, and
  `instructor-app.html` opened in a browser shows the 49 entries in light and dark.

### Verification

- [ ] **T-06** — Run every command in the Verification Plan from the repo root; all pass. Record the output summary
  as evidence. Covers: all · Done when: every command exits 0 and `check-coverage.mjs` prints `COVERAGE OK` and
  `run-e2e.mjs` prints `E2E PASSED`.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 074` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 074` — every line this spec adds or changes is covered
    (`apps/web/src/**` and `.docs/designs/**` are excluded by technical-context)
  - `node .specs/scripts/run-e2e.mjs 074` — the web Playwright suite passes, including the instructor app tests of
    `e2e/designs.e2e.ts` and the existing student app tests
  - `node --test .docs/designs/scripts/*.test.mjs` — the pack and unpack tests still pass
  - `node .docs/designs/scripts/pack.mjs --check` — every `.html` matches its sources
  - `test ! -e ".docs/designs/src/instructor-app/App Instrutor.dc.html"` — the old prototype is gone
  - `grep -rliE "ecrã|Já a seguir|As minhas|avaliar" .docs/designs/src/instructor-app` — finds nothing
  - `npm test --workspace @rochas-surf-school/web` and
    `npx turbo run lint check-types build --filter=@rochas-surf-school/web` — the web tests, lint, type check and
    build pass
- User journeys (followed in a browser):
  - Open `.docs/designs/instructor-app.html`: every inventory entry is there with its id, in pt-BR, light and dark
    side by side, the tall frames at full height; spot-check frames against the mobile screens by 071's D-08.
  - Run the web app, open `/pt-br/designs/instructor-app`, switch the theme and the language from the header: the
    frames follow both; open `/pt-br/designs/student-app` and check it still shows its frames as before.

## Memory Impact

- `memory/product.md` — the designs area also shows the instructor app (`/{lang}/designs/instructor-app`); Source
  documents: `instructor-app.html` is generated from that page, and the old prototype's ratings screen is gone.
- `memory/technical-context.md` — Applications → `apps/web`: `src/modules/designs/screens/instructor/`, the `role`
  of the shared screen mocks and the `instructor-app` route; the designs commands: `build-design.mjs` also takes
  `instructor-app`.
- `memory/structure.md` — `apps/web/src/modules/designs/screens/instructor`, the moved
  `screens/shared/{classes-week,class-history}-screen`, and `src/app/[lang]/designs/instructor-app/`.
- `memory/modules.md` — None (no business module changes).

## Assumptions

- Spec 073's pull request (`spec/073-designs-student-app`) is merged into `main` before this spec is executed, since
  T-02 changes its mocks; `spec-execute` branches from wherever it starts.
- The notification texts follow `push-messages.ts` as it is when T-04 runs; a later change to those texts doesn't
  update the designs by itself.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)
- [Instructor app inventory](instructor-app-inventory.md)

## Amendments

## Review
