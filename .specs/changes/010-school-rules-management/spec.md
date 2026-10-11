---
id: "010"
slug: school-rules-management
title: School rules management (backend)
status: in-review
created: 2026-10-11
started: 2026-10-11
base_commit: 5517ca275e22def7354b3109edf6152a18eafe19
fronts: [school-rules, backend]
depends_on: []
---

# 010 — School rules management (backend)

## Goal

Admins keep the school rules in the backend: they add, edit, delete and reorder them, and every approved
account reads them in the order the admins chose. Each add, edit or delete raises the rules version by one, so
a later spec can make users accept the new version; reordering only changes how the rules are shown and leaves
the version alone. This is the backend the admin "Regras da escola" screen and the onboarding School rules step
will call.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: School rules (`school-rules`), User
  (role, status), decisions "Text written by admins is shown as written" and "Admin decisions are final".
- Requirements: [requirements.md → Managing the school rules](../../../.docs/requirements.md#managing-the-school-rules)
  — admins add, edit and remove rules; [requirements.md → Reading the rules](../../../.docs/requirements.md#reading-the-rules)
  — users read the current rules at any time; [requirements.md → Accepting again after a change](../../../.docs/requirements.md#accepting-again-after-a-change)
  — this spec departs from it (D-01): every change requires a new acceptance, admins don't choose.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Architecture
  (permissions checked in use cases), Persistence (snake_case tables, migrations named after the module),
  Fixed conventions (error keys, contracts, generator skills, lint for a new module), Authentication
  (`@CurrentUser()` carries `id`, `role`, `status`), Automated validation (backend e2e suite).
- Existing code this builds on:
  - `apps/backend/prisma/models/auth.model.prisma` — `User`, and `UserRulesAcceptance`
    (`user_rules_acceptances`, per user and version), which this spec doesn't touch.
  - `modules/auth/src/user/model/user.entity.ts` — `UserRole`, `UserStatus` (public exports this module may
    use).
  - `modules/auth/src/user/usecase/set-whatsapp.usecase.ts` — the `user.status.notApproved` check to mirror.
  - `apps/backend/src/modules/auth/auth.controller.ts` and `apps/backend/test/auth-whatsapp.e2e-spec.ts` — the
    controller and e2e patterns (approved accounts created through Prisma, bearer tokens).
- Designs: the admin "Regras da escola" list (number, title, description, up/down chevrons per rule) and the
  "Nova regra" / "Editar regra" sheets (Título, Explicação, Guardar / Apagar regra / Cancelar), shared by the
  user in the planning conversation. The "Pedir a todos para aceitar as regras outra vez" checkbox in those
  designs will be removed (D-01).

## Scope

### In scope

- A new business module `modules/school-rules` (`@rochas-surf-school/school-rules`) with the `school-rule`
  aggregate: the `SchoolRule` entity, its repository port with an in-memory fake, and the use cases to list,
  create, edit, delete and reorder rules.
- The `rules` and `rules_versions` tables, with the migration `school-rules` that also inserts the single
  version row at version 0.
- The Prisma repository and the five routes: `GET /school-rules`, `POST /school-rules`,
  `PUT /school-rules/order`, `PUT /school-rules/:id`, `DELETE /school-rules/:id`.
- The e2e suite of those routes and their `.integration.http` file.

### Out of scope

- Accepting the rules (recording that a user accepted a version) and checking whether a user accepted the
  latest version — both go to the onboarding School rules spec, which also decides whether only students or
  every role accepts.
- Any mobile or web screen (the admin rules screen, the onboarding School rules step).
- Keeping the text of past versions (no snapshot per version).
- Tracking who changed the order, or who edited or deleted a rule (only `created_by` is stored).
- A maximum number of rules.
- Notifications about rule changes (the requirements say none are sent).
- The `user_rules_acceptances` table and the `User.rulesAcceptances` field: left as they are.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | Every successful add, edit (that changes something, see D-08) and delete raises the version by exactly 1; there is no "require acceptance" option. This departs from requirements 1.5 "Accepting again after a change" and `product.md` (admins choose). | The user decided that users always accept updated rules, even after onboarding; the checkbox in the designs will be removed. |
| D-02 | Reordering never changes the version. | Only the display order changes, not the set of rules. |
| D-03 | `rules_versions` holds a single row (`id`, `version`, `created_at`, `updated_at`), inserted by the `school-rules` migration with `version = 0`. A change raises it with an atomic increment (`version = version + 1`) inside the same database transaction as the rule change, done before the rule writes. The current version is that row's `version`; 0 means no change was ever made. | The user's model. The migration row exists in every environment (no upsert); the atomic increment locks the row, so two admins saving at once never get the same version, and a failed change never raises it. |
| D-04 | Reading (`GET /school-rules`) is allowed to any `approved` account, of any role; other statuses get 403 `user.status.notApproved`. Changes are allowed to `approved` admins only. The status is checked before the role. All checks run in the use cases, from the current user (`id`, `role`, `status`) the controller passes. | Requirements "Reading the rules" (users read them at any time) and product.md (a pending account sees only its own approval state); permissions live in the domain (technical-context → Architecture). |
| D-05 | Deleting a rule removes its row (hard delete). The text of past versions is not kept. | An acceptance stores only a version number; keeping per-version snapshots is a follow-up if ever needed. |
| D-06 | `title` and `description` are trimmed at both ends, then validated: both required; `title` at most 60 characters, `description` at most 300. They are stored as written otherwise (no translation, no other normalization). | The design asks for a short title and "one or two short sentences"; admin text is shown as written. |
| D-07 | `index` is a 1-based position, contiguous 1…N, unique among the rules in normal operation. A new rule goes last (N + 1). Deleting a rule moves every rule after it one position up (index − 1), like removing an item from a list. | The screen numbers rules 01, 02…; the user's definition of delete. |
| D-08 | An edit whose trimmed `title` and `description` equal the stored ones changes nothing and doesn't raise the version; it answers 200 with the current list. | An accidental save must not make every user accept the rules again. |
| D-09 | `PUT /school-rules/order` takes `{ ruleIds: string[] }`, which must contain every current rule id exactly once; positions become 1…N in that order. A missing, unknown or repeated id answers 422 `schoolRule.order.mismatch`; a missing `ruleIds` or one that isn't an array of strings answers 422 `schoolRule.order.required`. On error nothing changes. Only rules whose position changed get a new `updated_at`. | One request for the whole order (user's requirement); a list that doesn't match (e.g. another admin added a rule meanwhile) is refused so the app reloads instead of silently dropping a rule. |
| D-10 | Every route answers the same body: `{ version: number, rules: [{ id, title, description, index }] }`, rules sorted by `index` (then `createdAt` as a tiebreak). `POST` answers 201, the others 200 — `DELETE` included. `created_by` is not exposed. | The admin screen redraws from one answer and learns the new version. |
| D-11 | Paths: `GET /school-rules`, `POST /school-rules`, `PUT /school-rules/order`, `PUT /school-rules/:id`, `DELETE /school-rules/:id`. `order` is declared before `:id` in the controller. Bodies: `{ title, description }` for create and edit. | REST style of the auth controller; declaration order keeps `order` from being read as an id. |
| D-12 | Error keys: 401 `auth.token.invalid` (guard); 403 `user.status.notApproved`; 403 `schoolRule.role.notAdmin`; 404 `schoolRule.id.notFound` (unknown id on edit and delete, also a malformed id); 422 from the `Validator` with codes `schoolRule.title` and `schoolRule.description` (`schoolRule.title.required`, `schoolRule.title.max.length`, `schoolRule.description.required`, `schoolRule.description.max.length`); 422 `schoolRule.order.mismatch` and `schoolRule.order.required`. | Keys follow `<concept>.<field-or-reason>.<code>` (technical-context → Error handling); the mobile app will translate them. |
| D-13 | `rules.created_by` references `users.id`, nullable, `ON DELETE SET NULL`; it is set from the admin who creates the rule and never changed. | The user asked for the creator; a later erasure of the admin's row must not delete the school's rules. |
| D-14 | New module `modules/school-rules` (`@rochas-surf-school/school-rules`), aggregate `school-rule`. The repository port `SchoolRuleRepository` has `findAll()` (sorted as in D-10), `findById(id)`, `getVersion()` and `apply(change)`, where `change = { save: SchoolRule[]; delete: string[]; bumpVersion: boolean }` is executed atomically and returns the version after it. The use cases compute positions and decide `bumpVersion`; the adapter only executes. | Keeps the versioning and position rules in the domain (unit-tested), and the transaction in the adapter. |
| D-15 | No limit on the number of rules. | The list is short by nature; a limit would be a new rule nobody asked for. |
| D-16 | Tables `rules` and `rules_versions`; Prisma models `SchoolRule` and `RulesVersion` in `apps/backend/prisma/models/school-rules.model.prisma`; the column keeps the name `index`. | The user's table and column names; Prisma quotes the column. |

## Expected Results

### ER-01 — An approved account reads the rules in order

- **Front:** backend
- **Behavior:** Given rules exist with indexes 1…N and the version row is at V, when an `approved` account of
  any role (student, instructor or admin) calls `GET /school-rules` with its bearer token, then the API
  answers 200 with `{ version: V, rules: [{ id, title, description, index }] }`, rules sorted by `index`, and
  no other field per rule.
- **Edge and error cases:** with no rules and no change ever made, it answers `{ version: 0, rules: [] }`; a
  `pending`, `denied`, `deleted` or `removed` account gets 403 `user.status.notApproved`; no or a bad token
  gets 401 `auth.token.invalid`.
- **Verify by:** `npm test --workspace @rochas-surf-school/school-rules -- -t "ListSchoolRules"` and
  `npm run test:e2e --workspace apps/backend -- test/school-rules.e2e-spec.ts -t "GET /school-rules"`.

### ER-02 — An admin adds a rule at the end and the version goes up

- **Front:** backend
- **Behavior:** Given N rules and version V, when an approved admin calls `POST /school-rules` with
  `{ title: "  Chega 15 min antes ", description: "Tempo para vestir o fato." }`, then the API answers 201
  with version V + 1 and N + 1 rules, the new one last with `index` N + 1 and title `Chega 15 min antes`
  (trimmed); the stored row has `created_by` = the admin's id.
- **Edge and error cases:** with no rules, the first one gets `index` 1 and version becomes 1.
- **Verify by:** `npm test --workspace @rochas-surf-school/school-rules -- -t "CreateSchoolRule"` and
  `npm run test:e2e --workspace apps/backend -- test/school-rules.e2e-spec.ts -t "POST /school-rules"`.

### ER-03 — Invalid title or description is refused

- **Front:** backend
- **Behavior:** Given version V, when an approved admin creates or edits a rule with an empty or
  whitespace-only `title`, a `title` of 61 characters after trimming, an empty `description` or a
  `description` of 301 characters after trimming, then the API answers 422 with the matching key
  (`schoolRule.title.required`, `schoolRule.title.max.length`, `schoolRule.description.required`,
  `schoolRule.description.max.length`), and no rule and no version changes.
- **Edge and error cases:** a missing field counts as empty; exactly 60 / 300 characters are accepted; both
  fields invalid list both keys.
- **Verify by:** `npm test --workspace @rochas-surf-school/school-rules -- -t "SchoolRule"` (entity and the
  create/update use cases) and `npm run test:e2e --workspace apps/backend -- test/school-rules.e2e-spec.ts -t "invalid"`.

### ER-04 — Only approved admins change rules

- **Front:** backend
- **Behavior:** Given rules exist at version V, when an approved student or instructor calls
  `POST /school-rules`, `PUT /school-rules/:id`, `DELETE /school-rules/:id` or `PUT /school-rules/order`
  (with an otherwise valid body), then the API answers 403 `schoolRule.role.notAdmin` and nothing changes.
- **Edge and error cases:** an admin whose status isn't `approved` gets 403 `user.status.notApproved` (status
  checked first); no token gets 401 `auth.token.invalid`.
- **Verify by:** `npm test --workspace @rochas-surf-school/school-rules -- -t "permission"` and
  `npm run test:e2e --workspace apps/backend -- test/school-rules.e2e-spec.ts -t "not an admin"`.

### ER-05 — An admin edits a rule and the version goes up

- **Front:** backend
- **Behavior:** Given rule R at index 2 and version V, when an approved admin calls `PUT /school-rules/R`
  with a new `title` and `description`, then the API answers 200 with version V + 1 and R carrying the new
  (trimmed) text at index 2; the other rules are unchanged.
- **Edge and error cases:** the same `title` and `description` as stored (after trimming) answer 200 with
  version V (D-08); an unknown or malformed id answers 404 `schoolRule.id.notFound` and nothing changes.
- **Verify by:** `npm test --workspace @rochas-surf-school/school-rules -- -t "UpdateSchoolRule"` and
  `npm run test:e2e --workspace apps/backend -- test/school-rules.e2e-spec.ts -t "PUT /school-rules/:id"`.

### ER-06 — An admin deletes a rule, the ones after it move up and the version goes up

- **Front:** backend
- **Behavior:** Given rules A, B, C, D at indexes 1–4 and version V, when an approved admin calls
  `DELETE /school-rules/B`, then the API answers 200 with version V + 1 and rules A (1), C (2), D (3), and B's
  row no longer exists in `rules`.
- **Edge and error cases:** deleting the last rule leaves the others' indexes untouched; deleting the only rule
  leaves `rules: []`; an unknown or malformed id answers 404 `schoolRule.id.notFound` and nothing changes.
- **Verify by:** `npm test --workspace @rochas-surf-school/school-rules -- -t "DeleteSchoolRule"` and
  `npm run test:e2e --workspace apps/backend -- test/school-rules.e2e-spec.ts -t "DELETE /school-rules/:id"`.

### ER-07 — An admin reorders all the rules without changing the version

- **Front:** backend
- **Behavior:** Given rules A, B, C at indexes 1–3 and version V, when an approved admin calls
  `PUT /school-rules/order` with `{ ruleIds: [C, A, B] }`, then the API answers 200 with version V and rules
  C (1), A (2), B (3), and a following `GET /school-rules` returns the same order.
- **Edge and error cases:** sending the current order answers 200 with nothing changed; with no rules,
  `{ ruleIds: [] }` answers 200 with `rules: []`.
- **Verify by:** `npm test --workspace @rochas-surf-school/school-rules -- -t "ReorderSchoolRules"` and
  `npm run test:e2e --workspace apps/backend -- test/school-rules.e2e-spec.ts -t "PUT /school-rules/order"`.

### ER-08 — A reorder list that doesn't match the rules is refused

- **Front:** backend
- **Behavior:** Given rules A, B, C, when an approved admin calls `PUT /school-rules/order` with a list that
  misses a rule (`[A, B]`), repeats one (`[A, A, B, C]`) or names an unknown id (`[A, B, C, X]`), then the API
  answers 422 `schoolRule.order.mismatch` and no index changes.
- **Edge and error cases:** a body without `ruleIds`, or with `ruleIds` that isn't an array of strings, answers
  422 `schoolRule.order.required`.
- **Verify by:** `npm test --workspace @rochas-surf-school/school-rules -- -t "ReorderSchoolRules"` and
  `npm run test:e2e --workspace apps/backend -- test/school-rules.e2e-spec.ts -t "order mismatch"`.

### ER-09 — Rules and their version are stored atomically

- **Front:** backend
- **Behavior:** Given a fresh database, when the migrations are applied, then the tables `rules` (`id`,
  `title`, `description`, `index`, `created_by` → `users.id` nullable `ON DELETE SET NULL`, `created_at`,
  `updated_at`) and `rules_versions` (`id`, `version`, `created_at`, `updated_at`) exist and `rules_versions`
  holds exactly one row with `version = 0`; and when `PrismaSchoolRuleRepository.apply` runs a change, the
  version increment, the deletes and the saves run in one `$transaction`, the increment only when
  `bumpVersion` is true.
- **Edge and error cases:** if a write inside `apply` fails, the transaction rejects and the version isn't
  raised (the transaction rolls back).
- **Verify by:** `npm run prisma:migrate:deploy --workspace apps/backend` applies cleanly on an empty
  database; `npx vitest run src/modules/school-rules/school-rule.prisma.spec.ts` (from `apps/backend`); the
  e2e suite's `beforeAll` reads version 0 from a reset database.

## Tasks

### School rules module (`modules/school-rules`)

- [x] **T-01** — Scaffold the module `school-rules` with
  [`config-new-module`](../../../.claude/skills/config-new-module) using `--skip-web --skip-mobile`
  (creates `modules/school-rules`, `apps/backend/src/modules/school-rules/{school-rules.module.ts,school-rules.controller.ts}`
  and registers it in `AppModule`); add the module's `.oxlintrc.json` (mirroring the backend's) and
  `check-types` script, as the Lint convention requires; then create the `school-rule` aggregate folders with
  [`module-aggregate`](../../../.claude/skills/module-aggregate). Remove any template example code the
  generators add that this spec doesn't use.
  Covers: enabling · Done when: `npm run build --workspace @rochas-surf-school/school-rules`,
  `npm run check-types --workspace @rochas-surf-school/school-rules`, `npm run lint --workspace @rochas-surf-school/school-rules`
  and `npm test --workspace @rochas-surf-school/school-rules` pass, and the backend builds.
  > ✅ 2026-10-11 14:05 — scaffolded `modules/school-rules` (config-new-module --skip-web --skip-mobile) and the
  > `school-rule` aggregate (module-aggregate, mode example); added `.oxlintrc.json`, `check-types` and `lint`
  > scripts and oxlint devDependencies; removed the example `CreateSchoolRule` use case (the placeholder entity
  > and repository are rewritten in T-02/T-03). Files: `modules/school-rules/**`,
  > `apps/backend/src/modules/school-rules/school-rules.module.ts`, `apps/backend/src/modules/school-
  > rules/school-rules.controller.ts`, `apps/backend/src/app.module.ts`, `apps/backend/package.json`, `package-
  > lock.json`. Verified: build, check-types, lint and test of the module exit 0 (1 test passed); `npm run build
  > --workspace @rochas-surf-school/backend` ok. Deviations: none

- [x] **T-02** — `SchoolRule` entity in `modules/school-rules/src/school-rule/model/school-rule.entity.ts`
  (`title`, `description`, `index`, `createdBy?`) with `validate()`: code `schoolRule.title` required + max 60,
  `schoolRule.description` required + max 300, `schoolRule.index` integer and positive, `schoolRule.createdBy`
  UUID when present; tests in `modules/school-rules/test/school-rule/model/school-rule.entity.test.ts`.
  Skill: [`module-entity`](../../../.claude/skills/module-entity).
  Covers: ER-03 · Done when: the entity tests (60/61 and 300/301 characters, empty, index 0) pass.
  > ✅ 2026-10-11 14:05 — `SchoolRule` entity (title, description, index, createdBy?) with `validate()` (required
  > + max 60 / 300, index integer and positive, createdBy UUID). Files: `modules/school-rules/src/school-
  > rule/model/school-rule.entity.ts`, `modules/school-rules/test/school-rule/model/school-rule.entity.test.ts`.
  > Verified: `npm test --workspace @rochas-surf-school/school-rules` (17 passed, entity 100% covered), lint and
  > check-types exit 0. Deviations: none

- [x] **T-03** — Repository port `SchoolRuleRepository` in
  `modules/school-rules/src/school-rule/provider/school-rule.repository.ts` (`findAll`, `findById`,
  `getVersion`, `apply(change)` per D-14) and its in-memory fake in `modules/school-rules/test/mock/`, which
  applies a change all-or-nothing and keeps the version. Skill:
  [`module-repository`](../../../.claude/skills/module-repository).
  Covers: enabling · Done when: the fake's tests (sorting, apply with and without `bumpVersion`) pass.
  > ✅ 2026-10-11 14:06 — repository port `SchoolRuleRepository` (`findAll`, `findById`, `getVersion`,
  > `apply(change)`) with `SchoolRuleChange`, and the in-memory fake (all-or-nothing apply, `failNextApply` to
  > simulate a failed write). Files: `modules/school-rules/src/school-rule/provider/school-rule.repository.ts`,
  > `modules/school-rules/test/mock/fake-school-rule.repository.ts`, `modules/school-rules/test/mock/index.ts`,
  > `modules/school-rules/test/school-rule/provider/fake-school-rule.repository.test.ts`. Verified: `npm test
  > --workspace @rochas-surf-school/school-rules` (23 passed, fake 100% covered), lint and check-types exit 0.
  > Deviations: none

- [x] **T-04** — The access checks (`school-rule-access.ts`: approved → else `ForbiddenError`
  `user.status.notApproved`; admin → else `ForbiddenError` `schoolRule.role.notAdmin`, status first), the
  shared output type `SchoolRulesOut` (`{ version, rules: [{ id, title, description, index }] }`) and the
  `ListSchoolRules` use case, in `modules/school-rules/src/school-rule/usecase/`, with tests in
  `modules/school-rules/test/school-rule/usecase/` (test names include "ListSchoolRules" and "permission").
  Current-user input `{ id, role, status }` uses `UserRole` / `UserStatus` from `@rochas-surf-school/auth`.
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-04 · Done when: the tests (every role, every non-approved status, empty list at version 0)
  pass.
  > ✅ 2026-10-11 14:06 — access checks (`assertCanReadSchoolRules`, `assertCanChangeSchoolRules`, status first),
  > `SchoolRulesOut` and `ListSchoolRules`; added `@rochas-surf-school/auth` and `shared` as module dependencies
  > (build order). Files: `modules/school-rules/src/school-rule/usecase/{school-rule-access.ts,school-
  > rules.out.ts,list-school-rules.usecase.ts,index.ts}`, `modules/school-rules/test/school-
  > rule/usecase/{school-rule-access.test.ts,list-school-rules.usecase.test.ts}`, `modules/school-
  > rules/package.json`, `package-lock.json`. Verified: module test (45 passed, 100% covered), lint, check-
  > types, build exit 0. Deviations: input is `{ actor: { id, role, status } }`

- [x] **T-05** — `CreateSchoolRule` use case: checks admin, trims, builds the entity at index N + 1 with
  `createdBy`, `apply({ save: [rule], delete: [], bumpVersion: true })`, returns the list. Tests in the same
  test folder. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-02, ER-03, ER-04 · Done when: the tests (first rule, appended rule, trimming, invalid fields leave
  the fake untouched, non-admin refused) pass.
  > ✅ 2026-10-11 14:08 — `CreateSchoolRule` use case (admin check, trim, index N + 1, `createdBy`, `bumpVersion:
  > true`), shared `normalizeSchoolRuleText`, and the test factory (`ADMIN`, `STUDENT`, `buildRule`). Files:
  > `modules/school-rules/src/school-rule/usecase/{create-school-rule.usecase.ts,school-rule-text.ts,index.ts}`,
  > `modules/school-rules/test/school-rule/usecase/create-school-rule.usecase.test.ts`, `modules/school-
  > rules/test/mock/{school-rule.factory.ts,index.ts}`. Verified: `npx jest create-school-rule` in the module
  > passes and the full module run is 87 passed with 100% coverage; lint, check-types exit 0. Deviations: none

- [x] **T-06** — `UpdateSchoolRule` use case: checks admin, finds the rule (404 `schoolRule.id.notFound`),
  trims and validates, returns the current list without `apply` when nothing changed (D-08), else saves with
  `bumpVersion: true` keeping the index. Tests in the same test folder. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-05, ER-03, ER-04 · Done when: the tests (edit, unchanged edit keeps version, unknown id, invalid
  fields, non-admin) pass.
  > ✅ 2026-10-11 14:08 — `UpdateSchoolRule` use case (admin check, 404, trim and validate, unchanged edit
  > answers the current list without `apply`, else saves keeping the index with `bumpVersion: true`). Files:
  > `modules/school-rules/src/school-rule/usecase/{update-school-rule.usecase.ts,index.ts}`, `modules/school-
  > rules/test/school-rule/usecase/update-school-rule.usecase.test.ts`. Verified: module run 87 passed, 100%
  > coverage; lint, check-types exit 0. Deviations: none

- [x] **T-07** — `DeleteSchoolRule` use case: checks admin, finds the rule (404), deletes it and saves every
  later rule with index − 1, `bumpVersion: true`. Tests in the same test folder. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-06, ER-04 · Done when: the tests (middle, last and only rule, unknown id, non-admin) pass.
  > ✅ 2026-10-11 14:08 — `DeleteSchoolRule` use case (admin check, 404, deletes the rule and moves every later
  > one up, `bumpVersion: true`). Files: `modules/school-rules/src/school-rule/usecase/{delete-school-
  > rule.usecase.ts,index.ts}`, `modules/school-rules/test/school-rule/usecase/delete-school-
  > rule.usecase.test.ts`. Verified: module run 87 passed, 100% coverage; lint, check-types exit 0. Deviations:
  > none

- [x] **T-08** — `ReorderSchoolRules` use case: checks admin, validates `ruleIds` (422 `ValidationException`
  with `schoolRule.order.required` / `schoolRule.order.mismatch`, D-09), saves only the rules whose index
  changed with `bumpVersion: false`. Tests in the same test folder. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-07, ER-08, ER-04 · Done when: the tests (new order, same order, empty list, missing / repeated /
  unknown id, not an array, non-admin; version unchanged) pass.
  > ✅ 2026-10-11 14:08 — `ReorderSchoolRules` use case (admin check, `schoolRule.order.required` /
  > `schoolRule.order.mismatch`, saves only the moved rules with `bumpVersion: false`, no write when the order
  > is unchanged). Files: `modules/school-rules/src/school-rule/usecase/{reorder-school-
  > rules.usecase.ts,index.ts}`, `modules/school-rules/test/school-rule/usecase/reorder-school-
  > rules.usecase.test.ts`. Verified: module run 87 passed, 100% coverage; lint, check-types, build exit 0.
  > Deviations: none

### Backend (`apps/backend`)

- [x] **T-09** — Prisma models `SchoolRule` (`rules`) and `RulesVersion` (`rules_versions`) in
  `apps/backend/prisma/models/school-rules.model.prisma` per D-13 and D-16 (index on `index`), the back-relation
  on `User` in `apps/backend/prisma/models/auth.model.prisma`, and the migration `school-rules`, edited to
  insert the single version row (`gen_random_uuid()`, `version = 0`). Skill:
  [`backend-prisma-sync-module`](../../../.claude/skills/backend-prisma-sync-module).
  Covers: ER-09 · Done when: `npm run prisma:migrate:deploy --workspace apps/backend` applies on an empty
  database and `SELECT version FROM rules_versions` returns one row, 0.
  > ✅ 2026-10-11 14:08 — Prisma models `SchoolRule` (`rules`, index on `index`, `created_by` → `users.id`
  > nullable `ON DELETE SET NULL`) and `RulesVersion` (`rules_versions`), back-relation `schoolRules` on `User`,
  > and migration `school-rules` (generated with `--create-only`, then edited to insert the single version row
  > with `gen_random_uuid()`, `version = 0`). Files: `apps/backend/prisma/models/school-rules.model.prisma`,
  > `apps/backend/prisma/models/auth.model.prisma`,
  > `apps/backend/prisma/migrations/20261011170812_school_rules/migration.sql`. Verified:
  > `prisma:migrate:deploy` applied all 4 migrations on a fresh scratch database (dropped afterwards) and
  > `SELECT version FROM rules_versions` returned one row, 0; applied to the local database, `migrate status` up
  > to date. Deviations: none (the migration folder is `school_rules`, Prisma replaces the dash)

- [x] **T-10** — `PrismaSchoolRuleRepository` in `apps/backend/src/modules/school-rules/school-rule.prisma.ts`
  (registered in `school-rules.module.ts`): `findAll` ordered by `index`, `createdAt`; `findById` (null for a
  malformed id); `getVersion`; `apply` in one `$transaction` — `updateMany({ data: { version: { increment: 1 } } })`
  first when `bumpVersion`, then deletes, then upserts, then reads the version. Unit tests in
  `school-rule.prisma.spec.ts`. Skill: [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-09 · Done when: `npx vitest run src/modules/school-rules/school-rule.prisma.spec.ts` passes with
  every line of the file covered.
  > ✅ 2026-10-11 14:08 — `PrismaSchoolRuleRepository` (`findAll` ordered by `index`, `createdAt`; `findById`
  > answers null for a malformed id without querying; `getVersion`; `apply` in one `$transaction`: atomic
  > increment first when `bumpVersion`, then deletes, then upserts, then reads the version) registered in
  > `SchoolRulesModule` with `DbModule`. Files: `apps/backend/src/modules/school-rules/school-rule.prisma.ts`,
  > `apps/backend/src/modules/school-rules/school-rule.prisma.spec.ts`, `apps/backend/src/modules/school-
  > rules/school-rules.module.ts`. Verified: `npx vitest run src/modules/school-rules/school-
  > rule.prisma.spec.ts` (8 passed; every statement, function and line covered, the only uncovered branch is the
  > decorator-metadata one that `check-coverage` skips by policy); backend check-types and lint exit 0.
  > Deviations: none

- [x] **T-11** — `SchoolRulesController` in `apps/backend/src/modules/school-rules/school-rules.controller.ts`
  with the five routes of D-11 (`order` before `:id`; `POST` 201, others 200), passing `@CurrentUser()`'s
  `id`, `role`, `status` to the use cases; requests in `school-rules.integration.http`; the e2e suite
  `apps/backend/test/school-rules.e2e-spec.ts` covering ER-01 to ER-08 with test names containing the strings
  their `Verify by` filters on (resetting `rules` and the version to 0 between tests). Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-06, ER-07, ER-08 · Done when:
  `npm run test:e2e --workspace apps/backend -- test/school-rules.e2e-spec.ts` passes against the local
  database.
  > ✅ 2026-10-11 14:11 — `SchoolRulesController` with the five routes (`GET /`, `POST /` 201, `PUT order`
  > declared before `PUT :id`, `DELETE :id`; all others 200), passing the signed-in user's `id`, `role`,
  > `status` as the actor; manual requests; the e2e suite (50 tests, ER-01 to ER-08; tokens are minted with
  > `JwtTokenProvider` because the sign-in route throttles at 10 per minute, and non-approved statuses are set
  > on the account after the token is issued). Added a controller unit spec (`school-rules.controller.spec.ts`,
  > 11 tests) so the controller's lines are covered by the unit run, as the coverage gate requires. Files:
  > `apps/backend/src/modules/school-rules/school-rules.controller.ts`, `apps/backend/src/modules/school-
  > rules/school-rules.controller.spec.ts`, `apps/backend/src/modules/school-rules/school-
  > rules.integration.http`, `apps/backend/test/school-rules.e2e-spec.ts`. Verified: `npm run test:e2e
  > --workspace apps/backend -- test/school-rules.e2e-spec.ts` (50 passed, local Postgres) and each `Verify by`
  > filter (GET, POST, invalid, not an admin, PUT :id, DELETE :id, PUT order, order mismatch) selects and passes
  > its tests; unit spec 22 passed with the prisma spec; backend lint, check-types and build exit 0. Deviations:
  > tokens minted directly instead of through the sign-in flow

### Verification

- [x] **T-12** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: `run-related-tests.mjs 010` passes, `check-coverage.mjs 010`
  prints `COVERAGE OK`, `run-e2e.mjs 010` prints `E2E PASSED`, and lint, check-types and build exit 0.
  > ✅ 2026-10-11 14:11 — ran the Verification Plan from the repo root. `run-related-tests.mjs 010` RELATED TESTS
  > PASSED (module 87 passed; backend vitest passed); `check-coverage.mjs 010` COVERAGE OK (11 files, all 100%);
  > `prisma:migrate:deploy` up to date on the local database (and applied from empty in T-09); `run-e2e.mjs 010`
  > E2E PASSED (backend e2e run: 137 tests passed, including the 50 of school-rules); `npx turbo run lint check-
  > types build --filter=school-rules --filter=backend` 11 tasks successful. User journeys: none (no screen). No
  > files changed. Deviations: none

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 010` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 010` — every line this spec adds or changes is covered
  - `npm run prisma:migrate:deploy --workspace apps/backend` — the `school-rules` migration applies cleanly
    (local database up with `npm run db:start --workspace apps/backend`)
  - `node .specs/scripts/run-e2e.mjs 010` — the backend e2e suite passes, `test/school-rules.e2e-spec.ts`
    included
  - `npm test --workspace @rochas-surf-school/school-rules` — the module's unit tests pass
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/school-rules --filter=@rochas-surf-school/backend`
    — lint, type check and build of the touched workspaces pass
- User journeys: none — this spec has no screen; the API behavior is covered by the e2e suite.

## Memory Impact

- `memory/product.md` — School rules: admins add, edit, delete and reorder them; every add, edit or delete
  creates a new version that users must accept (no "require acceptance" choice); reordering doesn't; any
  approved account reads them; the text of past versions isn't kept. Update the "Relevant product decisions"
  if needed and Current state (backend only; acceptance and screens still to come).
- `memory/structure.md` — `modules/school-rules` (aggregate `school-rule`), `apps/backend/src/modules/school-rules/`
  (controller, Prisma repository, integration file), `apps/backend/prisma/models/school-rules.model.prisma`,
  `apps/backend/test/school-rules.e2e-spec.ts`; `AppModule` registers `SchoolRulesModule`.
- `memory/modules.md` — a new "School rules" module and what it owns.
- `memory/modules/school-rules.md` — new: the rule and version concepts, positions, versioning, who can do
  what, error keys, boundaries (acceptance lives elsewhere, `user_rules_acceptances` in auth).
- `memory/technical-context.md` — the `modules/<module>` line: `modules/school-rules` exists besides
  `modules/auth`.

## Assumptions

- Two admins changing rules at the very same moment is rare. A use case computes positions from a read made
  before the transaction, so a race could leave two rules on the same index; the list stays deterministic
  (`createdAt` tiebreak) and the next reorder fixes it. The version itself never collides (D-03).

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review

### Round 1 — 2026-10-11 — changes-requested

**Checks**

- lint ✅ · type check ✅ · build ✅ (`@rochas-surf-school/school-rules`, `@rochas-surf-school/backend`; turbo `--force`, 11 tasks)
- related tests ✅ (modules/school-rules jest 87 passed, 100%; apps/backend vitest passed)
- coverage of the changed lines ✅ COVERAGE OK — 11 files, all 100%; no coverage-ignore comments in the diff
- e2e: backend suite ✅ E2E PASSED (137 passed, 50 in `school-rules.e2e-spec.ts`)
- migration ✅ `prisma:migrate:deploy` on a fresh scratch database: all migrations applied, `rules_versions` has
  one row at 0, `rules.created_by` → `users.id` `ON DELETE SET NULL`, index on `index` (scratch database dropped)
- live API ✅ built backend on port 4010 with the review accounts: list, create (trimmed, appended, version +1),
  instructor refused, reorder (version kept), mismatch 422, unchanged edit (version kept), edit (+1), 61-char
  title + empty description (both keys), malformed id 404, delete (moves up, +1), all as specified

**Expected Results**

- ER-01 ✅ — every approved role reads `{ version, rules }` sorted by index, no extra field; version 0 / `[]`
  when empty; 4 non-approved statuses → 403 `user.status.notApproved`; no / bad token → 401
- ER-02 ✅ — appended at N + 1, trimmed, version + 1, `created_by` = admin; first rule at index 1, version 1
- ER-03 ✅ — the four keys on create and edit, missing field = empty, both keys together, 60 / 300 accepted,
  nothing stored or bumped on error
- ER-04 ✅ — student and instructor get 403 `schoolRule.role.notAdmin` on all four change routes, nothing
  changes; pending admin → `user.status.notApproved`; no token → 401
- ER-05 ✅ — edit keeps the index, version + 1; unchanged (after trimming) keeps the version; unknown and
  malformed id → 404
- ER-06 ✅ — middle, last and only rule; row gone; 404 for unknown / malformed id
- ER-07 ✅ — new order applied without a version change, a following GET matches; current order and `[]` → 200
- ER-08 ✅ — missing / repeated / unknown id → `schoolRule.order.mismatch`; no body, string, numbers, `{}` →
  `schoolRule.order.required`; indexes unchanged
- ER-09 ✅ — fresh-database migration as above; `school-rule.prisma.spec.ts` asserts one `$transaction`,
  bump → delete → upsert order, no bump when `bumpVersion` is false, and rejection when a write fails

**Findings**

- [x] **F-01** (tests) — `apps/backend/src/modules/school-rules/school-rules.integration.http` signs in with
  `POST /auth/email/verify` without first requesting a code, so the file doesn't work as written: run top to
  bottom against the local backend, both sign-ins answer 401 and every following request 401
  `auth.token.invalid` (reproduced with the three `REVIEW_ACCOUNTS`; after a `POST /auth/email/code` for each
  email the same verify answers 200). Expected: add a `POST {{baseUrl}}/auth/email/code` request for the admin
  and for the student before their verify requests, as `auth.integration.http` does, so the file runs end to end.
  > ✅ 2026-10-11 14:20 — added a `POST /auth/email/code` request (with `locale`) for the admin and for the
  > student before their verify requests, as `auth.integration.http` does; files:
  > `apps/backend/src/modules/school-rules/school-rules.integration.http`; verified: against the built backend
  > on port 4011, the code request for each review account followed by `POST /auth/email/verify` with its fixed
  > code answers 200 with an `accessToken` for both; deviations: none

**Notes**

- Decisions D-01 to D-16 are honored; nothing in Out of scope was built; `## Memory Impact` matches the code.
- The rollback of `apply` is checked with a mocked `$transaction` (it rejects); the real rollback is Prisma's.
  A database-level test (a failing write leaves the version unchanged) would make ER-09's edge case direct
  evidence — optional.
- `app.module.ts` imports `SchoolRulesModule` after the shared imports rather than next to `AuthModule`;
  cosmetic.

