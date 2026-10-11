---
id: "013"
slug: school-rules-update
title: Accept updated school rules (backend + mobile)
status: in-progress
created: 2026-10-11
started: 2026-10-11
base_commit: ab8c62432068474cd754a4720cc41754cc85797b
fronts: [auth, backend, mobile]
depends_on: []
---

# 013 — Accept updated school rules (backend + mobile)

## Goal

When an approved account that already accepted the school rules before opens the app and hasn't accepted the
current version, it lands on a dedicated "Regras atualizadas" screen — the LOGIN-08 layout with copy that says the
rules were updated — instead of the onboarding step. The screen has no way back: the only way out is ticking the
box and accepting, which opens the home of the account's role. A first acceptance keeps using the onboarding step
as today. To tell the two cases apart, the backend starts sending `rulesAcceptedBefore` on every account answer.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: School rules (versioned, accepted per
  version, version 0 needs no acceptance), User (`approved` → onboarding); decision "Every change to the school
  rules asks everyone to accept them again; reordering doesn't", whose last sentences ("The app asks again on the
  same School rules step of onboarding … the backend sends no signal to tell a first acceptance from a new one")
  this spec replaces (D-07).
- Requirements:
  [requirements.md → Accepting again after a change](../../../.docs/requirements.md#accepting-again-after-a-change)
  — each user accepts a new version the next time they open the app, before continuing;
  [requirements.md → Rule changes while an account was away](../../../.docs/requirements.md#rule-changes-while-an-account-was-away)
  — a returning account that accepted before and missed a change lands on the same update screen;
  [requirements.md → Accepting the rules](../../../.docs/requirements.md#accepting-the-rules) — the first
  acceptance stays on the onboarding step (unchanged here).
- Design: `.docs/designs/auth-flow.html` → LOGIN-08 "School rules": the same layout as the onboarding step (shield
  icon tile, eyebrow, title, description, rules card, fixed footer with the checkbox and the primary CTA). The design
  has no "updated" variant; only the copy changes (D-04).
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Authentication (the
  account shape, `toAccountOut`, `rulesAccepted`, Mobile session, Mobile sign-out), Fixed conventions (Mobile
  flows, Mobile routes, Mobile shared UI, Design system, CTA labels, Naming), Automated validation.
- Module memory: [modules/school-rules.md](../../memory/modules/school-rules.md),
  [modules/auth.md](../../memory/modules/auth.md).
- Existing code this builds on:
  - `modules/auth/src/user/usecase/account.out.ts` — `AccountOut` / `toAccountOut(user, currentRulesVersion)`, the
    one mapper of every account answer (verify, refresh, `GET /auth/me`, `PUT /auth/me/whatsapp`,
    `POST /school-rules/acceptances`). `User.rulesAcceptances` is already loaded with the user.
  - `apps/mobile/src/navigation/resolve-flow.ts` (+ `.types.ts`) — `resolveFlow`, `isOnboardingCompleted`,
    `onboardingStep`, `flowEntryRoute`; `SessionUser` has `rulesAccepted`.
  - `apps/mobile/src/navigation/root-navigator/root-navigator.component.tsx` — one `Stack.Protected` per flow group.
  - `apps/mobile/src/modules/onboarding/components/school-rules/` — `SchoolRules` (intro, `SchoolRulesList`, footer
    with `Checkbox` and CTA) and its hook `useSchoolRulesStep`, with tests; copy keys `schoolRules.*`.
  - `apps/mobile/src/modules/onboarding/hooks/use-accept-school-rules.hook.ts` (+ types, test) — the accept
    mutation (session update, 409 reload, 401 sign-out, toasts).
  - `apps/mobile/src/modules/school-rules/` — `SchoolRulesList`, `useSchoolRules`, the API types.
  - `apps/mobile/src/modules/auth/hooks/use-verify-sign-in-code.hook.ts` — declares the response's user type.
  - `apps/mobile/src/constants/routes.ts`, `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts`.

## Scope

### In scope

- `rulesAcceptedBefore` on `AccountOut`, so on every account answer of the backend.
- The `rules-update` flow in the app: routing, route group, screen.
- Moving the acceptance UI and its mutation into `modules/school-rules` so the onboarding step and the update screen
  share them.
- The update screen's copy in pt-BR, es-ES and en-US.

### Out of scope

- Checking the rules while the app is open, or when it returns from the background (D-07).
- Keeping the session across restarts; the spec that adds it must reload the account (`GET /auth/me`) at launch so
  this check keeps running when the app opens.
- A sign-out button, a back button or any other way off the update screen (D-05).
- Showing what changed between versions (past texts aren't kept).
- Notifying users of a rule change.
- Telling version-0 onboarded accounts apart (D-02).
- Any change to the onboarding step's behavior or copy.
- The real student, instructor and admin homes (still placeholders).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | `AccountOut` gains `rulesAcceptedBefore: boolean`, `true` when the account has at least one acceptance of any version (`user.rulesAcceptances.length > 0`), computed in `toAccountOut` — so every account answer carries it with no controller change. | The app can't tell a first acceptance from a new one: an account that saved its number, closed the app (in-memory session) and signed in again looks like an onboarded account after a change. A boolean is all the app needs; a last accepted version would expose more. |
| D-02 | An account that finished onboarding while the version was 0 (no acceptance) sees the onboarding School rules step when the first rule is written, not the update screen. | It really is its first acceptance; telling it apart would need a stored "onboarding completed" — a new concept and a migration. Real rules exist before launch. |
| D-03 | New flow `rules-update` in `resolveFlow`: an `approved` account with a `whatsappNumber`, `rulesAccepted: false` and `rulesAcceptedBefore: true` resolves to it (any role); every other case resolves as today (no number → onboarding WhatsApp step; never accepted → onboarding School rules step). Route group `src/app/(rules-update)/rules-update/` (`_layout.tsx` with `headerShown: false` and `gestureEnabled: false`, `index.tsx`), `routes.rulesUpdate.home` = `/rules-update`, the flow's entry in `flowEntryRoute`, and its own `Stack.Protected` in `RootNavigator`. Screen: `src/modules/rules-update/screens/rules-update.screen.tsx`. | CLAUDE.md: each account state has one flow picked only by `resolveFlow`. As a flow entry, the screen has no history to go back to, and the guard keeps every other route out of reach. |
| D-04 | Copy (pt-BR / es-ES / en-US), keys `rulesUpdate.*`: eyebrow "Regras atualizadas" / "Normas actualizadas" / "Rules updated"; title "Regras da escola" / "Normas de la escuela" / "School rules"; description "Atualizamos as regras da escola. Leia e aceite para continuar usando o app." / "Actualizamos las normas de la escuela. Léelas y acéptalas para seguir usando la app." / "We updated the school rules. Read and accept them to keep using the app."; CTA "Aceitar e continuar" / "Aceptar y continuar" / "Accept and continue" (uppercase through the `button` style). Reused unchanged: the checkbox label `schoolRules.accept`, and the `schoolRules.empty`, `loadError`, `retry` and `outdated` messages; same shield icon (`grape`) on `bg-sand`. | The eyebrow states the context at a glance; "Entrar no app" makes no sense to someone already using it. |
| D-05 | The update screen has no `BackButton`, no sign-out and swipe-back is off. The only exits are a successful acceptance (the session update moves the flow to the role's home, no `router` call) and a 401 `auth.token.invalid`, which signs out as on the onboarding step. Android's hardware back leaves the app, as on any root screen. | The requirement: the only way to leave is accepting. Same exits as the onboarding step. |
| D-06 | `SchoolRules` moves to `src/modules/school-rules/components/school-rules-acceptance/` as `SchoolRulesAcceptance` (props `eyebrow`, `title`, `description`, `submitLabel`, all strings), with its hook `useSchoolRulesAcceptance` (the former `useSchoolRulesStep`) and their tests; `useAcceptSchoolRules` (+ types, test) moves to `src/modules/school-rules/hooks/`. The onboarding screen renders it with the `schoolRules.*` copy, the update screen with the `rulesUpdate.*` copy. Behavior is unchanged. | Reuse without one flow module importing another's internals; the school-rules module already holds the shared list. |
| D-07 | The app decides from the account it holds in the session, set at sign-in (and by the accept and WhatsApp answers); nothing re-checks while the app is open. Since the session lives only in memory, every app open is a sign-in, so "check when the app opens" holds. This replaces spec 012's D-08 ("accepting again uses the same screen and copy") and the matching sentences of the product decision. | The requirement asks for no real-time check; routing stays a pure function of the session's user. |

## Expected Results

### ER-01 — `GET /auth/me` says whether the account accepted the rules before

- **Front:** backend
- **Behavior:** Given an approved account with no acceptance and the current version 1, when it calls
  `GET /auth/me`, then the answer has `rulesAcceptedBefore: false` (and `rulesAccepted: false`); after it accepts
  version 1 (`POST /school-rules/acceptances`), `GET /auth/me` answers `rulesAcceptedBefore: true` and
  `rulesAccepted: true`; after an admin edits a rule (version 2), it answers `rulesAcceptedBefore: true` and
  `rulesAccepted: false`.
- **Edge and error cases:** with version 0 and no acceptance, `rulesAccepted: true` and `rulesAcceptedBefore:
  false`; a reorder leaves both unchanged; a pending account with no acceptance answers `rulesAcceptedBefore: false`.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- test/user/usecase/account.out.test.ts` and
  `npm run test:e2e --workspace apps/backend -- test/auth-session.e2e-spec.ts -t "rulesAcceptedBefore"`.

### ER-02 — Every account answer carries `rulesAcceptedBefore`

- **Front:** backend
- **Behavior:** Given any account, when the backend answers `POST /auth/email/verify`, `POST /auth/refresh`,
  `PUT /auth/me/whatsapp` or `POST /school-rules/acceptances`, then the account in the answer has a boolean
  `rulesAcceptedBefore` next to `rulesAccepted`; the answer of `POST /school-rules/acceptances` has it `true`.
- **Edge and error cases:** a newly created pending account answers `false`.
- **Verify by:** `npx vitest run src/modules/auth/auth.controller.spec.ts` (from `apps/backend`) and
  `node .specs/scripts/run-e2e.mjs 013` (`auth-email`, `auth-whatsapp`, `school-rules-acceptance` suites expect the
  field).

### ER-03 — The app routes by `rulesAccepted` and `rulesAcceptedBefore`

- **Front:** mobile
- **Behavior:** Given an approved account (student, instructor or admin) in the session, the app opens:
  - `/rules-update` when it has a WhatsApp number, `rulesAccepted: false` and `rulesAcceptedBefore: true`;
  - `/onboarding/school-rules` when it has a number, `rulesAccepted: false` and `rulesAcceptedBefore: false`;
  - its role's home when it has a number and `rulesAccepted: true`;
  - `/onboarding` (WhatsApp step) when it has no number, whatever the two flags are.
- **Edge and error cases:** non-approved statuses keep their flows whatever the flags; an approved account with an
  unknown role and `rulesAccepted: true` still falls back to `auth`.
- **Verify by:** `npx jest src/navigation -t "rules update"` (from `apps/mobile`).

### ER-04 — The update screen shows the updated rules and asks for the acceptance

- **Front:** mobile
- **Behavior:** Given the account is on `/rules-update` and `GET /school-rules` answers `{ version: 5, rules: [A,
  B] }`, when the screen opens, then it shows the shield icon, the eyebrow "Rules updated", the header "School
  rules", the description "We updated the school rules. Read and accept them to keep using the app.", the rules A
  and B numbered "01", "02", the unchecked "I have read and accept the rules and terms of Rocha's Surf School." box
  and a disabled "Accept and continue" CTA; ticking the box enables the CTA, unticking disables it again.
- **Edge and error cases:** while the rules load or after a load error, the box and the CTA are disabled.
- **Verify by:** `npx jest src/modules/rules-update -t "shows the updated rules"` and `-t "enables the CTA only
  when ticked"` (from `apps/mobile`).

### ER-05 — Accepting opens the role's home

- **Front:** mobile
- **Behavior:** Given a student on `/rules-update` with version 5 loaded, when they tick the box and press "Accept
  and continue", then the app sends `POST /school-rules/acceptances` with `{ "version": 5 }` and the session's
  access token, and on 200 (account with `rulesAccepted: true`) shows `/student`; `router.canGoBack()` is `false`
  afterwards.
- **Edge and error cases:** an instructor opens `/instructor`, an admin `/admin`; two quick presses send one
  request.
- **Verify by:** `npx jest src/navigation/root-navigator -t "rules update"` and
  `npx jest src/modules/rules-update -t "opens the role home"` (from `apps/mobile`).

### ER-06 — The update screen can't be left without accepting

- **Front:** mobile
- **Behavior:** Given an account on `/rules-update`, then the screen has no back button and no sign-out button, its
  layout sets `gestureEnabled: false`, and navigating to any other route (`/student`, `/instructor`, `/admin`,
  `/onboarding`, `/onboarding/school-rules`, `/auth`, `/pending`) keeps the app on `/rules-update`.
- **Edge and error cases:** a 401 `auth.token.invalid` (on the load or the accept) shows "Your session expired.
  Sign in again." and returns the app to the sign-in screen.
- **Verify by:** `npx jest src/navigation/root-navigator -t "keeps the account on rules update"` and
  `npx jest src/modules/rules-update -t "no way back"` (from `apps/mobile`); user journey in the Verification Plan.

### ER-07 — The update screen handles empty lists and errors like the onboarding step

- **Front:** mobile
- **Behavior:** Given the account is on `/rules-update`:
  - `{ version: 6, rules: [] }` shows "The school has no rules yet." and the acceptance sends `{ "version": 6 }`;
  - a failed load shows "Couldn't load the rules." with "Try again", which requests them again;
  - a 409 `schoolRules.version.outdated` on the accept shows "The rules changed. Read them again and accept.",
    reloads the rules and unticks the box;
  - no connection shows the no-connection toast, and 403/422/500 the generic toast; the box stays ticked and the
    session is unchanged.
- **Edge and error cases:** the same cases keep passing on the onboarding step (the shared component's tests).
- **Verify by:** `npx jest src/modules/school-rules` (the moved `SchoolRulesAcceptance` and `useAcceptSchoolRules`
  tests) and `npx jest src/modules/rules-update -t "outdated"` (from `apps/mobile`).

### ER-08 — The onboarding step is unchanged

- **Front:** mobile
- **Behavior:** Given an account on `/onboarding/school-rules`, when the step opens, then it still shows "Last
  step", "School rules", "Few and simple — so classes go well for everyone." and the "Enter the app" CTA, and
  accepting still opens the role's home.
- **Edge and error cases:** none beyond spec 012's.
- **Verify by:** `npx jest src/modules/onboarding` (from `apps/mobile`).

### ER-09 — The update screen speaks the app's three languages

- **Front:** mobile
- **Behavior:** Given the app language is pt-BR, es-ES or en-US, when `/rules-update` opens, then its eyebrow,
  title, description and CTA are the D-04 texts of that language, and the checkbox label is that language's
  `schoolRules.accept`.
- **Edge and error cases:** the rules' text is the same in all three.
- **Verify by:** `npx jest src/modules/rules-update -t "in %s"` (from `apps/mobile`).

## Tasks

### Auth module (`modules/auth`)

- [x] **T-01** — Add `rulesAcceptedBefore: boolean` to `AccountOut` and `toAccountOut` in
  `modules/auth/src/user/usecase/account.out.ts` (D-01). Tests in `modules/auth/test/user/usecase/account.out.test.ts`:
  `false` without acceptances (version 0 and above), `true` with an acceptance of the current version, `true` with
  only an older one; update the exact-shape expectations in `get-current-user`, `set-whatsapp`,
  `verify-sign-in-code` and `refresh-session` use case tests, and in
  `modules/school-rules/test/school-rule/usecase/accept-school-rules.usecase.test.ts` if it compares the whole
  account. Covers: ER-01, ER-02 · Done when: `npm test --workspace @rochas-surf-school/auth` and
  `npm test --workspace @rochas-surf-school/school-rules` pass.
  > ✅ 2026-10-11 — added `rulesAcceptedBefore` (`user.rulesAcceptances.length > 0`) to `AccountOut`/`toAccountOut`;
  > new tests (no acceptance at versions 0 and 3, current version accepted, only an older one) and the exact shapes
  > updated; files: `modules/auth/src/user/usecase/account.out.ts`,
  > `modules/auth/test/user/usecase/account.out.test.ts`,
  > `modules/auth/test/user/usecase/get-current-user.usecase.test.ts`,
  > `modules/auth/test/user/usecase/set-whatsapp.usecase.test.ts`,
  > `modules/auth/test/session/usecase/refresh-session.usecase.test.ts`,
  > `modules/auth/test/sign-in-code/usecase/verify-sign-in-code.usecase.test.ts`,
  > `modules/school-rules/test/school-rule/usecase/accept-school-rules.usecase.test.ts`; verified: auth 226 passed,
  > school-rules 113 passed (auth `dist` rebuilt with `npm run build`, which school-rules and the backend consume);
  > deviations: none

### Backend (`apps/backend`)

- [x] **T-02** — Update the exact account shapes in `apps/backend/src/modules/auth/auth.controller.spec.ts` (and
  `school-rules.controller.spec.ts` if needed). Add a `rulesAcceptedBefore` describe to
  `apps/backend/test/auth-session.e2e-spec.ts` (no acceptance → `false`; accept version 1 → `true`; edit a rule →
  `rulesAccepted: false`, `rulesAcceptedBefore: true`; reorder → unchanged; version 0 → `false`); expect
  `rulesAcceptedBefore: true` in the accept answer in `test/school-rules-acceptance.e2e-spec.ts`; add the field to
  the exact shapes in `test/auth-email.e2e-spec.ts` (new pending account → `false`) and
  `test/auth-whatsapp.e2e-spec.ts`. Add the field to the example responses in
  `school-rules.integration.http` / `auth.integration.http` where they show the account. Covers: ER-01, ER-02 ·
  Done when: `npm test --workspace apps/backend` and `npm run test:e2e --workspace apps/backend` pass.
  > ✅ 2026-10-11 — exact account shapes now carry `rulesAcceptedBefore`; new `rulesAcceptedBefore` describe in the
  > session e2e (no acceptance, pending account, accept → edit/reorder, refresh answer); the accept answer expects
  > `true`; `.http` comments mention the field; files: `apps/backend/src/modules/auth/auth.controller.spec.ts`,
  > `apps/backend/test/auth-session.e2e-spec.ts`, `apps/backend/test/auth-email.e2e-spec.ts`,
  > `apps/backend/test/auth-whatsapp.e2e-spec.ts`, `apps/backend/test/school-rules-acceptance.e2e-spec.ts`,
  > `apps/backend/src/modules/school-rules/school-rules.integration.http`; verified: `npm test` in apps/backend
  > (150 passed), `npm run test:e2e` (177 passed; one run had a single failure that did not reproduce on rerun);
  > deviations: `school-rules.controller.spec.ts` and `auth.integration.http` needed no change

### Mobile (`apps/mobile`)

- [x] **T-03** — Move the acceptance UI and mutation into the school-rules module (D-06): `SchoolRules` →
  `src/modules/school-rules/components/school-rules-acceptance/` (`SchoolRulesAcceptance` with props `eyebrow`,
  `title`, `description`, `submitLabel` in `school-rules-acceptance.types.ts`; hook `useSchoolRulesAcceptance`;
  `index.ts`), `use-accept-school-rules.hook.ts` (+ types, test) → `src/modules/school-rules/hooks/`; move their
  tests and render the component in them with explicit copy props. `src/modules/onboarding/screens/school-rules.screen.tsx`
  renders `SchoolRulesAcceptance` with the `schoolRules.*` texts; delete the old folders. Follow
  `.claude/rules/react.md` and the `vercel-react-native-skills` / `vercel-react-best-practices` skills.
  Covers: ER-07, ER-08 · Done when: `npx jest src/modules/school-rules src/modules/onboarding` passes (from
  `apps/mobile`) and no file imports from `modules/onboarding/components/school-rules` or
  `modules/onboarding/hooks/use-accept-school-rules`.
  > ✅ 2026-10-11 — moved `SchoolRules` → `SchoolRulesAcceptance` (props `eyebrow`, `title`, `description`,
  > `submitLabel`; hook `useSchoolRulesAcceptance`) and `useAcceptSchoolRules` into `modules/school-rules` with
  > `git mv`; the component tests render it with explicit copy and keep the three-language checkbox label check; the
  > onboarding screen passes the `schoolRules.*` texts; files:
  > `apps/mobile/src/modules/school-rules/components/school-rules-acceptance/{index.ts,school-rules-acceptance.component.tsx,school-rules-acceptance.component.test.tsx,school-rules-acceptance.hook.ts,school-rules-acceptance.hook.test.tsx,school-rules-acceptance.types.ts}`,
  > `apps/mobile/src/modules/school-rules/hooks/use-accept-school-rules.{hook.ts,hook.test.tsx,types.ts}`,
  > `apps/mobile/src/modules/onboarding/screens/school-rules.screen.tsx`; deleted the old
  > `modules/onboarding/components/school-rules/` and `modules/onboarding/hooks/use-accept-school-rules.*`;
  > verified: `npx jest src/modules/school-rules src/modules/onboarding` (12 suites, 115 passed), eslint clean,
  > grep finds no import of the old paths; deviations: the "shows the copy in %s" test now checks the checkbox label
  > per language (the other texts are props)

- [x] **T-04** — Add the `rulesUpdate` keys (`eyebrow`, `title`, `description`, `submit`) with the D-04 texts to
  `src/i18n/messages/{en-US,es-ES,pt-BR}.ts`, and `src/modules/rules-update/screens/rules-update.screen.tsx`
  (`RulesUpdateScreen`), which renders `SchoolRulesAcceptance` with them. Tests in
  `src/modules/rules-update/screens/rules-update.screen.test.tsx` (mocked `fetch`, session context): "shows the
  updated rules", "enables the CTA only when ticked", "outdated", "no way back" (no back or sign-out button), "in
  %s" for the three languages. Covers: ER-04, ER-07, ER-09 · Done when: `npx jest src/modules/rules-update` passes
  (from `apps/mobile`).
  > ✅ 2026-10-11 — added the `rulesUpdate` keys in the three languages and `RulesUpdateScreen`, which renders
  > `SchoolRulesAcceptance` with them; tests: shows the updated rules, enables the CTA only when ticked, empty list,
  > retry, outdated, no way back, copy in pt-BR/es-ES/en-US; files:
  > `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts`,
  > `apps/mobile/src/modules/rules-update/screens/rules-update.screen.tsx`,
  > `apps/mobile/src/modules/rules-update/screens/rules-update.screen.test.tsx`; verified:
  > `npx jest src/modules/rules-update` (9 passed); deviations: the per-language tests are named
  > "shows the copy in %s" (jest's `-t "in %s"` can't match a formatted title, so use `-t "shows the copy in"`)

- [x] **T-05** — Route to the update screen (D-03): `rulesAcceptedBefore: boolean` on `SessionUser`
  (`src/navigation/resolve-flow.types.ts`) and on the user type of `use-verify-sign-in-code.hook.ts`; the
  `rules-update` flow in `Flow`, `resolveFlow` and `FLOW_ENTRY_ROUTES` (`src/navigation/resolve-flow.ts`);
  `routes.rulesUpdate.home` in `src/constants/routes.ts`; `src/app/(rules-update)/rules-update/_layout.tsx`
  (`headerShown: false`, `gestureEnabled: false`) and `index.tsx` (renders `RulesUpdateScreen`); the
  `Stack.Protected guard={flow === "rules-update"}` in `root-navigator.component.tsx`. Add the field to every test
  fixture that builds a `SessionUser`. Tests: `resolve-flow.test.ts` (`describe("rules update")`: the four ER-03
  cases per role and the non-approved statuses); `root-navigator.component.test.tsx` (add the new route files to
  the tree; "rules update" opens `/rules-update` per role; "keeps the account on rules update" for the ER-06
  paths; accepting opens the role home with `router.canGoBack()` false); a "opens the role home" test in
  `rules-update.screen.test.tsx` driving the real route files. Covers: ER-03, ER-05, ER-06 · Done when:
  `npx jest src/navigation src/modules/rules-update` passes and `npx tsc --noEmit` exits 0 (from `apps/mobile`).
  > ✅ 2026-10-11 — `rulesAcceptedBefore` on `SessionUser` and the verify response type; `rules-update` in `Flow`,
  > `resolveFlow` (approved, number, not accepted, accepted before) and `FLOW_ENTRY_ROUTES`; `routes.rulesUpdate.home`;
  > route group `(rules-update)/rules-update` (layout with `gestureEnabled: false`, index); own `Stack.Protected` in
  > `RootNavigator`; field added to every `SessionUser` fixture; tests: `describe("rules update")` in
  > `resolve-flow.test.ts`, "rules update" in the root-navigator test (opens per role, keeps the account on it for
  > 7 paths, accepting opens each home with `canGoBack()` false, first acceptance and no-number cases), a layout test
  > for `gestureEnabled: false`, and the "opens the role home" test over the real route files; files:
  > `apps/mobile/src/constants/routes.ts`, `apps/mobile/src/navigation/resolve-flow.ts`,
  > `apps/mobile/src/navigation/resolve-flow.types.ts`, `apps/mobile/src/navigation/resolve-flow.test.ts`,
  > `apps/mobile/src/navigation/root-navigator/root-navigator.component.tsx`,
  > `apps/mobile/src/navigation/root-navigator/root-navigator.component.test.tsx`,
  > `apps/mobile/src/app/(rules-update)/rules-update/{_layout.tsx,_layout.test.tsx,index.tsx}`,
  > `apps/mobile/src/modules/auth/hooks/use-verify-sign-in-code.hook.ts`,
  > `apps/mobile/src/modules/rules-update/screens/rules-update.screen.test.tsx`, and the `rulesAcceptedBefore`
  > fixture field in the tests of auth, onboarding, pending, school-rules and the session provider; verified:
  > `npx jest src/navigation src/modules/rules-update src/app` (158 + 12 passed), whole mobile suite (54 suites, 573
  > passed), `npx tsc --noEmit` exit 0, eslint clean; deviations: the typed-routes file `.expo/types/router.d.ts`
  > (git-ignored) was regenerated by starting Metro once so `/rules-update` type-checks; the layout test is a new
  > file because the layout can't be called outside a renderer

### Verification

- [ ] **T-06** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: `run-related-tests.mjs 013` passes, `check-coverage.mjs 013`
  prints `COVERAGE OK`, `run-e2e.mjs 013` prints `E2E PASSED`, lint/check-types/build exit 0, and the user journey
  steps are observed as written.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 013` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 013` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 013` — the backend e2e suite passes (Postgres up, migrations applied).
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/backend`
    — no errors.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` — no errors (mobile has no build script).
- User journey (iOS simulator; backend and Postgres running locally, codes logged without `RESEND_API_KEY`):
  1. As the admin review account, add two rules through `POST /school-rules`
     (`apps/backend/src/modules/school-rules/school-rules.integration.http`).
  2. In the app, sign in with an approved account with a number and no acceptance → the onboarding School rules
     step opens ("ÚLTIMO PASSO", "ENTRAR NO APP"); accept → the role home opens.
  3. Edit a rule's text through the API → close and reopen the app, sign in → "Regras atualizadas" opens with the
     update description, the new text and "ACEITAR E CONTINUAR" disabled; matches LOGIN-08 in light and dark.
  4. On that screen: no back button, swiping from the left edge does nothing; tick → tap the CTA → the role home
     opens and swiping back doesn't return to the update screen.
  5. Close and reopen the app, sign in → the home opens directly (no update screen).
  6. Reorder the rules through the API → sign in again → the home opens directly.

## Memory Impact

- `memory/product.md` — School rules concept and the decision "Every change to the school rules asks everyone to
  accept them again": a new version is accepted on a dedicated "Regras atualizadas" screen (no way back, only
  accepting leaves) by accounts that accepted before; a first acceptance stays on the onboarding step; replace "the
  backend sends no signal to tell a first acceptance from a new one". Current state: this spec.
- `memory/technical-context.md` — Authentication: the account shape gains `rulesAcceptedBefore` (meaning, computed
  in `toAccountOut`); Mobile session: `SessionUser` gains it; Fixed conventions → Mobile flows: the `rules-update`
  flow and when `resolveFlow` picks it (`/rules-update`, swipe-back off).
- `memory/structure.md` — `apps/mobile`: `(rules-update)/rules-update/{_layout,index}.tsx`,
  `modules/rules-update/screens/`, `SchoolRulesAcceptance` and `useAcceptSchoolRules` now in `modules/school-rules`
  (removed from `modules/onboarding`).
- `memory/modules/school-rules.md` — Boundaries: the app asks for a new version on the update screen, the first
  acceptance on the onboarding step; spec history entry.
- `memory/modules/auth.md` — the account answer's `rulesAcceptedBefore`; spec history entry.

## Assumptions

- Accounts onboarded while the version was 0 see the onboarding step, not the update screen, when the first rule is
  written (D-02); the user accepted this.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)
- [Spec 012 — Onboarding School rules step](../../finished/20261011165408-012-onboarding-school-rules/spec.md)

## Amendments

## Review
