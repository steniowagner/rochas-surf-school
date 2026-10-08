---
id: "003"
slug: email-confirm-code-screen
title: Confirm email code screen (verify and resend the sign-in code)
template: quick
status: in-progress
created: 2026-10-08
started: 2026-10-08
base_commit: c7ecb3c839304082bef69f2d1ccae50360988c60
fronts: [mobile]
depends_on: []
---

# 003 — Confirm email code screen (verify and resend the sign-in code)

## Goal

After asking for a sign-in code on the Create account screen, a person lands on the Confirm email screen, where
they type or paste the 6-digit code, the app checks it with `POST /auth/email/verify`, and every answer of that
route is shown as a short translated message. The same screen lets them ask for a new code once 30 seconds have
passed. What happens after a correct code (keeping the session, the waiting-for-approval screen) is the next spec.

## Context

- Requirements: [requirements.md → Email code sign-in](../../../.docs/requirements.md#email-code-sign-in) —
  the person is signed in only with the code sent to their address; wrong, used and locked codes don't sign in.
  [requirements.md → Code expiry and resending](../../../.docs/requirements.md#code-expiry-and-resending) —
  an expired code doesn't sign in; a new code can be asked 30 seconds after the last one.
  [requirements.md → Name before approval](../../../.docs/requirements.md#name-before-approval) — the name
  typed on Create account is sent with the code check, which creates the pending account.
- Design: [`.docs/designs/auth-flow.html`](../../../.docs/designs/auth-flow.html), screen "Código" ("Confirma o
  teu email"): back button, `mail-check` icon in a sand tile, title, text with the email in bold and "Expira em
  10 minutos", six 60px-high code boxes over a hidden numeric input, a message line, the "Confirmar" button, the
  resend line ("Reenviar código em 0:30" → "Reenviar código"), and at the bottom an info box ("Não chegou? Vê a
  pasta de spam ou altera o email").
- API (spec 001, public, throttled 10/min per IP): `POST /auth/email/verify` takes `{ email, code, name }`
  (`name` used only when the account doesn't exist) and answers 200 with
  `{ accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt, user: { id, name, email, role,
  status } }`. Errors (body `{ statusCode, errors: string[], … }`): 401 `signInCode.code.invalid` (no code, wrong
  code, or already used), 401 `signInCode.code.expired`, 401 `signInCode.attempts.exceeded` (5 wrong guesses),
  422 `user.name.*` (name refused when the account is created), 429 `request.rate.limited`, 500
  `INTERNAL_SERVER_ERROR`. `POST /auth/email/code` (resend) is the one spec 002 already calls.
- Existing code this changes (all in `apps/mobile`):
  - `src/components/ui/button.tsx` — `Button` (`TouchableOpacity`, variants) without disabled or loading states.
  - `src/modules/auth/components/create-account/create-account.component.tsx` — builds its own CTA inline
    (`bg-sun`/`bg-sand`, spinner); exposes `onCodeRequested({ name, email })`, which no route passes yet.
  - `src/modules/auth/screens/create-account.screen.tsx` — renders `CreateAccount` without a handler.
  - `src/modules/auth/hooks/use-request-sign-in-code.hook.ts` (treats 429 `signInCode.resend.tooSoon` as
    success) and `src/modules/auth/utils/sign-in-code-error.ts` (`getSignInCodeErrorKey`) — reused for resend.
  - Reused as they are: `BackButton`, `ScreenIntro` (its `description` takes a `ReactNode`), `TextButton`,
    `useAlertMessage` (the toast), `apiPost` / `ApiError` / `NetworkError`.
- Before writing code under `apps/mobile`, load the `vercel-react-native-skills` and
  `vercel-react-best-practices` skills and follow `.claude/rules/react.md` (one folder per component).

## Scope

### Out of scope

- Keeping the session (`expo-secure-store`), the waiting-for-approval screen and routing by account status — the
  next spec. A correct code only calls `onVerified`.
- Signing in from the sign-in screen with an existing account's email (that screen has no email field yet).
- The design's shake animation on a wrong code.
- Reading the clipboard programmatically (`expo-clipboard`) or a "Paste" button.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | `Button` (`src/components/ui/button.tsx`) gains a `loading` prop (shows an `ActivityIndicator` in `theme.onColor` instead of the label, and doesn't call `onPress`) and a disabled look when `disabled` is true (`bg-sand`, label `text-ink-2`, no shadow, `accessibilityState.disabled`). Create account's inline CTA is replaced by `<Button>`, and the Confirm button uses it too; the CTA shape stays as today (`min-h-[54px]`, `rounded-full`). | The user asked to reuse the existing components; two screens with the same CTA must not duplicate it. |
| D-02 | A new generic `OtpInput` (`src/components/ui/otp-input/`, props: `value`, `onChangeText`, `length` default 6, `status` `neutral`/`error`, `editable`, `accessibilityLabel`) draws six boxes (`h-[60px]`, `rounded-control`, `bg-input`, 2px border `border-input-line`; the box of the next digit `border-sun`; all `border-bad` on `error`; digits in Barlow Condensed) over a hidden `TextInput` (`opacity: 0`, covering the boxes, `keyboardType="number-pad"`, `textContentType="oneTimeCode"`, `autoComplete="one-time-code"`, no `maxLength`). Every change is normalized to its digits, cut to `length`. Pasting goes through the hidden input's native paste menu and the OS one-time-code autofill; tapping the boxes focuses it. | Paste works without a clipboard library, and the normalization accepts "123 456" or "Your code: 123456". `maxLength` would cut a pasted text before its digits are extracted. |
| D-03 | On 200 the screen calls its `onVerified(response)` prop once and nothing else; the route passes no handler yet. | Keeping the session and routing by account status is an authentication change for the next spec. |
| D-04 | Code errors are inline, under the boxes (`text-bad`, boxes in `error`), the code is cleared and the input stays focused: `signInCode.code.invalid` → wrong code, `signInCode.code.expired` → expired, `signInCode.attempts.exceeded` → locked. Every other error goes to the toast (`useAlertMessage().show`): a key starting with `user.name.` → name not saved, `request.rate.limited` → `createAccount.errors.tooManyAttempts`, `NetworkError` → `createAccount.errors.noConnection`, anything else (500, unknown key, non-JSON body) → `createAccount.errors.generic`; the code is kept. The inline message disappears as soon as the code changes. | The design shows code errors inline; the toast is how the app already shows transport errors. |
| D-05 | Six digits submit on their own; "Confirm" (enabled only with six digits) submits too. While the request runs, the button shows its spinner, the input isn't editable, and no second request is sent. | The design auto-submits; one request per code avoids burning guesses. |
| D-06 | The resend countdown is computed from timestamps: `resendAvailableAt = now + 30 s` when the screen opens and after each successful resend; the label shows the remaining time as `m:ss` (`0:30` … `0:01`), refreshed every second, and becomes the "Resend code" link at 0. | Survives the app going to the background; matches the backend's 30-second cooldown. |
| D-07 | Resend calls `useRequestSignInCode` with the screen's email (so `{ email, locale }` and 429 `signInCode.resend.tooSoon` treated as success) and shows its errors with `getSignInCodeErrorKey` in the toast; translation keys under `createAccount.errors.*` are reused, not renamed. On success the code and the inline message are cleared and the countdown restarts at 0:30. | Reuse; the cooldown rule is already handled there. |
| D-08 | Create account's route screen passes `onCodeRequested` → `router.push({ pathname: "/auth/confirm-code", params: { email, name } })`. The confirm screen reads them with `useLocalSearchParams`; a missing param is not handled. "Change the email" in the info box calls `router.back()`. | The only way in is Create account, which always sets both. |
| D-09 | The intro icon is Ionicons `mail-open-outline` (28, `theme.grape`), and the title uses `ds-text-screen-title` (as D-03 of spec 002). The info box is a row with Ionicons `information-circle-outline` (17, `theme.ink2`) and the text, `bg-dim`, `border border-line`, `rounded-card`, at the bottom of the screen. | No `mail-check` in Ionicons; the same title token as Create account. |
| D-10 | Copy (pt-BR / en-US / es-ES), adapted from the design's pt-PT: title "Confirme seu e-mail" / "Confirm your email" / "Confirma tu correo"; text "Enviamos um código de 6 dígitos para **{{email}}**. Ele expira em 10 minutos." / "We sent a 6-digit code to **{{email}}**. It expires in 10 minutes." / "Enviamos un código de 6 dígitos a **{{email}}**. Caduca en 10 minutos."; button "Confirmar" / "Confirm" / "Confirmar"; resend "Reenviar código" / "Resend code" / "Reenviar código"; countdown "Reenviar código em {{time}}" / "Resend code in {{time}}" / "Reenviar código en {{time}}"; info "Não chegou? Veja a pasta de spam ou *altere o e-mail*." / "Didn't get it? Check your spam folder or *change the email*." / "¿No te llegó? Revisa la carpeta de spam o *cambia el correo*." (the starred part is a `TextButton`); input label "Código de 6 dígitos" / "6-digit code" / "Código de 6 dígitos"; wrong code "Código incorreto. Tente outra vez." / "Wrong code. Try again." / "Código incorrecto. Inténtalo de nuevo."; expired "Este código expirou. Peça um novo." / "This code has expired. Request a new one." / "Este código caducó. Pide uno nuevo."; locked "Muitas tentativas erradas. Peça um novo código." / "Too many wrong attempts. Request a new code." / "Demasiados intentos fallidos. Pide un código nuevo."; name not saved "Não conseguimos salvar seu nome. Volte e confira." / "We couldn't save your name. Go back and check it." / "No pudimos guardar tu nombre. Vuelve y revísalo.". Keys live under `confirmCode.*`. | The product is in pt-BR, es and en; the design is in pt-PT. |

## Expected Results

### ER-01 — The code screen opens after "Get code" and takes a typed or pasted code

- **Front:** mobile
- **Behavior:** Given a person on Create account, when "Get code" succeeds, then the app opens the Confirm
  email screen with the email and name. Given that screen (en-US), then it shows the back button, the intro
  (title "Confirm your email", text "We sent a 6-digit code to **ana.silva@gmail.com**. It expires in 10
  minutes."), six empty code boxes with the code input focused, a disabled "Confirm" button, "Resend code in
  0:30" and the info box with its "change the email" link. Typing digits fills the boxes in order; "Confirm" is
  enabled only when six digits are there.
- **Edge and error cases:** typing "12a3" leaves `123`; pasting "Your code: 123 456" (one change event) leaves
  `123456`; a pasted text with more than six digits keeps the first six; deleting a digit empties its box and
  disables "Confirm" again; "change the email" and the back button go back to Create account; the screen reads
  the same in pt-BR and es-ES with the D-10 copy.
- **Verify by:** `npx jest src/components/ui/button src/components/ui/otp-input src/modules/auth/components/confirm-code src/modules/auth/components/create-account src/modules/auth/screens` (from `apps/mobile`) — tests "renders the confirm code screen", "keeps only digits", "fills the code from a pasted text", "enables Confirm only with six digits", "goes back from change the email", "opens the confirm code screen after the code is requested"; and the simulator journey: on Create account request a code, copy the code from the email (or the backend log), long-press the boxes, paste, and see the boxes filled.

### ER-02 — Confirming sends the code and handles every answer

- **Front:** mobile
- **Behavior:** Given the screen for `ana.silva@gmail.com` and name "Ana Silva", when the sixth digit is
  entered (or "Confirm" is tapped with six digits), then the app sends one
  `POST {EXPO_PUBLIC_API_URL}/auth/email/verify` with the JSON body
  `{ "email": "ana.silva@gmail.com", "code": "123456", "name": "Ana Silva" }`; while it runs, "Confirm" shows a
  spinner and the input can't be edited; on 200, `onVerified` is called once with the response body and no
  message is shown.
- **Edge and error cases:**
  - 401 `signInCode.code.invalid` → "Wrong code. Try again." under the boxes, boxes in the error state, the code
    cleared, the input focused; 401 `signInCode.code.expired` → "This code has expired. Request a new one." the
    same way; 401 `signInCode.attempts.exceeded` → "Too many wrong attempts. Request a new code." the same way.
    Typing a digit after any of them hides the message and the error state.
  - In the toast, the code kept: 422 with a `user.name.*` key → "We couldn't save your name. Go back and check
    it."; 429 `request.rate.limited` → the too-many-attempts message; no connection (`fetch` rejects) → the
    no-connection message; 500, an unknown key, or a body that isn't JSON → the generic message.
  - In every error case `onVerified` isn't called; a second tap on "Confirm" while the request runs sends
    nothing.
- **Verify by:** `npx jest src/modules/auth/hooks src/modules/auth/utils src/modules/auth/components/confirm-code` (from `apps/mobile`) — tests "sends the code to verify", "calls onVerified on success", "shows the inline message for each code error" (one case per key), "shows the toast for each other error" (one case per answer), "sends one request at a time".

### ER-03 — Resend becomes available after 30 seconds

- **Front:** mobile
- **Behavior:** Given the screen just opened, then it shows "Resend code in 0:30", counting down each second
  ("0:29", …, "0:01"); at 30 seconds it shows the "Resend code" link. When the person taps it, then the app sends
  `POST {EXPO_PUBLIC_API_URL}/auth/email/code` with `{ "email": "ana.silva@gmail.com", "locale": "en" }`; on 202
  (or 429 `signInCode.resend.tooSoon`) the code and the inline message are cleared and "Resend code in 0:30"
  starts again.
- **Edge and error cases:** the countdown is based on timestamps, so advancing the clock 45 s at once shows the
  link; while the resend runs, a second tap sends nothing; 429 `request.rate.limited`, 502
  `signInCode.email.sendFailed`, no connection and any other error show the Create account messages for them in
  the toast and keep the "Resend code" link.
- **Verify by:** `npx jest src/modules/auth/components/confirm-code -t "resend"` (from `apps/mobile`) — tests "counts down to resend", "resends the code and restarts the countdown", "treats resend too soon as success", "shows the toast when resend fails", using Jest fake timers.

## Tasks

### Mobile (`apps/mobile`)

- [x] **T-01** — Add the `loading` prop and the disabled look to `Button` in `src/components/ui/button.tsx`
  (D-01) and replace Create account's inline CTA in
  `src/modules/auth/components/create-account/create-account.component.tsx` with it. Tests in
  `src/components/ui/button.test.tsx` (variants, disabled look and state, loading shows the spinner and ignores
  presses); the existing Create account tests keep passing.
  Covers: enabling · Done when: `npx jest src/components/ui/button src/modules/auth/components/create-account`
  passes.
  > ✅ 2026-10-08 — added `loading` and the disabled look to Button and replaced Create account CTA with it (Button now sets accessibilityLabel from its label so it stays findable while loading); files: `apps/mobile/src/components/ui/button.tsx`, `apps/mobile/src/components/ui/button.test.tsx`, `apps/mobile/src/modules/auth/components/create-account/create-account.component.tsx`; verified: `npx jest src/components/ui/button src/modules/auth/components/create-account` (44 passed), tsc and eslint clean; deviations: none
- [x] **T-02** — Create `OtpInput` in `src/components/ui/otp-input/` (`otp-input.component.tsx`,
  `otp-input.types.ts`, `index.ts`, and `otp-input.hook.ts` if it holds logic) per D-02, with
  `otp-input.component.test.tsx`: renders six boxes, keeps only digits, fills from a pasted text, cuts to six,
  error state, tapping the boxes focuses the input, not editable when `editable={false}`.
  Covers: ER-01 · Done when: `npx jest src/components/ui/otp-input` passes.
  > ✅ 2026-10-08 — created OtpInput (component, hook, types, index, test); an extra `autoFocus` prop was added for the focused input of ER-01; files: `apps/mobile/src/components/ui/otp-input/{index.ts,otp-input.component.tsx,otp-input.hook.ts,otp-input.types.ts,otp-input.component.test.tsx}`; verified: `npx jest src/components/ui/otp-input` (8 passed), tsc and eslint clean; deviations: `autoFocus` prop added to D-02 props; boxes sit in a Pressable that also focuses the input, so tapping them is testable
- [x] **T-03** — Add `src/modules/auth/hooks/use-verify-sign-in-code.hook.ts` (`useMutation` over
  `apiPost("/auth/email/verify", { email, code, name })`, typed response) and
  `src/modules/auth/utils/verify-code-error.ts` (error → `{ key, placement: "inline" | "toast" }` per D-04), with
  `use-verify-sign-in-code.hook.test.tsx` and `verify-code-error.test.ts` covering every mapped answer.
  Covers: ER-02 · Done when: `npx jest src/modules/auth/hooks src/modules/auth/utils` passes.
  > ✅ 2026-10-08 — added the verify mutation hook and the error mapper (+ tests); files: `apps/mobile/src/modules/auth/hooks/use-verify-sign-in-code.hook.ts`, `apps/mobile/src/modules/auth/hooks/use-verify-sign-in-code.hook.test.tsx`, `apps/mobile/src/modules/auth/utils/verify-code-error.ts`, `apps/mobile/src/modules/auth/utils/verify-code-error.test.ts`; verified: `npx jest src/modules/auth/hooks src/modules/auth/utils` (28 passed), tsc and eslint clean; deviations: none
- [x] **T-04** — Build `ConfirmCode` in `src/modules/auth/components/confirm-code/` (component, hook, types,
  index; props `email`, `name`, `onVerified`) with the layout of ER-01 (`BackButton`, `ScreenIntro`, `OtpInput`,
  message line, `Button`, info box with `TextButton`), auto-submit and the verify flow of ER-02, and the
  `confirmCode.*` strings of D-10 in `src/i18n/messages/{en-US,es-ES,pt-BR}.ts`. The resend line is left to
  T-05. Tests in
  `confirm-code.component.test.tsx` for ER-01 (rendering in en-US and pt-BR, digits, paste, Confirm enabled,
  change the email) and ER-02 (every case).
  Covers: ER-01, ER-02 · Done when: `npx jest src/modules/auth/components/confirm-code` passes.
  > ✅ 2026-10-08 — built ConfirmCode (component, hook, types, index, test) with auto-submit, inline/toast errors and the confirmCode.* strings in the three locales; OtpInput gained an optional `inputRef` so the screen can refocus it after a wrong code; files: `apps/mobile/src/modules/auth/components/confirm-code/{index.ts,confirm-code.component.tsx,confirm-code.hook.ts,confirm-code.types.ts,confirm-code.component.test.tsx}`, `apps/mobile/src/components/ui/otp-input/{otp-input.component.tsx,otp-input.hook.ts,otp-input.types.ts}`, `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts`; verified: `npx jest src/modules/auth/components/confirm-code` (21 passed), tsc and eslint clean; deviations: `onVerified` is optional (D-03: the route passes none); OtpInput `inputRef` prop added
- [x] **T-05** — Add the resend countdown and link to `ConfirmCode` (D-06, D-07), with the ER-03 tests (named
  with "resend") in `confirm-code.component.test.tsx` using fake timers.
  Covers: ER-03 · Done when: `npx jest src/modules/auth/components/confirm-code -t "resend"` passes.
  > ✅ 2026-10-08 — added the timestamp-based resend countdown and the Resend code link to ConfirmCode; files: `apps/mobile/src/modules/auth/components/confirm-code/confirm-code.hook.ts`, `apps/mobile/src/modules/auth/components/confirm-code/confirm-code.component.tsx`, `apps/mobile/src/modules/auth/components/confirm-code/confirm-code.component.test.tsx`; verified: `npx jest src/modules/auth/components/confirm-code -t "resend"` (resend tests passed; whole file 30 passed), tsc and eslint clean; deviations: none
- [x] **T-06** — Add the route `src/app/(private)/auth/confirm-code.tsx` and
  `src/modules/auth/screens/confirm-code.screen.tsx` (reads `email` and `name` with `useLocalSearchParams`,
  renders `ConfirmCode`), and make `create-account.screen.tsx` pass `onCodeRequested` that pushes the route with
  both params (D-08). Tests: `confirm-code.screen.test.tsx` (renders with the params) and
  `create-account.screen.test.tsx` ("opens the confirm code screen after the code is requested").
  Covers: ER-01 · Done when: `npx jest src/modules/auth/screens` passes.
  > ✅ 2026-10-08 — added the confirm-code route and screen, and Create account screen now pushes it with email and name; files: `apps/mobile/src/app/(private)/auth/confirm-code.tsx`, `apps/mobile/src/modules/auth/screens/confirm-code.screen.tsx`, `apps/mobile/src/modules/auth/screens/confirm-code.screen.test.tsx`, `apps/mobile/src/modules/auth/screens/create-account.screen.tsx`, `apps/mobile/src/modules/auth/screens/create-account.screen.test.tsx`; verified: `npx jest src/modules/auth/screens` (3 passed), tsc and eslint clean; deviations: none

### Verification

- [ ] **T-07** — Run every command in the Verification Plan from the repo root; all pass. Then follow the
  simulator journey of ER-01 (paste a real code) and check that a correct code calls nothing visible and a wrong
  one shows "Wrong code. Try again.". Record the output summary as evidence.
  Covers: all · Done when: every command exits 0 and the journey behaves as described.
  > ⛔ 2026-10-08 — automated part done: `node .specs/scripts/run-related-tests.mjs 003` (RELATED TESTS PASSED, 126 tests),
  > `node .specs/scripts/check-coverage.mjs 003` (COVERAGE OK, 13 files), `npx turbo run lint check-types --filter=@rochas-surf-school/mobile`
  > (0 errors; one pre-existing warning in `bottom-modal.tsx`); e2e not run (the spec changes no backend code). Simulator journey blocked:
  > on Create account the new `Button` showed its disabled and enabled looks, but "Get code" for `spec003.test@example.com` got the toast
  > "We couldn't send the email" (502 `signInCode.email.sendFailed`) from the running backend, so the Confirm email screen was never reached and
  > no code could be pasted. Unblock: a code the backend can deliver to a mailbox you can read, or the backend running without `RESEND_API_KEY`
  > (codes are then logged), or a review account from `REVIEW_ACCOUNTS`; then do the ER-01 journey (paste a code, wrong code, resend after 30 s).

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 003` — the related tests pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 003` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` — no errors.
- Manual (iOS simulator, backend running with `npm run dev`): the ER-01 journey — Create account → "Get code"
  → Confirm email screen; copy the code from the email or the backend log, long-press the boxes and paste; a
  wrong code shows the inline message; after 30 s "Resend code" sends a new code.

## Memory Impact

- `memory/product.md` — Current state: the app's Confirm email screen verifies the code (typed or pasted) and
  resends it after 30 s; what happens after a correct code is still not built.
- `memory/structure.md` — `apps/mobile`: the `(private)/auth/confirm-code.tsx` route,
  `confirm-code.screen.tsx`, `components/confirm-code`, `hooks/use-verify-sign-in-code.hook.ts`,
  `utils/verify-code-error.ts`, and `components/ui/otp-input` (Button now has loading/disabled states).
- `memory/modules/auth.md` — Who can do what: in the app the code is checked on the Confirm email screen,
  sending the name kept from Create account; Spec history: add `003-email-confirm-code-screen`.

## Amendments

## Review
