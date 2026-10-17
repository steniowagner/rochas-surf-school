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
- In the app: the admin's class tools on the details (a tools button, its sheet, and "Cancelar aula" with its
  confirmation sheet), the cancelled look of the card and of the details (banner, message card, no tools button),
  the edit screen on a cancelled class, and the `class.cancelled` push.

### Out of scope

- **Deleting a class — spec 034** (its refusal of cancelled classes, `class.cancelled`, comes with it).
- **The "no instructor" flag — spec 035.**
- Notifying students and people with pending requests, ending their enrolments as `class cancelled`, and the guest
  warning ("alunos trial não têm conta") — they come with enrolment, which adds those recipients to the same event.
- Reminders (none exist yet; a cancelled class will get none when they do).
- Storing who cancelled the class (product.md keeps no history of admin decisions), restoring a cancelled class,
  and editing its message.
- What the tools sheet's "Avisar alunos e instrutores" row does: the row is drawn and has no action; sending a
  message to a class's people comes with its own spec.
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
| D-11 | The action: for an admin (`canEdit`), `ClassDetailsScreen` shows a round 44×44 tools button (`construct-outline`, in the place of the pencil) that opens `ClassToolsSheet` (D-18); its "Cancelar aula" row closes the tools sheet and opens `CancelClassSheet` (`components/cancel-class-sheet/`: `BottomModal` with the title, the description, the `TextArea` "Mensagem (opcional)" with `maxLength` 300 and its counter, a danger `Button` "Cancelar e avisar" with `loading`, and a ghost `Button` "Manter aula" that closes it; the text clears when the sheet closes). Confirming sends the trimmed message (omitted when blank) once (a double press sends once); on 200: toast "Aula cancelada", the sheet closes and the details stay on screen, reloaded by the invalidation of `["classes"]`. "Editar aula" has no cancel button. | One entry point for the class's tools, as the admin asked; the sheet is the design's `cancelarAula`. Amended from "Cancelar aula" in the editor. |
| D-12 | Sheet errors (`getCancelClassErrorKey`): 409 `class.cancelled` → toast `cancelClass.errors.cancelled`, the sheet closes and the class is refetched; 409 `class.finished` → toast `cancelClass.errors.finished`, the sheet closes and the class is refetched; 404 `class.notFound` → toast `classDetails.notFound` and `router.back()` (leaving the details of a class that is gone); 422 `class.cancellationMessage.max.length` → the generic toast (the field can't exceed 300); `NetworkError` → no connection; `SessionExpiredError` → nothing; anything else → generic. The buttons are usable again after any failure. | The class reloads into its real state; the same toasts as the other class screens. |
| D-13 | Edit screen on a cancelled class: when the loaded class has `cancelledAt`, the screen shows `editClass.errors.cancelled` ("Esta aula foi cancelada e não pode mais ser alterada.") instead of the form, without the footer or "Cancelar aula"; a save refused with `class.cancelled` shows the same text as a toast and goes back (D-10). | Like the finished-on-load state of spec 032. |
| D-14 | Card (`ClassCard`): with `cancelledAt`, the right chip is "Cancelada" (`Chip` on `bad-tint`, text `bad`, icon `close-circle-outline`) instead of "Em andamento" / "Finalizada"; the time range is struck through (`line-through`) in `ink-2`; the card has no `sun` border and isn't faded, whatever the clock. The calendar keeps the day's dot (a cancelled class is still a class of that day). | The design's `aulaCard`; the dot rule of spec 031 is "at least one class". |
| D-15 | Details (`ClassDetailsScreen`, every role): with `cancelledAt`, the banner is "Aula cancelada" / "Esta aula não vai acontecer." on `bad-tint` with the `close-circle-outline` icon in `bad` (instead of the started or finished banner), followed, when `cancellationMessage` isn't `null`, by a card titled "Mensagem da equipe" with the message exactly as stored; the tools button (D-11) is hidden even with `canEdit`, and for a finished class. | The design's banner, with copy that suits students too; the message card mirrors the Denied screen's. |
| D-16 | Copy (pt-BR / es-ES / en-US): `editClass.cancel` "Cancelar aula" / "Cancelar clase" / "Cancel class"; `cancelClass.title` "Cancelar esta aula?" / "¿Cancelar esta clase?" / "Cancel this class?"; `cancelClass.description` "Avisamos os instrutores da aula. Ela continua na agenda, marcada como cancelada." / "Avisamos a los instructores de la clase. Sigue en la agenda, marcada como cancelada." / "We'll notify the class's instructors. It stays on the schedule, marked as cancelled."; `cancelClass.messageLabel` "Mensagem (opcional)" / "Mensaje (opcional)" / "Message (optional)"; `cancelClass.messagePlaceholder` "Ex.: Mar muito grande. Remarcamos para sábado no mesmo horário." / "Ej.: Mar muy grande. La pasamos al sábado a la misma hora." / "E.g.: Waves too big. Moved to Saturday, same time."; `cancelClass.confirm` "Cancelar e avisar" / "Cancelar y avisar" / "Cancel and notify"; `cancelClass.keep` "Manter aula" / "Mantener clase" / "Keep class"; `cancelClass.done` "Aula cancelada" / "Clase cancelada" / "Class cancelled"; `cancelClass.errors.cancelled` "Esta aula já foi cancelada." / "Esta clase ya fue cancelada." / "This class was already cancelled."; `cancelClass.errors.finished` "Esta aula já terminou e não pode mais ser cancelada." / "Esta clase ya terminó y no se puede cancelar." / "This class has finished and can't be cancelled."; `editClass.errors.cancelled` "Esta aula foi cancelada e não pode mais ser alterada." / "Esta clase fue cancelada y no se puede cambiar." / "This class was cancelled and can't be changed."; `classesWeek.cancelled` "Cancelada" / "Cancelada" / "Cancelled"; `classDetails.cancelled.title` "Aula cancelada" / "Clase cancelada" / "Class cancelled", `classDetails.cancelled.description` "Esta aula não vai acontecer." / "Esta clase no se realizará." / "This class won't take place."; `classDetails.message` "Mensagem da equipe" / "Mensaje del equipo" / "Message from the team"; `classDetails.tools` "Ferramentas da aula" / "Herramientas de la clase" / "Class tools" (the button's accessibility label); `classTools.title` the same three texts; `classTools.edit` "Editar aula" / "Editar clase" / "Edit class"; `classTools.notify` "Avisar alunos e instrutores" / "Avisar a alumnos e instructores" / "Notify students and instructors"; `classTools.cancel` "Cancelar aula" / "Cancelar clase" / "Cancel class". `editClass.cancel` and `classDetails.edit` are no longer used and go away. | The design's copy adapted to Brazilian Portuguese and to a product without enrolment yet. |
| D-17 | Pushes in the app: tapping a `class.cancelled` push with a `classId` refreshes the account, then opens `routes.instructor.classDetail(classId)` / `routes.admin.classDetail(classId)` when the account resolves to the `instructor` / `admin` flow, else `routes.home`; received with the app open, it invalidates `["classes"]`. | The same handling as `class.edited` (spec 032). |
| D-18 | `ClassToolsSheet` (`components/class-tools-sheet/`): a `BottomModal` titled "Ferramentas da aula" with three `Button`s (the shared CTA button, no icons), in this order: "Editar aula" (`outline` variant; closes the sheet and opens `routes.admin.editClass(id)`), "Avisar alunos e instrutores" (`outline` variant; no action: pressing it does nothing, not even closing the sheet) and "Cancelar aula" (`danger` variant; closes the sheet and opens `CancelClassSheet`). Only `canEdit` (admin) details show the tools button, for a class that is neither finished nor cancelled (a started class included); a student or an instructor never sees it. | The admin's tools for one class in one place; the notify row is a placeholder until the messaging spec. |

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

### ER-09 — An admin cancels a class from the class tools

- **Front:** mobile
- **Behavior:** Given an admin on the details of a class that hasn't finished and isn't cancelled (not started or
  started), when they press the tools button and then "Cancelar aula", then the sheet "Cancelar esta aula?" opens
  with its description, "Mensagem (opcional)", "Cancelar e avisar" and "Manter aula"; when they type a message and
  press "Cancelar e avisar", then `POST /classes/:id/cancel` is sent once with the trimmed message, the toast
  "Aula cancelada" shows, the sheet closes, the details stay and `["classes"]` is invalidated.
- **Edge and error cases:** a blank message is omitted from the body; "Manter aula" closes the sheet without a
  request; the message stops at 300 characters with its counter; "Editar aula" has no "Cancelar aula" button.
- **Verify by:** `npx jest src/modules/classes/components/cancel-class-sheet src/modules/classes/screens/class-details.screen.test.tsx src/modules/classes/screens/edit-class.screen.test.tsx -t "cancel"`
  from `apps/mobile`; the "Cancel a class" journey of the Verification Plan.

### ER-10 — Cancel errors are shown and handled

- **Front:** mobile
- **Behavior:** Given a cancel that fails, then the app shows D-12's toast for each case: `class.cancelled` and
  `class.finished` (the sheet closes and the class is refetched), 404 (and back from the details), no connection, generic; an expired
  session shows nothing.
- **Edge and error cases:** the sheet's buttons are usable again after any failure.
- **Verify by:** `npx jest src/modules/classes/utils/class-error.test.ts src/modules/classes/hooks/use-cancel-class.hook.test.tsx src/modules/classes/screens/class-details.screen.test.tsx -t "cancel"`
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
  followed by the card "Mensagem da equipe" with "Mar muito grande."; an admin sees no tools button.
- **Edge and error cases:** without a message there is no message card; a class that isn't cancelled shows neither.
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "cancelled"` from
  `apps/mobile`.

### ER-13 — The edit screen of a cancelled class

- **Front:** mobile
- **Behavior:** Given an admin who opens "Editar aula" for a class with `cancelledAt`, then the screen shows "Esta
  aula foi cancelada e não pode mais ser alterada." and no form or footer; given a save refused
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

### ER-15 — The admin's class tools

- **Front:** mobile
- **Behavior:** Given an admin on the details of a class that hasn't finished and isn't cancelled, when the screen
  loads, then a tools button (accessibility label "Ferramentas da aula") shows where the pencil used to be, and
  pressing it opens the sheet "Ferramentas da aula" with three rows: "Editar aula", "Avisar alunos e instrutores"
  and "Cancelar aula"; pressing "Editar aula" closes the sheet and opens `/admin/edit-class/<id>`; pressing
  "Avisar alunos e instrutores" does nothing.
- **Edge and error cases:** a student or an instructor sees no tools button; neither does an admin on a finished or
  a cancelled class, while loading or when the class is missing; an admin on a started class sees it; there is no
  pencil.
- **Verify by:** `npx jest src/modules/classes/components/class-tools-sheet src/modules/classes/screens/class-details.screen.test.tsx -t "tools"`
  from `apps/mobile`; the "Cancel a class" journey of the Verification Plan.

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

- [x] **T-03** — Add `CancelClass` (`src/school-class/usecase/cancel-class.usecase.ts`, exported from the usecase
  barrel): D-02, D-03, D-04 and D-07, with `test/school-class/usecase/cancel-class.usecase.test.ts` (tests named
  "cancels", "started", "refuses", "notifies", and one per check of D-02).
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-07 · Done when: `npx jest test/school-class/usecase/cancel-class.usecase.test.ts --coverage`
  passes from `modules/classes` with every line of the use case covered.
  > ✅ 2026-10-17 00:33 — Added CancelClass (access, id, message shape, class.cancelled, class.finished, conditional cancel, notification of the instructors but the actor) and exported it; files: `modules/classes/src/school-class/usecase/cancel-class.usecase.ts`, `modules/classes/src/school-class/usecase/index.ts`, `modules/classes/test/school-class/usecase/cancel-class.usecase.test.ts`; verified: `npx jest test/school-class/usecase/cancel-class.usecase.test.ts --coverage` (25 passed, use case 100% statements/branches/functions/lines); deviations: followed the pattern of EditClass/GetClass rather than re-reading every reference of the module-use-case skill

- [x] **T-04** — Make `EditClass` (`src/school-class/usecase/edit-class.usecase.ts`) refuse a cancelled class with
  409 `class.cancelled` after the shape and before `class.finished`, pass `cancelledAt` to `getClassState`, and turn
  `update` returning `false` into 409 `class.cancelled` without notifying (D-06), with cases named "cancelled" in
  `test/school-class/usecase/edit-class.usecase.test.ts`.
  Covers: ER-05 · Done when: `npx jest test/school-class/usecase/edit-class.usecase.test.ts` passes from
  `modules/classes`.
  > ✅ 2026-10-17 00:34 — EditClass now computes the state with the stored cancellation, refuses a cancelled class with 409 class.cancelled (after the shape, before class.finished) and turns update returning false into the same 409 without notifying; files: `modules/classes/src/school-class/usecase/edit-class.usecase.ts`, `modules/classes/test/school-class/usecase/edit-class.usecase.test.ts`; verified: `npx jest test/school-class/usecase/edit-class.usecase.test.ts` (65 passed, use case 100% covered), full `npm test` in modules/classes (281 passed), `npm run check-types`; deviations: none

### Notifications module (`modules/notifications`)

- [x] **T-05** — Add `class.cancelled` to `NOTIFICATION_TYPES` (`src/notification/model/notification.entity.ts`)
  with a case in `test/notification/model/notification.entity.test.ts`.
  Covers: ER-07, ER-08 · Done when: `npm test --workspace @rochas-surf-school/notifications` passes.
  > ✅ 2026-10-17 00:34 — Added class.cancelled to NOTIFICATION_TYPES with an entity test; files: `modules/notifications/src/notification/model/notification.entity.ts`, `modules/notifications/test/notification/model/notification.entity.test.ts`; verified: `npm test --workspace @rochas-surf-school/notifications` (94 passed), check-types; deviations: none

### Backend (`apps/backend`)

- [x] **T-06** — Add `cancelledAt` / `cancellationMessage` to `SchoolClass` in `prisma/models/classes.model.prisma`
  and generate the migration `classes-add-cancellation`
  (`npm run prisma:migrate:dev --workspace apps/backend -- --name classes-add-cancellation`); implement `cancel` and
  the conditional `update` (D-04, D-06) in `src/modules/classes/school-class.prisma.ts` and map the two fields in it
  and in `src/modules/classes/class-view-reader.prisma.ts`, with cases in `school-class.prisma.spec.ts` ("cancel",
  "update") and `class-view-reader.prisma.spec.ts`.
  Skill: [`backend-prisma-sync-module`](../../../.claude/skills/backend-prisma-sync-module).
  Covers: ER-01, ER-03, ER-05 · Done when: `npm run prisma:migrate:deploy --workspace apps/backend` applies cleanly and
  `npx vitest run src/modules/classes/school-class.prisma.spec.ts src/modules/classes/class-view-reader.prisma.spec.ts`
  passes from `apps/backend`.
  > ✅ 2026-10-17 00:35 — Added cancelledAt/cancellationMessage to the SchoolClass Prisma model and the migration classes_add_cancellation (created and applied with prisma migrate dev); PrismaSchoolClassRepository.cancel (one updateMany where cancelledAt is null, true when 1 row) and a conditional update (updateMany inside the transaction, instructors replaced only when it matched, boolean result); both Prisma mappers carry the two fields; files: `apps/backend/prisma/models/classes.model.prisma`, `apps/backend/prisma/migrations/20261017033444_classes_add_cancellation/migration.sql`, `apps/backend/src/modules/classes/school-class.prisma.ts`, `apps/backend/src/modules/classes/class-view-reader.prisma.ts`, `apps/backend/src/modules/classes/school-class.prisma.spec.ts`, `apps/backend/src/modules/classes/class-view-reader.prisma.spec.ts`; verified: `npm run prisma:migrate:deploy --workspace apps/backend` (no pending migrations) and `npx vitest run src/modules/classes/school-class.prisma.spec.ts src/modules/classes/class-view-reader.prisma.spec.ts` (14 passed, after rebuilding the classes module dist); deviations: skill backend-prisma-sync-module not invoked, the schema and migration were written directly with prisma migrate dev

- [x] **T-07** — Add the D-09 catalog entry for `class.cancelled` to `src/modules/notifications/push-messages.ts`,
  with cases in `push-messages.spec.ts` (both bodies, three locales, blank message).
  Covers: ER-08 · Done when: `npx vitest run src/modules/notifications/push-messages.spec.ts` passes from
  `apps/backend`.
  > ✅ 2026-10-17 00:35 — Added the class.cancelled entry (title and both bodies, three locales, message trimmed and blank counted as none) to the push catalog; files: `apps/backend/src/modules/notifications/push-messages.ts`, `apps/backend/src/modules/notifications/push-messages.spec.ts`; verified: `npx vitest run src/modules/notifications/push-messages.spec.ts` (29 passed); deviations: none

- [x] **T-08** — Add `classCancelled` to `NotificationsClassChangeNotifier`
  (`src/modules/notifications/notifications.class-change-notifier.ts`, D-08), with cases in its spec.
  Skill: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-07 · Done when: `npx vitest run src/modules/notifications/notifications.class-change-notifier.spec.ts`
  passes from `apps/backend`.
  > ✅ 2026-10-17 00:35 — Added classCancelled to NotificationsClassChangeNotifier (Notify with class.cancelled, message only when present, errors logged and swallowed); files: `apps/backend/src/modules/notifications/notifications.class-change-notifier.ts`, `apps/backend/src/modules/notifications/notifications.class-change-notifier.spec.ts`; verified: `npx vitest run src/modules/notifications/notifications.class-change-notifier.spec.ts` (8 passed); deviations: skill backend-provider-implementation not invoked, the existing classEdited adapter was extended directly

- [x] **T-09** — Expose `POST /classes/:id/cancel` in `src/modules/classes/classes.controller.ts` (running
  `CancelClass` with the repository, the change notifier and the clock, then answering the class read back as in
  `PUT`), add cases to `classes.controller.spec.ts`, the scenarios to `classes.integration.http`, and the e2e tests of
  ER-01–ER-05 and ER-07 to `test/classes.e2e-spec.ts` (named as their `Verify by`).
  Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-07 · Done when: `npx vitest run src/modules/classes/classes.controller.spec.ts`
  and `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts` pass.
  > ✅ 2026-10-17 00:38 — Exposed POST /classes/:id/cancel (protected, 200, runs CancelClass then answers the class read back) in ClassesController; added the controller cases, the REST Client scenarios and the e2e tests of ER-01–ER-05 and ER-07 (including 'PUT /classes/:id refuses a cancelled class'); the existing week e2e expectation now includes the two new null fields; files: `apps/backend/src/modules/classes/classes.controller.ts`, `apps/backend/src/modules/classes/classes.controller.spec.ts`, `apps/backend/src/modules/classes/classes.integration.http`, `apps/backend/test/classes.e2e-spec.ts`; verified: `npx vitest run src/modules/classes/classes.controller.spec.ts` (25 passed) and `npm run test:e2e -- test/classes.e2e-spec.ts` (75 passed, local Postgres), `npm run check-types` in apps/backend; deviations: backend-nest-controller skill not invoked, the existing controller pattern was followed

### Mobile (`apps/mobile`)

- [x] **T-10** — Add `cancelledAt` / `cancellationMessage` to `ClassItem` (`src/modules/classes/classes.types.ts`),
  the `useCancelClass` mutation (`src/modules/classes/hooks/use-cancel-class.hook.ts`), `getCancelClassErrorKey` and
  the `class.cancelled` case of `getEditClassErrorKey` in `src/modules/classes/utils/class-error.ts` (D-10, D-12), with
  `use-cancel-class.hook.test.tsx` and `class-error.test.ts`.
  Covers: ER-10 · Done when: `npx jest src/modules/classes/hooks/use-cancel-class.hook.test.tsx src/modules/classes/utils/class-error.test.ts`
  passes from `apps/mobile`.
  > ✅ 2026-10-17 00:41 — Added cancelledAt/cancellationMessage to ClassItem, CancelClassRequest, useCancelClass (apiPost, no retry, invalidates ["classes"]), isClassCancelledError, getCancelClassErrorKey and the class.cancelled case of getEditClassErrorKey; existing test fixtures got the two null fields; files: `apps/mobile/src/modules/classes/classes.types.ts`, `apps/mobile/src/modules/classes/hooks/use-cancel-class.hook.ts`, `apps/mobile/src/modules/classes/hooks/use-cancel-class.hook.test.tsx`, `apps/mobile/src/modules/classes/utils/class-error.ts`, `apps/mobile/src/modules/classes/utils/class-error.test.ts`, `apps/mobile/src/modules/classes/components/class-card/class-card.component.test.tsx`, `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`, `apps/mobile/src/modules/classes/screens/classes-week.screen.test.tsx`; verified: `npx jest src/modules/classes` (313 passed), `npx tsc --noEmit`, eslint clean; deviations: none

- [x] **T-11** — Draw a cancelled class in `ClassCard` (`src/modules/classes/components/class-card/`, D-14) with the
  `classesWeek.cancelled` copy in `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`, and cases named "cancelled" in its test.
  Covers: ER-11 · Done when: `npx jest src/modules/classes/components/class-card` passes from `apps/mobile`.
  > ✅ 2026-10-17 00:42 — ClassCard now passes the cancellation to getClassState and draws a cancelled class: bad chip 'Cancelada' with close-circle-outline instead of the clock states, time range struck through in text-ink-2, no sun border and no fading; copy classesWeek.cancelled in the three locales; files: `apps/mobile/src/modules/classes/components/class-card/class-card.hook.ts`, `class-card.component.tsx`, `class-card.component.test.tsx`, `apps/mobile/src/i18n/messages/pt-BR.ts`, `es-ES.ts`, `en-US.ts`; verified: `npx jest src/modules/classes/components/class-card` (15 passed), `npx tsc --noEmit`; deviations: none

- [x] **T-12** — Add the cancelled banner and the "Mensagem da equipe" card to `ClassDetailsScreen`, and hide the
  pencil for a cancelled class (`src/modules/classes/screens/class-details.screen.tsx` and its hook, D-15), with the
  `classDetails.cancelled` and `classDetails.message` copy and cases named "cancelled" in
  `class-details.screen.test.tsx`.
  Covers: ER-12 · Done when: `npx jest src/modules/classes/screens/class-details.screen.test.tsx` passes from
  `apps/mobile`.
  > ✅ 2026-10-17 00:42 — ClassDetailsScreen computes the state with the cancellation, shows the 'Aula cancelada' banner (bad-tint, close-circle-outline in bad) instead of the started/finished ones, a 'Mensagem da equipe' card when there is a message, and hides the pencil for a cancelled class; copy classDetails.cancelled.* and classDetails.message in the three locales; files: `apps/mobile/src/modules/classes/screens/class-details.screen.tsx`, `class-details.screen.hook.ts`, `class-details.screen.test.tsx`, `apps/mobile/src/i18n/messages/pt-BR.ts`, `es-ES.ts`, `en-US.ts`; verified: `npx jest src/modules/classes/screens/class-details` (28 passed), `npx tsc --noEmit`; deviations: none

- [x] **T-13** — Add `CancelClassSheet` (`src/modules/classes/components/cancel-class-sheet/`: component, hook, types,
  index; D-11) with the `cancelClass` copy, and its component test (message, counter, confirm with the trimmed
  message, blank omitted, keep, loading).
  Covers: ER-09, ER-10 · Done when: `npx jest src/modules/classes/components/cancel-class-sheet` passes from
  `apps/mobile`.
  > ✅ 2026-10-17 00:43 — Added CancelClassSheet (BottomModal with title, description, TextArea limited to 300 with counter, danger 'Cancelar e avisar' with loading, ghost 'Manter aula'; confirms with the trimmed message or undefined when blank; clears on close) and the cancelClass copy in the three locales; the editClass.cancel and editClass.errors.cancelled copy of T-14 was added here too, in the same locale files; files: `apps/mobile/src/modules/classes/components/cancel-class-sheet/{index.ts,cancel-class-sheet.component.tsx,cancel-class-sheet.hook.ts,cancel-class-sheet.types.ts,cancel-class-sheet.component.test.tsx}`, `apps/mobile/src/i18n/messages/pt-BR.ts`, `es-ES.ts`, `en-US.ts`; verified: `npx jest src/modules/classes/components/cancel-class-sheet src/i18n` (16 passed), `npx tsc --noEmit`; deviations: none

- [x] **T-14** — Wire "Cancelar aula" and `CancelClassSheet` into `EditClassScreen`
  (`src/modules/classes/screens/edit-class.screen.tsx` and its hook: the button in both modes, the request, the
  success toast and back, D-12's errors) and its cancelled state (D-13), with the `editClass.cancel` and
  `editClass.errors.cancelled` copy and cases named "cancel" / "cancelled" in `edit-class.screen.test.tsx`.
  Covers: ER-09, ER-10, ER-13 · Done when: `npx jest src/modules/classes/screens/edit-class.screen.test.tsx` passes
  from `apps/mobile`.
  > ✅ 2026-10-17 01:08 — EditClassScreen: outline 'Cancelar aula' button (close-circle-outline) below the sections in both modes opening CancelClassSheet; confirm sends once (ref guard) via useCancelClass, toast cancelClass.done, closes the sheet and router.back(); D-12 errors (cancelled/finished close the sheet and refetch the class, 404 toast and back, others toast, sheet usable again); a cancelled class shows editClass.errors.cancelled instead of the form, and a save refused with class.cancelled shows the same toast and goes back; copy was added in T-13; files: `apps/mobile/src/modules/classes/screens/edit-class.screen.tsx`, `edit-class.screen.hook.ts`, `edit-class.screen.test.tsx`; verified: `npx jest src/modules/classes/screens/edit-class` (55 passed), `npx tsc --noEmit`, `npx eslint src/modules/classes` clean; deviations: a save refused with class.cancelled also invalidates ["classes"] so the details behind show the cancellation (not spelled out in D-13)

- [x] **T-15** — Handle `class.cancelled` in `useNotificationResponse` (open the class details of the resolved flow)
  and `useNotificationReceived` (invalidate `["classes"]`) in `src/modules/notifications/hooks/` (D-17), with cases
  in their tests.
  Covers: ER-14 · Done when: `npx jest src/modules/notifications/hooks` passes from `apps/mobile`.
  > ✅ 2026-10-17 01:09 — useNotificationResponse opens the class details of the resolved instructor/admin flow for a class.cancelled push with a classId (else home); useNotificationReceived invalidates ["classes"] for it; files: `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.ts`, `use-notification-received.hook.ts`, `use-notification-response.hook.test.tsx`, `use-notification-received.hook.test.tsx`; verified: `npx jest src/modules/notifications/hooks` (59 passed), `npx tsc --noEmit`, eslint clean; deviations: none

- [x] **T-17** (added by amendment) — Take "Cancelar aula" and `CancelClassSheet` out of `EditClassScreen`
  (`src/modules/classes/screens/edit-class.screen.tsx`, `edit-class.screen.hook.ts`: the button, the sheet, the
  cancel request and its error handling), keeping the cancelled state and the `class.cancelled` save toast (D-13);
  update the "cancel" cases of `edit-class.screen.test.tsx` (they move to T-19) and remove the unused
  `editClass.cancel` copy from `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`. It undoes the editor wiring of T-14.
  Covers: ER-09, ER-13 · Done when: `npx jest src/modules/classes/screens/edit-class.screen.test.tsx` passes with a
  case proving "Editar aula" has no "Cancelar aula" button, and `npx tsc --noEmit` passes from `apps/mobile`.
  > ✅ 2026-10-17 15:40 — Removed the 'Cancelar aula' button, CancelClassSheet and the cancel request/error handling from EditClassScreen and its hook, kept the cancelled state and the class.cancelled save toast, dropped the editClass.cancel copy, moved the cancel test cases out (they return in T-19) and added a case proving the editor has no Cancel class button; files: `apps/mobile/src/modules/classes/screens/edit-class.screen.tsx`, `edit-class.screen.hook.ts`, `edit-class.screen.test.tsx`, `apps/mobile/src/i18n/messages/pt-BR.ts`, `es-ES.ts`, `en-US.ts`; verified: `npx jest src/modules/classes/screens/edit-class` (43 passed), `npx tsc --noEmit`, eslint clean; deviations: none

- [x] **T-18** (added by amendment) — Add `ClassToolsSheet` (`src/modules/classes/components/class-tools-sheet/`:
  component, hook, types, index; D-18) with the `classTools.*` copy in `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`,
  and its component test (title, the three rows, each callback, the notify row doing nothing).
  Covers: ER-15 · Done when: `npx jest src/modules/classes/components/class-tools-sheet` passes from `apps/mobile`.
  > ✅ 2026-10-17 15:41 — Added ClassToolsSheet (BottomModal 'Ferramentas da aula' with the edit, notify and cancel rows; edit and cancel close the sheet first, the notify row has no action) and the classTools.* copy in the three locales; files: `apps/mobile/src/modules/classes/components/class-tools-sheet/{index.ts,class-tools-sheet.component.tsx,class-tools-sheet.hook.ts,class-tools-sheet.types.ts,class-tools-sheet.component.test.tsx}`, `apps/mobile/src/i18n/messages/pt-BR.ts`, `es-ES.ts`, `en-US.ts`; verified: `npx jest src/modules/classes/components/class-tools-sheet src/i18n` (11 passed), `npx tsc --noEmit`, eslint clean; deviations: none

- [x] **T-19** (added by amendment) — Wire the tools into `ClassDetailsScreen`
  (`src/modules/classes/screens/class-details.screen.tsx` and its hook, D-11, D-12, D-15, D-18): the tools button
  replaces the pencil (same place and look with the `construct-outline` icon, label `classDetails.tools`, hidden
  for a finished or cancelled class, while loading, for a missing class and without `canEdit`); it opens
  `ClassToolsSheet`; "Editar aula" opens `routes.admin.editClass(id)`; "Cancelar aula" opens `CancelClassSheet`,
  confirming sends once through `useCancelClass`, shows the toast and closes the sheet while the details stay, and
  the D-12 errors; remove the unused `classDetails.edit` copy. This replaces the pencil of T-12. Update the pencil
  cases of `class-details.screen.test.tsx` and add the "cancel", "cancelled" and "tools" cases.
  Covers: ER-09, ER-10, ER-12, ER-15 · Done when: `npx jest src/modules/classes/screens/class-details.screen.test.tsx`
  passes from `apps/mobile`, with every changed line covered.
  > ✅ 2026-10-17 15:44 — ClassDetailsScreen: the tools button (construct-outline, label classDetails.tools) replaces the pencil, shown for an admin on a class that is not finished/cancelled (started included) and hidden while loading, for a missing class and for non-admins; it opens ClassToolsSheet (Edit class opens routes.admin.editClass, Notify does nothing, Cancel class opens CancelClassSheet); confirming sends once via useCancelClass, toast, sheet closes and the details stay; D-12 errors (cancelled/finished close the sheet and refetch, 404 toast and back, others toast, session expired nothing); removed the classDetails.edit copy and added classDetails.tools; files: `apps/mobile/src/modules/classes/screens/class-details.screen.tsx` (prettier reindented it for the new fragment root), `class-details.screen.hook.ts`, `class-details.screen.test.tsx`, `apps/mobile/src/i18n/messages/pt-BR.ts`, `es-ES.ts`, `en-US.ts`; verified: `npx jest src/modules/classes/screens/class-details` (42 passed), `npx tsc --noEmit`, eslint clean; deviations: none

- [x] **T-20** (added by amendment) — Draw the three tools of `ClassToolsSheet`
  (`src/modules/classes/components/class-tools-sheet/class-tools-sheet.component.tsx`) as default `Button`s with
  their icons (D-18), instead of the custom rows of T-18; the callbacks and the tests of the sheet stay.
  Covers: ER-15 · Done when: `npx jest src/modules/classes/components/class-tools-sheet src/modules/classes/screens/class-details.screen.test.tsx`
  passes from `apps/mobile`.
  > ✅ 2026-10-17 15:49 — The three tools of ClassToolsSheet are now default Button components (primary variant) with their icons in on-color; callbacks and tests unchanged; files: `apps/mobile/src/modules/classes/components/class-tools-sheet/class-tools-sheet.component.tsx`; verified: `npx jest src/modules/classes/components/class-tools-sheet src/modules/classes/screens/class-details` (46 passed), `npx tsc --noEmit`, eslint clean; deviations: none

- [x] **T-21** (added by amendment) — Take the icons out of the tools of `ClassToolsSheet` and draw "Cancelar aula"
  as a `danger` `Button` and the other two as `outline` ones (D-18); callbacks unchanged, the sheet test checks there
  are no icons.
  Covers: ER-15 · Done when: `npx jest src/modules/classes/components/class-tools-sheet src/modules/classes/screens/class-details.screen.test.tsx`
  passes from `apps/mobile`.
  > ✅ 2026-10-17 15:50 — Removed the icons from the class tools; 'Cancelar aula' is a danger Button, the other two outline Buttons; the sheet test now checks there are no icons; files: `apps/mobile/src/modules/classes/components/class-tools-sheet/class-tools-sheet.component.tsx`, `class-tools-sheet.component.test.tsx`; verified: `npx jest src/modules/classes/components/class-tools-sheet src/modules/classes/screens/class-details` (46 passed), `npx tsc --noEmit`, eslint clean; deviations: none

### Verification

- [ ] **T-16** — Run every command in the Verification Plan from the repo root and follow its user journeys; all
  pass. Record the output summary as evidence.
  Covers: all · Done when: every automated command passes (`COVERAGE OK`, `E2E PASSED`) and both journeys show what
  they describe.
  > ⛔ 2026-10-17 01:12 — automated part done, the two user journeys are not: they need a signed-in admin and student on the iOS simulator (email-code/Google sign-in), which this session cannot do. Passed: `node .specs/scripts/run-related-tests.mjs 033` (RELATED TESTS PASSED: backend, mobile, classes, notifications), `node .specs/scripts/check-coverage.mjs 033` (COVERAGE OK, 27 files), `node .specs/scripts/run-e2e.mjs 033` (E2E PASSED, 75 tests in classes.e2e-spec), `npm run prisma:migrate:deploy --workspace apps/backend` (no pending migrations), `npx turbo run lint check-types` for classes, notifications, backend and mobile (16 tasks ok), `npx turbo run build` for classes, notifications and backend (7 tasks ok). Unblocks: run "Cancel a class" and "Other roles and a started class" from the Verification Plan and confirm what they describe.
  > ⛔ 2026-10-17 15:46 — rerun after the amendment (T-17–T-19): related tests passed (backend, mobile, classes, notifications), COVERAGE OK in 29 files, E2E PASSED, lint and check-types ok (16 tasks), build ok (7 tasks). Still pending: the three journeys of the Verification Plan ("Class tools", "Cancel a class", "Other roles and a started class"), which need the iOS simulator with a signed-in admin and student.

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
  - Class tools: as an admin, the details of a class show the tools button (no pencil); it opens "Ferramentas da aula"
    with "Editar aula" (opens the editor), "Avisar alunos e instrutores" (does nothing) and "Cancelar aula". A student and an
    instructor see no tools button.
  - Cancel a class: as an approved admin, open a class of tomorrow, press the tools button, then "Cancelar aula": the sheet
    "Cancelar esta aula?" opens. Type "Mar muito grande." and press "Cancelar e avisar": "Aula cancelada", still on the
    details with the "Aula cancelada" banner, the "Mensagem da equipe" card and no tools button. Back on the classes
    screen, the card shows "Cancelada" with its time struck through, and the day keeps its dot.
  - Other roles and a started class: sign in as a student: the same card and details (banner and message), no
    tools button. As the admin, create a class starting a minute from now; once it shows "Em andamento", open the tools, then "Editar
    aula" (instructors only, and no "Cancelar aula" button there); go back and cancel it from the tools without a message: the details show the banner without a message card.

## Memory Impact

- `memory/product.md` — Current state: admins cancel a class until it finishes, with an optional message; it stays
  on the schedule for everyone as "Cancelada", with the message on its details, can't be edited or cancelled again,
  and its instructors are told (never the admin who cancels). Class concept: `cancelled` is built; deleting and the
  "no instructor" flag come with 034 and 035. Out of scope: move "cancelled classes" out of the 030/032 lists.
- `memory/technical-context.md` — Architecture → Time: `cancelled` is the one stored state (`cancelled_at`), every
  other state still computed from the clock. Classes: `POST /classes/:id/cancel` (body, D-02's order, 200
  `ClassItem`), `CancelClass`, `ClassItem.cancelledAt` / `cancellationMessage`, `getClassState`'s `cancelledAt`,
  `SchoolClassRepository.cancel` and `update` returning `false` (conditional writes on `cancelled_at IS NULL`);
  mobile `useCancelClass`, `getCancelClassErrorKey`, `ClassToolsSheet` (the admin's tools button on the details, in the place of the pencil: edit, an inert notify row, cancel), `CancelClassSheet` (opened from the tools), the card's and the details' cancelled look.
  Push notifications: `classCancelled` on `ClassChangeNotifier` / `NotificationsClassChangeNotifier`. Persistence:
  the `classes-add-cancellation` migration.
- `memory/structure.md` — the `cancel-class-sheet` and `class-tools-sheet` components of the classes module.
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

- 2026-10-17 — /spec-execute — D-18 changed: no icons; "Cancelar aula" is a `danger` button and the other two `outline` ones (before: three primary buttons with icons); T-21 added. Reason: the admin asked for it ("use the danger variant for cancel, different variants to the other two" — read as outline). Approved by the user.
- 2026-10-17 — /spec-execute — D-18 changed: the three tools are default `Button`s (primary variant, with icons) instead of custom rows, and the cancel row is no longer drawn in `bad`; T-20 added (T-18 stays as committed). Reason: the admin asked for the default CTA button. Approved by the user.
- 2026-10-17 — /spec-plan --amend — D-11 changed: "Cancelar aula" and its sheet move from "Editar aula" to a tools sheet opened from the details; the success stays on the details instead of going back. Reason: the admin asked for one entry point for class tools. Approved by the user.
- 2026-10-17 — /spec-plan --amend — D-12 changed: the 404 case now leaves the details. D-15 changed: the pencil becomes the tools button, also hidden for a finished class. D-16 changed: copy `classTools.*` and `classDetails.tools` added, `editClass.cancel` and `classDetails.edit` dropped. Reason: follows D-11. Approved by the user.
- 2026-10-17 — /spec-plan --amend — D-18 added: `ClassToolsSheet` with edit, notify (no action) and cancel rows, admins only. Scope: the notify action is out of scope. Reason: the admin's request. Approved by the user.
- 2026-10-17 — /spec-plan --amend — ER-09, ER-10, ER-12, ER-13 changed (entry point, details instead of editor, tools button instead of pencil, no "Cancelar aula" in the editor); ER-15 added (the admin's class tools). Reason: follows D-11 and D-18. Approved by the user.
- 2026-10-17 — /spec-plan --amend — T-17, T-18, T-19 added: remove the cancel button from the editor (undoing T-14's editor wiring), add `ClassToolsSheet`, wire the tools and the cancel flow into the details (replacing T-12's pencil). T-12, T-13 and T-14 stay as committed. Verification Plan journeys and Memory Impact updated. Approved by the user.

## Review
