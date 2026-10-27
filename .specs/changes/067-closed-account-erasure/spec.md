---
id: "067"
slug: closed-account-erasure
title: Deleted and removed accounts are erased after 30 days
status: in-progress
created: 2026-10-27
started: 2026-10-27
base_commit: 3d24f0f1df38183bb9643f2368bbb3093445a36a
fronts: [notifications, enrolment, auth, classes, backend, mobile]
depends_on: ["066"]
---

# 067 — Deleted and removed accounts are erased after 30 days

## Goal

Every minute, the accounts deleted or removed 30 × 24 hours ago or more, and not reactivated or restored, are
erased: their name, email, photo and WhatsApp number go, with their sign-ins, sessions, phones, notifications and
rules acceptances, and the notifications that name them in other people's inboxes. The email is free to sign up
again. The account stays as an anonymous record so the school's history survives: past rosters show "Ex-aluno" and
past instructors show "Ex-instrutor". This keeps the promise of the privacy page and the 30-day windows of deletion
and removal.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: User lifecycle (`deleted` and `removed` are
  erased 30 days after the deletion or removal), "Erasure keeps the school's history without the person", Guests (the
  erased-guest precedent: no name, shown as "Experimental").
- Requirements: [requirements.md → Reactivation window](../../../.docs/requirements.md#reactivation-window) — a
  deleted account is reactivatable for 30 days; when they end, the system erases it.
- Requirements: [requirements.md → Erasure](../../../.docs/requirements.md#erasure) — erasing removes the name,
  email, photo and WhatsApp number, class lists show "Former student" / "Former instructor" in the person's place, and
  the email can sign up again. Comments, star ratings and photos are deferred (Out of scope); D-07 departs from how the
  label is chosen.
- Requirements: [requirements.md → Restoring a removed account](../../../.docs/requirements.md#restoring-a-removed-account)
  — when the 30 days after a removal end, the account is erased as deleted accounts are (the restore itself is spec
  066).
- Requirements: [requirements.md → Handling deletion requests from the page](../../../.docs/requirements.md#handling-deletion-requests-from-the-page)
  — the account an admin removes for a deletion request is erased 30 days later.
- Technical: [technical-context.md](../../memory/technical-context.md) — Persistence (multi-file Prisma schema,
  migrations), External integrations → Scheduled work and Push notifications, Automated validation, Coverage.
- Modules: [modules/auth.md](../../memory/modules/auth.md) ("A denied registration is erased 30 days after the
  denial", the `RegistrationNotificationEraser` contract, Sessions), [modules/notifications.md](../../memory/modules/notifications.md),
  [modules/enrolment.md](../../memory/modules/enrolment.md) (`EnrolmentNotifier`, guests' erasure),
  [modules/classes.md](../../memory/modules/classes.md) (class view, roster reader).
- Depends on: spec `066` — `removed` accounts get their `removedAt` from `RemoveUser`, and 066's restore refuses an
  account that isn't `removed` (so it refuses an erased one).
- Existing code this builds on:
  - `apps/backend/prisma/models/auth.model.prisma` — `User.name` and `User.email` are `NOT NULL` (`email` unique),
    `UserStatus` has five values; `Enrolment.student` and `SchoolClass.creator` are `onDelete: Restrict`,
    `ClassInstructor.user` cascades — so a hard delete would fail or drop past instructors.
  - `modules/auth/src/user/usecase/erase-denied-registrations.usecase.ts` and
    `apps/backend/src/modules/auth/account-erasure.job.ts` — the denied-registration erasure (spec 021) and the job
    that runs it every minute.
  - `apps/backend/src/modules/auth/user.prisma.ts` — `findById`, the lookups by email and identity, `deleteDenied`.
  - `modules/notifications/src/notification/usecase/delete-registration-notifications.usecase.ts` and
    `PrismaNotificationRepository.deleteRegistrationPending` (`params.userId` match) — the model for D-05.
  - `modules/enrolment/src/enrolment/provider/enrolment-notifier.provider.ts` (`SeatRequested`, `SeatCancelled` carry
    `studentName`, no id) and `usecase/{request-seat,cancel-seat,release-student-enrolments}.usecase.ts`;
    `apps/backend/src/modules/notifications/notifications.enrolment-notifier.ts`.
  - `modules/classes/src/school-class/provider/class-view-reader.provider.ts` (`ClassViewInstructor { id, name }`) and
    `class-roster-reader.provider.ts` (`ClassStudent { id, name, photoUrl, enrolmentId }`, `ClassGuest.name` already
    `string | null`); `apps/backend/src/modules/classes/class-view-reader.prisma.ts` and
    `apps/backend/src/modules/enrolment/class-roster-reader.prisma.ts`.
  - `apps/backend/prisma/seed/review-accounts.seed.ts` — upserts the review accounts by email with status `approved`.
  - `apps/mobile/src/modules/classes/` — `classes.types.ts` (`ClassInstructor`, `ClassStudent`), components
    `class-people`, `class-card`, `ongoing-class-card`, `student-avatar`, `guest-avatar`, screens `class-details` and
    `edit-class` (its kept teachers).

## Scope

### In scope

- The migration: `UserStatus` gains `erased`, `users.erased_at` is added, `users.name` and `users.email` become
  nullable.
- `EraseClosedAccounts` (auth), run by `AccountErasureJob` after the denied-registration erasure.
- The `PersonNotificationEraser` contract, `DeleteNotificationsAbout` (notifications) and their backend adapter.
- `studentId` in the events and params of `enrolment.requested` and `enrolment.cancelled`.
- `name: null` for erased people among a class's instructors and in its roster, through the class view and roster
  readers.
- Mobile: "Ex-aluno" / "Ex-instrutor" with a generic avatar, not tappable, on the class details, the class cards and
  the ongoing class card, in pt-BR, es-ES and en-US.

### Out of scope

- Deleting comments, keeping star ratings without a name, and "Former student/instructor" on photos (ratings,
  comments and photos are deferred).
- The enrolment notifications stored before this spec, which carry no `studentId` and keep the name (A-01).
- Any change to the denied-registration erasure (spec 021) or to the guests' erasure (spec 045).
- Listing or showing erased accounts anywhere (directory, registrations, reactivations and removed accounts never
  list them).
- Changing the text of any notification.
- The web app and the public pages' copy.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | Erasing keeps the `users` row as an anonymous record: `status: erased`, `erased_at: now`, and the id, role, creation date and deletion or removal date. It clears `name`, `email`, `photo_url`, `whatsapp_number`, `denial_reason`, `denied_at`, `reactivation_status` and `reactivation_requested_at`, and sets `whatsapp_visible: false`. | A hard delete fails on the `Restrict` keys and would cascade past class assignments away; the guest erasure (spec 045) set the precedent of keeping the row without the person. |
| D-02 | In the same transaction as D-01, it deletes the account's identities, refresh tokens, push tokens, rules acceptances and own notifications, and the sign-in code of its old email when one exists. | Nothing personal or able to sign in is left; one transaction leaves no half-erased account. |
| D-03 | `EraseClosedAccounts` erases the `deleted` accounts with `deletedAt` ≤ now − 30 × 24 h and the `removed` accounts with `removedAt` ≤ now − 30 × 24 h. `findClosedBefore(cutoff)` reads their ids; `eraseClosed(ids, cutoff)` writes only the accounts that are still `deleted` or `removed` with their date at or before the cutoff, and answers how many it erased. An account with no date is never erased; a second run finds nothing; a pending reactivation request doesn't stop the erasure. | The conditional write protects an account reactivated (spec 064) or restored (spec 066) between the read and the write; "30 × 24 hours" as in spec 021. |
| D-04 | The auth repository never returns an erased account: `findById`, the lookup by email and the lookup by identity skip `status = erased`. The domain's `USER_STATUSES` doesn't change; only the Prisma enum gains `erased`. | For the auth module the account no longer exists: its access token is refused with `auth.token.invalid` (the app shows "session expired" once, as after spec 021), its refresh token is gone, and the email or Google account creates a new pending account. The entity's name rules never meet a null name. |
| D-05 | Before the write, `PersonNotificationEraser.erase(ids)` deletes the notifications about those people in anyone's inbox: `registration.pending` and `reactivation.requested` whose `params.userId` is in `ids`, and `enrolment.requested` and `enrolment.cancelled` whose `params.studentId` is. It runs `DeleteNotificationsAbout` in the notifications module. If it fails, nothing is erased and the next run retries. | Removes the person's name from the admins' and instructors' inboxes; the same order as spec 021 (notifications first). |
| D-06 | From this spec on, `SeatRequested` and `SeatCancelled` carry `studentId`, set by `RequestSeat`, `CancelSeat` and `ReleaseStudentEnrolments`, and `NotificationsEnrolmentNotifier` stores it in the notification's params. The push and in-app text don't change. | So D-05 can find those notifications; decided in round 1. |
| D-07 | The label follows the list: an erased person is "Ex-aluno" in a class's roster and "Ex-instrutor" among its instructors, whatever their role. | Decided with the user: it reads right (they were a student in that class) and the roster needs no role. It departs from the requirement's "Former instructor when the account was an instructor or an admin"; `spec-finish` updates that text. |
| D-08 | `ClassViewInstructor.name` and `ClassStudent.name` become `string \| null`: `null` means the person was erased. The readers send what is stored; nothing else changes in the class answers. | The app owns the translated copy, as for erased guests (`ClassGuest.name`). |
| D-09 | In the app, an erased person shows a generic avatar (a person icon, no initials, the guest avatar's style) and the label, and its row can't be tapped (no person sheet, no take-out). On a class card the instructors' line uses the label in the name's place. In `edit-class`, an erased kept teacher shows the label. | Consistent with guests; there is no person to open. |
| D-10 | `AccountErasureJob` runs `EraseDeniedRegistrations`, then `EraseClosedAccounts`, each in its own `try`: one failing is logged and doesn't stop the other. It logs only counts (`Erased N closed account(s)`), never who. | Same job and logging rule as spec 021. |
| D-11 | A deleted review account is erased like any other; rerunning the seed brings it back, since it upserts by email with status `approved`. | No special case needed. |
| D-12 | ~~A reactivation approval or a restore that arrives after the erasure gets the existing refusal: 409 `reactivation.status.notRequested` (spec 064) or 409 `user.status.notRemoved` (spec 066).~~ (removed: contradicts D-04 — the erased account is never found; replaced by D-13) | ~~The erased status is neither `deleted` with a request nor `removed`.~~ |
| D-13 | A reactivation approval or a restore that arrives after the erasure gets the existing not-found refusal: 404 `reactivation.notFound` (spec 064) or 404 `user.notFound` (spec 066). | D-04: the repository never returns an erased account, so both use cases find no account before they look at its status. |

### Copy

| Key | pt-BR | es-ES | en-US |
| --- | ----- | ----- | ----- |
| `classes.erased.student` | Ex-aluno | Exalumno | Former student |
| `classes.erased.instructor` | Ex-instrutor | Exinstructor | Former instructor |

## Expected Results

### ER-01 — A deleted account is erased after 30 days

- **Front:** backend
- **Behavior:** Given an account deleted 30 days and 1 minute ago, with an email identity, a refresh token, a push
  token, a rules acceptance and a notification of its own, when the erasure job runs, then its `users` row has
  `status: erased`, `erased_at` set, `name`, `email`, `photo_url`, `whatsapp_number` null and `whatsapp_visible: false`,
  its id, role and creation date kept; its identities, refresh tokens, push tokens, rules acceptances and
  notifications are gone; a request with its access token answers 401 `auth.token.invalid`; and signing in with its
  old email by code creates a new `pending` account.
- **Edge and error cases:** its approved seats in past classes still exist; a past class it taught still has it among
  its instructors; renewing with its refresh token answers 401 `auth.refreshToken.invalid`.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/account-erasure.e2e-spec.ts -t "erases a deleted account"`
  from `apps/backend`; `npx jest test/user/usecase/erase-closed-accounts.usecase.test.ts` from `modules/auth`.

### ER-02 — A removed account is erased after 30 days

- **Front:** backend
- **Behavior:** Given an account removed 30 days and 1 minute ago, when the erasure job runs, then it is erased as in
  ER-01, and it no longer appears in `GET /people/removed`.
- **Edge and error cases:** `POST /people/:id/restore` for it then answers 404 `user.notFound` (D-13).
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/account-erasure.e2e-spec.ts -t "erases a removed account"`
  from `apps/backend`.

### ER-03 — Accounts not due are left alone

- **Front:** backend
- **Behavior:** Given an account deleted 29 days and 23 hours ago, one removed 29 days ago, a `deleted` and a
  `removed` account with no date, and approved, pending and denied accounts, when the erasure job runs, then none of
  them changes; and a second run after an erasure erases 0.
- **Edge and error cases:** an account that is `approved` again when `eraseClosed` writes (reactivated or restored
  after the read) is not erased (repository spec); a denied registration is still erased by spec 021's rule only.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/account-erasure.e2e-spec.ts -t "leaves"` from
  `apps/backend`; `npx vitest run src/modules/auth/user.prisma.spec.ts -t "eraseClosed"` from `apps/backend`.

### ER-04 — A pending reactivation request doesn't stop the erasure

- **Front:** backend
- **Behavior:** Given an account deleted 30 days and 1 minute ago with a `requested` reactivation, when the erasure
  job runs, then it is erased, it no longer appears in `GET /reactivation-requests`, and
  `POST /reactivation-requests/:id/approve` for it answers 404 `reactivation.notFound` (D-13).
- **Edge and error cases:** the admins' `reactivation.requested` notification about it is deleted (ER-06).
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/account-erasure.e2e-spec.ts -t "reactivation request"`
  from `apps/backend`.

### ER-05 — Class answers show erased people without a name

- **Front:** backend
- **Behavior:** Given an ended class taught by instructor I and holding approved student S, when both accounts are
  erased and an approved user calls `GET /classes/:id`, then I's instructor entry and S's roster entry keep their ids
  with `name: null`, and the other instructors and students keep their names.
- **Edge and error cases:** the week list of the class (with its first students) shows the same; `seatsTaken` and the
  guests don't change.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/account-erasure.e2e-spec.ts -t "class"` from
  `apps/backend`; `npx vitest run src/modules/classes/class-view-reader.prisma.spec.ts src/modules/enrolment/class-roster-reader.prisma.spec.ts`
  from `apps/backend`.

### ER-06 — Notifications about the person are deleted

- **Front:** backend
- **Behavior:** Given an admin's `registration.pending` and `reactivation.requested` notifications about account X
  (`params.userId` = X), an admin's and an instructor's `enrolment.requested` and `enrolment.cancelled` about X
  (`params.studentId` = X), and the same four types about another account Y, when X is erased, then the four about X
  are deleted and the four about Y stay.
- **Edge and error cases:** an `enrolment.*` notification with no `studentId` stays (A-01); if the eraser fails, X is
  not erased and the next run erases it (use case test).
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/account-erasure.e2e-spec.ts -t "notifications"`
  from `apps/backend`; `npx jest test/notification/usecase/delete-notifications-about.usecase.test.ts` from
  `modules/notifications`.

### ER-07 — Enrolment notifications name the student by id

- **Front:** backend
- **Behavior:** Given a student who requests a seat and then cancels an approved seat, when the notifications are
  stored, then the `enrolment.requested` and `enrolment.cancelled` notifications' params include `studentId` with the
  student's id, and their push and in-app text is the same as before.
- **Edge and error cases:** the `enrolment.cancelled` notices of a deletion, a removal or a role change (the release)
  carry the student's id too.
- **Verify by:** `npx vitest run src/modules/notifications/notifications.enrolment-notifier.spec.ts` from
  `apps/backend`; `npx jest test/enrolment/usecase` from `modules/enrolment`.

### ER-08 — The job runs both erasures

- **Front:** backend
- **Behavior:** Given due denied registrations and due closed accounts, when `AccountErasureJob.run()` runs, then both
  are erased and it logs one count line per kind, without ids, names or emails.
- **Edge and error cases:** when the denied-registration erasure throws, the closed accounts are still erased, and the
  other way around; nothing due → no log line; `run()` never throws.
- **Verify by:** `npx vitest run src/modules/auth/account-erasure.job.spec.ts` from `apps/backend`.

### ER-09 — Class details show "Ex-aluno" and "Ex-instrutor"

- **Front:** mobile
- **Behavior:** Given a class whose details answer an instructor and a student with `name: null`, when the class
  details render in pt-BR, then the instructor row reads "Ex-instrutor" and the student row "Ex-aluno", each with the
  generic avatar and no initials, and tapping them opens nothing.
- **Edge and error cases:** in es-ES "Exinstructor" / "Exalumno", in en-US "Former instructor" / "Former student";
  an admin sees no take-out action on the erased student; named people and guests render as before.
- **Verify by:** `npx jest src/modules/classes -t "erased"` from `apps/mobile`.

### ER-10 — Class cards show the labels

- **Front:** mobile
- **Behavior:** Given a week list whose class has an erased instructor and an erased student, when the class card and
  the ongoing class card render, then the instructors' line shows "Ex-instrutor" in the name's place and the student's
  avatar is the generic one.
- **Edge and error cases:** a class whose only instructor is erased is not shown as "without instructor"; in
  `edit-class`, an erased kept teacher reads "Ex-instrutor".
- **Verify by:** `npx jest src/modules/classes/components -t "erased"` from `apps/mobile`.

## Tasks

### Notifications module (`modules/notifications`)

- [x] **T-01** — Add `DeleteNotificationsAbout` (`src/notification/usecase/delete-notifications-about.usecase.ts`,
  input `{ userIds }`, nothing done for none) and the repository method `deleteAbout(userIds)` in
  `src/notification/provider/notification.repository.ts` (D-05's four types and params), exported from the indexes,
  with tests in `test/notification/usecase/delete-notifications-about.usecase.test.ts` and the fake repository.
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-06 · Done when: `npx jest` passes in `modules/notifications`.
  > ✅ 2026-10-27 15:37 — added `DeleteNotificationsAbout` (input `{ userIds }`, returns early for an empty list) and
  > the port method `NotificationRepository.deleteAbout(userIds)` (D-05: `registration.pending` /
  > `reactivation.requested` by `params.userId`, `enrolment.requested` / `enrolment.cancelled` by
  > `params.studentId`), exported from the use case index; the fake repository implements it (and honours
  > `failWith`); files: `modules/notifications/src/notification/usecase/delete-notifications-about.usecase.ts`,
  > `modules/notifications/src/notification/usecase/index.ts`,
  > `modules/notifications/src/notification/provider/notification.repository.ts`,
  > `modules/notifications/test/mock/fake-notification.repository.ts`,
  > `modules/notifications/test/notification/usecase/delete-notifications-about.usecase.test.ts`; verified: `npx
  > jest` in `modules/notifications` (18 suites, 192 passed), the use case at 100% coverage, `npm run check-types`
  > exit 0; deviations: none (the backend `PrismaNotificationRepository` implements `deleteAbout` in T-08).

### Enrolment module (`modules/enrolment`)

- [x] **T-02** — Add `studentId` to `SeatRequested` and `SeatCancelled` in
  `src/enrolment/provider/enrolment-notifier.provider.ts` and set it in `request-seat`, `cancel-seat` and
  `release-student-enrolments` (`src/enrolment/usecase/`), with the use case tests asserting it (D-06).
  Covers: ER-07 · Done when: `npx jest test/enrolment/usecase` passes and `npm run check-types` exits 0 in
  `modules/enrolment`.
  > ✅ 2026-10-27 15:37 — added `studentId` to `SeatRequested` and `SeatCancelled` (D-06) and set it in
  > `RequestSeat`, `CancelSeat` and `ReleaseStudentEnrolments`; the use case tests (and the fake notifier test) now
  > expect it, and failed before the change (3 failed); files:
  > `modules/enrolment/src/enrolment/provider/enrolment-notifier.provider.ts`,
  > `modules/enrolment/src/enrolment/usecase/request-seat.usecase.ts`,
  > `modules/enrolment/src/enrolment/usecase/cancel-seat.usecase.ts`,
  > `modules/enrolment/src/enrolment/usecase/release-student-enrolments.usecase.ts`,
  > `modules/enrolment/test/enrolment/usecase/request-seat.usecase.test.ts`,
  > `modules/enrolment/test/enrolment/usecase/cancel-seat.usecase.test.ts`,
  > `modules/enrolment/test/enrolment/usecase/release-student-enrolments.usecase.test.ts`,
  > `modules/enrolment/test/mock/fake-enrolment.repository.test.ts`; verified: `npx jest test/enrolment/usecase`
  > (156 passed), `npx jest` (292 passed), `npm run check-types` exit 0 in `modules/enrolment`; deviations: none.

### Auth module (`modules/auth`)

- [x] **T-03** — Add the port `PersonNotificationEraser` (`erase(userIds)`) in
  `src/user/provider/person-notification-eraser.provider.ts`, the `UserRepository` methods
  `findClosedBefore(cutoff): Promise<string[]>` and `eraseClosed(ids, cutoff): Promise<number>` (D-03), exported from
  the provider index, and their fakes in `test/mock/` (`fake-person-notification-eraser.provider.ts`,
  `fake-user.repository.ts`).
  Covers: enabling · Done when: `npx jest` passes and `npm run check-types` exits 0 in `modules/auth`.
  > ✅ 2026-10-27 15:38 — added the port `PersonNotificationEraser` (`erase(userIds)`), exported from the provider
  > index, and the `UserRepository` methods `findClosedBefore(cutoff)` and `eraseClosed(ids, cutoff)` (D-03); the
  > fakes: `FakePersonNotificationEraser` (records the calls, `failWith`) and `FakeUserRepository.findClosedBefore`
  > / `eraseClosed` (a `deleted` user by `deletedAt`, a `removed` one by `removedAt`, at or before the cutoff; an
  > erased user leaves `users` and its id goes to `erasedIds`, since the repository never returns it — D-04); files:
  > `modules/auth/src/user/provider/person-notification-eraser.provider.ts`,
  > `modules/auth/src/user/provider/index.ts`, `modules/auth/src/user/provider/user.repository.ts`,
  > `modules/auth/test/mock/fake-person-notification-eraser.provider.ts`,
  > `modules/auth/test/mock/fake-user.repository.ts`, `modules/auth/test/mock/index.ts`; verified: `npx jest` (485
  > passed) and `npm run check-types` exit 0 in `modules/auth`; deviations: none (the backend `PrismaUserRepository`
  > implements the methods in T-07).
- [x] **T-04** — Add `EraseClosedAccounts` in `src/user/usecase/erase-closed-accounts.usecase.ts` (D-03, D-05:
  cutoff 30 × 24 h, ids, eraser first, then `eraseClosed`; `{ erased }`), exported from the index, with tests in
  `test/user/usecase/erase-closed-accounts.usecase.test.ts` for due deleted and removed accounts, not due, no date, none
  due, a failing eraser (nothing erased) and the count. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03, ER-06 · Done when: `npx jest test/user/usecase/erase-closed-accounts.usecase.test.ts`
  passes in `modules/auth`.
  > ✅ 2026-10-27 15:39 — added `EraseClosedAccounts` (cutoff now − 30 × 24 h, `findClosedBefore`, then
  > `PersonNotificationEraser.erase(ids)` before `eraseClosed(ids, cutoff)`, answering `{ erased }`; nothing called
  > when none is due), exported from the use case index, following `EraseDeniedRegistrations`; tests (written first,
  > 11 failed before the use case existed) for due deleted and removed accounts, a due account with a pending
  > reactivation request, several at once with the count, not due, no date, other statuses, none due, a second run,
  > the cutoff passed to the write, and a failing eraser (nothing erased, the next run erases it); files:
  > `modules/auth/src/user/usecase/erase-closed-accounts.usecase.ts`, `modules/auth/src/user/usecase/index.ts`,
  > `modules/auth/test/user/usecase/erase-closed-accounts.usecase.test.ts`; verified: `npx jest
  > test/user/usecase/erase-closed-accounts.usecase.test.ts` (11 passed, the use case at 100% coverage), `npm run
  > check-types` exit 0; deviations: none.

### Classes module (`modules/classes`)

- [x] **T-05** — Make `ClassViewInstructor.name` (`src/school-class/provider/class-view-reader.provider.ts`) and
  `ClassStudent.name` (`src/school-class/provider/class-roster-reader.provider.ts`) `string | null` (D-08), adjust the
  use cases and outputs that carry them (`get-class.usecase.ts` and the list use cases), with tests that pass a `null`
  name through.
  Covers: ER-05 · Done when: `npx jest` passes and `npm run check-types` exits 0 in `modules/classes`.
  > ✅ 2026-10-27 15:40 — made `ClassViewInstructor.name` and `ClassStudent.name` `string | null` (D-08, null =
  > erased); the only use that needed a change was the instructors' sort in `toClassItem` (`class-item.ts`, used by
  > `GetClass` and every list use case), which now puts the erased instructors (no name) after the named ones, then
  > by id; tests pass a null instructor and student through `GetClass` (with guests and `seatsTaken` unchanged) and
  > `ListWeekClasses` (including a class whose only instructor is erased) — the sort case fails with the old
  > comparator; files: `modules/classes/src/school-class/provider/class-view-reader.provider.ts`,
  > `modules/classes/src/school-class/provider/class-roster-reader.provider.ts`,
  > `modules/classes/src/school-class/usecase/class-item.ts`,
  > `modules/classes/test/school-class/usecase/get-class.usecase.test.ts`,
  > `modules/classes/test/school-class/usecase/list-week-classes.usecase.test.ts`; verified: `npx jest` in
  > `modules/classes` (579 passed, `class-item.ts` at 100%), `npm run check-types` exit 0; deviations: the place of
  > an erased instructor in the A–Z order (last, by id) is not stated by the spec — chosen so a named instructor
  > leads the list.

### Backend (`apps/backend`)

- [x] **T-06** — In `prisma/models/auth.model.prisma`, add `erased` to `UserStatus` and `erasedAt` (`erased_at`) to
  `User`, and make `name` and `email` nullable; generate the migration `users_erasure`; make `user.prisma.ts`'s
  `findById`, lookup by email and lookup by identity skip erased accounts (D-04), with specs in `user.prisma.spec.ts`.
  Skill: [`backend-prisma-sync-module`](../../../.claude/skills/backend-prisma-sync-module).
  Covers: ER-01, ER-02 · Done when: `npm run prisma:migrate:deploy --workspace apps/backend` applies it and
  `npx vitest run src/modules/auth/user.prisma.spec.ts` passes.
  > ✅ 2026-10-27 15:48 — with the `backend-prisma-sync-module` skill: `erased` added to the Prisma `UserStatus` (not
  > to the domain, D-04), `erasedAt` (`erased_at`) added to `User`, `name` and `email` nullable (`email` still
  > unique); migration `20261027184122_users_erasure` (created with `--create-only` and reviewed: `ALTER TYPE … ADD
  > VALUE`, `ADD COLUMN erased_at`, two `DROP NOT NULL`, nothing destructive) applied with `prisma:migrate:deploy`.
  > `PrismaUserRepository` skips `status = erased` in `findById`, `findByEmail`, `findPage` (rows and count) and
  > `searchByName`, and maps a record with the domain types; `PrismaIdentityRepository.findByProvider` (the lookup
  > by identity) skips an identity whose user is erased. Small technical steps the nullable columns and the new enum
  > value needed: `JwtStrategy.validate` refuses an erased account (or one without an email) with
  > `auth.token.invalid` — changed in the `backend-nest-config` template
  > (`assets/shared-template/auth/jwt.strategy.ts` and its spec) and applied by rerunning `apply-backend-shared.js`,
  > whose final `nest build` failed only on the ports T-07 to T-09 implement; `PrismaClassContactReader` and
  > `PrismaTeacherLookup` leave erased accounts out (like missing ones);
  > `PrismaEnrolmentRepository.findPendingByClass` narrows the student name (an erased student has no pending
  > request); the e2e helpers narrow the now-nullable `email` / `name` of the rows they create. files:
  > `apps/backend/prisma/models/auth.model.prisma`,
  > `apps/backend/prisma/migrations/20261027184122_users_erasure/migration.sql`,
  > `apps/backend/src/modules/auth/user.prisma.ts`, `apps/backend/src/modules/auth/user.prisma.spec.ts`,
  > `apps/backend/src/modules/auth/identity.prisma.ts`, `apps/backend/src/modules/auth/identity.prisma.spec.ts`,
  > `apps/backend/src/modules/classes/class-contact-reader.prisma.ts`,
  > `apps/backend/src/modules/classes/class-contact-reader.prisma.spec.ts`,
  > `apps/backend/src/modules/classes/teacher-lookup.prisma.ts`,
  > `apps/backend/src/modules/classes/teacher-lookup.prisma.spec.ts`,
  > `apps/backend/src/modules/enrolment/enrolment.prisma.ts`, `apps/backend/src/shared/auth/jwt.strategy.ts`,
  > `apps/backend/src/shared/auth/jwt.strategy.spec.ts`,
  > `.claude/skills/backend-nest-config/assets/shared-template/auth/jwt.strategy.ts`,
  > `.claude/skills/backend-nest-config/assets/shared-template/auth/jwt.strategy.spec.ts`, and 22 e2e specs under
  > `apps/backend/test/` (`auth-profile`, `auth-session`, `cancellation-deadlines`, `cancellation-rules`,
  > `class-reminders`, `classes`, `direct-enrolment`, `enrolment-decisions`, `enrolment`, `guests`, `locations`,
  > `my-classes`, `notifications`, `people-removal`, `people-roles`, `people`, `reactivation-requests`,
  > `registrations`, `school-rules-acceptance`, `school-rules`, `school-settings`, `seat-cancellation`,
  > `teaching-classes`). verified: `npm run prisma:migrate:deploy --workspace apps/backend` (applied), `npx vitest
  > run src/modules/auth/user.prisma.spec.ts` with the other changed specs (6 files, 77 passed); the e2e suites
  > `auth-google`, `auth-session`, `auth-email`, `people` passed against the real database (filters accepted by
  > Prisma), `classes` had 3 failures in the time-range suggestions, which read last week’s classes and fail on
  > leftover local data — to recheck on a clean database in T-16; `tsc --noEmit` in `apps/backend` has only the
  > errors of the ports T-07 to T-09 implement. deviations: the migration is named `users_erasure` as the spec says,
  > not `auth-<change>` as the naming convention would; the JWT strategy and the readers are changes the spec did
  > not list, needed by the nullable columns and the new status.
- [x] **T-07** — Implement `findClosedBefore` and `eraseClosed` in `src/modules/auth/user.prisma.ts` (one
  transaction: the conditional `updateMany` of D-01 and D-03 on the ids still due, then the deletes of D-02 for the
  accounts it wrote), with specs in `user.prisma.spec.ts` (named "eraseClosed") for the cleared and kept fields, the
  deleted rows, the race (an account approved again before the write) and the count. Skill:
  [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-01, ER-02, ER-03 · Done when: `npx vitest run src/modules/auth/user.prisma.spec.ts -t "eraseClosed"`
  passes.
  > ✅ 2026-10-27 15:49 — with the `backend-prisma-repository` skill (only the two methods; the class and its
  > registration already existed): `findClosedBefore(cutoff)` selects the ids of the `deleted` users with
  > `deletedAt` and the `removed` users with `removedAt` at or before the cutoff (`closedBefore`, a null date never
  > matches); `eraseClosed(ids, cutoff)` is one `$transaction` — it reads the old emails of the accounts still due,
  > writes the anonymous record of D-01 with one conditional `updateManyAndReturn` on the same condition (`status:
  > erased`, `erasedAt: now`, name, email, photo, WhatsApp number, denial and reactivation fields cleared,
  > `whatsappVisible: false`; id, role, creation date and the deletion or removal date untouched), then, for the
  > accounts it wrote, deletes their identities, refresh tokens, push tokens, rules acceptances and own
  > notifications and the sign-in codes of their old emails (D-02), answering how many it erased; an empty list
  > queries nothing. Specs under `describe(eraseClosed)`: cleared and kept fields, the deleted rows, the race (an
  > account approved again before the write: only the written one loses its rows and counts), nothing still due, a
  > missing email, the empty list; and `findClosedBefore`. files: `apps/backend/src/modules/auth/user.prisma.ts`,
  > `apps/backend/src/modules/auth/user.prisma.spec.ts`; verified: `npx vitest run
  > src/modules/auth/user.prisma.spec.ts -t "eraseClosed"` (6 passed), the whole spec 39 passed with
  > `user.prisma.ts` at 100% lines (the one partial branch is the pre-existing `@Injectable()` line); deviations:
  > none (the real-database behaviour is checked by the e2e cases of T-12).
- [x] **T-08** — Implement `deleteAbout` in `src/modules/notifications/notification.prisma.ts` (one `deleteMany` per
  param name) and add `src/modules/notifications/notifications.person-notification-eraser.ts`
  (`NotificationsPersonNotificationEraser`, running `DeleteNotificationsAbout`), exported by `NotificationsModule`,
  with specs. Skill: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-06 · Done when: `npx vitest run src/modules/notifications/notification.prisma.spec.ts src/modules/notifications/notifications.person-notification-eraser.spec.ts`
  passes.
  > ✅ 2026-10-27 15:50 — `PrismaNotificationRepository.deleteAbout(userIds)` runs one `deleteMany` per param name —
  > `registration.pending` / `reactivation.requested` matching `params.userId`, then `enrolment.requested` /
  > `enrolment.cancelled` matching `params.studentId` (JSON path `equals`, as `deleteRegistrationPending` does) —
  > and nothing for an empty list; `NotificationsPersonNotificationEraser` (the adapter of `auth`’s
  > `PersonNotificationEraser`) runs `DeleteNotificationsAbout`, provided and exported by `NotificationsModule`;
  > specs for both. files: `apps/backend/src/modules/notifications/notification.prisma.ts`,
  > `apps/backend/src/modules/notifications/notification.prisma.spec.ts`,
  > `apps/backend/src/modules/notifications/notifications.person-notification-eraser.ts`,
  > `apps/backend/src/modules/notifications/notifications.person-notification-eraser.spec.ts`,
  > `apps/backend/src/modules/notifications/notifications.module.ts`; verified: `npx vitest run
  > src/modules/notifications/notification.prisma.spec.ts
  > src/modules/notifications/notifications.person-notification-eraser.spec.ts` (2 files, 12 passed); the backend
  > type check no longer reports `PrismaNotificationRepository`. deviations: the `backend-provider-implementation`
  > skill was not invoked — the adapter copies `NotificationsRegistrationNotificationEraser`, which follows that
  > skill’s pattern (concrete class injected directly, no token, registered and exported by the module).
- [x] **T-09** — Store `studentId` in the params of `enrolment.requested` and `enrolment.cancelled` in
  `src/modules/notifications/notifications.enrolment-notifier.ts`, with cases in its spec (text unchanged in
  `push-messages.spec.ts`).
  Covers: ER-07 · Done when: `npx vitest run src/modules/notifications/notifications.enrolment-notifier.spec.ts` passes.
  > ✅ 2026-10-27 15:51 — `NotificationsEnrolmentNotifier.seatRequested` and `seatCancelled` store the event’s
  > `studentId` in the params of `enrolment.requested` and `enrolment.cancelled` (D-06); the spec’s events and
  > expected params carry it (3 cases fail with the old notifier: stored params and the push payload), and
  > `push-messages.spec.ts` checks that the push and in-app text of both types is the same with and without
  > `studentId`, in the three locales. files:
  > `apps/backend/src/modules/notifications/notifications.enrolment-notifier.ts`,
  > `apps/backend/src/modules/notifications/notifications.enrolment-notifier.spec.ts`,
  > `apps/backend/src/modules/notifications/push-messages.spec.ts`; verified: `npx vitest run
  > src/modules/notifications/notifications.enrolment-notifier.spec.ts
  > src/modules/notifications/push-messages.spec.ts` (2 files, 137 passed); `tsc --noEmit` in `apps/backend` now
  > exits clean; deviations: none.
- [x] **T-10** — Make `src/modules/auth/account-erasure.job.ts` run `EraseDeniedRegistrations`, then
  `EraseClosedAccounts` with the new eraser, each in its own `try` with its count log (D-10), wired in the auth module,
  with cases in `account-erasure.job.spec.ts`.
  Covers: ER-08 · Done when: `npx vitest run src/modules/auth/account-erasure.job.spec.ts` passes.
  > ✅ 2026-10-27 15:52 — `AccountErasureJob.run()` runs `EraseDeniedRegistrations`, then `EraseClosedAccounts` (with
  > `NotificationsPersonNotificationEraser`), each through `step()`, its own `try`: a count line per kind only when
  > it erased something (`Erased N denied registration(s)`, `Erased N closed account(s)`), an error log and 0 when
  > it fails, never ids, names or emails (D-10); it answers `{ deniedRegistrations, closedAccounts }` and never
  > throws. The wiring needed nothing new in `AuthModule`: `NotificationsModule` (already imported) exports the
  > eraser (T-08). Spec cases: the cron options, both kinds erased in order with one log line each and no id in the
  > logs, nothing due (no log), the denied step failing (closed accounts still erased) and the other way around,
  > non-Error throws in both. files: `apps/backend/src/modules/auth/account-erasure.job.ts`,
  > `apps/backend/src/modules/auth/account-erasure.job.spec.ts`, `apps/backend/test/account-erasure.e2e-spec.ts`
  > (two existing assertions read the new result shape); verified: `npx vitest run
  > src/modules/auth/account-erasure.job.spec.ts` (6 passed), `tsc --noEmit` in `apps/backend` exit 0; deviations:
  > `run()` now answers the count per kind instead of `{ erased }`.
- [x] **T-11** — Pass the stored (possibly `null`) names through in `src/modules/classes/class-view-reader.prisma.ts`
  and `src/modules/enrolment/class-roster-reader.prisma.ts`, with specs for an erased instructor and student.
  Covers: ER-05 · Done when: `npx vitest run src/modules/classes/class-view-reader.prisma.spec.ts src/modules/enrolment/class-roster-reader.prisma.spec.ts`
  passes.
  > ✅ 2026-10-27 15:53 — the readers already send what is stored: `PrismaClassViewReader` maps `instructors` to the
  > users’ `{ id, name }` and `PrismaClassRosterReader` spreads the student’s `{ id, name, photoUrl }`, so once
  > `name` is nullable (T-06) and the ports accept `null` (T-05) the stored null passes through with no code change
  > (D-08); added the specs for an erased instructor (null name next to a named one) and an erased student (null
  > name, its id, enrolment id and seat kept). files:
  > `apps/backend/src/modules/classes/class-view-reader.prisma.spec.ts`,
  > `apps/backend/src/modules/enrolment/class-roster-reader.prisma.spec.ts`; verified: `npx vitest run
  > src/modules/classes/class-view-reader.prisma.spec.ts src/modules/enrolment/class-roster-reader.prisma.spec.ts`
  > (2 files, 13 passed), `tsc --noEmit` exit 0; deviations: no change to `class-view-reader.prisma.ts` or
  > `class-roster-reader.prisma.ts` was needed.
- [x] **T-12** — Add to `test/account-erasure.e2e-spec.ts` (faked `ExpoPushProvider`, fixed clocks, cleanup) the
  describes the Expected Results' `Verify by` name: "erases a deleted account", "erases a removed account", "leaves",
  "reactivation request", "class" and "notifications", running the job through `app.get(AccountErasureJob).run()`.
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-06 · Done when:
  `npx vitest run --config vitest.config.e2e.ts test/account-erasure.e2e-spec.ts` passes from `apps/backend`.
  > ✅ 2026-10-27 16:08 — added to `test/account-erasure.e2e-spec.ts` a `closed accounts` group whose describes carry
  > the names the Verify by lines filter on — "erases a deleted account" (a real email sign-up made `deleted` 30
  > days and 1 minute ago as an instructor, with a photo, a WhatsApp number, a push token, a rules acceptance, a
  > notification and a pending sign-in code: the row is erased with id, role, creation and deletion dates kept,
  > every row hanging off it and the old code are gone, its taught class and approved seat stay, `/auth/me` answers
  > 401 `auth.token.invalid`, `/auth/refresh` 401 `auth.refreshToken.invalid`, and the old email signs up as a new
  > `pending` account), "erases a removed account" (not in `GET /people/removed`, restore 404 `user.notFound`),
  > "leaves" (not due, no date, approved / pending / denied unchanged; a second run erases 0; a due denied
  > registration is still hard-deleted by spec 021), "with a pending reactivation request" (erased, out of `GET
  > /reactivation-requests`, approve 404 `reactivation.notFound`, the admin’s notice deleted), "in a class" (`GET
  > /classes/:id` and the week list answer the erased instructor and student with their ids and `name: null`, the
  > others named, seats and guests unchanged) and "notifications" (the six rows of the four types about X in an
  > admin’s and an instructor’s inbox deleted, the ones about Y and a legacy one without `studentId` kept). The
  > suite fakes `ExpoPushProvider`, and the cleanup now also finds the accounts by the ids the test made (an erased
  > one has no email) and deletes their classes and locations first. files:
  > `apps/backend/test/account-erasure.e2e-spec.ts`, `.specs/changes/067-closed-account-erasure/spec.md`
  > (amendment); verified: `npx vitest run --config vitest.config.e2e.ts test/account-erasure.e2e-spec.ts` (13
  > passed), each `-t` filter of the Verify by lines passes, and no `erased` / `deleted` / `removed` row is left in
  > the database afterwards; deviations: the job runs on the real clock with dates relative to now and a minute’s
  > margin (as the file’s existing cases), not a fixed clock — a fixed auth clock would break the existing “exactly
  > 30 days” case; ER-02 and ER-04 expect 404 after the amendment of 2026-10-27 (D-13, approved by the user).

### Mobile (`apps/mobile`)

- [x] **T-13** — Make `ClassInstructor.name` and `ClassStudent.name` `string | null` in
  `src/modules/classes/classes.types.ts`, add `src/modules/classes/utils/person-label.ts` (the label of a name or of an
  erased instructor or student, D-07) and an `erased` variant of `components/student-avatar` (person icon, no
  initials), with the `classes.erased.*` keys in `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`, and tests next to each.
  Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: enabling · Done when: `npx jest src/modules/classes/utils src/modules/classes/components/student-avatar`
  passes and `npx tsc --noEmit` exits 0.
  > ✅ 2026-10-27 16:10 — following the React Native skills and `.claude/rules/react.md`: `ClassInstructor.name` and
  > `ClassStudent.name` are `string | null` (null = erased); `utils/person-label.ts` adds `personLabel(name, list,
  > t)` — the name, or the `classes.erased.student` / `classes.erased.instructor` label chosen by the list the
  > person is shown in (D-07); `StudentAvatar` takes `erased` and then draws the guest avatar’s person icon (Feather
  > `user`, `ink2`, half the circle) on the same `sand` circle, never the photo or initials, labelled by its `name`
  > prop (the caller passes the label); the `classes.erased.*` keys hold the D-07 copy in pt-BR, es-ES and en-US.
  > Tests: `person-label.test.ts` (name kept; both labels in the three locales) and a `StudentAvatar` erased case.
  > files: `apps/mobile/src/modules/classes/classes.types.ts`,
  > `apps/mobile/src/modules/classes/utils/person-label.ts`,
  > `apps/mobile/src/modules/classes/utils/person-label.test.ts`,
  > `apps/mobile/src/modules/classes/components/student-avatar/student-avatar.component.tsx`,
  > `apps/mobile/src/modules/classes/components/student-avatar/student-avatar.types.ts`,
  > `apps/mobile/src/modules/classes/components/student-avatar/student-avatar.component.test.tsx`,
  > `apps/mobile/src/i18n/messages/pt-BR.ts`, `apps/mobile/src/i18n/messages/es-ES.ts`,
  > `apps/mobile/src/i18n/messages/en-US.ts`; verified: `npx jest src/modules/classes/utils
  > src/modules/classes/components/student-avatar` (174 passed), `eslint` clean on these files; `npx tsc --noEmit`
  > does not exit 0 yet: the nullable names break only the seven files T-14 and T-15 change (class-card,
  > class-people and its hook, ongoing-class-card, class-details screen and hook, edit-class hook) — rechecked at
  > the end of T-15; deviations: that type check, and the erased avatar is a prop of `StudentAvatar` (`erased`)
  > rather than a separate component.
- [ ] **T-14** — Use the label and the erased avatar, and make the rows not tappable, in
  `components/class-people` and `screens/class-details.screen.tsx` (with its hook), with tests named "erased" (D-09).
  Covers: ER-09 · Done when: `npx jest src/modules/classes -t "erased"` passes.
- [ ] **T-15** — Use the label in `components/class-card` (instructors' line and student avatars, the "without
  instructor" rule unchanged), `components/ongoing-class-card` and the kept teachers of `screens/edit-class.screen.hook.ts`,
  with tests named "erased".
  Covers: ER-10 · Done when: `npx jest src/modules/classes/components src/modules/classes/screens -t "erased"` passes
  and `npx tsc --noEmit` exits 0.

### Verification

- [ ] **T-16** — Run every command in the Verification Plan from the repo root; all pass. Record the output summary
  as evidence. Covers: all · Done when: `run-related-tests.mjs 067` prints RELATED TESTS PASSED,
  `check-coverage.mjs 067` prints COVERAGE OK, `run-e2e.mjs 067` prints E2E PASSED, the turbo lint, type check and
  build exit 0, and the user journey was followed with the observation recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 067` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 067` — every line this spec adds or changes is covered
  - `node .specs/scripts/run-e2e.mjs 067` — the backend e2e suite passes (Postgres up, migrations applied, including
    `users_erasure`), with `test/account-erasure.e2e-spec.ts`
  - `npx turbo run lint check-types build --concurrency=1 --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/enrolment --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — lint, type check and build of the workspaces touched
- User journeys (iOS simulator, backend running with the seed):
  - With a past class that has a seeded student and instructor, set both accounts to `deleted` with a `deleted_at`
    31 days ago in the database and wait for the job (at most a minute): as the admin review account, the class's
    details show "Ex-instrutor" and "Ex-aluno" with the generic avatar, tapping them opens nothing, and the week card
    shows "Ex-instrutor" (ER-09, ER-10). Rerun the seed afterwards if a review account was used.

## Memory Impact

- `memory/product.md` — User lifecycle: deleted and removed accounts are erased 30 days after the deletion or
  removal; the history keeps "Ex-aluno" / "Ex-instrutor" by list; notifications naming the person are deleted (older
  enrolment ones excepted).
- `memory/modules/auth.md` — the erased account record (what is kept, cleared and deleted), `EraseClosedAccounts`,
  the `PersonNotificationEraser` port, the repository methods `findClosedBefore` / `eraseClosed`, "the repository
  never returns an erased account", the job's two steps, and spec history; "Not built yet: erasing it 30 days later"
  is removed.
- `memory/modules/notifications.md` — `DeleteNotificationsAbout` and the four types it deletes; `studentId` in the
  params of `enrolment.requested` and `enrolment.cancelled`.
- `memory/modules/enrolment.md` — `SeatRequested` and `SeatCancelled` carry `studentId`.
- `memory/modules/classes.md` — instructors' and roster students' names are `null` for erased people.
- `memory/technical-context.md` — Persistence: the `users_erasure` migration (`erased` status, `erased_at`, nullable
  name and email); Scheduled work: the account erasure job's two steps; Automated validation: the new e2e cases.
- `memory/structure.md` — the new use cases, the eraser adapter and the mobile `person-label` util.

## Assumptions

- A-01 — The `enrolment.requested` and `enrolment.cancelled` notifications stored before this spec carry no
  `studentId` and keep the erased person's name. Accepted by the user in round 1.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

- 2026-10-27 — found while executing T-12, approved by the user: D-04 (the repository never returns an erased
  account) makes `RestoreAccount` and `ApproveReactivation` answer not found before they check the status, so the 409s
  of D-12 can't happen. D-12 is removed and replaced by D-13; ER-02's edge case "409 `user.status.notRemoved`" →
  "404 `user.notFound`"; ER-04's behavior "409 `reactivation.status.notRequested`" → "404 `reactivation.notFound`".
  No code change: the code already answers 404.

## Review
