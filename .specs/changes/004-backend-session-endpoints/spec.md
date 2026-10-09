---
id: "004"
slug: backend-session-endpoints
title: Current account, session renewal and sign-out on the backend
status: in-progress
created: 2026-10-09
started: 2026-10-09
base_commit: 465ac664b79a5ad5bf845f8ce1297f1e9edd4102
fronts: [auth, backend]
depends_on: []
---

# 004 — Current account, session renewal and sign-out on the backend

## Goal

The backend can tell a signed-in app who the account is — including its role, its status and when it was
created — renew a session before the 15-minute access token runs out, and end a session on sign-out. Every
protected request reloads the account's role and status, so a change takes effect immediately rather than when
the token expires. This is the backend contract the app needs to keep a session, route by role and status (the
waiting-for-approval screen) and sign out; the app side is a later spec.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: User (role, status, lifecycle: a pending
  account sees only its approval state); Current state ("renewing a session, signing out … don't exist yet").
- Requirements:
  [requirements.md → Signing out](../../../.docs/requirements.md#signing-out) — users can sign out (this spec
  builds the server half: the session ends on the backend);
  [requirements.md → Registrations wait for approval](../../../.docs/requirements.md#registrations-wait-for-approval)
  — a waiting account only sees that it is waiting (this spec gives the app the status to route on).
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Authentication
  (15-minute access JWT `{ sub, email }`, 30-day refresh token stored as SHA-256 hex with a `family_id` per
  sign-in, rotation and reuse detection "planned for the next auth spec", the guard "reloads the user's status
  and role on every request" decided for the first protected route, `@Public()`, `@CurrentUser()`), Error
  handling (translation-key errors), Architecture (use cases in `modules/*` receive a plain current user),
  Automated validation and Coverage.
- Module: [modules/auth.md](../../memory/modules/auth.md) — "Any status gets a session": a pending, denied,
  deleted or removed account still signs in and learns its status.
- Existing code this builds on:
  - `modules/auth/src/session/` — `RefreshToken` entity (`userId`, `tokenHash`, `familyId`, `expiresAt`,
    optional `revokedAt`), `RefreshTokenRepository` (only `create`), `TokenProvider` (`signAccessToken`,
    `generateRefreshToken` returning `{ token, hash }`), `StartSession` (signs an access token, creates a
    refresh token in a new family).
  - `modules/auth/src/sign-in-code/usecase/verify-sign-in-code.usecase.ts` — returns the session plus
    `user: { id, name, email, role, status }` (no `createdAt`).
  - `modules/auth/src/user/` — `User` entity (inherits `createdAt` from `Entity`), `UserRepository.findById`.
  - `modules/auth/test/mock/` — fakes for every port (`fake-refresh-token.repository.ts`,
    `fake-token.provider.ts`, `fake-user.repository.ts`, `fake-clock.provider.ts`).
  - `apps/backend/src/modules/auth/` — `AuthController` (`POST /auth/email/code`, `POST /auth/email/verify`,
    both `@Public()` and throttled), `PrismaRefreshTokenRepository` (only `create`), `JwtTokenProvider`
    (hashes with SHA-256 hex in `generateRefreshToken`), `PrismaUserRepository`, `auth.integration.http`.
  - `apps/backend/src/shared/auth/` — global `JwtAuthGuard` (skips `@Public()` routes), `JwtStrategy`
    (`validate` maps the payload to `AuthenticatedUser { id, email?, claims }` without touching the database).
    No route is protected yet. A rejected token answers Nest's generic 401 (`errors: ["Unauthorized"]`).
  - `apps/backend/prisma/models/auth.model.prisma` — `refresh_tokens` already has `family_id` (indexed),
    `revoked_at` and `expires_at`: no migration is needed.
  - `apps/backend/test/auth-email.e2e-spec.ts` — e2e setup to copy (env defaults, `createApp`, cleanup by
    e2e email domain).

## Scope

### In scope

- `GET /auth/me` (protected), `POST /auth/refresh` and `POST /auth/sign-out` (both `@Public()`, throttled) in
  `apps/backend`.
- The global guard reloading the user on every protected request, with role and status on the current user,
  and a translation key on its 401.
- In `modules/auth`: `GetCurrentUser`, `RefreshSession` and `SignOut` use cases; new methods on
  `RefreshTokenRepository` and `TokenProvider`; `createdAt` in the user returned by `VerifySignInCode`.
- The Prisma and JWT adapters of those methods; e2e tests and `.integration.http` requests for the three routes.

### Out of scope

- Anything in the mobile app: storing the session, renewing it on a 401, routing by role and status, the
  waiting-for-approval screen, the sign-out button. That is a later spec.
- Google and Apple sign-in.
- Signing out of every device at once ("sign out everywhere"): sign-out ends one sign-in only.
- Blocking requests by status or role in the guard: use cases enforce those rules when they need them.
- Erasing or cleaning up expired and revoked refresh-token rows.
- Changes to the access token's payload or lifetime.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | `POST /auth/sign-out` is `@Public()` and identifies the session by the refresh token in the body `{ "refreshToken": "…" }`, not by the access token. | The access token carries no session or family id, and the app must be able to sign out after its access token expired. |
| D-02 | Sign-out revokes every refresh token of the sent token's family (sets `revoked_at` on the active ones) and always answers 204 — also for an unknown, expired or already-revoked token. Only a missing or non-string `refreshToken` is refused (422 `refreshToken.token.required`). | A family is one sign-in, so other devices stay signed in; an idempotent 204 reveals nothing about the token and lets the app always clear its own data. |
| D-03 | The guard (through `JwtStrategy.validate`) loads the user named by the token's `sub` on every protected request. The current user (`AuthenticatedUser`) carries `id`, `email`, `role` and `status` from the database. The guard never refuses a request because of status or role. | Decided in technical-context → Authentication: a denial, removal, deletion or role change takes effect at once. Permissions stay in the use cases, where they are unit-tested. |
| D-04 | Every 401 the guard answers — no token, malformed, wrong signature, expired, or a user that no longer exists — has `errors: ["auth.token.invalid"]`. | The app reacts the same way to each cause (renew, else sign in again), and one key reveals nothing about why. |
| D-05 | `POST /auth/refresh` rotates: the sent token is revoked with a conditional update (only while `revoked_at` is null), and only if that update changed a row are a new access token and a new refresh token issued, in the same family. A token that is already revoked — reuse, including the loser of two concurrent refreshes — revokes the whole family and answers 401 `auth.refreshToken.invalid`. | Reuse detection as planned in technical-context → Authentication; the atomic update makes concurrent reuse safe. Consequence for the app spec: it must send one refresh at a time. |
| D-06 | The refresh token issued by a rotation expires `REFRESH_TOKEN_EXPIRES_IN_DAYS` (30) days after the rotation. | An active user stays signed in; keeping the family's first expiry would sign everyone out after 30 days however active they are. |
| D-07 | `POST /auth/refresh` answers 200 with the same shape as `POST /auth/email/verify`: `accessToken`, `accessTokenExpiresAt`, `refreshToken`, `refreshTokenExpiresAt`, `user`. In both, and in `GET /auth/me`, `user` is `{ id, name, email, role, status, createdAt }` with `createdAt` as an ISO 8601 UTC string. | One session shape for the app; `createdAt` is what the waiting-for-approval screen shows. |
| D-08 | `POST /auth/refresh` and `POST /auth/sign-out` are throttled like verify: 10 requests per 60 s per IP (`@UseGuards(ThrottlerGuard)` + `@Throttle`), answering 429 `request.rate.limited`. | Both are open routes that take a secret. |
| D-09 | A refresh token is refused with 401 `auth.refreshToken.invalid` when it is unknown, expired (`expires_at` ≤ now), revoked, or its user no longer exists; a missing or non-string `refreshToken` is 422 `refreshToken.token.required`. The status of the account (pending, denied, deleted, removed) does not refuse a refresh. | One key for every refusal reveals nothing; "any status gets a session" (modules/auth.md). |
| D-10 | `GET /auth/me` answers 200 for any account status and gets its data through the `GetCurrentUser` use case; a user missing at that point answers 401 `auth.token.invalid`. | The app needs the status of pending, denied, deleted and removed accounts to show their screens. |
| D-11 | Looking up a refresh token hashes the plaintext with `TokenProvider.hashRefreshToken` (SHA-256 hex, the same as `generateRefreshToken`) and finds the row by `token_hash`; the plaintext is never stored or logged. | Matches how tokens are stored today (technical-context → Authentication). |

## Expected Results

### ER-01 — The current account is returned for any status

- **Front:** backend
- **Behavior:** Given an account signed in through `POST /auth/email/verify`, when the app calls `GET /auth/me`
  with `Authorization: Bearer <accessToken>`, then the API answers 200 with exactly
  `{ id, name, email, role, status, createdAt }` for that account, `createdAt` an ISO 8601 UTC string equal to
  the account's `users.created_at`.
- **Edge and error cases:** an account whose status is `pending`, `approved`, `denied`, `deleted` or `removed`
  gets 200 with that status; the verify response's `user` also includes the same `createdAt`.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/user/usecase/get-current-user.usecase.test.ts`
  and `npm run test:e2e --workspace apps/backend -- test/auth-session.e2e-spec.ts -t "GET /auth/me"`.

### ER-02 — A protected route refuses a bad access token

- **Front:** backend
- **Behavior:** Given a protected route (`GET /auth/me`), when it is called without an `Authorization` header,
  then the API answers 401 with `errors: ["auth.token.invalid"]`.
- **Edge and error cases:** the same 401 and key for a malformed token, a token signed with another secret, an
  expired token, and a valid token whose user was deleted from the database; `@Public()` routes still answer
  without a token.
- **Verify by:** `npx vitest run src/shared/auth` (from `apps/backend`) and
  `npm run test:e2e --workspace apps/backend -- test/auth-session.e2e-spec.ts -t "invalid access token"`.

### ER-03 — Role and status are reloaded on every request

- **Front:** backend
- **Behavior:** Given a pending student with a valid access token, when their `users.status` is set to
  `approved` and their `role` to `instructor` in the database, then the next `GET /auth/me` with the same
  access token answers 200 with `status: "approved"` and `role: "instructor"`.
- **Edge and error cases:** the current user given to controllers (`@CurrentUser()`) carries `role` and
  `status` read from the database on that request, not from the token.
- **Verify by:** `npx vitest run src/shared/auth/jwt.strategy.spec.ts` (from `apps/backend`) and
  `npm run test:e2e --workspace apps/backend -- test/auth-session.e2e-spec.ts -t "reloads role and status"`.

### ER-04 — Refreshing rotates the session

- **Front:** backend
- **Behavior:** Given an active refresh token, when the app calls `POST /auth/refresh` with
  `{ "refreshToken": "<token>" }`, then the API answers 200 with a new `accessToken` (accepted by
  `GET /auth/me`), a new `refreshToken` different from the one sent, their expiry dates and the `user`; the row
  of the sent token has `revoked_at` set, and a new row exists in the same `family_id` whose `expires_at` is
  30 days after the refresh.
- **Edge and error cases:** the new refresh token can itself be refreshed; a pending, denied, deleted or removed
  account can refresh.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/session/usecase/refresh-session.usecase.test.ts`
  and `npm run test:e2e --workspace apps/backend -- test/auth-session.e2e-spec.ts -t "rotates"`.

### ER-05 — Reusing a rotated refresh token revokes its family

- **Front:** backend
- **Behavior:** Given a refresh token A that was already rotated into B, when `POST /auth/refresh` is called
  with A, then the API answers 401 with `errors: ["auth.refreshToken.invalid"]`, and every token of the family
  is revoked: a refresh with B also answers 401 `auth.refreshToken.invalid`.
- **Edge and error cases:** two concurrent refreshes with the same active token produce exactly one 200 and one
  401, and the family ends revoked; another family of the same user is not touched.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/session/usecase/refresh-session.usecase.test.ts -t "reuse"`,
  `npx vitest run src/modules/auth/refresh-token.prisma.spec.ts` (from `apps/backend`) and
  `npm run test:e2e --workspace apps/backend -- test/auth-session.e2e-spec.ts -t "reuse"`.

### ER-06 — Refresh refuses tokens that can't renew a session

- **Front:** backend
- **Behavior:** Given a refresh token that is unknown, expired (`expires_at` in the past), revoked by a
  sign-out, or whose user no longer exists, when `POST /auth/refresh` is called with it, then the API answers
  401 with `errors: ["auth.refreshToken.invalid"]` and issues no token.
- **Edge and error cases:** a body without `refreshToken`, an empty string or a non-string value answers 422
  with `errors: ["refreshToken.token.required"]`; the 11th request from one IP within 60 s answers 429
  `request.rate.limited`.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/session/usecase/refresh-session.usecase.test.ts`
  and `npm run test:e2e --workspace apps/backend -- test/auth-session.e2e-spec.ts -t "POST /auth/refresh refuses"`.

### ER-07 — Signing out ends that sign-in only

- **Front:** backend
- **Behavior:** Given an account signed in twice (two families, X and Y), when `POST /auth/sign-out` is called
  with X's current refresh token, then the API answers 204 with no body, every active token of family X gets
  `revoked_at`, and a refresh with X's token answers 401 `auth.refreshToken.invalid`, while a refresh with Y's
  token still answers 200.
- **Edge and error cases:** sign-out works without an `Authorization` header and with an expired access token.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/session/usecase/sign-out.usecase.test.ts`
  and `npm run test:e2e --workspace apps/backend -- test/auth-session.e2e-spec.ts -t "signs out"`.

### ER-08 — Sign-out is idempotent and validates its input

- **Front:** backend
- **Behavior:** Given a refresh token that is unknown, expired or already revoked, when `POST /auth/sign-out`
  is called with it, then the API answers 204 and no row changes.
- **Edge and error cases:** a body without `refreshToken`, an empty string or a non-string value answers 422
  with `errors: ["refreshToken.token.required"]`; the 11th request from one IP within 60 s answers 429
  `request.rate.limited`.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/session/usecase/sign-out.usecase.test.ts`
  and `npm run test:e2e --workspace apps/backend -- test/auth-session.e2e-spec.ts -t "sign-out is idempotent"`.

## Tasks

### Auth module (`modules/auth`)

- [x] **T-01** — Extend the session ports: `hashRefreshToken(token: string): string` on `TokenProvider`
  (`src/session/provider/token.provider.ts`); `findByTokenHash(hash)`, `revokeIfActive(id, at): Promise<boolean>`
  (true only when the token was still active) and `revokeFamily(familyId, at)` on `RefreshTokenRepository`
  (`src/session/provider/refresh-token.repository.ts`); implement them in `test/mock/fake-token.provider.ts`
  and `test/mock/fake-refresh-token.repository.ts`, with tests of the fakes' behavior. Skill:
  [`module-repository`](../../../.claude/skills/module-repository).
  Covers: enabling · Done when: `npm test --workspace @rochas-surf-school/auth` and
  `npx turbo run check-types --filter=@rochas-surf-school/auth` pass.
  > ✅ 2026-10-09 — added `hashRefreshToken` to `TokenProvider`; `findByTokenHash`, `revokeIfActive`, `revokeFamily` to `RefreshTokenRepository`; implemented them in the fakes with tests; files: `modules/auth/src/session/provider/token.provider.ts`, `modules/auth/src/session/provider/refresh-token.repository.ts`, `modules/auth/test/mock/fake-token.provider.ts`, `modules/auth/test/mock/fake-refresh-token.repository.ts`, `modules/auth/test/session/provider/refresh-token.repository.test.ts`; verified: `npm test --workspace @rochas-surf-school/auth` (151 passed), `tsc --noEmit` in modules/auth clean; deviations: skill `module-repository` not invoked, ports extended by hand following its pattern

- [x] **T-02** — Add the `GetCurrentUser` use case in `src/user/usecase/get-current-user.usecase.ts` (input
  `{ id }`, output `{ id, name, email, role, status, createdAt }`, `UnauthorizedError("auth.token.invalid")`
  when the user doesn't exist), export it, and add `createdAt` to `VerifySignInCodeOut.user`; tests in
  `test/user/usecase/get-current-user.usecase.test.ts` and the existing verify test. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02 · Done when: `npm test --workspace @rochas-surf-school/auth` passes.
  > ✅ 2026-10-09 — added `GetCurrentUser` (401 `auth.token.invalid` for a missing user), exported it, and added `createdAt` to `VerifySignInCodeOut.user`; files: `modules/auth/src/user/usecase/get-current-user.usecase.ts`, `modules/auth/src/user/usecase/index.ts`, `modules/auth/src/sign-in-code/usecase/verify-sign-in-code.usecase.ts`, `modules/auth/test/user/usecase/get-current-user.usecase.test.ts`, `modules/auth/test/sign-in-code/usecase/verify-sign-in-code.usecase.test.ts`; verified: `npm test --workspace @rochas-surf-school/auth` (158 passed), `tsc --noEmit` clean; deviations: skill `module-use-case` not invoked, written by hand following the existing use cases

- [x] **T-03** — Add the `RefreshSession` use case in `src/session/usecase/refresh-session.usecase.ts` per D-05,
  D-06, D-07, D-09 and D-11 (validate the token → 422 `refreshToken.token.required`; find by hash; refuse unknown,
  expired, revoked or user-less tokens with `UnauthorizedError("auth.refreshToken.invalid")`; revoke a reused
  token's family; rotate within the family), with tests in
  `test/session/usecase/refresh-session.usecase.test.ts` covering every case of ER-04 to ER-06, including a
  `reuse` test where `revokeIfActive` returns false. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-04, ER-05, ER-06 · Done when: `npm test --workspace @rochas-surf-school/auth` passes.
  > ✅ 2026-10-09 — added `RefreshSession` (validate token → find by hash → refuse unknown/expired/user-less → reuse of a revoked token or a lost `revokeIfActive` revokes the family → rotate in the same family with a fresh 30-day expiry) and the shared `requireRefreshToken` input check (reused by T-04); files: `modules/auth/src/session/usecase/refresh-session.usecase.ts`, `modules/auth/src/session/usecase/refresh-token-input.ts`, `modules/auth/src/session/usecase/index.ts`, `modules/auth/test/session/usecase/refresh-session.usecase.test.ts`; verified: `npm test --workspace @rochas-surf-school/auth` (177 passed), `tsc --noEmit` clean; deviations: skill `module-use-case` not invoked, written by hand following the existing use cases

- [x] **T-04** — Add the `SignOut` use case in `src/session/usecase/sign-out.usecase.ts` per D-02 and D-11
  (validate the token → 422 `refreshToken.token.required`; revoke the family of a known token; do nothing for an
  unknown one), with tests in `test/session/usecase/sign-out.usecase.test.ts`. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-07, ER-08 · Done when: `npm test --workspace @rochas-surf-school/auth` passes.
  > ✅ 2026-10-09 — added `SignOut` (validate token → find by hash → revoke the family; unknown token does nothing); files: `modules/auth/src/session/usecase/sign-out.usecase.ts`, `modules/auth/src/session/usecase/index.ts`, `modules/auth/test/session/usecase/sign-out.usecase.test.ts`; verified: `npm test --workspace @rochas-surf-school/auth` (187 passed), `tsc --noEmit` clean; deviations: skill `module-use-case` not invoked, written by hand following the existing use cases

### Backend (`apps/backend`)

- [ ] **T-05** — Implement `findByTokenHash`, `revokeIfActive` (one `updateMany` where `id` matches and
  `revokedAt` is null, returning whether a row changed) and `revokeFamily` (an `updateMany` on the family's
  active tokens) in `src/modules/auth/refresh-token.prisma.ts`, and `hashRefreshToken` in
  `src/modules/auth/jwt.token.ts` (reusing the hash `generateRefreshToken` already computes), with tests in
  `refresh-token.prisma.spec.ts` and `jwt.token.spec.ts`. Skill:
  [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: enabling · Done when: `npx vitest run src/modules/auth` (from `apps/backend`) passes.

- [ ] **T-06** — Make the global guard reload the user (D-03, D-04) in `src/shared/auth/`: `JwtStrategy.validate`
  loads the user by `sub` (id, email, role, status) and refuses a missing one; `AuthenticatedUser`
  (`src/shared/types/current-user.type.ts`) gains `role` and `status`; `JwtAuthGuard.handleRequest` turns every
  refusal into a 401 with `errors: ["auth.token.invalid"]`. Tests in `jwt.strategy.spec.ts` and
  `jwt-auth.guard.spec.ts`. Skill: [`backend-nest-config`](../../../.claude/skills/backend-nest-config).
  Covers: ER-02, ER-03 · Done when: `npx vitest run src/shared/auth` (from `apps/backend`) passes.

- [ ] **T-07** — Expose `GET /auth/me` (protected) in `src/modules/auth/auth.controller.ts`, calling
  `GetCurrentUser` with `@CurrentUser()`'s id and serializing `createdAt` as ISO 8601; create
  `test/auth-session.e2e-spec.ts` (setup as in `test/auth-email.e2e-spec.ts`) with the `GET /auth/me`,
  `invalid access token` and `reloads role and status` scenarios of ER-01 to ER-03 (including the verify
  response's `createdAt`), a controller unit test in `auth.controller.spec.ts`, and the requests in
  `auth.integration.http`. Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03 · Done when: `npx vitest run src/modules/auth/auth.controller.spec.ts` and
  `npm run test:e2e --workspace apps/backend -- test/auth-session.e2e-spec.ts` pass.

- [ ] **T-08** — Expose `POST /auth/refresh` (`@Public()`, 200, throttled per D-08) in `auth.controller.ts`
  calling `RefreshSession`; add the `rotates`, `reuse` and `POST /auth/refresh refuses` scenarios of ER-04 to
  ER-06 to `test/auth-session.e2e-spec.ts` (including the concurrent-refresh case), a controller unit test, and
  the requests in `auth.integration.http`. Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-04, ER-05, ER-06 · Done when: `npm run test:e2e --workspace apps/backend -- test/auth-session.e2e-spec.ts`
  passes.

- [ ] **T-09** — Expose `POST /auth/sign-out` (`@Public()`, 204, throttled per D-08) in `auth.controller.ts`
  calling `SignOut`; add the `signs out` and `sign-out is idempotent` scenarios of ER-07 and ER-08 to
  `test/auth-session.e2e-spec.ts`, a controller unit test, and the requests in `auth.integration.http`. Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-07, ER-08 · Done when: `npm run test:e2e --workspace apps/backend -- test/auth-session.e2e-spec.ts`
  passes.

### Verification

- [ ] **T-10** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0.

## Verification Plan

- Automated (the local database up with `npm run db:start --workspace apps/backend` and the migrations applied
  with `npm run prisma:migrate:deploy --workspace apps/backend`):
  - `node .specs/scripts/run-related-tests.mjs 004` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 004` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/backend`
    — no errors.
  - `node .specs/scripts/run-e2e.mjs 004` — the backend e2e suite passes, including
    `test/auth-session.e2e-spec.ts` and the existing `test/auth-email.e2e-spec.ts`.
  - Every `Verify by` command of ER-01 to ER-08 passes.
- User journeys: none — every Expected Result is an API behavior covered by the e2e suite.

## Memory Impact

- `memory/technical-context.md` — Authentication: refresh rotation and reuse detection are built (D-05, D-06);
  the guard reloads the user on every request and answers `auth.token.invalid` (D-03, D-04); sign-out revokes
  one family by refresh token (D-01, D-02); `/auth/refresh` and `/auth/sign-out` throttles (D-08).
- `memory/structure.md` — the routes `GET /auth/me`, `POST /auth/refresh`, `POST /auth/sign-out`; the
  `GetCurrentUser`, `RefreshSession` and `SignOut` use cases; `test/auth-session.e2e-spec.ts`.
- `memory/modules/auth.md` — Sessions: renewal (rotation, reuse revokes the family, sliding 30 days) and
  sign-out (one family, idempotent); Who can do what: a signed-in account reads its own account, anyone holding a
  refresh token renews or ends that session; the error keys `auth.token.invalid`, `auth.refreshToken.invalid`,
  `refreshToken.token.required`; Spec history.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
