---
id: "001"
slug: email-sign-in-code
title: Email code sign-in
status: in-progress
created: 2026-10-07
started: 2026-10-07
base_commit: 0a79c2176a6f6b1abe2c101fe1868dcf627b556b
fronts: [shared, auth, backend]
depends_on: []
---

# 001 — Email code sign-in

## Goal

People can sign in, or sign up, with a 6-digit code sent to their email address, without a password. The
backend generates the code, stores only its HMAC, emails it through Resend in the language picked on the
sign-in screen, and enforces the 10-minute expiry, the 30-second resend cooldown and a 5-attempt lockout. A
correct code opens the one account of that email address — or creates a pending student once a name is
given — and returns the session the technical context describes (access JWT + refresh token). Review
accounts sign in with fixed codes. This is the backend contract the mobile sign-in screens will call.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: User (one account per email address,
  starts `pending` as a `student`), Identity (`email` method), Sign-in code (6 digits, 10-minute expiry,
  30-second resend, the only email the app sends, review accounts); decision "One account per email
  address, and the email never changes".
- Requirements:
  [requirements.md → Email code sign-in](../../../.docs/requirements.md#email-code-sign-in) — sign in only with
  the code sent, no password;
  [requirements.md → Code expiry and resending](../../../.docs/requirements.md#code-expiry-and-resending) —
  10-minute expiry, a new code only after 30 seconds;
  [requirements.md → One account per email address](../../../.docs/requirements.md#one-account-per-email-address)
  — any method with the same address opens the same account;
  [requirements.md → Review accounts](../../../.docs/requirements.md#review-accounts) — one pre-approved account
  per role, fixed code that works only for its own email;
  [requirements.md → Name before approval](../../../.docs/requirements.md#name-before-approval) — email-code
  sign-ups give their name before the account waits for approval (implemented here for the backend only).
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Architecture
  (ports and adapters; use cases in `modules/*`), Persistence (snake_case tables, migration naming, seeds hold
  the review accounts), Authentication (15-minute access JWT, 30-day refresh token stored hashed, `@Public()`),
  Error handling (`ApiExceptionFilter`, translation-key errors), External integrations → Email and Scheduled
  work, Fixed conventions (generator skills, template code, lint), Automated validation and Coverage.
- Existing code this builds on:
  - `modules/auth/src/user/` — `User` entity (name 3–80 chars required, `role` default `student`,
    `status` default `pending`), `UserRepository` (CRUD + `searchByName`, no `findByEmail`).
  - `modules/auth/src/identity/` — `Identity` entity (`provider: google | apple | email`, `providerUserId`,
    `email`), `IdentityRepository` (`create`, `findByProvider`, `findByUserId`).
  - `apps/backend/prisma/models/auth.model.prisma` — `User`, `UserRulesAcceptance` and `Identity` models,
    already migrated (`20261006023424_auth`, which also dropped the bootstrap table).
  - `apps/backend/src/modules/auth/` — placeholder `AuthController` (`GET /auth`) and `AuthModule`; no Prisma
    repository exists in the backend yet.
  - `apps/backend/src/shared/` does not exist: `backend-nest-config` has never been applied, so there is no
    error filter and no JWT guard. Its templates in `.claude/skills/backend-nest-config/assets/` import
    without the `.js` suffix the ESM backend (`module: nodenext`) requires.
  - `packages/shared/src/error/` — `DomainError` (status code, no details), `ValidationError` (422),
    `ValidationException` (422), `NotFoundError` (404), `UnauthorizedError` (401).
- Resend SDK: `resend.emails.send(payload, { idempotencyKey })` returns `{ data, error }` and never throws for
  API errors; the idempotency key is the second argument (request options), not a payload field.

## Scope

### In scope

- `POST /auth/email/code` and `POST /auth/email/verify`, public, in `apps/backend`.
- The `sign-in-code` aggregate (entity, repository port, code/email/clock provider ports, three use cases) and
  the `session` aggregate (refresh-token entity, repository port, token provider port, `StartSession`) in
  `modules/auth`; `UserRepository.findByEmail`.
- `TooManyRequestsError`, `BadGatewayError` and `DomainError.details` in `packages/shared`.
- Prisma models, migration and repositories for `SignInCode` and `RefreshToken`, and the first Prisma
  repositories for `User` and `Identity`.
- The Resend email provider with its pt-BR / es / en copy and the development log fallback.
- IP throttling on both endpoints; a cleanup job for expired codes.
- The review-account seed task.
- Applying `backend-nest-config` (error filter, global JWT guard, `@Public()`), after fixing its templates.
- Removing the backend's framework template code; adding oxlint and `check-types` to `modules/auth`.

### Out of scope

- The mobile sign-in, code and name screens, and the language picker (a mobile spec).
- `POST /auth/refresh` (rotation, reuse revocation) and signing out — the next spec.
- Google and Apple sign-in.
- Facebook sign-in: not a sign-in method of the product.
- The guard reloading the user's status and role on every request (no protected route exists yet).
- Onboarding of the review accounts (WhatsApp number, school rules).
- Erasure of accounts and the 30-day lifecycles.
- Notifying admins of a new registration (the notifications spec).
- A per-email daily cap on codes sent.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | `POST /auth/email/verify` issues the session described in technical-context → Authentication: an HS256 access JWT (`JWT_SECRET`, `JWT_EXPIRES_IN=15m`, payload `{ sub: user id, email }`) and a refresh token stored hashed with a 30-day expiry and a new family id. Refresh rotation, reuse revocation and sign-out are the next spec. | Verify must sign people in, and the token format is already decided; rotation is a contract of its own and would double this spec. |
| D-02 | A new email address gives its name through a second verify call: a correct code for an email without an account and without `name` answers 422 `user.name.required`, without consuming the code or counting an attempt; the app calls verify again with `{ email, code, name }`. The name is validated by building the `User` entity before the code is consumed. `name` is ignored for an existing account. | One endpoint and no extra token type; the code stays usable until the account can actually be created. A wrong code answers 401 first, so only someone holding the code learns that no account exists. |
| D-03 | A code is consumed with an atomic `deleteMany({ where: { email, codeHash } })`; `count === 1` means success. The user and identity are found or created after that, outside a transaction. | Guarantees single use under concurrent verifies without a cross-aggregate transaction port. If creating the account fails afterwards, the person requests a new code. |
| D-04 | Review accounts use the same table and the same rules: requesting a code upserts a row with the hash of the account's fixed code and sends no email; the cooldown and the 5-attempt lockout apply. For any other email, the fixed code is compared with that email's own random code, so it never matches by design. | The lockout then also protects the pre-approved admin review account from brute force. |
| D-05 | `POST /auth/email/code` takes `locale` (`pt-BR` \| `es` \| `en`) — the language picked on the sign-in screen, which starts as the phone's language. Missing → `pt-BR`; any other value → 422. The email copy (three languages) lives in the backend provider, the one exception to "the backend sends no user-facing text". | The sign-in screen already has a language picker; email is the one place the app can't translate. |
| D-06 | The email port is `EmailProvider` (`modules/auth/src/sign-in-code/provider/email.provider.ts`), implemented by one concrete `ResendEmailProvider` (`apps/backend/src/modules/auth/resend.email.ts`) injected directly, without a token. When `RESEND_API_KEY` is unset and `NODE_ENV` is not `production`, it logs the code instead of sending; in production it refuses to start without the key. | technical-context → External integrations and the `backend-provider-implementation` skill: concrete providers, no injection tokens. The production guard ensures codes are never logged in production. |
| D-07 | The code is generated with `crypto.randomInt(0, 1_000_000)` padded to 6 digits and stored as hex HMAC-SHA256 keyed by `AUTH_CODE_PEPPER` over `` `${email}:${code}` ``; it is compared with `crypto.timingSafeEqual`. The refresh token is 32 random bytes (base64url) stored as a plain SHA-256 hex. | 10⁶ codes make a plain hash reversible, so the pepper is what protects them; a 256-bit random token needs no pepper. |
| D-08 | `SignInCode` keeps the `Entity` UUID `id` plus a unique `email` (normalized: trimmed, lowercase); table `sign_in_codes` with an index on `expires_at`. `RefreshToken` → table `refresh_tokens` (`user_id` FK with cascade, unique `token_hash`, `family_id`, `expires_at`, `revoked_at`). Emails are always stored normalized, in `users` too. | The project's `Entity` base and Prisma conventions (technical-context → Persistence). |
| D-09 | Order on request: (1) validate, (2) reject when `now - lastSentAt < 30s`, (3) upsert the row (new hash, `expiresAt = now + 10 min`, `lastSentAt = now`, `attempts = 0`), (4) send with `idempotencyKey: signin-code:<email>:<lastSentAt ms>`. If sending fails, the row is deleted and the request answers 502, so the person can request again at once. | The person must never be stuck in a cooldown for an email that never arrived. |
| D-10 | Verify rules: no row → `signInCode.code.invalid`; `attempts >= 5` → `signInCode.attempts.exceeded`; `now >= expiresAt` → `signInCode.code.expired`; HMAC mismatch → increment `attempts` atomically and answer `signInCode.code.invalid`. All 401. Any account status (pending, approved, denied, deleted, removed) gets a session; the response carries the status. | The requirements distinguish "expired, request a new code"; the app needs the status to show the waiting, denied or account-deleted screens. |
| D-11 | Error keys: `signInCode.email.invalid` (422), `signInCode.locale.invalid` (422), `signInCode.resend.tooSoon` (429, `details: { resendAvailableAt }`), `signInCode.email.sendFailed` (502), `signInCode.code.invalid`, `signInCode.code.expired`, `signInCode.attempts.exceeded` (401), `user.name.*` from the `User` validator (422), `request.rate.limited` (429, throttler). | technical-context → Fixed conventions: error messages are translation keys the app translates. |
| D-12 | 429 and 502 come from new `TooManyRequestsError` and `BadGatewayError` in `packages/shared`; `DomainError` gets an optional `details` object that the `ApiExceptionFilter` passes to the response's `details`. | The shared kernel holds the error types; the 429 must carry `resendAvailableAt` for the app's countdown. |
| D-13 | Throttling with `@nestjs/throttler`, in-memory, by IP: 5 requests per 60 s on `/auth/email/code`, 10 per 60 s on `/auth/email/verify`, error message `request.rate.limited`. | Limits email bombing and Resend quota use, and slows guessing across codes; the in-memory store matches the one-instance assumption in technical-context → Scheduled work. |
| D-14 | `SignInCodeCleanupJob` (`@nestjs/schedule`) runs every minute and deletes rows with `expiresAt < now`. | Rows hold email addresses of people who never finished signing in (LGPD); one idempotent job per minute is the project's scheduled-work convention. |
| D-15 | `REVIEW_ACCOUNTS` is a JSON array of `{ "email", "code", "role", "name" }` (code: 6 digits; role: `student` \| `instructor` \| `admin`), read by the backend's auth config and by the seed. The seed upserts each as an `approved` user with that role and name and an `email` identity. | technical-context → Persistence: the seed holds the three review accounts; one variable keeps the backend and the seed in sync. |
| D-16 | `backend-nest-config` is applied after its templates are fixed in `.claude/skills/backend-nest-config/assets/` (ESM `.js` relative imports, `DomainError.details` in the filter). Then the stock `AppController`, `AppService`, `app.controller.spec.ts` and `test/app.e2e-spec.ts` are removed. | `apps/backend/src/shared/` is rewritten on every run, so fixes belong in the templates; technical-context → Fixed conventions → Template code. |
| D-17 | New variables in `apps/backend/.env.example` (names only): `RESEND_API_KEY`, `EMAIL_FROM`, `AUTH_CODE_PEPPER`, `REVIEW_ACCOUNTS`, `JWT_SECRET`, `JWT_EXPIRES_IN=15m`, `REFRESH_TOKEN_EXPIRES_IN_DAYS=30`. The backend refuses to start without `AUTH_CODE_PEPPER` or with a malformed `REVIEW_ACCOUNTS`. | Missing secrets must fail loudly at boot rather than at the first sign-in. |
| D-18 | The e2e suite overrides `ResendEmailProvider` with a capturing fake; real delivery through Resend is a manual journey run by the user. | A reviewer agent can't read an inbox, and e2e tests must not send real email. |

## Expected Results

### ER-01 — Requesting a code sends it and stores only its hash

- **Front:** backend
- **Behavior:** Given no code was requested for `ana@example.com`, when a client calls
  `POST /auth/email/code` with `{ "email": " Ana@Example.com ", "locale": "es" }`, then the API answers 202
  with `{ resendAvailableAt, expiresAt }` (ISO strings, 30 seconds and 10 minutes after the send), the email
  provider receives exactly one email to `ana@example.com` with a 6-digit code and locale `es`, and the
  `sign_in_codes` row for `ana@example.com` holds a 64-character hex hash that is not the code.
- **Edge and error cases:** the response is identical whether or not an account exists for the email; an
  invalid email (`"ana@"`) answers 422 `signInCode.email.invalid` and sends nothing; a missing `locale` sends
  in `pt-BR`; `"locale": "fr"` answers 422 `signInCode.locale.invalid` and sends nothing.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/sign-in-code/usecase/request-sign-in-code.usecase.test.ts`
  and `npm run test:e2e --workspace apps/backend -- test/auth-email.e2e-spec.ts -t "request code"`.

### ER-02 — A new code can be requested only after 30 seconds

- **Front:** backend
- **Behavior:** Given a code was sent to `ana@example.com` at T, when a new code is requested at T + 10 s,
  then the API answers 429 with `errors: ["signInCode.resend.tooSoon"]` and
  `details.resendAvailableAt = T + 30 s`, no email is sent and the first code still signs in.
- **Edge and error cases:** at T + 30 s exactly, a new code is sent (202), the first code answers 401
  `signInCode.code.invalid`, and the row's `attempts` is back to 0.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/sign-in-code/usecase/request-sign-in-code.usecase.test.ts -t "cooldown"`
  (fake clock) and `npm run test:e2e --workspace apps/backend -- test/auth-email.e2e-spec.ts -t "too soon"`.

### ER-03 — A failed send leaves nothing behind

- **Front:** backend
- **Behavior:** Given the email provider fails, when a client calls `POST /auth/email/code` for
  `ana@example.com`, then the API answers 502 with `errors: ["signInCode.email.sendFailed"]` and no
  `sign_in_codes` row exists for `ana@example.com`.
- **Edge and error cases:** an immediate new request (under 30 s) is accepted with 202 once the provider
  works again.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/sign-in-code/usecase/request-sign-in-code.usecase.test.ts -t "send fails"`
  and `npm run test:e2e --workspace apps/backend -- test/auth-email.e2e-spec.ts -t "send fails"`.

### ER-04 — The correct code signs in to the existing account

- **Front:** backend
- **Behavior:** Given an account exists for `ana@example.com` and a code was sent to it, when a client calls
  `POST /auth/email/verify` with that email and code, then the API answers 200 with
  `{ accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt, user: { id, name, email, role, status } }`
  for that account, and the `sign_in_codes` row is gone.
- **Edge and error cases:** an account created with Google (no `email` identity) gets an `email` identity with
  `providerUserId` = the normalized email, and no second account is created; an account that already has an
  `email` identity gets no duplicate; the email is matched case- and space-insensitively; accounts with status
  `denied`, `deleted` or `removed` also get 200 and their status.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/sign-in-code/usecase/verify-sign-in-code.usecase.test.ts -t "existing account"`
  and `npm run test:e2e --workspace apps/backend -- test/auth-email.e2e-spec.ts -t "existing account"`.

### ER-05 — A new email address gives its name before the account is created

- **Front:** backend
- **Behavior:** Given no account exists for `bia@example.com` and a code was sent to it, when a client calls
  `POST /auth/email/verify` with the correct code and no `name`, then the API answers 422 with
  `errors: ["user.name.required"]`, no account is created and the code still works with `attempts`
  unchanged; when it calls again with `"name": "Bia Souza"`, the API answers 200 with a session for a new
  `pending` `student` named "Bia Souza" that has an `email` identity, and the code row is gone.
- **Edge and error cases:** `"name": "Al"` answers 422 with `errors: ["user.name.min.length"]` and does not
  consume the code; a wrong code with a name answers 401 `signInCode.code.invalid` and creates nothing.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/sign-in-code/usecase/verify-sign-in-code.usecase.test.ts -t "new account"`
  and `npm run test:e2e --workspace apps/backend -- test/auth-email.e2e-spec.ts -t "new account"`.

### ER-06 — A wrong code doesn't sign in and counts an attempt

- **Front:** backend
- **Behavior:** Given a code was sent to `ana@example.com`, when a client verifies with a different 6-digit
  code, then the API answers 401 with `errors: ["signInCode.code.invalid"]`, no session is returned and the
  row's `attempts` grows by 1.
- **Edge and error cases:** an email with no code requested answers the same 401 `signInCode.code.invalid`;
  a code that isn't 6 digits (`"12ab"`) is treated as a wrong code.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/sign-in-code/usecase/verify-sign-in-code.usecase.test.ts -t "wrong code"`
  and `npm run test:e2e --workspace apps/backend -- test/auth-email.e2e-spec.ts -t "wrong code"`.

### ER-07 — A code expires 10 minutes after it is sent

- **Front:** backend
- **Behavior:** Given a code was sent at T, when it is verified at T + 10 min or later, then the API answers
  401 with `errors: ["signInCode.code.expired"]` and no session is returned.
- **Edge and error cases:** at T + 9 min 59 s the code still signs in; after expiry, requesting a new code
  answers 202 and the new code signs in.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/sign-in-code/usecase/verify-sign-in-code.usecase.test.ts -t "expired"`
  (fake clock).

### ER-08 — Five wrong guesses lock the code

- **Front:** backend
- **Behavior:** Given a code was sent to `ana@example.com` and 5 wrong codes were tried, when the correct code
  is verified, then the API answers 401 with `errors: ["signInCode.attempts.exceeded"]` and no session is
  returned.
- **Edge and error cases:** after 4 wrong codes the correct one still signs in; requesting a new code (after
  the cooldown) resets the attempts and the new code signs in.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/sign-in-code/usecase/verify-sign-in-code.usecase.test.ts -t "attempts"`
  and `npm run test:e2e --workspace apps/backend -- test/auth-email.e2e-spec.ts -t "lockout"`.

### ER-09 — A code can be used only once

- **Front:** backend
- **Behavior:** Given a code that already signed in, when it is verified again, then the API answers 401 with
  `errors: ["signInCode.code.invalid"]`.
- **Edge and error cases:** two concurrent verifies with the same correct code produce exactly one 200 and one
  401, and only one refresh token is stored.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/sign-in-code/usecase/verify-sign-in-code.usecase.test.ts -t "single use"`
  and `npm run test:e2e --workspace apps/backend -- test/auth-email.e2e-spec.ts -t "single use"`.

### ER-10 — Review accounts sign in with their fixed code only

- **Front:** backend
- **Behavior:** Given `REVIEW_ACCOUNTS` maps `review.admin@example.com` to code `246810` with role `admin`, and
  the account is seeded, when a client requests a code for it and verifies `246810`, then the request answers
  202 without sending any email and the verify answers 200 with a session for the `approved` `admin` account.
- **Edge and error cases:** `246810` used with any other email answers 401 `signInCode.code.invalid`; a
  review email used before requesting a code answers 401 `signInCode.code.invalid`; the 30-second cooldown and
  the 5-attempt lockout apply to review accounts too.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/sign-in-code/usecase/request-sign-in-code.usecase.test.ts -t "review account"`,
  `npm test --workspace @rochas-surf-school/auth -- test/sign-in-code/usecase/verify-sign-in-code.usecase.test.ts -t "review account"`
  and `npm run test:e2e --workspace apps/backend -- test/auth-email.e2e-spec.ts -t "review account"`.

### ER-11 — The seed creates the review accounts

- **Front:** backend
- **Behavior:** Given `REVIEW_ACCOUNTS` lists three accounts (one per role), when `npm run prisma:seed
  --workspace apps/backend` runs, then `users` holds three `approved` accounts with those emails (normalized),
  names and roles, each with an `email` identity.
- **Edge and error cases:** running the seed twice leaves exactly three accounts and three identities; with
  `REVIEW_ACCOUNTS` unset the seed creates no account and succeeds.
- **Verify by:** `npx vitest run prisma/seed/review-accounts.seed.spec.ts` (from `apps/backend`).

### ER-12 — Requests are throttled by IP

- **Front:** backend
- **Behavior:** Given one IP called `POST /auth/email/code` 5 times within 60 seconds, when it calls it a 6th
  time within the same 60 seconds, then the API answers 429 with `errors: ["request.rate.limited"]` and no
  email is sent.
- **Edge and error cases:** `POST /auth/email/verify` allows 10 calls per 60 seconds and answers the 11th with
  429 `request.rate.limited`.
- **Verify by:** `npm run test:e2e --workspace apps/backend -- test/auth-email.e2e-spec.ts -t "rate limit"`.

### ER-13 — Expired codes are deleted

- **Front:** backend
- **Behavior:** Given rows whose `expiresAt` is before now and rows whose `expiresAt` is after now, when the
  cleanup runs, then the expired rows are deleted and the others are untouched.
- **Edge and error cases:** with nothing expired, the cleanup deletes nothing and doesn't fail; the job is
  scheduled every minute.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/sign-in-code/usecase/delete-expired-sign-in-codes.usecase.test.ts`
  and `npx vitest run src/modules/auth/sign-in-code-cleanup.job.spec.ts` (from `apps/backend`).

### ER-14 — The session tokens follow the technical context

- **Front:** backend
- **Behavior:** Given a successful verify, then `accessToken` is an HS256 JWT signed with `JWT_SECRET` whose
  `sub` is the user's id and whose `exp` is 15 minutes after issue, and `refresh_tokens` holds one row for the
  user with `token_hash` = SHA-256 hex of the returned `refreshToken`, `expires_at` 30 days after issue and a
  `family_id`.
- **Edge and error cases:** the plaintext refresh token is stored nowhere; two sign-ins of the same user create
  two rows with different family ids.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/session/usecase/start-session.usecase.test.ts`,
  `npx vitest run src/modules/auth/jwt.token.spec.ts` (from `apps/backend`) and
  `npm run test:e2e --workspace apps/backend -- test/auth-email.e2e-spec.ts -t "session"`.

### ER-15 — The email is sent through Resend in the chosen language

- **Front:** backend
- **Behavior:** Given `RESEND_API_KEY` and `EMAIL_FROM` are set, when the provider sends code `123456` to
  `ana@example.com` in `pt-BR`, then it calls `resend.emails.send` once with `from: EMAIL_FROM`,
  `to: "ana@example.com"`, subject "123456 é o seu código da Rocha's Surf School", a `text` body
  "Seu código de acesso é 123456. Ele expira em 10 minutos. Se você não pediu este código, ignore este e-mail."
  and an `html` body with the same text, and with the request option `idempotencyKey` it was given.
- **Edge and error cases:** `es` uses the subject "123456 es tu código de Rocha's Surf School" and the body
  "Tu código de acceso es 123456. Caduca en 10 minutos. Si no solicitaste este código, ignora este correo.";
  `en` uses "123456 is your Rocha's Surf School code" and "Your sign-in code is 123456. It expires in 10
  minutes. If you didn't ask for this code, ignore this email."; a response with `error` makes the send fail
  (which ER-03 turns into a 502).
- **Verify by:** `npx vitest run src/modules/auth/resend.email.spec.ts` (from `apps/backend`) and the manual
  journey in the Verification Plan.

### ER-16 — Secrets are checked at startup

- **Front:** backend
- **Behavior:** Given `NODE_ENV` is not `production` and `RESEND_API_KEY` is unset, when a code is sent, then
  the backend logs the email address and the code and makes no call to Resend.
- **Edge and error cases:** the backend refuses to start (the provider or config throws on construction)
  when `AUTH_CODE_PEPPER` is unset, when `NODE_ENV=production` and `RESEND_API_KEY` is unset, or when
  `REVIEW_ACCOUNTS` is not valid JSON or has an entry with an invalid email, a code that isn't 6 digits or
  an unknown role.
- **Verify by:** `npx vitest run src/modules/auth/resend.email.spec.ts src/modules/auth/auth.config.spec.ts`
  (from `apps/backend`).

## Tasks

### Shared (`packages/shared`)

- [x] **T-01** — Add `TooManyRequestsError` (429) and `BadGatewayError` (502) in
  `packages/shared/src/error/` (exported from `index.ts`), and an optional `details?: Record<string, unknown>`
  constructor argument and property on `DomainError`, with tests in `packages/shared/test/error/` for the
  status codes, messages and details.
  Covers: ER-02, ER-03 · Done when: `npm test --workspace @rochas-surf-school/shared` passes with the new
  files fully covered.
  > ✅ 2026-10-07 11:38 — added `TooManyRequestsError` (429) and `BadGatewayError` (502), both taking an optional
  > `details`, and an optional `details` argument/property on `DomainError`; exported from the error barrel.
  > Tests written first and watched fail (5 failed). files: `packages/shared/src/error/domain.error.ts`,
  > `packages/shared/src/error/too-many-requests.error.ts`, `packages/shared/src/error/bad-gateway.error.ts`,
  > `packages/shared/src/error/index.ts`, `packages/shared/test/error/http-status.error.test.ts`; verified: `npm
  > test --workspace @rochas-surf-school/shared` (22 suites, 102 passed; the three error files 100%
  > statements/branches/functions/lines), `check-types` and `build` pass; deviations: none

### Auth module (`modules/auth`)

- [x] **T-02** — Add oxlint (`lint` script, as in `apps/backend`) and a `check-types` script (`tsc --noEmit`)
  to `modules/auth/package.json`, and fix whatever they report in existing code.
  Covers: enabling · Done when: `npx turbo run lint check-types --filter=@rochas-surf-school/auth` exits 0.
  > ✅ 2026-10-07 11:38 — added `lint` (`oxlint --type-aware src/ test/`, as in `apps/backend`) and `check-types`
  > (`tsc --noEmit`) scripts, `oxlint` and `oxlint-tsgolint` devDependencies (backend versions) and an
  > `.oxlintrc.json` mirroring the backend rules; existing code reported nothing to fix. files:
  > `modules/auth/package.json`, `modules/auth/.oxlintrc.json`, `package-lock.json`; verified: `npx turbo run
  > lint check-types --filter=@rochas-surf-school/auth` (2 successful; oxlint 0 warnings, 0 errors on 28 files;
  > tsc clean); deviations: none

- [x] **T-03** — Add `findByEmail(email: string): Promise<User | null>` to
  `modules/auth/src/user/provider/user.repository.ts` and implement it in
  `modules/auth/test/mock/fake-user.repository.ts`, with a test.
  Covers: ER-04 · Done when: `npm test --workspace @rochas-surf-school/auth` passes.
  > ✅ 2026-10-07 11:39 — added `findByEmail(email): Promise<User | null>` to the `UserRepository` port and an
  > exact-match implementation to the fake (callers pass the normalized email); test written first and watched
  > fail (2 failed). files: `modules/auth/src/user/provider/user.repository.ts`,
  > `modules/auth/test/mock/fake-user.repository.ts`, `modules/auth/test/user/provider/user.repository.test.ts`;
  > verified: `npm test --workspace @rochas-surf-school/auth` (6 suites, 62 passed), `check-types` clean;
  > deviations: none

- [x] **T-04** — Create the `sign-in-code` aggregate in `modules/auth/src/sign-in-code/`: the `SignInCode`
  entity (`email`, `codeHash`, `expiresAt`, `lastSentAt`, `attempts`; validated email, 64-char hex hash,
  dates, integer attempts ≥ 0); the `SignInCodeRepository` port (`findByEmail`, `save` as an upsert by email,
  `deleteByEmail`, `incrementAttempts(email)`, `consume(email, codeHash): Promise<boolean>`,
  `deleteExpired(now): Promise<number>`); the ports `SignInCodeProvider` (`generate()`,
  `hash(email, code)`, `matches(hash, email, code)`), `EmailProvider`
  (`sendSignInCode({ to, code, locale, idempotencyKey }): Promise<void>`, rejecting on failure) and
  `ClockProvider` (`now()`), in `*.provider.ts` files; the `SignInLocale` type (`pt-BR | es | en`); and fakes
  in `modules/auth/test/mock/` (in-memory repository, fake clock, capturing email provider, deterministic code
  provider). Entity tests in `modules/auth/test/sign-in-code/model/`. Skills:
  [`module-aggregate`](../../../.claude/skills/module-aggregate) (mode `example`, then replace the example use
  case), [`module-entity`](../../../.claude/skills/module-entity),
  [`module-repository`](../../../.claude/skills/module-repository).
  Covers: ER-01 · Done when: `npm test --workspace @rochas-surf-school/auth` passes with the entity fully
  covered.
  > ✅ 2026-10-07 11:41 — ran `module-aggregate` (`--module auth --aggregate sign-in-code --mode example`),
  > deleted the generated example use case `create-sign-in-code.usecase.ts` (the use case barrel stays empty
  > until T-06), then wrote by hand, following `module-entity` and `module-repository`: the `SignInCode` entity
  > (email Required+Email, codeHash Required+Regex 64 lowercase hex, expiresAt/lastSentAt Required+Date,
  > attempts Required+Integer+MinValue 0); the custom `SignInCodeRepository` port replacing the generated CRUD
  > one (`findByEmail`, `save` upsert by email, `deleteByEmail`, `incrementAttempts`, `consume`,
  > `deleteExpired`); the ports `SignInCodeProvider`, `EmailProvider` (with `SIGN_IN_LOCALES`/`SignInLocale` and
  > `SendSignInCodeIn`) and `ClockProvider`; fakes (in-memory repository keyed by email, settable clock,
  > capturing email provider with a `failing` switch, queued-code provider hashing with SHA-256) plus a test of
  > the fake repository. files: `modules/auth/src/index.ts`, `modules/auth/src/sign-in-code/index.ts`,
  > `modules/auth/src/sign-in-code/model/index.ts`,
  > `modules/auth/src/sign-in-code/model/sign-in-code.entity.ts`,
  > `modules/auth/src/sign-in-code/provider/index.ts`,
  > `modules/auth/src/sign-in-code/provider/sign-in-code.repository.ts`,
  > `modules/auth/src/sign-in-code/provider/sign-in-code.provider.ts`,
  > `modules/auth/src/sign-in-code/provider/email.provider.ts`,
  > `modules/auth/src/sign-in-code/provider/clock.provider.ts`,
  > `modules/auth/src/sign-in-code/usecase/index.ts`, `modules/auth/test/mock/index.ts`,
  > `modules/auth/test/mock/fake-sign-in-code.repository.ts`, `modules/auth/test/mock/fake-clock.provider.ts`,
  > `modules/auth/test/mock/fake-email.provider.ts`, `modules/auth/test/mock/fake-sign-in-code.provider.ts`,
  > `modules/auth/test/sign-in-code/model/sign-in-code.entity.test.ts`,
  > `modules/auth/test/sign-in-code/provider/sign-in-code.repository.test.ts`; verified: `npm test --workspace
  > @rochas-surf-school/auth` (8 suites, 80 passed; `sign-in-code.entity.ts` 100%
  > statements/branches/functions/lines), lint and check-types clean; deviations: the generator writes a CRUD
  > repository and an example use case, both replaced as the task asks

- [x] **T-05** — Create the `session` aggregate in `modules/auth/src/session/`: the `RefreshToken` entity
  (`userId`, `tokenHash`, `familyId`, `expiresAt`, `revokedAt?`), the `RefreshTokenRepository` port
  (`create`), the `TokenProvider` port (`signAccessToken(user): { token, expiresAt }`,
  `generateRefreshToken(): { token, hash }`), and the `StartSession` use case (input: user and
  `refreshTokenTtlDays`; stores a `RefreshToken` with a new family id, returns
  `{ accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt }`), with fakes and tests in
  `modules/auth/test/session/`. Skills: [`module-aggregate`](../../../.claude/skills/module-aggregate),
  [`module-entity`](../../../.claude/skills/module-entity),
  [`module-repository`](../../../.claude/skills/module-repository),
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-14 · Done when: `npm test --workspace @rochas-surf-school/auth -- test/session` passes.
  > ✅ 2026-10-07 11:42 — ran `module-aggregate` (`--module auth --aggregate session --mode example`), renamed
  > the generated `session.entity.ts`/`session.repository.ts` to `refresh-token.*` and dropped the example use
  > case; then, following `module-entity`, `module-repository` and `module-use-case`: the `RefreshToken` entity
  > (userId/familyId Required+Uuid, tokenHash Required+64 hex, expiresAt Required+Date, revokedAt Date), the
  > `RefreshTokenRepository` port (`create`, from the shared `CreateRepository`), the `TokenProvider` port
  > (`signAccessToken(subject: { id, email }): { token, expiresAt }`, `generateRefreshToken(): { token, hash }`)
  > and `StartSession` (deps: refresh-token repository, token provider, `ClockProvider`; stores a validated
  > `RefreshToken` with a new `crypto.randomUUID()` family and expiry now + TTL days, returns the four session
  > fields), with fakes and tests. files: `modules/auth/src/index.ts`, `modules/auth/src/session/index.ts`,
  > `modules/auth/src/session/model/index.ts`, `modules/auth/src/session/model/refresh-token.entity.ts`,
  > `modules/auth/src/session/provider/index.ts`,
  > `modules/auth/src/session/provider/refresh-token.repository.ts`,
  > `modules/auth/src/session/provider/token.provider.ts`, `modules/auth/src/session/usecase/index.ts`,
  > `modules/auth/src/session/usecase/start-session.usecase.ts`, `modules/auth/test/mock/index.ts`,
  > `modules/auth/test/mock/fake-refresh-token.repository.ts`, `modules/auth/test/mock/fake-token.provider.ts`,
  > `modules/auth/test/session/model/refresh-token.entity.test.ts`,
  > `modules/auth/test/session/usecase/start-session.usecase.test.ts`; verified: `npm test --workspace
  > @rochas-surf-school/auth -- test/session` (2 suites, 13 passed; every `src/session` file 100%), full auth
  > suite 93 passed, lint and check-types clean; deviations: `module-use-case` mandatory readings
  > (`register-user.usecase.ts`, `fake-crypto.provider.ts`) do not exist in the repo, so the existing
  > `create-identity`/`search-users-by-name` use cases served as the pattern; `StartSession` also takes a
  > `ClockProvider` (reused from the sign-in-code aggregate) to compute the refresh-token expiry

- [x] **T-06** — Implement `RequestSignInCode` in
  `modules/auth/src/sign-in-code/usecase/request-sign-in-code.usecase.ts` (input `{ email, locale? }`, output
  `{ resendAvailableAt, expiresAt }`; dependencies: repository, code provider, email provider, clock, review
  codes map) following D-04, D-05, D-09 and D-11, with tests in
  `modules/auth/test/sign-in-code/usecase/request-sign-in-code.usecase.test.ts` named so the ER filters match
  ("cooldown", "send fails", "review account"). Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03, ER-10 · Done when: that test file passes with the use case fully covered.
  > ✅ 2026-10-07 11:46 — implemented `RequestSignInCode` (`module-use-case`, custom, with output): normalizes
  > the email (trim + lowercase), validates email and locale together (missing locale → `pt-BR`; errors
  > `signInCode.email.invalid` / `signInCode.locale.invalid`, 422), rejects within 30 s of `lastSentAt` with
  > `TooManyRequestsError("signInCode.resend.tooSoon", { resendAvailableAt })`, upserts the validated row (new
  > hash, expiry now + 10 min, `lastSentAt` now, attempts 0), uses the fixed review code and sends nothing for
  > review emails (D-04), otherwise sends with `idempotencyKey: signin-code:<email>:<ms>` and on failure deletes
  > the row and throws `BadGatewayError("signInCode.email.sendFailed")` (D-09). Added `normalizeEmail`,
  > `isValidEmail` and the TTL/cooldown/max-attempts constants to the entity file, with entity tests. Tests
  > written first and watched fail (15 failed). files:
  > `modules/auth/src/sign-in-code/usecase/request-sign-in-code.usecase.ts`,
  > `modules/auth/src/sign-in-code/usecase/index.ts`,
  > `modules/auth/src/sign-in-code/model/sign-in-code.entity.ts`,
  > `modules/auth/test/sign-in-code/usecase/request-sign-in-code.usecase.test.ts`,
  > `modules/auth/test/sign-in-code/model/sign-in-code.entity.test.ts`; verified: `npm test --workspace
  > @rochas-surf-school/auth -- test/sign-in-code/usecase/request-sign-in-code.usecase.test.ts` (15 passed,
  > incl. -t "cooldown", "send fails", "review account"; use case 100% statements/branches/functions/lines),
  > full auth suite 11 suites / 111 passed, lint and check-types clean; deviations: none

- [x] **T-07** — Implement `VerifySignInCode` in
  `modules/auth/src/sign-in-code/usecase/verify-sign-in-code.usecase.ts` (input `{ email, code, name? }`,
  output the session plus `user: { id, name, email, role, status }`; dependencies: sign-in-code, user and
  identity repositories, code provider, clock, `StartSession`) following D-02, D-03, D-04 and D-10, with tests
  in `modules/auth/test/sign-in-code/usecase/verify-sign-in-code.usecase.test.ts` named so the ER filters
  match ("existing account", "new account", "wrong code", "expired", "attempts", "single use", "review
  account"). Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-04, ER-05, ER-06, ER-07, ER-08, ER-09, ER-10 · Done when: that test file passes with the use case
  fully covered.
  > ✅ 2026-10-07 11:48 — implemented `VerifySignInCode` (`module-use-case`, custom, with output): normalizes the
  > email, treats a non-string code as wrong; no row → `signInCode.code.invalid`, `attempts >= 5` →
  > `signInCode.attempts.exceeded`, `now >= expiresAt` → `signInCode.code.expired`, mismatch →
  > `incrementAttempts` + `signInCode.code.invalid` (all `UnauthorizedError`, D-10); then finds the user by
  > email or builds and validates a new pending student from the trimmed `name` before consuming (missing → 422
  > `user.name.required`, D-02), consumes atomically (`false` → invalid, D-03), creates the user if new, adds an
  > `email` identity (`providerUserId` = normalized email) when the account has none, and starts the session
  > through `StartSession`; returns the session plus `user { id, name, email, role, status }` for any status.
  > Tests written first and watched fail (31 failed). files:
  > `modules/auth/src/sign-in-code/usecase/verify-sign-in-code.usecase.ts`,
  > `modules/auth/src/sign-in-code/usecase/index.ts`,
  > `modules/auth/test/sign-in-code/usecase/verify-sign-in-code.usecase.test.ts`; verified: `npm test
  > --workspace @rochas-surf-school/auth -- test/sign-in-code/usecase/verify-sign-in-code.usecase.test.ts` (31
  > passed, with describe blocks "existing account", "new account", "wrong code", "expired", "attempts", "single
  > use", "review account"; use case 100% statements/branches/functions/lines), full auth suite 12 suites / 142
  > passed, lint, check-types and build clean; deviations: the use case also takes `refreshTokenTtlDays` in its
  > constructor to pass to `StartSession`; ER-05 says a name "Al" answers `errors: ["user.name.min.length"]`,
  > but the existing `User` validator also reports `user.name.person.name` for it (a single word), so the errors
  > list is `["user.name.min.length", "user.name.person.name"]` — the test asserts the first key, which is the
  > one the app shows

- [x] **T-08** — Implement `DeleteExpiredSignInCodes` in
  `modules/auth/src/sign-in-code/usecase/delete-expired-sign-in-codes.usecase.ts` (uses the clock and
  `deleteExpired`, returns the count), with tests. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-13 · Done when:
  `npm test --workspace @rochas-surf-school/auth -- test/sign-in-code/usecase/delete-expired-sign-in-codes.usecase.test.ts`
  passes.
  > ✅ 2026-10-07 11:48 — implemented `DeleteExpiredSignInCodes` (`module-use-case`, custom, output `{ deleted
  > }`): calls `deleteExpired(clock.now())` and returns the count. Tests written first and watched fail (4
  > failed). files: `modules/auth/src/sign-in-code/usecase/delete-expired-sign-in-codes.usecase.ts`,
  > `modules/auth/src/sign-in-code/usecase/index.ts`,
  > `modules/auth/test/sign-in-code/usecase/delete-expired-sign-in-codes.usecase.test.ts`; verified: `npm test
  > --workspace @rochas-surf-school/auth --
  > test/sign-in-code/usecase/delete-expired-sign-in-codes.usecase.test.ts` (4 passed; use case 100%), lint,
  > check-types and build clean; deviations: returns `{ deleted: number }` (the use-case `Out` convention)
  > rather than a bare number

### Backend (`apps/backend`)

- [x] **T-09** — Fix the `backend-nest-config` templates in `.claude/skills/backend-nest-config/assets/`
  (ESM `.js` suffix on every relative import, `DomainError.details` passed to the response `details` in
  `errors/api-exception.filter.ts`, English error messages), apply the skill, then remove
  `apps/backend/src/app.controller.ts`, `app.service.ts`, `app.controller.spec.ts` and
  `apps/backend/test/app.e2e-spec.ts` and their registration in `app.module.ts`. Set `JWT_EXPIRES_IN=15m` in
  `.env.example`. Add a unit test for the filter's `details` passthrough in
  `apps/backend/src/shared/errors/api-exception.filter.spec.ts` (and its template copy). Skill:
  [`backend-nest-config`](../../../.claude/skills/backend-nest-config).
  Covers: ER-02 · Done when: `npx turbo run build check-types lint --filter=@rochas-surf-school/backend` exits
  0 and the filter spec passes.
  > ✅ 2026-10-07 11:51 — fixed the `backend-nest-config` templates — `.js` suffix on every relative import
  > (directory barrels as `./x/index.js`), `ApiExceptionFilter` passes `DomainError.details` to the response,
  > English message in `JwtStrategy` (`JWT_SECRET is not configured`), `JWT_EXPIRES_IN` default `15m` (script
  > and module fallback) — and added Vitest spec templates for the filter (incl. `details` passthrough), guard,
  > strategy/mapper, decorators and barrel; documented them in its SKILL.md; applied the skill (installed
  > `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `@types/passport-jwt`; wrote
  > `apps/backend/src/shared/`; added `JWT_SECRET`/`JWT_EXPIRES_IN=15m` to `.env.example`), then removed the
  > stock `AppController`/`AppService`/their spec/`test/app.e2e-spec.ts` and rewrote `app.module.ts` without
  > them, keeping `AuthModule`. files: `.claude/skills/backend-nest-config/SKILL.md`,
  > `.claude/skills/backend-nest-config/scripts/apply-backend-shared.js`,
  > `.claude/skills/backend-nest-config/assets/app-controller.template.ts`,
  > `.claude/skills/backend-nest-config/assets/app-module.template.ts`,
  > `.claude/skills/backend-nest-config/assets/app-module-no-db.template.ts`,
  > `.claude/skills/backend-nest-config/assets/shared-template/**` (every `.ts` file plus the new
  > `index.spec.ts`, `auth/jwt-auth.guard.spec.ts`, `auth/jwt.strategy.spec.ts`,
  > `decorators/current-user.decorator.spec.ts`, `errors/api-exception.filter.spec.ts`),
  > `apps/backend/src/shared/**` (generated copy of the same files), `apps/backend/src/app.module.ts`,
  > `apps/backend/src/app.controller.ts` (deleted), `apps/backend/src/app.service.ts` (deleted),
  > `apps/backend/src/app.controller.spec.ts` (deleted), `apps/backend/test/app.e2e-spec.ts` (deleted),
  > `apps/backend/.env.example`, `apps/backend/package.json`, `package-lock.json`; verified: `npx turbo run
  > build check-types lint --filter=@rochas-surf-school/backend` (8 successful; oxlint 0 warnings), `npx vitest
  > run src/shared` (5 files, 21 passed, incl. "passes the details of a DomainError to the response");
  > deviations: specs for the whole shared layer (not only the filter) were added, because the coverage gate
  > counts every new file in full; the guard and strategy each keep one uncovered branch on their class line —
  > the `design:paramtypes` conditional TypeScript emits for decorator metadata, which no test can reach (to be
  > settled with the user before the coverage gate); the e2e suite has no file until T-16

- [x] **T-10** — Add the `SignInCode` (`sign_in_codes`) and `RefreshToken` (`refresh_tokens`) models to
  `apps/backend/prisma/models/auth.model.prisma` as D-08 describes, and generate the migration
  `auth-add-sign-in-codes-and-refresh-tokens`. Skill:
  [`backend-prisma-sync-module`](../../../.claude/skills/backend-prisma-sync-module).
  Covers: enabling · Done when: `npm run prisma:migrate:deploy --workspace apps/backend` applies cleanly on
  the local database and `npm run prisma:generate --workspace apps/backend` succeeds.
  > ✅ 2026-10-07 11:52 — following `backend-prisma-sync-module` for `auth`: added `SignInCode` (`sign_in_codes`:
  > Entity uuid `id`, unique `email`, `code_hash`, `expires_at` indexed, `last_sent_at`, `attempts` default 0,
  > timestamps) and `RefreshToken` (`refresh_tokens`: `user_id` FK to `users` with cascade + index, unique
  > `token_hash`, `family_id` uuid + index, `expires_at`, `revoked_at`, timestamps) and the `User.refreshTokens`
  > relation; started the local database (`npm run db:start`) and generated the migration with
  > `prisma:migrate:dev -- --name auth-add-sign-in-codes-and-refresh-tokens` (only CREATE TABLE/INDEX and one
  > FK, nothing destructive). files: `apps/backend/prisma/models/auth.model.prisma`,
  > `apps/backend/prisma/migrations/20261007145217_auth_add_sign_in_codes_and_refresh_tokens/migration.sql`;
  > verified: `npm run prisma:migrate:deploy --workspace apps/backend` (3 migrations, none pending after dev
  > applied it), `npm run prisma:generate --workspace apps/backend` (Generated Prisma Client 7.10.0);
  > deviations: Prisma writes the folder name with underscores (`auth_add_sign_in_codes_and_refresh_tokens`), as
  > it did for the earlier migrations

- [x] **T-11** — Create `PrismaUserRepository` (`apps/backend/src/modules/auth/user.prisma.ts`, including
  `findByEmail` and the rules-acceptance child rows) and `PrismaIdentityRepository`
  (`apps/backend/src/modules/auth/identity.prisma.ts`), registered in `auth.module.ts`, with unit tests that
  mock `PrismaService`. Skill: [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-04, ER-05 · Done when: `npx vitest run src/modules/auth/user.prisma.spec.ts
  src/modules/auth/identity.prisma.spec.ts` (from `apps/backend`) passes with both files fully covered.
  > ✅ 2026-10-07 11:54 — following `backend-prisma-repository`: `PrismaUserRepository` (CRUD, `findByEmail`,
  > `searchByName` trimmed + case-insensitive, `findPage`; rules acceptances written through the nested
  > `user_rules_acceptances` relation — created on `create`, replaced with `deleteMany` + `create` on `update`;
  > private mappers between the entity and the record, `null` ↔ `undefined`) and `PrismaIdentityRepository`
  > (`create`, `findByProvider` via the `provider_providerUserId` unique, `findByUserId`), both injecting
  > `PrismaService` and registered in `auth.module.ts` (which now imports `DbModule`); unit specs mock
  > `PrismaService`. files: `apps/backend/src/modules/auth/user.prisma.ts`,
  > `apps/backend/src/modules/auth/user.prisma.spec.ts`, `apps/backend/src/modules/auth/identity.prisma.ts`,
  > `apps/backend/src/modules/auth/identity.prisma.spec.ts`, `apps/backend/src/modules/auth/auth.module.ts`;
  > verified: `npx vitest run src/modules/auth/user.prisma.spec.ts src/modules/auth/identity.prisma.spec.ts` (2
  > files, 12 passed; 100% statements/functions/lines, every branch covered except the decorator-metadata
  > conditional on each class line, which T-22 settles), backend `tsc --noEmit`, oxlint and build clean;
  > deviations: none

- [x] **T-12** — Create `PrismaSignInCodeRepository` (`apps/backend/src/modules/auth/sign-in-code.prisma.ts`:
  `save` as an `upsert` by email, `consume` as `deleteMany({ email, codeHash })`, `incrementAttempts` as an
  atomic `update` with `increment`, `deleteExpired` as `deleteMany({ expiresAt: { lt: now } })`) and
  `PrismaRefreshTokenRepository` (`apps/backend/src/modules/auth/refresh-token.prisma.ts`), registered in
  `auth.module.ts`, with unit tests that mock `PrismaService`. Skill:
  [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-06, ER-09, ER-13, ER-14 · Done when: their spec files pass with both files fully covered.
  > ✅ 2026-10-07 11:55 — following `backend-prisma-repository`: `PrismaSignInCodeRepository` (`findByEmail`;
  > `save` as an `upsert` by email whose update resets hash, expiry, `lastSentAt` and attempts; `deleteByEmail`
  > and `consume` as `deleteMany` — `consume` matches `{ email, codeHash }` and returns `count === 1`;
  > `incrementAttempts` as an atomic `{ attempts: { increment: 1 } }`; `deleteExpired` as `deleteMany({
  > expiresAt: { lt: now } })` returning the count) and `PrismaRefreshTokenRepository` (`create`), registered in
  > `auth.module.ts`, with specs mocking `PrismaService`. Also appended T-22 (added during execution) for the
  > coverage policy the user approved. files: `apps/backend/src/modules/auth/sign-in-code.prisma.ts`,
  > `apps/backend/src/modules/auth/sign-in-code.prisma.spec.ts`,
  > `apps/backend/src/modules/auth/refresh-token.prisma.ts`,
  > `apps/backend/src/modules/auth/refresh-token.prisma.spec.ts`,
  > `apps/backend/src/modules/auth/auth.module.ts`; verified: `npx vitest run
  > src/modules/auth/sign-in-code.prisma.spec.ts src/modules/auth/refresh-token.prisma.spec.ts` (2 files, 8
  > passed; 100% statements/functions/lines, every branch except the decorator-metadata conditional on the class
  > line), backend `tsc --noEmit` and oxlint clean; deviations: `incrementAttempts` and `deleteByEmail` use
  > `updateMany`/`deleteMany` (still one atomic statement) so a row deleted concurrently by a successful verify
  > does not make them throw

- [x] **T-13** — Implement `HmacSignInCodeProvider` (`hmac.sign-in-code.ts`, D-07, pepper from
  `AUTH_CODE_PEPPER`), `SystemClockProvider` (`system.clock.ts`) and `JwtTokenProvider` (`jwt.token.ts`,
  `@nestjs/jwt`, D-01 and D-07) in `apps/backend/src/modules/auth/`, registered in `auth.module.ts`, with spec
  files (6-digit padded codes, HMAC stability and mismatch, JWT `sub`/`exp`, refresh-token hash). Skill:
  [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation) (its mandatory
  readings `bcrypt.crypto.ts` and `crypto.provider.ts` don't exist; record the deviation).
  Covers: ER-01, ER-14 · Done when: the three spec files pass with the providers fully covered.
  > ✅ 2026-10-07 11:56 — implemented, following `backend-provider-implementation`: `HmacSignInCodeProvider`
  > (`randomInt(0, 1_000_000)` padded to 6 digits; hex HMAC-SHA256 keyed by `AUTH_CODE_PEPPER` over
  > `email:code`; `matches` with `timingSafeEqual`, false on a length mismatch; throws `AUTH_CODE_PEPPER is not
  > configured` on construction), `SystemClockProvider` and `JwtTokenProvider` (`JwtService.sign({ sub, email },
  > { algorithm: "HS256" })` with the module secret/expiry, `expiresAt` from the token `exp`; refresh token = 32
  > random bytes base64url, hash = SHA-256 hex), registered in `auth.module.ts` (which now imports
  > `JwtAuthModule` for `JwtService`). files: `apps/backend/src/modules/auth/hmac.sign-in-code.ts`,
  > `apps/backend/src/modules/auth/hmac.sign-in-code.spec.ts`, `apps/backend/src/modules/auth/system.clock.ts`,
  > `apps/backend/src/modules/auth/system.clock.spec.ts`, `apps/backend/src/modules/auth/jwt.token.ts`,
  > `apps/backend/src/modules/auth/jwt.token.spec.ts`, `apps/backend/src/modules/auth/auth.module.ts`; verified:
  > `npx vitest run src/modules/auth/hmac.sign-in-code.spec.ts src/modules/auth/system.clock.spec.ts
  > src/modules/auth/jwt.token.spec.ts` (3 files, 12 passed; 100% statements/functions/lines, every branch
  > except the decorator-metadata conditional on the class line of the two injected classes), backend `tsc
  > --noEmit` and oxlint clean; deviations: the skill’s mandatory readings `bcrypt.crypto.ts` and
  > `crypto.provider.ts` do not exist in the repo, so the provider pattern came from the skill text and the
  > technical context; the pepper is read from `ConfigService` here and moves to `AuthConfig` in T-15

- [x] **T-14** — Install `resend` in `apps/backend` and implement `ResendEmailProvider`
  (`apps/backend/src/modules/auth/resend.email.ts`) with the copy of ER-15, the `idempotencyKey` request
  option, the `error` check, the development log fallback and the production guard (D-06), registered in
  `auth.module.ts`, with `resend.email.spec.ts` mocking the Resend client. Add `RESEND_API_KEY` and
  `EMAIL_FROM` to `.env.example`. Skill:
  [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-15, ER-16 · Done when: `npx vitest run src/modules/auth/resend.email.spec.ts` passes with the
  provider fully covered.
  > ✅ 2026-10-07 11:57 — installed `resend` (^6.32.1; API checked against the Resend Node SDK docs via Context7:
  > `emails.send(payload, { idempotencyKey })` returns `{ data, error }`) and implemented `ResendEmailProvider`,
  > following `backend-provider-implementation`: the pt-BR/es/en subject and text of ER-15, `html` = the same
  > text in a `<p>` (HTML-escaped), `from: EMAIL_FROM`, the `idempotencyKey` request option, rejects when the
  > response has `error`; with `RESEND_API_KEY` unset it logs the email and code outside production and throws
  > on construction in production; with a key but no `EMAIL_FROM` it throws on construction. Registered in
  > `auth.module.ts`; `RESEND_API_KEY` and `EMAIL_FROM` added to `.env.example`. files:
  > `apps/backend/src/modules/auth/resend.email.ts`, `apps/backend/src/modules/auth/resend.email.spec.ts`,
  > `apps/backend/src/modules/auth/auth.module.ts`, `apps/backend/.env.example`, `apps/backend/package.json`,
  > `package-lock.json`; verified: `npx vitest run src/modules/auth/resend.email.spec.ts` (8 passed; 100%
  > statements/functions/lines, every branch except the decorator-metadata conditional on the class line),
  > backend `tsc --noEmit` and oxlint clean; deviations: the `EMAIL_FROM` guard is an addition (a configured key
  > without a sender would fail every send)

- [x] **T-15** — Create `apps/backend/src/modules/auth/auth.config.ts`: reads and validates
  `AUTH_CODE_PEPPER` (required), `REFRESH_TOKEN_EXPIRES_IN_DAYS` (default 30) and `REVIEW_ACCOUNTS` (D-15;
  unset → no review accounts), and exposes the review codes map; registered in `auth.module.ts`, with
  `auth.config.spec.ts`. Add `AUTH_CODE_PEPPER`, `REVIEW_ACCOUNTS` and `REFRESH_TOKEN_EXPIRES_IN_DAYS` to
  `.env.example`.
  Covers: ER-10, ER-16 · Done when: `npx vitest run src/modules/auth/auth.config.spec.ts` passes with the
  file fully covered.
  > ✅ 2026-10-07 11:58 — created `AuthConfig` (injectable, registered in `auth.module.ts`): requires
  > `AUTH_CODE_PEPPER` (throws on construction), reads `REFRESH_TOKEN_EXPIRES_IN_DAYS` (default 30, positive
  > integer or throws), parses `REVIEW_ACCOUNTS` with the exported `parseReviewAccounts` (unset/blank → none;
  > throws on invalid JSON, non-array, non-object entry, invalid email, code not 6 digits, unknown role, missing
  > name or a repeated email; emails normalized, names trimmed) and exposes `reviewCodes` (email → code);
  > `HmacSignInCodeProvider` now takes its pepper from `AuthConfig` (its spec updated). `AUTH_CODE_PEPPER`,
  > `REFRESH_TOKEN_EXPIRES_IN_DAYS=30` and `REVIEW_ACCOUNTS` added to `.env.example`. files:
  > `apps/backend/src/modules/auth/auth.config.ts`, `apps/backend/src/modules/auth/auth.config.spec.ts`,
  > `apps/backend/src/modules/auth/hmac.sign-in-code.ts`,
  > `apps/backend/src/modules/auth/hmac.sign-in-code.spec.ts`, `apps/backend/src/modules/auth/auth.module.ts`,
  > `apps/backend/.env.example`; verified: `npx vitest run src/modules/auth/auth.config.spec.ts` (with the HMAC
  > spec: 2 files, 23 passed; `auth.config.ts` 100% statements/functions/lines, every branch except the
  > decorator-metadata conditional on the class line), backend `tsc --noEmit` and oxlint clean; deviations:
  > duplicate review emails are also rejected

- [x] **T-16** — Replace the placeholder `GET /auth` in `apps/backend/src/modules/auth/auth.controller.ts`
  with `POST /auth/email/code` (`@Public()`, 202, wires `RequestSignInCode`), add its requests to
  `auth.integration.http`, a controller spec, and create `apps/backend/test/auth-email.e2e-spec.ts` with the
  `ResendEmailProvider` overridden by a capturing fake (D-18) and the scenarios "request code", "too soon" and
  "send fails". Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller) (its
  mandatory reading `auth.integration.http` doesn't exist yet; this task creates it).
  Covers: ER-01, ER-02, ER-03, ER-10 · Done when:
  `npm run test:e2e --workspace apps/backend -- test/auth-email.e2e-spec.ts` passes against the local database.
  > ✅ 2026-10-07 12:00 — following `backend-nest-controller`: replaced the placeholder `GET /auth` with `POST
  > /auth/email/code` (`@Public()`, 202, body = the use case `In`, instantiates `RequestSignInCode` per request
  > with the injected `PrismaSignInCodeRepository`, `HmacSignInCodeProvider`, `ResendEmailProvider`,
  > `SystemClockProvider` and `AuthConfig.reviewCodes`); created `auth.integration.http` (valid, too-soon,
  > invalid email, invalid locale), a controller spec (route metadata, wiring, review codes, missing body) and
  > `test/auth-email.e2e-spec.ts` — a fresh app per test with `ResendEmailProvider` overridden by a capturing
  > fake (D-18), default `AUTH_CODE_PEPPER`/`JWT_SECRET` for runs without `.env`, test emails on
  > `@e2e.example.com` deleted after each test — with the scenarios "request code" (202 shape, one email with a
  > 6-digit code in `es`, 64-hex hash that is not the code, same answer with or without an account, default
  > `pt-BR`, 422 `signInCode.email.invalid` / `signInCode.locale.invalid` sending nothing), "too soon" (429 with
  > `details.resendAvailableAt`) and "send fails" (502, no row, immediate retry 202). files:
  > `apps/backend/src/modules/auth/auth.controller.ts`, `apps/backend/src/modules/auth/auth.controller.spec.ts`,
  > `apps/backend/src/modules/auth/auth.integration.http`, `apps/backend/test/auth-email.e2e-spec.ts`; verified:
  > `npm run test:e2e --workspace apps/backend -- test/auth-email.e2e-spec.ts` against the local database (1
  > file, 7 passed), `npx vitest run src/modules/auth/auth.controller.spec.ts` (4 passed; controller 100%),
  > backend `tsc --noEmit` and oxlint clean; deviations: the skill’s mandatory reading `auth.integration.http`
  > did not exist (created here, as the task says); the ER-02 check that the first code still signs in after a
  > 429 needs verify and is added to "too soon" in T-17

- [x] **T-17** — Add `POST /auth/email/verify` (`@Public()`, 200, wires `VerifySignInCode` with
  `StartSession`) to `auth.controller.ts`, its requests to `auth.integration.http`, controller spec cases,
  and the e2e scenarios "existing account", "new account", "wrong code", "lockout", "single use", "review
  account" and "session" in `test/auth-email.e2e-spec.ts`. Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-04, ER-05, ER-06, ER-08, ER-09, ER-10, ER-14 · Done when: the e2e file passes against the local
  database.
  > ✅ 2026-10-07 12:01 — added `POST /auth/email/verify` (`@Public()`, 200, body = `VerifySignInCodeIn`, builds
  > `StartSession` with `PrismaRefreshTokenRepository`/`JwtTokenProvider`/clock and runs `VerifySignInCode` with
  > the Prisma user and identity repositories and `AuthConfig.refreshTokenTtlDays`); its requests in
  > `auth.integration.http`; controller spec cases (route metadata, session wiring and TTL, name passthrough,
  > missing body); and the e2e scenarios "existing account" (200 shape, case/space-insensitive, row deleted,
  > Google account gets an `email` identity without a second account, no duplicate identity,
  > denied/deleted/removed get 200 + status), "new account" (422 `user.name.required` without consuming or
  > counting, then 200 pending student with an `email` identity and the row gone; "Al" → 422 first key
  > `user.name.min.length` and the code still works; wrong code with a name → 401, nothing created), "wrong
  > code" (401, attempts + 1, no code requested → 401, "12ab" → 401), "lockout" (5 wrong →
  > `signInCode.attempts.exceeded`; 4 wrong → 200), "single use" (second verify 401; two concurrent → one 200
  > and one 401, one refresh token), "review account" (REVIEW_ACCOUNTS set by the suite: 202 without email then
  > 200 approved admin; 246810 rejected for another email and before a request; cooldown 429 and lockout apply)
  > and "session" (HS256 JWT verified with `JWT_SECRET`, `sub` = user id, `exp - iat` = 900 s; one
  > `refresh_tokens` row with SHA-256 hex of the returned token, expiry 30 days, a family id; two sign-ins → two
  > rows, two families); "too soon" now also checks the first code still signs in. files:
  > `apps/backend/src/modules/auth/auth.controller.ts`, `apps/backend/src/modules/auth/auth.controller.spec.ts`,
  > `apps/backend/src/modules/auth/auth.integration.http`, `apps/backend/test/auth-email.e2e-spec.ts`; verified:
  > `npm run test:e2e --workspace apps/backend -- test/auth-email.e2e-spec.ts` against the local database (1
  > file, 28 passed), `npx vitest run src/modules/auth/auth.controller.spec.ts` (8 passed; controller 100%),
  > backend `tsc --noEmit` and oxlint clean; deviations: none

- [ ] **T-18** — Install `@nestjs/throttler`, register `ThrottlerModule` and its guard with the limits and the
  `request.rate.limited` message of D-13 (per-route limits on the two endpoints), and add the "rate limit"
  e2e scenarios (a fresh app per test so the in-memory counters reset).
  Covers: ER-12 · Done when: `npm run test:e2e --workspace apps/backend -- test/auth-email.e2e-spec.ts -t "rate limit"`
  passes and the other e2e scenarios still pass.

- [ ] **T-19** — Install `@nestjs/schedule`, register `ScheduleModule`, and create
  `apps/backend/src/modules/auth/sign-in-code-cleanup.job.ts` (`@Cron` every minute calling
  `DeleteExpiredSignInCodes`), registered in `auth.module.ts`, with `sign-in-code-cleanup.job.spec.ts`.
  Covers: ER-13 · Done when: `npx vitest run src/modules/auth/sign-in-code-cleanup.job.spec.ts` passes with
  the job fully covered.

- [ ] **T-20** — Create the review-accounts seed task in `apps/backend/prisma/seed/review-accounts.seed.ts`
  (reads `REVIEW_ACCOUNTS` through the same parser as `auth.config.ts`, upserts users and `email` identities
  per D-15) and register it in `prisma/seed/main.ts`, with `review-accounts.seed.spec.ts` mocking the
  Prisma client.
  Covers: ER-11 · Done when: `npx vitest run prisma/seed/review-accounts.seed.spec.ts` passes and
  `npm run prisma:seed --workspace apps/backend` run twice against the local database leaves three review
  accounts.

- [ ] **T-22** — (added during execution) Make the coverage gate skip the decorator-metadata conditional:
  the `typeof X === "undefined" ? Object : X` branch the Vitest transform emits for `design:paramtypes` on
  the declaration line of a decorated class with constructor injection, which no test can reach. Record the
  rule in `.specs/memory/technical-context.md` → Coverage and teach `.specs/scripts/check-coverage.mjs` to skip
  exactly that branch, with a test of the rule. Approved by the user on 2026-10-07.
  Covers: enabling · Done when: `node .specs/scripts/check-coverage.mjs 001` no longer reports the class-line
  branch of `jwt-auth.guard.ts` or the Prisma repositories, and still reports any other uncovered branch.

### Verification

- [ ] **T-21** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence, and ask the user to run the manual journey and record its result.
  Covers: all · Done when: every automated command exits 0 and the manual journey is recorded.

## Verification Plan

- Automated (the local database up with `npm run db:start --workspace apps/backend` and the migrations applied
  with `npm run prisma:migrate:deploy --workspace apps/backend`):
  - `node .specs/scripts/run-related-tests.mjs 001` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 001` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/shared --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/backend`
    — no errors.
  - `node .specs/scripts/run-e2e.mjs 001` — the backend e2e suite passes, including `test/auth-email.e2e-spec.ts`.
  - Every `Verify by` command of ER-01 to ER-16 passes.
- User journeys (manual, run by the user — a reviewer agent can't read an inbox):
  - With `RESEND_API_KEY`, `EMAIL_FROM` (an address on the verified domain), `AUTH_CODE_PEPPER` and
    `JWT_SECRET` set in `apps/backend/.env`, run `docker compose up --build` from `apps/backend`, then send
    `POST http://localhost:4000/auth/email/code` with `{ "email": "<your address>", "locale": "pt-BR" }`:
    the answer is 202, and an email arrives whose subject is "<code> é o seu código da Rocha's Surf School".
    Send `POST /auth/email/verify` with that email, the code and a name: the answer is 200 with tokens, and
    `SELECT count(*) FROM sign_in_codes WHERE email = '<your address>'` returns 0.

## Memory Impact

- `memory/product.md` — Sign-in code: the 5-wrong-guesses lockout, the IP rate limits, the email's language
  follows the sign-in screen's language picker, and email sign-ups give their name before the account is
  created (D-02, D-04, D-05, D-13); Current state: email-code sign-in works on the backend.
- `memory/technical-context.md` — External integrations → Email: Resend chosen, behind `EmailProvider`
  (`ResendEmailProvider`, development log fallback, production guard); Authentication: the env vars of D-17,
  the code hashing (D-07) and `REVIEW_ACCOUNTS` format (D-15); Fixed conventions: the email copy is the one
  backend-side user-facing text (D-05); new backend libraries `resend`, `@nestjs/throttler`,
  `@nestjs/schedule`; `backend-nest-config` applied and its templates now ESM; `modules/auth` has oxlint and
  `check-types`.
- `memory/structure.md` — create it: the `sign-in-code` and `session` aggregates in `modules/auth`, the
  backend's `apps/backend/src/shared/` and `apps/backend/src/modules/auth/` files, the routes
  `POST /auth/email/code` and `POST /auth/email/verify`, and the `sign_in_codes` and `refresh_tokens` tables.
- `memory/modules.md` — create it, listing the `auth` module (accounts, identities, sign-in codes, sessions).
- `memory/modules/auth.md` — create it: the module's concepts (User, Identity, SignInCode, RefreshToken), the
  sign-in-code rules (D-02 to D-04, D-09, D-10), the error keys (D-11) and its boundaries (no HTTP, no tokens
  formats beyond the `TokenProvider` port).

## Assumptions

- Two requests for the same email that arrive at the same instant may both pass the cooldown and send two
  emails; accepted as low impact (no lock on the upsert).
- The backend runs as one instance, so the in-memory throttler counts every request (technical-context →
  Scheduled work). How the client IP is read behind a proxy is decided by the first spec that deploys.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
