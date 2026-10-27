---
id: "066"
slug: admin-account-removal
title: Admins remove and restore accounts
status: accepted
created: 2026-10-27
started: 2026-10-27
base_commit: 3a42e0ef439dbfab6e36f195660851d46333ed68
reviewed_commit: 1519e5642a0270486c48fef62a1753cad3848763
fronts: [notifications, auth, backend, mobile]
depends_on: []
---

# 066 — Admins remove and restore accounts

## Goal

Approved admins remove any other approved member of the school from the People screen ("Remover da plataforma"):
the account becomes `removed` and gives up its upcoming seats, pending requests and class assignments, as a
self-deletion does. For 30 days, admins restore a removed account from the "Contas removidas" section at the end of
People: it comes back `approved` with its role and history, without the seats and classes it gave up. The person is
told both times by a push, so an open app moves to the "Access removed" screen and back.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: User lifecycle (`approved` → `removed` by an
  admin, back to `approved` by a restore within 30 days), Roles and "there is always an admin", People directory,
  "Admin decisions are final in the app" (a restore is the one way back from a removal).
- Requirements: [requirements.md → Removal by admins](../../../.docs/requirements.md#removal-by-admins) — admins
  remove a user; removing closes the account and cancels its upcoming seats, pending requests and class assignments,
  as deleting does; the removed user sees the Access removed screen (built in spec 016).
- Requirements: [requirements.md → Restoring a removed account](../../../.docs/requirements.md#restoring-a-removed-account)
  — admins restore a removed account within 30 days, bringing back what an approved reactivation brings back. Only
  the restore is built here; erasing the account when the 30 days end is spec 067 (D-01).
- Requirements: [requirements.md → Changing admins](../../../.docs/requirements.md#changing-admins) — an admin can
  remove another admin (the role change was spec 058).
- Requirements: [requirements.md → At least one admin](../../../.docs/requirements.md#at-least-one-admin) — the only
  admin can't be removed.
- Requirements: [requirements.md → Handling deletion requests from the page](../../../.docs/requirements.md#handling-deletion-requests-from-the-page)
  — admins carry out a deletion request from the public page by removing the account; the erasure 30 days later is
  spec 067.
- Technical: [technical-context.md](../../memory/technical-context.md) — Fixed conventions, Authentication (every
  request reloads role and status), External integrations → Push notifications, Automated validation (modules with
  Jest, backend unit and e2e with Vitest + supertest, mobile Jest + RNTL, journeys in the iOS simulator), Coverage.
- Modules: [modules/auth.md](../../memory/modules/auth.md) (Deleting one's account, Changing someone's role, "There is
  always an approved admin", the `TeachingReleaser` / `SeatReleaser` / `RoleChangeNotifier` contracts, Who can do
  what), [modules/notifications.md](../../memory/modules/notifications.md) (types, push text, which statuses register
  a phone).
- Designs: `.docs/designs/admin-app.html` (its screens are stored gzip-compressed in the bundle; decoded for this
  plan): the person sheet's red "Remover da plataforma" action ("Perde o acesso à app. Restaurável durante 30
  dias."), hidden on the only admin; the "Remover {nome}?" confirmation, whose text depends on the role, with
  "Remover da plataforma" and "Voltar"; and, at the end of People, "Contas removidas · restauráveis durante 30 dias",
  a row per removed account (dimmed avatar, name, "Removida a 2 set · até 2 out") with an outlined "Restaurar"
  button (`rotate-ccw` icon) that acts at once. The copy is adapted to Brazilian Portuguese (D-11).
- Existing code this builds on:
  - `modules/auth/src/user/usecase/change-role.usecase.ts` — the model for `RemoveUser`: `assertCanDecideRegistrations`,
    `UUID_PATTERN`, the self check, the releases (seats, then teaching with the admin as actor), the guarded write
    `updateKeepingAnAdmin` (`"updated" | "changed" | "lastAdmin"`) and the notification after it.
  - `modules/auth/src/user/usecase/delete-account.usecase.ts` — what a closed account gives up and in which order.
  - `modules/auth/src/user/usecase/approve-reactivation.usecase.ts` and `UserRepository.updateIfReactivationRequested`
    — the model for `RestoreAccount` and its conditional write.
  - `modules/auth/src/user/model/user.entity.ts` — `status: "removed"` and `removedAt` already exist (spec 016);
    `apps/backend/src/modules/auth/user.prisma.ts` already maps `removed_at`. No migration is needed.
  - `apps/backend/src/modules/auth/people.controller.ts` — `GET /people` and `PUT /people/:id/role`.
  - `apps/backend/src/modules/notifications/notifications.role-change-notifier.ts` and `push-messages.ts` — the
    notifier adapter and the push catalog to mirror.
  - `modules/notifications/src/push-token/usecase/register-push-token.usecase.ts` and
    `apps/mobile/src/modules/notifications/hooks/use-push-registration.hook.ts` — `REGISTRABLE_STATUSES = ["pending",
    "approved", "deleted"]` on both sides.
  - `apps/mobile/src/modules/people/` — `PeopleScreen` and `use-people-screen.hook.ts`, `use-people.hook.ts`
    (paged directory), `components/person-sheet`, `components/person-role-actions`,
    `components/role-change-confirmation`, `hooks/use-change-role.hook.ts`, `utils/role-change-error.ts`.
  - `apps/mobile/src/modules/notifications/{hooks/use-notification-received.hook.ts,utils/notification-target.ts,utils/notification-icon.ts,utils/refresh-account.ts}`
    — what a push does in the app; `role.changed` is the model.
  - `apps/mobile/src/navigation/resolve-flow.ts` — a `removed` account resolves to `offboarding-removed`.
  - `apps/backend/test/people-roles.e2e-spec.ts` — fixed clocks, setting the shared database's own admins aside, and
    forcing the last-admin race with `FOR UPDATE`.

## Scope

### In scope

- `POST /people/:id/remove` and the `RemoveUser` use case: checks, releases, guarded write, `account.removed`.
- `GET /people/removed` and the `ListRemovedAccounts` use case: removed accounts inside their 30-day window.
- `POST /people/:id/restore` and the `RestoreAccount` use case: checks, the window, conditional write,
  `account.restored`.
- The `AccountRemovalNotifier` contract, its backend adapter, the `account.removed` and `account.restored` types and
  their push and in-app text in pt-BR, es and en.
- `RegisterPushToken` accepting `removed` accounts, and the app registering a removed account's phone.
- Mobile: the "Remover da plataforma" action and its confirmation on the person sheet of People; the "Contas
  removidas" section with "Restaurar"; what the two pushes do in the app; the copy in pt-BR, es-ES and en-US.

### Out of scope

- Erasing deleted and removed accounts when their 30 days end, and showing "Ex-aluno" / "Ex-instrutor" in their place
  (spec 067).
- Removing a pending, denied, deleted or already removed account, or one's own account (that is "Remover a conta" in
  the Profile).
- The remove action on the person sheet opened from the class details or from "Entrar na escola".
- Giving back, on restore, the seats, pending requests or class assignments released by the removal.
- A confirmation before "Restaurar", a success toast, and undoing a removal any other way.
- Ending the removed account's sessions or removing its push tokens on removal (D-03).
- Changing the fixed "9 na plataforma" text of the People rows on the homes.
- The web app.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | Removal and restore are this spec; the erasure of deleted and removed accounts after 30 days, with the "Ex-aluno" / "Ex-instrutor" labels, is spec 067. | Decided with the user: erasure needs a new account state, a migration and changes to every reader of a person's name; removal reuses existing patterns and ships without waiting for it. |
| D-02 | `RemoveUser` checks, in this order: the caller's status (403 `user.status.notApproved`) and role (403 `user.role.notAdmin`) through `assertCanDecideRegistrations`; an id that isn't a UUID or names no account (404 `user.notFound`); the caller's own account (403 `user.remove.self`); an account that isn't `approved` (409 `user.status.notApproved`). Then the releases, as `ChangeRole` does: the upcoming seats and pending requests (`SeatReleaser.releaseSeats`), then the upcoming classes with the admin as actor (`TeachingReleaser.releaseUpcomingClasses(id, actorId)`), for every role. Then `updateKeepingAnAdmin` writes `status: "removed"` and `removedAt: now` while the stored role and status are the ones read: `"changed"` → 409 `user.status.notApproved`, `"lastAdmin"` → 409 `user.role.lastAdmin`. The answer is 200 `{ id, status: "removed" }`. A failed release fails the call and writes nothing more; releasing twice changes nothing, so a retry is safe. | Same rules and order as a role change and a deletion (spec 058), so one guard keeps an approved admin when two admins remove each other at the same moment. |
| D-03 | Removal keeps the account's sessions, identities and push tokens; its reactivation fields, denial reason and accepted rules are untouched. | Every request reloads role and status, so the removal applies at once; the removed person must still sign in to see "Access removed", and the kept phone is how the restore push reaches them. |
| D-04 | After a removal is written, the person gets `account.removed`; after a restore is written, `account.restored` — both with no params, through the new `AccountRemovalNotifier` contract (`accountRemoved(userId)`, `accountRestored(userId)`), adapted with `Notify` in the backend. The acting admin is never told; nothing is notified on a refusal; a failed notification is logged and never changes the answer. The releases' own notices go out as for a role change (`enrolment.cancelled` to admins and the class's instructors, `class.noInstructor` without the acting admin). | Mirrors `role.changed` (spec 058); the push is what moves an open app. |
| D-05 | `RegisterPushToken` accepts `removed` accounts (pending, approved, deleted and removed register; denied is still refused with 403 `pushToken.status.notAllowed`), and the app's `REGISTRABLE_STATUSES` adds `removed`. | A removed person who signs out and in again on another phone would otherwise never hear the restore; spec 064 did the same for deleted accounts. |
| D-06 | `GET /people/removed` is for approved admins (refused as in D-02's first two checks). It lists the `removed` accounts whose `removedAt` is less than 30 × 24 hours before now, most recent removal first, ties by id; each item is `{ id, name, role, removedAt }` (ISO text). No paging: `{ items }`. A removed account with no `removedAt` is never listed. | The window bounds the list; the app computes "até" from `removedAt`. |
| D-07 | `RestoreAccount` checks, in this order: D-02's caller checks; an id that isn't a UUID or names no account (404 `user.notFound`); an account that isn't `removed` (409 `user.status.notRemoved`); `removedAt` missing or 30 × 24 hours old or more (409 `removal.window.ended`, even before spec 067's job erases it). Then one conditional write (`updateIfRemoved`) sets `status: "approved"` and clears `removedAt`, only while the stored account is still `removed`: of two restores at the same moment exactly one wins and the other gets 409 `user.status.notRemoved`. Role, name, email, WhatsApp number and its visibility, accepted rules and history stay. The answer is 200 `{ id, status: "approved" }`. | Same shape as a reactivation decision (spec 064); the window is a rule, not a matter of when the job runs. |
| D-08 | In the app, "Remover da plataforma" (red, `trash-2`-style icon, subtitle "Perde o acesso ao app. Restaurável durante 30 dias.") is the last action on another member's sheet on the People screen, for every role, shown only to an approved admin — below the role actions of spec 058, which keep their conditions. None on the viewer's own sheet, for non-admin viewers, or on the sheets opened from the class details and "Entrar na escola". | As in the design (`pessoaCtx === 'escola'` hides it). The viewer is an admin and never the target, so the target is never the only admin and the design's only-admin note is not needed. |
| D-09 | The action swaps the sheet's content for its confirmation, built like the role-change confirmation: title "Remover {{name}}?" (first name), the text for a student or for an instructor or admin (copy table), "Remover da plataforma" (danger) and "Voltar" (back to the details). Confirming sends the removal once (the button ignores presses while it runs), closes the sheet and reloads the people, the classes and the removed accounts, with no success toast. A refusal or failure shows its toast and keeps the confirmation; an expired session shows none. | Same behavior as role changes (spec 058, D-15 copy rules). |
| D-10 | The "Contas removidas" section (hint "restauráveis durante 30 dias") is the People list's footer: shown only to an approved admin, with no search text and no role filter, once the directory's last page has loaded (or it is empty), and only when `GET /people/removed` answered at least one item; hidden while that query loads or after it fails. Each row: the initials avatar dimmed, the name, "{{role}} · removida em {{date}} · até {{until}}" (day and short month in the app language, Fortaleza time; `until` = `removedAt` + 30 days) and an outlined "Restaurar" button. Pull-to-refresh reloads it with the people. | As in the design, decided with the user; a footer only makes sense on the full, unfiltered list. |
| D-11 | "Restaurar" acts at once, without a confirmation: the row's button shows its loading state and ignores presses while it runs, the other rows stay usable; on success the row leaves the section and the people reload, with no success toast. `user.status.notRemoved` toasts "Esta conta já não está removida." and `removal.window.ended` toasts "O prazo para restaurar esta conta acabou."; both reload the removed accounts. Other failures use the people's existing generic toast and keep the row. | As in the design (restoring is the safe direction); no success toast, as for role changes. |
| D-12 | With the app open, `account.removed` and `account.restored` reload the account (`refreshAccount`), so the flow guards move the app to "Access removed" or back to the role's flow, and an admin's app reloads the people; tapping either push or its notifications row reloads the account and opens the home of the flow it resolves to (as `role.changed`). Icons: `account.removed` `person-remove-outline` (tone bad), `account.restored` `person-add-outline` (tone ok). | Same handling as the role change push. |
| D-13 | Routes: `POST /people/:id/remove`, `GET /people/removed`, `POST /people/:id/restore`, in `PeopleController`; `GET removed` is declared before any `:id` route. The new use cases live in `modules/auth/src/user/usecase/` (`remove-user`, `list-removed-accounts`, `restore-account`). | Follows the `/people/:id/role` style and the module that owns users. |
| D-14 | Copy is the Brazilian Portuguese adaptation of the design ("você", "ao app", "em que está atribuído", "Removida em"), with es-ES and en-US translations, as in the copy table below. `{{name}}` is the first name (the name up to its first space). | The product is in Brazilian Portuguese; consistent with spec 058's copy. |

### Copy

| Key | pt-BR | es-ES | en-US |
| --- | ----- | ----- | ----- |
| `people.removeAction.title` | Remover da plataforma | Quitar de la plataforma | Remove from the platform |
| `people.removeAction.subtitle` | Perde o acesso ao app. Restaurável durante 30 dias. | Pierde el acceso a la app. Se puede restaurar durante 30 días. | Loses access to the app. Can be restored for 30 days. |
| `people.removeConfirm.title` | Remover {{name}}? | ¿Quitar a {{name}}? | Remove {{name}}? |
| `people.removeConfirm.student` | Perde o acesso ao app. As vagas que ocupava ficam livres e não passam automaticamente para a lista de espera. Você pode restaurar a conta durante 30 dias. | Pierde el acceso a la app. Sus plazas quedan libres y no pasan automáticamente a la lista de espera. Puedes restaurar la cuenta durante 30 días. | Loses access to the app. Their seats become free and don't go to the waiting list automatically. You can restore the account for 30 days. |
| `people.removeConfirm.staff` | Sai das próximas aulas em que está atribuído e perde o acesso ao app. Você pode restaurar a conta durante 30 dias. | Sale de las próximas clases en las que está asignado y pierde el acceso a la app. Puedes restaurar la cuenta durante 30 días. | Leaves the upcoming classes they're assigned to and loses access to the app. You can restore the account for 30 days. |
| `people.removeConfirm.confirm` | Remover da plataforma | Quitar de la plataforma | Remove from the platform |
| `people.removeConfirm.back` | Voltar | Volver | Back |
| `people.removed.title` | Contas removidas | Cuentas quitadas | Removed accounts |
| `people.removed.hint` | restauráveis durante 30 dias | se pueden restaurar durante 30 días | can be restored for 30 days |
| `people.removed.row` | {{role}} · removida em {{date}} · até {{until}} | {{role}} · quitada el {{date}} · hasta el {{until}} | {{role}} · removed {{date}} · until {{until}} |
| `people.removed.restore` | Restaurar | Restaurar | Restore |
| `people.removed.errors.notRemoved` | Esta conta já não está removida. | Esta cuenta ya no está quitada. | This account is no longer removed. |
| `people.removed.errors.windowEnded` | O prazo para restaurar esta conta acabou. | El plazo para restaurar esta cuenta terminó. | The time to restore this account has ended. |
| push `account.removed` title / body | Acesso removido / Um admin removeu seu acesso à escola. | Acceso quitado / Un admin quitó tu acceso a la escuela. | Access removed / An admin removed your access to the school. |
| push `account.restored` title / body | Acesso restaurado / Sua conta está de volta, com seu histórico e seu papel. | Acceso restaurado / Tu cuenta volvió, con tu historial y tu rol. | Access restored / Your account is back, with your history and your role. |

The removal's refusals reuse the role change's toasts (`utils/role-change-error.ts`): `user.status.notApproved` and
`user.role.lastAdmin` keep their current text.

## Expected Results

### ER-01 — An admin removes an approved member

- **Front:** backend
- **Behavior:** Given an approved student S with an approved seat and a pending request in classes that haven't
  started and an approved seat in an ended class, and an approved instructor I assigned to an upcoming class (alone)
  and to an ended one, when an approved admin A calls `POST /people/:id/remove` for S and then for I, then each call
  answers 200 `{ id, status: "removed" }`; S's upcoming seat is cancelled and its request withdrawn while the ended
  seat stays approved; I leaves the upcoming class (which is flagged without an instructor) and stays on the ended
  one; both accounts' `GET /auth/me` shows `status: "removed"`, and neither appears in `GET /people`.
- **Edge and error cases:** removing another admin works the same way and leaves A as an approved admin; the
  `class.noInstructor` notice of I's class goes to the approved admins except A; S's other accounts' data is
  untouched; the removed accounts' sessions still work and read `status: "removed"`.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/people-removal.e2e-spec.ts -t "removes"` from
  `apps/backend`; `npx jest test/user/usecase/remove-user.usecase.test.ts` from `modules/auth`.

### ER-02 — A refused removal changes nothing

- **Front:** backend
- **Behavior:** Given the cases below, when `POST /people/:id/remove` is called, then it answers, in this order of
  checks: a caller that isn't approved → 403 `user.status.notApproved`; an approved non-admin → 403
  `user.role.notAdmin`; an id that isn't a UUID or names no account → 404 `user.notFound`; the caller's own id → 403
  `user.remove.self`; a pending, denied, deleted or removed target → 409 `user.status.notApproved`; and no account,
  seat, request or class assignment changes.
- **Edge and error cases:** no token → 401 `auth.token.invalid`; a failing release fails the call and the account
  stays approved (use case test with a failing fake releaser); a target whose role changed between the read and the
  write → 409 `user.status.notApproved`.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/people-removal.e2e-spec.ts -t "refuses"` from
  `apps/backend`; `npx jest test/user/usecase/remove-user.usecase.test.ts -t "refuses"` from `modules/auth`.

### ER-03 — Two admins removing each other leave one admin

- **Front:** backend
- **Behavior:** Given exactly two approved admins A and B (the database's other admins set aside), when A removes B
  and B removes A at the same moment, then exactly one call answers 200 and the other 409 `user.role.lastAdmin`, and
  exactly one of A and B is still an approved admin.
- **Edge and error cases:** the race is forced by holding the approved admins' rows `FOR UPDATE` until both requests
  wait on the lock, as in `people-roles.e2e-spec.ts`; the use case answers `user.role.lastAdmin` when the repository
  reports `"lastAdmin"`.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/people-removal.e2e-spec.ts -t "last admin"` from
  `apps/backend`.

### ER-04 — Admins list the removed accounts inside their window

- **Front:** backend
- **Behavior:** Given removed accounts R1 (removed 2 days ago), R2 (removed 1 hour ago) and R3 (removed 30 days and 1
  minute ago), a deleted account and an approved one, when an approved admin calls `GET /people/removed`, then it
  answers 200 `{ items: [R2, R1] }`, each `{ id, name, role, removedAt }`.
- **Edge and error cases:** no removed account → `{ items: [] }`; equal `removedAt` ordered by id; a removed account
  with no `removedAt` isn't listed; an approved non-admin → 403 `user.role.notAdmin`; a caller that isn't approved →
  403 `user.status.notApproved`; the route isn't taken as `/people/:id`.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/people-removal.e2e-spec.ts -t "lists"` from
  `apps/backend`; `npx jest test/user/usecase/list-removed-accounts.usecase.test.ts` from `modules/auth`.

### ER-05 — A restore brings the account back with its role

- **Front:** backend
- **Behavior:** Given an instructor removed 3 days ago, whose upcoming class assignment was released by the removal,
  when an approved admin calls `POST /people/:id/restore`, then it answers 200 `{ id, status: "approved" }`; the
  account's `GET /auth/me` shows `status: "approved"`, `role: "instructor"`, its name and WhatsApp number unchanged; it
  appears in `GET /people` and no longer in `GET /people/removed`; it is not back on the released class.
- **Edge and error cases:** a restored student's cancelled seats and withdrawn requests stay cancelled; a restored
  account that had accepted the current school rules is still `rulesAccepted: true`; the restored account can be
  removed again and is listed again with its new `removedAt`.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/people-removal.e2e-spec.ts -t "restores"` from
  `apps/backend`; `npx jest test/user/usecase/restore-account.usecase.test.ts` from `modules/auth`.

### ER-06 — A refused restore changes nothing

- **Front:** backend
- **Behavior:** Given the cases below, when `POST /people/:id/restore` is called, then it answers, in this order of
  checks: D-02's caller refusals (403 `user.status.notApproved`, 403 `user.role.notAdmin`); an id that isn't a UUID or
  names no account → 404 `user.notFound`; an approved, pending, denied or deleted target → 409
  `user.status.notRemoved`; a target removed 30 × 24 hours ago or more → 409 `removal.window.ended`; and the account
  doesn't change.
- **Edge and error cases:** two restores of the same account at the same moment: exactly one answers 200 and the other
  409 `user.status.notRemoved`, and `account.restored` is sent once; a removed account with no `removedAt` → 409
  `removal.window.ended`.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/people-removal.e2e-spec.ts -t "refuses to restore"`
  from `apps/backend`; `npx jest test/user/usecase/restore-account.usecase.test.ts -t "refuses"` from `modules/auth`.

### ER-07 — The person is told of the removal and the restore

- **Front:** backend
- **Behavior:** Given a member with a registered phone in `pt-BR`, when an admin removes them, then one
  `account.removed` notification is stored for them and pushed with title "Acesso removido" and body "Um admin
  removeu seu acesso à escola."; when the admin then restores them, one `account.restored` is stored and pushed with
  "Acesso restaurado" / "Sua conta está de volta, com seu histórico e seu papel."; `GET /notifications` of the person
  lists both with that text.
- **Edge and error cases:** the acting admin gets neither; a refused removal or restore notifies nobody; a notifier
  that throws doesn't change the 200 answer (use case tests); the es and en texts follow the copy table
  (`push-messages.spec.ts`).
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/people-removal.e2e-spec.ts -t "notifies"` from
  `apps/backend`; `npx vitest run src/modules/notifications/notifications.account-removal-notifier.spec.ts src/modules/notifications/push-messages.spec.ts`
  from `apps/backend`.

### ER-08 — A removed account registers its phone

- **Front:** backend
- **Behavior:** Given a removed account, when it calls `PUT /notifications/push-token` with a valid Expo token and
  locale, then it answers 204 and the token is stored for it.
- **Edge and error cases:** a denied account is still refused with 403 `pushToken.status.notAllowed`; pending,
  approved and deleted accounts still register.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/people-removal.e2e-spec.ts -t "registers"` from
  `apps/backend`; `npx jest test/push-token/usecase/register-push-token.usecase.test.ts` from `modules/notifications`.

### ER-09 — The person sheet offers "Remover da plataforma" to admins

- **Front:** mobile
- **Behavior:** Given an approved admin on the People screen, when they open another member's sheet (student,
  instructor or admin), then "Remover da plataforma" with "Perde o acesso ao app. Restaurável durante 30 dias." is the
  last action; tapping it shows "Remover {{first name}}?" with the student text for a student and the
  instructor-or-admin text otherwise, "Remover da plataforma" and "Voltar", and "Voltar" returns to the details.
- **Edge and error cases:** not shown on the admin's own sheet, to a student or instructor viewer, or on the sheet
  opened from the class details or "Entrar na escola"; the role actions of spec 058 are unchanged.
- **Verify by:** `npx jest src/modules/people -t "remove action"` from `apps/mobile`.

### ER-10 — Confirming a removal

- **Front:** mobile
- **Behavior:** Given the removal confirmation is open, when the admin taps "Remover da plataforma", then
  `POST /people/:id/remove` is sent once (presses ignored while it runs), the sheet closes, and the people, classes and
  removed-accounts queries are invalidated, with no success toast.
- **Edge and error cases:** a 409 `user.role.lastAdmin` or `user.status.notApproved`, or a network failure, shows its
  toast and keeps the confirmation open; an expired session shows no toast.
- **Verify by:** `npx jest src/modules/people -t "confirm removal"` from `apps/mobile`.

### ER-11 — The "Contas removidas" section

- **Front:** mobile
- **Behavior:** Given an approved admin, no search text and no role filter, the directory's last page loaded, and
  `GET /people/removed` answering a student removed on 2026-10-02 at 15:00 UTC, when the People screen renders in
  pt-BR, then the list ends with "Contas removidas", "restauráveis durante 30 dias" and a row with the person's initials,
  name, "Aluno · removida em 2 out · até 1 nov" and "Restaurar".
- **Edge and error cases:** hidden with search text or a role filter, before the last page has loaded, while the
  removed accounts load, after that query fails, with no removed account, and for non-admin viewers (who never call
  the endpoint); shown under an empty directory once it has loaded; pull-to-refresh reloads it; the dates use
  Fortaleza time (a removal at 02:00 UTC on Oct 3 shows "2 out").
- **Verify by:** `npx jest src/modules/people -t "removed accounts"` from `apps/mobile`.

### ER-12 — "Restaurar" restores at once

- **Front:** mobile
- **Behavior:** Given the "Contas removidas" section with two rows, when the admin taps "Restaurar" on one, then
  `POST /people/:id/restore` is sent once (that button loading and ignoring presses, the other row usable), and on
  success the row leaves the section and the people reload, with no toast.
- **Edge and error cases:** 409 `user.status.notRemoved` toasts "Esta conta já não está removida." and 409
  `removal.window.ended` toasts "O prazo para restaurar esta conta acabou.", both reloading the removed accounts; a
  network failure shows the generic toast and keeps the row; an expired session shows no toast.
- **Verify by:** `npx jest src/modules/people -t "restore"` from `apps/mobile`.

### ER-13 — The removal pushes act in the app

- **Front:** mobile
- **Behavior:** Given a signed-in app, when an `account.removed` or `account.restored` push arrives with the app open,
  then the account is reloaded (so the flow guards move the app to "Access removed" or back to the role's flow) and
  the people queries reload; when either push or its notifications row is tapped, the account is reloaded and the home
  of the flow it resolves to opens; the notifications list shows each with its icon (D-12); a `removed` account
  registers its phone.
- **Edge and error cases:** with no session nothing is reloaded; a denied account still registers no phone; other push
  types behave as before.
- **Verify by:** `npx jest src/modules/notifications` from `apps/mobile`; the journey in the Verification Plan.

## Tasks

### Notifications module (`modules/notifications`)

- [x] **T-01** — Add `account.removed` and `account.restored` to `NOTIFICATION_TYPES` in
  `src/notification/model/notification.entity.ts`, with cases in the entity test.
  Covers: ER-07 · Done when: `npx jest test/notification/model` passes in `modules/notifications`.
  > ✅ 2026-10-27 — added `account.removed` and `account.restored` to NOTIFICATION_TYPES and a case for both; files: `modules/notifications/src/notification/model/notification.entity.ts`,
  > `modules/notifications/test/notification/model/notification.entity.test.ts`; verified: `npx jest test/notification/model` in modules/notifications (all passed); deviations: none
- [x] **T-02** — Let `RegisterPushToken` (`src/push-token/usecase/register-push-token.usecase.ts`) accept `removed`
  accounts (D-05), with tests in `test/push-token/usecase/register-push-token.usecase.test.ts` for removed (accepted)
  and denied (403).
  Covers: ER-08 · Done when: `npx jest test/push-token/usecase/register-push-token.usecase.test.ts` passes.
  > ✅ 2026-10-27 — `RegisterPushToken` accepts removed accounts (denied still 403); files: `modules/notifications/src/push-token/usecase/register-push-token.usecase.ts`,
  > `modules/notifications/test/push-token/usecase/register-push-token.usecase.test.ts`; verified: `npx jest test/push-token/usecase/register-push-token.usecase.test.ts` (passed); deviations: none

### Auth module (`modules/auth`)

- [x] **T-03** — Add the port `AccountRemovalNotifier` (`accountRemoved(userId)`, `accountRestored(userId)`) in
  `src/user/provider/account-removal-notifier.provider.ts`, the `UserRepository` methods `findRemovedSince(cutoff)`
  (D-06's filter and order) and `updateIfRemoved(user): Promise<boolean>` (D-07's conditional write) in
  `src/user/provider/user.repository.ts`, exported from the provider index, and their fakes in `test/mock/`
  (`fake-account-removal-notifier.provider.ts`, `fake-user.repository.ts`), with tests of the fake repository's new
  methods where the existing fakes have them.
  Covers: enabling · Done when: `npx jest` passes and `npm run check-types` exits 0 in `modules/auth`.
  > ✅ 2026-10-27 — added the `AccountRemovalNotifier` port, `UserRepository.findRemovedSince` / `updateIfRemoved`, the fakes and tests of the fake repository; files: `modules/auth/src/user/provider/account-removal-notifier.provider.ts`, `modules/auth/src/user/provider/index.ts`, `modules/auth/src/user/provider/user.repository.ts`, `modules/auth/test/mock/fake-account-removal-notifier.provider.ts`, `modules/auth/test/mock/fake-user.repository.ts`, `modules/auth/test/mock/index.ts`, `modules/auth/test/user/provider/user.repository.test.ts`; verified: `npx jest` (446 passed) and `npm run check-types` (exit 0) in modules/auth; deviations: none
- [x] **T-04** — Add `RemoveUser` in `src/user/usecase/remove-user.usecase.ts` (D-02, D-03, D-04), exported from the
  index, with tests in `test/user/usecase/remove-user.usecase.test.ts` for every check in order, the releases (seats
  for every role, teaching with the actor), `"changed"` and `"lastAdmin"`, a failing release, the notification and a
  failing notifier. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03, ER-07 · Done when: `npx jest test/user/usecase/remove-user.usecase.test.ts` passes in
  > ✅ 2026-10-27 — added `RemoveUser` (checks, releases, guarded write, notification) and its tests; the 30-day constant lives in `removal-window.ts` (shared with T-05); files: `modules/auth/src/user/usecase/remove-user.usecase.ts`, `modules/auth/src/user/usecase/removal-window.ts`, `modules/auth/src/user/usecase/index.ts`, `modules/auth/test/user/usecase/remove-user.usecase.test.ts`; verified: `npx jest test/user/usecase/remove-user.usecase.test.ts` (18 passed); deviations: none
  `modules/auth`.
- [x] **T-05** — Add `ListRemovedAccounts` and `RestoreAccount` in
  `src/user/usecase/{list-removed-accounts,restore-account}.usecase.ts` (D-06, D-07, D-04), exported from the index,
  with tests in `test/user/usecase/` for the list (window, order, fields, access) and every restore check, the lost
  race, what stays, the notification and a failing notifier. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-04, ER-05, ER-06, ER-07 · Done when: `npx jest test/user/usecase` passes in `modules/auth`.
  > ✅ 2026-10-27 — added `ListRemovedAccounts` and `RestoreAccount` with tests; files: `modules/auth/src/user/usecase/list-removed-accounts.usecase.ts`, `modules/auth/src/user/usecase/restore-account.usecase.ts`, `modules/auth/src/user/usecase/index.ts`, `modules/auth/test/user/usecase/list-removed-accounts.usecase.test.ts`, `modules/auth/test/user/usecase/restore-account.usecase.test.ts`; verified: `npx jest test/user/usecase` (258 passed), whole module 485 passed, `npm run check-types` exit 0, new files 100% covered; deviations: none

### Backend (`apps/backend`)

- [x] **T-06** — Implement `findRemovedSince` (status `removed`, `removed_at` not null and after the cutoff, ordered
  `removed_at` desc then `id`) and `updateIfRemoved` (one conditional `updateMany` on `id` and `status = removed`,
  writing `status: approved` and `removed_at: null`) in `src/modules/auth/user.prisma.ts`, with specs in
  `user.prisma.spec.ts`. Skill: [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-04, ER-05, ER-06 · Done when: `npx vitest run src/modules/auth/user.prisma.spec.ts` passes.
  > ✅ 2026-10-27 — implemented `findRemovedSince` and `updateIfRemoved` in the Prisma repository with specs; files: `apps/backend/src/modules/auth/user.prisma.ts`, `apps/backend/src/modules/auth/user.prisma.spec.ts`; verified: `npx vitest run src/modules/auth/user.prisma.spec.ts` (32 passed) and `npx tsc --noEmit` in apps/backend; deviations: none
- [x] **T-07** — Add `src/modules/notifications/notifications.account-removal-notifier.ts`
  (`NotificationsAccountRemovalNotifier`: `Notify` with `account.removed` / `account.restored` to the person, logging
  and swallowing errors), exported by `NotificationsModule`, and the two entries of `push-messages.ts` in pt-BR, es and
  en (copy table), with `notifications.account-removal-notifier.spec.ts` and cases in `push-messages.spec.ts`. Skill:
  [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-07 · Done when: both specs pass and `npm run check-types` exits 0 in `apps/backend`.
  > ✅ 2026-10-27 — added `NotificationsAccountRemovalNotifier`, registered and exported it in `NotificationsModule`, added the push and in-app text of both types in pt-BR, es and en (and raised the 'every other type' count in the existing spec from 20 to 22); files: `apps/backend/src/modules/notifications/notifications.account-removal-notifier.ts`, `apps/backend/src/modules/notifications/notifications.account-removal-notifier.spec.ts`, `apps/backend/src/modules/notifications/notifications.module.ts`, `apps/backend/src/modules/notifications/push-messages.ts`, `apps/backend/src/modules/notifications/push-messages.spec.ts`; verified: `npx vitest run src/modules/notifications` (241 passed) and `npm run check-types` (exit 0) in apps/backend, after rebuilding modules/auth and modules/notifications; deviations: none
- [x] **T-08** — Add `POST /people/:id/remove`, `GET /people/removed` (declared before the `:id` routes) and
  `POST /people/:id/restore` to `src/modules/auth/people.controller.ts` (D-13), wiring the use cases with
  `PrismaUserRepository`, the seat and teaching releasers, the clock and the new notifier in the auth module, with
  cases in `people.controller.spec.ts` and the requests in `people.integration.http`. Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-04, ER-05, ER-06 · Done when: `npx vitest run src/modules/auth/people.controller.spec.ts`
  > ✅ 2026-10-27 — added `POST /people/:id/remove`, `GET /people/removed` (declared before the `:id` routes) and `POST /people/:id/restore`, wired with the clock and the new notifier, with controller specs and the requests in the `.http` file; files: `apps/backend/src/modules/auth/people.controller.ts`, `apps/backend/src/modules/auth/people.controller.spec.ts`, `apps/backend/src/modules/auth/people.integration.http`; verified: `npx vitest run src/modules/auth/people.controller.spec.ts` (21 passed) and `npm run check-types` (exit 0); deviations: the three requests answering 200 are exercised against the real app and database through supertest in T-09's e2e suite, not by hand from the `.http` file
  passes and the three requests answer 200 against the local API.
- [x] **T-09** — Add `test/people-removal.e2e-spec.ts` (faked `ExpoPushProvider`, fixed classes and enrolment clocks,
  the database's own admins set aside where the count matters, cleanup of what it creates) with the describes and test
  names the Expected Results' `Verify by` use: "removes", "refuses", "last admin" (the `FOR UPDATE` race of
  `people-roles.e2e-spec.ts`), "lists", "restores", "refuses to restore" (including the concurrent restores),
  "notifies" and "registers".
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-06, ER-07, ER-08 · Done when:
  > ✅ 2026-10-27 — added the e2e suite (faked Expo, fixed class and enrolment clocks, other admins set aside for the last-admin race, cleanup of everything it creates) with the describes `removes`, `refuses`, `last admin`, `lists`, `restores`, `refuses to restore` (incl. the concurrent restores), `notifies` and `registers`; files: `apps/backend/test/people-removal.e2e-spec.ts`; verified: `npx vitest run --config vitest.config.e2e.ts test/people-removal.e2e-spec.ts` against the local Postgres (39 passed) and `npm run check-types` (exit 0) in apps/backend; deviations: none
  `npx vitest run --config vitest.config.e2e.ts test/people-removal.e2e-spec.ts` passes from `apps/backend`.

### Mobile (`apps/mobile`)

- [x] **T-10** — Add the data layer in `src/modules/people/`: the `RemovedAccount` type in `people.types.ts`,
  `hooks/use-remove-person.hook.ts` (the removal mutation, invalidating people, classes and removed accounts),
  `hooks/use-removed-accounts.hook.ts` (the `GET /people/removed` query, enabled only for an approved admin, with its
  query key) and `hooks/use-restore-account.hook.ts` (the restore mutation), and `utils/removal-error.ts` (the toast
  of each error key, D-11), with tests next to each.
  Covers: enabling · Done when: `npx jest src/modules/people/hooks src/modules/people/utils` passes.
  > ✅ 2026-10-27 — added the `RemovedAccount` / `RemovedAccountsResponse` / `AccountStatusChange` types, the removal and restore mutations, the removed-accounts query (admin only, key `["removed-accounts"]`) and the toast keys of each error, with tests; files: `apps/mobile/src/modules/people/people.types.ts`, `apps/mobile/src/modules/people/hooks/use-remove-person.hook.ts`, `apps/mobile/src/modules/people/hooks/use-remove-person.hook.test.tsx`, `apps/mobile/src/modules/people/hooks/use-restore-account.hook.ts`, `apps/mobile/src/modules/people/hooks/use-restore-account.hook.test.tsx`, `apps/mobile/src/modules/people/hooks/use-removed-accounts.hook.ts`, `apps/mobile/src/modules/people/hooks/use-removed-accounts.hook.test.tsx`, `apps/mobile/src/modules/people/utils/removal-error.ts`, `apps/mobile/src/modules/people/utils/removal-error.test.ts`; verified: `npx jest src/modules/people/hooks src/modules/people/utils` (58 passed) and `npx tsc --noEmit` (exit 0); deviations: added `isStaleRestoreError` to the util (tells which restore refusals reload the removed accounts, D-11)
- [x] **T-11** — Add the "Remover da plataforma" action to `components/person-role-actions` and a
  `components/remove-confirmation` component (D-08, D-09), wired in `components/person-sheet`, with the `people.removeAction.*`
  and `people.removeConfirm.*` keys in `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`, and tests named "remove action" and
  "confirm removal". Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-09, ER-10 · Done when: `npx jest src/modules/people -t "remove action|confirm removal"` passes and
  > ✅ 2026-10-27 — added the red 'Remover da plataforma' action as the last of `PersonRoleActions`, the `RemoveConfirmation` component, the removal state in `usePersonSheet` (confirm once, close, no success toast, toasts on failure) and the `people.removeAction.*` / `people.removeConfirm.*` copy in the three languages; files: `apps/mobile/src/modules/people/components/person-role-actions/{person-role-actions.component.tsx,person-role-actions.types.ts,person-role-actions.component.test.tsx}`, `apps/mobile/src/modules/people/components/remove-confirmation/{index.ts,remove-confirmation.component.tsx,remove-confirmation.types.ts,remove-confirmation.component.test.tsx}`, `apps/mobile/src/modules/people/components/person-sheet/{person-sheet.component.tsx,person-sheet.hook.ts,person-sheet.component.test.tsx,person-sheet.hook.test.tsx}`, `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`; verified: `npx jest src/modules/people -t "remove action|confirm removal"` (14 passed), `npx jest src/modules/people/components` (67 passed), `npx tsc --noEmit` (exit 0), eslint clean; deviations: the action shows wherever the role actions already do (`canChangeRole`: approved admin on another member's sheet on People), so it reuses that condition
  `npx tsc --noEmit` exits 0.
- [x] **T-12** — Add a `components/removed-accounts-section` component (the section, its rows and "Restaurar", D-10,
  D-11) as the footer of `screens/people.screen.tsx` through `hooks/use-people-screen.hook.ts` (visibility rule,
  pull-to-refresh), with the `people.removed.*` keys in the three languages and tests named "removed accounts" and
  "restore". Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-11, ER-12 · Done when: `npx jest src/modules/people -t "removed accounts|restore"` passes and
  > ✅ 2026-10-27 — added the 'Contas removidas' section (`RemovedAccountsSection`, `RemovedAccountRow` with its own restore state) as the People list's footer, its visibility rule and pull-to-refresh in `usePeopleScreen`, the Fortaleza-time date util and the `people.removed.*` copy in the three languages; files: `apps/mobile/src/modules/people/components/removed-account-row/{index.ts,removed-account-row.component.tsx,removed-account-row.hook.ts,removed-account-row.types.ts}`, `apps/mobile/src/modules/people/components/removed-accounts-section/{index.ts,removed-accounts-section.component.tsx,removed-accounts-section.types.ts}`, `apps/mobile/src/modules/people/hooks/use-people-screen.hook.ts`, `apps/mobile/src/modules/people/hooks/use-people-screen.types.ts`, `apps/mobile/src/modules/people/screens/people.screen.tsx`, `apps/mobile/src/modules/people/screens/people.screen.test.tsx`, `apps/mobile/src/modules/people/utils/format-removal-dates.ts`, `apps/mobile/src/modules/people/utils/format-removal-dates.test.ts`, `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`; verified: `npx jest src/modules/people` (159 passed, every new file 100% covered), `npx tsc --noEmit` (exit 0), eslint clean; deviations: none (the existing screen tests' `serve` helper now answers `/people/removed` with nobody removed by default)
  `npx tsc --noEmit` exits 0.
- [x] **T-13** — Handle `account.removed` and `account.restored` in
  `src/modules/notifications/hooks/use-notification-received.hook.ts` (reload the account and the people),
  `utils/notification-target.ts` (reload and open the resolved flow's home), `utils/notification-icon.ts` (D-12), and
  add `removed` to `REGISTRABLE_STATUSES` in `hooks/use-push-registration.hook.ts` (D-05), with tests next to each.
  Covers: ER-13 · Done when: `npx jest src/modules/notifications` passes.
  > ✅ 2026-10-27 — `account.removed` / `account.restored` with the app open reload the account and the people and removed accounts; a tapped push or row reloads the account and opens the resolved flow's home; icons `person-remove-outline` (bad) and `person-add-outline` (ok); `removed` added to `REGISTRABLE_STATUSES`; files: `apps/mobile/src/modules/notifications/hooks/use-notification-received.hook.ts`, `apps/mobile/src/modules/notifications/hooks/use-push-registration.hook.ts`, `apps/mobile/src/modules/notifications/screens/notifications.screen.hook.ts`, `apps/mobile/src/modules/notifications/utils/notification-icon.ts` and their tests (`use-notification-received.hook.test.tsx`, `use-notification-response.hook.test.tsx`, `use-push-registration.hook.test.tsx`, `notifications.screen.test.tsx`, `notification-icon.test.ts`, `notification-target.test.ts`); verified: `npx jest src/modules/notifications` (381 passed, changed files 100% covered), `npx tsc --noEmit` (exit 0); deviations: `notification-target.ts` needed no change (an unknown type already leads nowhere, so a tap reloads the account and opens the home); only its test now lists the two types

### Verification

- [x] **T-14** — Run every command in the Verification Plan from the repo root; all pass. Record the output summary
  as evidence. Covers: all · Done when: `run-related-tests.mjs 066` prints RELATED TESTS PASSED,
  `check-coverage.mjs 066` prints COVERAGE OK, `run-e2e.mjs 066` prints E2E PASSED, the turbo lint, type check and
  build exit 0, and the user journeys were followed with the observations recorded.
  > ✅ 2026-10-27 — everything in the Verification Plan passed. Automated: `run-related-tests.mjs 066` (RELATED TESTS PASSED), `check-coverage.mjs 066` (COVERAGE OK), `npx turbo run lint check-types build --concurrency=1 --filter=auth,notifications,backend,mobile` (27 tasks successful); backend e2e on a fresh scratch database (`e2e_scratch_066`, migrations applied, dropped afterwards): 28 files, 775 tests passed — the 3 `classes.e2e-spec.ts` suggestion failures seen on the dev database come from its leftover classes, not from this change; `test/notifications.e2e-spec.ts` was updated to the new rule (D-05) with a "registers for a removed account" case (`apps/backend/test/notifications.e2e-spec.ts`). Journeys on the iOS simulator (fresh backend build on :4000, app relaunched so it loads the current bundle, dev review accounts): (1) admin, Pessoas, Ana Souza (student): "Remover da plataforma" is the last action; the confirmation reads "Remover Ana?" with the student text; "Voltar" returns to the sheet; confirming closes it and she leaves the list (31 → 30) (ER-09, ER-10). (2) End of the list: "Contas removidas · restauráveis durante 30 dias" shows "Aluno · removida em 27 out · até 26 nov" with "Restaurar"; tapping it removes the section and Ana is back in the list (30 → 31) (ER-11, ER-12). (3) Student review account (dev@example.com) on a second simulator, removed from the first: in the database it became `removed`; the open app kept its screens until the account was reloaded (a push does that, and simulators receive none); after a relaunch it showed "Access removed"; after the restore (`approved`) a relaunch opened the student flow, and its bell went from 2 to 4 notifications (ER-13; the push handling itself is covered by Jest). Notes: an admin's own sheet and another admin's sheet offer no "Remover"; the already-running Metro bundle was stale until the app was relaunched. Left behind: the backend started for this check (`node dist/main`, log in the session scratchpad) keeps running on :4000, and the dev data is back to how it was (Ana Souza and Dev Student approved).

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 066` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 066` — every line this spec adds or changes is covered
  - `node .specs/scripts/run-e2e.mjs 066` — the backend e2e suite passes (Postgres up, migrations applied), including
    `test/people-removal.e2e-spec.ts`
  - `npx turbo run lint check-types build --concurrency=1 --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — lint, type check and build of the workspaces touched
- User journeys (iOS simulator, backend running with the seeded review accounts):
  - As the admin review account, open Pessoas and a student's sheet: "Remover da plataforma" is the last action; the
    confirmation shows "Remover {nome}?" with the student text; "Voltar" returns; confirming closes the sheet and the
    student leaves the list (ER-09, ER-10).
  - Clear the search and filters and scroll to the end: "Contas removidas" shows the student with "removida em … · até
    …" and "Restaurar"; tap it: the row leaves and the student is back in the list (ER-11, ER-12).
  - Sign in as the student review account on a second simulator, remove it from the first: within the next request or
    push it shows "Access removed"; restore it: signing in again (or the push on a physical phone) opens the student
    flow (ER-13). Pushes themselves need a physical phone; Jest covers them otherwise.

## Memory Impact

- `memory/product.md` — User lifecycle: admins remove an approved member ("Remover da plataforma") and restore a
  removed account within 30 days from "Contas removidas"; the person is told both times; erasure still to come
  (spec 067).
- `memory/modules/auth.md` — `RemoveUser`, `ListRemovedAccounts` and `RestoreAccount` (checks and keys in order,
  releases, guarded and conditional writes, what a restore keeps and doesn't bring back, the window), the
  `AccountRemovalNotifier` port, the repository methods `findRemovedSince` and `updateIfRemoved`, Who can do what, the
  in-app behavior (remove action, confirmation, "Contas removidas", the pushes), Boundaries ("removal is meant to use
  them too" becomes built) and spec history.
- `memory/modules/notifications.md` — the `account.removed` and `account.restored` types, recipients and text;
  removed accounts register a phone; what the app does with each push.
- `memory/technical-context.md` — Push notifications: `RegisterPushToken`'s statuses, the
  `NotificationsAccountRemovalNotifier` adapter; Automated validation: `people-removal.e2e-spec.ts`.
- `memory/structure.md` — the routes `POST /people/:id/remove`, `GET /people/removed`, `POST /people/:id/restore`, the
  new backend files and e2e suite, and the new people components, hooks and util in the mobile app.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review

### Round 1 — 2026-10-27 — accepted

**Checks**

- lint ✅ · type check ✅ · build ✅ (`npx turbo run lint check-types build --concurrency=1` on auth, notifications,
  backend, mobile: 27 tasks successful)
- related tests ✅ (`run-related-tests.mjs 066`: apps/backend, apps/mobile, modules/auth, modules/notifications, plus
  the whole suites of modules/classes, enrolment and school-rules — RELATED TESTS PASSED)
- coverage of the changed lines ✅ COVERAGE OK — every changed line covered in 31 files; no coverage-ignore comments
  in the diff
- e2e: backend suite on the shared dev database ❌ 772 of 775 (3 `classes.e2e-spec.ts` suggestion tests read the dev
  data's own classes); on a fresh scratch database (`e2e_review_066`, migrations applied, dropped afterwards) ✅ 28
  files, 775 passed, including `people-removal.e2e-spec.ts`
- iOS simulator (admin review account, pt-BR, backend on :4000): ER-09, ER-10, ER-11, ER-12 exercised ✅

**Expected Results**

- ER-01 ✅ — e2e `removes`: 200 `{ id, status: "removed" }`; upcoming seat cancelled, request withdrawn, ended seat
  approved; instructor off the upcoming class (flagged without instructor) and kept on the ended one; `/auth/me` reads
  `removed`; both gone from `/people`; `class.noInstructor` to the other admin, not the actor; removing another admin
  leaves one approved admin. Use case test covers the order of releases.
- ER-02 ✅ — e2e `refuses`: each check in order (403 notApproved, 403 notAdmin, 404 for a random UUID and a non-UUID,
  403 `user.remove.self`, 409 for pending/denied/deleted/removed targets, 401 without a token), with no seat, status or
  notification change; use case tests cover the failing releaser and `"changed"`.
- ER-03 ✅ — e2e `last admin`: the `FOR UPDATE` race gives one 200 and one 409 `user.role.lastAdmin`, one approved
  admin left.
- ER-04 ✅ — e2e `lists`: `[R2, R1]` with `{ id, name, role, removedAt }`; R3 (30 days + 1 min), no-date, deleted and
  approved excluded; ties by id; route not taken as `/people/:id`; non-admin and non-approved callers refused.
- ER-05 ✅ — e2e `restores`: 200 `{ id, status: "approved" }`; role, name, WhatsApp kept; back in `/people`, out of
  `/people/removed`; not back on the released class; seats stay cancelled; removable and listed again with the new
  `removedAt`.
- ER-06 ✅ — e2e `refuses to restore`: caller refusals, 404s, 409 `user.status.notRemoved` for approved/pending/denied/
  deleted, 409 `removal.window.ended` past 30 days and with no date; concurrent restores give 200 + 409 and one
  `account.restored`.
- ER-07 ✅ — e2e `notifies`: one stored and pushed `account.removed` / `account.restored` with the pt-BR copy, both in
  `GET /notifications`; the actor gets neither; refusals notify nobody; a failing push keeps the 200.
  `push-messages.spec.ts` covers es and en.
- ER-08 ✅ — e2e `registers`: a removed account's token → 204 and stored; denied → 403 `pushToken.status.notAllowed`.
- ER-09 ✅ — Jest `remove action`; in the simulator Uma Teixeira's (student) sheet ends with the red "Remover da
  plataforma" / "Perde o acesso ao app. Restaurável durante 30 dias."; "Remover Uma?" with the student text;
  "Voltar" returns to the details.
- ER-10 ✅ — Jest `confirm removal` (one POST, sheet closes, no toast, error toasts keep the confirmation); in the
  simulator confirming closed the sheet, Uma left the list and was stored `removed` with one `account.removed`.
- ER-11 ✅ — Jest `removed accounts` (visibility rules, empty directory, failed query, non-admins never ask,
  pull-to-refresh, Fortaleza time); `format-removal-dates.test.ts` checks "2 out" / "1 nov" in pt-BR; in the simulator
  the list ended with "Contas removidas · restauráveis durante 30 dias" and "Aluno · removida em 27 out · até 26 nov"
  with "Restaurar".
- ER-12 ✅ — Jest `restore` (one request, own row loading, other row usable, the two 409 toasts reload the list, network
  toast keeps the row, expired session silent); in the simulator "Restaurar" removed the section and Uma came back,
  with no toast (stored `approved`, `removed_at` null, one `account.restored`).
- ER-13 ✅ — Jest `src/modules/notifications`: both pushes reload the account and the people / removed accounts with the
  app open, a tapped push or row reloads the account and opens the resolved home, icons per D-12, `removed` registers a
  phone; no session reloads nothing. The live push needs a physical phone; the executor's two-simulator journey
  (T-14) showed "Access removed" and the student flow after relaunches.

**Findings**

None.

**Notes**

- The 3 red `classes.e2e-spec.ts` suggestion tests on the dev database come from that database's own classes (the
  suggestions answer an 08:00–09:00 slot from existing data); this spec doesn't touch suggestions, and the suite is
  green on a clean database. Running `run-e2e.mjs` against a shared dev database will keep showing them until those
  tests isolate their data.
- ER-05's "still `rulesAccepted: true`" is asserted as `rulesAcceptedBefore: true` in the e2e, because the suites keep
  the rules version at 0 (where `rulesAccepted` is always true). Keeping the acceptance rows is what decides
  `rulesAccepted`, and `updateIfRemoved` never touches them, so the behavior holds.
- D-10 hides the section "after that query fails": a first failure hides it (tested), but a failed pull-to-refresh
  keeps the rows already loaded, as React Query keeps the last data. That's consistent with the rest of People, but
  worth knowing.
- The simulator check removed and restored the seeded student Uma Teixeira (no upcoming seats), so the dev data is as it
  was, apart from her two new notifications.
- The backend the executor started for T-14 is still listening on :4000. This review didn't start it, so it left it
  running.
- `## Memory Impact` matches what was built.
