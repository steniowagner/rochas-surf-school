---
id: "047"
slug: class-changes-reach-students
title: "Students hear about class edits and location changes"
status: in-review
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

- [x] **T-02** — Add `src/modules/enrolment/class-audience-reader.prisma.ts` with its spec, export it from
  `EnrolmentModule` and wire it into the classes and locations controllers. Skill:
  [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-01, ER-02 · Done when: `npx vitest run src/modules/enrolment src/modules/classes` passes.
  > ✅ 2026-10-21 — `PrismaClassAudienceReader` (approved and pending enrolments; the location audience counts the
  > upcoming, not cancelled classes per student), exported by `EnrolmentModule` and injected in both controllers;
  > the notification adapters now take `studentIds` on `class.edited` and `userId` recipients on `location.changed`;
  > files: `apps/backend/src/modules/enrolment/class-audience-reader.prisma.ts`, `.../class-audience-reader.prisma.spec.ts`,
  > `.../enrolment.module.ts`, `apps/backend/src/modules/classes/classes.controller.ts`, `.../classes.controller.spec.ts`,
  > `.../locations.controller.ts`, `.../locations.controller.spec.ts`,
  > `apps/backend/src/modules/notifications/notifications.class-change-notifier.ts`, `.../notifications.class-change-notifier.spec.ts`,
  > `.../notifications.location-change-notifier.ts`, `.../notifications.location-change-notifier.spec.ts`;
  > verified: `npx vitest run src/modules/enrolment src/modules/classes src/modules/notifications` (48 files, 412 passed),
  > `tsc --noEmit` and `oxlint src` clean (after `npm run build -w @rochas-surf-school/classes`); `GetClass` now also
  > receives the pending-request counter in the controller; deviations: also ran the notifications specs, since the adapters changed.

- [x] **T-03** — Add the student cases to `test/classes.e2e-spec.ts` (edit, `pendingRequests`) and
  `test/locations.e2e-spec.ts` (location change).
  Covers: ER-01, ER-02, ER-03 · Done when: `npm run test:e2e --workspace apps/backend` passes.
  > ✅ 2026-10-21 — e2e cases "edit tells students" (seated, pending and instructor told; withdrawn, expired and denied
  > not; instructors-only and unchanged saves tell no student; push failure keeps the 200), "pendingRequests" (3 for
  > the admin, `null` for instructor and student, absent from the week list) and "location tells students" (counts of
  > 2 and 1, past and cancelled classes ignored, one notification with the larger count for a student who also
  > teaches, nothing with `notify: false`); two existing assertions that compared the admin's and the student's
  > class bodies now account for `pendingRequests`; files: `apps/backend/test/classes.e2e-spec.ts`,
  > `apps/backend/test/locations.e2e-spec.ts`; verified: `npm run test:e2e` from `apps/backend` (22 files, 615 passed,
  > twice); deviations: a first run had one 5 s timeout under parallel load in a different test each time, absent on
  > the reruns.

### Mobile (`apps/mobile`)

- [x] **T-04** — Add `pendingRequests` to the class types and the counts of D-04 to `cancel-class-sheet` and
  `edit-class.screen.tsx`, with tests and copy in the three locales.
  Covers: ER-04 · Done when: `npx jest src/modules/classes/components/cancel-class-sheet src/modules/classes/screens/edit-class.screen.test.tsx` passes.
  > ✅ 2026-10-21 — `ClassItem.pendingRequests`; the cancel sheet names the enrolled students, pending requests and other
  > instructors (counts from `class-details.screen.hook.ts`, the viewer excluded), and the edit footer names the students
  > and pending requests, each falling back to the old sentence when there is nobody to name; pt-BR, es-ES and en-US
  > copy with singular and plural forms; files: `apps/mobile/src/modules/classes/utils/audience.ts`, `.../audience.test.ts`,
  > `.../classes.types.ts`, `.../components/cancel-class-sheet/cancel-class-sheet.{component.tsx,hook.ts,types.ts,component.test.tsx}`,
  > `.../screens/class-details.screen.{hook.ts,tsx,test.tsx}`, `.../screens/edit-class.screen.{hook.ts,tsx,test.tsx}`,
  > `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts`; verified: `npx jest src/modules/classes/components/cancel-class-sheet
  > src/modules/classes/screens src/modules/classes/utils/audience.test.ts` (6 suites, 361 passed), `tsc --noEmit` and
  > `eslint src/modules/classes src/i18n` clean; deviations: a shared `joinAudience` helper joins the parts, and the sentence
  > lists only the non-zero groups (D-04 gives only the full case).

- [x] **T-05** — Change the location sheet's checkbox copy (D-05) in the three locales, with the test updated.
  Covers: ER-05 · Done when: `npx jest src/modules/classes/components/location-sheet` passes.
  > ✅ 2026-10-21 — the notify checkbox now reads "Avisar alunos e instrutores das próximas aulas?" (and its es-ES and
  > en-US equivalents); files: `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts`,
  > `apps/mobile/src/modules/classes/components/location-sheet/location-sheet.component.test.tsx`,
  > `apps/mobile/src/modules/classes/screens/new-class.screen.test.tsx`; verified: `npx jest
  > src/modules/classes/components/location-sheet src/modules/classes/screens/new-class` (2 suites, 80 passed); deviations:
  > the new-class screen test, which asserts the same copy, was updated too.

- [x] **T-06** — Route the student's `class.edited` and `location.changed` taps and invalidations, with tests.
  Covers: ER-06 · Done when: `npx jest src/modules/notifications/hooks` passes.
  > ✅ 2026-10-21 — a student's `class.edited` tap opens `/student/class/[id]` and a `location.changed` tap opens the Agenda
  > (`routes.student.home`); `useNotificationReceived` already invalidated `["classes"]` / `["locations"]` for any role, so
  > the tests now pin it for a student; files: `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.ts`,
  > `.../use-notification-response.hook.test.tsx`, `.../use-notification-received.hook.test.tsx`; verified: `npx jest
  > src/modules/notifications/hooks` (4 suites, 101 passed), `tsc --noEmit` and eslint clean; deviations: the existing
  > test "class.edited tapped by someone who is now a student" expected the home fallback and now covers a class.edited
  > push without a class id instead.

### Verification

- [x] **T-07** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence.
  Covers: all · Done when: every automated command exits 0 and the user journeys are recorded.
  > ✅ 2026-10-21 — `run-related-tests.mjs 047`: RELATED TESTS PASSED (backend, mobile, modules/classes, modules/enrolment);
  > `check-coverage.mjs 047`: COVERAGE OK (19 files, all 100%); `npx turbo run lint check-types build` for classes, backend
  > and mobile: 27 tasks successful (15 existing oxlint warnings in backend, 0 errors); `run-e2e.mjs 047`: E2E PASSED
  > (backend, 22 files). User journeys not driven: no push or simulator session was available, so the admin journeys
  > below are for the reviewer or the user. 1) On the iOS simulator as an admin, on a class with an enrolled student and a
  > pending request, open Cancelar aula (expect "Avisamos 1 inscrito, 1 pessoa com pedido pendente e N instrutor(es)…") and
  > Editar aula (footer "Ao salvar, avisamos os instrutores, 1 inscrito e 1 com pedido pendente."); change the start and
  > save: the student has a stored `class.edited` notification. 2) Edit the class's location with the box ticked: the
  > student has a `location.changed` notification. The same behavior is covered by the e2e cases of T-03.

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

### Round 1 — 2026-10-21 — changes-requested

**Checks**

- lint ✅ · type check ✅ · build ✅ (classes, backend, mobile: 27 tasks; the 15 backend oxlint warnings are all
  on lines older than this spec)
- related tests ✅ RELATED TESTS PASSED (apps/backend, apps/mobile, modules/classes 496, modules/enrolment 291)
- coverage of the changed lines ✅ COVERAGE OK, 19 files at 100%; no coverage-ignore comments in the diff
- e2e: backend suite ✅ E2E PASSED, 22 files, 615 passed · mobile: ER-04 followed on the iOS simulator (pt-BR) ✅
- HTTP against the local backend: `GET /classes/:id` for a class with 1 approved and 2 pending enrolments →
  admin `pendingRequests: 2`, instructor and student `null`; the week list has no `pendingRequests` key

**Expected Results**

- ER-01 ✅ — `edit-class.usecase.test.ts` "notifies students" (kept instructors, students and pending requests;
  instructors-only and unchanged saves tell no student; never the editor; a failed read tells the instructors
  only) and e2e "edit tells students" (seated, pending and instructor told; withdrawn, expired and denied not;
  push failure keeps the 200)
- ER-02 ✅ — `edit-location.usecase.test.ts` "students" (own counts, larger count for a person who also teaches,
  `notify: false`, never the editor) and e2e "location tells students" (counts 2 and 1, past and cancelled
  classes ignored, one notification with count 2 for a student who teaches)
- ER-03 ✅ — `get-class.usecase.test.ts` "pending requests", the e2e "pendingRequests" case and the HTTP check above
- ER-04 ❌ — the cancel sheet and the full footer pass (simulator: "Avisamos 1 inscrito e 2 pessoas com pedido
  pendente. A aula fica na agenda, marcada como cancelada." and "Ao salvar, avisamos os instrutores, 1 inscrito
  e 2 com pedido pendente."); the footer with only one group breaks D-04's sentence, see F-01
- ER-05 ✅ — `location-sheet.component.test.tsx`; copy in the three locales; no checkbox without upcoming classes
- ER-06 ✅ — the taps open `/student/class/[id]` and `/student`, and the received pushes invalidate the queries;
  but the `location.changed` tap test doesn't prove the new branch, see F-02

**Findings**

- [x] **F-01** (D-04) — with students but no pending request (or the reverse), the edit footer drops the "e"
  before the last group: "Ao salvar, avisamos os instrutores, 1 inscrito." (en-US "When you save, we notify
  the instructors, 1 enrolled student.", es-ES the same). D-04's sentence always ends with "… e M com pedido
  pendente.", and the evidence's deviation (list only the non-zero groups) produces a list without its
  conjunction. Reproduce: `npx jest src/modules/classes/screens/edit-class.screen.test.tsx -t "names the
  students"` from `apps/mobile`; the `[1, 0]` and `[0, 3]` cases assert the broken sentence. Expected: "os
  instrutores" counts as the first item of the list, e.g. "Ao salvar, avisamos os instrutores e 1 inscrito."
  and "… os instrutores e 3 com pedido pendente." (and the same in es-ES and en-US), with the tests updated.
  > ✅ 2026-10-21 — "os instrutores" is now the first item of the list (`editClass.audience.instructors`), so the
  > footer reads "Ao salvar, avisamos os instrutores e 1 inscrito." and keeps "…, 2 inscritos e 1 com pedido
  > pendente."; `noteWithAudience` is "{{list}}" only, in the three locales; files:
  > `apps/mobile/src/modules/classes/screens/edit-class.screen.hook.ts`,
  > `apps/mobile/src/modules/classes/screens/edit-class.screen.test.tsx`,
  > `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts`; verified: `npx jest src/modules/classes
  > src/modules/notifications` (818 passed), `tsc --noEmit` and eslint clean; deviations: none
- [x] **F-02** (tests) — "opens the Agenda of a student who taps a location.changed push"
  (`use-notification-response.hook.test.tsx`) still passes with the new `location.changed` student branch of
  `use-notification-response.hook.ts` removed: the fallback `router.replace(routes.home)` resolves to
  `/student` as well, and the test only reads the pathname. Reproduce: delete the
  `if (data?.type === "location.changed" && flow === "student")` block and run `npx jest
  src/modules/notifications/hooks/use-notification-response.hook.test.tsx -t "location.changed"` → 3 passed.
  Expected: a test that fails without the branch (e.g. it opens `/student` from another screen and `router.back()`
  returns there, which a `replace` doesn't allow), or drop the branch if the fallback is the intended behavior.
  > ✅ 2026-10-21 — the test now spies on `router.push` and expects `routes.student.home`; mutation check: with the
  > branch disabled it fails, with it restored it passes; files:
  > `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.test.tsx`; verified:
  > `npx jest src/modules/notifications` (passed); deviations: none

**Notes**

- Memory Impact leaves out things `spec-finish` should record: `ClassEdited.studentIds`; the rename of
  `LocationChanged.recipients[].instructorId` to `userId`; the new constructor arguments of `EditClass`,
  `EditLocation` (`ClassAudienceReader`) and `GetClass` (`PendingRequestCounter`); `PrismaClassAudienceReader`
  among the enrolment adapters of classes ports (technical-context → Enrolment); the student `class.edited` /
  `location.changed` taps in the push section of Applications; the cancel sheet's new props and
  `src/modules/classes/utils/audience.ts` (`joinAudience`).
- On the simulator the admin was the class's only instructor: the edit footer still says "avisamos os
  instrutores" and, without students or requests, the cancel sheet keeps "Avisamos os instrutores da aula.",
  though nobody is told. That copy predates this spec and D-04 keeps it; a follow-up could drop it when K is 0.
- The e2e "pendingRequests" case reads `week.body.items[0]`; finding the class by id would not depend on being
  the only class that week.
- Not done on the simulator: saving the edit and confirming the cancel. Both would change the shared dev
  database and notify its accounts, and the e2e cases cover the stored notifications.
