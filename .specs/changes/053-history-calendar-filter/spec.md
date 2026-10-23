---
id: "053"
slug: history-calendar-filter
title: Filter the class history by day, week or month
status: in-review
created: 2026-10-22
started: 2026-10-22
base_commit: 038bb0bd6d0328754ac283661af9cc73accb5105
fronts: [classes, backend, mobile]
depends_on: []
---

# 053 — Filter the class history by day, week or month

## Goal

The student's "Histórico" gets the design's calendar. It opens on the current month and lists the classes the
student took in the month or week on screen, grouped under a label for each day. Tapping a day narrows the list
to that day. The API returns the classes of one period instead of pages, so the calendar can show its dots and the
list can follow the period. Students find a past class by when it happened instead of scrolling a long list.

## Context

- Product: [product.md](../../memory/product.md) — "Minhas aulas" and the class history (spec 048): which classes
  a student **took** (a seat held when the class ended, not cancelled).
- Requirements: [user-journeys.md → People and classes](../../../.docs/user-journeys.md#people-and-classes) — "past
  classes grouped under a label for each day, filtered by day, week or month"; all times in America/Fortaleza,
  weeks from Monday to Sunday.
- Technical: [technical-context.md](../../memory/technical-context.md) — Classes (`GET /classes/mine/history`,
  `ListMyClassHistory`, `MyClassesReader`, `toMyClassItems`), Dates (`src/utils/calendar-dates.ts`), Mobile (the
  shared `WeekMonthCalendar` of spec 031, `useMyClassHistory`, `MyClassHistoryScreen`).
- Designs: `.docs/designs/student-app.html` MINHAS-05 "History" (builder `historicoScreen`, `histCalendar`, and the
  shared picker `pkGen` / `pkLegenda` / `pkDots`). pt-PT adapted to pt-BR.
- Existing code this changes:
  - `modules/classes/src/school-class/provider/my-classes-reader.provider.ts` — `findHistoryClassIds(studentId, now,
    page, perPage)` → `MyClassHistoryPage` `{ ids, total }`.
  - `modules/classes/src/school-class/usecase/list-my-class-history.usecase.ts` — parses `page` / `perPage`, answers
    `{ items, total, page, perPage }`.
  - `apps/backend/src/modules/enrolment/my-classes-reader.prisma.ts` — two raw queries (`LIMIT` / `OFFSET` and
    `COUNT`) on the student's latest enrolment per class.
  - `apps/backend/src/modules/classes/classes.controller.ts` — `GET /classes/mine/history` with `page` / `perPage`.
  - `apps/mobile/src/components/week-month-calendar/` (+ `calendar-week-row/`, `calendar-month-grid/`) — always has
    a selected day, opens on the week, arrows move the selection, one dot per marked day.
  - `apps/mobile/src/modules/enrolment/hooks/use-my-class-history.hook.ts` — `useInfiniteQuery`, 20 per page.
  - `apps/mobile/src/modules/enrolment/screens/my-class-history.screen.tsx` (+ hook, types) — an endless `FlatList`
    with a spinner, a plain error text and a plain empty text.
  - Shared states used by the Agenda: `src/components/ui/empty-state`, `src/components/ui/error-state`,
    `src/modules/classes/components/class-card-skeleton`.

## Scope

### In scope

- `GET /classes/mine/history` takes a required period (`from`, `to`) and answers every class taken in it, unpaged.
- The shared `WeekMonthCalendar` gains optional behavior for the history (D-04, D-05); the Agenda keeps today's.
- The history screen rebuilt: calendar, legend, list header with the day chip, day labels, and the shared loading,
  error and empty states, in pt-BR, es-ES and en-US.

### Out of scope

- Any change to the Agenda's behavior or look, or to "Minhas aulas" (the tab).
- A "Hoje" button on the history's calendar (the design has none there).
- Keeping the chosen period or day after leaving the history screen.
- Filtering the history by sport, level or status; searching it.
- Swiping between weeks or months (only the arrows move, as on the Agenda).
- Ratings, comments and photos of past classes.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | `GET /classes/mine/history?from=YYYY-MM-DD&to=YYYY-MM-DD` replaces paging: both are required and the answer is `{ items: ClassItem[] }`, unpaged. `page`, `perPage`, `total`, `MY_CLASS_HISTORY_DEFAULT_PER_PAGE`, `MY_CLASS_HISTORY_MAX_PER_PAGE` and `MyClassHistoryPage` go away. | The mobile app is the only consumer and changes in this spec; one student's classes in a month are few, so paging only adds work. Approved by the user. |
| D-02 | The day filter runs in the app, on the period already loaded; picking or clearing a day sends no request. | The period's classes are already there for the dots. |
| D-03 | A class belongs to the America/Fortaleza day its `startsAt` falls on: the range is `startsAt >= toInstant(from, 0)` and `startsAt < toInstant(to + 1 day, 0)`. `to` before `from`, or more than 42 days from `from` to `to` inclusive, is refused. The app asks for the month (its 1st to its last day) or the week (Monday to Sunday) on screen — never the faded days of the month grid. | One rule for the server and the calendar; 42 days is the largest month grid, so the cap never blocks the app. |
| D-04 | `WeekMonthCalendar` gets optional props (names are the executor's choice) for: opening on the month; a selection that may be empty; arrows that move the period without selecting; pressing the selected day to clear it; and reporting the period on screen. Without them it behaves exactly as today; the Agenda's call site doesn't change. | One calendar for both screens: captions, grids and accessibility are already built and tested. Approved by the user. |
| D-05 | Each day shows one dot per class taken that day, up to 3 (a count per day, optional), in the calendar's existing dot style; the Agenda keeps its single dot. | The design (`pkDots`, `Math.min(3, …)`). Approved by the user. |
| D-06 | The list is grouped under a label per Fortaleza day, newest day first, the cards of a day newest first. | The journey asks for it, and the cards carry no date; the design's flat list would leave month-view cards undated. Approved by the user. |
| D-07 | The screen's state is local: it always opens on month view, on Fortaleza's current month, with no day selected; leaving the screen drops it. | Nothing to persist; the same rule as the Agenda's filter. Approved by the user. |
| D-08 | Moving the period with the arrows clears the selected day. Switching view keeps it: month → week opens the selected day's week (with no day: today's week when today is in that month, else the week of the month's 1st); week → month opens the selected day's month (with no day: the month of the week's Monday). Pressing a faded day outside the month opens that month with the day selected. | The list always matches what the calendar shows; the prototype keeps a day selected in a month that is no longer on screen. |
| D-09 | Loading shows `ClassCardSkeleton` cards under the calendar, read as one loading state; a failed load shows `ErrorState` with retry; no classes shows `EmptyState`. The calendar and the legend stay on screen in all three. | The user asked for the app's shared components, as on the Agenda. |
| D-10 | The query is `useQuery` keyed `["classes", "mine", "history", from, to]`, no retry. Each period is cached on its own, under `["classes"]`, so the existing invalidations still refresh it. A period not in the cache shows the skeleton, not the previous period's classes. | A key per period lets going back to a month show at once; showing old classes under a new caption would mislead. |

## Expected Results

### ER-01 — The history answers one period

- **Front:** backend
- **Behavior:** Given an approved student, when they call `GET /classes/mine/history?from=2026-08-01&to=2026-08-31`,
  then the answer is 200 `{ items }` with every class they took (D-03 of spec 048: ended, not cancelled, their
  latest enrolment `approved`) whose start falls on a Fortaleza day from 1 to 31 August 2026, newest start first,
  then `id` descending, each a `ClassItem` as before. The answer has no `total`, `page` or `perPage`.
- **Edge and error cases:** a class starting at 00:00 Fortaleza on 1 August is in; one starting at 23:59 Fortaleza on
  31 August is in; one starting at 00:00 Fortaleza on 1 September is out; `from` equal to `to` answers that day;
  no class in the range → `{ items: [] }`; a class under way, an upcoming one, a cancelled one, one whose latest
  enrolment isn't `approved` and another student's class are out, whatever their date.
- **Verify by:** `npx jest test/school-class/usecase/list-my-class-history.usecase.test.ts` (from `modules/classes`) ·
  `npx vitest run src/modules/enrolment/my-classes-reader.prisma.spec.ts src/modules/classes/classes.controller.spec.ts`
  (from `apps/backend`) · `apps/backend/test/my-classes.e2e-spec.ts` "history" cases through
  `node .specs/scripts/run-e2e.mjs 053` · `classes.integration.http` request
  `GET /classes/mine/history?from=…&to=…` → 200 `{ items }`.

### ER-02 — Bad periods and access are refused

- **Front:** backend
- **Behavior:** Given a caller of `GET /classes/mine/history`, when `from` or `to` is missing or isn't a real
  `YYYY-MM-DD` date, then the answer is 422 with `class.from.invalid` and/or `class.to.invalid` (both together when
  both are bad); when both are valid but `to` is before `from`, or the range is longer than 42 days inclusive, then
  the answer is 422 `class.range.invalid`.
- **Edge and error cases:** `from=2026-08-01&to=2026-09-11` (42 days) → 200; `to=2026-09-12` (43 days) → 422
  `class.range.invalid`; `from=2026-02-30` → 422 `class.from.invalid`; the old `page=1&perPage=20` alone → 422
  `class.from.invalid` + `class.to.invalid`. An instructor or an admin → 403 `enrolment.role.notStudent`, a
  not-approved student → 403 `user.status.notApproved`, both before the period is checked (a bad period from an
  admin still answers 403); no token → 401.
- **Verify by:** `npx jest test/school-class/usecase/list-my-class-history.usecase.test.ts` (from `modules/classes`) ·
  `apps/backend/test/my-classes.e2e-spec.ts` 422 / 403 / 401 cases through `node .specs/scripts/run-e2e.mjs 053`.

### ER-03 — The history's calendar

- **Front:** mobile
- **Behavior:** Given a student opening "Histórico", when the screen shows, then under the native header the calendar
  is on month view, on Fortaleza's current month ("OUTUBRO 2026" in the pill), with no day selected, followed by the
  legend — a dot and "Dias com aula dada" — and the list loads that month (`from` its 1st, `to` its last day). Each
  day of the month shows one dot per class taken that day, up to 3. The arrows move one month (or one week on week
  view) and load that period; the pill switches view by D-08 and loads the new period. On week view the period is
  Monday to Sunday and the pill reads the week ("12 – 18 OUT").
- **Edge and error cases:** a day with 5 classes shows 3 dots; faded days outside the month show no dot; a failed
  load shows no dots; the Agenda's calendar still opens on the week with today selected, its arrows still select
  ±7 days or ±1 month, and it still shows one dot per day — its existing tests pass unchanged.
- **Verify by:** `npx jest src/components/week-month-calendar src/components/calendar-week-row src/components/calendar-month-grid src/modules/classes/screens/classes-week.screen.test.tsx`
  (from `apps/mobile`) · `npx jest src/modules/enrolment/screens/my-class-history.screen.test.tsx` (opens on the
  current month, dots, arrows and pill load the right `from` / `to`) · journey 1 of the Verification Plan.

### ER-04 — Picking a day, and the day labels

- **Front:** mobile
- **Behavior:** Given the history showing a period with classes, then above the list "Todas as aulas" sits at the
  left and the period's caption at the right, and the classes are grouped under one label per Fortaleza day (e.g.
  "SEX, 14 AGO"), newest day first, each card opening the class's details as before. When the student taps a day,
  then it is selected (`accessibilityState.selected`), the list shows only that day's classes, and a chip with the
  day ("14 AGO" and an ✕, a button of at least 44 pt) replaces the caption; tapping the chip, or the selected day
  again, clears the selection and the whole period shows again. No request is sent when a day is picked or cleared.
- **Edge and error cases:** tapping a faded day of the next or previous month opens that month with the day selected;
  pressing an arrow with a day selected clears it; switching view keeps it (D-08); a selected day without classes
  shows the empty state for a day (ER-05).
- **Verify by:** `npx jest src/modules/enrolment/screens/my-class-history.screen.test.tsx src/modules/enrolment/utils`
  (from `apps/mobile`) · journey 2 of the Verification Plan.

### ER-05 — Loading, error and empty states

- **Front:** mobile
- **Behavior:** Given the history, when a period is loading and isn't cached, then `ClassCardSkeleton` cards show
  under the calendar, read as one loading state "Carregando as aulas"; when the load fails, then `ErrorState` shows
  "Algo deu errado" / "Não conseguimos carregar seu histórico. Verifique sua conexão e tente novamente." and its
  retry reloads the period (the button's spinner while it runs); when there is nothing to show, then `EmptyState`
  (icon `calendar-outline`, no action) shows "Sem aulas neste dia" / "Você não fez nenhuma aula neste dia." with a day
  selected, or "Sem aulas neste período" / "Você não fez nenhuma aula neste período." without one. Pull-to-refresh
  reloads the period on screen with its own spinner. The calendar and the legend stay on screen in every state.
- **Edge and error cases:** an expired session shows none of the three (it is handled once, centrally); a failed
  refresh of a loaded period keeps its classes; the copy exists in pt-BR, es-ES and en-US.
- **Verify by:** `npx jest src/modules/enrolment/screens/my-class-history.screen.test.tsx src/modules/enrolment/hooks/use-my-class-history.hook.test.tsx`
  (from `apps/mobile`) · journey 3 of the Verification Plan.

## Tasks

### Classes module (`modules/classes`)

- [x] **T-01** — Change `MyClassesReader.findHistoryClassIds` to `(studentId, now, from: Date, to: Date)` → `string[]`
  (`to` exclusive, already the instant after the last day) in
  `src/school-class/provider/my-classes-reader.provider.ts`, and its fake in `test/mock/fake-my-classes.reader.ts`.
  Change `ListMyClassHistory` (`src/school-class/usecase/list-my-class-history.usecase.ts`) to take raw `from` / `to`,
  check them with `isValidIsoDate` and the 42-day rule (D-03, ER-02's keys, after `assertIsStudent`), turn them into
  instants with `toInstant` and answer `{ items }`; drop the paging constants, `MyClassHistoryPage` and their
  exports. Update `test/school-class/usecase/list-my-class-history.usecase.test.ts` for every case of ER-01 and ER-02.
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02 · Done when: `npx jest test/school-class` passes from `modules/classes`.
  > ✅ 2026-10-22 22:50 — `MyClassesReader.findHistoryClassIds(studentId, now, from, to)` → `string[]` (`to` exclusive);
  > `ListMyClassHistory` takes raw `from` / `to`, refuses after `assertIsStudent` with `class.from.invalid` /
  > `class.to.invalid` (collected) and then `class.range.invalid` (`to` before `from` or more than
  > `MY_CLASS_HISTORY_MAX_DAYS` = 42 days inclusive), asks the reader for `toInstant(from, 0)` up to
  > `toInstant(to + 1 day, 0)` and answers `{ items }`; the paging constants, `parseInteger` and `MyClassHistoryPage`
  > are gone; the fake records `from` / `to`. Files: `modules/classes/src/school-class/provider/my-classes-reader.provider.ts`,
  > `modules/classes/src/school-class/usecase/list-my-class-history.usecase.ts`,
  > `modules/classes/test/mock/fake-my-classes.reader.ts`,
  > `modules/classes/test/school-class/usecase/list-my-class-history.usecase.test.ts`; verified: `npx jest test/school-class`
  > from `modules/classes` (23 suites, 395 passed; the use case at 100% statements/branches/functions/lines),
  > `npm run check-types` and `npx oxlint src test` clean; deviations: the module's skill (`module-use-case`) creates
  > use cases, so this existing one was changed by hand following its pattern; a `MY_CLASS_HISTORY_MAX_DAYS` constant
  > holds the 42-day rule. The day-edge and exclusion cases of ER-01 are the reader's (T-02, T-03); here the test checks the
  > instants handed to it (1 Aug 00:00 Fortaleza → 1 Sep 00:00 Fortaleza).

### Backend (`apps/backend`)

- [x] **T-02** — In `src/modules/enrolment/my-classes-reader.prisma.ts`, make `findHistoryClassIds` one raw query on
  the same latest-enrolment fragment with `c.starts_at >= from AND c.starts_at < to`, ordered `starts_at DESC, id
  DESC`, without `LIMIT` / `OFFSET` / `COUNT`; update its spec. In `src/modules/classes/classes.controller.ts`,
  `myHistory` reads `@Query('from')` and `@Query('to')`; update `classes.controller.spec.ts` and the history requests
  in `classes.integration.http`. Skills: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation),
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02 · Done when: `npx vitest run src/modules/enrolment src/modules/classes` passes from
  `apps/backend`.
  > ✅ 2026-10-22 22:51 — `PrismaMyClassesReader.findHistoryClassIds(studentId, now, from, to)` is one raw query on the
  > same latest-enrolment fragment, with `c.starts_at >= from AND c.starts_at < to`, ordered `starts_at DESC, id DESC`,
  > without `LIMIT` / `OFFSET` / `COUNT`; `myHistory` reads `@Query('from')` / `@Query('to')`; the specs check the SQL
  > text and bound values, the empty answer, the period passed through the controller (1 Aug → 1 Sep 03:00 UTC) and a
  > 422 `class.from.invalid`; `classes.integration.http` has the period request (200 `{ items }`), the unreal date
  > (422 from/to) and the 43-day range (422 `class.range.invalid`). Files:
  > `apps/backend/src/modules/enrolment/my-classes-reader.prisma.ts`,
  > `apps/backend/src/modules/enrolment/my-classes-reader.prisma.spec.ts`,
  > `apps/backend/src/modules/classes/classes.controller.ts`, `apps/backend/src/modules/classes/classes.controller.spec.ts`,
  > `apps/backend/src/modules/classes/classes.integration.http`; verified: `npx vitest run src/modules/enrolment
  > src/modules/classes` from `apps/backend` (33 files, 272 passed), `npm run check-types` and `npx oxlint src` clean
  > (after `npm run build` in `modules/classes`, which the backend reads through `dist`); deviations: the named skills
  > (`backend-provider-implementation`, `backend-nest-controller`) create new adapters, so the existing ones were changed
  > by hand in their pattern.

- [x] **T-03** — Replace the history cases of `test/my-classes.e2e-spec.ts` (paging, default page, `page` /
  `perPage` 422s) with ER-01's period, day-edge and exclusion cases and ER-02's 422 / 403 / 401 cases.
  Covers: ER-01, ER-02 · Done when: `npx vitest run --config vitest.config.e2e.ts test/my-classes.e2e-spec.ts` passes
  from `apps/backend`.
  > ✅ 2026-10-22 22:52 — the paging cases of the `history` block are replaced: the August period (00:00 Fortaleza
  > on 1 Aug and 23:59 on 31 Aug in, 00:00 on 1 Sep and 23:59 on 31 Jul out, 27 classes unpaged, body only `items`),
  > same-start ordering by id desc, `from` = `to`, every exclusion (under way, upcoming, cancelled, latest enrolment not
  > `approved` for six statuses and a seat given up, another student's) on an October period around the clock, an empty
  > period; 42 days → 200, 43 days and `to` before `from` → 422 `class.range.invalid`; `page=1&perPage=20` alone →
  > `class.from.invalid` + `class.to.invalid`, `2026-02-30`, a missing `to` and malformed dates → their keys; instructor
  > / admin with a bad period → 403 `enrolment.role.notStudent`, a deleted student → 403 `user.status.notApproved`, no
  > token → 401. A `makeClassAt(startsAt)` helper was added and `makeClass` uses it. Files:
  > `apps/backend/test/my-classes.e2e-spec.ts`; verified: `npx vitest run --config vitest.config.e2e.ts
  > test/my-classes.e2e-spec.ts` from `apps/backend` against the local Postgres (11 passed); deviations: none.

- [x] **T-08** — (added during execution) In `test/classes.e2e-spec.ts`, the "contacts" case that reads
  `GET /classes/mine/history` without a period (now a 422 by ER-02) asks for the day of its finished class
  (`?from=2026-10-13&to=2026-10-13`).
  Covers: ER-01 · Done when: `node .specs/scripts/run-e2e.mjs 053` passes.
  > ✅ 2026-10-22 23:10 — found by the Verification Plan: `classes.e2e-spec.ts` › contacts › "keeps the numbers and the
  > role out of the week, 'mine' and 'mine/history' answers" called the history without a period and got the new 422; it
  > now asks for `?from=2026-10-13&to=2026-10-13`, the day of its finished class. Files: `apps/backend/test/classes.e2e-spec.ts`;
  > verified: `node .specs/scripts/run-e2e.mjs 053` (23 files, 631 passed, E2E PASSED); deviations: none.

### Mobile (`apps/mobile`)

- [x] **T-04** — Extend `src/components/week-month-calendar/` (component, hook, types) and, for the dot count,
  `src/components/calendar-week-row/` and `src/components/calendar-month-grid/` with D-04's and D-05's optional props
  and D-08's view rules, keeping today's behavior when they are absent. Tests in each folder's
  `*.component.test.tsx` cover the new props (opening on the month, no selection, arrows moving the period and
  clearing, the selected day clearing, the faded day opening its month, the period reported, 1–3 dots) and keep
  every existing test unchanged. Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-03 · Done when: `npx jest src/components/week-month-calendar src/components/calendar-week-row src/components/calendar-month-grid src/modules/classes/screens/classes-week.screen.test.tsx`
  passes from `apps/mobile`.
  > ✅ 2026-10-22 22:58 — `WeekMonthCalendar` gains optional props: `initialView` (`"month"` to open on the month),
  > `clearable` (`selectedDate` may be `null`; the calendar keeps the shown week/month itself; the arrows move that
  > period and clear the selection; pressing the selected day clears it; a faded day opens its month selected; switching
  > view follows D-08), `onClearSelection`, `onPeriodChange({ from, to })` (Monday–Sunday, or the month's 1st–last day,
  > never the faded days) and `markedCounts` (dots per marked day, up to 3, passed down to `CalendarWeekRow` and
  > `CalendarMonthGrid`, which draw that many dots in the existing style and accept a `null` selection). Without them it
  > behaves as before: every existing test is unchanged (only an import line gained `CalendarPeriod`) and the Agenda's call
  > site is untouched. Files: `apps/mobile/src/components/week-month-calendar/week-month-calendar.{component.tsx,hook.ts,types.ts,component.test.tsx}`,
  > `apps/mobile/src/components/calendar-week-row/calendar-week-row.{component.tsx,hook.ts,types.ts,component.test.tsx}`,
  > `apps/mobile/src/components/calendar-month-grid/calendar-month-grid.{component.tsx,hook.ts,types.ts,component.test.tsx}`,
  > `apps/mobile/src/utils/calendar-dates.ts`, `apps/mobile/src/utils/calendar-dates.test.ts`; verified: `npx jest
  > src/components/week-month-calendar src/components/calendar-week-row src/components/calendar-month-grid
  > src/modules/classes/screens/classes-week.screen.test.tsx src/utils/calendar-dates.test.ts` from `apps/mobile` (5 suites,
  > 132 passed; the three calendar folders at 100%), `npx tsc --noEmit` and `npx eslint` on the files clean; deviations: the
  > dot count shared by the row and the grid is `markedDayDots` (+ `MAX_DAY_DOTS`) in `src/utils/calendar-dates.ts`, with its
  > unit test. The dots on faded days stay as on the Agenda: the history only marks days of the loaded period, so faded days
  > get none there.

- [x] **T-05** — Change `src/modules/enrolment/hooks/use-my-class-history.hook.ts` to `useMyClassHistory({ from, to })`
  (D-10, `GET /classes/mine/history?from=…&to=…`, `{ items }` typed in `enrolment.types.ts` in place of
  `MyClassHistoryPage`) and its test. Add `src/modules/enrolment/utils/class-history.ts` with its test: counting the
  classes per Fortaleza day (for the dots), filtering by a day, and grouping by day newest first (D-06), plus the day
  label and chip captions ("SEX, 14 AGO", "14 AGO") from `src/utils/calendar-dates.ts`'s locale helpers.
  Covers: ER-03, ER-04 · Done when: `npx jest src/modules/enrolment/hooks/use-my-class-history.hook.test.tsx src/modules/enrolment/utils/class-history.test.ts`
  passes from `apps/mobile`.
  > ✅ 2026-10-22 22:59 — `useMyClassHistory({ from, to })` is a `useQuery` keyed `["classes", "mine", "history", from,
  > to]` (`myClassHistoryQueryKey`), `GET /classes/mine/history?from=…&to=…`, no retry; `MyClassHistoryPage` became
  > `MyClassHistoryResponse` `{ items }`, with `MyClassHistoryPeriod` and `ClassHistoryDay` in `enrolment.types.ts`;
  > `MY_CLASS_HISTORY_PAGE_SIZE` is gone. `utils/class-history.ts`: `countClassesByDay`, `filterClassesByDay`,
  > `groupClassesByDay` (newest day first, a day's classes newest first then id desc, input untouched), `historyDayLabel`
  > ("SEX, 14 AGO") and `historyChipLabel` ("14 AGO"). The hook test checks the URL and key, that a new period shows no
  > data until it loads and a cached one shows at once (D-10), the `["classes"]` invalidation and no retry; the util test
  > checks the Fortaleza day edges (02:59 / 03:00 UTC) and the captions in pt-BR, es-ES and en-US. Files:
  > `apps/mobile/src/modules/enrolment/hooks/use-my-class-history.hook.ts`,
  > `apps/mobile/src/modules/enrolment/hooks/use-my-class-history.hook.test.tsx`,
  > `apps/mobile/src/modules/enrolment/utils/class-history.ts`, `apps/mobile/src/modules/enrolment/utils/class-history.test.ts`,
  > `apps/mobile/src/modules/enrolment/enrolment.types.ts`, `apps/mobile/src/utils/calendar-dates.ts`; verified: `npx jest
  > src/modules/enrolment/hooks/use-my-class-history.hook.test.tsx src/modules/enrolment/utils/class-history.test.ts` from
  > `apps/mobile` (13 passed, both files at 100%; with `src/utils/calendar-dates.test.ts`, 49 passed), `npx eslint` on the
  > files clean; deviations: `dayAndMonth` in `src/utils/calendar-dates.ts` is now exported for the captions. Until T-06
  > rebuilds it, `my-class-history.screen.hook.ts` still calls the paged hook, so `tsc` reports it.

- [x] **T-06** — Rebuild `src/modules/enrolment/screens/my-class-history.screen.tsx` (+ `.hook.ts`, `.types.ts`): one
  list whose header holds the calendar (D-04 props, D-07 state), the legend and the list header, with day labels and
  `ClassCard`s as rows, and ER-05's states. Extract `components/history-list-header/` ("Todas as aulas" with the
  caption or the day chip) and `components/history-day-label/` in `src/modules/enrolment/`, each with its test.
  Replace the `myHistory` copy in `src/i18n/messages/{pt-BR,es-ES,en-US}.ts` (the old `empty` / `loadError` go away).
  Update `my-class-history.screen.test.tsx` for ER-03, ER-04 and ER-05. Colors from the tokens only (the chip on
  `infoTint` with `lagoon` text, as designed). Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-03, ER-04, ER-05 · Done when: `npx jest src/modules/enrolment` passes from `apps/mobile`.
  > ✅ 2026-10-22 23:07 — `MyClassHistoryScreen` is one `FlatList` (`my-history-list`, first descendant,
  > `contentInsetAdjustmentBehavior="automatic"`) whose header holds the calendar in a `bg-surface` card with `border-line`
  > (`WeekMonthCalendar` with `initialView="month"`, `clearable`, `markedCounts`, `onClearSelection`, `onPeriodChange`), the
  > legend (a `bg-lagoon` dot and "Dias com aula dada") and `HistoryListHeader`; its rows are `HistoryDayLabel`s and
  > `ClassCard`s (`HistoryRow`), grouped by Fortaleza day newest first and filtered by the selected day in the app. The hook
  > keeps the period (Fortaleza's current month on open), the selected day (none on open) and the refresh spinner as local
  > state (D-07); states follow D-09 / ER-05: three `ClassCardSkeleton`s read as "Carregando as aulas", `ErrorState`
  > with retry and its spinner (`isRetrying`), `EmptyState` `calendar-outline` for a day or a period, nothing after an
  > expired session, a failed refresh keeping the classes; the calendar and legend stay in every state. New
  > `components/history-list-header/` ("Todas as aulas", the caption or the `bg-info-tint` / `text-lagoon` chip, a 44 pt
  > target, `myHistory.clearDay` as its label) and `components/history-day-label/` (a `ds-text-section-label` header), each
  > with its test. `myHistory` copy replaced in pt-BR, es-ES and en-US (`empty` / `loadError` strings gone). Files:
  > `apps/mobile/src/modules/enrolment/screens/my-class-history.screen.{tsx,hook.ts,types.ts,test.tsx}`,
  > `apps/mobile/src/modules/enrolment/components/history-list-header/{index.ts,history-list-header.component.tsx,history-list-header.types.ts,history-list-header.component.test.tsx}`,
  > `apps/mobile/src/modules/enrolment/components/history-day-label/{index.ts,history-day-label.component.tsx,history-day-label.types.ts,history-day-label.component.test.tsx}`,
  > `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`, `apps/mobile/src/utils/calendar-dates.ts`,
  > `apps/mobile/src/utils/calendar-dates.test.ts`, `apps/mobile/src/components/week-month-calendar/week-month-calendar.hook.ts`;
  > verified: `npx jest src/modules/enrolment` from `apps/mobile` (32 suites, 281 passed; the screen, its hook and both
  > components at 100%), `npx jest src/components/week-month-calendar src/utils src/i18n` (131 passed), `npx tsc --noEmit`
  > and `npx eslint` clean; deviations: a `monthPeriod(month)` helper (1st to last day) added to `calendar-dates.ts` with
  > its test, used for the screen's opening period and in place of the same inline computation in the calendar hook; the
  > caption at the right uses the pill's captions (`monthCaption` / `weekCaption`), upper-cased like the rest of the app,
  > where the prototype capitalizes the month.

### Verification

- [x] **T-07** — Run every command in the Verification Plan from the repo root; all pass. Follow the user journeys
  and record what was seen. Record the output summary as evidence.
  Covers: all · Done when: every automated command exits 0 and the user journeys are recorded.
  > ✅ 2026-10-22 23:12 — Automated, from the repo root: `node .specs/scripts/run-related-tests.mjs 053` → RELATED TESTS
  > PASSED (apps/backend 42, apps/mobile 1275, modules/classes 525, modules/enrolment 291 — all passed);
  > `node .specs/scripts/check-coverage.mjs 053` → COVERAGE OK (19 files measured, every changed line covered);
  > `npx turbo run lint check-types build --filter=…classes --filter=…backend --filter=…mobile` → 27/27 tasks, 0 errors (the
  > backend's 10 lint warnings are all in files this spec doesn't touch); `node .specs/scripts/run-e2e.mjs 053` → first run
  > failed one `classes.e2e-spec.ts` case still calling the history without a period, fixed in T-08 (added during execution),
  > then E2E PASSED (23 files, 631 tests); the `classes.integration.http` requests against the running `nest start --watch`
  > backend with a student token: `from=2026-08-01&to=2026-08-31` → 200 `{"items":[]}`, `from=2026-10-01&to=2026-10-31` → 200
  > `{ items: [...] }`, `to=2026-09-12` (43 days) → 422 `class.range.invalid`, `from=2026-02-30` → 422 `class.from.invalid` +
  > `class.to.invalid`, `page=1&perPage=20` → the same two keys. User journeys on the iOS simulator (iPhone 18 Pro, iOS 27,
  > pt-BR, as the dev student, with three finished classes added to the local dev database for the run — two on 13 Oct, one
  > on 6 Oct, besides the one on 21 Oct — and deleted afterwards): (1) "Histórico" opened on OUTUBRO 2026 in month view with
  > no day selected, dots 6 (1), 13 (2), 21 (1), "Dias com aula dada", "TODAS AS AULAS" / "OUTUBRO 2026" and the classes
  > under "QUA, 21 OUT" then "TER, 13 OUT"; the previous arrow showed the skeleton and then SETEMBRO 2026; the pill opened
  > today's week "19 – 25 OUT" with its class; (2) tapping 13 selected it, showed only its two classes (16:00 skate, then 08:00
  > surf) and the "13 OUT ✕" chip; the chip brought the whole month back; a day without classes (19) showed "Sem aulas neste
  > dia" with the "19 OUT" chip; a card opened the class's details; (3) September showed "Sem aulas neste período" under the
  > calendar and the legend; (4) the Agenda still opened on the week with today (QUI 22) selected and one dot per day.
  > Not driven: journey 3's error with the backend stopped (the running backend is the user's session); the screen test covers
  > it (skeleton, then "Something went wrong", retry with its spinner) — to see it, stop the backend, move to a month not yet
  > loaded, check the skeleton then "Algo deu errado", start the backend and press "Tentar novamente". Files: none
  > (`.specs/changes/053-history-calendar-filter/spec.md` only); deviations: none.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 053` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 053` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
  - `node .specs/scripts/run-e2e.mjs 053` — the backend e2e suite passes, including `my-classes.e2e-spec.ts`.
  - `classes.integration.http` against `npm run dev` — the history request answers as ER-01, and a 43-day range
    answers 422 `class.range.invalid`.
- User journeys (on the iOS simulator, as a student with classes taken on at least two days of one month, one of
  them with two classes):
  1. "Minhas aulas" → history button: "Histórico" opens on the current month with no day selected, the dots (two
     on the day with two classes), "Dias com aula dada", and the month's classes under day labels. The previous
     arrow loads the previous month; the pill switches to a week and back.
  2. Tapping a day with classes shows only them and the "<dia> <MÊS>" chip; tapping the chip shows the whole month
     again; tapping a day without classes shows "Sem aulas neste dia"; a card opens the class's details.
  3. A month without classes shows "Sem aulas neste período"; with the backend stopped, a new period shows the
     skeleton and then "Algo deu errado", whose retry works once the backend is back.
  4. The Agenda still opens on the week with today selected and one dot per day with classes.

## Memory Impact

- `memory/product.md` — "Minhas aulas" and the class history: the history's calendar, day filter and day labels;
  remove "the history's calendar to jump to a date" from what spec 048 left out.
- `memory/technical-context.md` — `GET /classes/mine/history?from=&to=` (`{ items }`, the 42-day rule and its 422
  keys), `MyClassesReader.findHistoryClassIds(studentId, now, from, to)`, `WeekMonthCalendar`'s new optional props
  and dot count, `useMyClassHistory({ from, to })` and its key, the rebuilt history screen and its components.
- `memory/structure.md` — the new `history-list-header` and `history-day-label` components and
  `utils/class-history.ts` in the enrolment module; the history screen's description.
- `memory/modules.md` — None.
- `memory/modules/classes.md` — the history read by period instead of pages.
- `memory/modules/enrolment.md` — the "Histórico" screen's calendar and day filter.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
