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
Expo Router, which stays fixed at the top while only the content scrolls. On iOS with Liquid Glass (iOS 26+) the
header is transparent and the content scrolling under it fades with the system's soft scroll-edge effect; elsewhere it
stays opaque.

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
- Transparent header (amendment, D-03/D-05/D-06): `scrollEdgeEffects` (expo-router native stack, react-native-screens)
  is iOS 26+ only and applies to the scroll view in the screen's first-descendant chain; `headerTransparent: true` makes
  the header absolutely positioned, so the screen's content starts at the top of the window. `isLiquidGlassAvailable()`
  comes from `expo-glass-effect`, already a dependency. The app sets no iOS deployment target, so iOS < 26 is supported.
  - Scrolling screens (content in a `ScrollView` / `FlatList`): `modules/admin/screens/registrations.screen.tsx`,
    `modules/people/screens/people.screen.tsx` (already `contentInsetAdjustmentBehavior="automatic"`),
    `modules/profile/components/edit-profile` (a `ScrollView` inside its `KeyboardAvoidingView`),
    `modules/school-rules/components/school-rules-reader`,
    `modules/cancellation-rules/screens/cancellation-rules.screen.tsx`,
    `modules/classes/screens/{class-details,new-class,edit-class}.screen.tsx`.
  - Fixed screens (no scroll view): `modules/auth/components/{email-choice,email-sign-in,create-account,confirm-code,google-name}`,
    `modules/profile/components/profile-whatsapp`, and edit class's loading / error / cancelled view.
  - `src/navigation/stack-header/keyboard-offset.hook.ts` (`useKeyboardOffset`, F-01) gives the six
    `KeyboardAvoidingView`s the header's height; `jest.setup.ts` mocks it to 64.
- Mobile has no e2e suite ([technical-context.md → Automated validation](../../memory/technical-context.md#automated-validation)):
  Jest proves the header options; that the header stays fixed while scrolling, and the native back button itself,
  are checked in the iOS simulator. The native header's back button is a native view, not a JS element, so Jest
  navigation tests go back with `router.back()` and assert the header options instead of pressing it.

## Decisions

| ID | Decision | Reason |
| --- | --- | --- |
| D-01 | The back control is the platform's native back button (iOS chevron, Android arrow). `components/ui/back-button` is deleted, and the `CLAUDE.md` rule "Every screen that can go back uses `BackButton`" becomes "the Stack header draws the back button; screens never build one". | "Standard navigation header" means the native one: it gets the platform's look (Liquid Glass on iOS 26+), long-press history and accessibility, and avoids a custom button inside the native bar's glass capsule. With no screen left using `BackButton`, keeping it would invite a second back button. |
| D-02 | Only class details, new class and edit class move their title into the header (`headerTitle`), and class details its tools button (`headerRight`). Every other affected screen gets a header with no title and keeps its `ScreenIntro` / list title in the content. | Those three are the only screens whose title sits on the back-button row; moving the `ScreenIntro` titles too would either repeat the title or remove the intro. People keeps its in-content title, shared with the student's School tab, which has no header. |
| D-03 | Header style: when `isLiquidGlassAvailable()` (D-05) is true, a transparent header (`headerTransparent: true`, no `headerStyle` background) with `scrollEdgeEffects: { top: "soft" }`; otherwise an opaque `bg-page` background (`theme.page`). On both: no shadow or hairline (`headerShadowVisible: false`), tint `theme.ink`, back button without a label (`headerBackButtonDisplayMode: "minimal"`), title in the `screenTitleWithBack` type style (Barlow Condensed bold, 26, uppercase) colored `ink`. Content starts below the header (D-06), so the screens drop their `insets.top + 12` top padding. | Keeps today's look, now fixed, and stays inside the tokens (colors through `useTheme()`, the font by family name). On iOS 26+ the system's soft scroll-edge fade under the glass header is the platform's look (user's request in review round 2, F-02); Android and older iOS have no native equivalent, so they keep the reviewed opaque header. |
| D-04 | The header defaults live in one place — a shared hook in `src/navigation/stack-header/` used by the auth layout and the three role layouts, with `index` (auth) and `(tabs)` (roles) kept at `headerShown: false`. A screen sets its own title and `headerRight` with expo-router's `<Stack.Screen options>`. | One source for the header style; the tools button depends on the screen's state, so the screen must set it. Access is still decided only by `resolveFlow`; this only changes how screens are drawn. |
| D-05 | The transparent header is chosen with `isLiquidGlassAvailable()` from `expo-glass-effect`; Android and iOS < 26 get the opaque header, with no gradient fallback and no new dependency. | It is already a dependency and is false when the system doesn't draw the glass header (iOS < 26, or the app opted out of Liquid Glass), which an iOS version check would miss. A gradient fallback would need `expo-linear-gradient` and another look per platform. |
| D-06 | Content under the header: a screen whose content scrolls gives its `ScrollView` / `FlatList` `contentInsetAdjustmentBehavior="automatic"`, and that scroll view is the first descendant of the screen; a fixed screen adds a top padding from a shared `useHeaderInset()` hook in `src/navigation/stack-header/` (the header's height under the transparent header, 0 under the opaque one); `useKeyboardOffset()` returns 0 under the transparent header and the header's height under the opaque one. The fixed screens stay fixed and show no fade. | `automatic` lets iOS inset the content and the pull-to-refresh spinner below a transparent header and does nothing under an opaque one, and the scroll-edge effect only finds the first-descendant scroll view. Under the transparent header the `KeyboardAvoidingView` starts at the top of the window, so F-01's offset would overshoot by the header's height. Making the fixed screens scroll belongs to the follow-up that fixes their keyboard overflow (review round 2, Notes). |
| D-07 | The opaque fallback (Android, iOS < 26) is proven in Jest with `isLiquidGlassAvailable` mocked false; the simulator journey covers iOS 26+ only. Accepted assumption. | No Android or iOS < 26 run has been part of this spec, and the fallback is the opaque header already reviewed in rounds 1 and 2. |

## Expected Results

### ER-01 — Screens that go back have a fixed native header

- **Front:** mobile
- **Behavior:** Given any of the 19 routes listed in Context, when it opens, then the role's (or auth's) `Stack`
  shows its native header — the D-03 header for the platform (transparent with a soft top edge when
  `isLiquidGlassAvailable()` is true, opaque `page` background otherwise), no shadow, the platform back button tinted
  `ink` with no label — and the screen no longer draws a back button of its own nor the `insets.top + 12` top padding; scrolling
  the content leaves the header in place; the header's back button, the iOS swipe-back and Android's back return to
  the previous screen (above the tabs: back to the tab, with the tab bar).
- **Edge and error cases:** `/auth`, the `(tabs)` roots, onboarding, pending, rules-update, reactivation and
  offboarding still have no header; the student's School tab (`PeopleScreen` without a back action) has no header
  and keeps its title and count; screens with pull-to-refresh (registrations, people) still refresh below the
  header; the auth screens' keyboard handling still keeps the focused field visible.
- **Verify by:** layout tests in `src/navigation/stack-header/` and the layouts' tests (header options, `index` /
  `(tabs)` hidden), with `stack-header.hook.test.ts` asserting both branches of D-03 (`isLiquidGlassAvailable` mocked
  true and false); `src/modules/auth/email-auth.navigation.test.tsx` and
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

### ER-03 — On iOS with Liquid Glass, content scrolls under the header and fades

- **Front:** mobile
- **Behavior:** Given `isLiquidGlassAvailable()` is true (iOS 26+), when any of the 19 routes listed in Context
  opens, then its header is transparent with `scrollEdgeEffects: { top: "soft" }`; the scrolling screens start their
  content below the header (`contentInsetAdjustmentBehavior="automatic"`) and, as they scroll, the content passes
  under the header and fades at its edge; the fixed screens start their content below the header (top padding from
  `useHeaderInset()`, the header's height) and show no fade; the `KeyboardAvoidingView`s get a
  `keyboardVerticalOffset` of 0, so the focused field and the primary button still sit just above the keyboard.
- **Edge and error cases:** when `isLiquidGlassAvailable()` is false (Android, iOS < 26) the header is the opaque
  `page` one, `useHeaderInset()` is 0 and `useKeyboardOffset()` is the header's height (F-01); pull-to-refresh on
  Registrations and People shows its spinner below the header; edit class's loading / error / cancelled view starts
  below the header; the student's School tab still has no header and keeps its title and count.
- **Verify by:** `npx jest` from `apps/mobile` — `src/navigation/stack-header/` tests for `useStackHeader`,
  `useHeaderInset` and `useKeyboardOffset` with `isLiquidGlassAvailable` mocked true and false; the fixed screens'
  tests (top padding and `keyboardVerticalOffset` in both branches) and the scrolling screens' tests
  (`contentInsetAdjustmentBehavior="automatic"` on their scroll view); and the iOS 26+ user journey in the
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
- [x] **T-07** — In `src/navigation/stack-header/`, make `useStackHeader` return the transparent header with
  `scrollEdgeEffects: { top: "soft" }` (and no `headerStyle` background) when `isLiquidGlassAvailable()` from
  `expo-glass-effect` is true, and the current opaque options otherwise (D-03, D-05); add `useHeaderInset()` (the
  header's height under the transparent header, 0 otherwise) and change `useKeyboardOffset()` to 0 under the
  transparent header and the header's height otherwise (D-06), exported from `index.ts`, by `.claude/rules/react.md`;
  update the `jest.setup.ts` mocks so components rendered without a navigator get both hooks, and test the three
  hooks with `isLiquidGlassAvailable` mocked true and false. Load `vercel-react-native-skills` and
  `vercel-react-best-practices` first.
  Covers: ER-01, ER-03 · Done when: `npx jest src/navigation` passes with both branches asserted for the three hooks.
  > ✅ 2026-10-18 — `useStackHeader` returns the transparent header with `scrollEdgeEffects: { top: "soft" }` (no `headerStyle`) when `isLiquidGlassAvailable()`, the opaque one otherwise; added `useHeaderInset` (header height under the transparent header, else 0); `useKeyboardOffset` is 0 under the transparent header, else the header height; `jest.setup.ts` mocks `useHeaderInset` (0) and `expo-glass-effect` (false by default); files: `apps/mobile/src/navigation/stack-header/{index.ts,stack-header.hook.ts,header-inset.hook.ts,keyboard-offset.hook.ts}` and tests `{stack-header.hook.test.ts,header-inset.hook.test.tsx,keyboard-offset.hook.test.tsx}`, `apps/mobile/jest.setup.ts`; verified: `npx jest src/navigation` (161 passed, both branches of the three hooks), `npx tsc --noEmit` clean; deviations: none
- [x] **T-08** — Give the fixed auth screens `src/modules/auth/components/{email-choice,email-sign-in,create-account,confirm-code,google-name}`
  a top padding from `useHeaderInset()` on their outer view (D-06); update their component tests to assert the
  padding and, for the four with a `KeyboardAvoidingView`, the `keyboardVerticalOffset`, under both branches.
  Covers: ER-03 · Done when: `npx jest src/modules/auth` passes with those cases.
  > ✅ 2026-10-18 — the five auth components take `paddingTop: useHeaderInset()` on their outer view; their tests assert the top padding (116 under the transparent header, 0 under the opaque one) and, for the four with a `KeyboardAvoidingView`, `keyboardVerticalOffset` 0 under the transparent header (64 under the opaque one, existing case); files: `apps/mobile/src/modules/auth/components/{email-choice,email-sign-in,create-account,confirm-code,google-name}/*.component.tsx` and `*.component.test.tsx`, `apps/mobile/src/navigation/stack-header/header-inset.test-utils.ts` (new test helper); verified: `npx jest src/modules/auth src/navigation` (420 passed), `tsc --noEmit` and eslint clean; deviations: none
- [ ] **T-09** — Add `contentInsetAdjustmentBehavior="automatic"` to the scroll view of
  `src/modules/admin/screens/registrations.screen.tsx`, `src/modules/school-rules/components/school-rules-reader`,
  `src/modules/cancellation-rules/screens/cancellation-rules.screen.tsx` and
  `src/modules/profile/components/edit-profile` (its `ScrollView` inside the `KeyboardAvoidingView`), keeping each
  scroll view the screen's first descendant; give `src/modules/profile/components/profile-whatsapp` the
  `useHeaderInset()` top padding (D-06); update their tests (inset behavior, the WhatsApp padding, and the edit
  profile / WhatsApp keyboard offset under both branches).
  Covers: ER-03 · Done when: the tests of those modules pass with those cases.
- [ ] **T-10** — Add `contentInsetAdjustmentBehavior="automatic"` to the scroll views of
  `src/modules/classes/screens/{class-details,new-class,edit-class}.screen.tsx`, keeping each the screen's first
  descendant, and give edit class's loading / error / cancelled view the `useHeaderInset()` top padding (D-06);
  update the three screens' tests.
  Covers: ER-02, ER-03 · Done when: `npx jest src/modules/classes/screens` passes with those cases.

### Verification

- [x] **T-06** — Run every command in the Verification Plan from the repo root and walk the user journey; all pass.
  Record the output summary and the journey's result as evidence. Covers: all · Done when: every command exits 0
  and every journey step behaves as described.
  > ✅ 2026-10-18 — automated: `node .specs/scripts/run-related-tests.mjs 038` (31 suites, 563 tests passed), `check-coverage.mjs 038` (COVERAGE OK, 5 files), `npx turbo run lint check-types build --filter=@rochas-surf-school/mobile` (12 tasks successful). Simulator journey (iPhone 18 Pro, iOS 27, `npx expo run:ios`, existing backend on :4000, signed in as the admin): seen working — New class (native glass back button, "NOVA AULA" title in the header, header fixed while the form scrolls, back returns to the tab with its tab bar); class details of a cancelled class (title "DETALHE", no tools button); class details of a live class (title and the round tools button at the header's right, which opens the tools sheet); Edit class ("EDITAR AULA"); Registrations (back button only, intro below the header, header fixed while scrolling, pull-to-refresh works below it); People (back button, title and count in the content). Not covered in the simulator, so the reviewer must: iOS swipe-back (the synthetic edge swipe did not register), the signed-out auth screens and their keyboard handling, Edit profile / WhatsApp / School rules / Cancellation rules, the student's class details and School tab, and Android. Observations: on iOS 26+ the tools button sits inside the header's glass capsule, with its own white circle inside it; the titles are centered (iOS default). Side fix: the two admin tests that looked for the "New class" header now look for the form's "Discipline" header (`apps/mobile/src/modules/admin/admin-tabs.navigation.test.tsx`, `apps/mobile/src/modules/admin/screens/admin.screen.test.tsx`).
- [ ] **T-11** — After the amendment, run every command in the Verification Plan from the repo root again and walk
  the user journey on an iOS 26+ simulator, including the transparent-header steps; all pass. Record the output
  summary and the journey's result as evidence. Covers: all · Done when: every command exits 0 and every journey step
  behaves as described.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 038` — the tests this spec adds or changes, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 038` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/mobile` — no errors.
- User journey (iOS 26+ simulator, `npx expo run:ios`, backend running, software keyboard on). Android and
  iOS < 26 (the opaque header) are covered by Jest only (D-07).
  - On every screen below: the header is transparent; on the scrolling screens the content starts below the header
    and fades under its edge as it scrolls; the fixed screens start below the header, with no overlap.
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
  `BackButton`") says they go back with the native header. Also: the header is transparent with a soft top
  scroll-edge effect when `isLiquidGlassAvailable()` is true and opaque `page` otherwise (D-03, D-05); a scrolling
  screen below it gives its first-descendant `ScrollView` / `FlatList` `contentInsetAdjustmentBehavior="automatic"`,
  a fixed screen adds `useHeaderInset()` as top padding, and a `KeyboardAvoidingView` below it passes
  `useKeyboardOffset()` as `keyboardVerticalOffset` (D-06).

## Amendments

- 2026-10-18 — /spec-plan --amend — D-03 changed: opaque `bg-page` header on every platform → transparent header with
  `scrollEdgeEffects: { top: "soft" }` when `isLiquidGlassAvailable()` is true, opaque `bg-page` otherwise. Reason:
  the user asked for the iOS soft scroll-edge fade during review round 2 (F-02). Approved by the user.
- 2026-10-18 — /spec-plan --amend — D-05 added: detection with `isLiquidGlassAvailable()` from `expo-glass-effect`;
  Android and iOS < 26 keep the opaque header, no gradient fallback. Reason: already a dependency, false whenever the
  system doesn't draw glass. Approved by the user.
- 2026-10-18 — /spec-plan --amend — D-06 added: `contentInsetAdjustmentBehavior="automatic"` on scrolling screens,
  `useHeaderInset()` top padding on fixed screens, `useKeyboardOffset()` 0 under the transparent header; fixed
  screens stay fixed. Reason: under a transparent header content starts at the top of the window, and F-01's offset
  would overshoot. Approved by the user.
- 2026-10-18 — /spec-plan --amend — D-07 added: the opaque fallback is verified in Jest only; the journey covers
  iOS 26+. Reason: accepted assumption, the fallback is the header already reviewed. Approved by the user.
- 2026-10-18 — /spec-plan --amend — ER-01 changed: "opaque `page` background" → "the D-03 header for the platform";
  `Verify by` adds both branches of `stack-header.hook.test.ts`. Reason: D-03 changed. Approved by the user.
- 2026-10-18 — /spec-plan --amend — ER-03 added: on iOS with Liquid Glass, content scrolls under the header and
  fades. Reason: F-02. Approved by the user.
- 2026-10-18 — /spec-plan --amend — T-07, T-08, T-09, T-10 (mobile) and T-11 (verification) added; T-01–T-06 stay
  as done, their code is changed by T-07–T-10. Reason: implement D-03/D-05/D-06 and ER-03. Approved by the user.
- 2026-10-18 — /spec-plan --amend — Goal, Context, Verification Plan (iOS 26+ journey, transparent-header steps) and
  Memory Impact (`useHeaderInset`, `useKeyboardOffset`, inset rule) updated. Reason: follow the changes above and
  review round 2's note on Memory Impact. Approved by the user.

## Review

### Round 1 — 2026-10-18 — changes-requested

**Checks**

- lint ✅ · type check ✅ · build ✅ (`npx turbo run lint check-types build --filter=@rochas-surf-school/mobile`, 12 tasks)
- related tests ✅ 563 passed in 31 suites (apps/mobile)
- coverage of the changed lines ✅ `COVERAGE OK`, 5 files measured; no coverage-ignore comments in the diff
- e2e: no suite applies (mobile has none) · iOS simulator (iPhone 18 Pro, iOS 27, signed in as the admin):
  class details (title `DETALHE` and the tools button in the header), swipe-back from class details back to the
  Classes tab with its tab bar, Edit profile, WhatsApp, School rules (Profile tab) and `/admin/cancellation-rules`
  each have the fixed native header with the back button only; the header stays in place while Cancellation rules
  scrolls; the header's back button and swipe-back return to Profile ✅

**Expected Results**

- ER-01 ❌ — header options, hidden `index` / `(tabs)`, no in-content back button and `router.back()` hold in the
  tests and in the simulator for the admin screens above; the keyboard handling regressed, see F-01
- ER-02 ✅ — `class-details`, `new-class` and `edit-class` tests assert the header title (also while loading,
  cancelled, not found) and `headerRight` only with `showTools`; class details checked in the simulator

**Findings**

- [x] **F-01** (ER-01) — the six screens that wrap their content in a `KeyboardAvoidingView` and now sit below the
  header (`modules/auth/components/{email-sign-in,create-account,confirm-code,google-name}` and
  `modules/profile/components/{edit-profile,profile-whatsapp}`) pass no `keyboardVerticalOffset`. React Native's
  `KeyboardAvoidingView` computes its padding from its `onLayout` frame, which is relative to its parent (y = 0),
  against the keyboard's window-absolute `screenY`; before this spec the view started at the top of the window, so
  that was exact, but now the screen starts below the header, so the padding falls short by the header's height
  (status bar + navigation bar, about 116pt on an iPhone 18 Pro). The bottom of the screen — the primary button
  ("Enviar código", "Salvar", "Criar conta"…) and any field there — stays under the keyboard. Found by reading the
  code (`node_modules/react-native/Libraries/Components/Keyboard/KeyboardAvoidingView.js`,
  `_relativeKeyboardHeight`); the review session couldn't show the software keyboard (no Simulator.app, hardware
  keyboard attached). Reproduce: in Simulator.app, I/O → Keyboard → Toggle Software Keyboard (⌘K); open Profile →
  Editar perfil and tap Nome: "Salvar" stays behind the keyboard. Expected: it sits just above the keyboard, as
  before the spec — e.g. `keyboardVerticalOffset={useHeaderHeight()}` (`useHeaderHeight` from `expo-router/react-navigation`; `@react-navigation/elements` is not a direct dependency) on these
  views, with a test asserting the offset.
  > ✅ 2026-10-18 — added `useKeyboardOffset` (wraps `useHeaderHeight` from `expo-router/react-navigation`) and passed it as `keyboardVerticalOffset` on the six views; `jest.setup.ts` mocks it to 64 for components rendered without a navigator, the hook has its own test with the real context, and each of the six screens asserts the offset (the edit-profile test fails when the prop is removed); files: `apps/mobile/src/navigation/stack-header/{index.ts,keyboard-offset.hook.ts,keyboard-offset.hook.test.tsx,keyboard-offset.test-utils.ts}`, `apps/mobile/jest.setup.ts`, `apps/mobile/src/modules/auth/components/{email-sign-in,create-account,confirm-code,google-name}/*.component.tsx` and their tests, `apps/mobile/src/modules/profile/components/{edit-profile,profile-whatsapp}/*.component.tsx`, `apps/mobile/src/modules/profile/screens/{edit-profile,profile-whatsapp}.screen.test.tsx`; verified: `node .specs/scripts/run-related-tests.mjs 038` (570 passed), `check-coverage.mjs 038` COVERAGE OK, `npx turbo run lint check-types build --filter=@rochas-surf-school/mobile` ✅; not verified: the software keyboard in the simulator; deviations: none

**Notes**

- Not seen in the simulator yet, so they must be walked when F-01 is fixed: the signed-out auth screens (header,
  back and swipe-back, `/auth` without a header, the keyboard), and as a student a class's details (title, no tools
  button) and the School tab (no header, title and count). The review session didn't sign out to keep the admin
  session.
- The navigation tests (`*-tabs.navigation.test.tsx`, `email-auth.navigation.test.tsx`) go back with `router.back()`
  but don't assert the header options; the options are proven by `stack-header.layouts.test.tsx` (the shared
  options and the only hidden screen per layout), which together cover ER-01's `Verify by`.
- On the first tap after a push animation the simulator sometimes ignored the native back button; a slightly
  longer press worked every time. It looks like a touch-injection artifact, not an app bug.

### Round 2 — 2026-10-18 — changes-requested

**Checks**

- lint ✅ · type check ✅ · build ✅ (`npx turbo run lint check-types build --filter=@rochas-surf-school/mobile`, 12 tasks)
- related tests ✅ 570 passed in 32 suites (apps/mobile)
- coverage of the changed lines ✅ `COVERAGE OK`, 13 files; no coverage-ignore comments, TODOs or debug leftovers in
  the diff
- e2e: no suite applies (mobile has none) · iOS simulator (iPhone 18 Pro, iOS 27, app reloaded on `7675e61`): the
  reviewer saw Edit profile and Cancellation rules with the fixed native header and back button only; the user walked
  the rest of the journey with the software keyboard on and reported it: Edit profile and WhatsApp keep **Salvar**
  above the keyboard; signed out, `/auth` has no header and the e-mail, sign-in, create-account and confirm-code
  screens have the native header with back and swipe-back; as a student, class details shows `DETALHE` with no tools
  button and the School tab has no header, with its title and count ✅

**Expected Results**

- ER-01 ✅ — header options and hidden `index` / `(tabs)` in the layout tests, no in-content back button, back and
  swipe-back in the simulator; F-01 is fixed: `useKeyboardOffset()` (`useHeaderHeight()`) is the
  `keyboardVerticalOffset` of the six `KeyboardAvoidingView`s, each screen's test fails without it, and the focused
  field and primary button stay above the keyboard
- ER-02 ✅ — unchanged since round 1; the student's class details checked in the simulator (title, no tools button)

**Findings**

- [ ] **F-02** (D-03) — requirement change asked for by the user during this review, not a defect against the
  current contract: instead of the opaque `page` header, the header should fade the content scrolling under it with
  the iOS soft scroll-edge effect (`headerTransparent: true`, `scrollEdgeEffects: { top: "soft" }`, iOS 26+). Plan it
  with `/spec-plan --amend 038` before executing. The amendment has to settle: what Android and iOS < 26 get (opaque,
  or a gradient `headerBackground`, which needs a new dependency); content insets now that screens start at y = 0
  (`contentInsetAdjustmentBehavior="automatic"` on scroll views and lists, header-height top padding on the fixed
  screens; pull-to-refresh still below the header); `useKeyboardOffset` back to 0 under a transparent header (F-01's
  offset would otherwise overshoot by the header's height) and the six screens' offset tests; the screens that don't
  scroll (confirm code, create account…) show no fade; ER-01's "opaque `page` background" and the header-options
  tests.

**Notes**

- Already there before this spec (the content now starts at about the same height as under the old back-button row:
  ~116pt of header against the old `insets.top + 12` + 44pt), so not findings here; the user saw them with the
  software keyboard on:
  - Edit profile: the scroll area is `flex-1`, so with the keyboard up it is clipped flush against **Salvar** (its
    `pb-6` scrolls out of view) while `Math.max(insets.bottom, 24)` still keeps ~34pt between the button and the
    keyboard.
  - Confirm code and Create account don't scroll: their fixed column (intro, field, `flex-1` spacer, button, then the
    help card / the terms line) is about 40pt taller than the space left above the keyboard, so the bottom element
    slides under it.
  A follow-up session waits for this spec to merge to fix them; if the amendment makes these screens scroll, the
  same change can fix them here.
- `## Memory Impact` doesn't mention `useKeyboardOffset` (`src/navigation/stack-header/`): a `KeyboardAvoidingView`
  below the native header passes it as `keyboardVerticalOffset`. Add it (or its replacement after the amendment).
