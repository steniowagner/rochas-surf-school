---
id: "087"
slug: single-push-on-repeated-tap
title: Open a screen once when its item is tapped repeatedly
template: quick
status: in-progress
created: 2026-11-04
started: 2026-11-04
base_commit: e2b50a4ef102666c74cf88cd4a035a90575568b7
fronts: [mobile]
depends_on: []
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

- [ ] **T-01** — Add `src/navigation/push-screen.ts` exporting `pushScreen(href: Href)`, which calls
  `router.push(href, { dangerouslySingular: true })`, with `push-screen.test.ts` (mocks `expo-router`, checks the
  call). Skills: `vercel-react-native-skills`.
  Covers: ER-01 · Done when: `npx jest src/navigation/push-screen.test.ts` passes.
- [ ] **T-02** — Replace `router.push` with `pushScreen` in the auth module's seven files listed in Context, and
  update their tests' `router.push` assertions to the new arguments.
  Covers: ER-01 · Done when: `npx jest src/modules/auth` passes and no `router.push` is left in `src/modules/auth`.
- [ ] **T-03** — Replace `router.push` with `pushScreen` in the classes and enrolment files listed in Context, and
  update their tests.
  Covers: ER-01 · Done when: `npx jest src/modules/classes src/modules/enrolment` passes and no `router.push` is
  left in either module.
- [ ] **T-04** — Replace `router.push` with `pushScreen` in `components/user-header`, `modules/admin`,
  `modules/instructor`, `modules/notifications` (the hook's Avisos branch keeps one-screen behavior through
  `pushScreen`) and `modules/profile`, and update their tests.
  Add "double tap" tests to `src/modules/admin/admin-tabs.navigation.test.tsx` (`renderRouter`): pressing the
  "Join the school" menu item twice leaves one registrations screen and one `router.back()` shows the home tab;
  pressing the same class row twice leaves one class detail; pushing a different class adds a screen.
  Covers: ER-01 · Done when: `npx jest src/components src/modules/admin src/modules/instructor src/modules/notifications src/modules/profile`
  passes (the `-t "double tap"` tests included) and `grep -rn "router.push" src --include='*.ts' --include='*.tsx'`
  finds only `push-screen.ts` and tests.
- [ ] **T-05** — Add a `no-restricted-syntax` rule to `apps/mobile/eslint.config.js` for
  `CallExpression[callee.object.name='router'][callee.property.name='push']`, message
  "Use pushScreen from @/navigation/push-screen so a repeated tap doesn't open the screen twice.", with
  `src/navigation/push-screen.ts` exempt.
  Covers: ER-02 · Done when: the stdin command in ER-02 exits 1 with that message and
  `npx turbo run lint --filter=@rochas-surf-school/mobile` passes.

### Verification

- [ ] **T-06** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0 (the ER-02 stdin check exits 1 as
  expected) and the simulator journey in ER-01 is recorded.

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
