---
id: "041"
slug: enrolment-requests
title: "Students request seats in classes"
status: in-progress
created: 2026-10-19
started: 2026-10-19
base_commit: f4f39160297a7dcb1497ed9c64df738439b75db0
fronts: [enrolment, classes, notifications, backend, mobile]
depends_on: []
---

# 041 — Students request seats in classes

## Goal

Approved students ask for a seat in a class from its details, after accepting the discipline's cancellation
rule, and follow their request: pending, on the waiting list when the class is full, withdrawn by them, expired
when the class starts without a seat, or ended because the class was cancelled. Admins and the class's
instructors are told of every new request. This is the first enrolment spec: it creates the `enrolment`
module and replaces the classes module's "no enrolment" stubs with real counts, so the seats, the students and
the "not empty" check of deleting a class read the stored enrolments from now on. Approving, denying and
cancelling a seat come in specs 042 and 043.

## Context

- Product: [product.md](../../memory/product.md) — concepts **Enrolment** (statuses, one open enrolment per
  student and class, request again after one ended), **Seat**, **Cancellation rule** and **Cancellation
  deadline**; decisions "A pending enrolment never holds a seat" and "Admins decide every seat".
- Requirements: [requirements.md → Requesting a class](../../../.docs/requirements.md#requesting-a-class) —
  students request any class that hasn't started, again after an earlier request ended;
  [New request notification](../../../.docs/requirements.md#new-request-notification) — admins and the class's
  instructors are told; [Seats](../../../.docs/requirements.md#seats) — a pending request holds no seat;
  [Waiting list](../../../.docs/requirements.md#waiting-list) — pending requests of a full class show as "on the
  waiting list" (the label only; the admins' ordered view is spec 042);
  [Withdrawing a request](../../../.docs/requirements.md#withdrawing-a-request) — until the class starts, nobody
  told; [Expiry](../../../.docs/requirements.md#expiry) — pending at the start expires and the student is told;
  [Reading and accepting the rules](../../../.docs/requirements.md#reading-and-accepting-the-rules) — the rule of
  the class's discipline is shown and accepted when requesting;
  [Request statuses](../../../.docs/requirements.md#request-statuses) — the statuses this spec can produce
  (pending, waiting list, withdrawn, expired, class cancelled).
- Technical: [technical-context.md](../../memory/technical-context.md) — Architecture (ports and adapters),
  Classes (the class item, `ClassRosterReader`, `SeatCounter`, `PendingRequestCounter`, `CancelClass`),
  Persistence (conditional writes, `$transaction`), Push notifications (stored, then pushed, failures
  swallowed), Scheduled work (one job per timed event, idempotent), Mobile (TanStack Query, `BottomModal`,
  `Checkbox`, `Button` variants, routes).
- Module memory: [classes.md](../../memory/modules/classes.md) — the roster, seat and pending-request
  contracts answer 0 until enrolment replaces them; [notifications.md](../../memory/modules/notifications.md).
- Designs: `.docs/designs/student-app.html` — AGENDA-02 (class detail, "Pedir para entrar"), AGENDA-02A (full
  class, "Entrar na lista de espera"), AGENDA-03 (request sheet with the cancellation rule); builders
  `detalheScreen` (the `info` banners and the `cta` chain), `sheetView` (`entrar`, `cancelar` in its pending
  branch), `classCard` (the status chip in the right slot) and `estadoChip`. The design is written in pt-PT
  with "o Rocha"; the app's copy is pt-BR and says "a escola" (D-09).
- Existing code this builds on:
  - `modules/classes/src/school-class/provider/class-roster-reader.provider.ts`, `seat-counter.provider.ts`,
    `pending-request-counter.provider.ts` and their stubs `apps/backend/src/modules/classes/no-enrolment.*.ts`;
  - `modules/classes/src/school-class/usecase/class-item.ts`, `get-class.usecase.ts`,
    `list-week-classes.usecase.ts`, `cancel-class.usecase.ts`;
  - `modules/classes/src/access/class-actor.ts` (`ClassActor`, `assertCanReadClasses`);
  - `apps/backend/src/modules/notifications/push-messages.ts` and the `Notifications*Notifier` adapters;
  - `apps/mobile/src/modules/classes/screens/class-details.screen.tsx` (+ hook), `components/class-card/`,
    `components/class-people/`, `apps/mobile/src/modules/cancellation-rules/components/cancellation-rules-sheet/`,
    `apps/mobile/src/modules/notifications/hooks/` (`useNotificationResponse`, `useNotificationReceived`).
- Followed by specs 042 (admins decide), 043 (cancelling a seat), 044 (direct enrolment and take-out), 045
  (guests), 046 (waiting-list switch), 047 (students told of class changes) and 048 ("Minhas aulas").

## Scope

### In scope

- A new business module `modules/enrolment` (`@rochas-surf-school/enrolment`) with the `enrolment` aggregate:
  the entity with every status of the product, its repository port, and the use cases to request a seat,
  withdraw a pending request, expire pending requests at the class start and close the open enrolments of a
  cancelled class.
- `POST /classes/:id/enrolments` and `POST /enrolments/:id/withdraw`, and a job that expires pending requests.
- Real implementations of the classes module's `ClassRosterReader`, `SeatCounter` and `PendingRequestCounter`
  (the three stubs are removed), and a new `myEnrolment` field on every class read.
- Cancelling a class ends its open enrolments as `classCancelled` and tells those students.
- Two new notification types, `enrolment.requested` and `enrolment.expired`, with their push copy.
- Mobile: the student's CTA and request sheet on the class details, the withdraw confirmation, the status
  banners on the details and the status chip on the week card, the push taps, and the copy in pt-BR, es-ES and
  en-US.

### Out of scope

- Approving and denying requests, the admins' "Inscrições em aulas" tool and the ordered waiting list (spec 042);
  the "Você está inscrito" and "Pedido recusado" student states (spec 042).
- Cancelling an approved seat, the deadline checks, and account deletion's effect on enrolments (spec 043).
- Direct enrolment and taking a student out (spec 044); guests (spec 045).
- The waiting-list switch: in this spec the waiting list is always on (spec 046).
- Telling students about class edits and location changes (spec 047).
- The "Minhas aulas" tab and the history (spec 048).
- A notifications screen, reminders before a class, and anything after a class (ratings, photos).
- Storing the text of the cancellation rule a student accepted.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | This spec covers the student's request side only: request, withdraw, request again, the waiting-list label, the student's status on the card and the details, the real counters and the new-request push. | Enrolment is several reviewable specs (042–048, all planned now); the user agreed to this split. |
| D-02 | Pending requests expire at the class start through a job that also pushes `enrolment.expired`; cancelling a class ends its pending and approved enrolments as `classCancelled` and pushes `class.cancelled` to those students. | Otherwise stored statuses go wrong the moment a class starts or is cancelled. The user agreed. |
| D-03 | Every class read (`GET /classes`, `GET /classes/:id` and the answers that return a class) carries `myEnrolment: { id, status, requestedAt } \| null`: the caller's latest enrolment in that class (by `requestedAt`, then `id`), for any role. It comes through a new classes port `ViewerEnrolmentReader`. | One request feeds the card chip and the details; the classes → enrolment dependency stays behind ports, as in spec 040. |
| D-04 | The request sheet's rule block shows the class's deadline ("Cancelamento até seg, 19 out · 20:00") or "Prazo ainda não definido", then the checkbox "Li e aceito a regra de cancelamento" with "Ler", which opens the existing `CancellationRulesSheet`. When the discipline has no rule, the block says "A escola ainda não escreveu esta regra." and has no checkbox. The backend requires `acceptCancellationRule: true` only when the class's discipline has a rule, and stores `ruleAcceptedAt` (null without a rule) — never the rule text. | Rules are free text (spec 036), so the design's "12 h" summary can't exist; the deadline is the concrete fact. The user agreed. |
| D-05 | The waiting list is always on: a full class accepts requests, which stay pending and show as on the waiting list. | It is on by default; the switch is spec 046. |
| D-06 | Statuses in code: `pending`, `approved`, `denied`, `withdrawn`, `expired`, `cancelled`, `takenOut`, `classCancelled` (a Postgres enum `enrolment_status` with snake_case values). The entity defines all of them now; this spec's use cases produce `pending`, `withdrawn`, `expired` and `classCancelled`. | One stable contract for the later specs; the app maps every status it can see. |
| D-07 | "On the waiting list" is never stored: the app shows it for a `pending` enrolment while the class's `seatsTaken ≥ capacity`. | The product defines it as a label on pending requests of a full class. |
| D-08 | At most one open (`pending` or `approved`) enrolment per student and class, enforced by a partial unique index (`WHERE status IN ('pending','approved')`) written in the migration's SQL; the repository maps the unique violation to 409 `enrolment.alreadyOpen`. Every new request is a new row; ended rows stay. | Two simultaneous requests must leave exactly one; history is kept per request. |
| D-09 | The design's pt-PT copy becomes pt-BR, and "o Rocha" becomes "a escola" (for example "O pedido fica pendente até a escola confirmar."). | The product's languages are pt-BR, es-ES and en-US; the school is not one person. |
| D-10 | The module boundary: `modules/enrolment` depends on `@rochas-surf-school/classes` (for `ClassActor`, `assertCanReadClasses`, `getClassState` and the discipline type) and `@rochas-surf-school/auth` (role and status names); `classes` never imports `enrolment`. `enrolment` reads a class through its own port `EnrolmentClassReader` (`{ id, discipline, startsAt, endsAt, capacity, cancelledAt, instructorIds, hasCancellationRule }`) and the student's name through `StudentNameReader`. | Dependencies point one way; each module's rules stay testable on their own. |
| D-11 | Backend wiring: `EnrolmentModule` (`apps/backend/src/modules/enrolment/`) holds the enrolment Prisma adapters, including the implementations of the classes ports (`PrismaClassRosterReader`, `PrismaSeatCounter`, `PrismaPendingRequestCounter`, `PrismaViewerEnrolmentReader`, `EnrolmentClassEnrolmentsCloser`), exports them, and never imports `ClassesModule`; `ClassesModule` imports `EnrolmentModule`. | Avoids a Nest import cycle while keeping enrolment's tables in its own module. |
| D-12 | Request checks, in order: the account's status (`user.status.notApproved`, 403), its role (`enrolment.role.notStudent`, 403), the class (non-UUID id or none → `class.notFound`, 404), `class.cancelled` (409), `class.started` (409, now ≥ start), `enrolment.rule.notAccepted` (422), `enrolment.alreadyOpen` (409). Withdraw checks: status (403), the enrolment (non-UUID, none, or another person's → `enrolment.notFound`, 404), `enrolment.notPending` (409), `class.started` (409). Withdrawing is a conditional write on `status = 'pending'`, so a race loses with `enrolment.notPending`. | Same order style as the classes routes: access, identity, then state. |
| D-13 | `enrolment.requested` goes to every approved admin and every instructor of the class, each person once (an admin who teaches gets one). Its params are `{ classId, studentName, discipline, startsAt }`. `enrolment.expired` goes to the student with `{ classId, discipline, startsAt }`. Students reuse `class.cancelled` with the instructors' params. | Matches the requirements; reusing `class.cancelled` keeps one copy for one event. |
| D-14 | The expiry job (`EnrolmentExpiryJob`, cron every minute, `waitForCompletion`) reads pending enrolments of classes with `startsAt ≤ now` and `cancelledAt` null, and for each one writes `expired` with `updateMany({ where: { id, status: 'pending' } })`; only a row that changed is pushed. It logs only the counts and never throws. | Idempotent by the stored status, as Scheduled work requires. |
| D-15 | The CTA lives on the shared `ClassDetailsScreen` behind a new `canEnrol` prop that only `student/class/[id].tsx` sets; the card's status chip shows only on the student's Agenda (`showEnrolment` on `ClassesWeekScreen`). "Sair da lista de espera" withdraws at once, as in the design; "Anular pedido" asks first. | Instructors and admins never take seats; the design's two withdraw paths differ. |
| D-16 | The seats taken become the approved enrolments of the class (guests join in spec 045); the students are the approved ones, in the order they were approved (`decidedAt`, then user id), keeping spec 040's cap. Nothing approves a request yet, so in this spec they still read 0 and nobody through the API — the implementation is tested with stored rows. | spec 040's D-07 contract; the stubs must go now that the table exists. |

## Expected Results

### ER-01 — A student requests a seat

- **Front:** enrolment
- **Behavior:** Given an approved student and a class that hasn't started and isn't cancelled, when they call
  `POST /classes/:id/enrolments` with `{ "acceptCancellationRule": true }`, then the API answers 201 with
  `{ id, classId, status: "pending", requestedAt }` and the enrolment is stored with `ruleAcceptedAt` set.
- **Edge and error cases:** a full class (seats taken ≥ capacity) is accepted the same way (D-05); a class whose
  discipline has no rule is accepted with or without the flag and stores `ruleAcceptedAt` null; a class that
  has started counts from its start instant exactly.
- **Verify by:** `npx jest test/enrolment/usecase/request-seat.usecase.test.ts` (from `modules/enrolment`) and
  the "requests a seat" cases of `apps/backend/test/enrolment.e2e-spec.ts` (`npm run test:e2e --workspace apps/backend`).

### ER-02 — Requests that are refused store nothing

- **Front:** enrolment
- **Behavior:** Given each refused case, when `POST /classes/:id/enrolments` is called, then it answers, in this
  order of checks (D-12): 403 `user.status.notApproved`, 403 `enrolment.role.notStudent` (an instructor or an
  admin), 404 `class.notFound` (a non-UUID id or no class), 409 `class.cancelled`, 409 `class.started`, 422
  `enrolment.rule.notAccepted` (the discipline has a rule and `acceptCancellationRule` is missing or not
  `true`), 409 `enrolment.alreadyOpen` (the student has a pending or approved enrolment in it); and no enrolment
  is stored and nobody is notified.
- **Edge and error cases:** a request without a token answers 401; a finished class answers `class.started`.
- **Verify by:** `npx jest test/enrolment/usecase/request-seat.usecase.test.ts` (from `modules/enrolment`) and
  the "refuses" cases of `apps/backend/test/enrolment.e2e-spec.ts`.

### ER-03 — Requesting again, and only one open request

- **Front:** enrolment
- **Behavior:** Given a student whose earlier request for a class ended (withdrawn, expired, or any other ended
  status), when they request the same class again before it starts, then a new pending enrolment is created
  and the earlier one keeps its status.
- **Edge and error cases:** two simultaneous requests by the same student for the same class leave exactly one
  pending enrolment, and the other answers 409 `enrolment.alreadyOpen` (D-08).
- **Verify by:** `npx jest test/enrolment/usecase/request-seat.usecase.test.ts -t "again"` (from
  `modules/enrolment`), `npx vitest run src/modules/enrolment/enrolment.prisma.spec.ts` (from `apps/backend`)
  and the "requests again" and "concurrent requests" cases of `apps/backend/test/enrolment.e2e-spec.ts`.

### ER-04 — A student withdraws a pending request

- **Front:** enrolment
- **Behavior:** Given a student's pending enrolment in a class that hasn't started, when they call
  `POST /enrolments/:id/withdraw`, then the API answers 200 with `{ id, classId, status: "withdrawn",
  requestedAt }` and nobody is notified.
- **Edge and error cases:** a non-UUID id, an unknown id or another person's enrolment answers 404
  `enrolment.notFound`; an enrolment that isn't pending answers 409 `enrolment.notPending` (also when a
  concurrent withdraw won); a class that has started answers 409 `class.started`; a non-approved account
  answers 403 `user.status.notApproved`.
- **Verify by:** `npx jest test/enrolment/usecase/withdraw-request.usecase.test.ts` (from `modules/enrolment`)
  and the "withdraws" cases of `apps/backend/test/enrolment.e2e-spec.ts`.

### ER-05 — Pending requests expire when the class starts

- **Front:** backend
- **Behavior:** Given pending enrolments of a class whose start has passed and that isn't cancelled, when the
  `EnrolmentExpiryJob` runs, then each becomes `expired` and its student gets one `enrolment.expired`
  notification with `{ classId, discipline, startsAt }`, pushed as "Você não conseguiu vaga" / "A aula de
  Surf de 19/10 às 08:00 começou sem vaga para o seu pedido." (pt-BR; es and en in the catalog).
- **Edge and error cases:** running the job again sends nothing more; pending requests of a class that hasn't
  started stay pending; a cancelled class's requests are not expired (ER-06 ends them); a failing push still
  leaves the status `expired`.
- **Verify by:** `npx jest test/enrolment/usecase/expire-pending-enrolments.usecase.test.ts` (from
  `modules/enrolment`), `npx vitest run src/modules/enrolment/enrolment-expiry.job.spec.ts src/modules/notifications/push-messages.spec.ts`
  (from `apps/backend`) and the "expires" cases of `apps/backend/test/enrolment.e2e-spec.ts`.

### ER-06 — Cancelling a class ends its open enrolments

- **Front:** classes
- **Behavior:** Given a class with pending and approved enrolments, when an admin cancels it with
  `POST /classes/:id/cancel`, then those enrolments become `classCancelled`, each of their students gets
  `class.cancelled` with the class's message (when there is one), and the instructors are told as before.
- **Edge and error cases:** ended enrolments (withdrawn, expired…) are unchanged and their students aren't
  told; the admin who cancels is never told; a student with an open enrolment who is also the cancelling admin
  can't exist (admins don't request); a failing notification never changes the answer or the cancellation.
- **Verify by:** `npx jest test/school-class/usecase/cancel-class.usecase.test.ts` (from `modules/classes`),
  `npx jest test/enrolment/usecase/close-class-enrolments.usecase.test.ts` (from `modules/enrolment`) and the
  "cancel ends enrolments" case of `apps/backend/test/classes.e2e-spec.ts`.

### ER-07 — Admins and instructors are told of a new request

- **Front:** backend
- **Behavior:** Given a class taught by instructor I and a school with approved admins A1 and A2, when student
  "Ana Souza" requests it, then A1, A2 and I each get one `enrolment.requested` with `{ classId, studentName:
  "Ana Souza", discipline, startsAt }`, pushed as "Novo pedido de vaga" / "Ana Souza pediu vaga na aula de Surf
  de 19/10 às 08:00." (pt-BR; es and en in the catalog).
- **Edge and error cases:** an admin who teaches the class gets one notification, not two; pending or removed
  admins get none; a failing notification never changes the 201.
- **Verify by:** `npx jest test/enrolment/usecase/request-seat.usecase.test.ts -t "notif"` (from
  `modules/enrolment`), `npx vitest run src/modules/notifications/notifications.enrolment-notifier.spec.ts src/modules/notifications/push-messages.spec.ts`
  (from `apps/backend`) and the "notifies" case of `apps/backend/test/enrolment.e2e-spec.ts`.

### ER-08 — Seats, students and pending requests are counted from enrolments

- **Front:** backend
- **Behavior:** Given a class with 2 approved and 3 pending enrolments stored, when it is read
  (`GET /classes/:id`), then `seatsTaken` is 2 and `students` lists the 2 approved students in the order they
  were approved; and when an admin calls `DELETE /classes/:id` on a class with a pending request, then it
  answers 409 `class.delete.notEmpty` with `details: { seatsTaken: 0, pendingRequests: 1 }`.
- **Edge and error cases:** the week list keeps the cap of 4 students per class while `seatsTaken` is never
  capped; withdrawn, expired and class-cancelled enrolments count nowhere; `PUT /classes/:id` refuses a capacity
  below the approved count with `class.capacity.belowSeatsTaken`; the `NoEnrolment*` stub files no longer exist.
- **Verify by:** `npx vitest run src/modules/enrolment` (from `apps/backend`: the class-roster, seat-counter and
  pending-counter specs) and the "counts" cases of `apps/backend/test/enrolment.e2e-spec.ts`.

### ER-09 — Every class read carries the caller's enrolment

- **Front:** classes
- **Behavior:** Given a student whose latest enrolment in class C is pending, when they call
  `GET /classes?date=` for C's week or `GET /classes/:id`, then C carries `myEnrolment: { id, status: "pending",
  requestedAt }` and every class without one of their enrolments carries `myEnrolment: null`.
- **Edge and error cases:** with several enrolments in C the latest (by `requestedAt`, then `id`) is returned;
  an instructor or admin reads `null` everywhere; the answers of `PUT /classes/:id` and `POST /classes/:id/cancel`
  carry the caller's field the same way.
- **Verify by:** `npx jest test/school-class/usecase/get-class.usecase.test.ts test/school-class/usecase/list-week-classes.usecase.test.ts`
  (from `modules/classes`) and the "myEnrolment" cases of `apps/backend/test/enrolment.e2e-spec.ts`.

### ER-10 — The student's call to action on the class details

- **Front:** mobile
- **Behavior:** Given a student on a class's details, when the screen renders, then a sticky footer shows one
  button by state: no enrolment (or none open) and seats free → "Pedir para entrar" (`primary`); no enrolment and
  full → "Entrar na lista de espera" (`dark`); pending with seats free → "Anular pedido" (`outline`); pending and
  full → "Sair da lista de espera" (`ghost`); latest enrolment withdrawn or expired → "Pedir novamente"
  (`primary`, or `dark` when full).
- **Edge and error cases:** a started, finished or cancelled class shows no footer; instructors and admins never
  see it (no `canEnrol`); a `classCancelled` enrolment shows no footer (the class is cancelled); statuses this spec
  can't produce (approved, denied, cancelled, takenOut) show no footer until their specs.
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "enrol"` (from `apps/mobile`).

### ER-11 — The request sheet (AGENDA-03)

- **Front:** mobile
- **Behavior:** Given a student who pressed "Pedir para entrar", when the sheet opens, then it shows the title
  "Pedir para entrar", the line "Surf Iniciante · Amanhã · 08:00. O pedido fica pendente até a escola
  confirmar.", the label "Cancelamento · Surf", a card with the deadline ("Cancelamento até seg, 19 out · 20:00")
  or "Prazo ainda não definido", the checkbox "Li e aceito a regra de cancelamento" with "Ler" (opening
  `CancellationRulesSheet`), "Enviar pedido" (disabled until ticked) and "Agora não"; sending posts
  `{ acceptCancellationRule: true }`, closes the sheet, shows the toast "Pedido enviado" and the details show the
  new status.
- **Edge and error cases:** from a full class the title and button read "Entrar na lista de espera", the line
  ends "A turma está cheia: seu pedido fica na lista de espera. Se abrir uma vaga, ele passa para a aprovação da
  escola." and the toast is "Você está na lista de espera"; with no rule for the discipline the card says "A
  escola ainda não escreveu esta regra.", there is no checkbox and the button is enabled; a double press sends
  once; `class.started` / `class.cancelled` / `enrolment.alreadyOpen` show their toasts, close the sheet and
  reload the class; `enrolment.rule.notAccepted` shows its toast and reloads the rules; no connection and other
  errors show the shared toasts; all copy exists in pt-BR, es-ES and en-US.
- **Verify by:** `npx jest src/modules/enrolment/components/request-seat-sheet` (from `apps/mobile`) and the
  first journey of the Verification Plan.

### ER-12 — Withdrawing from the details

- **Front:** mobile
- **Behavior:** Given a student with a pending request on a class with free seats, when they press "Anular
  pedido", then a sheet asks "Anular pedido" / "Seu pedido para esta aula deixa de esperar aprovação." with
  "Sim, anular" and "Manter pedido"; confirming withdraws it, shows the toast "Pedido anulado" and the details
  show "Pedido anulado".
- **Edge and error cases:** on a full class "Sair da lista de espera" withdraws without a sheet and shows "Você
  saiu da lista de espera" (D-15); `enrolment.notPending` and `class.started` show their toasts and reload the
  class; a double press sends once.
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "withdraw"` and
  `npx jest src/modules/enrolment/components/withdraw-request-sheet` (from `apps/mobile`).

### ER-13 — The student sees their status on the details and on the card

- **Front:** mobile
- **Behavior:** Given a student, when a class's details render, then the latest enrolment shows one banner:
  pending → "Pedido pendente" / "Seu pedido aguarda a aprovação da escola." (`warn` tint); pending and full →
  "Você está na lista de espera" / "Se abrir uma vaga, seu pedido passa para a aprovação da escola." (`info`
  tint); withdrawn → "Pedido anulado" / "Você anulou seu pedido para esta aula." (`dim`); expired → "Você não
  conseguiu vaga" / "Seu pedido expirou sem abrir vaga na turma." (`dim`); and on the Agenda the card's right chip
  slot shows "Pendente" (`warn`), "Na lista de espera" (`info`), "Anulado" (`dim`) or "Expirado" (`dim`), in
  place of "Sem vagas".
- **Edge and error cases:** a student without an enrolment in a full class keeps "Sem vagas" and the "Turma
  cheia" banner gains "Você pode entrar na lista de espera."; a cancelled class keeps only its "Cancelada"
  chip and banner; the started and finished banners and chips win over the pending ones; instructors' and
  admins' cards show no enrolment chip.
- **Verify by:** `npx jest src/modules/classes/components/class-card src/modules/enrolment/utils/enrolment-status.test.ts`
  and `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "status"` (from `apps/mobile`).

### ER-14 — Pushes open the right class

- **Front:** mobile
- **Behavior:** Given a signed-in student, when they tap an `enrolment.expired` or `class.cancelled` push with a
  `classId`, then the app opens `/student/class/[id]`; given an admin or an instructor, when they tap an
  `enrolment.requested` push, then it opens that class's details in their flow.
- **Edge and error cases:** any of these pushes received with the app open invalidates `["classes"]` without
  navigating; a push without a string `classId` falls back to `routes.home`; a student tapping
  `class.cancelled` no longer lands on `/`.
- **Verify by:** `npx jest src/modules/notifications/hooks` (from `apps/mobile`).

## Tasks

### Enrolment module (`modules/enrolment`)

- [x] **T-01** — Scaffold the module with `config-new-module --module enrolment --skip-web --skip-mobile`
  (the app's enrolment UI lives under `apps/mobile/src/modules/enrolment` without a route of its own), declare
  `@rochas-surf-school/shared`, `@rochas-surf-school/auth` and `@rochas-surf-school/classes` in its
  `package.json`, and add `.oxlintrc.json` and a `check-types` script like `modules/classes`. Skill:
  [`config-new-module`](../../../.claude/skills/config-new-module).
  Covers: enabling · Done when: `npm test --workspace @rochas-surf-school/enrolment` and `npm run check-types
  --workspace @rochas-surf-school/enrolment` pass and the backend builds with the new dependency.
  > ✅ 2026-10-19 16:12 — scaffolded `modules/enrolment` with `config-new-module --module enrolment --skip-web --skip-mobile` (placeholder backend module/controller registered in AppModule, replaced in T-15); declared the shared, auth and classes dependencies, added `.oxlintrc.json`, `check-types` and `lint` scripts like `modules/classes`; files: `modules/enrolment/package.json`, `modules/enrolment/tsconfig.json`, `modules/enrolment/jest.config.ts`, `modules/enrolment/.oxlintrc.json`, `modules/enrolment/src/index.ts`, `modules/enrolment/test/index.test.ts`, `apps/backend/src/modules/enrolment/enrolment.module.ts`, `apps/backend/src/modules/enrolment/enrolment.controller.ts`, `apps/backend/src/app.module.ts`, `apps/backend/package.json`, `package-lock.json`; verified: `npm test --workspace @rochas-surf-school/enrolment` (1 passed), `npm run check-types --workspace @rochas-surf-school/enrolment` (clean), `npm run build --workspace @rochas-surf-school/backend` (clean); deviations: none

- [x] **T-02** — Add the `Enrolment` entity in `src/enrolment/model/enrolment.entity.ts` with `ENROLMENT_STATUSES`
  (D-06), `OPEN_ENROLMENT_STATUSES`, the fields `classId`, `studentId`, `status`, `requestedAt`,
  `ruleAcceptedAt`, `decidedAt`, `reason`, `endedAt`, and the transitions `withdraw(now)`, `expire(now)` and
  `closeForCancelledClass(now)` (each only from the statuses the product allows, else a `DomainError`), with
  unit tests for every transition and validation. Skill: [`module-entity`](../../../.claude/skills/module-entity).
  Covers: ER-01, ER-04, ER-05, ER-06 · Done when: `npx jest test/enrolment/model` passes from `modules/enrolment`.
  > ✅ 2026-10-19 16:13 — added the `Enrolment` entity with `ENROLMENT_STATUSES`, `OPEN_ENROLMENT_STATUSES`, the fields of the task and the transitions `withdraw`, `expire` (from pending) and `closeForCancelledClass` (from pending/approved), each refusing other statuses with a 409 `DomainError` (`enrolment.notPending` / `enrolment.notOpen`); files: `modules/enrolment/src/enrolment/model/enrolment.entity.ts`, `modules/enrolment/src/enrolment/model/index.ts`, `modules/enrolment/src/enrolment/index.ts`, `modules/enrolment/src/index.ts`, `modules/enrolment/test/enrolment/model/enrolment.entity.test.ts`; verified: `npx jest test/enrolment/model` from `modules/enrolment` (33 passed, entity 100% covered), `tsc --noEmit` and oxlint clean; deviations: none

- [x] **T-03** — Add the ports in `src/enrolment/provider/`: `enrolment.repository.ts` (`create`, `findById`,
  `withdraw` conditional on pending, `findExpirable(now)`, `expire(id, now)` conditional, `closeOpenForClass(classId,
  now)` returning the closed enrolments), `enrolment-class-reader.provider.ts` (D-10),
  `student-name-reader.provider.ts`, `enrolment-notifier.provider.ts` (`seatRequested`, `requestExpired`) and
  `clock.provider.ts`, plus in-memory/fake implementations under `test/mock/` with their tests. Skill:
  [`module-repository`](../../../.claude/skills/module-repository).
  Covers: enabling · Done when: `npx jest test/mock` passes from `modules/enrolment`.
  > ✅ 2026-10-19 16:14 — added the ports `EnrolmentRepository` (`create`, `findById`, `withdraw` and `expire` conditional on pending returning a boolean, `findExpirable`, `closeOpenForClass`), `EnrolmentClassReader` (D-10), `StudentNameReader`, `EnrolmentNotifier` (`seatRequested`, `requestExpired`) and `ClockProvider`, with the fakes and the factory under `test/mock/`; files: `modules/enrolment/src/enrolment/provider/{enrolment.repository,enrolment-class-reader.provider,student-name-reader.provider,enrolment-notifier.provider,clock.provider,index}.ts`, `modules/enrolment/src/enrolment/index.ts`, `modules/enrolment/test/mock/{enrolment.factory,fake-enrolment.repository,fake-enrolment-class.reader,fake-student-name.reader,fake-enrolment.notifier,fake-clock.provider,index}.ts`, `modules/enrolment/test/mock/fake-enrolment.repository.test.ts`; verified: `npx jest test/mock` from `modules/enrolment` (8 passed), `tsc --noEmit` and oxlint clean; deviations: the fake repository takes the classes in its constructor so `findExpirable` can join them (the real adapter does it in SQL)

- [x] **T-04** — Add `RequestSeat` in `src/enrolment/usecase/request-seat.usecase.ts` with the checks of D-12,
  `ruleAcceptedAt` per D-04, the notification of D-13 (recipients resolved by the notifier adapter; errors
  swallowed) and the output `EnrolmentOut` (`{ id, classId, status, requestedAt }`), with tests for every
  refusal, the full class, the class without a rule, requesting again and the notification. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03, ER-07 · Done when: `npx jest test/enrolment/usecase/request-seat.usecase.test.ts`
  passes from `modules/enrolment`.
  > ✅ 2026-10-19 16:14 — added `RequestSeat` (checks in the D-12 order, `ruleAcceptedAt` per D-04, notification swallowed when the student name or the notifier fails) and the `EnrolmentOut` contract; files: `modules/enrolment/src/enrolment/usecase/request-seat.usecase.ts`, `modules/enrolment/src/enrolment/usecase/enrolment.out.ts`, `modules/enrolment/src/enrolment/usecase/index.ts`, `modules/enrolment/src/enrolment/index.ts`, `modules/enrolment/test/enrolment/usecase/request-seat.usecase.test.ts`; verified: `npx jest test/enrolment/usecase/request-seat.usecase.test.ts` from `modules/enrolment` (25 passed, use case 100% covered), tsc and oxlint clean; deviations: none

- [x] **T-05** — Add `WithdrawRequest` in `src/enrolment/usecase/withdraw-request.usecase.ts` (D-12; the
  conditional write losing → `enrolment.notPending`), with tests for success and each refusal. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-04 · Done when: `npx jest test/enrolment/usecase/withdraw-request.usecase.test.ts` passes.
  > ✅ 2026-10-19 16:15 — added `WithdrawRequest` (status 403, then `enrolment.notFound` for a non-UUID, unknown or another person's enrolment, `enrolment.notPending`, `class.started`; the conditional write losing answers `enrolment.notPending`); files: `modules/enrolment/src/enrolment/usecase/withdraw-request.usecase.ts`, `modules/enrolment/src/enrolment/usecase/index.ts`, `modules/enrolment/test/enrolment/usecase/withdraw-request.usecase.test.ts`; verified: `npx jest test/enrolment/usecase/withdraw-request.usecase.test.ts` from `modules/enrolment` (17 passed, use case 100% covered), tsc and oxlint clean; deviations: an enrolment whose class is gone also answers `enrolment.notFound`

- [x] **T-06** — Add `ExpirePendingEnrolments` in `src/enrolment/usecase/expire-pending-enrolments.usecase.ts`
  (no actor; output `{ expired }`; pushes only the rows that changed; a failing notifier swallowed), with tests
  for expiry, idempotency, untouched future and cancelled classes, and a failing notifier. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-05 · Done when: `npx jest test/enrolment/usecase/expire-pending-enrolments.usecase.test.ts` passes.
  > ✅ 2026-10-19 16:15 — added `ExpirePendingEnrolments` (no actor; reads the expirable enrolments, writes each conditionally and pushes only the rows that changed; notifier failures swallowed; output `{ expired }`); files: `modules/enrolment/src/enrolment/usecase/expire-pending-enrolments.usecase.ts`, `modules/enrolment/src/enrolment/usecase/index.ts`, `modules/enrolment/test/enrolment/usecase/expire-pending-enrolments.usecase.test.ts`; verified: `npx jest test/enrolment/usecase/expire-pending-enrolments.usecase.test.ts` from `modules/enrolment` (5 passed, use case 100% covered), tsc and oxlint clean; deviations: none

- [x] **T-07** — Add `CloseClassEnrolments` in `src/enrolment/usecase/close-class-enrolments.usecase.ts` (no
  actor; input `{ classId }`; ends the open enrolments as `classCancelled` and returns their student ids), with
  tests for open and ended enrolments. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-06 · Done when: `npx jest test/enrolment/usecase/close-class-enrolments.usecase.test.ts` passes.
  > ✅ 2026-10-19 16:15 — added `CloseClassEnrolments` (no actor; input `{ classId }`; ends the open enrolments as `classCancelled` and returns their student ids, each once); files: `modules/enrolment/src/enrolment/usecase/close-class-enrolments.usecase.ts`, `modules/enrolment/src/enrolment/usecase/index.ts`, `modules/enrolment/test/enrolment/usecase/close-class-enrolments.usecase.test.ts`; verified: `npx jest test/enrolment/usecase/close-class-enrolments.usecase.test.ts` from `modules/enrolment` (2 passed; whole module 91 passed, src 100% covered), tsc and oxlint clean; deviations: none

### Classes module (`modules/classes`)

- [x] **T-08** — Add the `ViewerEnrolmentReader` port (`src/school-class/provider/viewer-enrolment-reader.provider.ts`,
  `findLatest(viewerId, classIds) → Map<classId, ViewerEnrolment>`), `myEnrolment` on `ClassItem` and in
  `toClassItem(view, roster?, myEnrolment?)`, and make `GetClass` and `ListWeekClasses` read it for the actor;
  add a fake under `test/mock/` and update the use case tests. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-09 · Done when: `npx jest test/school-class` passes from `modules/classes` and `check-types` passes.
  > ✅ 2026-10-19 16:16 — added the `ViewerEnrolmentReader` port (`findLatest(viewerId, classIds) → Map`), `myEnrolment` on `ClassItem` (`{ id, status, requestedAt }` as ISO) and as the third argument of `toClassItem`, made `GetClass` and `ListWeekClasses` take the reader as a third constructor argument and read it for the actor (any role), added `FakeViewerEnrolmentReader` and updated the use case tests; files: `modules/classes/src/school-class/provider/viewer-enrolment-reader.provider.ts`, `modules/classes/src/school-class/provider/index.ts`, `modules/classes/src/school-class/usecase/class-item.ts`, `modules/classes/src/school-class/usecase/get-class.usecase.ts`, `modules/classes/src/school-class/usecase/list-week-classes.usecase.ts`, `modules/classes/test/mock/fake-viewer-enrolment.reader.ts`, `modules/classes/test/mock/index.ts`, `modules/classes/test/school-class/usecase/get-class.usecase.test.ts`, `modules/classes/test/school-class/usecase/list-week-classes.usecase.test.ts`; verified: `npx jest test/school-class` from `modules/classes` (342 passed, the three files 100% covered), `tsc --noEmit` and oxlint clean; deviations: `apps/backend` does not compile against the new constructors until T-13 wires the reader (expected)

- [x] **T-09** — Add the `ClassEnrolmentsCloser` port (`src/school-class/provider/class-enrolments-closer.provider.ts`,
  `closeOpenEnrolments(classId) → studentIds`) and make `CancelClass` call it after the conditional cancel and
  send `ClassChangeNotifier.classCancelled` to those students (never the caller), with tests for students told,
  none to tell, and a failing closer or notifier. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-06 · Done when: `npx jest test/school-class/usecase/cancel-class.usecase.test.ts` passes.
  > ✅ 2026-10-19 16:17 — added the `ClassEnrolmentsCloser` port (`closeOpenEnrolments(classId) → studentIds`); `CancelClass` takes it as third constructor argument, calls it after the conditional cancel (a failing closer is swallowed) and sends one `classCancelled` event to the instructors (except the caller) plus the closed students, carried in a new optional `studentIds` field of `ClassCancelled` (absent when none); added `FakeClassEnrolmentsCloser`; files: `modules/classes/src/school-class/provider/class-enrolments-closer.provider.ts`, `modules/classes/src/school-class/provider/class-change-notifier.provider.ts`, `modules/classes/src/school-class/provider/index.ts`, `modules/classes/src/school-class/usecase/cancel-class.usecase.ts`, `modules/classes/test/mock/fake-class-enrolments.closer.ts`, `modules/classes/test/mock/index.ts`, `modules/classes/test/school-class/usecase/cancel-class.usecase.test.ts`; verified: `npx jest test/school-class/usecase/cancel-class.usecase.test.ts` from `modules/classes` (32 passed, use case 100% covered), tsc and oxlint clean; deviations: the students ride in `studentIds` of the same event instead of a second `classCancelled` call, so T-14's adapter sends one push per person; the backend controller is wired in T-13

### Notifications module (`modules/notifications`)

- [x] **T-10** — Add `enrolment.requested` and `enrolment.expired` to `NOTIFICATION_TYPES` in
  `src/notification/model/notification.entity.ts`, with the entity tests updated.
  Covers: ER-05, ER-07 · Done when: `npx jest test/notification` passes from `modules/notifications`.
  > ✅ 2026-10-19 16:17 — added `enrolment.requested` and `enrolment.expired` to `NOTIFICATION_TYPES` and a test of both with their params; files: `modules/notifications/src/notification/model/notification.entity.ts`, `modules/notifications/test/notification/model/notification.entity.test.ts`; verified: `npx jest test/notification` from `modules/notifications` (all passed; the `it.each(NOTIFICATION_TYPES)` case covers the two new types too), tsc and oxlint clean; deviations: none

### Backend (`apps/backend`)

- [ ] **T-11** — Add `prisma/models/enrolment.model.prisma` (`Enrolment` → `enrolments`: `id`, `class_id` → `classes`
  `ON DELETE CASCADE`, `student_id` → `users`, `status` enum `enrolment_status`, `requested_at`,
  `rule_accepted_at`, `decided_at`, `reason`, `ended_at`, timestamps; indexes on `class_id, status` and
  `student_id`) and the migration `enrolment`, whose SQL adds the partial unique index of D-08. Skill:
  [`backend-prisma-sync-module`](../../../.claude/skills/backend-prisma-sync-module).
  Covers: enabling · Done when: `npm run prisma:migrate:deploy --workspace apps/backend` applies it on a clean
  database and `npm run check-types --workspace apps/backend` passes.

- [ ] **T-12** — Add `src/modules/enrolment/enrolment.prisma.ts` (`PrismaEnrolmentRepository`; P2002 on the
  partial index → 409 `enrolment.alreadyOpen`; conditional `updateMany` for withdraw and expire),
  `enrolment-class-reader.prisma.ts`, `student-name-reader.prisma.ts` and `system.clock.ts`, each with its spec,
  and `enrolment.module.ts`. Skill: [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05 · Done when: `npx vitest run src/modules/enrolment` passes.

- [ ] **T-13** — Implement the classes ports in `src/modules/enrolment/`: `class-roster-reader.prisma.ts`,
  `seat-counter.prisma.ts`, `pending-request-counter.prisma.ts`, `viewer-enrolment-reader.prisma.ts` and
  `enrolment.class-enrolments-closer.ts` (runs `CloseClassEnrolments`), each with its spec; export them from
  `EnrolmentModule`, import it in `ClassesModule`, wire them in `classes.controller.ts` (the viewer reader and
  the closer included), and delete the three `no-enrolment.*` files and their specs (D-11, D-16). Skill:
  [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-06, ER-08, ER-09 · Done when: `npx vitest run src/modules/enrolment src/modules/classes` passes.

- [ ] **T-14** — Add `src/modules/notifications/notifications.enrolment-notifier.ts` (`seatRequested`: approved
  admins plus the class's instructors, deduplicated; `requestExpired`), the `enrolment.requested` and
  `enrolment.expired` entries of `push-messages.ts` in pt-BR, es and en, and the student recipients of
  `class.cancelled` through the existing `NotificationsClassChangeNotifier`, with specs. Skill:
  [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-05, ER-06, ER-07 · Done when: `npx vitest run src/modules/notifications` passes.

- [ ] **T-15** — Add `src/modules/enrolment/enrolment.controller.ts` with `POST /classes/:id/enrolments` and
  `POST /enrolments/:id/withdraw` (both 2xx bodies `EnrolmentOut`), its spec, and
  `enrolment.integration.http` with the success and refusal requests. Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03, ER-04 · Done when: `npx vitest run src/modules/enrolment/enrolment.controller.spec.ts` passes.

- [ ] **T-16** — Add `src/modules/enrolment/enrolment-expiry.job.ts` (D-14, cron `enrolment-expiry`) with its spec,
  registered in `EnrolmentModule`.
  Covers: ER-05 · Done when: `npx vitest run src/modules/enrolment/enrolment-expiry.job.spec.ts` passes.

- [ ] **T-17** — Add `test/enrolment.e2e-spec.ts` (fixed classes clock, faked `ExpoPushProvider`, cleanup of its
  users, classes and enrolments) with the request, refusal, again, concurrent, withdraw, expiry (through
  `app.get(EnrolmentExpiryJob).run()`), notification, counts and `myEnrolment` cases, and the "cancel ends
  enrolments" and "delete with a pending request" cases in `test/classes.e2e-spec.ts`.
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-06, ER-07, ER-08, ER-09 · Done when: `npm run test:e2e
  --workspace apps/backend` passes.

### Mobile (`apps/mobile`)

- [ ] **T-18** — Add `myEnrolment` to the class types (`src/modules/classes/classes.types.ts`), and in
  `src/modules/enrolment/`: `enrolment.types.ts`, `hooks/use-request-seat.hook.ts` and
  `hooks/use-withdraw-request.hook.ts` (`apiPost`, no retry, invalidating `["classes"]` on success) and
  `utils/enrolment-error.ts` (the keys of ER-11 and ER-12 to translation keys), with tests. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-11, ER-12 · Done when: `npx jest src/modules/enrolment/hooks src/modules/enrolment/utils` passes.

- [ ] **T-19** — Add `src/modules/enrolment/utils/enrolment-status.ts` (the display status: `waitingList` for
  pending on a full class, D-07; banner and chip tone, icon and keys per status) with tests, and the
  `showEnrolment` prop on `ClassesWeekScreen` and `ClassCard` that draws the status chip in the right slot,
  set only by `student/(tabs)/index.tsx`, with the card tests and the copy in the three locales.
  Covers: ER-13 · Done when: `npx jest src/modules/enrolment/utils src/modules/classes/components/class-card` passes.

- [ ] **T-20** — Add `src/modules/enrolment/components/request-seat-sheet/` (component, hook, types, index:
  `BottomModal`, the rule block of D-04 with `Checkbox` and "Ler", `Button`s with `loading`) and
  `components/withdraw-request-sheet/`, with tests and the copy in the three locales.
  Covers: ER-11, ER-12 · Done when: `npx jest src/modules/enrolment/components` passes.

- [ ] **T-21** — Add `canEnrol` to `ClassDetailsScreen` (set only by `src/app/(private)/student/class/[id].tsx`):
  the hook computes the CTA of ER-10, opens the two sheets, sends once (ref guard), handles the errors of ER-11 and
  ER-12, and the screen draws the sticky footer and the status banners of ER-13 (and the student's "Turma cheia"
  description), with tests and the copy in the three locales.
  Covers: ER-10, ER-12, ER-13 · Done when: `npx jest src/modules/classes/screens/class-details.screen.test.tsx` passes.

- [ ] **T-22** — In `src/modules/notifications/hooks/`, route `enrolment.expired` and `class.cancelled` taps of the
  student flow to `routes.student.classDetail(classId)` and `enrolment.requested` taps of the admin and instructor
  flows to their class details, and invalidate `["classes"]` when any of them arrives with the app open, with
  tests.
  Covers: ER-14 · Done when: `npx jest src/modules/notifications/hooks` passes.

### Verification

- [ ] **T-23** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence.
  Covers: all · Done when: every automated command exits 0 and the user journeys are recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 041` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 041` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/enrolment --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
  - `node .specs/scripts/run-e2e.mjs 041` — the backend e2e suite passes, including `enrolment.e2e-spec.ts` and
    the new cases of `classes.e2e-spec.ts`.
  - `enrolment.integration.http` against `npm run dev` — the requests answer as ER-01–ER-04 describe.
- User journeys (e2e, followed in a browser or simulator):
  - On the iOS simulator as an approved student, open an upcoming class with free seats: "Pedir para entrar"
    opens the sheet, "Enviar pedido" is disabled until the box is ticked, "Ler" opens the rules; after sending, the
    toast "Pedido enviado", the "Pedido pendente" banner and the "Anular pedido" button show, and the Agenda card
    shows "Pendente". "Anular pedido" → "Sim, anular" shows "Pedido anulado" and "Pedir novamente".
  - With a class whose capacity equals its seats taken (set in the database), the button and sheet read "Entrar
    na lista de espera", and after sending the banner and chip read "Você está na lista de espera" / "Na lista de
    espera"; "Sair da lista de espera" withdraws at once.
  - As an admin, cancel a class the student requested: the student's details show the cancelled banner and no
    button; as an instructor or admin, the class details show no enrolment button.

## Memory Impact

- `memory/product.md` — Current state: students request seats (with the rule accepted), withdraw, request again,
  see pending / waiting list / withdrawn / expired; requests expire at the start; a cancelled class ends its
  enrolments and tells the students; admins and instructors are told of each request; the out-of-scope list
  points at specs 042–048.
- `memory/technical-context.md` — the enrolment routes and their checks, `myEnrolment` on the class item, the
  enrolment Prisma model and partial unique index, `EnrolmentExpiryJob` under Scheduled work, the two push types,
  the mobile `src/modules/enrolment` hooks, sheets and status helper, `canEnrol` / `showEnrolment`.
- `memory/structure.md` — the new workspace `modules/enrolment`, `apps/backend/src/modules/enrolment/`,
  `apps/mobile/src/modules/enrolment/`, the removed `no-enrolment.*` stubs.
- `memory/modules.md` — a new **Enrolment** module.
- `memory/modules/enrolment.md` — new: the enrolment concept, statuses, rules, permissions and boundaries.
- `memory/modules/classes.md` — the real roster, seat and pending counts; `ViewerEnrolmentReader` and
  `ClassEnrolmentsCloser`; cancelling ends the enrolments and tells the students.
- `memory/modules/notifications.md` — `enrolment.requested`, `enrolment.expired`, and `class.cancelled` to students.

## Assumptions

- Until spec 042, nothing approves a request through the app, so every class still shows 0 seats and nobody to
  users; the counts are proven with stored rows in tests.
- A deleted student's pending requests stay pending until spec 043 releases them; an admin will be able to deny
  them in spec 042.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
