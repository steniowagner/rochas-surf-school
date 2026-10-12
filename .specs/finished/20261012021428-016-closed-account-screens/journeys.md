# 016 — Manual journeys: test data

Supporting file of [spec 016](spec.md). Nothing in the app can put an account into `denied`, `deleted` or
`removed` yet, so the journeys set the state directly in the local database. Use a throwaway address
(`closed.test@example.com` below), never a review account.

## Setup

1. From `apps/backend`: `npm run db:start`, `npm run prisma:migrate:deploy` (specs 014 and 015 applied), then
   `npm run dev`. Without `RESEND_API_KEY` the sign-in codes are logged by the backend.
2. In the app (iOS simulator), create the account: "Continue with email" → "I'm new here" → name and
   `closed.test@example.com` → the logged code. The Pending screen opens. Sign out.
3. Open a SQL shell (from `apps/backend`, with the values of its `.env`):

   ```bash
   docker compose exec postgres psql -U "$DATABASE_USER" -d "$DATABASE_NAME"
   ```

## Put the account in each state

Run one statement, then sign in again with `closed.test@example.com` in the app (the session is in memory, so
closing the app or tapping "Usar outro email" is enough to sign out).

```sql
-- Denied with a reason (ER-01)
UPDATE users SET status = 'denied', denied_at = now(),
  denial_reason = 'A plataforma é só para alunos matriculados na escola. Passe na recepção para fazer sua matrícula.',
  reactivation_status = NULL, deleted_at = NULL, removed_at = NULL
WHERE email = 'closed.test@example.com';

-- Denied without a reason (ER-02)
UPDATE users SET status = 'denied', denied_at = now(), denial_reason = NULL
WHERE email = 'closed.test@example.com';

-- Removed (ER-04)
UPDATE users SET status = 'removed', removed_at = now(), denial_reason = NULL, denied_at = NULL
WHERE email = 'closed.test@example.com';

-- Deleted, no request (ER-05, ER-06)
UPDATE users SET status = 'deleted', deleted_at = now(), removed_at = NULL,
  reactivation_status = NULL, reactivation_requested_at = NULL
WHERE email = 'closed.test@example.com';

-- Deleted, request denied (ER-08)
UPDATE users SET status = 'deleted', reactivation_status = 'denied'
WHERE email = 'closed.test@example.com';

-- Back to approved (to test 403 user.status.notDeleted, ER-09: run it while the Account deleted screen is open)
UPDATE users SET status = 'approved', deleted_at = NULL, reactivation_status = NULL
WHERE email = 'closed.test@example.com';
```

To check what the request stored (ER-06):

```sql
SELECT status, reactivation_status, reactivation_requested_at FROM users WHERE email = 'closed.test@example.com';
```

## The school's WhatsApp number (ER-03)

- **No number:** `DELETE FROM school_settings;` → the contact button is hidden.
- **A number:** sign in to the backend as the admin review account (requests in
  `apps/backend/src/modules/auth/auth.integration.http`), then send
  `PUT /school-settings/whatsapp` with `{ "whatsappNumber": "+5585999998888" }` and its access token
  (`apps/backend/src/modules/school-settings/school-settings.integration.http`).
- **Loading and load failure** are covered by the component tests of T-03, not by a journey.

## Cleanup

```sql
DELETE FROM users WHERE email = 'closed.test@example.com';
```
