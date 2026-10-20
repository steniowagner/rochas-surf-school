---
id: "042"
slug: enrolment-decisions
title: "Admins approve and deny class requests"
status: in-progress
created: 2026-10-19
started: 2026-10-20
base_commit: d3d00e160fbd02f277a9e13759df2775533c7025
fronts: [enrolment, classes, notifications, backend, mobile]
depends_on: ["041"]
---

# 042 — Admins approve and deny class requests

## Goal

Admins decide every seat: from a new "Inscrições em aulas" tool they see the pending requests grouped by class,
with each class's occupancy and, on a full class, the waiting order with the time each student asked, and
approve a request while the class has a free seat or deny it with an optional reason. The student is told of the
decision and sees it on the class: "Você está inscrito", or "Pedido recusado" with the admin's reason and the
option to request again. Nobody is told when a seat opens; admins choose who gets it.

## Context

- Product: [product.md](../../memory/product.md) — **Enrolment** (`pending` → `approved` by an admin only while
  there is a free seat and the class hasn't started, or `denied` with an optional reason), the decisions "Admins
  decide every seat" and "nobody is moved off the waiting list automatically", and the glossary's **Admin tools**
  (a card per pending item with Deny and Approve, a sheet for the reason).
- Requirements: [requirements.md → Approving a request](../../../.docs/requirements.md#approving-a-request) —
  only with a free seat and before the start, the student told;
  [Denying a request](../../../.docs/requirements.md#denying-a-request) — with a reason, the student told with it;
  [Waiting list](../../../.docs/requirements.md#waiting-list) — admins see a full class's requests in the order
  students asked, with the time; [No notice when a seat opens](../../../.docs/requirements.md#no-notice-when-a-seat-opens);
  [Request statuses](../../../.docs/requirements.md#request-statuses) — approved and denied.
- Technical: [technical-context.md](../../memory/technical-context.md) — Persistence (transactions, conditional
  writes), Push notifications, Mobile shared UI (`DecisionCard`, `DenySheet`, `BottomModal`), Mobile routes.
- Depends on: spec `041` — the `enrolment` module, its table, `myEnrolment`, the status helper and the details'
  CTA and banners; `enrolment.requested` pushes.
- Designs: `.docs/designs/admin-app.html` PAINEL-05 "Class requests" (builder `pedAulasScreen`, `botoesDecisao`,
  `vazio`, sheet `recusar`); `.docs/designs/student-app.html` MINHAS-02 (approved banner) and MINHAS-04 (the
  denial reason, sheet `motivo`), builder `detalheScreen` (`aprovado`, `recusado`). Copy is adapted from pt-PT to
  pt-BR and "o Rocha" becomes "a escola".
- Existing code this builds on: `apps/mobile/src/components/decision/` (`DecisionCard`, `DenySheet`),
  `apps/mobile/src/modules/admin/screens/registrations.screen.tsx` (the same tool pattern) and
  `admin.screen.tsx` (the home rows), `apps/mobile/src/modules/enrolment/` (spec 041).

## Scope

### In scope

- Use cases and routes to list the pending requests (admins), approve one and deny one with a reason.
- `enrolment.approved` and `enrolment.denied` notifications to the student.
- `reason` on `myEnrolment`.
- Mobile: the admin home row and the "Inscrições em aulas" screen; the student's approved and denied states, the
  reason sheet and "Pedir novamente" after a denial; the push taps.

### Out of scope

- Cancelling an approved seat (spec 043); direct enrolment and taking a student out (spec 044); guests (spec 045).
- Listing the pending requests on the admin's class details; filtering or searching the tool.
- A stored history of who decided and when shown anywhere; undoing a decision.
- Telling waiting students when a seat opens (never, by product decision).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | Approving locks the class row (`SELECT … FOR UPDATE` in one `$transaction`), counts the seats taken, refuses when full, and writes the approval conditional on `status = 'pending'`. The same lock serves direct enrolment (spec 044) and guests (spec 045). | Two approvals racing for the last seat must leave exactly one. |
| D-02 | The deny reason is optional, trimmed, a blank one stored as none, at most 500 characters (`enrolment.reason.max.length`). | The same as a registration's denial (spec 019), so `DenySheet` is reused as is. |
| D-03 | `GET /enrolments/pending` answers `{ total, classes }`: the classes that haven't started, aren't cancelled and have pending requests, sorted by start then id; each with `{ id, discipline, level, startsAt, endsAt, capacity, seatsTaken, location: { name }, requests }`, the requests in the order asked (`requestedAt`, then id) with `{ id, requestedAt, student: { id, name, photoUrl } }`. `total` counts the requests. | One read feeds both the home row's count and the tool. |
| D-04 | Checks, in order: status, then role admin (403 `user.status.notApproved` / `user.role.notAdmin`); the enrolment (non-UUID or none → 404 `enrolment.notFound`); `enrolment.notPending` (409); `class.started` (409); approve only: `enrolment.class.full` (409); deny only: `enrolment.reason.max.length` (422, checked after the id and before the state). | Access, identity, shape, then state, like the other routes. |
| D-05 | The tool reuses `DecisionCard` with the labels "Recusar" and "Inscrever", and `DenySheet` titled "Recusar inscrição?". The approve button is disabled on a full class, which also shows its note. | The registrations tool already built these for reuse (spec 019). |
| D-06 | Tapping a student's `enrolment.approved` / `enrolment.denied` push opens that class's details; tapping an admin's `enrolment.requested` push now opens the tool instead of the class (spec 041). Instructors keep the class details. | The tool is where an admin acts on a request. |
| D-07 | `myEnrolment` gains `reason: string \| null` (the denial reason here, the take-out reason in spec 044). | The student reads it on the details without another call. |

## Expected Results

### ER-01 — Admins list the pending requests by class

- **Front:** enrolment
- **Behavior:** Given pending requests in two upcoming classes, when an approved admin calls
  `GET /enrolments/pending`, then the API answers 200 with `total` equal to the number of requests and the two
  classes sorted by start, each with its capacity, seats taken, location name and its requests in the order they
  were made, each with `requestedAt` and the student's id, name and photo.
- **Edge and error cases:** classes that have started, are cancelled or have no pending request are absent; no
  pending request answers `{ total: 0, classes: [] }`; a student or an instructor answers 403 `user.role.notAdmin`.
- **Verify by:** `npx jest test/enrolment/usecase/list-pending-requests.usecase.test.ts` (from `modules/enrolment`)
  and the "lists pending" cases of `apps/backend/test/enrolment-decisions.e2e-spec.ts`.

### ER-02 — An admin approves a request while there is a free seat

- **Front:** enrolment
- **Behavior:** Given a pending request in a class that hasn't started and has a free seat, when an admin calls
  `POST /enrolments/:id/approve`, then the API answers 200 with `status: "approved"`, the class's `seatsTaken`
  grows by one and the student appears in its `students`.
- **Edge and error cases:** 404 `enrolment.notFound`; 409 `enrolment.notPending` (already decided, withdrawn,
  expired…); 409 `class.started`; 409 `enrolment.class.full` when seats taken ≥ capacity; two approvals for the
  last seat at the same moment leave exactly one approved and the other answers `enrolment.class.full` (D-01).
- **Verify by:** `npx jest test/enrolment/usecase/approve-request.usecase.test.ts` (from `modules/enrolment`),
  `npx vitest run src/modules/enrolment/enrolment.prisma.spec.ts -t "approve"` (from `apps/backend`) and the
  "approves" cases of `apps/backend/test/enrolment-decisions.e2e-spec.ts`.

### ER-03 — An admin denies a request with an optional reason

- **Front:** enrolment
- **Behavior:** Given a pending request, when an admin calls `POST /enrolments/:id/deny` with
  `{ "reason": "Esta aula é de nível avançado." }`, then the API answers 200 with `status: "denied"` and the
  reason is stored trimmed.
- **Edge and error cases:** no reason or a blank one stores none; a reason over 500 characters after trimming (or
  not a string) answers 422 `enrolment.reason.max.length`; 404, 409 `enrolment.notPending` and 409 `class.started`
  as in ER-02; a full class can still be denied.
- **Verify by:** `npx jest test/enrolment/usecase/deny-request.usecase.test.ts` (from `modules/enrolment`) and the
  "denies" cases of `apps/backend/test/enrolment-decisions.e2e-spec.ts`.

### ER-04 — The student is told of the decision, and nobody of an open seat

- **Front:** backend
- **Behavior:** Given a decided request, when it is approved the student gets `enrolment.approved` ("Pedido
  aprovado" / "Sua vaga na aula de Surf de 19/10 às 08:00 está confirmada."), and when it is denied the student gets
  `enrolment.denied` ("Pedido recusado" / the reason as written, or "A escola recusou seu pedido para a aula de
  Surf de 19/10 às 08:00." without one), both with `{ classId, discipline, startsAt }` (and `reason` when there is
  one); pt-BR shown, es and en in the catalog.
- **Edge and error cases:** no admin and no instructor is told; the other waiting students are not told; a failed
  push never changes the answer or the decision.
- **Verify by:** `npx vitest run src/modules/notifications/notifications.enrolment-notifier.spec.ts src/modules/notifications/push-messages.spec.ts`
  (from `apps/backend`) and the "notifies the student" cases of `apps/backend/test/enrolment-decisions.e2e-spec.ts`.

### ER-05 — `myEnrolment` carries the reason

- **Front:** classes
- **Behavior:** Given a student whose latest enrolment in a class was denied with a reason, when they read the
  class, then `myEnrolment` is `{ id, status: "denied", requestedAt, reason: "…" }`.
- **Edge and error cases:** every other status reads `reason: null` unless a reason was stored; a denial without
  a reason reads `null`.
- **Verify by:** `npx jest test/school-class/usecase/get-class.usecase.test.ts -t "reason"` (from `modules/classes`)
  and `npx vitest run src/modules/enrolment/viewer-enrolment-reader.prisma.spec.ts` (from `apps/backend`).

### ER-06 — The "Inscrições em aulas" tool

- **Front:** mobile
- **Behavior:** Given an admin on the home, when pending requests exist, then the "Ferramentas" section shows the
  row "Inscrições em aulas" with "N pedidos"; opening it shows the header "Inscrições em aulas" with "N pedidos ·
  M aulas" and one card per class: a day block (weekday, day number, month), "Surf · Iniciante", the time range,
  the location, "Máx. N alunos", "X vagas livres" or "Esgotado" (in `bad`) and an occupancy bar; then one
  `DecisionCard` per request with the avatar, the name and "Pediu às 09:12 · 19 out", "Recusar" and "Inscrever".
  "Inscrever" approves at once with the toast "<nome> inscrito · aluno avisado"; "Recusar" opens `DenySheet`
  ("Recusar inscrição?" / "<nome> não fica inscrito nesta aula. Você pode explicar o motivo (opcional) — a pessoa
  recebe esta mensagem.") and "Recusar e avisar" shows "<nome> recusado · aluno avisado"; a decided card leaves.
- **Edge and error cases:** a full class shows "Lista de espera · por ordem de pedido", the position "1º", "2º"…
  before each name, "Inscrever" disabled and the note "Inscrever fica bloqueado enquanto a turma estiver cheia.
  Aumente a lotação ou espere abrir uma vaga."; no request shows "Nada à espera" / "Todas as inscrições foram
  decididas." and the home row hides its count; `enrolment.notPending`, `class.started` and
  `enrolment.class.full` show their toasts and reload the list; loading, error with "Tentar novamente" and
  pull-to-refresh as on the registrations tool; all copy in pt-BR, es-ES and en-US.
- **Verify by:** `npx jest src/modules/enrolment/screens/class-requests.screen.test.tsx src/modules/admin/screens/admin.screen.test.tsx`
  (from `apps/mobile`) and the first journey of the Verification Plan.

### ER-07 — The student sees an approval or a denial

- **Front:** mobile
- **Behavior:** Given a student whose latest enrolment is approved, when the class's details render, then the
  banner "Você está inscrito" / "Sua vaga está garantida." (`ok` tint) shows, the footer has no button, and the
  Agenda card's chip reads "Aprovado" (`ok`); given one that is denied, then the banner "Pedido recusado" / "Toque
  para ver o motivo." (`bad` tint, pressable) opens a sheet with "Pedido recusado", "Surf · Iniciante · 08:00",
  "Motivo da escola" and the reason as written (or "Sem motivo indicado.") and "Fechar", the footer shows "Pedir
  novamente", and the card's chip reads "Recusado" (`bad`).
- **Edge and error cases:** after the class starts or is cancelled the denial banner stays but "Pedir novamente"
  is gone; an approved class that started shows the started banner over the approved one.
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "decision" src/modules/enrolment/components/denial-reason-sheet src/modules/enrolment/utils/enrolment-status.test.ts`
  (from `apps/mobile`).

### ER-08 — Decision pushes open the right screen

- **Front:** mobile
- **Behavior:** Given a student, when they tap an `enrolment.approved` or `enrolment.denied` push, then the app
  opens `/student/class/[id]`; given an admin, when they tap an `enrolment.requested` push, then the app opens
  `/admin/class-requests`.
- **Edge and error cases:** received with the app open, the decision pushes invalidate `["classes"]` and an
  `enrolment.requested` push also invalidates `["enrolments", "pending"]`; instructors keep opening the class.
- **Verify by:** `npx jest src/modules/notifications/hooks` (from `apps/mobile`).

## Tasks

### Enrolment module (`modules/enrolment`)

- [x] **T-01** — Add `ListPendingRequests` (`src/enrolment/usecase/list-pending-requests.usecase.ts`, admins only,
  D-03) and the repository method `findPendingByClass(now)` with the in-memory version, with tests. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01 · Done when: `npx jest test/enrolment/usecase/list-pending-requests.usecase.test.ts` passes.
  > ✅ 2026-10-20 — added `PendingRequestsClass` / `PendingRequest` read models and `findPendingByClass(now)` to the repository port, the `ListPendingRequests` use case (admins only, `total` = requests) and `pendingClasses` on the in-memory repository (it drops started and empty classes); files: `modules/enrolment/src/enrolment/provider/enrolment.repository.ts`, `modules/enrolment/src/enrolment/usecase/list-pending-requests.usecase.ts`, `modules/enrolment/src/enrolment/usecase/index.ts`, `modules/enrolment/test/mock/fake-enrolment.repository.ts`, `modules/enrolment/test/enrolment/usecase/list-pending-requests.usecase.test.ts`; verified: `npx jest test/enrolment/usecase/list-pending-requests.usecase.test.ts` (5 passed), `tsc --noEmit` clean; deviations: none (the Prisma adapter gets the method in T-05, so the backend doesn't type-check until then)

- [x] **T-02** — Add `approve(now)` and `deny(reason, now)` to the `Enrolment` entity (from pending only; the
  reason rule of D-02) and the use cases `ApproveRequest` and `DenyRequest` (D-04, the repository's locked
  `approve` returning `approved | full | notPending`, the notifier's `requestApproved` / `requestDenied`, errors
  swallowed), with tests for every refusal and the notifications. Skills:
  [`module-entity`](../../../.claude/skills/module-entity), [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-02, ER-03, ER-04 · Done when: `npx jest test/enrolment` passes from `modules/enrolment`.
  > ✅ 2026-10-20 — `Enrolment.approve` / `deny` (pending only, stamp `decidedAt`), the repository's locked `approve(id, now)` (`approved | full | notPending`) and `deny(id, reason, now)`, the notifier's `requestApproved` / `requestDenied` (`RequestDecided`, `RequestDenied`), the `ApproveRequest` and `DenyRequest` use cases (D-04 order; reason trimmed, blank → none, over 500 or not a string → 422 `enrolment.reason.max.length` after the id and before the state; pushes swallowed) and a shared `decision.ts` helper; the in-memory repository and notifier got the new methods; files: `modules/enrolment/src/enrolment/model/enrolment.entity.ts`, `modules/enrolment/src/enrolment/provider/enrolment.repository.ts`, `modules/enrolment/src/enrolment/provider/enrolment-notifier.provider.ts`, `modules/enrolment/src/enrolment/usecase/decision.ts`, `modules/enrolment/src/enrolment/usecase/approve-request.usecase.ts`, `modules/enrolment/src/enrolment/usecase/deny-request.usecase.ts`, `modules/enrolment/src/enrolment/usecase/index.ts`, `modules/enrolment/test/mock/fake-enrolment.repository.ts`, `modules/enrolment/test/mock/fake-enrolment.repository.test.ts`, `modules/enrolment/test/mock/fake-enrolment.notifier.ts`, `modules/enrolment/test/enrolment/model/enrolment.entity.test.ts`, `modules/enrolment/test/enrolment/usecase/approve-request.usecase.test.ts`, `modules/enrolment/test/enrolment/usecase/deny-request.usecase.test.ts`; verified: `npx jest` from `modules/enrolment` (10 suites, 149 passed), `tsc --noEmit` and `oxlint` clean; deviations: a denial sets `decidedAt` but not `endedAt`

### Classes module (`modules/classes`)

- [x] **T-03** — Add `reason` to `ViewerEnrolment` and to `myEnrolment` in `toClassItem`, with the use case tests.
  Covers: ER-05 · Done when: `npx jest test/school-class` passes from `modules/classes`.
  > ✅ 2026-10-20 — `ViewerEnrolment.reason?` (optional on the port so existing readers keep working) and `reason: string | null` on `myEnrolment` in `toClassItem` (`null` when absent); files: `modules/classes/src/school-class/provider/viewer-enrolment-reader.provider.ts`, `modules/classes/src/school-class/usecase/class-item.ts`, `modules/classes/test/school-class/usecase/get-class.usecase.test.ts`, `modules/classes/test/school-class/usecase/list-week-classes.usecase.test.ts`; verified: `npx jest` from `modules/classes` (33 suites, 473 passed), `tsc --noEmit` and `oxlint` clean; deviations: none

### Notifications module (`modules/notifications`)

- [x] **T-04** — Add `enrolment.approved` and `enrolment.denied` to `NOTIFICATION_TYPES`, with the entity tests.
  Covers: ER-04 · Done when: `npx jest test/notification` passes from `modules/notifications`.
  > ✅ 2026-10-20 — `enrolment.approved` and `enrolment.denied` added to `NOTIFICATION_TYPES`; files: `modules/notifications/src/notification/model/notification.entity.ts`, `modules/notifications/test/notification/model/notification.entity.test.ts`; verified: `npx jest test/notification` from `modules/notifications` (5 suites, 48 passed), `tsc --noEmit` and `oxlint` clean; deviations: none

### Backend (`apps/backend`)

- [x] **T-05** — In `src/modules/enrolment/`: `findPendingByClass` and the locked `approve` (D-01) and `deny` in
  `enrolment.prisma.ts`, and `reason` in `viewer-enrolment-reader.prisma.ts`, with specs (the concurrent approve
  included). Skill: [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-01, ER-02, ER-03, ER-05 · Done when: `npx vitest run src/modules/enrolment` passes.
  > ✅ 2026-10-20 — `PrismaEnrolmentRepository.findPendingByClass` (upcoming, uncancelled classes with pending requests, one `groupBy` for the approved seats), the locked `approve` (`$transaction`: reads the enrolment, `SELECT … FOR UPDATE` on the class row, counts approved, `full` at capacity, conditional `updateMany` on `pending`) and `deny` (conditional write with the reason); `reason` selected in `PrismaViewerEnrolmentReader`; files: `apps/backend/src/modules/enrolment/enrolment.prisma.ts`, `apps/backend/src/modules/enrolment/enrolment.prisma.spec.ts`, `apps/backend/src/modules/enrolment/viewer-enrolment-reader.prisma.ts`, `apps/backend/src/modules/enrolment/viewer-enrolment-reader.prisma.spec.ts`; verified: `npx vitest run src/modules/enrolment` (11 files, 49 passed), `oxlint` clean; deviations: the unit spec exercises the transaction with a mocked client, so the real race (two approvals for the last seat) is proved in the e2e suite of T-08; backend `tsc` stays red on the notifier until T-06 (`NotificationsEnrolmentNotifier` and `push-messages.ts` lack the new entries)

- [x] **T-06** — Add `requestApproved` / `requestDenied` to `notifications.enrolment-notifier.ts` and the two
  catalog entries of `push-messages.ts` in pt-BR, es and en, with specs. Skill:
  [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-04 · Done when: `npx vitest run src/modules/notifications` passes.
  > ✅ 2026-10-20 — `requestApproved` / `requestDenied` in `NotificationsEnrolmentNotifier` (student only, errors logged and swallowed; the reason travels only when written) and the `enrolment.approved` / `enrolment.denied` catalog entries in pt-BR, es and en (the denial body is the reason as written, else the fallback line); files: `apps/backend/src/modules/notifications/notifications.enrolment-notifier.ts`, `apps/backend/src/modules/notifications/notifications.enrolment-notifier.spec.ts`, `apps/backend/src/modules/notifications/push-messages.ts`, `apps/backend/src/modules/notifications/push-messages.spec.ts`; verified: `npx vitest run src/modules/notifications` (17 files, 129 passed), backend `tsc --noEmit` and `oxlint` clean; deviations: none

- [x] **T-07** — Add `GET /enrolments/pending`, `POST /enrolments/:id/approve` and `POST /enrolments/:id/deny` to
  `enrolment.controller.ts` (the static route before the `:id` ones), its spec and the requests in
  `enrolment.integration.http`. Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03 · Done when: `npx vitest run src/modules/enrolment/enrolment.controller.spec.ts` passes.
  > ✅ 2026-10-20 — `GET enrolments/pending` (declared first), `POST enrolments/:id/approve` and `POST enrolments/:id/deny` (200, optional `{ reason }` body) wired to `ListPendingRequests`, `ApproveRequest` and `DenyRequest`; their cases in the controller spec (route metadata and order, admin-only 403s, 404/409/422, notifications) and the requests in the REST Client file (admin sign-in, list, approve, deny, refusals); files: `apps/backend/src/modules/enrolment/enrolment.controller.ts`, `apps/backend/src/modules/enrolment/enrolment.controller.spec.ts`, `apps/backend/src/modules/enrolment/enrolment.integration.http`; verified: `npx vitest run src/modules/enrolment` (11 files, 60 passed), backend `tsc --noEmit` and `oxlint` clean; deviations: none

- [x] **T-08** — Add `test/enrolment-decisions.e2e-spec.ts` (fixed clock, faked pushes, cleanup) with the list,
  approve, full, concurrent approve, deny, refusal and notification cases.
  Covers: ER-01, ER-02, ER-03, ER-04 · Done when: `npm run test:e2e --workspace apps/backend` passes.
  > ✅ 2026-10-20 — `enrolment-decisions.e2e-spec.ts` (fixed clock, faked pushes, own users/classes/location cleaned up): the list (order by start, requests in the order asked, seats taken, started/cancelled/empty classes absent, 403/401), approve (200, seats and roster, every refusal in D-04 order, two approvals racing for the last seat leave exactly one, two approvals of the same request leave one), deny (reason trimmed and shown on `myEnrolment`, blank/missing stores none, 422 for >500 or non-string, refusals) and the notifications (student only, reason as written or the fallback, push failure keeps the decision, nothing when a seat opens); the existing `myEnrolment` expectation in `enrolment.e2e-spec.ts` now includes `reason: null`; files: `apps/backend/test/enrolment-decisions.e2e-spec.ts`, `apps/backend/test/enrolment.e2e-spec.ts`; verified: `npm run test:e2e --workspace apps/backend` (19 files, 551 passed); deviations: none

### Mobile (`apps/mobile`)

- [x] **T-09** — Add in `src/modules/enrolment/hooks/`: `use-pending-requests.hook.ts` (`["enrolments", "pending"]`),
  `use-approve-request.hook.ts` and `use-deny-request.hook.ts` (no retry; invalidate `["enrolments", "pending"]`
  and `["classes"]` on success), and their error keys in `utils/enrolment-error.ts`, with tests.
  Covers: ER-06 · Done when: `npx jest src/modules/enrolment/hooks src/modules/enrolment/utils` passes.
  > ✅ 2026-10-20 — types (`reason` on `MyEnrolment`, `PendingRequestsResponse`, `DenyRequestVariables`), `usePendingRequests` (key `["enrolments","pending"]`), `useApproveRequest` / `useDenyRequest` (no retry; invalidate the pending list and `["classes"]`), and `getDecideRequestErrorKey` / `shouldReloadRequests` in `utils/enrolment-error.ts` (toast keys `classRequests.errors.*`, added with the copy in T-10); files: `apps/mobile/src/modules/enrolment/enrolment.types.ts`, `apps/mobile/src/modules/enrolment/hooks/use-pending-requests.hook.ts`, `apps/mobile/src/modules/enrolment/hooks/use-approve-request.hook.ts`, `apps/mobile/src/modules/enrolment/hooks/use-deny-request.hook.ts`, `apps/mobile/src/modules/enrolment/hooks/use-pending-requests.hook.test.tsx`, `apps/mobile/src/modules/enrolment/hooks/use-decide-request.hook.test.tsx`, `apps/mobile/src/modules/enrolment/utils/enrolment-error.ts`, `apps/mobile/src/modules/enrolment/utils/enrolment-error.test.ts`; verified: `npx jest src/modules/enrolment/hooks src/modules/enrolment/utils` (8 suites, 68 passed), `tsc --noEmit` clean; deviations: none

- [x] **T-10** — Add `src/modules/enrolment/screens/class-requests.screen.tsx` (+ hook, types; the class card
  header, `DecisionCard`s, the waiting order, the full-class note, `DenySheet`, the states of ER-06), the route
  `src/app/(private)/admin/class-requests.tsx` and `routes.admin.classRequests`, with tests and the copy in the
  three locales. Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-06 · Done when: `npx jest src/modules/enrolment/screens` passes.
  > ✅ 2026-10-20 — `ClassRequestsScreen` (header "Inscrições em aulas" with "N pedidos · M aulas", pull-to-refresh, loading, error + retry, empty state), the `ClassRequestsGroup` component (day block, discipline · level, time range, location, "Máx. N alunos", "X vagas livres" / "Esgotado", occupancy bar, waiting-list label with "1º/2º" positions and the full-class note, one `DecisionCard` per request with "Pediu às HH:mm · d MMM"), `useClassRequestsScreen` (approve at once with the toast, deny through `DenySheet` "Recusar inscrição?", stale-list errors toast and reload), date helpers `formatAskedAt` / `formatDayBlock`, the route `(private)/admin/class-requests` and `routes.admin.classRequests`, and the `classRequests` copy in pt-BR, es-ES and en-US; `DecisionCard` got an `approveDisabled` prop (approve alone disabled on a full class); the `reason: null` field was added to the existing `MyEnrolment` test fixtures so `tsc` stays clean; files: `apps/mobile/src/modules/enrolment/screens/class-requests.screen.tsx`, `apps/mobile/src/modules/enrolment/screens/class-requests.screen.test.tsx`, `apps/mobile/src/modules/enrolment/components/class-requests-group/` (component, types, index), `apps/mobile/src/modules/enrolment/hooks/use-class-requests-screen.hook.ts`, `apps/mobile/src/modules/enrolment/utils/class-requests.ts`, `apps/mobile/src/modules/enrolment/utils/class-requests.test.ts`, `apps/mobile/src/app/(private)/admin/class-requests.tsx`, `apps/mobile/src/constants/routes.ts`, `apps/mobile/src/components/decision/decision-card/decision-card.component.tsx`, `apps/mobile/src/components/decision/decision-card/decision-card.types.ts`, `apps/mobile/src/components/decision/decision-card/decision-card.component.test.tsx`, `apps/mobile/src/i18n/messages/pt-BR.ts`, `apps/mobile/src/i18n/messages/es-ES.ts`, `apps/mobile/src/i18n/messages/en-US.ts`, fixtures in `apps/mobile/src/modules/classes/components/class-card/class-card.component.test.tsx`, `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`, `apps/mobile/src/modules/classes/screens/classes-week.screen.test.tsx`, `apps/mobile/src/modules/enrolment/hooks/use-class-enrolment.hook.test.tsx`, `apps/mobile/src/modules/enrolment/utils/enrolment-cta.test.ts`, `apps/mobile/src/modules/enrolment/utils/enrolment-status.test.ts`; verified: `npx jest src/modules/enrolment/screens src/modules/enrolment/utils src/components/decision` (7 suites, 85 passed), `tsc --noEmit` and `eslint` clean; deviations: the screen hook lives in `hooks/` (the admin module's pattern) rather than beside the screen

- [ ] **T-11** — Add the "Inscrições em aulas" row with its count to `src/modules/admin/screens/admin.screen.tsx`
  (after "Entrar na escola"), with tests and copy.
  Covers: ER-06 · Done when: `npx jest src/modules/admin/screens/admin.screen.test.tsx` passes.

- [ ] **T-12** — Add the approved and denied display statuses to `utils/enrolment-status.ts`, the
  `components/denial-reason-sheet/`, and the details' approved and denied banners and "Pedir novamente" after a
  denial, with tests and copy.
  Covers: ER-07 · Done when: `npx jest src/modules/enrolment src/modules/classes/screens/class-details.screen.test.tsx` passes.

- [ ] **T-13** — Route the student's `enrolment.approved` / `enrolment.denied` taps to the class details and the
  admin's `enrolment.requested` taps to `routes.admin.classRequests`, and invalidate the queries of ER-08 on
  receipt, with tests.
  Covers: ER-08 · Done when: `npx jest src/modules/notifications/hooks` passes.

### Verification

- [ ] **T-14** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence.
  Covers: all · Done when: every automated command exits 0 and the user journeys are recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 042` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 042` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/enrolment --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
  - `node .specs/scripts/run-e2e.mjs 042` — the backend e2e suite passes, including `enrolment-decisions.e2e-spec.ts`.
  - `enrolment.integration.http` against `npm run dev` — the list, approve and deny requests answer as ER-01–ER-03.
- User journeys (e2e, followed in a browser or simulator):
  - On the iOS simulator, a student requests two classes; as an admin, the home shows "Inscrições em aulas · 2
    pedidos"; "Inscrever" one and deny the other with a reason: each card leaves with its toast.
  - Back as the student: the approved class shows "Você está inscrito" and the "Aprovado" chip; the denied one
    shows "Pedido recusado", whose sheet shows the reason, and "Pedir novamente".
  - Fill a class to capacity (approving requests): its card in the tool shows the waiting order with "1º" and
    "Inscrever" disabled with the note.

## Memory Impact

- `memory/product.md` — Current state: admins approve (while a seat is free) and deny (with a reason) requests in
  "Inscrições em aulas"; students are told and see the result; the waiting order.
- `memory/technical-context.md` — the three routes and their checks, the locked approve, `reason` on
  `myEnrolment`, the two push types and the taps, the mobile tool screen and route.
- `memory/structure.md` — `class-requests` screen and route, `denial-reason-sheet`.
- `memory/modules.md` — None.
- `memory/modules/enrolment.md` — approval and denial rules, the pending list, admins' permissions.
- `memory/modules/notifications.md` — `enrolment.approved` and `enrolment.denied`.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
