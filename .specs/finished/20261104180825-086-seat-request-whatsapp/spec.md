---
id: "086"
slug: seat-request-whatsapp
title: Show the student's WhatsApp number on seat requests
template: quick
status: finished
created: 2026-11-04
started: 2026-11-04
base_commit: dcc32bec5ce43ed68df49ad5dcb97e7fd058e539
reviewed_commit: 816fcafc17bcc7872a751b00461c956329a59376
fronts: [backend, mobile]
depends_on: []
finished: 2026-11-04
---

# 086 — Show the student's WhatsApp number on seat requests

## Goal

When an admin taps a student who asked for a seat, the person sheet shows the student's WhatsApp number and opens
the chat, as it already does on the People screen and on a class's details. Today the pending requests carry no
number, so the sheet always says "Número não compartilhado".

## Context

- Requirements: [requirements.md → Contacting a user on WhatsApp](../../../.docs/requirements.md#contacting-a-user-on-whatsapp)
  — admins open a WhatsApp chat with any user who has a number; [requirements.md → WhatsApp number visibility](../../../.docs/requirements.md#whatsapp-number-visibility)
  — admins always see every user's number.
- Module: [modules/enrolment.md](../../memory/modules/enrolment.md) — the admins' pending requests list.
- Existing code this changes:
  - `modules/enrolment/src/enrolment/provider/enrolment.repository.ts` — `PendingRequest.student` is
    `{ id, name, photoUrl }`; `modules/enrolment/src/enrolment/usecase/list-pending-requests.usecase.ts` —
    `ListPendingRequests`, admin-only through `assertCanManageClasses`; its fake in
    `modules/enrolment/test/mock/fake-enrolment.repository.ts` (`pendingClasses`).
  - `apps/backend/src/modules/enrolment/enrolment.prisma.ts` — `findPendingByClass` selects
    `student: { id, name, photoUrl }`; `GET /enrolments/pending` in `enrolment.controller.ts`.
  - `apps/mobile/src/modules/enrolment/enrolment.types.ts` — `PendingRequest`;
    `apps/mobile/src/modules/enrolment/screens/class-requests.screen.tsx` — passes `whatsappNumber: null` to
    `PersonSheet`.
  - `apps/mobile/src/modules/notices/screens/send-notice.screen.hook.ts` — the class-message recipients' pending
    requests build a `sheetPerson` with `whatsappNumber: null`.
  - `apps/mobile/src/modules/people/components/person-sheet/` — the sheet: a pressable "Conversar por WhatsApp" row
    with the formatted number when `whatsappNumber` is set, the disabled "Número não compartilhado" row otherwise.
    Unchanged by this spec.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | `ListPendingRequests` returns the student's stored number as is, without checking `whatsappVisible`; `null` when the student has none. | The route is admin-only (`assertCanManageClasses`), and admins always see every number: the result is the same as the directory's rule (`visibleNumber`). |
| D-02 | No new copy and no change to `PersonSheet`: both screens only pass the number they now receive. | The sheet already shows the number, opens `wa.me` and has the `null` state. |

## Expected Results

### ER-01 — The pending requests carry the student's WhatsApp number

- **Front:** backend
- **Behavior:** Given a student with a WhatsApp number who does not share it, and a pending request of theirs for
  an upcoming class, when an admin calls `GET /enrolments/pending`, then the request's `student` is exactly
  `{ id, name, photoUrl, whatsappNumber }` with `whatsappNumber` equal to the student's stored E.164 number.
- **Edge and error cases:** a student who shares the number gets it too; a student without a number has
  `whatsappNumber: null`; a non-admin still gets 403 `user.role.notAdmin`; the rest of the answer (classes, order,
  `seatsTaken`, `total`) doesn't change.
- **Verify by:** `npx jest test/enrolment/usecase/list-pending-requests.usecase.test.ts` (from
  `modules/enrolment`) · `npm run test:e2e -- enrolment-decisions` (from `apps/backend`), the "lists pending" tests.

### ER-02 — The class requests sheet shows the number

- **Front:** mobile
- **Behavior:** Given a pending request whose student has a number, when an admin on "Inscrições em aulas" taps the
  student, then the sheet shows "Conversar por WhatsApp" with the number formatted as on the People screen, and
  pressing it opens `https://wa.me/<digits>`.
- **Edge and error cases:** a student with `whatsappNumber: null` shows the disabled row "Número não compartilhado",
  as today.
- **Verify by:** `npx jest src/modules/enrolment/screens/class-requests.screen.test.tsx` (from `apps/mobile`) — tests
  for a student with a number and one without.

### ER-03 — The class message recipients' sheet shows the number

- **Front:** mobile
- **Behavior:** Given a class with a pending request whose student has a number, when an admin on the class message
  screen taps that pending recipient, then the sheet shows "Conversar por WhatsApp" with the formatted number.
- **Edge and error cases:** a pending student with `whatsappNumber: null` shows "Número não compartilhado"; the
  recipients that come from the class (instructors, seated students) are unchanged.
- **Verify by:** `npx jest src/modules/notices/screens` (from `apps/mobile`) — the send-notice hook and screen tests
  for a pending recipient with a number.

## Tasks

### Backend (`modules/enrolment`, `apps/backend`)

- [x] **T-01** — Add `whatsappNumber: string | null` to `PendingRequest.student` in
  `modules/enrolment/src/enrolment/provider/enrolment.repository.ts`; update the fixtures of
  `modules/enrolment/test/enrolment/usecase/list-pending-requests.usecase.test.ts` (and any other test building a
  `PendingRequestsClass`) and assert the number is returned as stored, `null` included. In
  `apps/backend/src/modules/enrolment/enrolment.prisma.ts`, select the student's `whatsappNumber` in
  `findPendingByClass` and map a missing one to `null`. In `apps/backend/test/enrolment-decisions.e2e-spec.ts`,
  update the expected `student` objects of "lists pending" and add a test with a student whose number is hidden
  (`whatsappVisible: false`) and one without a number.
  Covers: ER-01 · Done when: the use case test and the "lists pending" e2e tests pass, and
  `npx turbo run check-types --filter=@rochas-surf-school/enrolment --filter=@rochas-surf-school/backend` has no
  errors.
  > ✅ 2026-11-04 17:40 — `PendingRequest.student` gains `whatsappNumber: string | null`; `findPendingByClass` selects
  > the student's `whatsappNumber` (the column is nullable, so a missing number already comes back as `null`); the use
  > case passes it through unchanged (D-01). New use case test for a number and `null`; the e2e "lists pending" test
  > expects `whatsappNumber: null`, and a new e2e test seeds a hidden number (`whatsappVisible: false`), a shared one and
  > none (the `account` helper takes optional WhatsApp fields) and checks the exact `student` objects and the class's
  > `capacity`/`seatsTaken`; watched it fail (2 failed) with the Prisma select reverted. files:
  > `modules/enrolment/src/enrolment/provider/enrolment.repository.ts`,
  > `modules/enrolment/test/enrolment/usecase/list-pending-requests.usecase.test.ts`,
  > `modules/enrolment/test/mock/fake-enrolment.repository.test.ts`,
  > `apps/backend/src/modules/enrolment/enrolment.prisma.ts`, `apps/backend/test/enrolment-decisions.e2e-spec.ts`;
  > verified: `npx jest test/enrolment/usecase/list-pending-requests.usecase.test.ts` (modules/enrolment, 6 passed),
  > `npm run test:e2e -- enrolment-decisions -t "lists pending"` (apps/backend, 4 passed), `npx turbo run check-types
  > --filter=@rochas-surf-school/enrolment --filter=@rochas-surf-school/backend` (8 successful); deviations: the module's
  > runner is Jest, not Vitest as ER-01's `Verify by` says (`npx vitest run` fails with `describe is not defined`), so
  > its test runs with `npx jest`.

### Mobile (`apps/mobile`)

- [x] **T-02** — Add `whatsappNumber: string | null` to `PendingRequest.student` in
  `src/modules/enrolment/enrolment.types.ts` (and to the test fixtures that build one); in
  `src/modules/enrolment/screens/class-requests.screen.tsx`, pass `student.student.whatsappNumber` to `PersonSheet`
  and update the comment there. Add tests to `class-requests.screen.test.tsx` for a student with a number (the
  formatted number shows and pressing the row calls `Linking.openURL` with the `wa.me` link) and one without.
  Covers: ER-02 · Done when: `npx jest src/modules/enrolment` passes.
  > ✅ 2026-11-04 17:50 — `PendingRequest.student` gains `whatsappNumber: string | null`; "Inscrições em aulas" passes
  > `student.student.whatsappNumber` to `PersonSheet`, and the comment there now says admins see every number. Fixtures
  > updated (Ana has `+5585999998888`, Bruno none). New screen tests: tapping Ana shows "+55 85 99999 8888" and pressing
  > "Chat on WhatsApp" calls `Linking.openURL("https://wa.me/5585999998888")`; tapping Bruno shows "Number not shared."
  > with no WhatsApp button. Watched the first fail before the screen change. files:
  > `apps/mobile/src/modules/enrolment/enrolment.types.ts`,
  > `apps/mobile/src/modules/enrolment/screens/class-requests.screen.tsx`,
  > `apps/mobile/src/modules/enrolment/screens/class-requests.screen.test.tsx`,
  > `apps/mobile/src/modules/enrolment/hooks/use-class-requests-screen.hook.test.tsx`; verified: `npx jest
  > src/modules/enrolment` (apps/mobile, 30 suites, 317 passed), `npx tsc --noEmit` and `npx eslint` on the files
  > (clean); deviations: none
- [x] **T-03** — In `src/modules/notices/screens/send-notice.screen.hook.ts`, use `request.student.whatsappNumber`
  for the pending recipients' `sheetPerson`; add tests to `send-notice.screen.hook.test.tsx` and/or
  `send-notice.screen.test.tsx` for a pending recipient with a number and one without.
  Covers: ER-03 · Done when: `npx jest src/modules/notices` passes.
  > ✅ 2026-11-04 18:00 — the pending recipients' `sheetPerson` takes `request.student.whatsappNumber`; the instructors'
  > and seated students' entries are untouched. New hook test: two pending requests (one with `+5585999997777`, one
  > without) give `sheetPerson.whatsappNumber` `"+5585999997777"` and `null`. Screen fixtures give Caio a number and
  > Dani none; new screen tests: tapping Caio shows "+55 85 99999 7777" and "Chat on WhatsApp", tapping Dani shows
  > "Number not shared." with no WhatsApp button. The two with-number tests failed before the hook change. files:
  > `apps/mobile/src/modules/notices/screens/send-notice.screen.hook.ts`,
  > `apps/mobile/src/modules/notices/screens/send-notice.screen.hook.test.tsx`,
  > `apps/mobile/src/modules/notices/screens/send-notice.screen.test.tsx`; verified: `npx jest src/modules/notices`
  > (apps/mobile, 8 suites, 63 passed), `npx tsc --noEmit` and `npx eslint src/modules/notices/screens/` (clean);
  > deviations: none

### Verification

- [x] **T-04** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0.
  > ✅ 2026-11-04 18:10 — ran the whole Verification Plan from the repo root: `node .specs/scripts/run-related-tests.mjs
  > 086` → RELATED TESTS PASSED (backend 206, mobile 738, modules 293 passed); `node .specs/scripts/check-coverage.mjs
  > 086` → COVERAGE OK (3 measured files at 100% of their changed lines; the two type files have no runtime code);
  > `node .specs/scripts/run-e2e.mjs 086` → E2E PASSED (31 files, 866 tests, `enrolment-decisions` included);
  > `npx turbo run lint check-types build --filter=@rochas-surf-school/enrolment --filter=@rochas-surf-school/backend
  > --filter=@rochas-surf-school/mobile` → 29 successful. files: `.specs/changes/086-seat-request-whatsapp/spec.md`;
  > deviations: none

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 086` — the related tests pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 086` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 086` — the backend e2e suites pass, `enrolment-decisions` included.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/enrolment --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.

## Memory Impact

- `memory/modules/enrolment.md` — the admins' pending requests list carries each student's WhatsApp number (D-01).

## Amendments

## Review

### Round 1 — 2026-11-04 — changes-requested

**Checks**

- lint ✅ · type check ✅ · build ✅ (modules/enrolment, apps/backend, apps/mobile — 29 tasks)
- related tests ✅ (apps/backend, apps/mobile, modules/enrolment 293 passed)
- coverage of the changed lines ✅ `COVERAGE OK` — 3 measured files at 100%; `enrolment.types.ts` and
  `enrolment.repository.ts` have no runtime code; no coverage-ignore comments in the diff
- e2e: backend ✅ 31 files, 866 passed (`enrolment-decisions` included)

**Expected Results**

- ER-01 ✅ — `npx jest test/enrolment/usecase/list-pending-requests.usecase.test.ts` (modules/enrolment, 6 passed);
  the e2e "lists pending" tests assert the exact `student` objects for a hidden number (`whatsappVisible: false`), a
  shared one and none (`null`), the class's `capacity`/`seatsTaken` and order, and the 403 `user.role.notAdmin` test
  still passes.
- ER-02 ✅ — `class-requests.screen.test.tsx`: tapping Ana shows "+55 85 99999 8888" and "Chat on WhatsApp" opens
  `https://wa.me/5585999998888`; Bruno (`null`) shows "Number not shared." and no WhatsApp button.
- ER-03 ✅ — `send-notice.screen.hook.test.tsx` checks both pending recipients' `sheetPerson`; the screen tests show
  Caio's formatted number and Dani's "Number not shared."; the instructors' and seated students' entries are
  untouched in the diff.

**Findings**

- [x] **F-01** (convention) — `apps/backend/src/modules/enrolment/enrolment.integration.http` line 154 still documents
  `GET /enrolments/pending` as answering `student: { id, name, photoUrl }`, which ER-01 changed to
  `{ id, name, photoUrl, whatsappNumber }`. Reproduce: `grep -n "student: { id, name, photoUrl }"
  apps/backend/src/modules/enrolment/enrolment.integration.http`. Expected: the request's comment names
  `whatsappNumber` (the stored E.164 number, shared or not, or `null`).
  > ✅ 2026-11-04 18:30 — the `GET /enrolments/pending` request's comment now documents
  > `student: { id, name, photoUrl, whatsappNumber }` and says `whatsappNumber` is the student's stored E.164 number,
  > shared or not, or `null`. files: `apps/backend/src/modules/enrolment/enrolment.integration.http`; verified: the
  > reviewer's `grep -n "student: { id, name, photoUrl }" apps/backend/src/modules/enrolment/enrolment.integration.http`
  > finds nothing (exit 1); deviations: none

**Notes**

- ER-01's `Verify by` says `npx vitest run …` for `modules/enrolment`, but that workspace runs Jest (`npm test` →
  `jest --coverage`); the executor recorded the deviation. Worth correcting the command through
  `/spec-plan --amend 086` or when finishing.
- T-01 also reflowed unrelated lines of `list-pending-requests.usecase.test.ts` (formatter wrapping). Harmless.
- `## Memory Impact` matches what was built. D-01 and D-02 hold: no `whatsappVisible` check on the admin-only list,
  and `PersonSheet` is unchanged.
- The ERs were verified through their component tests, which render the real `PersonSheet`; not exercised in the
  simulator.

### Round 2 — 2026-11-04 — accepted

**Checks**

- lint ✅ · type check ✅ · build ✅ (modules/enrolment, apps/backend, apps/mobile: 29 tasks). The backend's lint
  warnings (`require-array-sort-compare` in `enrolment-decisions.e2e-spec.ts` lines 338/352/434) are older than this
  spec, in lines it doesn't touch.
- related tests ✅ `RELATED TESTS PASSED`: apps/backend 206, apps/mobile 738, modules/enrolment 293 passed
- coverage of the changed lines ✅ `COVERAGE OK`: 3 measured files at 100%; `enrolment.types.ts` and
  `enrolment.repository.ts` have no runtime code; no coverage-ignore comments in the diff
- e2e: backend ✅ `E2E PASSED`, 31 files, 866 passed (`enrolment-decisions` included)

**Expected Results**

- ER-01 ✅ — `npx jest test/enrolment/usecase/list-pending-requests.usecase.test.ts` (modules/enrolment, 6 passed:
  a stored number and `null` come back as is, and non-admins are refused); `npm run test:e2e -- enrolment-decisions
  -t "pending"` (5 passed): exact `student` objects for a hidden number, a shared one and none, order, `capacity` and
  `seatsTaken` unchanged, and "refuses anyone but an approved admin" still gives 403 `user.role.notAdmin`.
- ER-02 ✅ — `class-requests.screen.test.tsx`: tapping Ana shows "+55 85 99999 8888", and pressing "Chat on WhatsApp"
  calls `Linking.openURL("https://wa.me/5585999998888")`; Bruno (`null`) shows "Number not shared." with no WhatsApp
  button.
- ER-03 ✅ — `npx jest src/modules/notices/screens`: the hook test gives the pending recipients' `sheetPerson`
  `"+5585999997777"` and `null`; the screen tests show Caio's formatted number with "Chat on WhatsApp" and Dani's
  "Number not shared."; the diff leaves the instructors' and seated students' entries alone.

**Round 1 findings**

- F-01 ✅ — `enrolment.integration.http` documents `student: { id, name, photoUrl, whatsappNumber }` on
  `GET /enrolments/pending`; the round 1 grep finds nothing.

**Findings**

None.

**Notes**

- ER-01's `Verify by` still says `npx vitest run …` for `modules/enrolment`, which runs Jest. `spec-finish` (or
  `/spec-plan --amend 086`) can fix the command.
- D-01 and D-02 hold: the admin-only list returns the stored number without checking `whatsappVisible`, and nothing
  under `apps/mobile/src/modules/people` changed. `## Memory Impact` matches what was built.
- The mobile ERs were checked through their component tests, which render the real `PersonSheet`. They weren't run
  in the simulator.
