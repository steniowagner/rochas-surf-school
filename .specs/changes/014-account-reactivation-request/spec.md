---
id: "014"
slug: account-reactivation-request
title: Account answer for closed accounts and the reactivation request
status: in-progress
created: 2026-10-11
started: 2026-10-11
base_commit: 8a98005fd50cc760b6e3ee41b01e1de1da8f62d3
fronts: [auth, backend]
depends_on: []
---

# 014 — Account answer for closed accounts and the reactivation request

## Goal

A signed-in account learns, from the account answer it already receives, everything its closed-account screen
needs: the reason its registration was denied and whether a reactivation request was sent or denied. A deleted
account can send its one reactivation request through the backend. This is the backend half of the Denied and
Account deleted screens, which spec 016 builds in the app; the school's WhatsApp number for the contact buttons
comes with spec 015.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: **User** (lifecycle `denied`, `deleted`),
  **Reactivation request** (one per account, `requested` → `approved` | `denied`), and the decision "Deleting
  and removing are different".
- Requirements: [requirements.md → One reactivation request](../../../.docs/requirements.md#one-reactivation-request)
  — a deleted account sends one request from the app, and after a denial can't send another;
  [requirements.md → Denied registration screen](../../../.docs/requirements.md#denied-registration-screen) — the
  denied person sees the reason when one was given (this spec only makes the reason available; the screen and
  the contact button come with specs 015 and 016).
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Authentication (the
  account shape, every request reloading role and status), the backend's error mapping (`ForbiddenError` 403,
  `ConflictError` 409, `UnauthorizedError` 401), Automated validation (Vitest unit and e2e suites).
- Module: [modules/auth.md](../../memory/modules/auth.md) — Accounts (the `reactivationStatus` and denial
  reason fields already exist), "Any status gets a session".
- Existing code this builds on:
  - `modules/auth/src/user/model/user.entity.ts` — `User` already has `denialReason`, `deniedAt`, `removedAt`,
    `reactivationStatus` (`requested` | `denied`) and `deletedAt`, stored in the `users` table
    (`apps/backend/prisma/models/auth.model.prisma`) and mapped in `apps/backend/src/modules/auth/user.prisma.ts`.
  - `modules/auth/src/user/usecase/account.out.ts` — `toAccountOut`, the single mapper of every account answer
    (`GET /auth/me`, `POST /auth/email/verify`, `POST /auth/refresh`, `PUT /auth/me/whatsapp`,
    `POST /school-rules/acceptances`). It doesn't return the denial reason or the reactivation status today.
  - `modules/auth/src/user/usecase/set-whatsapp.usecase.ts` — the pattern for a use case on the signed-in
    account (load → status check → change → `userRepository.update` → `toAccountOut`).
  - `modules/auth/src/sign-in-code/provider/clock.provider.ts` — `ClockProvider`, implemented by
    `SystemClockProvider` in the backend and `fake-clock.provider.ts` in the module's tests.
- Design: [auth-flow.html](../../../.docs/designs/auth-flow.html) → Alternative states — LOGIN-09 and LOGIN-10
  (one screen, three states: not requested, requested, denied), the screens spec 016 builds from this data.
- Follow-ups: spec 015 (`school-settings-whatsapp`) and spec 016 (`closed-account-screens`, depends on 014 and
  015).

## Scope

### In scope

- `denialReason` and `reactivationStatus` on every account answer, for every status.
- `POST /auth/me/reactivation-request`: a deleted account sends its one reactivation request.
- Storing when the request was sent (`reactivationRequestedAt`, one nullable column and its migration).

### Out of scope

- Notifying admins of a request, and notifying the person of the decision (there is no notifications module).
- The admin side: listing, approving or denying reactivation requests, restoring removed accounts, and what an
  approved reactivation restores.
- Checking the 30-day reactivation window, and erasing accounts after it (see Assumptions).
- Deleting an account, removing one, and approving or denying registrations — nothing in this spec puts an
  account into `deleted`, `denied` or `removed`.
- The school's WhatsApp number (spec 015) and every screen (spec 016).
- Returning `deletedAt`, `deniedAt`, `removedAt` or `reactivationRequestedAt` in the account answer.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The closed-account work is planned as three specs: 014 (this one: account data and the reactivation request), 015 (the school's WhatsApp number in a new `school-settings` module) and 016 (the mobile screens, depending on both). | Each is reviewable as one concept; 014 and 015 touch different modules and can run in parallel. |
| D-02 | Every account answer has the same shape for every status: `denialReason` is the stored reason or `null`; `reactivationStatus` is the stored value (`"requested"` or `"denied"`) or `null`. Neither depends on the status. | One shape everywhere, like `rulesAccepted` (spec 011): the app routes from a single object, and only the account itself receives this answer. |
| D-03 | `reactivationRequestedAt` is stored but not returned in the account answer. | No screen needs it; it exists so the future admin tool can list requests in the order they were sent. |
| D-04 | `POST /auth/me/reactivation-request` (protected, no body) answers **200** with the account (`AccountOut`). It checks, in this order: the account exists (else 401 `auth.token.invalid`); its status is `deleted` (else 403 `user.status.notDeleted`); its request wasn't denied (else 409 `user.reactivation.denied`); already `requested` → answer 200 with the account and write nothing; otherwise store `reactivationStatus = "requested"` and `reactivationRequestedAt` = the clock's now, then answer. The status stays `deleted`. | A fixed order makes every combination decidable (e.g. a removed account with a stored `denied` reactivation status answers 403, not 409). |
| D-05 | A repeated request answers 200 and changes nothing, keeping the first `reactivationRequestedAt`. | A double tap or a retry must never fail, as accepting the school rules again doesn't (spec 011). |
| D-06 | The request is refused with the shared `ForbiddenError` (403) for a wrong status and `ConflictError` (409) for a denied request; no new error class. | Both already exist in `packages/shared` and map to those statuses. |
| D-07 | The new column is `reactivation_requested_at` (`reactivationRequestedAt DateTime?`) on `users`, added by a migration in `apps/backend/prisma/migrations` named after the module (`<timestamp>_auth_reactivation_requested_at`); no backfill. | No account can be deleted yet, so no existing row has a request. |

## Expected Results

### ER-01 — Every account answer carries the denial reason and the reactivation status

- **Front:** backend
- **Behavior:** Given an account, when it receives any account answer (`GET /auth/me`, `POST /auth/email/verify`
  for an existing account, `POST /auth/refresh`, `PUT /auth/me/whatsapp`, `POST /school-rules/acceptances`),
  then the `user` (or the body, for `GET /auth/me`, `PUT /auth/me/whatsapp` and the acceptance) has
  `denialReason` and `reactivationStatus` as stored (D-02).
- **Edge and error cases:** a denied account with a reason → `denialReason` is that text; a denied account
  without one → `null`; an approved or pending account → both `null`; a deleted account with
  `reactivationStatus` `"requested"` or `"denied"` → that value; `deniedAt`, `deletedAt`, `removedAt` and
  `reactivationRequestedAt` never appear in the answer.
- **Verify by:** `npx vitest run test/user/usecase/account.out.test.ts` (from `modules/auth`), and the e2e test
  `closed account fields` in `apps/backend/test/auth-session.e2e-spec.ts` (`GET /auth/me` for a denied account
  with and without a reason and for a deleted account with each reactivation status), plus the updated account
  shapes in `auth-email`, `auth-session`, `auth-whatsapp` and `school-rules-acceptance` e2e suites.

### ER-02 — A deleted account sends its reactivation request

- **Front:** backend
- **Behavior:** Given a deleted account with no reactivation status, when it calls
  `POST /auth/me/reactivation-request` with a valid access token, then the API answers 200 with the account,
  whose `status` is `"deleted"` and `reactivationStatus` is `"requested"`, and the `users` row stores
  `reactivation_status = 'requested'` and `reactivation_requested_at` set to the time of the request.
- **Edge and error cases:** any body is ignored; the account's role doesn't matter (student, instructor or
  admin).
- **Verify by:** `npx vitest run test/user/usecase/request-reactivation.usecase.test.ts` (from `modules/auth`)
  and the e2e test `sends the request` in `apps/backend/test/auth-reactivation.e2e-spec.ts` (checks the row
  through Prisma).

### ER-03 — Repeating the request changes nothing

- **Front:** backend
- **Behavior:** Given a deleted account whose reactivation status is `requested`, when it calls
  `POST /auth/me/reactivation-request` again, then the API answers 200 with the account
  (`reactivationStatus: "requested"`) and the stored `reactivation_requested_at` is the first one.
- **Edge and error cases:** two calls at the same moment both answer 200, and the account ends `requested`.
- **Verify by:** the `already requested` test in `request-reactivation.usecase.test.ts` (no write) and the e2e
  test `already requested` in `auth-reactivation.e2e-spec.ts` (the stored date is unchanged).

### ER-04 — A denied request can't be sent again

- **Front:** backend
- **Behavior:** Given a deleted account whose reactivation status is `denied`, when it calls
  `POST /auth/me/reactivation-request`, then the API answers 409 with `errors: ["user.reactivation.denied"]` and
  the row is unchanged (`reactivation_status` stays `denied`).
- **Edge and error cases:** none beyond D-04's order.
- **Verify by:** the `denied` test in `request-reactivation.usecase.test.ts` and the e2e test `request denied`
  in `auth-reactivation.e2e-spec.ts`.

### ER-05 — Only a deleted account can request reactivation

- **Front:** backend
- **Behavior:** Given an account whose status is `pending`, `approved`, `denied` or `removed`, when it calls
  `POST /auth/me/reactivation-request`, then the API answers 403 with `errors: ["user.status.notDeleted"]` and
  nothing is stored.
- **Edge and error cases:** a removed account with a stored `reactivationStatus` of `denied` still answers 403
  (status is checked first, D-04); a missing, malformed or expired access token, or one naming an account that
  no longer exists, answers 401 `auth.token.invalid`.
- **Verify by:** the `not deleted` (each status) and `unknown account` tests in
  `request-reactivation.usecase.test.ts`, and the e2e tests `not deleted` and `without a valid token` in
  `auth-reactivation.e2e-spec.ts`.

## Tasks

### Auth module (`modules/auth`)

- [x] **T-01** — Add `reactivationRequestedAt?: Date` to `User` in `modules/auth/src/user/model/user.entity.ts`
  (props, getter, validated as an optional date like `deletedAt`), and add `denialReason: string | null` and
  `reactivationStatus: UserReactivationStatus | null` to `AccountOut` / `toAccountOut` in
  `modules/auth/src/user/usecase/account.out.ts` (D-02, D-03). Update
  `modules/auth/test/user/model/user.entity.test.ts` (the new field, valid and invalid) and
  `modules/auth/test/user/usecase/account.out.test.ts` (reason present / absent, each reactivation status /
  none), and the expected account shapes in the module's other use case tests that compare whole answers.
  Skill: [`module-entity`](../../../.claude/skills/module-entity).
  Covers: ER-01 · Done when: `npm test --workspace @rochas-surf-school/auth` passes and
  `npx turbo run check-types --filter=@rochas-surf-school/auth` exits 0.
  > ✅ 2026-10-11 — `User` gains `reactivationRequestedAt` (state, getter, `DateRule` →
  > `user.reactivationRequestedAt.invalid.date`); `AccountOut` / `toAccountOut` return `denialReason` and
  > `reactivationStatus` (stored value or `null`), no dates. Tests: entity getter/undefined/invalid date;
  > `account.out.test.ts` full shape, denied with/without reason, deleted with `requested`/`denied`, dates never
  > returned; whole-answer shapes updated in the get-current-user, set-whatsapp, refresh-session and
  > verify-sign-in-code tests (watched them fail first). files: `modules/auth/src/user/model/user.entity.ts`,
  > `modules/auth/src/user/usecase/account.out.ts`, `modules/auth/test/user/model/user.entity.test.ts`,
  > `modules/auth/test/user/usecase/account.out.test.ts`,
  > `modules/auth/test/user/usecase/get-current-user.usecase.test.ts`,
  > `modules/auth/test/user/usecase/set-whatsapp.usecase.test.ts`,
  > `modules/auth/test/session/usecase/refresh-session.usecase.test.ts`,
  > `modules/auth/test/sign-in-code/usecase/verify-sign-in-code.usecase.test.ts`; verified:
  > `npm test --workspace @rochas-surf-school/auth` (231 passed), `npx turbo run check-types
  > --filter=@rochas-surf-school/auth` (1 successful); deviations: `module-entity` skill applied by hand to the
  > existing entity (one optional field); the school-rules acceptance test uses `toMatchObject`, so it needed no
  > change.

- [x] **T-02** — Create `RequestReactivation` in
  `modules/auth/src/user/usecase/request-reactivation.usecase.ts` (input `{ userId: string }`, dependencies
  `UserRepository`, `RulesVersionProvider`, `ClockProvider`; output `AccountOut`) applying D-04 and D-05 in
  that order, writing with `userRepository.update`, and export it from the usecase barrel. Tests in
  `modules/auth/test/user/usecase/request-reactivation.usecase.test.ts`: `sends the request` (stored status and
  date from the fake clock, answer with `requested`, status still `deleted`), `already requested` (no write,
  first date kept), `denied` (409 `user.reactivation.denied`, no write), `not deleted` (pending, approved,
  denied, removed — and removed with a denied reactivation status — 403 `user.status.notDeleted`),
  `unknown account` (401 `auth.token.invalid`). Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-02, ER-03, ER-04, ER-05 · Done when: `npm test --workspace @rochas-surf-school/auth` passes and
  `npx turbo run lint check-types --filter=@rochas-surf-school/auth` exits 0.
  > ✅ 2026-10-11 — `RequestReactivation` (`In { userId }`, `Out = AccountOut`; `UserRepository`,
  > `RulesVersionProvider`, `ClockProvider`) checks in D-04's order: unknown → `UnauthorizedError`
  > `auth.token.invalid`, not `deleted` → `ForbiddenError` `user.status.notDeleted`, `denied` → `ConflictError`
  > `user.reactivation.denied`, `requested` → answers without writing (D-05), otherwise clones with
  > `reactivationStatus: "requested"` and `reactivationRequestedAt` = clock now, validates and
  > `userRepository.update`s; exported from the usecase barrel. Tests (written first, 11 failing before the
  > class existed): `sends the request` (each role), `already requested`, `denied`, `not deleted` (pending,
  > approved, denied, removed, and removed with a denied reactivation status), `unknown account`; writes
  > checked with a spy on the fake repository's `update`. files:
  > `modules/auth/src/user/usecase/request-reactivation.usecase.ts`, `modules/auth/src/user/usecase/index.ts`,
  > `modules/auth/test/user/usecase/request-reactivation.usecase.test.ts`; verified:
  > `npm test --workspace @rochas-surf-school/auth` (242 passed; the use case 100% statements/branches/
  > functions/lines), `npx turbo run lint check-types --filter=@rochas-surf-school/auth` (2 successful);
  > deviations: none.

### Backend (`apps/backend`)

- [ ] **T-03** — Add `reactivationRequestedAt DateTime? @map("reactivation_requested_at")` to `User` in
  `apps/backend/prisma/models/auth.model.prisma`, generate the migration
  `apps/backend/prisma/migrations/<timestamp>_auth_reactivation_requested_at/` (D-07), and map the field both
  ways in `apps/backend/src/modules/auth/user.prisma.ts`, with the cases in `user.prisma.spec.ts`. Skill:
  [`backend-prisma-sync-module`](../../../.claude/skills/backend-prisma-sync-module).
  Covers: ER-02 · Done when: `npm run prisma:migrate:deploy --workspace apps/backend` applies the migration on
  the local database and `npx vitest run src/modules/auth/user.prisma.spec.ts` passes (from `apps/backend`).

- [ ] **T-04** — Update the expected account shapes (`denialReason`, `reactivationStatus`) in
  `apps/backend/test/auth-email.e2e-spec.ts`, `auth-session.e2e-spec.ts`, `auth-whatsapp.e2e-spec.ts` and
  `school-rules-acceptance.e2e-spec.ts`, and add the test `closed account fields` to `auth-session.e2e-spec.ts`
  (accounts set through Prisma: denied with a reason, denied without one, deleted with `requested`, deleted with
  `denied`; `GET /auth/me` returns the fields and none of the dates). Covers: ER-01 · Done when:
  `npx vitest run --config vitest.config.e2e.ts test/auth-email.e2e-spec.ts test/auth-session.e2e-spec.ts test/auth-whatsapp.e2e-spec.ts test/school-rules-acceptance.e2e-spec.ts`
  passes (from `apps/backend`, local database up).

- [ ] **T-05** — Expose `POST /auth/me/reactivation-request` (protected, `@HttpCode(200)`, no body) in
  `apps/backend/src/modules/auth/auth.controller.ts`, constructing `RequestReactivation` with
  `PrismaUserRepository`, the rules version provider and `SystemClockProvider`; test it in
  `auth.controller.spec.ts`; add the e2e suite `apps/backend/test/auth-reactivation.e2e-spec.ts` with the tests
  ER-02 to ER-05 name (`sends the request`, `already requested`, `request denied`, `not deleted`,
  `without a valid token`), putting accounts in each state through Prisma and checking the rows; and add the
  requests to `apps/backend/src/modules/auth/auth.integration.http`. Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-02, ER-03, ER-04, ER-05 · Done when: `npx vitest run src/modules/auth` passes and
  `npx vitest run --config vitest.config.e2e.ts test/auth-reactivation.e2e-spec.ts` passes (from
  `apps/backend`).

### Verification

- [ ] **T-06** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every Verification Plan command exits 0, with `COVERAGE OK` and
  `E2E PASSED` printed.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 014` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 014` — every line this spec adds or changes is covered
  - `node .specs/scripts/run-e2e.mjs 014` — the backend e2e suite passes, `test/auth-reactivation.e2e-spec.ts`
    and the `closed account fields` test included (local database up with
    `npm run db:start --workspace apps/backend` and `npm run prisma:migrate:deploy --workspace apps/backend`)
  - `npm test --workspace @rochas-surf-school/auth` — the module's unit tests pass
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/backend`
    — lint, type check and build of the touched workspaces pass
  - `npx turbo run check-types --filter=@rochas-surf-school/school-rules --filter=@rochas-surf-school/mobile` —
    the workspaces that use `AccountOut` still type-check
- User journeys: none — this spec has no screen; the API behavior is covered by the e2e suite.

## Memory Impact

- `memory/product.md` — Current state: the backend tells an account its denial reason and reactivation status,
  and a deleted account can send its one reactivation request; admins aren't notified and can't decide it yet,
  and no screen uses it (spec 016).
- `memory/technical-context.md` — Authentication: the account shape gains `denialReason` and
  `reactivationStatus` on every account answer; the `POST /auth/me/reactivation-request` route.
- `memory/structure.md` — `modules/auth`: `request-reactivation.usecase.ts`; `apps/backend`: the
  `reactivation_requested_at` migration, the `POST /auth/me/reactivation-request` route,
  `test/auth-reactivation.e2e-spec.ts`.
- `memory/modules/auth.md` — Accounts: `reactivationRequestedAt`, the account answer's new fields; the
  reactivation request rules (D-04, D-05) and its error keys; Who can do what: a deleted account sends one
  reactivation request; Boundaries: deciding reactivation requests is still to be specified; Spec history.

## Assumptions

- The 30-day reactivation window isn't checked when a request is sent (D-04). Accepted because nothing can
  delete an account yet, so no account can be past its window; the spec that builds erasure removes accounts
  30 days after deletion, which closes the case for good.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
