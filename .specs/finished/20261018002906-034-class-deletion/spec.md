---
id: "034"
slug: class-deletion
title: "Deleting a class"
status: finished
created: 2026-10-17
started: 2026-10-17
base_commit: 7ee63d036b5044adb89d4174ff5e664453ed4c7c
reviewed_commit: 6692227422e3ff64db387c5d91b22ca45425198e
fronts: [classes, notifications, backend, mobile]
depends_on: []
finished: 2026-10-18
---

# 034 — Deleting a class

## Goal

An approved admin deletes a class created by mistake, after a confirmation step. Deleting is only for mistakes: it
is allowed only before the class starts, never for a cancelled class, and only when nobody holds a seat or has a
pending request in it — otherwise the class gets cancelled instead (spec 033). The class leaves the schedule for
good, and its instructors are told, never the admin who deletes. This is the third of the four class-management
specs (032 editing, 033 cancelling, 035 the "no instructor" flag).

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: Class (`not started`: "deleted only when
  nobody has an enrolment or a guest in it (instructors are notified)"; `cancelled`: final), Seat, Enrolment
  (`pending`), the decision "Admin decisions are final in the app".
- Requirements: [requirements.md → Deleting a class](../../../.docs/requirements.md#deleting-a-class) — admins
  delete a class after a confirmation step, only if it hasn't started, has no pending requests and has nobody
  enrolled; its instructors are notified; a class with a pending request is cancelled instead.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Classes (`EditClass`,
  `CancelClass`, `SchoolClassRepository` with its conditional writes on `cancelled_at`, `SeatCounter` /
  `NoEnrolmentSeatCounter`, the mobile class tools and cancel sheet), External integrations → Push notifications
  (`ClassChangeNotifier`, the hand-formatted Fortaleza date), Fixed conventions (Mobile shared UI, Mobile routes),
  Automated validation. Module rules: [modules/classes.md](../../memory/modules/classes.md),
  [modules/notifications.md](../../memory/modules/notifications.md).
- Designs: `.docs/designs/admin-app.html` — the `apagarAula` sheet ("Apagar esta aula?" and its "Não dá para apagar"
  variant with "Cancelar aula"). The file is a bundle: its sources unpack from the `__bundler/manifest` script (gzip
  + base64). Its copy is European Portuguese and its entry point is the editor; spec 033 moved the class's actions to
  the details' tools sheet, so deleting goes there (D-09), and the copy is adapted (D-13).
- Existing code this builds on:
  - `modules/classes/src/school-class/usecase/cancel-class.usecase.ts` — `CancelClass`: the order of checks, the
    conditional write, the notification without the actor; `edit-class.usecase.ts` — `EditClass`.
  - `modules/classes/src/school-class/provider/` — `SchoolClassRepository` (`findById`, `update`, `cancel`),
    `SeatCounter`, `ClassChangeNotifier` (`classEdited`, `classCancelled`); fakes in `modules/classes/test/mock/`.
  - `modules/classes/src/school-class/model/class-state.ts` — `getClassState` with `cancelledAt`.
  - `modules/notifications/src/notification/model/notification.entity.ts` — `NOTIFICATION_TYPES`.
  - `apps/backend/src/modules/classes/` — `ClassesController`, `PrismaSchoolClassRepository`,
    `NoEnrolmentSeatCounter` (`no-enrolment.seat-counter.ts`), `classes.module.ts`; `apps/backend/test/classes.e2e-spec.ts`.
  - `apps/backend/src/modules/notifications/` — `push-messages.ts`, `notifications.class-change-notifier.ts`.
  - `apps/mobile/src/modules/classes/` — `ClassDetailsScreen` and its hook (the tools button, `ClassToolsSheet`,
    `CancelClassSheet`, `useCancelClass`), `components/class-tools-sheet/`, `components/cancel-class-sheet/`,
    `utils/class-error.ts`.
  - `apps/mobile/src/modules/notifications/hooks/` — `useNotificationResponse` (the `class.assigned` case opens the
    Aulas tab), `useNotificationReceived`.
  - `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts` (`classTools`, `cancelClass`).

## Scope

### In scope

- `DELETE /classes/:id` for approved admins, with the started, cancelled and not-empty refusals.
- A pending-request count port next to `SeatCounter`, answering 0 until enrolment exists.
- The `class.deleted` notification type and its push text in pt-BR, es and en.
- In the app: "Excluir aula" in the class tools sheet, the confirmation sheet and its "Não dá para excluir" variant
  (offering "Cancelar aula"), what happens after a deletion, and the `class.deleted` push.

### Out of scope

- **The "no instructor" flag — spec 035.**
- Counting real seats and pending requests (enrolment replaces both `NoEnrolment…` implementations), and guests.
- Deleting several classes at once, or a batch.
- Restoring a deleted class, and keeping any record of it: it leaves the database with its instructor rows.
- Deleting or rewriting the notifications already sent about the class (`class.assigned`, `class.edited`, …): they
  stay; tapping one whose class is gone opens the details' existing "Esta aula não existe mais." state.
- Showing the seat and pending-request counts in the confirmation sheet: the app doesn't know them yet.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | `DELETE /classes/:id` (protected, no body) answers 204 with no content. | Nothing is left to return. |
| D-02 | Use case `DeleteClass` (`modules/classes/src/school-class/usecase/delete-class.usecase.ts`). Order of checks: access (`assertCanManageClasses`: 403 `user.status.notApproved`, then `user.role.notAdmin`); the id (not a UUID, or no class → 404 `class.notFound`, no lookup for a non-UUID); 409 `class.cancelled` (cancelled, whatever the clock); 409 `class.started` (now ≥ `startsAt`, so a finished class too); 409 `class.delete.notEmpty` with `details: { seatsTaken, pendingRequests }` when either count is above 0. | Cancelled first because it is final; one key for "started or finished" since both mean "too late"; the details let a later screen say who is in the class. |
| D-03 | A new port `PendingRequestCounter` (`provider/pending-request-counter.provider.ts`, `countPendingRequests(classId): Promise<number>`), implemented in the backend by `NoEnrolmentPendingRequestCounter` (`apps/backend/src/modules/classes/no-enrolment.pending-request-counter.ts`), which answers 0. Seats taken come from the existing `SeatCounter`. The enrolment spec replaces both implementations. | The rule belongs here and is unit-tested with fakes; through the API it can't refuse until enrolment exists, like spec 032's capacity rule. |
| D-04 | `SchoolClassRepository.delete(id, now): Promise<boolean>` deletes the class only while it isn't cancelled and starts after `now` (`PrismaSchoolClassRepository`: one `deleteMany` with `where: { id, cancelledAt: null, startsAt: { gt: now } }`, the `class_instructors` rows going with it by their `ON DELETE CASCADE`) and answers whether it deleted it. On `false`, `DeleteClass` reads the class again: gone → 404 `class.notFound`; cancelled → 409 `class.cancelled`; else → 409 `class.started`. | A cancel or a second delete racing this one can't be overtaken: the checks sit on the write, as in spec 033. |
| D-05 | Notifications: after the class is deleted, its instructors except the admin who deletes get `class.deleted` `{ discipline, startsAt }` (the class's values read before deleting, `startsAt` ISO UTC), through `ClassChangeNotifier.classDeleted({ instructorIds, discipline, startsAt })`, implemented by `NotificationsClassChangeNotifier.classDeleted` running `Notify` and logging and swallowing every error. No instructor left → nothing sent. A notifier that throws is swallowed in the use case too; it never changes the answer. There is no `classId`: the class no longer exists. | The same rules as specs 032 and 033; a tap can't open a class that is gone. |
| D-06 | Push text (`push-messages.ts`), the start formatted as in spec 032 (Fortaleza, `dd/MM` and `HH:mm`; en `MM/dd`), `{discipline}` "Surf" / "Skate": title "Aula excluída" / "Clase eliminada" / "Class deleted"; body pt-BR "A aula de {discipline} de {dd/MM} às {HH:mm} foi excluída.", es "La clase de {discipline} del {dd/MM} a las {HH:mm} fue eliminada.", en "Your {discipline} class on {MM/dd} at {HH:mm} was deleted." The push `data` has no `classId` (spec 032's rule: only when the params carry one). | The push says which class was removed from the instructor's schedule. |
| D-07 | Mobile: `useDeleteClass(id)` (`hooks/use-delete-class.hook.ts`: `apiDelete` to `/classes/{id}`, no retry; on success it removes `["classes", "detail", id]` from the cache and invalidates `["classes", "week"]`); `getDeleteClassErrorKey` with `isClassStartedError` reused and `isClassNotEmptyError` (409 `class.delete.notEmpty`) in `utils/class-error.ts`. | The same pattern as `useCancelClass`; the details' cache entry would otherwise refetch into a 404. |
| D-08 | `DeleteClassSheet` (`components/delete-class-sheet/`: component, hook, types, index): a `BottomModal` with two variants. `confirm`: the title "Excluir esta aula?", the class line (`{discipline} {level} · {dateLine}, {timeRange} · {location}`, from the details' values), the description, a `danger` `Button` "Excluir aula" with `loading`, and a `ghost` `Button` "Manter aula" that closes it. `notEmpty`: the title "Não dá para excluir", the same class line, its description, a `danger` `Button` "Cancelar aula" (calling `onCancelInstead`) and the `ghost` "Manter aula". The sheet opens in `confirm`. | The design's `apagarAula` sheet and its variant; the button variants follow spec 033's `CancelClassSheet` (`danger` for the destructive action, `ghost` to keep the class, no icons). |
| D-09 | Entry point: `ClassToolsSheet` gains `onDelete` and `canDelete`; with `canDelete` it shows a `subtle` `Button` "Excluir aula" below "Cancelar aula" (the sheet closes first, then the delete sheet opens). The details pass `canDelete` only while the class hasn't started (`state === "not-started"`); the tools stay hidden on finished and cancelled classes, as in spec 033. | Spec 033 made the tools sheet the one entry point for a class's actions; a started class can only be cancelled. |
| D-10 | After a deletion (204): toast "Aula excluída", the delete sheet closes and `router.back()` leaves the details (to the screen that opened them, normally the classes tab, where the class is gone). A double press sends once. | The class no longer exists, so its details can't stay open. |
| D-11 | Delete errors on the details: 409 `class.delete.notEmpty` → no toast, the sheet switches to `notEmpty`; there "Cancelar aula" closes it and opens spec 033's `CancelClassSheet`. 409 `class.started` → toast `deleteClass.errors.started`, the sheet closes and the class is refetched (the tools then hide "Excluir aula"); 409 `class.cancelled` → toast `deleteClass.errors.cancelled`, the sheet closes and the class is refetched (the tools disappear); 404 `class.notFound` → toast `classDetails.notFound` and `router.back()`; `NetworkError` → no connection; `SessionExpiredError` → nothing; anything else → generic. The buttons are usable again after any failure. | The design sends a class with people to "cancel it instead"; the refetch brings the screen to the class's real state. |
| D-12 | Pushes in the app: tapping a `class.deleted` push refreshes the account, then opens `routes.instructor.classes` / `routes.admin.classes` when the account resolves to the `instructor` / `admin` flow, else `routes.home` (as `class.assigned`, spec 030); received with the app open, it invalidates `["classes"]`. | The class is gone; the schedule is where its absence shows. |
| D-13 | Copy (pt-BR / es-ES / en-US): `classTools.delete` "Excluir aula" / "Eliminar clase" / "Delete class"; `deleteClass.title` "Excluir esta aula?" / "¿Eliminar esta clase?" / "Delete this class?"; `deleteClass.description` "Os instrutores são avisados e a aula sai da agenda. Não dá para desfazer." / "Avisamos a los instructores y la clase sale de la agenda. No se puede deshacer." / "The instructors are notified and the class leaves the schedule. This can't be undone."; `deleteClass.confirm` "Excluir aula" / "Eliminar clase" / "Delete class"; "Manter aula" reuses `cancelClass.keep` and "Cancelar aula" `classTools.cancel`; `deleteClass.notEmpty.title` "Não dá para excluir" / "No se puede eliminar" / "Can't delete"; `deleteClass.notEmpty.description` "Alguém já pediu vaga ou está inscrito nesta aula. Só dá para excluir aulas sem ninguém — cancele-a em vez disso." / "Alguien ya pidió plaza o está inscrito en esta clase. Solo se pueden eliminar clases sin nadie: cancélala en su lugar." / "Someone has already asked for a seat or holds one in this class. Only classes with nobody can be deleted — cancel it instead."; `deleteClass.done` "Aula excluída" / "Clase eliminada" / "Class deleted"; `deleteClass.errors.started` "A aula já começou e não pode mais ser excluída." / "La clase ya empezó y no se puede eliminar." / "The class has started and can't be deleted."; `deleteClass.errors.cancelled` "Esta aula foi cancelada e não pode ser excluída." / "Esta clase fue cancelada y no se puede eliminar." / "This class was cancelled and can't be deleted." | The design's copy adapted to Brazilian Portuguese ("Apagar" → "Excluir"); the confirm text doesn't claim nobody is in the class, since the app can't know it before the backend answers. |

## Expected Results

### ER-01 — An admin deletes an empty class that hasn't started

- **Front:** backend
- **Behavior:** Given an approved admin and a class starting tomorrow, with nobody in it, when they call
  `DELETE /classes/:id`, then the API answers 204; `GET /classes/:id` answers 404 `class.notFound`, the class's week
  in `GET /classes?date=` no longer lists it, and its `class_instructors` rows are gone.
- **Edge and error cases:** the other classes of its batch are untouched; a class starting one minute after now is
  deleted.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts -t "DELETE /classes/:id deletes a class that hasn't started"`
  and `npx jest test/school-class/usecase/delete-class.usecase.test.ts -t "deletes"` from `modules/classes`.

### ER-02 — Started, finished and cancelled classes can't be deleted

- **Front:** backend
- **Behavior:** Given a class that has started (or finished), when an admin deletes it, then the API answers 409
  `class.started` and the class still exists; given a cancelled class, then 409 `class.cancelled`.
- **Edge and error cases:** a class whose start is exactly now answers `class.started`; a cancelled class that has
  started or finished answers `class.cancelled`.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts -t "DELETE /classes/:id refuses"`
  and `npx jest test/school-class/usecase/delete-class.usecase.test.ts -t "refuses"` from `modules/classes`.

### ER-03 — A class with seats or pending requests can't be deleted

- **Front:** classes
- **Behavior:** Given a class that hasn't started, with the `SeatCounter` fake answering 2 or the
  `PendingRequestCounter` fake answering 1, when an admin deletes it, then `DeleteClass` throws a 409 `DomainError`
  `class.delete.notEmpty` with `details: { seatsTaken, pendingRequests }` and the repository's `delete` isn't called.
- **Edge and error cases:** both counts at 0 delete the class; the API's `NoEnrolmentPendingRequestCounter` and
  `NoEnrolmentSeatCounter` answer 0 for any class.
- **Verify by:** `npx jest test/school-class/usecase/delete-class.usecase.test.ts -t "not empty"` from
  `modules/classes`; `npx vitest run src/modules/classes/no-enrolment.pending-request-counter.spec.ts` from
  `apps/backend`.

### ER-04 — Access, missing class and races are checked

- **Front:** backend
- **Behavior:** Given the endpoint, then: an instructor or student answers 403 `user.role.notAdmin`, a non-approved
  admin 403 `user.status.notApproved`, no token 401; an unknown or non-UUID id 404 `class.notFound`; when two deletes
  of the same class run at the same moment, exactly one answers 204 and the other 404 `class.notFound`. Nothing is
  deleted and nobody is notified on any refusal.
- **Edge and error cases:** when the repository's `delete` returns `false` because the class was cancelled after it
  was read, `DeleteClass` answers 409 `class.cancelled`; because it started meanwhile, 409 `class.started`.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts -t "DELETE /classes/:id checks"`,
  `npx jest test/school-class/usecase/delete-class.usecase.test.ts -t "race"` from `modules/classes`, and
  `npx vitest run src/modules/classes/school-class.prisma.spec.ts -t "delete"` from `apps/backend`.

### ER-05 — The instructors are told

- **Front:** classes
- **Behavior:** Given a class taught by A and the deleting admin E, when E deletes it, then A gets `class.deleted`
  `{ discipline, startsAt }` and E gets nothing.
- **Edge and error cases:** a class taught only by E notifies nobody; a notifier that throws doesn't change the 204
  answer, and the class stays deleted.
- **Verify by:** `npx jest test/school-class/usecase/delete-class.usecase.test.ts -t "notifies"` from
  `modules/classes`; `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts -t "DELETE /classes/:id notifies"`
  (stored notifications and the fake Expo messages).

### ER-06 — The deletion push says which class

- **Front:** backend
- **Behavior:** Given a `class.deleted` notification for a Surf class starting at 2026-10-18 11:00Z, when it is
  pushed, then the title is "Aula excluída" / "Clase eliminada" / "Class deleted" in the device's locale and the body
  pt-BR "A aula de Surf de 18/10 às 08:00 foi excluída." (es "La clase de Surf del 18/10 a las 08:00 fue eliminada.",
  en "Your Surf class on 10/18 at 08:00 was deleted."); `data` is `{ type, notificationId }`, without `classId`.
- **Edge and error cases:** the `Notification` entity accepts `class.deleted`.
- **Verify by:** `npx vitest run src/modules/notifications/push-messages.spec.ts src/modules/notifications/notifications.class-change-notifier.spec.ts`
  from `apps/backend`; `npx jest test/notification/model/notification.entity.test.ts` from `modules/notifications`.

### ER-07 — "Excluir aula" is offered only before the class starts

- **Front:** mobile
- **Behavior:** Given an admin on the details of a class that hasn't started, when they open the tools, then
  "Excluir aula" shows below "Cancelar aula"; on a started class the tools show no "Excluir aula".
- **Edge and error cases:** finished and cancelled classes still show no tools; instructors and students see no
  tools.
- **Verify by:** `npx jest src/modules/classes/components/class-tools-sheet src/modules/classes/screens/class-details.screen.test.tsx -t "delete"`
  from `apps/mobile`.

### ER-08 — An admin deletes a class after confirming

- **Front:** mobile
- **Behavior:** Given an admin who presses "Excluir aula" in the tools, then the sheet "Excluir esta aula?" opens
  with the class line, its description, "Excluir aula" and "Manter aula"; when they press "Excluir aula", then
  `DELETE /classes/:id` is sent once, the toast "Aula excluída" shows, the app leaves the details, and the weeks are
  reloaded without the class.
- **Edge and error cases:** "Manter aula" closes the sheet without a request.
- **Verify by:** `npx jest src/modules/classes/components/delete-class-sheet src/modules/classes/hooks/use-delete-class.hook.test.tsx src/modules/classes/screens/class-details.screen.test.tsx -t "delete"`
  from `apps/mobile`; the "Delete a class" journey of the Verification Plan.

### ER-09 — Delete errors, and "cancel it instead"

- **Front:** mobile
- **Behavior:** Given a delete that fails, then: 409 `class.delete.notEmpty` switches the sheet to "Não dá para
  excluir" with its description, "Cancelar aula" and "Manter aula", and "Cancelar aula" opens the "Cancelar esta
  aula?" sheet; `class.started` and `class.cancelled` show their toasts, close the sheet and refetch the class; 404
  shows "Esta aula não existe mais." and leaves the details; no connection and generic show their toasts; an expired
  session shows nothing.
- **Edge and error cases:** the sheet's buttons are usable again after any failure.
- **Verify by:** `npx jest src/modules/classes/utils/class-error.test.ts src/modules/classes/components/delete-class-sheet src/modules/classes/screens/class-details.screen.test.tsx -t "delete"`
  from `apps/mobile`.

### ER-10 — The deletion push opens the schedule and refreshes the classes

- **Front:** mobile
- **Behavior:** Given a `class.deleted` push, when an instructor taps it, then the account is refreshed and
  `/instructor/classes` opens (`/admin/classes` for an admin); when one arrives with the app open, `["classes"]` is
  invalidated.
- **Edge and error cases:** an account that no longer resolves to the instructor or admin flow goes to `/`.
- **Verify by:** `npx jest src/modules/notifications/hooks/use-notification-response.hook.test.tsx src/modules/notifications/hooks/use-notification-received.hook.test.tsx -t "class.deleted"`
  from `apps/mobile`.

## Tasks

### Classes module (`modules/classes`)

- [x] **T-01** — Add `SchoolClassRepository.delete(id, now): Promise<boolean>` (D-04), the `PendingRequestCounter`
  port (`src/school-class/provider/pending-request-counter.provider.ts`, D-03) and `ClassChangeNotifier.classDeleted`
  (event `ClassDeleted`, D-05), exported from the provider barrel; extend the fakes in `test/mock/`
  (`fake-school-class.repository.ts` with D-04's conditions, new `fake-pending-request.counter.ts`,
  `fake-class-change.notifier.ts`, the mock barrel) with their tests in `test/school-class/provider/`.
  Covers: enabling · Done when: `npm test --workspace @rochas-surf-school/classes` and
  `npm run check-types --workspace @rochas-surf-school/classes` pass.
  > ✅ 2026-10-17 23:59 — added delete(id, now) to SchoolClassRepository, the PendingRequestCounter port and ClassChangeNotifier.classDeleted (ClassDeleted event), plus fakes and tests;
  > files: `modules/classes/src/school-class/provider/school-class.repository.ts`, `.../class-change-notifier.provider.ts`, `.../pending-request-counter.provider.ts`, `.../index.ts`, `modules/classes/test/mock/fake-school-class.repository.ts`, `fake-class-change.notifier.ts`, `fake-pending-request.counter.ts`, `index.ts`, `modules/classes/test/school-class/provider/fake-school-class.repository.test.ts`, `fake-class-change.notifier.test.ts`, `fake-pending-request.counter.test.ts`;
  > verified: `npm test` in modules/classes (284 passed) and `npm run check-types` (clean);
  > deviations: none

- [x] **T-02** — Add `DeleteClass` (`src/school-class/usecase/delete-class.usecase.ts`, exported from the usecase
  barrel): D-02, D-04 and D-05, with `test/school-class/usecase/delete-class.usecase.test.ts` (tests named "deletes",
  "refuses", "not empty", "race", "notifies", and one per check of D-02).
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05 · Done when: `npx jest test/school-class/usecase/delete-class.usecase.test.ts --coverage`
  passes from `modules/classes` with every line of the use case covered.
  > ✅ 2026-10-18 00:00 — added the DeleteClass use case (D-02 order of checks, D-04 conditional delete with the re-read on a lost race, D-05 notification without the actor, swallowed errors) and its 21 tests;
  > files: `modules/classes/src/school-class/usecase/delete-class.usecase.ts`, `modules/classes/src/school-class/usecase/index.ts`, `modules/classes/test/school-class/usecase/delete-class.usecase.test.ts`;
  > verified: `npx jest test/school-class/usecase/delete-class.usecase.test.ts --coverage` from modules/classes (21 passed, use case 100% statements/branches/functions/lines) and `npm run check-types` (clean);
  > deviations: followed the sibling `CancelClass` use case as the pattern instead of the generic module-use-case template (same structure, no CRUD scaffolding needed)

### Notifications module (`modules/notifications`)

- [x] **T-03** — Add `class.deleted` to `NOTIFICATION_TYPES` (`src/notification/model/notification.entity.ts`) with
  a case in `test/notification/model/notification.entity.test.ts`.
  Covers: ER-05, ER-06 · Done when: `npm test --workspace @rochas-surf-school/notifications` passes.
  > ✅ 2026-10-18 00:00 — added `class.deleted` to NOTIFICATION_TYPES and a test accepting it without a class id;
  > files: `modules/notifications/src/notification/model/notification.entity.ts`, `modules/notifications/test/notification/model/notification.entity.test.ts`;
  > verified: `npm test` in modules/notifications (96 passed), `npm run check-types` clean;
  > deviations: none

### Backend (`apps/backend`)

- [x] **T-04** — Implement `delete` (D-04) in `src/modules/classes/school-class.prisma.ts` and add
  `NoEnrolmentPendingRequestCounter` (`src/modules/classes/no-enrolment.pending-request-counter.ts`, answers 0), with
  cases named "delete" in `school-class.prisma.spec.ts` and `no-enrolment.pending-request-counter.spec.ts`.
  Skill: [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-01, ER-03, ER-04 · Done when: `npx vitest run src/modules/classes/school-class.prisma.spec.ts src/modules/classes/no-enrolment.pending-request-counter.spec.ts`
  passes from `apps/backend`.
  > ✅ 2026-10-18 00:00 — implemented PrismaSchoolClassRepository.delete (one deleteMany on id, cancelledAt null, startsAt > now; instructor rows go by ON DELETE CASCADE) and NoEnrolmentPendingRequestCounter, with specs;
  > files: `apps/backend/src/modules/classes/school-class.prisma.ts`, `apps/backend/src/modules/classes/school-class.prisma.spec.ts`, `apps/backend/src/modules/classes/no-enrolment.pending-request-counter.ts`, `apps/backend/src/modules/classes/no-enrolment.pending-request-counter.spec.ts`;
  > verified: `npx vitest run src/modules/classes/school-class.prisma.spec.ts src/modules/classes/no-enrolment.pending-request-counter.spec.ts` from apps/backend (13 passed);
  > deviations: none (extended the existing repository file by hand, as the skill's pattern is already in place)

- [x] **T-05** — Add the D-06 catalog entry for `class.deleted` to `src/modules/notifications/push-messages.ts`,
  with cases in `push-messages.spec.ts` (three locales).
  Covers: ER-06 · Done when: `npx vitest run src/modules/notifications/push-messages.spec.ts` passes from
  `apps/backend`.
  > ✅ 2026-10-18 00:01 — added the `class.deleted` entry (pt-BR, es, en) to the push catalog and a case per locale;
  > files: `apps/backend/src/modules/notifications/push-messages.ts`, `apps/backend/src/modules/notifications/push-messages.spec.ts`;
  > verified: `npx vitest run src/modules/notifications` from apps/backend (87 passed, after rebuilding the modules' dist);
  > deviations: none

- [x] **T-06** — Add `classDeleted` to `NotificationsClassChangeNotifier`
  (`src/modules/notifications/notifications.class-change-notifier.ts`, D-05), with cases in its spec.
  Skill: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-05 · Done when: `npx vitest run src/modules/notifications/notifications.class-change-notifier.spec.ts`
  passes from `apps/backend`.
  > ✅ 2026-10-18 00:01 — added `classDeleted` to NotificationsClassChangeNotifier (Notify with `{ discipline, startsAt }`, no class id; errors logged and swallowed) with three cases;
  > files: `apps/backend/src/modules/notifications/notifications.class-change-notifier.ts`, `apps/backend/src/modules/notifications/notifications.class-change-notifier.spec.ts`;
  > verified: `npx vitest run src/modules/notifications/notifications.class-change-notifier.spec.ts` (part of the 87 passed above);
  > deviations: none

- [x] **T-07** — Expose `DELETE /classes/:id` (204) in `src/modules/classes/classes.controller.ts` (running
  `DeleteClass` with the repository, both counters, the change notifier and the clock), register
  `NoEnrolmentPendingRequestCounter` in `classes.module.ts`, add cases to `classes.controller.spec.ts`, the scenarios
  to `classes.integration.http`, and the e2e tests of ER-01, ER-02, ER-04 and ER-05 to `test/classes.e2e-spec.ts`
  (named as their `Verify by`). Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-04, ER-05 · Done when: `npx vitest run src/modules/classes/classes.controller.spec.ts` and
  `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts` pass.
  > ✅ 2026-10-18 00:02 — exposed `DELETE /classes/:id` (204, handler `remove`) running DeleteClass with the repository, both no-enrolment counters, the change notifier and the clock; registered NoEnrolmentPendingRequestCounter in the module; added controller unit cases, the .http scenarios and the e2e tests (deletes / refuses / checks / notifies);
  > files: `apps/backend/src/modules/classes/classes.controller.ts`, `apps/backend/src/modules/classes/classes.controller.spec.ts`, `apps/backend/src/modules/classes/classes.module.ts`, `apps/backend/src/modules/classes/classes.integration.http`, `apps/backend/test/classes.e2e-spec.ts`;
  > verified: `npx vitest run src/modules/classes/classes.controller.spec.ts` (30 passed), `npm run test:e2e -- test/classes.e2e-spec.ts` (82 passed), `npx tsc --noEmit` clean;
  > deviations: the handler is named `remove` (a method called `delete` reads badly in the controller); the notEmpty refusal has no e2e test because the no-enrolment counters always answer 0 (covered by the use case unit tests and documented in the .http file)

### Mobile (`apps/mobile`)

- [x] **T-08** — Add `useDeleteClass` (`src/modules/classes/hooks/use-delete-class.hook.ts`, D-07) and
  `getDeleteClassErrorKey` / `isClassNotEmptyError` in `src/modules/classes/utils/class-error.ts` (D-11), with
  `use-delete-class.hook.test.tsx` and `class-error.test.ts`.
  Covers: ER-08, ER-09 · Done when: `npx jest src/modules/classes/hooks/use-delete-class.hook.test.tsx src/modules/classes/utils/class-error.test.ts`
  passes from `apps/mobile`.
  > ✅ 2026-10-18 00:07 — added useDeleteClass (DELETE /classes/{id}, no retry, removes the details entry and invalidates the weeks) and isClassNotEmptyError / getDeleteClassErrorKey, with tests;
  > files: `apps/mobile/src/modules/classes/hooks/use-delete-class.hook.ts`, `apps/mobile/src/modules/classes/hooks/use-delete-class.hook.test.tsx`, `apps/mobile/src/modules/classes/utils/class-error.ts`, `apps/mobile/src/modules/classes/utils/class-error.test.ts`;
  > verified: `npx jest src/modules/classes/hooks/use-delete-class.hook.test.tsx src/modules/classes/utils/class-error.test.ts` from apps/mobile (41 passed);
  > deviations: none

- [x] **T-09** — Add `DeleteClassSheet` (`src/modules/classes/components/delete-class-sheet/`: component, hook, types,
  index; D-08) with the `deleteClass` copy (D-13) in `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`, and its component
  test (both variants, the class line, confirm, keep, cancel instead, loading).
  Covers: ER-08, ER-09 · Done when: `npx jest src/modules/classes/components/delete-class-sheet` passes from
  `apps/mobile`.
  > ✅ 2026-10-18 00:08 — added DeleteClassSheet (confirm / notEmpty variants, class line, danger + ghost buttons) and the `deleteClass` copy plus `classTools.delete` in the three locales;
  > files: `apps/mobile/src/modules/classes/components/delete-class-sheet/{delete-class-sheet.component.tsx,delete-class-sheet.types.ts,index.ts,delete-class-sheet.component.test.tsx}`, `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`;
  > verified: `npx jest src/modules/classes/components/delete-class-sheet` from apps/mobile (6 passed);
  > deviations: no `delete-class-sheet.hook.ts` — the sheet has no state or logic of its own (react.md: create the hook only when needed); the variant is a prop the screen controls

- [x] **T-10** — Add `onDelete` / `canDelete` and the "Excluir aula" button to `ClassToolsSheet`
  (`src/modules/classes/components/class-tools-sheet/`, D-09) with the `classTools.delete` copy, and cases named
  "delete" in its test.
  Covers: ER-07 · Done when: `npx jest src/modules/classes/components/class-tools-sheet` passes from `apps/mobile`.
  > ✅ 2026-10-18 00:08 — added `onDelete` / `canDelete` and the subtle "Excluir aula" button below "Cancelar aula" to ClassToolsSheet (closes the sheet first), with three "delete" tests;
  > files: `apps/mobile/src/modules/classes/components/class-tools-sheet/class-tools-sheet.{component.tsx,hook.ts,types.ts,component.test.tsx}`;
  > verified: `npx jest src/modules/classes/components/class-tools-sheet` from apps/mobile (7 passed);
  > deviations: none (the `classTools.delete` copy was added with T-09)

- [x] **T-11** — Wire deleting into `ClassDetailsScreen` (`src/modules/classes/screens/class-details.screen.tsx` and
  its hook: `canDelete` for a class that hasn't started, the tools → delete sheet, the request, D-10's success and
  D-11's errors, including "Cancelar aula" opening `CancelClassSheet`), with cases named "delete" in
  `class-details.screen.test.tsx`.
  Covers: ER-07, ER-08, ER-09 · Done when: `npx jest src/modules/classes/screens/class-details.screen.test.tsx`
  passes from `apps/mobile`.
  > ✅ 2026-10-18 00:10 — wired deleting into ClassDetailsScreen: `canDelete` (state not-started), the tools -> DeleteClassSheet, one request per press, success toast + router.back(), D-11 errors (notEmpty switches the variant and "Cancelar aula" opens CancelClassSheet; started/cancelled toast + close + refetch; 404 toast + back; network/generic/expired), with 14 "delete" screen tests;
  > files: `apps/mobile/src/modules/classes/screens/class-details.screen.tsx`, `class-details.screen.hook.ts`, `class-details.screen.types.ts`, `class-details.screen.test.tsx`;
  > verified: `npx jest src/modules/classes/screens/class-details.screen.test.tsx` from apps/mobile (56 passed), `npx tsc --noEmit` and `npx eslint src/modules/classes src/i18n` clean;
  > deviations: none

- [x] **T-12** — Handle `class.deleted` in `useNotificationResponse` (open the Aulas tab of the resolved flow) and
  `useNotificationReceived` (invalidate `["classes"]`) in `src/modules/notifications/hooks/` (D-12), with cases in
  their tests.
  Covers: ER-10 · Done when: `npx jest src/modules/notifications/hooks` passes from `apps/mobile`.
  > ✅ 2026-10-18 00:11 — handled `class.deleted`: a tap opens the Aulas tab of the resolved instructor/admin flow (else home), and a push received with the app open invalidates ["classes"]; tests for both;
  > files: `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.ts`, `use-notification-received.hook.ts`, `use-notification-response.hook.test.tsx`, `use-notification-received.hook.test.tsx`;
  > verified: `npx jest src/modules/notifications/hooks` from apps/mobile (63 passed), `npx tsc --noEmit` clean;
  > deviations: none

### Verification

- [x] **T-13** — Run every command in the Verification Plan from the repo root and follow its user journeys; all
  pass. Record the output summary as evidence.
  Covers: all · Done when: every automated command passes (`COVERAGE OK`, `E2E PASSED`) and both journeys show what
  they describe.
  > ✅ 2026-10-18 00:18 — ran every Verification Plan command and both user journeys; files: none changed;
  > verified: `node .specs/scripts/run-related-tests.mjs 034` (RELATED TESTS PASSED: backend, mobile, classes, notifications), `node .specs/scripts/check-coverage.mjs 034` (COVERAGE OK, 19 files), `node .specs/scripts/run-e2e.mjs 034` (E2E PASSED), `npx turbo run lint check-types` (16 tasks ok), `npx turbo run build` (7 tasks ok);
  > journeys on the iOS simulator (iPhone 18 Pro, local backend, dev admin account): (1) a class for tomorrow 08:00 -> tools show "Delete class" below "Cancel class"; "Delete this class?" with the line "Surf Beginner · Tomorrow · 19 Oct, 08:00 – 09:00 · Review R2 Beach"; "Keep class" closed the sheet and the class stayed in the database; "Delete class" showed the toast "Class deleted", left the details, the class was gone from Mon 19 (the 12:00 class stayed), the class and its class_instructors rows were gone from Postgres and the instructor got a `class.deleted` notification with `{discipline, startsAt}`; (2) a class starting in about a minute -> once "In progress" the tools showed only Edit class, Notify and Cancel class; cancelling it showed the toast "Class cancelled" and the tools button disappeared;
  > deviations: the two test classes were inserted with SQL (the create flow is not what this spec changes) and the app ran in English (OS language), so the copy was checked in en-US; the second test class was removed afterwards

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 034` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 034` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 034` — the backend e2e suite passes (Postgres up, migrations applied),
    including the `DELETE /classes/:id` tests.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
  - `npx turbo run build --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/backend`
    — builds.
- User journeys (iOS simulator, local backend):
  - Delete a class: as an approved admin, create a class for tomorrow, open its details and the tools: "Excluir aula"
    shows below "Cancelar aula". Press it: "Excluir esta aula?" with the class line. Press "Manter aula": the sheet
    closes and the class stays. Open it again and press "Excluir aula": "Aula excluída", the app leaves the details
    and the class is gone from tomorrow on the classes screen.
  - Not offered: create a class starting a minute from now; once it shows "Em andamento", open its tools: only
    "Editar aula", the notify placeholder and "Cancelar aula" show. Cancel it: the tools disappear.

## Memory Impact

- `memory/product.md` — Current state: admins delete a class created by mistake, after confirming, only before it
  starts, never a cancelled one, and only when nobody holds a seat or has a pending request (always true until
  enrolment); it leaves the schedule for good and its instructors are told (never the admin who deletes). Class
  concept: deleting is built; the "no instructor" flag comes with 035. Out of scope: drop "deleting" from the lists
  of 030/032/033.
- `memory/technical-context.md` — Classes: `DELETE /classes/:id` (204, D-02's order, `class.delete.notEmpty` with its
  details), `DeleteClass`, `SchoolClassRepository.delete` (conditional on not cancelled and not started), the
  `PendingRequestCounter` port with `NoEnrolmentPendingRequestCounter` (0 until enrolment); mobile `useDeleteClass`,
  `getDeleteClassErrorKey`, `DeleteClassSheet`, `ClassToolsSheet`'s `canDelete`. Push notifications: `classDeleted`
  on `ClassChangeNotifier` / `NotificationsClassChangeNotifier`, `class.deleted` without `classId`.
- `memory/structure.md` — the `delete-class-sheet` component of the classes module.
- `memory/modules/classes.md` — the delete rules and keys (`class.cancelled`, `class.started`,
  `class.delete.notEmpty`), the conditional delete and its race outcomes, pending requests counted next to seats, who
  can delete (approved admins) and who is told; the spec history entry.
- `memory/modules/notifications.md` — the `class.deleted` type, its details and push text, the tap (Aulas tab) and
  foreground behavior; the spec history entry.

## Assumptions

- Seats taken and pending requests are always zero until the enrolment spec: the "not empty" rule and the "Não dá
  para excluir" sheet are proven only by unit and component tests with fakes and mocked answers. Accepted by the
  user in planning spec 032.
- Notifications already sent about a deleted class stay; tapping one opens the details' "Esta aula não existe
  mais." state.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review

### Round 1 — 2026-10-18 — accepted

**Checks**

- lint ✅ · type check ✅ (classes, notifications, backend, mobile) · build ✅ (classes, notifications, backend)
- related tests ✅ backend 155 · mobile 721 · modules/classes 305 · modules/notifications 96 passed (`RELATED TESTS PASSED`)
- coverage of the changed lines ✅ `COVERAGE OK` — 19 files measured, every changed line covered; no coverage-ignore comments
- e2e: backend suite ✅ 427 passed (`E2E PASSED`); each `DELETE /classes/:id` filter of the Verify by selects and passes its tests
  (deletes 1 · refuses 1 · checks 1 · notifies 3)
- mobile journeys (iOS simulator, iPhone 18 Pro, local backend, approved admin, app in en-US) ✅ — see ER-07 and ER-08

**Expected Results**

- ER-01 ✅ — e2e: 204 with no body, `GET /classes/:id` 404 `class.notFound`, gone from the week, `class_instructors` rows
  gone, the sibling class untouched; one minute ahead is deleted. Use case "deletes" 8 passed.
- ER-02 ✅ — e2e: started, at its exact start and finished → 409 `class.started`; cancelled and cancelled-and-finished →
  409 `class.cancelled`; all five kept with their instructor rows, nothing notified. Use case "refuses" 9 passed.
- ER-03 ✅ — use case "not empty" (2/0, 0/1, 3/4) → 409 `class.delete.notEmpty` with `details`, `delete` never called;
  `NoEnrolmentPendingRequestCounter` answers 0.
- ER-04 ✅ — e2e: student/instructor 403 `user.role.notAdmin`, non-approved admins 403 `user.status.notApproved`, 401
  without a token, unknown and non-UUID ids 404; two simultaneous deletes → one 204 and one 404, one notification.
  Use case "race" (lost to a delete → 404, to a cancel → `class.cancelled`, to the clock → `class.started`); Prisma
  `deleteMany` with `{ id, cancelledAt: null, startsAt: { gt: now } }`.
- ER-05 ✅ — e2e: the instructor gets `class.deleted` `{ discipline, startsAt }`, the deleting admin nothing; an admin
  teaching alone notifies nobody; a failing push keeps the 204 and the deletion. Use case "notifies" 3 passed.
- ER-06 ✅ — push text in pt-BR, es and en as written (Fortaleza time, en `MM/dd`); the push data adds `classId` only
  when the params carry one (`expo.push.ts`), and `class.deleted` params carry none; the entity accepts the type.
- ER-07 ✅ — component and screen tests; in the simulator a class for tomorrow showed "Delete class" below "Cancel
  class", and a class in progress showed only "Edit class", "Notify students and instructors" and "Cancel class".
- ER-08 ✅ — component, hook and screen tests; in the simulator "Delete this class?" showed "Skate Advanced · Tomorrow ·
  19 Oct, 10:00 – 11:00 · Review R2 Beach", the description and both buttons; "Keep class" closed it and the class
  stayed in Postgres; "Delete class" showed "Class deleted", left the details, Mon 19 listed only the other class, the
  class and its `class_instructors` rows were gone, and only Dev Instructor got `class.deleted`.
- ER-09 ✅ — `class-error.test.ts` maps every key; screen tests: `notEmpty` switches the sheet and "Cancel class" opens
  "Cancel this class?", started/cancelled toast + close + refetch, 404 toast + back, generic and no-connection toasts
  with the button enabled again, expired session silent.
- ER-10 ✅ — a tapped `class.deleted` refreshes the account and opens `/instructor/classes` or `/admin/classes`, a
  student goes to their flow; received in the foreground it invalidates `["classes"]`.

**Findings**

None.

**Notes**

- The screen's no-connection test (as spec 033's cancel one) only asserts that a toast other than "Class deleted"
  showed; the exact copy is proven by `class-error.test.ts`. Asserting "No connection…" there would make it stricter.
- `DeleteSheetVariant` in `class-details.screen.types.ts` repeats `DeleteClassSheetVariant` from the sheet's types; the
  screen could import the component's type.
- D-08 listed a `delete-class-sheet.hook.ts`; none was created because the sheet has no state or logic, which
  `.claude/rules/react.md` asks for — recorded as a T-09 deviation. The controller handler is `remove` (T-07 deviation).
- The success toast uses the app's only alert style (red with a warning icon), the same as "Class cancelled"; a
  success style would be a design change of its own.
- Journey data: the two test classes were inserted with SQL; the review removed the cancelled one and the two
  notifications it caused afterwards.
