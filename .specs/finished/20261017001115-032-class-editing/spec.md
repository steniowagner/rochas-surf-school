---
id: "032"
slug: class-editing
title: "Editing a class"
status: finished
created: 2026-10-16
started: 2026-10-16
base_commit: eddd36f3a935ddb68e819c1a65d0f4a17ffe6197
reviewed_commit: 8c094b2c418d1eb9de21be2f06a9300336451a06
fronts: [classes, notifications, backend, mobile]
depends_on: []
finished: 2026-10-17
---

# 032 — Editing a class

## Goal

An approved admin edits one class after it exists. Before the class starts, any field can change, but its start can
never move into the past. Once it has started, only its instructors can change. Once it has finished, nothing can.
The capacity can't go below the seats taken (always zero until enrolment exists, but the rule is built here).
Instructors who are kept, added or removed are notified, never the admin who edits. This is the first of four specs
that let admins manage classes; cancelling, deleting and the "no instructor" flag follow as 033, 034 and 035.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: Class (its lifecycle by the clock, "can be
  edited (never into the past)", "only cancelling and changing instructors" once started, "frozen" once finished),
  the decisions "A batch isn't kept … each class is edited on its own" and "All times are America/Fortaleza".
- Requirements:
  - [requirements.md → Editing a class](../../../.docs/requirements.md#editing-a-class) — admins edit a single
    class; an edit never moves its start into the past.
  - [requirements.md → Edit notifications](../../../.docs/requirements.md#edit-notifications) — students, people
    with pending requests and instructors are notified; only instructors can be here (D-07).
  - [requirements.md → Changes after a class starts](../../../.docs/requirements.md#changes-after-a-class-starts)
    — a started class only changes its instructors (cancelling comes with 033); a finished class doesn't change.
  - [requirements.md → Assigning instructors](../../../.docs/requirements.md#assigning-instructors) — removing an
    instructor from a class, and notifying assigned and removed instructors.
  - [requirements.md → Capacity](../../../.docs/requirements.md#capacity) — the capacity can't go below the seats
    taken (D-06).
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Classes, Architecture
  (permissions in use cases, time computed from the clock), Persistence (all-or-nothing writes in one
  `$transaction`), External integrations → Push notifications (ports per module, adapters that log and swallow),
  Fixed conventions (Mobile routes, Mobile shared UI, Error messages are translation keys), Automated validation.
  Module rules: [modules/classes.md](../../memory/modules/classes.md),
  [modules/notifications.md](../../memory/modules/notifications.md).
- Designs: `.docs/designs/admin-app.html`, "Editor de aula" (`abrirForm`, `editorScreen`, `guardarForm`) and the
  details' pencil (`aulaScreen`, `editar`). The file is a bundle: its sources unpack from the `__bundler/manifest`
  script (gzip + base64). Its copy is European Portuguese; this spec adapts it to Brazilian Portuguese (D-15).
- Existing code this builds on:
  - `modules/classes/src/school-class/` — `SchoolClass` (with `clone` from `Entity`), `getClassState`, the limits,
    `isValidIsoDate` and the time-range helpers in `model/`; `CreateClassBatch` (shape checks, `TeacherLookup`,
    `notifyInstructors`); `GetClass` and `toClassItem`; the ports in `provider/`; fakes in `modules/classes/test/mock/`.
  - `modules/classes/src/access/class-actor.ts` — `assertCanManageClasses`.
  - `modules/notifications/src/notification/model/notification.entity.ts` — `NOTIFICATION_TYPES`.
  - `apps/backend/src/modules/classes/` — `ClassesController`, `PrismaSchoolClassRepository`,
    `PrismaClassViewReader`, `PrismaTeacherLookup`, `SystemClockProvider`; `apps/backend/test/classes.e2e-spec.ts`
    (fixed clock, fake Expo provider).
  - `apps/backend/src/modules/notifications/` — `NotificationsClassAssignmentNotifier`, `push-messages.ts`
    (`renderPush`), `expo.push.ts` (push `data`).
  - `apps/mobile/src/modules/classes/` — `NewClassScreen` and its sections (`DateRangeCalendar`, `TimeRangePicker`,
    `TimeRangeSheet`, `LocationPicker`, `LocationSheet`, `CapacityStepper`, `InstructorPicker`, `FormSection`),
    `ClassDetailsScreen`, `useClass`, `useTeachers`, `utils/class-error.ts`, `utils/calendar.ts`, `utils/week.ts`.
  - `apps/mobile/src/modules/notifications/hooks/` — `useNotificationResponse`, `useNotificationReceived`.
  - `apps/mobile/src/constants/routes.ts`, `apps/mobile/src/app/(private)/admin/class/[id].tsx`,
    `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`.

## Scope

### In scope

- `PUT /classes/:id` for approved admins: every field of a class that hasn't started; only the instructors of a
  started class; nothing on a finished one; the past-start and capacity rules; adding and removing instructors.
- The `class.edited` and `class.unassigned` notification types, their push text in pt-BR, es and en, and
  `class.assigned` (count 1) for instructors added by an edit.
- In the app: the admin's pencil on the class details, the "Editar aula" screen, the started-class mode, the error
  handling, and what tapping or receiving the two new pushes does.

### Out of scope

- **Cancelling a class — spec 033.** Already decided: a stored `cancelledAt` with an optional message (trimmed, up
  to 300 characters, blank = none), shown to everyone in a "Mensagem da equipe" card on the details and as the push
  body; the class stays in the week with a "Cancelada" chip and its time struck through, and the details show the
  "Aula cancelada" banner without the pencil; `class.cancelled` goes to its instructors except the admin who
  cancels; a cancelled class can't be edited, cancelled again or deleted (409 `class.cancelled`), a finished one
  can't be cancelled (409 `class.finished`); concurrent actions resolve to exactly one winner. Editing a cancelled
  class is therefore not refused by this spec — no class can be cancelled yet.
- **Deleting a class — spec 034.** Already decided: only before the class starts (409 `class.started`), never a
  cancelled one, and only with nobody holding a seat or a pending request (409 `class.delete.notEmpty`, the app
  offering "Cancelar aula" instead, as the design's "Não dá para apagar" sheet); confirmation sheet;
  `class.deleted` to its instructors except the admin.
- **The "no instructor" flag — spec 035.** Already decided: account deletion (spec 026) unassigns the person from the
  classes that haven't started; a class left with nobody stays scheduled and is flagged (computed: not started and
  no instructor, never stored); approved admins get `class.noInstructor`; the role-change and removal specs reuse
  the same use case. An edit can never leave a class without an instructor (`class.instructors.required`).
- Notifying students and people with pending requests of an edit, and the guest warning — they come with
  enrolment, which adds those recipients to the same event.
- Recomputing the cancellation deadline after an edit (the cancellation-rule spec), reminders, and what happens to
  `classes.created_by` when an account is erased (the erasure spec).
- Editing several classes at once, or a batch: each class is edited on its own.
- The "Cancelar aula" and "Apagar aula" buttons of the design's editor (specs 033 and 034), its seat and
  pending-request counts in the footer note, and its "gerir" (manage time ranges and locations) links.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | `PUT /classes/:id` (protected) with body `{ discipline, level, date, start, end, locationId, instructorIds, capacity, notes? }`: `date` is `YYYY-MM-DD` and `start` / `end` are `HH:mm`, all America/Fortaleza, the class ending on its start day; the use case turns them into `startsAt` / `endsAt` in UTC. `notes` is trimmed and a blank or absent value is stored as none. It answers 200 with the updated `ClassItem` (`toClassItem`, the same shape as `GET /classes/:id`). The whole class is sent every time; on a started class the app sends the stored values back with the new instructors. | One shape for every state, comparable field by field; it mirrors the batch's local dates and times, so the phone's time zone never matters. |
| D-02 | Use case `EditClass` (`modules/classes/src/school-class/usecase/edit-class.usecase.ts`). Order of checks: access (`assertCanManageClasses`: 403 `user.status.notApproved`, then `user.role.notAdmin`); the id (not a UUID, or no class → 404 `class.notFound`, no lookup for a non-UUID); the shape, every problem in one 422 `ValidationException`: `class.discipline.invalid`, `class.level.invalid`, `class.date.invalid` (missing, malformed or impossible), `class.time.invalid` (`start` or `end` missing or not `HH:mm`), `class.time.endBeforeStart` (end not after start, only when both are valid), `class.capacity.invalid` (not an integer 1–20), `class.notes.max.length` (longer than 300 after trimming, or not text), `class.instructors.required` (not an array, or empty), `class.location.required` (not a non-blank string); then, alone and in order, against the stored class and the clock: 409 `class.finished` (now ≥ `endsAt`); 409 `class.started` (now ≥ `startsAt` and any field other than the instructors differs from the stored one); 422 `class.location.notFound`; 422 `class.instructors.invalid`; 422 `class.startsAt.past` (the class hasn't started and the new start is at or before now); 422 `class.capacity.belowSeatsTaken` with `details: { seatsTaken }` (capacity below the seat count). Repeated instructor ids count once. | The batch's keys and order where the meaning is the same; new keys only for what a single class has (one time range). `DomainError` 409 for a state conflict, 422 for invalid data, as the module already does. |
| D-03 | "Differs" compares, after the shape is valid: discipline, level, `startsAt`, `endsAt`, location id, capacity and the trimmed notes (`null` for none) for the class fields; the instructors as a set (order ignored). A save where nothing differs is accepted (200) and changes nothing — not even `updatedAt` — and notifies nobody. | An accidental save must not send pushes; the set comparison keeps the order of the list irrelevant. |
| D-04 | Eligibility: only **added** instructor ids (in the request, not on the class) must be approved instructors or admins (`TeacherLookup`), else `class.instructors.invalid`; ids already on the class are kept as they are, whatever their role or status now. | A substitute must be swappable on a started class even when a kept co-instructor's role changed since (demotion keeps people on started classes, per product.md). |
| D-05 | Persistence: `SchoolClassRepository` gains `findById(id)` (the class with its instructor ids, or `null`) and `update(schoolClass)`; `PrismaSchoolClassRepository.update` writes the class row and replaces its `class_instructors` rows in one `$transaction`. Two admins saving the same class at once: the last save wins; each save's state checks use the class it read, and each sends its own notifications. | All or nothing, like `createMany`; a lock or version column would be new machinery for a rare case, and nothing is lost that the next save can't fix. |
| D-06 | Seats taken come from a new port `SeatCounter` (`provider/seat-counter.provider.ts`, `countSeatsTaken(classId): Promise<number>`), implemented in the backend by `NoEnrolmentSeatCounter` (`apps/backend/src/modules/classes/no-enrolment.seat-counter.ts`), which answers 0. The enrolment spec replaces the implementation with approved enrolments plus guests. | The rule belongs to editing and is unit-tested with a fake now; with capacity ≥ 1 and 0 seats it can't fail in the API until enrolment exists. |
| D-07 | Notifications, all after the class is stored, never to the admin who edits (even when teaching it), and only to instructors (students and pending requests come with enrolment): instructors on the class before and after get `class.edited` `{ classId, discipline, startsAt }` (the class's new discipline and start, ISO UTC) when any class field differs (D-03); added instructors get the existing `class.assigned` `{ count: 1, discipline }` (and not `class.edited`); removed instructors get `class.unassigned` `{ classId, discipline, startsAt }`. A change of instructors alone notifies only the added and removed ones. A notifier that throws is swallowed in the use case and logged in the adapter; it never changes the answer. | The design's "Guardar e notificar" says who hears; one notification per person per save keeps it quiet; the same failure rule as `class.assigned`. |
| D-08 | Ports: `ClassAssignmentNotifier` gains `classUnassigned({ instructorIds, classId, discipline, startsAt })`; a new `ClassChangeNotifier` (`provider/class-change-notifier.provider.ts`) has `classEdited({ instructorIds, classId, discipline, startsAt })`, the port 033 and 034 extend. Backend adapters: `NotificationsClassAssignmentNotifier.classUnassigned` and a new `NotificationsClassChangeNotifier` (`apps/backend/src/modules/notifications/notifications.class-change-notifier.ts`), both running `Notify` and logging and swallowing every error, exported by `NotificationsModule`. | Same boundary as spec 028: classes knows no notification types, notifications knows no class rules. |
| D-09 | Push text (`push-messages.ts`), the start formatted in America/Fortaleza as `dd/MM` and `HH:mm` (en: `MM/dd`), `{discipline}` "Surf" / "Skate": `class.edited` — pt-BR "Aula alterada" / "A aula de {discipline} de {dd/MM} às {HH:mm} foi alterada. Abra o app para ver."; es "Clase modificada" / "La clase de {discipline} del {dd/MM} a las {HH:mm} cambió. Abre la app para verla."; en "Class changed" / "Your {discipline} class on {MM/dd} at {HH:mm} was changed. Open the app to see it." `class.unassigned` — pt-BR "Você saiu de uma aula" / "Você não dá mais a aula de {discipline} de {dd/MM} às {HH:mm}."; es "Saliste de una clase" / "Ya no das la clase de {discipline} del {dd/MM} a las {HH:mm}."; en "Removed from a class" / "You're no longer teaching the {discipline} class on {MM/dd} at {HH:mm}." The date and time are formatted by the backend in code (no locale-dependent `Intl` output), so the text is the same on every machine. | A push is drawn by the OS without the app, so the backend writes it (Fixed conventions); fixed formatting keeps the tests exact. |
| D-10 | The push `data` (`ExpoPushProvider`) becomes `{ type, notificationId, classId? }`: `classId` is copied from the notification's params when it is a string, and absent otherwise. | A tap must open one class; the existing types don't carry it and stay unchanged. |
| D-11 | Mobile route: `/admin/edit-class/[id]` (`apps/mobile/src/app/(private)/admin/edit-class/[id].tsx`, `routes.admin.editClass(id)`), a route of the admin `Stack` outside `(tabs)`, rendering `EditClassScreen` (`modules/classes/screens/edit-class.screen.tsx` + `.hook.ts`). It loads `useClass(id)` and the same queries as Nova aula (`useLocations`, `useTimeRangeSuggestions`, `useTeachers`) and starts from the class's values. | A separate route avoids moving `class/[id].tsx` into a folder; the same sections keep one form. |
| D-12 | Edit form: the Nova aula sections, with **"Dia"** — `DateRangeCalendar` with a new `single` prop (pressing a day selects only it; no range, no removed days), no day before today — and **"Início e fim"** — `TimeRangePicker` with a new `single` prop (pressing a chip selects only it; pressing the selected one keeps it). The chips are the class's own range (always listed), last week's suggestions and the ranges added with "Novo horário" (`TimeRangeSheet`); when the chosen day is today, a range starting at or before now is blocked, except the class's own range while the class hasn't started. The `InstructorPicker` lists the teachers plus the class's current instructors that aren't among them (by the names the class carries), so they can be removed. Each section's hint is shown as in Nova aula; instructors need at least one. | The design's editor ("Dia", "Início e fim", one chip selected); listing kept non-teachers follows D-04. |
| D-13 | Edit screen states: loading (`grape` `ActivityIndicator`); a failed load with "Tentar novamente"; a 404 shows "Esta aula não existe mais." without the form; a class finished when loaded shows the `class.finished` message without the form. A started class shows a `sun` banner ("A aula já começou" / "Só dá para trocar os instrutores.") and only the Instructors section. The footer has the note "Ao salvar, avisamos os instrutores da aula." and the primary button "Salvar e notificar", enabled only when the form is valid and at least one field differs from the loaded class (D-03 semantics); a double press sends once. On 200: toast "Alterações salvas", `router.back()` to the details, and `["classes", "week"]` and `["classes", "detail", id]` are invalidated. | The design's editor and banner, without counts that need enrolment; a disabled button prevents a save that would notify nobody. |
| D-14 | Edit errors (`getEditClassErrorKey` in `utils/class-error.ts`): 409 `class.started` → toast `editClass.errors.started` and the class refetched (the screen switches to the started mode); 409 `class.finished` → toast `editClass.errors.finished` and back; 404 `class.notFound` → toast `classDetails.notFound` and back; 422 `class.startsAt.past` → `newClass.errors.past`; `class.instructors.invalid` and `class.location.notFound` → their Nova aula toasts with the teachers or locations refetched; `class.capacity.belowSeatsTaken` → `editClass.errors.seatsTaken` with `details.seatsTaken`; `NetworkError` → no connection; `SessionExpiredError` → nothing; anything else → the generic toast. | The same handling as Nova aula, plus the edit's own conflicts. |
| D-15 | Copy (pt-BR / es-ES / en-US), under `editClass`: title "Editar aula" / "Editar clase" / "Edit class"; `day.label` "Dia" / "Día" / "Day", `day.hint` "Qualquer dia a partir de hoje" / "Cualquier día desde hoy" / "Any day from today"; `time.label` "Início e fim" / "Inicio y fin" / "Start and end"; `started.title` "A aula já começou" / "La clase ya empezó" / "The class has started", `started.description` "Só dá para trocar os instrutores." / "Solo se pueden cambiar los instructores." / "Only the instructors can be changed."; `note` "Ao salvar, avisamos os instrutores da aula." / "Al guardar, avisamos a los instructores de la clase." / "When you save, the class's instructors are notified."; `submit` "Salvar e notificar" / "Guardar y notificar" / "Save and notify"; `saved` "Alterações salvas" / "Cambios guardados" / "Changes saved"; `errors.started` "A aula já começou: só dá para trocar os instrutores." / "La clase ya empezó: solo se pueden cambiar los instructores." / "The class has started: only the instructors can be changed."; `errors.finished` "Esta aula já terminou e não pode mais ser alterada." / "Esta clase ya terminó y no se puede cambiar." / "This class has finished and can't be changed."; `errors.seatsTaken` "A lotação não pode ficar abaixo das {{count}} vagas ocupadas." / "La capacidad no puede quedar por debajo de las {{count}} plazas ocupadas." / "Capacity can't go below the {{count}} seats taken."; `classDetails.edit` (the pencil's accessibility label) "Editar aula" / "Editar clase" / "Edit class". The other labels reuse `newClass`. | The design's copy adapted to Brazilian Portuguese ("Guardar" → "Salvar", "Só podes" → "Só dá para"), as spec 030 did. |
| D-16 | The pencil: `ClassDetailsScreen` gets a `canEdit` prop, set only by `app/(private)/admin/class/[id].tsx`. With `canEdit`, a loaded class that hasn't finished (by `getClassState` and `useNow`) shows a round 44×44 pt `TouchableOpacity` with a pencil icon at the right of the header (`bg-surface`, `shadowStyle()`), opening `routes.admin.editClass(id)`; a finished class, a loading, failed or missing one shows none. | The design's `editar` button; instructors and students stay read-only. |
| D-17 | Pushes in the app: tapping a `class.edited` or `class.unassigned` push with a `classId` refreshes the account, then opens `routes.instructor.classDetail(classId)` / `routes.admin.classDetail(classId)` when the account resolves to the `instructor` / `admin` flow, else `routes.home`; without a `classId`, `routes.home`. Received with the app open, both invalidate `["classes"]` (weeks and details). | Like `class.assigned` (spec 030): `resolveFlow` alone decides access; the class itself is where the change is. |

## Expected Results

### ER-01 — An admin edits a class that hasn't started

- **Front:** backend
- **Behavior:** Given an approved admin and a class of a batch that starts tomorrow, when they call `PUT /classes/:id`
  changing discipline, level, date, times, location, capacity and notes, then the API answers 200 with the updated
  `ClassItem` (new `startsAt` / `endsAt` from the Fortaleza date and times, trimmed notes), `GET /classes/:id`
  returns the same values, and the other classes of the batch are unchanged.
- **Edge and error cases:** blank notes are stored as none (`notes: null`); moving the class to another week moves
  it in `GET /classes?date=`; a save where nothing differs answers 200 and leaves `updatedAt` untouched.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts -t "PUT /classes/:id edits a class that hasn't started"`
  and `npx jest test/school-class/usecase/edit-class.usecase.test.ts -t "edits every field"` from `modules/classes`.

### ER-02 — The start never moves into the past

- **Front:** backend
- **Behavior:** Given a class that hasn't started, when an admin sends a date and start at or before the server's
  now (yesterday, or earlier today), then the API answers 422 with `errors: ["class.startsAt.past"]` and the class is
  unchanged.
- **Edge and error cases:** a start one minute after now is accepted; keeping the class's own future start is
  accepted.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts -t "PUT /classes/:id refuses a start in the past"`
  and `npx jest test/school-class/usecase/edit-class.usecase.test.ts -t "past"` from `modules/classes`.

### ER-03 — A started class only changes its instructors

- **Front:** backend
- **Behavior:** Given a class that has started and not finished, when an admin sends the stored values with a
  different set of instructors, then the API answers 200 and the class has the new instructors; when any other
  field differs (for example the location), then it answers 409 with `errors: ["class.started"]` and nothing
  changes.
- **Edge and error cases:** a class whose start is exactly now counts as started; sending the stored values with
  the same instructors answers 200 and changes nothing.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts -t "PUT /classes/:id on a started class"`
  and `npx jest test/school-class/usecase/edit-class.usecase.test.ts -t "started"` from `modules/classes`.

### ER-04 — A finished class doesn't change

- **Front:** backend
- **Behavior:** Given a class whose end is at or before now, when an admin calls `PUT /classes/:id` with any body
  that has a valid shape, then the API answers 409 with `errors: ["class.finished"]` and nothing changes.
- **Edge and error cases:** the same body with nothing changed is also refused; a malformed body still answers its
  422 shape errors first.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts -t "PUT /classes/:id refuses a finished class"`
  and `npx jest test/school-class/usecase/edit-class.usecase.test.ts -t "finished"` from `modules/classes`.

### ER-05 — The capacity can't go below the seats taken

- **Front:** classes
- **Behavior:** Given a class with 8 seats taken (the `SeatCounter` fake answering 8), when an admin sets its
  capacity to 6, then `EditClass` throws a 422 `DomainError` `class.capacity.belowSeatsTaken` with
  `details: { seatsTaken: 8 }` and the repository is not written; a capacity of 8 is accepted.
- **Edge and error cases:** the API's `NoEnrolmentSeatCounter` answers 0 for any class, so any valid capacity is
  accepted through the API until enrolment exists.
- **Verify by:** `npx jest test/school-class/usecase/edit-class.usecase.test.ts -t "seats taken"` from
  `modules/classes`; `npx vitest run src/modules/classes/no-enrolment.seat-counter.spec.ts` from `apps/backend`.

### ER-06 — Access, missing class, shape and lookups are checked

- **Front:** backend
- **Behavior:** Given the endpoint, then: an instructor or student answers 403 `user.role.notAdmin`, a non-approved
  admin 403 `user.status.notApproved`, no token 401; an unknown or non-UUID id 404 `class.notFound`; an invalid body
  422 with every shape key of D-02 together; an unknown location 422 `class.location.notFound`; an **added** id that
  isn't an approved instructor or admin 422 `class.instructors.invalid`. Nothing changes on any refusal.
- **Edge and error cases:** an instructor already on the class who is now a student can be kept (200); `end` equal
  to `start` is `class.time.endBeforeStart`; repeated instructor ids count once; an empty `instructorIds` is
  `class.instructors.required`.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts -t "PUT /classes/:id refuses"`
  and `npx jest test/school-class/usecase/edit-class.usecase.test.ts` from `modules/classes`.

### ER-07 — Kept, added and removed instructors are notified

- **Front:** classes
- **Behavior:** Given a class taught by A, B and the editing admin E, when E changes its time, removes B and adds C,
  then A gets `class.edited` `{ classId, discipline, startsAt }` (the new start), C gets `class.assigned`
  `{ count: 1, discipline }`, B gets `class.unassigned` `{ classId, discipline, startsAt }`, and E gets nothing.
- **Edge and error cases:** a change of instructors alone sends only `class.assigned` / `class.unassigned`; a save
  where nothing differs sends nothing; a notifier that throws doesn't change the 200 answer or the stored class.
- **Verify by:** `npx jest test/school-class/usecase/edit-class.usecase.test.ts -t "notifies"` from
  `modules/classes`; `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts -t "PUT /classes/:id notifies"`
  (stored notifications and the fake Expo messages).

### ER-08 — The two new pushes have their text and the class id

- **Front:** backend
- **Behavior:** Given a `class.edited` or `class.unassigned` notification for a Surf class starting at
  2026-10-18 11:00Z, when it is pushed, then the title and body are D-09's in the device's locale (pt-BR "A aula de
  Surf de 18/10 às 08:00 foi alterada. Abra o app para ver.", en "Your Surf class on 10/18 at 08:00 was changed.
  Open the app to see it.") and `data` is `{ type, notificationId, classId }`.
- **Edge and error cases:** an existing type (`class.assigned`, `registration.*`) keeps `data` without `classId`;
  `class.edited` and `class.unassigned` are accepted by the `Notification` entity.
- **Verify by:** `npx vitest run src/modules/notifications/push-messages.spec.ts src/modules/notifications/expo.push.spec.ts`
  from `apps/backend`; `npx jest test/notification/model/notification.entity.test.ts` from `modules/notifications`.

### ER-09 — Only admins see the pencil, and not on finished classes

- **Front:** mobile
- **Behavior:** Given the class details, when an admin opens a class that hasn't started or has started, then a
  pencil button labelled "Editar aula" shows in the header and opens `/admin/edit-class/<id>`; on a finished class
  it doesn't show.
- **Edge and error cases:** an instructor or a student never sees it; nothing shows while loading, after a failed
  load or for a missing class.
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "pencil"` from `apps/mobile`.

### ER-10 — The edit screen saves a change

- **Front:** mobile
- **Behavior:** Given an admin on "Editar aula" for a class that hasn't started, then the form shows the class's
  discipline, level, day, its own time range selected, location, capacity, notes and instructors; "Salvar e
  notificar" is disabled until a field changes and the form is valid; when they pick another day and time and press
  it, then `PUT /classes/:id` is sent once with D-01's body, the toast "Alterações salvas" shows, the app goes back
  to the details and the week and details reload.
- **Edge and error cases:** removing every instructor disables the button with the "pick one" hint; on today's date
  a time that has already started is blocked; a class instructor who is no longer a teacher is listed and can be
  removed; loading, failed-load-with-retry, 404 and finished-on-load states show no form.
- **Verify by:** `npx jest src/modules/classes/screens/edit-class.screen.test.tsx` from `apps/mobile`; the "Edit a
  class" journey of the Verification Plan.

### ER-11 — A started class only offers its instructors

- **Front:** mobile
- **Behavior:** Given an admin on "Editar aula" for a class that has started, then the screen shows the banner "A
  aula já começou" / "Só dá para trocar os instrutores." and only the Instructors section; after swapping an
  instructor and saving, the request carries the stored values with the new instructors.
- **Edge and error cases:** with the same instructors the button stays disabled.
- **Verify by:** `npx jest src/modules/classes/screens/edit-class.screen.test.tsx -t "started"` from `apps/mobile`.

### ER-12 — Edit errors are shown and handled

- **Front:** mobile
- **Behavior:** Given a save that fails, then the app shows D-14's toast for each key: `class.started` (and the class
  is refetched), `class.finished` (and back), 404 (and back), `class.startsAt.past`, `class.instructors.invalid`
  (teachers refetched), `class.location.notFound` (locations refetched), `class.capacity.belowSeatsTaken` with the
  count, no connection, generic; an expired session shows nothing.
- **Edge and error cases:** the button is usable again after any failure.
- **Verify by:** `npx jest src/modules/classes/utils/class-error.test.ts src/modules/classes/screens/edit-class.screen.test.tsx -t "error"`
  from `apps/mobile`.

### ER-13 — The new pushes open the class and refresh the classes

- **Front:** mobile
- **Behavior:** Given a `class.edited` or `class.unassigned` push with a `classId`, when an instructor taps it, then
  the account is refreshed and `/instructor/class/<classId>` opens (`/admin/class/<classId>` for an admin); when one
  arrives with the app open, `["classes"]` is invalidated.
- **Edge and error cases:** an account that no longer resolves to the instructor or admin flow, or a push without a
  `classId`, goes to `/`.
- **Verify by:** `npx jest src/modules/notifications/hooks/use-notification-response.hook.test.tsx src/modules/notifications/hooks/use-notification-received.hook.test.tsx -t "class."`
  from `apps/mobile`.

## Tasks

### Classes module (`modules/classes`)

- [x] **T-01** — Add the ports: `SchoolClassRepository.findById` / `update` (D-05), `SeatCounter`
  (`src/school-class/provider/seat-counter.provider.ts`, D-06), `ClassAssignmentNotifier.classUnassigned` and
  `ClassChangeNotifier` (`src/school-class/provider/class-change-notifier.provider.ts`, D-08), exported from the
  provider barrel; extend the fakes in `test/mock/` (`fake-school-class.repository.ts`,
  `fake-class-assignment.notifier.ts`, new `fake-seat.counter.ts` and `fake-class-change.notifier.ts`, the mock
  barrel) with tests of the repository fake's new methods in `test/school-class/provider/`.
  Covers: enabling · Done when: `npm test --workspace @rochas-surf-school/classes` and
  `npm run check-types --workspace @rochas-surf-school/classes` pass.
  > ✅ 2026-10-16 22:46 — added `SchoolClassRepository.findById`/`update`, `SeatCounter`, `ClassChangeNotifier` (`classEdited`), `ClassAssignmentNotifier.classUnassigned`, exported from the provider barrel; fakes extended (`FakeSchoolClassRepository` with `updateCalls`, `FakeClassAssignmentNotifier.unassignedEvents`, new `FakeClassChangeNotifier`, `FakeSeatCounter`); files: `modules/classes/src/school-class/provider/{school-class.repository,class-assignment-notifier.provider,seat-counter.provider,class-change-notifier.provider,index}.ts`, `modules/classes/test/mock/{fake-school-class.repository,fake-class-assignment.notifier,fake-seat.counter,fake-class-change.notifier,index}.ts`, `modules/classes/test/school-class/provider/fake-school-class.repository.test.ts`; verified: `npm test` in modules/classes (182 passed), `npm run check-types` clean; deviations: none (the new fakes for the seat counter and change notifier are exercised by T-02's tests)

- [x] **T-02** — Add `EditClass` (`src/school-class/usecase/edit-class.usecase.ts`, exported from the usecase
  barrel): D-01–D-04 and D-06–D-07 — access, 404, shape, finished, started, location, added instructors, past start,
  seats taken, the D-03 comparison, the update and the notifications — with
  `test/school-class/usecase/edit-class.usecase.test.ts` (tests named "edits every field", "past", "started",
  "finished", "seats taken", "notifies", and one per shape key and refusal).
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-06, ER-07 · Done when: `npx jest test/school-class/usecase/edit-class.usecase.test.ts --coverage`
  passes from `modules/classes` with every line of the use case covered.
  > ✅ 2026-10-16 22:47 — added `EditClass` (access, 404, shape, finished, started, location, added-instructor eligibility, past start, seats taken, D-03 comparison, update, notifications; the editing admin is never notified; notifier failures swallowed) and exported `toInstant` from the batch model to reuse its Fortaleza conversion; files: `modules/classes/src/school-class/usecase/edit-class.usecase.ts`, `modules/classes/src/school-class/usecase/index.ts`, `modules/classes/src/school-class/model/class-batch.ts`, `modules/classes/test/school-class/usecase/edit-class.usecase.test.ts`; verified: `npx jest test/school-class/usecase/edit-class.usecase.test.ts --coverage` from modules/classes (61 passed, edit-class.usecase.ts 100% statements/branches/functions/lines), whole module suite and `check-types` pass; deviations: use case returns `{ id }` (the controller reads the `ClassItem` through `ClassViewReader`)

### Notifications module (`modules/notifications`)

- [x] **T-03** — Add `class.edited` and `class.unassigned` to `NOTIFICATION_TYPES`
  (`src/notification/model/notification.entity.ts`) with cases in `test/notification/model/notification.entity.test.ts`.
  Covers: ER-07, ER-08 · Done when: `npm test --workspace @rochas-surf-school/notifications` passes.
  > ✅ 2026-10-16 22:47 — added `class.edited` and `class.unassigned` to `NOTIFICATION_TYPES`; files: `modules/notifications/src/notification/model/notification.entity.ts`, `modules/notifications/test/notification/model/notification.entity.test.ts`; verified: `npm test` in modules/notifications passes, `check-types` clean; deviations: none

### Backend (`apps/backend`)

- [x] **T-04** — Add the D-09 catalog entries for `class.edited` and `class.unassigned` to
  `src/modules/notifications/push-messages.ts` (with the Fortaleza `dd/MM` / `MM/dd` and `HH:mm` formatting) and
  D-10's `classId` to the push `data` in `src/modules/notifications/expo.push.ts`, with cases in `push-messages.spec.ts`
  and `expo.push.spec.ts`.
  Covers: ER-08 · Done when: `npx vitest run src/modules/notifications/push-messages.spec.ts src/modules/notifications/expo.push.spec.ts`
  passes from `apps/backend`.
  > ✅ 2026-10-16 22:48 — added the `class.edited` / `class.unassigned` catalog entries in pt-BR, es and en, with the start formatted by hand in Fortaleza (fixed UTC-3, no Intl; `dd/MM` or `MM/dd`, `HH:mm`), and `classId` in the push data when the params carry a string; files: `apps/backend/src/modules/notifications/push-messages.ts`, `apps/backend/src/modules/notifications/expo.push.ts`, `apps/backend/src/modules/notifications/push-messages.spec.ts`, `apps/backend/src/modules/notifications/expo.push.spec.ts`; verified: `npx vitest run src/modules/notifications/push-messages.spec.ts src/modules/notifications/expo.push.spec.ts` (29 passed), tsc and eslint clean; deviations: none

- [x] **T-05** — Add `classUnassigned` to `NotificationsClassAssignmentNotifier` and the new
  `NotificationsClassChangeNotifier` (`src/modules/notifications/notifications.class-change-notifier.ts`), both
  logging and swallowing errors (D-08), provided and exported by `notifications.module.ts`, with their specs.
  Skill: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-07 · Done when: `npx vitest run src/modules/notifications/notifications.class-assignment-notifier.spec.ts src/modules/notifications/notifications.class-change-notifier.spec.ts`
  passes from `apps/backend`.
  > ✅ 2026-10-16 22:48 — added `classUnassigned` to `NotificationsClassAssignmentNotifier` and the new `NotificationsClassChangeNotifier` (both run `Notify`, send `startsAt` as ISO text, log and swallow every error), provided and exported by `NotificationsModule`; files: `apps/backend/src/modules/notifications/notifications.class-assignment-notifier.ts`, `apps/backend/src/modules/notifications/notifications.class-assignment-notifier.spec.ts`, `apps/backend/src/modules/notifications/notifications.class-change-notifier.ts`, `apps/backend/src/modules/notifications/notifications.class-change-notifier.spec.ts`, `apps/backend/src/modules/notifications/notifications.module.ts`; verified: `npx vitest run src/modules/notifications` from apps/backend (14 files, 70 passed), no tsc errors in notifications; deviations: none

- [x] **T-06** — Implement `findById` and `update` (one `$transaction`: the class row, then its `class_instructors`
  replaced) in `src/modules/classes/school-class.prisma.ts`, and add `NoEnrolmentSeatCounter`
  (`src/modules/classes/no-enrolment.seat-counter.ts`, answers 0), with `school-class.prisma.spec.ts` and
  `no-enrolment.seat-counter.spec.ts`. Skill: [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-01, ER-05 · Done when: `npx vitest run src/modules/classes/school-class.prisma.spec.ts src/modules/classes/no-enrolment.seat-counter.spec.ts`
  passes from `apps/backend`.
  > ✅ 2026-10-16 22:49 — implemented `findById` and `update` (one `$transaction`: class row updated, its `class_instructors` deleted and recreated) in `PrismaSchoolClassRepository`, and added `NoEnrolmentSeatCounter` (answers 0); files: `apps/backend/src/modules/classes/school-class.prisma.ts`, `apps/backend/src/modules/classes/school-class.prisma.spec.ts`, `apps/backend/src/modules/classes/no-enrolment.seat-counter.ts`, `apps/backend/src/modules/classes/no-enrolment.seat-counter.spec.ts`; verified: `npx vitest run src/modules/classes/school-class.prisma.spec.ts src/modules/classes/no-enrolment.seat-counter.spec.ts` from apps/backend (7 passed); deviations: none (registration in the module is T-07)

- [x] **T-07** — Expose `PUT /classes/:id` in `src/modules/classes/classes.controller.ts` (running `EditClass` with
  the repository, the location repository, the teacher lookup, both notifiers, the seat counter and the clock),
  register `NoEnrolmentSeatCounter` in `classes.module.ts`, add the scenarios to `classes.integration.http`, cases
  to `classes.controller.spec.ts`, and the e2e tests of ER-01–ER-04, ER-06 and ER-07 to `test/classes.e2e-spec.ts`
  (named as their `Verify by`). Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-06, ER-07 · Done when: `npx vitest run src/modules/classes/classes.controller.spec.ts`
  and `npm run test:e2e --workspace apps/backend -- test/classes.e2e-spec.ts` pass.
  > ✅ 2026-10-16 22:50 — exposed `PUT /classes/:id` (runs `EditClass`, then answers the class through `GetClass`, so the shape is `GET /classes/:id`'s), injected `NotificationsClassChangeNotifier` and `NoEnrolmentSeatCounter` (registered in `ClassesModule`), added the scenarios to `classes.integration.http`, controller cases and 15 e2e tests under `PUT /classes/:id` (edit, blank notes/instructor replace, no-change, past, started, finished, shape, endBeforeStart, 404, lookups, kept non-teacher, access, notifies ×4); files: `apps/backend/src/modules/classes/classes.controller.ts`, `apps/backend/src/modules/classes/classes.controller.spec.ts`, `apps/backend/src/modules/classes/classes.module.ts`, `apps/backend/src/modules/classes/classes.integration.http`, `apps/backend/test/classes.e2e-spec.ts`; verified: `npx vitest run src/modules/classes/classes.controller.spec.ts` (19 passed) and `npm run test:e2e -- test/classes.e2e-spec.ts` (60 passed, Postgres up), `tsc --noEmit` clean; deviations: none

### Mobile (`apps/mobile`)

- [x] **T-08** — Add the `EditClassRequest` type (`src/modules/classes/classes.types.ts`), the `useEditClass`
  mutation (`src/modules/classes/hooks/use-edit-class.hook.ts`: `apiPut` without retry, invalidating
  `["classes", "week"]` and `["classes", "detail", id]` on success) and `getEditClassErrorKey` with
  `isClassStartedError` / `isClassFinishedError` in `src/modules/classes/utils/class-error.ts` (D-14), with
  `use-edit-class.hook.test.tsx` and `class-error.test.ts`.
  Covers: ER-12 · Done when: `npx jest src/modules/classes/hooks/use-edit-class.hook.test.tsx src/modules/classes/utils/class-error.test.ts`
  passes from `apps/mobile`.
  > ✅ 2026-10-16 22:54 — added `EditClassRequest`, `useEditClass` (`apiPut`, no retry, invalidates the weeks and the class's details) and, in `class-error.ts`, `isClassStartedError` / `isClassFinishedError` / `isClassNotFoundError`, `getSeatsTaken` (reads `details.seatsTaken`) and `getEditClassErrorKey` (D-14; the screen passes `count` to `editClass.errors.seatsTaken`); files: `apps/mobile/src/modules/classes/classes.types.ts`, `apps/mobile/src/modules/classes/hooks/use-edit-class.hook.ts`, `apps/mobile/src/modules/classes/hooks/use-edit-class.hook.test.tsx`, `apps/mobile/src/modules/classes/utils/class-error.ts`, `apps/mobile/src/modules/classes/utils/class-error.test.ts`; verified: `npx jest src/modules/classes/hooks/use-edit-class.hook.test.tsx src/modules/classes/utils/class-error.test.ts` from apps/mobile (passed, run together with T-09's suites: 54 passed), `tsc --noEmit` clean; deviations: `getEditClassErrorKey` returns only the key; the seats count comes from the extra `getSeatsTaken` helper, and `isClassNotFoundError` was added for the 404 branch

- [x] **T-09** — Add the `single` mode to `DateRangeCalendar` (`components/date-range-calendar/`) and to
  `TimeRangePicker` (`components/time-range-picker/`), as D-12 describes, with their component tests.
  Covers: ER-10 · Done when: `npx jest src/modules/classes/components/date-range-calendar src/modules/classes/components/time-range-picker`
  passes from `apps/mobile`.
  > ✅ 2026-10-16 22:54 — added `single` to `DateRangeCalendar` (a press selects only that day; no summary under the grid) and to `TimeRangePicker` (a press selects only that chip, the selected one stays; chips of ranges that started today are blocked except the new optional `ownRange`; no overlap or past hint); the press logic lives in the picker's hook (`pressChip`); files: `apps/mobile/src/modules/classes/components/date-range-calendar/date-range-calendar.{component.tsx,hook.ts,types.ts,component.test.tsx}`, `apps/mobile/src/modules/classes/components/time-range-picker/time-range-picker.{component.tsx,hook.ts,types.ts,component.test.tsx}`; verified: `npx jest src/modules/classes/components/date-range-calendar src/modules/classes/components/time-range-picker` from apps/mobile (passed), `tsc --noEmit` clean; deviations: added the optional `ownRange` prop to carry D-12's exception for the class's own range

- [x] **T-10** — Add `EditClassScreen` (`src/modules/classes/screens/edit-class.screen.tsx`, `.hook.ts`, `.types.ts`)
  per D-11–D-14, the route `src/app/(private)/admin/edit-class/[id].tsx`, `routes.admin.editClass(id)` in
  `src/constants/routes.ts`, and the D-15 copy in `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`, with
  `edit-class.screen.test.tsx` (prefill, single day and time, disabled until changed, save, started mode, states,
  every error of D-14).
  Covers: ER-10, ER-11, ER-12 · Done when: `npx jest src/modules/classes/screens/edit-class.screen.test.tsx` passes
  from `apps/mobile`.
  > ✅ 2026-10-16 23:07 — added `EditClassScreen` (+ hook and types) at `/admin/edit-class/[id]`: prefill from `useClass`, single day and single time, the class's own range always listed, kept non-teacher instructors listed so they can be removed, started-class mode (banner + instructors only, stored values sent back), loading / failed-load-with-retry / 404 / finished states, the disabled-until-changed button, double-press guard and every D-14 error (a `class.started` also switches the screen to started mode at once, as the server may be ahead of the phone's clock); `routes.admin.editClass`; the D-15 copy in pt-BR, es-ES and en-US (`editClass.*`, `classDetails.edit`); files: `apps/mobile/src/modules/classes/screens/edit-class.screen.tsx`, `.../edit-class.screen.hook.ts`, `.../edit-class.screen.types.ts`, `.../edit-class.screen.test.tsx`, `apps/mobile/src/app/(private)/admin/edit-class/[id].tsx`, `apps/mobile/src/constants/routes.ts`, `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`; verified: `npx jest src/modules/classes/screens/edit-class.screen.test.tsx` from apps/mobile (35 tests passed), `tsc --noEmit` and eslint clean; deviations: `startedByServer` state so ER-11/D-14's switch to started mode doesn't depend on the phone clock

- [x] **T-11** — Add the `canEdit` prop and the pencil (D-16) to `ClassDetailsScreen`
  (`src/modules/classes/screens/class-details.screen.tsx`, its hook and types), passed by
  `src/app/(private)/admin/class/[id].tsx`, with cases named "pencil" in `class-details.screen.test.tsx`.
  Covers: ER-09 · Done when: `npx jest src/modules/classes/screens/class-details.screen.test.tsx` passes from
  `apps/mobile`.
  > ✅ 2026-10-16 23:07 — added `canEdit` to `ClassDetailsScreen` (hook returns `showEdit` — admin, class loaded and not finished — and `edit`, which pushes `routes.admin.editClass(id)`): a round 44×44 `TouchableOpacity` pencil (`bg-surface`, `shadowStyle('iconButton')`) at the right of the header, labelled "Editar aula"; `admin/class/[id].tsx` passes `canEdit`; files: `apps/mobile/src/modules/classes/screens/class-details.screen.tsx`, `.../class-details.screen.hook.ts`, `.../class-details.screen.types.ts`, `.../class-details.screen.test.tsx`, `apps/mobile/src/app/(private)/admin/class/[id].tsx`; verified: `npx jest src/modules/classes/screens/class-details.screen.test.tsx` (22 passed, the 6 "pencil" cases included); deviations: none (the `classDetails.edit` copy came with T-10's copy)

- [x] **T-12** — Handle `class.edited` and `class.unassigned` in `useNotificationResponse` (open the class details
  of the resolved flow, D-17) and `useNotificationReceived` (invalidate `["classes"]`) in
  `src/modules/notifications/hooks/`, with cases in their tests.
  Covers: ER-13 · Done when: `npx jest src/modules/notifications/hooks` passes from `apps/mobile`.
  > ✅ 2026-10-16 23:07 — `useNotificationResponse` opens the class details of the resolved flow (`/instructor/class/<id>`, `/admin/class/<id>`) for a `class.edited` / `class.unassigned` push with a string `classId`, else falls through to `routes.home`; `useNotificationReceived` invalidates `["classes"]` for both; files: `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.ts`, `.../use-notification-response.hook.test.tsx`, `.../use-notification-received.hook.ts`, `.../use-notification-received.hook.test.tsx`; verified: `npx jest src/modules/notifications/hooks` from apps/mobile (all suites passed); deviations: none

### Verification

- [x] **T-13** — Run every command in the Verification Plan from the repo root and follow its user journey; all
  pass. Record the output summary as evidence.
  Covers: all · Done when: every automated command passes (`COVERAGE OK`, `E2E PASSED`) and both journeys show what
  they describe.
  > ✅ 2026-10-16 23:16 — ran the Verification Plan from the repo root: `node .specs/scripts/check-coverage.mjs 032` → COVERAGE OK (26 files; the first run flagged 4 mobile files, fixed by commit 'cover every changed line…' with extra tests and by dropping unreachable default parameters); `node .specs/scripts/run-e2e.mjs 032` → E2E PASSED (backend: 15 files, 405 tests); `npx turbo run lint check-types --filter=classes --filter=notifications --filter=backend --filter=mobile` → 16 tasks successful; `npx turbo run build` for classes, notifications and backend → 7 tasks successful; `node .specs/scripts/run-related-tests.mjs 032` → backend, modules/classes (243) and modules/notifications (92) pass; apps/mobile 856 passed and 7 failed, all in the three existing tab-navigation suites (`admin-tabs`, `instructor-tabs`, `student-tabs`.navigation.test.tsx), which build a class that starts one hour from the wall clock — they fail when the run is after 23:00 in Fortaleza (the class falls on the next day, outside the day the week view shows) and pass 16/16 with the clock fixed at midday (checked with temporary copies, since deleted); they were not touched by this spec. ⚠ user journeys (iOS simulator) NOT driven by me: they need the backend and an admin account signed in on a fresh native build. What to do and see — (1) as an approved admin open Aulas, then a class of tomorrow: the pencil shows in the header; press it: "Editar aula" opens with the class's values, its time chip selected and "Salvar e notificar" disabled; pick the day after and another time chip: the button enables; press it: "Alterações salvas", back on the details with the new day and time, and on Aulas the class is on the new day; a finished class shows no pencil; as an instructor no class shows a pencil. (2) create a class today starting a minute from now; when it shows "Em andamento" press the pencil: the "A aula já começou" banner and only the instructors show; add an instructor and save: "Alterações salvas" and the details list both. The same behaviors are covered by the screen tests and the e2e suite; deviations: journeys left to the user

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 032` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 032` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 032` — the backend e2e suite passes (Postgres up, migrations applied),
    including the `PUT /classes/:id` tests of ER-01–ER-04, ER-06 and ER-07.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
  - `npx turbo run build --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/backend`
    — builds.
- User journeys (iOS simulator, local backend):
  - Edit a class: as an approved admin, open Aulas, then a class of tomorrow: the pencil shows in the header. Press
    it: "Editar aula" opens with the class's values, its time chip selected and "Salvar e notificar" disabled. Pick
    the day after and another time chip: the button enables; press it: "Alterações salvas", back on the details with
    the new day and time; back on Aulas, the class is on the new day. Open a finished class: no pencil. Sign in as an
    instructor: no pencil on any class.
  - Started class: as the admin, create a class today starting a minute from now; once it shows "Em andamento", press
    the pencil: the "A aula já começou" banner and only the instructors show; add another instructor and save:
    "Alterações salvas" and the details list both instructors.

## Memory Impact

- `memory/product.md` — Current state: admins edit one class (every field before it starts, only the instructors
  once started, nothing once finished; never into the past; capacity never below the seats taken), and instructors
  are told when a class they teach is edited, when they are added (`class.assigned`) or removed from one. Class
  concept: editing is built; cancelling, deleting and the "no instructor" flag come with 033–035. Out of scope: move
  "editing … classes and unassigning instructors" out of the 028/030 lists, keeping cancelling, deleting and the
  flag.
- `memory/technical-context.md` — Classes: `PUT /classes/:id` (body, D-02's keys and order, 200 `ClassItem`),
  `EditClass`, `SchoolClassRepository.findById` / `update`, the `SeatCounter` port with `NoEnrolmentSeatCounter`
  (0 until enrolment); mobile `EditClassScreen` (`/admin/edit-class/[id]`, `useEditClass`, `getEditClassErrorKey`),
  the `single` modes of `DateRangeCalendar` and `TimeRangePicker`, the details' `canEdit`. Push notifications:
  `ClassChangeNotifier` / `NotificationsClassChangeNotifier`, `classUnassigned`, and the push `data.classId`. Fixed
  conventions → Mobile routes: `/admin/edit-class/[id]` among the inner screens.
- `memory/structure.md` — the `/admin/edit-class/[id]` route and the `edit-class` screen of the classes module.
- `memory/modules/classes.md` — the editing rules (states, the D-03 comparison, eligibility of added instructors,
  past start, seats taken, last save wins), the new error keys (`class.time.invalid`, `class.time.endBeforeStart`,
  `class.started`, `class.finished`, `class.capacity.belowSeatsTaken`), who can edit (approved admins) and who is
  notified; the spec history entry.
- `memory/modules/notifications.md` — the `class.edited` and `class.unassigned` types, their details and push text,
  `classId` in the push data, the tap and foreground behavior; the spec history entry.

## Assumptions

- Seats taken are always zero until the enrolment spec: the capacity rule is proven only by unit tests with a fake
  `SeatCounter`, and the API can't refuse a capacity for it yet. Accepted by the user.
- The admin who edits a class they teach is never notified of their own edit, matching the batch rule of spec 028.
  Accepted by the user.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review

### Round 1 — 2026-10-16 — changes-requested

**Checks**

- lint ✅ (1 warning, F-03) · type check ✅ · build ✅ (classes, notifications, backend, mobile; build for the first three)
- related tests ❌ — backend 121 passed, modules/classes 243 passed, modules/notifications 92 passed; apps/mobile 856
  passed, 7 failed (F-01); rerun red again
- coverage of the changed lines ✅ `COVERAGE OK` (26 files); no coverage-ignore comments in the diff
- e2e: backend suite ✅ `E2E PASSED` (15 files, 405 tests) · mobile: both Verification Plan journeys driven in the iOS
  simulator (a second simulator, signed in as the admin review account, local backend) ✅

**Expected Results**

- ER-01 ✅ — e2e "edits a class that hasn't started", "stores blank notes as none…", "answers 200 and leaves updatedAt
  untouched…"; use case "edits every field"
- ER-02 ✅ — e2e "refuses a start in the past", "accepts a start one minute after now"; use case "past" (3)
- ER-03 ✅ — e2e "on a started class changes only the instructors", "…counts a class starting exactly now as started";
  use case "started" (13)
- ER-04 ✅ — e2e "refuses a finished class, also when nothing differs"; use case "finished" (2)
- ER-05 ✅ — use case "seats taken" (8 refused with `details.seatsTaken`, 8 accepted); `NoEnrolmentSeatCounter` answers 0
- ER-06 ✅ — e2e access (401/403 both keys), 404 (unknown and non-UUID), every shape key together, `endBeforeStart`,
  location and added-instructor refusals, kept instructor who is now a student
- ER-07 ✅ — use case "notifies" (6) and e2e "notifies" (4): stored notifications and fake Expo messages; nothing for the
  editor, nothing on a no-change save, 200 kept when the push provider fails
- ER-08 ✅ — push text of D-09 in the three locales, `data.classId` only for the new types; entity accepts both types
- ER-09 ✅ — simulator: pencil on tomorrow's class and on a started class, none on a finished class, none for a student;
  tests "pencil" (6) pass, but the command doesn't exit — F-02
- ER-10 ✅ — simulator: "Edit class" prefilled, own time selected, button disabled; picked Sun 18 and a new 14:00–15:00
  time, saved: "Changes saved", back on the details with the new day and time, Saturday 3 → 2 classes, Sunday 2 → 3;
  `edit-class.screen.test.tsx` 39 passed
- ER-11 ✅ — simulator: the open editor switched to "The class has started" with only the instructors once 23:44 passed;
  button disabled with the same instructors; added Dev Instructor, saved, the details list both; tests "started" (7)
- ER-12 ✅ — `class-error.test.ts` + screen "error" tests (34): every D-14 key, refetches, back, button usable again
- ER-13 ✅ — hook tests "class." (12): instructor and admin open their class details, a student or a push without
  `classId` goes to `/`, both types invalidate `["classes"]`

**Findings**

- [x] **F-01** (tests) — the related tests are red: `admin-tabs`, `instructor-tabs` and `student-tabs`
  `.navigation.test.tsx` (7 tests) build a class starting `Date.now() + 1h`, which from 23:00 in Fortaleza falls on the
  next day, outside the day the week view shows. The spec didn't touch them, but `run-related-tests.mjs` runs them and
  the Verification Plan needs `RELATED TESTS PASSED` (T-13's evidence records them failing). Reproduce: run
  `node .specs/scripts/run-related-tests.mjs 032` between 23:00 and 24:00 America/Fortaleza (or shift the clock: they pass
  16/16 at 12:00). Expected: green at any hour — fix their clock as `edit-class.screen.test.tsx` does
  (`jest.useFakeTimers({ now, doNotFake: [...] })`) or build the class within today.
  > ✅ 2026-10-16 23:52 — the three navigation suites now fix the clock at 2026-10-16T15:00Z (Date only, as `edit-class.screen.test.tsx` does) and restore it afterwards; files: `apps/mobile/src/modules/admin/admin-tabs.navigation.test.tsx`, `apps/mobile/src/modules/instructor/instructor-tabs.navigation.test.tsx`, `apps/mobile/src/modules/student/student-tabs.navigation.test.tsx`; verified: `npx jest` on the three suites plus class-details from apps/mobile passes (39 tests) at 23:51 Fortaleza, the hour they failed before; deviations: none
- [x] **F-02** (tests) — `class-details.screen.test.tsx` no longer exits when run on its own: ER-09's `Verify by`
  (`npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "pencil"`) prints 6 passed, then "Jest did not
  exit one second after the test run has completed" and hangs. The new "pencil › does not show while loading or for a
  missing class" causes it (alone it hangs; every other test of the file exits; the file at `base_commit` exits, 16
  passed). Expected: the command exits — clean up what that test leaves running (the never-resolving fetch and its
  `QueryClient` in `renderWithUnmount`).
  > ✅ 2026-10-16 23:52 — split the test into "does not show while loading" (the fetch is held and released at the end) and "does not show for a missing class", both through `renderScreen`; the `renderWithUnmount` helper and its never-resolving fetch are gone; files: `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`; verified: `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t pencil` exits 0 (7 passed, no "did not exit"); deviations: none
- [x] **F-03** (convention) — `modules/classes/src/school-class/usecase/edit-class.usecase.ts:19` imports `SchoolClass`
  without using it: `npm run lint --workspace @rochas-surf-school/classes` reports `no-unused-vars`, the module's only
  warning. Expected: no warning.
  > ✅ 2026-10-16 23:52 — removed the unused `SchoolClass` import; files: `modules/classes/src/school-class/usecase/edit-class.usecase.ts`; verified: `npm run lint` in modules/classes prints no warning, `tsc --noEmit` clean; deviations: none

**Notes**

- D-12's own-range exception: moving tomorrow's class to today keeps its own range selectable and selected even when it
  has already started today, so the button is disabled with no hint (the test "does not allow saving today with a time
  that has started" encodes it). It follows D-12 to the letter; worth a later look (block the chip, or show the past
  hint).
- Copy seen in the simulator: "Suggested from last week's classes" shows when the only chip is the class's own range,
  and the "New time" sheet says "It's for this batch only" on the edit screen (both reused from Nova aula).
- "Changes saved" uses the app's single alert style (red, "!"), as Nova aula's "Class created" already does.
- `edit-class.screen.test.tsx` also doesn't exit when run alone, but `new-class.screen.test.tsx` behaves the same, so it
  is an existing pattern, not this spec's.
- The "no connection" screen test only checks that the toast isn't "Changes saved"; the `NetworkError` key itself is
  covered by `class-error.test.ts`.
- The journeys changed the local dev database: "Surf 12:00–13:00" of Sat 17 moved to Sun 18 14:00–15:00, and a class
  "Surf 23:44–23:59" of Fri 16 was created (Dev Admin, then Dev Instructor added).
- `## Memory Impact` matches what was built.

### Round 2 — 2026-10-17 — accepted

**Checks**

- lint ✅ (0 warnings) · type check ✅ (classes, notifications, backend, mobile: 16 tasks) · build ✅ (classes,
  notifications, backend: 7 tasks)
- related tests ✅ `RELATED TESTS PASSED` — backend 121, modules/classes 243, modules/notifications 92, apps/mobile 864;
  run at 23:54 America/Fortaleza, the hour the navigation suites failed in round 1
- coverage of the changed lines ✅ `COVERAGE OK` (26 files); no coverage-ignore comments in the diff
- e2e: backend suite ✅ `E2E PASSED` (15 files, 405 tests); every `PUT /classes/:id` `Verify by` filter passes on its
  own (1, 1, 2, 1, 7 and 4 tests) · mobile: the round 1 simulator journeys stand — since `a292b55` only test files
  and one unused import changed, no runtime code

**Expected Results**

- ER-01 ✅ — e2e "edits a class that hasn't started"; use case "edits every field"
- ER-02 ✅ — e2e "refuses a start in the past"; use case "past" (3)
- ER-03 ✅ — e2e "on a started class" (2); use case "started" (13)
- ER-04 ✅ — e2e "refuses a finished class"; use case "finished" (2)
- ER-05 ✅ — use case "seats taken" (2); `no-enrolment.seat-counter.spec.ts` passes
- ER-06 ✅ — e2e "refuses" (7); the whole use case file (61)
- ER-07 ✅ — use case "notifies" (6); e2e "notifies" (4)
- ER-08 ✅ — `push-messages.spec.ts`, `expo.push.spec.ts` (with the seat counter spec: 30); entity test (15)
- ER-09 ✅ — "pencil" 7 passed and the command exits 0 (F-02 fixed); simulator pass of round 1
- ER-10 ✅ — `edit-class.screen.test.tsx` 39 passed; simulator pass of round 1
- ER-11 ✅ — "started" 7 passed; simulator pass of round 1
- ER-12 ✅ — `class-error.test.ts` + screen "error": 34 passed, exits 0
- ER-13 ✅ — hook tests "class." 12 passed

**Round 1 findings**

- F-01 ✅ — the three tab navigation suites fix the clock (Date only) and restore it; 16/16 pass at 00:01 Fortaleza and
  inside the related run at 23:54
- F-02 ✅ — `class-details.screen.test.tsx -t pencil` exits 0 (7 passed, no "did not exit"); the held fetch is released
- F-03 ✅ — `npm run lint` in modules/classes: 0 warnings

**Findings**

None.

**Notes**

- `edit-class.screen.test.tsx` still doesn't exit when run alone (ER-10 and ER-11's `Verify by` print their results,
  then hang); `new-class.screen.test.tsx` at the same commit does the same, so it stays the existing pattern noted in
  round 1. Worth fixing for both screens together.
- The F-01 fix leaves two blank lines after `afterAll(...)` in each navigation suite; Prettier isn't enforced (the base
  files already fail `prettier --check`), so it isn't a finding.
- Round 1's notes on D-12's own-range exception and the reused Nova aula copy still apply.
