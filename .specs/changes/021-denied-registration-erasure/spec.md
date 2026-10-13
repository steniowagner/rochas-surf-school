---
id: "021"
slug: denied-registration-erasure
title: Erase denied registrations 30 days after the denial
status: in-progress
started: 2026-10-12
base_commit: f93006c228aaa82f14d74fae824f6694a328dd15
created: 2026-10-12
fronts: [notifications, auth, backend]
depends_on: []
---

# 021 — Erase denied registrations 30 days after the denial

## Goal

Thirty days after an admin denies a registration, the backend erases it: the account and everything that hangs
off it (identities, sessions, rules acceptances, its notifications and push tokens), and the admins' "new
registration" notifications that carry the person's name. The same email address can then sign up again, by
email code or Google, as a new registration waiting for approval. A job that runs every minute does the erasing;
it is idempotent, and it is the job a later spec extends with the erasure of deleted and removed accounts.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: **User** (lifecycle: `denied` → "erased 30
  days after the denial"; **Erasure** removes name, email, photo and WhatsApp number and frees the email), the
  decisions "Admin decisions are final in the app" (a `denied` account never leaves `denied`) and "Erasure keeps
  the school's history without the person" (a denied account has no history: no classes, ratings, photos or
  comments).
- Requirements:
  [requirements.md → Denied registrations are erased](../../../.docs/requirements.md#denied-registrations-are-erased)
  — a denied registration's data is erased 30 days after the denial, and the same email can then sign up again
  as a new registration.
  [requirements.md → Erasure](../../../.docs/requirements.md#erasure) — erasure removes the name, email, photo
  and WhatsApp number and frees the email; only these parts apply to a denied account (the "Former student"
  handling is for deleted and removed accounts, out of scope).
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Scheduled work (one
  job per kind of timed event, every minute, idempotent, one backend instance), Architecture (ports in the
  domain, adapters and jobs in the backend; a port `auth` declares and another backend module implements),
  Persistence (cascades, `users.status` is the authority), Authentication (registrations, `RegistrationNotifier`,
  `JwtAuthGuard` reloading the user, refresh tokens), Automated validation (Vitest + supertest e2e against
  Postgres).
- Modules: [modules/auth.md](../../memory/modules/auth.md) — Accounts and registrations;
  [modules/notifications.md](../../memory/modules/notifications.md) — the `registration.pending` notification
  and its params.
- Existing code this builds on:
  - `apps/backend/prisma/models/auth.model.prisma` — `users.denied_at`; `user_rules_acceptances`, `identities`
    and `refresh_tokens` reference `users` with `onDelete: Cascade`. `apps/backend/prisma/models/notifications.model.prisma`
    — `notifications` and `push_tokens` cascade too; `school-rules.model.prisma` — `rules.created_by` is
    `SetNull`. No migration is needed.
  - `modules/auth/src/user/usecase/deny-registration.usecase.ts` — sets `status: denied`, `denialReason` and
    `deniedAt` (the `ClockProvider`'s now) on every denial.
  - `modules/auth/src/sign-in-code/usecase/delete-expired-sign-in-codes.usecase.ts` and
    `apps/backend/src/modules/auth/sign-in-code-cleanup.job.ts` — the pattern of a use case run by a
    `@Cron(EVERY_MINUTE, { waitForCompletion: true })` job; `apps/backend/src/modules/notifications/push-receipt-check.job.ts`
    — the pattern of a job that catches and logs.
  - `modules/notifications/src/notification/usecase/notify-approved-admins.usecase.ts` — stores
    `registration.pending` with `params: { name }` for every approved admin, called by
    `NotificationsRegistrationNotifier.registrationPending({ id, name })`
    (`apps/backend/src/modules/notifications/notifications.registration-notifier.ts`), which already receives
    the account id.
  - `apps/backend/src/modules/notifications/notifications.push-token-remover.ts` — the pattern of an `auth` port
    implemented in the notifications adapters and exported by `NotificationsModule`.
  - `modules/auth/src/sign-in-code/usecase/verify-sign-in-code.usecase.ts`,
    `modules/auth/src/identity/usecase/sign-in-with-google.usecase.ts` — create a new `pending` student when no
    user (or Google identity) matches, so signing up again needs no change.

## Scope

### In scope

- Erasing, every minute, each `denied` account whose `deniedAt` is 30 days old or more, with everything that
  cascades from it.
- `registration.pending` notifications carrying the account id (`userId`) from now on, and deleting those about
  an erased account.
- An `AccountErasureJob` in the auth adapters, built to take more erasure use cases later.

### Out of scope

- Erasing deleted and removed accounts, and the "Former student" / "Former instructor" handling.
- Guest data erasure.
- Any mobile or web change: an erased person who is still signed in gets the existing "session expired"
  handling.
- `registration.pending` notifications stored before this spec (they carry no `userId`); only development
  databases have them, since nothing is deployed.
- Telling anyone about an erasure (no notification, no email).
- Running several backend instances (a lock or queue — the spec that scales out).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | A denied account is **hard deleted** (its `users` row). The database cascade removes its identities, refresh tokens, rules acceptances, notifications and push tokens; nothing is anonymized. | A denied account has no classes, ratings, photos or comments, so nothing of the school's history needs a "Former student" row; a placeholder row would only keep data the requirement says to erase. |
| D-02 | An account is due when `status = 'denied'` and `deniedAt ≤ now − 30 × 24 h` (UTC instant, the `ClockProvider`'s now). A `denied` row with a null `deniedAt` is never erased. | Fortaleza has no daylight saving, so this equals 30 calendar days but for the time of day, and it is simpler to test. Every denial stores `deniedAt`; a null one only comes from a hand edit, which has no date to count from. |
| D-03 | Idempotence by construction: the erased row's absence is the record of what was done; the user delete is a `deleteMany` on the selected ids **and** `status = 'denied'`. No marker table. | `denied` is final ("Admin decisions are final"), so a selected account can't change meanwhile, and a second tick finds nothing to do. The technical context's "records in the database what it already did" is satisfied by the deletion itself. |
| D-04 | `registration.pending` params become `{ name, userId }` (the pending account's id). The erasure deletes every `registration.pending` notification whose `params.userId` is an erased id, through a new port `auth` declares — `RegistrationNotificationEraser` (`erase(userIds: string[]): Promise<void>`) in `modules/auth/src/user/provider/` — implemented by `NotificationsRegistrationNotificationEraser` in `apps/backend/src/modules/notifications/` and exported by `NotificationsModule`. | The person's name sits in every admin's notification, which the cascade doesn't reach (the rows belong to the admins); without an id nothing can find them. The port keeps `auth` independent from `notifications`, as `PushTokenRemover` does. The push catalog ignores extra params. |
| D-05 | `EraseDeniedRegistrations` runs in this order: select the due ids (`UserRepository.findDeniedBefore(cutoff)`), stop when there are none, erase their notifications, then delete the users (`UserRepository.deleteDenied(ids)`); it returns `{ erased }`, the number of users deleted. | When a step fails, the users are still there, so the next tick selects and retries them; deleting the users first could leave names behind with no id to find them. |
| D-06 | One job, `AccountErasureJob` (`apps/backend/src/modules/auth/account-erasure.job.ts`, cron name `account-erasure`), runs `EraseDeniedRegistrations` every minute with `waitForCompletion: true`; it catches and logs any error (never throws) and logs only the number erased when it is above 0 — never an email, name or id. | "30-day erasures" is one kind of timed event in the technical context; a later spec adds the deleted/removed use case to this job. Logs must not carry personal data that was just erased. |
| D-07 | Nothing else is notified or audited. | No requirement asks for it, and an audit row would keep the data the erasure removes. |

## Expected Results

### ER-01 — A registration denied 30 days ago is erased with what hangs off it

- **Front:** backend
- **Behavior:** Given a `denied` account whose `deniedAt` is 30 days or more before now, with an email identity,
  a Google identity, a refresh token, a rules acceptance, a notification of its own and a push token, when the
  `AccountErasureJob` runs, then the `users` row and all those rows are gone.
- **Edge and error cases:** an account denied exactly 30 × 24 h ago is erased; one denied 30 × 24 h − 1 minute
  ago is kept; a `denied` account with a null `deniedAt` is kept; `pending`, `approved`, `deleted` and `removed`
  accounts are kept whatever their `deniedAt`, `removedAt` or `deletedAt`; a rule written by another account is
  untouched.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/account-erasure.e2e-spec.ts -t "erases"`
  (from `apps/backend`); `npx jest test/user/usecase/erase-denied-registrations.usecase.test.ts` (from
  `modules/auth`).

### ER-02 — The erasure job runs every minute and is idempotent

- **Front:** backend
- **Behavior:** Given the job has just erased the due accounts, when it runs again, then it erases nothing,
  changes no row and reports `{ erased: 0 }`; the job is scheduled every minute with `waitForCompletion`.
- **Edge and error cases:** a run with nothing due doesn't call the notification eraser or delete anything; when
  the notification eraser or the user delete throws, the job logs the error and resolves, and the next run erases
  the same accounts; the log line carries the count only.
- **Verify by:** `npx vitest run src/modules/auth/account-erasure.job.spec.ts` (from `apps/backend`);
  `npx vitest run --config vitest.config.e2e.ts test/account-erasure.e2e-spec.ts -t "idempotent"`;
  `npx jest test/user/usecase/erase-denied-registrations.usecase.test.ts -t "again"` (from `modules/auth`).

### ER-03 — Admins' notifications about an erased registration are deleted

- **Front:** backend
- **Behavior:** Given a new account is created (email code or Google), when admins are notified, then each
  `registration.pending` row stores `params: { name, userId }` with the new account's id; and when that account
  is later erased, every `registration.pending` notification whose `params.userId` is its id is deleted.
- **Edge and error cases:** `registration.pending` notifications about another account (still pending, approved,
  or denied less than 30 days ago) are kept; the admins' other notifications are kept; rows without a `userId`
  are not touched; the push text is unchanged ("<name> is waiting for approval.").
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/account-erasure.e2e-spec.ts -t "notifications"`
  (from `apps/backend`); `npx jest test/notification/usecase` (from `modules/notifications`).

### ER-04 — The same email signs up again as a new registration

- **Front:** backend
- **Behavior:** Given a denied account was erased, when someone signs in with its email address by email code
  (`POST /auth/email/code` then `POST /auth/email/verify` with a name) or by Google (`POST /auth/google` with a
  token for that address), then a new account is created with a new id, `status: "pending"`,
  `denialReason: null` and `reactivationStatus: null`, and admins get a `registration.pending` notification.
- **Edge and error cases:** the erased account's refresh token answers 401 `auth.refreshToken.invalid` on
  `POST /auth/refresh`; its access token (still unexpired) answers 401 `auth.token.invalid` on `GET /auth/me`.
- **Verify by:** `npx vitest run --config vitest.config.e2e.ts test/account-erasure.e2e-spec.ts -t "signs up again"`
  (from `apps/backend`).

## Tasks

### Notifications module (`modules/notifications`)

- [x] **T-01** — `NotifyApprovedAdmins` takes `userId` in `NotifyApprovedAdminsIn` and stores
  `params: { name, userId }` (`modules/notifications/src/notification/usecase/notify-approved-admins.usecase.ts`),
  with its tests in `modules/notifications/test/notification/usecase/`. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-03 · Done when: `npm test --workspace @rochas-surf-school/notifications` passes, with a test asserting
  the stored params carry `userId`.
  > ✅ 2026-10-12 — `NotifyApprovedAdmins` takes `userId` and stores `params: { name, userId }`; files:
  > `modules/notifications/src/notification/usecase/notify-approved-admins.usecase.ts`,
  > `modules/notifications/test/notification/usecase/notify-approved-admins.usecase.test.ts`; verified:
  > `npm test --workspace @rochas-surf-school/notifications` (78 passed, stored params asserted with `userId`);
  > deviations: none

- [x] **T-02** — Add `deleteRegistrationPending(userIds: string[]): Promise<void>` to `NotificationRepository`
  (`modules/notifications/src/notification/provider/notification.repository.ts`) and its fake
  (`modules/notifications/test/mock/fake-notification.repository.ts`), and a `DeleteRegistrationNotifications`
  use case (`modules/notifications/src/notification/usecase/delete-registration-notifications.usecase.ts`,
  exported) that deletes nothing for an empty list, with tests. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-03 · Done when: `npm test --workspace @rochas-surf-school/notifications` passes, with tests for a match,
  other accounts' rows kept, other types kept and an empty list.
  > ✅ 2026-10-12 — `NotificationRepository.deleteRegistrationPending`, its fake (`items` no longer readonly so the
  > fake can filter) and the `DeleteRegistrationNotifications` use case (exported), with tests for a match, other
  > accounts' rows and other types kept, and an empty list; files:
  > `modules/notifications/src/notification/provider/notification.repository.ts`,
  > `modules/notifications/src/notification/usecase/delete-registration-notifications.usecase.ts`,
  > `modules/notifications/src/notification/usecase/index.ts`,
  > `modules/notifications/test/mock/fake-notification.repository.ts`,
  > `modules/notifications/test/notification/usecase/delete-registration-notifications.usecase.test.ts`; verified:
  > `npm test --workspace @rochas-surf-school/notifications` (78 passed, 100% on the new files),
  > `npx turbo run check-types --filter=@rochas-surf-school/notifications` ok; deviations: none

### Auth module (`modules/auth`)

- [ ] **T-03** — Declare the `RegistrationNotificationEraser` port
  (`modules/auth/src/user/provider/registration-notification-eraser.provider.ts`, exported) and its fake
  (`modules/auth/test/mock/`); add `findDeniedBefore(cutoff: Date): Promise<string[]>` (ids of `denied` users with
  `deniedAt ≤ cutoff`, null `deniedAt` excluded) and `deleteDenied(ids: string[]): Promise<number>` (deletes those
  ids that are still `denied`) to `UserRepository` (`modules/auth/src/user/provider/user.repository.ts`) and to
  `FakeUserRepository`, with tests of the fake's selection rules. Skill:
  [`module-repository`](../../../.claude/skills/module-repository).
  Covers: enabling · Done when: `npm test --workspace @rochas-surf-school/auth` and
  `npx turbo run check-types --filter=@rochas-surf-school/auth` pass.

- [ ] **T-04** — `EraseDeniedRegistrations` use case
  (`modules/auth/src/user/usecase/erase-denied-registrations.usecase.ts`, exported; constructor
  `(userRepository, registrationNotificationEraser, clock)`, `execute(): Promise<{ erased: number }>`) following
  D-02 and D-05, with tests in `modules/auth/test/user/usecase/erase-denied-registrations.usecase.test.ts`:
  exactly 30 days erased, 30 days − 1 minute kept, null `deniedAt` kept, every other status kept, nothing due →
  `{ erased: 0 }` and the eraser not called, a second run ("again") → `{ erased: 0 }`, an eraser that throws →
  the error propagates and no user is deleted. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03 · Done when: `npm test --workspace @rochas-surf-school/auth` passes with these cases.

### Backend (`apps/backend`)

- [ ] **T-05** — Implement `findDeniedBefore` (`findMany` on `status: 'denied'`, `deniedAt: { lte: cutoff }`,
  selecting `id`) and `deleteDenied` (`deleteMany` on `id: { in: ids }`, `status: 'denied'`, returning `count`;
  no query for an empty list) in `PrismaUserRepository` (`apps/backend/src/modules/auth/user.prisma.ts`), with
  specs in `user.prisma.spec.ts`. Skill:
  [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-01 · Done when: `npx vitest run src/modules/auth/user.prisma.spec.ts` passes (from `apps/backend`).

- [ ] **T-06** — Notifications adapters: `NotificationsRegistrationNotifier.registrationPending` passes
  `userId: account.id` to `NotifyApprovedAdmins`; `PrismaNotificationRepository.deleteRegistrationPending`
  (`notification.prisma.ts`) deletes `type: 'registration.pending'` rows whose `params.userId` is one of the ids
  (a JSON path filter, nothing for an empty list); a new `NotificationsRegistrationNotificationEraser`
  (`notifications.registration-notification-eraser.ts`, implements `auth`'s port by running
  `DeleteRegistrationNotifications`) is provided and exported by `NotificationsModule`. Specs next to each file in
  `apps/backend/src/modules/notifications/`. Skill:
  [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-03 · Done when: `npx vitest run src/modules/notifications` passes (from `apps/backend`).

- [ ] **T-07** — `AccountErasureJob` (`apps/backend/src/modules/auth/account-erasure.job.ts`) per D-06, running
  `EraseDeniedRegistrations` with `PrismaUserRepository`, `NotificationsRegistrationNotificationEraser` and
  `SystemClockProvider`, registered in `AuthModule` (`auth.module.ts`), with `account-erasure.job.spec.ts`: the
  cron metadata (every minute), the use case's result returned, the count logged only when above 0, and an error
  logged without throwing. Skill: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-02 · Done when: `npx vitest run src/modules/auth/account-erasure.job.spec.ts` passes and the
  backend starts (`npm run build --workspace apps/backend`).

- [ ] **T-08** — E2E suite `apps/backend/test/account-erasure.e2e-spec.ts` against Postgres: seeds the accounts and
  rows of ER-01 directly through Prisma (`deniedAt` set relative to now), gets `AccountErasureJob` from the app and
  calls `run()`. Tests named "erases …" (ER-01 and its kept cases), "idempotent" (a second run returns
  `{ erased: 0 }` and the row counts don't change), "notifications" (ER-03, an account created through
  `POST /auth/email/verify` with the email provider overridden as in `auth-email.e2e-spec.ts`), and "signs up
  again" (ER-04 by email code, and by Google with `GoogleAuthIdTokenProvider` overridden as in
  `auth-google.e2e-spec.ts`; old refresh and access tokens refused). Cleans up the rows it creates.
  Covers: ER-01, ER-02, ER-03, ER-04 · Done when: `npm run test:e2e --workspace apps/backend` passes with the new
  file.

### Verification

- [ ] **T-09** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: `check-coverage.mjs 021` prints `COVERAGE OK`,
  `run-e2e.mjs 021` prints `E2E PASSED`, and every other command exits 0.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 021` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 021` — every line this spec adds or changes is covered
  - `node .specs/scripts/run-e2e.mjs 021` — the backend e2e suite passes, `account-erasure.e2e-spec.ts` and
    `notifications.e2e-spec.ts` included (Postgres up, migrations applied)
  - `npx turbo run lint check-types --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/backend`
    — no errors
  - `npx turbo run build --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/backend`
    — builds
- User journeys: none beyond the e2e suite — the change has no screen, and the suite drives every Expected Result
  through the API and the job.

## Memory Impact

- `memory/product.md` — Current state: denied registrations are erased 30 days after the denial (the account and
  the admins' notifications about it), and the same email can sign up again; deleted and removed accounts are
  not erased yet.
- `memory/technical-context.md` — Scheduled work: `AccountErasureJob` (three jobs today), idempotent by deleting
  (D-03); Authentication → Registrations: the `RegistrationNotificationEraser` port and its adapter, and the
  erasure order (D-05).
- `memory/structure.md` — `apps/backend/src/modules/auth/account-erasure.job.ts`,
  `apps/backend/src/modules/notifications/notifications.registration-notification-eraser.ts`,
  `apps/backend/test/account-erasure.e2e-spec.ts`.
- `memory/modules/auth.md` — Accounts: a denied account is erased (hard deleted with its identities, sessions,
  acceptances, notifications and push tokens) 30 days after the denial, and its email is free again; the
  `RegistrationNotificationEraser` port in Boundaries.
- `memory/modules/notifications.md` — `registration.pending` params are `{ name, userId }`; those of an erased
  account are deleted on `auth`'s request.

## Assumptions

- A sign-in that reaches the database at the same instant its denied account is erased may fail once (the
  session insert's foreign key); a retry creates the new registration. Accepted by the user.
- `registration.pending` notifications stored before this spec (no `userId`) keep the name; they exist only in
  development databases. Accepted by the user.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
