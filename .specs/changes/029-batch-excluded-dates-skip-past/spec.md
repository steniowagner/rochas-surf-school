---
id: "029"
slug: batch-excluded-dates-skip-past
title: "Batch creation: remove days and skip past times"
status: in-progress
created: 2026-10-15
started: 2026-10-15
base_commit: d152690c7f7b0efcec32af45720c2ffb958acd55
fronts: [classes, backend, mobile]
depends_on: []
---

# 029 — Batch creation: remove days and skip past times

## Goal

Bring into the spec workflow the batch changes made on `main` after spec 028 without a spec: a batch can leave
out single dates of its range, and the API can skip the classes that have already started instead of refusing
the whole batch, which the "Nova aula" screen now uses. The spec checks that the behavior is what the code and
its tests do, closes the one gap in the tests, and — once finished — makes the project memory and the
requirements describe it, so the next spec (the Aulas tab, which opens this form) builds on the real rules.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: Class (batch), the decision "A batch is all
  or nothing, and each instructor hears about it once".
- Requirements: [requirements.md → Batch creation](../../../.docs/requirements.md#batch-creation) — a batch is a
  date range, the weekdays to include and time ranges; [requirements.md → No classes in the
  past](../../../.docs/requirements.md#no-classes-in-the-past) — a batch with any past class is not created at
  all; [requirements.md → 3. Class scheduling](../../../.docs/requirements.md#3-class-scheduling) — the area
  overview mentions the weekday filter.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Classes, Automated
  validation, Coverage; module rules in [modules/classes.md](../../memory/modules/classes.md).
- Existing code this records (commits after the spec-028 merge `cd59871`):
  - `3631c29` — `POST /classes/batch` takes the optional `excludedDates` (`YYYY-MM-DD` dates of the range that get
    no class, whatever their weekday) and `skipPast` (boolean); `isValidExcludedDates` and `listBatchDates` in
    `modules/classes/src/school-class/model/class-batch.ts`, the checks and the filter in
    `modules/classes/src/school-class/usecase/create-class-batch.usecase.ts`, both fields passed through by
    `apps/backend/src/modules/classes/classes.controller.ts`; tests in the module, the controller spec and
    `apps/backend/test/classes.e2e-spec.ts`.
  - `6fb29d3` — the "Nova aula" form: the "Nos dias" weekday filter (`weekday-filter` component) is gone; days are
    removed by pressing them inside a complete range (`date-range-calendar`, `utils/calendar.ts`) and listed by
    `DateRangeSummary`; a time that has passed today stays selectable and is skipped for today
    (`new-class.screen.hook.ts`, `utils/time-ranges.ts`, `TimeRangeHint`); `buildBatchRequest` sends all seven
    weekdays, `excludedDates` when not empty and `skipPast: true` when needed.
  - `e2f9f59` — the `grapeTint` color token (light and dark), used by the calendar's range band.
  - `ced390a` (the time wheels made touchable) restores behavior spec 028 already required, so it needs no record
    here; it falls inside the measured range anyway.
- Measured before planning: `node .specs/scripts/run-related-tests.mjs --base cd59871` passed (mobile 503 tests,
  `modules/classes` 154, web 21, backend unit 8) and `node .specs/scripts/check-coverage.mjs --base cd59871`
  printed `COVERAGE OK` for the 24 measured files. The backend e2e suite wasn't run (it needs Postgres).

## Scope

### In scope

- Verifying `excludedDates` and `skipPast` on the API, and the form's day removal and past-time skipping, against
  the existing tests and on the simulator.
- One module unit test for the one rule no test asserts: with `skipPast`, the 200-class limit is judged on the
  classes that remain.
- Recording the behavior in the memory and the linked requirement sections (done by `spec-finish` from Memory
  Impact).

### Out of scope

- Any change to the product code: the commits above are kept as they are.
- Removing `weekdays` from the API (see D-03).
- Mapping `class.excludedDates.invalid` and `class.skipPast.invalid` to messages in the app: the app never sends
  invalid values, so they fall back to the generic error like any unexpected key.
- The Aulas tab and its "Criar aula neste dia" entry point (the next spec).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The spec changes no product code; its only code is the unit test of T-01. | The behavior already shipped with passing tests and full coverage of its changed lines; the gap is the record, not the code. |
| D-02 | The related tests and the coverage gate run with `--base cd59871` (the spec-028 merge commit), not the spec's `base_commit`. | The change predates the spec branch: measured from `base_commit`, nothing would be in scope. |
| D-03 | The API keeps `weekdays` as it is; the app always sends all seven and removes single days with `excludedDates`. The requirement describes a date range with single days removed. | Older app builds keep working, and the API stays a superset of what the app uses. |
| D-04 | Product rule: no class is ever created after its start. The app skips a time that has already passed today for today only and creates the rest of the batch, sending `skipPast: true`; the "Criar N aulas" count already leaves those classes out, so N is still exactly what is created. Without `skipPast` the API keeps refusing the whole batch with `class.startsAt.past`. | Confirmed by the user: admins no longer have to deselect today's past times by hand, and "no class in the past" and "N means N" both still hold. |

## Expected Results

### ER-01 — Excluded dates get no class

- **Front:** backend
- **Behavior:** Given an approved admin and an approved instructor, when the admin calls `POST /classes/batch`
  with `startDate: "2026-10-20"`, `endDate: "2026-10-22"`, all seven weekdays, two time ranges and
  `excludedDates: ["2026-10-21"]`, then the API answers 201 `{ count: 4 }` and the stored classes are two on the
  20th and two on the 22nd, none on the 21st.
- **Edge and error cases:** a date that isn't a real `YYYY-MM-DD` (e.g. `"16/10/2026"`) → 422 with
  `class.excludedDates.invalid`, collected with the other shape errors; excluding every date of the range → 422
  `class.batch.empty`; nothing is stored on either refusal; `excludedDates` absent or `null` changes nothing.
- **Verify by:** `apps/backend/test/classes.e2e-spec.ts` → "creates no class on an excluded date, whatever its
  weekday" and "refuses malformed excluded dates and a batch whose dates are all excluded"
  (`npm run test:e2e --workspace apps/backend`); `modules/classes/test/school-class/model/class-batch.test.ts` →
  "leaves out the excluded dates, whatever their weekday".

### ER-02 — skipPast leaves out the classes that have started

- **Front:** backend
- **Behavior:** Given the server clock at 10:00 Fortaleza on 2026-10-14, when an admin creates a batch from the
  14th to the 16th with 08:00–09:00 and 16:00–17:00 and `skipPast: true`, then the API answers 201
  `{ count: 5 }` (the 14th at 08:00 is left out) and five classes are stored; the same batch without `skipPast`
  is refused with 422 `class.startsAt.past` and stores nothing.
- **Edge and error cases:** a `skipPast` that isn't a boolean (e.g. `"yes"`) → 422 `class.skipPast.invalid`; a
  batch whose classes have all started → 422 `class.batch.empty` even with `skipPast`; a class starting exactly at
  the server's now counts as started; with `skipPast`, more than 200 classes *after* leaving out the started ones
  → 422 `class.batch.tooLarge` (`details: { max: 200 }`), while 201 listed classes of which one has started are
  created (200).
- **Verify by:** `apps/backend/test/classes.e2e-spec.ts` → `past` → "creates only the classes that have not
  started when asked to skip the past", "refuses a malformed skipPast and an all-past batch even when skipping"
  and "refuses the whole batch when one class has already started"; the 200-limit case in
  `modules/classes/test/school-class/usecase/create-class-batch.usecase.test.ts` (added by T-01;
  `npx jest test/school-class/usecase/create-class-batch.usecase.test.ts -t "skip"` from `modules/classes`).

### ER-03 — Nova aula removes single days of a range

- **Front:** mobile
- **Behavior:** Given an admin on "Nova aula" with a complete range of several days, when they press a day inside
  the range, then that day is struck through, listed under "Dias removidos", the day and class counts drop by
  that day, and "Criar N aulas" sends `excludedDates` with it; pressing the day again puts it back. The screen
  has no "Nos dias" weekday filter.
- **Edge and error cases:** pressing the first or last day of the range removes the whole range and disables the
  button; pressing a day outside the range starts a new range with nothing removed; a single day sends no
  `excludedDates`; with nothing removed the summary says "Nenhum dia removido" and explains how to remove one.
- **Verify by:** `npx jest src/modules/classes` from `apps/mobile` — `new-class.screen.test.tsx` → "sends the
  days taken out of the range", "forgets the removed days when a new range is started", "removes the range when
  one of its ends is pressed, and turns the button off"; `date-range-calendar.component.test.tsx` → "removes a
  day of the range when it is pressed, and puts it back when it is pressed again"; and the first user journey of
  the Verification Plan.

### ER-04 — Nova aula skips today's past times

- **Front:** mobile
- **Behavior:** Given today is among the picked dates and a selected time range has already started today, when
  the admin looks at the time chips, then that chip stays selectable, the hint "Os horários que já passaram não
  terão aula hoje." is shown, the count leaves out today's class for that time, and "Criar N aulas" sends
  `skipPast: true` and creates the classes of the other days.
- **Edge and error cases:** when the only date is today and every selected time has passed, the count is 0 and
  the button is disabled; when today isn't among the dates nothing is skipped and `skipPast` isn't sent; a chip
  that overlaps a selected one is still blocked.
- **Verify by:** `npx jest src/modules/classes` from `apps/mobile` — `new-class.screen.test.tsx` → "keeps the
  ranges that started selectable when today is among the dates, and says so", "counts no class for a time that
  has passed today, and creates the other days with skipPast", "creates nothing when the only date is today and
  every selected time has passed"; and the second user journey of the Verification Plan.

## Tasks

### Classes module (`modules/classes`)

- [x] **T-01** — Add to `modules/classes/test/school-class/usecase/create-class-batch.usecase.test.ts` the test
  that, with `skipPast: true`, a batch listing 201 classes of which one has started is created (200 classes) and
  one listing 202 with one started is refused with `class.batch.tooLarge` and `details: { max: 200 }`. No source
  change.
  Covers: ER-02 · Done when: `npx jest test/school-class/usecase/create-class-batch.usecase.test.ts` passes from
  `modules/classes` with the new test.
  > ✅ 2026-10-15 — added the test "judges the 200-class limit on the classes left after skipping the past": 201
  > listed with one started → 200 created; 202 listed with one started → `class.batch.tooLarge`, `details: { max:
  > 200 }`, nothing stored; files: `modules/classes/test/school-class/usecase/create-class-batch.usecase.test.ts`;
  > verified: `npx jest test/school-class/usecase/create-class-batch.usecase.test.ts` from `modules/classes` (70
  > passed); the test fails when the use case judges the limit on the listed classes instead of the remaining
  > ones (checked by temporarily changing the source, then restored); deviations: none

### Backend (`apps/backend`)

- [ ] **T-02** — With Postgres up and the migrations applied (`npm run db:start --workspace apps/backend`, then
  `npm run prisma:migrate:deploy --workspace apps/backend`), run the backend e2e suite and confirm the tests named
  in ER-01 and ER-02 run and pass. No code change; record the counts as evidence.
  Covers: ER-01, ER-02 · Done when: `npm run test:e2e --workspace apps/backend` exits 0 with those tests listed as
  passed.

### Mobile (`apps/mobile`)

- [ ] **T-03** — Run the classes tests of the app and follow the two user journeys of the Verification Plan on the
  iOS simulator against the local backend. No code change; record the counts and what was seen as evidence.
  Covers: ER-03, ER-04 · Done when: `npx jest src/modules/classes` passes from `apps/mobile` with the tests named
  in ER-03 and ER-04, and both journeys show what they describe.

### Verification

- [ ] **T-04** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs --base cd59871` — the tests related to the commits since the
    spec-028 merge and to T-01 pass, with coverage (D-02).
  - `node .specs/scripts/check-coverage.mjs --base cd59871` — `COVERAGE OK`: every changed line since the spec-028
    merge is covered.
  - `node .specs/scripts/run-e2e.mjs 029` — the backend e2e suite passes (it runs because the backend depends on
    `modules/classes`, which T-01 changes; Postgres up, migrations applied).
  - `npx turbo run lint check-types --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
- User journeys (iOS simulator, signed in as an approved admin, local backend):
  - Days: Início → "Criar aulas" → pick a range of five days from tomorrow → press the middle day: it is struck
    through, "Dias removidos" lists it and the day count drops by one; press it again: it is back. Remove it again,
    pick one time, a location and an instructor → "Criar N aulas": the toast shows N and no class is stored on the
    removed day (`SELECT starts_at FROM classes ORDER BY created_at DESC` on the local database).
  - Past times: with the clock after 08:00 Fortaleza, pick today and tomorrow and a time range starting at or
    before now: the chip stays selected, the hint "Os horários que já passaram não terão aula hoje." shows, and the
    button reads "Criar 1 aula"; creating it stores only tomorrow's class. Pick only today with that time: the
    button is disabled.

## Memory Impact

- `memory/modules/classes.md` — the Batch concept: a first and a last date, the weekdays to include, the dates
  left out (`excludedDates`), time ranges; the rules: excluded dates get no class; `class.excludedDates.invalid`
  and `class.skipPast.invalid` among the shape errors; with `skipPast` the classes that have started are left out
  (then `class.batch.empty` when none remain, and the 200 limit judged on the rest), without it one past class
  refuses the batch; the app's form removes single days and skips today's past times.
- `memory/technical-context.md` — Classes: the `POST /classes/batch` body gains `excludedDates?` and `skipPast?`
  with their errors and the filter order; the mobile part: `buildBatchRequest` sends all seven weekdays,
  `excludedDates` when not empty and `skipPast: true` when a selected time has passed today, and the count leaves
  those classes out; Applications → Dates: the class calendar marks the range as a band (`grapeTint`), removes and
  restores single days, has no weekday filter, and `DateRangeSummary` lists the removed days.
- `memory/product.md` — Class: a batch is a date range with single days removed (no weekday filter in the app);
  the decision "A batch is all or nothing" gains D-04's exception (today's past times are skipped, N still means
  N); the spec-028 paragraph of Current state describes the form as it is now.
- Source documents (by `spec-finish`, the linked sections): Batch creation (a date range with single days
  removed; the scenario rewritten without a weekday filter), No classes in the past (the skip of today's past
  times when the app asks for it), and the overview of 3. Class scheduling.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
