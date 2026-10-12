---
id: "015"
slug: school-settings-whatsapp
title: The school's WhatsApp number
status: in-progress
started: 2026-10-11
base_commit: 315dffd38202368824cef82340ecf5fed3f8413b
created: 2026-10-11
fronts: [school-settings, backend]
depends_on: []
---

# 015 — The school's WhatsApp number

## Goal

The school has one WhatsApp number that every contact-the-school button in the app uses. Admins set it through
the backend, and any signed-in account reads it whatever its status — a denied or removed account above all,
since contacting the school is the only thing its screen offers. This spec is backend only; the Denied and
Removed screens of spec 016 are its first users.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: **School settings** (`school-settings`:
  the school's WhatsApp number and the waiting-list switch), and the Admin role ("sets the school's WhatsApp
  number").
- Requirements: [requirements.md → School WhatsApp number](../../../.docs/requirements.md#school-whatsapp-number)
  — admins set the number, which every contact-the-school button uses.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: the module
  architecture (business modules in `modules/`, adapters in `apps/backend`), the backend's error mapping
  (`ValidationException` 422, `ForbiddenError` 403, `UnauthorizedError` 401), Automated validation.
- Module pattern: [modules/school-rules.md](../../memory/modules/school-rules.md) — the module gets the actor
  (`id`, `role`, `status`) from the controller and checks status before role, without depending on `auth`.
- Existing code this builds on:
  - `packages/shared/src/validation/rules/phone-number.rule.ts` — `PhoneNumberRule` (E.164 shape and valid for
    its country), used for the user's WhatsApp number (`user.whatsappNumber.phone`).
  - `apps/backend/src/modules/school-rules/school-rules.controller.ts` — the pattern for a controller that builds
    the actor from `@CurrentUser()` and constructs use cases with Prisma repositories.
  - `apps/backend/src/shared/decorators/current-user.decorator.ts` — every route is protected unless marked
    `@Public()`; any status gets a session (modules/auth.md → "Any status gets a session").
- Related: spec 014 (`account-reactivation-request`) runs in parallel; spec 016 (`closed-account-screens`)
  depends on both.

## Scope

### In scope

- A new business module `modules/school-settings` (`@rochas-surf-school/school-settings`) holding the school's
  WhatsApp number.
- `GET /school-settings` for any signed-in account.
- `PUT /school-settings/whatsapp` for approved admins.
- The Prisma model and its migration.

### Out of scope

- The waiting-list switch, the other part of `school-settings` (its own spec, with enrolment).
- An admin screen to set the number (it comes with the admin's settings screens).
- Seeding a number, clearing a number once set, and recording who changed it or when.
- Using the number in any screen (spec 016), and opening WhatsApp chats with users.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | `school-settings` is its own business module, scaffolded with the `config-new-module` skill using `--skip-web --skip-mobile`, as spec 010 did for `school-rules`. Its aggregate is `school-settings`. | It's a product concept of its own (product.md), and the waiting-list switch will join it later. |
| D-02 | There is at most one settings row, keyed by a fixed id, created by the first save (upsert). A read with no row answers `{ "whatsappNumber": null }`. Saves are last-write-wins. | One school, one set of settings; no seed and no migration data needed. |
| D-03 | The number is validated with the shared `RequiredRule` and `PhoneNumberRule` under the code `schoolSettings.whatsappNumber`: missing, `null` or empty → `schoolSettings.whatsappNumber.required`; anything else that isn't a valid E.164 number (spaces, dashes, brackets, an extension, a trailing space, an impossible number, a non-string) → `schoolSettings.whatsappNumber.phone`; both answer 422 and store nothing. The number is stored exactly as sent. | The same rules and status as a user's WhatsApp number (spec 008), so the app can reuse its handling; requiring a value means the number can be replaced but never emptied. |
| D-04 | The module receives the actor (`id`, `role`, `status`) from the controller and doesn't depend on `@rochas-surf-school/auth`. Reading allows any status and role. Setting checks, in order: status `approved` (else 403 `user.status.notApproved`), role `admin` (else 403 `schoolSettings.role.notAdmin`), then the number (D-03). | Same pattern and order as `school-rules` (spec 010); denied and removed accounts must be able to read the number. |
| D-05 | Both routes answer the same shape: `{ "whatsappNumber": string \| null }`; `PUT` answers 200. | The app redraws from the answer, as with the school rules. |
| D-06 | Nothing is seeded; verification sets the number with the admin review account. | The number belongs to the admins; a seeded value would be fake data in production. |

## Expected Results

### ER-01 — Any signed-in account reads the school's WhatsApp number

- **Front:** backend
- **Behavior:** Given any signed-in account (status `pending`, `approved`, `denied`, `deleted` or `removed`;
  any role), when it calls `GET /school-settings` with a valid access token, then the API answers 200 with
  `{ "whatsappNumber": null }` while no number was ever set, and with `{ "whatsappNumber": "<stored E.164>" }`
  once one is set.
- **Edge and error cases:** a missing, malformed or expired access token, or one naming an account that no longer
  exists, answers 401 `auth.token.invalid`.
- **Verify by:** `npx vitest run test/school-settings/usecase/get-school-settings.usecase.test.ts` (from
  `modules/school-settings`) and the e2e tests `reads nothing set`, `reads the number for every status` and
  `without a valid token` in `apps/backend/test/school-settings.e2e-spec.ts`.

### ER-02 — An approved admin sets the number

- **Front:** backend
- **Behavior:** Given an approved admin, when it calls `PUT /school-settings/whatsapp` with
  `{ "whatsappNumber": "+5585999998888" }`, then the API answers 200 with `{ "whatsappNumber": "+5585999998888" }`
  and a later `GET /school-settings` by any account answers the same.
- **Edge and error cases:** setting another valid number (e.g. `"+351912345678"`) replaces the first; setting the
  same number again answers 200 unchanged; extra body fields are ignored.
- **Verify by:** the `sets the number` and `replaces the number` tests in
  `modules/school-settings/test/school-settings/usecase/set-school-whatsapp.usecase.test.ts`, and the e2e tests
  `sets the number` and `replaces the number` in `school-settings.e2e-spec.ts` (checking the row through Prisma).

### ER-03 — An invalid number is refused

- **Front:** backend
- **Behavior:** Given an approved admin, when it calls `PUT /school-settings/whatsapp` with a missing, `null` or
  empty `whatsappNumber`, then the API answers 422 with `schoolSettings.whatsappNumber.required` in `errors`;
  with `"+55 (85) 99999-8888"`, `"+5585999998888 ext. 12"`, `"+5585999998888 "`, `"+55123"` or `5585999998888`
  (a number), it answers 422 with `schoolSettings.whatsappNumber.phone` in `errors`. In every case the stored
  number is unchanged.
- **Edge and error cases:** a missing body is the missing-number case.
- **Verify by:** the `invalid number` tests in `set-school-whatsapp.usecase.test.ts` and the e2e test
  `invalid input` (`it.each` over the values above) in `school-settings.e2e-spec.ts`.

### ER-04 — Only an approved admin can set the number

- **Front:** backend
- **Behavior:** Given an approved student or instructor, when it calls `PUT /school-settings/whatsapp` with a
  valid number, then the API answers 403 with `errors: ["schoolSettings.role.notAdmin"]`; given an admin whose
  status isn't `approved` (`pending`, `denied`, `deleted` or `removed`), it answers 403 with
  `errors: ["user.status.notApproved"]`. Nothing is stored in either case.
- **Edge and error cases:** a non-approved student with an invalid number answers 403
  `user.status.notApproved` (status first, D-04); without a valid token → 401 `auth.token.invalid`.
- **Verify by:** the `not approved` and `not admin` tests in `set-school-whatsapp.usecase.test.ts` and the e2e
  tests `not approved`, `not admin` and `without a valid token` in `school-settings.e2e-spec.ts`.

## Tasks

### School settings module (`modules/school-settings`)

- [x] **T-01** — Scaffold `modules/school-settings` (`@rochas-surf-school/school-settings`) with the
  `config-new-module` skill using `--skip-web --skip-mobile` (D-01), keeping the NestJS module it creates in
  `apps/backend/src/modules/school-settings` registered in `AppModule`. Add the `school-settings` aggregate in
  `modules/school-settings/src/school-settings/`: the `SchoolSettings` entity
  (`model/school-settings.entity.ts`, optional `whatsappNumber` validated per D-03), the
  `SchoolSettingsRepository` contract (`provider/school-settings.repository.ts`: `get(): Promise<SchoolSettings | null>`,
  `save(settings: SchoolSettings): Promise<void>`) and its in-memory implementation in
  `modules/school-settings/test/mock/`, with tests for the entity (valid, each invalid case of ER-03) and the
  fake repository. Skills: [`config-new-module`](../../../.claude/skills/config-new-module),
  [`module-aggregate`](../../../.claude/skills/module-aggregate),
  [`module-entity`](../../../.claude/skills/module-entity),
  [`module-repository`](../../../.claude/skills/module-repository).
  Covers: ER-03 · Done when: `npm test --workspace @rochas-surf-school/school-settings` passes and
  `npx turbo run lint check-types build --filter=@rochas-surf-school/school-settings --filter=@rochas-surf-school/backend`
  exits 0.
  > ✅ 2026-10-11 — scaffolded the module with `config-new-module --module school-settings --skip-web --skip-mobile`
  > (workspace, backend Nest module + placeholder controller registered in `AppModule`, backend dependency) and the
  > aggregate with `module-aggregate --mode example`; wrote the `SchoolSettings` entity (optional `whatsappNumber`,
  > `RequiredRule` + `PhoneNumberRule` under `schoolSettings.whatsappNumber`, plus `SCHOOL_SETTINGS_ID`, the fixed
  > UUID v4 of the single row — D-02), the `SchoolSettingsRepository` port (`get`, `save`) and
  > `FakeSchoolSettingsRepository`, with their tests. Files: `modules/school-settings/.oxlintrc.json`,
  > `modules/school-settings/jest.config.ts`, `modules/school-settings/package.json`,
  > `modules/school-settings/tsconfig.json`, `modules/school-settings/src/index.ts`,
  > `modules/school-settings/src/school-settings/index.ts`,
  > `modules/school-settings/src/school-settings/model/index.ts`,
  > `modules/school-settings/src/school-settings/model/school-settings.entity.ts`,
  > `modules/school-settings/src/school-settings/provider/index.ts`,
  > `modules/school-settings/src/school-settings/provider/school-settings.repository.ts`,
  > `modules/school-settings/src/school-settings/usecase/index.ts`, `modules/school-settings/test/index.test.ts`,
  > `modules/school-settings/test/mock/index.ts`, `modules/school-settings/test/mock/fake-school-settings.repository.ts`,
  > `modules/school-settings/test/school-settings/model/school-settings.entity.test.ts`,
  > `modules/school-settings/test/school-settings/provider/fake-school-settings.repository.test.ts`,
  > `apps/backend/src/modules/school-settings/school-settings.module.ts`,
  > `apps/backend/src/modules/school-settings/school-settings.controller.ts`, `apps/backend/src/app.module.ts`,
  > `apps/backend/package.json`, `package-lock.json`. Verified: `npm test --workspace @rochas-surf-school/school-settings`
  > (3 suites, 22 tests passed, 100% coverage); `npx turbo run lint check-types build --filter=…school-settings
  > --filter=…backend` (14 tasks successful, 0 lint warnings). Deviations: added `@rochas-surf-school/shared`, oxlint
  > (`.oxlintrc.json`, `lint`) and `check-types` to the module, which the template lacks (technical-context →
  > Lint); removed the aggregate generator's example `create-school-settings.usecase.ts` (the real use cases are
  > T-02), leaving `usecase/index.ts` as `export {};`; the scaffolded controller stays a placeholder until T-04.

- [x] **T-02** — Create `GetSchoolSettings` (input `{ actor }`, any status and role; output
  `SchoolSettingsOut = { whatsappNumber: string | null }`) and `SetSchoolWhatsapp` (input
  `{ actor, whatsappNumber: unknown }`, applying D-03 and D-04 in order, saving and answering
  `SchoolSettingsOut`) in `modules/school-settings/src/school-settings/usecase/`, with a `SchoolSettingsActor`
  type (`id`, `role`, `status` as strings), exported from the barrels. Tests in
  `modules/school-settings/test/school-settings/usecase/`: `get-school-settings.usecase.test.ts` (nothing set,
  a set number, every status) and `set-school-whatsapp.usecase.test.ts` (`sets the number`,
  `replaces the number`, same number again, `invalid number` for each ER-03 value, `not approved` for each
  non-approved status — also with an invalid number — and `not admin` for student and instructor). Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03, ER-04 · Done when:
  `npm test --workspace @rochas-surf-school/school-settings` passes and
  `npx turbo run lint check-types --filter=@rochas-surf-school/school-settings` exits 0.
  > ✅ 2026-10-11 — wrote the tests first (35 failing), then `GetSchoolSettings` (no status or role check; answers
  > `{ whatsappNumber: null }` when there is no row), `SetSchoolWhatsapp` (status `approved`, then role `admin`,
  > then the number; builds the row with `SCHOOL_SETTINGS_ID` or clones the stored one, validates, saves),
  > `SchoolSettingsActor` and `SchoolSettingsOut` / `toSchoolSettingsOut`, exported from the barrels; shared test
  > actors in `test/mock/actors.ts`. Files: `modules/school-settings/src/school-settings/usecase/index.ts`,
  > `modules/school-settings/src/school-settings/usecase/school-settings-actor.ts`,
  > `modules/school-settings/src/school-settings/usecase/school-settings.out.ts`,
  > `modules/school-settings/src/school-settings/usecase/get-school-settings.usecase.ts`,
  > `modules/school-settings/src/school-settings/usecase/set-school-whatsapp.usecase.ts`,
  > `modules/school-settings/test/mock/actors.ts`, `modules/school-settings/test/mock/index.ts`,
  > `modules/school-settings/test/school-settings/usecase/get-school-settings.usecase.test.ts`,
  > `modules/school-settings/test/school-settings/usecase/set-school-whatsapp.usecase.test.ts`,
  > `modules/school-settings/src/index.ts` and
  > `modules/school-settings/test/school-settings/model/school-settings.entity.test.ts` (Prettier formatting only).
  > Verified: `npm test --workspace @rochas-surf-school/school-settings` (5 suites, 57 tests passed, 100% coverage);
  > `npx turbo run lint check-types --filter=@rochas-surf-school/school-settings` (3 tasks successful, 0 lint
  > warnings). Deviations: `SetSchoolWhatsapp` refuses a present non-string value (a number, a list, an object)
  > with `schoolSettings.whatsappNumber.phone` before building the entity, because the shared `PhoneNumberRule`
  > accepts a list whose items are valid numbers (D-03: a non-string is `.phone`).

### Backend (`apps/backend`)

- [x] **T-03** — Add `apps/backend/prisma/models/school-settings.model.prisma` (`SchoolSettings`: fixed `id`,
  `whatsappNumber String? @map("whatsapp_number")`, `updatedAt`; table `school_settings`), generate the
  migration `apps/backend/prisma/migrations/<timestamp>_school_settings/`, and implement
  `PrismaSchoolSettingsRepository` in `apps/backend/src/modules/school-settings/school-settings.prisma.ts`
  (`get` reads the fixed row, `save` upserts it — D-02) with `school-settings.prisma.spec.ts`. Skills:
  [`backend-prisma-sync-module`](../../../.claude/skills/backend-prisma-sync-module),
  [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-01, ER-02 · Done when: `npm run prisma:migrate:deploy --workspace apps/backend` applies the
  migration on the local database and `npx vitest run src/modules/school-settings` passes (from
  `apps/backend`).
  > ✅ 2026-10-11 — added the `SchoolSettings` model (table `school_settings`: `id` UUID, `whatsapp_number`,
  > `created_at`, `updated_at`), generated the migration `20261012023213_school_settings` (`migrate dev --name
  > school_settings --create-only`; SQL reviewed: one `CREATE TABLE`, nothing destructive), applied it, and wrote
  > `PrismaSchoolSettingsRepository` (`get` → `findUnique` on `SCHOOL_SETTINGS_ID`; `save` → `upsert` of that row —
  > D-02), provided in `SchoolSettingsModule` with `DbModule`. Files:
  > `apps/backend/prisma/models/school-settings.model.prisma`,
  > `apps/backend/prisma/migrations/20261012023213_school_settings/migration.sql`,
  > `apps/backend/src/modules/school-settings/school-settings.prisma.ts`,
  > `apps/backend/src/modules/school-settings/school-settings.prisma.spec.ts`,
  > `apps/backend/src/modules/school-settings/school-settings.module.ts`. Verified:
  > `npm run prisma:migrate:deploy --workspace apps/backend` ("All migrations have been successfully applied");
  > `npx vitest run src/modules/school-settings` (1 file, 5 tests passed); backend `check-types` and `lint` clean.
  > Deviations: the model also has `createdAt` (the entity's inherited field, as on `rules_versions`); no
  > `deletedAt`, since the single row is never deleted.

- [x] **T-04** — Expose `GET /school-settings` and `PUT /school-settings/whatsapp` (both protected, 200, body
  `Partial<{ whatsappNumber: unknown }> | undefined`) in
  `apps/backend/src/modules/school-settings/school-settings.controller.ts`, building the actor from
  `@CurrentUser()` and constructing the use cases with `PrismaSchoolSettingsRepository` (provided in
  `school-settings.module.ts`); test it in `school-settings.controller.spec.ts`; add the e2e suite
  `apps/backend/test/school-settings.e2e-spec.ts` with the tests ER-01 to ER-04 name, creating accounts in each
  status and role through Prisma and resetting the settings row between tests; and add the requests to
  `apps/backend/src/modules/school-settings/school-settings.integration.http`. Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03, ER-04 · Done when: `npx vitest run src/modules/school-settings` passes and
  `npx vitest run --config vitest.config.e2e.ts test/school-settings.e2e-spec.ts` passes (from
  `apps/backend`).
  > ✅ 2026-10-11 — replaced the scaffolded placeholder controller with `GET /school-settings` (`get`) and
  > `PUT /school-settings/whatsapp` (`setWhatsapp`), both protected and 200, building the actor from
  > `@CurrentUser()` and constructing `GetSchoolSettings` / `SetSchoolWhatsapp` with
  > `PrismaSchoolSettingsRepository` (`body?.whatsappNumber`, so a missing body is the missing-number case); unit
  > spec for routes, metadata and wiring; e2e suite with `reads nothing set`, `reads the number for every status`
  > (3 roles × 5 statuses), `sets the number` (extra field ignored, row checked through Prisma), `replaces the
  > number`, same number again, `invalid input` (`it.each` over every ER-03 value, missing body included, stored
  > number unchanged), `not approved` (4 statuses, plus status before number), `not admin` (student, instructor)
  > and `without a valid token` (missing, malformed, expired, deleted account — GET and PUT), creating accounts
  > through Prisma and deleting the settings row before and after each test; REST Client requests. Files:
  > `apps/backend/src/modules/school-settings/school-settings.controller.ts`,
  > `apps/backend/src/modules/school-settings/school-settings.controller.spec.ts`,
  > `apps/backend/src/modules/school-settings/school-settings.integration.http`,
  > `apps/backend/test/school-settings.e2e-spec.ts`. Verified (from `apps/backend`):
  > `npx vitest run src/modules/school-settings` (2 files, 11 tests passed);
  > `npx vitest run --config vitest.config.e2e.ts test/school-settings.e2e-spec.ts` (30 tests passed); backend
  > `check-types` and `lint` clean. Deviations: none (the provider was already registered in
  > `school-settings.module.ts` by T-03).

### Verification

- [x] **T-05** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every Verification Plan command exits 0, with `COVERAGE OK` and
  `E2E PASSED` printed.
  > ✅ 2026-10-11 — ran the Verification Plan from the repo root (local Postgres up, migrations applied):
  > `node .specs/scripts/run-related-tests.mjs 015` → RELATED TESTS PASSED (apps/backend vitest ✅,
  > modules/school-settings jest ✅ 57 tests, 100% coverage); `node .specs/scripts/check-coverage.mjs 015` →
  > COVERAGE OK (6 measured files at 100%; 2 type-only, 7 excluded by technical-context);
  > `node .specs/scripts/run-e2e.mjs 015` → E2E PASSED (7 files, 227 tests, `school-settings.e2e-spec.ts`
  > included); `npm test --workspace @rochas-surf-school/school-settings` → 5 suites, 57 tests passed;
  > `npx turbo run lint check-types build --filter=@rochas-surf-school/school-settings
  > --filter=@rochas-surf-school/backend` → 14 tasks successful, exit 0. Files: this spec only. Deviations: none.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 015` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 015` — every line this spec adds or changes is covered
  - `node .specs/scripts/run-e2e.mjs 015` — the backend e2e suite passes, `test/school-settings.e2e-spec.ts`
    included (local database up with `npm run db:start --workspace apps/backend` and
    `npm run prisma:migrate:deploy --workspace apps/backend`)
  - `npm test --workspace @rochas-surf-school/school-settings` — the module's unit tests pass
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/school-settings --filter=@rochas-surf-school/backend`
    — lint, type check and build of the touched workspaces pass
- User journeys: none — this spec has no screen; the API behavior is covered by the e2e suite.

## Memory Impact

- `memory/product.md` — Current state: the school's WhatsApp number exists on the backend (set by admins,
  readable by every signed-in account); no screen sets or uses it yet. School settings concept: only the number
  is built; the waiting-list switch is still to come.
- `memory/technical-context.md` — the list of business modules gains `@rochas-surf-school/school-settings`; the
  `GET /school-settings` and `PUT /school-settings/whatsapp` routes.
- `memory/structure.md` — `modules/school-settings` (the `school-settings` aggregate: entity, repository, use
  cases); `apps/backend/src/modules/school-settings`, `prisma/models/school-settings.model.prisma`, the
  `school_settings` migration, `test/school-settings.e2e-spec.ts`.
- `memory/modules.md` — a new **School settings** module: the school-wide switches admins control, today the
  school's WhatsApp number.
- `memory/modules/school-settings.md` — new file: the number (E.164, validated like a user's, never emptied
  once set, last write wins), who reads (any signed-in account, any status) and who sets it (approved admins;
  status before role), its error keys, boundaries (no dependency on `auth`; the waiting-list switch to come),
  spec history.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
