---
id: "012"
slug: onboarding-school-rules
title: Onboarding School rules step (mobile)
status: in-progress
created: 2026-10-11
started: 2026-10-11
base_commit: 248126d896b4da5464137165b6fb2f72f8c614df
fronts: [mobile]
depends_on: []
---

# 012 — Onboarding School rules step (mobile)

## Goal

An approved account finishes onboarding in the app: the School rules step (design LOGIN-08) shows the current
school rules from the backend in a reusable list, and once the person ticks "Li e aceito as regras e os termos da
Rocha's Surf School." and taps "Entrar no app", the app records the acceptance of that version and opens the home
of the account's role. The app starts using the account's `rulesAccepted`, so an account with a WhatsApp number
that hasn't accepted the current version lands on this step — at onboarding, and again at the next sign-in after
an admin changes the rules. The list is built to be reused by the later screens that show the rules.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: School rules (versioned, accepted per
  version, version 0 needs no acceptance), User (`approved` → onboarding: WhatsApp number + school rules); decisions
  "Onboarding is the WhatsApp number first, then the school rules", "Every change to the school rules asks
  everyone to accept them again; reordering doesn't" and "Text written by admins is shown as written".
- Requirements:
  [requirements.md → Onboarding after approval](../../../.docs/requirements.md#onboarding-after-approval) — the
  approved user continues only after adding the WhatsApp number and accepting the rules;
  [requirements.md → Accepting the rules](../../../.docs/requirements.md#accepting-the-rules) — the newly approved
  user accepts the current version before continuing;
  [requirements.md → Reading the rules](../../../.docs/requirements.md#reading-the-rules) — only the reusable list
  is built here; a screen to read the rules at any time is out of scope;
  [requirements.md → Accepting again after a change](../../../.docs/requirements.md#accepting-again-after-a-change)
  — the app side: the step shows again when `rulesAccepted` is `false` (D-03, D-08);
  [requirements.md → Rule changes while an account was away](../../../.docs/requirements.md#rule-changes-while-an-account-was-away)
  — covered by the same routing: a returning account with `rulesAccepted: false` lands on the step.
- Design: `.docs/designs/auth-flow.html` → LOGIN-08 "School rules" (the "Login Screen" component, `screen="regras"`):
  shield icon tile (`bg-sand`, `grape` icon), eyebrow, title, description, a `bg-surface` card with a `border-line`
  border holding the numbered rules (number in Barlow Condensed `sun`, title bold, description `ink-2`, a
  `line` divider between rows), and a fixed footer (`bg-surface`, top border `line`) with the checkbox row and the
  primary CTA. The design's text is pt-PT; the app's pt-BR copy is in D-07.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Applications →
  `apps/mobile` (TanStack Query, the `fetch` client in `src/services/api/`), Fixed conventions (Mobile shared UI,
  Mobile routes, Mobile flows, Design system, CTA labels, Naming), Authentication (`rulesAccepted`, the account
  shape, Mobile session, Mobile sign-out), Error handling, Automated validation.
- Module memory: [modules/school-rules.md](../../memory/modules/school-rules.md) — reading and accepting rules,
  the error keys of an acceptance.
- Backend contract (spec 011, finished — no backend change here):
  - `GET /school-rules` (access token; any approved account) → 200 `{ version: number, rules: [{ id, title,
    description, index }] }`, rules in the admins' order; a non-approved account gets 403
    `user.status.notApproved`; no/invalid token 401 `auth.token.invalid`.
  - `POST /school-rules/acceptances` (access token), body `{ "version": <integer> }` → 200 with the account
    `{ id, name, email, role, status, createdAt, whatsappNumber, whatsappVisible, rulesAccepted }`; 409
    `schoolRules.version.outdated` with `details: { currentVersion }`; 422 `schoolRules.version.*`; 403
    `user.status.notApproved`; 401 `auth.token.invalid`. Accepting an already-accepted version answers 200.
  - Every account answer (verify, refresh, `GET /auth/me`, `PUT /auth/me/whatsapp`) already carries
    `rulesAccepted`; `true` when the current version is 0.
- Existing code this builds on (`apps/mobile/src/`):
  - `modules/onboarding/screens/school-rules.screen.tsx` — a `FlowPlaceholder` with `flows.schoolRules`; route
    `app/(onboarding)/onboarding/school-rules.tsx` (`routes.onboarding.schoolRules`).
  - `navigation/root-navigator/root-navigator.hook.ts` — `ONBOARDING_COMPLETED = false`, so role homes are
    unreachable; `navigation/resolve-flow.ts` (`resolveFlow`, `onboardingStep`, `flowEntryRoute`) and
    `resolve-flow.types.ts` (`SessionUser` without `rulesAccepted`).
  - `navigation/root-navigator/root-navigator.component.tsx` — when the flow changes, the guards fall back to
    `index`, which redirects to `flowEntryRoute`.
  - `services/api/api.client.ts` — `apiPost` and `apiPut` only (no GET).
  - `modules/onboarding/hooks/use-save-whatsapp.hook.ts` — the pattern for a protected mutation: `setSession`
    on success, toasts through `useAlertMessage()`, 401 `auth.token.invalid` → `whatsapp.sessionExpired` toast +
    `useSignOut().signOut()`, `NetworkError` → `createAccount.errors.noConnection`, else
    `createAccount.errors.generic`.
  - `modules/onboarding/components/whatsapp/` — the layout pattern of an onboarding step (`ScreenIntro`, safe-area
    padding, `Button` at the bottom).
  - `components/ui/` — `Button` (`disabled`, `loading`), `ScreenIntro` (`iconTileClassName`, `eyebrow`); no
    checkbox exists.
  - Tests that build a `SessionUser` (they gain `rulesAccepted`): `providers/session/session.provider.test.tsx`,
    `navigation/root-navigator/root-navigator.component.test.tsx`, `navigation/resolve-flow.test.ts`,
    `modules/auth/screens/confirm-code.screen.test.tsx`, `modules/auth/hooks/use-sign-out.hook.test.tsx`,
    `modules/onboarding/components/whatsapp/whatsapp.component.test.tsx`,
    `modules/pending/components/pending/pending.component.test.tsx`,
    `modules/onboarding/hooks/use-save-whatsapp.hook.test.tsx`.

## Scope

### In scope

- `apiGet` in the mobile API client.
- `rulesAccepted` on the session user and the real `onboardingCompleted` in the routing.
- A shared `Checkbox` UI component.
- A `school-rules` mobile module with the reusable `SchoolRulesList` and the `useSchoolRules` query hook.
- The `useAcceptSchoolRules` mutation.
- The School rules screen replacing the placeholder, with its copy in pt-BR, es-ES and en-US.

### Out of scope

- Any backend, module or shared-package change.
- The "Lê também os Termos e a Política de privacidade" line and its links (D-06).
- A screen for approved users to read the rules at any time, and the admin's rules-management screen (they will
  reuse the list in their own specs).
- A "the rules changed" variant of the screen (D-08).
- Keeping the session across restarts, renewing the access token, and refreshing the session while the app is
  open (a rule change is seen at the next sign-in).
- A back button or sign-out on this screen (the design has neither).
- The real student, instructor and admin home screens (they stay placeholders).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The rules list lives in a new mobile module `src/modules/school-rules/`: `components/school-rules-list/` (`SchoolRulesList`, no props) fetches its own data through `hooks/use-school-rules.hook.ts` (`useSchoolRules()`: `useQuery` with key `["school-rules"]`, `apiGet("/school-rules", { accessToken })`). The screen calls the same hook to read the `version`; TanStack Query shares the cache, so there is one request. | The list will be reused by other screens (reading the rules, admin) without each screen wiring the fetch; one cache keeps the shown text and the accepted version the same. |
| D-02 | The app declares its own types mirroring the API (`SchoolRule { id, title, description, index }`, `SchoolRules { version, rules }` in `src/modules/school-rules/school-rules.types.ts`); `apps/mobile` doesn't depend on `@rochas-surf-school/school-rules`. | The app talks to the backend over HTTP only (Architecture → Mobile), as `SessionUser` already does. |
| D-03 | `SessionUser` gains `rulesAccepted: boolean`. `isOnboardingCompleted(user)` in `src/navigation/resolve-flow.ts` returns `!!user?.whatsappNumber && user.rulesAccepted === true`; `useRootNavigator` passes it to `resolveFlow` instead of the fixed `false`. `onboardingStep` is unchanged (WhatsApp first, then school rules). | Routing stays a pure function of the session's user, decided in one file; the backend already sends `true` when the version is 0, so the app needs no version logic. |
| D-04 | After a successful accept the app only calls `setSession({ user, tokens })` with the returned account — no `router` call. The onboarding guard turns off, the stack falls back to `index`, which redirects to the role's home. | Same mechanism as sign-out; one place decides where an account goes, and the onboarding routes leave the history. |
| D-05 | An empty list (version above 0, every rule deleted) shows "A escola ainda não tem regras." inside the card; the checkbox and CTA work as usual. | The backend still requires the acceptance (spec 011, D-04); hiding the CTA would strand the person. |
| D-06 | The design's "Lê também os Termos e a Política de privacidade completos." line is not built. | Neither page exists (the web app is still its template, and a terms page is out of scope in `product.md`); a link to nothing is worse than none. The spec that builds the pages adds it. |
| D-07 | Copy (pt-BR / es-ES / en-US): eyebrow "Último passo" / "Último paso" / "Last step"; title "Regras da escola" / "Normas de la escuela" / "School rules"; description "Poucas e simples — para que as aulas corram bem para todos." / "Pocas y sencillas — para que las clases salgan bien para todos." / "Few and simple — so classes go well for everyone."; checkbox "Li e aceito as regras e os termos da Rocha's Surf School." / "He leído y acepto las normas y los términos de Rocha's Surf School." / "I have read and accept the rules and terms of Rocha's Surf School."; CTA "Entrar no app" / "Entrar en la app" / "Enter the app" (uppercase through the `button` style); empty "A escola ainda não tem regras." / "La escuela todavía no tiene normas." / "The school has no rules yet."; load error "Não foi possível carregar as regras." / "No se pudieron cargar las normas." / "Couldn't load the rules."; retry "Tentar novamente" / "Intentar de nuevo" / "Try again"; outdated "As regras mudaram. Leia de novo e aceite." / "Las normas cambiaron. Léelas de nuevo y acéptalas." / "The rules changed. Read them again and accept." | The design is pt-PT; the product is pt-BR and already says "o app". |
| D-08 | Accepting again after a rule change uses the same screen and copy, "Último passo" included. | It is still the last step before the app; the backend sends no signal to tell the two cases apart, and the design has no variant. |
| D-09 | Errors: a failed load shows the load-error message and a "Tentar novamente" button inside the card (it refetches). A 401 `auth.token.invalid` — on the load or the accept — shows `whatsapp.sessionExpired` in the toast and calls `useSignOut().signOut()`. On the accept: 409 `schoolRules.version.outdated` refetches `["school-rules"]`, unticks the checkbox and shows the outdated toast; `NetworkError` shows `createAccount.errors.noConnection`; anything else (403, 422, 500, unknown) shows `createAccount.errors.generic`. After an accept error other than 409 the checkbox stays ticked. | The person accepts only text they saw (spec 011, D-02); the other messages reuse the WhatsApp step's patterns and keys. |
| D-10 | `Checkbox` in `src/components/ui/checkbox/` (`checked`, `onChange(checked)`, `label`, `disabled`): one `Pressable` row (`accessibilityRole="checkbox"`, `accessibilityState={{ checked, disabled }}`, label as its accessible name, at least 44 pt tall) with a 26×26 box with an 8 px radius and a 2 px border — `bg-lagoon`/`border-lagoon` with a white `Ionicons` `checkmark` when checked, `bg-input`/`border-input-line` when not — and the label in `text-ink` bold body type. Disabled: ignores presses and is shown at reduced opacity. Any missing value becomes a token, never a raw value. | It isn't a button, so it uses `Pressable` (CLAUDE.md → Rules for apps/mobile); shared because other forms will need it. |
| D-11 | Rules are shown in the order the API returns them, numbered by position: `String(position).padStart(2, "0")` ("01", "02"…), in Barlow Condensed (`ds-text-*` number style or a token-based class) and `text-sun`. Title and description are shown as written, never translated. | Matches the design; numbers use Barlow Condensed (design system section 08); admin text is never translated. |
| D-12 | While the rules load (spinner in the card) or after a load error, the checkbox and the CTA are disabled. The CTA is enabled only when the rules are loaded and the box is ticked. While the accept is in flight the CTA shows `loading` and ignores presses. The version sent is the one in the `["school-rules"]` cache. | The person can't accept text they haven't been shown, and a double tap sends one request. |

## Expected Results

### ER-01 — The step shows the rules in order

- **Front:** mobile
- **Behavior:** Given an approved account on the School rules step and `GET /school-rules` answers
  `{ version: 3, rules: [A, B, C] }`, when the screen opens, then it shows a loading indicator in the card until the
  answer arrives, then the shield icon, "Último passo", the title "Regras da escola" as a header, the description,
  and the three rules in the order A, B, C numbered "01", "02", "03", each with its title and description exactly
  as the API sent them.
- **Edge and error cases:** the request carries `Authorization: Bearer <accessToken>` of the session; twelve
  rules are numbered up to "12" and the list scrolls while the footer stays visible.
- **Verify by:** `npx jest src/modules/school-rules -t "shows the rules in order"` and
  `npx jest src/modules/onboarding/components/school-rules -t "shows the intro"` (from `apps/mobile`); user journey
  in the Verification Plan.

### ER-02 — "Entrar no app" is enabled only while the box is ticked

- **Front:** mobile
- **Behavior:** Given the rules are loaded, when the screen opens the checkbox is unchecked and "Entrar no app" is
  disabled (pressing it sends nothing); when the person ticks "Li e aceito as regras e os termos da Rocha's Surf
  School." (tapping the box or its text), the checkbox is checked and the CTA is enabled; ticking it again unchecks
  it and disables the CTA.
- **Edge and error cases:** the checkbox exposes `accessibilityRole="checkbox"` with its `checked` state; a
  disabled `Checkbox` ignores presses.
- **Verify by:** `npx jest src/components/ui/checkbox` and
  `npx jest src/modules/onboarding/components/school-rules -t "enables the CTA only when ticked"` (from
  `apps/mobile`).

### ER-03 — An empty list can still be accepted

- **Front:** mobile
- **Behavior:** Given `GET /school-rules` answers `{ version: 4, rules: [] }`, when the screen opens, then the card
  shows "A escola ainda não tem regras." and no numbered row, and ticking the box and pressing the CTA sends
  `POST /school-rules/acceptances` with `{ "version": 4 }`.
- **Edge and error cases:** none beyond the above.
- **Verify by:** `npx jest src/modules/school-rules -t "empty"` and
  `npx jest src/modules/onboarding/components/school-rules -t "accepts an empty list"` (from `apps/mobile`).

### ER-04 — A failed load can be retried

- **Front:** mobile
- **Behavior:** Given `GET /school-rules` fails (a 500 or no connection), when the screen opens, then the card
  shows "Não foi possível carregar as regras." and a "Tentar novamente" button, and the checkbox and the CTA are
  disabled; pressing "Tentar novamente" requests the rules again, and when that succeeds the rules show and the
  checkbox works.
- **Edge and error cases:** a 401 `auth.token.invalid` on the load shows "Sua sessão expirou. Entre novamente." in
  the toast and signs out (the app returns to the sign-in screen).
- **Verify by:** `npx jest src/modules/school-rules -t "retries after a failed load"` and
  `-t "signs out when the session expired"`, and
  `npx jest src/modules/onboarding/components/school-rules -t "disabled while the rules can't be shown"` (from
  `apps/mobile`).

### ER-05 — Accepting opens the role's home

- **Front:** mobile
- **Behavior:** Given an approved student with a WhatsApp number and `rulesAccepted: false` on the School rules step
  with version 3 loaded, when they tick the box and press "Entrar no app", then the app sends
  `POST /school-rules/acceptances` with `{ "version": 3 }` and the access token, the CTA shows a spinner while it
  waits, and on 200 the session's user becomes the returned account (`rulesAccepted: true`) and the app shows the
  student home (`/student`); going back doesn't return to any onboarding screen.
- **Edge and error cases:** an instructor opens `/instructor` and an admin `/admin`; two quick presses send one
  request.
- **Verify by:** `npx jest src/modules/onboarding/hooks/use-accept-school-rules.hook.test.tsx -t "puts the account in the session"`
  and `npx jest src/modules/onboarding/components/school-rules -t "opens the role home"` (from `apps/mobile`);
  user journey in the Verification Plan.

### ER-06 — The routing follows `rulesAccepted`

- **Front:** mobile
- **Behavior:** Given an approved account in the session, the app opens:
  - the School rules step (`/onboarding/school-rules`) when it has a WhatsApp number and `rulesAccepted: false`;
  - its role's home when it has a WhatsApp number and `rulesAccepted: true`;
  - the WhatsApp step (`/onboarding`) when it has no WhatsApp number, whatever `rulesAccepted` is.
- **Edge and error cases:** an account that finished onboarding earlier and signs in after an admin changed the
  rules (`rulesAccepted: false`) lands on the School rules step; non-approved statuses keep their flows.
- **Verify by:** `npx jest src/navigation -t "onboarding completed"` (from `apps/mobile`); user journey in the
  Verification Plan.

### ER-07 — An outdated version reloads the rules

- **Front:** mobile
- **Behavior:** Given the box is ticked and `POST /school-rules/acceptances` answers 409
  `schoolRules.version.outdated` with `details: { currentVersion: 4 }`, when the person presses the CTA, then the
  toast shows "As regras mudaram. Leia de novo e aceite.", the rules are requested again and the new list shows,
  the box is unchecked and the CTA disabled; ticking again and pressing the CTA sends `{ "version": 4 }`.
- **Edge and error cases:** the session is not changed by the 409.
- **Verify by:** `npx jest src/modules/onboarding/hooks/use-accept-school-rules.hook.test.tsx -t "outdated"` and
  `npx jest src/modules/onboarding/components/school-rules -t "outdated"` (from `apps/mobile`).

### ER-08 — Other accept errors show a toast and allow a retry

- **Front:** mobile
- **Behavior:** Given the box is ticked, when the accept fails, then:
  - 401 `auth.token.invalid` → "Sua sessão expirou. Entre novamente." and the app signs out;
  - no connection → "Sem conexão. Verifique sua internet e tente de novo." (`createAccount.errors.noConnection`);
  - 403, 422, 500 or an unknown answer → the generic message (`createAccount.errors.generic`);
  and, except after the 401, the box stays ticked, the session is unchanged and the CTA can be pressed again.
- **Edge and error cases:** the messages follow the app language.
- **Verify by:** `npx jest src/modules/onboarding/hooks/use-accept-school-rules.hook.test.tsx -t "error"` (from
  `apps/mobile`).

### ER-09 — The screen speaks the app's three languages

- **Front:** mobile
- **Behavior:** Given the app language is pt-BR, es-ES or en-US, when the School rules step opens, then the
  eyebrow, title, description, checkbox label, CTA and the empty, load-error, retry and outdated messages are the
  D-07 texts of that language; the rules' text is the same in all three.
- **Edge and error cases:** none.
- **Verify by:** `npx jest src/modules/onboarding/components/school-rules -t "in %s"` and
  `npx jest src/modules/school-rules -t "in %s"` (from `apps/mobile`).

## Tasks

### Mobile (`apps/mobile`)

- [x] **T-01** — Add `apiGet<T>(path, options?)` to `src/services/api/api.client.ts` (method `GET`, no body, with
  `Authorization: Bearer <token>` when `accessToken` is given; same `ApiError` / `NetworkError` handling), exported
  from `src/services/api/index.ts`. Tests in `src/services/api/api.client.test.ts`: GETs the base URL + path
  without a body; sends the bearer header only when a token is given; returns the body on 200; throws `ApiError`
  on 401 and `NetworkError` when `fetch` rejects.
  Covers: enabling · Done when: `npx jest src/services/api` passes (from `apps/mobile`).
  > ✅ 2026-10-11 — added `apiGet` (the shared `request` now takes `GET`, sending no body and no Content-Type); files: `apps/mobile/src/services/api/api.client.ts`, `apps/mobile/src/services/api/index.ts`, `apps/mobile/src/services/api/api.client.test.ts`; verified: `npx jest src/services/api` (16 passed); deviations: none

- [x] **T-02** — Add `rulesAccepted: boolean` to `SessionUser` (`src/navigation/resolve-flow.types.ts`), add
  `isOnboardingCompleted(user)` to `src/navigation/resolve-flow.ts` (D-03) and use it in
  `src/navigation/root-navigator/root-navigator.hook.ts` instead of `ONBOARDING_COMPLETED`. Add `rulesAccepted` to
  every test fixture that builds a session user (the files listed in Context). Tests: in `resolve-flow.test.ts`,
  `describe("onboarding completed")` with `isOnboardingCompleted` for (number, true) → true, (number, false) →
  false, (no number, true) → false, `null` → false; in `root-navigator.component.test.tsx` (`renderRouter`), under
  the same describe name, the three cases of ER-06 (school-rules step, role home for student/instructor/admin,
  WhatsApp step).
  Covers: ER-06 · Done when: `npx jest src/navigation` passes and
  `npx turbo run check-types --filter=@rochas-surf-school/mobile` exits 0.
  > ✅ 2026-10-11 — `SessionUser.rulesAccepted`, `isOnboardingCompleted(user)` used by `useRootNavigator`; the root-navigator test no longer mocks `resolveFlow` (its accounts now carry a number and `rulesAccepted` for the role homes); new `describe("onboarding completed")` in both test files; the sign-in response type in `use-verify-sign-in-code.hook.ts` gained `rulesAccepted`; files: `apps/mobile/src/navigation/resolve-flow.ts`, `resolve-flow.types.ts`, `resolve-flow.test.ts`, `root-navigator/root-navigator.hook.ts`, `root-navigator/root-navigator.component.test.tsx`, `apps/mobile/src/modules/auth/hooks/use-verify-sign-in-code.hook.ts`, fixtures in `providers/session/session.provider.test.tsx`, `modules/auth/screens/confirm-code.screen.test.tsx`, `modules/auth/hooks/use-sign-out.hook.test.tsx`, `modules/onboarding/components/whatsapp/whatsapp.component.test.tsx`, `modules/onboarding/hooks/use-save-whatsapp.hook.test.tsx`, `modules/pending/components/pending/pending.component.test.tsx` (all under `apps/mobile/src/`); verified: `npx jest src/navigation` (114 passed), whole mobile `npx jest` passes, `npx turbo run check-types --filter=@rochas-surf-school/mobile` exit 0; deviations: removed the `resolveFlow` mock from the root-navigator test (it only existed because onboarding was never completed)

- [x] **T-03** — Create `src/components/ui/checkbox/` (`checkbox.component.tsx`, `checkbox.types.ts`, `index.ts`)
  per D-10, following `.claude/rules/react.md`. Tests in `checkbox.component.test.tsx`: renders the label with role
  `checkbox` and `checked: false`; pressing the label calls `onChange(true)`; when `checked` it exposes
  `checked: true` and shows the check mark, and a press calls `onChange(false)`; when `disabled` a press calls
  nothing.
  Covers: ER-02 · Done when: `npx jest src/components/ui/checkbox` passes.
  > ✅ 2026-10-11 — shared `Checkbox` (Pressable row, role checkbox, 26×26 box, check mark in `theme.onColor`); the 8 px box radius was missing, so added token `radii.checkbox` (CSS regenerated, `rounded-checkbox` in Tailwind); files: `apps/mobile/src/components/ui/checkbox/{checkbox.component.tsx,checkbox.types.ts,index.ts,checkbox.component.test.tsx}`, `packages/design-tokens/src/tokens.ts`, `packages/design-tokens/src/tokens.css`, `apps/mobile/tailwind.config.ts`; verified: `npx jest src/components/ui/checkbox` (4 passed), mobile lint + check-types exit 0; deviations: new radius token (D-10 asks for a token when a value is missing)

- [ ] **T-04** — Create the `school-rules` mobile module: `src/modules/school-rules/school-rules.types.ts` (D-02);
  `hooks/use-school-rules.hook.ts` (D-01; a 401 `auth.token.invalid` shows `whatsapp.sessionExpired` and calls
  `useSignOut().signOut()` once, D-09); `components/school-rules-list/` (`.component.tsx`, `.hook.ts` if needed,
  `.types.ts`, `index.ts`): the `bg-surface` `rounded-card` `border-line` card with a spinner while loading, the
  load-error message with a "Tentar novamente" `Button` (`variant` subtle or outline) calling `refetch`, the empty
  message (D-05), or the numbered rows (D-11) with a `line` divider between them. Add the `schoolRules.*` keys of
  D-07 used here (empty, loadError, retry) to `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`. Tests (mocked
  `global.fetch`, `QueryClientProvider` with `retry: false`, session provider with tokens):
  `use-school-rules.hook.test.tsx` — "sends the access token", "signs out when the session expired";
  `school-rules-list.component.test.tsx` — "shows a loading indicator", "shows the rules in order" (three rules,
  numbers 01–03, text as sent; and 12 rules → "12"), "shows the empty message", "retries after a failed load"
  (500 then 200), "shows the messages in %s" (`it.each` over the three locales for empty, load error and retry).
  Covers: ER-01, ER-03, ER-04, ER-09 · Done when: `npx jest src/modules/school-rules` passes.

- [ ] **T-05** — Add `src/modules/onboarding/hooks/use-accept-school-rules.hook.ts` (+ `.types.ts`): `useMutation`
  (`retry: false`) posting `{ version }` to `/school-rules/acceptances` with the access token (extend `apiPost` with
  the same optional `{ accessToken }` options as `apiPut`, with a test in `api.client.test.ts`), `setSession` with
  the returned user on success (D-04), and the errors of D-09 (on 409 `schoolRules.version.outdated`: invalidate
  `["school-rules"]` and show the outdated toast; the hook exposes the outdated case so the screen can untick).
  Add the `schoolRules.outdated` key in the three locales. Tests in `use-accept-school-rules.hook.test.tsx`:
  "puts the account in the session"; "sends the version and the token"; "outdated: refetches the rules and shows
  the toast"; "error: signs out on 401"; "error: shows no connection"; `it.each` "error: shows the generic message
  on %s" (403, 422, 500, a non-JSON body); the session is unchanged on every error.
  Covers: ER-05, ER-07, ER-08 · Done when: `npx jest src/modules/onboarding/hooks src/services/api` passes.

- [ ] **T-06** — Build the screen: `src/modules/onboarding/components/school-rules/` (`school-rules.component.tsx`,
  `school-rules.hook.ts`, `school-rules.types.ts`, `index.ts`) — a `ScrollView` with `ScreenIntro` (`Ionicons`
  `shield-outline` in `grape`, default `bg-sand` tile, eyebrow, title, description) and `SchoolRulesList`, and a
  fixed footer (`bg-surface`, top border `line`, bottom safe-area padding) with the `Checkbox` and the primary
  `Button` (D-10, D-12); the hook holds `checked`, reads the version from `useSchoolRules()`, calls
  `useAcceptSchoolRules`, and unticks on the outdated error (D-09). `src/modules/onboarding/screens/school-rules.screen.tsx`
  renders it (no more `FlowPlaceholder`); add the remaining D-07 keys (eyebrow, title, description, accept, submit)
  under `schoolRules.*` in the three locales and remove `flows.schoolRules` if nothing else uses it. Tests in
  `school-rules.component.test.tsx` (mocked `global.fetch`): "shows the intro"; "enables the CTA only when ticked";
  "disabled while the rules can't be shown" (loading and load error); "accepts an empty list"; "outdated: unticks
  and accepts the new version"; "shows the copy in %s" (`it.each` over the three locales); and in
  `school-rules.screen.test.tsx` (`renderRouter` with the real route files and a session) "opens the role home after
  accepting" for student, instructor and admin, checking `getPathname()` and that `router.back()` doesn't return to
  `/onboarding*`.
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-07, ER-09 · Done when:
  `npx jest src/modules/onboarding src/modules/school-rules` passes and
  `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` exits 0.

### Verification

- [ ] **T-07** — Run every command in the Verification Plan from the repo root; all pass, and follow the user
  journey. Record the output summary as evidence. Covers: all · Done when: every command exits 0 and the simulator
  journey matches.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 012` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 012` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` — no errors (mobile has no build script).
  - `node .specs/scripts/run-e2e.mjs 012` — runs the e2e suites of the apps the spec touches (none for mobile;
    expected to report nothing to run).
- User journey (iOS simulator; backend and Postgres running locally, codes logged without `RESEND_API_KEY`):
  1. As the admin review account, add three rules through `POST /school-rules` (see
     `apps/backend/src/modules/school-rules/school-rules.integration.http`), so the version is above 0.
  2. In the app, sign in with an approved account that has no acceptance (e.g. the student review account, after
     clearing its WhatsApp number and acceptances in the database, or a new account approved in the database) →
     the WhatsApp step → save a number → the School rules step matches LOGIN-08 in light and dark (no Terms line):
     the three rules numbered 01–03 in the admins' order, the box unchecked, "ENTRAR NO APP" disabled.
  3. Tick the box (tap the text) → the CTA turns `sun`; untick → disabled; tick → tap the CTA → the student home
     placeholder opens; swiping back doesn't return to onboarding.
  4. Sign out isn't on the home yet: close and reopen the app, sign in again → the student home opens directly.
  5. Edit a rule's text through the API → close and reopen the app, sign in → the School rules step shows the new
     text → accept → the home opens.
  6. With the step open, edit a rule through the API, then tick and tap the CTA → the toast "As regras mudaram.
     Leia de novo e aceite." shows, the list shows the new text and the box is unchecked; accept again → the home
     opens.
  7. Delete every rule through the API → sign in again → the step shows "A escola ainda não tem regras." and the
     acceptance still opens the home.
  8. Stop the backend with the step open and tap the CTA → the no-connection toast shows and the box stays ticked.

## Memory Impact

- `memory/product.md` — Current state: the School rules step works in the app; onboarding can be completed and
  approved accounts reach their role's (placeholder) home; the step shows again at the next sign-in after a rule
  change. Remove "accepting the school rules in the app" and the school-rules step from what doesn't exist yet.
- `memory/technical-context.md` — Applications → `apps/mobile`: the API client has `apiGet`, and `apiPost` takes
  an optional `accessToken`. Authentication → Mobile session: `SessionUser` carries `rulesAccepted`. Fixed
  conventions → Mobile flows: `onboardingCompleted` is `isOnboardingCompleted(user)` (WhatsApp number and
  `rulesAccepted`), no longer fixed to `false`. Fixed conventions → Mobile shared UI: the `Checkbox` component.
- `memory/structure.md` — the mobile `src/modules/school-rules/` module (the reusable `SchoolRulesList` and
  `useSchoolRules`) and `src/components/ui/checkbox/`.
- `memory/modules/school-rules.md` — Boundaries: the app shows the rules (a reusable list) and asks for acceptance
  at the onboarding School rules step and again after a change; the reading screen and the admin screen don't
  exist yet. Spec history: `012-onboarding-school-rules`.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)
- [React rules](../../../.claude/rules/react.md)

## Amendments

## Review
