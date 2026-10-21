---
id: "048"
slug: my-classes-tab
title: "\"Minhas aulas\": the student's requests and class history"
status: in-progress
created: 2026-10-19
started: 2026-10-21
base_commit: 950953d06af6ceb61f9dd148969a7d444b6b919d
fronts: [classes, backend, mobile]
depends_on: ["047"]
---

# 048 — "Minhas aulas": the student's requests and class history

## Goal

The student's "Minhas aulas" tab stops being a placeholder: it lists every class the student asked for that hasn't
finished, each with the status of their latest request, filterable by status, and opens a history of the classes
they actually took. Students can follow all their requests in one place instead of hunting for them in the Agenda.

## Context

- Product: [product.md](../../memory/product.md) — **Enrolment** (statuses; "Classes I've requested" are the
  student's enrolments, in the glossary) and the student's role ("keep a record of them").
- Requirements: [requirements.md → Request statuses](../../../.docs/requirements.md#request-statuses) — students see
  the status of each of their requests.
- Technical: [technical-context.md](../../memory/technical-context.md) — Classes (`ClassItem`, `ClassViewReader`,
  `toClassItem`, the routes' order), Mobile (tab bars, `ClassCard`, paginated lists with `useInfiniteQuery`).
- Depends on: spec `047` (and specs 041–045, which produce every status shown here).
- Designs: `.docs/designs/student-app.html` MINHAS-01 "My classes", MINHAS-01A "Filtered" and MINHAS-05 "History"
  (builder `minhasScreen`, its `FM` filter map, and `historico`). pt-PT adapted to pt-BR ("As minhas aulas" →
  "Minhas aulas").
- Existing code this builds on: `apps/mobile/src/app/(private)/student/(tabs)/my-classes.tsx` (the placeholder),
  `apps/mobile/src/modules/classes/components/class-card/` (with `showEnrolment`, spec 041),
  `apps/mobile/src/modules/enrolment/utils/enrolment-status.ts`, `modules/classes/src/school-class/usecase/`
  (`GetClass`, `ListWeekClasses`), `apps/backend/src/modules/classes/classes.controller.ts`.

## Scope

### In scope

- `GET /classes/mine` (the student's not-finished classes with an enrolment) and `GET /classes/mine/history` (the
  finished classes where they held a seat, paged), through a classes port the enrolment adapters implement.
- Mobile: the "Minhas aulas" screen with the status filters and the history screen.

### Out of scope

- The design's history calendar ("calendar to jump to a date"): the history is a plain paged list.
- The notifications bell and screen (AGENDA-07).
- Ratings and photos of past classes ("Depois da aula").
- Admins' or instructors' "My classes".

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The routes live in `ClassesController` (`GET /classes/mine`, `GET /classes/mine/history`, declared before `GET /classes/:id`) with use cases `ListMyClasses` and `ListMyClassHistory` in `modules/classes`, which ask a new port `MyClassesReader` (`findCurrentClassIds(studentId, now)`, `findHistoryClassIds(studentId, now, page, perPage) → { ids, total }`) for the ids, implemented by `apps/backend/src/modules/enrolment/my-classes-reader.prisma.ts`. | Classes owns how a class is read (`ClassItem`); enrolment only knows which classes are the student's — the dependency direction of spec 041. |
| D-02 | `GET /classes/mine` answers `{ items: ClassItem[] }`: the classes whose end is after now (cancelled ones included) where the caller has any enrolment, each with `myEnrolment` (the latest), sorted by start, then id; unpaged. | A student has few open requests; cancelled classes are a filter ("Aula cancelada"). |
| D-03 | `GET /classes/mine/history?page=&perPage=` answers `{ items, total, page, perPage }` (default 20, max 50): the classes that ended, aren't cancelled, and where the caller's latest enrolment is `approved`, newest start first. Bad values → 422 `class.page.invalid` / `class.perPage.invalid`. | "Classes already taken": a seat held when the class ended. |
| D-04 | Both routes are for approved students: other roles answer 403 `enrolment.role.notStudent`. | Only students take seats. |
| D-05 | The filters are computed in the app over `myEnrolment` (D-07 of spec 041 for the waiting list): Todos; Pendentes (pending, waiting list included); Aprovados; Recusados; Anulados (withdrawn); Cancelados (cancelled by the student); Retirados (takenOut); Expirados; Aula cancelada (classCancelled, or a cancelled class). The selection resets when the tab is left. | The list is small and already loaded; the design's chip set. |

## Expected Results

### ER-01 — The student's current classes

- **Front:** classes
- **Behavior:** Given a student with a pending request in an upcoming class, an approved seat in a class under way and
  a withdrawn request in another upcoming class, when they call `GET /classes/mine`, then the API answers 200 with
  those three classes sorted by start, each with `myEnrolment` showing its latest status.
- **Edge and error cases:** a finished class is absent; a cancelled class whose end hasn't passed is present; a class
  where the student never asked is absent; no enrolment answers `{ items: [] }`; an instructor or admin answers 403
  `enrolment.role.notStudent`.
- **Verify by:** `npx jest test/school-class/usecase/list-my-classes.usecase.test.ts` (from `modules/classes`) and the
  "mine" cases of `apps/backend/test/my-classes.e2e-spec.ts`.

### ER-02 — The student's class history

- **Front:** classes
- **Behavior:** Given a student who held seats in 25 finished classes, when they call
  `GET /classes/mine/history?page=1&perPage=20`, then the API answers 20 classes, newest first, with `total: 25`;
  page 2 answers the other 5.
- **Edge and error cases:** a finished class whose latest enrolment was cancelled, taken out, denied or expired is
  absent; a cancelled class is absent; a non-integer or out-of-range page or perPage answers 422; other roles 403.
- **Verify by:** `npx jest test/school-class/usecase/list-my-class-history.usecase.test.ts` (from `modules/classes`)
  and the "history" cases of `apps/backend/test/my-classes.e2e-spec.ts`.

### ER-03 — The "Minhas aulas" tab

- **Front:** mobile
- **Behavior:** Given a student, when they open the "Minhas aulas" tab, then it shows the title "Minhas aulas", a 44 pt
  history button, a horizontal row of filter chips (D-05; "Todos" selected) and the classes as `ClassCard`s with
  their status chip, sorted by start; choosing a chip shows only that status; pressing a card opens
  `/student/class/[id]`.
- **Edge and error cases:** an empty list or filter shows "Nada por aqui" / "Você não tem pedidos com este status."
  (with "Todos": "Você ainda não pediu vaga em nenhuma aula."); loading, error with "Tentar novamente" and
  pull-to-refresh; the list refetches when the tab is focused again; copy in pt-BR, es-ES and en-US.
- **Verify by:** `npx jest src/modules/enrolment/screens/my-classes.screen.test.tsx` (from `apps/mobile`).

### ER-04 — The history screen

- **Front:** mobile
- **Behavior:** Given a student on "Minhas aulas", when they press the history button, then the "Histórico" screen
  (native header with back) lists their past classes as `ClassCard`s ("N alunos presentes"), newest first, loading 20
  more at the end of the list; pressing one opens its details.
- **Edge and error cases:** none shows "Você ainda não fez nenhuma aula."; loading, error with retry and
  pull-to-refresh as on People.
- **Verify by:** `npx jest src/modules/enrolment/screens/my-class-history.screen.test.tsx` (from `apps/mobile`).

## Tasks

### Classes module (`modules/classes`)

- [x] **T-01** — Add the `MyClassesReader` port and its fake, and `ListMyClasses` and `ListMyClassHistory` in
  `src/school-class/usecase/` (D-01–D-04; the class items built with `ClassViewReader`, the roster, the viewer
  enrolment and `toClassItem` as `GetClass` does), with tests. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02 · Done when: `npx jest test/school-class` passes from `modules/classes`.
  > ✅ 2026-10-21 — Added the `MyClassesReader` port (`findCurrentClassIds`, `findHistoryClassIds` → `{ ids, total }`)
  > and `FakeMyClassesReader`; `ListMyClasses` (approved students only, else 403 `user.status.notApproved` /
  > `enrolment.role.notStudent` via `assertIsStudent`; items sorted by start then id) and `ListMyClassHistory` (`page`
  > digits ≥ 1, default 1; `perPage` 1–50, default 20; 422 `class.page.invalid` / `class.perPage.invalid` collected;
  > items in the reader's newest-first order, a missing class dropped), both building the items with
  > `toClassItem`, the card roster limit and the viewer enrolment (shared `toMyClassItems`). files:
  > `modules/classes/src/school-class/provider/my-classes-reader.provider.ts`,
  > `modules/classes/src/school-class/provider/class-view-reader.provider.ts`,
  > `modules/classes/src/school-class/provider/index.ts`,
  > `modules/classes/src/school-class/usecase/list-my-classes.usecase.ts`,
  > `modules/classes/src/school-class/usecase/list-my-class-history.usecase.ts`,
  > `modules/classes/src/school-class/usecase/index.ts`, `modules/classes/test/mock/fake-my-classes.reader.ts`,
  > `modules/classes/test/mock/fake-class-view.reader.ts`, `modules/classes/test/mock/index.ts`,
  > `modules/classes/test/school-class/provider/fake-class-view.reader.test.ts`,
  > `modules/classes/test/school-class/usecase/list-my-classes.usecase.test.ts`,
  > `modules/classes/test/school-class/usecase/list-my-class-history.usecase.test.ts`; verified: `npx jest
  > test/school-class` from `modules/classes` (23 suites, 389 passed; both use cases 100% statements, branches,
  > functions, lines), `tsc --noEmit` and `npm run lint` clean; deviations: added `ClassViewReader.findByIds(ids)`
  > (a missing technical step: the use cases load the reader's ids as views); its Prisma implementation comes in T-02.

### Backend (`apps/backend`)

- [x] **T-02** — Add `src/modules/enrolment/my-classes-reader.prisma.ts` with its spec, export it, and add
  `GET /classes/mine` and `GET /classes/mine/history` to `classes.controller.ts` (before `:id`) with specs and
  requests in `classes.integration.http`. Skills: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation),
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02 · Done when: `npx vitest run src/modules/enrolment src/modules/classes` passes.
  > ✅ 2026-10-21 — `PrismaMyClassesReader`: current ids with one `findMany` (`endsAt > now`, any enrolment of
  > the student, by `startsAt` then `id`); history with two raw queries sharing one `Prisma.sql` fragment (the
  > student's latest enrolment per class by `DISTINCT ON … requested_at DESC, id DESC` must be `approved`,
  > `cancelled_at IS NULL`, `ends_at <= now`; `starts_at DESC, id DESC`, `LIMIT`/`OFFSET`, and the `COUNT`),
  > provided and exported by `EnrolmentModule`. `GET /classes/mine` (`mine`) and `GET /classes/mine/history`
  > (`myHistory`, raw `page` / `perPage` query strings) declared before `GET /classes/:id`, injecting the reader.
  > files: `apps/backend/src/modules/enrolment/my-classes-reader.prisma.ts`,
  > `apps/backend/src/modules/enrolment/my-classes-reader.prisma.spec.ts`,
  > `apps/backend/src/modules/enrolment/enrolment.module.ts`, `apps/backend/src/modules/classes/classes.controller.ts`,
  > `apps/backend/src/modules/classes/classes.controller.spec.ts`,
  > `apps/backend/src/modules/classes/classes.integration.http`,
  > `apps/backend/src/modules/classes/class-view-reader.prisma.ts`,
  > `apps/backend/src/modules/classes/class-view-reader.prisma.spec.ts`; verified: `npx vitest run src/modules/enrolment
  > src/modules/classes` (32 files, 270 passed), backend `tsc --noEmit` clean, `npm run lint` no new findings
  > (pre-existing e2e warnings only); deviations: `PrismaClassViewReader.findByIds` (the T-01 port addition: one
  > `findMany` on the ids, nothing read for none).

- [x] **T-03** — Add `test/my-classes.e2e-spec.ts` (fixed clock, cleanup) with the current, history, paging,
  exclusions and role cases.
  Covers: ER-01, ER-02 · Done when: `npm run test:e2e --workspace apps/backend` passes.
  > ✅ 2026-10-21 — Added the suite (classes clock fixed at 2026-10-14 10:00 Fortaleza, `ExpoPushProvider` faked,
  > every class, location and user of its domain deleted after each test): "mine" — pending (latest after a
  > withdrawal), under way approved and withdrawn classes by start with `myEnrolment`, a cancelled not-ended class
  > present, a finished class and another student's class absent, `{ items: [] }`, 403 for instructor / admin /
  > not approved, 401; "history" — 25 classes paged 20 + 5 newest first with `total: 25`, the default page, every
  > exclusion (cancelled / takenOut / denied / expired / withdrawn, an approved seat followed by a newer withdrawal,
  > a cancelled class, a class under way, an upcoming one, another student's), 422 keys together and per value, 403
  > / 401. files: `apps/backend/test/my-classes.e2e-spec.ts`; verified: `npx vitest run --config vitest.config.e2e.ts
  > test/my-classes.e2e-spec.ts` (7 passed) and `npm run test:e2e --workspace apps/backend` (23 files, 622 passed);
  > deviations: none.

### Mobile (`apps/mobile`)

- [x] **T-04** — Add `hooks/use-my-classes.hook.ts` (`["classes", "mine"]`) and `hooks/use-my-class-history.hook.ts`
  (`useInfiniteQuery`, `["classes", "mine", "history"]`) in `src/modules/enrolment/`, and the filter helper in
  `utils/my-classes-filter.ts`, with tests.
  Covers: ER-03, ER-04 · Done when: `npx jest src/modules/enrolment/hooks src/modules/enrolment/utils` passes.
  > ✅ 2026-10-21 — `useMyClasses` (`MY_CLASSES_QUERY_KEY` = `["classes", "mine"]`, `GET /classes/mine`, no retry) and
  > `useMyClassHistory` (infinite `["classes", "mine", "history"]`, `GET /classes/mine/history?page=N&perPage=20`, next
  > page while `page * 20 < total`, classes repeated across pages dropped by id, no retry); both under `["classes"]`, so
  > the existing invalidations refresh them. `utils/my-classes-filter.ts`: `MY_CLASSES_FILTERS` (the D-05 chips in
  > order), `getMyClassFilter` (a cancelled class or a `classCancelled` request → `classCancelled`, else the request's
  > status — pending covers the waiting list; one chip per class, matching the card's chip) and `filterMyClasses`.
  > Types `MyClassesResponse`, `MyClassHistoryPage`, `MyClassesFilter` in `enrolment.types.ts`; a shared
  > `buildClassItem` test builder in the classes test utils. files: `apps/mobile/src/modules/enrolment/enrolment.types.ts`,
  > `apps/mobile/src/modules/enrolment/hooks/use-my-classes.hook.ts`,
  > `apps/mobile/src/modules/enrolment/hooks/use-my-classes.hook.test.tsx`,
  > `apps/mobile/src/modules/enrolment/hooks/use-my-class-history.hook.ts`,
  > `apps/mobile/src/modules/enrolment/hooks/use-my-class-history.hook.test.tsx`,
  > `apps/mobile/src/modules/enrolment/utils/my-classes-filter.ts`,
  > `apps/mobile/src/modules/enrolment/utils/my-classes-filter.test.ts`,
  > `apps/mobile/src/modules/classes/classes.test-utils.tsx`; verified: `npx jest --no-watchman
  > src/modules/enrolment/hooks src/modules/enrolment/utils` (18 suites, 163 passed; the three new files 100%
  > statements, branches, functions, lines), `tsc --noEmit` and ESLint clean; deviations: Jest hangs here with watchman,
  > so it runs with `--no-watchman`.

- [x] **T-05** — Add `src/modules/enrolment/screens/my-classes.screen.tsx` (+ hook, types) and render it from
  `src/app/(private)/student/(tabs)/my-classes.tsx` instead of the placeholder, with tests and copy in the three
  locales. Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-03 · Done when: `npx jest src/modules/enrolment/screens/my-classes.screen.test.tsx src/modules/student` passes.
  > ✅ 2026-10-21 — `MyClassesScreen` (+ `.hook.ts`, `.types.ts`): a `FlatList` (`my-classes-list`) whose header holds the
  > "Minhas aulas" title, a round 44 pt (`h-11 w-11`, `bg-surface`, `shadowStyle("iconButton")`) history button
  > (`time-outline`, label `myClasses.history`, `router.push(routes.student.myHistory)`) and `MyClassesFilters`
  > (`components/my-classes-filters/`: one horizontal row of `min-h-11` chips, the selected one `bg-grape`); items are
  > `ClassCard`s with `showEnrolment`, pressing one pushes `routes.student.classDetail(id)`. States: grape spinner
  > (`my-classes-loading`), error with "Tentar novamente" only while nothing is loaded (a failed refetch keeps the
  > list), nothing after an expired session, the "Nada por aqui" card with `myClasses.empty.all` / `.filtered`,
  > pull-to-refresh with a local spinner. `useFocusEffect` refetches on focus (`cancelRefetch: false`, so the first
  > load isn't restarted) and its cleanup puts the chips back on "Todos". Copy under `myClasses` in en-US, pt-BR,
  > es-ES; the tab route renders the screen instead of `FlowPlaceholder`. files:
  > `apps/mobile/src/modules/enrolment/screens/my-classes.screen.tsx`,
  > `apps/mobile/src/modules/enrolment/screens/my-classes.screen.hook.ts`,
  > `apps/mobile/src/modules/enrolment/screens/my-classes.screen.types.ts`,
  > `apps/mobile/src/modules/enrolment/screens/my-classes.screen.test.tsx`,
  > `apps/mobile/src/modules/enrolment/components/my-classes-filters/index.ts`,
  > `apps/mobile/src/modules/enrolment/components/my-classes-filters/my-classes-filters.component.tsx`,
  > `apps/mobile/src/modules/enrolment/components/my-classes-filters/my-classes-filters.types.ts`,
  > `apps/mobile/src/modules/enrolment/components/my-classes-filters/my-classes-filters.component.test.tsx`,
  > `apps/mobile/src/app/(private)/student/(tabs)/my-classes.tsx`, `apps/mobile/src/constants/routes.ts`,
  > `apps/mobile/src/i18n/messages/en-US.ts`, `apps/mobile/src/i18n/messages/pt-BR.ts`,
  > `apps/mobile/src/i18n/messages/es-ES.ts`; verified: `npx jest --no-watchman
  > src/modules/enrolment/screens/my-classes.screen.test.tsx src/modules/enrolment/components/my-classes-filters
  > src/modules/student` (3 suites, 18 passed; screen, hook and chips 100% covered), ESLint clean; deviations:
  > `routes.student.myHistory` is added here because the history button needs it; until T-06 adds the route file,
  > `tsc` (typed routes) refuses the push — fixed by T-06. The 44 pt size is a class, which Jest can't measure (checked
  > on the simulator in T-07).

- [ ] **T-06** — Add `src/modules/enrolment/screens/my-class-history.screen.tsx` (+ hook, types), the route
  `src/app/(private)/student/my-history.tsx` and `routes.student.myHistory`, with tests and copy.
  Covers: ER-04 · Done when: `npx jest src/modules/enrolment/screens/my-class-history.screen.test.tsx` passes.

### Verification

- [ ] **T-07** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence.
  Covers: all · Done when: every automated command exits 0 and the user journeys are recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 048` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 048` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
  - `node .specs/scripts/run-e2e.mjs 048` — the backend e2e suite passes, including `my-classes.e2e-spec.ts`.
  - `classes.integration.http` against `npm run dev` — the two routes answer as ER-01 and ER-02.
- User journeys (e2e, followed in a browser or simulator):
  - On the iOS simulator as a student with a pending, an approved and a withdrawn request: "Minhas aulas" lists the
    three with their chips; "Pendentes" shows only the pending one; "Recusados" shows the empty state.
  - The history button opens "Histórico" with the classes they took; a card opens the past class's details.

## Memory Impact

- `memory/product.md` — Current state: the student's "Minhas aulas" tab with status filters and the history.
- `memory/technical-context.md` — the two routes, `MyClassesReader`, the mobile screens and their query keys.
- `memory/structure.md` — the two screens and the `my-history` route; the tab is no longer a placeholder.
- `memory/modules.md` — None.
- `memory/modules/classes.md` — the student's current classes and history reads.
- `memory/modules/enrolment.md` — which enrolments make a class "mine" and "taken".

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
