---
id: "086"
slug: seat-request-whatsapp
title: Show the student's WhatsApp number on seat requests
template: quick
status: in-progress
created: 2026-11-04
started: 2026-11-04
base_commit: dcc32bec5ce43ed68df49ad5dcb97e7fd058e539
fronts: [backend, mobile]
depends_on: []
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
- **Verify by:** `npx vitest run test/enrolment/usecase/list-pending-requests.usecase.test.ts` (from
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

- [ ] **T-01** — Add `whatsappNumber: string | null` to `PendingRequest.student` in
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

### Mobile (`apps/mobile`)

- [ ] **T-02** — Add `whatsappNumber: string | null` to `PendingRequest.student` in
  `src/modules/enrolment/enrolment.types.ts` (and to the test fixtures that build one); in
  `src/modules/enrolment/screens/class-requests.screen.tsx`, pass `student.student.whatsappNumber` to `PersonSheet`
  and update the comment there. Add tests to `class-requests.screen.test.tsx` for a student with a number (the
  formatted number shows and pressing the row calls `Linking.openURL` with the `wa.me` link) and one without.
  Covers: ER-02 · Done when: `npx jest src/modules/enrolment` passes.
- [ ] **T-03** — In `src/modules/notices/screens/send-notice.screen.hook.ts`, use `request.student.whatsappNumber`
  for the pending recipients' `sheetPerson`; add tests to `send-notice.screen.hook.test.tsx` and/or
  `send-notice.screen.test.tsx` for a pending recipient with a number and one without.
  Covers: ER-03 · Done when: `npx jest src/modules/notices` passes.

### Verification

- [ ] **T-04** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0.

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
