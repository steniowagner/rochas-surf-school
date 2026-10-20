---
id: "043"
slug: seat-cancellation
title: "Students cancel their seat until the cancellation deadline"
status: in-progress
started: 2026-10-20
base_commit: a15b0ae653b308bb2f65e2aa7d5617db49a72de8
created: 2026-10-19
fronts: [enrolment, classes, auth, notifications, backend, mobile]
depends_on: ["042"]
---

# 043 — Students cancel their seat until the cancellation deadline

## Goal

A student with an approved seat can give it up from the class's details until the class's cancellation deadline;
after it, or while the class has no deadline, the app tells them to contact the school and offers the school's
WhatsApp. Admins are told of each cancellation with how many students are waiting, and so are the class's
instructors. Deleting an account now also gives up the person's upcoming seats (with the same notifications) and
withdraws their pending requests, so a deleted student never holds a seat.

## Context

- Product: [product.md](../../memory/product.md) — **Enrolment** (`approved` ends as `cancelled` by the student,
  until the deadline; admins are notified with the number of waiting students, and so are the instructors),
  **Cancellation deadline** (one per class, never after the start; while it can't be worked out students are told
  to contact the school), and **User** (`deleted` cancels the user's upcoming seats and pending enrolments).
- Requirements: [requirements.md → Cancelling a seat](../../../.docs/requirements.md#cancelling-a-seat) — until the
  deadline, not after; [No deadline available](../../../.docs/requirements.md#no-deadline-available) — students are
  told to contact the school; [Cancellation notification](../../../.docs/requirements.md#cancellation-notification)
  — admins with the waiting count, the instructors, and the same on an account deletion;
  [Deleting an account](../../../.docs/requirements.md#deleting-an-account) — the account's upcoming seats and
  pending enrolments are cancelled.
- Technical: [technical-context.md](../../memory/technical-context.md) — Authentication (`DeleteAccount` and the
  `TeachingReleaser` port, spec 035), Classes (the deadline, `formatDeadline`), Push notifications, Mobile shared UI.
- Depends on: spec `042` — approved seats exist and the student's approved state is shown (and spec 041's module).
- Designs: `.docs/designs/student-app.html` MINHAS-02 ("Cancelar inscrição" on an approved class) and MINHAS-03
  (the confirmation with the deadline), builder `detalheScreen` (`aprovado`, `canceladoEu`) and sheet `cancelar`
  (its non-pending branch). pt-PT adapted to pt-BR, "o Rocha" → "a escola".
- Existing code this builds on: `modules/auth/src/user/usecase/delete-account.usecase.ts`,
  `modules/auth/src/user/provider/teaching-releaser.provider.ts`,
  `apps/backend/src/modules/classes/classes.teaching-releaser.ts` (the adapter pattern),
  `apps/mobile/src/modules/offboarding/components/contact-school-button/` and
  `apps/mobile/src/modules/offboarding/hooks/use-school-whatsapp.hook.ts`, `apps/mobile/src/modules/classes/utils/week.ts`
  (`formatDeadline`).

## Scope

### In scope

- `CancelSeat` and `POST /enrolments/:id/cancel`, with the deadline checks.
- `enrolment.cancelled` to admins (with the waiting count) and to the class's instructors.
- A new `auth` port `SeatReleaser`, called by `DeleteAccount`, implemented through enrolment's
  `ReleaseStudentEnrolments`.
- `cancellationDeadline` in enrolment's class reader.
- Mobile: "Cancelar inscrição" and its sheet, the "deadline passed" and "no deadline" notes with "Falar com a
  escola", the cancelled status banner and chip, the push tap; `ContactSchoolButton` shared outside offboarding.

### Out of scope

- What a late cancellation costs (outside the app, by product decision).
- An admin cancelling a student's seat (that is taking out, spec 044).
- Removals and role changes cancelling seats (their own specs, which reuse `ReleaseStudentEnrolments`).
- Cancelling several seats at once; undoing a cancellation (the student requests again).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The deadline is exclusive: a seat is cancellable while now < `cancellationDeadline`; at the deadline it is refused. | "Until the deadline" read as before it; the deadline is never after the start, so it also covers the start. |
| D-02 | Checks, in order: status (403 `user.status.notApproved`); the enrolment (non-UUID, none or another person's → 404 `enrolment.notFound`); `enrolment.notApproved` (409); `class.started` (409); `enrolment.deadline.missing` (409, no deadline); `enrolment.deadline.passed` (409). The write is conditional on `status = 'approved'`. | Access, identity, state; a missing deadline is the "contact the school" case. |
| D-03 | `enrolment.cancelled` has `{ classId, studentName, discipline, startsAt, waitingCount }`, where `waitingCount` is the class's pending requests counted after the cancel; it goes to every approved admin and every instructor of the class, each person once, with the same copy. | The requirement asks for the count for admins; one type keeps one copy. |
| D-04 | Account deletion: `DeleteAccount` calls `SeatReleaser.releaseSeats(userId)` after `TeachingReleaser`; it turns every approved enrolment of a class that hasn't started and isn't cancelled into `cancelled` (no deadline check) with one `enrolment.cancelled` per class, and every pending one into `withdrawn` silently. A failure fails the deletion (the account stays approved). | The product cancels a deleted user's upcoming seats and pending enrolments; same failure rule as spec 035. |
| D-05 | `ContactSchoolButton` moves to `apps/mobile/src/components/contact-school-button/` and `useSchoolWhatsapp` to `apps/mobile/src/hooks/use-school-whatsapp.hook.ts`; offboarding imports them from there. | Two flows use them now (Mobile shared UI rule). |
| D-06 | The student's cancelled state reads "Você cancelou a inscrição" / "Sua vaga ficou livre." and the chip "Você cancelou"; the class's own "Cancelada" chip stays for a cancelled class. | Avoids two different "Cancelada" chips. |

## Expected Results

### ER-01 — A student cancels their seat before the deadline

- **Front:** enrolment
- **Behavior:** Given a student's approved enrolment in a class whose deadline is in the future, when they call
  `POST /enrolments/:id/cancel`, then the API answers 200 with `status: "cancelled"`, and the class's
  `seatsTaken` drops by one and the student leaves its `students`.
- **Edge and error cases:** a second cancel answers `enrolment.notApproved`; the seat can be approved for another
  student right after.
- **Verify by:** `npx jest test/enrolment/usecase/cancel-seat.usecase.test.ts` (from `modules/enrolment`) and the
  "cancels" cases of `apps/backend/test/seat-cancellation.e2e-spec.ts`.

### ER-02 — Cancelling is refused after the deadline or without one

- **Front:** enrolment
- **Behavior:** Given each refused case, when `POST /enrolments/:id/cancel` is called, then it answers, in the order
  of D-02: 404 `enrolment.notFound`, 409 `enrolment.notApproved` (pending, denied or any ended status), 409
  `class.started`, 409 `enrolment.deadline.missing`, 409 `enrolment.deadline.passed` (now ≥ deadline); and the
  enrolment is unchanged and nobody is told.
- **Edge and error cases:** exactly at the deadline is refused (D-01); another student's enrolment answers 404;
  a non-approved account answers 403.
- **Verify by:** `npx jest test/enrolment/usecase/cancel-seat.usecase.test.ts -t "refuses"` (from
  `modules/enrolment`) and the "refuses" cases of `apps/backend/test/seat-cancellation.e2e-spec.ts`.

### ER-03 — Admins and instructors are told of a cancellation

- **Front:** backend
- **Behavior:** Given a class with 2 pending requests, taught by instructor I, when student "Ana Souza" cancels her
  seat, then every approved admin and I each get one `enrolment.cancelled` with `waitingCount: 2`, pushed as "Vaga
  cancelada" / "Ana Souza cancelou a vaga na aula de Surf de 19/10 às 08:00. 2 na lista de espera." (pt-BR; es and
  en in the catalog).
- **Edge and error cases:** with no pending request the body ends after the class ("… às 08:00."); an admin who
  teaches gets one; a failing push never changes the answer.
- **Verify by:** `npx vitest run src/modules/notifications/notifications.enrolment-notifier.spec.ts src/modules/notifications/push-messages.spec.ts`
  (from `apps/backend`) and the "notifies" case of `apps/backend/test/seat-cancellation.e2e-spec.ts`.

### ER-04 — Deleting an account releases the person's seats and requests

- **Front:** auth
- **Behavior:** Given a student with an approved seat in an upcoming class and a pending request in another, when
  they delete their account (`DELETE /auth/me` path of spec 026), then the seat becomes `cancelled` with the
  `enrolment.cancelled` notifications of ER-03, the request becomes `withdrawn` with nobody told, and the account is
  `deleted`.
- **Edge and error cases:** seats in started, finished or cancelled classes are unchanged; a seat past its deadline
  is still cancelled (D-04); when the release fails, the call fails and the account stays approved; an account
  without enrolments deletes as before.
- **Verify by:** `npx jest test/user/usecase/delete-account.usecase.test.ts` (from `modules/auth`),
  `npx jest test/enrolment/usecase/release-student-enrolments.usecase.test.ts` (from `modules/enrolment`) and the
  "delete releases seats" case of `apps/backend/test/auth-profile.e2e-spec.ts`.

### ER-05 — "Cancelar inscrição" on the details

- **Front:** mobile
- **Behavior:** Given a student with an approved seat before the deadline, when they open the class's details, then
  the footer shows "Cancelar inscrição" (`outline`); pressing it opens a sheet "Cancelar inscrição" / "Sua vaga fica
  livre. Você pode cancelar até seg, 19 out · 20:00." with "Sim, cancelar" and "Manter inscrição"; confirming shows
  the toast "Inscrição cancelada", the banner "Você cancelou a inscrição" / "Sua vaga ficou livre." (`dim`), the
  Agenda chip "Você cancelou" (`dim`), and the footer "Pedir novamente".
- **Edge and error cases:** a double press sends once; `enrolment.notApproved` and `class.started` show their toasts
  and reload the class; `enrolment.deadline.passed` and `enrolment.deadline.missing` close the sheet, reload the
  class and show the note of ER-06; copy in pt-BR, es-ES and en-US.
- **Verify by:** `npx jest src/modules/enrolment/components/cancel-seat-sheet src/modules/classes/screens/class-details.screen.test.tsx -t "cancel seat"`
  (from `apps/mobile`).

### ER-06 — After the deadline, or without one, the student contacts the school

- **Front:** mobile
- **Behavior:** Given a student with an approved seat in a class that hasn't started, when its deadline has passed,
  then the footer shows no button and a note "O prazo para cancelar terminou em seg, 19 out · 20:00. Fale com a
  escola." with "Falar com a escola"; when the class has no deadline, the note reads "O prazo de cancelamento desta
  aula ainda não foi definido. Fale com a escola para cancelar." with the same button, which opens the school's
  WhatsApp chat.
- **Edge and error cases:** while the school's number loads, fails or is missing, the button isn't shown (the
  note stays); the note follows the phone's clock and turns on when the deadline passes with the screen open (the
  screen's minute clock); a started class shows neither note nor button.
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "deadline"` and
  `npx jest src/components/contact-school-button src/modules/offboarding` (from `apps/mobile`).

### ER-07 — A cancellation push opens the class

- **Front:** mobile
- **Behavior:** Given an admin or an instructor, when they tap an `enrolment.cancelled` push, then the app opens that
  class's details in their flow.
- **Edge and error cases:** received with the app open it invalidates `["classes"]` and `["enrolments", "pending"]`
  without navigating.
- **Verify by:** `npx jest src/modules/notifications/hooks` (from `apps/mobile`).

## Tasks

### Enrolment module (`modules/enrolment`)

- [x] **T-01** — Add `cancellationDeadline` to the `EnrolmentClassReader` answer, `cancel(now)` to the `Enrolment`
  entity (from approved only), and `CancelSeat` (`src/enrolment/usecase/cancel-seat.usecase.ts`, D-01, D-02, the
  notifier's `seatCancelled` with the waiting count, errors swallowed), with tests. Skills:
  [`module-entity`](../../../.claude/skills/module-entity), [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03 · Done when: `npx jest test/enrolment` passes from `modules/enrolment`.
  > ✅ 2026-10-20 12:58 — added `cancellationDeadline` to `EnrolmentClass`, `Enrolment.cancel`, the `SeatCancelled` notifier event, the repository methods `cancel`, `countPendingForClass` and `releaseForStudent` (the last one is used by T-02), and `CancelSeat` (D-01, D-02, errors swallowed); files: `modules/enrolment/src/enrolment/provider/enrolment-class-reader.provider.ts`, `modules/enrolment/src/enrolment/provider/enrolment-notifier.provider.ts`, `modules/enrolment/src/enrolment/provider/enrolment.repository.ts`, `modules/enrolment/src/enrolment/model/enrolment.entity.ts`, `modules/enrolment/src/enrolment/usecase/cancel-seat.usecase.ts`, `modules/enrolment/src/enrolment/usecase/index.ts`, `modules/enrolment/test/enrolment/usecase/cancel-seat.usecase.test.ts`, `modules/enrolment/test/enrolment/model/enrolment.entity.test.ts`, `modules/enrolment/test/mock/enrolment.factory.ts`, `modules/enrolment/test/mock/fake-enrolment.repository.ts`, `modules/enrolment/test/mock/fake-enrolment.repository.test.ts`, `modules/enrolment/test/mock/fake-enrolment.notifier.ts`; verified: `npx jest` from `modules/enrolment` (11 suites, 178 passed) and `npx tsc --noEmit` clean; deviations: the repository port also got `countPendingForClass` (the waiting count) and `releaseForStudent` (for T-02), the notifier port got `seatCancelled`

- [ ] **T-02** — Add `ReleaseStudentEnrolments` (`src/enrolment/usecase/release-student-enrolments.usecase.ts`, no
  actor, input `{ studentId }`, D-04, one notification per class; a failed write propagates) and the repository
  methods it needs, with tests. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-04 · Done when: `npx jest test/enrolment/usecase/release-student-enrolments.usecase.test.ts` passes.

### Classes module (`modules/classes`)

- [ ] **T-03** — Add the student's `cancelled` status to the class view's `myEnrolment` contract tests (no new
  field), proving a cancelled enrolment is returned as the latest one.
  Covers: ER-05 · Done when: `npx jest test/school-class/usecase/get-class.usecase.test.ts` passes from `modules/classes`.

### Auth module (`modules/auth`)

- [ ] **T-04** — Add the `SeatReleaser` port (`src/user/provider/seat-releaser.provider.ts`, `releaseSeats(userId)`)
  and call it from `DeleteAccount` after `TeachingReleaser`, with tests for the order, a failing release and an
  account without enrolments.
  Covers: ER-04 · Done when: `npx jest test/user/usecase/delete-account.usecase.test.ts` passes from `modules/auth`.

### Notifications module (`modules/notifications`)

- [ ] **T-05** — Add `enrolment.cancelled` to `NOTIFICATION_TYPES`, with the entity tests.
  Covers: ER-03 · Done when: `npx jest test/notification` passes from `modules/notifications`.

### Backend (`apps/backend`)

- [ ] **T-06** — In `src/modules/enrolment/`: the deadline in `enrolment-class-reader.prisma.ts`, the conditional
  `cancel` and the release queries in `enrolment.prisma.ts`, and `enrolment.seat-releaser.ts`
  (`EnrolmentSeatReleaser`, runs `ReleaseStudentEnrolments`) exported and wired into `AuthModule`'s `DeleteAccount`,
  with specs. Skills: [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository),
  [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-01, ER-02, ER-04 · Done when: `npx vitest run src/modules/enrolment src/modules/auth` passes.

- [ ] **T-07** — Add `seatCancelled` to `notifications.enrolment-notifier.ts` and the `enrolment.cancelled` entry of
  `push-messages.ts` in pt-BR, es and en (the count sentence only when above 0), with specs.
  Covers: ER-03 · Done when: `npx vitest run src/modules/notifications` passes.

- [ ] **T-08** — Add `POST /enrolments/:id/cancel` to `enrolment.controller.ts`, its spec and the requests in
  `enrolment.integration.http`. Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02 · Done when: `npx vitest run src/modules/enrolment/enrolment.controller.spec.ts` passes.

- [ ] **T-09** — Add `test/seat-cancellation.e2e-spec.ts` (fixed clock, faked pushes, cleanup) with the cancel,
  refusal (deadline missing, passed, at the deadline) and notification cases, and the "delete releases seats" case
  in `test/auth-profile.e2e-spec.ts`.
  Covers: ER-01, ER-02, ER-03, ER-04 · Done when: `npm run test:e2e --workspace apps/backend` passes.

### Mobile (`apps/mobile`)

- [ ] **T-10** — Move `ContactSchoolButton` to `src/components/contact-school-button/` and `useSchoolWhatsapp` to
  `src/hooks/use-school-whatsapp.hook.ts` with their tests, updating the offboarding imports (D-05).
  Covers: ER-06 · Done when: `npx jest src/components/contact-school-button src/hooks src/modules/offboarding` passes.

- [ ] **T-11** — Add `hooks/use-cancel-seat.hook.ts`, the error keys, `components/cancel-seat-sheet/`, the cancelled
  display status in `utils/enrolment-status.ts` and, in the details, the "Cancelar inscrição" footer, with tests and
  copy in the three locales. Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-05 · Done when: `npx jest src/modules/enrolment src/modules/classes/screens/class-details.screen.test.tsx` passes.

- [ ] **T-12** — Add the deadline-passed and no-deadline notes with `ContactSchoolButton` to the details' footer
  (computed with `useNow`), with tests and copy.
  Covers: ER-06 · Done when: `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "deadline"` passes.

- [ ] **T-13** — Route `enrolment.cancelled` taps of the admin and instructor flows to the class details and
  invalidate the queries of ER-07 on receipt, with tests.
  Covers: ER-07 · Done when: `npx jest src/modules/notifications/hooks` passes.

### Verification

- [ ] **T-14** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence.
  Covers: all · Done when: every automated command exits 0 and the user journeys are recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 043` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 043` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/enrolment --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
  - `node .specs/scripts/run-e2e.mjs 043` — the backend e2e suite passes, including `seat-cancellation.e2e-spec.ts`.
  - `enrolment.integration.http` against `npm run dev` — the cancel requests answer as ER-01 and ER-02.
- User journeys (e2e, followed in a browser or simulator):
  - On the iOS simulator, as a student with an approved seat before the deadline: "Cancelar inscrição" → the sheet
    shows the deadline → "Sim, cancelar" shows the toast, "Você cancelou a inscrição", the "Você cancelou" chip and
    "Pedir novamente"; as an admin, the push "Vaga cancelada" arrives (when pushes are set up) or the stored
    notification exists.
  - With the class's deadline set in the past (database), the details show the "prazo terminou" note and "Falar com
    a escola"; with no deadline, the "ainda não foi definido" note.
  - Delete the account of a student with a seat: the class's seats drop by one.

## Memory Impact

- `memory/product.md` — Current state: students cancel seats until the deadline, otherwise contact the school;
  admins and instructors are told with the waiting count; deleting an account releases seats and requests.
- `memory/technical-context.md` — the cancel route and its checks, `SeatReleaser` in Authentication, the push type,
  the shared `ContactSchoolButton` / `useSchoolWhatsapp`.
- `memory/structure.md` — `src/components/contact-school-button/`, `src/hooks/use-school-whatsapp.hook.ts`,
  `cancel-seat-sheet`.
- `memory/modules.md` — None.
- `memory/modules/enrolment.md` — the cancellation and release rules.
- `memory/modules/auth.md` — `DeleteAccount` releases seats through `SeatReleaser`.
- `memory/modules/notifications.md` — `enrolment.cancelled`.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
