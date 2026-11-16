---
id: "088"
slug: time-range-suggestions-this-week
title: Suggest this week's time ranges too, and skip cancelled classes
status: in-progress
created: 2026-11-16
started: 2026-11-16
base_commit: a8946f87a7b73be5e258785c3332eab449c2705b
fronts: [classes, backend, app-messages, mobile, web, designs]
depends_on: []
---

# 088 — Suggest this week's time ranges too, and skip cancelled classes

## Goal

The "Horários" chips of "Nova aula" (and the "Início e fim" chips of "Editar aula") are suggested only from the
classes that started in the previous Monday–Monday week. An admin who just created this week's classes doesn't see
their time ranges when creating the next batch, and has to type them again with "Novo horário". After this spec the
suggestions come from the classes of last week **and** this week, and a cancelled class no longer suggests its time
range. The hint under the chips says so, in the app and in the admin app design.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: classes created in batches by admins, time
  ranges suggested rather than saved.
- Requirements: [requirements.md → Time range suggestions](../../../.docs/requirements.md#time-range-suggestions) —
  the batch form suggests the time ranges used by the previous week's classes and keeps no saved list. This spec
  widens the window to this week (D-04).
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Classes
  (`GET /classes/time-range-suggestions`), Automated validation. Module rules:
  [modules/classes.md](../../memory/modules/classes.md) — "Suggestions come from last week" and "A week is Monday
  00:00 to the next Monday 00:00, Fortaleza, by start".
- Design: `.docs/designs/admin-app.html` is generated from the web page `/pt-br/designs/admin-app` by
  `node .docs/designs/scripts/build-design.mjs admin-app` (build the web and run `next start -p 3100` in `apps/web`
  first); its sources are never edited by hand.
- Existing code this builds on:
  - `modules/classes/src/school-class/usecase/list-time-range-suggestions.usecase.ts` — reads
    `SchoolClassRepository.findStartingBetween(lastMonday, thisMonday)` in `America/Fortaleza` and returns the
    distinct `HH:mm` start–end pairs sorted by start, then end. It doesn't look at `cancelledAt`.
  - `findStartingBetween` (`school-class.prisma.ts`, and the `ClassViewReader` one used by `ListWeekClasses`)
    filters only on `startsAt`; the weekly view shows cancelled classes on purpose.
  - `modules/classes/test/school-class/usecase/list-time-range-suggestions.usecase.test.ts` — unit tests with
    `FakeSchoolClassRepository`, `FakeClockProvider` (Wednesday 2026-10-14 10:00 Fortaleza) and `buildClass`; the
    test "ignores this week and two weeks ago…" asserts the old window.
  - `apps/backend/test/classes.e2e-spec.ts` → `describe('suggestions')` — seeds classes with `seedClass` (no
    `cancelledAt`); "ignores this week and two weeks ago, and counts Sunday night" and "is empty when nothing
    happened last week" (which seeds a class this week) assert the old window.
  - `packages/app-messages/src/{en-US,pt-BR,es-ES}.ts` → `newClass.timeRanges.hint` — the hint shown when there are
    suggestions, in mobile (`TimeRangePicker`) and in the web design mock (`apps/web/src/modules/designs/components/
    time-range-picker/`).

## Scope

### In scope

- The window and the cancelled-class filter of `ListTimeRangeSuggestions`, with its unit tests.
- The backend e2e tests of `GET /classes/time-range-suggestions`.
- The hint copy `newClass.timeRanges.hint` in en-US, pt-BR and es-ES, the mobile and web tests that quote it, and the
  doc comments that say "last week".
- Regenerating `.docs/designs/admin-app.html` so its hint reads the new copy.

### Out of scope

- A saved list of time ranges (the requirements keep ruling it out); ranges added with "Novo horário" stay local to
  the screen.
- Any change to `findStartingBetween` (either implementation) or to the weekly view, which keeps showing cancelled
  classes.
- Suggesting from weeks after this one, or from more than two weeks.
- The look and behaviour of the chips, the "Novo horário" sheet, or which chips start selected (none).
- The API contract: the route, the permission and the response shape `{ items: [{ start, end }] }` don't change.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The suggestions read the classes starting from last Monday 00:00 (inclusive) to next Monday 00:00 (exclusive), America/Fortaleza — last week plus the whole current week, including its classes that haven't started yet. | The smallest window that shows the classes an admin just created for this week, and it keeps the module's Monday-to-Monday week rule. |
| D-02 | Cancelled classes (`cancelledAt` set) are skipped inside `ListTimeRangeSuggestions`, not in the repository query. A time range is still suggested when at least one class with it isn't cancelled. | `findStartingBetween` is shared with `ListWeekClasses`, which must keep showing cancelled classes; the entity already exposes `cancelledAt`. |
| D-03 | The hint becomes pt-BR "Sugeridos a partir das aulas desta semana e da passada.", en-US "Suggested from this week's and last week's classes.", es-ES "Sugeridos a partir de las clases de esta semana y de la pasada." | The old text names only last week and would describe the wrong rule; es-ES keeps the masculine "Sugeridos" of the current text. |
| D-04 | This spec departs from [requirements.md → Time range suggestions](../../../.docs/requirements.md#time-range-suggestions) ("the time ranges used by the previous week's classes"); `spec-finish` brings that section and the memory in line. | The user asked for this week's classes to be suggested right away, in staging testing. |

## Expected Results

### ER-01 — Suggestions come from last week and this week

- **Front:** classes, backend
- **Behavior:** Given an approved admin and classes starting last week and this week (in America/Fortaleza, by
  start), when they call `GET /classes/time-range-suggestions`, then the answer is 200 with the distinct start–end
  pairs (`HH:mm`, Fortaleza) of all those classes, sorted by start, then end — including this week's classes that
  haven't started yet.
- **Edge and error cases:** a class starting last Monday 00:00 is in; a class starting this Sunday 23:59 is in; a
  class starting next Monday 00:00 or later is out; a class starting before last Monday 00:00 is out; on a Monday
  morning the window is the week that just ended plus the week that just started; a time range used by both weeks
  appears once; no class in the window → `{ items: [] }`; a non-admin still gets 403 `user.role.notAdmin`.
- **Verify by:** `npx jest test/school-class/usecase/list-time-range-suggestions.usecase.test.ts` (from
  `modules/classes`) · `node .specs/scripts/run-e2e.mjs 088` → `apps/backend/test/classes.e2e-spec.ts` →
  `describe('suggestions')`, tests "lists the distinct ranges of last week's and this week's classes" and "ignores
  next week and two weeks ago, and counts Sunday night".

### ER-02 — Cancelled classes suggest nothing

- **Front:** classes, backend
- **Behavior:** Given a class in the window with `cancelledAt` set, when an admin reads the suggestions, then its
  time range is not suggested unless another class in the window that isn't cancelled has the same start and end.
- **Edge and error cases:** only cancelled classes in the window → `{ items: [] }`; a cancelled and a non-cancelled
  class with the same range → the range appears once; a cancelled class last week and a non-cancelled one this week
  with the same range → it appears once.
- **Verify by:** `npx jest test/school-class/usecase/list-time-range-suggestions.usecase.test.ts -t "cancelled"`
  (from `modules/classes`) · `node .specs/scripts/run-e2e.mjs 088` → `apps/backend/test/classes.e2e-spec.ts` →
  `describe('suggestions')`, test "skips cancelled classes".

### ER-03 — The hint names this week and last week

- **Front:** app-messages, mobile, web, designs
- **Behavior:** Given suggestions exist, when the "Horários" picker is shown, then the hint under the chips reads
  "Sugeridos a partir das aulas desta semana e da passada." in pt-BR, "Suggested from this week's and last week's
  classes." in en-US and "Sugeridos a partir de las clases de esta semana y de la pasada." in es-ES — in the mobile
  app and in the admin app design (`.docs/designs/admin-app.html`).
- **Edge and error cases:** no suggestions → no hint (unchanged); the overlap and past-time hints are unchanged; no
  text containing "semana passada" / "last week's classes" / "semana pasada" is left in
  `packages/app-messages/src`, the mobile or web time-range components and their tests.
- **Verify by:** `npx jest src/modules/classes/components/time-range-picker` (from `apps/mobile`) ·
  `npx vitest run src/modules/designs/components/time-range-picker src/modules/designs/components/time-range-hint`
  (from `apps/web`) · `node .docs/designs/scripts/pack.mjs --check` exits 0 and `grep -c "desta semana e da passada"
  .docs/designs/admin-app.html` is at least 1.

## Tasks

### Classes (`modules/classes`)

- [x] **T-01** — In `src/school-class/usecase/list-time-range-suggestions.usecase.ts`, end the window at next Monday
  00:00 Fortaleza (`addWeeks(thisMonday, 1)`) instead of this Monday, and skip classes whose `cancelledAt` is set
  (D-01, D-02); update the class's doc comment. Rewrite
  `test/school-class/usecase/list-time-range-suggestions.usecase.test.ts` for ER-01 and ER-02: last week and this
  week (a class later this week) both suggested; the boundaries of ER-01 (last Monday 00:00 in, Sunday before out,
  this Sunday 23:59 in, next Monday 00:00 out); the Monday-morning clock; a range in both weeks once; cancelled only →
  empty; cancelled + non-cancelled same range → once. Name the cancelled tests so `-t "cancelled"` selects them.
  Covers: ER-01, ER-02 · Done when: `npx jest test/school-class/usecase/list-time-range-suggestions.usecase.test.ts`
  passes (from `modules/classes`) and the use case file is 100% covered.
  > ✅ 2026-11-16 — window now ends next Monday 00:00 and cancelled classes are skipped in the use case; tests
  > rewritten (this week, edges, Monday morning, both weeks once, cancelled-only, cancelled + non-cancelled);
  > files: `modules/classes/src/school-class/usecase/list-time-range-suggestions.usecase.ts`,
  > `modules/classes/test/school-class/usecase/list-time-range-suggestions.usecase.test.ts`; verified:
  > `npx jest test/school-class/usecase/list-time-range-suggestions.usecase.test.ts` (10 passed, use case 100%
  > covered); deviations: none

### Backend (`apps/backend`)

- [x] **T-02** — In `test/classes.e2e-spec.ts` → `describe('suggestions')`: let `seedClass` take an optional
  `cancelledAt`; rename the first test to "lists the distinct ranges of last week's and this week's classes" and seed
  one class this week too; replace "ignores this week and two weeks ago, and counts Sunday night" with "ignores next
  week and two weeks ago, and counts Sunday night" (a class next Monday 00:00 out, this Sunday 23:00 in); change "is
  empty when nothing happened last week" to seed only outside the window; add "skips cancelled classes" (a
  cancelled-only range absent, a range with a cancelled and a non-cancelled class present once). Run the backend
  build first so the e2e suite uses the new module code.
  Covers: ER-01, ER-02 · Done when: `npm run test:e2e -- test/classes.e2e-spec.ts -t "suggestions"` passes (from
  `apps/backend`, Postgres up).
  > ✅ 2026-11-16 — `seedClass` takes an optional `cancelledAt`; suggestions tests renamed/rewritten for the new
  > window, plus "skips cancelled classes" and an empty-window test; files:
  > `apps/backend/test/classes.e2e-spec.ts`; verified: `DATABASE_NAME=rochas_e2e_088 npm run test:e2e --
  > test/classes.e2e-spec.ts -t "suggestions"` (5 passed); deviations: the default dev DB holds real dev classes
  > in this week's window (the suite's clock is pinned to 2026-10-14), so the suite ran against a scratch
  > database `rochas_e2e_088` in the same Postgres container; the dev data was not touched

### App messages (`packages/app-messages`)

- [x] **T-03** — Set `newClass.timeRanges.hint` to the D-03 texts in `src/pt-BR.ts`, `src/en-US.ts` and
  `src/es-ES.ts`, then build the package.
  Covers: ER-03 · Done when: `npm run build -w @rochas-surf-school/app-messages` and `npx turbo run check-types
  --filter=@rochas-surf-school/app-messages` exit 0.
  > ✅ 2026-11-16 — `newClass.timeRanges.hint` set to the D-03 texts; files: `packages/app-messages/src/pt-BR.ts`,
  > `packages/app-messages/src/en-US.ts`, `packages/app-messages/src/es-ES.ts`; verified: `npm run build -w
  > @rochas-surf-school/app-messages` and `npx turbo run check-types --filter=@rochas-surf-school/app-messages`
  > (exit 0); deviations: none

### Mobile (`apps/mobile`)

- [x] **T-04** — Update the hint text asserted in
  `src/modules/classes/components/time-range-picker/time-range-picker.component.test.tsx` to "Suggested from this
  week's and last week's classes.", and the doc comments that say "last week's classes" in
  `time-range-picker.types.ts` and `src/modules/classes/hooks/use-time-range-suggestions.hook.ts` (this week's and
  last week's classes, without cancelled ones). Load the `vercel-react-native-skills` and
  `vercel-react-best-practices` skills first.
  Covers: ER-03 · Done when: `npx jest src/modules/classes/components/time-range-picker` passes (from `apps/mobile`).
  > ✅ 2026-11-16 — hint text in the test and two doc comments updated; files:
  > `apps/mobile/src/modules/classes/components/time-range-picker/time-range-picker.component.test.tsx`,
  > `apps/mobile/src/modules/classes/components/time-range-picker/time-range-picker.types.ts`,
  > `apps/mobile/src/modules/classes/hooks/use-time-range-suggestions.hook.ts`; verified: `npx jest
  > src/modules/classes/components/time-range-picker` (9 passed); deviations: none

### Web (`apps/web`)

- [x] **T-05** — Update the pt-BR hint asserted in
  `src/modules/designs/components/time-range-picker/time-range-picker.component.test.tsx` and
  `src/modules/designs/components/time-range-hint/time-range-hint.component.test.tsx` to "Sugeridos a partir das
  aulas desta semana e da passada.", and the "last week" doc comments in
  `src/modules/designs/components/time-range-picker/time-range-picker.types.ts` and
  `src/modules/designs/data/admin-app.ts` (the suggestions comment only).
  Covers: ER-03 · Done when: `npx vitest run src/modules/designs/components/time-range-picker
  src/modules/designs/components/time-range-hint` passes (from `apps/web`).
  > ✅ 2026-11-16 — pt-BR hint in both tests and the "last week" doc comments updated; files:
  > `apps/web/src/modules/designs/components/time-range-hint/time-range-hint.component.test.tsx`,
  > `apps/web/src/modules/designs/components/time-range-picker/time-range-picker.component.test.tsx`,
  > `apps/web/src/modules/designs/components/time-range-picker/time-range-picker.types.ts`,
  > `apps/web/src/modules/designs/data/admin-app.ts`; verified: `npx vitest run
  > src/modules/designs/components/time-range-picker src/modules/designs/components/time-range-hint` (3 passed);
  > deviations: none

### Designs (`.docs/designs`)

- [ ] **T-06** — Regenerate `.docs/designs/admin-app.html` and its sources: build the web
  (`npx turbo run build --filter=@rochas-surf-school/web`), run `next start -p 3100` in `apps/web`, then
  `node .docs/designs/scripts/build-design.mjs admin-app` (and `node .docs/designs/scripts/pack.mjs admin-app` if it
  reports the `.html` stale). Commit the regenerated sources and `.html`.
  Covers: ER-03 · Done when: `node .docs/designs/scripts/pack.mjs --check` exits 0 and `grep -c "desta semana e da
  passada" .docs/designs/admin-app.html` is at least 1.

### Verification

- [ ] **T-07** — Run every command in the Verification Plan from the repo root; all pass. Follow the user journey in
  the iOS simulator. Record the output summary as evidence. Covers: all · Done when: every command exits 0 and the
  journey matches.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 088` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 088` — every line this spec adds or changes is covered
  - `node .specs/scripts/run-e2e.mjs 088` — the backend e2e suite (with `describe('suggestions')` of
    `classes.e2e-spec.ts`) and the web Playwright suite pass
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/app-messages --filter=@rochas-surf-school/mobile --filter=@rochas-surf-school/web`
    — no errors
  - `node .docs/designs/scripts/pack.mjs --check` — `admin-app.html` matches its sources
- User journeys (e2e, followed in the iOS simulator in pt-BR, signed in as an approved admin, local backend):
  - With no classes last week, create a batch for a day later this week at 06:00–07:00 and 08:00–09:00; open "Nova
    aula" again → the chips "06:00 – 07:00" and "08:00 – 09:00" are shown unselected, with the hint "Sugeridos a
    partir das aulas desta semana e da passada.".
  - Cancel the 06:00–07:00 class (class details → cancel) and open "Nova aula" again → only "08:00 – 09:00" is
    suggested.
  - Open "Editar aula" on the 08:00–09:00 class → its "Início e fim" chips include this week's ranges.

## Memory Impact

- `memory/product.md` — the class form suggests the time ranges of this week's and last week's classes (Monday to
  Sunday, Fortaleza), without cancelled ones, rather than only the previous week's.
- `memory/technical-context.md` — Classes: `GET /classes/time-range-suggestions` reads the classes starting from last
  Monday 00:00 to next Monday 00:00 (Fortaleza) and skips cancelled ones.
- `memory/modules/classes.md` — the "Time-range suggestion" concept (this week's and last week's classes) and the
  "Suggestions come from last week" rule (window last Monday → next Monday, cancelled classes skipped in the use case,
  not in `findStartingBetween`).

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
