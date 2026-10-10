---
id: "005"
slug: mobile-flow-routing
title: Route the mobile app to one flow per account state
status: in-progress
created: 2026-10-10
started: 2026-10-10
base_commit: cdd314e861f931b2e000d921b380c5f8abe1aa25
fronts: [mobile]
depends_on: []
---

# 005 — Route the mobile app to one flow per account state

## Goal

The mobile app gets one central decision point, `resolveFlow`, that picks the flow a person sees — auth,
onboarding, reactivation, offboarding (denied or removed), or the student, instructor or admin experience — from
whether they are signed in, their role and their status. Expo Router guards make only that flow's screens
reachable. Each flow is a route group with a placeholder entry screen, so the specs that build the real screens
only add files to a flow's folder and never touch the decision again.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: **User** (role `student` | `instructor` |
  `admin`; status `pending` | `approved` | `denied` | `deleted` | `removed`), Roles and permissions, and the
  decision that every account waits for approval before seeing anything.
- Requirements: [requirements.md → Registrations wait for approval](../../../.docs/requirements.md#registrations-wait-for-approval)
  — a pending account sees only that it is waiting (this spec routes it to the onboarding flow; the screen itself
  comes later). [requirements.md → Onboarding after approval](../../../.docs/requirements.md#onboarding-after-approval)
  — approved users add their WhatsApp number and accept the school rules before using the rest of the app (this
  spec builds the branch that routes there, see D-03).
- Technical: [technical-context.md](../../memory/technical-context.md) — Applications → `apps/mobile`, Fixed
  conventions → Mobile routes (every path in `src/constants/routes.ts`), Mobile shared UI, Design system,
  Authentication → Mobile session ("the root layout routes by account state … before any private screen
  renders" — this spec builds that routing, without the token storage), Coverage (`apps/mobile/src/app/**` is
  excluded, so logic lives outside it).
- Expo Router 57 protected routes: `<Stack.Protected guard={boolean}>` around `<Stack.Screen name="…" />`
  makes those screens unreachable while the guard is false; navigating to one, or being on one when its guard
  turns false, moves to the first available screen of the navigator. Tests can drive routes with
  `renderRouter` from `expo-router/testing-library`.
- Existing code this builds on (all in `apps/mobile`):
  - `src/app/_layout.tsx` — root `Stack` (`headerShown: false`) inside the theme, query client and
    `AlertMessageProvider`.
  - `src/app/index.tsx` — always redirects to `routes.auth.signIn`.
  - `src/app/(public)/auth/*` — the sign-in, Create account and Confirm email routes.
  - `src/modules/auth/screens/confirm-code.screen.tsx` — renders `ConfirmCode` without `onVerified`;
    `ConfirmCode`/`useConfirmCode` already call `onVerified(response)` with the verify response
    (`src/modules/auth/hooks/use-verify-sign-in-code.hook.ts`: `user: { id, name, email, role, status }`).
  - `src/constants/routes.ts` — `routes.auth.*` only.
  - `@rochas-surf-school/auth` exports `USER_ROLES`, `UserRole`, `USER_STATUSES` and `UserStatus`
    (`modules/auth/src/user/model/user.entity.ts`).
- Before writing code under `apps/mobile`, load the `vercel-react-native-skills` and
  `vercel-react-best-practices` skills and follow `.claude/rules/react.md` (one folder per component).

## Scope

### In scope

- `resolveFlow`, the pure function that maps the session to one flow, and the `Flow` type.
- An in-memory session store (`SessionProvider` / `useSession`) holding the signed-in account or `null`.
- The Confirm email screen putting the verified account in the session.
- `Stack.Protected` guards in the root navigator, one per flow group, driven only by `resolveFlow`.
- One route group per flow with a placeholder entry screen: onboarding, reactivation, offboarding (denied and
  removed screens), student, instructor, admin.
- The flow paths in `src/constants/routes.ts` and the flow names in en-US, es-ES and pt-BR.
- The routing paragraph of `CLAUDE.md` (`src/app/index.tsx` no longer always redirects to sign-in).

### Out of scope

- Keeping the session across app restarts (`expo-secure-store`): a restart goes back to sign-in.
- Calling `GET /auth/me` at launch or on foreground, renewing tokens (`POST /auth/refresh`) and signing out.
- Any backend change, including exposing the WhatsApp number, rules acceptances or reactivation status.
- The real screens of every flow: waiting for approval, the WhatsApp and school-rules steps, Account deleted and
  the reactivation request, the denied and removed screens, and any student, instructor or admin screen.
- Tabs or any navigator other than a Stack inside the role experiences.
- Offline, loading or error states while routing (there is no request to wait for).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The root navigator wraps each flow group in `<Stack.Protected guard={flow === …}>`; the guard values come only from `resolveFlow`. No screen, layout or hook decides access on its own. | Expo Router's documented access pattern, and one function holding every rule is the single decision point the change asks for and is unit-testable. |
| D-02 | Mapping: no user → `auth`; `pending` → `onboarding`; `approved` and onboarding not completed → `onboarding`; `approved` and onboarding completed → the role (`student` \| `instructor` \| `admin`); `deleted` → `reactivation`; `denied` → `offboarding-denied`; `removed` → `offboarding-removed`. | Every status/role pair lands in exactly one flow, following the account lifecycle in product.md. |
| D-03 | Onboarding is **completed** when an approved account has a WhatsApp number **and** has accepted the current school-rules version that requires acceptance; it is **not completed** on first use after approval, after a required rules change, and for a returning account that missed one. `resolveFlow` takes an `onboardingCompleted` boolean; this spec always passes `true`. | `/auth/me` doesn't expose the WhatsApp number or the acceptances, and school-rules versions don't exist in the backend yet; the onboarding spec supplies the real value without touching the router. |
| D-04 | `pending` uses the onboarding flow (its future first screen is waiting for approval, then the setup steps). | The onboarding flow covers everything from sign-up to first use; a pending account never had access, so it isn't offboarding. |
| D-05 | `deleted` always resolves to `reactivation`, whatever its reactivation status. | The requirements show a denied reactivation request on the same "Account deleted" screen. |
| D-06 | The session store is an in-memory React context in `src/providers/session/` exposing `user` (`{ id, name, email, role, status } \| null`, starting `null`), `setUser(user)` and `clearUser()`. Nothing is stored on the device. | It makes every flow reachable today; restoring a saved session later only has to call `setUser`. |
| D-07 | A role or status outside `USER_ROLES` / `USER_STATUSES` resolves to `auth`. | The backend validates both, so this only guards against contract drift; sign-in is the one flow that can't expose private screens. |
| D-08 | Each flow has its own path segment: `/onboarding`, `/reactivation`, `/offboarding/denied`, `/offboarding/removed`, `/student`, `/instructor`, `/admin`. Route groups: `(onboarding)/onboarding`, `(reactivation)/reactivation`, `(offboarding)/offboarding`, `(private)/student`, `(private)/instructor`, `(private)/admin`, next to the existing `(public)/auth`. | Groups whose index would all resolve to `/` collide in Expo Router. |
| D-09 | Each placeholder shows only its flow's translated name in the `ds-text-screen-title` style on the `bg-page` background, with no button. Role experiences are plain Stacks. | The real screens belong to the specs that design them; a restart already resets to sign-in, so nobody is stuck. |
| D-10 | `src/app/index.tsx` stays unguarded and redirects to the resolved flow's entry route (`flowEntryRoute(flow)`); when the flow changes, the guards fall back to it. Entry routes: `auth` → `/auth`, `onboarding` → `/onboarding`, `reactivation` → `/reactivation`, `offboarding-denied` → `/offboarding/denied`, `offboarding-removed` → `/offboarding/removed`, `student` → `/student`, `instructor` → `/instructor`, `admin` → `/admin`. | Every landing goes through the resolver, so a flow change never strands the person on a screen they can no longer reach. |
| D-11 | Navigation logic lives in `src/navigation/` (`resolve-flow.ts`, `root-navigator/`); `src/app/_layout.tsx` renders `RootNavigator`. Placeholder screens live in `src/modules/<flow>/screens/` (`onboarding`, `reactivation`, `offboarding`, `student`, `instructor`, `admin`) and route files only render them. | `src/app/**` is excluded from coverage, so the guards must sit in tested code; the module folders are where each flow's future screens go. |
| D-12 | Inside `(offboarding)/offboarding/_layout.tsx`, `denied` and `removed` are themselves guarded by the flow (`offboarding-denied` / `offboarding-removed`). | A denied person must not reach the removed screen and vice versa; the reason picks the screen. |

## Expected Results

### ER-01 — `resolveFlow` maps every account state to exactly one flow

- **Front:** mobile
- **Behavior:** Given `resolveFlow({ user, onboardingCompleted })`, then: `user` null → `auth`; status `pending`
  (any role) → `onboarding`; status `approved` with `onboardingCompleted: false` (any role) → `onboarding`;
  status `approved` with `onboardingCompleted: true` → `student`, `instructor` or `admin` matching the role;
  `deleted` → `reactivation`; `denied` → `offboarding-denied`; `removed` → `offboarding-removed`.
- **Edge and error cases:** an unknown status, or an unknown role on an approved account with onboarding
  completed, → `auth`; `pending`, `deleted`, `denied` and `removed` give the same flow for all three roles;
  `flowEntryRoute` returns the entry route of D-10 for each of the eight flows.
- **Verify by:** `npx jest src/navigation/resolve-flow` (from `apps/mobile`) — table-driven tests
  "resolves {state} to {flow}" covering every status × role pair, the unknown cases and each entry route.

### ER-02 — A signed-out app opens on sign-in and can't reach any other flow

- **Front:** mobile
- **Behavior:** Given no account in the session, when the app opens at `/`, then the sign-in screen
  ("Continue with email") is shown; when it navigates to `/onboarding`, `/reactivation`, `/offboarding/denied`,
  `/offboarding/removed`, `/student`, `/instructor` or `/admin`, then the sign-in screen is shown instead.
- **Edge and error cases:** Create account and Confirm email stay reachable while signed out.
- **Verify by:** `npx jest src/navigation/root-navigator` (from `apps/mobile`) — `renderRouter` tests
  "opens on sign-in when signed out" and "redirects {path} to sign-in when signed out" (one per path).

### ER-03 — A correct code puts the account in the session and opens its flow

- **Front:** mobile
- **Behavior:** Given the Confirm email screen, when the code check answers 200, then the response's `user` is
  set in the session; for a new sign-up (status `pending`) the Onboarding placeholder is shown.
- **Edge and error cases:** a failed check (any error) leaves the session empty and the person on Confirm email,
  with the existing inline or toast message.
- **Verify by:** `npx jest src/modules/auth/screens/confirm-code` (from `apps/mobile`) — tests "puts the
  verified account in the session" and "keeps the session empty when the check fails"; and the
  `src/navigation/root-navigator` test "opens onboarding after a pending account signs in".

### ER-04 — Each flow opens on its entry screen with its translated name

- **Front:** mobile
- **Behavior:** Given an account in the session, when the app opens at `/`, then the entry screen of its flow
  shows the flow name: pending or approved-without-onboarding → "Onboarding"; deleted → "Reactivation"; denied →
  "Registration denied"; removed → "Access removed"; approved student → "Student"; approved instructor →
  "Instructor"; approved admin → "Admin" (en-US). In pt-BR the names are "Primeiros passos", "Reativação",
  "Cadastro recusado", "Acesso removido", "Aluno", "Instrutor", "Administrador"; in es-ES "Primeros pasos",
  "Reactivación", "Registro rechazado", "Acceso eliminado", "Alumno", "Instructor", "Administrador".
- **Edge and error cases:** colors, font and spacing come from the design tokens (no raw values); the three
  locale files have the same keys (the type check fails otherwise).
- **Verify by:** `npx jest src/navigation/root-navigator src/components/flow-placeholder` (from `apps/mobile`)
  — tests "opens {flow} on {entry route}" (one per account state, asserting the path and the name) and
  "shows the name in pt-BR and es-ES"; `npx turbo run check-types --filter=@rochas-surf-school/mobile` exits 0.

### ER-05 — A flow's routes are unreachable from any other flow

- **Front:** mobile
- **Behavior:** Given an approved student in the session, when the app navigates to `/admin`, `/instructor`,
  `/onboarding`, `/reactivation`, `/offboarding/denied`, `/offboarding/removed` or `/auth`, then the Student
  screen (`/student`) is shown. Given the person was on Confirm email when the account entered the session,
  then going back does not show any auth screen.
- **Edge and error cases:** a denied account navigating to `/offboarding/removed` lands on
  `/offboarding/denied`, and a removed one navigating to `/offboarding/denied` lands on `/offboarding/removed`;
  clearing the session (`clearUser`) from any flow shows the sign-in screen.
- **Verify by:** `npx jest src/navigation/root-navigator` (from `apps/mobile`) — tests "keeps a student on
  student for {path}", "can't go back to auth after signing in", "keeps denied and removed on their own screen"
  and "returns to sign-in when the session is cleared".

### ER-06 — Signing in in the simulator lands on the account's flow

- **Front:** mobile
- **Behavior:** Given the backend running locally with `REVIEW_ACCOUNTS` set in `apps/backend/.env` (one
  approved account per role) and the app in the iOS simulator, when the person signs in with the student review
  account's email and fixed code, then the "Student" screen is shown; with the instructor one, "Instructor"; with
  the admin one, "Admin"; and when a new email signs up (name, email, the code from the backend log), then
  "Onboarding" is shown.
- **Edge and error cases:** after each sign-in, the iOS back-swipe from the left edge doesn't return to Confirm
  email; restarting the app goes back to sign-in (no saved session, by scope).
- **Verify by:** user journey in the iOS simulator, as described above (Continue with email → Create account →
  Confirm email; the review accounts are signed in the same way with their own email and fixed code).

## Tasks

### Mobile (`apps/mobile`)

- [x] **T-01** — Add `Flow` (`auth` | `onboarding` | `reactivation` | `offboarding-denied` |
  `offboarding-removed` | `student` | `instructor` | `admin`), `resolveFlow({ user, onboardingCompleted })` and
  `flowEntryRoute(flow)` in `src/navigation/resolve-flow.ts` (types in `src/navigation/resolve-flow.types.ts`),
  using `USER_ROLES` / `USER_STATUSES` from `@rochas-surf-school/auth` (D-02, D-03, D-07, D-10). Add the flow
  paths to `src/constants/routes.ts` (`routes.onboarding.home`, `routes.reactivation.home`,
  `routes.offboarding.denied`, `routes.offboarding.removed`, `routes.student.home`, `routes.instructor.home`,
  `routes.admin.home`; D-08). Tests in `src/navigation/resolve-flow.test.ts`, table-driven over every
  status × role pair and each entry route.
  Covers: ER-01 · Done when: `npx jest src/navigation/resolve-flow` passes and covers every line of the file.
  > ✅ 2026-10-10 01:45 — added the Flow and SessionUser types, resolveFlow (status → flow, unknown status/role →
  > auth, onboardingCompleted gate for approved accounts) and flowEntryRoute, plus the seven flow paths in
  > routes.ts; files: `apps/mobile/src/navigation/resolve-flow.ts`, `apps/mobile/src/navigation/resolve-flow.types.ts`,
  > `apps/mobile/src/navigation/resolve-flow.test.ts`, `apps/mobile/src/constants/routes.ts`;
  > verified: `npx jest src/navigation/resolve-flow --coverage` (33 passed; resolve-flow.ts 100%
  > statements/branches/functions/lines); deviations: none

- [ ] **T-02** — Add `SessionProvider` and `useSession` (`user`, `setUser`, `clearUser`; D-06) in
  `src/providers/session/` following the `alert-message` provider's layout (`session.context.ts`,
  `session.provider.tsx`, `session.types.ts`, `use-session.ts`, `index.ts`), and mount it in
  `src/app/_layout.tsx` around the navigator. Tests in `src/providers/session/session.provider.test.tsx`
  (starts `null`, `setUser` then `clearUser`, `useSession` outside the provider throws).
  Covers: enabling · Done when: `npx jest src/providers/session` passes.

- [ ] **T-03** — Add the `FlowPlaceholder` component (`title` prop; `ds-text-screen-title` on `bg-page`,
  centered, safe-area aware; D-09) in `src/components/flow-placeholder/` (one folder per component), and the
  `flows.*` keys with the ER-04 names in `src/i18n/messages/{en-US,es-ES,pt-BR}.ts`. Tests in
  `src/components/flow-placeholder/flow-placeholder.component.test.tsx`, including "shows the name in pt-BR and
  es-ES".
  Covers: ER-04 · Done when: `npx jest src/components/flow-placeholder` passes and
  `npx turbo run check-types --filter=@rochas-surf-school/mobile` exits 0.

- [ ] **T-04** — Add the placeholder screens, each rendering `FlowPlaceholder` with its `flows.*` name:
  `src/modules/onboarding/screens/onboarding.screen.tsx`,
  `src/modules/reactivation/screens/reactivation.screen.tsx`,
  `src/modules/offboarding/screens/{denied,removed}.screen.tsx`,
  `src/modules/student/screens/student.screen.tsx`, `src/modules/instructor/screens/instructor.screen.tsx`,
  `src/modules/admin/screens/admin.screen.tsx`; and their routes under `src/app/` (D-08, D-11):
  `(onboarding)/onboarding/{_layout,index}.tsx`, `(reactivation)/reactivation/{_layout,index}.tsx`,
  `(offboarding)/offboarding/{_layout,denied,removed}.tsx`, `(private)/{student,instructor,admin}/{_layout,index}.tsx`
  — each `_layout.tsx` a `Stack` with `headerShown: false` (the offboarding one guards `denied` and `removed`
  with `Stack.Protected` from `useSession` + `resolveFlow`, D-12). One render test per screen next to it
  (`*.screen.test.tsx`).
  Covers: ER-04 · Done when: `npx jest src/modules/onboarding src/modules/reactivation src/modules/offboarding
  src/modules/student src/modules/instructor src/modules/admin` passes.

- [ ] **T-05** — Add `RootNavigator` in `src/navigation/root-navigator/` (`root-navigator.component.tsx`,
  `root-navigator.hook.ts` returning the resolved flow from `useSession` with `onboardingCompleted: true`,
  `index.ts`): a `Stack` (`headerShown: false`) with `index` unguarded and one `Stack.Protected` per group —
  `(public)` for `auth`, `(onboarding)`, `(reactivation)`, `(offboarding)` for both offboarding flows,
  `(private)/student`, `(private)/instructor`, `(private)/admin` for their role (D-01). Render it from
  `src/app/_layout.tsx`, and make `src/app/index.tsx` redirect to `flowEntryRoute(flow)` (D-10). Update the
  `apps/mobile` paragraph of `CLAUDE.md` (flows, `resolveFlow`, where to add a flow's screens). Tests in
  `src/navigation/root-navigator/root-navigator.component.test.tsx` with `renderRouter` from
  `expo-router/testing-library` and a mocked route tree built from the real route components: every test named
  in ER-02, ER-04 and ER-05's `Verify by`, plus "opens onboarding after a pending account signs in" (sets the
  session while on `/auth/confirm-code`).
  Covers: ER-02, ER-03, ER-04, ER-05, ER-06 · Done when: `npx jest src/navigation/root-navigator` passes.

- [ ] **T-06** — Pass `onVerified` from `src/modules/auth/screens/confirm-code.screen.tsx` so the verify
  response's `user` goes to `useSession().setUser` (D-06). Update
  `src/modules/auth/screens/confirm-code.screen.test.tsx` with "puts the verified account in the session" and
  "keeps the session empty when the check fails" (wrapping the screen in `SessionProvider`).
  Covers: ER-03, ER-06 · Done when: `npx jest src/modules/auth/screens/confirm-code` passes.

### Verification

- [ ] **T-07** — Run every command in the Verification Plan from the repo root; all pass. Then follow the ER-06
  journey in the iOS simulator. Record the output summary and what the journey showed as evidence.
  Covers: all · Done when: every command exits 0 and the ER-06 journey shows the four expected screens.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 005` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 005` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` — no errors (type check also proves the
    three locale files share the keys).
  - `node .specs/scripts/run-e2e.mjs 005` — runs the e2e suites of the apps touched (none for mobile; expected to
    report nothing to run).
- User journeys (iOS simulator, backend running with `npm run dev` and `REVIEW_ACCOUNTS` set in
  `apps/backend/.env`):
  - ER-06 — sign in with each review account (student, instructor, admin) and see "Student", "Instructor",
    "Admin"; sign up with a new email (code from the backend log) and see "Onboarding"; the back-swipe doesn't
    return to Confirm email; restarting the app shows the sign-in screen.

## Memory Impact

- `memory/technical-context.md` — Fixed conventions → Mobile routes: flows and their route groups, `resolveFlow`
  as the single decision point, `Stack.Protected` guards in `RootNavigator`, `onboardingCompleted` fixed to
  `true` until the onboarding spec; Authentication → Mobile session: the in-memory session store (no device
  storage yet).
- `memory/structure.md` — `apps/mobile`: the route groups `(onboarding)`, `(reactivation)`, `(offboarding)`,
  `(private)/{student,instructor,admin}`, `src/navigation/`, `src/providers/session/`,
  `src/components/flow-placeholder/` and the flow modules `src/modules/{onboarding,reactivation,offboarding,student,instructor,admin}/screens`.
- `memory/modules/auth.md` — Who can do what: in the app, a correct code puts the account in the session and
  opens the flow of its status and role; Spec history: add `005-mobile-flow-routing`.

## Assumptions

- The user accepted that, until the onboarding spec, every approved account counts as onboarding completed
  (D-03), so approved accounts go straight to their role's experience.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
