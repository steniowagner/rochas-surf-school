---
id: "054"
slug: class-reminders
title: Class reminders 30 minutes before the start
status: in-progress
created: 2026-10-23
started: 2026-10-23
base_commit: f60fc4c51b2a9f2a061dd16a6be3638fbc24466b
fronts: [notifications, classes, backend, mobile]
depends_on: []
---

# 054 — Class reminders 30 minutes before the start

## Goal

About 30 minutes before a class starts, the students who hold a seat in it and its instructors get a push saying the
class starts soon, with its start time and its place, so nobody forgets a class they are in. Each start of a class is
reminded once; a cancelled class, or one that has already started, never is. Tapping the push opens the class.

## Context

- Product: [product.md](../../memory/product.md) — concepts: Class ("students and instructors get a reminder 30
  minutes before it starts (not when cancelled)"), Enrolment, Guest, Notification; decision "Pushes are the only
  notification channel"; times are America/Fortaleza.
- Requirements: [requirements.md → Reminders](../../../.docs/requirements.md#reminders) — 30 minutes before a class
  starts its students and instructors are notified; no reminder for a cancelled class.
- Technical: [technical-context.md](../../memory/technical-context.md) — External integrations → Push notifications
  (`Notify`, the per-module notifier ports and their adapters in `apps/backend/src/modules/notifications/`, the
  `renderPush` catalog in `push-messages.ts`, `data.classId` copied from the params), Scheduled work (one job per kind
  of timed event, every minute, idempotent by what it records, never throws, logs only counts; already lists
  "30-minute reminders"), Automated validation (backend e2e with faked `ExpoPushProvider` and fixed clocks).
- Existing code this builds on:
  - `apps/backend/src/modules/enrolment/enrolment-expiry.job.ts` and
    `modules/enrolment/src/enrolment/usecase/expire-pending-enrolments.usecase.ts` — the pattern to mirror: find the
    due rows, write each conditionally, notify only for a row that changed, swallow notifier errors.
  - `modules/classes/src/school-class/provider/school-class.repository.ts` — `update(schoolClass, clearDeadline)`
    already clears the deadline in the same write as an edit; `apps/backend/src/modules/classes/school-class.prisma.ts`
    implements it.
  - `modules/classes/src/school-class/usecase/edit-class.usecase.ts` — computes `startsAt` and compares it with the
    stored one.
  - `modules/classes/src/school-class/provider/class-roster-reader.provider.ts` — `findRosters(classIds)` gives the
    approved students of each class (`PrismaClassRosterReader`, exported by `EnrolmentModule`).
  - `modules/classes/src/location/provider/location.repository.ts` — `findById` gives the location's name.
  - `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.ts` — routes push taps per flow; an
    unknown type falls back to `router.replace(routes.home)`.

## Scope

### In scope

- A nullable `reminder_sent_at` column on `classes` (migration), carried by the `SchoolClass` entity.
- The `SendClassReminders` use case and the `ClassReminderNotifier` port in `modules/classes`.
- The `class.reminder` notification type, its adapter and its push text in pt-BR, es and en.
- `ClassReminderJob`, every minute, in the backend's classes module.
- Clearing the reminder mark when an edit moves the class's start.
- Opening the class's details when a `class.reminder` push is tapped, in the student, instructor and admin flows.

### Out of scope

- The notifications screen (spec 020 stores notifications; no screen shows them yet).
- The "Começa em 30 min" chip of `design-system.html` (an "A começar" card state, out of scope since spec 040).
- Choosing the lead time, or turning reminders off per person or per type (only the phone's push switch applies).
- Reminders to pending or waiting-list requests, and to guests.
- The prompt to rate a class after it ends (ratings are deferred to a future version).
- Retrying a reminder whose push failed.
- Reminding people who join a class (approved, enrolled, assigned) after its reminder was sent.
- Running more than one backend instance (the jobs assume one).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | Recipients: the students with an **approved** enrolment in the class and **every instructor** of the class (instructors and admins who teach it), each person once. Pending requests (waiting list included) and guests are never reminded. | Spec 047 separates "its students" from "the people with pending enrolments"; a pending request expires at the start, so reminding it would mislead. Guests get nothing from the app (product decision). |
| D-02 | Window: a class is due when `startsAt − 30 min ≤ now < startsAt`, it isn't cancelled and its reminder wasn't sent. The first run inside the window sends it, so a class created or moved into the window, or a backend back from downtime, is reminded at the next run. Once the class has started, no reminder is ever sent. The lead time is the constant `CLASS_REMINDER_LEAD_MINUTES = 30` in `modules/classes`. | Matches the scheduled-work convention (a late tick still acts, never twice). The copy carries the start time, so a late reminder is still true. |
| D-03 | Idempotency: the class is marked with a conditional write (`reminder_sent_at` null and `cancelled_at` null → set to now); only the run whose write changed the row notifies. A failed push is not retried. | Same pattern as `EnrolmentExpiryJob`: two runs at once, or a restart, never send twice. |
| D-04 | An edit that changes `startsAt` clears `reminder_sent_at` **in the same write** as the edit (an option of `SchoolClassRepository.update`, next to the deadline clearing); any other edit leaves it untouched. People added after the reminder was sent get none. | Writing the stored value back from the edit could undo a mark the job set meanwhile and resend. A student approved or an instructor assigned inside the window was just told by "Pedido aprovado" / "Você foi inscrito" / "Novas aulas na sua escala". |
| D-05 | Push type `class.reminder`, params `{ classId, discipline, startsAt, locationName }` (`startsAt` as ISO text, `locationName` read when the reminder is sent). Text, the same for every role, with the time formatted in Fortaleza like the other class pushes and no day: pt-BR "Sua aula começa em breve" / "A aula de Surf começa às 08:00 · Praia do Futuro."; es "Tu clase empieza pronto" / "La clase de Surf empieza a las 08:00 · Praia do Futuro."; en "Your class starts soon" / "The Surf class starts at 08:00 · Praia do Futuro." | A class at 00:10 is reminded the evening before, so "hoje" / a weekday would be wrong; the start time and the place are what someone needs at that moment. |
| D-06 | Ownership: `SendClassReminders` in `modules/classes` (`school-class/usecase/`), reading due classes through `SchoolClassRepository` (`findDueForReminder(now, leadMinutes)`, `markReminded(id, at)`), approved students through the existing `ClassRosterReader`, the location name through `LocationRepository.findById`, and telling people through a new `ClassReminderNotifier` port (`classReminder({ recipientIds, classId, discipline, startsAt, locationName })`), implemented by `NotificationsClassReminderNotifier` (logs and swallows every error). The job is `ClassReminderJob` in `apps/backend/src/modules/classes/` (cron name `class-reminder`, `EVERY_MINUTE`, `waitForCompletion`), logging only the count of classes reminded. | The reminder is about the class; it reuses the roster port the class views already use and mirrors the existing notifier ports and jobs. |
| D-07 | Mobile: a `class.reminder` tap with a string `classId` opens `routes.student.classDetail(classId)`, `routes.instructor.classDetail(classId)` or `routes.admin.classDetail(classId)` by the resolved flow; without a class id it falls back to `routes.home`. Received with the app open, it shows the usual banner and invalidates no query. A class that no longer exists shows the details' existing "Esta aula não existe mais." state. | Every other push about one class opens it; a reminder changes nothing on screen, so nothing reloads. |

## Expected Results

### ER-01 — Seat holders and instructors are reminded 30 minutes before

- **Front:** backend
- **Behavior:** Given a class starting at 08:00 (Fortaleza) with an approved student S1, a pending request by S2, a
  guest, an instructor I1 and an admin A1 who teaches it, when the reminder job runs at 07:30, then S1, I1 and A1
  each have exactly one stored `class.reminder` notification with params `{ classId, discipline, startsAt,
  locationName }`, and S2 has none.
- **Edge and error cases:** a run at 07:29 stores nothing for the class; a class created at 07:45 to start at 08:00
  is reminded by the next run (07:46); a person who turned pushes off still gets the stored notification; a student
  whose enrolment was withdrawn, denied, cancelled or taken out is not reminded.
- **Verify by:** `npx jest test/school-class/usecase/send-class-reminders.usecase.test.ts` (from `modules/classes`)
  and the "reminds seats and instructors" cases of `apps/backend/test/class-reminders.e2e-spec.ts`
  (`npm run test:e2e --workspace apps/backend`).

### ER-02 — A class start is reminded only once

- **Front:** backend
- **Behavior:** Given a class already reminded at 07:30, when the job runs again at 07:31 and at 07:45, then no
  further `class.reminder` is stored for it.
- **Edge and error cases:** two runs at the same moment store one reminder per person; a push that fails (the fake
  provider throws) leaves the class marked, stores the notifications, doesn't make the job throw, and the next run
  sends nothing again.
- **Verify by:** `npx jest test/school-class/usecase/send-class-reminders.usecase.test.ts` (from `modules/classes`),
  `npx vitest run src/modules/classes/class-reminder.job.spec.ts` (from `apps/backend`) and the "only once" cases of
  `apps/backend/test/class-reminders.e2e-spec.ts`.

### ER-03 — Cancelled and started classes are never reminded

- **Front:** backend
- **Behavior:** Given a class starting at 08:00 that an admin cancelled, when the job runs at 07:30, then no
  `class.reminder` is stored for it.
- **Edge and error cases:** a class whose start is 08:00 and was never reminded (the job didn't run between 07:30 and
  08:00) gets nothing from a run at 08:00 or later; a class cancelled after its reminder was sent gets no second one.
- **Verify by:** `npx jest test/school-class/usecase/send-class-reminders.usecase.test.ts` (from `modules/classes`)
  and the "cancelled and started" cases of `apps/backend/test/class-reminders.e2e-spec.ts`.

### ER-04 — Moving the start re-arms the reminder

- **Front:** backend
- **Behavior:** Given a class reminded at 07:30 for an 08:00 start, when an admin edits its start to 10:00 with
  `PUT /classes/:id`, then a run at 09:29 sends nothing and a run at 09:30 stores a second `class.reminder` for each of
  its people, whose `startsAt` is the 10:00 start.
- **Edge and error cases:** an edit that keeps the start (notes, capacity, instructors only) leaves the class marked,
  and no second reminder is sent; a start moved earlier into the window (e.g. to 07:50 at 07:35) is reminded by the
  next run.
- **Verify by:** `npx jest test/school-class/usecase/edit-class.usecase.test.ts` (from `modules/classes`),
  `npx vitest run src/modules/classes/school-class.prisma.spec.ts` (from `apps/backend`) and the "start moved" cases
  of `apps/backend/test/class-reminders.e2e-spec.ts`.

### ER-05 — The reminder's push text in each language

- **Front:** backend
- **Behavior:** Given a `class.reminder` with discipline `surf`, a start at 08:00 Fortaleza and location "Praia do
  Futuro", when it is rendered, then pt-BR reads "Sua aula começa em breve" / "A aula de Surf começa às 08:00 · Praia
  do Futuro.", es reads "Tu clase empieza pronto" / "La clase de Surf empieza a las 08:00 · Praia do Futuro." and en
  reads "Your class starts soon" / "The Surf class starts at 08:00 · Praia do Futuro.".
- **Edge and error cases:** a `skate` class reads "Skate"; the time is in Fortaleza whatever the machine's time zone;
  the push's `data` carries the `classId`.
- **Verify by:** `npx vitest run src/modules/notifications/push-messages.spec.ts src/modules/notifications/notifications.class-reminder-notifier.spec.ts`
  (from `apps/backend`).

### ER-06 — Tapping a reminder opens the class

- **Front:** mobile
- **Behavior:** Given a `class.reminder` push with a `classId`, when a student taps it, then the app opens
  `/student/class/<classId>`; for an instructor, the instructor's class details; for an admin, the admin's class
  details.
- **Edge and error cases:** a `class.reminder` without a `classId` falls back to the home route; received with the
  app open, it invalidates no query.
- **Verify by:** `npx jest src/modules/notifications/hooks` (from `apps/mobile`); on the iOS simulator, once pushes
  can reach a device, tapping a reminder opens the class.

## Tasks

### Notifications module (`modules/notifications`)

- [x] **T-01** — Add `"class.reminder"` to `NOTIFICATION_TYPES` in
  `modules/notifications/src/notification/model/notification.entity.ts`, with the test in
  `modules/notifications/test/notification/model/notification.entity.test.ts`. The backend's catalog entry follows in
  T-05. Covers: enabling · Done when: `npx jest` passes from `modules/notifications`.
  > ✅ 2026-10-23 12:45 — added `"class.reminder"` to `NOTIFICATION_TYPES` and a test that a `class.reminder` with `{
  > classId, discipline, startsAt, locationName }` validates; files:
  > `modules/notifications/src/notification/model/notification.entity.ts`,
  > `modules/notifications/test/notification/model/notification.entity.test.ts`; verified: `npx jest` from
  > `modules/notifications` (12 suites, 119 passed); deviations: none (the backend type check fails until T-05 adds
  > the catalog entry, as the task says)

### Classes module (`modules/classes`)

- [x] **T-02** — Add `reminderSentAt` (nullable date, cloned like `cancelledAt`) to `SchoolClass` in
  `modules/classes/src/school-class/model/school-class.entity.ts`; change `SchoolClassRepository.update` to take
  options (`{ clearDeadline, clearReminder }`) in
  `modules/classes/src/school-class/provider/school-class.repository.ts`; make `EditClass` pass `clearReminder: true`
  only when `startsAt` changed (D-04); update `modules/classes/test/mock/fake-school-class.repository.ts` and the
  entity and `edit-class.usecase.test.ts` tests. Skill: [`module-entity`](../../../.claude/skills/module-entity).
  Covers: ER-04 · Done when: `npx jest` passes from `modules/classes`.
  > ✅ 2026-10-23 12:47 — added `reminderSentAt` (nullable, copied in the constructor like `cancelledAt`, with its
  > getter) to `SchoolClass`; `SchoolClassRepository.update(schoolClass, options)` now takes
  > `SchoolClassUpdateOptions` (`{ clearDeadline?, clearReminder? }`) and documents that the stored mark is never
  > written from the entity; `EditClass` passes `clearDeadline: classChanged` and `clearReminder` only when
  > `startsAt` changed (D-04); the fake repository records `clearReminderCalls`, keeps the stored mark unless told
  > to clear it, and the tests that called `update(…, true/false)` pass the options; files:
  > `modules/classes/src/school-class/model/school-class.entity.ts`,
  > `modules/classes/src/school-class/provider/school-class.repository.ts`,
  > `modules/classes/src/school-class/usecase/edit-class.usecase.ts`,
  > `modules/classes/test/mock/fake-school-class.repository.ts`,
  > `modules/classes/test/school-class/model/school-class.entity.test.ts`,
  > `modules/classes/test/school-class/usecase/edit-class.usecase.test.ts`,
  > `modules/classes/test/school-class/provider/fake-school-class.repository.test.ts`,
  > `modules/classes/test/school-class/usecase/work-out-cancellation-deadlines.usecase.test.ts`; verified: `npx
  > jest` from `modules/classes` (35 suites, 534 passed; entity and `edit-class.usecase.ts` at 100%), `tsc --noEmit`
  > and `oxlint` clean; deviations: the `module-entity` skill was used for the field and its tests only (the
  > repository and use-case changes are by hand); `PrismaSchoolClassRepository.update` follows the new signature in
  > T-04

- [x] **T-03** — Add `CLASS_REMINDER_LEAD_MINUTES`, `findDueForReminder(now, leadMinutes)` and
  `markReminded(id, at)` to `SchoolClassRepository`, the `ClassReminderNotifier` port
  (`modules/classes/src/school-class/provider/class-reminder-notifier.provider.ts`) and the `SendClassReminders`
  use case (`modules/classes/src/school-class/usecase/send-class-reminders.usecase.ts`, output `{ reminded }`) by
  D-01 to D-03 and D-06, exported from the package; add the fakes in `modules/classes/test/mock/` and
  `modules/classes/test/school-class/usecase/send-class-reminders.usecase.test.ts`. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03 · Done when: `npx jest` passes from `modules/classes`.
  > ✅ 2026-10-23 12:49 — added `CLASS_REMINDER_LEAD_MINUTES = 30` (in `class-limits.ts`), `findDueForReminder(now,
  > leadMinutes)` and the conditional `markReminded(id, at)` to `SchoolClassRepository`, the `ClassReminderNotifier`
  > port (`classReminder({ recipientIds, classId, discipline, startsAt, locationName })`) and `SendClassReminders`
  > (output `{ reminded }`): due classes are read once, their rosters in one read and each location once; a class is
  > notified only when its mark was written (D-03), to its approved students plus its instructors, each once (D-01);
  > guests are ignored; a notifier error is swallowed; a class whose location can't be found stays due and unmarked
  > (as `WorkOutCancellationDeadlines` does); exported through the barrels; fakes `FakeClassReminderNotifier` and
  > the two new `FakeSchoolClassRepository` methods, with their tests; files:
  > `modules/classes/src/school-class/model/class-limits.ts`,
  > `modules/classes/src/school-class/provider/school-class.repository.ts`,
  > `modules/classes/src/school-class/provider/class-reminder-notifier.provider.ts`,
  > `modules/classes/src/school-class/provider/index.ts`,
  > `modules/classes/src/school-class/usecase/send-class-reminders.usecase.ts`,
  > `modules/classes/src/school-class/usecase/index.ts`,
  > `modules/classes/test/mock/fake-class-reminder.notifier.ts`,
  > `modules/classes/test/mock/fake-school-class.repository.ts`, `modules/classes/test/mock/index.ts`,
  > `modules/classes/test/school-class/usecase/send-class-reminders.usecase.test.ts`,
  > `modules/classes/test/school-class/provider/fake-class-reminder.notifier.test.ts`,
  > `modules/classes/test/school-class/provider/fake-school-class.repository.test.ts`; verified: `npx jest` from
  > `modules/classes` (37 suites, 554 passed; `send-class-reminders.usecase.ts` 100%
  > statements/branches/functions/lines), `tsc --noEmit` and `oxlint` clean; deviations: none

### Backend (`apps/backend`)

- [ ] **T-04** — Add `reminderSentAt DateTime? @map("reminder_sent_at")` to `SchoolClass` in
  `apps/backend/prisma/models/classes.model.prisma` with the migration
  `apps/backend/prisma/migrations/<timestamp>_classes_add_reminder_sent_at/`, and implement in
  `apps/backend/src/modules/classes/school-class.prisma.ts` the mapping, `findDueForReminder`, the conditional
  `markReminded` and the `clearReminder` option of `update` (same write as the edit), with
  `school-class.prisma.spec.ts`. Skill: [`backend-prisma-sync-module`](../../../.claude/skills/backend-prisma-sync-module).
  Covers: ER-01, ER-02, ER-03, ER-04 · Done when: the migration applies (`npm run prisma:migrate:deploy --workspace
  apps/backend`) and `npx vitest run src/modules/classes/school-class.prisma.spec.ts` passes.

- [ ] **T-05** — Add `NotificationsClassReminderNotifier`
  (`apps/backend/src/modules/notifications/notifications.class-reminder-notifier.ts`, runs `Notify` with
  `class.reminder`, logs and swallows every error) exported by `NotificationsModule`, and the `class.reminder` entry
  in the three locales of `push-messages.ts` (D-05), with `notifications.class-reminder-notifier.spec.ts` and
  `push-messages.spec.ts`. Skill: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-05 · Done when: `npx vitest run src/modules/notifications` passes and the backend's `check-types` exits 0.

- [ ] **T-06** — Add `ClassReminderJob` (`apps/backend/src/modules/classes/class-reminder.job.ts`, D-06: runs
  `SendClassReminders` with `PrismaSchoolClassRepository`, `PrismaClassRosterReader`, `PrismaLocationRepository`, the
  notifier and the classes clock; catches and logs every error, logs only the count) registered in `ClassesModule`,
  with `class-reminder.job.spec.ts`. Covers: ER-01, ER-02 · Done when:
  `npx vitest run src/modules/classes/class-reminder.job.spec.ts` passes.

- [ ] **T-07** — Add `apps/backend/test/class-reminders.e2e-spec.ts` (fixed classes clock, faked `ExpoPushProvider`,
  the job run through `app.get(ClassReminderJob).run()`, each test deleting the classes, locations and users it
  created) with the cases of ER-01 to ER-04: "reminds seats and instructors", "only once" (including a failing push),
  "cancelled and started", and "start moved" (through `PUT /classes/:id`).
  Covers: ER-01, ER-02, ER-03, ER-04 · Done when: `npm run test:e2e --workspace apps/backend` passes.

### Mobile (`apps/mobile`)

- [ ] **T-08** — Route `class.reminder` taps in
  `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.ts` by D-07, with tests in
  `use-notification-response.hook.test.tsx` (three flows and the missing class id) and a test in
  `use-notification-received.hook.test.tsx` that a received `class.reminder` invalidates nothing. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-06 · Done when: `npx jest src/modules/notifications/hooks` passes from `apps/mobile`.

### Verification

- [ ] **T-09** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every automated command exits 0 and the user journey is recorded
  (or recorded as not drivable while pushes can't reach a device, with the stored notification as evidence).

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 054` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 054` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
  - `node .specs/scripts/run-e2e.mjs 054` — the backend e2e suite passes, including
    `apps/backend/test/class-reminders.e2e-spec.ts`.
- User journeys (e2e, followed in a simulator):
  - On the iOS simulator signed in as a student with an approved seat in a class starting within 30 minutes (the
    backend running): within a minute the `notifications` table holds a `class.reminder` row for the student (and
    the push arrives once the EAS project and APNs credentials exist); tapping the push opens the class's details.

## Memory Impact

- `memory/product.md` — Current state: classes remind their seat holders and instructors 30 minutes before the start
  (once per start, re-armed when the start moves, never for cancelled or started classes); remove "reminders before a
  class" from the Out of scope line of specs 041–045.
- `memory/technical-context.md` — Scheduled work: `ClassReminderJob` (cron `class-reminder`) and its idempotency by
  `reminder_sent_at`; Push notifications: the `ClassReminderNotifier` port and `class.reminder` (`{ classId,
  discipline, startsAt, locationName }`); Applications (mobile): the `class.reminder` tap routes.
- `memory/structure.md` — `class-reminder.job.ts`, `notifications.class-reminder-notifier.ts`,
  `send-class-reminders.usecase.ts`, the `reminder_sent_at` migration and `class-reminders.e2e-spec.ts`.
- `memory/modules.md` — None.
- `memory/modules/classes.md` — the reminder rule (recipients, window, once per start, cleared by a start change).
- `memory/modules/notifications.md` — the `class.reminder` type.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
