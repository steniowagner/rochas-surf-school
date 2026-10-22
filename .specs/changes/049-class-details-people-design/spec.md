---
id: "049"
slug: class-details-people-design
title: 'Class details: "A aula", "Regras" and "Notas" as designed, with the person sheet'
status: in-review
created: 2026-10-21
started: 2026-10-21
base_commit: 9334b6d25a86ad9522b00762fc10708f7c11b3e0
fronts: [classes, backend, mobile]
depends_on: []
---

# 049 — Class details: "A aula", "Regras" and "Notas" as designed, with the person sheet

## Goal

On a class's details (every role), the "A aula", "Regras" and "Notas" sections look as they do in the student
design (`student-app.html`, "Detalhe da aula", variant 2c), and the admin's student rows as in `admin-app.html`.
Tapping an instructor or a student opens the same person sheet the directory uses, whose WhatsApp row follows
the existing visibility rule — so the class answer has to carry each person's number, filtered by who is
asking. The rest of the screen's logic (banners, enrolment actions, sheets, the class tools) doesn't change.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: class details (spec 030/040), trial guests
  (spec 045: "guests open no person sheet"), the people directory and its person sheet (spec 027), and the
  out-of-v1 list, which names "opening a person's sheet (WhatsApp) from an instructor or a student on the
  details" (spec 040) — this spec builds it (D-09).
- Requirements:
  [requirements.md → Contacting a user on WhatsApp](../../../.docs/requirements.md#contacting-a-user-on-whatsapp)
  — chats open in WhatsApp on the phone, admins reach anyone with a number, others only who shares it;
  [requirements.md → WhatsApp number visibility](../../../.docs/requirements.md#whatsapp-number-visibility) —
  hidden by default, admins always see it;
  [requirements.md → Class lists](../../../.docs/requirements.md#class-lists) — students by name, guests as
  "Trial", guest names for admins and the class's instructors;
  [requirements.md → Class notes visibility](../../../.docs/requirements.md#class-notes-visibility) — notes
  shown to everyone who sees the class;
  [requirements.md → Reading and accepting the rules](../../../.docs/requirements.md#reading-and-accepting-the-rules)
  — both cancellation rules readable at any time, also from a class's details.
- Designs: `.docs/designs/student-app.html` → `detalheScreen()` (`dComQuem`, `dAvatar`, `dRow`, `dGrupo`,
  `dRegras`, the "Notas" group) and `pessoaModal()`; `.docs/designs/admin-app.html` → the same `dComQuem` with
  the "Retirar" button on each row. The bundles are compressed: unpack the `__bundler/manifest` entries (base64,
  gzip when `compressed`) to read them.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Applications
  (`apps/mobile`, `apps/backend`), Automated validation, Coverage; [CLAUDE.md](../../../CLAUDE.md) → Design
  system and Rules for apps/mobile; `.claude/rules/react.md` (one folder per component, child components
  extracted).
- Existing code this builds on:
  - `modules/classes/src/school-class/usecase/get-class.usecase.ts` — answers `GET /classes/:id`, and the
    answers of `PUT /classes/:id` and `POST /classes/:id/cancel` (`apps/backend/src/modules/classes/classes.controller.ts`
    builds `GetClass` three times). It maps with `toClassItem` (`class-item.ts`), shared with the week list,
    "mine" and "mine/history", which spreads each roster student into the answer.
  - `modules/auth/src/user/usecase/list-people.usecase.ts` — the directory's visibility rule:
    `whatsappNumber && (whatsappVisible || viewer is admin)`.
  - `apps/backend/prisma/models/auth.model.prisma` — `User.role`, `User.status`, `whatsappNumber`,
    `whatsappVisible`.
  - `apps/mobile/src/modules/classes/components/class-people/` — the "A aula" card today: instructor rows
    (avatar + name, not tappable), the students row with stacked avatars and "+N", the expanded list (students,
    then guests with initials and a muted "Trial" chip) and the admin's "Retirar" buttons.
  - `apps/mobile/src/modules/classes/screens/class-details.screen.tsx` (+ `.hook.ts`) — the "Regras" group
    built from `ProfileCard`/`ProfileRow`, the notes as plain text under "Notas".
  - `apps/mobile/src/modules/people/components/person-sheet/` — the directory's sheet: initials, name, role
    chip, "Conversar por WhatsApp" with the number (opens `wa.me`) or disabled with "Número não
    compartilhado.", and "Fechar". Its `person` prop is the whole `Person` (with `createdAt`).
  - `apps/mobile/src/modules/school-rules/hooks/use-school-rules.hook.ts` — `GET /school-rules`, one shared
    cache entry.

## Scope

### In scope

- `whatsappNumber` on each student and instructor, and `role` on each instructor, in every `GetClass` answer.
- The "A aula" card: instructor pills, student rows that open the person sheet, trial guests as designed, the
  admin's "Retirar" next to the row tap.
- The "Regras" rows as designed, with the school-rules count.
- The "Notas" card.
- The strings in pt-BR, es-ES and en-US.
- "Onde e como" with the location's map and "Direções" (amendment of 2026-10-22).

### Out of scope

- ~~"Depois da aula" (ratings and photos) and "Onde e como" (map, directions, weather).~~ (changed by the
  amendment of 2026-10-22: "Onde e como" moved in scope, without its conditions row)
- "Depois da aula" (ratings and photos), and the "Condições previstas" row of "Onde e como" (weather and waves).
- The header block (chips, date, time range) and the status banners — the date/time order change is the user's
  own uncommitted work, committed before execution.
- The "1ª vez" badge (no data for it).
- "Sem penalização até N h antes" as the cancellation row's value (the rules are free text, no hours field).
- Opening a sheet or a WhatsApp chat for a guest, and showing guests' numbers.
- Profile photos (avatars stay initials until photos can be uploaded).
- Any change to the week list, "Minhas aulas" or their cards.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | A new domain provider, `ClassContactReader` (`findContacts(userIds)` → per user: `role`, `status`, `whatsappNumber`, `whatsappVisible`), is used by `GetClass` only. `ClassRosterReader`, `ClassViewReader` and `toClassItem` don't change. | `toClassItem` spreads roster students into the week list, "mine" and "mine/history": adding numbers to the roster would leak them there. A separate read keeps the numbers to the one answer that needs them. |
| D-02 | A person's `whatsappNumber` in the answer is their number when they are `approved`, have a number, and either share it (`whatsappVisible`) or the viewer is an admin; otherwise `null`. The viewer's own entry follows the same rule. | Same rule as the directory (`ListPeople`), so a number visible in one place is visible in the other; a hidden number never leaves the backend for a non-admin. Removed, deleted and erased accounts aren't in the directory either. |
| D-03 | The answer shape: `students[]` gain `whatsappNumber: string \| null`; `instructors[]` gain `role: "instructor" \| "admin"` and `whatsappNumber: string \| null`. Every `GetClass` answer has them (GET, PUT, POST cancel). | The mobile keeps one detail type and the cache stays complete after an edit or a cancellation. The instructor's role picks the sheet's chip ("Instrutor" / "Admin"); a student is always a student (only students hold seats). |
| D-04 | The mobile reuses `PersonSheet` from `modules/people`; its `person` prop narrows to `Pick<Person, "name" \| "role" \| "whatsappNumber">`. | One sheet for the directory and the class: same layout, same WhatsApp behavior and copy. The class answer has no `createdAt`. |
| D-05 | On an admin's view of a class that hasn't started, a student row opens the sheet and its "Retirar" button stays at the right, in place of the chevron; pressing "Retirar" opens the take-out sheet only, never the person sheet. | `admin-app.html` draws exactly that (the button stops the row's tap). |
| D-06 | Guests: a `sand` circle with a person icon (no initials) in the stacked avatars and in the list; in the list the name followed by the "Trial" chip when the viewer may see the name, and the "Trial" chip alone when the name is `null`; guest rows are not pressable and have no chevron. | The design's trial avatar and chip; names follow the existing "Class lists" rule; spec 045 recorded that guests open no person sheet (they have no account). |
| D-07 | ~~The cancellation row keeps its current value ("Cancelamento até …" with the deadline, or "Ler a regra"). The school-rules row shows "N regras para todos os alunos" (singular for one) from `useSchoolRules` once loaded with at least one rule; while loading, on error or with no rules, it shows its title only.~~ (removed: replaced by D-10, amendment 2026-10-22) | The design's "Sem penalização até 12 h antes" needs an hours value the free-text rules don't have; the count is one cached request the rules screen already makes. |
| D-08 | The stacked avatars show the first 5 seats (students, then guests) and keep "+N" for the seats beyond them. | "+N" is current behavior that tells how many more people there are; the design omits it only because its sample class is small. |
| D-09 | Opening a person's sheet with WhatsApp from a class's details extends "Contacting a user on WhatsApp", which names only the directory, and removes the item from the out-of-v1 list. | The user asked for it, and the design draws it; the visibility rule is the same one (D-02). |
| D-10 | The cancellation row is titled "Cancelamento" (no modality) and its value reads "Até <prazo>" with the deadline, or "Ler a regra" without one. The school-rules row shows "N regras para todos os alunos" (singular for one) from `useSchoolRules` once loaded with at least one rule; while loading, on error or with no rules, it shows its title only. | The user's amendment of 2026-10-22: the card already sits under "Regras" next to the class's own discipline chip, so the modality and the repeated "Cancelamento" are noise; the school-rules part is D-07's, unchanged. |
| D-11 | "Onde e como" is one card: the real fixed map (`react-native-maps`, as today) full-bleed at the top when the location has a point, then a row with a `lagoon` pin, the location's name and, under it, its address, and the "Direções" link at the right when there is a point. A location without a point shows the row alone, without the link. | The design's card (`dMapaLocal`); its sample data has no address, but the app has one and a location without a point would otherwise lose it; directions need a point, as today. |

## Expected Results

### ER-01 — The class answer carries each person's number, filtered by visibility

- **Front:** backend
- **Behavior:** Given a class with student S (shares her number), student T (doesn't share it) and instructor I
  (role `admin`, doesn't share it), when a student calls `GET /classes/:id`, then S's `whatsappNumber` is her
  number, T's and I's are `null`, and I's `role` is `"admin"`; when an admin calls it, T's and I's numbers are
  present too.
- **Edge and error cases:** a person without a number has `null` for every viewer; a person whose status isn't
  `approved` (removed, deleted, erased) has `null` even when they shared it; an instructor viewer sees the same as
  a student viewer; `PUT /classes/:id` and `POST /classes/:id/cancel` answer with the same fields and values;
  unknown id still answers 404, no token 401.
- **Verify by:** `npx jest test/school-class/usecase/get-class.usecase.test.ts` (from `modules/classes`) and
  `npx vitest run --config ./vitest.config.e2e.ts test/classes.e2e-spec.ts -t "contacts"` (from
  `apps/backend`).

### ER-02 — The list answers carry no numbers

- **Front:** backend
- **Behavior:** Given a class whose students and instructors share their numbers, when an admin calls
  `GET /classes`, `GET /classes/mine` (as one of its students) and `GET /classes/mine/history`, then no student
  or instructor in any answer has a `whatsappNumber` or `role` key.
- **Edge and error cases:** holds for admins too (who may see every number on the details).
- **Verify by:** `npx vitest run --config ./vitest.config.e2e.ts test/classes.e2e-spec.ts -t "contacts"` (from
  `apps/backend`), whose scenarios assert the absent keys.

### ER-03 — Instructor pills open the person sheet

- **Front:** mobile
- **Behavior:** Given a class's details, then "A aula" opens with a `dim` header holding "Instrutor" /
  "Instrutores" and one pill per instructor (rounded-full, `surface` background, `line` border, a 32pt avatar
  and the name); the viewer's own pill reads "Você" with a `lagoon` border. When the user taps a pill, then the
  person sheet opens with the instructor's name, the "Instrutor" or "Admin" chip and "Conversar por WhatsApp"
  with the formatted number, which opens WhatsApp.
- **Edge and error cases:** a `null` number shows the disabled row with "Número não compartilhado."; a class
  without instructors keeps "Sem instrutor atribuído" in the header; each pill is at least 44pt tall to touch
  and has the accessibility role `button` with the instructor's name.
- **Verify by:** `npx jest src/modules/classes/components/class-people src/modules/classes/screens/class-details.screen.test.tsx`
  (from `apps/mobile`); iOS simulator: open a class as a student, tap the instructor.

### ER-04 — Student and guest rows as designed

- **Front:** mobile
- **Behavior:** Given a class with students and guests, then the stacked avatars show the first 5 seats
  (students, then guests as a `sand` person icon) and "+N" for the rest. When the user expands the list, then
  each student row shows a 32pt avatar, the name and a chevron, and tapping it opens the person sheet with the
  "Aluno" chip and the WhatsApp row; each guest row shows the person-icon avatar and either the name followed by
  "Trial" (admins and the class's instructors) or "Trial" alone (everyone else), and tapping it does nothing.
- **Edge and error cases:** on an admin's view of a class that hasn't started, student and guest rows show
  "Retirar" instead of the chevron, and pressing it opens the take-out sheet without opening the person sheet;
  a guest whose name was erased shows "Trial" alone to admins too; a class with no seats taken shows "Ainda sem
  alunos", as today, and can't expand.
- **Verify by:** `npx jest src/modules/classes/components/class-people src/modules/classes/screens/class-details.screen.test.tsx`
  (from `apps/mobile`); iOS simulator: expand the list as a student and as an admin.

### ~~ER-05 — "Regras" rows as designed~~ (removed: replaced by ER-08, amendment 2026-10-22)

- **Front:** mobile
- **Behavior:** Given a class that isn't cancelled, then "Regras" is a card with two rows, each with a 34pt
  icon tile (`dim` background, `lagoon` icon), a small uppercase title, a bold value and a chevron: "Cancelamento
  · <modalidade>" with the current value, and "Regras da escola" with "N regras para todos os alunos" ("1 regra
  para todos os alunos" for one). Tapping them opens the cancellation-rules sheet and the role's school-rules
  screen, as today.
- **Edge and error cases:** while the school rules load, when the request fails, or with no rules, the second
  row shows its title only; a cancelled class shows no "Regras" (as today); es-ES and en-US have their own
  strings.
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx src/modules/classes/components/class-rule-row`
  (from `apps/mobile`); iOS simulator: open a class.

### ER-06 — "Notas" card

- **Front:** mobile
- **Behavior:** Given a class with notes, then under the "Notas" label a card (`surface`, `line` border,
  `rounded-card`) shows a `lagoon` note icon and the notes as written, line breaks kept.
- **Edge and error cases:** a class without notes shows no "Notas" label or card.
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx` (from `apps/mobile`);
  iOS simulator: open a class with notes.

### ER-07 — The capacity line heads "A aula"

- **Front:** mobile
- **Behavior:** Given a class that hasn't finished and isn't cancelled, then the capacity line ("Máx. N alunos ·
  N vagas livres" / "esgotado", plus "inclui N trial" for admins) sits at the right of the "A aula" label, on the
  same line, in the label's type style (`ds-text-section-label`, uppercase), `bad` when the class is full and `ink-2`
  otherwise; nothing is left under the card.
- **Edge and error cases:** a finished or cancelled class shows the "A aula" label alone (as today, no capacity
  line); a long line wraps at the right without pushing the label.
- **Verify by:** `npx jest src/modules/classes/components/class-people` (from `apps/mobile`); iOS simulator: open
  a class with free seats and a full one.

### ER-08 — "Regras" rows as amended

- **Front:** mobile
- **Behavior:** Given a class that isn't cancelled, then "Regras" is a card with two rows, each with a 34pt
  icon tile (`dim` background, `lagoon` icon), a small uppercase title, a bold value and a chevron: "Cancelamento"
  with "Até <prazo>" (e.g. "Até sex, 23 out · 00:00"), or "Ler a regra" when the class has no deadline, and
  "Regras da escola" with "N regras para todos os alunos" ("1 regra para todos os alunos" for one). Tapping them
  opens the cancellation-rules sheet and the role's school-rules screen, as before.
- **Edge and error cases:** while the school rules load, when the request fails, or with no rules, the second
  row shows its title only; a cancelled class shows no "Regras"; es-ES ("Cancelación", "Hasta …") and en-US
  ("Cancellation", "Until …") have their own strings.
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx src/modules/classes/components/class-rule-row`
  (from `apps/mobile`); iOS simulator: open a class.

### ER-09 — "Onde e como" card

- **Front:** mobile
- **Behavior:** Given a class whose location has a point, then under the "Onde e como" label a card (`surface`,
  `line` border, `rounded-card`) shows the fixed map with the marker across its top, then a row with a `lagoon`
  pin, the location's name (bold) and address, and "Direções" with an arrow at the right in `lagoon` uppercase;
  tapping "Direções" opens the phone's maps app at the point, as before.
- **Edge and error cases:** a location without a point shows the row with the name and address, no map and no
  "Direções"; a maps app that can't open shows "Não foi possível abrir o mapa." as before; es-ES ("Dónde y cómo")
  and en-US ("Where and how") have their own label; no "Condições previstas" row.
- **Verify by:** `npx jest src/modules/classes/components/class-location-card src/modules/classes/screens/class-details.screen.test.tsx`
  (from `apps/mobile`); iOS simulator: open a class whose location has a point.

## Tasks

### Classes module (`modules/classes`)

- [x] **T-01** — Add `ClassContactReader` in `src/school-class/provider/class-contact-reader.provider.ts`
  (exported from the provider index) and its fake in `test/mock/fake-class-contact.reader.ts`; make `GetClass`
  take it, read the contacts of the class's students and instructors in the same `Promise.all`, and add
  `whatsappNumber` (D-02) to each student and `role` + `whatsappNumber` to each instructor in `GetClassOut`
  (D-03), without touching `toClassItem` or `ClassItem`. Extend `test/school-class/usecase/get-class.usecase.test.ts`:
  shared, hidden for a student/instructor viewer, hidden for an admin viewer, no number, non-approved, a person
  missing from the contacts. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02 · Done when: `npm test` passes in `modules/classes` with every changed line covered.
  > ✅ 2026-10-21 — added the `ClassContactReader` port (`ClassContact`: id, role, status, whatsappNumber,
  > whatsappVisible; `findContacts(userIds)` → `Map`) and `FakeClassContactReader` (records its calls); `GetClass`
  > takes it as its 5th dependency, reads the contacts of the roster's students and the view's instructors in one
  > call, and maps `whatsappNumber` per student and `role` + `whatsappNumber` per instructor through
  > `visibleNumber` (D-02); `GetClassOut` now replaces `students`/`instructors` with `GetClassStudent` /
  > `GetClassInstructor` (D-03); `toClassItem`/`ClassItem` untouched. Tests: student and instructor viewers see
  > only shared numbers, an admin also the hidden ones, no number, a removed person, a person missing from the
  > contacts, an instructor with role `admin`, one contacts call; the existing constructions take the fake.
  > Files: `modules/classes/src/school-class/provider/class-contact-reader.provider.ts`,
  > `modules/classes/src/school-class/provider/index.ts`, `modules/classes/src/school-class/usecase/get-class.usecase.ts`,
  > `modules/classes/test/mock/fake-class-contact.reader.ts`, `modules/classes/test/mock/index.ts`,
  > `modules/classes/test/school-class/usecase/get-class.usecase.test.ts`; verified: `npm test` in `modules/classes`
  > (35 suites, 524 passed), `get-class.usecase.ts` at 100% statements/branches/functions/lines, `npm run
  > check-types` and `npm run lint` clean; the new tests failed before the change (7 failed). Deviations: the
  > student ids come from the roster, so the contacts read is chained after `findRosters` inside the same
  > `Promise.all` (parallel with the enrolment and pending-request reads) rather than a sibling entry of it.

### Backend (`apps/backend`)

- [x] **T-02** — Implement `PrismaClassContactReader` in `src/modules/classes/class-contact-reader.prisma.ts`
  (one `user.findMany` by ids selecting `id`, `role`, `status`, `whatsappNumber`, `whatsappVisible`; empty ids
  read nothing) with `class-contact-reader.prisma.spec.ts`, and register it in `classes.module.ts`. Skill:
  [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-01 · Done when: `npx vitest run src/modules/classes/class-contact-reader.prisma.spec.ts` passes.
  > ✅ 2026-10-21 — `PrismaClassContactReader` reads `id`, `role`, `status`, `whatsappNumber`, `whatsappVisible`
  > with one `user.findMany` by ids and answers a `Map` by id; no ids reads nothing; registered in
  > `ClassesModule`'s providers. Files: `apps/backend/src/modules/classes/class-contact-reader.prisma.ts`,
  > `apps/backend/src/modules/classes/class-contact-reader.prisma.spec.ts`,
  > `apps/backend/src/modules/classes/classes.module.ts`; verified: `npx vitest run
  > src/modules/classes/class-contact-reader.prisma.spec.ts` (2 passed). Deviations: rebuilt `modules/classes`
  > (`dist/`, ignored) so the backend sees the new export; the controller's type errors (4 of 5 `GetClass`
  > arguments) are fixed in T-03.

- [x] **T-03** — Pass the reader to the three `GetClass` constructions in
  `src/modules/classes/classes.controller.ts`, update `classes.controller.spec.ts`, and add a `contacts`
  describe to `test/classes.e2e-spec.ts` with the ER-01 and ER-02 scenarios (student, instructor and admin
  viewers; shared, hidden, no number, removed user; PUT and cancel answers; the three list endpoints without the
  keys). Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02 · Done when: `npm run test:e2e` passes in `apps/backend`, including the `contacts`
  scenarios.
  > ✅ 2026-10-21 — `ClassesController` injects `PrismaClassContactReader` and passes it to the three `GetClass`
  > constructions (GET, PUT, POST cancel); `classes.controller.spec.ts` gives `setup()` a contact reader and checks
  > that `one` carries a student's number and that edit and cancel read the contacts. New `contacts` describe in
  > `classes.e2e-spec.ts`: student and instructor viewers see only Sara's shared number and Iara (an admin
  > teaching it, hidden number) as `role: "admin"` with `null`; an admin also sees the hidden ones, never the
  > removed student's nor the guest's (guests stay `{ id, name }`); the PUT answer carries the same numbers and
  > the cancel answer the instructor's (cancelling closes the enrolments, so it has no students); the week,
  > "mine" and "mine/history" items have no `whatsappNumber`/`role` keys; 401 without a token, 404 for an unknown
  > id. Files: `apps/backend/src/modules/classes/classes.controller.ts`,
  > `apps/backend/src/modules/classes/classes.controller.spec.ts`, `apps/backend/test/classes.e2e-spec.ts`,
  > `apps/backend/test/direct-enrolment.e2e-spec.ts`, `apps/backend/test/enrolment-decisions.e2e-spec.ts`;
  > verified: `npm run test:e2e` (23 files, 627 passed, `contacts` 5 passed), `npm test` (76 files, 649 passed),
  > `tsc --noEmit` and `npm run lint` clean (no new warnings). Deviations: two existing e2e assertions that
  > compared the whole `students` of `GET /classes/:id` with `toEqual` now expect `whatsappNumber: null`; the
  > existing "answers one class" e2e compares the week item with the details minus the instructors' new fields.

### Mobile (`apps/mobile`)

- [x] **T-04** — Add the class details answer type in `src/modules/classes/classes.types.ts` (students with
  `whatsappNumber`, instructors with `role` and `whatsappNumber`) and use it in `hooks/use-class.hook.ts`,
  `use-edit-class.hook.ts` and `use-cancel-class.hook.ts` and the screen hook's `ClassDetailsInstructor`; narrow
  `PersonSheet`'s `person` prop (D-04) in `src/modules/people/components/person-sheet/person-sheet.types.ts`,
  updating test fixtures as needed.
  Covers: enabling · Done when: `npx turbo run check-types --filter=@rochas-surf-school/mobile` exits 0 and
  `npx jest src/modules/people src/modules/classes/hooks` passes.
  > ✅ 2026-10-21 — `classes.types.ts` gains `ClassDetailsTeacher` (instructor + `role` + `whatsappNumber`),
  > `ClassDetailsStudent` (student + `whatsappNumber`) and `ClassDetails` (`ClassItem` with those lists, so it still
  > fits where a `ClassItem` is expected); `useClass`, `useEditClass` and `useCancelClass` answer `ClassDetails`;
  > the screen's `ClassDetailsInstructor` is `ClassDetailsTeacher` + `isViewer`; `PersonSheet`'s `person` is
  > `Pick<Person, "name" | "role" | "whatsappNumber"> | null` (D-04). Files:
  > `apps/mobile/src/modules/classes/classes.types.ts`, `apps/mobile/src/modules/classes/hooks/use-class.hook.ts`,
  > `apps/mobile/src/modules/classes/hooks/use-edit-class.hook.ts`,
  > `apps/mobile/src/modules/classes/hooks/use-cancel-class.hook.ts`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.types.ts`,
  > `apps/mobile/src/modules/people/components/person-sheet/person-sheet.types.ts`,
  > `apps/mobile/src/modules/admin/screens/registrations.screen.tsx`; verified: `npx turbo run check-types
  > --filter=@rochas-surf-school/mobile` (5 tasks successful), `npx jest src/modules/people
  > src/modules/classes/hooks src/modules/admin/screens/registrations` (31 suites, 131 passed). Deviations: the
  > registrations screen built its sheet person as an object literal with `id` and `createdAt`, which the narrowed
  > prop rejects, so those two unused fields were dropped; no test fixture needed a change.

- [x] **T-05** — Rebuild the instructors part of `ClassPeople` (`src/modules/classes/components/class-people/`):
  the `dim` header with the label and the pills (ER-03), each pill a new component in its own folder
  (`components/instructor-pill/`, per `.claude/rules/react.md`), pressing it calling a new
  `onOpenInstructor(instructor)` prop; tests in `class-people.component.test.tsx` and the pill's own test.
  Covers: ER-03 · Done when: `npx jest src/modules/classes/components/class-people src/modules/classes/components/instructor-pill`
  passes.
  > ✅ 2026-10-21 — new `InstructorPill` (`components/instructor-pill/`: a `TouchableOpacity`, role `button`
  > labelled with the instructor's name, `min-h-11`, `rounded-full`, `bg-surface`, `border-line` or `border-lagoon`
  > for the viewer, a 32pt `StudentAvatar` and the name or "Você"); `ClassPeople`'s instructor block is now a `bg-dim`
  > header with "Instrutor"/"Instrutores" and the pills wrapped in a row, or "Sem instrutor atribuído" when there
  > is none; new optional `onOpenInstructor(instructor)` prop; `ClassPeopleInstructor` is now `ClassDetailsTeacher`
  > + `isViewer`. Tests: the pill (name, initials, "You" for the viewer with the name kept as label, press); the
  > card (singular/plural header, pills, "You", `onOpenInstructor` with the pressed instructor, no handler, no
  > instructor). Files: `apps/mobile/src/modules/classes/components/instructor-pill/index.ts`,
  > `apps/mobile/src/modules/classes/components/instructor-pill/instructor-pill.component.tsx`,
  > `apps/mobile/src/modules/classes/components/instructor-pill/instructor-pill.types.ts`,
  > `apps/mobile/src/modules/classes/components/instructor-pill/instructor-pill.component.test.tsx`,
  > `apps/mobile/src/modules/classes/components/class-people/class-people.component.tsx`,
  > `apps/mobile/src/modules/classes/components/class-people/class-people.types.ts`,
  > `apps/mobile/src/modules/classes/components/class-people/class-people.component.test.tsx`; verified: `npx jest
  > src/modules/classes/components/class-people src/modules/classes/components/instructor-pill` (15 passed), both
  > components at 100% coverage, `tsc --noEmit` clean. Deviations: the 44pt height can't be asserted in Jest
  > (NativeWind classes aren't turned into styles there), so it is checked on the simulator in T-10.

- [x] **T-06** — Rebuild the students part of `ClassPeople`: guests in the stacked avatars (D-08) as a `sand`
  person-icon avatar (a new `components/guest-avatar/`), student rows with a chevron calling a new
  `onOpenStudent(student)` prop, guest rows per D-06, and "Retirar" in place of the chevron without triggering
  the row (D-05); extract the rows into their own component folders as `.claude/rules/react.md` requires; tests
  for each case in ER-04.
  Covers: ER-04 · Done when: `npx jest src/modules/classes/components` passes.
  > ✅ 2026-10-22 — new `GuestAvatar` (`components/guest-avatar/`: Feather `user` on a `bg-sand` circle, labelled
  > "Trial", optional ring), `ClassStudentRow` (`components/class-student-row/`: a `Pressable` row with role `button`
  > named after the student, 32pt avatar, name, `chevron-forward` in `ink3`, or the "Retirar" `TouchableOpacity`
  > in its place, which takes out without pressing the row — D-05) and `ClassGuestRow`
  > (`components/class-guest-row/`: not pressable, `GuestAvatar`, the name then the "Trial" chip or the chip alone,
  > "Retirar" for admins — D-06); `ClassPeople` stacks the first 5 seats, students then guests (D-08), keeps "+N",
  > renders the rows, and takes a new optional `onOpenStudent(student)`; its students are `ClassDetailsStudent`;
  > stacked avatars are 30pt as in the design (were 28). Tests: each row and the avatar; on the card, the 5 stacked
  > seats with a guest and "+2", opening a student, no handler, take-out without opening, guests not pressable,
  > the guest list showing "Trial" twice (name + chip, chip alone), "No students yet" disabled. Files:
  > `apps/mobile/src/modules/classes/components/guest-avatar/index.ts`,
  > `apps/mobile/src/modules/classes/components/guest-avatar/guest-avatar.component.tsx`,
  > `apps/mobile/src/modules/classes/components/guest-avatar/guest-avatar.types.ts`,
  > `apps/mobile/src/modules/classes/components/guest-avatar/guest-avatar.component.test.tsx`,
  > `apps/mobile/src/modules/classes/components/class-student-row/index.ts`,
  > `apps/mobile/src/modules/classes/components/class-student-row/class-student-row.component.tsx`,
  > `apps/mobile/src/modules/classes/components/class-student-row/class-student-row.types.ts`,
  > `apps/mobile/src/modules/classes/components/class-student-row/class-student-row.component.test.tsx`,
  > `apps/mobile/src/modules/classes/components/class-guest-row/index.ts`,
  > `apps/mobile/src/modules/classes/components/class-guest-row/class-guest-row.component.tsx`,
  > `apps/mobile/src/modules/classes/components/class-guest-row/class-guest-row.types.ts`,
  > `apps/mobile/src/modules/classes/components/class-guest-row/class-guest-row.component.test.tsx`,
  > `apps/mobile/src/modules/classes/components/class-people/class-people.component.tsx`,
  > `apps/mobile/src/modules/classes/components/class-people/class-people.hook.ts`,
  > `apps/mobile/src/modules/classes/components/class-people/class-people.types.ts`,
  > `apps/mobile/src/modules/classes/components/class-people/class-people.component.test.tsx`; verified: `npx jest
  > src/modules/classes/components src/modules/classes/screens/class-details.screen.test.tsx` (27 suites, 433
  > passed), the new and changed lines covered (the only uncovered branches are the untouched capacity line's),
  > `tsc --noEmit` clean. Deviations: the "Retirar" button keeps its current look (44pt, `border-line`) rather than
  > the design's 32pt one with an icon, to keep the touch target. Not part of this task: the class card test that
  > your style commit broke was fixed in its own `test(mobile)` commit.

- [x] **T-07** — In `src/modules/classes/screens/class-details.screen.tsx` and `.hook.ts`, keep the selected
  person (kept while the sheet slides away, like the directory) and render `PersonSheet`: an instructor opens
  with their `role`, a student with `"student"`; tests in `class-details.screen.test.tsx` for opening from an
  instructor and from a student, a shared and a hidden number, and closing.
  Covers: ER-03, ER-04 · Done when: `npx jest src/modules/classes/screens/class-details.screen.test.tsx` passes.
  > ✅ 2026-10-22 — the screen hook keeps `selectedPerson` (`ClassDetailsPerson` = `Pick<Person, "name" | "role" |
  > "whatsappNumber">`, kept after closing so the content stays while the sheet slides away) and `personVisible`, and
  > exposes `openInstructor` (with the instructor's `role`), `openStudent` (role `"student"`) and `closePerson`; the
  > screen passes them to `ClassPeople` and renders the directory's `PersonSheet`. The test fixture `makeClass` is
  > now a `ClassDetails` (instructors with `role` and `whatsappNumber`, students with `whatsappNumber`). New tests:
  > an admin instructor's sheet with the "Admin" chip and the formatted shared number that opens `wa.me`; the
  > viewer's own pill as "Instructor" with "Number not shared."; a student's sheet with the "Student" chip for a
  > shared and a hidden number, and closing. Files:
  > `apps/mobile/src/modules/classes/screens/class-details.screen.tsx`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.hook.ts`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.types.ts`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`; verified: `npx jest
  > src/modules/classes/screens/class-details.screen.test.tsx` (209 passed), screen and hook at 100% coverage,
  > `tsc --noEmit` clean. Deviations: before this task, the 9 screen tests that your style commit `9334b6d2` broke
  > (header title, chip icons, deadline line) were updated in their own `test(mobile)` commit, as agreed with you.

- [x] **T-08** — Replace the "Regras" `ProfileCard` on the screen with a card of a new
  `src/modules/classes/components/class-rule-row/` (icon tile, uppercase title, bold value, chevron, at least
  44pt, accessibility role `button`); read the rule count with `useSchoolRules` in the screen hook (D-07); add
  `classDetails.rules.schoolCount_one` / `_other` to `src/i18n/messages/{pt-BR,es-ES,en-US}.ts` ("{{count}}
  regra(s) para todos os alunos", "{{count}} regla(s) para todos los alumnos", "{{count}} rule(s) for every
  student"); tests for the row and for the loaded, loading, failed and empty counts on the screen.
  Covers: ER-08 · Done when: `npx jest src/modules/classes/components/class-rule-row src/modules/classes/screens/class-details.screen.test.tsx`
  passes.
  > ✅ 2026-10-22 — new `ClassRuleRow` (`components/class-rule-row/`: a `Pressable` with role `button` labelled by
  > its title, `min-h-11`, a 34pt `bg-dim` tile with a `lagoon` Ionicon, the title in `ds-text-section-label`, the
  > value in `ds-text-list-title` when given, a `chevron-forward` in `ink3`); the screen's "Regras" is now a
  > `rounded-card` `bg-surface` card with a line between "Cancelamento · <modalidade>" (`calendar-outline`, the
  > current deadline or "Ler a regra") and "Regras da escola" (`shield-outline`); the screen hook reads
  > `useSchoolRules` and gives `schoolRulesValue`, the `classDetails.rules.schoolCount` plural, or `null` while
  > loading, on error or with no rules (D-07); the strings are in pt-BR, es-ES and en-US. Tests: the row (value and
  > title only); on the screen, 3 and 1 rules, loading, failed and empty showing the title only, pt-BR and es-ES
  > strings, the icons; the existing taps (cancellation sheet, each role's school rules) still pass. Files:
  > `apps/mobile/src/modules/classes/components/class-rule-row/index.ts`,
  > `apps/mobile/src/modules/classes/components/class-rule-row/class-rule-row.component.tsx`,
  > `apps/mobile/src/modules/classes/components/class-rule-row/class-rule-row.types.ts`,
  > `apps/mobile/src/modules/classes/components/class-rule-row/class-rule-row.component.test.tsx`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.tsx`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.hook.ts`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`, `apps/mobile/src/i18n/messages/pt-BR.ts`,
  > `apps/mobile/src/i18n/messages/es-ES.ts`, `apps/mobile/src/i18n/messages/en-US.ts`,
  > `apps/mobile/src/modules/student/student-tabs.navigation.test.tsx`,
  > `apps/mobile/src/modules/instructor/instructor-tabs.navigation.test.tsx`,
  > `apps/mobile/src/modules/admin/admin-tabs.navigation.test.tsx`; verified: `npx jest
  > src/modules/classes/components/class-rule-row src/modules/classes/screens/class-details.screen.test.tsx` (219
  > passed; row, screen and hook at 100%), `npx jest src/modules/student src/modules/instructor src/modules/admin
  > src/modules/enrolment` (339 passed), `tsc --noEmit` clean. Deviations: the screen test mocks `useSchoolRules`
  > (one shared query) to drive its states; the three role navigation tests, which open a class and answered every
  > other URL with a people page, now answer `/school-rules` with an empty rule list (they crashed reading
  > `rules.length`); the tile uses `rounded-checkbox` (8px), the closest radius token to the design's 11px, rather
  > than adding a token; the cancellation icon is `calendar-outline` (Ionicons has no `calendar-x`, and
  > `calendar-clear-outline` is the no-deadline banner's).

- [x] **T-09** — Render "Notas" as the card of ER-06 on the screen (Ionicons `reader-outline` in `lagoon`, the
  notes in `ds-text-body`), with screen tests for a class with and without notes.
  Covers: ER-06 · Done when: `npx jest src/modules/classes/screens/class-details.screen.test.tsx` passes.
  > ✅ 2026-10-22 — under the "Notas" label, the notes sit in a `rounded-card` `border-line` `bg-surface` card with
  > an Ionicons `reader-outline` in `lagoon` and the text in `ds-text-body`, as written (a `Text` keeps the line
  > breaks); a class without notes has neither. Tests: notes with a line break shown as written with the icon; no
  > label and no icon without notes. Files: `apps/mobile/src/modules/classes/screens/class-details.screen.tsx`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`; verified: `npx jest
  > src/modules/classes/screens/class-details.screen.test.tsx` (218 passed, screen at 100%), `tsc --noEmit` clean.
  > Deviations: none.

- [x] **T-11** — Move the capacity line of `ClassPeople` (`src/modules/classes/components/class-people/`) from under
  the card to the right of the "A aula" label, in `ds-text-section-label` with the same `text-bad` / `text-ink-2`
  logic (ER-07); update its tests. (added during execution, amendment 2026-10-22)
  Covers: ER-07 · Done when: `npx jest src/modules/classes/components/class-people src/modules/classes/screens/class-details.screen.test.tsx` passes.
  > ✅ 2026-10-22 — `ClassPeople` opens with a `flex-row justify-between` header: the "A aula" label at the left and
  > the capacity line at the right (`ds-text-section-label`, `shrink text-right`, `text-bad` when full and
  > `text-ink-2` otherwise, same text as before, still hidden on a finished or cancelled class); nothing is left
  > under the card. Tests: the line (free seats and sold out) is in the label's row and the card isn't (both failed
  > before the move); a finished class shows the label alone. Files:
  > `apps/mobile/src/modules/classes/components/class-people/class-people.component.tsx`,
  > `apps/mobile/src/modules/classes/components/class-people/class-people.component.test.tsx`; verified: `npx jest
  > src/modules/classes/components/class-people src/modules/classes/screens/class-details.screen.test.tsx` (239
  > passed, the component at 100%), `tsc --noEmit` clean. Deviations: none.

- [x] **T-12** — Title the cancellation row "Cancelamento" without the modality and read its value as "Até <prazo>"
  (D-10, ER-08): change `classDetails.rules.cancellation` and add `classDetails.rules.until` in
  `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`, drop `classDetails.cancellationDeadline` if nothing else uses it, and
  update the screen and its tests. (added during execution, amendment 2026-10-22)
  Covers: ER-08 · Done when: `npx jest src/modules/classes/screens/class-details.screen.test.tsx src/modules/classes/components/class-rule-row` passes.
  > ✅ 2026-10-22 — `classDetails.rules.cancellation` is now "Cancelamento" / "Cancelación" / "Cancellation" (no
  > `discipline` parameter) and the new `classDetails.rules.until` reads "Até {{when}}" / "Hasta {{when}}" / "Until
  > {{when}}"; the screen uses them for the cancellation row ("Ler a regra" without a deadline, unchanged);
  > `classDetails.cancellationDeadline` had no other user and was removed from the three locales (the request
  > sheet's "Cancel until …" is its own key). Tests: the title without the modality for surf and skate, the "Until
  > …" value, the deadline tests, the request-sheet test (the sheet keeps "Cancel until …", the row reads "Until
  > …"), the pt-BR and es-ES titles and values, and the taps by the new button name. Files:
  > `apps/mobile/src/i18n/messages/pt-BR.ts`, `apps/mobile/src/i18n/messages/es-ES.ts`,
  > `apps/mobile/src/i18n/messages/en-US.ts`, `apps/mobile/src/modules/classes/screens/class-details.screen.tsx`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`; verified: `npx jest
  > src/modules/classes/screens/class-details.screen.test.tsx src/modules/classes/components/class-rule-row
  > src/modules/student src/modules/instructor src/modules/admin` (300 passed), the screen at 100%, `tsc --noEmit`
  > clean. Deviations: none.

- [x] **T-14** — Build `ClassLocationCard` (`src/modules/classes/components/class-location-card/`, D-11, ER-09): the
  card with `LocationMapPreview` at the top (now the map alone, full-bleed, without its border and button) and the
  row with the pin, name, address and the "Direções" link, which takes over the directions hook and its tests;
  render it on the screen under `classDetails.location` renamed to "Onde e como" / "Dónde y cómo" / "Where and how"
  in `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`; update the screen tests. (added during execution, amendment
  2026-10-22)
  Covers: ER-09 · Done when: `npx jest src/modules/classes/components/class-location-card src/modules/classes/components/location-map-preview src/modules/classes/screens/class-details.screen.test.tsx` passes.
  > ✅ 2026-10-22 — new `ClassLocationCard` (`components/class-location-card/`: a `rounded-card` `border-line`
  > `bg-surface` card with `overflow-hidden`; `LocationMapPreview` across the top when there is a point; a row with a
  > Feather `map-pin` in `lagoon`, the name in `ds-text-list-title` and the address in `ds-text-list-subtitle`, and,
  > with a point, a `TouchableOpacity` "Direções" in `ds-text-section-label` `text-lagoon` with a Feather
  > `arrow-up-right`, at least 44pt tall); its hook holds `openDirections(point)` (moved from `LocationMapPreview`,
  > same URL and same error toast); `LocationMapPreview` is now the map alone (`h-24`, no border, radius or
  > button; its hook file was removed); the screen renders the card under `classDetails.location`, now "Onde e
  > como" / "Dónde y cómo" / "Where and how". Tests: the card (map, name, address, Directions; no point; iOS and
  > Android URLs; the failure toast), the map preview, the screen (new label in en-US, pt-BR and es-ES, the
  > existing map and no-point cases). Files:
  > `apps/mobile/src/modules/classes/components/class-location-card/index.ts`,
  > `apps/mobile/src/modules/classes/components/class-location-card/class-location-card.component.tsx`,
  > `apps/mobile/src/modules/classes/components/class-location-card/class-location-card.hook.ts`,
  > `apps/mobile/src/modules/classes/components/class-location-card/class-location-card.types.ts`,
  > `apps/mobile/src/modules/classes/components/class-location-card/class-location-card.component.test.tsx`,
  > `apps/mobile/src/modules/classes/components/location-map-preview/location-map-preview.component.tsx`,
  > `apps/mobile/src/modules/classes/components/location-map-preview/location-map-preview.types.ts`,
  > `apps/mobile/src/modules/classes/components/location-map-preview/location-map-preview.component.test.tsx`,
  > `apps/mobile/src/modules/classes/components/location-map-preview/location-map-preview.hook.ts` (deleted),
  > `apps/mobile/src/modules/classes/screens/class-details.screen.tsx`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`, `apps/mobile/src/i18n/messages/pt-BR.ts`,
  > `apps/mobile/src/i18n/messages/es-ES.ts`, `apps/mobile/src/i18n/messages/en-US.ts`; verified: `npx jest
  > src/modules/classes/components/class-location-card src/modules/classes/components/location-map-preview
  > src/modules/classes/screens/class-details.screen.test.tsx` (225 passed, the card, its hook, the map preview and
  > the screen at 100%), `tsc --noEmit` clean. Deviations: none.

### Verification

- [x] **T-10** — Run every command in the Verification Plan from the repo root; all pass. Follow the user
  journeys on the iOS simulator and record what was seen. Record the output summary as evidence.
  Covers: all · Done when: every automated command exits 0 and the journeys are recorded.
  > ✅ 2026-10-22 — automated, from the repo root: `node .specs/scripts/run-related-tests.mjs 049` → RELATED TESTS
  > PASSED (apps/backend, apps/mobile 75 suites / 1174 tests, modules/classes 524, modules/enrolment 291);
  > `node .specs/scripts/check-coverage.mjs 049` → COVERAGE OK (every changed line covered in 18 files);
  > `node .specs/scripts/run-e2e.mjs 049` → E2E PASSED (apps/backend, 23 files, 627 tests, `contacts` included);
  > `npx turbo run lint check-types build --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend
  > --filter=@rochas-surf-school/mobile` → 27 tasks successful, 0 errors (the backend's 10 lint warnings are the
  > existing ones in untouched e2e lines). iOS simulator (iPhone 18 Pro, iOS 27, the dev backend and Metro already
  > running, signed in as the student Ana Silva, pt-BR, light theme), on a surf class with Dev Admin teaching,
  > Ana as its one student and notes: "A aula" opens with the `dim` "INSTRUTOR" header and the Dev Admin pill;
  > tapping it opened the sheet with "ADMIN" and "Conversar por WhatsApp · Número não compartilhado." (his number
  > is hidden); "Fechar" closed it; the list expanded to Ana's row (avatar, name, chevron), and tapping it opened the
  > sheet with "ALUNO" and her number with the chat arrow; "Regras" showed the two rows with icon tiles, the
  > uppercase titles, "Cancelamento até sex, 23 out · 00:00" and the chevrons, and "Regras da escola" with its title
  > only, which is right for this database (it has 0 rules, D-07); "Notas" showed the card with the note icon.
  > Not driven, for you to check on the simulator: (1) as an admin, on a class that hasn't started and has a
  > trial guest and a student whose number is hidden, expand the list: the guest shows the person icon, the name
  > and "Trial", and does nothing when tapped; "Retirar" sits where the chevron was and opens only the take-out
  > sheet; tapping the student opens the sheet with the hidden number visible; (2) as an instructor of a class,
  > your pill reads "Você" with a `lagoon` border; (3) on a database with school rules, the second row reads "N
  > regras para todos os alunos"; (4) the dark theme (the app's own theme setting kept it light when the
  > simulator was switched to dark, and I left your settings alone). Deviations: none.

- [x] **T-13** — Rerun every command in the Verification Plan from the repo root after T-11 and T-12; all pass.
  Check ER-07 and ER-08 on the iOS simulator and record what was seen. (added during execution, amendment
  2026-10-22)
  Covers: ER-07, ER-08 · Done when: every automated command exits 0 and the journeys are recorded.
  > ✅ 2026-10-22 — automated, from the repo root: `node .specs/scripts/run-related-tests.mjs 049` → RELATED TESTS
  > PASSED (apps/backend, apps/mobile, modules/classes, modules/enrolment); `node .specs/scripts/check-coverage.mjs
  > 049` → COVERAGE OK (18 files); `node .specs/scripts/run-e2e.mjs 049` → E2E PASSED (627 tests); `npx turbo run
  > lint check-types build --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend
  > --filter=@rochas-surf-school/mobile` → 27 tasks successful. iOS simulator (same student session and class as
  > T-10): "A AULA" at the left and "MÁX. 1 ALUNO · ESGOTADO" at the right of the same line, uppercase in the label's
  > style and red since the class is full, nothing under the card; "Regras" reads "CANCELAMENTO" over "Até sex, 23
  > out · 00:00". Not driven on the simulator: a class with free seats (the line in `ink-2`), covered by the
  > component tests. Deviations: none.

- [x] **T-15** — Rerun every command in the Verification Plan from the repo root after T-14; all pass. Check ER-09
  on the iOS simulator and record what was seen. (added during execution, amendment 2026-10-22)
  Covers: ER-09 · Done when: every automated command exits 0 and the journey is recorded.
  > ✅ 2026-10-22 — automated, from the repo root: `node .specs/scripts/run-related-tests.mjs 049` → RELATED TESTS
  > PASSED (apps/backend, apps/mobile 49 changed files, modules/classes, modules/enrolment); `node
  > .specs/scripts/check-coverage.mjs 049` → COVERAGE OK (21 files); `node .specs/scripts/run-e2e.mjs 049` → E2E
  > PASSED (627 tests); `npx turbo run lint check-types build --filter=@rochas-surf-school/classes
  > --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile` → 27 tasks successful. iOS simulator
  > (same student session and class): "ONDE E COMO" over one card with the map and its marker across the top, then
  > the pin, "Review R2 Beach" with its address under it, and "DIREÇÕES ↗" in `lagoon` at the right; no
  > "Condições previstas". Not driven on the simulator: tapping "Direções" (it leaves the app for Apple Maps;
  > the URLs and the failure toast are covered by the card's tests) and a location without a point. Deviations:
  > none.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 049` — the tests this spec adds or changes, and the existing
    tests related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 049` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 049` — the backend e2e suite passes, including the `contacts` scenarios
    of ER-01 and ER-02.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
- User journeys (iOS simulator, seeded data with a class that has a student who shares their number, one who
  doesn't, a guest and notes):
  - ER-03 / ER-04 as a student: the pills and "Você" (as an instructor of the class), tapping the instructor and
    each student opens the sheet with the right chip and WhatsApp row; the guest shows "Trial" and does nothing.
  - ER-04 as an admin on a class that hasn't started: the guest's name with "Trial", "Retirar" in place of the
    chevron opens only the take-out sheet, the row opens the person sheet with the hidden number visible.
  - ER-05 / ER-06: the "Regras" rows with the rule count, both taps open what they did before; the "Notas" card;
    a class without notes has no "Notas"; light and dark themes both read correctly.

## Memory Impact

- `memory/product.md` — class details: the "A aula" card with instructor pills, student rows and the person
  sheet (WhatsApp by the directory's rule), guests' person-icon avatar and "Trial" chip, the "Regras" rows with
  the school-rules count, the "Notas" card; remove "opening a person's sheet (WhatsApp) from an instructor or a
  student on the details" from the out-of-v1 list (D-09).
- `memory/modules/classes.md` — `GetClass` answers carry `whatsappNumber` per student and `role` +
  `whatsappNumber` per instructor through `ClassContactReader`, filtered by D-02; the list answers don't.
- `memory/technical-context.md` — the classes read model: `ClassContactReader` / `PrismaClassContactReader`, only
  in `GetClass`; `PersonSheet` is shared with the classes module.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

- 2026-10-22 — requested by the user after execution, approved by them in chat; the spec went back from
  `in-review` to `in-progress`.
  - "A aula": the capacity line moves from under the card to the right of the "A aula" label, in the label's type
    style, keeping its colors (new ER-07, task T-11). Before: a `ds-text-list-subtitle` line under the card.
  - "Regras", cancellation row: title "Cancelamento · <modalidade>" → "Cancelamento"; value "Cancelamento até
    <prazo>" → "Até <prazo>" (D-07 → D-10, ER-05 → ER-08, task T-12). Reason: the user's design call.
  - T-13 reruns the Verification Plan for the amended work.
  - T-08's `Covers` points at ER-08 instead of the removed ER-05: it built the rows, the tiles and the
    school-rules count that ER-08 keeps; T-12 changes only the cancellation row's title and value.
- 2026-10-22 (second) — requested by the user, approved by them in chat; the spec went back from `in-review` to
  `in-progress`. "Onde e como" moves in scope, the map only: the location card as designed (new ER-09, D-11,
  tasks T-14 and T-15); its "Condições previstas" row stays out of scope. Out of scope before: "'Onde e como'
  (map, directions, weather)". Reason: align the details' last section with the design; the logic (map, marker,
  directions) doesn't change.

## Review
