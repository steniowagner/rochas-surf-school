---
id: "017"
slug: google-sign-in
title: Google sign-in
status: in-progress
created: 2026-10-12
started: 2026-10-12
base_commit: 1790b1b6902bf9c2ee7ac684db4e5566eb884681
fronts: [auth, backend, mobile]
depends_on: []
---

# 017 — Google sign-in

## Goal

People sign in, or sign up, with their Google account from "Continue with Google" on the sign-in screen. The
backend checks the Google ID token and opens the one account for that email address: by the Google identity,
else by the email (linking a Google identity to it), else as a new pending student. The app gets the same
session as an email sign-in, so the existing flow routing takes over. When Google's name doesn't fit the
account's name rule, the app asks for a name first. The Apple button is hidden until Apple sign-in is built.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: **User** (one account per email, email
  fixed forever, `pending` until an admin decides), and the decision "One account per email address, and the
  email never changes".
- Requirements:
  [requirements.md → Sign-in methods](../../../.docs/requirements.md#sign-in-methods) — Google sign-in on the
  same screen that signs in and signs up, and the first sign-in creates an account (the Apple scenarios stay
  for the Apple spec, see D-11);
  [requirements.md → One account per email address](../../../.docs/requirements.md#one-account-per-email-address)
  — a Google sign-in with an address that already has an account opens that account;
  [requirements.md → Name before approval](../../../.docs/requirements.md#name-before-approval) — the name shared
  by Google is used when available, and the person is asked for one otherwise (D-03).
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Applications
  (`@react-native-google-signin/google-signin` is the chosen library), Authentication (Google ID tokens obtained
  natively and verified by the backend; tokens, sessions, rate limits; mobile session and sign-out), Error
  handling, Automated validation.
- Module: [modules/auth.md](../../memory/modules/auth.md) — Identities (one account per email address; an
  identity is `google` | `apple` | `email`), Sessions, "Any status gets a session".
- Existing code this builds on:
  - `modules/auth/src/identity/` — `Identity` (`provider`, `providerUserId`, `email`) and
    `IdentityRepository.findByProvider(provider, providerUserId)` / `findByUserId`; the `identities` table has
    `@@unique([provider, providerUserId])`.
  - `modules/auth/src/sign-in-code/usecase/verify-sign-in-code.usecase.ts` — the pattern to follow: find or
    build the user (validated before anything is written, so a bad name writes nothing), create it, add the
    identity, `StartSession`, answer `{ ...session, user: toAccountOut(...) }`.
  - `apps/backend/src/modules/auth/auth.controller.ts` — `POST /auth/email/verify` (`@Public()`, throttled 10/60 s)
    wires the use case by hand; `apps/backend/src/modules/auth/auth.config.ts` — `AuthConfig` reads the auth
    variables.
  - `apps/backend/test/auth-email.e2e-spec.ts` — overrides `ResendEmailProvider` with
    `overrideProvider`; the Google e2e suite overrides the token provider the same way.
  - `apps/mobile/src/modules/auth/components/auth/auth.component.tsx` — the sign-in screen; its Apple and Google
    buttons have no `onPress` today.
  - `apps/mobile/src/modules/auth/screens/confirm-code.screen.tsx` — puts a verify answer in the session
    (`setSession({ user, tokens })`); the route guards then open the account's flow.
  - `apps/mobile/src/modules/auth/hooks/use-sign-out.hook.ts` — local-first sign-out.
  - `apps/mobile/src/modules/auth/components/create-account/` — the layout and shared-rule name validation the
    "Your name" screen reuses.
- Google Cloud setup (done by the user, 2026-10-12): an OAuth consent screen in Testing with the user's account
  as a test user, and Web, iOS and Android (debug SHA-1) OAuth clients. The client ids are in
  `apps/mobile/.env.example` (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and the iOS
  URL scheme in a comment) and `apps/backend/.env.example` (`GOOGLE_WEB_CLIENT_ID`). None is secret.

## Scope

### In scope

- `POST /auth/google`: verify a Google ID token and sign in to, link or create the account.
- The `GoogleIdTokenProvider` port and its `google-auth-library` implementation; `GOOGLE_WEB_CLIENT_ID` in
  `AuthConfig`.
- The mobile Google sign-in: library, config plugin, the button's flow, its errors, and the "Your name" screen.
- Hiding the Apple button.
- Signing out of Google in the app when the person signs out.

### Out of scope

- Sign in with Apple (backend and app), and revoking Apple tokens.
- Storing Google's profile photo.
- Keeping the session across app restarts, and renewing the session with the refresh token.
- Checking the flow on the Android emulator (the Android OAuth client exists; a check there is a later task).
- Google One Tap / Credential Manager "auto sign-in", and Google sign-in on web.
- Changing the email-code flow in any way.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The account is found in this order: the `google` identity with the token's `sub`; else the account whose email equals the token's email (normalized), to which a `google` identity (`providerUserId` = `sub`, `email` = the token's email) is added; else a new `pending` `student` with a `google` identity. The account's email is never changed, even when the Google email differs from it (renamed Gmail). | One account per email address, and the email never changes. Matching by `sub` first keeps a person on their account when their Google email changes. |
| D-02 | A token whose `email_verified` is not `true` is refused with 401 `auth.google.emailNotVerified`, before any lookup, and nothing is written. | Linking through an unconfirmed address would hand someone else's account to whoever claims it. |
| D-03 | A new account uses Google's `name` (trimmed) when it passes `User.validate()`'s name rules; a `name` sent in the body replaces Google's. When the resulting name fails the rules, the API answers 422 with the `user.name.*` key(s) and creates nothing; the app then opens "Your name" with Google's name filled in and sends the same `idToken` again with `name`. A `name` sent for an existing account (found by D-01) is ignored. | Mirrors `email/verify` (a missing name keeps the code usable); many Google names are one word, and the rule needs two. |
| D-04 | The token is verified behind a `GoogleIdTokenProvider` port in `modules/auth` (`verify(idToken)` → `{ sub, email, emailVerified, name? }`, or a rejection for any invalid token), implemented in the backend by `GoogleAuthIdTokenProvider` (`google.id-token.ts`) with `google-auth-library`'s `OAuth2Client.verifyIdToken({ idToken, audience: GOOGLE_WEB_CLIENT_ID })`. The use case turns a rejection into 401 `auth.google.tokenInvalid`. | Ports and adapters; the library checks signature, expiry, issuer and audience. The native library issues the ID token for the web client id on both platforms. |
| D-05 | `POST /auth/google` is `@Public()`, throttled like `email/verify` (`ThrottlerGuard`, 10 requests per 60 s), takes `{ idToken: string, name?: string }`, answers 200 with the `email/verify` answer (`accessToken`, `accessTokenExpiresAt`, `refreshToken`, `refreshTokenExpiresAt`, `user: AccountOut`). A missing, empty or non-string `idToken` answers 422 `idToken.token.required` without calling the provider. | The app routes from that answer unchanged; the throttle and the error shape follow the existing auth routes. |
| D-06 | `AuthConfig` reads `GOOGLE_WEB_CLIENT_ID`: when `NODE_ENV` is `production` and it is unset or empty, the backend refuses to start; elsewhere it may be unset, and then every Google token is refused with 401 `auth.google.tokenInvalid` without calling Google. | Same pattern as `RESEND_API_KEY`: local work and CI don't need Google, production can't run misconfigured. |
| D-07 | The app passes the `idToken` and Google's name to "Your name" (`routes.auth.googleName({ idToken, name })`, route `/auth/google-name`) as route params. | They live only in the app's navigation state, never leave the phone except to our backend, and the token expires within an hour. |
| D-08 | `GoogleSignin.configure({ webClientId, iosClientId })` runs once, at module load of `src/services/google-sign-in.ts`, from `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`; the config plugin gets the iOS URL scheme in `app.json`. On Android, `GoogleSignin.hasPlayServices()` runs before `signIn()`. | One place configures the SDK; the plugin is the only way to touch `ios/` (generated). |
| D-09 | App errors: `signIn()` answering `cancelled`, or failing with `SIGN_IN_CANCELLED` / `IN_PROGRESS` → nothing happens; `PLAY_SERVICES_NOT_AVAILABLE` → toast `googleSignIn.playServices`; `NetworkError` → the existing no-connection toast; API 401 `auth.google.tokenInvalid` / `auth.google.emailNotVerified` → their toasts; any other error → the existing generic toast. On "Your name", a 401 `auth.google.tokenInvalid` shows its toast and goes back to `/auth`. | Closing the picker is a choice, not an error; every other outcome gets one message. |
| D-10 | `useSignOut` also calls `GoogleSignin.signOut()` without awaiting it and ignores its failure, after clearing the session as today. | So "Use another email" and the next Google tap show the account picker instead of reusing the last account silently; sign-out stays local-first and works offline. |
| D-11 | The Apple button is not rendered on any platform until the Apple spec. | A button that does nothing looks broken; Apple sign-in was deferred by the user. |
| D-12 | Copy (en / pt-BR / es). "Your name" — title: "What's your name?" / "Qual é o seu nome?" / "¿Cómo te llamas?"; description: "Enter your full name so the school knows who you are." / "Digite seu nome completo para a escola saber quem é você." / "Escribe tu nombre completo para que la escuela sepa quién eres."; button: "Continue" / "Continuar" / "Continuar". Toasts — `auth.google.tokenInvalid`: "We couldn't sign you in with Google. Try again." / "Não conseguimos entrar com o Google. Tente novamente." / "No pudimos iniciar sesión con Google. Inténtalo de nuevo."; `auth.google.emailNotVerified`: "Your Google email isn't verified. Use another sign-in method." / "Seu e-mail do Google não está verificado. Use outra forma de entrar." / "Tu correo de Google no está verificado. Usa otro método para iniciar sesión."; `googleSignIn.playServices`: "Google Play services is unavailable on this phone." / "O Google Play Services não está disponível neste celular." / "Google Play Services no está disponible en este teléfono." The name field reuses Create account's label, placeholder and error messages. | Agreed with the user; no design exists for this screen, so it follows Create account's layout (`BackButton`, `ScreenIntro`, `TextInput`, one primary `Button`). |
| D-13 | Automated tests never call Google: the backend e2e suite overrides `GoogleAuthIdTokenProvider` with a fake that maps test tokens to payloads; mobile tests mock `@react-native-google-signin/google-signin` in `jest.setup.ts`. The real round trip is one journey on the iOS simulator performed by the user (ER-13). | Real Google tokens can't be minted in tests, and the reviewer can't sign in to a Google account. |

## Expected Results

### ER-01 — A new Google user gets a pending account with Google's name

- **Front:** backend
- **Behavior:** Given no account and no identity for the token's email and `sub`, and a token whose `name` is
  "Maria Silva" and `email_verified` is true, when the app calls `POST /auth/google` with `{ idToken }`, then the
  API answers 200 with a session and `user` whose `name` is "Maria Silva", `email` the token's email
  (normalized), `role` `"student"` and `status` `"pending"`; the database has one new `users` row and one
  `identities` row with `provider = 'google'` and `provider_user_id` = the token's `sub`.
- **Edge and error cases:** an email with upper case or spaces is stored trimmed and lower case; a body `name`
  that passes the rules replaces Google's (D-03).
- **Verify by:** `npx jest test/identity/usecase/sign-in-with-google.usecase.test.ts -t "new account"` (from
  `modules/auth`) and the e2e test `creates a pending account` in `apps/backend/test/auth-google.e2e-spec.ts`.

### ER-02 — An existing account with the same email is linked, not duplicated

- **Front:** backend
- **Behavior:** Given an account created by email code for `ana@example.com` with no `google` identity, when the
  app calls `POST /auth/google` with a verified token for `Ana@Example.com`, then the API answers 200 with that
  account's `id`, and a `google` identity with the token's `sub` is added to it; the number of `users` rows is
  unchanged.
- **Edge and error cases:** the account's status doesn't matter — a `pending`, `approved`, `denied`, `deleted`
  or `removed` account gets a session and its own `status` in the answer; a body `name` is ignored and the
  account's name is unchanged.
- **Verify by:** the `links an existing account` and `any status` tests in
  `sign-in-with-google.usecase.test.ts`, and the e2e test `links an email account` in
  `auth-google.e2e-spec.ts`.

### ER-03 — A known Google identity opens its account even after an email change

- **Front:** backend
- **Behavior:** Given an account whose `google` identity has `sub` S and whose email is `old@gmail.com`, when the
  app calls `POST /auth/google` with a verified token with `sub` S and email `new@gmail.com`, then the API
  answers 200 with that account, whose `email` is still `old@gmail.com`; no user and no identity is created.
- **Edge and error cases:** a second sign-in with the same token payload creates nothing either.
- **Verify by:** the `known identity` test in `sign-in-with-google.usecase.test.ts` and the e2e test
  `signs in a known identity` in `auth-google.e2e-spec.ts`.

### ER-04 — A missing or invalid token is refused

- **Front:** backend
- **Behavior:** Given any database state, when the app calls `POST /auth/google` with no body, an empty or
  non-string `idToken`, then the API answers 422 `errors: ["idToken.token.required"]`; and with a token the
  provider rejects (bad signature, expired, another audience, malformed), it answers 401
  `errors: ["auth.google.tokenInvalid"]`. In both cases no user, identity or refresh token is written.
- **Edge and error cases:** the 422 is answered without calling the provider.
- **Verify by:** the `token required` and `token invalid` tests in `sign-in-with-google.usecase.test.ts`, the
  `rejects` tests in `apps/backend/src/modules/auth/google.id-token.spec.ts`, and the e2e tests
  `requires a token` and `refuses an invalid token` in `auth-google.e2e-spec.ts`.

### ER-05 — An email Google hasn't verified is refused

- **Front:** backend
- **Behavior:** Given a token whose `email_verified` is false or absent, when the app calls `POST /auth/google`,
  then the API answers 401 `errors: ["auth.google.emailNotVerified"]` and nothing is written — even when an
  account with that email, or a `google` identity with that `sub`, exists.
- **Edge and error cases:** none beyond D-02.
- **Verify by:** the `email not verified` test in `sign-in-with-google.usecase.test.ts` and the e2e test
  `refuses an unverified email` in `auth-google.e2e-spec.ts`.

### ER-06 — A new account needs a valid name

- **Front:** backend
- **Behavior:** Given no account for the token, when the token's name fails the name rules (e.g. "Maria",
  absent, or longer than 80 characters) and no body `name` is sent, then the API answers 422 with the
  `user.name.*` key(s) and creates no user, identity or refresh token; when the same token is sent again with
  `name: "Maria Souza"`, the account is created with that name (as in ER-01).
- **Edge and error cases:** a body `name` that fails the rules answers 422 the same way; surrounding spaces are
  trimmed before validation.
- **Verify by:** the `invalid name` and `name from the body` tests in `sign-in-with-google.usecase.test.ts`, and
  the e2e test `asks for a name` in `auth-google.e2e-spec.ts`.

### ER-07 — The backend's Google client id is required in production only

- **Front:** backend
- **Behavior:** Given `NODE_ENV=production` and `GOOGLE_WEB_CLIENT_ID` unset or empty, when `AuthConfig` is
  built, then it throws (`GOOGLE_WEB_CLIENT_ID is not configured`), so the backend doesn't start. Given another
  `NODE_ENV` and no `GOOGLE_WEB_CLIENT_ID`, it builds, and `GoogleAuthIdTokenProvider.verify` rejects every
  token without calling Google.
- **Edge and error cases:** when set, the provider passes it as `audience` to `verifyIdToken`.
- **Verify by:** the `GOOGLE_WEB_CLIENT_ID` tests in `apps/backend/src/modules/auth/auth.config.spec.ts` and the
  `no client id` and `audience` tests in `google.id-token.spec.ts`
  (`npx vitest run src/modules/auth/auth.config.spec.ts src/modules/auth/google.id-token.spec.ts` from
  `apps/backend`).

### ER-08 — Continue with Google signs the person in

- **Front:** mobile
- **Behavior:** Given the sign-in screen, when the person taps "Continue with Google", picks an account and the
  backend answers 200, then the answer's user and tokens are put in the session (and the route guards open the
  account's flow — Pending for a new account). While the sign-in runs, the Google button shows its loading
  state and another tap starts nothing.
- **Edge and error cases:** on Android, `hasPlayServices()` is called before `signIn()`.
- **Verify by:** `npx jest src/modules/auth/components/auth` and `npx jest src/modules/auth/hooks/use-google-sign-in`
  (from `apps/mobile`): the `signs in`, `loading` and `ignores a second tap` tests.

### ER-09 — Google sign-in errors are handled

- **Front:** mobile
- **Behavior:** Given the person taps "Continue with Google", then: closing the picker (`cancelled`,
  `SIGN_IN_CANCELLED`, `IN_PROGRESS`) shows nothing and calls no API; `PLAY_SERVICES_NOT_AVAILABLE` shows
  "Google Play services is unavailable on this phone."; a `NetworkError` shows the existing no-connection
  message; an API 401 `auth.google.tokenInvalid` or `auth.google.emailNotVerified` shows its D-12 message; any
  other error shows the existing generic message. The button leaves its loading state in every case.
- **Edge and error cases:** messages appear in the app's language (en-US, es-ES, pt-BR).
- **Verify by:** `npx jest src/modules/auth/utils/google-sign-in-error.test.ts` and the error tests in
  `src/modules/auth/hooks/use-google-sign-in.hook.test.tsx` (from `apps/mobile`).

### ER-10 — "Your name" completes a sign-up whose Google name doesn't fit

- **Front:** mobile
- **Behavior:** Given `POST /auth/google` answers 422 with a `user.name.*` key, when that happens, then the app
  opens "Your name" (`/auth/google-name`) with Google's name in the field; the field shows Create account's
  error messages for a name the shared rules refuse and the button doesn't send it; with a valid name, "Continue"
  sends `{ idToken, name }` to `POST /auth/google`, shows its loading state, and on 200 puts the answer in the
  session.
- **Edge and error cases:** no Google name → empty field; 401 `auth.google.tokenInvalid` (expired token) → its
  toast and back to `/auth`; other errors → as in ER-09; the screen has `BackButton` back to sign-in.
- **Verify by:** `npx jest src/modules/auth/components/google-name src/modules/auth/screens/google-name.screen.test.tsx`
  (from `apps/mobile`).

### ER-11 — The Apple button is hidden

- **Front:** mobile
- **Behavior:** Given the sign-in screen on iOS or Android, when it renders, then "Continue with Apple" isn't
  shown, and "Continue with Google" and "Continue with email" are.
- **Edge and error cases:** none.
- **Verify by:** the `hides Apple` test (with `Platform.OS` set to `ios`) in
  `src/modules/auth/components/auth/auth.component.test.tsx`.

### ER-12 — Signing out also signs out of Google

- **Front:** mobile
- **Behavior:** Given a signed-in session, when `useSignOut` runs, then the session and the query cache are
  cleared at once (as today) and `GoogleSignin.signOut()` is called without being awaited; if it rejects,
  nothing is shown and sign-out still completes.
- **Edge and error cases:** without tokens, `GoogleSignin.signOut()` is still called and no API request is sent.
- **Verify by:** the Google tests in `src/modules/auth/hooks/use-sign-out.hook.test.tsx`.

### ER-13 — A real Google sign-in works on the iOS simulator

- **Front:** mobile
- **Behavior:** Given a development build on the iOS simulator against the local backend with
  `GOOGLE_WEB_CLIENT_ID` set, when the user taps "Continue with Google" and signs in with a Google account that
  has no account in the app, then the Pending screen shows that Google email; after "Use another email" and
  "Continue with Google" again with the same Google account, the same Pending screen shows (same account, no
  second `users` row).
- **Edge and error cases:** if Google's name is one word, "Your name" appears first.
- **Verify by:** user journey performed by the user (D-13) — the reviewer records the user's result and checks
  the `users` and `identities` rows.

## Tasks

### Auth module (`modules/auth`)

- [x] **T-01** — Add the `GoogleIdTokenProvider` port in
  `modules/auth/src/identity/provider/google-id-token.provider.ts` (D-04) and the `SignInWithGoogle` use case in
  `modules/auth/src/identity/usecase/sign-in-with-google.usecase.ts` (input `{ idToken, name? }`; dependencies
  `GoogleIdTokenProvider`, `UserRepository`, `IdentityRepository`, `StartSession`, refresh token TTL days,
  `RulesVersionProvider`; output as `VerifySignInCodeOut`) applying D-01, D-02, D-03 and D-05's 422, exported
  from the barrels. Tests in `modules/auth/test/identity/usecase/sign-in-with-google.usecase.test.ts` with a
  fake provider: `new account`, `name from the body`, `invalid name`, `links an existing account`,
  `any status`, `known identity`, `token required`, `token invalid`, `email not verified` — each asserting
  what was (not) written. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-06 · Done when:
  `npm test --workspace @rochas-surf-school/auth` passes and
  `npx turbo run lint check-types --filter=@rochas-surf-school/auth` exits 0.
  > ✅ 2026-10-12 — added the `GoogleIdTokenProvider` port and the `SignInWithGoogle` use case (D-01…D-05) with
  > a `FakeGoogleIdTokenProvider`; files: `modules/auth/src/identity/provider/google-id-token.provider.ts`,
  > `modules/auth/src/identity/provider/index.ts`, `modules/auth/src/identity/usecase/sign-in-with-google.usecase.ts`,
  > `modules/auth/src/identity/usecase/index.ts`, `modules/auth/test/mock/fake-google-id-token.provider.ts`,
  > `modules/auth/test/mock/index.ts`, `modules/auth/test/identity/usecase/sign-in-with-google.usecase.test.ts`;
  > verified: `npm test --workspace @rochas-surf-school/auth` (21 suites, 257 passed; the new use case is at 100%
  > statements/branches/functions/lines) and `npx turbo run lint check-types --filter=@rochas-surf-school/auth`
  > (exit 0); deviations: an extra test (`known identity whose account is gone`) covers the fallback when an
  > identity's user no longer exists; the skill's mandatory-reading files (`register-user…`) don't exist in the
  > repo, so `verify-sign-in-code.usecase.ts` and its test were the pattern.

### Backend (`apps/backend`)

- [ ] **T-02** — Add `google-auth-library` to `apps/backend`; implement `GoogleAuthIdTokenProvider` in
  `apps/backend/src/modules/auth/google.id-token.ts` (D-04, D-06) and register it in `auth.module.ts`; make
  `AuthConfig` read `GOOGLE_WEB_CLIENT_ID` (required in production, D-06). Tests:
  `google.id-token.spec.ts` (`OAuth2Client.verifyIdToken` mocked: maps the payload, `audience`, `rejects` on a
  library error or a payload without `sub`/`email`, `no client id`) and the `GOOGLE_WEB_CLIENT_ID` cases in
  `auth.config.spec.ts`. Skill:
  [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-04, ER-07 · Done when:
  `npx vitest run src/modules/auth/google.id-token.spec.ts src/modules/auth/auth.config.spec.ts` passes (from
  `apps/backend`).

- [ ] **T-03** — Expose `POST /auth/google` in `apps/backend/src/modules/auth/auth.controller.ts` (D-05), with
  its cases in `auth.controller.spec.ts` and requests in `auth.integration.http`; add
  `apps/backend/test/auth-google.e2e-spec.ts`, overriding `GoogleAuthIdTokenProvider` with a fake (D-13), with
  the tests `creates a pending account`, `links an email account`, `signs in a known identity`,
  `requires a token`, `refuses an invalid token`, `refuses an unverified email` and `asks for a name` (rows
  checked through Prisma, tables cleaned after each test). Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-06 · Done when:
  `npx vitest run src/modules/auth/auth.controller.spec.ts` passes and
  `npm run test:e2e --workspace apps/backend` passes against the local database.

### Mobile (`apps/mobile`)

- [ ] **T-04** — Install `@react-native-google-signin/google-signin` (`npx expo install`), add its config plugin
  with `iosUrlScheme: "com.googleusercontent.apps.983109126096-l33hhbs4p1o2842p9f5qdc1a4urlph6g"` to
  `apps/mobile/app.json`, create `apps/mobile/src/services/google-sign-in.ts` (configures the SDK once, D-08,
  with a test of the `configure` call), and mock the library in `apps/mobile/jest.setup.ts`.
  Covers: enabling · Done when: `npx jest src/services/google-sign-in` passes and
  `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` exits 0.

- [ ] **T-05** — Stop rendering the Apple button in
  `apps/mobile/src/modules/auth/components/auth/auth.component.tsx` (D-11), with the `hides Apple` test in
  `auth.component.test.tsx`.
  Covers: ER-11 · Done when: `npx jest src/modules/auth/components/auth` passes.

- [ ] **T-06** — Add the `useSignInWithGoogle` mutation on `POST /auth/google` in
  `apps/mobile/src/modules/auth/hooks/use-sign-in-with-google.hook.ts` (same response type as
  `useVerifySignInCode`), and `apps/mobile/src/modules/auth/utils/google-sign-in-error.ts` mapping the D-09
  outcomes to translation keys (or "ignore"), with the D-12 toasts in `src/i18n/messages/{en-US,es-ES,pt-BR}.ts`.
  Tests: `use-sign-in-with-google.hook.test.tsx`, `google-sign-in-error.test.ts`.
  Covers: ER-09 · Done when: both test files pass.

- [ ] **T-07** — Build "Your name": `routes.auth.googleName({ idToken, name })` in `src/constants/routes.ts`,
  route `src/app/(public)/auth/google-name.tsx`, screen `src/modules/auth/screens/google-name.screen.tsx`
  (reads the params, puts a 200 answer in the session), component and hook in
  `src/modules/auth/components/google-name/` (name field validated with the shared rules like Create account,
  `BackButton`, `ScreenIntro`, primary `Button` with loading; 401 `auth.google.tokenInvalid` → toast and
  `router.replace(routes.auth.signIn)`; other errors through `google-sign-in-error.ts`), and the D-12 copy in the
  three locales. Tests: `google-name.component.test.tsx`, `google-name.screen.test.tsx`.
  Covers: ER-10 · Done when: `npx jest src/modules/auth/components/google-name src/modules/auth/screens/google-name.screen.test.tsx`
  passes.

- [ ] **T-08** — Add `useGoogleSignIn` in `src/modules/auth/hooks/use-google-sign-in.hook.ts` (Play Services
  check on Android, `GoogleSignin.signIn()`, `useSignInWithGoogle`, session on 200, `routes.auth.googleName` on
  a 422 `user.name.*`, D-09 errors, `isLoading`, a second call ignored while one runs) and wire it to the Google
  button in `auth.component.tsx` (`onPress`, `loading`) through `auth.screen.tsx`. Tests:
  `use-google-sign-in.hook.test.tsx` and the Google cases in `auth.component.test.tsx`.
  Covers: ER-08, ER-09 · Done when: `npx jest src/modules/auth/hooks/use-google-sign-in src/modules/auth/components/auth`
  passes.

- [ ] **T-09** — Call `GoogleSignin.signOut()` (not awaited, failure ignored) in
  `src/modules/auth/hooks/use-sign-out.hook.ts` (D-10), with the Google tests in `use-sign-out.hook.test.tsx`.
  Covers: ER-12 · Done when: `npx jest src/modules/auth/hooks/use-sign-out` passes.

- [ ] **T-10** — Build the app on the iOS simulator (`npx expo prebuild --platform ios`, `npx expo run:ios`)
  against the local backend with `GOOGLE_WEB_CLIENT_ID` set, and ask the user to perform the ER-13 journey
  (D-13); record their result and the `users` / `identities` rows (queried through `psql` or Prisma Studio) in
  the evidence. No code changes unless the journey fails.
  Covers: ER-13 · Done when: the user reports the journey passed and the database shows one `users` row and one
  `google` identity for that Google account.

### Verification

- [ ] **T-11** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence.
  Covers: all · Done when: `run-related-tests.mjs 017` passes, `check-coverage.mjs 017` prints
  `COVERAGE OK`, `run-e2e.mjs 017` prints `E2E PASSED`, and the lint, type check and build commands exit 0.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 017` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 017` — every line this spec adds or changes is covered
  - `node .specs/scripts/run-e2e.mjs 017` — the backend e2e suite passes, `auth-google.e2e-spec.ts` included
    (Postgres up, migrations applied)
  - `npx turbo run lint check-types --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — exit 0
  - `npx turbo run build --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/backend` — exit 0
- User journeys (e2e, followed in a simulator):
  - ER-13 on the iOS simulator, performed by the user (D-13): new Google account → Pending with its email; "Use
    another email", then Google again with the same account → the same Pending screen, one `users` row and one
    `google` identity for it.

## Memory Impact

- `memory/product.md` — Current state: Google sign-in exists (sign in, link by email, new pending student,
  "Your name" when Google's name doesn't fit); Apple still to come and its button hidden.
- `memory/technical-context.md` — Authentication: `POST /auth/google`, `GoogleIdTokenProvider` /
  `GoogleAuthIdTokenProvider` (`google-auth-library`), `GOOGLE_WEB_CLIENT_ID` (required in production), the
  mobile env variables and `src/services/google-sign-in.ts`, sign-out also signing out of Google; External
  integrations: Google sign-in; Applications (mobile): the library is now in use, configured by its config
  plugin.
- `memory/structure.md` — the `/auth/google-name` route and the new auth files (provider, use case, hooks,
  screen).
- `memory/modules/auth.md` — Identities: the Google sign-in rules (D-01 order, unverified emails refused, the
  name rule for new Google accounts, email never changed); Who can do what: signing in with Google; In the app:
  the Google button, "Your name", Apple hidden, sign-out signing out of Google; Spec history: 017.

## Assumptions

- The native library's ID token names the **web** client id as its audience on both iOS and Android when
  `webClientId` is configured (D-04); if the iOS token named the iOS client id instead, the provider would
  accept both ids, recorded as a deviation.
- The Android debug SHA-1 registered in Google Cloud matches `apps/mobile/android/app/debug.keystore`;
  regenerating `android/` may change it (outside this spec's checks, since Android isn't verified here).

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
