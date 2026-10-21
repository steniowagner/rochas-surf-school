---
id: "047"
slug: class-changes-reach-students
title: "Students hear about class edits and location changes"
status: in-progress
started: 2026-10-21
base_commit: 5ea7d04ede7e87382ab8db1a2a5ff69840b65941
created: 2026-10-19
fronts: [classes, backend, mobile]
depends_on: ["046"]
---

# 047 — Students hear about class edits and location changes

## Goal

When an admin edits a class or changes a location, the students who hold a seat and the people with a pending
request are told, not only the instructors. Before cancelling or saving an edit, the admin sees how many enrolled
students, pending requests and instructors will be told. This closes the "with enrolment" leftovers of specs 032 and
037.

## Context

- Product: [product.md](../../memory/product.md) — **Class** ("edits and cancellations reach its students, the people
  with pending enrolments and its instructors") and **Location** ("if upcoming classes use it, the admin chooses
  whether to notify their students and instructors"; "Only instructors can be told about a change for now (students,
  with enrolment)").
- Requirements: [requirements.md → Edit notifications](../../../.docs/requirements.md#edit-notifications);
  [Notifying about a location change](../../../.docs/requirements.md#notifying-about-a-location-change).
- Technical: [technical-context.md](../../memory/technical-context.md) — Classes (`EditClass` and its notifications,
  `EditLocation` and `LocationChangeNotifier`), Push notifications.
- Depends on: spec `046` (and the enrolments of spec 041; cancelling already tells the students since spec 041).
- Designs: `.docs/designs/admin-app.html` AULAS-03 ("Saving notifies enrolled students and instructors") and AULAS-04
  (sheet `cancelarAula`: "Avisamos N inscritos, M pessoas com pedido pendente e K instrutores.").
- Existing code this builds on: `modules/classes/src/school-class/usecase/edit-class.usecase.ts`,
  `modules/classes/src/location/usecase/edit-location.usecase.ts`,
  `modules/classes/src/school-class/provider/class-change-notifier.provider.ts`,
  `location/provider/location-change-notifier.provider.ts`, `apps/mobile/src/modules/classes/components/cancel-class-sheet/`,
  `screens/edit-class.screen.tsx`, `components/location-sheet/`.

## Scope

### In scope

- A classes port `ClassAudienceReader` (the students with a seat and the people with a pending request of a class,
  and of a location's upcoming classes), implemented in the backend from the enrolments.
- `EditClass` and `EditLocation` tell that audience.
- `pendingRequests` on `GET /classes/:id` for admins.
- Mobile: the counts on the cancel sheet and the edit footer, the location checkbox's copy, the students' push taps.

### Out of scope

- A message from an admin to a class's people ("Avisar alunos e instrutores" stays inert).
- Telling guests anything (by product decision; spec 045 warns the admin).
- Telling people about a class deletion (a class with anyone in it can't be deleted).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | `ClassAudienceReader` (`provider/class-audience-reader.provider.ts`): `findClassAudience(classId) → userIds` (approved and pending enrolments, each person once) and `findLocationAudience(locationId, now) → [{ userId, count }]` (the same people for the location's classes that start after now and aren't cancelled, with how many of those classes they are in). | One port for both events; counts match the instructors' `location.changed`. |
| D-02 | An edit that changes a class field sends `class.edited` to the class audience as well as the kept instructors; an instructors-only change tells no student. The location edit with `notify: true` sends `location.changed` to the location audience too, with each person's count; a person who is also an instructor of those classes gets one notification with the larger count. Never the admin who edits. | Same types and copy as the instructors' (spec 032, 037). |
| D-03 | `GET /classes/:id` carries `pendingRequests: number` for approved admins and `null` for other roles; the week list doesn't carry it. | Only the admin's sheets need it. |
| D-04 | The cancel sheet's description reads "Avisamos N inscritos, M pessoas com pedido pendente e K instrutores. A aula fica na agenda, marcada como cancelada." (singular forms for 1), where N is the approved students, M `pendingRequests`, and K the class's instructors other than the viewer; the edit footer reads "Ao salvar, avisamos os instrutores, N inscritos e M com pedido pendente." when N or M is above 0, else the current text. | The design names who is told before a destructive action. |
| D-05 | The location sheet's notify checkbox reads "Avisar alunos e instrutores das próximas aulas?". | It now covers both. |

## Expected Results

### ER-01 — Class edits reach students and pending requests

- **Front:** classes
- **Behavior:** Given a class with an approved student S1, a pending request by S2 and instructor I, when an admin
  changes its start with `PUT /classes/:id`, then S1, S2 and I each get `class.edited`.
- **Edge and error cases:** changing only the instructors tells no student; a withdrawn, expired or denied student
  isn't told; an unchanged save tells nobody; a failing notification never changes the answer.
- **Verify by:** `npx jest test/school-class/usecase/edit-class.usecase.test.ts` (from `modules/classes`) and the
  "edit tells students" cases of `apps/backend/test/classes.e2e-spec.ts`.

### ER-02 — Location changes reach students and pending requests

- **Front:** classes
- **Behavior:** Given a location with two upcoming classes in which student S holds a seat, when an admin edits its
  address with `notify: true`, then S gets one `location.changed` with `count: 2` and the new name, as the
  instructors do.
- **Edge and error cases:** with `notify: false`, or nothing changed, nobody is told; past and cancelled classes
  don't count; a person who is also an instructor of those classes gets one notification (D-02).
- **Verify by:** `npx jest test/location/usecase/edit-location.usecase.test.ts` (from `modules/classes`) and the
  "location tells students" case of `apps/backend/test/locations.e2e-spec.ts`.

### ER-03 — Admins read a class's pending requests count

- **Front:** classes
- **Behavior:** Given a class with 3 pending requests, when an admin calls `GET /classes/:id`, then it carries
  `pendingRequests: 3`; when a student or an instructor reads it, then `pendingRequests` is `null`.
- **Edge and error cases:** the week list carries no `pendingRequests`.
- **Verify by:** `npx jest test/school-class/usecase/get-class.usecase.test.ts -t "pending"` (from `modules/classes`)
  and the "pendingRequests" case of `apps/backend/test/classes.e2e-spec.ts`.

### ER-04 — The admin sees who will be told

- **Front:** mobile
- **Behavior:** Given an admin on a class with 2 approved students, 1 pending request and 1 other instructor, when
  they open "Cancelar aula", then the description reads "Avisamos 2 inscritos, 1 pessoa com pedido pendente e 1
  instrutor. A aula fica na agenda, marcada como cancelada."; and on Editar aula the footer reads "Ao salvar,
  avisamos os instrutores, 2 inscritos e 1 com pedido pendente."
- **Edge and error cases:** with no students and no pending requests the edit footer keeps "Ao salvar, avisamos os
  instrutores da aula."; the plural and singular forms exist in pt-BR, es-ES and en-US.
- **Verify by:** `npx jest src/modules/classes/components/cancel-class-sheet src/modules/classes/screens/edit-class.screen.test.tsx`
  (from `apps/mobile`).

### ER-05 — The location checkbox names students too

- **Front:** mobile
- **Behavior:** Given an admin editing a location with upcoming classes, when the sheet renders, then the checkbox
  reads "Avisar alunos e instrutores das próximas aulas?" (on by default).
- **Edge and error cases:** a location without upcoming classes shows no checkbox, as before.
- **Verify by:** `npx jest src/modules/classes/components/location-sheet` (from `apps/mobile`).

### ER-06 — Students' pushes open the right screen

- **Front:** mobile
- **Behavior:** Given a student, when they tap a `class.edited` push, then the app opens `/student/class/[id]`; when
  they tap a `location.changed` push, then it opens the Agenda (`/student`).
- **Edge and error cases:** received with the app open, both invalidate `["classes"]` (and `location.changed`
  `["locations"]`) for the student too.
- **Verify by:** `npx jest src/modules/notifications/hooks` (from `apps/mobile`).

## Tasks

### Classes module (`modules/classes`)

- [x] **T-01** — Add `ClassAudienceReader` (D-01) and its fake, make `EditClass` and `EditLocation` notify the audience
  (D-02), and add `pendingRequests` for admins in `GetClass` (D-03) through the existing `PendingRequestCounter`, with
  tests. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03 · Done when: `npx jest` passes from `modules/classes`.
  > ✅ 2026-10-21 — added the `ClassAudienceReader` port and its fake; `EditClass` tells the class audience (new
  > optional `studentIds` on `ClassEdited`, like `ClassCancelled`) and `EditLocation` merges instructors and students,
  > one notification per person with the larger count, never the editor; `GetClass` carries `pendingRequests`
  > (admin: count, others: `null`); files: `modules/classes/src/school-class/provider/class-audience-reader.provider.ts`,
  > `.../provider/index.ts`, `.../provider/class-change-notifier.provider.ts`,
  > `modules/classes/src/location/provider/location-change-notifier.provider.ts`,
  > `modules/classes/src/school-class/usecase/edit-class.usecase.ts`, `.../get-class.usecase.ts`,
  > `modules/classes/src/location/usecase/edit-location.usecase.ts`,
  > `modules/classes/test/mock/fake-class-audience.reader.ts`, `modules/classes/test/mock/index.ts`,
  > `modules/classes/test/school-class/usecase/edit-class.usecase.test.ts`, `.../get-class.usecase.test.ts`,
  > `modules/classes/test/location/usecase/edit-location.usecase.test.ts`; verified: `npx jest` from
  > `modules/classes` (33 suites, 496 passed) and `tsc --noEmit`; deviations: `LocationChanged.recipients[].instructorId`
  > renamed `userId` since it now holds students too (backend adapter follows in T-02); a failed read of the
  > students tells the instructors only.

### Backend (`apps/backend`)

- [ ] **T-02** — Add `src/modules/enrolment/class-audience-reader.prisma.ts` with its spec, export it from
  `EnrolmentModule` and wire it into the classes and locations controllers. Skill:
  [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-01, ER-02 · Done when: `npx vitest run src/modules/enrolment src/modules/classes` passes.

- [ ] **T-03** — Add the student cases to `test/classes.e2e-spec.ts` (edit, `pendingRequests`) and
  `test/locations.e2e-spec.ts` (location change).
  Covers: ER-01, ER-02, ER-03 · Done when: `npm run test:e2e --workspace apps/backend` passes.

### Mobile (`apps/mobile`)

- [ ] **T-04** — Add `pendingRequests` to the class types and the counts of D-04 to `cancel-class-sheet` and
  `edit-class.screen.tsx`, with tests and copy in the three locales.
  Covers: ER-04 · Done when: `npx jest src/modules/classes/components/cancel-class-sheet src/modules/classes/screens/edit-class.screen.test.tsx` passes.

- [ ] **T-05** — Change the location sheet's checkbox copy (D-05) in the three locales, with the test updated.
  Covers: ER-05 · Done when: `npx jest src/modules/classes/components/location-sheet` passes.

- [ ] **T-06** — Route the student's `class.edited` and `location.changed` taps and invalidations, with tests.
  Covers: ER-06 · Done when: `npx jest src/modules/notifications/hooks` passes.

### Verification

- [ ] **T-07** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence.
  Covers: all · Done when: every automated command exits 0 and the user journeys are recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 047` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 047` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
  - `node .specs/scripts/run-e2e.mjs 047` — the backend e2e suite passes, including the new student cases.
- User journeys (e2e, followed in a browser or simulator):
  - On the iOS simulator as an admin, on a class with an enrolled student and a pending request, open "Cancelar
    aula" and Editar aula: both name the counts of ER-04; change the start and save: the student's stored
    notifications include `class.edited` (or the push arrives when pushes are set up).
  - Edit the class's location with the box ticked: the student is told.

## Memory Impact

- `memory/product.md` — Current state: edits and location changes reach students and pending requests; the admin's
  cancel and edit screens say who will be told; remove the "(with enrolment)" leftovers of specs 032 and 037.
- `memory/technical-context.md` — `ClassAudienceReader`, `pendingRequests` for admins, the student push taps.
- `memory/structure.md` — `class-audience-reader.prisma.ts`.
- `memory/modules.md` — None.
- `memory/modules/classes.md` — who is told of edits and location changes; `pendingRequests` on the class view.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
