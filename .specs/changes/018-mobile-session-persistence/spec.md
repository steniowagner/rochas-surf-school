---
id: "018"
slug: mobile-session-persistence
title: Keep the mobile session across restarts and renew it automatically
status: in-progress
created: 2026-10-12
started: 2026-10-12
base_commit: 4bc742aef5c332d7981363bbfc3c41e4acffd757
fronts: [mobile]
depends_on: []
---

# 018 — Keep the mobile session across restarts and renew it automatically

## Goal

A signed-in person stays signed in when they close and reopen the app, and their session renews by itself for
as long as the backend's 30-day refresh token keeps rolling. Today the session lives in memory only, so a
restart signs the person out, and the first protected call after the 15-minute access token expires shows
"Your session expired" and signs them out. After this spec the app signs out only when the backend refuses
to renew the session.

## Context

- Product: [product.md](../../memory/product.md) — Current state: "Keeping the session across app restarts …
  renewing a session … don't exist yet"; spec 004 delivered the backend side ("renew its session before the
  15-minute access token runs out").
- Requirements: [requirements.md → Signing out](../../../.docs/requirements.md#signing-out) — signing out
  returns to the sign-in screen; this spec keeps that and adds the only other way out of a session (the backend
  refusing the refresh).
- Technical: [technical-context.md](../../memory/technical-context.md) — Applications → `apps/mobile` (Session:
  `expo-secure-store`; the `fetch` client in `src/services/api/`), Authentication → Session renewal (rotation
  with reuse detection: "one refresh at a time, and no sign-out while one is in flight"), Mobile session, Mobile
  sign-out, Mobile flows, Automated validation, Coverage.
- Backend contract (spec 004, unchanged):
  - `POST /auth/refresh` (`@Public()`, throttled 10 per 60 s) takes `{ refreshToken }` and answers 200 with
    `{ accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt, user }` (`user` is the same
    `AccountOut` as `GET /auth/me`); an unknown, expired, revoked or reused token answers 401
    `auth.refreshToken.invalid`, and a reused one revokes the whole sign-in.
  - `GET /auth/me` (protected) answers 200 with the account; every guard 401 is `auth.token.invalid`.
  - `POST /auth/sign-out` takes `{ refreshToken }` and answers 204 for any token.
- Existing code this builds on:
  - `apps/mobile/src/providers/session/` — `SessionProvider` / `useSession`: `user`, `tokens`, `setSession`,
    `clearSession`, all in React state.
  - `apps/mobile/src/services/api/api.client.ts` — `apiGet` / `apiPost` / `apiPut` with an optional
    `{ accessToken }`; `ApiError` and `NetworkError` in `api.errors.ts`. No timeout.
  - `apps/mobile/src/app/_layout.tsx` — holds the native splash screen (`SplashScreen.preventAutoHideAsync()`)
    until the fonts load.
  - `apps/mobile/src/modules/auth/hooks/use-sign-out.hook.ts` — local-first sign-out.
  - Protected hooks that pass `tokens.accessToken` and handle 401 `auth.token.invalid` themselves:
    `modules/onboarding/hooks/use-save-whatsapp.hook.ts`, `modules/reactivation/hooks/use-request-reactivation.hook.ts`,
    `modules/school-rules/hooks/use-school-rules.hook.ts`, `modules/school-rules/hooks/use-accept-school-rules.hook.ts`;
    and `modules/offboarding/hooks/use-school-whatsapp.hook.ts` (no 401 handling).
  - The sign-in screens (`modules/auth/screens/confirm-code.screen.tsx`, `auth.screen.tsx`,
    `google-name.screen.tsx`) call `setSession({ user, tokens })`; they keep doing so.
  - `expo-secure-store` is **not installed** yet; nor are `@react-native-async-storage/async-storage` or
    `@react-native-community/netinfo`, and this spec adds neither.

## Scope

### In scope

- Storing the session (tokens and account) in `expo-secure-store` and restoring it at launch, with the account
  reloaded through `GET /auth/me` while the native splash screen stays up.
- Renewing the access token through `POST /auth/refresh` before it expires (checked before each request) and
  after a 401, one refresh at a time.
- One central handling of an expired session (toast, sign-out, query cache cleared), replacing the per-hook 401
  handling.
- Sign-out that is safe while a refresh is in flight.
- Moving every protected call to the authenticated client.

### Out of scope

- Reloading the account when the app returns from the background, and background refresh timers.
- An offline screen, banner or connectivity detection (no NetInfo).
- Clearing the iOS Keychain after the app is reinstalled (see Assumptions).
- A biometric or PIN lock on the stored session.
- Signing out of every device at once.
- Any backend change.
- A Maestro (or other) automated end-to-end suite for mobile.
- Apple sign-in.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The session logic lives in a plain, React-free module store in `apps/mobile/src/services/session/`: it holds `{ user, tokens }` (or `null`), a `restoring` flag, an `expired` notice and a sign-out generation counter, and owns the single in-flight refresh promise. `SessionProvider` reads it through `useSyncExternalStore` and keeps exposing `useSession()` (`user`, `tokens`, `isRestoring`, `setSession`, `updateUser(user)`, `clearSession`). | The one-refresh-at-a-time lock must be shared by every caller, including two queries firing at once and the API client itself; a module-level promise guarantees that, a hook-level lock would exist once per mounted component. |
| D-02 | The session is written to `expo-secure-store` under two keys, `session.tokens` (JSON of the four token fields) and `session.user` (JSON of the account), on every change; both are deleted on sign-out and on expiry. A read or parse that throws, or only one key present, counts as "no session" and both keys are deleted. | Tokens are secrets (technical-context chose SecureStore); the account is stored with them so an offline launch can still route (D-09). Two keys keep each value small. An Android backup restored to a new Keystore can't be decrypted, and that must not crash the launch. |
| D-03 | `apiGet` / `apiPost` / `apiPut` replace the `{ accessToken }` option with `{ authenticated: true }`: the client takes the access token from the session store. They also take `timeoutMs`, implemented with an `AbortController`; an abort throws `NetworkError`. No request has a timeout unless it asks for one. | Hooks no longer read or pass tokens, so a renewed token is always the one sent. A launch request that hangs must not keep the splash screen up forever (D-09). |
| D-04 | Before each authenticated request, when `accessTokenExpiresAt` is less than **60 s** away (or already past), the client renews first and sends the new token. There is no timer. | Timers don't run reliably in the background and would refresh idle apps against the 10-per-60-s throttle. 60 s absorbs latency and clock skew; a wrong device clock is still caught by D-05. |
| D-05 | An authenticated request answered 401 `auth.token.invalid` triggers one refresh and is retried once with the new token. If the retry is answered 401 `auth.token.invalid` again, the session is expired (D-08). Other errors pass through unchanged. | The backend answers the same key for every 401 (expired, unknown user…), so the app renews first and gives up only when renewing didn't help. |
| D-06 | One refresh at a time: while a refresh is in flight, every caller that needs one awaits the same promise. A successful refresh stores the new tokens **and** puts its `user` in the session, so routing follows the account's real state (a role or status change moves the person to their new flow). | The backend's rotation with reuse detection revokes the whole sign-in when the same refresh token is sent twice. The refresh already returns the account; ignoring it would leave the session stale. |
| D-07 | Only a refresh answered with a **4xx** (typically 401 `auth.refreshToken.invalid`; 422 for a malformed token; 429 is excluded and treated like a network failure) expires the session. A network error, a timeout or a 5xx keeps the session and the stored tokens, and the caller receives `NetworkError`. | The request asks to sign out only when the refresh itself fails; being offline or a backend outage isn't the person's session ending. A throttled refresh (429) isn't a verdict on the token. |
| D-08 | When the session expires, the store clears it and both stored keys, sets the `expired` notice, and the client throws `SessionExpiredError` (new, in `api.errors.ts`). `useSessionExpired` (`src/modules/auth/hooks/use-session-expired.hook.ts`), mounted in `RootNavigator`, reacts to the notice: it shows "Your session expired. Sign in again." in the toast, clears the TanStack Query cache, calls `GoogleSignin.signOut()` without awaiting it (ignoring failure), and acknowledges the notice. No `POST /auth/sign-out` is sent for an expired session. The notice stays set until consumed, so an expiry during launch (before `RootNavigator` mounts) is shown too. The copy moves from `whatsapp.sessionExpired` to `session.expired` in the three locales, unchanged. | One place shows the toast and signs out, so it shows once however many calls fail together, and every hook behaves the same. The flow guards send a session-less app to `/auth`, as for a normal sign-out. |
| D-09 | At launch the store reads SecureStore and, with a stored session, calls `GET /auth/me` (authenticated, `timeoutMs: 8000`; a refresh it needs runs through D-04/D-05 with the same timeout) while the native splash screen stays up; the splash hides when the fonts are ready **and** the restore has finished. Outcomes: nothing stored → no session (sign-in); 200 → the session with the returned account; network error, timeout or 5xx → the stored session as it was (the person is routed by the stored account); refused refresh → expired (D-08: sign-in with the toast). | The request asks to reload the account before routing. Every backend request reloads role and status, so routing an offline launch by the last known account is harmless, and it spares a new offline screen that isn't designed. |
| D-10 | Sign-out (`useSignOut`) calls the store's sign-out: it clears memory and both stored keys at once and increments the generation counter, then, if a refresh is in flight, waits for it and sends `POST /auth/sign-out` with the newest refresh token it produced (otherwise the current one), ignoring any failure. A refresh that finishes after a sign-out (older generation) never writes the session or storage back. Query cache clearing and the Google sign-out stay as today. | Signing out stays instant and offline-safe, and never sends a token that a running refresh is about to rotate (the backend would see a reuse) nor leaves the rotated one alive. |
| D-11 | The protected hooks call the client with `{ authenticated: true }` and read no `tokens`. Their 401 branches are removed; their `onError` (and the school rules query) ignore `SessionExpiredError`. Answers that carry the account call `updateUser(account)`. `useRequestReactivation` keeps its 409 `user.reactivation.denied` (now `updateUser({ ...user, reactivationStatus: "denied" })`) and 403 `user.status.notDeleted` (toast + sign-out) handling. | D-08 handles expiry once; the rest of each hook's error handling is unchanged. |
| D-12 | All new logic is unit tested with Jest under `jest-expo`: `expo-secure-store` gets an in-memory mock in `apps/mobile/jest.setup.ts` (`getItemAsync`, `setItemAsync`, `deleteItemAsync` as `jest.fn`s over a `Map`, reset between tests); `fetch` is mocked per test. | Mobile has no automated e2e suite (technical-context → Automated validation); the store and client are where the rules live, so they carry the proof. |

## Expected Results

### ER-01 — A signed-in person stays signed in after a restart

- **Front:** mobile
- **Behavior:** Given a person signed in (any sign-in method) so the session is stored, when the app is closed
  and opened again, then it calls `GET /auth/me` with the stored access token and opens the entry screen of
  the flow of the account it returned, without showing the sign-in screen; the returned account replaces the
  stored one, in memory and in SecureStore.
- **Edge and error cases:** if `/auth/me` returns an account whose status or role changed while the app was
  closed (e.g. approved in the meantime), the app opens the new flow's entry screen; an access token that
  expired while the app was closed is renewed first (ER-06) and the launch still succeeds.
- **Verify by:** `npx jest src/services/session` (from `apps/mobile`) — `session.restore.test.ts` "restores the
  stored session and reloads the account" and "renews an expired access token before reloading the account",
  `session.storage.test.ts` "writes and reads the session"; user journey 1.

### ER-02 — The splash screen covers the restore

- **Front:** mobile
- **Behavior:** Given a stored session, when the app launches, then the native splash screen stays visible
  until both the fonts are loaded and the restore has finished, and the first screen rendered is the flow's
  entry screen; while restoring, `useSession().isRestoring` is `true` and `RootNavigator` is not rendered.
- **Edge and error cases:** with nothing stored, the restore finishes without a request and the sign-in screen
  is the first screen; a font error still lets the app continue as today once the restore has finished.
- **Verify by:** `npx jest src/providers/session` — `session.provider.test.tsx` "is restoring until the stored
  session is read"; user journey 1 (no flash of the sign-in screen).

### ER-03 — No stored session, or unreadable storage, opens sign-in

- **Front:** mobile
- **Behavior:** Given SecureStore has no session, or reading or parsing either key throws, or only one of the
  two keys is present, when the app launches, then no request is sent, the app opens the sign-in screen, and
  both keys are deleted.
- **Edge and error cases:** a delete that also throws doesn't block the launch.
- **Verify by:** `npx jest src/services/session` — `session.storage.test.ts` "treats an unreadable session as
  none", "treats a half-written session as none"; `session.restore.test.ts` "starts signed out with nothing
  stored".

### ER-04 — An offline or failed launch keeps the session

- **Front:** mobile
- **Behavior:** Given a stored session, when `GET /auth/me` (or the refresh it needs) fails with no answer,
  takes longer than 8 s, or answers 5xx, then the app opens the entry screen of the flow of the **stored**
  account, the stored tokens are kept, and no toast is shown.
- **Edge and error cases:** a 429 on the launch refresh is treated the same way (D-07); the next protected call
  then shows the existing "no connection" toast if still offline.
- **Verify by:** `npx jest src/services` — `session.restore.test.ts` "keeps the stored session when offline",
  "keeps the stored session on a timeout", "keeps the stored session on a server error";
  `api.client.test.ts` "throws NetworkError when the request times out"; user journey 3.

### ER-05 — A refused refresh at launch opens sign-in with a message

- **Front:** mobile
- **Behavior:** Given a stored session whose refresh token the backend refuses (401
  `auth.refreshToken.invalid`), when the app launches and needs to renew (expired access token, or `/auth/me`
  answers 401), then the app opens the sign-in screen, shows the toast "Your session expired. Sign in again."
  (pt-BR "Sua sessão expirou. Entre novamente.", es-ES "Tu sesión ha caducado. Vuelve a iniciar sesión.")
  once, and both stored keys are deleted.
- **Edge and error cases:** no `POST /auth/sign-out` is sent.
- **Verify by:** `npx jest src` — `session.restore.test.ts` "expires the session when the refresh is refused";
  `use-session-expired.hook.test.tsx` "shows the expired message raised before it mounted"; user journey 4.

### ER-06 — The access token is renewed before it expires

- **Front:** mobile
- **Behavior:** Given a session whose access token expires in less than 60 s, when any authenticated request
  is made, then the app first sends `POST /auth/refresh` with the stored refresh token, stores the four new
  token values and the returned account (memory and SecureStore), and sends the request with the new access
  token.
- **Edge and error cases:** an access token valid for more than 60 s is sent as is, with no refresh; an
  already expired access token is renewed the same way.
- **Verify by:** `npx jest src/services` — `session.refresh.test.ts` "renews a token that expires within 60
  seconds", "keeps a token valid for more than 60 seconds", "stores the renewed tokens and account";
  `api.client.test.ts` "sends the renewed access token"; user journey 2.

### ER-07 — A 401 is renewed and retried once

- **Front:** mobile
- **Behavior:** Given a session the client believes valid, when an authenticated request is answered 401
  `auth.token.invalid`, then the app renews the session once and sends the same request again with the new
  access token, and the caller receives the retried answer.
- **Edge and error cases:** a non-authenticated request answered 401 is not retried; any other 4xx/5xx is
  thrown as `ApiError` without a refresh; the request body is sent again unchanged.
- **Verify by:** `npx jest src/services/api` — `api.client.test.ts` "renews and retries once after a 401",
  "does not retry a public request", "does not renew on other errors".

### ER-08 — Only one refresh runs at a time

- **Front:** mobile
- **Behavior:** Given an access token that needs renewing, when two or more authenticated requests start at
  the same time (or a request answered 401 while a refresh is running), then exactly one `POST /auth/refresh`
  is sent and every request goes out with the token it produced.
- **Edge and error cases:** once that refresh settles, a later one may start; a failed refresh fails every
  waiting caller the same way.
- **Verify by:** `npx jest src/services` — `session.refresh.test.ts` "shares one refresh between concurrent
  callers"; `api.client.test.ts` "renews once for concurrent requests".

### ER-09 — A refused refresh during use signs out once with a message

- **Front:** mobile
- **Behavior:** Given a signed-in person using the app, when a refresh is answered with a 4xx other than 429,
  or a retried request is answered 401 `auth.token.invalid` again, then the session and both stored keys are
  cleared, the TanStack Query cache is cleared, the toast "Your session expired. Sign in again." is shown once
  (even when several requests fail together), the app shows the sign-in screen, and the hook that made the
  call shows no other toast.
- **Edge and error cases:** the caller receives `SessionExpiredError`; no `POST /auth/sign-out` is sent;
  `GoogleSignin.signOut()` is called.
- **Verify by:** `npx jest src` — `session.refresh.test.ts` "expires the session when the refresh is refused";
  `api.client.test.ts` "expires the session when the retry is refused again";
  `use-session-expired.hook.test.tsx` "shows the message once and clears the cache"; the hook tests of ER-12
  "shows nothing more when the session expired".

### ER-10 — A network failure during a refresh keeps the session

- **Front:** mobile
- **Behavior:** Given a signed-in person, when a refresh gets no answer, times out, or answers 5xx or 429,
  then the session and stored keys are unchanged, the caller receives `NetworkError`, and the hook shows its
  existing "no connection" toast; the person is not signed out.
- **Edge and error cases:** the next request tries to renew again.
- **Verify by:** `npx jest src/services` — `session.refresh.test.ts` "keeps the session when the refresh
  fails to connect", "keeps the session on a server error or 429".

### ER-11 — Signing out during a refresh is safe

- **Front:** mobile
- **Behavior:** Given a refresh in flight, when the person signs out, then the session and both stored keys
  are cleared at once (the sign-in screen opens), `POST /auth/sign-out` is sent after the refresh settles with
  the refresh token that refresh returned, and the refresh result never puts the session back in memory or
  storage.
- **Edge and error cases:** with no refresh in flight, sign-out is sent at once with the current refresh
  token (as today); if the in-flight refresh fails, sign-out is sent with the token it had; any sign-out
  failure is ignored.
- **Verify by:** `npx jest src` — `session.store.test.ts` "signs out with the token of the running refresh",
  "ignores a refresh that finishes after sign-out"; `use-sign-out.hook.test.tsx` "clears the session at once".

### ER-12 — Every protected call goes through the authenticated client

- **Front:** mobile
- **Behavior:** Given the protected hooks `useSaveWhatsapp`, `useRequestReactivation`, `useSchoolRules`,
  `useAcceptSchoolRules` and `useSchoolWhatsapp`, when they call the backend, then they use
  `{ authenticated: true }`, and an answer carrying the account updates the session through `updateUser`;
  none of them handles 401 itself or passes an access token.
- **Edge and error cases:** `useRequestReactivation` still turns 409 `user.reactivation.denied` into
  `reactivationStatus: "denied"` and still signs out with "Sua conta mudou…" on 403
  `user.status.notDeleted`; `NetworkError` and other errors keep their current toasts.
- **Verify by:** `npx jest src/modules` (the five hooks' tests, each with "shows nothing more when the session
  expired" where the hook shows toasts); `grep -rn "accessToken:\|auth.token.invalid" apps/mobile/src/modules`
  returns no match outside tests.

## Tasks

### Mobile (`apps/mobile`)

- [x] **T-01** — Install `expo-secure-store` with `npx expo install expo-secure-store` (from `apps/mobile`; no
  config plugin entry needed), add its in-memory mock to `apps/mobile/jest.setup.ts` (D-12), and create
  `apps/mobile/src/services/session/session.storage.ts` (`readStoredSession`, `writeStoredSession`,
  `clearStoredSession` over the keys `session.tokens` and `session.user`, D-02) with
  `session.storage.test.ts` (write/read, unreadable, half-written, delete failure).
  Covers: ER-01, ER-03 · Done when: `npx jest src/services/session/session.storage.test.ts` passes and
  `expo-secure-store` is in `apps/mobile/package.json`.
  > ✅ 2026-10-12 15:35 — installed `expo-secure-store` (~57.0.4; the expo install added a config plugin entry to app.json, reverted since the spec says none is needed), added its in-memory mock to jest.setup.ts, created session storage with tests; files: `apps/mobile/package.json`, `package-lock.json`, `apps/mobile/jest.setup.ts`, `apps/mobile/src/services/session/session.types.ts`, `apps/mobile/src/services/session/session.storage.ts`, `apps/mobile/src/services/session/session.storage.test.ts`; verified: `npx jest src/services/session/session.storage.test.ts` (8 passed); deviations: none (session.types.ts created here, ahead of T-02)

- [x] **T-02** — Create the session store `apps/mobile/src/services/session/session.store.ts` (+
  `session.types.ts` moved or re-exported from `src/providers/session/session.types.ts`): state
  `{ session, restoring, expired }`, `subscribe` / `getSnapshot`, `setSession`, `updateUser`, `clearSession`,
  `expireSession`, `acknowledgeExpired`, the generation counter and `signOut()` (D-01, D-02, D-10), writing
  through to `session.storage.ts`; with `session.store.test.ts`.
  Covers: ER-01, ER-11 · Done when: `npx jest src/services/session/session.store.test.ts` passes, including
  "signs out with the token of the running refresh" and "ignores a refresh that finishes after sign-out".
  > ✅ 2026-10-12 15:36 — created the session store (state, subscribe/getSnapshot, setSession, updateUser, clearSession, expireSession, acknowledgeExpired, generation counter, refresh in-flight slot, commitRefreshedSession, signOut) with write-through to storage. Small technical step: moved the HTTP call out of api.client.ts into `api.request.ts` (`rawRequest`, with optional `timeoutMs`) so the store can send the sign-out request without a circular import; `api.client.ts` now wraps it unchanged (timeout tests land in T-04). files: `apps/mobile/src/services/session/session.store.ts`, `apps/mobile/src/services/session/session.store.test.ts`, `apps/mobile/src/services/api/api.request.ts`, `apps/mobile/src/services/api/api.client.ts`; verified: `npx jest src/services` (40 passed) and `npx tsc --noEmit`; deviations: `session.types.ts` was created in T-01 and the providers' types are re-exported in T-06

- [x] **T-03** — Create `apps/mobile/src/services/session/session.refresh.ts`: `getAccessToken()` with the 60 s
  margin (D-04) and `refreshSession()` single-flight (D-06) calling `POST /auth/refresh` through a raw request
  of the API client (no recursion into the authenticated path), storing tokens and account, expiring on a
  non-429 4xx and throwing `NetworkError` on no answer, timeout, 5xx or 429 (D-07); with
  `session.refresh.test.ts`.
  Covers: ER-06, ER-08, ER-09, ER-10 · Done when: `npx jest src/services/session/session.refresh.test.ts`
  passes.
  > ✅ 2026-10-12 15:37 — created `getAccessToken()` (60 s margin) and single-flight `refreshSession()` (expires on non-429 4xx, `NetworkError` otherwise, never expires or restores a session that signed out meanwhile); also added `SessionExpiredError` to `api.errors.ts` and exported it from `api/index.ts` (needed here; T-04 uses it); files: `apps/mobile/src/services/session/session.refresh.ts`, `apps/mobile/src/services/session/session.refresh.test.ts`, `apps/mobile/src/services/api/api.errors.ts`, `apps/mobile/src/services/api/index.ts`; verified: `npx jest src/services` (57 passed), `npx tsc --noEmit`, `npx eslint src/services`; deviations: `SessionExpiredError` moved from T-04 to T-03

- [x] **T-04** — In `apps/mobile/src/services/api/api.client.ts`, `api.errors.ts` and `index.ts`: replace
  `{ accessToken }` with `{ authenticated: true }` (token from `getAccessToken()`), retry once after a
  refresh on 401 `auth.token.invalid` and expire on a second one (D-05), add `SessionExpiredError` and
  `timeoutMs` (D-03); update `api.client.test.ts`. The old `{ accessToken }` option stays until T-08 moves its
  callers, so the app keeps compiling between the two commits.
  Covers: ER-04, ER-06, ER-07, ER-08, ER-09 · Done when: `npx jest src/services/api` passes.
  > ✅ 2026-10-12 15:37 — added `{ authenticated: true }` and `timeoutMs` to the client (renews before expiry, retries once after a 401 `auth.token.invalid`, expires the session when the retry is refused again, unless the person already signed out); the deprecated `{ accessToken }` option stays until T-08; files: `apps/mobile/src/services/api/api.client.ts`, `apps/mobile/src/services/api/api.client.test.ts`; verified: `npx jest src/services/api` (32 passed), `npx tsc --noEmit`, `npx eslint src/services`; deviations: `api.errors.ts` and `index.ts` were changed in T-03; the timeout itself lives in `api.request.ts` (T-02)

- [x] **T-05** — Create `apps/mobile/src/services/session/session.restore.ts` (`restoreSession()`: read
  storage, `GET /auth/me` authenticated with `timeoutMs: 8000`, the four outcomes of D-09, `restoring` set to
  `false` in every case) with `session.restore.test.ts`.
  Covers: ER-01, ER-03, ER-04, ER-05 · Done when: `npx jest src/services/session/session.restore.test.ts`
  passes.
  > ✅ 2026-10-12 15:38 — created `restoreSession()` (reads storage, hydrates the store, `GET /auth/me` authenticated with `timeoutMs: 8000`, keeps the stored session on anything but a refused renewal, always ends `restoring`); added `hydrateSession` to the store (memory only, no write-back); files: `apps/mobile/src/services/session/session.restore.ts`, `apps/mobile/src/services/session/session.restore.test.ts`, `apps/mobile/src/services/session/session.store.ts`, `apps/mobile/src/services/session/session.store.test.ts`; verified: `npx jest src/services` (83 passed), `npx tsc --noEmit`, `npx eslint src/services`; deviations: none

- [x] **T-06** — Rebuild `apps/mobile/src/providers/session/` on the store (`useSyncExternalStore`; exposes
  `user`, `tokens`, `isRestoring`, `setSession`, `updateUser`, `clearSession`; the provider starts
  `restoreSession()` once on mount) and make `apps/mobile/src/app/_layout.tsx` keep the splash screen until
  the fonts are ready and `isRestoring` is `false`, rendering `RootNavigator` only then (D-09). Update
  `session.provider.test.tsx`.
  Covers: ER-01, ER-02 · Done when: `npx jest src/providers/session` passes, including "is restoring until the
  stored session is read".
  > ✅ 2026-10-12 15:40 — rebuilt `SessionProvider` on the store (`useSyncExternalStore`; exposes `user`, `tokens`, `isRestoring`, `setSession`, `updateUser`, `clearSession`; starts `restoreSession()` once on mount); `providers/session/session.types.ts` re-exports the types from `services/session`. The providers sit above the splash logic, so the splash screen moved into a new `SplashGate` component (`src/navigation/splash-gate/`) that `_layout.tsx` renders inside `SessionProvider`: it hides the splash when fonts are ready and `isRestoring` is false, and renders `StatusBar` and `RootNavigator` only then. Small technical steps: `resetSessionStore()` in the store, called in `jest.setup.ts` before every test (the store is module state); the 14 tests that build a `SessionContext` value by hand got `isRestoring: false` and `updateUser`. files: `apps/mobile/src/providers/session/session.provider.tsx`, `apps/mobile/src/providers/session/session.types.ts`, `apps/mobile/src/providers/session/session.provider.test.tsx`, `apps/mobile/src/navigation/splash-gate/{index.ts,splash-gate.component.tsx,splash-gate.hook.ts,splash-gate.types.ts,splash-gate.component.test.tsx}`, `apps/mobile/src/app/_layout.tsx`, `apps/mobile/jest.setup.ts`, `apps/mobile/src/services/session/session.store.ts`, `apps/mobile/src/services/session/session.store.test.ts`, and the `SessionContext` fixtures in the existing tests under `apps/mobile/src/modules/**` and `apps/mobile/src/navigation/root-navigator/`; verified: `npx jest` (72 suites, 760 passed), `npx tsc --noEmit`, `npx eslint src`; deviations: the splash logic lives in `SplashGate`, not in `_layout.tsx` itself

- [x] **T-07** — Make `apps/mobile/src/modules/auth/hooks/use-sign-out.hook.ts` use the store's `signOut()`
  (D-10); add `apps/mobile/src/modules/auth/hooks/use-session-expired.hook.ts` (D-08) and mount it in
  `apps/mobile/src/navigation/root-navigator/root-navigator.component.tsx`; move the copy from
  `whatsapp.sessionExpired` to `session.expired` in `src/i18n/messages/{en-US,es-ES,pt-BR}.ts`. Tests:
  `use-sign-out.hook.test.tsx` (updated), `use-session-expired.hook.test.tsx` (new),
  `root-navigator.component.test.tsx` (still passes).
  Covers: ER-05, ER-09, ER-11 · Done when: `npx jest src/modules/auth/hooks src/navigation` passes.
  > ✅ 2026-10-12 15:43 — `useSignOut` now calls the store's `signOut()` (clears memory and storage at once, waits for an in-flight refresh, then tells the backend); new `useSessionExpired` (toast once, clears the query cache, `GoogleSignin.signOut()` unawaited, acknowledges the notice) mounted in `RootNavigator`; copy moved from `whatsapp.sessionExpired` to `session.expired` in the three locales (the four hooks that still used the old key now use the new one until T-08 removes their 401 branches). The existing tests that faked the context and asserted `clearSession` on sign-out now mock the store's `signOut` (denied, removed, pending, use-school-rules) or use the real provider (reactivation screen, root navigator). files: `apps/mobile/src/modules/auth/hooks/use-sign-out.hook.ts`, `apps/mobile/src/modules/auth/hooks/use-sign-out.hook.test.tsx`, `apps/mobile/src/modules/auth/hooks/use-session-expired.hook.ts`, `apps/mobile/src/modules/auth/hooks/use-session-expired.hook.test.tsx`, `apps/mobile/src/navigation/root-navigator/root-navigator.component.tsx`, `apps/mobile/src/navigation/root-navigator/root-navigator.component.test.tsx`, `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts`, `apps/mobile/src/modules/{onboarding,reactivation,school-rules}/hooks/{use-save-whatsapp,use-request-reactivation,use-accept-school-rules,use-school-rules}.hook.ts`, `apps/mobile/src/modules/offboarding/screens/{denied,removed}.screen.test.tsx`, `apps/mobile/src/modules/pending/components/pending/pending.component.test.tsx`, `apps/mobile/src/modules/reactivation/screens/reactivation.screen.test.tsx`, `apps/mobile/src/modules/school-rules/hooks/use-school-rules.hook.test.tsx`; verified: `npx jest` (73 suites, 766 passed), `npx tsc --noEmit`, `npx eslint src`; deviations: none

- [ ] **T-08** — Move `useSaveWhatsapp`, `useRequestReactivation`, `useSchoolRules`, `useAcceptSchoolRules`
  (`src/modules/{onboarding,reactivation,school-rules}/hooks/`) and `useSchoolWhatsapp`
  (`src/modules/offboarding/hooks/`) to `{ authenticated: true }` and `updateUser`, remove their 401 branches
  and ignore `SessionExpiredError` (D-11); remove the `{ accessToken }` option from `api.client.ts`;
  update their tests (and the screens' tests that mocked 401).
  Covers: ER-09, ER-12 · Done when: `npx jest src/modules` passes and the ER-12 `grep` returns no match.

### Verification

- [ ] **T-09** — Run every command in the Verification Plan from the repo root and follow the user journeys on
  the iOS simulator (after rebuilding the app, since `expo-secure-store` is native); all pass. Record the
  output summary as evidence. Covers: all · Done when: `check-coverage.mjs 018` prints `COVERAGE OK`, lint and
  check-types exit 0, and journeys 1–5 show what they describe.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 018` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 018` — every line this spec adds or changes is covered
  - `npm test --workspace @rochas-surf-school/mobile` — the whole mobile suite passes (the session and the API
    client are used everywhere)
  - `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` — no errors (mobile has no build
    script; the type check also proves the three locales share the keys)
  - `node .specs/scripts/run-e2e.mjs 018` — runs the e2e suites of the apps touched (none for mobile; expected
    to report nothing to run)
  - `grep -rn "accessToken:\|auth.token.invalid" apps/mobile/src/modules` — no match outside `*.test.*` files
- User journeys (iOS simulator with a rebuilt app — `npx expo run:ios` from `apps/mobile` — backend running with
  `npm run dev` and its database up; sign in with a review account or any account whose code comes from the
  backend log):
  1. ER-01, ER-02 — sign in with an approved account that completed onboarding; the role's home opens. Close
     the app from the app switcher and open it again: the splash screen shows, then the role's home, with no
     flash of the sign-in screen. Change the account's status to `pending` in SQL, relaunch: the Pending screen
     opens.
  2. ER-06 — restart the backend with `JWT_EXPIRES_IN=1m` in `apps/backend/.env`, sign in to an account on the
     WhatsApp step, wait 70 s, save a number: it saves (the backend log shows one `POST /auth/refresh` before
     the `PUT /auth/me/whatsapp`).
  3. ER-04 — signed in, close the app, stop the backend, open the app: after at most ~8 s the splash hides and
     the account's entry screen opens, with no toast. Start the backend again; the app still works without
     signing in.
  4. ER-05 — signed in, close the app, run `UPDATE refresh_tokens SET revoked_at = now();` and wait for the
     access token to expire (with `JWT_EXPIRES_IN=1m`), open the app: the sign-in screen opens with "Your
     session expired. Sign in again." (in the phone's language).
  5. ER-11 — signed in, tap "Sign out" (Pending screen) or "Usar outro email" (closed-account screens): the
     sign-in screen opens at once; relaunch: the sign-in screen opens (nothing stored).

## Memory Impact

- `memory/technical-context.md` — Applications → `apps/mobile` → Session: `expo-secure-store` is in use (two
  keys, D-02); Server data: the client's `{ authenticated: true }` and `timeoutMs` options replace
  `{ accessToken }`, and `SessionExpiredError`; Authentication → Mobile session: rewritten for the store in
  `src/services/session/` (D-01), the launch restore behind the splash screen (D-09), renewal before expiry and
  after a 401 with one refresh at a time (D-04–D-07), central expiry (D-08); Mobile sign-out: waits for an
  in-flight refresh (D-10); remove "Until sessions are renewed…"; Mobile closed-account calls: the 401 branch
  of `useRequestReactivation` is gone; jest setup mocks `expo-secure-store`.
- `memory/structure.md` — `apps/mobile/src/services/session/` (store, storage, refresh, restore) and
  `modules/auth/hooks/use-session-expired.hook.ts`.
- `memory/modules/auth.md` — the app keeps and renews its session: what ends a session on the device (sign-out
  or a refused refresh) and that a refresh updates the account.
- `memory/product.md` — remove "Keeping the session across app restarts" and "renewing a session" from what
  doesn't exist yet; note that a refresh can move a person to their new flow while the app is open (it
  partially changes spec 016's "the session isn't refreshed while the screen is open").

## Assumptions

- On iOS the Keychain survives uninstalling the app, so reinstalling can restore a still-valid session; the
  backend still validates the refresh token, which expires on its own. Accepted by the user (2026-10-12).
- `expo-secure-store` needs no config plugin entry for plain key-value use (no Face ID).

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
