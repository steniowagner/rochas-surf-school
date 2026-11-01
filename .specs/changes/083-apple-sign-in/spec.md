---
id: "083"
slug: apple-sign-in
title: Sign in with Apple on iOS
status: in-progress
created: 2026-11-01
started: 2026-11-01
base_commit: 37a8bbaf2f834d5575d2f06f1daf534f52312f82
fronts: [auth, backend, packages, web, mobile, infra]
depends_on: []
---

# 083 — Sign in with Apple on iOS

## Goal

On iOS, "Continue with Apple" on the sign-in screen signs a person in, or signs them up, through Apple's native sheet.
The backend verifies Apple's identity token and opens the one account for that person: by the Apple identity, else by
the email (linking an Apple identity to it), else as a new pending student. The app gets the same session as any other
sign-in, so the existing flow routing takes over, and asks for a name when Apple gives none or one that doesn't fit the
rules. Android doesn't offer it. This is the last sign-in method the requirements ask for, and the App Store requires it
because the app offers Google.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: **User** (one account per email, email fixed
  forever, `pending` until an admin decides), **Identity** (Google, Apple on iOS only, or an email code), and the
  decision "One account per email address, and the email never changes".
- Requirements:
  [requirements.md → Sign-in methods](../../../.docs/requirements.md#sign-in-methods) — Sign in with Apple is offered on
  iOS and not on Android, and a first sign-in creates an account;
  [requirements.md → One account per email address](../../../.docs/requirements.md#one-account-per-email-address) — any
  method with the same address opens the same account (D-02 records the exception);
  [requirements.md → Name before approval](../../../.docs/requirements.md#name-before-approval) — the name shared by
  Apple is used when it fits the rules, and the person is asked for one otherwise.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Applications (Sign-in:
  `expo-apple-authentication` is the chosen library), Authentication, Google sign-in, Deployment → Mobile builds,
  Automated validation.
- Module: [modules/auth.md](../../memory/modules/auth.md) — Identities, Sessions, "Any status gets a session".
- Spec 017 built Google sign-in, which this spec mirrors. Read its Decisions before starting.
- Existing code this builds on:
  - `modules/auth/src/identity/usecase/sign-in-with-google.usecase.ts` — the flow to mirror; its lookup moves to a shared
    class (D-07).
  - `modules/auth/src/identity/model/identity.entity.ts` and `apps/backend/prisma/models/auth.model.prisma` — the
    `apple` provider already exists in the entity and the `identity_provider` enum, so this spec has no migration.
  - `apps/backend/src/modules/auth/google.id-token.ts`, `auth.config.ts` and `auth.controller.ts` — the provider, the
    configuration and the route to mirror.
  - `apps/backend/test/auth-google.e2e-spec.ts` — the e2e suite to mirror.
  - `apps/mobile/src/modules/auth/hooks/use-google-sign-in.hook.ts`, `use-sign-in-with-google.hook.ts` and
    `utils/google-sign-in-error.ts` — the app's flow to mirror.
  - `apps/mobile/src/modules/auth/components/google-name/`, `screens/google-name.screen.tsx`,
    `src/app/(public)/auth/google-name.tsx` and `routes.auth.googleName` — "Your name", generalized here (D-08).
  - `apps/mobile/src/modules/auth/components/auth/auth.component.tsx` — the sign-in screen; spec 017 removed the Apple
    button from it.
  - `packages/app-messages/src/*.ts` — `auth.continueWithApple` already exists in the three languages.
  - `apps/web/src/modules/designs/screens/auth/sign-in-screen/`, `components/auth-flow-sign-in/` and
    `data/auth-flow-ids.ts` — the sign-in design; `apps/web/e2e/designs.e2e.ts` and the mock's test assert today that no
    "Apple" appears.
  - `apps/web/src/modules/user-journeys/` — the auth user journeys, `AU-01` to `AU-19`.
- Apple's side is in [apple-setup.md](apple-setup.md), a step-by-step guide for the user (T-12). The staging server reads
  every parameter under its path at each deploy, so `deploy-staging.yml` doesn't change.

## Scope

### In scope

- `POST /auth/apple`: verify an Apple identity token and sign in to, link or create the account.
- The `AppleIdTokenProvider` port and its `jose` implementation; `APPLE_CLIENT_ID` in `AuthConfig`.
- The iOS button, its flow and its errors in the app.
- "Your name" serving both Google and Apple.
- The auth flow design and the auth user journeys.
- The Apple Developer portal setup, guided for the user.
- The staging parameter and deploy, and a real sign-in on a TestFlight build.

### Out of scope

- Revoking Apple tokens when an account is deleted or erased: the `.p8` key, the stored refresh token and `/auth/revoke`.
  It is a follow-up spec, required before App Store submission (D-13).
- Merging a real-email account with a relay-address account.
- Sending email to relay addresses, which would need the domain registered with Apple.
- Apple's server-to-server notifications, and checking whether a person stopped using Apple with the app.
- A `nonce` on the Apple request.
- Sign in with Apple on Android or on the web.
- Any change to Google's behavior or to the email-code flow.
- App Store submission.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | `SignInWithApple` checks in this order: a missing, empty or non-string `idToken` → 422 `idToken.token.required`; a rejected token → 401 `auth.apple.tokenInvalid`; a token with an email that isn't verified → 401 `auth.apple.emailNotVerified`; the `apple` identity with the token's `sub` opens its account; no email → 401 `auth.apple.emailMissing`; the account with the normalized email gets an `apple` identity (`providerUserId` = `sub`, `email` = the token's email); else a new `pending` `student` with an `apple` identity. The account's email is never changed. | Mirrors spec 017's D-01, with the identity before the email check because a token may carry no email and a known identity needs none. |
| D-02 | Hide My Email is allowed: the relay address (`…@privaterelay.appleid.com`) is an ordinary verified email and becomes the account's fixed email. It matches no account with a real address, so the same person can hold two accounts. This is a deliberate exception to the requirement "One account per email address", which holds address by address but not person by person. | A relay address can't be traced to the real one, and refusing it would likely fail App Review, since hiding the email is part of what Sign in with Apple offers. Decided with the user. |
| D-03 | A new person whose token has no email is refused with 401 `auth.apple.emailMissing` and nothing is written. | The account's email is required and never changes, so it can't be left empty or asked for. |
| D-04 | The token is verified behind an `AppleIdTokenProvider` port in `modules/auth` (`verify(idToken)` → `{ sub, email?, emailVerified }`, or a rejection for any invalid token), implemented in the backend by `AppleAuthIdTokenProvider` (`apple.id-token.ts`) with `jose`: `createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"))` and `jwtVerify(idToken, keys, { issuer: "https://appleid.apple.com", audience: APPLE_CLIENT_ID, algorithms: ["RS256"] })`. `emailVerified` is true for `true` or `"true"`, because the claim's type isn't reliable. A payload without `sub` is rejected. Apple's keys failing to load counts as a rejection, so the person gets `auth.apple.tokenInvalid`. | Ports and adapters, like Google. `jose` caches the keys and refetches on an unknown key. Verifying needs no Apple secret. |
| D-05 | `POST /auth/apple` is `@Public()`, throttled like `/auth/google` (`ThrottlerGuard`, 10 requests per 60 s), takes `{ idToken: string, name?: string }` and answers 200 with the `POST /auth/google` answer. It isn't limited by platform. | The app routes from that answer unchanged; the iOS-only rule belongs to the button. |
| D-06 | A new account's name is the body `name`, else none: Apple's token carries no name. The app sends Apple's `fullName` as given and family names joined with a space, and leaves `name` out when both are empty. A `name` sent for an existing account is ignored. A name that fails `User.validate()` answers 422 `user.name.*`, nothing is created, and the app opens "Your name". | Apple gives the name to the app only at the first authorization. So a lost first attempt, or an erased account signing up again, reaches "Your name" with an empty field, which is what the requirement asks for when no name is shared. |
| D-07 | The lookup of `SignInWithGoogle` moves to a `ProviderAccountResolver` class (`findByIdentity(provider, sub)` and `linkOrCreate({ provider, sub, email, bodyName, providerName })`), built inside both use cases, so `SignInWithGoogle`'s constructor and its tests don't change. | Two copies of the rule "one account per email" would drift. |
| D-08 | "Your name" becomes one screen for both providers: `routes.auth.providerName({ provider, idToken, name })`, route `/auth/provider-name`, `ProviderNameScreen`, `components/provider-name/`, `useProviderName`, with `provider` `"google"` or `"apple"` choosing the mutation and the error mapping. The `googleName.*` message keys and the web mock `google-name-screen` keep their names. | The copy is provider-neutral, so a second screen would be a copy. Renaming the keys would touch the web mocks with no change anyone sees. |
| D-09 | The button is `AuthButton` `variant="light"`, label `auth.continueWithApple`, icon Ionicons `logo-apple` in the `ink` color, above Google, rendered only when `Platform.OS === "ios"`. | It's the layout spec 017 removed. Apple's native button would follow the phone's language, not the app's language picker. |
| D-10 | App errors: `ERR_REQUEST_CANCELED` → nothing happens; `NetworkError` → the existing no-connection toast; API 401 `auth.apple.tokenInvalid`, `auth.apple.emailNotVerified` or `auth.apple.emailMissing` → their toasts; a credential without `identityToken` or any other error → the existing generic toast. On "Your name", a 401 `auth.apple.tokenInvalid` shows its toast and goes back to `/auth`. | Same rule as spec 017's D-09: closing the sheet is a choice, every other outcome gets one message. |
| D-11 | Copy (en / pt-BR / es), under `appleSignIn`. `tokenInvalid`: "We couldn't sign you in with Apple. Try again." / "Não conseguimos entrar com a Apple. Tente novamente." / "No pudimos iniciar sesión con Apple. Inténtalo de nuevo."; `emailNotVerified`: "Your Apple email isn't verified. Use another sign-in method." / "Seu e-mail da Apple não está verificado. Use outra forma de entrar." / "Tu correo de Apple no está verificado. Usa otro método para iniciar sesión."; `emailMissing`: "Apple didn't share your email. Use another sign-in method." / "A Apple não compartilhou seu e-mail. Use outra forma de entrar." / "Apple no compartió tu correo. Usa otro método para iniciar sesión." | Follows the Google toasts. |
| D-12 | Sign-out adds nothing for Apple, and no `nonce` is used. | Apple keeps no session in the app to end. A `nonce` made on the phone proves nothing to the backend, and spec 017 uses none. |
| D-13 | Token revocation goes to a follow-up spec, which blocks App Store submission but not TestFlight. | It needs a `.p8` key, a generated client secret, an encrypted stored token, a migration and steps in the deletion and erasure paths, so it is a spec of its own. A later Apple sign-in gives a new authorization code, so waiting loses nothing. Decided with the user. |
| D-14 | Tests never call Apple: the backend e2e suite overrides `AppleAuthIdTokenProvider` with a fake, `apple.id-token.spec.ts` signs tokens with a local key behind a mocked `createRemoteJWKSet`, and mobile tests mock `expo-apple-authentication` in `jest.setup.ts`. The real round trip is one journey on a TestFlight build, performed by the user (ER-17). | Real Apple tokens can't be made in tests, Sign in with Apple is unreliable on the simulator, and the reviewer can't sign in to an Apple account. |
| D-15 | The user does every step at Apple in their own account, following [apple-setup.md](apple-setup.md): the executor guides them one step at a time and never asks for a password. This spec creates no Apple key or secret, and none goes in the repo or a chat. | The user hasn't used the portal before, and the repo is public. |
| D-16 | `AuthConfig` reads `APPLE_CLIENT_ID`, whose value is the bundle id `com.rochassurfschool.app`: when `NODE_ENV` is `production` and it is unset or empty, the backend refuses to start; elsewhere it may be unset, and then every Apple token is refused without fetching Apple's keys. | Same pattern as `GOOGLE_WEB_CLIENT_ID`. It isn't secret, and a native token names the bundle id as its audience. |
| D-17 | The spec's backend reaches staging with `git push --force origin HEAD:deploy/staging` from the spec branch, after `/rochas/staging/APPLE_CLIENT_ID` exists and with the user's go-ahead at that moment. The spec branch itself isn't pushed. | A TestFlight build talks to staging, so it can't be proven from a local backend. That `deploy/staging` ref is the documented way to deploy a commit, and the spec's branch still reaches GitHub only at `spec-finish`. |

## Expected Results

### ER-01 — A new Apple user gets a pending account with the name the app sends

- **Front:** backend
- **Behavior:** Given no account and no identity for the token's email and `sub`, when the app calls `POST /auth/apple`
  with `{ idToken, name: "Maria Silva" }`, then the API answers 200 with a session and `user` whose `name` is
  "Maria Silva", `email` the token's email (normalized), `role` `"student"` and `status` `"pending"`; the database has
  one new `users` row and one `identities` row with `provider = 'apple'` and `provider_user_id` = the token's `sub`;
  approved admins are told of the new registration.
- **Edge and error cases:** an email with upper case is stored lower case; surrounding spaces in the name are trimmed.
- **Verify by:** `npx jest test/identity/usecase/sign-in-with-apple.usecase.test.ts -t "new account"` (from
  `modules/auth`) and the e2e test `creates a pending account` in `apps/backend/test/auth-apple.e2e-spec.ts`.

### ER-02 — An existing account with the same email is linked, not duplicated

- **Front:** backend
- **Behavior:** Given an account for `ana@example.com` with no `apple` identity, when the app calls `POST /auth/apple`
  with a verified token for `Ana@Example.com`, then the API answers 200 with that account's `id`, and an `apple` identity
  with the token's `sub` is added to it; the number of `users` rows is unchanged.
- **Edge and error cases:** a `pending`, `approved`, `denied`, `deleted` or `removed` account gets a session and its own
  `status`; a body `name` is ignored and the account's name is unchanged.
- **Verify by:** the `links an existing account` and `any status` tests in `sign-in-with-apple.usecase.test.ts`, and the
  e2e test `links an email account` in `auth-apple.e2e-spec.ts`.

### ER-03 — A known Apple identity opens its account

- **Front:** backend
- **Behavior:** Given an account whose `apple` identity has `sub` S and whose email is `old@example.com`, when the app
  calls `POST /auth/apple` with a token with `sub` S and no email, or with a verified `new@example.com`, then the API
  answers 200 with that account, whose `email` is still `old@example.com`; no user and no identity is created.
- **Edge and error cases:** an identity whose account no longer exists is treated as no identity (the lookup continues
  by email, as in ER-02, ER-01 or ER-06).
- **Verify by:** the `known identity` tests in `sign-in-with-apple.usecase.test.ts` and the e2e test
  `signs in a known identity` in `auth-apple.e2e-spec.ts`.

### ER-04 — A missing or invalid token is refused

- **Front:** backend
- **Behavior:** Given any database state, when the app calls `POST /auth/apple` with no body, or an empty or non-string
  `idToken`, then the API answers 422 `errors: ["idToken.token.required"]`; with a token the provider rejects, it answers
  401 `errors: ["auth.apple.tokenInvalid"]`. In both cases no user, identity or refresh token is written.
- **Edge and error cases:** the 422 is answered without calling the provider.
- **Verify by:** the `token required` and `token invalid` tests in `sign-in-with-apple.usecase.test.ts`, and the e2e
  tests `requires a token` and `refuses an invalid token` in `auth-apple.e2e-spec.ts`.

### ER-05 — An email Apple hasn't verified is refused

- **Front:** backend
- **Behavior:** Given a token with an email whose `emailVerified` is false, when the app calls `POST /auth/apple`, then
  the API answers 401 `errors: ["auth.apple.emailNotVerified"]` and nothing is written, even when an account with that
  email, or an `apple` identity with that `sub`, exists.
- **Edge and error cases:** a token with no email isn't refused here (ER-03, ER-06).
- **Verify by:** the `email not verified` test in `sign-in-with-apple.usecase.test.ts` and the e2e test
  `refuses an unverified email` in `auth-apple.e2e-spec.ts`.

### ER-06 — A new person with no email is refused

- **Front:** backend
- **Behavior:** Given no `apple` identity for the token's `sub`, when the app calls `POST /auth/apple` with a token that
  has no email, then the API answers 401 `errors: ["auth.apple.emailMissing"]` and writes no user, identity or refresh
  token.
- **Edge and error cases:** a body `name` changes nothing.
- **Verify by:** the `email missing` test in `sign-in-with-apple.usecase.test.ts` and the e2e test
  `refuses a token without an email` in `auth-apple.e2e-spec.ts`.

### ER-07 — A new account needs a valid name

- **Front:** backend
- **Behavior:** Given no account for the token, when no body `name` is sent, or it fails the name rules (for example
  "Maria", or longer than 80 characters), then the API answers 422 with the `user.name.*` key(s) and creates no user,
  identity or refresh token; when the same token is sent again with `name: "Maria Souza"`, the account is created with
  that name.
- **Edge and error cases:** surrounding spaces are trimmed before validation.
- **Verify by:** the `invalid name` test in `sign-in-with-apple.usecase.test.ts` and the e2e test `asks for a name` in
  `auth-apple.e2e-spec.ts`.

### ER-08 — A relay address is an ordinary email

- **Front:** backend
- **Behavior:** Given an account for `ana@example.com`, when a new person calls `POST /auth/apple` with a verified token
  for `x1y2z3@privaterelay.appleid.com` and a valid `name`, then a new pending student is created with that address as
  its `email`, and the `ana@example.com` account is unchanged.
- **Edge and error cases:** a second sign-in with the same `sub` opens that same account (ER-03).
- **Verify by:** the `relay address` test in `sign-in-with-apple.usecase.test.ts` and the e2e test
  `accepts a relay address` in `auth-apple.e2e-spec.ts`.

### ER-09 — Only a real Apple token for this app passes

- **Front:** backend
- **Behavior:** Given a token signed with a key from Apple's key set, with issuer `https://appleid.apple.com`, audience
  equal to `APPLE_CLIENT_ID` and not expired, when `AppleAuthIdTokenProvider.verify` runs, then it answers
  `{ sub, email, emailVerified }`, with `emailVerified` true for both `true` and `"true"`. A token with another issuer,
  another audience, an expired date, another signing key, an algorithm other than RS256 or no `sub`, a malformed token,
  or keys that fail to load make it reject.
- **Edge and error cases:** a token with no email answers `email` undefined and `emailVerified` false.
- **Verify by:** `npx vitest run src/modules/auth/apple.id-token.spec.ts` (from `apps/backend`): the `maps the payload`,
  `string email_verified`, `no email` and `rejects` tests.

### ER-10 — The backend's Apple client id is required in production only

- **Front:** backend
- **Behavior:** Given `NODE_ENV=production` and `APPLE_CLIENT_ID` unset or empty, when `AuthConfig` is built, then it
  throws `APPLE_CLIENT_ID is not configured`, so the backend doesn't start. Given another `NODE_ENV` and no
  `APPLE_CLIENT_ID`, it builds, and `AppleAuthIdTokenProvider.verify` rejects every token without loading Apple's keys.
- **Edge and error cases:** a set value is trimmed and passed as the audience.
- **Verify by:** the `APPLE_CLIENT_ID` tests in `apps/backend/src/modules/auth/auth.config.spec.ts` and the `no client id`
  test in `apple.id-token.spec.ts`.

### ER-11 — The Apple button is offered on iOS only

- **Front:** mobile
- **Behavior:** Given the sign-in screen, when it renders on iOS, then "Continue with Apple" shows above "Continue with
  Google", which shows above "Continue with email"; on Android, "Continue with Apple" isn't shown and the other two are.
- **Edge and error cases:** the label follows the app's language (en-US, es-ES, pt-BR).
- **Verify by:** the `shows Apple on iOS` and `hides Apple on Android` tests in
  `src/modules/auth/components/auth/auth.component.test.tsx` (`npx jest src/modules/auth/components/auth` from
  `apps/mobile`).

### ER-12 — Continue with Apple signs the person in

- **Front:** mobile
- **Behavior:** Given the sign-in screen on iOS, when the person taps "Continue with Apple", confirms in Apple's sheet and
  the backend answers 200, then the app has sent `{ idToken, name }` to `POST /auth/apple` (given and family names joined,
  `name` left out when both are empty) and the answer's user and tokens are put in the session. While it runs, the Apple
  button shows its loading state and another tap starts nothing.
- **Edge and error cases:** the app asks Apple for both the full name and the email.
- **Verify by:** `npx jest src/modules/auth/hooks/use-apple-sign-in src/modules/auth/components/auth` (from `apps/mobile`):
  the `signs in`, `leaves out an empty name`, `loading` and `ignores a second tap` tests.

### ER-13 — Apple sign-in errors are handled

- **Front:** mobile
- **Behavior:** Given the person taps "Continue with Apple", then: closing the sheet (`ERR_REQUEST_CANCELED`) shows
  nothing and calls no API; a `NetworkError` shows the existing no-connection message; an API 401
  `auth.apple.tokenInvalid`, `auth.apple.emailNotVerified` or `auth.apple.emailMissing` shows its D-11 message; a
  credential without `identityToken`, or any other error, shows the existing generic message. The button leaves its
  loading state in every case.
- **Edge and error cases:** messages appear in the app's language.
- **Verify by:** `npx jest src/modules/auth/utils/apple-sign-in-error.test.ts` and the error tests in
  `src/modules/auth/hooks/use-apple-sign-in.hook.test.tsx` (from `apps/mobile`).

### ER-14 — "Your name" completes an Apple sign-up

- **Front:** mobile
- **Behavior:** Given `POST /auth/apple` answers 422 with a `user.name.*` key, when that happens, then the app opens
  `/auth/provider-name` with Apple's joined name in the field, or an empty field when Apple gave none; a valid name and
  "Continue" send `{ idToken, name }` to `POST /auth/apple`, and a 200 puts the answer in the session.
- **Edge and error cases:** 401 `auth.apple.tokenInvalid` shows its toast and goes back to `/auth`; other errors follow
  ER-13. With `provider: "google"` the screen behaves as spec 017's ER-10 says, sending to `POST /auth/google`.
- **Verify by:** `npx jest src/modules/auth/components/provider-name src/modules/auth/screens/provider-name.screen.test.tsx`
  (from `apps/mobile`), and the `opens "Your name"` test in `use-apple-sign-in.hook.test.tsx`.

### ER-15 — The auth flow design shows the Apple button

- **Front:** web
- **Behavior:** Given `/{lang}/designs/auth-flow`, when it opens in pt-br, es or en, then the sign-in frames show the
  Apple button above Google with the app's copy for that language, and the new frames `AF-01-06` (Apple loading) and
  `AF-01-07` (Apple error) exist; the page has 51 entries.
- **Edge and error cases:** `AF-01-01`'s note says the button is iOS only; `.docs/designs/auth-flow.html` matches its
  regenerated sources.
- **Verify by:** the test `auth flow shows the Apple button` and `auth flow shows every inventory entry` in
  `apps/web/e2e/designs.e2e.ts`, and `node .docs/designs/scripts/pack.mjs --check`.

### ER-16 — The auth user journeys list the Apple cases

- **Front:** web
- **Behavior:** Given `/{lang}/user-journeys/auth`, when it opens in pt-br, es or en, then it has 21 rows, among them
  `AU-20` (sign up with Apple) and `AU-21` (close Apple's sheet), each saying it needs an iPhone and linking its design
  frames.
- **Edge and error cases:** quoted labels are the app's strings in that language.
- **Verify by:** `npm run test:e2e --workspace @rochas-surf-school/web -- e2e/user-journeys.e2e.ts`, whose `caseCounts`
  holds `auth: 21`, with the test `auth journeys list the Apple cases`.

### ER-17 — A real Apple sign-in works on a TestFlight build

- **Front:** mobile
- **Behavior:** Given a TestFlight build against staging, when the user signs up with "Continue with Apple" choosing Hide
  My Email, then the Pending screen shows the relay address; after "Use another email" and "Continue with Apple" again,
  the same Pending screen shows with no name asked and no second account. After removing that test row from staging and
  choosing Stop Using in iOS Settings, "Continue with Apple" sharing the real email opens Pending with that email.
- **Edge and error cases:** when an account for that real email already exists on staging, the last step opens it and
  adds an `apple` identity to it instead (ER-02). The Android build isn't touched.
- **Verify by:** user journey performed by the user (D-14), following T-14; the reviewer records the user's result and
  the `users` and `identities` rows the evidence reports, with no email address (the repo is public).

## Tasks

### Auth module (`modules/auth`)

- [x] **T-01** — Move the lookup of `SignInWithGoogle` to `ProviderAccountResolver` in
  `modules/auth/src/identity/usecase/provider-account-resolver.ts` (D-07), with its tests in
  `modules/auth/test/identity/usecase/provider-account-resolver.test.ts`. The tests of `sign-in-with-google.usecase.test.ts`
  stay as they are. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: enabling · Done when: `npm test --workspace @rochas-surf-school/auth` passes with
  `sign-in-with-google.usecase.test.ts` unchanged.
  > ✅ 2026-11-01 12:16 — moved the lookup of `SignInWithGoogle` to `ProviderAccountResolver` (`findByIdentity`,
  > `linkOrCreate`), built inside the use case so its constructor signature is unchanged; the class stays out of the
  > public barrel, its test imports it by path; files:
  > `modules/auth/src/identity/usecase/provider-account-resolver.ts`,
  > `modules/auth/src/identity/usecase/sign-in-with-google.usecase.ts`,
  > `modules/auth/test/identity/usecase/provider-account-resolver.test.ts`; verified: `npm test --workspace
  > @rochas-surf-school/auth` (39 suites, 553 passed) with `sign-in-with-google.usecase.test.ts` unchanged, lint and
  > check-types exit 0; deviations: none

- [ ] **T-02** — Add the `AppleIdTokenProvider` port in `modules/auth/src/identity/provider/apple-id-token.provider.ts`
  (D-04), the `SignInWithApple` use case in `modules/auth/src/identity/usecase/sign-in-with-apple.usecase.ts` (input
  `{ idToken, name? }`; output as `SignInWithGoogleOut`; D-01, D-02, D-03, D-06), the barrels, and
  `FakeAppleIdTokenProvider` in `modules/auth/test/mock/`. Tests in
  `modules/auth/test/identity/usecase/sign-in-with-apple.usecase.test.ts`: `new account`, `links an existing account`,
  `any status`, `known identity`, `token required`, `token invalid`, `email not verified`, `email missing`, `invalid name`,
  `relay address`, each asserting what was or wasn't written. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-06, ER-07, ER-08 · Done when:
  `npm test --workspace @rochas-surf-school/auth` passes and
  `npx turbo run lint check-types --filter=@rochas-surf-school/auth` exits 0.

### Backend (`apps/backend`)

- [ ] **T-03** — Add `jose` to `apps/backend`; implement `AppleAuthIdTokenProvider` in
  `apps/backend/src/modules/auth/apple.id-token.ts` (D-04, D-16) and register it in `auth.module.ts`; make `AuthConfig`
  read `APPLE_CLIENT_ID` (required in production); add it to `apps/backend/.env.example`. Tests:
  `apple.id-token.spec.ts` (`maps the payload`, `string email_verified`, `no email`, `rejects`, `no client id`, D-14) and
  the `APPLE_CLIENT_ID` cases in `auth.config.spec.ts`. Skill:
  [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-04, ER-09, ER-10 · Done when:
  `npx vitest run src/modules/auth/apple.id-token.spec.ts src/modules/auth/auth.config.spec.ts` passes (from
  `apps/backend`).

- [ ] **T-04** — Expose `POST /auth/apple` in `apps/backend/src/modules/auth/auth.controller.ts` (D-05), with its cases in
  `auth.controller.spec.ts` and requests in `auth.integration.http`; add `apps/backend/test/auth-apple.e2e-spec.ts`,
  overriding `AppleAuthIdTokenProvider` with a fake (D-14), with the tests `creates a pending account`,
  `links an email account`, `signs in a known identity`, `requires a token`, `refuses an invalid token`,
  `refuses an unverified email`, `refuses a token without an email`, `asks for a name` and `accepts a relay address` (rows
  checked through Prisma, tables cleaned after each test). Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-06, ER-07, ER-08 · Done when:
  `npx vitest run src/modules/auth/auth.controller.spec.ts` passes and `npm run test:e2e --workspace apps/backend` passes
  against the local database.

### Packages (`packages/app-messages`)

- [ ] **T-05** — Add the `appleSignIn` messages of D-11 to `packages/app-messages/src/{en-US,es-ES,pt-BR}.ts`.
  Covers: ER-13 · Done when: `npm test --workspace @rochas-surf-school/app-messages` passes and
  `npx turbo run check-types --filter=@rochas-surf-school/app-messages` exits 0.

### Web (`apps/web`, `.docs/designs`)

- [ ] **T-06** — Add the Apple button to the design mock `sign-in-screen` above Google, with an `appleLoading` prop and
  `Ionicons:logo-apple` in `app-icon.constants.ts`; add the frames `AF-01-06` and `AF-01-07` (toast
  `appleSignIn.tokenInvalid`) to `auth-flow-sign-in`, `data/auth-flow-ids.ts` (with `authFlowOtherMessages`) and the
  dictionaries `apps/web/src/i18n/dictionaries/{en,pt-br,es}.ts`, and say in `AF-01-01`'s note that the button is iOS only.
  Replace the "no Apple" checks in `sign-in-screen.component.test.tsx` and `e2e/designs.e2e.ts` with the test
  `auth flow shows the Apple button`. Then regenerate the design: build the web, serve it with `next start -p 3100` and
  run `node .docs/designs/scripts/build-design.mjs auth-flow`.
  Covers: ER-15 · Done when: `npm test --workspace @rochas-surf-school/web` passes,
  `npm run test:e2e --workspace @rochas-surf-school/web -- e2e/designs.e2e.ts` passes and
  `node .docs/designs/scripts/pack.mjs --check` exits 0.

- [ ] **T-07** — Add the rows `AU-20` (`designIds: ["AF-01-06", "AF-02-15", "AF-03-01"]`) and `AU-21`
  (`designIds: ["AF-01-01"]`) to the `signIn` group in `apps/web/src/modules/user-journeys/data/user-journey-flows.ts`,
  their texts in `i18n/{en,pt-br,es}.ts`, each saying an iPhone is needed, and in `e2e/user-journeys.e2e.ts` `caseCounts`
  `auth: 21` and the test `auth journeys list the Apple cases`.
  Covers: ER-16 · Done when: `npm run test:e2e --workspace @rochas-surf-school/web -- e2e/user-journeys.e2e.ts` passes.

### Mobile (`apps/mobile`)

- [ ] **T-08** — Install `expo-apple-authentication` (`npx expo install`), set `ios.usesAppleSignIn: true` in
  `apps/mobile/app.json`, keeping the plugin entry when the install adds one, create
  `apps/mobile/src/services/apple-sign-in.ts` as the only import point of the library, with its test, and mock the library
  in `apps/mobile/jest.setup.ts`.
  Covers: enabling · Done when: `npx jest src/services/apple-sign-in` passes and
  `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` exits 0.

- [ ] **T-09** — Add the `useSignInWithApple` mutation on `POST /auth/apple` in
  `apps/mobile/src/modules/auth/hooks/use-sign-in-with-apple.hook.ts`, and
  `apps/mobile/src/modules/auth/utils/apple-sign-in-error.ts` mapping the D-10 outcomes to translation keys or "ignore".
  Tests: `use-sign-in-with-apple.hook.test.tsx`, `apple-sign-in-error.test.ts`.
  Covers: ER-13 · Done when: both test files pass.

- [ ] **T-10** — Generalize "Your name" (D-08): `routes.auth.providerName` in `src/constants/routes.ts`, route
  `src/app/(public)/auth/provider-name.tsx` replacing `google-name.tsx`, `src/modules/auth/screens/provider-name.screen.tsx`,
  and `src/modules/auth/components/provider-name/` with `useProviderName` choosing the mutation and error mapping by
  `provider`. `use-google-sign-in.hook.ts` opens it with `provider: "google"`. Tests move with the files and gain the Apple
  cases: `provider-name.component.test.tsx`, `provider-name.screen.test.tsx`.
  Covers: ER-14 · Done when:
  `npx jest src/modules/auth/components/provider-name src/modules/auth/screens/provider-name.screen.test.tsx src/modules/auth/hooks/use-google-sign-in`
  passes.

- [ ] **T-11** — Add `useAppleSignIn` in `src/modules/auth/hooks/use-apple-sign-in.hook.ts` (requests the full name and
  the email, joins the name, `useSignInWithApple`, session on 200, `routes.auth.providerName` on a 422 `user.name.*`, D-10
  errors, `isLoading`, a second call ignored while one runs), and wire it through `auth.screen.tsx` to the button of D-09 in
  `auth.component.tsx`, removing the spec 017 comment. Tests: `use-apple-sign-in.hook.test.tsx` and, in
  `auth.component.test.tsx`, `shows Apple on iOS` and `hides Apple on Android` in place of `hides Apple`.
  Covers: ER-11, ER-12, ER-13, ER-14 · Done when:
  `npx jest src/modules/auth/hooks/use-apple-sign-in src/modules/auth/components/auth src/modules/auth/screens/auth.screen.test.tsx`
  passes.

### Infra (Apple Developer portal)

- [ ] **T-12** — Walk the user through steps 1–4 of [apple-setup.md](apple-setup.md), one step at a time, stopping for
  their confirmation after each (D-15). They do every step in their own account.
  Covers: enabling · Done when: the user confirms Sign In with Apple shows as enabled on `com.rochassurfschool.app` after
  reloading the page.

### Infra (staging)

- [ ] **T-13** — Add `APPLE_CLIENT_ID` to the parameter table of `.docs/staging.md`. Ask the user to create
  `/rochas/staging/APPLE_CLIENT_ID` with the value `com.rochassurfschool.app`, as `.docs/staging.md` describes, before any
  deploy, since production mode refuses to start without it (D-16). With their go-ahead, deploy the branch's commit as D-17
  says, and wait for the workflow to pass.
  Covers: enabling · Done when: the deploy finishes, `GET https://api-staging.rochassurfschool.com/health` answers 200, and
  `POST https://api-staging.rochassurfschool.com/auth/apple` with `{ "idToken": "x" }` answers 401
  `auth.apple.tokenInvalid`.

### Mobile (`apps/mobile`, TestFlight)

- [ ] **T-14** — Build and send a TestFlight build with the `testflight` profile (`eas build`, `eas submit`, step 5 of
  [apple-setup.md](apple-setup.md)), then ask the user to perform the ER-17 journey on their iPhone:
  1. "Continue with Apple", choosing Hide My Email: Pending shows the relay address.
  2. "Use another email", then "Continue with Apple" again: the same Pending screen, with no name asked.
  3. In Supabase's SQL editor on staging, delete that test row:
     `delete from users where email like '%@privaterelay.appleid.com'`, which removes its identity too.
  4. In iOS Settings, choose Stop Using for the app (see apple-setup.md), then "Continue with Apple" sharing the real
     email: Pending shows that email, or the existing account opens when one exists on staging.

  Record their result and the row counts in the evidence, with no email address.
  Covers: ER-17 · Done when: the user reports the journey passed and staging shows one `users` row and one `apple`
  identity after step 2, and an `apple` identity on the real-email account after step 4.

### Verification

- [ ] **T-15** — Run every command in the Verification Plan from the repo root; all pass. Record the output summary as
  evidence.
  Covers: all · Done when: `run-related-tests.mjs 083` passes, `check-coverage.mjs 083` prints `COVERAGE OK`,
  `run-e2e.mjs 083` prints `E2E PASSED`, and the lint, type check, build and design commands exit 0.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 083` — the tests this spec added or changed, and the existing tests related
    to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 083` — every line this spec adds or changes is covered
  - `node .specs/scripts/run-e2e.mjs 083` — the backend suite, `auth-apple.e2e-spec.ts` included, and the web Playwright
    suite pass (Postgres up, migrations applied)
  - `npx turbo run lint check-types --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/app-messages --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/web --filter=@rochas-surf-school/mobile`
    — exit 0
  - `npx turbo run build --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/app-messages --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/web`
    — exit 0
  - `node .docs/designs/scripts/pack.mjs --check` — every design file matches its sources
- User journeys (e2e, followed on a phone):
  - ER-17 on a TestFlight build against staging, performed by the user (D-14), as T-14 lists.

## Memory Impact

- `memory/product.md` — Identity: Apple sign-in as built, and that a relay address opens a separate account (D-02);
  Current state: Apple sign-in exists on iOS; the App Store still needs token revocation (D-13).
- `memory/technical-context.md` — Authentication: `POST /auth/apple`, `AppleIdTokenProvider` / `AppleAuthIdTokenProvider`
  (`jose`), `APPLE_CLIENT_ID` (required in production); External integrations: an "Apple sign-in" section; Applications
  (mobile): `expo-apple-authentication` in use, `ios.usesAppleSignIn`, `src/services/apple-sign-in.ts`; Deployment: the new
  staging parameter and the capability on the App ID.
- `memory/structure.md` — the `/auth/provider-name` route replacing `/auth/google-name`, and the new auth files (port,
  use cases, resolver, provider, hooks, screen), the `auth-apple.e2e-spec.ts` suite, and the design's 51 entries.
- `memory/modules/auth.md` — Identities: the Apple sign-in rules (D-01 order, relay addresses, the name rule); Who can do
  what: signing in with Apple; In the app: the Apple button and "Your name" for both providers; Boundaries: the Apple token
  contract; Spec history: 083.

## Assumptions

- A native Apple identity token names the bundle id as its audience and is signed with RS256 (D-04). If a real token shows
  otherwise in T-14, the provider changes, recorded as a deviation.
- Apple's token carries the email at every sign-in while the scope was granted. If it doesn't, a known identity still
  works (D-01), and an erased account signing up again gets `auth.apple.emailMissing` until the person uses Stop Using.
- Sign in with Apple works with the personal Apple Developer enrolment of spec 080, on the Account Holder role.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)
- [Apple setup for this spec](apple-setup.md)
- [Expo: AppleAuthentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Apple: TN3194, account deletions and revoking tokens](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple.md)

## Amendments

## Review
