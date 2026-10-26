---
id: "064"
slug: admin-reactivation-decisions
title: Admins decide reactivation requests
status: in-progress
created: 2026-10-26
started: 2026-10-26
base_commit: 937e2c4b34a797ff91f2122128e7963fd40e97cc
fronts: [notifications, auth, backend, mobile]
depends_on: []
---

# 064 — Admins decide reactivation requests

## Goal

Approved admins get the "Reativar contas" tool on the admin home, built like "Entrar na escola": a card per deleted
account that asked to come back, with its name, email, deletion date and number of classes taken, and Recusar and
Reativar. Approving brings the account back with its role and history; denying keeps it deleted, with an optional
message the person reads on the Account deleted screen. Admins are told when a request arrives, and the person is told
the decision by a push that now reaches deleted accounts.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: User lifecycle (`deleted` → back to `approved`
  through an approved reactivation request), Reactivation request, Admin tools ("Reactivate accounts": a card per
  pending item with Deny and Approve, a sheet for the denial reason), "Admin decisions are final in the app".
- Requirements: [requirements.md → Admins decide reactivation requests](../../../.docs/requirements.md#admins-decide-reactivation-requests)
  — admins are notified of each request, see name, email, deletion date and classes taken, approve or deny it, and the
  person is notified of the decision.
- Requirements: [requirements.md → What reactivation restores](../../../.docs/requirements.md#what-reactivation-restores)
  — approval restores the account, its history and its role, not the seats, requests or class assignments cancelled
  at deletion.
- Technical: [technical-context.md](../../memory/technical-context.md) — Fixed conventions, Automated validation
  (modules with Jest, backend unit and e2e with Vitest + supertest, mobile Jest + RNTL, journeys in the iOS simulator),
  External integrations → Push notifications.
- Modules: [modules/auth.md](../../memory/modules/auth.md) (users, `RequestReactivation`, registrations and their
  access rule), [modules/enrolment.md](../../memory/modules/enrolment.md) ("Which classes are a student's own": the
  classes a student took), [modules/notifications.md](../../memory/modules/notifications.md) (types, recipients, push
  text, "Only pending and approved accounts register a phone").
- Designs: `.docs/designs/admin-app.html` names the screen ("Requests from deleted accounts asking to come back, with
  their email and past classes") but its body can't be read from the bundle; by the user's decision the tool reuses
  the "Entrar na escola" design (spec 039) as built.
- Existing code this builds on:
  - `modules/auth/src/user/usecase/request-reactivation.usecase.ts` — a deleted account's one request: sets
    `reactivationStatus: "requested"` and `reactivationRequestedAt`; a repeat changes nothing; after a denial 409
    `user.reactivation.denied`. Notifies nobody today.
  - `modules/auth/src/user/usecase/{list-registrations,approve-registration,deny-registration,registration-access,pending-registration}.ts`
    — the registrations' list, decisions, guarded write (`updateIfPending`), access rule
    (`assertCanDecideRegistrations`) and `UUID_PATTERN`; the model for this spec.
  - `modules/auth/src/user/model/user.entity.ts` — `denialReason` (max 500, `user.denialReason`), `reactivationStatus`,
    `reactivationRequestedAt`; `deletedAt` comes from the shared `Entity` and is set by `DeleteAccount`.
  - `modules/auth/src/user/usecase/account.out.ts` — every account answer already carries `denialReason` and
    `reactivationStatus`.
  - `apps/backend/src/modules/auth/registrations.controller.ts` and
    `apps/backend/src/modules/notifications/notifications.registration-notifier.ts` — the HTTP adapter and the notifier
    adapter to mirror.
  - `apps/backend/src/modules/enrolment/my-classes-reader.prisma.ts` — `findHistoryClassIds`: the SQL of "classes a
    student took" (latest enrolment by `requested_at`, then `id`, is `approved`; class not cancelled; ended).
  - `modules/notifications/src/notification/usecase/notify-approved-admins.usecase.ts` — always sends
    `registration.pending`.
  - `modules/notifications/src/push-token/usecase/register-push-token.usecase.ts` — refuses every status but `pending`
    and `approved` with 403 `pushToken.status.notAllowed`; `apps/mobile/src/modules/notifications/hooks/use-push-registration.hook.ts`
    registers only `REGISTRABLE_STATUSES = ["pending", "approved"]`.
  - `apps/mobile/src/modules/admin/` — `AdminScreen` (the tool rows), `RegistrationsScreen`, its hooks, cache and error
    helper; `src/components/decision/{decision-card,deny-sheet}`; `src/modules/people/components/person-sheet`.
  - `apps/mobile/src/modules/reactivation/screens/reactivation.screen.tsx` — the Account deleted screen (states
    not requested, requested, denied); `src/modules/offboarding/screens/denied.screen.tsx` shows a reason as the
    `AccountStatus` `note` titled `denied.noteTitle` ("Mensagem da equipe").
  - `apps/mobile/src/modules/notifications/{hooks/use-notification-received.hook.ts,utils/notification-target.ts,utils/notification-icon.ts,utils/refresh-account.ts}`
    — what a push does in the app.

## Scope

### In scope

- `GET /reactivation-requests`, `POST /reactivation-requests/:id/approve`, `POST /reactivation-requests/:id/deny`
  and their use cases, with the classes-taken count.
- The `reactivation.requested`, `reactivation.approved` and `reactivation.denied` notifications, and the admins' one
  sent by `POST /auth/me/reactivation-request`.
- Deleted accounts registering a phone for pushes.
- Mobile: the "Reativar contas" row and tool, the reason on the Account deleted screen's denied state, the three
  pushes in the app; copy in pt-BR, es-ES and en-US.

### Out of scope

- The 30-day reactivation window and erasing deleted accounts (requirements → Reactivation window): requests stay
  listed and decidable whatever the deletion date (D-04).
- Removing accounts and restoring removed ones.
- Restoring the seats, pending requests or class assignments cancelled at deletion.
- Showing a deleted person's WhatsApp number, photo or class list in the tool.
- A notification to the other admins when a request is decided; undoing a decision.
- Changing the copy of the Account deleted screen's "not requested" and "requested" states.
- The web app.

## Decisions

| ID | Decision | Reason |
| --- | --- | --- |
| D-01 | Deny takes an optional reason (body `{ reason }`), trimmed; blank counts as none; a non-string is refused with 422 `reactivation.reason.invalid`; over 500 characters fails the entity's `user.denialReason` rule (422). It is stored in the existing `denialReason` field (no migration), sent in the `reactivation.denied` push, and shown on the Account deleted screen's denied state. | `product.md` → Admin tools gives every tool a denial-reason sheet, and the design is "Entrar na escola"'s. A deleted account was approved once, so its `denialReason` is otherwise empty. |
| D-02 | `classesTaken` counts, for the account, the classes that ended, aren't cancelled and where its latest enrolment (by `requested_at`, then `id`) is `approved` — the history rule of spec 048 — for every role (an instructor or admin with no student seat shows 0). Computed when the list is read, through a new auth port `ClassesTakenCounter.countTaken(userIds: string[], now: Date): Promise<Record<string, number>>` (every id present, 0 by default), implemented by a Prisma adapter in the backend's enrolment folder. | One definition of "classes taken" in the product; counting taught classes would be a second contract for a rare case. |
| D-03 | Approving sets `status: "approved"` and clears `deletedAt`, `reactivationStatus` and `reactivationRequestedAt`; role, name, WhatsApp number, rules acceptances and history stay. So a reactivated account that deletes itself again can send one new request. Denying sets `reactivationStatus: "denied"` (and the reason) and keeps the account `deleted`; a denial is final (`RequestReactivation` keeps refusing with 409 `user.reactivation.denied`). | "One request per deletion": a person who came back and left again isn't locked out; a denial stays final as the requirements say. |
| D-04 | The 30-day window isn't checked: every deleted account with a `requested` request is listed and can be decided. | It belongs with the erasure of deleted accounts, its own spec. |
| D-05 | Notifications: `RequestReactivation` sends `reactivation.requested` with params `{ name, userId }` to every approved admin only when it records the request (not on a repeat, not after a denial); `ApproveReactivation` sends `reactivation.approved` (no params) to the person; `DenyReactivation` sends `reactivation.denied` (`{ reason }` when there is one) to the person. All through a new auth port `ReactivationNotifier` whose backend adapter logs and swallows every error, like `NotificationsRegistrationNotifier`. `NotifyApprovedAdmins` takes the type (`registration.pending` or `reactivation.requested`). Text in Copy. | Mirrors the registration notifications; a notification never changes the answer of the request that caused it. |
| D-06 | `RegisterPushToken` accepts `deleted` accounts (still 403 `pushToken.status.notAllowed` for `denied` and `removed`), and the app adds `"deleted"` to `REGISTRABLE_STATUSES`. | Without it the decision push reaches no phone: a deleted account signs out on deletion and could never register again. |
| D-07 | Routes, all authenticated, in `apps/backend/src/modules/auth/reactivation-requests.controller.ts`: `GET /reactivation-requests` → 200 `{ items: [{ id, name, email, role, deletedAt, requestedAt, classesTaken }] }` (ISO 8601 UTC dates), ordered by `requestedAt` ascending, then `id`; `POST /reactivation-requests/:id/approve` → 200 `{ id, decision: "approved" }`; `POST /reactivation-requests/:id/deny` → 200 `{ id, decision: "denied" }`. Checks in order: caller not approved → 403 `user.status.notApproved`; caller not admin → 403 `user.role.notAdmin` (`assertCanDecideRegistrations`); id not a UUID or no such user → 404 `reactivation.notFound`; user not `deleted` with `reactivationStatus: "requested"` → 409 `reactivation.status.notRequested`; then the reason (D-01). | The registrations' contract and order: access, then the target, then its state. |
| D-08 | `UserRepository.updateIfReactivationRequested(user): Promise<boolean>` writes only while the stored user is `deleted` with `reactivationStatus` `requested` (one conditional update); `false` → 409 `reactivation.status.notRequested`, and nothing is notified. `UserRepository.findReactivationRequests()` returns those users, ordered as in D-07. | Two admins deciding at once, or approve and deny together, leave exactly one decision. |
| D-09 | The tool reuses "Entrar na escola" as built: `ScreenIntro`, collapsing title, pull to refresh, skeleton, `ErrorState` with retry, `EmptyState`, `DecisionCard` and `DenySheet`. A card: `PersonAvatar`, the name, details `[email, "Excluída em {date} · {n} aulas"]` (`date` with `Intl.DateTimeFormat(<app language>, { day: "numeric", month: "short", year: "numeric" })`, `n` pluralized), `Reativar` and `Recusar`. Tapping a card opens `PersonSheet` with the person's name, role and email, and no WhatsApp number. A decided card leaves the list; a 409 `reactivation.status.notRequested` toasts "Este pedido já foi decidido." and reloads the list; other errors use the registrations' toasts. The admin-home row and the tool read one query (`["reactivation-requests"]`, no retry). | The user's design decision; same behavior as the tool admins already know. |
| D-10 | A received `reactivation.requested` push invalidates `["reactivation-requests"]`; tapping it (push or row) in the admin flow opens the tool. A received `reactivation.approved` or `reactivation.denied` reloads the account (`refreshAccount`, as `registration.*`), so the flow guards move the app; their target is `null` (the flow's home). Icons: `reactivation.requested` `refresh-circle-outline` (info), `reactivation.approved` `checkmark-circle-outline` (ok), `reactivation.denied` `close-circle-outline` (bad). | Same mechanism as the registration pushes (spec 020, 055). |
| D-11 | Nothing new for the returning account's onboarding: an approved account that has its WhatsApp number and accepted the rules before goes to its role's home, or to "Regras atualizadas" when the rules changed while it was away (existing `resolveFlow`). | Requirements → School rules: a returning account accepts again; already built (spec 013). |

## Copy

New mobile keys (pt-BR / es-ES / en-US). `{{name}}` in the deny sheet is the person's full name, as in
"Entrar na escola". The row's subtitle reuses `admin.home.waiting` and `admin.home.nothingPending`; the deny sheet's
"Voltar" and the error toasts reuse the registrations' keys.

| Key | pt-BR | es-ES | en-US |
| --- | --- | --- | --- |
| `admin.home.reactivationsRow` | Reativar contas | Reactivar cuentas | Reactivate accounts |
| `reactivations.title` | Reativar contas | Reactivar cuentas | Reactivate accounts |
| `reactivations.waiting` | {{count}} esperando resposta | {{count}} esperando respuesta | {{count}} waiting for an answer |
| `reactivations.description` | Contas excluídas que pediram para voltar. Reativar devolve a conta, o histórico e o papel, mas não as vagas canceladas. A pessoa recebe uma notificação push. | Cuentas eliminadas que pidieron volver. Reactivar devuelve la cuenta, el historial y el rol, pero no las plazas canceladas. La persona recibe una notificación push. | Deleted accounts that asked to come back. Reactivating restores the account, its history and its role, but not cancelled seats. The person gets a push notification. |
| `reactivations.details_one` / `_other` | Excluída em {{date}} · {{count}} aula / aulas | Eliminada el {{date}} · {{count}} clase / clases | Deleted {{date}} · {{count}} class / classes |
| `reactivations.approve` | Reativar | Reactivar | Reactivate |
| `reactivations.deny` | Recusar | Rechazar | Deny |
| `reactivations.empty.title` | Nenhum pedido | Ninguna solicitud | No requests |
| `reactivations.empty.description` | Os pedidos de contas excluídas que querem voltar aparecem aqui. | Las solicitudes de cuentas eliminadas que quieren volver aparecen aquí. | Requests from deleted accounts that want to come back show up here. |
| `reactivations.loadError.title` | Não foi possível carregar os pedidos | No se pudieron cargar las solicitudes | Couldn't load the requests |
| `reactivations.loadError.description` | Confira sua conexão e tente de novo. | Comprueba tu conexión e inténtalo de nuevo. | Check your connection and try again. |
| `reactivations.alreadyDecided` | Este pedido já foi decidido. | Esta solicitud ya fue decidida. | This request was already decided. |
| `reactivations.denySheet.title` | Recusar reativação? | ¿Rechazar la reactivación? | Deny reactivation? |
| `reactivations.denySheet.hint` | A conta de {{name}} vai continuar excluída. Você pode explicar o motivo (opcional) — a pessoa recebe esta mensagem. | La cuenta de {{name}} seguirá eliminada. Puedes explicar el motivo (opcional): la persona recibe este mensaje. | {{name}}'s account will stay deleted. You can explain why (optional) — the person gets this message. |
| `reactivations.denySheet.label` | Motivo (opcional) | Motivo (opcional) | Reason (optional) |
| `reactivations.denySheet.placeholder` | Escreva uma mensagem para a pessoa. | Escribe un mensaje para la persona. | Write a message to the person. |
| `reactivations.denySheet.confirm` | Recusar e avisar | Rechazar y avisar | Deny and notify |
| `reactivation.denied.noteTitle` | Mensagem da equipe | Mensaje del equipo | Message from the team |

The Account deleted screen's note title takes the same text as `denied.noteTitle` in each language (check the
existing value and keep them equal).

Push and in-app text (backend `push-messages.ts`; `{name}` the account's name):

| Type | Language | Title | Body |
| --- | --- | --- | --- |
| `reactivation.requested` | pt-BR | Pedido de reativação | {name} quer voltar para a escola. |
| | es | Solicitud de reactivación | {name} quiere volver a la escuela. |
| | en | Reactivation request | {name} wants to come back to the school. |
| `reactivation.approved` | pt-BR | Conta reativada | Você já pode voltar a usar o app. |
| | es | Cuenta reactivada | Ya puedes volver a usar la app. |
| | en | Account reactivated | You can use the app again. |
| `reactivation.denied` | pt-BR | Reativação recusada | the reason as written, or "Abra o app para saber mais." |
| | es | Reactivación rechazada | the reason as written, or "Abre la app para saber más." |
| | en | Reactivation denied | the reason as written, or "Open the app to learn more." |

The in-app body of `reactivation.denied` is the reason, or empty without one (as `registration.denied`).

## Expected Results

### ER-01 — Admins list the reactivation requests

- **Front:** backend
- **Behavior:** Given deleted accounts A (requested on Oct 10) and B (requested on Oct 5), a deleted account C that
  never requested, a deleted account D whose request was denied, and an approved account E, when an approved admin
  calls `GET /reactivation-requests`, then the API answers 200 with `items` = [B, A], each
  `{ id, name, email, role, deletedAt, requestedAt, classesTaken }`, with A's `classesTaken` = 2 when A had an
  approved seat in two ended, non-cancelled classes.
- **Edge and error cases:** no request → `items: []`; a seat later withdrawn, cancelled or taken out, a class cancelled,
  or a class that hasn't ended doesn't count; an account that never had a seat has `classesTaken: 0`; equal
  `requestedAt` order by `id`.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/reactivation-requests.e2e-spec.ts -t "lists"` from
  `apps/backend`; `npx jest test/user/usecase/list-reactivation-requests.usecase.test.ts` from `modules/auth`.

### ER-02 — Approving brings the account back

- **Front:** backend
- **Behavior:** Given a deleted instructor with a `requested` reactivation, when an approved admin calls
  `POST /reactivation-requests/:id/approve`, then the API answers 200 `{ id, decision: "approved" }`, and the account's
  `GET /auth/me` shows `status: "approved"`, `role: "instructor"`, `reactivationStatus: null`, with its name and
  WhatsApp number unchanged; it no longer appears in `GET /reactivation-requests`.
- **Edge and error cases:** the seats and requests cancelled when it was deleted stay cancelled (no `approved`
  enrolment comes back); after deleting itself again, the account can send `POST /auth/me/reactivation-request` and
  shows up in the list again.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/reactivation-requests.e2e-spec.ts -t "approves"` from
  `apps/backend`; `npx jest test/user/usecase/approve-reactivation.usecase.test.ts` from `modules/auth`.

### ER-03 — Denying keeps the account deleted, with the reason

- **Front:** backend
- **Behavior:** Given a deleted account with a `requested` reactivation, when an approved admin calls
  `POST /reactivation-requests/:id/deny` with `{ "reason": "  Turmas cheias.  " }`, then the API answers 200
  `{ id, decision: "denied" }`, and the account's `GET /auth/me` shows `status: "deleted"`,
  `reactivationStatus: "denied"`, `denialReason: "Turmas cheias."`.
- **Edge and error cases:** no body, or a blank reason → `denialReason: null`; a non-string reason → 422
  `reactivation.reason.invalid`; 501 characters → 422 with `user.denialReason`, nothing changed; afterwards
  `POST /auth/me/reactivation-request` by that account → 409 `user.reactivation.denied`.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/reactivation-requests.e2e-spec.ts -t "denies"` from
  `apps/backend`; `npx jest test/user/usecase/deny-reactivation.usecase.test.ts` from `modules/auth`.

### ER-04 — Refused decisions change nothing

- **Front:** backend
- **Behavior:** Given a deleted account with a `requested` reactivation, when the list or a decision is called by an
  approved student or instructor, then the API answers 403 `user.role.notAdmin`; by a pending admin, 403
  `user.status.notApproved`; and when two approved admins approve and deny it at the same moment, exactly one answers
  200 and the other 409 `reactivation.status.notRequested`, and the account carries only the winning decision.
- **Edge and error cases:** an id that isn't a UUID, or an unknown id → 404 `reactivation.notFound`; an approved, a
  removed, a deleted-without-request or an already-decided account → 409 `reactivation.status.notRequested`; no token →
  401; in every refused case the account is unchanged and no notification is stored.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/reactivation-requests.e2e-spec.ts -t "refuses"` from
  `apps/backend`.

### ER-05 — Admins and the person are notified

- **Front:** backend
- **Behavior:** Given two approved admins and one pending admin, when a deleted account named "Ana Souza" calls
  `POST /auth/me/reactivation-request` for the first time, then each approved admin (not the pending one) gets one
  stored `reactivation.requested` notification with params `{ name: "Ana Souza", userId }`, pushed in pt-BR as
  "Pedido de reativação" / "Ana Souza quer voltar para a escola."; when an admin approves it, the person gets one
  `reactivation.approved` ("Conta reativada" / "Você já pode voltar a usar o app."); when an admin denies another with
  a reason, the person gets one `reactivation.denied` whose body is the reason.
- **Edge and error cases:** a repeated request, or one refused after a denial, notifies nobody; a denial without a
  reason has the body "Abra o app para saber mais." (es and en per Copy); the deciding admin gets nothing; a failing
  push or notification store never changes the 200 answer.
- **Verify by:** `npx vitest run src/modules/notifications/push-messages.spec.ts -t "reactivation"` and
  `npx vitest run src/modules/notifications/notifications.reactivation-notifier.spec.ts` from `apps/backend`;
  `npx vitest run --config vitest.config.e2e.ts test/reactivation-requests.e2e-spec.ts -t "notifies"` from
  `apps/backend`.

### ER-06 — A deleted account registers its phone

- **Front:** backend
- **Behavior:** Given a deleted account signed in, when it registers an Expo push token, then the API accepts it as it
  does for an approved account, and a later `reactivation.approved` is pushed to that token.
- **Edge and error cases:** a denied or a removed account is still refused with 403 `pushToken.status.notAllowed`.
- **Verify by:** `npx jest test/push-token/usecase/register-push-token.usecase.test.ts` from `modules/notifications`;
  `npx vitest run --config vitest.config.e2e.ts test/notifications.e2e-spec.ts -t "deleted account"` from
  `apps/backend`.

### ER-07 — The admin home shows the tool with its count

- **Front:** mobile
- **Behavior:** Given an approved admin and 3 reactivation requests, when the admin home loads, then the tools section
  shows the row "Reativar contas" with the subtitle "3 esperando" and a badge 3, and tapping it opens the tool.
- **Edge and error cases:** no request → subtitle "Nada pendente" and no badge; while loading or after an error, no
  subtitle and no badge.
- **Verify by:** `npx jest src/modules/admin/screens/admin.screen.test.tsx -t "reactivation"` from `apps/mobile`;
  journey: as the admin review account, open the admin home and see the row with the count.

### ER-08 — The tool decides requests

- **Front:** mobile
- **Behavior:** Given 2 requests, when the admin opens "Reativar contas", then they see the intro "2 esperando resposta"
  and a card per request (name, email, "Excluída em 12 de out. de 2026 · 8 aulas", Recusar and Reativar); Reativar
  removes the card; Recusar opens the sheet "Recusar reativação?" with the optional reason (max 500), and "Recusar e
  avisar" sends it and removes the card; tapping a card opens the person sheet with the name, the role and the email.
- **Edge and error cases:** loading shows the skeleton; a failed load shows the error state with retry; no request
  shows "Nenhum pedido"; a 409 `reactivation.status.notRequested` toasts "Este pedido já foi decidido." and reloads the
  list; a network error toasts the registrations' no-connection message and keeps the card; buttons ignore presses
  while their card is sending; pull to refresh reloads; "1 aula" in the singular.
- **Verify by:** `npx jest src/modules/admin -t "reactivation"` from `apps/mobile`; journey: as the admin review
  account, with a deleted seeded account that requested reactivation, open the tool, deny with a reason, see the card
  leave.

### ER-09 — The denied Account deleted screen shows the team's message

- **Front:** mobile
- **Behavior:** Given a deleted account with `reactivationStatus: "denied"` and `denialReason: "Turmas cheias."`, when
  it opens the app, then the Account deleted screen's denied state shows the note "Mensagem da equipe" with
  "Turmas cheias." exactly as written.
- **Edge and error cases:** no reason, or a blank one → no note; the not-requested and requested states never show
  the note.
- **Verify by:** `npx jest src/modules/reactivation/screens/reactivation.screen.test.tsx -t "reason"` from
  `apps/mobile`; journey: sign in with the account denied in ER-08's journey and see the message.

### ER-10 — The reactivation pushes act in the app

- **Front:** mobile
- **Behavior:** Given an admin with the app open, when a `reactivation.requested` push arrives, then the reactivation
  requests reload (the tool and the home count), and tapping it (push or notifications row) opens the tool; given a
  deleted person with the app open, when `reactivation.approved` or `reactivation.denied` arrives, then the account is
  reloaded, so an approved account moves to its role's home (or "Regras atualizadas") and a denied one shows the denied
  state.
- **Edge and error cases:** the tap of a `reactivation.approved` or `.denied` leads to the flow's home (`null` target);
  `reactivation.requested` outside the admin flow leads nowhere; each type has its icon (D-10); a deleted account
  registers its phone at sign-in and at launch; a denied or removed one still doesn't.
- **Verify by:** `npx jest src/modules/notifications -t "reactivation"` from `apps/mobile`.

## Tasks

### Notifications module (`modules/notifications`)

- [x] **T-01** — Add `reactivation.requested`, `reactivation.approved` and `reactivation.denied` to
  `NOTIFICATION_TYPES` in `src/notification/model/notification.entity.ts`, and give `NotifyApprovedAdmins`
  (`src/notification/usecase/notify-approved-admins.usecase.ts`) a `type` input (`"registration.pending"` |
  `"reactivation.requested"`, default `registration.pending`), with tests in
  `test/notification/usecase/notify-approved-admins.usecase.test.ts` and the entity test.
  Covers: ER-05 · Done when: `npx jest` passes in `modules/notifications`.
  > ✅ 2026-10-26 — added the three types to `NOTIFICATION_TYPES` (the entity test's `it.each` covers them) and the optional `type` input to `NotifyApprovedAdmins`; files: `modules/notifications/src/notification/model/notification.entity.ts`, `modules/notifications/src/notification/usecase/notify-approved-admins.usecase.ts`, `modules/notifications/test/notification/usecase/notify-approved-admins.usecase.test.ts`; verified: `npx jest` in `modules/notifications` (17 suites, 183 passed); deviations: none
- [x] **T-02** — Let `RegisterPushToken` (`src/push-token/usecase/register-push-token.usecase.ts`) accept `deleted`
  accounts (D-06), with tests in `test/push-token/usecase/register-push-token.usecase.test.ts` for deleted (accepted),
  denied and removed (403).
  Covers: ER-06 · Done when: `npx jest test/push-token/usecase/register-push-token.usecase.test.ts` passes.
  > ✅ 2026-10-26 — `deleted` is now registrable; tests: deleted accepted, denied/removed/unknown refused; files: `modules/notifications/src/push-token/usecase/register-push-token.usecase.ts`, `modules/notifications/test/push-token/usecase/register-push-token.usecase.test.ts`; verified: `npx jest` in `modules/notifications` (183 passed); deviations: none

### Auth module (`modules/auth`)

- [x] **T-03** — Add the ports `ReactivationNotifier` (`reactivationRequested({ id, name })`,
  `reactivationApproved(userId)`, `reactivationDenied(userId, reason?)`) and `ClassesTakenCounter` (D-02) in
  `src/user/provider/`, the `UserRepository` methods `findReactivationRequests` and `updateIfReactivationRequested`
  (D-08), their fakes in `test/mock/` (including `fake-user.repository.ts`), and make `RequestReactivation` notify the
  admins only when it records the request (D-05), with tests in
  `test/user/usecase/request-reactivation.usecase.test.ts`.
  Covers: ER-01, ER-05 · Done when: `npx jest` passes and `npm run check-types` exits 0 in `modules/auth`.
  > ✅ 2026-10-26 — added the `ReactivationNotifier` and `ClassesTakenCounter` ports, `findReactivationRequests` / `updateIfReactivationRequested` on `UserRepository`, their fakes, and `RequestReactivation` now notifies admins only when it records the request; files: `modules/auth/src/user/provider/{reactivation-notifier,classes-taken-counter}.provider.ts`, `modules/auth/src/user/provider/index.ts`, `modules/auth/src/user/provider/user.repository.ts`, `modules/auth/src/user/usecase/request-reactivation.usecase.ts`, `modules/auth/test/mock/{fake-reactivation-notifier,fake-classes-taken-counter}.provider.ts`, `modules/auth/test/mock/{index,fake-user.repository}.ts`, `modules/auth/test/user/usecase/request-reactivation.usecase.test.ts`, `modules/auth/test/user/provider/user.repository.test.ts`; verified: `npx jest` (30 suites, 415 passed) and `npm run check-types` exit 0 in `modules/auth`; deviations: `apps/backend` does not type-check until T-08 passes the notifier to `RequestReactivation`.
- [x] **T-04** — Add `ListReactivationRequests`, `ApproveReactivation` and `DenyReactivation` in
  `src/user/usecase/{list-reactivation-requests,approve-reactivation,deny-reactivation}.usecase.ts` plus a
  `reactivation-request.ts` helper (find by id with D-07's 404/409), exported from the index; access by
  `assertCanDecideRegistrations`; D-01, D-03, D-05, D-07, D-08. Tests in `test/user/usecase/` for every case of ER-01 to
  ER-05. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05 · Done when: `npx jest test/user/usecase` passes in `modules/auth`.
  > ✅ 2026-10-26 — added `ListReactivationRequests`, `ApproveReactivation`, `DenyReactivation` and the `findReactivationRequest` helper (404/409), exported from the index, with a test file per use case covering ER-01 to ER-05 (order, classes taken, clearing on approval, reason handling, refusals, lost race, no notification on refusal); files: `modules/auth/src/user/usecase/{reactivation-request.ts,list-reactivation-requests.usecase.ts,approve-reactivation.usecase.ts,deny-reactivation.usecase.ts,index.ts}`, `modules/auth/test/user/usecase/{list-reactivation-requests,approve-reactivation,deny-reactivation}.usecase.test.ts`; verified: `npx jest test/user/usecase` (17 suites, 219 passed), `npm run check-types` exit 0 in `modules/auth`; deviations: the `module-use-case` skill was not invoked, the files follow `*-registration` use cases one to one.

### Backend (`apps/backend`)

- [x] **T-05** — Implement `findReactivationRequests` and `updateIfReactivationRequested` (one conditional
  `updateMany` on `status = deleted AND reactivation_status = requested`, writing `null` for the cleared fields) in
  `src/modules/auth/user.prisma.ts`, with specs in `user.prisma.spec.ts`.
  Skill: [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-01, ER-02, ER-04 · Done when: `npx vitest run src/modules/auth/user.prisma.spec.ts` passes.
  > ✅ 2026-10-26 — added `findReactivationRequests` (deleted + requested, ordered by `reactivationRequestedAt`, then `id`) and `updateIfReactivationRequested` (one `updateMany` on `status = deleted AND reactivationStatus = requested`; `toData` writes `null` for the cleared fields) with specs; files: `apps/backend/src/modules/auth/user.prisma.ts`, `apps/backend/src/modules/auth/user.prisma.spec.ts`; verified: `npx vitest run src/modules/auth/user.prisma.spec.ts` (29 passed); deviations: none.
- [x] **T-06** — Add `src/modules/enrolment/classes-taken-counter.prisma.ts` (`PrismaClassesTakenCounter`, one SQL
  query with `findHistoryClassIds`' rule grouped by student, no date range), provided and exported by the enrolment
  module, with `classes-taken-counter.prisma.spec.ts`.
  Skill: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-01 · Done when: `npx vitest run src/modules/enrolment/classes-taken-counter.prisma.spec.ts` passes.
  > ✅ 2026-10-26 — added `PrismaClassesTakenCounter` (one SQL query: `findHistoryClassIds`' rule grouped by student with `ANY(ids)`, no date range, every id present with 0 by default), provided and exported by `EnrolmentModule`; files: `apps/backend/src/modules/enrolment/classes-taken-counter.prisma.ts`, `apps/backend/src/modules/enrolment/classes-taken-counter.prisma.spec.ts`, `apps/backend/src/modules/enrolment/enrolment.module.ts`; verified: `npx vitest run src/modules/enrolment/classes-taken-counter.prisma.spec.ts` (3 passed); the SQL itself runs against Postgres in T-09; deviations: none (rebuilt `modules/auth` and `modules/notifications` `dist/` so the backend sees the new ports).
- [x] **T-07** — Add `src/modules/notifications/notifications.reactivation-notifier.ts`
  (`NotificationsReactivationNotifier`: admins through `NotifyApprovedAdmins` with `reactivation.requested`, the person
  through `Notify`; errors logged and swallowed), exported from the notifications module, and the three entries of
  `push-messages.ts` (Copy), with `notifications.reactivation-notifier.spec.ts` and `push-messages.spec.ts` cases.
  Covers: ER-05 · Done when: `npx vitest run src/modules/notifications` passes.
  > ✅ 2026-10-26 — added `NotificationsReactivationNotifier` (admins through `NotifyApprovedAdmins` with `reactivation.requested`, the person through `Notify`; errors logged and swallowed), registered and exported by `NotificationsModule`, the three `push-messages.ts` entries (`reactivation.denied` has an empty in-app body without a reason) and their specs; files: `apps/backend/src/modules/notifications/notifications.reactivation-notifier.ts`, `apps/backend/src/modules/notifications/notifications.reactivation-notifier.spec.ts`, `apps/backend/src/modules/notifications/notifications.module.ts`, `apps/backend/src/modules/notifications/push-messages.ts`, `apps/backend/src/modules/notifications/push-messages.spec.ts`; verified: `npx vitest run src/modules/notifications` (20 files, 231 passed); deviations: none.
- [x] **T-08** — Add `src/modules/auth/reactivation-requests.controller.ts` (the three routes of D-07, wired in
  `auth.module.ts`) with `reactivation-requests.controller.spec.ts` and `reactivation-requests.integration.http`, and
  pass the notifier to `RequestReactivation` in `auth.controller.ts` (spec updated).
  Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05 · Done when: `npx vitest run src/modules/auth` passes and
  > ✅ 2026-10-26 — added `ReactivationRequestsController` (`GET /reactivation-requests`, `POST :id/approve`, `POST :id/deny`, wired in `AuthModule`), its spec and REST Client file; `AuthController` now passes `NotificationsReactivationNotifier` to `RequestReactivation` (spec updated); files: `apps/backend/src/modules/auth/reactivation-requests.controller.ts`, `apps/backend/src/modules/auth/reactivation-requests.controller.spec.ts`, `apps/backend/src/modules/auth/reactivation-requests.integration.http`, `apps/backend/src/modules/auth/auth.module.ts`, `apps/backend/src/modules/auth/auth.controller.ts`, `apps/backend/src/modules/auth/auth.controller.spec.ts`; verified: `npx vitest run src/modules/auth` (17 files, 176 passed), `npm run check-types` exit 0 in `apps/backend`; deviations: none.
  `npm run check-types --workspace apps/backend` exits 0.
- [x] **T-09** — Add `test/reactivation-requests.e2e-spec.ts` (faked pushes, cleanup of what it creates) with the
  describes "lists", "approves", "denies", "refuses" (including the deterministic race) and "notifies", and the
  "deleted account" case in `test/notifications.e2e-spec.ts`.
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-06 · Done when: `npm run test:e2e --workspace apps/backend` passes.
  > ✅ 2026-10-26 — added `test/reactivation-requests.e2e-spec.ts` (faked pushes, cleans up what it creates) with "lists", "approves", "denies", "refuses" (including the approve/deny race by two admins) and "notifies", and the "registers for a deleted account" case in `test/notifications.e2e-spec.ts` (the old "refuses a deleted account" case now covers denied and removed only); this ran the new `classes-taken-counter` SQL against Postgres; files: `apps/backend/test/reactivation-requests.e2e-spec.ts`, `apps/backend/test/notifications.e2e-spec.ts`; verified: `npx vitest run --config vitest.config.e2e.ts test/reactivation-requests.e2e-spec.ts test/notifications.e2e-spec.ts` (74 passed); `npm run test:e2e --workspace apps/backend` → 26 files / 733 tests passed, 3 failed in `test/classes.e2e-spec.ts` ("suggestions": two cases and "keeps the suggestions route"), not touched by this spec; deviations: those 3 fail because the dev database holds `admin@example.com` classes from last week (2026-10-16 to 10-18) that the suggestions queries pick up, so the full-suite command does not exit 0 on this database. Rerun in T-15 on a fresh temporary database (migrations applied, dropped afterwards): 27 files / 736 tests passed.

### Mobile (`apps/mobile`)

- [x] **T-10** — Add the data layer in `src/modules/admin/`: `reactivations.types.ts`,
  `utils/reactivations-cache.ts` (`["reactivation-requests"]`, remove one item),
  `utils/reactivation-error.ts` (already decided → `reactivations.alreadyDecided`, the rest as
  `getRegistrationErrorKey`), and the hooks `use-reactivation-requests.hook.ts`, `use-approve-reactivation.hook.ts`,
  `use-deny-reactivation.hook.ts` (no retry; 409 invalidates the list), with tests.
  Covers: ER-08 · Done when: `npx jest src/modules/admin -t "reactivation"` passes.
  > ✅ 2026-10-26 — added the data layer: types, cache helper (`["reactivation-requests"]`, remove one item), error helper (already decided → `reactivations.alreadyDecided`, the rest as `getRegistrationErrorKey`) and the hooks `useReactivationRequests`, `useApproveReactivation`, `useDenyReactivation` (no retry; 409 invalidates the list), with tests; files: `apps/mobile/src/modules/admin/reactivations.types.ts`, `apps/mobile/src/modules/admin/utils/{reactivations-cache,reactivation-error}.ts` (+ `.test.ts`), `apps/mobile/src/modules/admin/hooks/{use-reactivation-requests,use-approve-reactivation,use-deny-reactivation}.hook.ts`, `apps/mobile/src/modules/admin/hooks/{use-reactivation-requests,use-decide-reactivation}.hook.test.tsx`, `apps/mobile/src/modules/admin/registrations.test-utils.tsx` (added `CARLA` and `DAVI`); verified: `npx jest src/modules/admin -t "reactivation"` (4 suites, 19 passed), `npx tsc --noEmit` clean; deviations: none.
- [x] **T-11** — Add `src/modules/admin/screens/reactivations.screen.tsx` with `hooks/use-reactivations-screen.hook.ts`
  (D-09), the route `src/app/(private)/admin/reactivations.tsx`, `routes.admin.reactivations` in
  `src/constants/routes.ts`, and the `reactivations.*` copy in `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`, with
  `reactivations.screen.test.tsx` and the hook test.
  Covers: ER-08 · Done when: `npx jest src/modules/admin` passes.
  > ✅ 2026-10-26 — added `ReactivationsScreen` (intro, collapsing title, pull to refresh, skeleton, error/empty states, `DecisionCard`s with email and "Excluída em {date} · {n} aulas", `DenySheet`, `PersonSheet` with no WhatsApp number) with `useReactivationsScreen`, the route `/admin/reactivations`, `routes.admin.reactivations`, the `reactivations.*` copy in pt-BR, es-ES and en-US, and tests; files: `apps/mobile/src/modules/admin/screens/reactivations.screen.tsx`, `apps/mobile/src/modules/admin/screens/reactivations.screen.test.tsx`, `apps/mobile/src/modules/admin/hooks/use-reactivations-screen.hook.ts`, `apps/mobile/src/modules/admin/hooks/use-reactivations-screen.types.ts`, `apps/mobile/src/modules/admin/utils/reactivation-date.ts`, `apps/mobile/src/modules/admin/utils/reactivation-date.test.ts`, `apps/mobile/src/app/(private)/admin/reactivations.tsx`, `apps/mobile/src/constants/routes.ts`, `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`, plus Prettier formatting of `use-deny-reactivation.hook.ts` and `reactivation-error.test.ts` from T-10; verified: `npx jest src/modules/admin` (15 suites, 124 passed), `npx tsc --noEmit` and `npx eslint src/modules/admin src/app src/constants` clean; deviations: the date helper formats in `America/Fortaleza` (the project's display zone) besides D-09's options; the loading state reuses `RegistrationsSkeleton` as D-09 says, so its accessible label is the registrations' text; hook test of the screen is covered through the screen test.
- [x] **T-12** — Add the "Reativar contas" row to `src/modules/admin/screens/admin.screen.tsx` (after "Entrar na
  escola", icon `account-reactivate-outline`, count from `useReactivationRequests`), the
  `admin.home.reactivationsRow` copy, and cases in `admin.screen.test.tsx`.
  Covers: ER-07 · Done when: `npx jest src/modules/admin/screens/admin.screen.test.tsx` passes.
  > ✅ 2026-10-26 — added the "Reativar contas" row (icon `account-reactivate-outline`, after the registrations row, count and badge from `useReactivationRequests`, no subtitle/badge while loading or on error) and `admin.home.reactivationsRow`; the shared fetch mocks of the admin home tests now answer `/reactivation-requests`; new cases: row order, count + badge + opens the tool, "Nothing pending", no subtitle on error; files: `apps/mobile/src/modules/admin/screens/admin.screen.tsx`, `apps/mobile/src/modules/admin/screens/admin.screen.test.tsx`, `apps/mobile/src/modules/admin/admin-tabs.navigation.test.tsx`, `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`; verified: `npx jest src/modules/admin` (15 suites, 127 passed), `npx tsc --noEmit` and `npx eslint src/modules/admin` clean; deviations: Prettier reformatted the two touched test files beyond the lines changed.
- [x] **T-13** — Show the reason as the `note` (`reactivation.denied.noteTitle`) of the denied state in
  `src/modules/reactivation/screens/reactivation.screen.tsx`, with the copy and cases in
  `reactivation.screen.test.tsx`.
  Covers: ER-09 · Done when: `npx jest src/modules/reactivation` passes.
  > ✅ 2026-10-26 — the denied state of the Account deleted screen now shows `denialReason` as the note titled `reactivation.denied.noteTitle` (equal to `denied.noteTitle` in all three languages), nothing when empty or blank, never in the other states; files: `apps/mobile/src/modules/reactivation/screens/reactivation.screen.tsx`, `apps/mobile/src/modules/reactivation/screens/reactivation.screen.test.tsx`, `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`; verified: `npx jest src/modules/reactivation` (2 suites, 29 passed), `npx tsc --noEmit`, `npx eslint src/modules/reactivation` clean; deviations: none.
- [x] **T-14** — Handle the three types in `src/modules/notifications/hooks/use-notification-received.hook.ts`,
  `utils/notification-target.ts` and `utils/notification-icon.ts` (D-10), and add `"deleted"` to
  `REGISTRABLE_STATUSES` in `hooks/use-push-registration.hook.ts` (D-06), with their tests.
  Covers: ER-10 · Done when: `npx jest src/modules/notifications` passes.
  > ✅ 2026-10-26 — the app handles the three pushes: `reactivation.requested` reloads `["reactivation-requests"]` and opens the tool for the admin flow (null elsewhere), `reactivation.approved` / `.denied` refresh the account and have a null target, icons per D-10, and `"deleted"` joins `REGISTRABLE_STATUSES`; tests updated (target table of 22 types, icons, received cases, push registration for deleted vs denied/removed; the received-hook test tree gained the reactivation route so a deleted account renders); files: `apps/mobile/src/modules/notifications/hooks/use-notification-received.hook.ts`, `apps/mobile/src/modules/notifications/hooks/use-push-registration.hook.ts`, `apps/mobile/src/modules/notifications/utils/notification-target.ts`, `apps/mobile/src/modules/notifications/utils/notification-icon.ts`, and their `.test.ts(x)` files; verified: `npx jest src/modules/notifications` (14 suites, 355 passed), `npx tsc --noEmit`, `npx eslint src/modules/notifications` clean; deviations: none.

### Verification

- [x] **T-15** — Run every command in the Verification Plan from the repo root; all pass. Record the output summary
  as evidence.
  Covers: all · Done when: every automated command exits 0 and the user journeys are recorded.
  > ✅ 2026-10-26 — ran the Verification Plan: `node .specs/scripts/run-related-tests.mjs 064` → RELATED TESTS PASSED (backend, mobile, auth, notifications, plus classes, enrolment and school-rules for regression); `node .specs/scripts/check-coverage.mjs 064` → COVERAGE OK (33 files); `npx turbo run lint check-types build --concurrency=1` for auth, notifications, backend and mobile → 27/27 tasks successful (concurrency 1 because backend `build` and `check-types` both run `prisma generate`); the backend e2e suite passes on a fresh temporary database: 27 files / 736 tests (on the dev database 3 `classes` "suggestions" cases fail from leftover manual data, see T-09); `node .specs/scripts/run-e2e.mjs 064` on the dev database therefore reports failed for that reason only. Fixes found while verifying: the fetch mocks of the rules-update, school-rules and root-navigator tests now answer `/reactivation-requests` like `/registrations` (the admin home asks for it), a hook test for `useReactivationsScreen` covers the double-tap, expired-session and no-sheet branches, and the e2e spec sorts ids with a comparator (lint); files: `apps/mobile/src/modules/rules-update/screens/rules-update.screen.test.tsx`, `apps/mobile/src/modules/onboarding/screens/school-rules.screen.test.tsx`, `apps/mobile/src/navigation/root-navigator/root-navigator.component.test.tsx`, `apps/mobile/src/modules/admin/hooks/use-reactivations-screen.hook.test.tsx`, `apps/backend/test/reactivation-requests.e2e-spec.ts`; user journeys NOT run (no simulator session, no seeded deleted accounts): to check, as the admin review account open the admin home and see "Reativar contas" with its count (ER-07), open the tool and see name, email and "Excluída em … · N aulas", tap a card for the person sheet, Reativar one and Recusar another with a reason (ER-08), then sign in with the denied account and see "Mensagem da equipe" with the reason (ER-09) and with the approved one to reach its role home or "Regras atualizadas" (ER-02); on a physical phone, check the three pushes (ER-10); deviations: none.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 064` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 064` — every line this spec adds or changes is covered
  - `node .specs/scripts/run-e2e.mjs 064` — the backend e2e suite passes (Postgres up, migrations applied), including
    `test/reactivation-requests.e2e-spec.ts` and the "deleted account" case of `test/notifications.e2e-spec.ts`
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — lint, type check and build of the workspaces touched
- User journeys (iOS simulator, backend running with seeded accounts; create the deleted accounts with a request
  through the API or the database):
  - As the admin review account, the admin home shows "Reativar contas" with the count and badge (ER-07).
  - Open the tool: the cards show name, email and "Excluída em … · N aulas"; tap a card to see the person sheet;
    "Reativar" removes a card; "Recusar" with a reason removes another (ER-08).
  - Sign in with the denied account: the Account deleted screen shows "Pedido recusado" and "Mensagem da equipe" with
    the reason (ER-09); sign in with the approved one: it opens its role's home or "Regras atualizadas" (ER-02).
  - Not on a simulator (no push token): on a physical phone, sign in with a deleted account and request reactivation;
    an admin gets "Pedido de reativação" and its tap opens the tool; deciding it pushes "Conta reativada" or
    "Reativação recusada" to the phone, and the app moves (ER-10). Covered in Jest otherwise.

## Memory Impact

- `memory/product.md` — Reactivation request: admins decide it in "Reativar contas" (classes taken, optional denial
  reason shown on Account deleted); one request per deletion; deleted accounts get pushes; the 30-day window still
  not enforced.
- `memory/modules/auth.md` — `ListReactivationRequests`, `ApproveReactivation`, `DenyReactivation` (checks, keys,
  guarded write, what approval clears), the `ReactivationNotifier` and `ClassesTakenCounter` ports,
  `RequestReactivation` notifying admins, the new repository methods, Who can do what, spec history.
- `memory/modules/enrolment.md` — the classes-taken count adapter reuses "the classes a student took".
- `memory/modules/notifications.md` — the three types, recipients, params and text; `NotifyApprovedAdmins` takes the
  type; deleted accounts register a phone; what the app does with each push.
- `memory/structure.md` — the routes `GET /reactivation-requests`, `POST /reactivation-requests/:id/{approve,deny}`,
  the new backend files and `test/reactivation-requests.e2e-spec.ts`, the mobile route `/admin/reactivations` and its
  screen, hooks and utils.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
