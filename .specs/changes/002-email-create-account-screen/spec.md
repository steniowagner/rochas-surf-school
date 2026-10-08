---
id: "002"
slug: email-create-account-screen
title: Create account screen (request an email sign-in code)
template: quick
status: accepted
created: 2026-10-08
started: 2026-10-08
base_commit: 1ec9dad
reviewed_commit: 8ed77f8966248b0fe2c4ecbedab7dbc526fe14bc
fronts: [mobile]
depends_on: []
---

# 002 — Create account screen (request an email sign-in code)

## Goal

A person who taps "Continue with email" on the sign-in screen reaches the **Criar conta** screen, types their
name and email and asks for a sign-in code. The button only works once both values pass the same rules the
backend applies, and every error the API can answer is shown as a friendly, translated message. The screen
introduces the shared back button, intro block and text input that the next screens of the flow reuse.

## Context

- Requirements: [requirements.md → Email code sign-in](../../../.docs/requirements.md#email-code-sign-in) —
  a code is sent to the address the person enters, in the language picked on the sign-in screen;
  [requirements.md → Name before approval](../../../.docs/requirements.md#name-before-approval) — a new
  account gets a typed name (this spec collects it before the code, see D-01).
- Design: `.docs/designs/auth-flow.html`, screen "Registo" ("Criar conta"). The same intro block (icon in a
  64×64 `sand` tile with a `grape` icon, display title, `ink-2` subtitle) appears on "Confirma o teu email" and
  "Aguarda aprovação"; the round back button (44×44, `surface` background, `line` border, chevron) on every
  inner screen.
- API: `POST /auth/email/code` (public, from spec 001) takes `{ email, locale }` (`locale`: `pt-BR` | `es` |
  `en`) and answers 202 `{ resendAvailableAt, expiresAt }`. Errors use the shape in
  [technical-context.md → Error handling](../../memory/technical-context.md#error-handling): 422
  `signInCode.email.invalid` / `signInCode.locale.invalid`, 429 `signInCode.resend.tooSoon` (with
  `details.resendAvailableAt`), 429 `request.rate.limited` (throttler, 5 per minute), 502
  `signInCode.email.sendFailed`, 500 `INTERNAL_SERVER_ERROR`.
- Validation rules: `User.validate()` in `modules/auth/src/user/model/user.entity.ts` — name `RequiredRule`,
  `MinLengthRule(3)`, `MaxLengthRule(80)`, `PersonNameRule` (two words or more); email `RequiredRule`,
  `EmailRule`. All exported by `@rochas-surf-school/shared`, already a dependency of `apps/mobile`.
- Existing code this changes: `apps/mobile/src/modules/auth/components/auth/auth.component.tsx` — the
  "Continue with email" `AuthButton` has no `onPress` (and `AuthButton` takes none);
  `apps/mobile/src/app/_layout.tsx` — root Stack, no query client; `apps/mobile/src/i18n/messages/*` — the
  three locales (en-US is the source of the keys). There is no HTTP client and TanStack Query is not installed.
- Conventions: [.claude/rules/react.md](../../../.claude/rules/react.md) (one folder per component:
  `*.component.tsx`, `*.hook.ts`, `*.types.ts`, `index.ts`) and [CLAUDE.md](../../../CLAUDE.md) → Design
  system and Rules for apps/mobile (NativeWind classes, tokens only, buttons with `TouchableOpacity`). Load the
  `vercel-react-native-skills` and `vercel-react-best-practices` skills before writing the code.

## Scope

### In scope

- The Create account route, screen and component; "Continue with email" opening it.
- Shared UI components: `BackButton`, `ScreenIntro`, `TextInput`.
- TanStack Query, an API client and the request-code mutation with its error messages.
- en-US, es-ES and pt-BR strings for everything new.

### Out of scope

- The code screen, verifying the code, resending and the countdown — the next spec. Nothing navigates after a
  successful request (D-06).
- Sending the name to the backend (it goes with the verify call, in the next spec).
- Any backend change; a new 38px title token (D-03).
- The "Entrar" email screen for existing accounts shown in the design, Apple and Google sign-in, the
  privacy/terms pages (the terms links keep no handler, as on the Auth screen).
- Session storage (`expo-secure-store`) and routing by account state.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The name is collected on this screen, before the code (as the design shows), and kept in the app; it is not sent to `/auth/email/code`. The request body is exactly `{ email, locale }`. | The route takes only `{ email, locale }`; the name goes with `/auth/email/verify`, which creates the account. Requirements say the name is asked after the code — the design wins, and the backend accepts both orders. `spec-finish` updates the requirement text. |
| D-02 | The form validates with the shared rules through `Validator` from `@rochas-surf-school/shared`, with the same rule set as `User.validate()` (name: `RequiredRule`, `MinLengthRule(3)`, `MaxLengthRule(80)`, `PersonNameRule`; email: `RequiredRule`, `EmailRule`). No regex or rule is re-implemented in the app. | One set of rules: what the app accepts, the backend accepts. |
| D-03 | The intro title uses the `ds-text-screen-title` class (34px, uppercase) instead of the design's 38px. | No 38px uppercase display token exists; adding one would touch a second front for 4px. |
| D-04 | `locale` comes from the app language: `en-US` → `en`, `es-ES` → `es`, `pt-BR` → `pt-BR`. | The backend's locales differ from the app's; the email must be in the language picked on the sign-in screen. |
| D-05 | `BackButton` (`src/components/ui/back-button`) is the only back button of the app: every screen that can go back uses it, and CLAUDE.md says so. | The user asked for one standard back button for all screens. |
| D-06 | On success — and on 429 `signInCode.resend.tooSoon`, since a valid code was already sent less than 30 s ago — the component calls its `onCodeRequested({ name, email })` prop (trimmed name, trimmed email) and nothing else; the route passes no handler yet. | The code screen is the next spec; the callback is where it plugs in. |
| D-07 | Server calls use TanStack Query (`useMutation`) over a small `fetch` client in `src/services/api/` that reads `EXPO_PUBLIC_API_URL`, sends JSON and throws an `ApiError` (`status`, `errors`, `details`) on a non-2xx answer, or a `NetworkError` when no answer arrives. | The technical context fixes TanStack Query for server data; this is the app's first request. |
| D-08 | Errors are shown as one message above the CTA (`text-bad`), picked from the first key of `errors`: `signInCode.email.invalid` → invalid email; `request.rate.limited` → too many attempts; `signInCode.email.sendFailed` → email not sent; `NetworkError` → no connection; anything else (including `signInCode.locale.invalid` and 500) → generic. The message disappears as soon as a field is edited. | Friendly messages for every answer the route can give; the technical context's rule (translate the first key, unknown keys fall back to a generic message). |
| D-09 | pt-BR copy is adapted from the design's European Portuguese. Strings (pt-BR / en-US / es-ES): title "Criar conta" / "Create account" / "Crear cuenta"; subtitle "Informe seu nome e e-mail. Enviaremos um código para confirmar." / "Tell us your name and email. We'll send you a code to confirm." / "Dinos tu nombre y correo. Te enviaremos un código para confirmar."; name placeholder "Nome e sobrenome" / "First and last name" / "Nombre y apellido"; email placeholder "seu@email.com" / "you@email.com" / "tu@correo.com"; CTA "Receber código" / "Get code" / "Recibir código". Error copy is written by the executor in the same tone, in all three locales. | The product is in pt-BR, es and en; the design is in pt-PT. |

## Expected Results

### ER-01 — "Continue with email" opens Create account, and the back button returns

- **Front:** mobile
- **Behavior:** Given the sign-in screen, when the person taps "Continue with email", then the Create account
  screen opens showing, in order: the back button (accessibility label "Back"), the intro block (person-add
  icon, title "Create account", subtitle), the name field, the email field, the "Get code" button and the terms
  line. When they tap the back button, they return to the sign-in screen.
- **Edge and error cases:** the back button is 44×44 (touch target); in es-ES and pt-BR every text on the
  screen is in that language (title "Crear cuenta" / "Criar conta"); the screen follows the OS light/dark theme
  (tokens only).
- **Verify by:** `npx jest src/modules/auth/components/auth src/modules/auth/components/create-account src/components/ui/back-button src/components/ui/screen-intro`
  (from `apps/mobile`) — tests "opens Create account when Continue with email is pressed", "calls router.back
  when pressed", "renders the intro and form in each locale"; and the simulator journey in the Verification
  Plan.

### ER-02 — "Get code" is enabled only when the name and the email are valid

- **Front:** mobile
- **Behavior:** Given the Create account screen, when the name passes `RequiredRule`, `MinLengthRule(3)`,
  `MaxLengthRule(80)` and `PersonNameRule` and the email passes `RequiredRule` and `EmailRule`, then "Get code"
  is enabled (`accessibilityState.disabled` false, `sun` background); otherwise it is disabled (`sand`
  background) and pressing it sends nothing.
- **Edge and error cases:**
  - Disabled for: both empty; "Ana" (one word); "Al" (too short); an 81-character name; "Ana Silva" with
    "ana@" or "ana.silva@gmail"; a valid email with an empty name. Enabled for "Ana Silva" +
    "ana.silva@gmail.com", "Maria-José D'Ávila" + " Ana@Gmail.com " (surrounding spaces are trimmed).
  - A field whose non-empty value is invalid shows its error message below it and a `bad` border only after it
    loses focus; while typing, a valid field shows a `lagoon` border and an untouched or empty one the
    `input-line` border. The error disappears as soon as the value becomes valid.
  - "Next" on the keyboard of the name field focuses the email field; "done" on the email field submits only
    when the form is valid.
- **Verify by:** `npx jest src/modules/auth/components/create-account src/components/ui/text-input` (from
  `apps/mobile`) — tests "keeps Get code disabled for invalid values" (each case above), "enables Get code for
  valid values", "shows the field error on blur", "focuses the email field on next", "submits on done only when
  valid".

### ER-03 — "Get code" requests a code and handles every answer

- **Front:** mobile
- **Behavior:** Given a valid form, when the person taps "Get code", then the app sends
  `POST {EXPO_PUBLIC_API_URL}/auth/email/code` with the JSON body `{ "email": <trimmed email>, "locale":
  <mapped app language> }` and nothing else; while it runs, the button shows a spinner and further presses send
  nothing; on 202, `onCodeRequested({ name, email })` is called once with the trimmed values and the button is
  enabled again.
- **Edge and error cases:**
  - Locale: `en-US` → `"en"`, `es-ES` → `"es"`, `pt-BR` → `"pt-BR"`.
  - 429 `signInCode.resend.tooSoon` → treated as success (`onCodeRequested` called, no error shown).
  - 422 `signInCode.email.invalid` → the invalid-email message; 429 `request.rate.limited` → the
    too-many-attempts message; 502 `signInCode.email.sendFailed` → the email-not-sent message; `fetch` rejects
    (no connection) → the no-connection message; 500, 422 `signInCode.locale.invalid`, an unknown key or a body
    that isn't JSON → the generic message. In every error case `onCodeRequested` is not called, the message is
    shown above the button in the current language, the button is enabled again, and editing either field hides
    the message.
- **Verify by:** `npx jest src/services/api src/modules/auth/hooks src/modules/auth/components/create-account`
  (from `apps/mobile`) — tests "sends email and locale", "maps each app language to the backend locale", "calls
  onCodeRequested on success", "treats resend too soon as success", "shows the message for each error" (one per
  case above), "ignores presses while sending", "hides the error when a field changes"; and the simulator
  journey in the Verification Plan.

## Tasks

### Mobile (`apps/mobile`)

- [x] **T-01** — Add `@tanstack/react-query` (`npx expo install`) and wrap the root Stack in
  `QueryClientProvider` in `src/app/_layout.tsx` (one `QueryClient`, mutations without retry). Create
  `src/services/api/` (`api.client.ts`, `api.errors.ts`, `index.ts`): `apiPost<T>(path, body)` builds the URL
  from `process.env.EXPO_PUBLIC_API_URL`, sends JSON, returns the parsed body on 2xx, throws
  `ApiError { status, errors: string[], details? }` on non-2xx (an empty `errors` when the body isn't JSON or
  has no `errors`) and `NetworkError` when `fetch` rejects (D-07). Tests in `api.client.test.ts` (mocked
  `global.fetch`): posts JSON to the base URL followed by the path with `Content-Type: application/json`; returns the body on
  202; throws `ApiError` with status, errors and details on 422 and 429; throws `ApiError` with empty errors on
  a 500 whose body isn't JSON; throws `NetworkError` when `fetch` rejects.
  Covers: enabling · Done when: `npx jest src/services/api` passes and `npx turbo run check-types
  --filter=@rochas-surf-school/mobile` exits 0.
  > ✅ 2026-10-08 14:40 — added @tanstack/react-query (expo install), QueryClientProvider (mutations retry false) in the root layout, and the API client with ApiError/NetworkError.
  > files: `apps/mobile/package.json`, `package-lock.json`, `apps/mobile/src/app/_layout.tsx`, `apps/mobile/src/services/api/{api.client.ts,api.errors.ts,index.ts,api.client.test.ts}`;
  > verified: `npx jest src/services/api` (7 passed); `tsc --noEmit` in apps/mobile exits 0;
  > deviations: `npx turbo run check-types --filter=…/mobile` also runs the design-tokens check, which fails on main already (tokens.css out of date, unrelated to this spec), so the mobile type check was run directly with tsc.
- [x] **T-02** — Create `src/components/ui/back-button/` (`TouchableOpacity`, 44×44 round, `bg-surface`,
  `border-line`, `Ionicons` `chevron-back` with `useTheme()` color, `accessibilityRole="button"`, label from
  `common.back`; `onPress` defaults to `router.back()`, overridable) and `src/components/ui/screen-intro/`
  (props `icon: ReactNode`, `title: string`, `description: ReactNode`; 64×64 `rounded-card` `bg-sand` tile,
  title `ds-text-screen-title` with `accessibilityRole="header"`, description in `text-ink-2`) per D-03, with
  the `common.back` key in the three locales. Add to [CLAUDE.md](../../../CLAUDE.md) → Rules for apps/mobile:
  every screen that can go back uses `BackButton` (D-05). Tests: `back-button.component.test.tsx` — renders a
  button labelled "Back"; calls `router.back` (mocked `expo-router`) when pressed without `onPress`; calls the
  given `onPress` instead of `router.back` when provided; label is "Voltar" in pt-BR and "Volver" in es-ES.
  `screen-intro.component.test.tsx` — renders the icon, the title as a header and a string description;
  renders a description given as elements (e.g. nested bold `Text`).
  Covers: ER-01 · Done when: `npx jest src/components/ui/back-button src/components/ui/screen-intro` passes.
  > ✅ 2026-10-08 14:40 — created BackButton and ScreenIntro with tests, added common.back in the three locales and the BackButton rule to CLAUDE.md.
  > files: `apps/mobile/src/components/ui/back-button/{back-button.component.tsx,back-button.types.ts,index.ts,back-button.component.test.tsx}`, `apps/mobile/src/components/ui/screen-intro/{screen-intro.component.tsx,screen-intro.types.ts,index.ts,screen-intro.component.test.tsx}`, `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts`, `CLAUDE.md`;
  > verified: `npx jest src/components/ui/back-button src/components/ui/screen-intro` (7 passed); `tsc --noEmit` exits 0;
  > deviations: none
- [x] **T-03** — Create `src/components/ui/text-input/` (`text-input.component.tsx`, `.types.ts`, `index.ts`):
  a 52px-high row with `rounded-control`, 1.5px border, `bg-input`, a leading icon (`useTheme()` color
  `ink-2`), a React Native `TextInput` in `text-ink` body font, and an optional error message below it in
  `text-bad`. Props: `icon`, `status: "neutral" | "valid" | "error"` (border `input-line` / `lagoon` / `bad`),
  `errorMessage?`, plus every `TextInputProps` (forwarded, including `returnKeyType`, `onSubmitEditing`,
  `onBlur`) and a forwarded `ref` for focus. Tests in `text-input.component.test.tsx`: forwards typing to
  `onChangeText`; shows the placeholder; shows `errorMessage` only when `status` is `error`; applies the border
  class of each status; calls `onBlur` and `onSubmitEditing`; the forwarded ref can `focus()`.
  Covers: ER-02 · Done when: `npx jest src/components/ui/text-input` passes.
  > ✅ 2026-10-08 14:41 — created the shared TextInput (52px row, status borders, error message, forwarded ref; the native input is imported as NativeTextInput).
  > files: `apps/mobile/src/components/ui/text-input/{text-input.component.tsx,text-input.types.ts,index.ts,text-input.component.test.tsx}`;
  > verified: `npx jest src/components/ui/text-input` (9 passed); `tsc --noEmit` exits 0;
  > deviations: none
- [x] **T-04** — Build the screen: route `src/app/(private)/auth/create-account.tsx` →
  `src/modules/auth/screens/create-account.screen.tsx` → `src/modules/auth/components/create-account/`
  (`create-account.component.tsx`, `create-account.hook.ts`, `create-account.types.ts`, `index.ts`). The
  component: `BackButton`, `ScreenIntro` (`Ionicons` `person-add-outline` in `grape`), name `TextInput`
  (`person-outline`, `autoComplete="name"`, `returnKeyType="next"` focusing the email), email `TextInput`
  (`mail-outline`, `keyboardType="email-address"`, `autoCapitalize="none"`, `autoComplete="email"`,
  `returnKeyType="done"`), a spacer, the "Get code" button (`TouchableOpacity`, full rounded, `bg-sun` +
  `shadowStyle("primary")` when enabled, `bg-sand`/`text-ink-2` and `disabled` otherwise) and the terms line
  reusing `auth.terms` with `TextButton`; `KeyboardAvoidingView` and safe-area insets so the button stays
  above the keyboard. The hook holds the values, the touched state and validity using `Validator` and the
  shared rules (D-02), and returns each field's status and error message. Add the `createAccount.*` keys
  (title, subtitle, placeholders, CTA, field errors) to `en-US.ts`, `es-ES.ts`, `pt-BR.ts` (D-09). Give
  `AuthButton` an `onPress` prop and make "Continue with email" call `router.push("/auth/create-account")`.
  Tests in `create-account.component.test.tsx` and `auth.component.test.tsx`: "opens Create account when
  Continue with email is pressed" (mocked router); "renders the intro and form in each locale" (en-US, es-ES,
  pt-BR titles and CTA); "keeps Get code disabled for invalid values" (`it.each` over every disabled case in
  ER-02); "enables Get code for valid values" (both enabled cases); "shows the field error on blur" and "hides
  it when the value becomes valid", for name and email; "does not show an error for an empty field on blur";
  "focuses the email field on next"; "does not submit on done when invalid".
  Covers: ER-01, ER-02 · Done when: `npx jest src/modules/auth` passes.
  > ✅ 2026-10-08 14:44 — built the Create account route, screen, component and hook (shared-rule validation via Validator, field status/error on blur, next/done keyboard handling), createAccount.* strings in the three locales, AuthButton onPress and the Continue with email navigation. Until T-05 the button and keyboard "done" call onCodeRequested directly.
  > files: `apps/mobile/src/app/(private)/auth/create-account.tsx`, `apps/mobile/src/modules/auth/screens/create-account.screen.tsx`, `apps/mobile/src/modules/auth/components/create-account/{create-account.component.tsx,create-account.hook.ts,create-account.types.ts,index.ts,create-account.component.test.tsx}`, `apps/mobile/src/modules/auth/components/auth/{auth.component.tsx,auth.component.test.tsx}`, `apps/mobile/src/modules/auth/components/auth-button/{auth-button.component.tsx,auth-button.types.ts}`, `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts`, `apps/mobile/jest.config.js`;
  > verified: `npx jest src/modules/auth` (38 passed); `tsc --noEmit` and `expo lint` (0 errors) in apps/mobile;
  > deviations: small technical step — importing @rochas-surf-school/shared in Jest failed because jest-expo resolves `uuid` to its browser ESM build, so `jest.config.js` maps `uuid` to the CommonJS build.
- [x] **T-05** — Add `src/modules/auth/hooks/use-request-sign-in-code.hook.ts`: a `useMutation` that maps the
  app language to the backend locale (D-04), posts `{ email, locale }` with `apiPost` and resolves on 202 or on
  `ApiError` 429 `signInCode.resend.tooSoon` (D-06); plus `src/modules/auth/utils/sign-in-code-error.ts`
  mapping an error to a translation key (D-08), with the `createAccount.errors.*` keys in the three locales.
  Wire it into the Create account component: submit (button or "done") trims the values and calls the
  mutation; the button shows an `ActivityIndicator` and ignores presses while pending; on success it calls
  `onCodeRequested({ name, email })` (new optional prop of the component; the screen passes none); on error it
  shows the mapped message above the button until a field changes. Tests: `use-request-sign-in-code.hook.test.ts`
  (mocked `apiPost`, wrapped in a `QueryClientProvider`) — "sends email and locale", "maps each app language to
  the backend locale" (`it.each` over the three), "treats resend too soon as success", "rejects on other
  errors"; `sign-in-code-error.test.ts` — one case per row of D-08, plus a non-API error; in
  `create-account.component.test.tsx` (mocked `global.fetch`) — "calls onCodeRequested on success" (trimmed
  values, called once), "treats resend too soon as success", "shows the message for each error" (`it.each` over the
  five error cases of ER-03, checking the English text and that `onCodeRequested` isn't called), "shows the
  error message in pt-BR", "ignores presses while sending" (one `fetch` call for two presses), "re-enables the
  button after an error", "hides the error when a field changes", "submits on done when valid".
  Covers: ER-03 · Done when: `npx jest src/modules/auth src/services/api` passes.
  > ✅ 2026-10-08 14:49 — added useRequestSignInCode (locale mapping, resend-too-soon as success) and getSignInCodeErrorKey, the createAccount.errors.* strings in the three locales, and wired them into the Create account hook/component (spinner and ignored presses while pending, error above the button, hidden on edit, onCodeRequested on success). The button now has an accessibilityLabel so it keeps its name while the spinner shows.
  > files: `apps/mobile/src/modules/auth/hooks/{use-request-sign-in-code.hook.ts,use-request-sign-in-code.hook.test.tsx}`, `apps/mobile/src/modules/auth/utils/{sign-in-code-error.ts,sign-in-code-error.test.ts}`, `apps/mobile/src/modules/auth/components/create-account/{create-account.hook.ts,create-account.component.tsx,create-account.component.test.tsx}`, `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts`;
  > verified: `npx jest src/modules/auth src/services/api` (71 passed); `tsc --noEmit` and `expo lint` (0 errors) in apps/mobile;
  > deviations: the hook test file is `.hook.test.tsx` (it renders a provider wrapper); tests use `gcTime: Infinity` so react-query timers don't keep Jest open.
### Verification

- [x] **T-06** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0 and the simulator journey matches.
  > ✅ 2026-10-08 14:53 — ran the Verification Plan.
  > files: none (a follow-up commit added `apps/mobile/src/modules/auth/screens/create-account.screen.test.tsx` and an Android-branch test in `create-account.component.test.tsx` for coverage);
  > verified: `node .specs/scripts/run-related-tests.mjs 002` → RELATED TESTS PASSED; `node .specs/scripts/check-coverage.mjs 002` → COVERAGE OK (15 files); `node .specs/scripts/run-e2e.mjs 002` → E2E PASSED (nothing applies); `expo lint` 0 errors (1 existing warning in bottom-modal.tsx) and `tsc --noEmit` exit 0 in apps/mobile. iOS simulator (iPhone 18 Pro, backend with RESEND_API_KEY empty): Continue with email opens Create account matching the design (light); "Ana" + leaving the field shows the name error and a bad border; completing the name clears it (lagoon border); a valid pair turns Get code to sun; tapping it logged the code for the address in the backend, with no error shown; with the backend stopped, tapping shows "No connection…" above the button; editing a field hides it; the back button returns to the sign-in screen.
  > deviations: `npx turbo run check-types --filter=…/mobile` fails on the design-tokens check (tokens.css out of date on main, not touched here), so tsc was run directly. Not verified by hand: dark theme, Español, and the second press within 30 s (the simulator input lagged; covered by the tests: es-ES/pt-BR render, resend-too-soon test).
## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 002` — the related tests pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 002` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` — no errors.
  - `node .specs/scripts/run-e2e.mjs 002` — runs the suites of the apps the spec touches (none for mobile;
    expected to report nothing to run).
- User journey (iOS simulator, backend running locally with `npm run dev` in `apps/backend` and without
  `RESEND_API_KEY`, so codes are logged): open the app → tap "Continue with email" → the Create account screen
  matches the design (back button, intro, two fields, disabled sand button) in light and dark → type "Ana" and
  leave the field: the name error shows → type "Ana Silva" and "ana.silva@gmail.com": the button turns sun →
  tap it: spinner, then the backend log shows the code for that address and no error is shown → tap it again
  within 30 s: no error is shown → stop the backend and tap it: the no-connection message shows → edit the email:
  the message disappears → tap the back button: the sign-in screen shows. Switch the language to Español on
  the sign-in screen and repeat the first steps: the screen is in Spanish and the email arrives with `es`.

## Memory Impact

- `memory/product.md` — Current state: the app's first screen with a server call — Create account asks for a
  code by email; the code screen is next.
- `memory/technical-context.md` — Applications → mobile: TanStack Query installed, `src/services/api` client
  (`ApiError`, `NetworkError`); Fixed conventions: `BackButton` is the standard back button, shared UI
  components `ScreenIntro` and `TextInput`; the form validates with the shared rules (D-02); the tests now exist
  (remove "none exist yet").
- `memory/structure.md` — `apps/mobile`: `src/services/api/`, `src/components/ui/{back-button,screen-intro,text-input}`,
  `src/modules/auth/{hooks,utils}`, the `(private)/auth/create-account` route; the auth screen is no longer a
  placeholder.
- `memory/modules/auth.md` — Boundaries / who can do what: the app collects the name before asking for a code
  and sends it with the verify call (D-01).

## Amendments

- 2026-10-08 — ER-02 edge cases and T-03: before, "while typing, a valid field shows a `lagoon` border and an
  untouched or empty one the `input-line` border" and `TextInput` had `status: "neutral" | "valid" | "error"`;
  after, a valid field keeps the `input-line` border and `status` is `"neutral" | "error"`. Reason: the user asked
  to remove the border color once a field is filled in correctly. Also: the spacer above "Get code" has a 24px
  minimum, so the button no longer touches the fields when the keyboard is open (user feedback on the simulator).

- 2026-10-08 — D-08, ER-03 and T-05: before, the API error was "one message above the CTA (`text-bad`)" that
  "disappears as soon as a field is edited"; after, it is shown in a toast (`Toast` in `src/components/ui/toast`,
  shown through `AlertMessageProvider`/`useAlertMessage` in `src/providers/alert-message`, mounted in the root
  layout) at the top of the screen, which hides by itself after 3 s. Message selection (D-08's key mapping) and
  the other ER-03 behaviors are unchanged. Reason: the user asked for a toast to show API errors, inspired by
  their cine-tasty-mobile `alert-message` provider. Tests: `toast.component.test.tsx`,
  `alert-message.provider.test.tsx`; the create-account tests check the toast instead of the inline text.
  Also `jest.config.js` now uses the `react-native-worklets` Jest resolver, which Reanimated's mock needs.

- 2026-10-08 — ER-03 and T-04: (1) pressing "Get code" now also closes the keyboard (user feedback). (2) The
  `button` type style, used by every CTA label, changed from Nunito 800 / 14.5px to Barlow Condensed 700 / 18px
  in `packages/design-tokens/src/tokens.ts`, uppercase (the user asked for all CTA labels in Barlow Condensed, then uppercase); `tokens.css`
  was regenerated, which also fixes its stale state on `main`. This affects the web buttons too.

## Review

### Round 1 — 2026-10-08 — changes-requested

**Checks**

- lint ✅ (0 errors; 1 existing warning in `bottom-modal.tsx`) · type check ✅ · design-tokens check ✅ (`npx turbo run lint check-types --filter=@rochas-surf-school/mobile`)
- related tests ✅ 96 passed, 12 suites (apps/mobile); design-tokens and web have no test runner
- coverage of the changed lines ✅ `COVERAGE OK`, no coverage-ignore comments in the diff
- e2e ✅ `E2E PASSED` — no suite applies (mobile only)
- iOS simulator (iPhone 18 Pro, dark theme, Español, local backend): Continue with email opens Crear cuenta, all text in Spanish, dark palette; "Ana" + blur → "Escribe tu nombre y apellido." and `bad` border, cleared once the name is valid; valid pair → sun button; tap → spinner, keyboard closes, a code row is created for the address, no toast; second tap within 30 s → no new code, no toast; with the throttler exhausted → toast "Demasiados intentos…" at the top that fades out by itself; back button → sign-in screen.

**Expected Results**

- ER-01 ✅ — tests pass; seen on the simulator in es-ES and dark theme; back button returns to sign-in.
- ER-02 ✅ — every disabled/enabled case is tested; blur error, next and done tested and seen on the simulator. (See F-01 for the amended spacer.)
- ER-03 ❌ — behavior holds on the simulator and in the tests, but the spinner is not asserted by any test (F-02).

**Findings**

- [x] **F-01** (ER-02) — the spacer above "Get code" has an 8px minimum (`min-h-2` in `create-account.component.tsx:90`), but the first amendment fixes it at 24px so the button doesn't touch the fields with the keyboard open. Commit 0e66f7a changed `min-h-6` to `min-h-2` without an amendment. Reproduce: open Create account, focus a field — the gap between the email field and the button is ~8pt. Expected: `min-h-6` (24px), or an amendment recording the new value.
  > ✅ 2026-10-08 16:19 — restored the spacer's 24px minimum (`min-h-6`), as the first amendment says.
  > files: `apps/mobile/src/modules/auth/components/create-account/create-account.component.tsx`;
  > verified: iOS simulator (light, Español), email field focused: the gap between the email field and "Recibir código" is ~24pt (was ~8pt); `npx jest src/modules/auth/components/create-account` passes;
  > deviations: none
- [x] **F-02** (tests) — ER-03 says "while it runs, the button shows a spinner", and no test checks it: "ignores presses while sending" only counts `fetch` calls. Expected: in `create-account.component.test.tsx`, with a pending `fetch`, assert the `ActivityIndicator` is shown and the "Get code" label is gone (and that the label returns after the answer).
  > ✅ 2026-10-08 16:27 — added "shows a spinner instead of the label while sending": with a pending `fetch`, one `ActivityIndicator` is rendered and the "Get code" text is gone; after the 202 the label is back and the spinner gone.
  > files: `apps/mobile/src/modules/auth/components/create-account/create-account.component.test.tsx`;
  > verified: `npx jest src/modules/auth/components/create-account` (37 passed); with the spinner branch removed from the component the new test fails (reverted); `tsc --noEmit` exits 0; `expo lint` 0 errors;
  > deviations: RNTL 14 has no `UNSAFE_*ByType` queries and the indicator has no accessibility role, so the test finds it with `screen.root.queryAll` by host type.
- [x] **F-03** (convention) — `toast.hook.ts:17` declares `type UseToastProps`; `.claude/rules/react.md` §1 puts every type of a component and its hook in `<name>.types.ts`. Expected: move it to `toast.types.ts`.
  > ✅ 2026-10-08 16:29 — moved `UseToastProps` to `toast.types.ts`; the hook imports it from there.
  > files: `apps/mobile/src/components/ui/toast/{toast.hook.ts,toast.types.ts}`;
  > verified: `npx jest src/components/ui/toast src/providers` (7 passed); `tsc --noEmit` exits 0;
  > deviations: none
- [x] **F-04** (convention) — `create-account.types.ts:24` exports `KeyboardReturnKey`, which nothing uses (dead code). Expected: remove it (and the then-unused `TextInputProps` import).
  > ✅ 2026-10-08 16:31 — removed the unused `KeyboardReturnKey` type and its `TextInputProps` import.
  > files: `apps/mobile/src/modules/auth/components/create-account/create-account.types.ts`;
  > verified: `npx jest src/modules/auth` (68 passed); `tsc --noEmit` exits 0;
  > deviations: none

**Notes**

- ER-03's text still says the error is "shown above the button" and that "editing either field hides the message"; the second amendment replaces both with the auto-hiding toast. Consider updating the ER text so it reads as built.
- The `es` locale in the request body was not observed in the backend log (the backend was started outside this session); the component and hook tests cover the mapping for all three languages.
- `AlertMessageProvider` uses `useCallback`/`useMemo` although the React Compiler is on (react.md §4); harmless, could be dropped.
- Side margins use `px-[22px]`/`left-[22px]` like the existing Auth screen, while the tokens have `spacing.screen` = 20. Worth aligning in a later spec.
- The toast overlaps the back button while visible (`pointerEvents="none"`, so the button still works).
- The review ran in a fresh session (not the executor's).

### Round 2 — 2026-10-08 — accepted

**Checks**

- lint ✅ (0 errors; 1 existing warning in `bottom-modal.tsx`) · type check ✅ · design-tokens check ✅ (`npx turbo run lint check-types --filter=@rochas-surf-school/mobile`, 6 tasks successful)
- related tests ✅ 97 passed, 12 suites (apps/mobile); design-tokens and web have no test runner
- coverage of the changed lines ✅ `COVERAGE OK` (20 files), no coverage-ignore comments in the diff
- e2e ✅ `E2E PASSED`, no suite applies (mobile only)
- Mutation check for F-02: with the spinner branch replaced by `false`, "shows a spinner instead of the label while sending" fails; reverted.
- iOS simulator (iPhone 18 Pro, light, Español): Create account with the email field focused, the gap between the field and "Recibir código" is ~25pt.

**Expected Results**

- ER-01 ✅: tests pass; the simulator journey from round 1 still applies (changes since then don't touch navigation or copy).
- ER-02 ✅: every disabled/enabled case is tested; the 24px spacer minimum from the amendment is restored (F-01).
- ER-03 ✅: the request, locale mapping, resend-too-soon, every error case (now shown in the toast, per the amendment) and the spinner while sending are all asserted.

**Findings**

- F-01 ✅ verified: `min-h-6` at `create-account.component.tsx:90`; ~24pt seen on the simulator.
- F-02 ✅ verified: the new test asserts the spinner and the hidden label while pending, and the label after the answer; it fails without the spinner branch.
- F-03 ✅ verified: `UseToastProps` lives in `toast.types.ts`.
- F-04 ✅ verified: `KeyboardReturnKey` and its import are gone.

No new findings.

**Notes**

- `## Memory Impact` doesn't list what the amendments added: the `Toast` component and the `AlertMessageProvider`/`useAlertMessage` provider (API errors in a toast), and the `button` type style now using Barlow Condensed 700 / 18px uppercase in the design tokens, which affects web too. `spec-finish` should record them in `technical-context.md` and `structure.md`.
- The ER-03 text still describes the inline error from before the second amendment (see the round 1 note).
- The review ran in a fresh session (not the executor's).
