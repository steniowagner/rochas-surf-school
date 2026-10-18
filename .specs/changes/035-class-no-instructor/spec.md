---
id: "035"
slug: class-no-instructor
title: "Classes left without an instructor"
status: in-progress
created: 2026-10-17
started: 2026-10-18
base_commit: 5e736309fb305a7219c912592dd78af63b0f0e32
fronts: [classes, notifications, auth, backend, mobile]
depends_on: []
---

# 035 — Classes left without an instructor

## Goal

When an instructor or admin deletes their account, they are taken off every class of theirs that hasn't started.
A class that loses its only instructor this way stays scheduled, is flagged for admins as having no instructor, and
every approved admin is told, so someone is assigned before it starts. Assigning an instructor through "Editar aula"
(spec 032) clears the flag. The step that releases the classes is built once, so the role-change and removal specs
reuse it. This is the last of the four class-management specs (032 editing, 033 cancelling, 034 deleting).

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: User (`approved` → `deleted` "cancel the
  user's upcoming seats, pending enrolments and class assignments"; a return doesn't restore them), Class ("Flags
  shown to admins: **no instructor** (an upcoming class lost its only instructor — admins are notified)").
- Requirements:
  - [requirements.md → Class without an instructor](../../../.docs/requirements.md#class-without-an-instructor) — a
    class that hasn't started and loses its only instructor stays scheduled, is flagged, and admins are notified.
  - [requirements.md → Deleting an account](../../../.docs/requirements.md#deleting-an-account) — deleting an
    account cancels the user's class assignments (only that part: seats and pending requests come with enrolment).
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Architecture (modules
  reach each other through ports implemented by backend adapters; `modules/classes` depends on `modules/auth`, never
  the reverse), Classes (`SchoolClassRepository`, `EditClass`, `getClassState` with `cancelledAt`, the mobile class
  card, details and tools), External integrations → Push notifications (ports per module, adapters that log and
  swallow, `RecipientsProvider.findApprovedAdminIds`, push `data.classId`), Authentication (`DELETE /auth/me`),
  Automated validation. Module rules: [modules/classes.md](../../memory/modules/classes.md),
  [modules/notifications.md](../../memory/modules/notifications.md), [modules/auth.md](../../memory/modules/auth.md).
- Designs: `.docs/designs/admin-app.html` — the card's "Sem instrutor" chip (`aulaCard`, `estA === 'semInst'`), the
  details' "Sem instrutor" banner that opens the editor and "Sem instrutor atribuído" in the instructors section
  (`aulaScreen`). The file is a bundle: its sources unpack from the `__bundler/manifest` script (gzip + base64). Its
  copy is European Portuguese; this spec adapts it (D-14).
- Existing code this builds on:
  - `modules/auth/src/user/usecase/delete-account.usecase.ts` — `DeleteAccount` (spec 026): marks the account
    `deleted`; `modules/auth/src/user/provider/` — the module's ports (`RegistrationNotifier` as the pattern).
  - `apps/backend/src/modules/auth/auth.controller.ts` — `DELETE /auth/me`; `auth.module.ts` (imports
    `NotificationsModule`); `apps/backend/test/auth-profile.e2e-spec.ts` (`DELETE /auth/me (e2e)`).
  - `modules/classes/src/school-class/` — `SchoolClassRepository`, `getClassState`, `EditClass` (an edit needs at
    least one instructor, `class.instructors.required`); fakes in `modules/classes/test/mock/`.
  - `modules/notifications/src/notification/` — `Notify`, `RecipientsProvider`, `NotifyApprovedAdmins` (the pattern),
    `NOTIFICATION_TYPES`.
  - `apps/backend/src/modules/classes/` — `PrismaSchoolClassRepository`, `classes.module.ts` (imports `DbModule`,
    `NotificationsModule`); `apps/backend/src/modules/notifications/` — `push-messages.ts`, `recipients.prisma.ts`,
    the notifier adapters.
  - `apps/mobile/src/modules/classes/` — `ClassCard`, `ClassesWeekScreen` (`canCreate` for admins),
    `ClassDetailsScreen` (`canEdit`, the tools), `routes.admin.editClass`.
  - `apps/mobile/src/modules/notifications/hooks/` — `useNotificationResponse`, `useNotificationReceived`.

## Scope

### In scope

- A classes use case that takes one person off every class of theirs that hasn't started and isn't cancelled, and
  tells the approved admins about the classes left with nobody.
- Calling it from `DeleteAccount` through a port of the auth module, before the account is marked deleted.
- The computed "no instructor" flag (a class that hasn't started and has no instructor) and how the app shows it.
- The `class.noInstructor` notification type, its push text in pt-BR, es and en, and its tap.

### Out of scope

- Demoting an instructor to student and removing an account: they don't exist yet; their specs call the same port
  (D-03).
- Cancelling the seats and pending requests of a deleted account (with enrolment), refusing the deletion of the only
  admin, and erasing deleted accounts after 30 days.
- Telling the person who deleted their account, or the other instructors of a class who stay on it.
- Telling students that a class lost its instructor (with enrolment).
- Restoring the assignments when the account is reactivated: product.md says a return doesn't restore them.
- Storing the flag, or flagging a class that has started or finished without an instructor (none can: only classes
  that haven't started are released).
- A list or filter of the classes without an instructor.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | Use case `ReleaseUpcomingClasses` (`modules/classes/src/school-class/usecase/release-upcoming-classes.usecase.ts`), input `{ userId }`, output `{ released, withoutInstructor }` (counts). It has no actor: it is called by the backend on behalf of an account event, never through HTTP. It reads the classes the person teaches that start after now and aren't cancelled (`SchoolClassRepository.findUpcomingTaughtBy(userId, now)`), removes the person from all of them in one write (`removeInstructor(userId, classIds)`, one `$transaction` deleting their `class_instructors` rows), and counts the ones whose instructor list had only that person. Started, finished and cancelled classes keep the person. No class → nothing written or sent. | One reusable step for the three account events of requirements → Class without an instructor; a class under way or past keeps its history. |
| D-02 | Admins are told once per call, after the write: when at least one class was left with nobody, `NoInstructorNotifier.classesWithoutInstructor({ count, classId, discipline, startsAt, excludeUserIds: [userId] })` (`provider/no-instructor-notifier.provider.ts`) with the count and the earliest such class (by `startsAt`, then `id`). A notifier that throws is swallowed in the use case and logged in the adapter; it never changes the result. Classes that keep another instructor tell nobody. | One notification per event, like the batch's `class.assigned`; the earliest class is the most urgent one to open. |
| D-03 | Auth reaches it through its own port `TeachingReleaser` (`modules/auth/src/user/provider/teaching-releaser.provider.ts`, `releaseUpcomingClasses(userId): Promise<void>`), implemented by `ClassesTeachingReleaser` (`apps/backend/src/modules/classes/classes.teaching-releaser.ts`) running `ReleaseUpcomingClasses`, provided and exported by `ClassesModule` and imported by `AuthModule`. The role-change and removal use cases will take the same port. | Auth must not depend on classes (Architecture); the same adapter shape as `RegistrationNotifier`. |
| D-04 | `DeleteAccount` gains the `TeachingReleaser` and calls it after its checks (the account exists and is approved) and **before** marking the account deleted, for every role. An error from it propagates: the request fails, the account stays approved, and since releasing is idempotent the person can try again. A student has no classes, so nothing happens for them. | "Account deleted" then always means "no upcoming assignments"; the reverse order could leave a deleted account teaching upcoming classes. |
| D-05 | The approved admins are found by a new notifications use case `NotifyClassesWithoutInstructor` (`modules/notifications/src/notification/usecase/notify-classes-without-instructor.usecase.ts`): `RecipientsProvider.findApprovedAdminIds()` minus `excludeUserIds`, then `Notify` with type `class.noInstructor` and params `{ count, classId, discipline, startsAt }` (ISO UTC). No admin left → nothing stored or sent. The backend adapter `NotificationsNoInstructorNotifier` (`apps/backend/src/modules/notifications/notifications.no-instructor-notifier.ts`) runs it, logging and swallowing every error, provided and exported by `NotificationsModule`. | Who hears is a business rule, so it sits in a use case, not in the adapter; the deleting admin is still approved when this runs (D-04), hence the exclusion. |
| D-06 | Push text (`push-messages.ts`), the start formatted as in spec 032 (Fortaleza, `dd/MM` and `HH:mm`; en `MM/dd`), `{discipline}` "Surf" / "Skate". Count 1: title "Aula sem instrutor" / "Clase sin instructor" / "Class without an instructor"; body pt-BR "A aula de {discipline} de {dd/MM} às {HH:mm} ficou sem instrutor.", es "La clase de {discipline} del {dd/MM} a las {HH:mm} se quedó sin instructor.", en "The {discipline} class on {MM/dd} at {HH:mm} has no instructor now." Count N > 1: title "Aulas sem instrutor" / "Clases sin instructor" / "Classes without an instructor"; body pt-BR "{count} aulas ficaram sem instrutor. A próxima: {discipline}, {dd/MM} às {HH:mm}.", es "{count} clases se quedaron sin instructor. La próxima: {discipline}, {dd/MM} a las {HH:mm}.", en "{count} classes have no instructor now. The next one: {discipline}, {MM/dd} at {HH:mm}." The push `data` carries `classId` (spec 032's rule). | The push says how many and which comes first. |
| D-07 | The flag is computed, never stored: `isWithoutInstructor(instructorCount, state)` (`modules/classes/src/school-class/model/class-flags.ts`) is `true` when `instructorCount === 0` and `state === "not-started"` (so never for a cancelled, started or finished class). The app uses it with `getClassState` (with `cancelledAt`) and `useNow`, so the flag disappears once the class starts or an instructor is assigned. | product.md lists it as a flag, not a state; one function keeps the card and the details on the same rule. |
| D-08 | Card (`ClassCard`): a new `showFlags` prop; with it, a flagged class shows the chip "Sem instrutor" (`Chip` tone `warn`, icon `person-remove-outline`) in the right chip slot (a class that hasn't started has no state chip). `ClassesWeekScreen` gets a `showFlags` prop set only by the admin's Aulas tab. For every role, a card with no instructor shows "Sem instrutor" in `ink-2` in its instructors footer instead of an empty line. | product.md: the flag is shown to admins; the footer only states the data, for everyone. |
| D-09 | Details (`ClassDetailsScreen`): with `canEdit` (admins) and a flagged class, a banner on `warn-tint` with the `person-remove-outline` icon, "Sem instrutor" / "Atribua um instrutor antes da aula.", shown where the started / finished / cancelled banners go; pressing it (a `Pressable` row, at least 44 pt) opens `routes.admin.editClass(id)`. For every role, a class with no instructor shows "Sem instrutor atribuído" in the instructors section instead of the list. | The design's `semInst` banner and its `abrirForm` tap; spec 032's edit screen already requires at least one instructor, so saving there clears the flag. |
| D-10 | Pushes in the app: tapping a `class.noInstructor` push with a `classId` refreshes the account, then opens `routes.admin.classDetail(classId)` when the account resolves to the `admin` flow, else `routes.home`; received with the app open, it invalidates `["classes"]`. | Only admins receive it; the earliest class is where to act. |
| D-11 | The mobile app's account deletion (Profile → "Remover a conta", spec 026) doesn't change: the backend does the release within `DELETE /auth/me`. | Nothing new for the person deleting. |
| D-12 | Repository contract: `findUpcomingTaughtBy(userId, now): Promise<SchoolClass[]>` (classes with the person among the instructors, `startsAt > now`, `cancelledAt` null, sorted by `startsAt` then `id`) and `removeInstructor(userId, classIds): Promise<void>` (deletes only that person's rows of those classes; an empty list writes nothing). A concurrent edit adding the person back is not prevented: the last write wins, as in spec 032. | The smallest contract that keeps the use case's rules in the domain. |
| D-13 | An admin who deletes their account is released like an instructor (they can teach, product.md). The only-admin refusal isn't built here (Out of scope). | Admins teach too; every teacher is handled the same. |
| D-14 | Copy (pt-BR / es-ES / en-US): `classesWeek.noInstructor` "Sem instrutor" / "Sin instructor" / "No instructor" (chip and footer); `classDetails.noInstructor.title` "Sem instrutor" / "Sin instructor" / "No instructor", `classDetails.noInstructor.description` "Atribua um instrutor antes da aula." / "Asigna un instructor antes de la clase." / "Assign an instructor before the class."; `classDetails.noInstructorAssigned` "Sem instrutor atribuído" / "Sin instructor asignado" / "No instructor assigned". | The design's copy adapted to Brazilian Portuguese ("Atribui" → "Atribua"), without its line about enrolled students. |

## Expected Results

### ER-01 — Deleting an account releases its upcoming classes

- **Front:** backend
- **Behavior:** Given an approved instructor who teaches a class starting tomorrow (with a co-instructor), a class
  under way and a finished class, when they call `DELETE /auth/me`, then the API answers 204, the account is
  `deleted`, and `GET /classes/:id` no longer lists them on tomorrow's class while the started and finished classes
  still do.
- **Edge and error cases:** a cancelled class that hasn't started keeps them; a student's deletion changes no class;
  an admin who teaches is released the same way.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/auth-profile.e2e-spec.ts -t "DELETE /auth/me releases"`
  and `npx jest test/school-class/usecase/release-upcoming-classes.usecase.test.ts -t "releases"` from
  `modules/classes`.

### ER-02 — A class left with nobody stays scheduled and admins are told

- **Front:** classes
- **Behavior:** Given a person who is the only instructor of two classes that haven't started (the earliest a Surf
  class) and a co-instructor of a third, when `ReleaseUpcomingClasses` runs for them, then all three lose them, the
  two classes still exist with no instructor, the result is `{ released: 3, withoutInstructor: 2 }`, and the notifier
  gets one call `{ count: 2, classId, discipline: "surf", startsAt }` for the earliest one, with `excludeUserIds:
  [userId]`.
- **Edge and error cases:** no class left with nobody → no call; no upcoming class → nothing written and no call; a
  notifier that throws doesn't change the result or the write.
- **Verify by:** `npx jest test/school-class/usecase/release-upcoming-classes.usecase.test.ts` from `modules/classes`.

### ER-03 — The approved admins get the notification

- **Front:** notifications
- **Behavior:** Given approved admins A and B and the deleting admin C (still approved), when
  `NotifyClassesWithoutInstructor` runs with `excludeUserIds: [C]`, then A and B each get a stored `class.noInstructor`
  `{ count, classId, discipline, startsAt }` and C gets nothing.
- **Edge and error cases:** pending, denied, deleted and removed admins aren't recipients; no admin left → nothing
  stored or sent.
- **Verify by:** `npx jest test/notification/usecase/notify-classes-without-instructor.usecase.test.ts` from
  `modules/notifications`; `npm run test:e2e --workspace apps/backend -- test/auth-profile.e2e-spec.ts -t "DELETE /auth/me notifies"`
  (stored notifications and the fake Expo messages).

### ER-04 — Deleting fails as a whole when releasing fails

- **Front:** auth
- **Behavior:** Given an approved account, when the `TeachingReleaser` throws during `DeleteAccount`, then the error
  propagates and the account is not marked deleted; when it succeeds, the account is marked deleted after it.
- **Edge and error cases:** an unknown account still answers `auth.token.invalid` and a non-approved one
  `user.status.notApproved` before anything is released.
- **Verify by:** `npx jest test/user/usecase/delete-account.usecase.test.ts` from `modules/auth`.

### ER-05 — The no-instructor push text

- **Front:** backend
- **Behavior:** Given a `class.noInstructor` notification for a Surf class starting at 2026-10-18 11:00Z, when it is
  pushed, then with `count: 1` the title is "Aula sem instrutor" and the body pt-BR "A aula de Surf de 18/10 às 08:00
  ficou sem instrutor." (en "The Surf class on 10/18 at 08:00 has no instructor now."); with `count: 3` the title is
  "Aulas sem instrutor" and the body "3 aulas ficaram sem instrutor. A próxima: Surf, 18/10 às 08:00."; `data` is
  `{ type, notificationId, classId }`.
- **Edge and error cases:** es copy as D-06; the `Notification` entity accepts `class.noInstructor`.
- **Verify by:** `npx vitest run src/modules/notifications/push-messages.spec.ts src/modules/notifications/notifications.no-instructor-notifier.spec.ts`
  from `apps/backend`; `npx jest test/notification/model/notification.entity.test.ts` from `modules/notifications`.

### ER-06 — The flag is computed from the instructors and the state

- **Front:** classes
- **Behavior:** `isWithoutInstructor(0, "not-started")` is `true`; `isWithoutInstructor(1, "not-started")`,
  `isWithoutInstructor(0, "started")`, `isWithoutInstructor(0, "finished")` and `isWithoutInstructor(0, "cancelled")`
  are `false`.
- **Edge and error cases:** none.
- **Verify by:** `npx jest test/school-class/model/class-flags.test.ts` from `modules/classes`.

### ER-07 — Admins see "Sem instrutor" on the card

- **Front:** mobile
- **Behavior:** Given a class that hasn't started and has no instructor, when an admin opens Aulas, then its card
  shows the chip "Sem instrutor" and "Sem instrutor" in its footer; a student or an instructor sees the footer text
  without the chip.
- **Edge and error cases:** the chip goes away once the class has started (then "Em andamento") or is cancelled
  ("Cancelada"); a class with an instructor shows neither.
- **Verify by:** `npx jest src/modules/classes/components/class-card -t "no instructor"` and
  `npx jest src/modules/classes/screens/classes-week.screen.test.tsx -t "no instructor"` from `apps/mobile`.

### ER-08 — The details flag the class and lead to the editor

- **Front:** mobile
- **Behavior:** Given a class that hasn't started and has no instructor, when an admin opens its details, then the
  banner "Sem instrutor" / "Atribua um instrutor antes da aula." shows and pressing it opens
  `/admin/edit-class/<id>`; every role sees "Sem instrutor atribuído" in the instructors section.
- **Edge and error cases:** a student or an instructor sees no banner; a started class with no instructor shows the
  started banner and "Sem instrutor atribuído".
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "no instructor"` from
  `apps/mobile`; the "Class without an instructor" journey of the Verification Plan.

### ER-09 — The no-instructor push opens the class

- **Front:** mobile
- **Behavior:** Given a `class.noInstructor` push with a `classId`, when an admin taps it, then the account is
  refreshed and `/admin/class/<classId>` opens; when one arrives with the app open, `["classes"]` is invalidated.
- **Edge and error cases:** an account that no longer resolves to the admin flow, or a push without a `classId`,
  goes to `/`.
- **Verify by:** `npx jest src/modules/notifications/hooks/use-notification-response.hook.test.tsx src/modules/notifications/hooks/use-notification-received.hook.test.tsx -t "class.noInstructor"`
  from `apps/mobile`.

## Tasks

### Classes module (`modules/classes`)

- [x] **T-01** — Add `isWithoutInstructor` (`src/school-class/model/class-flags.ts`, D-07), exported from the model
  barrel, with `test/school-class/model/class-flags.test.ts`.
  Covers: ER-06 · Done when: `npx jest test/school-class/model/class-flags.test.ts` passes from `modules/classes`.
  > ✅ 2026-10-18 — added `isWithoutInstructor(instructorCount, state)` (true only for 0 instructors and
  > `not-started`), exported from the model barrel; the test was written first and failed (3 failed) before the
  > function existed. files: `modules/classes/src/school-class/model/class-flags.ts`,
  > `modules/classes/src/school-class/model/index.ts`, `modules/classes/test/school-class/model/class-flags.test.ts`;
  > verified: `npx jest test/school-class/model/class-flags.test.ts --coverage` (3 passed, class-flags.ts 100%);
  > deviations: none

- [x] **T-02** — Add `SchoolClassRepository.findUpcomingTaughtBy` / `removeInstructor` (D-12) and the
  `NoInstructorNotifier` port (`src/school-class/provider/no-instructor-notifier.provider.ts`, D-02), exported from
  the provider barrel; extend `test/mock/fake-school-class.repository.ts` and add `fake-no-instructor.notifier.ts`
  (and the mock barrel), with their tests in `test/school-class/provider/`.
  Covers: enabling · Done when: `npm test --workspace @rochas-surf-school/classes` and
  `npm run check-types --workspace @rochas-surf-school/classes` pass.
  > ✅ 2026-10-18 — added `findUpcomingTaughtBy(userId, now)` (taught by the person, `startsAt > now`, not
  > cancelled, by `startsAt` then `id`) and `removeInstructor(userId, classIds)` (empty list writes nothing) to the
  > port; the `NoInstructorNotifier` port with `ClassesWithoutInstructor { count, classId, discipline, startsAt,
  > excludeUserIds }`; the fake repository implements both (recording `removeInstructorCalls`) and
  > `FakeNoInstructorNotifier` records events and can fail once (`failNext`). files:
  > `modules/classes/src/school-class/provider/school-class.repository.ts`,
  > `modules/classes/src/school-class/provider/no-instructor-notifier.provider.ts`,
  > `modules/classes/src/school-class/provider/index.ts`, `modules/classes/test/mock/fake-school-class.repository.ts`,
  > `modules/classes/test/mock/fake-no-instructor.notifier.ts`, `modules/classes/test/mock/index.ts`,
  > `modules/classes/test/school-class/provider/fake-school-class.repository.test.ts`,
  > `modules/classes/test/school-class/provider/fake-no-instructor.notifier.test.ts`; verified:
  > `npm test --workspace @rochas-surf-school/classes` (23 suites, 313 passed; both fakes 100%) and
  > `npm run check-types --workspace @rochas-surf-school/classes` (no errors); deviations: none. The backend's
  > `PrismaSchoolClassRepository` doesn't implement the two methods until T-06, so the backend type check fails
  > between T-02 and T-06.

- [x] **T-03** — Add `ReleaseUpcomingClasses` (`src/school-class/usecase/release-upcoming-classes.usecase.ts`,
  exported from the usecase barrel; D-01, D-02), with
  `test/school-class/usecase/release-upcoming-classes.usecase.test.ts` (tests named "releases", plus the cases of
  ER-02). Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02 · Done when: `npx jest test/school-class/usecase/release-upcoming-classes.usecase.test.ts --coverage`
  passes from `modules/classes` with every line of the use case covered.
  > ✅ 2026-10-18 — following the `module-use-case` skill's pattern (In/Out interfaces, constructor
  > dependencies, concrete fakes): `ReleaseUpcomingClasses({ userId })` reads `findUpcomingTaughtBy(userId, now)`,
  > returns `{ 0, 0 }` with no write when empty, else one `removeInstructor` with every id, then one
  > `classesWithoutInstructor` with the count and the earliest class left with nobody (the repository's order: start,
  > then id) and `excludeUserIds: [userId]`, swallowing a throwing notifier; a failed write propagates and tells
  > nobody. The tests were written first and failed (7 failed). Two tests are named "releases" (ER-01's filter):
  > the ER-02 scenario and the started / finished / starting-now / cancelled classes keeping the person. files:
  > `modules/classes/src/school-class/usecase/release-upcoming-classes.usecase.ts`,
  > `modules/classes/src/school-class/usecase/index.ts`,
  > `modules/classes/test/school-class/usecase/release-upcoming-classes.usecase.test.ts`; verified:
  > `npx jest test/school-class/usecase/release-upcoming-classes.usecase.test.ts --coverage` (7 passed, use case
  > 100% statements / branches / functions / lines), `-t "releases"` (2 passed), `npx tsc --noEmit` (no errors);
  > deviations: none

### Notifications module (`modules/notifications`)

- [x] **T-04** — Add `class.noInstructor` to `NOTIFICATION_TYPES` and the `NotifyClassesWithoutInstructor` use case
  (`src/notification/usecase/notify-classes-without-instructor.usecase.ts`, exported; D-05), with
  `test/notification/usecase/notify-classes-without-instructor.usecase.test.ts` and a case in
  `test/notification/model/notification.entity.test.ts`. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-03, ER-05 · Done when: `npm test --workspace @rochas-surf-school/notifications` passes.
  > ✅ 2026-10-18 — following the `module-use-case` skill's pattern (as `NotifyApprovedAdmins`): `class.noInstructor`
  > added to `NOTIFICATION_TYPES`; `NotifyClassesWithoutInstructor({ count, classId, discipline, startsAt,
  > excludeUserIds })` takes `findApprovedAdminIds()` minus the excluded ids and runs `Notify` with
  > `class.noInstructor` and `{ count, classId, discipline, startsAt }` (`startsAt` ISO UTC); none left → nothing
  > stored or sent. Tests written first and failed (4 failed). The recipients' status filter (pending, denied,
  > deleted, removed admins) is `RecipientsProvider`'s, proven by the e2e test of T-08. files:
  > `modules/notifications/src/notification/model/notification.entity.ts`,
  > `modules/notifications/src/notification/usecase/notify-classes-without-instructor.usecase.ts`,
  > `modules/notifications/src/notification/usecase/index.ts`,
  > `modules/notifications/test/notification/usecase/notify-classes-without-instructor.usecase.test.ts`,
  > `modules/notifications/test/notification/model/notification.entity.test.ts`; verified:
  > `npm test --workspace @rochas-surf-school/notifications` (12 suites, 101 passed; the use case and the entity
  > 100%), `npx tsc --noEmit` (no errors); deviations: none

### Auth module (`modules/auth`)

- [x] **T-05** — Add the `TeachingReleaser` port (`src/user/provider/teaching-releaser.provider.ts`, exported; D-03)
  and call it in `DeleteAccount` after its checks and before marking the account deleted (D-04), with a fake in the
  module's test mocks and cases in `test/user/usecase/delete-account.usecase.test.ts`.
  Covers: ER-04 · Done when: `npx jest test/user/usecase/delete-account.usecase.test.ts` passes from `modules/auth`
  and `npm run check-types --workspace @rochas-surf-school/auth` passes.
  > ✅ 2026-10-18 — added the `TeachingReleaser` port (`releaseUpcomingClasses(userId)`); `DeleteAccount` takes it as
  > its third constructor argument (after the clock) and awaits it after the unknown / not-approved checks and before
  > the update, so a throwing releaser propagates and leaves the account approved. `FakeTeachingReleaser` records
  > the ids and fails with `failWith`. Tests: release for each role while the account is still approved, a failed
  > release keeping it approved with no `deletedAt`, and nothing released for an unknown or non-approved account
  > (with their keys); written first, 4 failed before the change. files:
  > `modules/auth/src/user/provider/teaching-releaser.provider.ts`, `modules/auth/src/user/provider/index.ts`,
  > `modules/auth/src/user/usecase/delete-account.usecase.ts`, `modules/auth/test/mock/fake-teaching-releaser.provider.ts`,
  > `modules/auth/test/mock/index.ts`, `modules/auth/test/user/usecase/delete-account.usecase.test.ts`; verified:
  > `npx jest test/user/usecase/delete-account.usecase.test.ts --coverage` (10 passed, use case 100%) and
  > `npm run check-types --workspace @rochas-surf-school/auth` (no errors); deviations: none

### Backend (`apps/backend`)

- [x] **T-06** — Implement `findUpcomingTaughtBy` and `removeInstructor` (D-12) in
  `src/modules/classes/school-class.prisma.ts`, with cases in `school-class.prisma.spec.ts`.
  Skill: [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-01 · Done when: `npx vitest run src/modules/classes/school-class.prisma.spec.ts` passes from
  `apps/backend`.
  > ✅ 2026-10-18 — added the two methods to the existing `PrismaSchoolClassRepository` (already registered, so the
  > skill's wiring steps had nothing to do): `findUpcomingTaughtBy` is one `findMany` (`instructors: { some: {
  > userId } }`, `startsAt > now`, `cancelledAt: null`, ordered by `startsAt`, `id`, with the instructors);
  > `removeInstructor` returns early for an empty list, else one `$transaction` running
  > `classInstructor.deleteMany({ userId, classId: { in } })`. Spec cases written first (4 failed): the query, the
  > deletion in one transaction, nothing for no class, a failure propagating. files:
  > `apps/backend/src/modules/classes/school-class.prisma.ts`,
  > `apps/backend/src/modules/classes/school-class.prisma.spec.ts`; verified:
  > `npx vitest run src/modules/classes/school-class.prisma.spec.ts --coverage` (16 passed; 100% statements, lines,
  > functions; the one uncovered branch is the class decorator's metadata on line 13, skipped by the coverage
  > policy); deviations: none. The backend type check still fails on `push-messages.ts` and `auth.controller.ts`
  > until T-07 and T-08.

- [x] **T-07** — Add the D-06 catalog entry for `class.noInstructor` to `src/modules/notifications/push-messages.ts`
  and `NotificationsNoInstructorNotifier` (`src/modules/notifications/notifications.no-instructor-notifier.ts`, D-05),
  provided and exported by `notifications.module.ts`, with cases in `push-messages.spec.ts` and the adapter's spec.
  Skill: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-03, ER-05 · Done when: `npx vitest run src/modules/notifications/push-messages.spec.ts src/modules/notifications/notifications.no-instructor-notifier.spec.ts`
  passes from `apps/backend`.
  > ✅ 2026-10-18 — `push-messages.ts`: a catalog entry's `title` may now be a function of the params (the
  > no-instructor title depends on the count), resolved in `renderPush`; `class.noInstructor` has the D-06 copy in
  > pt-BR / es / en for one and many classes (a missing count is one, as `class.assigned`). The adapter
  > `NotificationsNoInstructorNotifier` (following the skill: `@Injectable()` concrete class, injected directly, the
  > contract only) runs `NotifyClassesWithoutInstructor` with `PrismaRecipientsProvider` and a `Notify`, logging and
  > swallowing every error; provided and exported by `NotificationsModule`. Specs written first (5 failed): copy in
  > each locale for 1 and 3 classes, the missing count, the stored notifications for the admins minus the excluded
  > one, store failure and a non-`Error` thrown value logged and swallowed. files:
  > `apps/backend/src/modules/notifications/push-messages.ts`,
  > `apps/backend/src/modules/notifications/push-messages.spec.ts`,
  > `apps/backend/src/modules/notifications/notifications.no-instructor-notifier.ts`,
  > `apps/backend/src/modules/notifications/notifications.no-instructor-notifier.spec.ts`,
  > `apps/backend/src/modules/notifications/notifications.module.ts`; verified: the `Done when` command with
  > `--coverage` (39 passed; both files: no uncovered statement, branch or function); deviations: the skill's
  > default places an adapter in the port's module (`classes`), but D-05 puts it in `notifications`, like the other
  > class notifiers. The push `data` (`{ type, notificationId, classId }`) comes from `ExpoPushProvider`'s existing
  > `classId` rule; T-08's e2e test checks it.

- [x] **T-08** — Add `ClassesTeachingReleaser` (`src/modules/classes/classes.teaching-releaser.ts`, D-03) running
  `ReleaseUpcomingClasses` with the repository, the no-instructor notifier and the clock, provided and exported by
  `classes.module.ts`; import `ClassesModule` in `auth.module.ts` and pass the releaser to `DeleteAccount` in
  `auth.controller.ts`; add its spec, a case to `auth.controller.spec.ts`, and the e2e tests of ER-01 and ER-03 to
  `test/auth-profile.e2e-spec.ts` (named as their `Verify by`).
  Skill: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-01, ER-03 · Done when: `npx vitest run src/modules/classes/classes.teaching-releaser.spec.ts src/modules/auth/auth.controller.spec.ts`
  and `npm run test:e2e --workspace apps/backend -- test/auth-profile.e2e-spec.ts` pass.
  > ✅ 2026-10-18 — `ClassesTeachingReleaser` (following the skill: `@Injectable()` concrete class implementing auth's
  > `TeachingReleaser`, injected directly) runs `ReleaseUpcomingClasses` with `PrismaSchoolClassRepository`,
  > `NotificationsNoInstructorNotifier` and the classes module's `SystemClockProvider`, letting errors propagate;
  > `ClassesModule` provides and exports it, `AuthModule` imports `ClassesModule` (no cycle: classes imports only
  > `DbModule` and `NotificationsModule`), and `AuthController.deleteAccount` passes it to `DeleteAccount`. Specs
  > written first (2 failed): the releaser's spec (release + notify, a failed write propagating) and a controller
  > case (released while still approved, then deleted). A new e2e `describe('DELETE /auth/me')` (fake Expo, the
  > classes clock fixed at 2026-10-14 13:00Z) with three "releases" tests (ER-01: an instructor keeps only the
  > under-way, finished and cancelled classes and the co-taught class keeps its co-instructor; an admin who teaches
  > leaves a scheduled class with no instructor; a student changes no class) and one "notifies" test (ER-03: approved
  > admins A and B get `class.noInstructor` `{ count: 2, classId, discipline: "surf", startsAt }` for the earliest
  > class, the leaving admin and pending / denied / deleted / removed admins get nothing; one push to A's phone with
  > `classId` in its params and the pt-BR text). files: `apps/backend/src/modules/classes/classes.teaching-releaser.ts`,
  > `apps/backend/src/modules/classes/classes.teaching-releaser.spec.ts`,
  > `apps/backend/src/modules/classes/classes.module.ts`, `apps/backend/src/modules/auth/auth.module.ts`,
  > `apps/backend/src/modules/auth/auth.controller.ts`, `apps/backend/src/modules/auth/auth.controller.spec.ts`,
  > `apps/backend/test/auth-profile.e2e-spec.ts`; verified: the `Done when` vitest command with `--coverage` (40
  > passed; both files with no uncovered statement, branch or function), `npm run test:e2e -- test/auth-profile.e2e-spec.ts`
  > (22 passed), `-t "DELETE /auth/me releases"` (3 passed), `-t "DELETE /auth/me notifies"` (1 passed),
  > `npx tsc --noEmit` in `apps/backend` (no errors, after rebuilding the three modules); deviations: none.

### Mobile (`apps/mobile`)

- [x] **T-09** — Add `showFlags` and the "Sem instrutor" chip and footer to `ClassCard`
  (`src/modules/classes/components/class-card/`, D-08), pass `showFlags` from `ClassesWeekScreen` (new prop, set only
  in `src/app/(private)/admin/(tabs)/classes.tsx`), with the `classesWeek.noInstructor` copy in
  `src/i18n/messages/{pt-BR,es-ES,en-US}.ts` and cases named "no instructor" in the card's and the week screen's
  tests.
  Covers: ER-07 · Done when: `npx jest src/modules/classes/components/class-card src/modules/classes/screens/classes-week.screen.test.tsx`
  passes from `apps/mobile`.
  > ✅ 2026-10-18 — `ClassCard` takes `showFlags` (default `false`); its hook returns `withoutInstructor`
  > (`isWithoutInstructor(instructors, state)` with the state it already computes); with `showFlags`, a flagged class
  > shows the `warn` `Chip` "Sem instrutor" (`person-remove-outline`) in the right chip slot; the instructors footer is
  > now always drawn, with `classesWeek.noInstructor` in `text-ink-2` when the list is empty (it was hidden before).
  > `ClassesWeekScreen` takes `showFlags` and passes it to each card; only the admin's Aulas route sets it. Copy
  > `classesWeek.noInstructor` in the three locales. Tests written first (card: 3 failed; week screen: 1 failed): the
  > footer for every role, the chip with `showFlags`, no chip once started ("In progress") or cancelled, neither with
  > an instructor; the week screen with and without `showFlags`. The old "shows no footer without instructors" test
  > became the footer test, since D-08 replaces the empty footer. files:
  > `apps/mobile/src/modules/classes/components/class-card/class-card.component.tsx`,
  > `apps/mobile/src/modules/classes/components/class-card/class-card.hook.ts`,
  > `apps/mobile/src/modules/classes/components/class-card/class-card.types.ts`,
  > `apps/mobile/src/modules/classes/components/class-card/class-card.component.test.tsx`,
  > `apps/mobile/src/modules/classes/screens/classes-week.screen.tsx`,
  > `apps/mobile/src/modules/classes/screens/classes-week.screen.types.ts`,
  > `apps/mobile/src/modules/classes/screens/classes-week.screen.test.tsx`,
  > `apps/mobile/src/app/(private)/admin/(tabs)/classes.tsx`, `apps/mobile/src/i18n/messages/pt-BR.ts`,
  > `apps/mobile/src/i18n/messages/es-ES.ts`, `apps/mobile/src/i18n/messages/en-US.ts`; verified: the `Done when`
  > command with `--coverage` (45 passed; the card component and hook and the week screen 100%), `-t "no instructor"`
  > on each file, `npx tsc --noEmit` in `apps/mobile` (no errors); deviations: none

- [x] **T-10** — Add the admin's "Sem instrutor" banner (opening the editor) and "Sem instrutor atribuído" to
  `ClassDetailsScreen` (`src/modules/classes/screens/class-details.screen.tsx` and its hook, D-09), with the
  `classDetails.noInstructor` / `noInstructorAssigned` copy and cases named "no instructor" in
  `class-details.screen.test.tsx`.
  Covers: ER-08 · Done when: `npx jest src/modules/classes/screens/class-details.screen.test.tsx` passes from
  `apps/mobile`.
  > ✅ 2026-10-18 — the details' hook returns `showNoInstructor` (`canEdit` and `isWithoutInstructor(instructors,
  > state)`); the screen draws it first among the state banners: a `Pressable` row (role `button`, `min-h-11` = 44 pt)
  > on `bg-warn-tint` with `person-remove-outline` (`theme.ink`, as the `warn` chip draws its icon), the title and
  > description, opening `routes.admin.editClass(id)` (the hook's existing `edit`). The instructors section shows
  > `classDetails.noInstructorAssigned` (`text-ink-2`) when the list is empty, for every role. Copy
  > `classDetails.noInstructor.title` / `.description` and `classDetails.noInstructorAssigned` in the three locales.
  > Tests written first (4 failed): the admin's banner opening the editor plus "No instructor assigned"; no banner
  > for a student or an instructor; a started class with the started banner and "No instructor assigned"; nothing on
  > a class with an instructor. files: `apps/mobile/src/modules/classes/screens/class-details.screen.tsx`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.hook.ts`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`, `apps/mobile/src/i18n/messages/pt-BR.ts`,
  > `apps/mobile/src/i18n/messages/es-ES.ts`, `apps/mobile/src/i18n/messages/en-US.ts`; verified:
  > `npx jest src/modules/classes/screens/class-details.screen.test.tsx --coverage` (60 passed; screen and hook 100%),
  > `npx tsc --noEmit` in `apps/mobile` (no errors); deviations: none

- [ ] **T-11** — Handle `class.noInstructor` in `useNotificationResponse` (open the admin's class details) and
  `useNotificationReceived` (invalidate `["classes"]`) in `src/modules/notifications/hooks/` (D-10), with cases in
  their tests.
  Covers: ER-09 · Done when: `npx jest src/modules/notifications/hooks` passes from `apps/mobile`.

### Verification

- [ ] **T-12** — Run every command in the Verification Plan from the repo root and follow its user journey; all pass.
  Record the output summary as evidence.
  Covers: all · Done when: every automated command passes (`COVERAGE OK`, `E2E PASSED`) and the journey shows what it
  describes.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 035` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 035` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 035` — the backend e2e suite passes (Postgres up, migrations applied),
    including the `DELETE /auth/me` release and notification tests.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
  - `npx turbo run build --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/backend`
    — builds.
- User journeys (iOS simulator, local backend):
  - Class without an instructor: as an approved admin, create a class for tomorrow taught only by the instructor
    review account. Sign in as that instructor on the simulator and delete the account (Perfil → "Remover a conta").
    Sign in as the admin: the class's card on Aulas shows "Sem instrutor" (chip and footer); its details show the
    "Sem instrutor" banner and "Sem instrutor atribuído". Press the banner: "Editar aula" opens with no instructor
    selected and the button disabled; pick an instructor and save: back on the details, the banner is gone and the
    instructor is listed. Sign in as a student: the card shows only the footer text before the instructor is
    assigned (repeat the first step with another class to see it).

## Memory Impact

- `memory/product.md` — Current state: deleting an account takes the person off their classes that haven't started
  (started and finished classes keep them); a class left with nobody stays scheduled, shows "Sem instrutor" to admins
  (chip and banner, which opens the editor), and every approved admin is told once per deletion with the count and the
  next such class. Out of scope: drop "the 'Sem instrutor' flag" from the 030/032 lists and note that the deleted
  account's seats and pending requests come with enrolment, and demotion and removal with their specs (reusing the
  release).
- `memory/technical-context.md` — Classes: `ReleaseUpcomingClasses` (no actor), `SchoolClassRepository.findUpcomingTaughtBy`
  / `removeInstructor`, `isWithoutInstructor`, `ClassesTeachingReleaser` exported by `ClassesModule` and imported by
  `AuthModule`; mobile `ClassCard`'s and `ClassesWeekScreen`'s `showFlags`, the details' no-instructor banner.
  Push notifications: `NoInstructorNotifier` / `NotificationsNoInstructorNotifier`, `NotifyClassesWithoutInstructor`.
  Authentication: `DELETE /auth/me` releases the upcoming classes before marking the account deleted.
- `memory/modules/classes.md` — the release rules (upcoming and not cancelled only, one write, admins told once with
  the earliest class, not the person), the computed flag and who sees it; the spec history entry.
- `memory/modules/notifications.md` — the `class.noInstructor` type, its details, push text (one and many), the
  recipients (approved admins minus the person) and the tap; the spec history entry.
- `memory/modules/auth.md` — deleting an account releases its upcoming class assignments first, through the
  `TeachingReleaser` port; the spec history entry.

## Assumptions

- The flag can only come from an account deletion until the role-change and removal specs exist; an edit can never
  leave a class without an instructor (spec 032). Accepted by the user in planning spec 032.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
