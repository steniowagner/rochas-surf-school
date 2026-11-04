---
id: "087"
slug: single-push-on-repeated-tap
title: Open a screen once when its item is tapped repeatedly
template: quick
status: finished
created: 2026-11-04
started: 2026-11-04
base_commit: e2b50a4ef102666c74cf88cd4a035a90575568b7
reviewed_commit: de99050289c326c457ecd14966798e604ad45d80
fronts: [mobile]
depends_on: []
finished: 2026-11-04
---

# 087 — Open a screen once when its item is tapped repeatedly

## Goal

Tapping a menu item, list row or header button again before its screen finishes opening no longer stacks a
second copy of that screen. All of the app's push navigation goes through one helper that reuses a screen
already in the stack, and a lint rule keeps new code on it.

## Context

- Requirements: none — this fixes navigation behavior no source-document section describes.
- Cause: every call site runs `router.push(href)` with no options. In Expo Router 57 a `PUSH` always adds a
  route unless the action or the screen gives it an id (`node_modules/expo-router/build/layouts/StackClient.js`,
  `case 'PUSH'`), and each tap queues its own action, so a second tap during the slide-in animation pushes the
  same screen again and the person needs two back presses.
- Fix in the library: `router.push(href, { dangerouslySingular: true })` gives the push the id of its route with
  the path params filled in (`class/abc`). When a route with that id is already in the stack it is moved to the
  top instead of a new one being added; when it is already on top, nothing happens (same route key, no second
  animation, no remount). The app already does this for the "Avisos" message opened from a notification
  (`src/modules/notifications/hooks/use-notification-response.hook.ts`, spec 055).
- Existing code this changes: the `router.push` calls in `apps/mobile/src` (23 files):
  - `components/user-header/user-header.hook.ts`
  - `modules/auth/`: `components/auth/auth.component.tsx`, `components/confirm-code/confirm-code.hook.ts`,
    `hooks/use-apple-sign-in.hook.ts`, `hooks/use-google-sign-in.hook.ts`, `screens/create-account.screen.tsx`,
    `screens/email-choice.screen.tsx`, `screens/email-sign-in.screen.tsx`
  - `modules/classes/`: `components/class-history/class-history.hook.ts`, `screens/class-details.screen.hook.ts`,
    `screens/classes-week.screen.hook.ts`, `screens/edit-class.screen.hook.ts`, `screens/new-class.screen.hook.ts`,
    `screens/teaching-classes.screen.hook.ts`, `screens/weekly-occupancy.screen.hook.ts`
  - `modules/enrolment/`: `hooks/use-class-requests-screen.hook.ts`, `screens/my-classes.screen.hook.ts`
  - `modules/admin/screens/admin.screen.tsx`, `modules/instructor/screens/instructor.screen.tsx`
  - `modules/notifications/`: `hooks/use-notification-response.hook.ts`, `screens/notifications.screen.hook.ts`
  - `modules/profile/`: `components/delete-account-sheet/delete-account-sheet.hook.ts`,
    `components/profile/profile.hook.ts`
- Conventions: [technical-context.md → Fixed conventions](../../memory/technical-context.md#fixed-conventions)
  (Mobile routes: `router` calls take `routes.<module>.<screen>`, never string literals).

## Scope

- In: every `router.push` in `apps/mobile/src` — taps, form-success pushes, the header bell, the notifications
  screen and the notification-response hook — plus a lint rule that rejects a direct `router.push`.
- Out: two *different* targets tapped very fast (A then B both open, as today); pushes that differ only in query
  params (`new-class?date=…`), which share one id; `router.replace` and the tab bar's `navigation.navigate`, which
  can't stack duplicates.

## Decisions

| ID | Decision | Reason |
| --- | --- | --- |
| D-01 | Use Expo Router's `dangerouslySingular` on the push, not a time-based throttle. | Library-native and timer-free: a throttle would also drop the quick push → back → push sequences the navigation tests run, and leak state between tests. A singular push to the screen already on top is a no-op. Decided with the user. |
| D-02 | Every `router.push` goes through `pushScreen`, notification responses included. Accepted side effect: in one role's stack, a route with the same path params exists once — pushing it again brings the existing copy to the top. | One helper used everywhere is what keeps the fix; no current flow pushes the same route and params twice on purpose. Decided with the user. |
| D-03 | Rapid taps on two different targets and query-param-only differences stay out of scope. | The reported bug is the same item opening twice; covering the rest needs a different mechanism (a lock or throttle) that D-01 rejected. |
| D-04 | An ESLint `no-restricted-syntax` rule in `apps/mobile` rejects `router.push(` everywhere except `src/navigation/push-screen.ts`. | Without it the next screen brings the bug back. Decided with the user. |

## Expected Results

### ER-01 — Tapping the same item again opens its screen once

- **Front:** mobile
- **Behavior:** Given an admin on the home tab, when they tap the "Join the school" menu item (`admin.home.registrationsRow`, which opens Registrations) twice in a row before the
  first push settles, then the stack holds one registrations screen and one `router.back()` returns to the home
  tab. Given an admin on the classes tab, when they tap the same class row twice, then one class detail screen
  of that class is open and one back returns to the list.
- **Edge and error cases:** pushing the class detail of a *different* class still adds a screen; the "Avisos"
  message opened from a notification still opens once (spec 055); `pushScreen` always passes
  `{ dangerouslySingular: true }` to `router.push`, and the call sites still push the same `routes.…` hrefs as
  before.
- **Verify by:** from `apps/mobile`, `npx jest src/navigation/push-screen.test.ts` and
  `npx jest src/modules/admin/admin-tabs.navigation.test.tsx -t "double tap"`; user journey in the iOS simulator:
  as an admin, double-tap a home menu item and a class row — one screen opens, one back returns.

### ER-02 — Lint rejects a direct `router.push`

- **Front:** mobile
- **Behavior:** Given `apps/mobile`, when ESLint checks a file under `src/` that calls `router.push(`, then it
  reports an error whose message names `pushScreen` from `@/navigation/push-screen`.
- **Edge and error cases:** `src/navigation/push-screen.ts` itself is allowed; `router.replace`, `router.back`
  and `Redirect` are not affected; the codebase after this spec lints clean.
- **Verify by:** from `apps/mobile`,
  `printf 'import { router } from "expo-router";\nrouter.push("/");\n' | npx eslint --stdin --stdin-filename src/sample.ts`
  exits 1 with the `pushScreen` message, and `npx turbo run lint --filter=@rochas-surf-school/mobile` passes.

## Tasks

### Mobile (`apps/mobile`)

- [x] **T-01** — Add `src/navigation/push-screen.ts` exporting `pushScreen(href: Href)`, which calls
  `router.push(href, { dangerouslySingular: true })`, with `push-screen.test.ts` (mocks `expo-router`, checks the
  call). Skills: `vercel-react-native-skills`.
  Covers: ER-01 · Done when: `npx jest src/navigation/push-screen.test.ts` passes.
  > ✅ 2026-11-04 18:19 — added `pushScreen(href)`, which calls `router.push(href, { dangerouslySingular: true })`,
  > and its test (mocks `expo-router`; checks one call with the href and the singular option; it fails when the
  > option is removed); files: `apps/mobile/src/navigation/push-screen.ts`,
  > `apps/mobile/src/navigation/push-screen.test.ts`; verified: `npx jest src/navigation/push-screen.test.ts`
  > (1 passed), `npx eslint` on both files clean; deviations: none
- [x] **T-02** — Replace `router.push` with `pushScreen` in the auth module's seven files listed in Context, and
  update their tests' `router.push` assertions to the new arguments.
  Covers: ER-01 · Done when: `npx jest src/modules/auth` passes and no `router.push` is left in `src/modules/auth`.
  > ✅ 2026-11-04 18:21 — the seven auth files call `pushScreen(…)` with the same `routes.auth.…` hrefs; the
  > `router` import is dropped where nothing else uses it (kept in `confirm-code.hook.ts` and
  > `email-sign-in.screen.tsx` for `back` / `dismissTo` / `replace`); the eight `router.push` assertions now
  > expect `(href, { dangerouslySingular: true })`; files: `apps/mobile/src/modules/auth/screens/create-account.screen.tsx`,
  > `apps/mobile/src/modules/auth/screens/email-choice.screen.tsx`, `apps/mobile/src/modules/auth/screens/email-sign-in.screen.tsx`,
  > `apps/mobile/src/modules/auth/components/confirm-code/confirm-code.hook.ts`,
  > `apps/mobile/src/modules/auth/components/auth/auth.component.tsx`, `apps/mobile/src/modules/auth/hooks/use-apple-sign-in.hook.ts`,
  > `apps/mobile/src/modules/auth/hooks/use-google-sign-in.hook.ts`, `apps/mobile/src/modules/auth/screens/create-account.screen.test.tsx`,
  > `apps/mobile/src/modules/auth/screens/email-sign-in.screen.test.tsx`,
  > `apps/mobile/src/modules/auth/components/confirm-code/confirm-code.component.test.tsx`,
  > `apps/mobile/src/modules/auth/components/auth/auth.component.test.tsx`,
  > `apps/mobile/src/modules/auth/hooks/use-google-sign-in.hook.test.tsx`,
  > `apps/mobile/src/modules/auth/hooks/use-apple-sign-in.hook.test.tsx`; verified: `npx jest src/modules/auth` (28 suites,
  > 317 passed; 10 failed before the assertions were updated), `grep -rn "router.push" src/modules/auth` outside tests
  > finds nothing, `npx eslint src/modules/auth` clean, changed lines 100% covered (`--coverage`); deviations: none
- [x] **T-03** — Replace `router.push` with `pushScreen` in the classes and enrolment files listed in Context, and
  update their tests.
  Covers: ER-01 · Done when: `npx jest src/modules/classes src/modules/enrolment` passes and no `router.push` is
  left in either module.
  > ✅ 2026-11-04 18:25 — the classes and enrolment hooks call `pushScreen(…)` with the same `routes.…` hrefs
  > (`router` / `useRouter` imports dropped where nothing else uses them); the tests' `router.push` assertions now
  > expect the `{ dangerouslySingular: true }` second argument; files: `apps/mobile/src/modules/classes/components/class-history/class-history.hook.ts`, `apps/mobile/src/modules/classes/screens/class-details.screen.hook.ts`, `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`, `apps/mobile/src/modules/classes/screens/classes-week.screen.hook.ts`, `apps/mobile/src/modules/classes/screens/classes-week.screen.test.tsx`, `apps/mobile/src/modules/classes/screens/edit-class.screen.hook.ts`, `apps/mobile/src/modules/classes/screens/edit-class.screen.test.tsx`, `apps/mobile/src/modules/classes/screens/new-class.screen.hook.ts`, `apps/mobile/src/modules/classes/screens/new-class.screen.test.tsx`, `apps/mobile/src/modules/classes/screens/teaching-class-history.screen.test.tsx`, `apps/mobile/src/modules/classes/screens/teaching-classes.screen.hook.ts`, `apps/mobile/src/modules/classes/screens/teaching-classes.screen.test.tsx`, `apps/mobile/src/modules/classes/screens/weekly-occupancy.screen.hook.ts`, `apps/mobile/src/modules/classes/screens/weekly-occupancy.screen.test.tsx`, `apps/mobile/src/modules/enrolment/hooks/use-class-requests-screen.hook.ts`, `apps/mobile/src/modules/enrolment/screens/class-requests.screen.test.tsx`, `apps/mobile/src/modules/enrolment/screens/my-class-history.screen.test.tsx`, `apps/mobile/src/modules/enrolment/screens/my-classes.screen.hook.ts`, `apps/mobile/src/modules/enrolment/screens/my-classes.screen.test.tsx`; verified:
  > `npx jest src/modules/classes src/modules/enrolment` (1443 passed; 24 failed before the assertions were updated),
  > `grep -rn "router.push"` in both modules outside tests finds nothing, `npx eslint` on both modules clean,
  > `npx tsc --noEmit` clean, the changed lines 100% covered (`--coverage`); deviations:
  > `use-class-requests-screen.hook.ts` pushed through `useRouter().push`, so its `useRouter` call is removed and
  > `class-requests.screen.test.tsx` mocks `router.push` instead of `useRouter`; prettier was run only on files that
  > were already prettier-clean, so unrelated lines are not reformatted
- [x] **T-04** — Replace `router.push` with `pushScreen` in `components/user-header`, `modules/admin`,
  `modules/instructor`, `modules/notifications` (the hook's Avisos branch keeps one-screen behavior through
  `pushScreen`) and `modules/profile`, and update their tests.
  Add "double tap" tests to `src/modules/admin/admin-tabs.navigation.test.tsx` (`renderRouter`): pressing the
  "Join the school" menu item twice leaves one registrations screen and one `router.back()` shows the home tab;
  pressing the same class row twice leaves one class detail; pushing a different class adds a screen.
  Covers: ER-01 · Done when: `npx jest src/components src/modules/admin src/modules/instructor src/modules/notifications src/modules/profile`
  passes (the `-t "double tap"` tests included) and `grep -rn "router.push" src --include='*.ts' --include='*.tsx'`
  finds only `push-screen.ts` and tests.
  > ✅ 2026-11-04 18:28 — the user header's bell, the admin and instructor homes, the notifications screen, the
  > notification-response hook and the profile hooks call `pushScreen(…)` with the same hrefs; in the hook the Avisos
  > branch (`router.push(target, { dangerouslySingular: true })`) and the plain branch now both are `pushScreen(target)`,
  > so they are one branch and `isAdminMessageType` is no longer imported there (Avisos still opens once: "shows the new
  > message on an open Avisos, without a second one under it" passes); the tests' `router.push` assertions expect the
  > singular option; three "double tap" tests in `admin-tabs.navigation.test.tsx` (`renderRouter`): Join the school
  > pressed twice → one back shows Panel; the same class row pressed twice → one back shows Classes; `pushScreen` of a
  > different class adds a screen (back returns to the first class); files: `apps/mobile/src/components/user-header/user-header.component.test.tsx`, `apps/mobile/src/components/user-header/user-header.hook.ts`, `apps/mobile/src/modules/admin/admin-tabs.navigation.test.tsx`, `apps/mobile/src/modules/admin/screens/admin.screen.tsx`, `apps/mobile/src/modules/instructor/screens/instructor.screen.tsx`, `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.test.tsx`, `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.ts`, `apps/mobile/src/modules/notifications/screens/notifications.screen.hook.ts`, `apps/mobile/src/modules/notifications/screens/notifications.screen.test.tsx`, `apps/mobile/src/modules/profile/components/delete-account-sheet/delete-account-sheet.component.test.tsx`, `apps/mobile/src/modules/profile/components/delete-account-sheet/delete-account-sheet.hook.ts`, `apps/mobile/src/modules/profile/components/profile/profile.hook.ts`, `apps/mobile/src/modules/profile/screens/profile.screen.test.tsx`; verified:
  > `npx jest src/components src/modules/admin src/modules/instructor src/modules/notifications src/modules/profile`
  > (75 suites, 983 passed; 16 failed before the assertions were updated); `-t "double tap"` 3 passed, and with
  > `pushScreen` temporarily reduced to `router.push(href)` the two double-press tests fail (`Received:
  > "/admin/registrations"`, `"/admin/class/c-1"`); `grep -rn "router.push" src` outside tests finds only
  > `src/navigation/push-screen.ts`; `npx eslint` clean, `npx tsc --noEmit` clean, the changed lines 100% covered;
  > deviations: the hook's two push branches merged into one (both would have been `pushScreen(target)`)
- [x] **T-05** — Add a `no-restricted-syntax` rule to `apps/mobile/eslint.config.js` for
  `CallExpression[callee.object.name='router'][callee.property.name='push']`, message
  "Use pushScreen from @/navigation/push-screen so a repeated tap doesn't open the screen twice.", with
  `src/navigation/push-screen.ts` exempt.
  Covers: ER-02 · Done when: the stdin command in ER-02 exits 1 with that message and
  `npx turbo run lint --filter=@rochas-surf-school/mobile` passes.
  > ✅ 2026-11-04 18:30 — `no-restricted-syntax` rule for `CallExpression[callee.object.name='router'][callee.property.name='push']`
  > on `src/**/*.{js,jsx,ts,tsx}`, `src/navigation/push-screen.ts` ignored, with the spec's message; the four test calls
  > that drove navigation with a direct `router.push` (two in `root-navigator.component.test.tsx`, the People tab
  > checks in both role navigation tests) now call `pushScreen`; files: `apps/mobile/eslint.config.js`, `apps/mobile/src/modules/admin/admin-tabs.navigation.test.tsx`, `apps/mobile/src/modules/instructor/instructor-tabs.navigation.test.tsx`, `apps/mobile/src/navigation/root-navigator/root-navigator.component.test.tsx`; verified: the ER-02 stdin command exits 1
  > with "Use pushScreen from @/navigation/push-screen so a repeated tap doesn't open the screen twice"; the same with
  > `router.replace("/")` and `router.back()` exits 0; `npx eslint src` clean;
  > `npx turbo run lint --filter=@rochas-surf-school/mobile` 3 successful; the three changed test files 106 passed;
  > deviations: the four test calls above were not named by the task — the rule exempts only `push-screen.ts` (D-04),
  > so tests had to move to `pushScreen` for the codebase to lint clean (ER-02)

### Verification

- [x] **T-06** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0 (the ER-02 stdin check exits 1 as
  expected) and the simulator journey in ER-01 is recorded.
  > ✅ 2026-11-04 18:35 — ran the Verification Plan from the repo root; files: none (verification only);
  > verified: `node .specs/scripts/run-related-tests.mjs 087` → 57 suites, 1429 passed, RELATED TESTS PASSED;
  > `node .specs/scripts/check-coverage.mjs 087` → COVERAGE OK, every changed line covered in 24 files;
  > `npx jest src/navigation/push-screen.test.ts` → 1 passed; `npx jest src/modules/admin/admin-tabs.navigation.test.tsx
  > -t "double tap"` → 3 passed; the ER-02 stdin `eslint` command → exit 1, "Use pushScreen from
  > @/navigation/push-screen so a repeated tap doesn't open the screen twice"; `npx turbo run lint check-types build
  > --filter=@rochas-surf-school/mobile` → 14 successful (mobile has no `build` script); `node .specs/scripts/run-e2e.mjs
  > 087` → E2E PASSED, no suite applies to `apps/mobile`. Simulator (iPhone 18 Pro, iOS 27, app relaunched on this
  > branch's bundle, signed in as an admin, pt-BR): two taps on "Entrar na escola" both landed while the home was still
  > showing → one "Entrar na escola" screen opened, one header back showed the home; on Aulas (Thu 5 Nov) two taps on the
  > 16:00 surf class card both landed on the list → one class detail opened, one header back showed Aulas;
  > deviations: the local, git-ignored `apps/mobile/.env` pointed `EXPO_PUBLIC_API_URL` at the Mac's old LAN IP
  > (`192.168.18.8`, unreachable), so lists stayed on their skeletons; it now points at the current one
  > (`192.168.18.237`); nothing committed

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 087` — the related tests pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 087` — every line this spec adds or changes is covered.
  - `cd apps/mobile && npx jest src/navigation/push-screen.test.ts` — the helper passes the singular option.
  - `cd apps/mobile && npx jest src/modules/admin/admin-tabs.navigation.test.tsx -t "double tap"` — a repeated tap
    opens one screen.
  - `cd apps/mobile && printf 'import { router } from "expo-router";\nrouter.push("/");\n' | npx eslint --stdin --stdin-filename src/sample.ts`
    — exits 1 naming `pushScreen`.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/mobile` — no errors.
- Manual (iOS simulator): as an admin, double-tap a home menu item and a class row; one screen opens each time and
  one back returns.

## Memory Impact

- `memory/technical-context.md` — Fixed conventions → Mobile routes: screens open with
  `pushScreen(routes.…)` (`src/navigation/push-screen.ts`, a singular push), and ESLint rejects a direct
  `router.push`; update the notification-response list, which quotes `router.push(…)` calls, to `pushScreen(…)`.

## Amendments

## Review

### Round 1 — 2026-11-04 — accepted

**Checks**

- lint ✅ · type check ✅ · build ✅ (`npx turbo run lint check-types build --filter=@rochas-surf-school/mobile`, 14 successful;
  mobile has no `build` script)
- related tests ✅ 57 suites, 1429 passed (apps/mobile)
- coverage of the changed lines ✅ COVERAGE OK, 24 files; no coverage-ignore comments in the diff
- e2e ✅ E2E PASSED — no suite applies to `apps/mobile`
- test quality ✅ with `pushScreen` temporarily reduced to `router.push(href)` (restored, not committed), the two
  "double tap" tests and both Avisos "without a second one under it" tests fail (`Received: "/admin/registrations"`,
  `"/admin/class/c-1"`, `"/student/notifications"`), so they catch the bug
- iOS simulator (iPhone 18 Pro, iOS 27, Metro serving this checkout at `de990502`, admin, pt-BR) ✅

**Expected Results**

- ER-01 ✅ — `push-screen.test.ts` 1 passed (one call with the href and `{ dangerouslySingular: true }`);
  `admin-tabs.navigation.test.tsx -t "double tap"` 3 passed (Join the school ×2 → one back shows Home; the same class
  row ×2 → one back shows Classes; a different class adds a screen); the Avisos singular test from spec 055 passes;
  every call site pushes the same `routes.…` href as before (diff read). Simulator: two taps on "Entrar na escola"
  both landed while the home was still showing → one Entrar na escola screen, one back showed the home; on Aulas
  (Thu 5 Nov) two taps on the 16:00 surf card both landed on the list → one class detail, one back showed Aulas.
- ER-02 ✅ — the stdin `router.push("/")` check exits 1 with "Use pushScreen from @/navigation/push-screen so a
  repeated tap doesn't open the screen twice"; `router.replace` / `router.back` exit 0; the same code under
  `src/navigation/push-screen.ts` exits 0; the mobile workspace lints clean. `grep router.push` in `src` outside
  tests finds only `push-screen.ts`.

**Findings**

None.

**Notes**

- The rule's selector (D-04) matches only an identifier named `router`; a `useRouter().push(…)` or a renamed import
  would get past it. No such call is left in `src` (the one in `use-class-requests-screen.hook.ts` was removed), but
  extending the selector to `useRouter` would close the gap if it ever matters.
- `isAdminMessageType` is no longer imported by the notification-response hook; it is still used inside
  `notification-target.ts`, so its export could become module-private in a later cleanup.
- Memory Impact matches what was built (Mobile routes convention and the notification-response list).
