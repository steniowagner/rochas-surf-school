---
id: "033"
slug: class-cancellation
title: "Cancelling a class"
status: in-progress
started: 2026-10-17
base_commit: e08a9739ca92401665a9bfd829d3fcc9b5abf84a
created: 2026-10-17
fronts: [classes, notifications, backend, mobile]
depends_on: []
---

# 033 — Cancelling a class

## Goal

An approved admin cancels a class any time before it finishes, with an optional message — for example because of
bad weather. Cancelling is final: the class stays on the schedule for everyone, marked as cancelled, and nothing
about it can change again (editing, cancelling again). Its instructors are told, with the message, never the admin
who cancels. `cancelled` becomes the only state of a class that is stored rather than computed from the clock. This
is the second of the four class-management specs (032 editing, 034 deleting, 035 the "no instructor" flag).

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: Class (`cancelled` "by an admin, any time
  before it finishes, with an optional message: final; never restored"; `finished` "can't be cancelled"), the
  decision "Text written by admins is shown as written".
- Requirements:
  - [requirements.md → Cancelling a class](../../../.docs/requirements.md#cancelling-a-class) — admins cancel
    until the class finishes, with an optional message; students, pending requests and instructors are notified
    with it (only instructors can be here, D-07).
  - [requirements.md → Finished and cancelled classes are final](../../../.docs/requirements.md#finished-and-cancelled-classes-are-final)
    — a finished class can't be cancelled, a cancelled class can't be restored.
  - [requirements.md → Class states](../../../.docs/requirements.md#class-states) — the `cancelled` state, set only
    when an admin cancels.
  - [requirements.md → Changes after a class starts](../../../.docs/requirements.md#changes-after-a-class-starts)
    — a started class can still be cancelled.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Classes (`EditClass`,
  `PUT /classes/:id`, `ClassItem`, mobile editing), Architecture → Time (the state computed from the clock — this
  spec makes `cancelled` the one stored exception), Persistence (migrations named after the module, `$transaction`),
  External integrations → Push notifications (`ClassChangeNotifier`, push `data.classId`, the hand-formatted
  Fortaleza date), Fixed conventions (Mobile shared UI: `BottomModal`, `TextArea`, `Chip`, `Button`), Automated
  validation. Module rules: [modules/classes.md](../../memory/modules/classes.md),
  [modules/notifications.md](../../memory/modules/notifications.md).
- Designs: `.docs/designs/admin-app.html` — the editor's "Cancelar aula" button (`editorScreen`), the
  `cancelarAula` sheet, the card's "Cancelada" chip (`aulaCard`) and the details' "Aula cancelada" banner
  (`aulaScreen`). The file is a bundle: its sources unpack from the `__bundler/manifest` script (gzip + base64). Its
  copy is European Portuguese and mentions enrolled students; this spec adapts it (D-16).
- Existing code this builds on:
  - `modules/classes/src/school-class/model/` — `SchoolClass`, `getClassState` (`class-state.ts`), `CLASS_NOTES_MAX`.
  - `modules/classes/src/school-class/usecase/` — `EditClass` (spec 032), `GetClass`, `toClassItem` (`class-item.ts`).
  - `modules/classes/src/school-class/provider/` — `SchoolClassRepository` (`findById`, `update`),
    `ClassChangeNotifier` (`classEdited`), `ClassView`; fakes in `modules/classes/test/mock/`.
  - `modules/notifications/src/notification/model/notification.entity.ts` — `NOTIFICATION_TYPES`.
  - `apps/backend/prisma/models/classes.model.prisma`; `apps/backend/src/modules/classes/` (`ClassesController`,
    `PrismaSchoolClassRepository`, `PrismaClassViewReader`); `apps/backend/test/classes.e2e-spec.ts`.
  - `apps/backend/src/modules/notifications/` — `push-messages.ts` (with spec 032's date formatting),
    `notifications.class-change-notifier.ts`.
  - `apps/mobile/src/modules/classes/` — `ClassCard` (`components/class-card/`), `ClassDetailsScreen` (pencil with
    `canEdit`), `EditClassScreen`, `useClass`, `useEditClass`, `utils/class-error.ts`, `classes.types.ts`.
  - `apps/mobile/src/modules/notifications/hooks/` — `useNotificationResponse`, `useNotificationReceived`.
  - `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`.

## Scope

### In scope

- `POST /classes/:id/cancel` for approved admins, with an optional message; the stored cancellation; the
  `cancelled` state everywhere the state is computed; editing a cancelled class refused.
- The `class.cancelled` notification type and its push text in pt-BR, es and en.
- In the app: "Cancelar aula" and its sheet in "Editar aula", the cancelled look of the card and of the details
  (banner, message card, no pencil), the edit screen on a cancelled class, and the `class.cancelled` push.

### Out of scope

- **Deleting a class — spec 034** (its refusal of cancelled classes, `class.cancelled`, comes with it).
- **The "no instructor" flag — spec 035.**
- Notifying students and people with pending requests, ending their enrolments as `class cancelled`, and the guest
  warning ("alunos trial não têm conta") — they come with enrolment, which adds those recipients to the same event.
- Reminders (none exist yet; a cancelled class will get none when they do).
- Storing who cancelled the class (product.md keeps no history of admin decisions), restoring a cancelled class,
  and editing its message.
- A cancel button on the details screen: the design puts it only in the editor.
- The design sheet's counts of enrolled students and pending requests.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | `POST /classes/:id/cancel` (protected), body `{ message? }`, answers 200 with the class's `ClassItem`. `ClassItem` (every endpoint that returns it: `GET /classes`, `GET /classes/:id`, `PUT /classes/:id` and this one) gains `cancelledAt` (ISO UTC string, or `null`) and `cancellationMessage` (string, or `null`). | One answer shape for every class read; the app draws the state from it. |
| D-02 | Use case `CancelClass` (`modules/classes/src/school-class/usecase/cancel-class.usecase.ts`). Order of checks: access (`assertCanManageClasses`: 403 `user.status.notApproved`, then `user.role.notAdmin`); the id (not a UUID, or no class → 404 `class.notFound`, no lookup for a non-UUID); the message (present, not `null`, and not a string, or longer than 300 characters after trimming → 422 `ValidationException` `class.cancellationMessage.max.length`); then 409 `class.cancelled` (already cancelled, whatever the clock); then 409 `class.finished` (now ≥ `endsAt`). A class that has started and not finished is cancelled. | The module's order (access, id, shape, state); `cancelled` first because it is final whatever time it is. |
| D-03 | The message is trimmed; blank or absent is stored as none (`null`); up to 300 characters (`CLASS_CANCELLATION_MESSAGE_MAX = 300` in `class-limits.ts`). It is stored and shown exactly as written after trimming, never translated. | The design's 300-character textarea; product.md's rule for admin-written text. |
| D-04 | Storage: `classes.cancelled_at` (timestamp, nullable) and `classes.cancellation_message` (text, nullable), Prisma fields `cancelledAt` / `cancellationMessage`, migration `classes-add-cancellation`. `SchoolClassRepository.cancel(id, at, message)` returns `true` when it cancelled the class and `false` when it was already cancelled: `PrismaSchoolClassRepository` uses one `updateMany` with `where: { id, cancelledAt: null }` and reads the count, so of two simultaneous cancels exactly one returns `true`; `CancelClass` turns `false` into 409 `class.cancelled`. `cancelledAt` is the clock's now. | A conditional write is the smallest lock-free way to get exactly one winner. |
| D-05 | State: `ClassState` becomes `"not-started" \| "started" \| "finished" \| "cancelled"`, and `getClassState(startsAt, endsAt, now, cancelledAt?: Date \| null)` returns `"cancelled"` whenever `cancelledAt` is set, otherwise the clock's state as before. `SchoolClass` gains `cancelledAt` and `cancellationMessage` (validated: the message at most 300 characters), and `ClassView` the same two fields. Every caller passes the cancellation: `EditClass`, `CancelClass`, the card, the details and the edit screen. | One function keeps every rule and screen on the same states, now with the stored one. |
| D-06 | Editing: `EditClass` refuses a cancelled class with 409 `class.cancelled`, right after the shape check and before `class.finished`. `SchoolClassRepository.update` now returns `Promise<boolean>`: `false` when the stored class is cancelled (Prisma: the class row is written with `updateMany` `where: { id, cancelledAt: null }` inside the transaction, and the instructors are replaced only when it matched), and `EditClass` turns `false` into 409 `class.cancelled` without notifying anyone. | An edit that read the class just before a cancel must not be written after it: the check sits on the write itself. |
| D-07 | Notifications: after the class is stored as cancelled, its instructors except the admin who cancels get `class.cancelled` `{ classId, discipline, startsAt, message? }` (`message` only when there is one), through `ClassChangeNotifier.classCancelled({ instructorIds, classId, discipline, startsAt, message })` (D-08). No instructor left → nothing sent. A notifier that throws is swallowed in the use case and logged in the adapter; it never changes the answer. | The same rule as 032's edits; students come with enrolment. |
| D-08 | `ClassChangeNotifier` gains `classCancelled`, implemented by `NotificationsClassChangeNotifier.classCancelled` (`apps/backend/src/modules/notifications/notifications.class-change-notifier.ts`) running `Notify` with type `class.cancelled`, logging and swallowing every error. | The port spec 032 created for class changes; spec 034 adds `classDeleted` to it. |
| D-09 | Push text (`push-messages.ts`), the start formatted as in spec 032 (Fortaleza, `dd/MM` and `HH:mm`; en `MM/dd`), `{discipline}` "Surf" / "Skate": title "Aula cancelada" / "Clase cancelada" / "Class cancelled"; body without a message — pt-BR "A aula de {discipline} de {dd/MM} às {HH:mm} foi cancelada.", es "La clase de {discipline} del {dd/MM} a las {HH:mm} fue cancelada.", en "Your {discipline} class on {MM/dd} at {HH:mm} was cancelled."; with a message — pt-BR "{discipline}, {dd/MM} às {HH:mm}: {message}", es "{discipline}, {dd/MM} a las {HH:mm}: {message}", en "{discipline}, {MM/dd} at {HH:mm}: {message}" (the message trimmed, as written). The push `data` carries `classId` (spec 032's rule). | The push always says which class; the message is the reason the admin wanted heard. |
| D-10 | Mobile: `ClassItem` in `classes.types.ts` gains `cancelledAt` and `cancellationMessage`; `useCancelClass` (`hooks/use-cancel-class.hook.ts`: `apiPost` to `/classes/{id}/cancel`, no retry, invalidating `["classes"]` on success); `getCancelClassErrorKey` in `utils/class-error.ts` (D-12), and `getEditClassErrorKey` maps 409 `class.cancelled` to `editClass.errors.cancelled`. | Same pattern as `useEditClass`; `["classes"]` covers the weeks and the details. |
| D-11 | The action: `EditClassScreen` shows, below its sections and above the footer, an outline `Button` "Cancelar aula" with the `close-circle-outline` icon, for a class that hasn't started (full form) and for a started one (instructors only). It opens `CancelClassSheet` (`components/cancel-class-sheet/`: `BottomModal` with the title, the description, the `TextArea` "Mensagem (opcional)" with `maxLength` 300 and its counter, a danger `Button` "Cancelar e avisar" with `loading`, and a ghost `Button` "Manter aula" that closes it; the text clears when the sheet closes). Confirming sends the trimmed message (omitted when blank) once (a double press sends once); on 200: toast "Aula cancelada", the sheet closes and `router.back()` returns to the details. | The design's editor button and `cancelarAula` sheet. |
| D-12 | Sheet errors (`getCancelClassErrorKey`): 409 `class.cancelled` → toast `cancelClass.errors.cancelled`, the sheet closes and the class is refetched; 409 `class.finished` → toast `cancelClass.errors.finished`, the sheet closes and the class is refetched; 404 `class.notFound` → toast `classDetails.notFound` and `router.back()`; 422 `class.cancellationMessage.max.length` → the generic toast (the field can't exceed 300); `NetworkError` → no connection; `SessionExpiredError` → nothing; anything else → generic. The buttons are usable again after any failure. | The class reloads into its real state; the same toasts as the other class screens. |
| D-13 | Edit screen on a cancelled class: when the loaded class has `cancelledAt`, the screen shows `editClass.errors.cancelled` ("Esta aula foi cancelada e não pode mais ser alterada.") instead of the form, without the footer or "Cancelar aula"; a save refused with `class.cancelled` shows the same text as a toast and goes back (D-10). | Like the finished-on-load state of spec 032. |
| D-14 | Card (`ClassCard`): with `cancelledAt`, the right chip is "Cancelada" (`Chip` on `bad-tint`, text `bad`, icon `close-circle-outline`) instead of "Em andamento" / "Finalizada"; the time range is struck through (`line-through`) in `ink-2`; the card has no `sun` border and isn't faded, whatever the clock. The calendar keeps the day's dot (a cancelled class is still a class of that day). | The design's `aulaCard`; the dot rule of spec 031 is "at least one class". |
| D-15 | Details (`ClassDetailsScreen`, every role): with `cancelledAt`, the banner is "Aula cancelada" / "Esta aula não vai acontecer." on `bad-tint` with the `close-circle-outline` icon in `bad` (instead of the started or finished banner), followed, when `cancellationMessage` isn't `null`, by a card titled "Mensagem da equipe" with the message exactly as stored; the pencil is hidden even with `canEdit`. | The design's banner, with copy that suits students too; the message card mirrors the Denied screen's. |
| D-16 | Copy (pt-BR / es-ES / en-US): `editClass.cancel` "Cancelar aula" / "Cancelar clase" / "Cancel class"; `cancelClass.title` "Cancelar esta aula?" / "¿Cancelar esta clase?" / "Cancel this class?"; `cancelClass.description` "Avisamos os instrutores da aula. Ela continua na agenda, marcada como cancelada." / "Avisamos a los instructores de la clase. Sigue en la agenda, marcada como cancelada." / "We'll notify the class's instructors. It stays on the schedule, marked as cancelled."; `cancelClass.messageLabel` "Mensagem (opcional)" / "Mensaje (opcional)" / "Message (optional)"; `cancelClass.messagePlaceholder` "Ex.: Mar muito grande. Remarcamos para sábado no mesmo horário." / "Ej.: Mar muy grande. La pasamos al sábado a la misma hora." / "E.g.: Waves too big. Moved to Saturday, same time."; `cancelClass.confirm` "Cancelar e avisar" / "Cancelar y avisar" / "Cancel and notify"; `cancelClass.keep` "Manter aula" / "Mantener clase" / "Keep class"; `cancelClass.done` "Aula cancelada" / "Clase cancelada" / "Class cancelled"; `cancelClass.errors.cancelled` "Esta aula já foi cancelada." / "Esta clase ya fue cancelada." / "This class was already cancelled."; `cancelClass.errors.finished` "Esta aula já terminou e não pode mais ser cancelada." / "Esta clase ya terminó y no se puede cancelar." / "This class has finished and can't be cancelled."; `editClass.errors.cancelled` "Esta aula foi cancelada e não pode mais ser alterada." / "Esta clase fue cancelada y no se puede cambiar." / "This class was cancelled and can't be changed."; `classesWeek.cancelled` "Cancelada" / "Cancelada" / "Cancelled"; `classDetails.cancelled.title` "Aula cancelada" / "Clase cancelada" / "Class cancelled", `classDetails.cancelled.description` "Esta aula não vai acontecer." / "Esta clase no se realizará." / "This class won't take place."; `classDetails.message` "Mensagem da equipe" / "Mensaje del equipo" / "Message from the team". | The design's copy adapted to Brazilian Portuguese and to a product without enrolment yet. |
| D-17 | Pushes in the app: tapping a `class.cancelled` push with a `classId` refreshes the account, then opens `routes.instructor.classDetail(classId)` / `routes.admin.classDetail(classId)` when the account resolves to the `instructor` / `admin` flow, else `routes.home`; received with the app open, it invalidates `["classes"]`. | The same handling as `class.edited` (spec 032). |

## Expected Results

### ER-01 — An admin cancels a class that hasn't started

- **Front:** backend
- **Behavior:** Given an approved admin and a class starting tomorrow, when they call `POST /classes/:id/cancel`
  with `{ "message": "  Mar muito grande.  " }`, then the API answers 200 with the `ClassItem` whose `cancelledAt` is
  the server's now and `cancellationMessage` is `"Mar muito grande."`; `GET /classes/:id` and the class's week in
  `GET /classes?date=` return the same two fields.
- **Edge and error cases:** no body, `{}`, `{ "message": null }` or a blank message store `cancellationMessage:
  null`; a class never cancelled reads `cancelledAt: null` and `cancellationMessage: null` on every endpoint.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts -t "POST /classes/:id/cancel cancels a class that hasn't started"`
  and `npx jest test/school-class/usecase/cancel-class.usecase.test.ts -t "cancels"` from `modules/classes`.

### ER-02 — A started class can be cancelled

- **Front:** backend
- **Behavior:** Given a class that started and hasn't finished, when an admin cancels it, then the API answers 200
  with `cancelledAt` set.
- **Edge and error cases:** a class whose start is exactly now is cancelled; one whose end is exactly now is
  finished (ER-03).
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts -t "POST /classes/:id/cancel cancels a started class"`
  and `npx jest test/school-class/usecase/cancel-class.usecase.test.ts -t "started"` from `modules/classes`.

### ER-03 — Finished and cancelled classes are final

- **Front:** backend
- **Behavior:** Given a finished class, when an admin cancels it, then the API answers 409 `class.finished` and the
  class is unchanged; given a cancelled class, when an admin cancels it again, then 409 `class.cancelled` and its
  `cancelledAt` and message are unchanged; when two cancels of the same class run at the same moment, exactly one
  answers 200 and the other 409 `class.cancelled`.
- **Edge and error cases:** a cancelled class whose end has passed answers `class.cancelled`, not `class.finished`.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts -t "POST /classes/:id/cancel refuses"`
  (finished, already cancelled, two concurrent requests), `npx jest test/school-class/usecase/cancel-class.usecase.test.ts -t "refuses"`
  from `modules/classes`, and `npx vitest run src/modules/classes/school-class.prisma.spec.ts -t "cancel"` from
  `apps/backend`.

### ER-04 — Access, missing class and message are checked

- **Front:** backend
- **Behavior:** Given the endpoint, then: an instructor or student answers 403 `user.role.notAdmin`, a non-approved
  admin 403 `user.status.notApproved`, no token 401; an unknown or non-UUID id 404 `class.notFound`; a message of 301
  characters after trimming, or one that isn't a string, 422 `class.cancellationMessage.max.length`. Nothing is
  stored and nobody is notified on any refusal.
- **Edge and error cases:** a message of exactly 300 characters is accepted.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts -t "POST /classes/:id/cancel checks"`
  and `npx jest test/school-class/usecase/cancel-class.usecase.test.ts` from `modules/classes`.

### ER-05 — A cancelled class can't be edited

- **Front:** backend
- **Behavior:** Given a cancelled class, when an admin calls `PUT /classes/:id` with a valid body, then the API
  answers 409 `class.cancelled` and nothing changes; given an edit that read the class before it was cancelled,
  when its write reaches the repository after the cancel, then `update` returns `false`, `EditClass` throws 409
  `class.cancelled`, and nobody is notified.
- **Edge and error cases:** a malformed body still answers its 422 shape errors first; a cancelled and finished
  class answers `class.cancelled`.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts -t "PUT /classes/:id refuses a cancelled class"`,
  `npx jest test/school-class/usecase/edit-class.usecase.test.ts -t "cancelled"` from `modules/classes`, and
  `npx vitest run src/modules/classes/school-class.prisma.spec.ts -t "update"` from `apps/backend`.

### ER-06 — The state of a cancelled class is `cancelled`

- **Front:** classes
- **Behavior:** Given a class with `cancelledAt` set, when `getClassState(startsAt, endsAt, now, cancelledAt)` runs
  before its start, during it or after its end, then it returns `"cancelled"`; with `cancelledAt` `null` or absent
  it returns the clock's state as before.
- **Edge and error cases:** a `SchoolClass` with a cancellation message over 300 characters fails `validate()` with
  `class.cancellationMessage.max.length`.
- **Verify by:** `npx jest test/school-class/model/class-state.test.ts test/school-class/model/school-class.entity.test.ts`
  from `modules/classes`.

### ER-07 — The instructors are told, with the message

- **Front:** classes
- **Behavior:** Given a class taught by A and the cancelling admin E, when E cancels it with the message "Mar muito
  grande.", then A gets `class.cancelled` `{ classId, discipline, startsAt, message: "Mar muito grande." }` and E
  gets nothing.
- **Edge and error cases:** without a message the details have no `message`; a class taught only by E notifies
  nobody; a notifier that throws doesn't change the 200 answer or the stored cancellation.
- **Verify by:** `npx jest test/school-class/usecase/cancel-class.usecase.test.ts -t "notifies"` from
  `modules/classes`; `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts -t "POST /classes/:id/cancel notifies"`
  (stored notifications and the fake Expo messages).

### ER-08 — The cancellation push says which class, with the message

- **Front:** backend
- **Behavior:** Given a `class.cancelled` notification for a Surf class starting at 2026-10-18 11:00Z, when it is
  pushed, then the title is "Aula cancelada" / "Clase cancelada" / "Class cancelled" in the device's locale and the
  body is D-09's: without a message pt-BR "A aula de Surf de 18/10 às 08:00 foi cancelada.", with the message "Mar
  muito grande." pt-BR "Surf, 18/10 às 08:00: Mar muito grande." (en "Surf, 10/18 at 08:00: Mar muito grande.");
  `data` is `{ type, notificationId, classId }`.
- **Edge and error cases:** a blank message in the params counts as none; the `Notification` entity accepts
  `class.cancelled`.
- **Verify by:** `npx vitest run src/modules/notifications/push-messages.spec.ts src/modules/notifications/notifications.class-change-notifier.spec.ts`
  from `apps/backend`; `npx jest test/notification/model/notification.entity.test.ts` from `modules/notifications`.

### ER-09 — An admin cancels a class from "Editar aula"

- **Front:** mobile
- **Behavior:** Given an admin on "Editar aula" for a class that hasn't started (or has started), then "Cancelar
  aula" shows below the form; pressing it opens the sheet "Cancelar esta aula?" with its description, "Mensagem
  (opcional)", "Cancelar e avisar" and "Manter aula"; when they type a message and press "Cancelar e avisar", then
  `POST /classes/:id/cancel` is sent once with the trimmed message, the toast "Aula cancelada" shows, the app goes
  back to the details and `["classes"]` is invalidated.
- **Edge and error cases:** a blank message is omitted from the body; "Manter aula" closes the sheet without a
  request; the message stops at 300 characters with its counter.
- **Verify by:** `npx jest src/modules/classes/components/cancel-class-sheet src/modules/classes/screens/edit-class.screen.test.tsx -t "cancel"`
  from `apps/mobile`; the "Cancel a class" journey of the Verification Plan.

### ER-10 — Cancel errors are shown and handled

- **Front:** mobile
- **Behavior:** Given a cancel that fails, then the app shows D-12's toast for each case: `class.cancelled` and
  `class.finished` (the sheet closes and the class is refetched), 404 (and back), no connection, generic; an expired
  session shows nothing.
- **Edge and error cases:** the sheet's buttons are usable again after any failure.
- **Verify by:** `npx jest src/modules/classes/utils/class-error.test.ts src/modules/classes/hooks/use-cancel-class.hook.test.tsx src/modules/classes/screens/edit-class.screen.test.tsx -t "cancel"`
  from `apps/mobile`.

### ER-11 — A cancelled card is marked

- **Front:** mobile
- **Behavior:** Given a class with `cancelledAt` on the classes screen of any role, then its card shows the chip
  "Cancelada" and the time struck through, with no "Em andamento" or "Finalizada" chip, no `sun` border and no
  fading, whether it is before, during or after its time.
- **Edge and error cases:** a class without `cancelledAt` keeps spec 030's look; its day keeps the calendar dot.
- **Verify by:** `npx jest src/modules/classes/components/class-card -t "cancelled"` from `apps/mobile`.

### ER-12 — The details of a cancelled class

- **Front:** mobile
- **Behavior:** Given a cancelled class with the message "Mar muito grande.", when any role opens its details, then
  the banner "Aula cancelada" / "Esta aula não vai acontecer." shows instead of the started or finished banner,
  followed by the card "Mensagem da equipe" with "Mar muito grande."; an admin sees no pencil.
- **Edge and error cases:** without a message there is no message card; a class that isn't cancelled shows neither.
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "cancelled"` from
  `apps/mobile`.

### ER-13 — The edit screen of a cancelled class

- **Front:** mobile
- **Behavior:** Given an admin who opens "Editar aula" for a class with `cancelledAt`, then the screen shows "Esta
  aula foi cancelada e não pode mais ser alterada." and no form, footer or "Cancelar aula"; given a save refused
  with 409 `class.cancelled`, then the same text shows as a toast and the app goes back.
- **Edge and error cases:** none beyond spec 032's states.
- **Verify by:** `npx jest src/modules/classes/screens/edit-class.screen.test.tsx -t "cancelled"` from `apps/mobile`.

### ER-14 — The cancellation push opens the class and refreshes the classes

- **Front:** mobile
- **Behavior:** Given a `class.cancelled` push with a `classId`, when an instructor taps it, then the account is
  refreshed and `/instructor/class/<classId>` opens (`/admin/class/<classId>` for an admin); when one arrives with
  the app open, `["classes"]` is invalidated.
- **Edge and error cases:** an account that no longer resolves to the instructor or admin flow, or a push without a
  `classId`, goes to `/`.
- **Verify by:** `npx jest src/modules/notifications/hooks/use-notification-response.hook.test.tsx src/modules/notifications/hooks/use-notification-received.hook.test.tsx -t "class.cancelled"`
  from `apps/mobile`.

## Tasks

### Classes module (`modules/classes`)

- [x] **T-01** — Add `cancelledAt` and `cancellationMessage` to `SchoolClass` (`src/school-class/model/school-class.entity.ts`,
  validated with `CLASS_CANCELLATION_MESSAGE_MAX` in `class-limits.ts`), the `cancelled` state and the
  `cancelledAt` parameter to `getClassState` (`class-state.ts`, D-05), and the two fields to `ClassView`
  (`provider/class-view-reader.provider.ts`) and `ClassItem` / `toClassItem` (`usecase/class-item.ts`), with tests in
  `test/school-class/model/` and `test/school-class/usecase/` (the item mapping), and the factories in `test/mock/`.
  Covers: ER-06 · Done when: `npm test --workspace @rochas-surf-school/classes` and
  `npm run check-types --workspace @rochas-surf-school/classes` pass.
  > ✅ 2026-10-17 00:32 — Added cancelledAt/cancellationMessage to SchoolClass (validated, max 300), the cancelled state and cancelledAt param of getClassState, and the two fields to ClassView and ClassItem/toClassItem; files: `modules/classes/src/school-class/model/class-limits.ts`, `class-state.ts`, `school-class.entity.ts`, `modules/classes/src/school-class/provider/class-view-reader.provider.ts`, `modules/classes/src/school-class/usecase/class-item.ts`, `modules/classes/test/mock/school-class.factory.ts`, `modules/classes/test/school-class/model/class-state.test.ts`, `school-class.entity.test.ts`, `modules/classes/test/school-class/usecase/list-week-classes.usecase.test.ts`; verified: `npm test` in modules/classes (248 passed) and `npm run check-types`; deviations: none

- [x] **T-02** — Add `SchoolClassRepository.cancel(id, at, message): Promise<boolean>`, change `update` to return
  `Promise<boolean>` (D-04, D-06), add `ClassChangeNotifier.classCancelled` (`provider/class-change-notifier.provider.ts`,
  event `ClassCancelled`), and extend the fakes in `test/mock/` (`fake-school-class.repository.ts` refusing a
  cancelled class in both methods, `fake-class-change.notifier.ts`) with their tests in `test/school-class/provider/`.
  Covers: enabling · Done when: `npm test --workspace @rochas-surf-school/classes` passes.
  > ✅ 2026-10-17 00:33 — Added SchoolClassRepository.cancel and boolean update, ClassCancelled / ClassChangeNotifier.classCancelled, and extended the fakes (cancelled class refused by both repository methods; notifier records cancelledEvents); files: `modules/classes/src/school-class/provider/school-class.repository.ts`, `modules/classes/src/school-class/provider/class-change-notifier.provider.ts`, `modules/classes/test/mock/fake-school-class.repository.ts`, `modules/classes/test/mock/fake-class-change.notifier.ts`, `modules/classes/test/school-class/provider/fake-school-class.repository.test.ts`, `modules/classes/test/school-class/provider/fake-class-change.notifier.test.ts`; verified: `npm test` in modules/classes (252 passed), `npm run check-types`; deviations: none

- [ ] **T-03** — Add `CancelClass` (`src/school-class/usecase/cancel-class.usecase.ts`, exported from the usecase
  barrel): D-02, D-03, D-04 and D-07, with `test/school-class/usecase/cancel-class.usecase.test.ts` (tests named
  "cancels", "started", "refuses", "notifies", and one per check of D-02).
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-07 · Done when: `npx jest test/school-class/usecase/cancel-class.usecase.test.ts --coverage`
  passes from `modules/classes` with every line of the use case covered.

- [ ] **T-04** — Make `EditClass` (`src/school-class/usecase/edit-class.usecase.ts`) refuse a cancelled class with
  409 `class.cancelled` after the shape and before `class.finished`, pass `cancelledAt` to `getClassState`, and turn
  `update` returning `false` into 409 `class.cancelled` without notifying (D-06), with cases named "cancelled" in
  `test/school-class/usecase/edit-class.usecase.test.ts`.
  Covers: ER-05 · Done when: `npx jest test/school-class/usecase/edit-class.usecase.test.ts` passes from
  `modules/classes`.

### Notifications module (`modules/notifications`)

- [ ] **T-05** — Add `class.cancelled` to `NOTIFICATION_TYPES` (`src/notification/model/notification.entity.ts`)
  with a case in `test/notification/model/notification.entity.test.ts`.
  Covers: ER-07, ER-08 · Done when: `npm test --workspace @rochas-surf-school/notifications` passes.

### Backend (`apps/backend`)

- [ ] **T-06** — Add `cancelledAt` / `cancellationMessage` to `SchoolClass` in `prisma/models/classes.model.prisma`
  and generate the migration `classes-add-cancellation`
  (`npm run prisma:migrate:dev --workspace apps/backend -- --name classes-add-cancellation`); implement `cancel` and
  the conditional `update` (D-04, D-06) in `src/modules/classes/school-class.prisma.ts` and map the two fields in it
  and in `src/modules/classes/class-view-reader.prisma.ts`, with cases in `school-class.prisma.spec.ts` ("cancel",
  "update") and `class-view-reader.prisma.spec.ts`.
  Skill: [`backend-prisma-sync-module`](../../../.claude/skills/backend-prisma-sync-module).
  Covers: ER-01, ER-03, ER-05 · Done when: `npm run prisma:migrate:deploy --workspace apps/backend` applies cleanly and
  `npx vitest run src/modules/classes/school-class.prisma.spec.ts src/modules/classes/class-view-reader.prisma.spec.ts`
  passes from `apps/backend`.

- [ ] **T-07** — Add the D-09 catalog entry for `class.cancelled` to `src/modules/notifications/push-messages.ts`,
  with cases in `push-messages.spec.ts` (both bodies, three locales, blank message).
  Covers: ER-08 · Done when: `npx vitest run src/modules/notifications/push-messages.spec.ts` passes from
  `apps/backend`.

- [ ] **T-08** — Add `classCancelled` to `NotificationsClassChangeNotifier`
  (`src/modules/notifications/notifications.class-change-notifier.ts`, D-08), with cases in its spec.
  Skill: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-07 · Done when: `npx vitest run src/modules/notifications/notifications.class-change-notifier.spec.ts`
  passes from `apps/backend`.

- [ ] **T-09** — Expose `POST /classes/:id/cancel` in `src/modules/classes/classes.controller.ts` (running
  `CancelClass` with the repository, the change notifier and the clock, then answering the class read back as in
  `PUT`), add cases to `classes.controller.spec.ts`, the scenarios to `classes.integration.http`, and the e2e tests of
  ER-01–ER-05 and ER-07 to `test/classes.e2e-spec.ts` (named as their `Verify by`).
  Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-07 · Done when: `npx vitest run src/modules/classes/classes.controller.spec.ts`
  and `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts` pass.

### Mobile (`apps/mobile`)

- [ ] **T-10** — Add `cancelledAt` / `cancellationMessage` to `ClassItem` (`src/modules/classes/classes.types.ts`),
  the `useCancelClass` mutation (`src/modules/classes/hooks/use-cancel-class.hook.ts`), `getCancelClassErrorKey` and
  the `class.cancelled` case of `getEditClassErrorKey` in `src/modules/classes/utils/class-error.ts` (D-10, D-12), with
  `use-cancel-class.hook.test.tsx` and `class-error.test.ts`.
  Covers: ER-10 · Done when: `npx jest src/modules/classes/hooks/use-cancel-class.hook.test.tsx src/modules/classes/utils/class-error.test.ts`
  passes from `apps/mobile`.

- [ ] **T-11** — Draw a cancelled class in `ClassCard` (`src/modules/classes/components/class-card/`, D-14) with the
  `classesWeek.cancelled` copy in `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`, and cases named "cancelled" in its test.
  Covers: ER-11 · Done when: `npx jest src/modules/classes/components/class-card` passes from `apps/mobile`.

- [ ] **T-12** — Add the cancelled banner and the "Mensagem da equipe" card to `ClassDetailsScreen`, and hide the
  pencil for a cancelled class (`src/modules/classes/screens/class-details.screen.tsx` and its hook, D-15), with the
  `classDetails.cancelled` and `classDetails.message` copy and cases named "cancelled" in
  `class-details.screen.test.tsx`.
  Covers: ER-12 · Done when: `npx jest src/modules/classes/screens/class-details.screen.test.tsx` passes from
  `apps/mobile`.

- [ ] **T-13** — Add `CancelClassSheet` (`src/modules/classes/components/cancel-class-sheet/`: component, hook, types,
  index; D-11) with the `cancelClass` copy, and its component test (message, counter, confirm with the trimmed
  message, blank omitted, keep, loading).
  Covers: ER-09, ER-10 · Done when: `npx jest src/modules/classes/components/cancel-class-sheet` passes from
  `apps/mobile`.

- [ ] **T-14** — Wire "Cancelar aula" and `CancelClassSheet` into `EditClassScreen`
  (`src/modules/classes/screens/edit-class.screen.tsx` and its hook: the button in both modes, the request, the
  success toast and back, D-12's errors) and its cancelled state (D-13), with the `editClass.cancel` and
  `editClass.errors.cancelled` copy and cases named "cancel" / "cancelled" in `edit-class.screen.test.tsx`.
  Covers: ER-09, ER-10, ER-13 · Done when: `npx jest src/modules/classes/screens/edit-class.screen.test.tsx` passes
  from `apps/mobile`.

- [ ] **T-15** — Handle `class.cancelled` in `useNotificationResponse` (open the class details of the resolved flow)
  and `useNotificationReceived` (invalidate `["classes"]`) in `src/modules/notifications/hooks/` (D-17), with cases
  in their tests.
  Covers: ER-14 · Done when: `npx jest src/modules/notifications/hooks` passes from `apps/mobile`.

### Verification

- [ ] **T-16** — Run every command in the Verification Plan from the repo root and follow its user journeys; all
  pass. Record the output summary as evidence.
  Covers: all · Done when: every automated command passes (`COVERAGE OK`, `E2E PASSED`) and both journeys show what
  they describe.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 033` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 033` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 033` — the backend e2e suite passes (Postgres up, migrations applied),
    including the `POST /classes/:id/cancel` tests and "PUT /classes/:id refuses a cancelled class".
  - `npm run prisma:migrate:deploy --workspace apps/backend` — the `classes-add-cancellation` migration applies
    cleanly.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
  - `npx turbo run build --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/backend`
    — builds.
- User journeys (iOS simulator, local backend):
  - Cancel a class: as an approved admin, open a class of tomorrow, press the pencil, then "Cancelar aula": the sheet
    "Cancelar esta aula?" opens. Type "Mar muito grande." and press "Cancelar e avisar": "Aula cancelada", back on the
    details with the "Aula cancelada" banner, the "Mensagem da equipe" card and no pencil. Back on the classes
    screen, the card shows "Cancelada" with its time struck through, and the day keeps its dot.
  - Other roles and a started class: sign in as a student: the same card and details (banner and message), no
    pencil. As the admin, create a class starting a minute from now; once it shows "Em andamento", open "Editar
    aula" (instructors only) and cancel it without a message: the details show the banner without a message card.

## Memory Impact

- `memory/product.md` — Current state: admins cancel a class until it finishes, with an optional message; it stays
  on the schedule for everyone as "Cancelada", with the message on its details, can't be edited or cancelled again,
  and its instructors are told (never the admin who cancels). Class concept: `cancelled` is built; deleting and the
  "no instructor" flag come with 034 and 035. Out of scope: move "cancelled classes" out of the 030/032 lists.
- `memory/technical-context.md` — Architecture → Time: `cancelled` is the one stored state (`cancelled_at`), every
  other state still computed from the clock. Classes: `POST /classes/:id/cancel` (body, D-02's order, 200
  `ClassItem`), `CancelClass`, `ClassItem.cancelledAt` / `cancellationMessage`, `getClassState`'s `cancelledAt`,
  `SchoolClassRepository.cancel` and `update` returning `false` (conditional writes on `cancelled_at IS NULL`);
  mobile `useCancelClass`, `getCancelClassErrorKey`, `CancelClassSheet`, the card's and the details' cancelled look.
  Push notifications: `classCancelled` on `ClassChangeNotifier` / `NotificationsClassChangeNotifier`. Persistence:
  the `classes-add-cancellation` migration.
- `memory/structure.md` — the `cancel-class-sheet` component of the classes module.
- `memory/modules/classes.md` — the `cancelled` state (stored, final, wins over the clock), the cancel rules and
  keys (`class.cancellationMessage.max.length`, `class.cancelled`, `class.finished`), exactly one winner, editing a
  cancelled class refused, who can cancel (approved admins) and who is told; the spec history entry.
- `memory/modules/notifications.md` — the `class.cancelled` type, its details and push text, the tap and foreground
  behavior; the spec history entry.

## Assumptions

- Only instructors are notified of a cancellation until enrolment exists; the enrolment spec adds students and
  people with pending requests to the same event and ends their enrolments as `class cancelled`. Accepted by the
  user.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
