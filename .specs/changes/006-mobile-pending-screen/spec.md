---
id: "006"
slug: mobile-pending-screen
title: Pending approval screen and sign-out in the mobile app
status: in-progress
started: 2026-10-10
base_commit: a1969872d2916d1474bbb7916212b216fb48125d
created: 2026-10-10
fronts: [mobile]
depends_on: []
---

# 006 — Pending approval screen and sign-out in the mobile app

## Goal

A signed-in account whose status is `pending` opens its own Pending screen, whatever sign-in method it used: it
tells the person that the school still has to approve the account and since when the account exists, in a
friendly relative time. The screen's only way out is "Terminar sessão", which ends the sign-in both in the app
and on the backend and returns to the sign-in screen. Pending accounts get their own flow, so they can never
reach the onboarding steps that approved accounts will go through.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: **User** lifecycle (`pending` is a
  registration that "sees only waiting for approval"), the decisions "Every account waits for an admin's
  approval before seeing anything" and "Pushes are the only notification channel".
- Requirements: [requirements.md → Registrations wait for approval](../../../.docs/requirements.md#registrations-wait-for-approval)
  — while waiting, the user only sees that their account is waiting for approval (this spec builds that screen).
  [requirements.md → Signing out](../../../.docs/requirements.md#signing-out) — when a signed-in user signs out,
  the app returns to the sign-in screen (this spec builds it for the Pending screen only).
- Design: `.docs/designs/auth-flow.html` → screen "Pendente" (D-07). Its copy is adapted to pt-BR (D-05).
- Technical: [technical-context.md](../../memory/technical-context.md) — Fixed conventions → Mobile flows,
  Mobile routes, Mobile shared UI (`Button` `ghost` variant uses `ds-text-button`), Design system, CTA labels;
  Authentication → Sign-out (`POST /auth/sign-out`, `@Public()`, body `{ refreshToken }`, always 204) and Mobile
  session; Applications → `apps/mobile` (Dates: `date-fns` + `@date-fns/tz`, always shown in
  `America/Fortaleza`); Coverage (`apps/mobile/src/app/**` is excluded, so logic lives outside it).
- Existing code this builds on:
  - `apps/mobile/src/navigation/resolve-flow.ts` — today maps `pending` → `onboarding` (changed by D-01).
  - `apps/mobile/src/navigation/root-navigator/` — one `Stack.Protected` per flow; clearing the session sends
    the person back to `/auth` through `src/app/index.tsx`.
  - `apps/mobile/src/providers/session/` — in-memory `user` with `setUser` / `clearUser` (changed by D-02).
  - `apps/mobile/src/modules/auth/screens/confirm-code.screen.tsx` — calls `setUser(response.user)` and drops
    the tokens of the verify response.
  - `apps/mobile/src/modules/auth/hooks/use-verify-sign-in-code.hook.ts` — `VerifySignInCodeResponse` (the
    backend's `user` also carries `createdAt`, an ISO 8601 string in UTC, since spec 004).
  - `apps/mobile/src/services/api/api.client.ts` — `apiPost`, throws `ApiError` / `NetworkError`.
  - `apps/mobile/src/components/ui/button` — `ghost` variant (label `ds-text-button text-ink`).
- Google and Apple sign-in don't exist yet: they will put their account in the same session, and routing
  depends only on the session's status, so they reach this screen without changes. This spec verifies the email
  code path only.

## Scope

### In scope

- A `pending` flow (`/pending`) chosen by `resolveFlow` for every `pending` account.
- The session keeping the verify response's tokens and the user's `createdAt` in memory.
- The Pending screen: copy, timeline, the "Conta criada" time label, and "Terminar sessão".
- Signing out from the Pending screen: local cleanup and `POST /auth/sign-out`.
- Installing `date-fns` and `@date-fns/tz` in `apps/mobile`.

### Out of scope

- Google and Apple sign-in (their own specs).
- Keeping the session across app restarts (`expo-secure-store`); the session stays in memory.
- Re-checking the account's status from the Pending screen (polling, pull-to-refresh, `GET /auth/me`): the
  person sees an approval the next time they sign in.
- Push notifications about the registration result.
- The onboarding steps (WhatsApp number, school rules) and the Onboarding screen itself.
- Sign-out from any other screen or flow, and renewing the session (`POST /auth/refresh`).
- Any backend change.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | A new flow `pending`: `resolveFlow` maps status `pending` (any role) → `pending`, whose entry route is `/pending` (`src/app/(pending)/pending/`, screens in `src/modules/pending/screens/`). `onboarding` is kept for approved accounts that haven't completed onboarding. Replaces spec 005's `pending → onboarding`. | Every access rule stays in `resolveFlow`; pending accounts can never reach the future onboarding steps, and the onboarding screen never has to decide what to show by status. |
| D-02 | The session holds `{ user, tokens }` in memory. `SessionUser` gains `createdAt` (ISO string); `tokens` is `{ accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt }`. The provider exposes `user`, `tokens`, `setSession({ user, tokens })` and `clearSession()`, replacing `setUser` / `clearUser`; the Confirm email screen calls `setSession` with the verify response. Nothing is written to the device. | Sign-out needs the refresh token and the time label needs `createdAt`; persistence is a later spec. |
| D-03 | Sign-out is local first: `useSignOut` (in `src/modules/auth/hooks/`) clears the session and the TanStack Query cache (`queryClient.clear()`) at once, then sends `POST /auth/sign-out` with `{ refreshToken }` without waiting for it; a failure (network, any status) is ignored and shows nothing. With no tokens in the session it skips the request. Navigation to sign-in comes from the route guards, not from a `router` call. | Signing out must always work, offline included; the backend answers 204 for any token anyway, and the flow guards already send a session-less app to `/auth`. |
| D-04 | The "Conta criada" label, computed from `createdAt` and the current time: under 60 s, or `createdAt` in the future → the translated "now" ("Agora" / "Now" / "Ahora"); from 60 s to under 7 days → date-fns `formatDistanceStrict` with `addSuffix: true` and `roundingMethod: "floor"` in the app's language ("há 5 minutos", "5 minutes ago", "hace 5 minutos"); 7 days or more → date-fns `format` in `America/Fortaleza`, `d MMM` when the year is the current one in Fortaleza, `d MMM yyyy` otherwise; an invalid `createdAt` → no label. Locales: `ptBR` for pt-BR, `es` for es-ES, `enUS` for en-US, picked from the i18n language. The label is recomputed every 60 s while the screen is mounted. | Friendly near the sign-up, exact for older accounts; recomputing keeps "Agora" from going stale. |
| D-05 | Copy (pt-BR, the design adapted from European Portuguese; en-US and es-ES below). No email promise and no "Normalmente em menos de 24 horas" line. | The product notifies only by push (not built yet), and the school made no 24-hour commitment. |
| D-06 | Colors from tokens: the clock tile and the "Em análise" pill use `warn` / `warnTint` (the design's raw `#E8B44A` / `rgba(232,180,74,.18)` / `#B07A0E`), the done step uses `ok`, the future step's dashed ring uses `ink-3`. The screen has no `BackButton` and no back gesture target (it is the root of its flow); Android's hardware back closes the app, as on any root screen. "Terminar sessão" is the shared `Button` with `variant="ghost"`, so its label uses `ds-text-button`. | Design-system rule (no raw values); the user asked for `ds-text-button` and for sign-out as the only exit. |
| D-07 | The design source is `.docs/designs/auth-flow.html` → "Pendente", not `design-system.html`. | The Pending screen exists only there. |

### Copy (D-05)

| Key (under `pending`) | pt-BR | en-US | es-ES |
| --- | --- | --- | --- |
| `eyebrow` | Conta criada | Account created | Cuenta creada |
| `title` | Aguardando aprovação | Waiting for approval | Esperando aprobación |
| `description` | A equipe da Rocha's vai analisar seu cadastro. Assim que for aprovado, você poderá entrar com `<bold>{{email}}</bold>`. | The Rocha's team will review your sign-up. Once it's approved, you can sign in with `<bold>{{email}}</bold>`. | El equipo de Rocha's revisará tu registro. Cuando sea aprobado, podrás entrar con `<bold>{{email}}</bold>`. |
| `steps.created` | Conta criada | Account created | Cuenta creada |
| `steps.approval` | Aprovação da equipe | Team approval | Aprobación del equipo |
| `steps.inReview` | Em análise | Under review | En revisión |
| `steps.bookClasses` | Reservar aulas | Book classes | Reservar clases |
| `now` | Agora | Now | Ahora |
| `signOut` | Terminar sessão | Sign out | Cerrar sesión |

## Expected Results

### ER-01 — A pending account opens the Pending screen and can't reach any other flow

- **Front:** mobile
- **Behavior:** Given `resolveFlow`, then status `pending` with any role → `pending`, and
  `flowEntryRoute("pending")` → `/pending`. Given a `pending` account in the session, when the app opens at `/`,
  then the Pending screen (`/pending`, title "Waiting for approval" in en-US) is shown; when it navigates to
  `/onboarding`, `/auth`, `/student`, `/instructor`, `/admin`, `/reactivation`, `/offboarding/denied` or
  `/offboarding/removed`, then `/pending` is shown instead.
- **Edge and error cases:** an approved account with onboarding not completed still resolves to `onboarding`;
  `deleted`, `denied`, `removed`, unknown statuses and approved roles resolve as before; no other account state
  can reach `/pending` (an approved student navigating to `/pending` stays on `/student`).
- **Verify by:** `npx jest src/navigation/resolve-flow src/navigation/root-navigator` (from `apps/mobile`) —
  resolve-flow table tests for `pending` × each role → `pending` and the entry route; root-navigator tests
  "opens pending for a pending account", "keeps a pending account on pending for {path}" (one per path) and
  "keeps a student on student for /pending".

### ER-02 — The Pending screen shows the agreed content

- **Front:** mobile
- **Behavior:** Given a pending account `ana.silva@gmail.com` in the session, when the Pending screen renders
  (en-US), then it shows: the eyebrow "Account created", the header "Waiting for approval", the description with
  the email in bold, the timeline rows "Account created" (with its time label, ER-03), "Team approval" with the
  "Under review" pill, and "Book classes", and a "Sign out" button rendered by `Button` `variant="ghost"`
  (label class `ds-text-button`). There is no back button.
- **Edge and error cases:** in pt-BR the strings are those of D-05's table ("Aguardando aprovação", "Terminar
  sessão"…), and in es-ES too; the three locale files share the keys (the type check fails otherwise); no raw
  color, font or radius values in the component (D-06).
- **Verify by:** `npx jest src/modules/pending` (from `apps/mobile`) — tests "shows the waiting content with the
  email", "shows the content in pt-BR and es-ES", "renders sign-out as a ghost button" and "has no back
  button"; `npx turbo run check-types --filter=@rochas-surf-school/mobile` exits 0.

### ER-03 — The "Account created" label says when the account was created

- **Front:** mobile
- **Behavior:** Given `createdAt` and the current time, then the label is: "Now" when less than 60 s have
  passed; "5 minutes ago" at 5 min 59 s; "3 hours ago" at 3 h 59 min; "6 days ago" at 6 days 23 h; at 7 days or
  more, the creation date in America/Fortaleza as `d MMM` (e.g. "3 Oct") when in the current year, `d MMM yyyy`
  (e.g. "28 Dec 2025") otherwise. In pt-BR: "Agora", "há 5 minutos"; in es-ES: "Ahora", "hace 5 minutos". Given
  the screen stays open, when 60 s pass, then the label is recomputed ("Now" becomes "1 minute ago").
- **Edge and error cases:** exactly 60 s → "1 minute ago"; exactly 7 days → the date; `createdAt` in the future
  → "Now"; an invalid `createdAt` → the "Account created" row shows no time label; a `createdAt` at 01:30 UTC on
  1 Jan of the current year is shown with the previous year's date (31 Dec in Fortaleza) and its year.
- **Verify by:** `npx jest src/modules/pending/utils/format-created-at` (from `apps/mobile`) — one test per case
  above in the three locales; and `npx jest src/modules/pending/components/pending` — test "updates the created
  label every minute" (fake timers).

### ER-04 — "Terminar sessão" clears the session and returns to sign-in

- **Front:** mobile
- **Behavior:** Given a pending account in the session on `/pending`, when the person presses "Sign out", then
  the session's user and tokens are cleared, the TanStack Query cache is cleared, and the sign-in screen
  (`/auth`, "Continue with email") is shown.
- **Edge and error cases:** after signing out, navigating to `/pending` shows the sign-in screen; signing out
  with no tokens in the session still clears it and shows sign-in.
- **Verify by:** `npx jest src/modules/auth/hooks/use-sign-out src/navigation/root-navigator` (from
  `apps/mobile`) — tests "clears the session and the query cache" and "returns to sign-in after signing out
  from pending".

### ER-05 — Signing out ends the sign-in on the backend without blocking the app

- **Front:** mobile
- **Behavior:** Given a session whose refresh token is `rt-1`, when the person signs out, then the app sends
  `POST {EXPO_PUBLIC_API_URL}/auth/sign-out` with body `{ "refreshToken": "rt-1" }`, and the session is cleared
  before that request answers.
- **Edge and error cases:** the request fails with no connection (`NetworkError`) or answers 500 → the session
  is still cleared, no toast is shown and nothing is thrown; no tokens in the session → no request is sent.
- **Verify by:** `npx jest src/modules/auth/hooks/use-sign-out` (from `apps/mobile`) — tests "sends the refresh
  token to sign-out", "clears the session before the request answers", "ignores a network error", "ignores a
  server error" and "sends nothing without tokens"; and `npx jest src/modules/auth/screens/confirm-code` — test
  "puts the verified account and its tokens in the session".

## Tasks

### Mobile (`apps/mobile`)

- [x] **T-01** — Install `date-fns` and `@date-fns/tz` in `apps/mobile` (`npx expo install date-fns @date-fns/tz`
  or `npm install … --workspace @rochas-surf-school/mobile`), updating `apps/mobile/package.json` and the root
  `package-lock.json`. Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: enabling · Done when: both appear in `apps/mobile/package.json` dependencies and
  `npx turbo run check-types --filter=@rochas-surf-school/mobile` exits 0.
  > ✅ 2026-10-10 — installed `date-fns` ^4.4.0 and `@date-fns/tz` ^1.5.0 in `apps/mobile`; files: `apps/mobile/package.json`,
  > `package-lock.json`; verified: `npx turbo run check-types --filter=@rochas-surf-school/mobile` (exit 0); deviations: none

- [ ] **T-02** — Keep the tokens and `createdAt` in the session (D-02): add `createdAt` to `SessionUser`
  (`src/navigation/resolve-flow.types.ts`) and to `VerifySignInCodeResponse["user"]`; add a `SessionTokens`
  type, `tokens`, `setSession` and `clearSession` in `src/providers/session/` (removing `setUser` /
  `clearUser`); make `src/modules/auth/screens/confirm-code.screen.tsx` call `setSession` with the response's
  `user` and tokens; update every existing caller and test that used `setUser` / `clearUser` (session provider,
  confirm-code screen, root-navigator tests). Skill:
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-03, ER-05 · Done when: `npx jest src/providers/session src/modules/auth/screens/confirm-code
  src/navigation` passes, including "puts the verified account and its tokens in the session" and a provider
  test "sets the session and clears it" (user and tokens).

- [ ] **T-03** — Create `src/modules/pending/utils/format-created-at.ts` implementing D-04 as a pure function
  (inputs: `createdAt` string, current `Date`, app language; output: the "now" marker, a formatted string, or
  nothing for an invalid date), with `format-created-at.test.ts` covering every case of ER-03 in en-US, pt-BR
  and es-ES. Covers: ER-03 · Done when: `npx jest src/modules/pending/utils` passes with every line covered.

- [ ] **T-04** — Create `src/modules/auth/hooks/use-sign-out.hook.ts` (D-03): returns `signOut()`, which reads
  the tokens, calls `clearSession()` and `queryClient.clear()`, then fires `apiPost("/auth/sign-out",
  { refreshToken })` and swallows its rejection; no request without tokens. Test it in
  `use-sign-out.hook.test.tsx` with a mocked `fetch`. Skill:
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-04, ER-05 · Done when: `npx jest src/modules/auth/hooks/use-sign-out` passes with the five tests
  of ER-05 and "clears the session and the query cache".

- [ ] **T-05** — Build the Pending screen: component `src/modules/pending/components/pending/`
  (`pending.component.tsx`, `pending.hook.ts` — reads the session, the language, ticks every 60 s and calls
  `useSignOut` —, `pending.types.ts`, `index.ts`, `pending.component.test.tsx`) following the design (D-06,
  D-07) with NativeWind classes and tokens only, and the "Terminar sessão" `Button variant="ghost"`; screen
  `src/modules/pending/screens/pending.screen.tsx` with `pending.screen.test.tsx`; the `pending.*` keys of D-05
  in `src/i18n/messages/{en-US,pt-BR,es-ES}.ts`. Follow `.claude/rules/react.md`. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-02, ER-03, ER-04 · Done when: `npx jest src/modules/pending` passes with the ER-02 tests, "updates
  the created label every minute" and "signs out when Sign out is pressed".

- [ ] **T-06** — Add the `pending` flow (D-01): `"pending"` in `Flow` and `FLOW_BY_INACTIVE_STATUS` /
  `FLOW_ENTRY_ROUTES` (`src/navigation/resolve-flow.ts`, `resolve-flow.types.ts`); `routes.pending.home =
  "/pending"` in `src/constants/routes.ts`; a `Stack.Protected guard={flow === "pending"}` around
  `(pending)/pending` in `src/navigation/root-navigator/root-navigator.component.tsx`; route files
  `src/app/(pending)/pending/_layout.tsx` (Stack, no header) and `index.tsx` (renders `PendingScreen`); fix the
  onboarding layout comment (no longer "waiting for approval"). Update `resolve-flow.test.ts` and
  `root-navigator.component.test.tsx` with the ER-01 tests and "returns to sign-in after signing out from
  pending" (ER-04). Covers: ER-01, ER-04 · Done when: `npx jest src/navigation` passes with those tests.

### Verification

- [ ] **T-07** — Run every command in the Verification Plan from the repo root and follow its user journey; all
  pass. Record the output summary as evidence. Covers: all · Done when: `run-related-tests.mjs 006` passes,
  `check-coverage.mjs 006` prints `COVERAGE OK`, lint and check-types exit 0, and both journeys show what they
  describe.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 006` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 006` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` — no errors (the type check also proves
    the three locale files share the keys).
  - `node .specs/scripts/run-e2e.mjs 006` — runs the e2e suites of the apps touched (none for mobile; expected
    to report nothing to run).
- User journeys (iOS simulator, backend running with `npm run dev` and its database up):
  - ER-01, ER-02, ER-03 — sign up with a new email (Continue with email → name and email → the code from the
    backend log): the Pending screen shows "Aguardando aprovação" (or the phone language's title), the email in
    bold, and "Agora" on the "Conta criada" row; after a minute or more on the screen, the label becomes a
    relative time ("há 1 minuto"). The iOS back-swipe from the left edge does nothing.
  - ER-04, ER-05 — press "Terminar sessão": the sign-in screen is shown, and the backend log shows
    `POST /auth/sign-out` answering 204. Sign in again with the same email and code: the Pending screen shows a
    relative time ("há N minutos") instead of "Agora".

## Memory Impact

- `memory/technical-context.md` — Fixed conventions → Mobile flows: add the `pending` flow (`pending` →
  `pending`, `/pending`; `onboarding` only for approved accounts not yet onboarded). Authentication → Mobile
  session: the session holds `user` (with `createdAt`) and `tokens` in memory, `setSession` / `clearSession`;
  sign-out from the app is local first with a fire-and-forget `POST /auth/sign-out` (`useSignOut`, which also
  clears the query cache). Applications → `apps/mobile`: `date-fns` and `@date-fns/tz` are installed.
- `memory/structure.md` — `apps/mobile`: `src/app/(pending)/pending/{_layout,index}.tsx`,
  `src/modules/pending/{screens,components/pending,utils}`, `src/modules/auth/hooks/use-sign-out.hook.ts`; the
  onboarding route is no longer for pending accounts.
- `memory/modules/auth.md` — Who can do what → In the app: a pending account opens the Pending screen (its own
  flow) and can only sign out from it; signing out ends that sign-in on the backend and returns to sign-in, even
  offline. Spec history entry.
- `memory/product.md` — Current state: the Pending screen and sign-out from it are delivered; remove "waiting for
  approval" and "signing out from the app" from what doesn't exist yet.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
