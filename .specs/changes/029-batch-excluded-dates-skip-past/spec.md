---
id: "029"
slug: batch-excluded-dates-skip-past
title: "Batch creation: remove days and skip past times"
status: in-review
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
its tests do, closes the one gap in the tests, fixes the one bug the review found (with `skipPast`, a batch starting
before today escaped the 200-class limit), and — once finished — makes the project memory and the
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
- The fix of review finding F-01 in `create-class-batch.usecase.ts` (D-05), with its unit and e2e tests, and the
  missing 422 and nothing-stored assertions of the e2e "refuses a malformed skipPast…".
- Recording the behavior in the memory and the linked requirement sections (done by `spec-finish` from Memory
  Impact).

### Out of scope

- Any other change to the product code: the commits above are kept as they are, except for the F-01 fix (D-05).
- Re-reading the clock when "Criar N aulas" is pressed, so a "Nova aula" screen left open across midnight or across
  a time's start still skips the past (follow-up).
- The success toast drawn with the error style (spec 028's `alertMessage.show`; follow-up).
- Removing `weekdays` from the API (see D-03).
- Mapping `class.excludedDates.invalid` and `class.skipPast.invalid` to messages in the app: the app never sends
  invalid values, so they fall back to the generic error like any unexpected key.
- The Aulas tab and its "Criar aula neste dia" entry point (the next spec).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The spec's only product change is the F-01 fix in `modules/classes/src/school-class/usecase/create-class-batch.usecase.ts` (D-05); its other code is tests (T-01, T-05, T-06). | The behavior already shipped with passing tests and full coverage of its changed lines; the gap is the record, plus the one bug the review found. |
| D-02 | The related tests and the coverage gate run with `--base cd59871` (the spec-028 merge commit), not the spec's `base_commit`. | The change predates the spec branch: measured from `base_commit`, nothing would be in scope. |
| D-03 | The API keeps `weekdays` as it is; the app always sends all seven and removes single days with `excludedDates`. The requirement describes a date range with single days removed. | Older app builds keep working, and the API stays a superset of what the app uses. |
| D-04 | Product rule: no class is ever created after its start. The app skips a time that has already passed today for today only and creates the rest of the batch, sending `skipPast: true`; the "Criar N aulas" count already leaves those classes out, so N is still exactly what is created. Without `skipPast` the API keeps refusing the whole batch with `class.startsAt.past`. | Confirmed by the user: admins no longer have to deselect today's past times by hand, and "no class in the past" and "N means N" both still hold. |
| D-05 | With `skipPast`, the use case lists the batch from the later of `startDate` and today's date in America/Fortaleza (by the server clock), so the days before today are dropped before the listing cap (`CLASS_BATCH_MAX + timeRanges.length`) is applied; started classes can then only be today's, one per time range at most, and the cap's margin holds. Without `skipPast` the listing is unchanged, so a past day still refuses the batch with `class.startsAt.past`. When today is after `endDate`, nothing remains → `class.batch.empty`. | Fixes F-01 while keeping the cap that stops a huge range from looping for long; dropping the cap brings that loop back, and counting only future classes inside `listBatchClasses` changes the model's signature and still walks every past day. |

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
  created (200); with `skipPast` and a `startDate` before today, the days before today get no class and the 200
  limit holds whatever the start date: from 2026-10-04 to 2027-06-30 (clock 2026-10-14 10:00 Fortaleza), every
  weekday, 16:00–17:00 → 422 `class.batch.tooLarge` (`details: { max: 200 }`) with nothing stored, while a past
  `startDate` with at most 200 classes left creates only those that haven't started. The malformed `skipPast`
  is refused with status 422 and stores nothing.
- **Verify by:** `apps/backend/test/classes.e2e-spec.ts` → `past` → "creates only the classes that have not
  started when asked to skip the past", "refuses a malformed skipPast and an all-past batch even when skipping"
  (asserting 422 and nothing stored, by T-06), "refuses the whole batch when one class has already started" and
  "refuses more than 200 classes left after skipping a start date in the past" (added by T-06); in
  `modules/classes/test/school-class/usecase/create-class-batch.usecase.test.ts` the 200-limit case (added by
  T-01) and "refuses more than 200 classes left when the batch starts before today" and "creates only the
  classes that have not started when the batch starts before today" (added by T-05) —
  `npx jest test/school-class/usecase/create-class-batch.usecase.test.ts -t "skip|before today"` from
  `modules/classes`.

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
- [x] **T-05** — Fix F-01 in `modules/classes/src/school-class/usecase/create-class-batch.usecase.ts` as D-05
  says: with `skipPast`, list the batch from the later of `startDate` and today's date in America/Fortaleza (from
  `clockProvider.now()`, `CLASS_TIME_ZONE`), keeping the listing cap and updating its comment; without `skipPast`
  the listing is unchanged. Add to `modules/classes/test/school-class/usecase/create-class-batch.usecase.test.ts`,
  with the test setup's clock (2026-10-14 10:00 Fortaleza): "refuses more than 200 classes left when the batch
  starts before today" (2026-10-04 → 2027-06-30, every weekday, 16:00–17:00, `skipPast: true` →
  `class.batch.tooLarge`, `details: { max: 200 }`, nothing stored, nobody notified) and "creates only the classes
  that have not started when the batch starts before today" (2026-10-10 → 2026-10-16, 08:00–09:00 and
  16:00–17:00, `skipPast: true` → `{ count: 5 }`, the classes from the 14th at 16:00 on). Skill:
  `module-use-case`.
  Covers: ER-02 · Done when: `npx jest test/school-class/usecase/create-class-batch.usecase.test.ts` passes from
  `modules/classes` with the two new tests, the first fails on the code before the fix, and every line the fix
  changes is covered.
  > ✅ 2026-10-16 — with `skipPast`, the use case now lists from the later of `startDate` and today in
  > America/Fortaleza (`format(now, "yyyy-MM-dd", { in: tz(CLASS_TIME_ZONE) })`), keeping the cap; the comment is
  > updated, and without `skipPast` the listing is unchanged; added the tests "refuses more than 200 classes left
  > when the batch starts before today" and "creates only the classes that have not started when the batch starts
  > before today" (5 classes, the 14th at 16:00 on); files:
  > `modules/classes/src/school-class/usecase/create-class-batch.usecase.ts`,
  > `modules/classes/test/school-class/usecase/create-class-batch.usecase.test.ts`; verified: `npx jest
  > test/school-class/usecase/create-class-batch.usecase.test.ts` from `modules/classes` (72 passed); with the
  > source change stashed the first new test fails (`tooLarge` not thrown) and the second passes; both branches of
  > the changed ternary are exercised (past start date and the other tests); deviations: none

### Backend (`apps/backend`)

- [x] **T-02** — With Postgres up and the migrations applied (`npm run db:start --workspace apps/backend`, then
  `npm run prisma:migrate:deploy --workspace apps/backend`), run the backend e2e suite and confirm the tests named
  in ER-01 and ER-02 run and pass. No code change; record the counts as evidence.
  Covers: ER-01, ER-02 · Done when: `npm run test:e2e --workspace apps/backend` exits 0 with those tests listed as
  passed.
  > ✅ 2026-10-15 — the local Postgres was already up; migrations: "No pending migrations to apply" (9 found); the
  > e2e suite passes, and `classes.e2e-spec.ts` run verbose lists as passed "creates no class on an excluded date,
  > whatever its weekday", "refuses malformed excluded dates and a batch whose dates are all excluded", `past` →
  > "creates only the classes that have not started when asked to skip the past", "refuses a malformed skipPast and
  > an all-past batch even when skipping" and "refuses the whole batch when one class has already started"; files:
  > none; verified: `npm run test:e2e --workspace apps/backend` (15 files, 377 tests passed) and
  > `npx vitest run --config ./vitest.config.e2e.ts test/classes.e2e-spec.ts --reporter=verbose` (32 passed);
  > deviations: none (the `ERROR` lines in the output are logged by tests that force notifier or email failures)
- [x] **T-06** — In `apps/backend/test/classes.e2e-spec.ts` → `past`: add "refuses more than 200 classes left
  after skipping a start date in the past" (`POST /classes/batch` with a `startDate` ten days before the server's
  today, an `endDate` eight months after it, every weekday, one time range, `skipPast: true` → 422
  `class.batch.tooLarge` with `details: { max: 200 }`, and no class stored); and make "refuses a malformed skipPast
  and an all-past batch even when skipping" also assert the malformed request's 422 status and that nothing was
  stored. Needs T-05.
  Covers: ER-02 · Done when: `npm run test:e2e --workspace apps/backend` exits 0 with both tests listed as passed
  (Postgres up, migrations applied), and the new test fails without T-05's fix.
  > ✅ 2026-10-16 — added "refuses more than 200 classes left after skipping a start date in the past" to `past`
  > (`startDate` 2026-10-04, ten days before the test clock's today, `endDate` 2027-06-14, every weekday, one range,
  > `skipPast: true` → 422 `class.batch.tooLarge`, `details: { max: 200 }`, no class stored) and made "refuses a
  > malformed skipPast and an all-past batch even when skipping" also assert the malformed 422 and that nothing was
  > stored; files: `apps/backend/test/classes.e2e-spec.ts`; verified: `npm run test:e2e --workspace apps/backend`
  > (15 files, 378 tests passed, after `npm run build --workspace modules/classes` since the backend reads the
  > module from `dist`); the new test got 201 instead of 422 on the module built before T-05; deviations: none

### Mobile (`apps/mobile`)

- [x] **T-03** — Run the classes tests of the app and follow the two user journeys of the Verification Plan on the
  iOS simulator against the local backend. No code change; record the counts and what was seen as evidence.
  Covers: ER-03, ER-04 · Done when: `npx jest src/modules/classes` passes from `apps/mobile` with the tests named
  in ER-03 and ER-04, and both journeys show what they describe.
  > ✅ 2026-10-15 23:28 — ran the classes tests of the app and both journeys on the iOS simulator (iPhone 18 Pro,
  > signed in as the dev admin, backend from `apps/backend/dist` on :4000, local Postgres). Days: range 18–22 Oct
  > ("5 dias"); pressing the 20th struck it through, listed "20 OUT" under "Dias removidos" and the count went to "4
  > dias"; pressing it again brought it back ("5 dias", "Nenhum dia removido"); removed again, one time (12:00–13:00),
  > "Review R2 Beach" and "Dev Instructor" → the caption read "4 dias × 1 horário · Review R2 Beach", the button
  > "CRIAR 4 AULAS", the toast "4 aulas criadas", and the database got classes on 18, 19, 21 and 22 Oct only, none on
  > the 20th. Past times (23:26 in Fortaleza, today the 15th): today + tomorrow with 12:00–13:00 → the chip stayed
  > selected, the hint "Os horários que já passaram não terão aula hoje." showed, the caption "2 dias × 1 horário" and
  > the toast "Aula criada"; the database got one class, 16 Oct 12:00 Fortaleza, none for today. Only today with the
  > same time and everything else filled → "CRIAR AULA" stayed disabled. Files: none; verified: `npx jest
  > src/modules/classes` from `apps/mobile` (22 suites, 162 tests passed, the seven tests named in ER-03 and ER-04
  > listed as passed with `--verbose`); deviations: with one class the button reads "Criar aula" (singular, no number)
  > rather than the "Criar 1 aula" the journey text says; the creation toast is drawn with a red background and an
  > alert icon even though it is a success (noted as a follow-up, outside this spec); the local database kept the 5
  > classes the journeys created

### Verification

- [x] **T-04** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0.
  > ✅ 2026-10-15 23:31 — ran the whole Verification Plan; files: none; verified: `node
  > .specs/scripts/run-related-tests.mjs --base cd59871` (RELATED TESTS PASSED: backend, mobile, `modules/classes` — 12
  > suites, 155 tests — and the web suite; `packages/design-tokens` has no test runner), `node
  > .specs/scripts/check-coverage.mjs --base cd59871` (COVERAGE OK — every changed line covered in 24 files), `node
  > .specs/scripts/run-e2e.mjs 029` (E2E PASSED, apps/backend), `npx turbo run lint check-types --filter=…classes
  > --filter=…backend --filter=…mobile` (16 tasks successful, no errors); the user journeys are in T-03; deviations:
  > none
- [x] **T-07** — After T-05 and T-06, run every command in the Verification Plan again from the repo root; all
  pass. Record the output summary as evidence. Covers: all · Done when: every command exits 0.
  > ✅ 2026-10-16 — ran the whole Verification Plan again; files: none; verified: `node
  > .specs/scripts/run-related-tests.mjs --base cd59871` (RELATED TESTS PASSED: backend, mobile, `modules/classes`
  > and the web suite), `node .specs/scripts/check-coverage.mjs --base cd59871` (COVERAGE OK; `create-class-batch.usecase.ts`
  > 100% statements, branches, functions and lines on its changed lines), `node .specs/scripts/run-e2e.mjs 029` (E2E
  > PASSED, apps/backend, 378 tests), `npx turbo run lint check-types --filter=…classes --filter=…backend
  > --filter=…mobile` (16 tasks successful); the user journeys were run in T-03 and the mobile code did not change
  > since; deviations: none

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs --base cd59871` — the tests related to the commits since the
    spec-028 merge and to T-01, T-05 and T-06 pass, with coverage (D-02).
  - `node .specs/scripts/check-coverage.mjs --base cd59871` — `COVERAGE OK`: every changed line since the spec-028
    merge is covered.
  - `node .specs/scripts/run-e2e.mjs 029` — the backend e2e suite passes, with T-06's tests (it runs because the
    backend depends on `modules/classes`, which T-01 and T-05 change, and T-06 changes the backend's e2e tests;
    Postgres up, migrations applied).
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
  (then `class.batch.empty` when none remain, and the 200 limit judged on the rest), and the days before today
  are skipped before listing, so the 200 limit holds whatever the start date (D-05); without it one past class
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

- 2026-10-16 — /spec-plan --amend — D-01 changed: "The spec changes no product code; its only code is the unit
  test of T-01" → "The spec's only product change is the F-01 fix in `create-class-batch.usecase.ts` (D-05); its
  other code is tests (T-01, T-05, T-06)". Reason: review finding F-01 needs a product fix. Approved by the user.
- 2026-10-16 — /spec-plan --amend — D-05 added: with `skipPast`, list the batch from the later of `startDate` and
  today in Fortaleza, keeping the listing cap. Reason: the fix the user chose for F-01 over dropping the cap or
  counting only future classes inside `listBatchClasses`. Approved by the user.
- 2026-10-16 — /spec-plan --amend — ER-02 changed: edge cases gain "with `skipPast` and a `startDate` before today,
  the days before today get no class and the 200 limit holds whatever the start date" and the malformed
  `skipPast`'s 422 and nothing stored; Verify by gains the T-05 unit tests and the T-06 e2e test. Reason: F-01.
  Approved by the user.
- 2026-10-16 — /spec-plan --amend — T-05 added (classes module, Covers: ER-02): the fix and its unit tests.
  T-06 added (backend, Covers: ER-02): the e2e test for a past start date and the tightened malformed-skipPast
  test. T-07 added (Verification, Covers: all): rerun the Verification Plan; T-04 stays done, its run predates
  the fix. Reason: F-01 and the review's note on the e2e test. Approved by the user.
- 2026-10-16 — /spec-plan --amend — Goal, Scope, Verification Plan and Memory Impact changed: the Goal and In
  scope name the F-01 fix; Out of scope "Any change to the product code" → "Any other change to the product
  code", plus re-reading the clock on submit in "Nova aula" and the success toast's error style as follow-ups;
  the Verification Plan names T-05 and T-06; Memory Impact (`modules/classes.md`) adds that the 200 limit holds
  whatever the start date. Reason: F-01 and the review's notes. Approved by the user.

## Review

### Round 1 — 2026-10-16 — changes-requested

**Checks**

- lint ✅ · type check ✅ (`npx turbo run lint check-types` for classes, backend, mobile: 16 tasks successful)
- related tests ✅ `run-related-tests.mjs --base cd59871` (D-02): mobile 503 passed, `modules/classes` 155 passed,
  web 21 passed, backend unit 8 passed — RELATED TESTS PASSED
- coverage of the changed lines ✅ `check-coverage.mjs --base cd59871`: COVERAGE OK, 24 files; no coverage-ignore
  comments in the diff
- e2e: backend suite ✅ `run-e2e.mjs 029` (15 files, 377 passed) · mobile: both user journeys exercised on the iOS
  simulator (iPhone 18 Pro, local backend and Postgres) ✅
- scope ✅ — `base_commit..HEAD` touches only the spec and the T-01 test (D-01)

**Expected Results**

- ER-01 ✅ — e2e "creates no class on an excluded date, whatever its weekday" asserts 201 `{ count: 4 }` and the
  stored dates (20, 20, 22, 22); "refuses malformed excluded dates…" asserts 422 `class.excludedDates.invalid`, 422
  `class.batch.empty` and nothing stored; `null`/absent covered by `isValidExcludedDates` and the module tests.
- ER-02 ❌ — the named cases pass (5 of 6 created with `skipPast`, `class.startsAt.past` without it,
  `class.skipPast.invalid`, all-past → `class.batch.empty`, exactly-now counts as started, T-01's 201→200 / 202→
  `tooLarge`), but the 200 limit is not enforced when the batch starts on an earlier date: see F-01.
- ER-03 ✅ — named tests pass; on the simulator, range 17–21 Oct ("5 dias", "Nenhum dia removido" with the
  explanation) → pressing the 19th struck it through, listed "19 OUT" under "Dias removidos", "4 dias"; pressing it
  again restored it; removed again + 12:00–13:00 + location + instructor → "CRIAR 4 AULAS", toast "4 aulas
  criadas", and the database got classes on 17, 18, 20 and 21 Oct only. No "Nos dias" filter on the screen.
- ER-04 ✅ — named tests pass; on the simulator at 01:04 Fortaleza, today (16) + 17 with 00:00–01:00 → the chip
  stayed selected, the hint "Os horários que já passaram não terão aula hoje." showed, the button read "CRIAR AULA"
  (one class), toast "Aula criada", and the database got one class, 17 Oct 00:00 Fortaleza, none for today. The
  only-today case is covered by "creates nothing when the only date is today and every selected time has passed"
  (not repeated on the simulator; the executor saw it in T-03).

**Findings**

- [x] **F-01** (ER-02) — with `skipPast: true` and a `startDate` before today, a batch of more than 200 future
  classes is silently cut short and created instead of refused. `CreateClassBatch` lists at most
  `CLASS_BATCH_MAX + timeRanges.length` classes, assuming (its comment says so) that started classes can only be on
  today's date; but nothing stops `startDate` from being in the past, so the past days eat the margin, the list is
  truncated before the filter, and the remainder passes the 200 check.
  Reproduce: in `modules/classes`, with the test setup's clock (2026-10-14 10:00 Fortaleza), execute the use case
  with `startDate: "2026-10-04"`, `endDate: "2027-06-30"`, all seven weekdays, one range 16:00–17:00 and
  `skipPast: true` → `{ count: 192 }`, 192 classes stored, the last on 2027-04-23; the range holds ~259 classes that
  haven't started. Same through the API: `POST /classes/batch` with a `startDate` ten days ago, an `endDate` eight
  months ahead, one range and `skipPast: true` → 201. Expected: 422 `class.batch.tooLarge` with
  `details: { max: 200 }` and nothing stored (ER-02: "more than 200 classes *after* leaving out the started ones →
  422"), plus a unit test for it. The fix touches product code, which D-01 rules out, so it needs an amendment
  first (`/spec-plan --amend 029`): e.g. drop the cap when `skipPast` is set (the range is already bounded by the
  date checks) or count the started classes before capping.
  > ✅ 2026-10-16 — fixed by T-05 (commit `6170c61`) as D-05: with `skipPast` the batch is listed from the later of
  > `startDate` and today in America/Fortaleza, so the 200 limit holds whatever the start date; reproduced first
  > with the reviewer's input (the new unit test got no `tooLarge` before the fix); verified by the unit tests of
  > T-05 and the e2e test of T-06 (422 `class.batch.tooLarge`, `details: { max: 200 }`, nothing stored); files: see
  > T-05 and T-06

**Notes**

- The app is not affected by F-01: the calendar disables the days before today, so the app never sends a past
  `startDate`, and its own count (`CLASS_BATCH_MAX + selectedRanges.length` minus the past ranges) is right for
  ranges that start today.
- The "Nova aula" screen reads today and the time only when it renders: a screen left open across midnight (found
  that way on the simulator: opened on the 15th, still showing the 15th as today at 01:02 on the 16th) or across a
  time's start sends no `skipPast` and gets the whole batch refused with `class.startsAt.past`. Outside D-04's
  wording, but worth a follow-up (re-read the clock on submit).
- The e2e "refuses a malformed skipPast…" checks the error key of the malformed request but not its 422 status nor
  that nothing was stored; the module test covers both. Worth tightening while fixing F-01.
- The success toast is drawn with the error style (red, alert icon) — from spec 028's `alertMessage.show`, already
  noted by the executor as a follow-up.
- An earlier toast with an empty message was left on the screen of the simulator session; it couldn't be
  reproduced, so it is not a finding.
- Memory Impact matches what the code does; once F-01 is fixed, add to `memory/modules/classes.md` that the 200
  limit holds whatever the start date.
