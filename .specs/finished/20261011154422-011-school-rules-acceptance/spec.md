---
id: "011"
slug: school-rules-acceptance
title: Accept the school rules (backend)
status: finished
created: 2026-10-11
fronts: [shared, auth, school-rules, backend]
depends_on: []
started: 2026-10-11
base_commit: e8afa095945c0c405f6c01a6777397c8a5883b2e
reviewed_commit: ef8b5dafea94a185a70c37dd6cae8aeb25ed3470
finished: 2026-10-11
---

# 011 — Accept the school rules (backend)

## Goal

An approved account of any role accepts the current version of the school rules through
`POST /school-rules/acceptances` — what the app sends when the person ticks "Li e aceito as regras e os termos
da Rocha's Surf School" and taps "Entrar na app" on the onboarding School rules step. The backend records the
version with the moment it was accepted, and every answer that carries the account says whether it still has to
accept the rules (`rulesAccepted`), so the app can route an approved account to the School rules step at
onboarding and again after every change to the rules. This spec is the backend only; the screen and the
routing come with a follow-up mobile spec.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: School rules (`school-rules`, versioned,
  accepted per version), User (status, role, `rulesAcceptances`), decisions "Onboarding is the WhatsApp number
  first, then the school rules" and "Every change to the school rules asks everyone to accept them again;
  reordering doesn't".
- Requirements:
  [requirements.md → Accepting the rules](../../../.docs/requirements.md#accepting-the-rules) — users accept the
  rules after approval and before using the rest of the app;
  [requirements.md → Accepting again after a change](../../../.docs/requirements.md#accepting-again-after-a-change)
  — each user accepts every new version the next time they open the app (this spec delivers the acceptance and
  the `rulesAccepted` signal; the asking is the mobile spec's);
  [requirements.md → Rule changes while an account was away](../../../.docs/requirements.md#rule-changes-while-an-account-was-away)
  — a returning account accepts again if the version changed (covered by D-03: `rulesAccepted` compares with
  the current version whatever happened in between);
  [requirements.md → Onboarding after approval](../../../.docs/requirements.md#onboarding-after-approval) —
  backend side of "accept the school rules" (D-05: the backend doesn't enforce the WhatsApp-first order).
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Architecture
  (permissions in use cases, ports and adapters, dependencies point inwards), Fixed conventions (contracts,
  error keys, generator skills), Authentication (`@CurrentUser()`, the account shape of `GET /auth/me`,
  verify, refresh and `PUT /auth/me/whatsapp`), Error handling (`details` in the error body), Automated
  validation (backend e2e suite).
- Module memory: [modules/school-rules.md](../../memory/modules/school-rules.md) and
  [modules/auth.md](../../memory/modules/auth.md) — the version lives in School rules; the accepted versions
  belong to the account in Authentication.
- Existing code this builds on:
  - `modules/auth/src/user/model/user.entity.ts` — `RulesAcceptance { version, acceptedAt }`,
    `User.rulesAcceptances`, `User.hasAcceptedRules(version)`; `validate()` requires positive, unique, integer
    versions.
  - `apps/backend/prisma/models/auth.model.prisma` — `UserRulesAcceptance` (`user_rules_acceptances`, primary
    key `(user_id, version)`, cascade on user delete). No schema change and no migration in this spec.
  - `apps/backend/src/modules/auth/user.prisma.ts` — `PrismaUserRepository` reads acceptances on every load
    and rewrites them all on `update()` (`deleteMany` + `create`).
  - `modules/school-rules/src/school-rule/provider/school-rule.repository.ts` — `getVersion()` (0 until the
    first change); `apps/backend/prisma/models/school-rules.model.prisma` — `RulesVersion`
    (`rules_versions`, a single row).
  - `modules/school-rules` already depends on `@rochas-surf-school/auth`; `modules/auth` must not depend on
    `school-rules` (it would be circular).
  - `modules/auth/src/user/usecase/{get-current-user,set-whatsapp}.usecase.ts`,
    `modules/auth/src/sign-in-code/usecase/verify-sign-in-code.usecase.ts`,
    `modules/auth/src/session/usecase/refresh-session.usecase.ts` — each builds the account shape
    `{ id, name, email, role, status, createdAt, whatsappNumber, whatsappVisible }` by hand today.
  - `apps/backend/src/shared/errors/api-exception.filter.ts` — maps any `DomainError` to its `statusCode`,
    `errors: [message]` and `details`, so a new `DomainError` subclass needs no filter change.

## Scope

### In scope

- `ConflictError` (409) in `packages/shared`.
- `rulesAccepted: boolean` on the account shape returned by `GET /auth/me`, `POST /auth/email/verify`,
  `POST /auth/refresh`, `PUT /auth/me/whatsapp` and the new acceptance route, built by one mapper in
  `modules/auth`, with the current version read through a new `RulesVersionProvider` port.
- `UserRepository.addRulesAcceptance` (port, in-memory fake, Prisma implementation).
- The `AcceptSchoolRules` use case in `modules/school-rules` and `POST /school-rules/acceptances`.
- Unit tests, controller specs and e2e tests for all of the above; requests in `school-rules.integration.http`.

### Out of scope

- Every mobile change: the School rules screen, its checkbox and "Entrar na app" button, the session type
  gaining `rulesAccepted`, and computing `onboardingCompleted` / changing `resolveFlow` — the follow-up mobile
  spec.
- Requiring the WhatsApp number before accepting (D-05).
- Withdrawing an acceptance, or listing who accepted which version (an admin view).
- Notifications about rule changes or acceptances.
- Keeping the text of past versions (an acceptance stores only the version number).
- Any change to the `/school-rules` routes of spec 010 or to the Prisma schema.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The route is `POST /school-rules/acceptances` (protected, 200), body `{ "version": <integer> }`, handled by a new `AcceptSchoolRules` use case in `modules/school-rules/src/school-rule/usecase/`. The user comes from the access token (`@CurrentUser()`), never from the body. | School rules owns the version and already depends on `auth` (for `User` / `UserRepository`); the acceptance itself stays stored on the account in `auth`. |
| D-02 | Only the current version can be accepted. Any other integer answers 409 `schoolRules.version.outdated` with `details: { currentVersion }`, through a new `ConflictError` (409) in `packages/shared`. | A user may only accept text they actually saw; if an admin changed the rules while the screen was open, the app reloads them. 409 is the honest status for a stale write. |
| D-03 | `rulesAccepted` is `true` when the current rules version is 0 or the user has an acceptance for the current version; `false` otherwise. It's computed on every answer that carries the account, from the current version read through a new `RulesVersionProvider` port in `modules/auth` (`getCurrentVersion(): Promise<number>`), implemented in the backend by `PrismaRulesVersionProvider` (`apps/backend/src/modules/auth/rules-version.prisma.ts`) reading the `rules_versions` row. | Keeps the app's routing a pure function of the session's user with one source of truth, and covers accounts returning after a change. A port avoids `auth` depending on `school-rules`. |
| D-04 | Version 0 (no rule ever written) needs no acceptance: `rulesAccepted` is `true`, and accepting while the current version is 0 answers 422 `schoolRules.version.nothingToAccept`, whatever version was sent. Once the version is above 0 acceptance applies, even if every rule was later deleted. | A school without rules must not lock every approved account out of onboarding; version 0 can't be stored anyway (`User.validate()` requires positive versions). |
| D-05 | Any approved account of any role (student, instructor, admin) may accept. The backend doesn't require a WhatsApp number first. | `product.md`: every approved account goes through onboarding. The step order is the app's job; enforcing it in the backend adds a rule with no protection value. |
| D-06 | Accepting a version the user already accepted is a no-op: 200 with the account, still one stored acceptance for that version, the original `acceptedAt` kept. | A double tap or a retry after a lost answer must not fail or rewrite history. |
| D-07 | The acceptance is written with a new `UserRepository.addRulesAcceptance(userId: string, acceptance: RulesAcceptance): Promise<void>`, implemented in `PrismaUserRepository` with `userRulesAcceptance.createMany({ data: [...], skipDuplicates: true })` — not with `update()`. | `update()` deletes and re-creates every acceptance; two concurrent accepts of the same version would hit the `(user_id, version)` key and answer 500. `skipDuplicates` makes the concurrent repeat a no-op and keeps the first `acceptedAt`. |
| D-08 | `AcceptSchoolRules` checks, in this order: the user exists (else 401 `auth.token.invalid`, as `SetWhatsapp` does), status `approved` (403 `user.status.notApproved`), the version's shape (422 `schoolRules.version.required` when missing or `null`; 422 `schoolRules.version.integer` when it isn't an integer number — e.g. `"3"`, `2.5`), current version 0 (422 `schoolRules.version.nothingToAccept`), version ≠ current (409 `schoolRules.version.outdated`). A version already accepted skips the write (D-06). | One predictable answer per request; the status comes first as in every other use case of the project. |
| D-09 | `acceptedAt` comes from auth's `ClockProvider` (backend: `SystemClockProvider`), injected into `AcceptSchoolRules`. | Tests control the time; same pattern as the sign-in code use cases. |
| D-10 | One mapper in `modules/auth/src/user/usecase/account.out.ts` — `AccountOut` (`{ id, name, email, role, status, createdAt, whatsappNumber, whatsappVisible, rulesAccepted }`) and `toAccountOut(user, currentRulesVersion)` — builds the account shape for `GetCurrentUser`, `SetWhatsapp`, `VerifySignInCode`, `RefreshSession` and `AcceptSchoolRules`. `GetCurrentUserOut` and `SetWhatsappOut` become aliases of `AccountOut`; the `user` of `VerifySignInCodeOut` and `RefreshSessionOut` is `AccountOut`. Exported from `@rochas-surf-school/auth`. | Five answers carry the same account; one mapper keeps them from drifting. |

## Expected Results

### ER-01 — An approved account accepts the current version

- **Front:** backend
- **Behavior:** Given an approved student with no acceptance and the current rules version is 3, when they call
  `POST /school-rules/acceptances` with a valid access token and `{ "version": 3 }`, then the API answers 200
  with the account `{ id, name, email, role, status, createdAt, whatsappNumber, whatsappVisible, rulesAccepted }`
  with `rulesAccepted: true`, and `user_rules_acceptances` holds one row for that user with `version = 3` and an
  `accepted_at` set to the time of the request. Acceptances of earlier versions stay stored.
- **Edge and error cases:** an instructor and an admin get the same result (D-05); an approved account without a
  WhatsApp number can accept (D-05).
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/school-rules-acceptance.e2e-spec.ts -t "accepts the current version"`
  (from `apps/backend`), and `npm test --workspace @rochas-surf-school/school-rules -- -t "AcceptSchoolRules"`.

### ER-02 — Accepting the same version again changes nothing

- **Front:** backend
- **Behavior:** Given an approved user who already accepted the current version 3 at time T, when they call
  `POST /school-rules/acceptances` with `{ "version": 3 }` again, then the API answers 200 with
  `rulesAccepted: true`, and there is still exactly one row for that user and version 3, with `accepted_at = T`.
- **Edge and error cases:** two concurrent requests for the same version both answer 200 and leave one row
  (D-07).
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/school-rules-acceptance.e2e-spec.ts -t "already accepted"`
  (from `apps/backend`) and `npx vitest run src/modules/auth/user.prisma.spec.ts -t "addRulesAcceptance"`.

### ER-03 — An outdated version is refused

- **Front:** backend
- **Behavior:** Given the current rules version is 4, when an approved user calls `POST /school-rules/acceptances`
  with `{ "version": 3 }`, then the API answers 409 with `errors: ["schoolRules.version.outdated"]` and
  `details: { currentVersion: 4 }`, and no acceptance is stored.
- **Edge and error cases:** a version above the current one (`5`) and a negative one (`-1`) answer the same 409.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/school-rules-acceptance.e2e-spec.ts -t "outdated"`
  (from `apps/backend`).

### ER-04 — A missing or non-integer version is refused

- **Front:** backend
- **Behavior:** Given an approved user and a current version above 0, when they call
  `POST /school-rules/acceptances` with no body, `{}` or `{ "version": null }`, then the API answers 422 with
  `errors: ["schoolRules.version.required"]`; with `{ "version": "3" }` or `{ "version": 2.5 }`, it answers 422
  with `errors: ["schoolRules.version.integer"]`. No acceptance is stored in any case.
- **Edge and error cases:** none beyond the five bodies above.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/school-rules-acceptance.e2e-spec.ts -t "invalid version"`
  (from `apps/backend`).

### ER-05 — Nothing to accept while the version is 0

- **Front:** backend
- **Behavior:** Given the current rules version is 0, when an approved user calls `POST /school-rules/acceptances`
  with `{ "version": 0 }` (or any other integer), then the API answers 422 with
  `errors: ["schoolRules.version.nothingToAccept"]` and no acceptance is stored.
- **Edge and error cases:** a missing or non-integer version still answers ER-04's keys first (D-08).
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/school-rules-acceptance.e2e-spec.ts -t "nothing to accept"`
  (from `apps/backend`).

### ER-06 — Only approved, signed-in accounts accept

- **Front:** backend
- **Behavior:** Given a user whose status is `pending`, `denied`, `deleted` or `removed`, when they call
  `POST /school-rules/acceptances` with a valid token and the current version, then the API answers 403 with
  `errors: ["user.status.notApproved"]` and no acceptance is stored. Without a token, or with an invalid or
  expired one, the API answers 401 with `errors: ["auth.token.invalid"]`.
- **Edge and error cases:** a non-approved user sending an invalid version still gets 403 (status first, D-08).
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/school-rules-acceptance.e2e-spec.ts -t "not approved"`
  and `-t "without a valid token"` (from `apps/backend`).

### ER-07 — `GET /auth/me` says whether the current rules are accepted

- **Front:** backend
- **Behavior:** Given an approved user, `GET /auth/me` answers 200 with `rulesAccepted`:
  - `false` when the current version is above 0 and the user hasn't accepted it;
  - `true` right after they accept it (ER-01);
  - `false` again after an admin adds, edits (with a text change) or deletes a rule (the version goes up);
  - still `true` after an admin only reorders the rules;
  - `true` when the current version is 0.
- **Edge and error cases:** the field is present for every status (a pending account with version > 0 gets
  `false`); an acceptance of an older version doesn't count.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/auth-session.e2e-spec.ts -t "rulesAccepted"`
  (from `apps/backend`), and `npm test --workspace @rochas-surf-school/auth -- -t "toAccountOut"`.

### ER-08 — The other answers that carry the account include `rulesAccepted`

- **Front:** backend
- **Behavior:** The `user` object of `POST /auth/email/verify` (200) and `POST /auth/refresh` (200), and the body
  of `PUT /auth/me/whatsapp` (200), include `rulesAccepted`, computed as in ER-07 — e.g. with current version 2,
  an approved user who accepted version 2 gets `true` from all three, and one who accepted only version 1 gets
  `false`.
- **Edge and error cases:** a sign-up through verify (a new pending account) gets `false` when the version is
  above 0 and `true` when it is 0.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/auth-email.e2e-spec.ts test/auth-session.e2e-spec.ts test/auth-whatsapp.e2e-spec.ts -t "rulesAccepted"`
  (from `apps/backend`).

## Tasks

### Shared (`packages/shared`)

- [x] **T-01** — Add `ConflictError` (409, optional `details`) in `packages/shared/src/error/conflict.error.ts`,
  export it from `packages/shared/src/error/index.ts`, and test it in
  `packages/shared/test/error/conflict.error.test.ts` (status 409, message, details).
  Covers: enabling · Done when: `npm test --workspace @rochas-surf-school/shared -- conflict.error` passes and
  `npx turbo run check-types --filter=@rochas-surf-school/shared` exits 0.
  > ✅ 2026-10-11 — added `ConflictError` (409, optional details), exported and tested; files:
  > `packages/shared/src/error/conflict.error.ts`, `packages/shared/src/error/index.ts`,
  > `packages/shared/test/error/conflict.error.test.ts`; verified: `npm test --workspace @rochas-surf-school/shared -- conflict.error`
  > (2 passed), `npx turbo run check-types --filter=@rochas-surf-school/shared` (exit 0); deviations: none

### Auth module (`modules/auth`)

- [x] **T-02** — Add the `RulesVersionProvider` port (`modules/auth/src/user/provider/rules-version.provider.ts`,
  `getCurrentVersion(): Promise<number>`, exported from the provider barrel), the account mapper
  `modules/auth/src/user/usecase/account.out.ts` (`AccountOut`, `toAccountOut(user, currentRulesVersion)` per
  D-03/D-10, exported), and use them in `GetCurrentUser` and `SetWhatsapp` (provider injected in the
  constructor; `GetCurrentUserOut` / `SetWhatsappOut` become `AccountOut`). Add a fake provider in
  `modules/auth/test/mock/`, tests for `toAccountOut` (version 0, accepted current, accepted only older, none)
  in `modules/auth/test/user/usecase/account.out.test.ts`, and update `get-current-user.usecase.test.ts` and
  `set-whatsapp.usecase.test.ts` for `rulesAccepted`. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-07, ER-08 · Done when: `npm test --workspace @rochas-surf-school/auth` passes and
  `npx turbo run check-types --filter=@rochas-surf-school/auth` exits 0.
  > ✅ 2026-10-11 — added the `RulesVersionProvider` port, `AccountOut` / `toAccountOut`, used them in `GetCurrentUser`
  > and `SetWhatsapp` (provider is the last constructor argument), fake provider and tests; files:
  > `modules/auth/src/user/provider/rules-version.provider.ts`, `modules/auth/src/user/provider/index.ts`,
  > `modules/auth/src/user/usecase/account.out.ts`, `modules/auth/src/user/usecase/index.ts`,
  > `modules/auth/src/user/usecase/get-current-user.usecase.ts`, `modules/auth/src/user/usecase/set-whatsapp.usecase.ts`,
  > `modules/auth/test/mock/fake-rules-version.provider.ts`, `modules/auth/test/mock/index.ts`,
  > `modules/auth/test/user/usecase/account.out.test.ts`, `modules/auth/test/user/usecase/get-current-user.usecase.test.ts`,
  > `modules/auth/test/user/usecase/set-whatsapp.usecase.test.ts`; verified: `npm test --workspace @rochas-surf-school/auth`
  > (220 passed) and `npx turbo run check-types --filter=@rochas-surf-school/auth` (exit 0), both run with T-03's
  > change in place — alone, this commit leaves `RefreshSession` (typed as `GetCurrentUserOut`) failing to type-check
  > until T-03; deviations: none

- [x] **T-03** — Use `toAccountOut` with the injected `RulesVersionProvider` for the `user` of
  `VerifySignInCode` (`modules/auth/src/sign-in-code/usecase/verify-sign-in-code.usecase.ts`) and
  `RefreshSession` (`modules/auth/src/session/usecase/refresh-session.usecase.ts`), and update their tests in
  `modules/auth/test/` (an accepted and a not-accepted case each, and a new sign-up at version 0 and above 0).
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-08 · Done when: `npm test --workspace @rochas-surf-school/auth` passes and
  `npx turbo run check-types --filter=@rochas-surf-school/auth` exits 0.
  > ✅ 2026-10-11 — `VerifySignInCode` and `RefreshSession` build `user` with `toAccountOut` (provider is the last
  > constructor argument); tests cover accepted and not accepted, and a new sign-up at version 0 and above 0; files:
  > `modules/auth/src/sign-in-code/usecase/verify-sign-in-code.usecase.ts`,
  > `modules/auth/src/session/usecase/refresh-session.usecase.ts`,
  > `modules/auth/test/sign-in-code/usecase/verify-sign-in-code.usecase.test.ts`,
  > `modules/auth/test/session/usecase/refresh-session.usecase.test.ts`; verified: `npm test --workspace
  > @rochas-surf-school/auth` (220 passed), `npx turbo run check-types --filter=@rochas-surf-school/auth` (exit 0);
  > deviations: none

- [x] **T-04** — Add `addRulesAcceptance(userId: string, acceptance: RulesAcceptance): Promise<void>` to
  `UserRepository` (`modules/auth/src/user/provider/user.repository.ts`) and implement it in the module's
  in-memory user repository `modules/auth/test/mock/fake-user.repository.ts` (appends unless that version is already stored, which
  keeps the first `acceptedAt`), with tests for both cases. Skill:
  [`module-repository`](../../../.claude/skills/module-repository).
  Covers: ER-01, ER-02 · Done when: `npm test --workspace @rochas-surf-school/auth` passes and
  `npx turbo run check-types --filter=@rochas-surf-school/auth` exits 0.
  > ✅ 2026-10-11 — added `UserRepository.addRulesAcceptance` and its in-memory implementation (appends, keeps the first
  > `acceptedAt`, ignores an unknown user), with tests; files: `modules/auth/src/user/provider/user.repository.ts`,
  > `modules/auth/test/mock/fake-user.repository.ts`, `modules/auth/test/user/provider/user.repository.test.ts`;
  > verified: `npm test --workspace @rochas-surf-school/auth` (223 passed), `npx turbo run check-types
  > --filter=@rochas-surf-school/auth` (exit 0); deviations: none (the backend's `PrismaUserRepository` no longer
  > type-checks until T-06)

### School rules module (`modules/school-rules`)

- [x] **T-05** — Create `AcceptSchoolRules` in
  `modules/school-rules/src/school-rule/usecase/accept-school-rules.usecase.ts` (input
  `{ actor: SchoolRuleActor, version: unknown }`, dependencies `SchoolRuleRepository`, `UserRepository`,
  `ClockProvider`; output `AccountOut`), applying D-02, D-04, D-06 and D-08 in that order, writing with
  `addRulesAcceptance` and answering `toAccountOut(updated user, current version)`. Export it from the usecase
  barrel. Tests in `modules/school-rules/test/school-rule/usecase/accept-school-rules.usecase.test.ts`: accepts
  the current version (each role, without a WhatsApp number), already accepted keeps `acceptedAt` and doesn't
  write, outdated (lower, higher, negative) with `details.currentVersion`, required (missing, `null`), integer
  (`"3"`, `2.5`), nothing to accept at version 0, each non-approved status (403, also with an invalid version),
  unknown user (401). Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-06 · Done when:
  `npm test --workspace @rochas-surf-school/school-rules` passes and
  `npx turbo run lint check-types --filter=@rochas-surf-school/school-rules` exits 0.
  > ✅ 2026-10-11 — added `AcceptSchoolRules` (user → status → version shape → version 0 → outdated → no-op when
  > already accepted → `addRulesAcceptance`) and its tests; the module got its own fake user repository and clock;
  > files: `modules/school-rules/src/school-rule/usecase/accept-school-rules.usecase.ts`,
  > `modules/school-rules/src/school-rule/usecase/index.ts`, `modules/school-rules/test/mock/fake-user.repository.ts`,
  > `modules/school-rules/test/mock/fake-clock.provider.ts`, `modules/school-rules/test/mock/index.ts`,
  > `modules/school-rules/test/school-rule/usecase/accept-school-rules.usecase.test.ts`; verified: `npm test
  > --workspace @rochas-surf-school/school-rules` (113 passed), `npx turbo run lint check-types
  > --filter=@rochas-surf-school/school-rules` (5 tasks successful, after rebuilding `shared` and `auth`);
  > deviations: version 0 / non-integer errors use `ValidationException` (there is no 422 error class besides it); a
  > list as `version` is treated as not an integer (the validator rules look at each item of a list)

### Backend (`apps/backend`)

- [x] **T-06** — Implement `addRulesAcceptance` in `PrismaUserRepository`
  (`apps/backend/src/modules/auth/user.prisma.ts`) with
  `userRulesAcceptance.createMany({ data: [{ userId, version, acceptedAt }], skipDuplicates: true })` (D-07),
  and test it in `apps/backend/src/modules/auth/user.prisma.spec.ts` (`describe("addRulesAcceptance")`: the call
  sent to Prisma). Skill: [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-01, ER-02 · Done when: `npx vitest run src/modules/auth/user.prisma.spec.ts` passes (from
  `apps/backend`).
  > ✅ 2026-10-11 — `PrismaUserRepository.addRulesAcceptance` writes through `userRulesAcceptance.createMany` with
  > `skipDuplicates: true` and doesn't touch `update()`; files: `apps/backend/src/modules/auth/user.prisma.ts`,
  > `apps/backend/src/modules/auth/user.prisma.spec.ts`; verified: `npx vitest run src/modules/auth/user.prisma.spec.ts`
  > (9 passed); deviations: none (`auth.controller.ts` doesn't type-check until T-07 passes the new provider)

- [x] **T-07** — Create `PrismaRulesVersionProvider` in `apps/backend/src/modules/auth/rules-version.prisma.ts`
  (reads the single `rules_versions` row) with `rules-version.prisma.spec.ts`; register it in
  `auth.module.ts` and pass it to `GetCurrentUser`, `SetWhatsapp`, `VerifySignInCode` and `RefreshSession` in
  `auth.controller.ts`; update `auth.controller.spec.ts`. Update the expected account shapes in
  `test/auth-email.e2e-spec.ts`, `test/auth-session.e2e-spec.ts` and `test/auth-whatsapp.e2e-spec.ts`, and add
  the `rulesAccepted` tests ER-07 and ER-08 name (setting `rules_versions` and acceptances through Prisma, and
  changing the rules through the `/school-rules` routes as an admin for the add / edit / delete / reorder
  cases; resetting the version to 0 and the rules between tests). Skill:
  [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-07, ER-08 · Done when: `npx vitest run src/modules/auth` passes and
  `npm run test:e2e --workspace apps/backend` passes for the three auth suites.
  > ✅ 2026-10-11 — `PrismaRulesVersionProvider` (reads the single `rules_versions` row), registered in `AuthModule` and
  > passed to `GetCurrentUser`, `SetWhatsapp`, `VerifySignInCode` and `RefreshSession`; e2e expectations carry
  > `rulesAccepted` and the ER-07 / ER-08 cases were added (admin add / edit / delete / reorder through the
  > `/school-rules` routes, acceptances and versions through Prisma); files:
  > `apps/backend/src/modules/auth/rules-version.prisma.ts`, `apps/backend/src/modules/auth/rules-version.prisma.spec.ts`,
  > `apps/backend/src/modules/auth/auth.module.ts`, `apps/backend/src/modules/auth/auth.controller.ts`,
  > `apps/backend/src/modules/auth/auth.controller.spec.ts`, `apps/backend/test/auth-email.e2e-spec.ts`,
  > `apps/backend/test/auth-session.e2e-spec.ts`, `apps/backend/test/auth-whatsapp.e2e-spec.ts`,
  > `apps/backend/vitest.config.e2e.ts`; verified: `npx vitest run src/modules/auth` (92 passed),
  > `npx vitest run --config vitest.config.e2e.ts test/auth-email.e2e-spec.ts test/auth-session.e2e-spec.ts
  > test/auth-whatsapp.e2e-spec.ts` (99 passed; 12 with `-t "rulesAccepted"`), `npx tsc --noEmit` (clean);
  > deviations: set `fileParallelism: false` in `vitest.config.e2e.ts` — the e2e suites now share the single
  > `rules_versions` row, so running files side by side would race

- [x] **T-08** — Expose `POST /school-rules/acceptances` (protected, `@HttpCode(200)`, body
  `Partial<{ version: unknown }> | undefined`) in `apps/backend/src/modules/school-rules/school-rules.controller.ts`,
  constructing `AcceptSchoolRules` with `PrismaSchoolRuleRepository`, `PrismaUserRepository` and
  `SystemClockProvider` (provided in `school-rules.module.ts`); test it in `school-rules.controller.spec.ts`; add
  the e2e suite `apps/backend/test/school-rules-acceptance.e2e-spec.ts` with the tests ER-01 to ER-06 name
  (`accepts the current version`, `already accepted`, `outdated`, `invalid version`, `nothing to accept`,
  `not approved`, `without a valid token`), checking the stored rows through Prisma; and add the requests to
  `school-rules.integration.http`. Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-06 · Done when:
  `npx vitest run src/modules/school-rules` passes and
  `npx vitest run --config vitest.config.e2e.ts test/school-rules-acceptance.e2e-spec.ts` passes (from
  `apps/backend`).
  > ✅ 2026-10-11 — `POST /school-rules/acceptances` (protected, 200) builds `AcceptSchoolRules` with the Prisma school
  > rule and user repositories and `SystemClockProvider`, both provided in `SchoolRulesModule`; controller spec, the
  > e2e suite (24 tests, rows checked through Prisma, including two concurrent requests) and the `.http` requests
  > were added; files: `apps/backend/src/modules/school-rules/school-rules.controller.ts`,
  > `apps/backend/src/modules/school-rules/school-rules.controller.spec.ts`,
  > `apps/backend/src/modules/school-rules/school-rules.module.ts`,
  > `apps/backend/src/modules/school-rules/school-rules.integration.http`,
  > `apps/backend/test/school-rules-acceptance.e2e-spec.ts`; verified: `npx vitest run src/modules/school-rules`
  > (26 passed), `npx vitest run --config vitest.config.e2e.ts test/school-rules-acceptance.e2e-spec.ts`
  > (24 passed), whole backend e2e (173 passed) and unit (150 passed), `npx oxlint --type-aware` clean;
  > deviations: none in the task itself; at the user's request, afterwards, `PrismaSchoolRuleRepository.findById` (spec 010's code)
  > now checks ids with shared's `UuidRule` instead of its own regex (`apps/backend/src/modules/school-rules/school-rule.prisma.ts`;
  > backend unit 26 and e2e 173 passed) — it only accepts v4 ids, which every id the app generates is

### Verification

- [x] **T-09** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every Verification Plan command exits 0, with `COVERAGE OK` and
  `E2E PASSED` printed
  > ✅ 2026-10-11 — ran the whole Verification Plan from the repo root; files: none; verified:
  > `node .specs/scripts/run-related-tests.mjs 011` (RELATED TESTS PASSED: backend, auth, school-rules, shared and the
  > whole mobile suite, 467 passed), `node .specs/scripts/check-coverage.mjs 011` (COVERAGE OK, 11 files),
  > `node .specs/scripts/run-e2e.mjs 011` (E2E PASSED), unit tests of the packages (shared 121, auth 223,
  > school-rules 113 passed), `npx turbo run lint check-types build --concurrency=1 --filter=…` for shared, auth,
  > school-rules and backend (11 tasks successful), `npx turbo run check-types --filter=@rochas-surf-school/mobile`
  > (4 successful); deviations: with the default concurrency, `backend:build` (`prisma generate`) failed alongside
  > the lint tasks twice and passes alone and with `--concurrency=1` — a race between the tasks, not a change of
  > this spec (the backend build and the mobile type check pass)

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 011` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 011` — every line this spec adds or changes is covered
  - `node .specs/scripts/run-e2e.mjs 011` — the backend e2e suite passes, `test/school-rules-acceptance.e2e-spec.ts`
    and the `rulesAccepted` tests of the three auth suites included (local database up with
    `npm run db:start --workspace apps/backend` and `npm run prisma:migrate:deploy --workspace apps/backend`)
  - `npm test --workspace @rochas-surf-school/shared`, `npm test --workspace @rochas-surf-school/auth`,
    `npm test --workspace @rochas-surf-school/school-rules` — the unit tests of the touched packages pass
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/shared --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/school-rules --filter=@rochas-surf-school/backend`
    — lint, type check and build of the touched workspaces pass
  - `npx turbo run check-types --filter=@rochas-surf-school/mobile` — the mobile app still type-checks against
    the changed packages
- User journeys: none — this spec has no screen; the API behavior is covered by the e2e suite.

## Memory Impact

- `memory/product.md` — Current state: accepting the school rules on the backend, and `rulesAccepted` on the
  account; no screen yet, so onboarding still can't be completed in the app.
- `memory/technical-context.md` — Authentication: the account shape gains `rulesAccepted` (D-03, D-04) on
  `GET /auth/me`, verify, refresh and `PUT /auth/me/whatsapp`; `packages/shared` error list gains
  `ConflictError` (409); the `RulesVersionProvider` port as the way `auth` reads the version without depending
  on `school-rules`.
- `memory/structure.md` — `modules/auth`: `account.out.ts`, `rules-version.provider.ts`,
  `UserRepository.addRulesAcceptance`; `modules/school-rules`: `accept-school-rules.usecase.ts`;
  `apps/backend`: `rules-version.prisma.ts`, the `POST /school-rules/acceptances` route,
  `test/school-rules-acceptance.e2e-spec.ts`; `packages/shared`: `conflict.error.ts`.
- `memory/modules.md` — School rules: accepting the current version is now here (stored on the account in
  Authentication), no longer "comes with the onboarding School rules spec".
- `memory/modules/school-rules.md` — acceptance rules (current version only, version 0 needs none, repeat is a
  no-op, error keys and order), who can accept (every approved role), and the updated Boundaries.
- `memory/modules/auth.md` — accepted versions written through `addRulesAcceptance`; `rulesAccepted` on the
  account and how it's computed.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review

### Round 1 — 2026-10-11 — accepted

**Checks**

- lint ✅ · type check ✅ · build ✅ (shared, auth, school-rules, backend; 11 tasks, uncached, default
  concurrency — the build race noted in T-09 didn't reproduce) · mobile type check ✅
- related tests ✅ RELATED TESTS PASSED (backend, auth, school-rules, shared, whole mobile suite 467 passed);
  package unit tests: shared 121, auth 223, school-rules 113 passed
- coverage of the changed lines ✅ COVERAGE OK — 11 files measured, 100% on every changed line; no
  coverage-ignore comments in the diff
- e2e: backend suite ✅ E2E PASSED (5 files, 173 passed)

**Expected Results**

- ER-01 ✅ — `-t "accepts the current version"` 4 passed: 200 with the full account and `rulesAccepted: true`
  for student, instructor and admin, with and without a WhatsApp number; rows `[2, 3]` (the older acceptance
  stays), `accepted_at` at request time; unit `-t "AcceptSchoolRules"` 26 passed
- ER-02 ✅ — `-t "already accepted"` 2 passed: one row, original `accepted_at` kept; two concurrent requests
  both 200, one row; `user.prisma.spec.ts -t "addRulesAcceptance"` asserts `createMany` + `skipDuplicates`
- ER-03 ✅ — `-t "outdated"` 3 passed: 3, 5 and -1 at version 4 → 409 `schoolRules.version.outdated`,
  `details: { currentVersion: 4 }`, no row
- ER-04 ✅ — `-t "invalid version"`: no body, `{}`, `null` → 422 `required`; `"3"`, `2.5` → 422 `integer`; no
  row
- ER-05 ✅ — `-t "nothing to accept"` 3 passed: 0 and 3 at version 0 → 422 `nothingToAccept`; `"0"` answers
  `integer` first (D-08)
- ER-06 ✅ — `-t "not approved"` 4 passed (pending, denied, deleted, removed → 403, also with an invalid or
  missing version, no row); `-t "without a valid token"` 2 passed (no token, malformed → 401)
- ER-07 ✅ — `auth-session -t "rulesAccepted"` 6 passed: version 0 → true; add → false; accept → true; reorder
  keeps true; edit and delete → false; an older acceptance doesn't count; pending account gets the field;
  unit `-t "toAccountOut"` 6 passed
- ER-08 ✅ — three suites `-t "rulesAccepted"` 12 passed: verify, refresh and `PUT /auth/me/whatsapp` give
  true for the current version and false for only an older one; a new sign-up gets true at 0, false at 3

**Findings**

None.

**Notes**

- D-01 to D-10 are honored; the check order in `AcceptSchoolRules` matches D-08 exactly.
- Memory Impact misses one item for `spec-finish`: `technical-context.md` → Automated validation should say
  the backend e2e files now run one at a time (`fileParallelism: false` in `vitest.config.e2e.ts`) because
  they share the `rules_versions` row.
- ER-06 mentions an expired token; the acceptance suite tests none and malformed. The JWT guard is global and
  its expiry case is covered by the existing auth suites, so this is not a gap.
- `modules/school-rules/test/mock/fake-user.repository.ts` copies auth's in-memory repository, because
  auth's test mocks aren't part of its package. If a third module needs it, consider exporting test fakes from
  `@rochas-surf-school/auth`.
- `school-rules.integration.http`: the "Accept while no rule was ever written" entry is a heading with no
  request under it. Harmless, but a request with `{ "version": 0 }` would make it runnable.

### Round 2 — 2026-10-11 — accepted

Scope: only `ef8b5da` (made after round 1, at the user's request), which changes
`PrismaSchoolRuleRepository.findById` (spec 010's code) to check ids with shared's `UuidRule` instead of its
own regex. The user asked to finish without a full new review; this round checks the change and reruns the
gates.

**Checks**

- related tests ✅ RELATED TESTS PASSED · coverage ✅ COVERAGE OK (12 files; `school-rule.prisma.ts` 100%) ·
  e2e ✅ E2E PASSED
- backend lint · check-types · build ✅ (11 tasks, uncached, both serial and at default concurrency). One earlier
  run failed in `check-types` → `prisma generate`, and the same command then passed twice. This is the
  intermittent race between tasks that T-09 noted, not caused by this change.

**Findings**

None. The behavior changes in one way: a well-formed UUID that isn't v4 now answers 404 without a database
read. Every id the app creates is v4 (`Entity` uses `uuidv4()`), so no stored rule becomes unreachable.

**Notes**

- `apps/backend`'s `check-types` and `build` both run `prisma generate`, so running them in parallel with turbo
  sometimes fails. A separate fix could make one depend on the other or move generation into its own task.
