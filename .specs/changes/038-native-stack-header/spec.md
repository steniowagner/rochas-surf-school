---
id: "038"
slug: native-stack-header
title: Fixed native header on the screens that go back
template: quick
status: in-progress
created: 2026-10-18
started: 2026-10-18
base_commit: d835f59a29ba7a8f8d91d3d06b27322c8508a9de
fronts: [mobile]
depends_on: []
---

# 038 — Fixed native header on the screens that go back

## Goal

The mobile screens that can go back draw their own `BackButton` (and, on some, a title beside it) inside their
`ScrollView` / `FlatList`, so the header scrolls away with the content. They switch to the native Stack header of
Expo Router, which stays fixed at the top while only the content scrolls.

## Context

- Requirements: none — this changes how the app's navigation is drawn, not a product rule.
- Existing code this changes (all under `apps/mobile/src`):
  - `app/(public)/auth/_layout.tsx` and `app/(private)/{student,instructor,admin}/_layout.tsx` — every `Stack`
    sets `headerShown: false`.
  - Auth screens drawing `BackButton` at the top, then `ScreenIntro`, with `paddingTop: insets.top + 12`:
    `modules/auth/components/{email-choice,email-sign-in,create-account,confirm-code,google-name}`.
  - Inner role screens drawing `BackButton` alone at the top: `modules/admin/screens/registrations.screen.tsx`,
    `modules/people/screens/people.screen.tsx` (behind `showBackButton`, `false` on the student's School tab),
    `modules/profile/components/edit-profile`, `modules/profile/components/profile-whatsapp`,
    `modules/school-rules/components/school-rules-reader`,
    `modules/cancellation-rules/screens/cancellation-rules.screen.tsx`.
  - Screens drawing `BackButton` and a `ds-text-screen-title-with-back` title on one row:
    `modules/classes/screens/{class-details,new-class,edit-class}.screen.tsx`; class details also draws its tools
    button (`classDetails.tools`, spec 033) at the right of that row.
  - `components/ui/back-button` — the shared 44×44 back button
    ([technical-context.md → Fixed conventions](../../memory/technical-context.md#fixed-conventions), "Mobile shared UI").
  - The routes that render those screens (19): `/auth/{email,email-sign-in,create-account,confirm-code,google-name}`,
    `/admin/{registrations,people,new-class,edit-class/[id],cancellation-rules}`, `/instructor/people`, and for each
    role `/<role>/{edit-profile,whatsapp,school-rules,class/[id]}`.
- Not affected (no back action today): the tab roots under `(tabs)`, `/auth` (`index`), onboarding, pending,
  rules-update, reactivation and offboarding.
- Mobile has no e2e suite ([technical-context.md → Automated validation](../../memory/technical-context.md#automated-validation)):
  Jest proves the header options; that the header stays fixed while scrolling, and the native back button itself,
  are checked in the iOS simulator. The native header's back button is a native view, not a JS element, so Jest
  navigation tests go back with `router.back()` and assert the header options instead of pressing it.

## Decisions

| ID | Decision | Reason |
| --- | --- | --- |
| D-01 | The back control is the platform's native back button (iOS chevron, Android arrow). `components/ui/back-button` is deleted, and the `CLAUDE.md` rule "Every screen that can go back uses `BackButton`" becomes "the Stack header draws the back button; screens never build one". | "Standard navigation header" means the native one: it gets the platform's look (Liquid Glass on iOS 26+), long-press history and accessibility, and avoids a custom button inside the native bar's glass capsule. With no screen left using `BackButton`, keeping it would invite a second back button. |
| D-02 | Only class details, new class and edit class move their title into the header (`headerTitle`), and class details its tools button (`headerRight`). Every other affected screen gets a header with no title and keeps its `ScreenIntro` / list title in the content. | Those three are the only screens whose title sits on the back-button row; moving the `ScreenIntro` titles too would either repeat the title or remove the intro. People keeps its in-content title, shared with the student's School tab, which has no header. |
| D-03 | Header style: opaque `bg-page` background (`theme.page`), no shadow or hairline (`headerShadowVisible: false`), tint `theme.ink`, back button without a label (`headerBackButtonDisplayMode: "minimal"`), title in the `screenTitleWithBack` type style (Barlow Condensed bold, 26, uppercase) colored `ink`. Content starts below the header, so the screens drop their `insets.top + 12` top padding. | Keeps today's look, now fixed, and stays inside the tokens (colors through `useTheme()`, the font by family name). |
| D-04 | The header defaults live in one place — a shared hook in `src/navigation/stack-header/` used by the auth layout and the three role layouts, with `index` (auth) and `(tabs)` (roles) kept at `headerShown: false`. A screen sets its own title and `headerRight` with expo-router's `<Stack.Screen options>`. | One source for the header style; the tools button depends on the screen's state, so the screen must set it. Access is still decided only by `resolveFlow`; this only changes how screens are drawn. |

## Expected Results

### ER-01 — Screens that go back have a fixed native header

- **Front:** mobile
- **Behavior:** Given any of the 19 routes listed in Context, when it opens, then the role's (or auth's) `Stack`
  shows its native header — opaque `page` background, no shadow, the platform back button tinted `ink` with no
  label — and the screen no longer draws a back button of its own nor the `insets.top + 12` top padding; scrolling
  the content leaves the header in place; the header's back button, the iOS swipe-back and Android's back return to
  the previous screen (above the tabs: back to the tab, with the tab bar).
- **Edge and error cases:** `/auth`, the `(tabs)` roots, onboarding, pending, rules-update, reactivation and
  offboarding still have no header; the student's School tab (`PeopleScreen` without a back action) has no header
  and keeps its title and count; screens with pull-to-refresh (registrations, people) still refresh below the
  header; the auth screens' keyboard handling still keeps the focused field visible.
- **Verify by:** layout tests in `src/navigation/stack-header/` and the layouts' tests (header options, `index` /
  `(tabs)` hidden); `src/modules/auth/email-auth.navigation.test.tsx` and
  `src/modules/{admin,instructor,student}/*-tabs.navigation.test.tsx` (the inner routes open with the header options
  and `router.back()` returns to the tab); the screens' component tests (no `Back` button rendered) — all with
  `npx jest` from `apps/mobile`; and the user journey in the Verification Plan.

### ER-02 — Class details, new class and edit class show their title in the header

- **Front:** mobile
- **Behavior:** Given class details ("Detalhe"), new class ("Nova aula") or edit class ("Editar aula"), when it
  opens, then the header shows its title (`classDetails.title`, `newClass.title`, `editClass.title`) in the
  `screenTitleWithBack` style and the title row in the content is gone; on class details, when `showTools` is true,
  the round tools button (`classDetails.tools`) sits at the header's right and opens `ClassToolsSheet` as before.
- **Edge and error cases:** no tools button for a student, nor for a finished or cancelled class; the title shows
  while the class is loading, failed to load or was not found; edit class keeps its title when it shows
  `editClass.errors.cancelled`.
- **Verify by:** `npx jest src/modules/classes/screens` (from `apps/mobile`) — `class-details.screen.test.tsx`,
  `new-class.screen.test.tsx` and `edit-class.screen.test.tsx` assert the options the screen gives `Stack.Screen`
  (title, and `headerRight` rendering the tools button only with `showTools`); and the user journey in the
  Verification Plan.

## Tasks

### Mobile (`apps/mobile`)

- [x] **T-01** — Add the shared header options in `src/navigation/stack-header/` (a hook returning the D-03
  options from `useTheme()`, with its types and `index.ts`, by `.claude/rules/react.md`) and use it in
  `src/app/(public)/auth/_layout.tsx` and `src/app/(private)/{student,instructor,admin}/_layout.tsx`, keeping
  `index` (auth) and `(tabs)` at `headerShown: false`; tests for the hook and for each layout's options, like
  `src/navigation/rules-update-layout.test.tsx`. Load `vercel-react-native-skills` and
  `vercel-react-best-practices` first.
  Covers: ER-01 · Done when: the layouts' tests pass and the header options match D-03.
  > ✅ 2026-10-18 — added `useStackHeader` (D-03 options; title empty by default, screens set their own) and used it in the 4 layouts, with `index` / `(tabs)` hidden through `Stack.Screen`; files: `apps/mobile/src/navigation/stack-header/{index.ts,stack-header.hook.ts,stack-header.types.ts,stack-header.hook.test.ts,stack-header.layouts.test.tsx}`, `apps/mobile/src/app/(public)/auth/_layout.tsx`, `apps/mobile/src/app/(private)/{student,instructor,admin}/_layout.tsx`; verified: `npx jest src/navigation` (156 passed), `npx tsc --noEmit` clean; deviations: uppercase can't be set in `headerTitleStyle`, so titles must be passed uppercase by the screens (T-04)
- [x] **T-02** — Remove `BackButton` and the `insets.top + 12` top padding from the auth screens
  `src/modules/auth/components/{email-choice,email-sign-in,create-account,confirm-code,google-name}`; update their
  component tests and `src/modules/auth/email-auth.navigation.test.tsx` (header options, `router.back()`).
  Covers: ER-01 · Done when: `npx jest src/modules/auth` passes and no auth screen imports `BackButton`.
  > ✅ 2026-10-18 — removed `BackButton` and the `insets.top + 12` padding from the five auth components (bottom inset kept); tests assert no in-content Back button, and the navigation test goes back with `router.back()`; files: `apps/mobile/src/modules/auth/components/{email-choice,email-sign-in,create-account,confirm-code,google-name}/*.component.tsx` and their `*.component.test.tsx`, `apps/mobile/src/modules/auth/email-auth.navigation.test.tsx`; verified: `npx jest src/modules/auth` (23 suites, 245 passed), grep finds no `back-button` import there; deviations: none
- [x] **T-03** — Remove `BackButton` and the top inset padding from `src/modules/admin/screens/registrations.screen.tsx`,
  `src/modules/people/screens/people.screen.tsx` (drop `showBackButton` from its props and from
  `src/app/(private)/{admin,instructor}/people.tsx` and `src/app/(private)/student/(tabs)/school.tsx`, keeping the
  School tab's top spacing), `src/modules/profile/components/edit-profile`,
  `src/modules/profile/components/profile-whatsapp`, `src/modules/school-rules/components/school-rules-reader` and
  `src/modules/cancellation-rules/screens/cancellation-rules.screen.tsx`; update their tests and
  `src/modules/{admin,instructor,student}/*-tabs.navigation.test.tsx`.
  Covers: ER-01 · Done when: those tests pass and none of these files imports `BackButton`.
  > ✅ 2026-10-18 — removed `BackButton` and the top inset padding from the six screens; `PeopleScreen` lost `showBackButton` (always `automatic` inset behavior, top padding 24) and the School tab route now adds the Android status-bar inset itself; tests drop the Back-button presses (real-router ones go back with `router.back()`, mocked-router ones lose the go-back case); files: `apps/mobile/src/modules/admin/screens/registrations.screen.tsx`, `apps/mobile/src/modules/people/screens/people.screen.tsx` (+ `.types.ts` deleted, `.test.tsx`), `apps/mobile/src/modules/profile/components/{edit-profile,profile-whatsapp}/*.component.tsx`, `apps/mobile/src/modules/school-rules/components/school-rules-reader/school-rules-reader.component.tsx`, `apps/mobile/src/modules/cancellation-rules/screens/cancellation-rules.screen.tsx`, `apps/mobile/src/app/(private)/{admin,instructor}/people.tsx`, `apps/mobile/src/app/(private)/student/(tabs)/school.tsx`, and the tests `admin/screens/admin.screen`, `admin/admin-tabs.navigation`, `instructor/instructor-tabs.navigation`, `instructor/screens/instructor.screen`, `student/student-tabs.navigation`, `school-rules/screens/school-rules.screen`, `cancellation-rules/screens/cancellation-rules.screen`, `profile/screens/profile-whatsapp.screen`; verified: jest over those modules (40 suites, 250 passed), `tsc --noEmit` and eslint clean; deviations: none
- [x] **T-04** — In `src/modules/classes/screens/{class-details,new-class,edit-class}.screen.tsx`, replace the
  in-content back/title row with `<Stack.Screen options>` setting the title and, on class details, `headerRight`
  with the tools button only when `showTools`; drop the top inset padding; update the three screens' tests.
  Covers: ER-02 · Done when: `npx jest src/modules/classes/screens` passes with the cases of ER-02.
  > ✅ 2026-10-18 — class details, new class and edit class give `Stack.Screen` their title (`t(...).toLocaleUpperCase()`, since `headerTitleStyle` can't uppercase) and class details its tools button as `headerRight` only when `showTools`; the in-content back/title rows and the top inset padding are gone (edit class's loading/error/cancelled view keeps `pt-3` spacing); tests mock `Stack.Screen`, render its `headerRight`, and assert the title and `headerRight` in the loading, cancelled and no-tools cases; files: `apps/mobile/src/modules/classes/screens/{class-details,new-class,edit-class}.screen.tsx` and their `.test.tsx`; verified: `npx jest src/modules/classes/screens` (4 suites, 200 passed), `tsc --noEmit` and eslint clean; deviations: none
- [x] **T-05** — Delete `src/components/ui/back-button` (component, types, index, test) and update the `BackButton`
  rule in `CLAUDE.md` → Rules for apps/mobile as D-01 says.
  Covers: enabling · Done when: `grep -r "back-button" apps/mobile/src` finds nothing and `check-types` passes.
  > ✅ 2026-10-18 — deleted `BackButton` and rewrote the CLAUDE.md rule; files: `apps/mobile/src/components/ui/back-button/{back-button.component.tsx,back-button.component.test.tsx,back-button.types.ts,index.ts}` (deleted), `CLAUDE.md`; verified: `grep -r back-button apps/mobile/src` empty, `npx tsc --noEmit` clean; deviations: none (`.specs/memory` still mentions it; spec-finish updates it per Memory Impact)

### Verification

- [ ] **T-06** — Run every command in the Verification Plan from the repo root and walk the user journey; all pass.
  Record the output summary and the journey's result as evidence. Covers: all · Done when: every command exits 0
  and every journey step behaves as described.
  > ⛔ 2026-10-18 — automated part done: `node .specs/scripts/run-related-tests.mjs 038` (31 suites, 563 tests passed), `check-coverage.mjs 038` (COVERAGE OK, 5 files), `npx turbo run lint check-types build --filter=@rochas-surf-school/mobile` (12 tasks successful). Not done: the iOS-simulator user journey (needs `npx expo run:ios` with the backend running) — fixed-while-scrolling header, native back / swipe-back, keyboard on the auth forms, class-details tools button, pull-to-refresh, the School tab without a header. Also unverified there: that the opaque header looks right on iOS 26 and that the uppercase title fits. Unblocks when the user (or the reviewer) walks the Verification Plan journey. Side fix in this commit: the two admin tests that looked for the "New class" header now look for the form's "Discipline" header (`apps/mobile/src/modules/admin/admin-tabs.navigation.test.tsx`, `apps/mobile/src/modules/admin/screens/admin.screen.test.tsx`).

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 038` — the tests this spec adds or changes, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 038` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/mobile` — no errors.
- User journey (iOS simulator, `npx expo run:ios`, backend running):
  - Signed out: open "Entrar com e-mail" and the create-account / confirm-code screens — each has a fixed header
    with the native back button; with the keyboard open the focused field stays visible; back and swipe-back
    return to the previous screen; `/auth` has no header.
  - As the admin: open Registrations, People, New class, a class's details, Edit class, Cancellation rules,
    Edit profile, WhatsApp and School rules — scroll each: the header stays put; class details, New class and
    Edit class show their title in the header; class details shows the tools button at the right and it opens
    the tools sheet; pull-to-refresh works on Registrations and People; back returns to the tab with the tab bar.
  - As a student: a class's details has the title and no tools button; the School tab has no header.

## Memory Impact

- `memory/technical-context.md` — Fixed conventions → "Mobile shared UI": screens that can go back get the native Stack
  header from the shared options in `src/navigation/stack-header/` (D-03), `BackButton` no longer exists, and a
  screen sets its title / `headerRight` with `<Stack.Screen options>`; the inner-screens note ("go back with
  `BackButton`") says they go back with the native header.

## Amendments

## Review
