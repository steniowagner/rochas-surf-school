---
id: "020"
slug: push-notifications-registrations
title: Push notifications foundation, first used for registrations
status: in-progress
created: 2026-10-12
started: 2026-10-12
base_commit: f26caad74b27c08241e306009c4a223cf44b0a04
fronts: [notifications, auth, backend, mobile]
depends_on: []
---

# 020 — Push notifications foundation, first used for registrations

## Goal

The app gets its only outbound channel: every notification is stored for the person first and then pushed, through
Expo, to every phone they signed in on, in the language each phone uses. The first notifications are the ones of
the registration lifecycle: every approved admin is told when a new account starts waiting for approval, and the
person is told when their registration is approved or denied, with the reason when one was given. Tapping a push,
or receiving one with the app open, brings the app to the screen that matches the account's new state.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: **User** (lifecycle `pending` →
  `approved` | `denied`; "Admins are notified of each new registration; the person is notified of the result"),
  **Notification** (always stored, pushed unless pushes are off; the only outbound channel), and the decision
  "Pushes are the only notification channel".
- Requirements:
  [requirements.md → Push delivery](../../../.docs/requirements.md#push-delivery) — notifications are delivered as
  pushes to the user's phone, never by email or WhatsApp.
  [requirements.md → Notifications screen](../../../.docs/requirements.md#notifications-screen) — every
  notification is kept for the in-app screen whether or not its push was shown (this spec stores them; the screen
  is out of scope, D-14).
  [requirements.md → Push setting](../../../.docs/requirements.md#push-setting) — the on/off setting only stops
  pushes (out of scope here, D-14; the phone's own permission is the only switch for now).
  [requirements.md → Admins are told about new registrations](../../../.docs/requirements.md#admins-are-told-about-new-registrations)
  — every admin is notified when a new account starts waiting.
  [requirements.md → People are told the result of their registration](../../../.docs/requirements.md#people-are-told-the-result-of-their-registration)
  — the person is notified of an approval, and of a denial with its reason.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: External integrations →
  Push notifications (Expo Push, store first), Fixed conventions → Languages (no UI text from the backend, with the
  sign-in email as the one exception — this spec adds a second, D-03), Architecture (ports in the domain, adapters
  in the backend), Authentication (sign-out, registrations, `JwtAuthGuard`, Mobile session and sign-out), Scheduled
  work (idempotent jobs every minute), Mobile flows, Automated validation.
- Module: [modules/auth.md](../../memory/modules/auth.md) — Accounts and registrations; its Boundaries leave
  notifying admins and telling the person to a later spec (this one).
- Existing code this builds on:
  - `modules/auth/src/sign-in-code/usecase/verify-sign-in-code.usecase.ts` and
    `modules/auth/src/identity/usecase/sign-in-with-google.usecase.ts` — the only places a `pending` account is
    created (`userRepository.create(user)` on the new-account path).
  - `modules/auth/src/user/usecase/{approve,deny}-registration.usecase.ts` — decide with
    `updateIfPending`; `false` → 409.
  - `modules/auth/src/session/usecase/sign-out.usecase.ts` and `POST /auth/sign-out` in
    `apps/backend/src/modules/auth/auth.controller.ts` — `@Public()`, identified by the refresh token, always 204.
  - `modules/auth/src/user/provider/rules-version.provider.ts` — the pattern for a port `auth` declares and another
    backend module implements (`modules/school-rules` depends on `auth`, so `auth` can't import it).
  - `apps/backend/src/modules/auth/resend.email.ts` — the pt-BR / es / en copy kept in a backend adapter, the
    precedent for D-03.
  - `apps/backend/src/modules/auth/sign-in-code-cleanup.job.ts` — the scheduled job pattern.
  - `apps/mobile/src/services/session/session.store.ts` (`signOut()`), `src/navigation/root-navigator/` (where
    `useSessionExpired` is mounted), `src/i18n/locales.ts` (`AppLocale`), and
    `src/modules/auth/hooks/use-request-sign-in-code.hook.ts` (`backendLocaleByAppLocale`: `pt-BR` / `es` / `en`).
  - `apps/mobile/app.json` — no `expo-notifications` plugin and no EAS `projectId` yet.

## Scope

### In scope

- A new business module `modules/notifications` with two aggregates: `notification` (stored notifications and the
  `Notify` use case that stores, then pushes) and `push-token` (devices, their locale, and the cleanup of dead
  tokens).
- Backend: the Prisma schema and migration `notifications`, `PUT /notifications/push-token`, the Expo push adapter
  with the push copy in three languages, the receipt-check job, and the adapters that implement the two ports
  `auth` declares.
- `modules/auth`: the `RegistrationNotifier` port called by the four use cases, and the `PushTokenRemover` port
  called by `SignOut`, which takes an optional `pushToken`.
- Mobile: `expo-notifications` installed and configured, registration of the token, its removal on sign-out, the
  foreground handler and the tap handler.

### Out of scope

- The notifications screen, read state, and listing notifications through the API (D-14). Nothing reads the
  stored notifications yet.
- The in-app push on/off setting (D-14); the phone's OS permission is the only switch.
- A pre-permission screen or any copy before the OS permission dialog, and re-asking after a refusal.
- Every other notification (reactivation requests, role changes, classes, enrolments, broadcasts) — each comes with
  the spec of its event.
- Badges on the app icon, sounds other than the default, rich pushes (images, actions).
- Removing push tokens when a session expires without a sign-out, when an account is denied, deleted or removed, or
  by age (D-06).
- Creating the EAS project and the APNs / FCM credentials — the user does it (Assumptions).
- An automated push to a real device: delivery through Expo is checked by the user on a physical device
  (Assumptions); the reviewer verifies everything up to the Expo call with a fake push provider.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | `notifications` is a new business module, scaffolded with `config-new-module --skip-web --skip-mobile`, with two aggregates: `notification` and `push-token`. It does **not** depend on `@rochas-surf-school/auth`: the approved admins come through its own port `RecipientsProvider.findApprovedAdminIds()`, implemented in the backend by `PrismaRecipientsProvider` over the `users` table. | Notifications is a product concept of its own (product.md) and will be used by every module; keeping it free of `auth` lets `auth` (and later modules) reach it through ports without a dependency cycle. |
| D-02 | `auth` declares two ports, implemented in `apps/backend/src/modules/notifications/` and injected into the auth controllers: `RegistrationNotifier` (`modules/auth/src/user/provider/registration-notifier.provider.ts`: `registrationPending({ id, name })`, `registrationApproved(userId)`, `registrationDenied(userId, reason?)`) and `PushTokenRemover` (`modules/auth/src/session/provider/push-token-remover.provider.ts`: `remove(userId, token)`). `VerifySignInCode` and `SignInWithGoogle` call `registrationPending` only on the path that creates the account, after it and its identity are stored; `ApproveRegistration` / `DenyRegistration` call theirs only after `updateIfPending` returned `true`. `AuthModule` imports `NotificationsModule` (never the reverse). | The event belongs to the use case that causes it (a rule in a controller is forbidden), and a port keeps `auth` free of the notifications module, as `RulesVersionProvider` does for school rules. |
| D-03 | A stored notification holds no text: `{ id, userId, type, params, createdAt }`, with `type` one of `registration.pending` (`params: { name }`), `registration.approved` (`{}`), `registration.denied` (`{ reason }` or `{}` without a reason). The **push** text is rendered by the backend adapter `ExpoPushProvider` from a catalog in `apps/backend/src/modules/notifications/push-messages.ts`, in the locale of each device (`pt-BR` / `es` / `en`, sent at registration). This is the second exception to "the backend sends no UI text", next to the sign-in email; technical-context records it. | A push is drawn by the OS, often with the app killed, so its text must travel in the payload; Expo's API has no localization keys. Keeping the stored record text-free lets the future screen translate it in the app. |
| D-04 | `Notify` (`modules/notifications/src/notification/usecase/notify.usecase.ts`, in `{ userIds, type, params }`) stores one notification per user (all of them, before any push), then reads every push token of those users and sends one message per token through `PushProvider.send`, with `data: { type, notificationId }`. A ticket with error `DeviceNotRegistered` deletes its token; an `ok` ticket is stored as a `PushTicket` (`id` = Expo ticket id, `token`, `createdAt`) for the receipt check. A user with no tokens gets the stored notification only. | "Every notification is stored before the push" (technical-context), and the store must not depend on the push succeeding. |
| D-05 | Notifying never changes the answer of the request that caused it: the backend implementation of `RegistrationNotifier` (`NotificationsRegistrationNotifier`) awaits `Notify` but catches and logs (Nest `Logger`) any error, from the store or the push. Sign-up, approve and deny answer exactly as before; a notification already stored stays when the push fails. | The decision or the account is already committed when notifying starts (`updateIfPending` is its own write); a 500 there would make the admin retry a decision that already happened. |
| D-06 | Push token lifecycle: a token is unique (`push_tokens.token` is the key) and a user may have many (one per device). `PUT /notifications/push-token` upserts it with the caller's id and locale and `updatedAt`, so a token registered by another account moves to the caller. The app sends it after every session start and on every launch with a session, and again when the app language changes. It is deleted: on sign-out (D-07), when a push ticket or receipt says `DeviceNotRegistered` (D-04, D-08). It is **not** deleted when a session expires without sign-out, when the account changes status, or by age. | Several devices per person are normal; re-registering on launch heals a token that changed and keeps the locale current; Expo tokens don't expire, so Expo's own signal is the only reliable cleanup. A phone whose session expired keeps its token until someone signs in on it, which is the same person's phone. |
| D-07 | `POST /auth/sign-out` takes an optional `pushToken` next to `refreshToken`. When the refresh token is found (whatever its state: active, revoked or expired) and `pushToken` is a non-empty string, `SignOut` calls `PushTokenRemover.remove(token.userId, pushToken)`, which deletes the token only if it belongs to that user. It still answers 204 in every case; a `pushToken` that isn't a string is ignored. The app sends the token it registered (if any) in the same request its local-first sign-out already makes. | The app has no access token left when it tells the backend about a sign-out (it clears the session first), so the refresh token, which identifies the user, is the only safe proof of ownership. |
| D-08 | `PushReceiptCheckJob` (`apps/backend/src/modules/notifications/push-receipt-check.job.ts`, every minute) runs `CheckPushReceipts`: it takes the stored tickets created 15 minutes or more ago, asks Expo for their receipts (`PushProvider.getReceipts`, in chunks of up to 1000 ids), deletes the token of every receipt with `details.error === "DeviceNotRegistered"`, and deletes every ticket it asked about, receipt found or not. Tickets older than 24 hours are deleted without asking. | Expo says to check receipts 15 minutes after sending and clears them after 24 hours; deleting the tickets it asked about makes the job idempotent (a tick never checks a ticket twice). |
| D-09 | `RegisterPushToken` (`PUT /notifications/push-token`, protected, body `{ token, locale }`, answers 204 with no body). Checked in this order: the caller's status is `pending` or `approved`, else 403 `pushToken.status.notAllowed`; `token` is a string matching `^Expo(nent)?PushToken\[[^\]]+\]$`, else 422 `pushToken.token.invalid`; `locale` is one of `pt-BR`, `es`, `en`, else 422 `pushToken.locale.invalid` (both 422 errors listed together when both fail). | A pending person must register or the approval push can't reach them; denied, deleted and removed accounts receive nothing. The locale values are the ones the sign-in email already uses. |
| D-10 | "Every admin" means every user with role `admin` **and** status `approved` (onboarding finished or not), excluding nobody else; a `pending` account with role admin is a registration, not an admin. | Matches `assertCanDecideRegistrations`: only an approved admin can act on the notification. |
| D-11 | `ExpoPushProvider` uses the `expo-server-sdk` package (`Expo.chunkPushNotifications`, `sendPushNotificationsAsync`, `chunkPushNotificationReceiptIds`, `getPushNotificationReceiptsAsync`), with the optional `EXPO_ACCESS_TOKEN` variable (added to `apps/backend/.env.example`; sent when set). Messages use `sound: "default"`, `priority: "high"`, `channelId: "default"`. A chunk that throws counts as failed for its messages (no tickets stored) and the error is rethrown after the other chunks are sent, so D-05 logs it. Tests never call Expo: unit tests mock the SDK, and the e2e suite overrides `ExpoPushProvider` with a fake. | The SDK handles chunking, token format and receipts; an access token is only needed if push security is turned on in Expo. |
| D-12 | Mobile registration: `src/services/push/push.service.ts` sets the foreground handler at module load (banner, list and sound; no badge), creates the Android channel `default` (importance high), and `getPushToken()` returns the Expo push token or `null`: it asks the OS permission only when it is `undetermined`, returns `null` when it isn't granted, when `Device.isDevice` is false, when there is no EAS `projectId` (`Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId`), or when `getExpoPushTokenAsync` throws. `usePushRegistration` (`src/modules/notifications/hooks/`, mounted in `RootNavigator`) runs when the session's user id, the user's status or the i18n language changes, only for `pending` and `approved` users: it gets the token and sends `PUT /notifications/push-token` (authenticated) with `{ token, locale }` (`locale` from the app language through the same mapping as the sign-in email, moved to `src/i18n/backend-locale.ts`), then remembers the token in the push service (`setRegisteredPushToken`). No token, or any failure, shows nothing. | The prompt comes right after the session starts — for a new person, on the Pending screen, where the approval push is what they wait for. Silence on failure: pushes are an extra, the account state is still read on launch. |
| D-13 | Sign-out on mobile: the store's `signOut()` reads `getRegisteredPushToken()` before clearing, clears it, and sends `{ refreshToken, pushToken }` (`pushToken` only when one was registered) in the `POST /auth/sign-out` it already makes. | One request, the same local-first behavior, no access token needed (D-07). |
| D-14 | The notifications screen, read state and the push on/off setting stay out of this spec. | Nothing in the registration flow needs them: a pending or denied person has no screen to read notifications on, and admins act on "Join the school". Storing notifications now (D-04) means the screen spec has the history from day one. |
| D-15 | Tap on a push (`useNotificationResponse`, `src/modules/notifications/hooks/`, mounted in `RootNavigator`; handles `Notifications.getLastNotificationResponse()` once on mount, for a tap that launched the app, and `addNotificationResponseReceivedListener`): with a session, it first refreshes the account (`GET /auth/me`, authenticated → `updateUser`), then: `registration.pending` and the refreshed account resolves to the `admin` flow → `router.push(routes.admin.registrations)`; any other case → `router.replace(routes.home)` (`"/"`, new in `routes.ts`), where `index` redirects to the resolved flow. Without a session, or when the refresh fails (offline, 5xx), it navigates the same way with the account it has; `SessionExpiredError` is left to `useSessionExpired`. A response already handled (same notification id) is ignored. | Access stays decided only by `resolveFlow`; the refresh makes an approved or denied person land in their new flow at once instead of at the next renewal. |
| D-16 | Push received with the app in the foreground (`addNotificationReceivedListener` in the same hook file, `useNotificationReceived`): it is shown as a banner (D-12); `registration.approved` / `registration.denied` refresh the account as in D-15 (the Pending screen moves on by itself through the flow guards); `registration.pending` invalidates the `["registrations"]` query, so the admin home's count and "Join the school" update. No navigation. | The person sees the change without relaunching, and the admin's list never shows a stale count. |
| D-17 | Prisma (`apps/backend/prisma/models/notifications.model.prisma`, migration `notifications`): `notifications` (`id` uuid, `user_id` → `users.id` on delete cascade, `type` text, `params` jsonb, `created_at`; index on `user_id, created_at`), `push_tokens` (`token` text primary key, `user_id` → `users.id` on delete cascade, `locale` text, `created_at`, `updated_at`; index on `user_id`), `push_tickets` (`id` text primary key = Expo ticket id, `token` text, `created_at`; index on `created_at`; no foreign key, since its token may be deleted first). | One model file per module; cascades keep the future account erasure simple. |

### Push copy

The `{name}` is the account's name as stored; the denial body is the admin's reason exactly as stored (never
translated), or the fallback when there is none.

| Type | Field | pt-BR | es | en |
| --- | --- | --- | --- | --- |
| `registration.pending` | title | Nova inscrição | Nueva inscripción | New registration |
| `registration.pending` | body | {name} está aguardando aprovação. | {name} está esperando aprobación. | {name} is waiting for approval. |
| `registration.approved` | title | Conta aprovada | Cuenta aprobada | Account approved |
| `registration.approved` | body | Você já pode começar a usar o app. | Ya puedes empezar a usar la app. | You can start using the app now. |
| `registration.denied` | title | Inscrição recusada | Inscripción rechazada | Registration denied |
| `registration.denied` | body (reason) | {reason} | {reason} | {reason} |
| `registration.denied` | body (no reason) | Abra o app para saber mais. | Abre la app para saber más. | Open the app to learn more. |

## Expected Results

### ER-01 — A signed-in device registers its push token

- **Front:** backend
- **Behavior:** Given an `approved` or `pending` user U with a valid access token, when the app calls
  `PUT /notifications/push-token` with `{ token: "ExponentPushToken[abc]", locale: "es" }`, then the API answers
  204 and `push_tokens` has one row for that token with U's id and locale `es`.
- **Edge and error cases:** the same call again with `locale: "en"` leaves one row, now `en`; the same token sent
  by user V moves the row to V; U registering a second token keeps both rows; `ExpoPushToken[…]` is accepted too.
- **Verify by:** `apps/backend/test/notifications.e2e-spec.ts` → `describe("PUT /notifications/push-token")`
  ("registers", "updates the locale", "moves the token to the new user", "keeps several devices"), run by
  `node .specs/scripts/run-e2e.mjs 020`; unit tests in
  `modules/notifications/test/push-token/usecase/register-push-token.usecase.test.ts`.

### ER-02 — Registering a push token is refused when it can't be used

- **Front:** backend
- **Behavior:** Given a request to `PUT /notifications/push-token`, when the caller has no valid access token,
  then 401 `auth.token.invalid`; when the caller's status is `denied`, `deleted` or `removed`, then 403
  `pushToken.status.notAllowed`; when `token` is missing, not a string or not an Expo push token, then 422 with
  `pushToken.token.invalid`; when `locale` isn't `pt-BR`, `es` or `en`, then 422 with `pushToken.locale.invalid`.
  Nothing is stored in any of these cases.
- **Edge and error cases:** both fields invalid → one 422 whose `errors` lists both keys; a 403 is answered before
  any body check.
- **Verify by:** `apps/backend/test/notifications.e2e-spec.ts` → "refuses without a token", "refuses a closed
  account", "refuses an invalid token and locale"; `register-push-token.usecase.test.ts`.

### ER-03 — Signing out removes the device's push token

- **Front:** backend
- **Behavior:** Given user U signed in with refresh token R and push token P registered for U, when the app calls
  `POST /auth/sign-out` with `{ refreshToken: R, pushToken: P }`, then the API answers 204 and P is no longer in
  `push_tokens`.
- **Edge and error cases:** P registered for another user stays; an unknown R → 204 and P stays; R already revoked
  → 204 and P is removed; no `pushToken`, an empty one or a non-string one → 204, tokens untouched, and the
  family is revoked as before.
- **Verify by:** `apps/backend/test/notifications.e2e-spec.ts` → `describe("sign-out")` ("removes the caller's
  token", "keeps another user's token", "ignores a missing push token"); unit tests in
  `modules/auth/test/session/usecase/sign-out.usecase.test.ts`.

### ER-04 — Every approved admin is notified of a new registration

- **Front:** backend
- **Behavior:** Given approved admins A1 (token T1, locale `pt-BR`) and A2 (no token), when a new account "Ana
  Souza" is created by `POST /auth/email/verify` with a name, then the API answers as before, `notifications` has
  one `registration.pending` row with `params.name = "Ana Souza"` for A1 and one for A2, and the push provider
  received exactly one message: to T1, title "Nova inscrição", body "Ana Souza está aguardando aprovação.", data
  `{ type: "registration.pending", notificationId }` of A1's row.
- **Edge and error cases:** the same through `POST /auth/google` creating an account; signing in to an existing
  account (any status) notifies nobody; a `pending`, `denied` or `removed` user with role admin, and approved
  students and instructors, get nothing; with no approved admin nothing is stored or sent.
- **Verify by:** `apps/backend/test/notifications.e2e-spec.ts` → `describe("registration pending")` (fake push
  provider via `overrideProvider(ExpoPushProvider)`); unit tests in
  `modules/auth/test/sign-in-code/usecase/verify-sign-in-code.usecase.test.ts`,
  `modules/auth/test/identity/usecase/sign-in-with-google.usecase.test.ts` and
  `modules/notifications/test/notification/usecase/notify.usecase.test.ts`.

### ER-05 — The person is notified when their registration is approved

- **Front:** backend
- **Behavior:** Given pending user P with tokens T1 (`en`) and T2 (`es`), when an approved admin calls
  `POST /registrations/{P}/approve`, then the API answers 200 as before, `notifications` has one
  `registration.approved` row for P with `params` `{}`, and the push provider received two messages: T1 "Account
  approved" / "You can start using the app now." and T2 "Cuenta aprobada" / "Ya puedes empezar a usar la app.".
- **Edge and error cases:** a 403, 404 or 409 answer stores and sends nothing; P without tokens gets the stored
  row only.
- **Verify by:** `apps/backend/test/notifications.e2e-spec.ts` → `describe("registration decided")` ("approval");
  `modules/auth/test/user/usecase/approve-registration.usecase.test.ts`.

### ER-06 — The person is notified when their registration is denied, with the reason

- **Front:** backend
- **Behavior:** Given pending user P with token T (`pt-BR`), when an approved admin calls
  `POST /registrations/{P}/deny` with `{ reason: "  Não conhecemos você.  " }`, then the API answers 200,
  `notifications` has one `registration.denied` row for P with `params.reason = "Não conhecemos você."`, and the
  push to T has title "Inscrição recusada" and body "Não conhecemos você.".
- **Edge and error cases:** no reason, `null` or a blank one → `params` `{}` and body "Abra o app para saber
  mais."; a 422 (reason not a string, over 500 characters), 403, 404 or 409 stores and sends nothing.
- **Verify by:** `apps/backend/test/notifications.e2e-spec.ts` → `describe("registration decided")` ("denial with
  a reason", "denial without a reason"); `modules/auth/test/user/usecase/deny-registration.usecase.test.ts`;
  `apps/backend/src/modules/notifications/push-messages.spec.ts`.

### ER-07 — A failing notification never fails the request

- **Front:** backend
- **Behavior:** Given the push provider throws on send, when a new account is created, a registration approved or
  one denied, then each request answers exactly as it would without notifications (200 with the same body), the
  account or decision is stored, and the notification rows are stored.
- **Edge and error cases:** when storing the notification itself throws (repository failure), the request still
  answers 200 and the error is logged; in both cases nothing is retried.
- **Verify by:** `apps/backend/test/notifications.e2e-spec.ts` → "push failure keeps the decision and the
  notification"; `apps/backend/src/modules/notifications/notifications.registration-notifier.spec.ts` ("logs and
  swallows a store failure", "logs and swallows a push failure").

### ER-08 — A token Expo reports as unregistered is removed when sending

- **Front:** backend
- **Behavior:** Given user U with tokens T1 and T2, when a notification is sent to U and Expo's ticket for T1 is
  `{ status: "error", details: { error: "DeviceNotRegistered" } }` and for T2 `{ status: "ok", id: "r2" }`, then
  T1 is deleted from `push_tokens`, T2 stays, and `push_tickets` has one row `{ id: "r2", token: T2 }`.
- **Edge and error cases:** any other ticket error keeps the token and stores no ticket; a chunk whose request
  throws stores no tickets for its messages, while the other chunks are still sent.
- **Verify by:** `modules/notifications/test/notification/usecase/notify.usecase.test.ts` ("removes an
  unregistered device", "stores ok tickets"); `apps/backend/src/modules/notifications/expo.push.spec.ts` (chunk
  failure).

### ER-09 — Push receipts are checked 15 minutes later and dead tokens removed

- **Front:** backend
- **Behavior:** Given stored tickets k1 (token T1, 16 minutes old) and k2 (token T2, 5 minutes old), when the
  receipt check runs and Expo's receipt for k1 is `{ status: "error", details: { error: "DeviceNotRegistered" } }`,
  then T1 is deleted, ticket k1 is deleted, and k2 and T2 are untouched (k2 isn't asked about).
- **Edge and error cases:** a receipt `ok`, another error or no receipt for an asked ticket → its ticket deleted,
  its token kept; a ticket older than 24 hours is deleted without asking Expo; with no due tickets, Expo isn't
  called; a second run right after asks about nothing.
- **Verify by:** `modules/notifications/test/push-token/usecase/check-push-receipts.usecase.test.ts`;
  `apps/backend/src/modules/notifications/push-receipt-check.job.spec.ts`.

### ER-10 — The app registers its push token for pending and approved accounts

- **Front:** mobile
- **Behavior:** Given the OS permission is granted, the device has an Expo push token and the app language is
  Spanish, when a session starts or the app launches with a session whose user is `pending` or `approved`, then
  the app sends `PUT /notifications/push-token` with `{ token, locale: "es" }` and the access token, once.
- **Edge and error cases:** permission `undetermined` → the OS dialog is requested first, then the request on
  grant; permission denied, not a physical device, no EAS `projectId`, or the token call throwing → no request
  and nothing shown; a `denied`, `deleted` or `removed` user, or no session → no request; the request failing →
  nothing shown; changing the app language → sent again with the new locale; a different user signing in on the
  same phone → sent again.
- **Verify by:** `apps/mobile/src/modules/notifications/hooks/use-push-registration.hook.test.tsx` and
  `apps/mobile/src/services/push/push.service.test.ts`
  (`npx jest src/modules/notifications src/services/push` from `apps/mobile`).

### ER-11 — Signing out in the app sends the registered push token

- **Front:** mobile
- **Behavior:** Given the app registered push token P in this session, when the person signs out, then the app
  sends `POST /auth/sign-out` with `{ refreshToken, pushToken: P }`, and a later sign-out without a new
  registration sends no `pushToken`.
- **Edge and error cases:** no registered token → the body is `{ refreshToken }` as before; a refresh in flight →
  the newest refresh token with the same `pushToken`; the request failing changes nothing for the person.
- **Verify by:** `apps/mobile/src/services/session/session.store.test.ts` ("sends the registered push token on
  sign-out") and `apps/mobile/src/modules/auth/hooks/use-sign-out.hook.test.tsx`.

### ER-12 — Tapping a push opens the screen of the account's current state

- **Front:** mobile
- **Behavior:** Given an approved admin who finished onboarding and is signed in, when they tap a
  `registration.pending` push (app in the background, or the tap that launched it), then the app calls
  `GET /auth/me` and opens "Join the school" (`/admin/registrations`). Given a pending person, when they tap a
  `registration.approved` push, then the app calls `GET /auth/me`, the session user becomes `approved`, and the
  app shows the onboarding WhatsApp step.
- **Edge and error cases:** `registration.denied` tapped → the Denied screen; a `registration.pending` push tapped
  by an account whose refreshed state isn't the `admin` flow → `/` and its resolved flow; `GET /auth/me` failing
  (offline) → navigation with the stored account; no session → `/` (sign-in); the same response delivered twice
  (launch response and listener) → handled once.
- **Verify by:** `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.test.tsx` (route tree
  built from the real route files with `renderRouter`, `getPathname()`).

### ER-13 — A push received with the app open updates what is on screen

- **Front:** mobile
- **Behavior:** Given a pending person on the Pending screen, when a `registration.approved` push arrives with the
  app in the foreground, then the push is shown as a banner and the app refreshes the account and moves to the
  onboarding WhatsApp step without a tap. Given an admin on the admin home, when a `registration.pending` push
  arrives, then the `["registrations"]` query is invalidated and refetched.
- **Edge and error cases:** `registration.denied` → the Denied screen; an unknown `type` → banner only, nothing
  refreshed; the refresh failing → the screen stays as it was, nothing shown.
- **Verify by:** `apps/mobile/src/modules/notifications/hooks/use-notification-received.hook.test.tsx` and
  `push.service.test.ts` ("shows foreground notifications as a banner").

## Tasks

### Notifications module (`modules/notifications`)

- [x] **T-01** — Scaffold `modules/notifications` (`@rochas-surf-school/notifications`) with
  `config-new-module --skip-web --skip-mobile`, keeping the NestJS module it creates in
  `apps/backend/src/modules/notifications/` and its AppModule registration; add oxlint (`.oxlintrc.json` like the
  backend's) and `check-types` per the Lint convention; create the aggregates `notification` and `push-token`.
  Skills: [`config-new-module`](../../../.claude/skills/config-new-module),
  [`module-aggregate`](../../../.claude/skills/module-aggregate).
  Covers: enabling · Done when: `npm test --workspace @rochas-surf-school/notifications`,
  `npm run lint --workspace @rochas-surf-school/notifications` and
  `npm run check-types --workspace @rochas-surf-school/notifications` pass, and `npx turbo run build
  --filter=@rochas-surf-school/backend` builds.
  > ✅ 2026-10-12 21:04 — files: `modules/notifications/{package.json,tsconfig.json,jest.config.ts,.oxlintrc.json,src/index.ts,test/index.test.ts}`, `apps/backend/src/modules/notifications/{notifications.module.ts,notifications.controller.ts}`, `apps/backend/src/app.module.ts`, `apps/backend/package.json`, `package-lock.json`
  > verified: `npm test`, `lint`, `check-types` on the workspace pass; `turbo run build --filter=backend` builds
  > deviations: package.json/.oxlintrc.json copied from school-settings (adds lint, check-types, shared dependency); aggregate folders `notification` and `push-token` are created with their files in T-02+ (the module-aggregate skill only makes folders)

- [ ] **T-02** — Entities with their validation and tests: `Notification` (`userId` required uuid, `type` one of the
  three types, `params` object, D-03) in `src/notification/model/notification.entity.ts`, and `PushToken`
  (`token` matching D-09's pattern → `pushToken.token.invalid`, `userId`, `locale` in `pt-BR`/`es`/`en` →
  `pushToken.locale.invalid`) and `PushTicket` (`id`, `token`) in `src/push-token/model/`; tests in
  `test/notification/model/` and `test/push-token/model/`.
  Skill: [`module-entity`](../../../.claude/skills/module-entity).
  Covers: ER-02 · Done when: `npm test --workspace @rochas-surf-school/notifications` passes with the entity files
  at 100% coverage.

- [ ] **T-03** — Ports and in-memory fakes: `NotificationRepository` (`createMany`), `PushTokenRepository`
  (`upsert`, `findByUserIds`, `deleteByToken`, `deleteByTokens`, `deleteForUser(userId, token)`),
  `PushTicketRepository` (`createMany`, `findCreatedBefore(date)`, `deleteByIds`), `PushProvider`
  (`send(messages: { token, locale, type, params, notificationId }[])` → tickets in order;
  `getReceipts(ids)` → map of id → receipt), `RecipientsProvider` (`findApprovedAdminIds()`) and `ClockProvider`;
  fakes in `test/mock/` with their tests.
  Skill: [`module-repository`](../../../.claude/skills/module-repository).
  Covers: enabling · Done when: `npm test --workspace @rochas-surf-school/notifications` and `check-types` pass.

- [ ] **T-04** — `RegisterPushToken` (`src/push-token/usecase/register-push-token.usecase.ts`: in
  `{ actor: { id, status }, token, locale }` with `token` and `locale` typed `unknown`; D-09 order, upsert with the
  clock's now) and `RemovePushToken` (`remove-push-token.usecase.ts`: in `{ userId, token }`, deletes only that
  user's token), with tests (every status, both 422 keys together, upsert moving a token, second device).
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03 · Done when: `npm test --workspace @rochas-surf-school/notifications` passes with both
  files at 100% coverage.

- [ ] **T-05** — `Notify` (`src/notification/usecase/notify.usecase.ts`, D-04) and `NotifyApprovedAdmins` (same
  folder: reads `findApprovedAdminIds()` and calls `Notify` with `registration.pending`; nothing when the list is
  empty), with tests: rows stored before `send` is called, one message per token with its locale and
  `notificationId`, `DeviceNotRegistered` deletes the token, `ok` tickets stored, other errors kept, a user with no
  tokens, `send` throwing after the store (rows remain, error propagates).
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-04, ER-05, ER-06, ER-08 · Done when: `npm test --workspace @rochas-surf-school/notifications` passes
  with both files at 100% coverage.

- [ ] **T-06** — `CheckPushReceipts` (`src/push-token/usecase/check-push-receipts.usecase.ts`, D-08) with tests:
  only tickets ≥ 15 minutes old asked, `DeviceNotRegistered` deletes the token, every asked ticket deleted, > 24 h
  deleted unasked, no Expo call with nothing due, a second run asks nothing.
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-09 · Done when: `npm test --workspace @rochas-surf-school/notifications` passes with the file at 100%
  coverage, and `npm run lint --workspace @rochas-surf-school/notifications` exits 0.

### Auth module (`modules/auth`)

- [ ] **T-07** — Add the `RegistrationNotifier` port (D-02) with an in-memory fake in `test/mock/` that records
  calls, and call it: `VerifySignInCode` and `SignInWithGoogle` → `registrationPending({ id, name })` only when
  they create the account (after the user and identity are stored); `ApproveRegistration` →
  `registrationApproved(id)` and `DenyRegistration` → `registrationDenied(id, reason)` (the trimmed reason or
  `undefined`) only after `updateIfPending` returned `true`. Update the four use case tests (called once on the new
  account / decision; not called for an existing account, a 403, 404, 409, 422 or a lost race).
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-04, ER-05, ER-06 · Done when: `npm test --workspace @rochas-surf-school/auth` passes with the four use
  cases at 100% coverage (the backend's controllers get the new constructor argument in T-11; its `check-types`
  runs after T-11).

- [ ] **T-08** — Add the `PushTokenRemover` port (D-02) with a fake, and give `SignOut` an optional `pushToken`
  (`SignOutIn`): when the refresh token is found, whatever its state, and `pushToken` is a non-empty string, call
  `remove(token.userId, pushToken)`; the family is still revoked only when the token is active. Tests in
  `test/session/usecase/sign-out.usecase.test.ts` (active, revoked, expired, unknown token; missing, empty and
  non-string `pushToken`).
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-03 · Done when: `npm test --workspace @rochas-surf-school/auth` passes with `sign-out.usecase.ts` at
  100% coverage, and `npm run lint --workspace @rochas-surf-school/auth` exits 0.

### Backend (`apps/backend`)

- [ ] **T-09** — Prisma schema `apps/backend/prisma/models/notifications.model.prisma` (D-17) and the migration
  `notifications`; Prisma repositories `PrismaNotificationRepository`, `PrismaPushTokenRepository` (upsert by
  token), `PrismaPushTicketRepository` and `PrismaRecipientsProvider` (role `admin` and status `approved`, D-10) in
  `apps/backend/src/modules/notifications/*.prisma.ts`, registered in `notifications.module.ts`, each with its
  `*.prisma.spec.ts`.
  Skills: [`backend-prisma-sync-module`](../../../.claude/skills/backend-prisma-sync-module),
  [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-01, ER-04, ER-08, ER-09 · Done when: `npm run prisma:migrate:deploy --workspace apps/backend` applies
  the migration on a fresh database, and `npx vitest run src/modules/notifications` (from `apps/backend`) passes.

- [ ] **T-10** — `ExpoPushProvider` (`apps/backend/src/modules/notifications/expo.push.ts`, D-11) and the copy
  catalog `push-messages.ts` (the Push copy table: `renderPush(type, params, locale)` → `{ title, body }`), with
  `expo.push.spec.ts` (SDK mocked: chunking, message shape, tickets in order, a throwing chunk, receipts in chunks,
  `EXPO_ACCESS_TOKEN` passed when set) and `push-messages.spec.ts` (every type × locale, denial with and without a
  reason); install `expo-server-sdk` in `apps/backend`; add `EXPO_ACCESS_TOKEN` to `apps/backend/.env.example`.
  Skill: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-04, ER-05, ER-06, ER-08 · Done when: `npx vitest run src/modules/notifications/expo.push.spec.ts
  src/modules/notifications/push-messages.spec.ts` passes with both files at 100% coverage.

- [ ] **T-11** — Wire `auth` to notifications: `NotificationsRegistrationNotifier` (implements
  `RegistrationNotifier` with `NotifyApprovedAdmins` / `Notify`, catching and logging every error, D-05) and
  `NotificationsPushTokenRemover` (implements `PushTokenRemover` with `RemovePushToken`) in
  `apps/backend/src/modules/notifications/`, exported by `NotificationsModule`; `AuthModule` imports it, and
  `AuthController` / `RegistrationsController` pass them to the use cases; `POST /auth/sign-out` passes the body's
  `pushToken`. Specs: `notifications.registration-notifier.spec.ts` (each method; store failure and push failure
  logged and swallowed), `notifications.push-token-remover.spec.ts`, and the updated controller specs.
  Skill: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-03, ER-04, ER-05, ER-06, ER-07 · Done when: `npx vitest run src/modules` (from `apps/backend`) passes
  and `npx turbo run check-types --filter=@rochas-surf-school/backend` exits 0.

- [ ] **T-12** — `NotificationsController` (`apps/backend/src/modules/notifications/notifications.controller.ts`:
  `PUT /notifications/push-token`, protected, `@HttpCode(204)`, actor from `@CurrentUser()`) with its spec and
  `notifications.integration.http`; `PushReceiptCheckJob` (`push-receipt-check.job.ts`, `@Cron` every minute,
  runs `CheckPushReceipts`, logs errors) with `push-receipt-check.job.spec.ts`; and
  `apps/backend/test/notifications.e2e-spec.ts` with the scenarios named in ER-01 to ER-07 (fake push provider
  through `overrideProvider(ExpoPushProvider)`, recording messages and returning configurable tickets).
  Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-06, ER-07, ER-09 · Done when: `npx vitest run
  src/modules/notifications` passes and `npm run test:e2e --workspace apps/backend` passes with
  `notifications.e2e-spec.ts` included (Postgres up, migrations applied).

### Mobile (`apps/mobile`)

- [ ] **T-13** — Install `expo-notifications` (and `expo-constants` if missing) with `npx expo install`, add the
  `expo-notifications` plugin to `app.json` (default Android channel `default`), mock it and `expo-device` /
  `expo-constants` in `jest.setup.ts`; create `src/services/push/push.service.ts` (D-12: foreground handler,
  Android channel, `getPushToken()`, `getRegisteredPushToken()` / `setRegisteredPushToken()` /
  `clearRegisteredPushToken()`) with `push.service.test.ts`; move `backendLocaleByAppLocale` to
  `src/i18n/backend-locale.ts` (`toBackendLocale(appLocale)`), used by `use-request-sign-in-code.hook.ts`, with a
  test. Load the `vercel-react-native-skills` and `vercel-react-best-practices` skills first (CLAUDE.md).
  Covers: ER-10, ER-13 · Done when: `npx jest src/services/push src/i18n src/modules/auth` (from `apps/mobile`)
  passes with the new files at 100% coverage, and `npx turbo run check-types lint
  --filter=@rochas-surf-school/mobile` exits 0.

- [ ] **T-14** — `usePushRegistration` (`src/modules/notifications/hooks/use-push-registration.hook.ts`, D-12),
  mounted in `RootNavigator`, with `use-push-registration.hook.test.tsx` (pending and approved register with the
  locale; closed statuses and no session don't; no token → no request; failure silent; language change and user
  change re-register).
  Covers: ER-10 · Done when: `npx jest src/modules/notifications src/navigation` passes with the hook at 100%
  coverage.

- [ ] **T-15** — Sign-out sends the token (D-13): `signOut()` in `src/services/session/session.store.ts` reads and
  clears the registered token and adds `pushToken` to the body when present; tests in `session.store.test.ts` and
  `use-sign-out.hook.test.tsx` (with and without a token, with a refresh in flight).
  Covers: ER-11 · Done when: `npx jest src/services/session src/modules/auth/hooks` passes with the changed lines
  covered.

- [ ] **T-16** — `useNotificationResponse` and `useNotificationReceived`
  (`src/modules/notifications/hooks/use-notification-response.hook.ts`, `use-notification-received.hook.ts`;
  D-15, D-16), sharing a `refreshAccount()` helper in `src/modules/notifications/utils/refresh-account.ts`
  (`GET /auth/me` → `updateUser`, errors other than `SessionExpiredError` swallowed); add `routes.home: "/"`;
  mount both hooks in `RootNavigator`. Tests: `use-notification-response.hook.test.tsx` (route tree from the real
  route files, `renderRouter`, `getPathname()`: admin → `/admin/registrations`, approved → onboarding, denied →
  Denied screen, non-admin pending push → `/`, offline refresh, no session, launch response handled once) and
  `use-notification-received.hook.test.tsx` (decision refreshes and moves the flow, pending invalidates
  `["registrations"]`, unknown type, refresh failure), plus `refresh-account.test.ts`.
  Covers: ER-12, ER-13 · Done when: `npx jest src/modules/notifications src/navigation` passes with the new files at
  100% coverage, and `npm test --workspace @rochas-surf-school/mobile` passes.

### Verification

- [ ] **T-17** — Run every command in the Verification Plan from the repo root and follow the user journeys that
  don't need a physical device; all pass. Record the output summary as evidence.
  Covers: all · Done when: `check-coverage.mjs 020` prints `COVERAGE OK`, `run-e2e.mjs 020` prints `E2E PASSED`,
  and every other command exits 0.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 020` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 020` — every line this spec adds or changes is covered
  - `node .specs/scripts/run-e2e.mjs 020` — the backend e2e suite passes, `notifications.e2e-spec.ts` included
    (Postgres up, migrations applied)
  - `npm test --workspace @rochas-surf-school/mobile` — the whole mobile suite passes (T-13 changes
    `jest.setup.ts` and moves a locale helper)
  - `npx turbo run lint check-types --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors
  - `npx turbo run build --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/backend`
    — builds (mobile has no build script)
- User journeys (backend running locally with Postgres; requests through the `.integration.http` files):
  1. Create a pending account with `POST /auth/email/code` + `POST /auth/email/verify` (name "Ana Souza") while
     the seeded admin review account has a push token registered with `PUT /notifications/push-token`
     (`ExponentPushToken[review-admin]`, `pt-BR`) → the backend log shows no error and `notifications` holds a
     `registration.pending` row for every approved admin (`SELECT type, params FROM notifications`).
  2. Approve and deny accounts with `POST /registrations/{id}/approve|deny` → one row of the right type per
     decision; the deny row carries the trimmed reason.
  3. iOS simulator, signed in as a new pending account: the app doesn't crash or show anything about pushes
     (the simulator has no Expo push token; `getPushToken()` returns `null`).
  4. Physical device (needs the user's setup, see Assumptions — not a gate for the review): sign up on a phone,
     approve the account from the admin's phone → both pushes arrive in the phone's language; tapping each opens
     "Join the school" and the onboarding step; signing out and approving another account sends nothing to that
     phone.

## Memory Impact

- `memory/product.md` — Current state: admins get a push when someone new is waiting, and the person gets a push
  when approved or denied (with the reason), in their phone's language; tapping opens the matching screen; the
  notifications are stored but the notifications screen and the push setting don't exist yet. Remove "(no
  notifications yet)" from the registration paragraph.
- `memory/technical-context.md` — Fixed conventions → Languages: the push text is the second exception (catalog in
  `ExpoPushProvider`, locale per device); External integrations → Push notifications: `expo-server-sdk`,
  `EXPO_ACCESS_TOKEN`, tickets and the 15-minute receipt check, the token lifecycle, the EAS `projectId` and the
  APNs / FCM credentials; Authentication: `POST /auth/sign-out` takes `pushToken`; the `RegistrationNotifier` and
  `PushTokenRemover` ports; Scheduled work: `PushReceiptCheckJob`; Applications → mobile: `expo-notifications`,
  the push service and the notification hooks; Automated validation: the jest mocks and the fake push provider in
  the e2e suite.
- `memory/structure.md` — `modules/notifications` (aggregates `notification`, `push-token`),
  `apps/backend/src/modules/notifications/`, `prisma/models/notifications.model.prisma`,
  `test/notifications.e2e-spec.ts`; mobile `src/services/push/`, `src/modules/notifications/{hooks,utils}`,
  `src/i18n/backend-locale.ts`, `routes.home`.
- `memory/modules.md` — new module **Notifications** (stores every notification and pushes it to the person's
  devices; knows nothing about accounts beyond ids and the admin list it is given through a port).
- `memory/modules/notifications.md` — new: concepts (notification, push token, push ticket), the three registration
  types and their params, who gets what (D-10), the token lifecycle (D-06 to D-08), boundaries (no text stored;
  push copy in the backend adapter; no screen, read state or setting yet).
- `memory/modules/auth.md` — Boundaries: registrations now notify through `RegistrationNotifier`; sign-out removes
  the device's push token through `PushTokenRemover`; Spec history.

## Assumptions

- The user runs `eas init` (which writes `extra.eas.projectId` to `app.json`), uploads an APNs key and an FCM
  service account with `eas credentials`, and rebuilds the native app. Until then `getPushToken()` returns `null`
  and the app registers nothing, which this spec treats as a normal state (ER-10); nothing here blocks on it.
- Delivery to a real phone (user journey 4) is checked by the user on a physical device, not by the reviewer: the
  simulator can't get an Expo push token, and the project has no device automation.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)
- [Expo — sending notifications](https://docs.expo.dev/push-notifications/sending-notifications/)

## Amendments

## Review
