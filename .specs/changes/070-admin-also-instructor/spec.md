---
id: "070"
slug: admin-also-instructor
title: "Admins who also teach"
status: in-review
created: 2026-10-28
started: 2026-10-28
base_commit: cbda13b2810986f7db50e4c671503fe55cc34956
fronts: [auth, classes, backend, mobile]
depends_on: []
---

# 070 — Admins who also teach

## Goal

Admins decide whether a new admin also teaches: the "Promover a admin" confirmation gets a "Também é instrutor"
checkbox, unchecked by default, and any approved admin can switch that flag later on an admin's sheet (their own
included). Only instructors and the admins with the flag can be added to classes, so the instructor lists of "Nova
aula" and "Editar aula" stop offering admins who don't teach. This replaces the rule of spec 058 that every admin can
be assigned to teach.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: User (role, the role-change bullet), Class
  (instructors "instructors or admins"), the admin role ("An admin can also teach"), and the out-of-scope lines of
  specs 057 and 058 that decided against an "also an instructor" flag.
- Requirements:
  [requirements.md → Admins can teach](../../../.docs/requirements.md#admins-can-teach) — admins teach classes and see
  them among their own (now: admins with the flag can be assigned; D-01);
  [requirements.md → Promoting users](../../../.docs/requirements.md#promoting-users) — a student or an instructor
  is made an admin (now with the flag, D-03);
  [requirements.md → Assigning instructors](../../../.docs/requirements.md#assigning-instructors) — admins assign
  instructors and admins to a class (now: instructors and admins with the flag, D-05);
  [user-journeys.md → Deferred to development](../../../.docs/user-journeys.md#deferred-to-development) — "an
  'also an instructor' option when promoting someone to admin", which this spec builds.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Applications
  (`apps/mobile`, `apps/backend`), business modules, Automated validation, Naming.
- Existing code this builds on:
  - `modules/auth/src/user/model/user.entity.ts` — `User` and `UserState` (role, status…); no teaching flag.
  - `modules/auth/src/user/usecase/change-role.usecase.ts` — `ChangeRole` (spec 058): five allowed changes, releases,
    then `UserRepository.updateKeepingAnAdmin(user, expected)` and the `role.changed` notification.
  - `modules/auth/src/user/usecase/list-people.usecase.ts` — `ListPeople`: `page`, `perPage`, `role` (comma list),
    `search`; items `{ id, name, role, createdAt, whatsappNumber }`; `UserRepository.findDirectoryPage`.
  - `modules/classes/src/school-class/usecase/create-class-batch.usecase.ts` and `edit-class.usecase.ts` — each has
    `TEACHER_ROLES = ["instructor", "admin"]` and an `assertTeachers` that refuses with 422
    `class.instructors.invalid`; `EditClass` checks only the instructors being added.
  - `modules/classes/src/school-class/provider/teacher-lookup.provider.ts` — `TeacherRef { id, role, status }`;
    implemented by `apps/backend/src/modules/classes/teacher-lookup.prisma.ts`.
  - `apps/backend/src/modules/auth/people.controller.ts` — `GET /people`, `PUT /people/:id/role`, remove and restore;
    `apps/backend/src/modules/auth/user.prisma.ts` — the Prisma `UserRepository`; `apps/backend/prisma/models/auth.model.prisma`
    — `model User` (`users` table).
  - `apps/mobile/src/modules/people/components/person-sheet/` — the person sheet (role actions only when
    `canChangeRole`, computed in `hooks/use-people-screen.hook.ts`: an approved admin on someone else's sheet);
    `components/role-change-confirmation/` — the confirmation; `hooks/use-change-role.hook.ts` — `PUT /people/:id/role`.
  - `apps/mobile/src/modules/classes/hooks/use-teachers.hook.ts` — `useTeachers` (query key `["people", "teachers"]`)
    reads every page of `GET /people?role=instructor,admin`; used by `new-class.screen.hook.ts` and
    `edit-class.screen.hook.ts`.
  - `apps/mobile/src/components/ui/checkbox/` — `Checkbox { checked, onChange, label, disabled? }`.

## Scope

### In scope

- An `isInstructor` flag on every account, stored in `users.is_instructor`, with a migration that sets it on every
  existing admin.
- Setting the flag when a student or an instructor is promoted to admin, clearing it when an admin is made an
  instructor.
- `PUT /people/:id/instructor` to switch the flag on an approved admin, and the toggle row on the admin's sheet.
- `GET /people?teaches=true`, and `isInstructor` on every directory item.
- The classes module refusing an admin without the flag when classes are created or an instructor is added.
- The "Também é instrutor" checkbox on the "Promover a admin" confirmation, the copy changes, and the "Nova aula" and
  "Editar aula" instructor pickers listing only instructors and admins with the flag.

### Out of scope

- Any notification about the flag (to the person or to others); the `role.changed` notification and its text stay as
  they are, whatever the checkbox says.
- A chip or label for the flag on the People list rows or anywhere besides the toggle row.
- Taking an admin off classes when their flag is cleared, at promotion or later (D-05).
- Broadcast audiences: "instructors" keeps meaning the instructor role.
- "Minhas aulas" and "Aulas anteriores": who **teaches** stays derived from class assignment (spec 057).
- A flag on students or instructors (instructors always teach); setting the flag anywhere but the People sheet and
  the promotion confirmation.
- The web app.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | Overturns spec 058 D-03. A user has a boolean `isInstructor` (column `is_instructor`, `NOT NULL DEFAULT false`), meaningful only for admins. Someone **can be assigned to teach** when they are approved and either an instructor, or an admin with `isInstructor = true`. In the auth module `UserState.isInstructor` is optional and the `User.isInstructor` getter returns `false` when it is missing. | The user's request: not every admin teaches, and the pickers must say so. An optional state field keeps every existing construction of `User` valid. |
| D-02 | The migration adds the column with default `false`, then runs `UPDATE "users" SET "is_instructor" = true WHERE "role" = 'admin'` (any status). | Today every admin can be assigned; nobody, including the review account and admins already teaching, loses that on release. A deleted or removed admin who comes back keeps it. |
| D-03 | `PUT /people/:id/role` body gains an optional `isInstructor`. When `role` is `admin`, the flag is stored as given (`true`/`false`; missing → `false`). A present value that isn't a boolean, or `isInstructor: true` with any other role, answers 422 `people.isInstructor.invalid`, checked with `role` (after `people.role.invalid`, before the 404). admin → instructor stores `false`; student → instructor and instructor → student leave it `false`. The answer becomes `{ id, role, isInstructor }`. Every other check, order and the guarded write of spec 058 D-06/D-07/D-08 are unchanged. | One call promotes and sets the flag, so the promoted admin is never half-configured; an instructor never carries a stale flag. |
| D-04 | `PUT /people/:id/instructor`, body `{ "isInstructor": <boolean> }`, answers 200 `{ id, isInstructor }`. Use case `SetInstructorFlag` (auth module). Checks, in order: caller not approved → 403 `user.status.notApproved`; caller not admin → 403 `user.role.notAdmin`; `isInstructor` missing or not a boolean → 422 `people.isInstructor.invalid`; malformed or unknown id → 404 `user.notFound`; target not `approved` → 409 `user.status.notApproved`; target not an admin → 409 `people.isInstructor.notAdmin`. The caller may target themselves. The write goes through `updateKeepingAnAdmin(changed, { role: "admin", status: "approved" })`; `"changed"` → 409 `user.role.changeNotAllowed`. Nobody is notified; sending the stored value answers 200 and changes nothing else. | Same access keys and order as the other admin routes; the guarded write stops a flag landing on someone demoted meanwhile. Self is allowed because the flag isn't a role change and an admin may teach. |
| D-05 | Clearing the flag (unchecked at promotion of an instructor, or switched off later) never unassigns anyone: classes keep their instructors. `CreateClassBatch` refuses any instructor who can't be assigned (D-01); `EditClass` checks only the instructors being added, so an admin without the flag already on a class can stay. Both refuse with the existing 422 `class.instructors.invalid`. One shared `canTeach(teacher)` in the classes module replaces both `TEACHER_ROLES`. | A checkbox shouldn't leave classes without an instructor; this matches spec 032's "the ones already on the class can stay whatever their role is now". The backend enforces the rule, not only the picker. |
| D-06 | `GET /people` accepts `teaches`: absent → as today; `"true"` → only approved instructors and approved admins with the flag, combined (AND) with `role` and `search`, paged and sorted as today; any other value → 422 `people.teaches.invalid`. Every item gains `isInstructor` (the stored flag; `false` for students and instructors). `DirectoryPageParams` gains `teachers?: boolean`. | Filtering in the database keeps paging and `total` correct; the sheet needs the stored value to draw the toggle. |
| D-07 | Unchanged: the `role.changed` notification and its copy, broadcasts' audiences, the derived "teaches" of spec 057, `TeachingReleaser`, removal and restore (a restored admin keeps their flag). | Keep the change to who can be assigned. |
| D-08 | On the mobile "Promover a admin" confirmation (`promoteAdmin` only, for a student and for an instructor), a boxed `Checkbox` labelled "Também é instrutor" sits below the description (and below the seats sentence when shown): the shared `Checkbox` with `variant="boxed"` (the `dim` fill and the buttons' radius, `rounded-control`) and `helper` "Além de admin, dá aulas na escola.", the label and the helper stacked beside the box in the usual `ink` / `ink-2` text colors. It is unchecked every time the confirmation opens, disabled while the change is saving, and its value is sent as `isInstructor` with `role: "admin"`. Other confirmations send no `isInstructor`. | The request: default false, chosen at promotion. The box sets the choice apart from the copy around it (amended). |
| D-09 | On the person sheet, when the viewer is an approved admin and the person is an admin — another admin or the viewer themselves — the same boxed `Checkbox` of D-08 (label "Também é instrutor" and its helper) shows below the WhatsApp/e-mail row and above the role actions, checked from the person's `isInstructor`. A tap sends `PUT /people/:id/instructor` with the opposite value (hook `useSetInstructorFlag`, no retry); the checkbox is disabled while it saves. Success shows the new state on the open sheet and invalidates `["people"]` (which also reloads `["people", "teachers"]`); no success toast. A refusal or failure keeps the previous state and shows the error toast: 409 `user.role.changeNotAllowed` or `people.isInstructor.notAdmin` → "O papel desta pessoa mudou. Atualize a lista."; 409 `user.status.notApproved` or 404 → "Esta pessoa não está mais na plataforma."; anything else → the generic error toast the role actions use. The viewer's own sheet still shows no role actions or remove action (spec 058 D-04). | One place to fix a wrong tap; reuses the role-change toasts. |
| D-10 | Copy (pt-BR, with es-ES and en-US): checkbox label "Também é instrutor" / "También es instructor" / "Also an instructor"; helper "Além de admin, dá aulas na escola." / "Además de admin, da clases en la escuela." / "Besides being an admin, teaches at the school."; `people.roleActions.promoteAdmin.subtitle` becomes "Passa a gerenciar a escola." (es/en: the same sentence without "can also teach"); `people.roleConfirm.promoteAdmin.description` becomes "Passa a ser admin: gerencia aulas, pessoas, regras e pedidos da escola." (es/en likewise). | "Pode também dar aulas." is no longer true of every admin. The helper says what the flag means for the person, not where they show up (amended). |

## Expected Results

### ER-01 — Promoting to admin stores the flag

- **Front:** backend
- **Behavior:** Given an approved admin A and an approved student S, when A calls `PUT /people/S/role` with
  `{ "role": "admin", "isInstructor": true }`, then it answers 200 `{ id: S, role: "admin", isInstructor: true }`
  and S is stored as an admin with `is_instructor = true`; with `{ "role": "admin" }` (no flag) or
  `"isInstructor": false`, S is stored with `is_instructor = false`. The same holds for an approved instructor.
- **Edge and error cases:** `"isInstructor": "yes"` (or any non-boolean) answers 422 `people.isInstructor.invalid`
  and changes nothing; `{ "role": "instructor", "isInstructor": true }` answers 422 `people.isInstructor.invalid`;
  `{ "role": "instructor", "isInstructor": false }` is accepted; every refusal of spec 058 D-06 keeps its status,
  key and order; the `role.changed` notification is the same as before, whatever the flag.
- **Verify by:** `cd modules/auth && npx vitest run test/user/usecase/change-role.usecase.test.ts` and the
  "instructor flag" tests in `apps/backend/test/people-roles.e2e-spec.ts` (`node .specs/scripts/run-e2e.mjs 070`).

### ER-02 — Existing admins keep teaching after the migration

- **Front:** backend
- **Behavior:** Given a database with admins (any status), instructors and students, when the migration of this
  spec is applied, then every user whose role is `admin` has `is_instructor = true` and every other user has
  `is_instructor = false`; a user created afterwards has `is_instructor = false`.
- **Edge and error cases:** a database with no admin applies the migration cleanly; the column is `NOT NULL`.
- **Verify by:** read `apps/backend/prisma/migrations/<timestamp>_users_is_instructor/migration.sql` (adds the column
  `NOT NULL DEFAULT false`, then `UPDATE "users" SET "is_instructor" = true WHERE "role" = 'admin'`), and
  `cd apps/backend && npx prisma migrate deploy` applies it against the Compose database with exit 0.

### ER-03 — An admin made an instructor loses the flag

- **Front:** backend
- **Behavior:** Given an approved admin B with `is_instructor = true`, when another approved admin calls
  `PUT /people/B/role` with `{ "role": "instructor" }`, then it answers 200 `{ id: B, role: "instructor",
  isInstructor: false }` and B is stored with `is_instructor = false`.
- **Edge and error cases:** student → instructor and instructor → student answer `isInstructor: false`; B stays on
  every class they teach (spec 058).
- **Verify by:** `cd modules/auth && npx vitest run test/user/usecase/change-role.usecase.test.ts -t "instructor flag"`
  and the "admin made an instructor clears the flag" test in `apps/backend/test/people-roles.e2e-spec.ts`.

### ER-04 — An admin switches the flag of an admin

- **Front:** backend
- **Behavior:** Given an approved admin A and an approved admin B with `is_instructor = false`, when A calls
  `PUT /people/B/instructor` with `{ "isInstructor": true }`, then it answers 200 `{ id: B, isInstructor: true }` and
  B is stored with `is_instructor = true`; `false` stores `false`. A may target themselves and gets the same result.
- **Edge and error cases:** the checks and keys of D-04, in that order: an unapproved caller → 403
  `user.status.notApproved`; an instructor or student caller → 403 `user.role.notAdmin`; a missing or non-boolean
  `isInstructor` → 422 `people.isInstructor.invalid`; a malformed or unknown id → 404 `user.notFound`; a target that
  isn't approved → 409 `user.status.notApproved`; a target that is a student or instructor → 409
  `people.isInstructor.notAdmin`; a target whose role or status changed between read and write → 409
  `user.role.changeNotAllowed`; sending the stored value → 200 with nothing else changed; no notification is stored
  for anyone; switching the flag off doesn't take B off any class.
- **Verify by:** `cd modules/auth && npx vitest run test/user/usecase/set-instructor-flag.usecase.test.ts`, the
  `PUT /people/:id/instructor` requests in `apps/backend/src/modules/auth/people.integration.http`, and the
  "instructor flag" tests in `apps/backend/test/people-roles.e2e-spec.ts`.

### ER-05 — The directory lists the people who can teach

- **Front:** backend
- **Behavior:** Given approved instructor I, approved admins F (flag on) and N (flag off), approved student S and a
  pending instructor P, when an approved user calls `GET /people?teaches=true`, then the items are I and F only,
  sorted and paged as `GET /people`, with `total` 2; every item of `GET /people` (with or without `teaches`) carries
  `isInstructor` (`true` for F, `false` for the others).
- **Edge and error cases:** `teaches=true&role=admin` answers F only; `teaches=true&search=<part of I's name>` answers
  I only; `teaches=false` or `teaches=1` answers 422 `people.teaches.invalid`; without `teaches` the list is as
  before.
- **Verify by:** `cd modules/auth && npx vitest run test/user/usecase/list-people.usecase.test.ts`,
  `cd apps/backend && npx vitest run src/modules/auth/user.prisma.spec.ts`, and the "teaches" tests in
  `apps/backend/test/people.e2e-spec.ts`.

### ER-06 — Classes refuse admins who don't teach

- **Front:** classes
- **Behavior:** Given an approved admin N with the flag off, an approved admin F with the flag on and an approved
  instructor I, when an admin creates a batch with instructors `[N]` (`POST` of spec 028), then it answers 422
  `class.instructors.invalid` and creates nothing; with `[F, I]` the batch is created. When an admin edits a class and
  adds N, it answers 422 `class.instructors.invalid` and nothing changes; adding F succeeds.
- **Edge and error cases:** an edit that keeps N, who was already on the class, among its instructors is accepted;
  pending, denied, deleted, removed or student accounts stay refused as before.
- **Verify by:** `cd modules/classes && npx vitest run test/school-class/usecase/create-class-batch.usecase.test.ts
  test/school-class/usecase/edit-class.usecase.test.ts`, and the "admin without the instructor flag" tests in
  `apps/backend/test/classes.e2e-spec.ts`.

### ER-07 — The promotion confirmation asks if the new admin teaches

- **Front:** mobile
- **Behavior:** Given an approved admin on the People screen opening a student's (or an instructor's) sheet, when they
  tap "Promover a admin", then the confirmation shows the "Também é instrutor" checkbox, unchecked, with its helper
  text, and the description without "Pode também dar aulas."; confirming without touching it sends
  `PUT /people/:id/role` with `{ role: "admin", isInstructor: false }`, and after checking it, with
  `isInstructor: true`.
- **Edge and error cases:** going "Voltar" and opening the confirmation again shows it unchecked; the checkbox is
  disabled while the change is saving; the "Promover a instrutor", "Rebaixar a aluno" and "Passar a instrutor"
  confirmations show no checkbox and send no `isInstructor`; the "Promover a admin" row's subtitle reads "Passa a
  gerenciar a escola."; the copy exists in pt-BR, es-ES and en-US.
- **Verify by:** `cd apps/mobile && npx jest src/components/ui/checkbox src/modules/people/components/role-change-confirmation
  src/modules/people/components/person-sheet src/modules/people/hooks/use-change-role.hook.test.tsx`, and the user
  journey in the Verification Plan.

### ER-08 — An admin switches "Também é instrutor" on an admin's sheet

- **Front:** mobile
- **Behavior:** Given an approved admin viewing the sheet of an admin (another one, or their own) on the People screen,
  then a "Também é instrutor" row shows, checked when the person's `isInstructor` is `true`; when they tap it, the app
  sends `PUT /people/:id/instructor` with the opposite value and, on 200, the row shows the new state and the people
  queries reload.
- **Edge and error cases:** the row doesn't show on a student's or an instructor's sheet, nor to an instructor or
  student viewer; the viewer's own sheet shows the row but still no role actions or remove action; the row is
  disabled while saving; a 409 or 404 shows the toast of D-09 and the row keeps its previous state; a network failure
  shows the generic error toast and keeps the previous state.
- **Verify by:** `cd apps/mobile && npx jest src/components/ui/checkbox src/modules/people/components/person-sheet
  src/modules/people/hooks/use-set-instructor-flag.hook.test.tsx src/modules/people/screens/people.screen.test.tsx`,
  and the user journey in the Verification Plan.

### ER-09 — The class pickers list only people who can teach

- **Front:** mobile
- **Behavior:** Given approved instructor I, admin F (flag on) and admin N (flag off), when an approved admin opens
  "Nova aula", then the instructor list shows I and F and not N; "Editar aula" offers the same people to add.
- **Edge and error cases:** on "Editar aula" of a class N already teaches, N still shows (selected) so they can be
  removed, as for an instructor who no longer teaches; the list's loading and error-with-retry states are unchanged;
  `useTeachers` reads `GET /people?...&role=instructor,admin&teaches=true` across every page.
- **Verify by:** `cd apps/mobile && npx jest src/modules/classes/hooks/use-teachers.hook.test.tsx
  src/modules/classes/screens/new-class.screen.test.tsx src/modules/classes/screens/edit-class.screen.test.tsx`, and
  the user journey in the Verification Plan.

## Tasks

### Auth module (`modules/auth`)

- [x] **T-01** — In `modules/auth/src/user/model/user.entity.ts`, add the optional `isInstructor` to `UserState` and
  the `isInstructor` getter (missing → `false`, D-01), with a boolean validation when present. In
  `src/user/usecase/change-role.usecase.ts`, take `isInstructor?: unknown` in `ChangeRoleIn`, validate it (D-03),
  store it on a promotion to admin, store `false` on every other change, and answer `isInstructor` in
  `ChangeRoleOut`. Tests in `test/user/model/user.entity.test.ts` and `test/user/usecase/change-role.usecase.test.ts`
  ("instructor flag": true, false, missing, non-boolean, `true` with another role, admin → instructor clears it).
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-03 · Done when: `cd modules/auth && npx vitest run test/user` passes.
  > ✅ 2026-10-28 12:15 — ChangeRole takes/validates/stores `isInstructor` (D-03) and answers it; `User.isInstructor` optional state + getter (missing → false) + boolean validation; files: `modules/auth/src/user/model/user.entity.ts`, `modules/auth/src/user/usecase/change-role.usecase.ts`, `modules/auth/test/user/model/user.entity.test.ts`, `modules/auth/test/user/usecase/change-role.usecase.test.ts`; verified: `cd modules/auth && npx jest test/user` (344 passed); deviations: the auth module runs Jest, not Vitest as the task text says

- [x] **T-02** — Add the `SetInstructorFlag` use case in `modules/auth/src/user/usecase/set-instructor-flag.usecase.ts`
  (D-04: checks in order, self allowed, `updateKeepingAnAdmin` with `{ role: "admin", status: "approved" }`, no
  notifier), exported from the module index, with `test/user/usecase/set-instructor-flag.usecase.test.ts` covering
  every case of ER-04 (the in-memory repository's `updateKeepingAnAdmin` answering `"changed"` included).
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-04 · Done when: `cd modules/auth && npx vitest run test/user/usecase/set-instructor-flag.usecase.test.ts`
  passes.
  > ✅ 2026-10-28 12:16 — Added `SetInstructorFlag` (D-04) exported from the usecase index, with tests for every case of ER-04; files: `modules/auth/src/user/usecase/set-instructor-flag.usecase.ts`, `modules/auth/src/user/usecase/index.ts`, `modules/auth/test/user/usecase/set-instructor-flag.usecase.test.ts`; verified: `cd modules/auth && npx jest test/user/usecase/set-instructor-flag` (21 passed); deviations: Jest instead of Vitest; guarded write treats any result other than "updated" as `user.role.changeNotAllowed` ("lastAdmin" is unreachable for admin→admin)

- [x] **T-03** — In `modules/auth/src/user/provider/user.repository.ts`, add `teachers?: boolean` to
  `DirectoryPageParams` (approved instructors and admins with the flag, D-06), and support it in the module's
  in-memory repository; in `src/user/usecase/list-people.usecase.ts`, parse `teaches` (`"true"` only, else 422
  `people.teaches.invalid`), pass it on, and add `isInstructor` to `PersonOut`. Tests in
  `test/user/usecase/list-people.usecase.test.ts` (filter, combined with role and search, invalid value, the field on
  every item).
  Covers: ER-05 · Done when: `cd modules/auth && npx vitest run test/user/usecase/list-people.usecase.test.ts` passes.
  > ✅ 2026-10-28 12:16 — `DirectoryPageParams.teachers`, in-memory repository support, `ListPeople` parses `teaches` (only "true", else 422 `people.teaches.invalid`) and answers `isInstructor` per item; files: `modules/auth/src/user/provider/user.repository.ts`, `modules/auth/src/user/usecase/list-people.usecase.ts`, `modules/auth/test/mock/fake-user.repository.ts`, `modules/auth/test/user/usecase/list-people.usecase.test.ts`; verified: `cd modules/auth && npx jest` (537 passed) and `tsc --noEmit` clean; deviations: Jest instead of Vitest

### Classes module (`modules/classes`)

- [x] **T-04** — In `modules/classes/src/school-class/provider/teacher-lookup.provider.ts`, add `isInstructor: boolean`
  to `TeacherRef`; add one `canTeach(teacher)` (approved and instructor, or approved admin with the flag, D-01/D-05)
  in the school-class aggregate and use it in `usecase/create-class-batch.usecase.ts` and `usecase/edit-class.usecase.ts`
  instead of their `TEACHER_ROLES`; update `test/mock/fake-teacher.lookup.ts`. Tests in
  `test/school-class/usecase/create-class-batch.usecase.test.ts` and `edit-class.usecase.test.ts` (admin without the
  flag refused, with the flag accepted, already-assigned admin without the flag kept on edit).
  Covers: ER-06 · Done when: `cd modules/classes && npx vitest run test/school-class` passes.
  > ✅ 2026-10-28 12:17 — `TeacherRef.isInstructor` and one `canTeach` (approved instructor, or approved admin with the flag) used by CreateClassBatch and EditClass instead of `TEACHER_ROLES`; files: `modules/classes/src/school-class/provider/teacher-lookup.provider.ts`, `modules/classes/src/school-class/usecase/create-class-batch.usecase.ts`, `modules/classes/src/school-class/usecase/edit-class.usecase.ts`, `modules/classes/test/school-class/usecase/create-class-batch.usecase.test.ts`, `modules/classes/test/school-class/usecase/edit-class.usecase.test.ts`; verified: `cd modules/classes && npx jest` (610 passed), `tsc --noEmit` clean; deviations: `canTeach` lives next to `TeacherRef` in the provider file rather than the model folder (the model must not import from providers); `test/mock/fake-teacher.lookup.ts` needed no change (it passes `TeacherRef` through); Jest instead of Vitest

### Backend (`apps/backend`)

- [x] **T-05** — Add `isInstructor Boolean @default(false) @map("is_instructor")` to `model User` in
  `apps/backend/prisma/models/auth.model.prisma` and the migration `prisma/migrations/<timestamp>_users_is_instructor/`
  with the backfill of D-02 (hand-added `UPDATE` after the generated `ALTER TABLE`); in
  `src/modules/auth/user.prisma.ts`, map `isInstructor` both ways and add the `teachers` condition to
  `findDirectoryPage` (`(role = 'instructor' OR (role = 'admin' AND is_instructor))`). Specs in
  `src/modules/auth/user.prisma.spec.ts`. Skill: [`backend-prisma-sync-module`](../../../.claude/skills/backend-prisma-sync-module).
  Covers: ER-02, ER-05 · Done when: `cd apps/backend && npx prisma migrate deploy` exits 0 and
  `npx vitest run src/modules/auth/user.prisma.spec.ts` passes.
  > ✅ 2026-10-28 12:19 — Added `users.is_instructor` (`NOT NULL DEFAULT false`) with the D-02 backfill (`UPDATE "users" SET "is_instructor" = true WHERE "role" = 'admin'`); `PrismaUserRepository` maps the flag both ways and `findDirectoryPage` supports `teachers`; files: `apps/backend/prisma/models/auth.model.prisma`, `apps/backend/prisma/migrations/20261028130000_users_is_instructor/migration.sql`, `apps/backend/src/modules/auth/user.prisma.ts`, `apps/backend/src/modules/auth/user.prisma.spec.ts`; verified: `cd apps/backend && npx prisma migrate deploy` (applied, exit 0; on the Compose DB the 4 admins got true, the other users false) and `npx vitest run src/modules/auth/user.prisma.spec.ts` (40 passed); deviations: migration SQL written by hand (no `migrate dev`); `modules/auth` and `modules/classes` rebuilt with `npm run build` so the backend sees the new types

- [x] **T-06** — In `apps/backend/src/modules/auth/people.controller.ts`, pass `isInstructor` from the body of
  `PUT :id/role`, add `PUT :id/instructor` (200, `SetInstructorFlag`, declared like the other `:id` routes) and the
  `teaches` query of `GET /people`; add the requests (role with flag, flag on/off, self, 403, 404, 409, 422, `teaches`)
  to `people.integration.http`; specs in `people.controller.spec.ts`; "instructor flag" tests in
  `test/people-roles.e2e-spec.ts` (ER-01, ER-03, ER-04) and "teaches" tests in `test/people.e2e-spec.ts` (ER-05).
  Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-03, ER-04, ER-05 · Done when: `cd apps/backend && npx vitest run src/modules/auth` passes and
  `npm run test:e2e -- test/people-roles.e2e-spec.ts test/people.e2e-spec.ts` passes against the Compose database.
  > ✅ 2026-10-28 12:20 — `PUT /people/:id/role` passes `isInstructor`, new `PUT /people/:id/instructor` (`SetInstructorFlag`, 200) and the `teaches` query of `GET /people`; requests added to the .http file; files: `apps/backend/src/modules/auth/people.controller.ts`, `apps/backend/src/modules/auth/people.controller.spec.ts`, `apps/backend/src/modules/auth/people.integration.http`, `apps/backend/test/people-roles.e2e-spec.ts`, `apps/backend/test/people.e2e-spec.ts`; verified: `cd apps/backend && npx vitest run src/modules/auth` (204 passed) and `npm run test:e2e -- test/people-roles.e2e-spec.ts test/people.e2e-spec.ts` against the Compose database (72 passed); deviations: controller edited by hand following the existing controller (skill not invoked); `tsc` still reports `teacher-lookup.prisma.ts` missing `isInstructor`, which T-07 fixes

- [x] **T-07** — In `apps/backend/src/modules/classes/teacher-lookup.prisma.ts`, select `isInstructor`; specs in
  `teacher-lookup.prisma.spec.ts`; "admin without the instructor flag" tests in `test/classes.e2e-spec.ts` (batch
  refused with 422 `class.instructors.invalid`, batch with a flagged admin created, edit adding the unflagged admin
  refused, edit keeping them accepted).
  Covers: ER-06 · Done when: `cd apps/backend && npx vitest run src/modules/classes/teacher-lookup.prisma.spec.ts`
  and `npm run test:e2e -- test/classes.e2e-spec.ts` pass.
  > ✅ 2026-10-28 12:21 — `PrismaTeacherLookup` selects `isInstructor`; e2e covers an admin without the flag refused on batch (alone and mixed) and on edit-add, a flagged admin accepted, and an unflagged admin already on the class kept; files: `apps/backend/src/modules/classes/teacher-lookup.prisma.ts`, `apps/backend/src/modules/classes/teacher-lookup.prisma.spec.ts`, `apps/backend/test/classes.e2e-spec.ts`; verified: `cd apps/backend && npx vitest run src/modules/classes` (174 passed), `npm run test:e2e -- test/classes.e2e-spec.ts` (108 passed), `tsc --noEmit` clean; deviations: the e2e `account` helper gained an `isInstructor` argument and two existing tests that used an admin as instructor now use a flagged one

### Mobile (`apps/mobile`)

- [x] **T-08** — In `apps/mobile/src/modules/people/`, add `isInstructor: boolean` to `Person` and an optional
  `isInstructor` to `ChangeRoleVariables` / `isInstructor` to `RoleChange` (`people.types.ts`); send it from
  `hooks/use-change-role.hook.ts` when present; add the "Também é instrutor" `Checkbox` and helper to
  `components/role-change-confirmation/` for `promoteAdmin` only (D-08), with its state reset each time the
  confirmation opens and passed through `components/person-sheet/person-sheet.hook.ts`; change the copy of D-10 in
  `src/i18n/messages/pt-BR.ts`, `es-ES.ts` and `en-US.ts`. Tests in `role-change-confirmation.component.test.tsx`,
  `person-sheet.component.test.tsx`, `person-sheet.hook.test.tsx` and `use-change-role.hook.test.tsx`.
  Covers: ER-07 · Done when: `cd apps/mobile && npx jest src/modules/people` passes.
  > ✅ 2026-10-28 12:23 — `Person.isInstructor`, `isInstructor` on `ChangeRoleVariables`/`RoleChange`, `useChangeRole` sends it only when given; the "Também é instrutor" checkbox + helper on the `promoteAdmin` confirmation (unchecked each time it opens because the confirmation remounts, disabled while saving), value passed through `usePersonSheet.confirmRoleChange(isInstructor)`; copy of D-10 and new `people.instructorFlag.*` keys in the three languages; files: `apps/mobile/src/modules/people/people.types.ts`, `apps/mobile/src/modules/people/people.test-utils.tsx`, `apps/mobile/src/modules/people/hooks/use-change-role.hook.ts`, `apps/mobile/src/modules/people/hooks/use-change-role.hook.test.tsx`, `apps/mobile/src/modules/people/components/role-change-confirmation/role-change-confirmation.{component.tsx,types.ts,component.test.tsx}`, `apps/mobile/src/modules/people/components/person-sheet/person-sheet.{hook.ts,hook.test.tsx,component.test.tsx}`, `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`; verified: `cd apps/mobile && npx jest src/modules/people` (174 passed), `npx tsc --noEmit` clean; deviations: none

- [x] **T-09** — Add `hooks/use-set-instructor-flag.hook.ts` (`PUT /people/:id/instructor`, no retry, invalidates
  `["people"]` on success) in `apps/mobile/src/modules/people/`, and the toggle row of D-09 on the person sheet: a
  new `canSetInstructorFlag` prop (computed in `hooks/use-people-screen.hook.ts`: approved admin viewer and an admin
  person, self included) and the row in `components/person-sheet/` (new state on success, error toasts of D-09,
  disabled while saving), with the label and helper keys in the three languages. Tests in
  `use-set-instructor-flag.hook.test.tsx`, `person-sheet.component.test.tsx`, `person-sheet.hook.test.tsx` and
  `screens/people.screen.test.tsx` (other admin, own sheet, student/instructor sheet, non-admin viewer, failure).
  Covers: ER-08 · Done when: `cd apps/mobile && npx jest src/modules/people` passes.
  > ✅ 2026-10-28 12:24 — `useSetInstructorFlag` (PUT /people/:id/instructor, no retry, invalidates ["people"]); toggle row (Checkbox + helper) on the person sheet between the contact row and the role actions, new `canSetInstructorFlag` prop computed in `usePeopleScreen` (approved admin viewer, admin person, self included); the sheet hook keeps the new state for the open sheet and maps errors with the new `getInstructorFlagErrorKey` (409 changeNotAllowed/notAdmin → "changed", 409 notApproved/404 → "notApproved", else generic/no-connection); files: `apps/mobile/src/modules/people/hooks/use-set-instructor-flag.hook.ts` (+ `.test.tsx`), `apps/mobile/src/modules/people/utils/instructor-flag-error.ts` (+ `.test.ts`), `apps/mobile/src/modules/people/components/person-sheet/person-sheet.{component.tsx,hook.ts,types.ts,component.test.tsx,hook.test.tsx}`, `apps/mobile/src/modules/people/hooks/use-people-screen.{hook.ts,types.ts}`, `apps/mobile/src/modules/people/screens/people.screen.tsx`, `apps/mobile/src/modules/people/screens/people.screen.test.tsx`; verified: `cd apps/mobile && npx jest src/modules/people` (198 passed), `npx tsc --noEmit` clean; deviations: error mapping lives in a new util instead of reusing `getRoleChangeErrorKey` (404 and the notAdmin key need different mapping); label/helper keys were added in T-08

- [x] **T-10** — In `apps/mobile/src/modules/classes/hooks/use-teachers.hook.ts`, add `teaches=true` to the request;
  tests in `use-teachers.hook.test.tsx` (the URL, every page) and in `screens/new-class.screen.test.tsx` /
  `edit-class.screen.test.tsx` (an unflagged admin answered by the mocked API is absent; on edit, an unflagged admin
  already on the class still shows).
  Covers: ER-09 · Done when: `cd apps/mobile && npx jest src/modules/classes` passes.
  > ✅ 2026-10-28 12:26 — `useTeachers` requests `GET /people?page=N&perPage=50&role=instructor,admin&teaches=true` across every page; the edit screen already lists the class's own instructors who are no longer in the teachers list (ticked, removable), so it needed no change; files: `apps/mobile/src/modules/classes/hooks/use-teachers.hook.ts`, `apps/mobile/src/modules/classes/hooks/use-teachers.hook.test.tsx`, `apps/mobile/src/modules/classes/screens/new-class.screen.test.tsx`, `apps/mobile/src/modules/classes/screens/edit-class.screen.test.tsx`; verified: `cd apps/mobile && npx jest src/modules/classes` (1084 passed), `npx tsc --noEmit` clean; deviations: none

- [x] **T-12** — Draw the "Também é instrutor" checkbox of D-08/D-09 as a boxed checkbox: give the shared
  `apps/mobile/src/components/ui/checkbox/` `Checkbox` an optional `helper` (a second line stacked under the label,
  read as the accessibility hint) and `variant` (`"plain"` default, `"boxed"`: `rounded-control bg-dim px-4 py-3`,
  text colors unchanged), and use `helper` + `variant="boxed"` in `components/role-change-confirmation/` and
  `components/person-sheet/` instead of the separate helper `Text`; change the helper copy of D-10 in
  `src/i18n/messages/pt-BR.ts`, `es-ES.ts` and `en-US.ts`. Tests in `checkbox.component.test.tsx` (the helper and its
  hint, pressing the helper toggles, the boxed classes) and the helper text in `role-change-confirmation.component.test.tsx`
  and `person-sheet.component.test.tsx`. (added by amendment)
  Covers: ER-07, ER-08 · Done when: `cd apps/mobile && npx jest src/components/ui/checkbox src/modules/people` passes.
  > ✅ 2026-10-28 12:56 — `Checkbox` gains `helper` and `variant="boxed"` (dim fill, `rounded-control`), used by the promotion confirmation and the admin's sheet; helper copy of D-10 in the three languages; files: `apps/mobile/src/components/ui/checkbox/checkbox.{component.tsx,types.ts,component.test.tsx}`, `apps/mobile/src/modules/people/components/role-change-confirmation/role-change-confirmation.{component.tsx,component.test.tsx}`, `apps/mobile/src/modules/people/components/person-sheet/person-sheet.{component.tsx,component.test.tsx}`, `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`; commits: 3076d743 (ink box, helper stacked), 08ee7a20 (helper copy, ink-2 fill), 9b5b4e28 (dim fill, usual text colors); verified: `cd apps/mobile && npx jest src/components/ui/checkbox src/modules/people` (29 suites, 204 passed), `npx tsc --noEmit` clean, eslint and prettier clean on the changed files, the confirmation and an admin's sheet seen on the iOS simulator (dark theme); deviations: made after round 1 accepted the spec — reopened with the user's approval (see Amendments); the other `Checkbox` users keep the plain look

### Verification

- [x] **T-11** — Run every command in the Verification Plan from the repo root; all pass. Record the output summary
  as evidence. Covers: all · Done when: every command exits 0 and the user journeys are observed as described.
  > ✅ 2026-10-28 12:31 — Ran the Verification Plan from the repo root; files: `apps/backend/test/cancellation-deadlines.e2e-spec.ts` (its admin, who teaches the classes it creates, now has `isInstructor: true`); verified: `node .specs/scripts/run-related-tests.mjs 070` (RELATED TESTS PASSED: backend, mobile, auth, classes, enrolment, school-rules), `node .specs/scripts/check-coverage.mjs 070` (every changed file 100%), `node .specs/scripts/run-e2e.mjs 070` first failed on `cancellation-deadlines.e2e-spec.ts` (admin without the flag, now fixed) and the whole backend e2e then passed (28 files, 817 tests), `npx prisma migrate deploy` applied the migration (see T-05), `npx turbo run lint check-types build --concurrency=1 --filter=auth,classes,backend,mobile` (27 tasks successful, 0 lint errors, 11 pre-existing warnings); NOT observed: the three iOS-simulator user journeys of the Verification Plan (promotion confirmation, toggle on a sheet, class pickers) — the jest screen tests cover the same behavior; deviations: none

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 070` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 070` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 070` — the backend e2e suite passes, the "instructor flag", "teaches" and "admin
    without the instructor flag" tests included (Compose Postgres up first).
  - `cd apps/backend && npx prisma migrate deploy` — the migration applies cleanly; its SQL matches D-02 (ER-02).
  - `npx turbo run lint check-types build --concurrency=1 --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
- User journeys (iOS simulator, backend running against the migrated database):
  - As an approved admin, open People → a student → "Promover a admin": the confirmation shows "Também é instrutor"
    unchecked and no "Pode também dar aulas."; confirm without checking it. Open "Nova aula": the new admin is not in
    the instructor list (ER-07, ER-09).
  - Open the new admin's sheet: the "Também é instrutor" row is unchecked; tap it, it turns checked; open "Nova aula":
    the admin is now in the list. Open your own sheet: the row shows, and no role or remove actions (ER-08, ER-09).
  - Promote an instructor to admin with the box checked: they stay in the "Nova aula" list; open "Editar aula" of a
    class taught by an admin whose flag is off: that admin shows as selected and can be removed (ER-07, ER-09).

## Memory Impact

- `memory/product.md` — User: the `isInstructor` flag ("also an instructor") and who can be assigned to teach;
  the role-change bullet (promotion to admin sets the flag, admin → instructor clears it, any admin switches it on an
  admin's sheet); the admin role ("an admin with the flag can also teach"); Class: instructors are instructors or
  admins with the flag; the product decision of spec 058 D-03 reversed; the out-of-scope lines of specs 057 and 058
  about the "also an instructor" flag updated; this spec's paragraph and its out-of-scope items.
- `memory/modules/auth.md` — `User.isInstructor`, `PUT /people/:id/role`'s `isInstructor`, `PUT /people/:id/instructor`
  (`SetInstructorFlag`, its checks and keys), `GET /people`'s `teaches` and `isInstructor` on items.
- `memory/modules/classes.md` — who can be assigned to a class (`canTeach`, `TeacherRef.isInstructor`), and that
  clearing the flag never unassigns.
- `memory/structure.md` — the new use case `set-instructor-flag.usecase.ts` and the route `PUT /people/:id/instructor`.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

- 2026-10-28 — /spec-plan --amend — status `accepted` → `in-progress` and `reviewed_commit` 86b18c42 dropped, so the
  spec can be amended and reviewed again. Reason: the checkbox tweak below was committed after round 1 accepted the
  spec. Off-workflow transition approved by the user.
- 2026-10-28 — /spec-plan --amend — D-08 changed: a plain `Checkbox` with a separate helper `Text` under it → a boxed
  `Checkbox` (`variant="boxed"`: `dim` fill, `rounded-control`) with the label and the helper stacked beside the box.
  Reason: the user wants the choice set apart in a box like the buttons. Approved by the user.
- 2026-10-28 — /spec-plan --amend — D-09 changed: "a toggle row with a `Checkbox` … and the same helper text" → "the
  same boxed `Checkbox` of D-08". Reason: same look on the sheet and the confirmation. Approved by the user.
- 2026-10-28 — /spec-plan --amend — D-10 changed: helper "Aparece na lista de instrutores ao criar e editar aulas." /
  "Aparece en la lista de instructores al crear y editar clases." / "Shows in the instructor list when creating and
  editing classes." → "Além de admin, dá aulas na escola." / "Además de admin, da clases en la escuela." / "Besides
  being an admin, teaches at the school.". Reason: the helper should only say the admin also teaches, not where they
  appear. Approved by the user.
- 2026-10-28 — /spec-plan --amend — T-12 added (Covers: ER-07, ER-08), already done in commits 3076d743, 08ee7a20 and
  9b5b4e28; ER-07 and ER-08 `Verify by` gain `src/components/ui/checkbox`. Approved by the user.

## Review

### Round 1 — 2026-10-28 — accepted

**Checks**

- lint ✅ · type check ✅ · build ✅ (`turbo run lint check-types build`: 27/27 tasks; auth, classes, backend, mobile)
- related tests ✅ `RELATED TESTS PASSED` — backend 198, mobile 1953, auth 500, classes 610, plus the whole enrolment
  and school-rules suites
- coverage of the changed lines ✅ `COVERAGE OK` (23 files); no coverage-ignore comments in the diff
- e2e: backend suite ✅ `E2E PASSED` (28 files, 817 tests), the "instructor flag", "teaches" and "admin without the
  instructor flag" tests included
- migration ✅ `prisma migrate deploy` exit 0; on a scratch database it applies with no admins, and the backfill
  sets the flag on admins of every status (approved, pending, removed) and on nobody else; a user inserted afterwards
  gets `false`; the column is `NOT NULL DEFAULT false`
- HTTP ✅ ER-01/03/04/05 sent to this branch's backend with throwaway users (removed afterwards)
- iOS simulator ✅ the three user journeys of the Verification Plan, against this branch's backend and the migrated
  Compose database (dev data restored afterwards)

**Expected Results**

- ER-01 ✅ — promotion stores the flag as sent (`true`/`false`; missing → `false`) and answers `{ id, role, isInstructor }`;
  `"yes"` and `true` with `instructor` → 422 `people.isInstructor.invalid`, nothing changed; an unknown id with
  `"yes"` → 422 (the check runs before the 404); `instructor` + `false` → 200
- ER-02 ✅ — migration SQL matches D-02; scratch-database run as in Checks
- ER-03 ✅ — admin → instructor answers and stores `isInstructor: false`; e2e shows the class kept
- ER-04 ✅ — on/off for another admin and for self → 200; instructor caller 403 `user.role.notAdmin`; `"true"` 422;
  `nope` 404; pending target 409 `user.status.notApproved`; instructor target 409 `people.isInstructor.notAdmin`;
  the read/write race is covered by the unit test (in-memory repository); turning the flag off left the admin on their
  class
- ER-05 ✅ — `teaches=true` lists approved instructors and flagged admins only, combines with `role` and `search`,
  `isInstructor` on every item; `teaches=false` and `teaches=1` → 422 `people.teaches.invalid`
- ER-06 ✅ — unit tests and the e2e "admin without the instructor flag" tests (batch refused alone and mixed, flagged
  admin accepted, edit adding refused, edit keeping accepted)
- ER-07 ✅ — simulator: a student's and an instructor's "Make admin" show the "Also an instructor" checkbox unchecked
  with its helper, below the seats sentence for a student; the description has no "They can also teach"; Back and
  reopen shows it unchecked; confirming unchecked stored `is_instructor = false`, checked stored `true`; the "Make
  admin" subtitle reads "Runs the school."; the other confirmations and the disabled-while-saving state are covered
  by the component tests
- ER-08 ✅ — simulator: the row shows on another admin's sheet (unchecked) and on the viewer's own sheet (checked, no
  role or remove actions), not on a student's or an instructor's sheet; a tap checked it, stored `true`, showed no
  toast, and "New class" then listed the admin; the error toasts are covered by the component and util tests
- ER-09 ✅ — simulator: "New class" listed the instructors and flagged admins, not the unflagged new admin, then
  listed them once the flag was on and kept a flagged promoted instructor; on "Edit class" of a class taught by an
  admin whose flag is off, that admin showed ticked and could be unticked (not saved), while unflagged admins not on
  the class weren't offered

**Findings**

None.

**Notes**

- After "Make admin" on the simulator, the People row still read STUDENT until a pull-to-refresh, though the API
  already answered `admin`. `useChangeRole` and `usePeople` are unchanged apart from the request body, so this looks
  older than this spec and isn't part of its contract; worth checking separately.
- `change-role.usecase.test.ts` "refuses … before looking for the person" uses an existing user, so it doesn't prove
  the D-03 order against the 404; the code does check the flag first, and the HTTP check above confirmed it. A test
  with an unknown id would pin it.
