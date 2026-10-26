---
id: "062"
slug: teaching-class-history
title: "\"Aulas anteriores\" for instructors and admins who teach"
status: in-progress
created: 2026-10-25
started: 2026-10-25
base_commit: 7e24beb4104034a849e151dfcbde4d9699207649
fronts: [classes, backend, mobile]
depends_on: []
---

# 062 — "Aulas anteriores" for instructors and admins who teach

## Goal

Instructors, and admins who teach, see the classes they have already taught. A clock button on the right of their
"Minhas aulas" header opens "Aulas anteriores", the same screen the student's history is: a calendar of the month (or
the week) with a dot on each day they taught, the period's classes under a label per day, newest first, a day filter
and the surf/skate filter. Today they can only find a past class by browsing the Aulas tab week by week.

## Context

- Product: [product.md](../../memory/product.md) — the classes a person **teaches** (spec 057), the student's
  **history** read one period at a time (specs 048 and 053), Roles and permissions.
- Requirements: [user-journeys.md → Instructor](../../../.docs/user-journeys.md#instructor) — "As an instructor, I'd
  like to see all the classes I've taught. The Past classes screen groups them by day and can be filtered by day, week
  or month."; [requirements.md → Admins can teach](../../../.docs/requirements.md#admins-can-teach) — an admin who
  teaches sees their classes as instructors do.
- Technical: [technical-context.md](../../memory/technical-context.md) — Classes (`ClassItem`, `toClassItem`,
  `ClassViewReader`, `ClassRosterReader`, `TeachingClassesReader`, the controller's route order), Mobile (TanStack
  Query keys under `["classes"]`, `WeekMonthCalendar`, `HeaderButton`, the Stack header), Automated validation (the
  backend e2e suite with a fixed clock; mobile journeys in the iOS simulator).
- Module: [modules/classes.md](../../memory/modules/classes.md) — the teaching classes read.
- Designs: `.docs/designs/instructor-app.html` — PAINEL-03 "My classes" ("The clock icon opens past classes
  (PAINEL-04)") and PAINEL-04 "Past classes". PAINEL-04's photo and rating counts are not built (D-03). The student's
  `.docs/designs/student-app.html` MINHAS-05 is the layout actually followed.
- Existing code this builds on:
  - `modules/classes/src/school-class/usecase/list-my-class-history.usecase.ts` — the student's `ListMyClassHistory`
    (period validation `class.from.invalid` / `class.to.invalid` / `class.range.invalid`,
    `MY_CLASS_HISTORY_MAX_DAYS = 42`, ids from a reader, views from `ClassViewReader.findByIds`).
  - `modules/classes/src/school-class/usecase/list-teaching-classes.usecase.ts` — `ListTeachingClasses` and
    `assertIsTeacher` (`user.role.notTeacher`, `user.status.notApproved`); `toClassItem(view, roster, undefined, true)`.
  - `modules/classes/src/school-class/provider/teaching-classes-reader.provider.ts` — `TeachingClassesReader`
    (`findCurrentClassIds`, `teachesAny`); its fake `modules/classes/test/mock/fake-teaching-classes.reader.ts`.
  - `apps/backend/src/modules/classes/teaching-classes-reader.prisma.ts` — `PrismaTeachingClassesReader`;
    `apps/backend/src/modules/enrolment/my-classes-reader.prisma.ts` — the student's history query (period on
    `starts_at`, `ends_at <= now`, not cancelled, newest first).
  - `apps/backend/src/modules/classes/classes.controller.ts` — `GET /classes/mine/history`, `GET /classes/teaching`,
    then `GET /classes/:id`; `apps/backend/test/teaching-classes.e2e-spec.ts`.
  - `apps/mobile/src/modules/enrolment/screens/my-class-history.screen.tsx` (+ `.hook.ts`, `.types.ts`, `.test.tsx`),
    `apps/mobile/src/modules/enrolment/components/{history-day-label,history-list-header}/`,
    `apps/mobile/src/modules/enrolment/utils/class-history.ts`, `apps/mobile/src/modules/enrolment/hooks/use-my-class-history.hook.ts`
    — the student's history.
  - `apps/mobile/src/modules/enrolment/screens/my-classes.screen.tsx` — the student's clock `HeaderButton`
    (`icon="time-outline"`) opening `routes.student.myHistory`.
  - `apps/mobile/src/modules/classes/screens/teaching-classes.screen.tsx` (+ hook, types, test) — "Minhas aulas" for
    instructors and admins (`role` prop), its header today only a centered `StackHeaderTitle`.
  - `apps/mobile/src/constants/routes.ts` and `apps/mobile/src/app/(private)/{instructor,admin}/`.

## Scope

### In scope

- `GET /classes/teaching/history?from&to` for approved instructors and admins: the classes they taught in the period.
- A clock `HeaderButton` on the right of the "Minhas aulas" header, for instructors and admins.
- The "Aulas anteriores" screen for both roles, with the student's history layout and states, and its copy in pt-BR,
  es-ES and en-US.
- Moving the history pieces the two screens share into the mobile classes module (D-04), the student's history
  behaving exactly as before.

### Out of scope

- PAINEL-04's photo and rating counts on the cards (ratings and photos are not built yet).
- A "Hoje" button on the history's calendar; keeping the chosen period or day after leaving the screen.
- Paging, searching, or filtering by level or status.
- A link to the history from anywhere but the "Minhas aulas" header (the homes' Escola row is unchanged).
- Any change to the student's `GET /classes/mine/history`, its screen's behavior or copy.
- Any change to `GET /classes/teaching` or to the "Minhas aulas" list itself.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | A class the caller **taught** is one where they are one of the instructors (a `class_instructors` row), whose end is at or before now (the classes module's clock), and that isn't cancelled. A class under way is not listed yet. A class belongs to a period by the America/Fortaleza day its start falls on. | A cancelled class wasn't taught; the same rules as the student's history (spec 048, 053), so both screens read alike. Approved by the user. |
| D-02 | `GET /classes/teaching/history?from=YYYY-MM-DD&to=YYYY-MM-DD` (authenticated), declared before `GET /classes/:id`, answers `{ items: ClassItem[] }`, newest first (start descending, then id descending), unpaged. The period is validated exactly as `GET /classes/mine/history`: `from` / `to` missing or not a real date → 400 `class.from.invalid` / `class.to.invalid` (both reported when both are wrong); a period shorter than 1 day or longer than 42 days counting both ends → 400 `class.range.invalid`. Access is that of `GET /classes/teaching` (`assertIsTeacher`): a student 403 `user.role.notTeacher`, an account that isn't approved 403 `user.status.notApproved`, no token 401. Items are built with `toClassItem(view, roster, undefined, true)`: guests' names shown, `myEnrolment: null`. The period validation is shared with `ListMyClassHistory`, not copied. | Spec 057 D-03 reserved this route; reusing the student's period contract lets the mobile app reuse its calendar and state. Approved by the user. |
| D-03 | The screen is the student's history, not PAINEL-04: it opens on Fortaleza's current month with no day selected and can switch to the week; each day of the period with one or more classes shows one dot; tapping a day narrows the list to it (no request) and its chip clears it; the surf/skate `DisciplineFilter` floats at the bottom and filters the loaded period (no request); the classes sit under a label per day, newest first, on `ClassCard`; pull to refresh; skeleton, error with "Try again", and the empty states for the period and the day (with and without a sport). A card opens `routes.<role>.classDetail(id)`. The header shows the centered `StackHeaderTitle` "Aulas anteriores" and the native back button. | The user journey asks for day, week or month; the design's photo and rating counts depend on modules that don't exist. Approved by the user. |
| D-04 | The history pieces both screens use move to `apps/mobile/src/modules/classes/`: `HistoryDayLabel` and `HistoryListHeader` (`components/`), `utils/class-history.ts`, the screen's state (period, day, sport, rows, loading/error/empty/refresh) as a shared hook that takes the period's query and the class route, and the layout (calendar, legend, list header, list, states, filter) as a `ClassHistory` component that takes the copy. `MyClassHistoryScreen` (enrolment) and the new `TeachingClassHistoryScreen` (classes) are thin wrappers over them. Their tests move with them; the student's screen test keeps its assertions. | The enrolment module already imports from classes; classes importing from enrolment would make the dependency go both ways, and copying would duplicate about 300 lines. Approved by the user. |
| D-05 | The query is `useQuery` keyed `["classes", "teaching", "history", from, to]`, `retry: false`, `GET /classes/teaching/history?from=…&to=…` authenticated (`useTeachingClassHistory`). The routes are `/instructor/my-history` and `/admin/my-history` (`routes.instructor.myHistory`, `routes.admin.myHistory`), inner screens without the tab bar like `/<role>/my-classes`. | Under `["classes"]`, every class mutation's invalidation refreshes it, as the student's (spec 053 D-10); the route names match the student's `/student/my-history`. |
| D-06 | Copy (new `teachingHistory` keys; pt-BR / es-ES / en-US): title and header button label "Aulas anteriores" / "Clases pasadas" / "Past classes"; legend "Dias em que você deu aula" / "Días en que diste clase" / "Days you taught a class"; day accessibility mark "você deu aula" / "diste clase" / "you taught a class"; empty day "Sem aulas neste dia" + "Você não deu nenhuma aula neste dia." / "Você não deu nenhuma aula de {{sport}} neste dia." (es "Sin clases este día" + "No diste ninguna clase este día." / "No diste ninguna clase de {{sport}} este día."; en "No classes this day" + "You didn't teach any class this day." / "You didn't teach any {{sport}} class this day."); empty period the same with "neste período" / "en este período" / "in this period" and the titles "Sem aulas neste período" / "Sin clases en este período" / "No classes in this period"; error "Algo deu errado" + "Não conseguimos carregar suas aulas anteriores. Verifique sua conexão e tente novamente." / "Algo salió mal" + "No pudimos cargar tus clases pasadas. Revisa tu conexión e inténtalo de nuevo." / "Something went wrong" + "We couldn't load your past classes. Check your connection and try again."; "Todas as aulas", "Limpar {{date}}" and "Carregando as aulas" (and their es/en) as in the student's history. | The student's copy says "you took a class", which reads wrong for a teacher. Approved by the user. |

## Expected Results

### ER-01 — The history lists the classes taught in the period

- **Front:** backend
- **Behavior:** Given an approved instructor who taught two ended classes on 2026-08-10 and 2026-08-20, when they call
  `GET /classes/teaching/history?from=2026-08-01&to=2026-08-31`, then the API answers 200 with
  `{ items: [<2026-08-20 class>, <2026-08-10 class>] }`, each a `ClassItem` with `myEnrolment: null` and its guests'
  names shown.
- **Edge and error cases:** a cancelled class that ended is left out; a class under way (started, not ended) is left
  out; a class ending exactly now is listed; a class taught together with another instructor is listed; a class the
  caller doesn't teach is left out; a class starting on the day before `from` or after `to` (America/Fortaleza) is left
  out; two classes starting together are ordered by id descending; an approved admin who taught a class gets it; a
  period with nothing answers `{ items: [] }`.
- **Verify by:** `npx jest test/school-class/usecase/list-teaching-class-history.usecase.test.ts` (from
  `modules/classes`) · `npx vitest run src/modules/classes/teaching-classes-reader.prisma.spec.ts src/modules/classes/classes.controller.spec.ts`
  (from `apps/backend`) · `apps/backend/test/teaching-classes.e2e-spec.ts` "history" cases through
  `node .specs/scripts/run-e2e.mjs 062`.

### ER-02 — The period and the caller are checked

- **Front:** backend
- **Behavior:** Given a caller of `GET /classes/teaching/history`, when `from` or `to` is missing or isn't a real
  `YYYY-MM-DD` date, then the API answers 400 with `class.from.invalid` and/or `class.to.invalid`; when the period
  is shorter than 1 day (`to` before `from`) or longer than 42 days counting both ends, then 400 `class.range.invalid`.
- **Edge and error cases:** a 42-day period is accepted, a 43-day one refused; a one-day period (`from` = `to`) is
  accepted; an approved student gets 403 `user.role.notTeacher`; a pending instructor gets 403
  `user.status.notApproved`; no token gets 401.
- **Verify by:** `npx jest test/school-class/usecase/list-teaching-class-history.usecase.test.ts` (from
  `modules/classes`) · `apps/backend/test/teaching-classes.e2e-spec.ts` "history" validation and access cases through
  `node .specs/scripts/run-e2e.mjs 062`.

### ER-03 — The clock button opens the past classes

- **Front:** mobile
- **Behavior:** Given an instructor or an admin on "Minhas aulas", then the header's right shows a clock
  `HeaderButton` (`time-outline`) whose accessibility label is "Aulas anteriores" (en-US "Past classes"); when they
  press it, then `routes.instructor.myHistory` (`/instructor/my-history`) or `routes.admin.myHistory`
  (`/admin/my-history`) opens.
- **Edge and error cases:** the button shows while the list is loading, empty or failed.
- **Verify by:** `npx jest src/modules/classes/screens/teaching-classes.screen.test.tsx` (from `apps/mobile`) · the
  user journeys in the Verification Plan.

### ER-04 — The past classes screen

- **Front:** mobile
- **Behavior:** Given an instructor or an admin who taught classes, when "Aulas anteriores" opens, then it requests
  the current Fortaleza month's grid period, the calendar marks each day with a taught class with one dot, the legend
  reads "Days you taught a class", and the classes show under a label per day, newest first; tapping a day lists only
  that day's classes and shows its chip, and clearing the chip lists the period again; choosing surf or skate lists
  only that sport; pressing a card opens `routes.<role>.classDetail(id)`.
- **Edge and error cases:** while an uncached period loads, `ClassCardSkeleton` cards show; a failed load shows the
  error state "We couldn't load your past classes…" with "Try again", which refetches; a period with no class shows
  "No classes in this period" + "You didn't teach any class in this period." (with a sport: "You didn't teach any
  surf class in this period."); a selected day with no class shows "No classes this day" with the day's description;
  an expired session shows no error state.
- **Verify by:** `npx jest src/modules/classes/screens/teaching-class-history.screen.test.tsx src/modules/classes/hooks/use-teaching-class-history.hook.test.tsx`
  (from `apps/mobile`) · the user journeys in the Verification Plan.

### ER-05 — The student's history keeps its behavior

- **Front:** mobile
- **Behavior:** Given the history pieces moved to the classes module, when the student's history screen tests run,
  then every case they had before this spec passes with the same assertions (calendar, legend "Days you took a
  class", day and sport filters, day labels, loading, error, empty and refresh states, a card opening
  `routes.student.classDetail(id)`).
- **Edge and error cases:** the student's copy (`myHistory.*`) and its query key `["classes", "mine", "history", from, to]`
  are unchanged.
- **Verify by:** `npx jest src/modules/enrolment/screens/my-class-history.screen.test.tsx src/modules/enrolment/hooks/use-my-class-history.hook.test.tsx`
  (from `apps/mobile`), its `it(...)` assertions unchanged against `git diff <base_commit>` (only imports may change).

## Tasks

### Classes (`modules/classes`)

- [x] **T-01** — Add `findHistoryClassIds(teacherId, now, from, to): Promise<string[]>` to `TeachingClassesReader`
  (`src/school-class/provider/teaching-classes-reader.provider.ts`) and to its fake
  (`test/mock/fake-teaching-classes.reader.ts`); extract the period validation of `ListMyClassHistory` into a shared
  function in `src/school-class/usecase/` and use it there; add `ListTeachingClassHistory`
  (`src/school-class/usecase/list-teaching-class-history.usecase.ts`, D-01, D-02) with its exports, and
  `test/school-class/usecase/list-teaching-class-history.usecase.test.ts` for every case of ER-01 and ER-02 the
  domain decides. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02 · Done when: `npx jest test/school-class/usecase` passes from `modules/classes`, with
  `list-my-class-history.usecase.test.ts` unchanged and green.
  > ✅ 2026-10-25 — added `findHistoryClassIds` to the reader and its fake (a third `history` constructor argument and
  > `historyCalls`); moved the period validation of `ListMyClassHistory` into `toHistoryPeriod`
  > (`class-history-period.ts`, also home of `MY_CLASS_HISTORY_MAX_DAYS`, still exported from the package); added
  > `ListTeachingClassHistory`; files: `modules/classes/src/school-class/provider/teaching-classes-reader.provider.ts`,
  > `modules/classes/test/mock/fake-teaching-classes.reader.ts`,
  > `modules/classes/src/school-class/usecase/class-history-period.ts`,
  > `modules/classes/src/school-class/usecase/list-my-class-history.usecase.ts`,
  > `modules/classes/src/school-class/usecase/list-teaching-class-history.usecase.ts`,
  > `modules/classes/src/school-class/usecase/index.ts`,
  > `modules/classes/test/school-class/usecase/list-teaching-class-history.usecase.test.ts`; verified:
  > `npx jest test/school-class/usecase` from `modules/classes` (14 suites, 345 passed, `list-my-class-history`
  > unchanged), `npx tsc --noEmit` clean; deviations: none

### Backend (`apps/backend`)

- [x] **T-02** — Implement `PrismaTeachingClassesReader.findHistoryClassIds` in
  `src/modules/classes/teaching-classes-reader.prisma.ts` (instructor of the class, `ends_at <= now`, not cancelled,
  `starts_at` in `[from, to)`, start then id descending), with cases in `teaching-classes-reader.prisma.spec.ts`.
  Skill: [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-01 · Done when: `npx vitest run src/modules/classes/teaching-classes-reader.prisma.spec.ts` passes.
  > ✅ 2026-10-25 — `PrismaTeachingClassesReader.findHistoryClassIds` (`findMany`: `endsAt <= now`, not cancelled,
  > `startsAt` in `[from, to)`, instructor, start then id descending); files:
  > `apps/backend/src/modules/classes/teaching-classes-reader.prisma.ts`,
  > `apps/backend/src/modules/classes/teaching-classes-reader.prisma.spec.ts`; verified:
  > `npx vitest run src/modules/classes/teaching-classes-reader.prisma.spec.ts` (4 passed); deviations: none

- [x] **T-03** — Expose `GET /classes/teaching/history` (authenticated, `from` / `to` query) in
  `src/modules/classes/classes.controller.ts`, declared after `GET teaching` and before `GET :id`, with its case in
  `classes.controller.spec.ts`, the requests in `classes.integration.http`, and a "history" describe in
  `test/teaching-classes.e2e-spec.ts` covering ER-01 and ER-02 (listed, cancelled, under way, ending now, shared,
  someone else's, out of period, order, admin, empty; invalid dates, range, 403s, 401). Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02 · Done when: `npx vitest run src/modules/classes/classes.controller.spec.ts` and
  `npx vitest run --config ./vitest.config.e2e.ts test/teaching-classes.e2e-spec.ts` pass from `apps/backend`.
  > ✅ 2026-10-25 — `GET /classes/teaching/history` (`teachingHistory`, after `teaching`, before `one`); files:
  > `apps/backend/src/modules/classes/classes.controller.ts`,
  > `apps/backend/src/modules/classes/classes.controller.spec.ts`,
  > `apps/backend/src/modules/classes/classes.integration.http`,
  > `apps/backend/test/teaching-classes.e2e-spec.ts` ("history" describe, 8 cases); verified:
  > `npx vitest run src/modules/classes` (16 files, 170 passed), `npx vitest run --config ./vitest.config.e2e.ts
  > test/teaching-classes.e2e-spec.ts` (20 passed), `npx tsc --noEmit` clean after rebuilding `modules/classes`;
  > deviations: the period errors answer **422**, not the 400 that D-02 and ER-02 write — the shared
  > `ValidationException` is 422, as in `GET /classes/mine/history` ("validated exactly as") — the spec's "400"
  > looks like a slip; `.http` requests and e2e assert 422. Not run: the `.http` requests against `npm run dev`
  > (Verification Plan, T-08).

### Mobile (`apps/mobile`)

- [x] **T-04** — Move `HistoryDayLabel`, `HistoryListHeader` and `utils/class-history.ts` from
  `src/modules/enrolment/` to `src/modules/classes/` with their tests; extract the history screen's state into a
  shared hook and its layout into `src/modules/classes/components/class-history/` (D-04), and rebuild
  `src/modules/enrolment/screens/my-class-history.screen.tsx` (+ hook, types) on them. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-05 · Done when: `npx jest src/modules/enrolment src/modules/classes/components src/modules/classes/utils`
  passes, `my-class-history.screen.test.tsx` changed only in imports, and `npx tsc --noEmit` exits 0.
  > ✅ 2026-10-25 — moved (`git mv`) `HistoryDayLabel`, `HistoryListHeader` and `utils/class-history.ts` (+ tests) from
  > enrolment to classes; `ClassHistoryDay` moved to `classes.types.ts` next to a new `ClassHistoryPeriod`; the
  > screen's state became `useClassHistory({ useHistoryQuery, classRoute })` and its layout `ClassHistory({ history,
  > copy })` (`copy` = the i18n namespace, `myHistory` / `teachingHistory`) in
  > `apps/mobile/src/modules/classes/components/class-history/`; `MyClassHistoryScreen` is a thin wrapper and its
  > own hook and types files were removed; files: `apps/mobile/src/modules/classes/components/class-history/{index.ts,
  > class-history.component.tsx,class-history.hook.ts,class-history.types.ts}`,
  > `apps/mobile/src/modules/classes/components/history-day-label/*`,
  > `apps/mobile/src/modules/classes/components/history-list-header/*`,
  > `apps/mobile/src/modules/classes/utils/class-history.ts`, `…/class-history.test.ts`,
  > `apps/mobile/src/modules/classes/classes.types.ts`, `apps/mobile/src/modules/enrolment/enrolment.types.ts`,
  > `apps/mobile/src/modules/enrolment/screens/my-class-history.screen.tsx`, deleted
  > `apps/mobile/src/modules/enrolment/screens/my-class-history.screen.{hook,types}.ts`; verified:
  > `npx jest src/modules/enrolment src/modules/classes/components src/modules/classes/utils` (84 suites, 767
  > passed), `my-class-history.screen.test.tsx` untouched (`git diff` empty), `npx tsc --noEmit` and eslint clean;
  > deviations: `ClassHistory` and `useClassHistory` have no tests of their own in this task; the student's screen
  > test exercises them (full coverage is checked in T-08)

- [x] **T-05** — Add `TeachingClassHistoryResponse` to `src/modules/classes/classes.types.ts` and
  `src/modules/classes/hooks/use-teaching-class-history.hook.ts` (D-05), with
  `use-teaching-class-history.hook.test.tsx` (key, URL with the period, authenticated, no retry).
  Covers: ER-04 · Done when: `npx jest src/modules/classes/hooks/use-teaching-class-history.hook.test.tsx` passes.
  > ✅ 2026-10-25 — `TeachingClassHistoryResponse` in `classes.types.ts` and `useTeachingClassHistory`
  > (key `["classes","teaching","history",from,to]`, authenticated, no retry); files:
  > `apps/mobile/src/modules/classes/classes.types.ts`,
  > `apps/mobile/src/modules/classes/hooks/use-teaching-class-history.hook.ts`,
  > `apps/mobile/src/modules/classes/hooks/use-teaching-class-history.hook.test.tsx`; verified:
  > `npx jest src/modules/classes/hooks/use-teaching-class-history.hook.test.tsx` (4 passed); deviations: the period
  > type is the shared `ClassHistoryPeriod` (added to `classes.types.ts` in T-04)

- [x] **T-06** — Add `TeachingClassHistoryScreen` (`src/modules/classes/screens/teaching-class-history.screen.tsx`
  + hook, types, `role` prop) on the shared history pieces, `myHistory` for `instructor` and `admin` in
  `src/constants/routes.ts`, the route files `src/app/(private)/instructor/my-history.tsx` and
  `src/app/(private)/admin/my-history.tsx`, the `teachingHistory` copy of D-06 in
  `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`, and `teaching-class-history.screen.test.tsx` for every case of ER-04.
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-04 · Done when: `npx jest src/modules/classes/screens/teaching-class-history.screen.test.tsx` passes.
  > ✅ 2026-10-25 — `TeachingClassHistoryScreen` (a wrapper over `useClassHistory` / `ClassHistory` with the
  > `teachingHistory` copy and `routes[role].classDetail`), `routes.instructor.myHistory` /
  > `routes.admin.myHistory`, the two route files, and the D-06 copy in the three languages; files:
  > `apps/mobile/src/modules/classes/screens/teaching-class-history.screen.tsx`,
  > `apps/mobile/src/modules/classes/screens/teaching-class-history.screen.types.ts`,
  > `apps/mobile/src/modules/classes/screens/teaching-class-history.screen.test.tsx`,
  > `apps/mobile/src/constants/routes.ts`, `apps/mobile/src/app/(private)/instructor/my-history.tsx`,
  > `apps/mobile/src/app/(private)/admin/my-history.tsx`,
  > `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`; verified:
  > `npx jest src/modules/classes/screens/teaching-class-history.screen.test.tsx` (19 passed, the student's cases
  > with the teaching copy and both roles' card route), `npx tsc --noEmit` and eslint clean; deviations: the
  > screen has no hook file (it only wires `useClassHistory`); the shared layout keeps the testIDs
  > `my-history-*`

- [x] **T-07** — Add the clock `HeaderButton` (`time-outline`, label `teachingHistory.title`) as `headerRight` of
  `src/modules/classes/screens/teaching-classes.screen.tsx`, opening `routes[role].myHistory` from the screen's hook,
  with cases in `teaching-classes.screen.test.tsx` for both roles and for the loading, empty and error states.
  Covers: ER-03 · Done when: `npx jest src/modules/classes/screens/teaching-classes.screen.test.tsx` passes.
  > ✅ 2026-10-25 — `HeaderButton` (`time-outline`, label `teachingHistory.title`) as `headerRight` of
  > `TeachingClassesScreen`; `openHistory` in its hook (`router.push(routes[role].myHistory)`) and result type;
  > files: `apps/mobile/src/modules/classes/screens/teaching-classes.screen.tsx`,
  > `apps/mobile/src/modules/classes/screens/teaching-classes.screen.hook.ts`,
  > `apps/mobile/src/modules/classes/screens/teaching-classes.screen.types.ts`,
  > `apps/mobile/src/modules/classes/screens/teaching-classes.screen.test.tsx`; verified:
  > `npx jest src/modules/classes/screens/teaching-classes.screen.test.tsx` (39 passed), `npx tsc --noEmit` and
  > eslint clean; deviations: two existing assertions changed because the header now has a button — "nothing on the
  > right" (now asserts the button) and "the filter's is the only button" in the filtered-empty cases (now the
  > history button and the filter)

### Verification

- [ ] **T-08** — Run every command in the Verification Plan from the repo root; all pass. Follow the user journeys
  in the iOS simulator. Record the output summary as evidence. Covers: all · Done when: every command exits 0 and
  every journey shows what it says.
  > ➕ 2026-10-25 (requested by the user after T-07, outside the spec's tasks): "Minhas aulas" and the teaching "Aulas
  > anteriores" show `ScreenIntro` (icon `calendar-outline` / `time-outline`, title, new `teachingClasses.description`
  > / `teachingHistory.description` copy) as the list's header with the collapsing header title; on the error and
  > empty states the intro is dropped and the plain header title shows. `ClassHistory` takes `withIntro` (the
  > student's history is unchanged); files: `apps/mobile/src/modules/classes/screens/teaching-classes.screen.tsx`,
  > `apps/mobile/src/modules/classes/components/class-history/*`,
  > `apps/mobile/src/modules/classes/screens/teaching-class-history.screen.tsx`, their tests,
  > `apps/mobile/src/i18n/messages/*.ts`. `npx jest src/modules/classes src/modules/enrolment` 1304 passed; not seen in
  > the simulator (the app wouldn't open "My classes" on the last try).
  > ⛔ 2026-10-25 — automated part done, journeys only partly done. Passed: `node .specs/scripts/run-related-tests.mjs
  > 062` (RELATED TESTS PASSED: backend, mobile, modules/classes, modules/enrolment), `check-coverage.mjs 062`
  > (COVERAGE OK, 17 files), `npx turbo run lint check-types build --filter=…classes --filter=…backend
  > --filter=…mobile` (27 tasks successful). `run-e2e.mjs 062` is **E2E FAILED**: 710 of 713 backend e2e tests pass,
  > including all 20 of `teaching-classes.e2e-spec.ts`; the 3 failures are in `test/classes.e2e-spec.ts` →
  > "suggestions" (two) and "keeps the suggestions route" — files this spec doesn't touch, whose cases seed
  > classes at fixed October 2026 dates and read them against the real clock (today is Sun 2026-10-25), so they
  > depend on the date, not on this change (confirmed: the same 3 fail with `apps/backend/src` and `modules/classes/src` checked out at `base_commit`, so they pre-exist this spec). Journeys in the iOS simulator
  > (backend from this branch via `npm run dev`, Metro already serving the repo): as the signed-in admin, dark
  > theme — Início → "My classes" → clock button on the header's right → "Past classes" opened with October 2026,
  > a dot on each day taught, the legend "Days you taught a class", the classes under "SUN, 25 OCT"…, tapping day
  > 18 selected it and narrowed the list to it with the "18 OCT" chip. Not done: the instructor account, light
  > theme, the cancelled class's day without a dot, the sport filter, the previous month and the week, a card
  > opening its details, the student's history, and the `classes.integration.http` requests with a token. Needs
  > the user (or an instructor and a student review account in the simulator).

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 062` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 062` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 062` — the backend e2e suite passes, including the "history" cases of
    `teaching-classes.e2e-spec.ts`.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
  - `classes.integration.http` against `npm run dev` — `GET /classes/teaching/history` answers as ER-01 and ER-02.
- User journeys (iOS simulator, light and dark theme):
  - **Instructor**: as an approved instructor who taught classes this month and last month (one of them cancelled),
    open Início → "Minhas aulas" → the clock button on the header's right opens "Aulas anteriores"; the calendar shows
    this month with a dot on each day taught (not on the cancelled class's day); the list shows those classes under
    their day labels, newest first; tap a day → only its classes and its chip; clear the chip → the month again;
    choose surf → only surf classes; go to last month → its classes; switch to the week → that week's; press a card →
    its details; back returns to the history.
  - **Admin who teaches**: as an approved admin who taught a class that ended, open "Minhas aulas" → the clock button
    → the class is listed on its day.
  - **Student**: open "Minhas aulas" → clock → "Aulas anteriores" behaves as before (legend "Dias em que você fez
    aula").

## Memory Impact

- `memory/product.md` — the classes a person **taught** (D-01) and the teaching history read one period at a time,
  for instructors and admins who teach.
- `memory/technical-context.md` — Classes: `GET /classes/teaching/history` (`{ items }`, the shared period
  validation), `TeachingClassesReader.findHistoryClassIds`, `ListTeachingClassHistory`; Mobile: the
  `["classes", "teaching", "history", from, to]` query and the history pieces now in the classes module (D-04).
- `memory/structure.md` — the `/instructor/my-history` and `/admin/my-history` routes, `TeachingClassHistoryScreen`,
  `ClassHistory`, and `HistoryDayLabel`, `HistoryListHeader`, `utils/class-history.ts` moved from enrolment to classes.
- `memory/modules.md` — None.
- `memory/modules/classes.md` — the teaching history: what counts as taught (D-01), who may read it and the period
  rules (D-02).

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)
- Spec 053 (the student's history by period) and spec 057 (teaching classes) in `.specs/finished/`.

## Amendments

## Review
