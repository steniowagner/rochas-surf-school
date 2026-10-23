---
id: "057"
slug: teaching-classes
title: "\"Minhas aulas\" for instructors and admins who teach"
status: in-progress
created: 2026-10-23
started: 2026-10-23
base_commit: 30d2bccaa1cca3534931006e3117df3fefcda72e
fronts: [classes, backend, mobile]
depends_on: []
---

# 057 — "Minhas aulas" for instructors and admins who teach

## Goal

Instructors, and admins who teach, open "Minhas aulas" from the Escola section of their Início and see every class
they teach that hasn't ended: the classes under way on top, the rest grouped by day, and their next class standing
out. Today they can only find their classes by browsing the whole week on the Aulas tab. The endpoint and the screen
are shaped so the next spec, the past classes ("Aulas anteriores", PAINEL-04), only adds a history read and the
header's clock button.

## Context

- Product: [product.md](../../memory/product.md) — **Roles and permissions** (an instructor "sees every class, with the
  ones they teach under 'My classes' (the next one highlighted)"; "an admin can also teach, and then sees their classes
  under 'My classes' like an instructor"); **Class** (instructors are approved instructors or admins; states).
- Requirements: [requirements.md → Admins can teach](../../../.docs/requirements.md#admins-can-teach) — an admin assigned
  to a class sees it among their own classes, as instructors do;
  [user-journeys.md → Instructor](../../../.docs/user-journeys.md#instructor) — "View all classes, read-only, with the
  classes they teach under My classes" and "I'd like my next class to stand out at the top of My classes".
- Technical: [technical-context.md](../../memory/technical-context.md) — Classes (`ClassItem`, `toClassItem`,
  `ClassViewReader`, `ClassRosterReader`, the controller's route order), Mobile (TanStack Query keys under
  `["classes"]`, `ClassCard`, the Stack header), Automated validation (the backend e2e suite with a fixed clock).
- Module: [modules/classes.md](../../memory/modules/classes.md) — "My classes" for instructors and admins is listed there
  as coming with its own spec.
- Designs: `.docs/designs/instructor-app.html` — PAINEL-01 "Dashboard" (the "As minhas aulas" row, first under ESCOLA,
  "6 aulas atribuídas a ti") and PAINEL-03 "My classes" (screen `aulas`). pt-PT adapted to pt-BR. The admin's
  PAINEL-10 in `.docs/designs/admin-app.html` (week by week) is superseded by PAINEL-03 (D-05).
- Existing code this builds on:
  - `modules/classes/src/school-class/usecase/list-my-classes.usecase.ts` — the student's `ListMyClasses` (the pattern
    to follow: ids from a reader, views from `ClassViewReader.findByIds`, rosters, `toClassItem`), and
    `class-item.ts` (`ClassItem`, `canSeeGuestNames`, `toClassItem`).
  - `modules/classes/src/access/class-actor.ts` — `assertCanReadClasses` (`user.status.notApproved`).
  - `apps/backend/src/modules/classes/classes.controller.ts` — `GET /classes/mine` (students only) and the other
    routes; `apps/backend/src/modules/enrolment/my-classes-reader.prisma.ts` — the student's reader;
    `apps/backend/prisma/models/classes.model.prisma` — `ClassInstructor` (`class_instructors`).
  - `apps/mobile/src/modules/instructor/screens/instructor.screen.tsx` and
    `apps/mobile/src/modules/admin/screens/admin.screen.tsx` — the two homes, with their Escola section
    (`SchoolRulesEntryRow`, `PeopleEntryRow`).
  - `apps/mobile/src/modules/classes/components/class-card/` (`ClassCard`: state chips, occupancy, students footer),
    `apps/mobile/src/modules/classes/hooks/use-now.hook.ts`, `apps/mobile/src/modules/classes/utils/week.ts`
    (`schoolDayOf`), `apps/mobile/src/utils/calendar-dates.ts`, and the student's
    `apps/mobile/src/modules/enrolment/screens/my-classes.screen.tsx` (list, skeleton, error, empty, refresh).
  - `apps/mobile/src/constants/routes.ts` and `apps/mobile/src/app/(private)/{instructor,admin}/`.

## Scope

### In scope

- `GET /classes/teaching` for approved instructors and admins: the classes they teach that haven't ended, and whether
  they teach any class at all.
- A "Minhas aulas" row as the first row of the Escola section on the instructor's and the admin's home.
- The "Minhas aulas" screen of PAINEL-03 for both roles: the classes under way on grape cards, the rest grouped by day,
  the next class highlighted, cancelled classes in their day; loading, empty, error and refresh states.
- Copy in pt-BR, es-ES and en-US.

### Out of scope

- The past classes screen ("Aulas anteriores", PAINEL-04), its endpoint and the header's clock button — the next spec.
- The "Atualizada" chip of the design (nothing stored says a class was recently edited).
- A stored "also an instructor" flag or option on admin accounts.
- Filtering the list by sport, level or status; searching it; paging it.
- Marking one's own classes on the Aulas tab's cards or the class details.
- The admin's week-by-week PAINEL-10 layout and its "2 aulas como instrutor esta semana" row copy.
- The rest of PAINEL-01 (greeting, bell count, metrics, "Avaliações das aulas", "Ocupação semanal").
- Any change to the student's `GET /classes/mine` or "Minhas aulas" tab.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | "An admin who is also an instructor" is derived, not stored: an admin teaches when they are an instructor (a `class_instructors` row) of at least one class, in any state — not started, under way, ended or cancelled. A deleted class leaves nothing, so it doesn't count. | Each user has one role (product.md), and requirements.md → Admins can teach defines it by assignment. Counting ended classes keeps the row (and, next spec, the past classes) for an admin who only taught in the past. A stored flag would be a roles-and-permissions change of its own. |
| D-02 | Instructors always see the row, even with no class; the screen then shows its empty state. | Teaching is the instructor's role, and the past classes button will live on this screen. |
| D-03 | A new `GET /classes/teaching` (authenticated) answers `{ items: ClassItem[], teachesAny: boolean }`, declared before `GET /classes/:id`. Approved instructors and admins only: a student gets 403 `user.role.notTeacher`, an account that isn't approved 403 `user.status.notApproved`, no token 401. `GET /classes/mine` is untouched. The next spec adds `GET /classes/teaching/history`. | Keeps the student's contract and code as they are; one call gives both the list and the admin's row visibility. |
| D-04 | `items` are the classes the caller teaches whose end is after now (the classes module's clock), cancelled ones included, sorted by start then id, without paging. Each is a `ClassItem` built with `toClassItem` as `ListMyClasses` does: guests' names shown (the caller teaches the class) and `myEnrolment: null`. | Same contract and size assumptions as the student's list (spec 048); ended classes belong to the past classes screen. |
| D-05 | Both roles use PAINEL-03 (instructor-app.html); the admin's PAINEL-10 is superseded, row copy included. | The user's instruction: one screen for everyone who teaches. |
| D-06 | Layout: the classes under way (state `started`; a cancelled class is never under way) come first, in start order, each on an `OngoingClassCard`. The other items are grouped by the America/Fortaleza day of their start, in start order; each group has a header with the day's label on the left — "Hoje", "Amanhã", otherwise the weekday's full name ("Sexta") — and the short date ("19 set") on the right. The **next** class is the earliest item (start, then id) that hasn't started and isn't cancelled, on any day; its `ClassCard` gets the `sun` border and a "Próxima" chip. Cancelled classes stay in their day with the existing "Cancelada" chip. The state is computed with `useNow()` (refreshed every minute), and an item whose state is `finished` at that clock is no longer shown, without waiting for a refetch. | Follows PAINEL-03 and the journey "my next class to stand out". |
| D-07 | The row's subtitle counts the items that aren't cancelled (all items are classes that haven't ended): "{{count}} aula atribuída a você" / "{{count}} aulas atribuídas a você"; at zero "Nenhuma aula atribuída"; while loading or after an error, no subtitle. | The pt-BR form of PAINEL-01's "6 aulas atribuídas a ti"; a cancelled class isn't one they'll teach. |
| D-08 | The home row and the screen share one query, `["classes", "teaching"]` (under `["classes"]`, so every class mutation that invalidates `["classes"]` refreshes it). The home refetches it when it gains focus; so does the screen. On the admin's home the row renders only when the query has data with `teachesAny: true` — never while loading or after an error. On the instructor's home it always renders. | The admin's row must appear after they assign themselves to a class and come back, and must never flash. |
| D-09 | Copy (pt-BR / es-ES / en-US): row and screen title "Minhas aulas" / "Mis clases" / "My classes"; next chip "Próxima" / "Próxima" / "Up next"; the under-way chip reuses `classesWeek.state.started` ("Em andamento"); day labels "Hoje"/"Amanhã", "Hoy"/"Mañana", "Today"/"Tomorrow"; empty "Nada por aqui" + "Você ainda não tem aulas atribuídas." / "Nada por aquí" + "Aún no tienes clases asignadas." / "Nothing here" + "You don't have any classes assigned yet."; error "Algo deu errado" + "Não conseguimos carregar suas aulas. Verifique sua conexão e tente novamente." (and the es/en equivalents); zero subtitle "Nenhuma aula atribuída" / "Ninguna clase asignada" / "No classes assigned"; subtitle "N aula(s) atribuída(s) a você" / "N clase(s) asignada(s) a ti" / "N class(es) assigned to you". | The design is pt-PT ("As minhas aulas", "A decorrer", "Já a seguir"); the app is pt-BR, as in spec 048. |
| D-10 | The `OngoingClassCard` is a `grape` card with `onColor` text and icons, the `primary`-style elevation via `shadowStyle()`, and the same content as `ClassCard` (sport and level chips, "Em andamento" chip, time, location pill, occupancy bar and "N/M vagas", students footer). Any translucent fill it needs over grape (chips, location pill, bar track, footer) becomes a new token in `packages/design-tokens/src/tokens.ts` (light and dark), never a raw value. | CLAUDE.md: never hard-code colors; grape is the design system's highlight color. |
| D-11 | The screen is an inner screen above the tab bar (no tab bar, unlike the design's frame), with its title through `useLeftTitleHeader` + `StackHeaderTitle` and no `headerRight` in this spec. The routes are `/instructor/my-classes` and `/admin/my-classes`; a card opens `routes.<role>.classDetail(id)`. | The app's convention for inner screens (CLAUDE.md, structure.md). |
| D-12 | The mobile code lives in the `classes` module (`src/modules/classes/`): `TeachingClassesScreen`, `TeachingClassesEntryRow`, `OngoingClassCard`, `TeachingDayHeader`, `useTeachingClasses`, `utils/teaching-classes.ts`. | modules/classes.md says "My classes" for instructors and admins comes with the Classes module. |

## Expected Results

### ER-01 — The classes the caller teaches

- **Front:** backend
- **Behavior:** Given (clock fixed) an approved instructor I who teaches class A (ended), B (under way), C (tomorrow,
  cancelled) and D (next week), and class E taught only by someone else, when I calls `GET /classes/teaching`, then the
  API answers 200 with `items` = [B, C, D] in that order, each in the `ClassItem` shape with `myEnrolment: null` and the
  guests' names present, and `teachesAny: true`. The same holds for an approved admin assigned to the same classes.
- **Edge and error cases:** two classes with the same start are ordered by id; a class whose end equals now is absent
  (ended); a class where the caller is one of several instructors is present.
- **Verify by:** `npx jest test/school-class/usecase/list-teaching-classes.usecase.test.ts` (from `modules/classes`)
  and the "lists the classes the caller teaches" tests of `apps/backend/test/teaching-classes.e2e-spec.ts`
  (`node .specs/scripts/run-e2e.mjs 057`).

### ER-02 — Whether the caller teaches, and who may ask

- **Front:** backend
- **Behavior:** Given an approved admin who teaches no class, when they call `GET /classes/teaching`, then the API
  answers 200 `{ items: [], teachesAny: false }`; given an approved admin whose only class has ended, then 200
  `{ items: [], teachesAny: true }`.
- **Edge and error cases:** an admin whose only class is cancelled and hasn't ended gets that class in `items` and
  `teachesAny: true`; an approved instructor with no class gets `{ items: [], teachesAny: false }`; after the admin's
  only class is deleted, `teachesAny` is false; an approved student answers 403 `user.role.notTeacher`; a pending
  instructor answers 403 `user.status.notApproved`; no token answers 401.
- **Verify by:** `npx jest test/school-class/usecase/list-teaching-classes.usecase.test.ts` (from `modules/classes`),
  `npx vitest run src/modules/classes/teaching-classes-reader.prisma.spec.ts src/modules/classes/classes.controller.spec.ts`
  (from `apps/backend`) and the "teachesAny" and "access" tests of `apps/backend/test/teaching-classes.e2e-spec.ts`.

### ER-03 — The row on the instructor's home

- **Front:** mobile
- **Behavior:** Given an approved instructor, when the Início ("Painel") is shown, then the Escola section's first row
  is "Minhas aulas" with the subtitle "3 aulas atribuídas a você" when the query returns 3 items that aren't cancelled
  (a 4th cancelled item doesn't count), and pressing it opens `/instructor/my-classes`.
- **Edge and error cases:** zero non-cancelled items → "Nenhuma aula atribuída"; one → "1 aula atribuída a você"; while
  loading or after a failed request the row shows with no subtitle; the query is refetched when the home gains focus.
- **Verify by:** `npx jest src/modules/classes/components/teaching-classes-entry-row src/modules/instructor` (from
  `apps/mobile`), and the user journey "Instructor" in the Verification Plan.

### ER-04 — The row on the admin's home

- **Front:** mobile
- **Behavior:** Given an approved admin, when the home is shown and the query answers `teachesAny: true`, then the
  Escola section's first row is "Minhas aulas" with the same subtitle rules as ER-03, and pressing it opens
  `/admin/my-classes`; when it answers `teachesAny: false`, the row isn't rendered.
- **Edge and error cases:** while the query loads and after it fails, the row isn't rendered; when the home regains
  focus the query is refetched, so a `teachesAny` that turned true shows the row without restarting the app.
- **Verify by:** `npx jest src/modules/classes/components/teaching-classes-entry-row src/modules/admin/screens/admin.screen.test.tsx`
  (from `apps/mobile`), and the user journeys "Admin who teaches" and "Admin who doesn't teach".

### ER-05 — The layout of "Minhas aulas"

- **Front:** mobile
- **Behavior:** Given (now = Thursday 17 Sep, 08:00 Fortaleza) items B (today 07:30–09:00), N (today 09:00–10:00),
  L (today 19:00–20:00), T (tomorrow 11:00–12:00, cancelled) and F (Saturday 09:00–10:00), when the screen renders,
  then B is on an `OngoingClassCard` with the "Em andamento" chip above every group; then the header "Hoje" / "17 set"
  with N and L; "Amanhã" / "18 set" with T and its "Cancelada" chip; and "Sábado" / "19 set" with F. N alone has the
  "Próxima" chip and the sun border.
- **Edge and error cases:** with no class under way no grape card is shown; with two under way both are grape cards in
  start order; a cancelled class is never "Próxima" nor a grape card, even during its time slot; when the next class
  is days away it is still highlighted; when every remaining class is cancelled none is highlighted; with the clock moved to 09:00 (the `useNow`
  tick), without a refetch, B is no longer shown, N is a grape card and L has "Próxima".
- **Verify by:** `npx jest src/modules/classes/utils/teaching-classes.test.ts src/modules/classes/components/ongoing-class-card src/modules/classes/components/class-card src/modules/classes/screens/teaching-classes.screen.test.tsx`
  (from `apps/mobile`), and the user journey "Instructor".

### ER-06 — The screen's states and navigation

- **Front:** mobile
- **Behavior:** Given the screen opened from either home, then its Stack header reads "Minhas aulas" with the back
  button and nothing on the right, the tab bar isn't shown, and pressing a card opens that class's details
  (`/instructor/class/<id>` or `/admin/class/<id>`).
- **Edge and error cases:** while loading, skeleton cards announced as one loading state; no items → "Nada por aqui"
  with "Você ainda não tem aulas atribuídas."; a failed load → "Algo deu errado" with "Tentar novamente", which refetches;
  pull-to-refresh refetches; the query is refetched when the screen gains focus; all copy exists in pt-BR, es-ES and
  en-US.
- **Verify by:** `npx jest src/modules/classes/screens/teaching-classes.screen.test.tsx` (from `apps/mobile`), and the
  user journeys.

## Tasks

### Classes module (`modules/classes`)

- [x] **T-01** — Add the `TeachingClassesReader` port in `src/school-class/provider/teaching-classes-reader.provider.ts`
  (`findCurrentClassIds(teacherId, now)`: the classes whose end is after `now` where the person is an instructor,
  cancelled ones included, by start then id; `teachesAny(teacherId)`: an instructor of any class), its fake in
  `test/mock/fake-teaching-classes.reader.ts`, and `ListTeachingClasses` with `assertIsTeacher`
  (`user.role.notTeacher`) in `src/school-class/usecase/list-teaching-classes.usecase.ts` (D-03, D-04; items built with
  `ClassViewReader.findByIds`, the rosters and `toClassItem` as `ListMyClasses` does, with no viewer enrolment), exported
  from the barrels, with tests in `test/school-class/usecase/list-teaching-classes.usecase.test.ts`. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02 · Done when: `npx jest test/school-class` passes from `modules/classes`.
  > ✅ 2026-10-23 20:11 — added the `TeachingClassesReader` port (`findCurrentClassIds`, `teachesAny`), its fake and
  > `ListTeachingClasses` + `assertIsTeacher` (403 `user.status.notApproved`, then `user.role.notTeacher`); the id
  > read and `teachesAny` run together, then the views are sorted by start then id, the rosters read with
  > `CLASS_CARD_STUDENTS_LIMIT`, and each item built by `toClassItem` with the guests' names and no enrolment. Files:
  > `modules/classes/src/school-class/provider/teaching-classes-reader.provider.ts`,
  > `modules/classes/src/school-class/provider/index.ts`,
  > `modules/classes/src/school-class/usecase/list-teaching-classes.usecase.ts`,
  > `modules/classes/src/school-class/usecase/index.ts`, `modules/classes/test/mock/fake-teaching-classes.reader.ts`,
  > `modules/classes/test/mock/index.ts`, `modules/classes/test/school-class/usecase/list-teaching-classes.usecase.test.ts`;
  > verified: `npx jest test/school-class --coverage` (26 suites, 433 passed; the use case 100% statements, branches,
  > functions, lines) and `npm run check-types` (no errors); deviations: the `module-use-case` skill's mandatory
  > reference `modules/auth/src/user/usecase/register-user.usecase.ts` no longer exists, so the module's own
  > `ListMyClasses` was the pattern.

### Backend (`apps/backend`)

- [x] **T-02** — Add `src/modules/classes/teaching-classes-reader.prisma.ts` (`PrismaTeachingClassesReader`, over
  `class_instructors`) with `teaching-classes-reader.prisma.spec.ts`, and register it as a provider in
  `classes.module.ts`. Skill: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-01, ER-02 · Done when: `npx vitest run src/modules/classes/teaching-classes-reader.prisma.spec.ts` passes
  from `apps/backend`.
  > ✅ 2026-10-23 20:12 — added `PrismaTeachingClassesReader`: `findCurrentClassIds` is one `schoolClass.findMany`
  > (`endsAt > now`, `instructors: { some: { userId } }`, by `startsAt` then `id`; cancelled classes included) and
  > `teachesAny` one `classInstructor.findFirst` by `userId` (any class state; a deleted class's rows go with it by
  > cascade); registered in `ClassesModule`'s providers. Files: `apps/backend/src/modules/classes/teaching-classes-reader.prisma.ts`,
  > `apps/backend/src/modules/classes/teaching-classes-reader.prisma.spec.ts`, `apps/backend/src/modules/classes/classes.module.ts`;
  > verified: `npx vitest run src/modules/classes/teaching-classes-reader.prisma.spec.ts` (3 passed) and
  > `npx tsc --noEmit -p apps/backend` (no errors, after building `modules/classes`); deviations: none.

- [x] **T-03** — Add `GET /classes/teaching` to `src/modules/classes/classes.controller.ts` (before `:id`), with its
  cases in `classes.controller.spec.ts` and requests (instructor, admin, student 403, no token 401) in
  `classes.integration.http`. Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02 · Done when: `npx vitest run src/modules/classes/classes.controller.spec.ts` passes from
  `apps/backend`.
  > ✅ 2026-10-23 20:13 — added `GET /classes/teaching` (handler `teaching`, declared after `mine/history` and before
  > `:id`) running `ListTeachingClasses` with the new `PrismaTeachingClassesReader` constructor argument, the view and
  > roster readers and the classes clock; spec cases for its metadata (protected GET, 200), its order before `:id`, an
  > instructor and an admin at the clock's now, a student (`user.role.notTeacher`) and a pending account
  > (`user.status.notApproved`); REST Client requests for a teacher, a student (403) and no token (401). Files:
  > `apps/backend/src/modules/classes/classes.controller.ts`, `apps/backend/src/modules/classes/classes.controller.spec.ts`,
  > `apps/backend/src/modules/classes/classes.integration.http`; verified: `npx vitest run src/modules/classes/classes.controller.spec.ts`
  > (44 passed), `npx tsc --noEmit -p apps/backend` and `npm run lint -w apps/backend` (no errors; existing warnings in
  > other files only); deviations: none.

- [x] **T-04** — Add `test/teaching-classes.e2e-spec.ts` (fixed classes clock and fake `ExpoPushProvider` as in
  `my-classes.e2e-spec.ts`, deleting what each test creates) with the "lists the classes the caller teaches" cases
  (instructor, admin, order, exclusions, co-instructor), the "teachesAny" cases (none, ended only, cancelled, deleted)
  and the "access" cases (student 403, pending 403, no token 401).
  Covers: ER-01, ER-02 · Done when: `npm run test:e2e --workspace apps/backend` passes.
  > ✅ 2026-10-23 20:15 — added the e2e suite (classes clock fixed at 2026-10-14 10:00 Fortaleza, fake
  > `ExpoPushProvider`, each test's classes, location and users deleted after it): "lists the classes the caller teaches"
  > (an instructor and an admin: ended class left out, the under-way, the cancelled and next week's classes in that order,
  > another teacher's class left out, `myEnrolment: null` and the guest's name; same start by id; a class ending exactly now
  > left out; a co-taught class kept), "teachesAny" (none → false for admin and instructor; ended only → true; cancelled
  > not ended → listed and true; after the only class is deleted → false) and "access" (student 403
  > `user.role.notTeacher`, pending instructor 403 `user.status.notApproved`, no token 401). Files:
  > `apps/backend/test/teaching-classes.e2e-spec.ts`; verified: `npm run test:e2e --workspace apps/backend` (25 files, 665
  > passed; the first full run had 1 failure in `auth-session.e2e-spec.ts` "GET /auth/me returns the signed-in account…",
  > which passed alone (55/55) and on the full rerun — unrelated to this change); deviations: none.

### Mobile (`apps/mobile`)

- [x] **T-05** — Add `TeachingClassesResponse` to `src/modules/classes/classes.types.ts`, the hook
  `src/modules/classes/hooks/use-teaching-classes.hook.ts` (`["classes", "teaching"]`, `GET /classes/teaching`,
  authenticated, `retry: false`) and `src/modules/classes/utils/teaching-classes.ts` (the classes under way, the day
  groups with their label key and short date, the next class's id, the non-cancelled count — D-06, D-07), with tests
  `use-teaching-classes.hook.test.tsx` and `teaching-classes.test.ts`.
  Covers: ER-03, ER-04, ER-05 · Done when: `npx jest src/modules/classes/hooks/use-teaching-classes.hook.test.tsx src/modules/classes/utils/teaching-classes.test.ts`
  passes from `apps/mobile`.
  > ✅ 2026-10-23 20:17 — added `TeachingClassesResponse` (and the layout types `TeachingDayLabel`, `TeachingDay`,
  > `TeachingClassesLayout`) to `classes.types.ts`; `useTeachingClasses` (`["classes", "teaching"]`, authenticated
  > `GET /classes/teaching`, `retry: false`); `utils/teaching-classes.ts` with `layoutTeachingClasses(items, now)` (ended
  > items dropped at the given clock; `started` ones on top; the rest grouped by Fortaleza day with `today` / `tomorrow` /
  > `weekday`; `nextId` the first `not-started`, never a cancelled one), `countAssignedClasses` (items not cancelled) and
  > `formatShortDate` ("17 set", "17 Sep"). Files: `apps/mobile/src/modules/classes/classes.types.ts`,
  > `apps/mobile/src/modules/classes/hooks/use-teaching-classes.hook.ts`,
  > `apps/mobile/src/modules/classes/hooks/use-teaching-classes.hook.test.tsx`,
  > `apps/mobile/src/modules/classes/utils/teaching-classes.ts`, `apps/mobile/src/modules/classes/utils/teaching-classes.test.ts`;
  > verified: `npx jest src/modules/classes/hooks/use-teaching-classes.hook.test.tsx src/modules/classes/utils/teaching-classes.test.ts --coverage`
  > (2 suites, 9 passed; both files 100%), `npx tsc --noEmit` and `npx eslint` on the files (no errors); deviations: the
  > layout types live in `classes.types.ts` with the response, and `formatShortDate` was added there for the day header's date.

- [x] **T-06** — Add the `isNext` prop to `src/modules/classes/components/class-card/` (sun border and the "Próxima"
  chip) and the new `src/modules/classes/components/ongoing-class-card/` (D-10, adding tokens to
  `packages/design-tokens/src/tokens.ts` and regenerating `tokens.css` only if a translucent fill over grape is
  missing), with component tests and the copy in the three locales. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-05 · Done when: `npx jest src/modules/classes/components/class-card src/modules/classes/components/ongoing-class-card`
  passes from `apps/mobile` (and `npm run check-types -w @rochas-surf-school/design-tokens` if tokens changed).
  > ✅ 2026-10-23 20:22 — `ClassCard` takes `isNext`: while the class hasn't started (not cancelled) it shows the `sun`
  > "Próxima" chip (`time-outline`) first in the state slot, the `sun` border and the `primary` shadow (the hook returns
  > `next`). New `OngoingClassCard` (component, hook, types, index): a `grape` card with `shadowStyle("primary")`, the
  > discipline chip, the level and "Em andamento" chips on the existing `onHighlight` tone, the time in `text-on-color`, the
  > location pill, the occupancy bar (white fill, `bad` when full with `text-on-grape-bad`) and the students footer with
  > avatars in a grape ring. Tokens added (light and dark, `tokens.css` regenerated): `onGrapeTint`, `onGrapeFill`,
  > `onGrapeTrack`, `onGrapeShade`, `onGrapeBad`. Copy `teachingClasses.next` ("Up next" / "Próxima" / "Próxima").
  > Files: `packages/design-tokens/src/tokens.ts`, `packages/design-tokens/src/tokens.css`,
  > `apps/mobile/src/i18n/messages/en-US.ts`, `apps/mobile/src/i18n/messages/es-ES.ts`, `apps/mobile/src/i18n/messages/pt-BR.ts`,
  > `apps/mobile/src/modules/classes/components/class-card/class-card.component.tsx`,
  > `apps/mobile/src/modules/classes/components/class-card/class-card.hook.ts`,
  > `apps/mobile/src/modules/classes/components/class-card/class-card.types.ts`,
  > `apps/mobile/src/modules/classes/components/class-card/class-card.component.test.tsx`,
  > `apps/mobile/src/modules/classes/components/ongoing-class-card/index.ts`,
  > `apps/mobile/src/modules/classes/components/ongoing-class-card/ongoing-class-card.component.tsx`,
  > `apps/mobile/src/modules/classes/components/ongoing-class-card/ongoing-class-card.hook.ts`,
  > `apps/mobile/src/modules/classes/components/ongoing-class-card/ongoing-class-card.types.ts`,
  > `apps/mobile/src/modules/classes/components/ongoing-class-card/ongoing-class-card.component.test.tsx`;
  > verified: `npx jest src/modules/classes/components/class-card src/modules/classes/components/ongoing-class-card --coverage`
  > (all passed; both components and hooks 100%), `npm run check-types -w @rochas-surf-school/design-tokens` (CSS up to date),
  > `npx tsc --noEmit` and `npx eslint` in `apps/mobile` (no errors), `npx jest src/constants src/i18n` (passed); deviations:
  > the chips over grape reuse `Chip`'s existing `onHighlight` tone (white at 18%, the design's value) instead of a new chip
  > tone; its raw `bg-white/[.18]` class was left as it is (outside this task).

- [ ] **T-07** — Add `src/modules/classes/screens/teaching-classes.screen.tsx` (+ `.hook.ts`, `.types.ts`) with the
  `src/modules/classes/components/teaching-day-header/` component, `routes.instructor.myClasses` and
  `routes.admin.myClasses` in `src/constants/routes.ts`, and the routes `src/app/(private)/instructor/my-classes.tsx`
  and `src/app/(private)/admin/my-classes.tsx` (D-06, D-11), with tests in `teaching-classes.screen.test.tsx` and the
  copy in the three locales. Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-05, ER-06 · Done when: `npx jest src/modules/classes/screens/teaching-classes.screen.test.tsx src/modules/classes/components/teaching-day-header`
  passes from `apps/mobile`.

- [ ] **T-08** — Add `src/modules/classes/components/teaching-classes-entry-row/` (`role` prop: always rendered for
  `instructor`, only with `teachesAny` for `admin`; the subtitle of D-07; refetch on focus — D-08) and render it as the
  first row of the Escola section in `src/modules/instructor/screens/instructor.screen.tsx` and
  `src/modules/admin/screens/admin.screen.tsx`, opening `routes.<role>.myClasses`, with tests (the component's, and the
  two home screens' updated) and the copy in the three locales. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-03, ER-04 · Done when: `npx jest src/modules/classes/components/teaching-classes-entry-row src/modules/instructor src/modules/admin/screens/admin.screen.test.tsx`
  passes from `apps/mobile`.

### Verification

- [ ] **T-09** — Run every command in the Verification Plan from the repo root; all pass. Follow the user journeys on
  the iOS simulator and record the output summary and what was seen as evidence.
  Covers: all · Done when: every automated command exits 0 and the three user journeys are recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 057` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 057` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 057` — the backend e2e suite passes, including `teaching-classes.e2e-spec.ts`.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors (add `--filter=@rochas-surf-school/design-tokens` if T-06 changed the tokens).
  - `classes.integration.http` against `npm run dev` — `GET /classes/teaching` answers as ER-01 and ER-02.
- User journeys (iOS simulator, light and dark theme):
  - **Instructor**: as an approved instructor teaching a class under way, a later class today, a cancelled class
    tomorrow and a class next week, open Início → "Minhas aulas" is the first Escola row with "3 aulas atribuídas a
    você"; press it → "Minhas aulas" opens without the tab bar; the class under way is a grape card on top; "Hoje",
    "Amanhã" and the weekday headers show their dates; the later class today has "Próxima" and the sun border; the
    cancelled one shows "Cancelada"; pressing a card opens its details; back returns to the list.
  - **Admin who teaches**: as an approved admin with no class, the home has no "Minhas aulas" row; create a class with
    that admin as instructor, go back to the home → the row appears; the screen lists the class.
  - **Admin who doesn't teach**: as an approved admin never assigned to a class, the home never shows the row.

## Memory Impact

- `memory/product.md` — Current state: "Minhas aulas" for instructors and admins who teach (the row's visibility rule,
  the grouped list, the next class); remove "My classes for admins who teach" / "for instructors and admins" from the
  out-of-scope lists (specs 028 and 030), keeping the "marker on the cards of one's own classes" item.
- `memory/technical-context.md` — Classes: `GET /classes/teaching` (`{ items, teachesAny }`), `TeachingClassesReader`
  and `PrismaTeachingClassesReader`, the error `user.role.notTeacher`; Mobile: the `["classes", "teaching"]` query and
  its refetch on focus; any new design token.
- `memory/structure.md` — the `/instructor/my-classes` and `/admin/my-classes` routes, `TeachingClassesScreen`,
  `TeachingClassesEntryRow`, `OngoingClassCard`, `TeachingDayHeader`, `utils/teaching-classes.ts`; the homes' Escola
  section now starting with "Minhas aulas".
- `memory/modules.md` — None.
- `memory/modules/classes.md` — the teaching classes read: who teaches (D-01), what is listed (D-04), who may ask (D-03).

## Assumptions

- The number of classes one person teaches that haven't ended stays small enough to answer without paging (as the
  student's list in spec 048 assumes); accepted by the user with D-04.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
