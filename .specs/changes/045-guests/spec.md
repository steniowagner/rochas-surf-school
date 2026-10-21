---
id: "045"
slug: guests
title: "Trial guests in classes"
status: in-progress
started: 2026-10-20
base_commit: a046889b23e7859fb5a1310e4454c51a3219150b
created: 2026-10-19
fronts: [enrolment, classes, backend, mobile]
depends_on: ["044"]
---

# 045 — Trial guests in classes

## Goal

Admins can put someone without an account — a person trying surf or skate — into a class that hasn't started and
has a free seat, with their name and WhatsApp number. A guest takes a seat, gets nothing from the app, and appears
as "Trial" to everyone except admins and the class's instructors, who see the name. Admins are warned that guests
won't hear about edits or a cancellation, and a guest's name and number are erased 30 days after their class.

## Context

- Product: [product.md](../../memory/product.md) — **Guest** (name, WhatsApp number; takes a seat; only in a class
  that hasn't started and has a free seat; shown as "Trial" except to admins and the class's instructors; never
  linked to an account; erased 30 days after the class finishes or is cancelled), **Seat** (seats taken count
  approved enrolments plus guests), the decision "Guests get nothing from the app and leave no trace", and the
  data-ownership exception for a guest's name.
- Requirements: [requirements.md → Guests](../../../.docs/requirements.md#guests);
  [Guests get nothing from the app](../../../.docs/requirements.md#guests-get-nothing-from-the-app);
  [Class lists](../../../.docs/requirements.md#class-lists);
  [Trial classes don't carry over](../../../.docs/requirements.md#trial-classes-dont-carry-over);
  [Guest data is erased](../../../.docs/requirements.md#guest-data-is-erased).
- Technical: [technical-context.md](../../memory/technical-context.md) — Fixed conventions (visibility enforced by
  use cases), Scheduled work (erasures idempotent by the write, logging only counts), the shared `PhoneNumberRule`
  and the user name rules, Mobile shared UI (`SegmentedControl`, `CountryPicker`, the Brazilian mask).
- Depends on: spec `044` — the "Inscrever aluno" screen, "Retirar" on `ClassPeople`, the locked seat write.
- Designs: `.docs/designs/admin-app.html` PAINEL-06 ("Aula experimental" mode of `inscreverScreen`), AULAS-02
  (`dComQuem` with the "Trial" chip, "inclui N trial"), AULAS-04 (sheet `cancelarAula`, the trial warning);
  `.docs/designs/instructor-app.html` (guests' names on the instructor's classes). The web privacy policy already
  describes guest data and its erasure (spec 022).
- Existing code this builds on: `modules/classes/src/school-class/provider/class-roster-reader.provider.ts`,
  `usecase/get-class.usecase.ts`, `list-week-classes.usecase.ts`; `apps/backend/src/modules/enrolment/`
  (`class-roster-reader.prisma.ts`, `seat-counter.prisma.ts`); `apps/mobile/src/components/whatsapp-number-form/`,
  `apps/mobile/src/modules/classes/screens/edit-class.screen.tsx`, `components/cancel-class-sheet/`,
  `components/class-people/`.

## Scope

### In scope

- A `guest` aggregate in `modules/enrolment`: `AddGuest`, `RemoveGuest`, `EraseGuestData`.
- `POST /classes/:id/guests`, `DELETE /guests/:id`, and `GuestErasureJob`.
- Guests in the seats taken and in the class roster (`guests` on the class item, names only for who may see them).
- Mobile: the trial mode of "Inscrever aluno", guest rows and "Retirar" on the details, "inclui N trial", and the
  guest warnings on Editar aula and the cancel sheet.

### Out of scope

- Any message to guests (by product decision) and linking a guest to a later account.
- Editing a guest's name or number; listing a person's past trials.
- Showing guests' WhatsApp numbers anywhere in the app (only stored for the school's records).
- Converting a guest into a student.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | A guest is its own aggregate (`guest`, table `guests`: `id`, `class_id` → `classes` `ON DELETE CASCADE`, `name` and `whatsapp_number` nullable after erasure, `created_by` → `users` `ON DELETE SET NULL`, `created_at`, `erased_at`), in `modules/enrolment`, never linked to a user. | A guest has no account and no statuses; erasure only nulls its fields. |
| D-02 | Adding checks, in order: access (approved admin); the class (404 `class.notFound`); the shape, every problem together (422): the user name rules under `guest.name.*` and `PhoneNumberRule` as `guest.whatsappNumber.invalid` (both required); then `class.cancelled` (409), `class.started` (409), `enrolment.class.full` (409) through the locked seat write. | Same rules as an account's name and number; one seat check for every seat writer. |
| D-03 | The class item gains `guests: [{ id, name }]`; `name` is the guest's name for an approved admin and for the class's instructors, and `null` for everyone else and for every erased guest; `seatsTaken` counts approved students plus guests. `GetClass` and `ListWeekClasses` apply the visibility (the week list carries the guests uncapped, as they are few). | Visibility rules are enforced by use cases, never only by the UI. |
| D-04 | Removing a guest (`DELETE /guests/:id`): access (admin); 404 `guest.notFound`; 409 `class.started`; 204 and nobody told. | The design's "Retirar" for a trial frees the seat; the guest gets nothing. |
| D-05 | `GuestErasureJob` (cron `guest-erasure`, every minute) nulls `name` and `whatsapp_number` and sets `erased_at` for guests whose class ended (`endsAt`) or was cancelled (`cancelledAt`) 30 days ago or more, in one `updateMany` per tick; it logs only the count. | Idempotent by the write; the same erasure style as spec 021. |
| D-06 | The admin's warning reads "N alunos trial não têm conta e não recebem o aviso — fale com eles por WhatsApp." (singular "1 aluno trial não tem conta e não recebe o aviso — fale com ele por WhatsApp.") on Editar aula's footer and the cancel sheet, only when the class has guests. | The requirement asks for the warning on edit and cancel. |
| D-07 | The trial mode's phone field reuses the country picker, the Brazilian mask and the E.164 conversion of `WhatsappNumberForm` (without the share switch), extracted into a shared `PhoneNumberField` in `apps/mobile/src/components/phone-number-field/` that the form then uses. | One phone input, the same rules everywhere. |

## Expected Results

### ER-01 — An admin adds a guest to a class

- **Front:** enrolment
- **Behavior:** Given a class that hasn't started with a free seat, when an admin calls `POST /classes/:id/guests`
  with `{ "name": "Carolina Reis", "whatsappNumber": "+5585999990000" }`, then the API answers 201 with
  `{ id, classId, name }` and the class's `seatsTaken` grows by one.
- **Edge and error cases:** a missing or invalid name and number are reported together (422 `guest.name.*`,
  `guest.whatsappNumber.invalid`); 404 `class.notFound`; 409 `class.cancelled`, `class.started` and
  `enrolment.class.full`; the last seat taken by a guest and an approval at the same moment leave one winner; a
  non-admin answers 403.
- **Verify by:** `npx jest test/guest` (from `modules/enrolment`) and the "adds a guest" cases of
  `apps/backend/test/guests.e2e-spec.ts`.

### ER-02 — Guests are counted and shown as "Trial" except to who may see the name

- **Front:** classes
- **Behavior:** Given a class taught by instructor I with one guest "Carolina Reis", when I or an admin reads the
  class, then `guests` is `[{ id, name: "Carolina Reis" }]`; when a student or another instructor reads it, then
  `guests` is `[{ id, name: null }]`; and for everyone `seatsTaken` counts the guest.
- **Edge and error cases:** a class with no guest reads `guests: []`; an erased guest reads `name: null` for
  everyone; the week list follows the same rule; deleting a class with a guest answers 409 `class.delete.notEmpty`
  and an edit can't lower the capacity below the seats taken including guests.
- **Verify by:** `npx jest test/school-class/usecase/get-class.usecase.test.ts test/school-class/usecase/list-week-classes.usecase.test.ts`
  (from `modules/classes`) and the "visibility" cases of `apps/backend/test/guests.e2e-spec.ts`.

### ER-03 — An admin removes a guest

- **Front:** enrolment
- **Behavior:** Given a guest in a class that hasn't started, when an admin calls `DELETE /guests/:id`, then the API
  answers 204, the seat is free and nobody is told.
- **Edge and error cases:** 404 `guest.notFound` (non-UUID or none); 409 `class.started`; a non-admin answers 403.
- **Verify by:** `npx jest test/guest/usecase/remove-guest.usecase.test.ts` (from `modules/enrolment`) and the
  "removes a guest" cases of `apps/backend/test/guests.e2e-spec.ts`.

### ER-04 — Guest data is erased 30 days after the class

- **Front:** backend
- **Behavior:** Given a guest of a class that ended 30 days ago, when `GuestErasureJob` runs, then the guest's name
  and number are null, `erased_at` is set and the seat reads "Trial" for everyone, admins and the class's
  instructors included.
- **Edge and error cases:** a guest of a class cancelled 30 days ago is erased the same way; one of a class that
  ended 29 days ago is untouched; a second run changes nothing; the job logs only the count and never throws.
- **Verify by:** `npx jest test/guest/usecase/erase-guest-data.usecase.test.ts` (from `modules/enrolment`),
  `npx vitest run src/modules/enrolment/guest-erasure.job.spec.ts` (from `apps/backend`) and the "erasure" case
  of `apps/backend/test/guests.e2e-spec.ts`.

### ER-05 — The trial mode of "Inscrever aluno"

- **Front:** mobile
- **Behavior:** Given an admin on "Inscrever aluno", when they pick "Aula experimental" in the `SegmentedControl`
  ("Aula experimental" / "Aluno da escola", the latter selected first), then step 1 shows "Nome" (placeholder "Ex.:
  Carolina Reis"), "WhatsApp" (`PhoneNumberField`, Brazil preselected) and the note "Esta aula não fica no
  histórico — se a pessoa criar conta depois, começa do zero."; "Inscrever <nome>" is enabled with a valid name, a
  valid number and a class, adds the guest, shows "<nome> inscrito" and goes back.
- **Edge and error cases:** an invalid number shows the field's error and keeps the button off; the refusals of
  ER-01 show their toasts and reload the classes; `WhatsappNumberForm` behaves as before with the extracted field.
- **Verify by:** `npx jest src/modules/enrolment/screens/enrol-student.screen.test.tsx -t "trial" src/components/phone-number-field src/components/whatsapp-number-form`
  (from `apps/mobile`).

### ER-06 — Guests on the class details

- **Front:** mobile
- **Behavior:** Given a class with a guest, when its details' students list opens, then the guest's row shows a
  `sand` avatar, the name (admins and the class's instructors) or "Trial" (everyone else) and a "Trial" chip;
  admins get "Retirar" on it, which removes the guest after a confirmation ("Retirar <nome> da aula?" / "… É um aluno
  trial, sem conta — avise-o por WhatsApp.") and shows "<nome> retirado"; the admin's capacity line ends with "·
  inclui N trial".
- **Edge and error cases:** the students row's count and the card's "+N" include guests; guests never open a person
  sheet; `class.started` and `guest.notFound` show their toasts and reload.
- **Verify by:** `npx jest src/modules/classes/components/class-people src/modules/enrolment/components/take-out-sheet`
  (from `apps/mobile`).

### ER-07 — Admins are warned that guests aren't told

- **Front:** mobile
- **Behavior:** Given a class with 2 guests, when an admin opens Editar aula or the "Cancelar esta aula?" sheet, then
  a `warn`-tint note reads "2 alunos trial não têm conta e não recebem o aviso — fale com eles por WhatsApp." (D-06).
- **Edge and error cases:** a class without guests shows no note; one guest uses the singular.
- **Verify by:** `npx jest src/modules/classes/screens/edit-class.screen.test.tsx src/modules/classes/components/cancel-class-sheet -t "trial"`
  (from `apps/mobile`).

## Tasks

### Enrolment module (`modules/enrolment`)

- [x] **T-01** — Add the `Guest` entity (`src/guest/model/guest.entity.ts`, the name and number rules of D-02,
  `erase(now)`) with tests. Skills: [`module-aggregate`](../../../.claude/skills/module-aggregate),
  [`module-entity`](../../../.claude/skills/module-entity).
  Covers: ER-01, ER-04 · Done when: `npx jest test/guest/model` passes from `modules/enrolment`.
  > ✅ 2026-10-20 — added the `Guest` entity (name/number rules of D-02, errors reported together, `erase(now)`);
  > files: `modules/enrolment/src/guest/model/guest.entity.ts`, `modules/enrolment/src/guest/model/index.ts`,
  > `modules/enrolment/src/guest/index.ts`, `modules/enrolment/src/index.ts`,
  > `modules/enrolment/test/guest/model/guest.entity.test.ts`; verified: `npx jest test/guest/model` from
  > `modules/enrolment` (16 passed, 100% coverage of the entity); deviations: hand-written instead of generated
  > by the aggregate/entity scripts (they scaffold a CRUD aggregate this one doesn't use); the number reports
  > `guest.whatsappNumber.invalid` for both a missing and a malformed number, as D-02 names it.

- [x] **T-02** — Add the `GuestRepository` port (`create` through the locked seat write, `findById`, `delete`,
  `eraseEndedBefore(cutoff)`) and its in-memory version, with tests. Skill:
  [`module-repository`](../../../.claude/skills/module-repository).
  Covers: enabling · Done when: `npx jest test/mock` passes from `modules/enrolment`.
  > ✅ 2026-10-20 — added the `GuestRepository` port and `FakeGuestRepository` (capacity counted from guests plus
  > the approved seats it is given; erasure by class end or cancellation); files:
  > `modules/enrolment/src/guest/provider/guest.repository.ts`, `modules/enrolment/src/guest/provider/index.ts`,
  > `modules/enrolment/src/guest/index.ts`, `modules/enrolment/test/mock/fake-guest.repository.ts`,
  > `modules/enrolment/test/mock/fake-guest.repository.test.ts`, `modules/enrolment/test/mock/date.ts`,
  > `modules/enrolment/test/mock/enrolment.factory.ts`, `modules/enrolment/test/mock/index.ts`;
  > verified: `npx jest test/mock` from `modules/enrolment` (23 passed), `tsc --noEmit` clean;
  > deviations: `eraseEndedBefore(cutoff, now)` takes `now` too (the erasure date); hand-written, not generated.

- [x] **T-03** — Add `AddGuest`, `RemoveGuest` and `EraseGuestData` in `src/guest/usecase/` (D-02, D-04, D-05),
  with tests for every refusal and the erasure window. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-03, ER-04 · Done when: `npx jest test/guest` passes from `modules/enrolment`.
  > ✅ 2026-10-20 — added `AddGuest` (access → class 404 → shape 422 together → cancelled/started 409 → locked seat
  > write 409 full), `RemoveGuest` (access → 404 `guest.notFound` → `class.started` → delete) and `EraseGuestData`
  > (30-day cutoff, returns the count); files: `modules/enrolment/src/guest/usecase/add-guest.usecase.ts`,
  > `modules/enrolment/src/guest/usecase/remove-guest.usecase.ts`,
  > `modules/enrolment/src/guest/usecase/erase-guest-data.usecase.ts`, `modules/enrolment/src/guest/usecase/index.ts`,
  > `modules/enrolment/src/guest/index.ts`, `modules/enrolment/test/guest/usecase/add-guest.usecase.test.ts`,
  > `modules/enrolment/test/guest/usecase/remove-guest.usecase.test.ts`,
  > `modules/enrolment/test/guest/usecase/erase-guest-data.usecase.test.ts`; verified: `npx jest test/guest` from
  > `modules/enrolment` (45 passed, 100% of `src/guest`), whole module suite, `tsc --noEmit` and oxlint clean;
  > deviations: hand-written, not generated; `AddGuest` answers `{ id, classId, name }` as ER-01 says.

### Classes module (`modules/classes`)

- [ ] **T-04** — Add `guests` to `ClassRoster` and `ClassItem`, and apply D-03's visibility in `GetClass` and
  `ListWeekClasses` (admin, or the actor among the class's instructors), with tests.
  Covers: ER-02 · Done when: `npx jest test/school-class` passes from `modules/classes`.

### Backend (`apps/backend`)

- [ ] **T-05** — Add the `Guest` model to `prisma/models/enrolment.model.prisma` and the migration
  `enrolment-add-guests` (D-01). Skill: [`backend-prisma-sync-module`](../../../.claude/skills/backend-prisma-sync-module).
  Covers: enabling · Done when: `npm run prisma:migrate:deploy --workspace apps/backend` applies it.

- [ ] **T-06** — Add `src/modules/enrolment/guest.prisma.ts` (the locked insert shared with approvals) and count and
  list guests in `class-roster-reader.prisma.ts`, `seat-counter.prisma.ts` and the pending-list's `seatsTaken`, with
  specs. Skill: [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-01, ER-02, ER-03, ER-04 · Done when: `npx vitest run src/modules/enrolment` passes.

- [ ] **T-07** — Add `src/modules/enrolment/guests.controller.ts` (`POST /classes/:id/guests`, `DELETE /guests/:id`),
  its spec and `guests.integration.http`. Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-03 · Done when: `npx vitest run src/modules/enrolment/guests.controller.spec.ts` passes.

- [ ] **T-08** — Add `src/modules/enrolment/guest-erasure.job.ts` (D-05) with its spec.
  Covers: ER-04 · Done when: `npx vitest run src/modules/enrolment/guest-erasure.job.spec.ts` passes.

- [ ] **T-09** — Add `test/guests.e2e-spec.ts` (fixed clock, cleanup) with the add, refusals, visibility per role,
  remove, delete-class-not-empty, capacity and erasure cases.
  Covers: ER-01, ER-02, ER-03, ER-04 · Done when: `npm run test:e2e --workspace apps/backend` passes.

### Mobile (`apps/mobile`)

- [ ] **T-10** — Extract `src/components/phone-number-field/` from `WhatsappNumberForm` (D-07) with tests, and add
  `hooks/use-add-guest.hook.ts` and `hooks/use-remove-guest.hook.ts` with their error keys.
  Covers: ER-05, ER-06 · Done when: `npx jest src/components/phone-number-field src/components/whatsapp-number-form src/modules/enrolment/hooks` passes.

- [ ] **T-11** — Add the trial mode to `enrol-student.screen.tsx` (+ hook), with tests and copy in the three locales.
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-05 · Done when: `npx jest src/modules/enrolment/screens` passes.

- [ ] **T-12** — Add `guests` to the class types, the guest rows (and admin "Retirar" with the trial variant of the
  take-out sheet) in `ClassPeople`, and "inclui N trial" in the admin's capacity line, with tests and copy.
  Covers: ER-06 · Done when: `npx jest src/modules/classes/components/class-people src/modules/enrolment/components` passes.

- [ ] **T-13** — Add the guest warning (D-06) to `edit-class.screen.tsx` and `cancel-class-sheet`, with tests and copy.
  Covers: ER-07 · Done when: `npx jest src/modules/classes/screens/edit-class.screen.test.tsx src/modules/classes/components/cancel-class-sheet` passes.

### Verification

- [ ] **T-14** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence.
  Covers: all · Done when: every automated command exits 0 and the user journeys are recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 045` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 045` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/enrolment --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
  - `node .specs/scripts/run-e2e.mjs 045` — the backend e2e suite passes, including `guests.e2e-spec.ts`.
  - `guests.integration.http` against `npm run dev` — the add and remove requests answer as ER-01 and ER-03.
- User journeys (e2e, followed in a browser or simulator):
  - On the iOS simulator as an admin: "Inscrever aluno" → "Aula experimental" → name and number → a class →
    "Inscrever Carolina": the class's details list "Carolina Reis" with "Trial" and "inclui 1 trial".
  - As a student, the same class lists "Trial"; as its instructor, "Carolina Reis".
  - As the admin, open Editar aula and "Cancelar aula" on that class: the trial warning shows; "Retirar" the guest
    and the seat frees.

## Memory Impact

- `memory/product.md` — Current state: admins add and remove trial guests; guests count as seats and show as
  "Trial" except to admins and the class's instructors; warnings on edit and cancel; 30-day erasure.
- `memory/technical-context.md` — the guest routes and checks, `guests` on the class item and its visibility, the
  `guests` table, `GuestErasureJob`, `PhoneNumberField`.
- `memory/structure.md` — the `guest` aggregate, `guests.controller.ts`, `guest-erasure.job.ts`,
  `src/components/phone-number-field/`.
- `memory/modules.md` — Enrolment also keeps guests.
- `memory/modules/enrolment.md` — the guest aggregate, rules, permissions and erasure.
- `memory/modules/classes.md` — seats taken include guests; the roster's guests and their visibility.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
