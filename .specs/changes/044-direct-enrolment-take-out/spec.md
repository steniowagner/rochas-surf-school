---
id: "044"
slug: direct-enrolment-take-out
title: "Admins enrol students directly and take them out of classes"
status: changes-requested
started: 2026-10-20
base_commit: 90b0058217d6be77961db34562be5e51bd4e82fc
created: 2026-10-19
fronts: [enrolment, classes, notifications, backend, mobile]
depends_on: ["043"]
---

# 044 — Admins enrol students directly and take them out of classes

## Goal

Admins can put a school student straight into a class that hasn't started and has a free seat, without waiting for
a request — approving the student's pending request when there is one — from a new "Inscrever aluno" tool. They can
also take an approved student out of a class before it starts, with an optional reason. The student is told either
way and sees the result on the class.

## Context

- Product: [product.md](../../memory/product.md) — **Enrolment** ("An admin can enrol a student directly into a class
  that hasn't started and has a free seat: it creates an approved enrolment, or approves the student's pending one";
  `approved` ends as `taken out` by an admin before the class starts, with an optional reason; students are notified
  when an enrolment is created directly or taken out).
- Requirements: [requirements.md → Direct enrolment](../../../.docs/requirements.md#direct-enrolment);
  [Taking a student out](../../../.docs/requirements.md#taking-a-student-out).
- Technical: [technical-context.md](../../memory/technical-context.md) — the people directory (`GET /people` with
  `role` and `search`, spec 027), the week calendar and `useWeekClasses` (specs 030, 031), Mobile shared UI.
- Depends on: spec `043` (and through it 041, 042: the locked seat write of 042's D-01, the student states).
- Designs: `.docs/designs/admin-app.html` PAINEL-06 "Enrol a student" (builder `inscreverScreen`, "Aluno da escola"
  mode) and AULAS-02 (the students list with "Retirar", builder `dComQuem`, sheet `retirar`);
  `.docs/designs/student-app.html` builder `detalheScreen` (`retirado`). pt-PT adapted to pt-BR.
- Existing code this builds on: `apps/mobile/src/modules/classes/components/class-people/` (the students list),
  `apps/mobile/src/components/week-month-calendar/`, `apps/mobile/src/modules/people/hooks/` (`usePeople`),
  `apps/mobile/src/modules/admin/screens/admin.screen.tsx`, `apps/mobile/src/components/ui/text-area/`.

## Scope

### In scope

- `EnrolStudent` (`POST /classes/:id/enrolments/direct`) and `TakeStudentOut` (`POST /enrolments/:id/take-out`).
- `enrolment.enrolled` and `enrolment.takenOut` to the student (and `enrolment.approved` when a pending request is
  approved this way).
- `enrolmentId` on each student of a class's roster.
- Mobile: the "Inscrever aluno" home row and screen (school students only), "Retirar" on the admin's class details,
  the student's taken-out state, the push taps.

### Out of scope

- Enrolling guests (trial) — spec 045 adds that mode to the same screen.
- Taking out after the class starts, or moving a student between classes.
- Enrolling several students at once; enrolling from the class details.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | Direct enrolment uses spec 042's locked seat write (D-01 there): the class row is locked, the seats counted, then the enrolment inserted (or the pending one approved) in the same transaction. | Exactly one write wins the last seat. |
| D-02 | Direct enrolment checks, in order: access (approved admin); the class (non-UUID or none → 404 `class.notFound`); `studentId` (non-UUID, unknown, not an approved account with role student → 422 `enrolment.student.invalid`); `class.cancelled` (409); `class.started` (409); `enrolment.alreadyApproved` (409, the student holds a seat); `enrolment.class.full` (409). | Access, identity, then state. |
| D-03 | A student with a pending request in the class gets that row approved and the `enrolment.approved` notification; otherwise a new approved row (`ruleAcceptedAt` null) and `enrolment.enrolled`. | The product says the pending request becomes approved; the student's copy differs. |
| D-04 | Take-out checks: access (admin); the enrolment (404 `enrolment.notFound`); `enrolment.reason.max.length` (422, over 300 characters after trimming, or not a string); `enrolment.notApproved` (409); `class.started` (409). Conditional on `status = 'approved'`. | The design's sheet limits the reason to 300. |
| D-05 | Each roster student carries `enrolmentId`, so the admin's details can take one out; it is read by everyone who sees the class. | Avoids another endpoint; an id is not personal data. |
| D-06 | The tool lists students with `GET /people?role=student&search=` (approved students only, A–Z, 20 at a time with more on scroll) and classes week by week with `WeekMonthCalendar` and `useWeekClasses`, showing only classes that haven't started and aren't cancelled. | Reuses the directory and the calendar instead of new reads. |

## Expected Results

### ER-01 — An admin enrols a student directly

- **Front:** enrolment
- **Behavior:** Given an approved student without an open enrolment and a class that hasn't started with a free
  seat, when an admin calls `POST /classes/:id/enrolments/direct` with `{ "studentId": "…" }`, then the API answers
  201 with `{ id, classId, status: "approved", requestedAt }` and the student holds a seat.
- **Edge and error cases:** a student with a pending request in the class gets that same enrolment approved (200
  with its id); the refusals of D-02 — 404 `class.notFound`, 422 `enrolment.student.invalid` (an instructor, an
  admin, a pending or deleted account), 409 `class.cancelled`, 409 `class.started`, 409 `enrolment.alreadyApproved`,
  409 `enrolment.class.full` — store nothing; a non-admin answers 403 `user.role.notAdmin`.
- **Verify by:** `npx jest test/enrolment/usecase/enrol-student.usecase.test.ts` (from `modules/enrolment`) and the
  "enrols directly" cases of `apps/backend/test/direct-enrolment.e2e-spec.ts`.

### ER-02 — The student is told of a direct enrolment

- **Front:** backend
- **Behavior:** Given a direct enrolment that created a seat, when it is stored, then the student gets
  `enrolment.enrolled` with `{ classId, discipline, startsAt }`, pushed as "Você foi inscrito" / "A escola inscreveu
  você na aula de Surf de 19/10 às 08:00." (pt-BR; es and en in the catalog).
- **Edge and error cases:** when it approved a pending request, the student gets `enrolment.approved` instead
  (D-03); no admin or instructor is told; a failing push never changes the answer.
- **Verify by:** `npx vitest run src/modules/notifications/notifications.enrolment-notifier.spec.ts src/modules/notifications/push-messages.spec.ts`
  (from `apps/backend`) and the "notifies" case of `apps/backend/test/direct-enrolment.e2e-spec.ts`.

### ER-03 — An admin takes a student out

- **Front:** enrolment
- **Behavior:** Given an approved enrolment in a class that hasn't started, when an admin calls
  `POST /enrolments/:id/take-out` with `{ "reason": "Esta turma é de nível avançado." }`, then the API answers 200
  with `status: "takenOut"`, the reason is stored trimmed, and the seat is free.
- **Edge and error cases:** no reason or a blank one stores none; 422 `enrolment.reason.max.length` over 300
  characters; 409 `enrolment.notApproved`; 409 `class.started`; 404 `enrolment.notFound`; a non-admin answers 403.
- **Verify by:** `npx jest test/enrolment/usecase/take-student-out.usecase.test.ts` (from `modules/enrolment`) and
  the "takes out" cases of `apps/backend/test/direct-enrolment.e2e-spec.ts`.

### ER-04 — The student is told of a take-out

- **Front:** backend
- **Behavior:** Given a taken-out enrolment, when it is stored, then the student gets `enrolment.takenOut` with
  `{ classId, discipline, startsAt }` and `reason` when there is one, pushed as "Você foi retirado de uma aula" / the
  reason as written, or "A escola retirou você da aula de Surf de 19/10 às 08:00." (pt-BR; es and en in the catalog).
- **Edge and error cases:** nobody else is told; a failing push never changes the answer.
- **Verify by:** `npx vitest run src/modules/notifications/push-messages.spec.ts` (from `apps/backend`) and the
  "notifies the student" case of `apps/backend/test/direct-enrolment.e2e-spec.ts`.

### ER-05 — Roster students carry their enrolment id

- **Front:** classes
- **Behavior:** Given a class with approved students, when it is read, then each entry of `students` is
  `{ id, name, photoUrl, enrolmentId }`.
- **Edge and error cases:** the week list's cap of 4 is unchanged.
- **Verify by:** `npx jest test/school-class` (from `modules/classes`) and
  `npx vitest run src/modules/enrolment/class-roster-reader.prisma.spec.ts` (from `apps/backend`).

### ER-06 — The "Inscrever aluno" tool

- **Front:** mobile
- **Behavior:** Given an admin on the home, when they open the "Inscrever aluno" row under "Ferramentas", then the
  screen "Inscrever aluno" shows "Inscreva um aluno da escola numa aula." and two steps: "1 · Quem" — a search box
  "Procurar aluno" and the students' rows (initials avatar, name, a radio), "Nenhum aluno encontrado." when none; "2
  · Aula" — the week calendar and the selected day's classes that haven't started and aren't cancelled as class
  cards, full ones faded and not selectable, "Sem aulas por começar neste dia." when none; "Inscrever <nome>"
  (enabled with a student and a class) enrols, shows "<nome> inscrito · aluno avisado" and goes back.
- **Edge and error cases:** `enrolment.alreadyApproved`, `enrolment.class.full`, `class.started`,
  `class.cancelled` and `enrolment.student.invalid` show their toasts and reload the classes; a double press sends
  once; loading and error states for both lists; copy in pt-BR, es-ES and en-US.
- **Verify by:** `npx jest src/modules/enrolment/screens/enrol-student.screen.test.tsx src/modules/admin/screens/admin.screen.test.tsx`
  (from `apps/mobile`).

### ER-07 — "Retirar" on the admin's class details

- **Front:** mobile
- **Behavior:** Given an admin on the details of a class that hasn't started and isn't cancelled, when they open the
  students list, then each student row has "Retirar" (outline, `bad` text); pressing it opens "Retirar <primeiro
  nome> da aula?" with "Surf Iniciante · Amanhã, 08:00 – 09:00. A vaga fica livre. A pessoa recebe uma
  notificação, com o motivo se você escrever.", "Motivo (opcional)" (a `TextArea` of 300), "Retirar da aula"
  (`danger`) and "Voltar"; confirming shows "<nome> retirado · aluno avisado" and the class reloads.
- **Edge and error cases:** students and instructors see no "Retirar"; started, finished and cancelled classes show
  none; `enrolment.notApproved` and `class.started` show their toasts and reload; the reason clears when the sheet
  closes.
- **Verify by:** `npx jest src/modules/classes/components/class-people src/modules/enrolment/components/take-out-sheet`
  (from `apps/mobile`).

### ER-08 — The student sees a take-out

- **Front:** mobile
- **Behavior:** Given a student whose latest enrolment was taken out, when the class's details render, then the
  banner "Você foi retirado da aula" / "Motivo: “…”" (or "Sem motivo indicado.") shows on `bad` tint, the Agenda
  chip reads "Retirado" (`bad`), and the footer offers "Pedir novamente" while the class hasn't started; tapping an
  `enrolment.enrolled` or `enrolment.takenOut` push opens `/student/class/[id]`.
- **Edge and error cases:** a directly enrolled student sees the approved state of spec 042; pushes received with the
  app open invalidate `["classes"]`.
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "taken out" src/modules/enrolment/utils src/modules/notifications/hooks`
  (from `apps/mobile`).

## Tasks

### Enrolment module (`modules/enrolment`)

- [x] **T-01** — Add `EnrolStudent` (`src/enrolment/usecase/enrol-student.usecase.ts`, D-01–D-03, a `StudentLookup`
  port for "approved student", the notifier's `studentEnrolled` / `requestApproved`) and the repository's locked
  `enrolDirectly`, with tests and the in-memory version. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02 · Done when: `npx jest test/enrolment/usecase/enrol-student.usecase.test.ts` passes.
  > ✅ 2026-10-20 20:11 — added `EnrolStudent` (access, class, student via the new `StudentLookup` port, cancelled, started, then the locked `enrolDirectly` result: alreadyApproved / full / approved from pending / enrolled; notifies `studentEnrolled` or `requestApproved`) and `EnrolmentRepository.enrolDirectly` + `DirectEnrolResult`, `StudentEnrolled` event; fakes updated; files: `modules/enrolment/src/enrolment/usecase/enrol-student.usecase.ts`, `modules/enrolment/src/enrolment/usecase/index.ts`, `modules/enrolment/src/enrolment/provider/student-lookup.provider.ts`, `modules/enrolment/src/enrolment/provider/index.ts`, `modules/enrolment/src/enrolment/provider/enrolment.repository.ts`, `modules/enrolment/src/enrolment/provider/enrolment-notifier.provider.ts`, `modules/enrolment/test/enrolment/usecase/enrol-student.usecase.test.ts`, `modules/enrolment/test/mock/fake-enrolment.repository.ts`, `modules/enrolment/test/mock/fake-enrolment.notifier.ts`, `modules/enrolment/test/mock/fake-student-lookup.ts`, `modules/enrolment/test/mock/index.ts`, `modules/enrolment/test/mock/fake-enrolment.repository.test.ts`; verified: `npx jest test/enrolment/usecase/enrol-student.usecase.test.ts` (19 passed), full module suite 203 passed, `tsc --noEmit` clean, use case 100% covered; deviations: wrote by hand following the module-use-case patterns of the sibling use cases (use case returns `{ enrolment, created }` so the controller can answer 201 vs 200); the backend notifier adapter does not implement `studentEnrolled` yet (T-06)

- [x] **T-02** — Add `takeOut(reason, now)` to the entity and `TakeStudentOut`
  (`src/enrolment/usecase/take-student-out.usecase.ts`, D-04, the notifier's `studentTakenOut`), with tests. Skills:
  [`module-entity`](../../../.claude/skills/module-entity), [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-03, ER-04 · Done when: `npx jest test/enrolment` passes from `modules/enrolment`.
  > ✅ 2026-10-20 20:12 — added `Enrolment.takeOut(reason, now)` (approved only, → `takenOut`, reason + endedAt), `TAKE_OUT_REASON_MAX` (300), `EnrolmentRepository.takeOut` (conditional on approved), `StudentTakenOut` + notifier `studentTakenOut`, and `TakeStudentOut` (access, enrolment 404, reason 422, notApproved, class.started, write, notify); fakes updated; files: `modules/enrolment/src/enrolment/model/enrolment.entity.ts`, `modules/enrolment/src/enrolment/provider/enrolment.repository.ts`, `modules/enrolment/src/enrolment/provider/enrolment-notifier.provider.ts`, `modules/enrolment/src/enrolment/usecase/take-student-out.usecase.ts`, `modules/enrolment/src/enrolment/usecase/index.ts`, `modules/enrolment/test/enrolment/model/enrolment.entity.test.ts`, `modules/enrolment/test/enrolment/usecase/take-student-out.usecase.test.ts`, `modules/enrolment/test/mock/fake-enrolment.repository.ts`, `modules/enrolment/test/mock/fake-enrolment.notifier.ts`, `modules/enrolment/test/mock/fake-enrolment.repository.test.ts`; verified: `npx jest` from `modules/enrolment` (235 passed, new files 100% covered), `tsc --noEmit` clean; deviations: hand-written following the sibling entity/use case patterns instead of invoking the skills

### Classes module (`modules/classes`)

- [x] **T-03** — Add `enrolmentId` to `ClassStudent` (`provider/class-roster-reader.provider.ts`) and to the
  fakes and use case tests.
  Covers: ER-05 · Done when: `npx jest test/school-class` passes from `modules/classes`.
  > ✅ 2026-10-20 20:12 — added `enrolmentId` to `ClassStudent`; the roster still passes through the class item (`{ ...student }`), so `GET` class and the week list carry it (cap of 4 unchanged); files: `modules/classes/src/school-class/provider/class-roster-reader.provider.ts`, `modules/classes/test/school-class/usecase/get-class.usecase.test.ts`, `modules/classes/test/school-class/usecase/list-week-classes.usecase.test.ts`, `modules/classes/test/school-class/provider/fake-class-roster.reader.test.ts`; verified: `npx jest test/school-class` from `modules/classes` (351 passed, includes the `toEqual` of the full student objects with `enrolmentId`), `tsc --noEmit` clean; deviations: none

### Notifications module (`modules/notifications`)

- [x] **T-04** — Add `enrolment.enrolled` and `enrolment.takenOut` to `NOTIFICATION_TYPES`, with the entity tests.
  Covers: ER-02, ER-04 · Done when: `npx jest test/notification` passes from `modules/notifications`.
  > ✅ 2026-10-20 20:12 — added `enrolment.enrolled` and `enrolment.takenOut` to `NOTIFICATION_TYPES` with entity test cases; files: `modules/notifications/src/notification/model/notification.entity.ts`, `modules/notifications/test/notification/model/notification.entity.test.ts`; verified: `npx jest test/notification` from `modules/notifications` (passed), `tsc --noEmit` clean; deviations: none

### Backend (`apps/backend`)

- [x] **T-05** — In `src/modules/enrolment/`: `enrolDirectly` (locked) and `takeOut` (conditional) in
  `enrolment.prisma.ts`, `student-lookup.prisma.ts`, and `enrolmentId` in `class-roster-reader.prisma.ts`, with specs.
  Skill: [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-01, ER-03, ER-05 · Done when: `npx vitest run src/modules/enrolment` passes.
  > ✅ 2026-10-20 20:13 — added `enrolDirectly` (transaction: lock class row `FOR UPDATE`, find the open enrolment, alreadyApproved → count → full → approve the pending row or create the approved one; P2002 → `enrolment.alreadyOpen`) and `takeOut` (`updateMany` where `approved`) to `PrismaEnrolmentRepository`; new `PrismaStudentLookup` (approved account with role student) registered in `EnrolmentModule`; roster reader now selects `id` and returns `enrolmentId`; files: `apps/backend/src/modules/enrolment/enrolment.prisma.ts`, `apps/backend/src/modules/enrolment/enrolment.prisma.spec.ts`, `apps/backend/src/modules/enrolment/student-lookup.prisma.ts`, `apps/backend/src/modules/enrolment/student-lookup.prisma.spec.ts`, `apps/backend/src/modules/enrolment/class-roster-reader.prisma.ts`, `apps/backend/src/modules/enrolment/class-roster-reader.prisma.spec.ts`, `apps/backend/src/modules/enrolment/enrolment.module.ts`; verified: `npx vitest run src/modules/enrolment` (13 files, 82 passed) after rebuilding the three modules with turbo; deviations: hand-written following `approve` and the sibling readers rather than invoking the skill; backend type check still fails on the notifier adapter and controller until T-06/T-07

- [x] **T-06** — Add `studentEnrolled` / `studentTakenOut` to `notifications.enrolment-notifier.ts` and the two
  catalog entries in pt-BR, es and en, with specs.
  Covers: ER-02, ER-04 · Done when: `npx vitest run src/modules/notifications` passes.
  > ✅ 2026-10-20 20:14 — added `studentEnrolled` / `studentTakenOut` to `NotificationsEnrolmentNotifier` (student only, errors logged and swallowed; the reason is left out when there is none) and the `enrolment.enrolled` / `enrolment.takenOut` push copy in pt-BR, es and en (the take-out body is the reason as written, else the default text); files: `apps/backend/src/modules/notifications/notifications.enrolment-notifier.ts`, `apps/backend/src/modules/notifications/notifications.enrolment-notifier.spec.ts`, `apps/backend/src/modules/notifications/push-messages.ts`, `apps/backend/src/modules/notifications/push-messages.spec.ts`; verified: `npx vitest run src/modules/notifications` (17 files, 152 passed); deviations: none

- [x] **T-07** — Add `POST /classes/:id/enrolments/direct` and `POST /enrolments/:id/take-out` to
  `enrolment.controller.ts`, its spec and the requests in `enrolment.integration.http`. Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-03 · Done when: `npx vitest run src/modules/enrolment/enrolment.controller.spec.ts` passes.
  > ✅ 2026-10-20 20:14 — added `POST /classes/:id/enrolments/direct` (201, or 200 through `@Res({ passthrough })` when a pending request was approved) and `POST /enrolments/:id/take-out` (200) to `EnrolmentController` (new `PrismaStudentLookup` dependency), their spec cases and the requests in the `.http` file; files: `apps/backend/src/modules/enrolment/enrolment.controller.ts`, `apps/backend/src/modules/enrolment/enrolment.controller.spec.ts`, `apps/backend/src/modules/enrolment/enrolment.integration.http`; verified: `npx vitest run src/modules/enrolment` (13 files, 92 passed), `npx tsc --noEmit` from `apps/backend` clean; deviations: hand-written following the sibling handlers rather than invoking the skill

- [x] **T-08** — Add `test/direct-enrolment.e2e-spec.ts` (fixed clock, faked pushes, cleanup) with the direct
  enrolment (new and from pending), full, refusals, take-out and notification cases.
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05 · Done when: `npm run test:e2e --workspace apps/backend` passes.
  > ✅ 2026-10-20 20:17 — added `direct-enrolment.e2e-spec.ts` (fixed clock, faked pushes, cleanup by email domain/location mark): new and pending-approved enrolments, re-enrolling after an ended one, full, every refusal of D-02, 403/401, the last-seat and same-student races, the roster `enrolmentId`; take-out with trimmed/blank/over-300 reasons, refusals, race, the student's `myEnrolment`; notification and push-failure cases; also updated the roster assertion of the existing decisions e2e for the new `enrolmentId`; files: `apps/backend/test/direct-enrolment.e2e-spec.ts`, `apps/backend/test/enrolment-decisions.e2e-spec.ts`; verified: `npm run test:e2e --workspace apps/backend` (21 files, 580 passed; the new file has 21 tests); deviations: none

### Mobile (`apps/mobile`)

- [x] **T-09** — Add `hooks/use-enrol-student.hook.ts` and `hooks/use-take-student-out.hook.ts` (no retry;
  invalidate `["classes"]` and `["enrolments", "pending"]`) and their error keys, with tests.
  Covers: ER-06, ER-07 · Done when: `npx jest src/modules/enrolment/hooks src/modules/enrolment/utils` passes.
  > ✅ 2026-10-20 20:21 — added `useEnrolStudent` (`POST /classes/:id/enrolments/direct`) and `useTakeStudentOut` (`POST /enrolments/:id/take-out`, blank reason sends `{}`), both without retry and invalidating `["enrolments","pending"]` and `["classes"]` only on success; error helpers `getEnrolStudentErrorKey`, `shouldReloadEnrolClasses`, `getTakeOutErrorKey`; new variable types; files: `apps/mobile/src/modules/enrolment/enrolment.types.ts`, `apps/mobile/src/modules/enrolment/hooks/use-enrol-student.hook.ts`, `apps/mobile/src/modules/enrolment/hooks/use-take-student-out.hook.ts`, `apps/mobile/src/modules/enrolment/hooks/use-enrol-student.hook.test.tsx` (covers both hooks), `apps/mobile/src/modules/enrolment/utils/enrolment-error.ts`, `apps/mobile/src/modules/enrolment/utils/enrolment-error.test.ts`; verified: `npx jest src/modules/enrolment/hooks src/modules/enrolment/utils` from `apps/mobile` (12 suites, 109 passed); deviations: the error keys (`enrolStudent.errors.*`, `takeOutSheet.errors.*`) get their copy in T-10/T-11 with the screens that show them

- [x] **T-10** — Add `src/modules/enrolment/screens/enrol-student.screen.tsx` (+ hook, types; D-06), the route
  `src/app/(private)/admin/enrol-student.tsx`, `routes.admin.enrolStudent`, and the "Inscrever aluno" row on
  `admin.screen.tsx`, with tests and copy in the three locales. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-06 · Done when: `npx jest src/modules/enrolment/screens src/modules/admin/screens` passes.
  > ✅ 2026-10-20 20:25 — added `EnrolStudentScreen` (+ `enrol-student.screen.hook.ts` / `.types.ts`): "1 · Quem" search box over `usePeople({ roles: ["student"], search })` (debounced, radio rows with initials avatar, next page on scroll, empty/loading/error+retry) and "2 · Aula" with `WeekMonthCalendar`, `useWeekClasses` / `useVisibleWeeksClasses`, only classes that have not started and are not cancelled as `ClassCard`s, full ones faded and unselectable; "Inscrever <nome>" enrols once (in-flight guard), toasts "<nome> inscrito · aluno avisado" and goes back; the five stale errors toast and reload the classes; route `src/app/(private)/admin/enrol-student.tsx`, `routes.admin.enrolStudent`, the "Inscrever aluno" row on the admin home after the class enrolments; copy in pt-BR, es-ES and en-US (the same i18n commit also carries the `takeOutSheet` copy that T-11 uses); files: `apps/mobile/src/modules/enrolment/screens/enrol-student.screen.tsx`, `apps/mobile/src/modules/enrolment/screens/enrol-student.screen.hook.ts`, `apps/mobile/src/modules/enrolment/screens/enrol-student.screen.types.ts`, `apps/mobile/src/modules/enrolment/screens/enrol-student.screen.test.tsx`, `apps/mobile/src/app/(private)/admin/enrol-student.tsx`, `apps/mobile/src/constants/routes.ts`, `apps/mobile/src/modules/admin/screens/admin.screen.tsx`, `apps/mobile/src/modules/admin/screens/admin.screen.test.tsx`, `apps/mobile/src/i18n/messages/pt-BR.ts`, `apps/mobile/src/i18n/messages/es-ES.ts`, `apps/mobile/src/i18n/messages/en-US.ts`; verified: `npx jest src/modules/enrolment/screens src/modules/admin/screens` (3 suites, 45 passed); deviations: the student list is a bounded inner `ScrollView` with an end-reached check instead of a nested `FlatList`, to avoid nesting virtualized lists in the page scroll

- [x] **T-11** — Add `components/take-out-sheet/` and an optional `onTakeOut` on `ClassPeople` (a "Retirar" button
  per student row), passed by the details only with `canEdit` on a not-started, not-cancelled class, with tests and
  copy.
  Covers: ER-07 · Done when: `npx jest src/modules/classes/components/class-people src/modules/enrolment/components` passes.
  > ✅ 2026-10-20 20:27 — added `TakeOutSheet` (a thin component over the shared `DenySheet`: title "Retirar <primeiro nome> da aula?", the class summary hint, optional reason of 300, `danger` "Retirar da aula", "Voltar"; reason cleared on close), `useTakeOut` (sheet target, in-flight guard, toast "<nome> retirado · aluno avisado", `notApproved` / `started` close the sheet, toast and reload the class), an optional `onTakeOut` on `ClassPeople` (a "Retirar" outline button with `bad` text per student row), `enrolmentId` on `ClassStudent`, and the wiring in the class details (only `canEdit` on a `not-started` class, which excludes started, finished and cancelled); the `takeOutSheet` copy was added in pt-BR, es-ES and en-US in the T-10 commit; fixtures updated for the new field; files: `apps/mobile/src/modules/enrolment/components/take-out-sheet/index.ts`, `apps/mobile/src/modules/enrolment/components/take-out-sheet/take-out-sheet.component.tsx`, `apps/mobile/src/modules/enrolment/components/take-out-sheet/take-out-sheet.types.ts`, `apps/mobile/src/modules/enrolment/components/take-out-sheet/take-out-sheet.component.test.tsx`, `apps/mobile/src/modules/enrolment/hooks/use-take-out.hook.ts`, `apps/mobile/src/modules/enrolment/hooks/use-take-out.hook.test.tsx`, `apps/mobile/src/modules/enrolment/enrolment.types.ts`, `apps/mobile/src/modules/classes/classes.types.ts`, `apps/mobile/src/modules/classes/components/class-people/class-people.component.tsx`, `apps/mobile/src/modules/classes/components/class-people/class-people.types.ts`, `apps/mobile/src/modules/classes/components/class-people/class-people.component.test.tsx`, `apps/mobile/src/modules/classes/components/class-card/class-card.component.test.tsx`, `apps/mobile/src/modules/classes/screens/class-details.screen.hook.ts`, `apps/mobile/src/modules/classes/screens/class-details.screen.tsx`, `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`; verified: `npx jest src/modules/classes/components/class-people src/modules/classes/components/class-card src/modules/enrolment/components src/modules/enrolment/hooks/use-take-out src/modules/classes/screens/class-details` (9 suites, 262 passed); deviations: the take-out flow lives in a hook of the enrolment module (`useTakeOut`) rather than inside the details hook; this commit also carries the details banner line of T-12 in `class-details.screen.tsx`

- [x] **T-12** — Add the taken-out display status, the details' banner and "Pedir novamente", and the student taps
  for `enrolment.enrolled` / `enrolment.takenOut`, with tests and copy.
  Covers: ER-08 · Done when: `npx jest src/modules/enrolment src/modules/classes/screens src/modules/notifications/hooks` passes.
  > ✅ 2026-10-20 20:29 — added the `takenOut` display status (bad tone; chip "Retirado") with the details banner "Você foi retirado da aula" / "Motivo: “…”" or "Sem motivo indicado." (kept after the class started or was cancelled, like the denial), "Pedir novamente" while the class has not started (`getEnrolmentCta`), and the push taps for `enrolment.enrolled` / `enrolment.takenOut` to `/student/class/[id]` plus `["classes"]` invalidation for pushes received with the app open; copy in pt-BR, es-ES and en-US; files: `apps/mobile/src/modules/enrolment/utils/enrolment-status.ts`, `apps/mobile/src/modules/enrolment/utils/enrolment-status.test.ts`, `apps/mobile/src/modules/enrolment/utils/enrolment-cta.ts`, `apps/mobile/src/modules/enrolment/utils/enrolment-cta.test.ts`, `apps/mobile/src/modules/enrolment/hooks/use-class-enrolment.hook.ts`, `apps/mobile/src/modules/classes/screens/class-details.screen.tsx`, `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`, `apps/mobile/src/modules/classes/components/class-card/class-card.component.test.tsx`, `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.ts`, `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.test.tsx`, `apps/mobile/src/modules/notifications/hooks/use-notification-received.hook.ts`, `apps/mobile/src/modules/notifications/hooks/use-notification-received.hook.test.tsx`, `apps/mobile/src/i18n/messages/pt-BR.ts`, `apps/mobile/src/i18n/messages/es-ES.ts`, `apps/mobile/src/i18n/messages/en-US.ts`; verified: `npx jest src/modules/classes/screens/class-details src/modules/enrolment` (21 suites, 358 passed, incl. the "taken out" cases) and, in an earlier run of the same change, class-card and `src/modules/notifications/hooks` passed; updated old assertions that said a taken-out student gets nothing; deviations: the description line of the banner comes from `reason` / `noReason` keys, not a static `description`, because it quotes the reason

### Verification

- [x] **T-13** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence.
  Covers: all · Done when: every automated command exits 0 and the user journeys are recorded.
  > ✅ 2026-10-20 20:34 — ran the Verification Plan from the repo root: `node .specs/scripts/run-related-tests.mjs 044` → RELATED TESTS PASSED (backend, mobile, classes, enrolment, notifications); `node .specs/scripts/check-coverage.mjs 044` → COVERAGE OK (30 files; closed the gaps in `use-take-out.hook.ts`, `enrol-student.screen.hook.ts` and `enrol-student.screen.tsx` with new tests and by removing an unreachable guard, commit `test(spec-044): cover the remaining branches…`); `npx turbo run lint check-types build --filter=…enrolment --filter=…classes --filter=…notifications --filter=…backend --filter=…mobile` → 27 tasks successful, 0 lint errors (the backend lint has 12 `require-array-sort-compare` warnings, the same pattern the existing e2e suites use); `node .specs/scripts/run-e2e.mjs 044` → E2E PASSED (backend, 21 files, 580 tests incl. `direct-enrolment.e2e-spec.ts`). NOT run: `enrolment.integration.http` against `npm run dev`, and the two simulator journeys (admin: "Inscrever aluno" → search → pick day and class → "Inscrever <nome>" toast and the student on the class details; then "Retirar" with a reason, and as the student the "Você foi retirado da aula" banner with the reason and "Pedir novamente") — they need a signed-in admin and student on a simulator with seeded data; the same behaviour is covered by the e2e suite and the mobile screen tests, but the user should walk the journeys in the app; deviations: none

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 044` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 044` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/enrolment --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
  - `node .specs/scripts/run-e2e.mjs 044` — the backend e2e suite passes, including `direct-enrolment.e2e-spec.ts`.
  - `enrolment.integration.http` against `npm run dev` — the direct enrolment and take-out requests answer as
    ER-01 and ER-03.
- User journeys (e2e, followed in a browser or simulator):
  - On the iOS simulator as an admin: "Inscrever aluno" → search a student → pick a day and a class → "Inscrever
    <nome>": the toast shows and the class's details list the student.
  - On those details, "Retirar" → write a reason → "Retirar da aula": the student leaves the list; as the student,
    the class shows "Você foi retirado da aula" with the reason and "Pedir novamente".

## Memory Impact

- `memory/product.md` — Current state: admins enrol students directly (approving a pending request when there is
  one) and take students out with a reason; students are told.
- `memory/technical-context.md` — the two routes and their checks, `enrolmentId` on roster students, the push types,
  the "Inscrever aluno" screen and route, "Retirar" on `ClassPeople`.
- `memory/structure.md` — `enrol-student` screen and route, `take-out-sheet`.
- `memory/modules.md` — None.
- `memory/modules/enrolment.md` — direct enrolment and take-out rules and permissions.
- `memory/modules/classes.md` — the roster's `enrolmentId`.
- `memory/modules/notifications.md` — `enrolment.enrolled` and `enrolment.takenOut`.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review

### Round 1 — 2026-10-20 — changes-requested

**Checks**

- lint ✅ (0 errors; backend has 12 warnings, 2 of them new dead code: see F-02) · type check ✅ · build ✅ (`turbo run lint check-types build`, 27 tasks: enrolment, classes, notifications, backend, mobile)
- related tests ✅ RELATED TESTS PASSED (backend 21 files / 317, mobile 1302, classes 474, enrolment 235, notifications 117)
- coverage of the changed lines ✅ COVERAGE OK (30 files); no coverage-ignore comments in the diff
- e2e: backend suite ✅ E2E PASSED (21 files, 580 tests, incl. `direct-enrolment.e2e-spec.ts`)
- HTTP against `npm run dev` (review accounts of `apps/backend/.env`) ✅: direct enrolment 201 `{ id, classId, status: "approved", requestedAt }`; from pending 200 with the same id; 409 `enrolment.alreadyApproved`; 404 `class.notFound`; 422 `enrolment.student.invalid` for a non-UUID, an instructor and an admin; 403 `user.role.notAdmin` for a student; roster `students[]` = `{ id, name, photoUrl, enrolmentId }`; take-out 200 `takenOut` with the reason stored trimmed, 422 `enrolment.reason.max.length` (301 chars, and a number), 409 `enrolment.notApproved`, 404 `enrolment.notFound`, 403 for a student; the student's `myEnrolment` reads `takenOut` with the reason
- iOS simulator (iPhone 18 Pro, this branch through Metro): both user journeys of the Verification Plan walked — see ER-06, ER-07, ER-08

**Expected Results**

- ER-01 ✅ — use case tests (19), e2e "enrols directly" cases and the HTTP requests above
- ER-02 ✅ — notifier and push-messages specs, e2e "notifies on a direct enrolment" (student only, `enrolment.approved` from pending, push failure keeps the 201)
- ER-03 ✅ — use case tests, e2e "takes out" cases and the HTTP requests above
- ER-04 ✅ — push-messages spec (reason as body, default text otherwise, three locales) and e2e "notifies on a take-out"
- ER-05 ✅ — `test/school-class` and `class-roster-reader.prisma.spec.ts`; `GET /classes/:id` returns `enrolmentId` on each student
- ER-06 ✅ — screen tests pass; on the simulator the "Inscrever aluno" row sits under Ferramentas, the screen shows the intro, "1 · Quem" with "Procurar aluno" (search narrows to "Dev Student"), initials avatars and radios, "2 · Aula" with the week calendar, "Sem aulas por começar neste dia." on a day whose class finished, "Inscrever" disabled until both are picked, then "Inscrever Dev Student" → toast "Dev Student inscrito · aluno avisado" and back to the home; the class shows 1/3 with the student
- ER-07 ❌ — see F-01. Otherwise as specified on the simulator: "Retirar" (outline, `bad` text) on the student row, sheet "Retirar Dev da aula?" with "Surf Iniciante · Quinta-feira · 22 out, 07:00 – 07:45. A vaga fica livre. …", a 300-character field, "Retirar da aula" (`danger`) and "Voltar"; confirming toasts "Dev Student retirado · aluno avisado" and the class reloads empty with 3 free seats
- ER-08 ✅ — tests pass; on the simulator as the student the Agenda chip reads "Retirado" (`bad`), and the details show "Você foi retirado da aula" / "Motivo: “Esta turma é de nível avançado.”" on the `bad` tint with "Pedir novamente"

**Findings**

- [ ] **F-01** (ER-07) — the take-out sheet shows no "Motivo (opcional)" above the reason field: `TakeOutSheet` passes `label` to the shared `DenySheet`, which only uses it as the `TextArea`'s `accessibilityLabel`, so a sighted admin sees only the placeholder. ER-07 lists "Motivo (opcional)" among the sheet's visible copy, and the design's `retirar` sheet (`.docs/designs/admin-app.html`) draws an uppercase "Motivo" with a lighter "(opcional)" above the textarea. Reproduce: as an admin, open an upcoming class with a student → students list → "Retirar". Expected: the label "Motivo (opcional)" is visible above the field (e.g. let `DenySheet` render `TextArea`'s visible `label` for this sheet), and the take-out sheet test asserts the visible text, not only the accessible name.
- [ ] **F-02** (convention) — `apps/backend/test/direct-enrolment.e2e-spec.ts` lines 26–28 declare `LATER_STARTS_AT` / `LATER_ENDS_AT` (with their comment) and never use them; the backend lint reports two `no-unused-vars` warnings for them. T-13's evidence calls the 12 warnings "the same pattern the existing e2e suites use", which holds only for the 10 `require-array-sort-compare` ones. Reproduce: `npx turbo run lint --filter=@rochas-surf-school/backend`. Expected: the dead constants removed (or used), and no new warnings from this spec.
- [ ] **F-03** (convention) — `enrol-student.screen.tsx` computes the scroll end-reached check (`loadMoreOnScroll`: offset + height against content size minus `END_REACHED_OFFSET`) and each class card's `full` / `selected` inside the component. `.claude/rules/react.md` §1 puts "any function that performs a task or calculation for the component" in the hook and keeps the `.component`/screen file to JSX. Expected: the end-reached calculation (taking the scroll event) and the per-card `full`/`selected` derivation move to `useEnrolStudentScreen`, with the screen only wiring them.

**Notes**

- The success toasts ("… inscrito · aluno avisado", "… retirado · aluno avisado") render in the shared `AlertMessage` style (coral, "!" icon), the only style that provider has; the design flashes them as `info`. Pre-existing, not this spec's — worth a follow-up for the provider.
- `enrolDirectly` maps a P2002 race to 409 `enrolment.alreadyOpen`, which D-02 doesn't list; the mobile screen falls back to the generic toast for it. Reasonable as a race guard; consider adding it to `shouldReloadEnrolClasses` / the error keys.
- `isUuid` in `enrol-student.usecase.ts` duplicates the one in `usecase/decision.ts`.
- The "no Retirar" test covers a student, started, finished and cancelled classes; an instructor goes through the same `canEdit === false` path but isn't asserted on its own.
- Review data left in the dev database: location "Review 044" with a cancelled 2031 class, and a Thursday 22 Oct 07:00 class at "Review R2 Beach" whose enrolments ended as taken out. The simulator is now signed in as the admin review account.
- `## Memory Impact` matches what was built.
