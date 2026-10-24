---
id: "058"
slug: admin-role-changes
title: "Admins change people's roles"
status: in-progress
created: 2026-10-23
started: 2026-10-24
base_commit: 8b28b59430a73925be69587449e72cf1ad983b03
fronts: [enrolment, classes, notifications, auth, backend, mobile]
depends_on: []
---

# 058 — Admins change people's roles

## Goal

From the People screen, an approved admin changes someone else's role: a student to instructor or admin, an
instructor to admin or student, another admin to instructor. Each change is confirmed on the person's sheet.
Promoting a student gives up their upcoming seats and pending requests; demoting an instructor takes them off their
upcoming classes. The person is told in one notification and their app moves to the new role's experience. The
school never loses its last admin: role changes can't do it, and the only admin can't delete their own account.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: User (one role: student, instructor or admin;
  "An admin can also teach"; "There is always at least one admin"), "Admin decisions are final in the app" (no undo
  of role changes), "Pushes are the only notification channel".
- Requirements: [requirements.md → Promoting users](../../../.docs/requirements.md#promoting-users) — a student can
  become an instructor, anyone an admin; promoting a student cancels their upcoming seats and pending requests.
- Requirements: [requirements.md → Demoting instructors](../../../.docs/requirements.md#demoting-instructors) — the
  demoted user leaves the classes they teach that haven't started and stays on the others.
- Requirements: [requirements.md → Changing admins](../../../.docs/requirements.md#changing-admins) — admins change
  another admin's role (removal is out of scope here, D-02).
- Requirements: [requirements.md → At least one admin](../../../.docs/requirements.md#at-least-one-admin) — the only
  admin can't be demoted, and must make someone else an admin before deleting their own account.
- Requirements: [requirements.md → Role change notification](../../../.docs/requirements.md#role-change-notification)
  — the user is told of their new role, and of the cancelled seats and requests.
- Requirements: [requirements.md → Class without an instructor](../../../.docs/requirements.md#class-without-an-instructor)
  — the demotion case: a class that loses its only instructor stays scheduled, is flagged, and admins are told.
- Requirements: [requirements.md → Admins can teach](../../../.docs/requirements.md#admins-can-teach) — every admin
  can be assigned to teach (why there is no "also an instructor" flag, D-03).
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Fixed conventions,
  Automated validation (backend e2e with Vitest + supertest, mobile Jest + RNTL, journeys in the iOS simulator).
- Modules: [modules/auth.md](../../memory/modules/auth.md) (users, roles, `DeleteAccount` and its release ports, "The
  role-change and removal rules are meant to use the same contracts"),
  [modules/classes.md](../../memory/modules/classes.md) (`ReleaseUpcomingClasses`, spec 035),
  [modules/enrolment.md](../../memory/modules/enrolment.md) (`ReleaseStudentEnrolments`, spec 043),
  [modules/notifications.md](../../memory/modules/notifications.md) (types, push text catalog, in-app text).
- Designs: `.docs/designs/admin-app.html` **PAINEL-12A** (Person sheet with role actions) and its confirmation sheets
  ("promover", "promoverAdmin", "despromover") and the "apagarConta" sheet's only-admin state. Their copy is
  European Portuguese; this spec's copy is the Brazilian Portuguese adaptation (see Copy).
- Existing code this builds on:
  - `modules/auth/src/user/usecase/delete-account.usecase.ts` — releases the person's upcoming classes
    (`TeachingReleaser`) and then their seats (`SeatReleaser`) before closing the account; doesn't refuse the only
    admin today (spec 026 left it out).
  - `modules/auth/src/user/provider/{seat-releaser,teaching-releaser}.provider.ts` — both return `void` today.
  - `modules/classes/src/school-class/usecase/release-upcoming-classes.usecase.ts` — returns
    `{ released, withoutInstructor }` and notifies the approved admins except the released person.
  - `modules/enrolment/src/enrolment/usecase/release-student-enrolments.usecase.ts` — returns `{ cancelled }` only;
    `EnrolmentRepository.releaseForStudent` returns the cancelled seats, not the withdrawn requests.
  - `apps/backend/src/shared/auth/jwt.strategy.ts` — reloads role and status on every request, so a role change
    applies at once to the API.
  - `apps/backend/src/modules/auth/people.controller.ts` — `GET /people` (spec 027).
  - `apps/backend/src/modules/notifications/push-messages.ts` — the push and in-app text catalog.
  - `apps/mobile/src/modules/people/components/person-sheet/` — the person sheet (also opened from the class details
    and the registrations screen).
  - `apps/mobile/src/modules/notifications/hooks/use-notification-received.hook.ts` and
    `utils/refresh-account.ts` — a `registration.*` push reloads the account so the flow guards move the app.
  - `apps/mobile/src/modules/profile/components/delete-account-sheet/` — the "Remover a conta?" sheet.
  - `modules/classes/src/school-class/usecase/{create-class-batch,edit-class}.usecase.ts` — `TEACHER_ROLES =
    ["instructor", "admin"]`: any approved admin can be assigned to teach.

## Scope

### In scope

- `PUT /people/:id/role` and the `ChangeRole` use case: the five allowed changes, their releases, the refusals, the
  last-admin guard and the `role.changed` notification.
- `DELETE /auth/me` refusing the only approved admin.
- The counts returned by the seat and teaching releases, and leaving the acting admin out of the `class.noInstructor`
  recipients of a demotion.
- Mobile: the role actions and their confirmations on the person sheet of the People screen; the `role.changed`
  push and its row; the only-admin state of the delete-account sheet; the copy in pt-BR, es-ES and en-US.

### Out of scope

- "Remover da plataforma", the removed-accounts section and "Restaurar" (their own spec).
- An "also an instructor" flag on admins ("Também é instrutor" in the design, D-03), or an extra "Instrutor" chip on
  admins.
- An admin going straight to student, and anyone changing their own role (D-02, D-04).
- Role actions on the person sheet opened from the class details or the registrations screen.
- A success style for toasts; undoing a role change.
- Telling anyone but the person (the existing `enrolment.cancelled` and `class.noInstructor` notifications of the
  releases still go out as they do for an account deletion); a `class.unassigned` per released class.
- "My classes" for admins who teach; the web app.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The spec includes the only-admin refusal of `DELETE /auth/me` (the backend answers 409 `user.role.lastAdmin`, the Profile shows "Ainda não dá"). | Same rule as the demotion guard, small, and it closes the only way to a school with no admin until removal is built. |
| D-02 | Exactly five changes are allowed: student → instructor, student → admin, instructor → admin, instructor → student, admin → instructor. Any other pair (admin → student, or the same role) is refused with 409 `user.role.changeNotAllowed`. | The design's actions; one step, one consequence (an admin reaches student in two steps). |
| D-03 | No "also an instructor" flag: teaching stays decided by class assignment, and every approved admin stays assignable (`TEACHER_ROLES`). instructor → admin and admin → instructor keep the person on every class they teach. | "Admins can teach" and today's code; a flag would be a new concept and a migration. |
| D-04 | The actions show only on the People screen's sheet, only when the viewer is an approved admin, and never on the viewer's own sheet. The backend refuses a change of one's own role with 403 `user.role.self`. | The design's "pessoas" context; with no self-change, demoting another admin always leaves the actor, so the last-admin rule holds by construction (D-08 covers the race). |
| D-05 | The person gets one `role.changed` notification with params `{ role, seatsReleased, classesReleased }` (`role` the new role; the two booleans true when the release gave up anything). The actor gets none. No `class.unassigned` is sent for the released classes; the releases keep their own notifications (`enrolment.cancelled` to admins and instructors, `class.noInstructor` to admins). | One message per event, as the batch rule; reuses spec 035's flag and spec 043's release. |
| D-06 | `PUT /people/:id/role`, body `{ "role": "<student \| instructor \| admin>" }`, answers 200 `{ id, role }`. Checks, in order: caller not approved → 403 `user.status.notApproved`; caller not admin → 403 `user.role.notAdmin`; `role` missing, not a string or unknown → 422 `people.role.invalid`; unknown target → 404 `user.notFound`; target is the caller → 403 `user.role.self`; target not `approved` → 409 `user.status.notApproved`; pair not allowed (D-02) → 409 `user.role.changeNotAllowed`; no approved admin would remain → 409 `user.role.lastAdmin`. | Same keys and order as the other admin routes: access, then validation, then state. |
| D-07 | Order: release first (student → any: `SeatReleaser`; instructor → student: `TeachingReleaser` with the actor), then the guarded write (D-08) of the new role, then the notification. A failed release fails the whole call (releases are idempotent, so a retry is safe). The write succeeds only while the stored role and status are the ones read; otherwise 409 `user.role.changeNotAllowed`. A failed notification is logged and swallowed. | Like `DeleteAccount`: a promoted student never keeps a seat, a demoted instructor never keeps an upcoming class. |
| D-08 | `UserRepository.updateKeepingAnAdmin(user, expected)` writes the user in one transaction that first locks the approved admins' rows (`SELECT … FOR UPDATE`), and writes only when the stored role and status equal `expected` and, if the stored user is an approved admin who stops being one (other role, or another status), at least one other approved admin remains. It answers `"updated"`, `"changed"` or `"lastAdmin"`. `ChangeRole` and `DeleteAccount` both use it. `DeleteAccount` also refuses (409 `user.role.lastAdmin`) before releasing anything when the account is an admin and `countApprovedAdmins()` is 1. | Two admins demoting each other, or the last two deleting their accounts, at the same moment can't leave the school without an admin; the early check avoids releasing classes of an account that won't be deleted. |
| D-09 | `SeatReleaser.releaseSeats(userId)` returns the number of seats cancelled plus requests withdrawn; `TeachingReleaser.releaseUpcomingClasses(userId, actorId?)` returns the number of classes released. `ReleaseStudentEnrolments` returns `{ cancelled, withdrawn }`, and `EnrolmentRepository.releaseForStudent` returns `{ cancelled: Enrolment[]; withdrawn: number }`. `DeleteAccount` ignores the counts. | The notification only says something was cancelled when it was. |
| D-10 | `ReleaseUpcomingClasses` takes an optional `actorId`, added to `excludeUserIds` of `class.noInstructor`. | "Never the admin who edits": the admin who demoted the instructor knows. |
| D-11 | On the sheet, tapping an action swaps the sheet's content for its confirmation (title, consequences, the confirm button, "Voltar" back to the details) in the same `BottomModal`. Success closes the sheet and invalidates `["people"]` and `["classes"]`, so the row shows the new chip. No success toast. A refusal or a failure shows the error toast (keys in Copy); the sheet stays on the confirmation. The confirm button ignores presses while loading. | Only the error toast style exists; the reloaded list is the feedback. |
| D-12 | Rows by role of the person: student → "Promover a instrutor" and "Promover a admin"; instructor → "Promover a admin" and "Rebaixar a aluno" (danger tone); admin → "Passar a instrutor" (danger tone). The "Promover a admin" confirmation adds the seats sentence only for a student. | PAINEL-12A. The design's "É o único admin" row can't happen (D-04) and isn't built. |
| D-13 | A received `role.changed` push reloads the account (`refreshAccount`), like `registration.*`, so the guards move the app to the new flow; it also invalidates `["people"]`. Tapping it (push or row) opens the home of the new flow (`notificationTarget` returns `null`). Its row icon is `shield-checkmark-outline`, tone `info`. | Same mechanism as spec 020; the home is where a new role starts. |
| D-14 | The delete-account sheet, when the viewer is an admin, reads `GET /people?role=admin&perPage=1` (query key `["people", "admins", "count"]`, no retry) when it opens. A `total` of 1, or a 409 `user.role.lastAdmin` from `DELETE /auth/me`, shows "Ainda não dá" with "Ir para Pessoas" (closes the sheet and pushes `routes.admin.people`) and "Cancelar". While the count loads, or if it fails, the normal confirmation shows (the backend still refuses). | The backend is the source of truth; the early check saves a pointless confirmation. |
| D-15 | Copy is the Brazilian Portuguese adaptation of the design ("Rebaixar", not "Despromover"; "gerenciar", not "gerir"), and the only-admin sheet says "remover sua conta" to match the app's "Remover a conta". `{{name}}` is the person's first name (the name up to its first space). | The product is in Brazilian Portuguese; consistency with the existing delete-account copy. |

## Copy

New mobile keys (pt-BR / es-ES / en-US). The role chips keep `profile.role.*`; "Cancelar" reuses
`deleteAccountSheet.cancel`.

| Key | pt-BR | es-ES | en-US |
| --- | --- | --- | --- |
| `people.roleActions.promoteInstructor.title` | Promover a instrutor | Ascender a instructor | Make instructor |
| `people.roleActions.promoteInstructor.subtitle` | Passa a poder ser atribuído a aulas. | Podrá ser asignado a clases. | Can be assigned to classes. |
| `people.roleActions.promoteAdmin.title` | Promover a admin | Ascender a admin | Make admin |
| `people.roleActions.promoteAdmin.subtitle` | Passa a gerenciar a escola. Pode também dar aulas. | Gestionará la escuela. También puede dar clases. | Runs the school. Can also teach. |
| `people.roleActions.demoteStudent.title` | Rebaixar a aluno | Bajar a alumno | Make student |
| `people.roleActions.demoteStudent.subtitle` | Sai das próximas aulas em que está atribuído. | Deja las próximas clases que tiene asignadas. | Leaves the upcoming classes they teach. |
| `people.roleActions.adminToInstructor.title` | Passar a instrutor | Pasar a instructor | Remove admin |
| `people.roleActions.adminToInstructor.subtitle` | Deixa de gerenciar a escola. | Deja de gestionar la escuela. | Stops running the school. |
| `people.roleConfirm.promoteInstructor.title` | Promover {{name}} a instrutor? | ¿Ascender a {{name}} a instructor? | Make {{name}} an instructor? |
| `people.roleConfirm.promoteInstructor.description` | Passa a ser instrutor: pode ser atribuído a aulas e vê os alunos inscritos. As vagas e pedidos que tinha em aulas futuras, como aluno, são cancelados. | Pasa a ser instructor: puede ser asignado a clases y ve a los alumnos inscritos. Las plazas y solicitudes que tenía en clases futuras, como alumno, se cancelan. | They become an instructor: they can be assigned to classes and see who's enrolled. The seats and requests they had in upcoming classes, as a student, are cancelled. |
| `people.roleConfirm.promoteInstructor.confirm` | Promover a instrutor | Ascender a instructor | Make instructor |
| `people.roleConfirm.promoteAdmin.title` | Promover {{name}} a admin? | ¿Ascender a {{name}} a admin? | Make {{name}} an admin? |
| `people.roleConfirm.promoteAdmin.description` | Passa a ser admin: gerencia aulas, pessoas, regras e pedidos da escola. Pode também dar aulas. | Pasa a ser admin: gestiona clases, personas, reglas y solicitudes de la escuela. También puede dar clases. | They become an admin: they run the school's classes, people, rules and requests. They can also teach. |
| `people.roleConfirm.promoteAdmin.seatsNote` | As vagas e pedidos que tinha em aulas futuras, como aluno, são cancelados. | Las plazas y solicitudes que tenía en clases futuras, como alumno, se cancelan. | The seats and requests they had in upcoming classes, as a student, are cancelled. |
| `people.roleConfirm.promoteAdmin.confirm` | Promover a admin | Ascender a admin | Make admin |
| `people.roleConfirm.demoteStudent.title` | Rebaixar {{name}} a aluno? | ¿Bajar a {{name}} a alumno? | Make {{name}} a student? |
| `people.roleConfirm.demoteStudent.description` | Passa a ser aluno: sai das próximas aulas em que está atribuído, que podem ficar sem instrutor. As aulas já dadas ficam no histórico. | Pasa a ser alumno: deja las próximas clases que tiene asignadas, que pueden quedarse sin instructor. Las clases ya dadas quedan en el historial. | They become a student: they leave the upcoming classes they teach, which may be left without an instructor. Classes already taught stay in the history. |
| `people.roleConfirm.demoteStudent.confirm` | Rebaixar a aluno | Bajar a alumno | Make student |
| `people.roleConfirm.adminToInstructor.title` | Tirar {{name}} de admin? | ¿Quitar a {{name}} de admin? | Remove {{name}} as admin? |
| `people.roleConfirm.adminToInstructor.description` | Deixa de gerenciar a escola e passa a instrutor. Continua nas aulas em que está atribuído. | Deja de gestionar la escuela y pasa a instructor. Sigue en las clases que tiene asignadas. | They stop running the school and become an instructor. They stay on the classes they teach. |
| `people.roleConfirm.adminToInstructor.confirm` | Passar a instrutor | Pasar a instructor | Remove admin |
| `people.roleConfirm.back` | Voltar | Volver | Back |
| `people.roleErrors.changed` | O papel desta pessoa mudou. Atualize a lista. | El rol de esta persona cambió. Actualiza la lista. | This person's role changed. Refresh the list. |
| `people.roleErrors.lastAdmin` | A escola precisa de pelo menos um admin. | La escuela necesita al menos un admin. | The school needs at least one admin. |
| `people.roleErrors.notApproved` | Esta pessoa não está mais na plataforma. | Esta persona ya no está en la plataforma. | This person is no longer on the platform. |
| `deleteAccountSheet.onlyAdmin.title` | Ainda não dá | Todavía no | Not yet |
| `deleteAccountSheet.onlyAdmin.description` | Você é o único admin da escola. Promova outra pessoa a admin antes de remover sua conta. | Eres el único admin de la escuela. Haz admin a otra persona antes de eliminar tu cuenta. | You're the school's only admin. Make someone else an admin before removing your account. |
| `deleteAccountSheet.onlyAdmin.goToPeople` | Ir para Pessoas | Ir a Personas | Go to People |

Network and other failures reuse `createAccount.errors.noConnection` and `createAccount.errors.generic`.

The `role.changed` notification (backend `push-messages.ts`, push and in-app text are the same):

| Locale | Title | Body |
| --- | --- | --- |
| pt-BR | Seu papel mudou | "Agora você é aluno." / "Agora você é instrutor." / "Agora você é admin.", then " Suas vagas e pedidos em aulas futuras foram cancelados." when `seatsReleased`, then " Você saiu das suas próximas aulas." when `classesReleased` |
| es | Tu rol cambió | "Ahora eres alumno." / "Ahora eres instructor." / "Ahora eres admin.", then " Tus plazas y solicitudes en clases futuras se cancelaron." / " Dejaste tus próximas clases." |
| en | Your role changed | "You're now a student." / "You're now an instructor." / "You're now an admin.", then " Your upcoming seats and pending requests were cancelled." / " You were taken off your upcoming classes." |

## Expected Results

### ER-01 — Promoting a student to instructor releases their seats

- **Front:** backend
- **Behavior:** Given approved admin A and approved student S, who holds an approved seat in a class that hasn't
  started, a pending request in another, and an approved seat in a class that already started, when A calls
  `PUT /people/S/role` with `{ "role": "instructor" }`, then the API answers 200 `{ id: S, role: "instructor" }`,
  S's role is `instructor`, the upcoming seat is `cancelled`, the request is `withdrawn`, and the started class's seat
  is still `approved`.
- **Edge and error cases:** a student with no seats or requests is promoted the same way (nothing released); the
  approved admins and the class's instructors get the existing `enrolment.cancelled` for the cancelled seat, as for an
  account deletion.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/people-roles.e2e-spec.ts -t "promotes a student to instructor"`
  from `apps/backend`; `npx jest test/user/usecase/change-role.usecase.test.ts` from `modules/auth`.

### ER-02 — Promoting to admin

- **Front:** backend
- **Behavior:** Given approved admin A, when A promotes approved student S to `admin`, then the API answers 200, S is
  an admin and S's upcoming seats and pending requests are released as in ER-01; when A promotes approved instructor
  I, who teaches a class that hasn't started, to `admin`, then the API answers 200, I is an admin and I is still among
  that class's instructors.
- **Edge and error cases:** the promoted admin can be assigned to classes like any admin (no extra flag).
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/people-roles.e2e-spec.ts -t "promotes to admin"` from
  `apps/backend`; `npx jest test/user/usecase/change-role.usecase.test.ts -t "admin"` from `modules/auth`.

### ER-03 — Demoting an instructor to student takes them off upcoming classes

- **Front:** backend
- **Behavior:** Given approved admin A, a second approved admin B, and approved instructor I, who is the only
  instructor of upcoming class C1, one of two instructors of upcoming class C2, and the instructor of class C3 that
  already started, when A calls `PUT /people/I/role` with `{ "role": "student" }`, then the API answers 200, I is a
  student, I is no longer an instructor of C1 or C2, I is still an instructor of C3, C1 is flagged as having no
  instructor, and B gets one `class.noInstructor` notification while A gets none.
- **Edge and error cases:** an instructor with no upcoming classes is demoted the same way and no `class.noInstructor`
  is sent; a cancelled class keeps I.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/people-roles.e2e-spec.ts -t "demotes an instructor"` from
  `apps/backend`; `npx jest test/school-class/usecase/release-upcoming-classes.usecase.test.ts -t "actor"` from
  `modules/classes`.

### ER-04 — Taking an admin's role keeps their classes

- **Front:** backend
- **Behavior:** Given approved admins A and B, B teaching an upcoming class, when A calls `PUT /people/B/role` with
  `{ "role": "instructor" }`, then the API answers 200, B is an instructor, and B is still among that class's
  instructors.
- **Edge and error cases:** B's next request as an instructor to an admin route (e.g. `GET /registrations`) is refused
  with 403 `user.role.notAdmin`.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/people-roles.e2e-spec.ts -t "admin to instructor"` from
  `apps/backend`.

### ER-05 — Refused role changes change nothing

- **Front:** backend
- **Behavior:** Given the accounts of each case, when `PUT /people/:id/role` is called, then it answers, with nothing
  changed or released: a caller whose status isn't `approved` → 403 `user.status.notApproved`; an approved student or
  instructor caller → 403 `user.role.notAdmin`; a missing, non-string or unknown `role` → 422 `people.role.invalid`; an
  unknown id → 404 `user.notFound`; the caller's own id → 403 `user.role.self`; a target that is `pending`, `denied`,
  `deleted` or `removed` → 409 `user.status.notApproved`; admin → student, or the target's current role → 409
  `user.role.changeNotAllowed`.
- **Edge and error cases:** the checks run in that order (a non-admin sending an unknown role gets 403
  `user.role.notAdmin`); no notification is sent for a refusal; a request without a token → 401 `auth.token.invalid`.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/people-roles.e2e-spec.ts -t "refuses"` from
  `apps/backend`; `npx jest test/user/usecase/change-role.usecase.test.ts -t "refuses"` from `modules/auth`.

### ER-06 — Two admins can't demote each other at once

- **Front:** backend
- **Behavior:** Given exactly two approved admins A and B, when A demotes B to instructor and B demotes A to
  instructor in two concurrent requests, then exactly one answers 200 and the other answers 409
  `user.role.lastAdmin`, and exactly one approved admin remains.
- **Edge and error cases:** a change made between the read and the write (another admin changed the target's role
  meanwhile) answers 409 `user.role.changeNotAllowed` and writes nothing.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/people-roles.e2e-spec.ts -t "last admin"` from
  `apps/backend`; `npx vitest run src/modules/auth/user.prisma.spec.ts -t "updateKeepingAnAdmin"` from `apps/backend`.

### ER-07 — The person is told of their new role

- **Front:** backend
- **Behavior:** Given a successful role change, then the person gets exactly one notification of type `role.changed`
  with params `{ role, seatsReleased, classesReleased }`, stored and pushed with the text in Copy for their phone's
  language: a student with an upcoming seat promoted to instructor gets, in pt-BR, "Seu papel mudou" / "Agora você é
  instrutor. Suas vagas e pedidos em aulas futuras foram cancelados."; an instructor with an upcoming class demoted
  gets "Agora você é aluno. Você saiu das suas próximas aulas."; an instructor promoted to admin gets "Agora você é
  admin.".
- **Edge and error cases:** the extra sentences appear only when the release gave up something; the acting admin gets
  no `role.changed`; no `class.unassigned` is sent for released classes; a failing push or notification store never
  changes the 200 answer.
- **Verify by:** `npx vitest run src/modules/notifications/push-messages.spec.ts -t "role.changed"` and
  `npx vitest run src/modules/notifications/notifications.role-change-notifier.spec.ts` from `apps/backend`;
  `npx vitest run --config vitest.config.e2e.ts test/people-roles.e2e-spec.ts -t "notifies"` from `apps/backend`.

### ER-08 — The only admin can't delete their account

- **Front:** backend
- **Behavior:** Given exactly one approved admin A, who teaches an upcoming class, when A calls `DELETE /auth/me`,
  then the API answers 409 `user.role.lastAdmin`, A is still `approved` and still teaches the class.
- **Edge and error cases:** with a second approved admin, `DELETE /auth/me` by A answers 204 as before (A's upcoming
  classes released, status `deleted`); students and instructors are never refused by this rule.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/auth-profile.e2e-spec.ts -t "only admin"` from
  `apps/backend`; `npx jest test/user/usecase/delete-account.usecase.test.ts -t "only admin"` from `modules/auth`.

### ER-09 — The person sheet shows the role actions to admins

- **Front:** mobile
- **Behavior:** Given an approved admin on the People screen, when they open a student's sheet, then below the
  WhatsApp row it shows "Promover a instrutor" and "Promover a admin" with their subtitles; an instructor's sheet shows
  "Promover a admin" and "Rebaixar a aluno"; another admin's sheet shows "Passar a instrutor".
- **Edge and error cases:** the viewer's own sheet shows no action; a student or instructor viewer sees no action on
  any sheet; the sheets opened from the class details and the registrations screen show no action; "Fechar" still
  closes the sheet.
- **Verify by:** `npx jest src/modules/people/components/person-sheet src/modules/people/screens/people.screen.test.tsx -t "role actions"`
  from `apps/mobile`; journey: sign in as the admin review account, open Pessoas, open a student's, an instructor's,
  another admin's and one's own sheet and see the rows above.

### ER-10 — Confirming a role change

- **Front:** mobile
- **Behavior:** Given an admin on a student's sheet, when they tap "Promover a instrutor", then the sheet shows
  "Promover Ana a instrutor?" (for "Ana Silva"), its description, "Promover a instrutor" and "Voltar"; tapping
  "Promover a instrutor" calls `PUT /people/<id>/role` with `{ "role": "instructor" }`, the sheet closes and the
  person's row shows the "Instrutor" chip; tapping "Voltar" returns to the person's details without a request.
- **Edge and error cases:** "Promover a admin" from a student shows the seats note, from an instructor doesn't; a 409
  `user.role.changeNotAllowed` shows "O papel desta pessoa mudou. Atualize a lista.", a 409 `user.role.lastAdmin` "A
  escola precisa de pelo menos um admin.", a 409 `user.status.notApproved` "Esta pessoa não está mais na
  plataforma.", no connection the existing no-connection toast, anything else the generic one, and the sheet stays on
  the confirmation; a second tap while the request runs sends nothing.
- **Verify by:** `npx jest src/modules/people -t "confirm"` from `apps/mobile`; journey: as the admin review account,
  promote a seeded student to instructor and see the chip change.

### ER-11 — A role.changed push moves the person's app

- **Front:** mobile
- **Behavior:** Given a signed-in student whose app is open, when a `role.changed` push arrives, then the app reloads
  `GET /auth/me` and, with the account now an instructor, shows the instructor flow; when the person taps a
  `role.changed` push or its row on the notifications screen, then the app opens the home of the flow the reloaded
  account resolves to.
- **Edge and error cases:** a failed reload leaves the screen as it was; the row shows the `shield-checkmark-outline`
  icon in the info tone.
- **Verify by:** `npx jest src/modules/notifications -t "role.changed"` from `apps/mobile`.

### ER-12 — The only admin is stopped before deleting their account

- **Front:** mobile
- **Behavior:** Given the only approved admin on their Profile, when they tap the delete-account row, then the sheet
  shows "Ainda não dá", "Você é o único admin da escola. Promova outra pessoa a admin antes de remover sua conta.",
  "Ir para Pessoas" and "Cancelar"; "Ir para Pessoas" closes the sheet and opens the People screen.
- **Edge and error cases:** with another approved admin, or for a student or instructor (no count request), the
  normal "Remover a conta?" confirmation shows; while the count loads or if it fails, the normal confirmation shows;
  when `DELETE /auth/me` answers 409 `user.role.lastAdmin`, the sheet switches to "Ainda não dá" and the person stays
  signed in.
- **Verify by:** `npx jest src/modules/profile/components/delete-account-sheet` from `apps/mobile`.

## Tasks

### Enrolment module (`modules/enrolment`)

- [x] **T-01** — Make `EnrolmentRepository.releaseForStudent` return `{ cancelled: Enrolment[]; withdrawn: number }`
  (interface and in-memory fake in `test/mock`) and `ReleaseStudentEnrolments` return `{ cancelled, withdrawn }`
  (D-09), with tests for seats only, requests only, both and none. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-07 · Done when: `npx jest test/enrolment/usecase/release-student-enrolments.usecase.test.ts`
  passes from `modules/enrolment`.
  > ✅ 2026-10-24 00:29 — `releaseForStudent` returns `ReleasedEnrolments` (`{ cancelled: Enrolment[]; withdrawn:
  > number }`, new exported type) in the port and the in-memory fake; `ReleaseStudentEnrolments` returns `{ cancelled,
  > withdrawn }`; tests for both, none, seats only and requests only; files:
  > `modules/enrolment/src/enrolment/provider/enrolment.repository.ts`,
  > `modules/enrolment/src/enrolment/usecase/release-student-enrolments.usecase.ts`,
  > `modules/enrolment/test/enrolment/usecase/release-student-enrolments.usecase.test.ts`,
  > `modules/enrolment/test/mock/fake-enrolment.repository.ts`,
  > `modules/enrolment/test/mock/fake-enrolment.repository.test.ts`; verified: `npx jest
  > test/enrolment/usecase/release-student-enrolments.usecase.test.ts test/mock` (3 suites, 28 passed), `npm run
  > check-types` exits 0; deviations: the change follows the existing use case by hand — `module-use-case` scaffolds
  > new use cases and has nothing to generate for a changed return type.

### Classes module (`modules/classes`)

- [x] **T-02** — Add the optional `actorId` to `ReleaseUpcomingClassesIn`, added to `excludeUserIds` of the
  `class.noInstructor` notification (D-10), with tests with and without an actor.
  Covers: ER-03 · Done when: `npx jest test/school-class/usecase/release-upcoming-classes.usecase.test.ts` passes from
  `modules/classes`.
  > ✅ 2026-10-24 00:30 — `ReleaseUpcomingClassesIn` takes an optional `actorId`, added after the person to
  > `excludeUserIds` of `class.noInstructor`; tests with an actor (`[person, actor]`) and without one (`[person]`);
  > files: `modules/classes/src/school-class/usecase/release-upcoming-classes.usecase.ts`,
  > `modules/classes/test/school-class/usecase/release-upcoming-classes.usecase.test.ts`; verified: `npx jest
  > test/school-class/usecase/release-upcoming-classes.usecase.test.ts` (9 passed; `-t "actor"` selects the two new
  > ones), `npm run check-types` exits 0; deviations: none

### Notifications module (`modules/notifications`)

- [x] **T-03** — Add `role.changed` to `NOTIFICATION_TYPES` in `src/notification/model/notification.entity.ts`, with
  the entity tests.
  Covers: ER-07 · Done when: `npx jest test/notification` passes from `modules/notifications`.
  > ✅ 2026-10-24 00:30 — `role.changed` added to `NOTIFICATION_TYPES` (the `type` column is a plain string, so no
  > migration); the `it.each` over the types covers it, plus a test of a `role.changed` with its params; files:
  > `modules/notifications/src/notification/model/notification.entity.ts`,
  > `modules/notifications/test/notification/model/notification.entity.test.ts`; verified: `npx jest
  > test/notification` (9 suites, 88 passed), `npm run check-types` exits 0; deviations: none

### Auth module (`modules/auth`)

- [x] **T-04** — Change the ports and their fakes in `test/mock`: `SeatReleaser.releaseSeats` returns `number`,
  `TeachingReleaser.releaseUpcomingClasses(userId, actorId?)` returns `number` (D-09); add the `RoleChangeNotifier`
  port (`src/user/provider/role-change-notifier.provider.ts`, `roleChanged({ userId, role, seatsReleased,
  classesReleased })`); add `UserRepository.countApprovedAdmins()` and `updateKeepingAnAdmin(user, expected)` (D-08)
  to the interface and `fake-user.repository.ts`, with fake tests where the folder has them.
  Covers: enabling · Done when: `npm run check-types --workspace @rochas-surf-school/auth` exits 0 and
  `npx jest test/user` passes from `modules/auth`.
  > ✅ 2026-10-24 00:32 — `SeatReleaser.releaseSeats` returns `number`,
  > `TeachingReleaser.releaseUpcomingClasses(userId, actorId?)` returns `number` (fakes answer a settable `count`; the
  > teaching fake also records `actors`); new `RoleChangeNotifier` port (`roleChanged(RoleChangedEvent)`) with
  > `FakeRoleChangeNotifier`; `UserRepository.countApprovedAdmins()` and `updateKeepingAnAdmin(user, expected)` (new
  > `ExpectedUserState` and `KeepAdminResult = "updated" | "changed" | "lastAdmin"`) in the interface and
  > `FakeUserRepository`, with fake tests (count, write, last admin by role and by status, non-admin writes, stale
  > state and unknown user); files: `modules/auth/src/user/provider/seat-releaser.provider.ts`,
  > `modules/auth/src/user/provider/teaching-releaser.provider.ts`,
  > `modules/auth/src/user/provider/role-change-notifier.provider.ts`, `modules/auth/src/user/provider/index.ts`,
  > `modules/auth/src/user/provider/user.repository.ts`, `modules/auth/test/mock/fake-seat-releaser.provider.ts`,
  > `modules/auth/test/mock/fake-teaching-releaser.provider.ts`,
  > `modules/auth/test/mock/fake-role-change-notifier.provider.ts`, `modules/auth/test/mock/fake-user.repository.ts`,
  > `modules/auth/test/mock/index.ts`, `modules/auth/test/user/provider/user.repository.test.ts`; verified: `npm run
  > check-types --workspace @rochas-surf-school/auth` exits 0, `npx jest test/user` (15 suites, 208 passed);
  > deviations: none

- [x] **T-05** — Add `ChangeRole` (`src/user/usecase/change-role.usecase.ts`, exported from the index): input
  `{ actor, userId, role }`, the checks of D-06 in order, the allowed pairs of D-02, the releases and order of D-07,
  `updateKeepingAnAdmin` with its `"changed"` → 409 `user.role.changeNotAllowed` and `"lastAdmin"` → 409
  `user.role.lastAdmin`, then `roleChanged` (errors swallowed), answering `{ id, role }`; with tests for the five
  changes, every refusal, the order (release before write, nothing released on a refusal before it), the booleans
  and a failing notifier. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-06, ER-07 · Done when:
  `npx jest test/user/usecase/change-role.usecase.test.ts` passes from `modules/auth`.
  > ✅ 2026-10-24 00:34 — `ChangeRole` (`{ actor, userId, role }` → `{ id, role }`): access via
  > `assertCanDecideRegistrations` (403 `user.status.notApproved`, 403 `user.role.notAdmin`), 422
  > `people.role.invalid`, 404 `user.notFound`, 403 `user.role.self`, 409 `user.status.notApproved`, the five pairs of
  > D-02 (else 409 `user.role.changeNotAllowed`), then the release (seats for a student, upcoming classes with the
  > actor for instructor → student), the guarded write (`"changed"` → 409 `user.role.changeNotAllowed`, `"lastAdmin"`
  > → 409 `user.role.lastAdmin`) and `roleChanged` with `seatsReleased` / `classesReleased` from the counts, errors
  > swallowed; exported from the use case index; tests for the five changes, nothing to release, the release happening
  > while the stored role is still the old one, a failing release (nothing written), a failing notifier, every refusal
  > and its order (nothing released or told), a change made meanwhile and the last admin; files:
  > `modules/auth/src/user/usecase/change-role.usecase.ts`, `modules/auth/src/user/usecase/index.ts`,
  > `modules/auth/test/user/usecase/change-role.usecase.test.ts`; verified: `npx jest
  > test/user/usecase/change-role.usecase.test.ts --coverage` (33 passed, the use case 100%
  > statements/branches/functions/lines; `-t "admin"` and `-t "refuses"` select the ER-02 and ER-05 cases);
  > deviations: the code follows the module's use-case pattern by hand (`module-use-case`'s conventions: `ChangeRole`,
  > `ChangeRoleIn`/`ChangeRoleOut`, concrete fakes) rather than its scaffold, since the behavior is fully custom.

- [x] **T-06** — In `DeleteAccount`, refuse an approved admin when `countApprovedAdmins()` is 1 with 409
  `user.role.lastAdmin` before any release, and write with `updateKeepingAnAdmin` (`"lastAdmin"` → the same 409)
  (D-08), with tests for the only admin, two admins, a student and the race.
  Covers: ER-08 · Done when: `npx jest test/user/usecase/delete-account.usecase.test.ts` passes from `modules/auth`.
  > ✅ 2026-10-24 00:35 — `DeleteAccount` refuses an approved admin with 409 `user.role.lastAdmin` when
  > `countApprovedAdmins()` is 1, before any release, and writes with `updateKeepingAnAdmin` (`"lastAdmin"` → the same
  > 409); the existing tests get a second approved admin by default (`setup(users, { otherAdmin })`) and their release
  > overrides return a count; new "only admin" tests: the only admin (nothing released, still approved), two admins, a
  > student and an instructor with no admin, the race (the other admin leaves during the release → 409) and an account
  > changed meanwhile; files: `modules/auth/src/user/usecase/delete-account.usecase.ts`,
  > `modules/auth/test/user/usecase/delete-account.usecase.test.ts`; verified: `npx jest
  > test/user/usecase/delete-account.usecase.test.ts --coverage` (21 passed, the use case 100% on every metric), `npx
  > jest test/user` (all passed), `npm run check-types` exits 0; deviations: D-08 doesn't say what `"changed"` means
  > for a deletion (the stored role or status changed between the read and the write, e.g. a double tap) — it answers
  > 403 `user.status.notApproved`, as a request after that change would.

### Backend (`apps/backend`)

- [ ] **T-07** — Implement the data side: `countApprovedAdmins` and `updateKeepingAnAdmin` (one transaction, the
  approved admins' rows locked with `SELECT … FOR UPDATE`, the conditional write) in
  `src/modules/auth/user.prisma.ts`; the `{ cancelled, withdrawn }` answer of `releaseForStudent` in
  `src/modules/enrolment/enrolment.prisma.ts`; the counts in `enrolment.seat-releaser.ts` and
  `classes.teaching-releaser.ts` (which passes the actor); with specs. Skills:
  [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository),
  [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-01, ER-03, ER-06, ER-08 · Done when: `npx vitest run src/modules/auth src/modules/enrolment src/modules/classes`
  passes from `apps/backend`.

- [ ] **T-08** — Add `src/modules/notifications/notifications.role-change-notifier.ts`
  (`NotificationsRoleChangeNotifier`, one `role.changed` to the person, errors logged and swallowed) exported from the
  notifications module, and the `role.changed` entry of `push-messages.ts` in pt-BR, es and en (Copy), with specs.
  Skill: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-07 · Done when: `npx vitest run src/modules/notifications` passes from `apps/backend`.

- [ ] **T-09** — Add `PUT /people/:id/role` to `src/modules/auth/people.controller.ts` (runs `ChangeRole` with the
  repository, the two releasers and the notifier, wired in `AuthModule`), and the 409 of `DELETE /auth/me` through the
  changed `DeleteAccount`; with controller specs and the requests in `people.integration.http`. Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-08 · Done when:
  `npx vitest run src/modules/auth/people.controller.spec.ts src/modules/auth/auth.controller.spec.ts` passes and
  `npm run check-types --workspace apps/backend` exits 0.

- [ ] **T-10** — Add `test/people-roles.e2e-spec.ts` (faked pushes and classes clock, cleanup of what it creates)
  with the cases named in ER-01 to ER-07 ("promotes a student to instructor", "promotes to admin", "demotes an
  instructor", "admin to instructor", "refuses…", "last admin", "notifies…"), and the "only admin" cases in
  `test/auth-profile.e2e-spec.ts`.
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-06, ER-07, ER-08 · Done when: `npm run test:e2e --workspace apps/backend`
  passes.

### Mobile (`apps/mobile`)

- [ ] **T-11** — Add `src/modules/people/hooks/use-change-role.hook.ts` (`PUT /people/:id/role`, no retry,
  invalidates `["people"]` and `["classes"]` on success) and `src/modules/people/utils/role-change-error.ts` (the
  toast key of each error, `null` for an expired session), with tests. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-10 · Done when: `npx jest src/modules/people/hooks src/modules/people/utils` passes from `apps/mobile`.

- [ ] **T-12** — Add `src/modules/people/components/person-role-actions/` (the rows of D-12) and
  `src/modules/people/components/role-change-confirmation/` (D-11, D-15), a `canChangeRole` prop on `PersonSheet` that
  swaps between the details and the confirmation, set by `PeopleScreen` when the viewer is an approved admin and the
  person isn't the viewer; the Copy keys in `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`; with component and screen
  tests ("role actions", "confirm"). Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-09, ER-10 · Done when: `npx jest src/modules/people` passes from `apps/mobile`.

- [ ] **T-13** — Handle `role.changed`: `refreshAccount` and invalidate `["people"]` on receipt in
  `use-notification-received.hook.ts`; the icon in `notification-icon.ts`; a `notificationTarget` test proving it
  opens the flow's home; with tests (new `notification-icon.test.ts`). (D-13)
  Covers: ER-11 · Done when: `npx jest src/modules/notifications` passes from `apps/mobile`.

- [ ] **T-14** — Add the only-admin state to `src/modules/profile/components/delete-account-sheet/` (D-14): the admins
  count query for an admin viewer, the 409 `user.role.lastAdmin` from `useDeleteAccount`, "Ainda não dá" with "Ir para
  Pessoas", and the `deleteAccountSheet.onlyAdmin.*` keys in the three locales; with a new
  `delete-account-sheet.component.test.tsx`. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-12 · Done when: `npx jest src/modules/profile` passes from `apps/mobile`.

### Verification

- [ ] **T-15** — Run every command in the Verification Plan from the repo root; all pass. Record the output summary
  as evidence.
  Covers: all · Done when: every automated command exits 0 and the user journeys are recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 058` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 058` — every line this spec adds or changes is covered
  - `node .specs/scripts/run-e2e.mjs 058` — the backend e2e suite passes (Postgres up, migrations applied), including
    `test/people-roles.e2e-spec.ts` and the "only admin" cases of `test/auth-profile.e2e-spec.ts`
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/enrolment --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — lint, type check and build of the workspaces touched
- User journeys (iOS simulator, backend running with seeded accounts):
  - As the admin review account, open Pessoas: a student's sheet shows "Promover a instrutor" and "Promover a admin";
    an instructor's "Promover a admin" and "Rebaixar a aluno"; another admin's "Passar a instrutor"; one's own sheet
    none (ER-09).
  - Promote a seeded student to instructor: the confirmation reads "Promover <Nome> a instrutor?", confirming closes
    the sheet and the row shows "Instrutor"; "Voltar" returns without a change (ER-10).
  - With the student review account signed in on a second simulator, promote it: a "Seu papel mudou" push arrives and
    the app moves to the instructor flow (ER-11).
  - With the admin review account as the only approved admin, open Perfil → delete account: "Ainda não dá" shows, and
    "Ir para Pessoas" opens Pessoas (ER-12).

## Memory Impact

- `memory/product.md` — Roles and permissions: admins change roles (the five changes, no self-change, no
  "also an instructor" flag); the last-admin rule now enforced on role changes and account deletion; Current state;
  remove "promoting, demoting … from their sheet" and "refusing the only admin" from Out of scope, and record the
  "also an instructor" option as decided (not built).
- `memory/modules/auth.md` — `ChangeRole` (allowed pairs, checks and keys, release order, guarded write),
  `DeleteAccount`'s only-admin refusal, the `RoleChangeNotifier` port, the releasers' counts, the new repository
  methods, Who can do what, spec history.
- `memory/modules/classes.md` — `ReleaseUpcomingClasses`' optional actor left out of `class.noInstructor`; demotion now
  uses the release.
- `memory/modules/enrolment.md` — `ReleaseStudentEnrolments` reports withdrawn requests; promotion now uses the
  release.
- `memory/modules/notifications.md` — the `role.changed` type, its recipients, params and text; the app reloads the
  account on it.
- `memory/structure.md` — the route `PUT /people/:id/role`; the new mobile components `person-role-actions` and
  `role-change-confirmation`.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
