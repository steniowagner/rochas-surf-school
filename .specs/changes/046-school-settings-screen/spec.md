---
id: "046"
slug: school-settings-screen
title: "School settings screen: waiting list switch and WhatsApp number"
status: in-review
created: 2026-10-19
started: 2026-10-21
base_commit: eb6839262462fba0be3e5d1a06cdb65c66d1ba06
fronts: [school-settings, enrolment, backend, mobile]
depends_on: ["045"]
---

# 046 — School settings screen: waiting list switch and WhatsApp number

## Goal

Admins get a "Configurações da escola" screen where they turn the waiting list on or off and set the school's
WhatsApp number (the one every "Falar com a escola" button opens). While the waiting list is off, students can't ask
for a seat in a full class and see that the waiting list is closed; requests already waiting stay as they are.

## Context

- Product: [product.md](../../memory/product.md) — **School settings** (the school's WhatsApp number and the waiting
  list, on by default) and **Enrolment** ("With the waiting list off, students can't request a full class").
- Requirements: [requirements.md → Waiting list switch](../../../.docs/requirements.md#waiting-list-switch) — on by
  default; off blocks requests on a full class;
  [School WhatsApp number](../../../.docs/requirements.md#school-whatsapp-number) — admins set it.
- Technical: [technical-context.md](../../memory/technical-context.md) — the school settings routes
  (`GET /school-settings`, `PUT /school-settings/whatsapp`, spec 015), Mobile shared UI.
- Module memory: [school-settings.md](../../memory/modules/school-settings.md) — "The waiting-list switch joins it
  with enrolment".
- Depends on: spec `045` (and the request use case of spec 041, D-05 there: the waiting list was always on).
- Designs: `.docs/designs/admin-app.html` PAINEL-09 "School settings" (builder `escolaDefScreen`, `aulaScreen`'s full
  banner), `.docs/designs/student-app.html` `detalheScreen` (`esperaOff`). pt-PT adapted to pt-BR ("Definições" →
  "Configurações").
- Existing code this builds on: `modules/school-settings/src/school-settings/` (entity, repository,
  `GetSchoolSettings`, `SetSchoolWhatsapp`), `apps/backend/src/modules/school-settings/`,
  `apps/mobile/src/hooks/use-school-whatsapp.hook.ts` (moved there by spec 043),
  `apps/mobile/src/components/phone-number-field/` (spec 045).

## Scope

### In scope

- `waitingListEnabled` in the school settings (stored, read by everyone signed in, set by admins).
- `RequestSeat` refusing a full class while the waiting list is off.
- Mobile: the "Configurações da escola" screen and its home row; the student's and the admin's full-class texts.

### Out of scope

- Turning the waiting list on or off per class.
- Ending the waiting requests when the switch goes off.
- Other school settings shown in the designs elsewhere (none for now).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | `school_settings.waiting_list_enabled` (boolean, default true); `GET /school-settings` answers `{ whatsappNumber, waitingListEnabled }` (true while no row exists); `PUT /school-settings/waiting-list` `{ enabled }` (approved admins) answers the same shape; a non-boolean is 422 `schoolSettings.waitingList.invalid`. | Same shape and access as spec 015's number. |
| D-02 | `RequestSeat` reads the switch through a new enrolment port `WaitingListSetting.isEnabled()` (backed by the school settings table) and, when the class is full and the switch is off, refuses with 409 `enrolment.waitingList.closed`, checked after `class.started` and before `enrolment.rule.notAccepted`. | Keeps enrolment independent of the school-settings module's code. |
| D-03 | Turning the switch off changes no enrolment: waiting requests stay pending and admins can still approve them when a seat opens. | Only new requests are blocked. |
| D-04 | The screen has one "Salvar", enabled when the switch or the number differs from the saved values and the number (when present) is valid; it sends only what changed and shows "Configurações salvas". | The design has one save; an untouched field is never rewritten. |

## Expected Results

### ER-01 — Admins turn the waiting list on and off

- **Front:** school-settings
- **Behavior:** Given an approved admin, when they call `PUT /school-settings/waiting-list` with
  `{ "enabled": false }`, then the API answers 200 with `waitingListEnabled: false`, and `GET /school-settings`
  answers the same for any signed-in account.
- **Edge and error cases:** a fresh database answers `waitingListEnabled: true`; a missing or non-boolean `enabled`
  answers 422 `schoolSettings.waitingList.invalid`; a student or instructor answers 403 `user.role.notAdmin`; saving
  the switch keeps the WhatsApp number and saving the number keeps the switch.
- **Verify by:** `npx jest test/school-settings` (from `modules/school-settings`) and the "waiting list" cases of
  `apps/backend/test/school-settings.e2e-spec.ts`.

### ER-02 — A full class can't be requested while the waiting list is off

- **Front:** enrolment
- **Behavior:** Given the waiting list off and a full class that hasn't started, when a student calls
  `POST /classes/:id/enrolments`, then the API answers 409 `enrolment.waitingList.closed` and nothing is stored.
- **Edge and error cases:** a class with a free seat is requested as before; with the switch on, a full class is
  requested as before; existing waiting requests stay pending and can be approved when a seat frees (D-03).
- **Verify by:** `npx jest test/enrolment/usecase/request-seat.usecase.test.ts -t "waiting list"` (from
  `modules/enrolment`) and the "waiting list closed" case of `apps/backend/test/enrolment.e2e-spec.ts`.

### ER-03 — The "Configurações da escola" screen

- **Front:** mobile
- **Behavior:** Given an admin on the home, when they open "Configurações da escola" (under "Escola"), then the screen
  shows the section "Lista de espera" with the switch "Lista de espera nas turmas cheias" and, on, "Numa aula cheia,
  os alunos podem entrar na lista de espera. Se abrir vaga, o pedido passa para a sua aprovação." or, off,
  "Desligada — numa aula cheia, os alunos veem «Turma cheia» e não podem pedir."; the section "WhatsApp da escola"
  with `PhoneNumberField` and "É o número do botão «Falar com a escola»."; and "Salvar" (D-04), which shows
  "Configurações salvas" and stays on the screen.
- **Edge and error cases:** loading and error with "Tentar novamente"; an invalid number keeps "Salvar" off and shows
  the field's error; no school number yet starts the field empty with Brazil selected; a failed save shows the
  shared toasts and keeps the edits; copy in pt-BR, es-ES and en-US.
- **Verify by:** `npx jest src/modules/school-settings/screens src/modules/admin/screens/admin.screen.test.tsx`
  (from `apps/mobile`).

### ER-04 — The student sees a closed waiting list

- **Front:** mobile
- **Behavior:** Given the waiting list off, when a student without an open enrolment opens a full class that hasn't
  started, then the footer shows no button and the "Turma cheia" banner reads "A lista de espera está fechada para
  esta aula."; a request answered `enrolment.waitingList.closed` shows that text as a toast and reloads.
- **Edge and error cases:** a student already waiting keeps "Sair da lista de espera"; with the switch on the
  student sees "Entrar na lista de espera" as in spec 041; an unloaded or failed settings read counts as on (the
  backend decides).
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "waiting list off"` (from
  `apps/mobile`).

### ER-05 — The admin's full-class banner says whether new requests wait

- **Front:** mobile
- **Behavior:** Given an admin on the details of a full class that hasn't started, when the banner renders, then it
  reads "Turma cheia" with "Novos pedidos entram na lista de espera." when the switch is on, or "A lista de espera
  está desligada — ninguém pode pedir." when off.
- **Edge and error cases:** instructors keep the banner without the description.
- **Verify by:** `npx jest src/modules/classes/screens/class-details.screen.test.tsx -t "full banner"` (from
  `apps/mobile`).

## Tasks

### School settings module (`modules/school-settings`)

- [x] **T-01** — Add `waitingListEnabled` to the entity and `SchoolSettingsOut`, and the use case `SetWaitingList`
  (`src/school-settings/usecase/set-waiting-list.usecase.ts`, D-01), with tests. Skills:
  [`module-entity`](../../../.claude/skills/module-entity), [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01 · Done when: `npx jest` passes from `modules/school-settings`.
  > ✅ 2026-10-21 — added `waitingListEnabled` (default true) to the entity and `SchoolSettingsOut`, and `SetWaitingList`
  > (admin-only, 422 `schoolSettings.waitingList.invalid` for a non-boolean, keeps the number, creates the row without
  > a number when none exists); files: `modules/school-settings/src/school-settings/model/school-settings.entity.ts`,
  > `.../usecase/school-settings.out.ts`, `.../usecase/set-waiting-list.usecase.ts`, `.../usecase/index.ts`,
  > `modules/school-settings/test/school-settings/usecase/set-waiting-list.usecase.test.ts`,
  > `.../usecase/get-school-settings.usecase.test.ts`, `.../usecase/set-school-whatsapp.usecase.test.ts`,
  > `.../model/school-settings.entity.test.ts`; verified: `npx jest` in `modules/school-settings` (82 passed);
  > deviations: none (module skills not invoked: the change extends existing files by their pattern)

### Enrolment module (`modules/enrolment`)

- [x] **T-02** — Add the `WaitingListSetting` port and the `enrolment.waitingList.closed` check in `RequestSeat`
  (D-02), with tests and the fake.
  Covers: ER-02 · Done when: `npx jest test/enrolment/usecase/request-seat.usecase.test.ts` passes.
  > ✅ 2026-10-21 — added the `WaitingListSetting` port and its fake, and the `enrolment.waitingList.closed` (409)
  > check in `RequestSeat` after `class.started` and before `enrolment.rule.notAccepted`; files:
  > `modules/enrolment/src/enrolment/provider/waiting-list-setting.provider.ts`, `.../provider/index.ts`,
  > `.../usecase/request-seat.usecase.ts`, `modules/enrolment/test/mock/fake-waiting-list.setting.ts`,
  > `.../test/mock/index.ts`, `.../test/enrolment/usecase/request-seat.usecase.test.ts`; verified: `npx jest` in
  > `modules/enrolment` (291 passed), `tsc --noEmit` clean; deviations: knowing a class is full needs the seats taken,
  > so `RequestSeat` also takes the existing `SeatCounter` of `@rochas-surf-school/classes` (constructor: `…clock,
  > waitingListSetting, seatCounter`); the count only runs while the switch is off

### Backend (`apps/backend`)

- [x] **T-03** — Add `waiting_list_enabled` to `prisma/models/school-settings.model.prisma` with the migration
  `school-settings-add-waiting-list`, the field in `school-settings.prisma.ts`, and `PUT /school-settings/waiting-list`
  in `school-settings.controller.ts` with specs and requests in its `.integration.http`. Skills:
  [`backend-prisma-sync-module`](../../../.claude/skills/backend-prisma-sync-module),
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01 · Done when: `npx vitest run src/modules/school-settings` passes.
  > ✅ 2026-10-21 — added `waiting_list_enabled` (boolean, default true) and its migration (applied with
  > `prisma migrate deploy` on the local database), the field in the repository mapping and upsert, and
  > `PUT /school-settings/waiting-list` with specs and `.http` requests; files:
  > `apps/backend/prisma/models/school-settings.model.prisma`,
  > `apps/backend/prisma/migrations/20261021120000_school_settings_add_waiting_list/migration.sql`,
  > `apps/backend/src/modules/school-settings/school-settings.prisma.ts`, `.../school-settings.prisma.spec.ts`,
  > `.../school-settings.controller.ts`, `.../school-settings.controller.spec.ts`,
  > `.../school-settings.integration.http`; verified: `npx vitest run src/modules/school-settings` (16 passed);
  > deviations: the migration SQL was written by hand (the schema diff is one `ADD COLUMN`) instead of
  > `migrate dev`; `tsc` still reports the `RequestSeat` call in `enrolment.controller.ts` (fixed in T-04)

- [x] **T-04** — Add `src/modules/enrolment/waiting-list-setting.prisma.ts` and pass it to `RequestSeat`, with its spec.
  Covers: ER-02 · Done when: `npx vitest run src/modules/enrolment` passes.
  > ✅ 2026-10-21 — added `PrismaWaitingListSetting` (reads `school_settings`, on while no row exists), registered it in
  > `EnrolmentModule` and passed it, with the existing `PrismaSeatCounter`, to `RequestSeat` in the controller; files:
  > `apps/backend/src/modules/enrolment/waiting-list-setting.prisma.ts`, `.../waiting-list-setting.prisma.spec.ts`,
  > `.../enrolment.controller.ts`, `.../enrolment.controller.spec.ts`, `.../enrolment.module.ts`; verified:
  > `npx vitest run src/modules/enrolment` (119 passed), `tsc --noEmit` clean; deviations: the seat counter is also
  > passed (see T-02)

- [x] **T-05** — Add the waiting-list cases to `test/school-settings.e2e-spec.ts` and the closed case to
  `test/enrolment.e2e-spec.ts` (each resetting the switch after the test).
  Covers: ER-01, ER-02 · Done when: `npm run test:e2e --workspace apps/backend` passes.
  > ✅ 2026-10-21 — added the `PUT /school-settings/waiting-list` cases (switch off/on read by a student, number and
  > switch kept across saves, 422 invalid, 403 per status and role, 401) and updated the existing expectations to the
  > new `{ whatsappNumber, waitingListEnabled }` shape; added the closed-waiting-list case to the enrolment suite
  > (full class refused with 409, free class and re-enabled switch accepted), which saves and restores the
  > school settings rows around each test; files: `apps/backend/test/school-settings.e2e-spec.ts`,
  > `apps/backend/test/enrolment.e2e-spec.ts`; verified: `npm run test:e2e` in `apps/backend` (22 files, 608 passed);
  > deviations: ER-01 says a non-admin gets `user.role.notAdmin`, but the use case (like spec 015's number route)
  > answers `schoolSettings.role.notAdmin`; kept consistent with the existing route

### Mobile (`apps/mobile`)

- [x] **T-06** — Add `src/hooks/use-school-settings.hook.ts` (`["school-settings"]`, which `useSchoolWhatsapp`
  now reads from), `src/modules/school-settings/` with the screen (+ hook, types), `useSaveSchoolSettings`, the route
  `src/app/(private)/admin/school-settings.tsx`, `routes.admin.schoolSettings` and the home row, with tests and
  copy in the three locales. Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-03 · Done when: `npx jest src/hooks src/modules/school-settings src/modules/admin/screens` passes.
  > ✅ 2026-10-21 — added `useSchoolSettings` (`["school-settings"]`, which `useSchoolWhatsapp` now reads), the
  > `school-settings` module (`SchoolSettingsScreen`, `SchoolSettingsForm` with its hook, `useSaveSchoolSettings`
  > sending only what changed: the switch, then the number), the route `admin/school-settings`,
  > `routes.admin.schoolSettings`, the "School settings" row under School on the admin home, and copy in en-US,
  > es-ES and pt-BR; files: `apps/mobile/src/hooks/use-school-settings.hook.ts`, `.../use-school-settings.hook.test.tsx`,
  > `.../use-school-settings.types.ts` (replaces `use-school-whatsapp.types.ts`), `.../use-school-whatsapp.hook.ts`,
  > `apps/mobile/src/modules/school-settings/school-settings.types.ts`,
  > `.../hooks/use-save-school-settings.hook.ts`, `.../hooks/use-save-school-settings.hook.test.tsx`,
  > `.../components/school-settings-form/*`, `.../screens/school-settings.screen.tsx`,
  > `.../screens/school-settings.screen.test.tsx`, `apps/mobile/src/app/(private)/admin/school-settings.tsx`,
  > `apps/mobile/src/constants/routes.ts`, `apps/mobile/src/modules/admin/screens/admin.screen.tsx`,
  > `.../admin.screen.test.tsx`, `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts`; verified:
  > `npx jest src/hooks src/modules/school-settings src/modules/admin/screens` (59 passed), `tsc --noEmit` and eslint
  > clean (the typed-routes file `.expo/types/router.d.ts` was regenerated by `expo start`); deviations: the form is its
  > own component so its state starts from the loaded settings; an emptied number field counts as "no change" (the
  > API refuses an empty number, so the number can be replaced, not cleared)

- [x] **T-07** — Use the switch on the details: the student's closed variant and the admin's banner descriptions,
  and the `enrolment.waitingList.closed` toast, with tests and copy.
  Covers: ER-04, ER-05 · Done when: `npx jest src/modules/classes/screens/class-details.screen.test.tsx src/modules/enrolment` passes.
  > ✅ 2026-10-21 — `getEnrolmentCta` gives no button on a full class to someone without an open request while the
  > waiting list is closed; `useClassEnrolment` takes `waitingListEnabled` and exposes `waitingListClosed`; the details
  > screen reads `useSchoolSettings` (unknown counts as on), shows "A lista de espera está fechada para esta aula." on
  > the student's banner and, for admins only, "Novos pedidos entram na lista de espera." / "A lista de espera está
  > desligada — ninguém pode pedir."; `enrolment.waitingList.closed` shows its text as a toast, reloads the class and
  > the settings; copy in the three locales; files: `apps/mobile/src/modules/enrolment/utils/enrolment-cta.ts`,
  > `.../enrolment-cta.test.ts`, `.../enrolment-error.ts`, `.../enrolment-error.test.ts`,
  > `apps/mobile/src/modules/enrolment/hooks/use-class-enrolment.hook.ts`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.hook.ts`, `.../class-details.screen.tsx`,
  > `.../class-details.screen.test.tsx` (fetch-count assertions now ignore the settings read),
  > `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts`; verified: `npx jest` on class-details, `src/modules/enrolment`,
  > `src/hooks`, `src/modules/school-settings`, `src/modules/admin` (513 passed), `tsc --noEmit` and eslint clean;
  > deviations: none

### Verification

- [x] **T-08** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence.
  Covers: all · Done when: every automated command exits 0 and the user journeys are recorded.
  > ✅ 2026-10-21 — `run-related-tests.mjs 046`: RELATED TESTS PASSED (backend, mobile, enrolment, school-settings);
  > `check-coverage.mjs 046`: COVERAGE OK (24 files; closing it needed a double-send guard in the settings form's save
  > and tests for the keyboard's done key and a school with no number); `npx turbo run lint check-types build` for the
  > four workspaces: 27 tasks successful; `run-e2e.mjs 046`: E2E PASSED (backend, 608 tests). User journeys NOT driven
  > by me (no iOS build of the app was made): (1) on the iOS simulator as an admin, open "Configurações da escola"
  > from the home, turn "Lista de espera nas turmas cheias" off, tap "Salvar" → the toast "Configurações salvas"
  > shows and the screen stays; as a student on a full class, no button and the banner reads "A lista de espera está
  > fechada para esta aula."; turn it back on → "Entrar na lista de espera" returns. (2) change the number and save;
  > on a Denied screen "Falar com a escola" opens the new number.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 046` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 046` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/school-settings --filter=@rochas-surf-school/enrolment --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
  - `node .specs/scripts/run-e2e.mjs 046` — the backend e2e suite passes, including the waiting-list cases.
- User journeys (e2e, followed in a browser or simulator):
  - On the iOS simulator as an admin, "Configurações da escola" → turn the waiting list off → "Salvar": the toast
    shows; as a student on a full class, no button and "A lista de espera está fechada para esta aula."; back on,
    "Entrar na lista de espera" returns.
  - Change the school's number and save; on a Denied screen (or the cancel note of spec 043), "Falar com a escola"
    opens the new number.

## Memory Impact

- `memory/product.md` — Current state: admins set the waiting list and the school's number on "Configurações da
  escola"; with the waiting list off, full classes can't be requested.
- `memory/technical-context.md` — `waitingListEnabled` and its route, `enrolment.waitingList.closed`, the
  `useSchoolSettings` hook and the settings screen.
- `memory/structure.md` — `apps/mobile/src/modules/school-settings/` and its route.
- `memory/modules.md` — School settings: the waiting-list switch exists.
- `memory/modules/school-settings.md` — the switch, its default and access.
- `memory/modules/enrolment.md` — the closed-waiting-list refusal.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
