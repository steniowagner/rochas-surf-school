---
id: "007"
slug: email-sign-in-screens
title: Email sign-in screens — choose path and sign in with email
status: in-progress
created: 2026-10-10
started: 2026-10-10
base_commit: ec43e72032bd16ceb27f288699a099d9276a336a
fronts: [mobile]
depends_on: []
---

# 007 — Email sign-in screens — choose path and sign in with email

## Goal

Today "Continue with email" always opens Create account, so a person who already has an account has to retype
a name the backend then ignores. After this spec, "Continue with email" opens a Choose screen where the person
says whether they already have an account: people with one go to a new Sign in with email screen that asks only
for the email, sends a code and goes through the existing Confirm email screen into the part of the app that
matches their account; new people go to the existing Create account screen. Whoever picks the wrong path is
sent to the right one with the email they already typed.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: **Identity** (email-code sign-ups type
  their name; any method with the same email opens the same account), **Sign-in code**, and the decision "One
  account per email address".
- Requirements: [requirements.md → Sign-in methods](../../../.docs/requirements.md#sign-in-methods) — signing
  in with a 6-digit email code; [requirements.md → Email code sign-in](../../../.docs/requirements.md#email-code-sign-in)
  — the code is sent to the entered address and signs the person in; [requirements.md → Name before approval](../../../.docs/requirements.md#name-before-approval)
  — a new email-code account gives its name before the code is sent (kept: only the Create account path creates
  accounts, D-01).
- Design: `.docs/designs/auth-flow.html` → LOGIN-02 "Choose" and LOGIN-03 "Sign in with email" (light and dark).
  The design's copy is European Portuguese; the app's copy is in D-05.
- Technical: [technical-context.md](../../memory/technical-context.md) — Fixed conventions → Mobile routes,
  Mobile flows, Mobile shared UI, Mobile forms validate with the shared rules, Design system; Error handling.
- Existing code this builds on:
  - `apps/mobile/src/modules/auth/components/auth/auth.component.tsx` — "Continue with email" pushes
    `routes.auth.createAccount`.
  - `apps/mobile/src/modules/auth/components/create-account/` — name + email form, `useRequestSignInCode`
    (a `signInCode.resend.tooSoon` answer counts as sent), errors through `getSignInCodeErrorKey` in a toast.
  - `apps/mobile/src/modules/auth/components/confirm-code/` and `screens/confirm-code.screen.tsx` — reads the
    `email` and `name` params, verifies with `{ email, code, name }`, sets the session on success (the route
    guards then open the account's flow); "change the email" goes back, or replaces with Create account when
    there is no history; `utils/verify-code-error.ts` maps `user.name.*` to the `confirmCode.errors.nameNotSaved`
    toast.
  - `apps/mobile/src/constants/routes.ts` — `routes.auth.createAccount` is a string; `confirmCode` requires
    `{ email, name }`.
  - Backend `VerifySignInCodeUseCase` (`modules/auth/src/sign-in-code/usecase/verify-sign-in-code.usecase.ts`):
    `name` is optional and ignored for an existing account; for an unknown address it validates the name before
    consuming the code, so a missing name answers 422 `user.name.required` and the code stays usable.

## Scope

### In scope

- The Choose screen (`/auth/email`) and the Sign in with email screen (`/auth/email-sign-in`), their route files
  and routes.
- "Continue with email" on the sign-in screen opening Choose.
- Create account opening with an email already filled in (from the "Create account" link and from the
  unknown-account redirect).
- Confirm email serving both paths, including an unknown email on the sign-in path.
- The new copy in en-US, pt-BR and es-ES.

### Out of scope

- Google and Apple sign-in (their buttons keep doing nothing).
- Making the Terms of Use and Privacy Policy links do something.
- A "Sign in" link on Create account — the design has none.
- Changing what happens when an existing account goes through "I'm new here": the backend ignores the name and
  signs the person in (today's behavior).
- Keeping the session across app restarts.
- Any backend change.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | On the sign-in path, a verify answer whose first error starts with `user.name.` (the address has no account) shows the toast `confirmCode.errors.noAccount` and opens Create account with the email filled in; Back from that Create account returns to Choose. | The code stays usable (the backend checks the name before consuming it), and Create account's request within 30 s counts as sent — so the person only adds their name. Accounts are still created only on the path that collects a name. |
| D-02 | One Confirm email screen for both paths. The path is known from the `name` route param: present and non-empty → create path; absent → sign-in path. `routes.auth.confirmCode` takes `{ email: string; name?: string }`; the verify body leaves `name` out when it is absent. "Change the email" goes back when there is history, else replaces with the path's own screen (`/auth/create-account` or `/auth/email-sign-in`). | The design says LOGIN-05 is "Shared by both paths"; deriving the path from the existing param avoids a second, redundant param. |
| D-03 | The "Create account" link on Sign in with email uses `router.replace` to Create account, carrying the email typed so far, trimmed (empty → no email param). | The design says Back from Create account returns to LOGIN-02; replacing keeps Sign in with email out of the stack. |
| D-04 | Routes: `routes.auth.emailChoice` = `"/auth/email"` (route file `src/app/(public)/auth/email.tsx`), `routes.auth.emailSignIn` = `"/auth/email-sign-in"` (`src/app/(public)/auth/email-sign-in.tsx`). `routes.auth.createAccount` becomes a function `(params?: { email?: string }) => Href`; Create account reads the `email` param as the initial value of its email field (name stays empty, nothing is marked touched). | Every path lives in `routes.ts` (Mobile routes convention); a param keeps the prefill in the URL like Confirm email's params. |
| D-05 | Copy, by key (en-US is the source; the three files share the keys). pt-BR is adapted from the design's pt-PT and avoids gendered forms. See the table below. | The app ships pt-BR, es-ES and en-US, not pt-PT; "Sou novo" is masculine. |
| D-06 | UI: Choose's two rows are a child component (`choice-row`) built on `Pressable` (list rows, not buttons), each with an icon tile, title, description and a `chevron-forward` icon, and a 44 px minimum height. Ionicons: `mail-outline` (Choose header), `log-in-outline` (the "I have an account" row and the Sign in with email header), `person-add-outline` (the "I'm new here" row). Both screens use `BackButton`, `ScreenIntro`, tokens only (no raw colors, fonts or radii), and the same `auth.terms` footer as Create account (links without `onPress`). Sign in with email uses `TextInput` and `Button`, and the "Create account" link is a `TextButton` inside a `Trans` sentence. | Matches LOGIN-02/03 and the Mobile shared UI and button rules in CLAUDE.md. |
| D-07 | Sign in with email's field uses the shared `RequiredRule` and `EmailRule` on the trimmed value, with the same behavior as Create account's email field: the error border and message show only after blur and when not empty; "Get code" is disabled until valid and while sending; the keyboard's done key submits. Request errors go through `getSignInCodeErrorKey` into the toast. The request sends only the email and the language (`useRequestSignInCode`). | One set of rules (Mobile forms convention) and one error mapping for code requests. |
| D-08 | No backend change. | `POST /auth/email/verify` already accepts no name for an existing account and refuses one for an unknown address without consuming the code. |

D-05 copy table:

| Key | en-US | pt-BR | es-ES |
| --- | --- | --- | --- |
| `emailChoice.title` | Continue with email | Continuar com e-mail | Continuar con email |
| `emailChoice.subtitle` | Do you already have a Rocha's account, or is this your first time? | Você já tem conta na Rocha's ou é a primeira vez? | ¿Ya tienes cuenta en Rocha's o es tu primera vez? |
| `emailChoice.existing.title` | I have an account | Já tenho conta | Ya tengo cuenta |
| `emailChoice.existing.description` | Sign in with the email you signed up with. | Entre com o e-mail que você usou no cadastro. | Entra con el correo con el que te registraste. |
| `emailChoice.new.title` | I'm new here | É minha primeira vez | Es mi primera vez |
| `emailChoice.new.description` | Create an account with your name and email. | Crie sua conta com seu nome e e-mail. | Crea tu cuenta con tu nombre y correo. |
| `emailSignIn.title` | Sign in | Entrar | Entrar |
| `emailSignIn.subtitle` | Use your account's email. We'll send you a code to sign in. | Use o e-mail da sua conta. Enviaremos um código para você entrar. | Usa el correo de tu cuenta. Te enviaremos un código para entrar. |
| `emailSignIn.emailPlaceholder` | you@email.com | seu@email.com | tu@correo.com |
| `emailSignIn.emailInvalid` | Enter a valid email. | Informe um e-mail válido. | Escribe un correo válido. |
| `emailSignIn.noAccount` | Don't have an account? `<create>Create account</create>` | Ainda não tem conta? `<create>Criar conta</create>` | ¿Aún no tienes cuenta? `<create>Crear cuenta</create>` |
| `emailSignIn.submit` | Get code | Receber código | Recibir código |
| `confirmCode.errors.noAccount` | We couldn't find an account with this email. Create one to continue. | Não encontramos uma conta com este e-mail. Crie uma para continuar. | No encontramos una cuenta con este correo. Crea una para continuar. |

## Expected Results

### ER-01 — "Continue with email" opens the Choose screen

- **Front:** mobile
- **Behavior:** Given the sign-in screen (`/auth`), when the person presses "Continue with email", then the
  path is `/auth/email` and the Choose screen shows (en-US): the header "Continue with email", the subtitle
  "Do you already have a Rocha's account, or is this your first time?", a row "I have an account" / "Sign in with
  the email you signed up with.", a row "I'm new here" / "Create an account with your name and email.", the
  terms footer ("By continuing, you agree to our Terms of Use and Privacy Policy.") and a back button. When
  Back is pressed, the path is `/auth` again.
- **Edge and error cases:** in pt-BR and es-ES the strings are those of D-05's table; the three locale files
  share the keys (the type check fails otherwise); each row has the `button` accessibility role and its title as
  label; no raw color, font or radius values in the new components (D-06).
- **Verify by:** `npx jest src/modules/auth/components/email-choice src/modules/auth/email-auth.navigation`
  (from `apps/mobile`) — tests "shows the choose content", "shows the content in pt-BR and es-ES",
  "opens Choose from Continue with email" and "goes back to sign-in from Choose";
  `npx turbo run check-types --filter=@rochas-surf-school/mobile` exits 0.

### ER-02 — The Choose rows open the right path

- **Front:** mobile
- **Behavior:** Given the Choose screen, when "I have an account" is pressed, then the path is
  `/auth/email-sign-in` and the header "Sign in" shows; when "I'm new here" is pressed, then the path is
  `/auth/create-account` with an empty email field, and pressing Back there returns to `/auth/email`.
- **Edge and error cases:** Back from Sign in with email returns to `/auth/email`.
- **Verify by:** `npx jest src/modules/auth/email-auth.navigation` (from `apps/mobile`) — tests "opens sign in
  with email from I have an account", "opens create account from I'm new here and goes back to Choose" and
  "goes back to Choose from sign in with email".

### ER-03 — Sign in with email requests a code and opens Confirm email without a name

- **Front:** mobile
- **Behavior:** Given the Sign in with email screen (en-US: header "Sign in", subtitle "Use your account's
  email. We'll send you a code to sign in.", an email field with placeholder "you@email.com", the "Don't have an
  account? Create account" sentence, "Get code" and the terms footer), when the person types
  ` ana.silva@gmail.com ` and presses "Get code", then `POST /auth/email/code` is sent with body
  `{ "email": "ana.silva@gmail.com", "locale": "en" }` and Confirm email opens with the `email` param
  `ana.silva@gmail.com` and no `name` param.
- **Edge and error cases:** "Get code" is disabled while the email is empty or invalid (`ana@`) and while the
  request runs; an invalid, non-empty email shows "Enter a valid email." with the error border only after the
  field loses focus; a 429 `signInCode.resend.tooSoon` answer still opens Confirm email; any other API error
  (e.g. 429 `request.rate.limited` → "Too many attempts. Wait a minute and try again.", `NetworkError` → "No
  connection. Check your internet and try again.") shows its `getSignInCodeErrorKey` message in a toast and
  stays on the screen; pt-BR and es-ES strings follow D-05.
- **Verify by:** `npx jest src/modules/auth/components/email-sign-in src/modules/auth/screens/email-sign-in`
  (from `apps/mobile`) — tests "sends the trimmed email and the language", "opens confirm code without a
  name", "disables Get code until the email is valid", "shows the email error after blur", "counts a too-soon
  answer as sent", "shows API errors in a toast" and "shows the content in pt-BR and es-ES".

### ER-04 — "Create account" on Sign in with email switches path keeping the email

- **Front:** mobile
- **Behavior:** Given the Sign in with email screen reached from Choose with ` ana.silva@gmail.com ` typed, when
  "Create account" is pressed, then the path is `/auth/create-account`, its email field holds
  `ana.silva@gmail.com` and its name field is empty; when Back is pressed there, then the path is `/auth/email`
  (Sign in with email is no longer in the stack).
- **Edge and error cases:** with nothing typed, Create account opens with an empty email field; a prefilled
  email shows no error state before the person edits it; Create account opened directly (no param) behaves as
  before.
- **Verify by:** `npx jest src/modules/auth/email-auth.navigation src/modules/auth/components/create-account`
  (from `apps/mobile`) — tests "replaces sign in with create account keeping the email", "opens create account
  with an empty email when nothing was typed" and "starts with the given email".

### ER-05 — Confirm email signs in an existing account on the sign-in path

- **Front:** mobile
- **Behavior:** Given Confirm email opened with only `email=ana.silva@gmail.com`, when the person types the
  correct 6-digit code, then `POST /auth/email/verify` is sent with body `{ "email": "ana.silva@gmail.com",
  "code": "<code>" }` (no `name` key) and the verified account and tokens are put in the session (the flow
  guards then open its flow, e.g. `/pending` for a pending account). When "change the email" is pressed, then
  it goes back to Sign in with email; when Confirm email has no history, it replaces with `/auth/email-sign-in`.
- **Edge and error cases:** on the create path (`name=Ana Silva`) the verify body still carries `name` and
  "change the email" with no history still replaces with `/auth/create-account`; wrong, expired and locked codes
  still show inline on both paths; resend works the same on both paths.
- **Verify by:** `npx jest src/modules/auth/components/confirm-code src/modules/auth/screens/confirm-code`
  (from `apps/mobile`) — tests "verifies without a name on the sign-in path", "verifies with the name on the
  create path", "changes the email back to sign in with email when there is no history" and "changes the email
  back to create account when there is no history".

### ER-06 — An unknown email on the sign-in path is sent to Create account

- **Front:** mobile
- **Behavior:** Given the stack sign-in → Choose → Sign in with email → Confirm email (only
  `email=ana.silva@gmail.com`), when verify answers 422 with `errors: ["user.name.required"]`, then the toast
  "We couldn't find an account with this email. Create one to continue." shows, the path becomes
  `/auth/create-account` with `ana.silva@gmail.com` in the email field and an empty name, and Back from there
  returns to `/auth/email`.
- **Edge and error cases:** any `user.name.*` key on the sign-in path behaves the same; on the create path a
  `user.name.*` answer still shows "We couldn't save your name. Go back and check it." and stays on Confirm email;
  the session stays empty; pt-BR and es-ES toast texts follow D-05.
- **Verify by:** `npx jest src/modules/auth/components/confirm-code src/modules/auth/utils/verify-code-error src/modules/auth/email-auth.navigation`
  (from `apps/mobile`) — tests "sends an unknown email to create account", "keeps the name error on the create
  path" and "goes back to Choose from create account after an unknown email".

## Tasks

### Mobile (`apps/mobile`)

- [x] **T-01** — Routes and Create account prefill (D-02, D-04): in `src/constants/routes.ts` add
  `routes.auth.emailChoice` and `routes.auth.emailSignIn`, turn `createAccount` into
  `(params?: { email?: string }) => Href` and make `confirmCode`'s `name` optional; make
  `src/modules/auth/screens/create-account.screen.tsx` read the `email` param and pass it to `CreateAccount` as
  `initialEmail` (`create-account.types.ts`, `create-account.hook.ts`); update every caller and test of
  `routes.auth.createAccount` (auth component, confirm-code hook, their tests and the root-navigator tests).
  Follow `.claude/rules/react.md`. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-04 · Done when: `npx jest src/modules/auth src/navigation` passes, including a new create-account
  test "starts with the given email", and `npx turbo run check-types --filter=@rochas-surf-school/mobile`
  exits 0.
  > ✅ 2026-10-10 — `routes.auth` gained `emailChoice` / `emailSignIn`, `createAccount` is now `(params?) => Href`, `confirmCode`'s
  > `name` is optional; Create account reads the `email` param (`initialEmail`) and starts its email field with it;
  > callers updated (auth component, confirm-code hook, their tests, root-navigator tests; the auth component keeps
  > pushing `routes.auth.createAccount()` until T-02 adds the Choose route file, because typed routes reject a path
  > without a route file). New test "starts with the given email". Files: `apps/mobile/src/constants/routes.ts`,
  > `apps/mobile/src/modules/auth/screens/create-account.screen.tsx`,
  > `apps/mobile/src/modules/auth/screens/create-account.screen.test.tsx`,
  > `apps/mobile/src/modules/auth/components/create-account/create-account.{component.tsx,hook.ts,types.ts,component.test.tsx}`,
  > `apps/mobile/src/modules/auth/components/confirm-code/confirm-code.{hook.ts,component.test.tsx}`,
  > `apps/mobile/src/modules/auth/components/auth/auth.component.tsx`,
  > `apps/mobile/src/navigation/root-navigator/root-navigator.component.test.tsx`;
  > verified: `npx jest src/modules/auth src/navigation` (13 suites, 214 tests pass), `npx tsc --noEmit` (exit 0);
  > deviations: Create account / `useConfirmCode` default the `createAccount()` fallback; the auth component's "Continue with email" switch to Choose moved wholly to T-02

- [x] **T-02** — Choose screen (D-04, D-05, D-06): component `src/modules/auth/components/email-choice/`
  (`email-choice.component.tsx`, `email-choice.types.ts`, `index.ts`, `email-choice.component.test.tsx`) with the
  child `choice-row` component; screen `src/modules/auth/screens/email-choice.screen.tsx` (rows push
  `routes.auth.emailSignIn` and `routes.auth.createAccount()`); route file `src/app/(public)/auth/email.tsx`; the
  `emailChoice.*` keys in `src/i18n/messages/{en-US,pt-BR,es-ES}.ts`; "Continue with email" in
  `auth.component.tsx` pushes `routes.auth.emailChoice`. Create `src/modules/auth/email-auth.navigation.test.tsx`
  (`renderRouter` with the real auth route files, `getPathname()`) with the ER-01 and ER-02 navigation tests.
  Follow `.claude/rules/react.md`. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-01, ER-02 · Done when: `npx jest src/modules/auth/components/email-choice src/modules/auth/email-auth.navigation src/modules/auth/components/auth`
  passes with the tests named in ER-01 and ER-02.
  > ✅ 2026-10-10 — Choose screen built from `EmailChoice` (+ child `ChoiceRow`, `Pressable` rows with the `button` role and
  > the title as label), `EmailChoiceScreen` and route `/auth/email`; "Continue with email" now pushes
  > `routes.auth.emailChoice`; `emailChoice.*` keys (and, ahead of T-04, `emailSignIn.*` and
  > `confirmCode.errors.noAccount`) added to the three locale files. A placeholder route file `email-sign-in.tsx`
  > (a "Sign in" header) lets the navigation tests and typed routes work until T-03 replaces it.
  > Files: `apps/mobile/src/modules/auth/components/choice-row/{index.ts,choice-row.types.ts,choice-row.component.tsx}`,
  > `apps/mobile/src/modules/auth/components/email-choice/{index.ts,email-choice.types.ts,email-choice.component.tsx,email-choice.component.test.tsx}`,
  > `apps/mobile/src/modules/auth/screens/email-choice.screen.tsx`, `apps/mobile/src/app/(public)/auth/email.tsx`,
  > `apps/mobile/src/app/(public)/auth/email-sign-in.tsx` (placeholder),
  > `apps/mobile/src/modules/auth/email-auth.navigation.test.tsx`,
  > `apps/mobile/src/modules/auth/components/auth/{auth.component.tsx,auth.component.test.tsx}`,
  > `apps/mobile/src/i18n/messages/{en-US,pt-BR,es-ES}.ts`;
  > verified: `npx jest src/modules/auth src/navigation` (15 suites, 223 tests pass; includes the ER-01/ER-02 tests),
  > `npx tsc --noEmit` (exit 0); deviations: the locale keys for T-03/T-04 were added now; sign-in route is a placeholder until T-03

- [x] **T-03** — Sign in with email screen (D-03, D-05, D-06, D-07): component
  `src/modules/auth/components/email-sign-in/` (`email-sign-in.component.tsx`, `email-sign-in.hook.ts`,
  `email-sign-in.types.ts`, `index.ts`, `email-sign-in.component.test.tsx`); screen
  `src/modules/auth/screens/email-sign-in.screen.tsx` (+ `email-sign-in.screen.test.tsx`) that pushes
  `routes.auth.confirmCode({ email })` once the code is requested and `router.replace`s with
  `routes.auth.createAccount({ email })` from the link; route file `src/app/(public)/auth/email-sign-in.tsx`; the
  `emailSignIn.*` keys in the three locale files; the ER-02 back test and the ER-04 tests in
  `email-auth.navigation.test.tsx`. Follow `.claude/rules/react.md`. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-03, ER-04 · Done when: `npx jest src/modules/auth/components/email-sign-in src/modules/auth/screens/email-sign-in src/modules/auth/email-auth.navigation`
  passes with the tests named in ER-03 and ER-04.
  > ✅ 2026-10-10 — Sign in with email built: `EmailSignIn` (hook, types, component), `EmailSignInScreen` (pushes
  > `confirmCode({ email })`; the "Create account" link `router.replace`s with the trimmed email, none when empty) and the real
  > route file replacing T-02's placeholder. The email validation helpers `isValid` / `getStatus` moved out of
  > `create-account.hook.ts` into `utils/field-validation.ts` (tested) so both screens share them. Navigation tests added for
  > ER-02's back test and ER-04. Files: `apps/mobile/src/modules/auth/components/email-sign-in/{index.ts,email-sign-in.types.ts,email-sign-in.hook.ts,email-sign-in.component.tsx,email-sign-in.component.test.tsx}`,
  > `apps/mobile/src/modules/auth/screens/{email-sign-in.screen.tsx,email-sign-in.screen.test.tsx}`,
  > `apps/mobile/src/app/(public)/auth/email-sign-in.tsx`,
  > `apps/mobile/src/modules/auth/utils/{field-validation.ts,field-validation.test.ts}`,
  > `apps/mobile/src/modules/auth/components/create-account/create-account.hook.ts`,
  > `apps/mobile/src/modules/auth/email-auth.navigation.test.tsx`;
  > verified: `npx jest src/modules/auth src/navigation` (18 suites, 249 tests pass), `npx tsc --noEmit` (exit 0);
  > deviations: extracted the shared field helpers (small, behavior-preserving change to Create account's hook)

- [x] **T-04** — Confirm email on both paths (D-01, D-02, D-05): `confirm-code.screen.tsx` reads `name` as
  optional; `confirm-code.hook.ts` sends `name` only when present (`VerifySignInCodeVariables.name` optional in
  `use-verify-sign-in-code.hook.ts`), picks the "change the email" fallback by path, and on the sign-in path turns
  a `user.name.*` answer into the `confirmCode.errors.noAccount` toast plus Create account with the email filled
  in, with Choose below it in the stack (e.g. `router.dismissTo(routes.auth.emailChoice)` then
  `router.push(routes.auth.createAccount({ email }))` — any navigation that yields that stack is fine); extend
  `utils/verify-code-error.ts` if the mapping lives there; the `confirmCode.errors.noAccount` key in the three
  locale files; tests in `confirm-code.component.test.tsx`, `confirm-code.screen.test.tsx`,
  `verify-code-error.test.ts` and `email-auth.navigation.test.tsx`. Follow `.claude/rules/react.md`. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-05, ER-06 · Done when: `npx jest src/modules/auth` passes with the tests named in ER-05 and ER-06.
  > ✅ 2026-10-10 — Confirm email serves both paths: `name` is optional in the screen, `ConfirmCodeProps` and
  > `VerifySignInCodeVariables`; the hook sends `name` only when present, "change the email" goes back or replaces with
  > `/auth/create-account` or `/auth/email-sign-in` by path, and on the sign-in path `getVerifyCodeError(error, hasName)` maps
  > `user.name.*` to `confirmCode.errors.noAccount` with `opensCreateAccount`, which toasts and runs
  > `router.dismissTo(emailChoice)` then `router.push(createAccount({ email }))`. The `noAccount` key was added in T-02.
  > Files: `apps/mobile/src/modules/auth/components/confirm-code/{confirm-code.hook.ts,confirm-code.types.ts,confirm-code.component.test.tsx}`,
  > `apps/mobile/src/modules/auth/screens/{confirm-code.screen.tsx,confirm-code.screen.test.tsx}`,
  > `apps/mobile/src/modules/auth/hooks/use-verify-sign-in-code.hook.ts`,
  > `apps/mobile/src/modules/auth/utils/{verify-code-error.ts,verify-code-error.test.ts}`,
  > `apps/mobile/src/modules/auth/email-auth.navigation.test.tsx`;
  > verified: `npx jest src/modules/auth src/navigation` (18 suites, 265 tests pass, the unknown-email flow runs against the real router stack),
  > `npx tsc --noEmit` (exit 0); deviations: none

### Verification

- [ ] **T-05** — Run every command in the Verification Plan from the repo root and follow its user journeys in
  the iOS simulator; all pass. Record the output summary as evidence.
  Covers: all · Done when: `run-related-tests.mjs 007` passes, `check-coverage.mjs 007` prints `COVERAGE OK`,
  lint and type check exit 0, and the four user journeys show what they describe.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 007` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 007` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` — no errors (the type check also proves
    the three locale files share the keys).
  - `node .specs/scripts/run-e2e.mjs 007` — runs the e2e suites of the apps touched (none for mobile; expected to
    report nothing to run).
- User journeys (iOS simulator, backend running with `npm run dev` and its database up; codes come from the
  backend log):
  - ER-01, ER-02 — on sign-in, press "Continue with email": Choose shows with both rows and the terms footer in
    the phone's language, in light and dark; "I'm new here" opens Create account and Back returns to Choose;
    "I have an account" opens Sign in with email and Back returns to Choose.
  - ER-03, ER-05 — with an existing account (e.g. one created earlier through Create account, or a review
    account), choose "I have an account", type its email, press "Get code", enter the code: the account's screen
    opens (the Pending screen for a pending account) without asking for a name.
  - ER-04 — on Sign in with email, type an email and press "Create account": Create account shows that email and
    an empty name; Back returns to Choose.
  - ER-06 — choose "I have an account" with an email that has no account, enter the correct code: the toast "We
    couldn't find an account with this email. Create one to continue." (or its translation) shows and Create
    account opens with the email; type a name, press "Get code" and enter the code again: the Pending screen
    opens.

## Memory Impact

- `memory/structure.md` — `apps/mobile`: route files `src/app/(public)/auth/{email,email-sign-in}.tsx`; screens
  `email-choice.screen.tsx` and `email-sign-in.screen.tsx`; components `email-choice` (with `choice-row`) and
  `email-sign-in` in `src/modules/auth/components/`; `src/modules/auth/email-auth.navigation.test.tsx`; Confirm
  email's params are `email` and an optional `name`.
- `memory/technical-context.md` — Fixed conventions → Mobile routes: a route that takes optional params is a
  function too (`routes.auth.createAccount({ email })`).
- `memory/modules/auth.md` — Who can do what → In the app: "Continue with email" asks whether the person has an
  account; the sign-in path sends only the email and verifies without a name; an unknown email on that path is
  sent to Create account with the email filled in. Spec history entry.
- `memory/product.md` — Current state: signing in with email to an existing account (Choose and Sign in with
  email screens) is delivered.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
