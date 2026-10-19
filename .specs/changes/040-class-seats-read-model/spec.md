---
id: "040"
slug: class-seats-read-model
title: "Class seats read model and class card and detail aligned with the designs"
status: in-progress
started: 2026-10-19
base_commit: c0875ed6bcd73ba150ecc6f9cde5cedc34d792c0
created: 2026-10-19
fronts: [classes, backend, mobile]
depends_on: []
---

# 040 — Class seats read model and class card and detail aligned with the designs

## Goal

Every class read carries the seats taken and the approved students, and the mobile class card and class-detail
screen show them as the designs ask: an occupancy bar, a students footer, the students of the class, the "full"
banner and the rules of the school. Enrolment does not exist yet, so the read model sits behind a stub that
answers 0 seats and no students; the later enrolment spec replaces the stub without changing the contract or
the screens. The card's visual alignment already made on `feat/class-ui-fixes` is committed as part of this
spec.

## Context

- Product: [product.md](../../memory/product.md) — concepts **Class**, **Seat** (an approved enrolment or a
  guest; **seats taken** counts both) and **Cancellation rule**.
- Requirements: [requirements.md → Seats](../../../.docs/requirements.md#seats) — everyone who can see a class
  sees its capacity and how many seats are taken;
  [requirements.md → Reading and accepting the rules](../../../.docs/requirements.md#reading-and-accepting-the-rules)
  — users read both cancellation rules at any time;
  [requirements.md → Class notes visibility](../../../.docs/requirements.md#class-notes-visibility) — notes stay
  shown to everyone.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Applications (mobile
  libraries, i18n, TanStack Query), Automated validation (Jest in `modules/*` and `apps/mobile`, Vitest in
  `apps/backend`).
- Module memory: [classes.md](../../memory/modules/classes.md) — seats taken are always 0 until enrolment exists;
  `SeatCounter` and `PendingRequestCounter` are the existing stubs.
- Designs: `.docs/designs/student-app.html` (`classCard`, `alunosRodape`, `detalheScreen`, `dComQuem`, `dRegras`),
  `.docs/designs/admin-app.html` (`aulaCard`, `aulaScreen`) and `.docs/designs/instructor-app.html`
  (`detalheScreen`). The three detail screens share the same builders; only the banners and actions differ.
- Existing code this builds on: `modules/classes/src/school-class/provider/class-view-reader.provider.ts` and
  `usecase/class-item.ts` (the class shape), `usecase/get-class.usecase.ts` and `list-week-classes.usecase.ts`,
  `apps/backend/src/modules/classes/no-enrolment.seat-counter.ts` (the stub style),
  `apps/mobile/src/modules/classes/components/class-card/` (card, with the visual alignment uncommitted on
  `feat/class-ui-fixes` together with the `cardMeta` token in `packages/design-tokens/src/tokens.ts` and
  `tokens.css`), `screens/class-details.screen.tsx` and `.hook.ts`, and
  `apps/mobile/src/modules/cancellation-rules/components/cancellation-rules-sheet/` (both rules, for every role).

## Scope

### In scope

- A new abstract contract `ClassRosterReader` in `modules/classes` that answers, for a list of class ids, the
  seats taken and the approved students (id, name, photo URL or null), plus its in-memory fake.
- `seatsTaken` and `students` on every class answered by `GET /classes` and `GET /classes/:id` (and on the
  answers of `POST`, `PUT` and cancel that return a class), from a stub that answers 0 and `[]`.
- Mobile card: occupancy bar with "N/M vagas", "Sem vagas" chip, students footer; the instructors line leaves
  the card. The visual alignment already in the working tree is committed first.
- Mobile detail: the "A aula" group (instructors, students row with its expandable list, "Máx. N alunos · X vagas
  livres"), the "Turma cheia" banner, the "Regras" group, and the instructors' read-only note.
- A `StudentAvatar` (photo, or initials on `sand`) and the strings in en-US, es-ES and pt-BR.

### Out of scope

- The enrolment flow and everything in [requirements.md → Class enrolment](../../../.docs/requirements.md#41-class-enrolment)
  beyond showing seats: requests, approval, denial, waiting list and its label, direct enrolment, guests, Trial
  rows, "inclui N trial", the "1ª vez" badge, "Retirar", request-status banners and their buttons, the hero card
  of the next approved class.
- Opening a person's sheet (WhatsApp) from an instructor or a student of the detail.
- The weather block ("Condições previstas" and "Condições nesse dia"): no requirement and no data source.
- The "A começar" state (requirements define only not started, started, finished and cancelled).
- The "AFTER CLASS" section of the detail: photos, rating and comments.
- The week-list sport filter (Todas, Surf, Skate), the Agenda B timeline variant and the month-view changes.
- Uploading profile photos (`photoUrl` stays null until a later spec).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | Scope is the seats read model only: contract and UI now, real enrolment later. The app shows 0 seats until the enrolment spec lands. | The user chose it; enrolment is a large separate feature. |
| D-02 | Everyone who can see a class (students, instructors, admins) sees the approved students of the class, by name and avatar. | The user decided it; [Seats](../../../.docs/requirements.md#seats) and the designs show it to all roles. |
| D-03 | The number shown is seats taken (students and guests). Avatars show students only. The label stays "alunos confirmados" ("1 aluno confirmado", "Ainda sem alunos" for 0). | The design shows it that way; guests appear as "Trial" rows only once enrolment exists. |
| D-04 | An account without a photo shows its initials on a `sand` circle. | The user decided it. `users.photo_url` exists but nothing fills it yet. |
| D-05 | A finished class reads "N alunos presentes" and hides the bar. A cancelled class has neither bar nor footer. | The design does so for finished (`passada`) and cancelled classes. |
| D-06 | The contract is a new abstract `ClassRosterReader.findRosters(classIds, studentsLimit?)` that answers, per class id, `{ seatsTaken, students }`. `SeatCounter` stays untouched for edit and delete. The stub is `NoEnrolmentClassRosterReader` in `apps/backend`. | One batched read serves a whole week without one query per class; the enrolment spec implements both abstractions. |
| D-07 | `GET /classes` returns at most 4 students per class (`CLASS_CARD_STUDENTS_LIMIT`); `GET /classes/:id` and the other answers that return one class return all of them. `seatsTaken` is always the full count. Students come in the order they were approved, then by user id. The provider's documentation states the order. | The card shows 4 avatars and "+N", so the week list stays small; the order must not change when the real implementation replaces the stub. |
| D-08 | The card's "+N" is `seatsTaken` minus the avatars shown. | It matches the design (`n - vis.length`) and includes guests in the count. |
| D-09 | The "Regras" group reuses the existing `CancellationRulesSheet` and the existing school-rules route of each role. The cancellation row's value is the existing "Cancel until {when}" line, or "Read the rule" when the class has no deadline. | The data and screens exist for every role; [requirements → Reading and accepting the rules](../../../.docs/requirements.md#reading-and-accepting-the-rules) asks that everybody can read them. |
| D-10 | The weather block is left out. | It has no requirement and no data source (the user asked to remove it for now). |
| D-11 | In the students list the viewer is not marked; only instructors get "You". | The design marks only instructors ("Eu"). |
| D-12 | The card's visual alignment of `feat/class-ui-fixes` (`class-card.component.*`, `cardMeta` in `tokens.ts` and `tokens.css`) is committed by this spec's first mobile task, on `spec/040-class-seats-read-model`. | The user asked to bring that change into this work; nothing else in the working tree belongs to it. |
| D-13 | Instructors keep their line only on the detail. The card keeps the staff flags ("Sem instrutor", "Sem prazo") for admins, as today. | The design card shows no instructors; the flags are existing admin tools. |

## Expected Results

### ER-01 — Class reads carry the seats and the students

- **Front:** backend
- **Behavior:** Given any class, when an approved user calls `GET /classes?date=` or `GET /classes/:id`, then
  every class in the answer has `seatsTaken: 0` and `students: []`.
- **Edge and error cases:** the answers of `POST /classes/batch` follow-ups, `PUT /classes/:id` and
  `POST /classes/:id/cancel` that return a class carry the same two fields; an unknown id still answers 404
  `class.notFound`; a user without approval is still refused.
- **Verify by:** `npx vitest run src/modules/classes/no-enrolment.class-roster.reader.spec.ts` and
  `npx vitest run src/modules/classes/classes.controller.spec.ts` (from `apps/backend`);
  `npm run test:e2e --workspace apps/backend` (the new cases in `test/classes.e2e-spec.ts`); the requests in
  `apps/backend/src/modules/classes/classes.integration.http`.

### ER-02 — The contract caps the list and keeps the full count

- **Front:** classes
- **Behavior:** Given a roster with 7 approved students, when the week is listed, then each class item has
  `seatsTaken: 7` and its first 4 students in order; when the class is read by id, then it has all 7.
- **Edge and error cases:** a class absent from the reader's answer has `seatsTaken: 0` and `students: []`;
  students keep the order the reader gave; the cap applies per class.
- **Verify by:** `npx jest test/school-class/usecase/get-class.usecase.test.ts test/school-class/usecase/list-week-classes.usecase.test.ts test/school-class/provider/fake-class-roster.reader.test.ts`
  (from `modules/classes`).

### ER-03 — The card keeps the visual alignment with AGENDA-01

- **Front:** mobile
- **Behavior:** Given a class, when the card renders, then it has the card shadow and `line` border, the
  location pill, the spacing, the opacity for finished and cancelled classes, and the `sun` shadow and border
  while in progress, using only design tokens including `cardMeta`.
- **Edge and error cases:** the dark theme uses the same classes and tokens.
- **Verify by:** `npx jest src/modules/classes/components/class-card` (from `apps/mobile`);
  `npm run check-types -w @rochas-surf-school/design-tokens` (the CSS is not stale).

### ER-04 — The card shows the occupancy bar

- **Front:** mobile
- **Behavior:** Given an upcoming or started class with capacity M and N seats taken, when the card renders,
  then it shows a 6px `sand` track with a fill of round(N/M × 100)% and the text "N/M vagas" (11px, 800, `ink-2`).
  The fill is `bad` when N ≥ M, `sun` when the percentage is above 80, and otherwise `lagoon` for surf or `tan`
  for skate.
- **Edge and error cases:** N = 0 shows an empty track and "0/M vagas"; a full class shows the text in `bad` and
  a "Sem vagas" `bad`-tint chip at the top right (in the same slot as the state chips, which win while in
  progress, finished or cancelled).
- **Verify by:** `npx jest src/modules/classes/components/class-card -t "occupancy"` and
  `npx jest src/modules/classes/utils/occupancy.test.ts` (from `apps/mobile`).

### ER-05 — The card footer shows the students

- **Front:** mobile
- **Behavior:** Given a class, when the card renders, then the footer (top border `line`, background `dim`) shows
  up to 4 stacked 26px avatars (overlap −8px, 2px `surface` border), then a "+N" circle on `sand` when seats taken
  exceed the avatars, and an uppercase label: "Ainda sem alunos" for 0, "1 aluno confirmado" for 1,
  "N alunos confirmados" otherwise, and "N alunos presentes" (singular "1 aluno presente") for a finished class.
- **Edge and error cases:** the footer no longer shows the instructors; with 0 seats there are no avatars; the
  strings exist in en-US, es-ES and pt-BR.
- **Verify by:** `npx jest src/modules/classes/components/class-card -t "students footer"` (from `apps/mobile`).

### ER-06 — Finished and cancelled cards

- **Front:** mobile
- **Behavior:** Given a finished class, when the card renders, then the occupancy bar is hidden and the footer
  reads "N alunos presentes"; given a cancelled class, then neither the bar nor the footer is shown.
- **Edge and error cases:** a class that is both past its end and cancelled counts as cancelled.
- **Verify by:** `npx jest src/modules/classes/components/class-card -t "finished"` and `-t "cancelled"` (from
  `apps/mobile`).

### ER-07 — The detail's "A aula" group

- **Front:** mobile
- **Behavior:** Given a class, when any role opens its detail, then one card shows the instructors block (their
  avatar and name; "You" for the viewer; "No instructor assigned" when there are none), and below it the students
  row with up to 5 avatars and the same label as the card footer; when there are students, tapping the row expands
  the list of all of them (avatar and name); under the card a line reads "Máx. N alunos · X vagas livres"
  ("1 vaga livre" for one) or "Máx. N alunos · esgotado".
- **Edge and error cases:** with 0 students the row reads "Ainda sem alunos" and does not expand; the "Máx." line is
  hidden for finished and cancelled classes; the line is in `bad` when full.
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "A aula"` (from `apps/mobile`).

### ER-08 — The "full class" banner

- **Front:** mobile
- **Behavior:** Given a class that has not started, is not cancelled and has seatsTaken ≥ capacity, when its
  detail opens, then a `bad`-tint banner reads "Turma cheia".
- **Edge and error cases:** no banner for a class with a free seat, nor for started, finished or cancelled classes;
  the cancelled and started banners keep priority.
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "full"` (from `apps/mobile`).

### ER-09 — Student avatars use the photo or the initials

- **Front:** mobile
- **Behavior:** Given a student with a photo URL, when the avatar renders, then it shows the image; given none,
  it shows the person's initials on a `sand` circle.
- **Edge and error cases:** a photo that fails to load falls back to the initials.
- **Verify by:** `npx jest src/modules/classes/components/student-avatar` (from `apps/mobile`).

### ER-10 — The "Regras" group

- **Front:** mobile
- **Behavior:** Given any role on a class detail, when the screen renders, then a "Regras" group shows a
  "Cancelamento · Surf" (or Skate) row whose value is the "Cancel until {when}" line, or "Read the rule" when the
  class has no deadline, opening the cancellation rules sheet; and a "Regras da escola" row opening that role's
  school-rules screen.
- **Edge and error cases:** the group is hidden for a cancelled class; the sheet is the existing one and works
  the same for student, instructor and admin.
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "rules"` (from `apps/mobile`).

### ER-11 — The instructors' read-only note

- **Front:** mobile
- **Behavior:** Given an instructor opening a class detail, when the screen renders, then a note reads
  "Enrolments, cancellations and schedule changes are made by the school" when they teach the class, and
  "You aren't assigned to this class — you see everything in read-only mode" when they do not.
- **Edge and error cases:** students and admins do not see the note.
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "read-only"` (from `apps/mobile`).

### ER-12 — Copy in the three languages and nothing else broken

- **Front:** mobile
- **Behavior:** Given the app in en-US, es-ES or pt-BR, when any new string is shown, then it is the translated
  text, and the existing tests, type check and lint of the touched workspaces still pass.
- **Edge and error cases:** no key exists in one locale only.
- **Verify by:** `npx jest src/i18n` and the lint and type-check commands of the Verification Plan.

## Tasks

### Classes module (`modules/classes`)

- [x] **T-01** — Add the `ClassRosterReader` contract with `ClassStudent` and `ClassRoster`
  (`src/school-class/provider/class-roster-reader.provider.ts`, exported from the provider barrel), with the order
  documented; add `CLASS_CARD_STUDENTS_LIMIT = 4`; add `seatsTaken` and `students` to `ClassItem`
  (`usecase/class-item.ts`); make `GetClass` and `ListWeekClasses` take the reader and fill the fields (all
  students for one class, the cap for the week); add `test/mock/fake-class-roster.reader.ts` and its test, and
  update the use case tests. Skills: [`module-use-case`](../../../.claude/skills/module-use-case),
  [`module-repository`](../../../.claude/skills/module-repository).
  Covers: ER-02 · Done when: `npx jest test/school-class` passes from `modules/classes` and `check-types` passes.
  > ✅ 2026-10-19 — added `ClassRosterReader` (`findRosters(classIds, studentsLimit?) → Map<id, ClassRoster>`, order documented), `ClassStudent`, `ClassRoster`, `CLASS_CARD_STUDENTS_LIMIT = 4`; `ClassItem` carries `seatsTaken`/`students`; `GetClass` (all students) and `ListWeekClasses` (cap 4, one batched read) take the reader; files: `modules/classes/src/school-class/provider/class-roster-reader.provider.ts`, `modules/classes/src/school-class/provider/index.ts`, `modules/classes/src/school-class/usecase/class-item.ts`, `modules/classes/src/school-class/usecase/get-class.usecase.ts`, `modules/classes/src/school-class/usecase/list-week-classes.usecase.ts`, `modules/classes/test/mock/fake-class-roster.reader.ts`, `modules/classes/test/mock/index.ts`, `modules/classes/test/school-class/provider/fake-class-roster.reader.test.ts`, `modules/classes/test/school-class/usecase/get-class.usecase.test.ts`, `modules/classes/test/school-class/usecase/list-week-classes.usecase.test.ts`; verified: `npx jest test/school-class` (340 passed, 21 suites), `npm run check-types` exit 0; deviations: none

### Backend (`apps/backend`)

- [x] **T-02** — Add `NoEnrolmentClassRosterReader` in `src/modules/classes/no-enrolment.class-roster.reader.ts`
  (answers 0 and `[]` for every id) with its spec, register it in `classes.module.ts`, and pass it to every
  `GetClass` and `ListWeekClasses` call in `classes.controller.ts`, including the ones after create, edit and cancel.
  Skills: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation),
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01 · Done when: `npx vitest run src/modules/classes` passes from `apps/backend`.
  > ✅ 2026-10-19 — added `NoEnrolmentClassRosterReader` (empty map, so every class reads 0 seats and no students), registered it in the module and injected it in the controller, which now passes it to every `GetClass` and `ListWeekClasses` call (week, one, post-edit, post-cancel); rebuilt `modules/classes` so the backend sees the new export (dist is gitignored); files: `apps/backend/src/modules/classes/no-enrolment.class-roster.reader.ts`, `apps/backend/src/modules/classes/no-enrolment.class-roster.reader.spec.ts`, `apps/backend/src/modules/classes/classes.module.ts`, `apps/backend/src/modules/classes/classes.controller.ts`, `apps/backend/src/modules/classes/classes.controller.spec.ts`; verified: `npx vitest run src/modules/classes` (16 files, 137 passed), `npm run check-types` in `apps/backend` (0 errors); deviations: none

- [x] **T-03** — Extend `classes.controller.spec.ts`, `test/classes.e2e-spec.ts` and `classes.integration.http`
  with `seatsTaken: 0` and `students: []` on the week, the detail and the post-edit and post-cancel answers.
  Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01 · Done when: `npm run test:e2e --workspace apps/backend` passes and the requests of
  `classes.integration.http` answer with the fields.
  > ✅ 2026-10-19 — controller spec: new test for week and one with a stored view, and `seatsTaken: 0`/`students: []` asserted on the post-edit and post-cancel answers; e2e: the exact-shape week assertion and the one-class, post-edit and post-cancel assertions now carry the two fields; `classes.integration.http` comments state the fields on the week, detail, edit and cancel requests; files: `apps/backend/src/modules/classes/classes.controller.spec.ts`, `apps/backend/test/classes.e2e-spec.ts`, `apps/backend/src/modules/classes/classes.integration.http`; verified: `npx vitest run src/modules/classes` (138 passed), `npm run test:e2e --workspace apps/backend` (17 files, 508 passed), `npm run check-types` (0 errors); deviations: the `.http` requests were not run by hand against `npm run dev` here — the e2e cases exercise the same endpoints; the live run is left to T-11

### Mobile (`apps/mobile`)

- [x] **T-04** — Commit the card's visual alignment already in the working tree (`class-card.component.tsx`,
  its test, and the `cardMeta` token in `packages/design-tokens/src/tokens.ts` and the regenerated `tokens.css`),
  adjusting the tests only where the commit needs it. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-03 · Done when: `npx jest src/modules/classes/components/class-card` passes and
  `npm run check-types -w @rochas-surf-school/design-tokens` passes.
  > ✅ 2026-10-19 — committed the card's visual alignment (shadow, `line` border, location pill with the `cardMeta` type, opacity .55 finished / .78 cancelled, `sun` border and primary shadow while in progress, finished chip icon) and the `cardMeta` token with its regenerated CSS; added a `look` test group (card shadow and border, in-progress border and shadow, cancelled opacity, location pill type) and the earlier opacity assertions; files: `apps/mobile/src/modules/classes/components/class-card/class-card.component.tsx`, `apps/mobile/src/modules/classes/components/class-card/class-card.component.test.tsx`, `packages/design-tokens/src/tokens.ts`, `packages/design-tokens/src/tokens.css`; verified: `npx jest src/modules/classes/components/class-card` (26 passed), `npm run check-types -w @rochas-surf-school/design-tokens` exit 0; deviations: none

- [x] **T-05** — Add `seatsTaken` and `students` (`ClassStudent`: id, name, `photoUrl`) to `ClassItem` in
  `src/modules/classes/classes.types.ts` and to the test factory in `classes.test-utils.tsx`; add the
  `StudentAvatar` component (`components/student-avatar/`, photo with initials fallback), the
  `utils/occupancy.ts` helpers (percentage, fill tone, "N/M" text, footer label, "+N") with their tests, and the
  strings in `src/i18n/messages/{en-US,es-ES,pt-BR}.ts`. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-09 · Done when: `npx jest src/modules/classes/components/student-avatar src/modules/classes/utils/occupancy.test.ts src/i18n`
  passes.
  > ✅ 2026-10-19 — `ClassItem` now has `seatsTaken` and `students` (`ClassStudent`); `StudentAvatar` (expo-image photo, initials on `sand` as fallback, also when the photo fails; optional `surface` ring); `utils/occupancy.ts` (percent, tone, full, free seats, hidden seats, students label) with tests; strings `classesWeek.occupancy`, `classesWeek.full` and `classesWeek.students.*` in en-US, es-ES and pt-BR; files: `apps/mobile/src/modules/classes/classes.types.ts`, `apps/mobile/src/modules/classes/classes.test-utils.tsx`, `apps/mobile/src/modules/classes/components/student-avatar/index.ts`, `apps/mobile/src/modules/classes/components/student-avatar/student-avatar.component.tsx`, `apps/mobile/src/modules/classes/components/student-avatar/student-avatar.types.ts`, `apps/mobile/src/modules/classes/components/student-avatar/student-avatar.component.test.tsx`, `apps/mobile/src/modules/classes/utils/occupancy.ts`, `apps/mobile/src/modules/classes/utils/occupancy.test.ts`, `apps/mobile/src/i18n/messages/en-US.ts`, `apps/mobile/src/i18n/messages/es-ES.ts`, `apps/mobile/src/i18n/messages/pt-BR.ts`, `apps/mobile/src/modules/classes/screens/classes-week.screen.test.tsx`, `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`, `apps/mobile/src/modules/classes/components/class-card/class-card.component.test.tsx`; verified: `npx jest src/modules/classes/components/student-avatar src/modules/classes/utils/occupancy.test.ts src/i18n` (26 passed), `npx tsc --noEmit` and `npx eslint src/modules/classes src/i18n` clean; deviations: `classes.test-utils.tsx` has no `ClassItem` factory (each test file builds its own), so the new fields went into those local factories and the shared file got a `buildClassStudent` helper instead; the "N/M" text is composed by the `classesWeek.occupancy` string, so there is no separate "N/M" helper

- [x] **T-06** — Update `ClassCard` (`components/class-card/`): the occupancy bar, the "Sem vagas" chip, the students
  footer with its avatars and labels, hidden or changed for finished and cancelled classes, and the instructors line
  removed; update the tests. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-04, ER-05, ER-06 · Done when: `npx jest src/modules/classes/components/class-card
  src/modules/classes/screens/classes-week.screen.test.tsx` passes.
  > ✅ 2026-10-19 — `ClassCard` shows the occupancy bar (6px `sand` track, fill by `getOccupancyTone`, "N/M spots" in `bad` when full), the "Full" chip while not started, and the students footer (up to 4 ringed avatars overlapping by 8, a "+N" circle, the uppercase label; "present" once finished); the bar is hidden for finished and cancelled classes and the footer for cancelled ones; the instructors line is gone and the admin flags stay; tests rewritten and extended (occupancy, students footer, finished, cancelled); files: `apps/mobile/src/modules/classes/components/class-card/class-card.component.tsx`, `apps/mobile/src/modules/classes/components/class-card/class-card.hook.ts`, `apps/mobile/src/modules/classes/components/class-card/class-card.types.ts`, `apps/mobile/src/modules/classes/components/class-card/class-card.component.test.tsx`, `apps/mobile/src/modules/classes/screens/classes-week.screen.test.tsx`, `packages/design-tokens/src/tokens.ts`, `packages/design-tokens/src/tokens.css`; verified: `npx jest src/modules/classes` (540 passed, includes the card and week screen), `npx tsc --noEmit` and `npx eslint src/modules/classes` clean, `npm run check-types -w @rochas-surf-school/design-tokens` exit 0; deviations: added the `occupancy` typography token (11px, 800, not uppercase) because no existing token had the "N/M" line's style, regenerated `tokens.css`

- [x] **T-07** — Restyle the "A aula" group of `class-details.screen.tsx` (new `components/class-people/`: the
  instructors block, the students row and the expandable list, the "Máx." line) and add the "Turma cheia" banner
  with its hook logic; update the screen tests. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-07, ER-08 · Done when: `npx jest src/modules/classes/screens/class-details.screen.test.tsx`
  passes.
  > ✅ 2026-10-19 — new `ClassPeople` ("The class" group: instructors with avatar and "You", students row with up to 5 avatars and "+N", expandable list of every student, "Max. N students · X spots left" / "sold out", hidden when finished or cancelled); the screen uses it in place of the old instructors block and capacity row, and shows the "Class full" banner for a not-started, uncancelled, full class; the instructors' `initials` field left the screen types (the avatar draws them); strings `classDetails.theClass`, `spotsLeft`, `soldOut` and `full.title` in the three locales; files: `apps/mobile/src/modules/classes/components/class-people/index.ts`, `apps/mobile/src/modules/classes/components/class-people/class-people.component.tsx`, `apps/mobile/src/modules/classes/components/class-people/class-people.hook.ts`, `apps/mobile/src/modules/classes/components/class-people/class-people.types.ts`, `apps/mobile/src/modules/classes/screens/class-details.screen.tsx`, `apps/mobile/src/modules/classes/screens/class-details.screen.hook.ts`, `apps/mobile/src/modules/classes/screens/class-details.screen.types.ts`, `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`, `apps/mobile/src/i18n/messages/en-US.ts`, `apps/mobile/src/i18n/messages/es-ES.ts`, `apps/mobile/src/i18n/messages/pt-BR.ts`; verified: `npx jest src/modules/classes/screens/class-details.screen.test.tsx` (87 passed), `npx tsc --noEmit` and `npx eslint src/modules/classes` clean; deviations: the "Class full" banner is a single line (title only) because ER-08 says it reads "Turma cheia"; the group is tested through the screen, with no separate component test file

- [x] **T-08** — Add the "Regras" group to the class detail: the cancellation row opening the existing
  `CancellationRulesSheet` and the school-rules row using the role's route; update the screen tests. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-10 · Done when: `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "rules"` passes.
  > ✅ 2026-10-19 — the detail shows a "Rules" group (reusing the profile card and row): "Cancellation · Surf/Skate" with the "Cancel until {when}" line or "Read the rule" as its value, opening the existing `CancellationRulesSheet`, and "School rules" opening the role's school-rules route; hidden for a cancelled class; strings `classDetails.rules.*` in the three locales; a `signInAs(role)` test helper; the old deadline tests now expect the line twice (under the date and in the row); files: `apps/mobile/src/modules/classes/screens/class-details.screen.tsx`, `apps/mobile/src/modules/classes/screens/class-details.screen.hook.ts`, `apps/mobile/src/modules/classes/screens/class-details.screen.types.ts`, `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`, `apps/mobile/src/modules/classes/classes.test-utils.tsx`, `apps/mobile/src/i18n/messages/en-US.ts`, `apps/mobile/src/i18n/messages/es-ES.ts`, `apps/mobile/src/i18n/messages/pt-BR.ts`; verified: `npx jest src/modules/classes/screens/class-details.screen.test.tsx` (94 passed, incl. `-t "rules"`), `npx tsc --noEmit` and `npx eslint src/modules/classes` clean; deviations: the existing "Cancel until" line under the date stays, so the text now shows twice on a class with a deadline (the spec doesn't ask to move it — worth a look in review)

- [x] **T-09** — Add the instructors' read-only note to the class detail (teaches the class, or not), with its
  strings in the three locales and tests. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-11 · Done when: `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "read-only"` passes.
  > ✅ 2026-10-19 — an instructor opening a class sees a note: the school makes the changes when they teach it, "you see everything in read-only mode" when they do not; students and admins get none; strings `classDetails.readOnly.*` in en-US, es-ES and pt-BR; files: `apps/mobile/src/modules/classes/screens/class-details.screen.tsx`, `apps/mobile/src/modules/classes/screens/class-details.screen.hook.ts`, `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`, `apps/mobile/src/i18n/messages/en-US.ts`, `apps/mobile/src/i18n/messages/es-ES.ts`, `apps/mobile/src/i18n/messages/pt-BR.ts`; verified: `npx jest src/modules/classes/screens/class-details.screen.test.tsx src/i18n` (105 passed, incl. `-t "read-only"`), `npx tsc --noEmit` and `npx eslint src/modules/classes src/i18n` clean; deviations: none

- [ ] **T-10** — Check the three locales have the same new keys and that nothing outside this spec changed in the
  card or the detail; fix any lint or type error in `apps/mobile`. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-12 · Done when: `npx jest src/i18n` passes and `npx turbo run lint check-types --filter=@rochas-surf-school/mobile`
  exits 0.

### Verification

- [ ] **T-11** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence.
  Covers: all · Done when: every automated command exits 0 and the manual checks are recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 040` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 040` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile --filter=@rochas-surf-school/design-tokens`
    — no errors.
  - `node .specs/scripts/run-e2e.mjs 040` — the backend e2e suite passes, including the new seats cases.
  - `classes.integration.http` against `npm run dev` — the week, the detail and the edit answers carry
    `seatsTaken: 0` and `students: []`.
- User journeys (e2e, followed in a browser or simulator):
  - On the iOS simulator as a student, open the week: every card shows an empty bar, "0/M vagas" and "Ainda sem
    alunos", and no instructors line; open a class: the "A aula" card shows the instructors and "Ainda sem alunos",
    the "Máx. N alunos · N vagas livres" line, and the "Regras" rows open the rules sheet and the school rules.
  - As an instructor, open a class they teach and one they do not: the read-only notes read as ER-11 says.
  - As an admin, open a finished class and a cancelled class: finished shows no bar and the footer "Ainda sem alunos"
    (no students exist yet), cancelled shows neither bar nor footer.

## Memory Impact

- `memory/product.md` — Current state: seats and the approved students are shown on cards and on the detail
  (always 0 until enrolment); out-of-v1 notes for weather, "A começar" and the person sheet.
- `memory/technical-context.md` — the classes read model: `seatsTaken` and `students` on every class answer, the
  cap of 4 on the week list, `StudentAvatar` and the occupancy helpers on mobile.
- `memory/structure.md` — `ClassRosterReader`, `NoEnrolmentClassRosterReader` and the new mobile components
  (`student-avatar`, `class-people`).
- `memory/modules.md` — None.
- `memory/modules/classes.md` — the seats read model contract (order, cap, stub) and the new card and detail rules.

## Assumptions

- The enrolment spec implements `ClassRosterReader` and `SeatCounter` together and keeps the order and cap of D-07.
- Instructors' avatars on the detail also show initials until photos can be uploaded.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
