---
id: "051"
slug: classes-filter-full-screen-scrim
title: The sport filter dims the whole phone
template: quick
status: in-progress
created: 2026-10-22
started: 2026-10-22
base_commit: 517a7c0b905b53fbcb2e236a1d8ae14a86e98519
fronts: [mobile]
depends_on: []
---

# 051 — The sport filter dims the whole phone

## Goal

When the week screen's sport filter (spec 050) is open, its scrim dims everything, as AGENDA-01B draws it: the
native header, the calendar, the list and the native tab bar, with only the three options and the "x" button above
it. Today the native header and the tab bar stay bright, because the scrim sits inside the screen's view.

## Context

- Requirements: none — this fixes how spec 050's filter is drawn, against the design; `.docs/requirements.md` →
  Seeing classes doesn't change.
- Design: `.docs/designs/student-app.html` **AGENDA-01B**: with the filter open, the scrim covers the whole phone —
  the user header, the band, the list and the tab bar.
- Existing code this changes: `apps/mobile/src/modules/classes/components/discipline-filter/` —
  `DisciplineFilter` renders, inside its own `SafeAreaProvider` (absolute over the screen), the closed button and,
  while open, a `bg-scrim` backdrop and the options; `useDisciplineFilter` (`discipline-filter.hook.ts`) holds the
  open state and the button's turn. The screens' headers are the native Stack header (transparent, over the
  content: `useUserStackHeader` on the student Agenda, `useLeftTitleHeader` on Aulas), and the tabs are
  `NativeTabs`; both are native layers above the screen's views, so anything the screen renders stays below them.
- Built on spec 050's branch (`spec/050-classes-discipline-filter`), not yet merged.

## Decisions

| ID | Decision | Reason |
|----|----------|--------|
| D-01 | The open state (backdrop, options, open button) renders in a transparent, full-window React Native `Modal` (`animationType="none"`, `statusBarTranslucent`, `navigationBarTranslucent`, `onRequestClose` closes). | It draws above the native header and the tab bar on iOS and Android with no new dependency; `FullWindowOverlay` is iOS-only, and a portal would need `@gorhom/portal` as a direct dependency. |
| D-02 | The open layer is placed at the filter's own `SafeAreaProvider` frame (`useSafeAreaFrame()`) with its bottom inset (`useSafeAreaInsets().bottom`), the same layout the closed button has — not with `measureInWindow`. | The frame is known on the first render, and on Android `measureInWindow` leaves out the status bar while a `statusBarTranslucent` `Modal` starts at the top of the screen. |
| D-03 | Two buttons share one turn: the closed one in the screen and the open one in the `Modal`, both a new `DisciplineFilterButton`. While open, the closed one is hidden from accessibility. | The turn plays on opening (the `Modal`'s button) and back on closing (the screen's, once the `Modal` is gone at once), and only "Close filter" is reachable while open. |

## Expected Results

### ER-01 — The open filter dims the header and the tab bar

- **Front:** mobile
- **Behavior:** Given an approved user of any role on `ClassesWeekScreen`, when they open the sport filter, then the
  scrim covers the whole window — on the student's Agenda the user header (avatar, greeting, bell), on the Aulas tab
  the title and "+", the calendar, the list and the native tab bar — and only the three options and the "x" button
  sit above it, the button in the same place as the closed one.
- **Edge and error cases:** a press anywhere on the scrim, over the header or the tab bar included, closes the
  options and keeps the filter; Android's back button closes them the same way; while open, the closed button is
  hidden from accessibility, so "Close filter" is the only filter button; the backdrop's fade, the options' staggered
  rise and the button's −90° turn still play, and closing stays instant; while closed, nothing but the button is
  rendered (no `Modal`); everything spec 050's ER-01 and ER-02 check keeps passing.
- **Verify by:** `npx jest src/modules/classes/components/discipline-filter src/modules/classes/screens/classes-week.screen.test.tsx`
  (from `apps/mobile`) — tests "renders the open filter above the header and the tab bar", "closes on the Android
  back button" and "hides the closed button while open", and the existing filter and screen tests; and in the iOS
  simulator, the open filter on the student's Agenda dims the user header and the tab bar, and on the admin's Aulas
  tab dims the title and "+", in light and dark themes.

## Tasks

### Mobile (`apps/mobile`)

Before writing code under `apps/mobile`, load the `vercel-react-native-skills` and `vercel-react-best-practices`
skills and follow [.claude/rules/react.md](../../../.claude/rules/react.md).

- [ ] **T-01** — Render the open filter in a full-window `Modal` (D-01–D-03), in
  `apps/mobile/src/modules/classes/components/`: `DisciplineFilter` keeps its `SafeAreaProvider` and renders a new
  `DisciplineFilterMenu` (`discipline-filter-menu/`: component, hook, types, index), which takes over the open state
  and the turn from `discipline-filter/discipline-filter.hook.ts` (removed), keeps the closed button in the screen
  and renders the backdrop, the options and the open button in the `Modal`, placed at the provider's frame and
  bottom inset; a new `DisciplineFilterButton` (`discipline-filter-button/`) draws both buttons. Update
  `discipline-filter/discipline-filter.component.test.tsx` and add "renders the open filter above the header and
  the tab bar" (the backdrop, the options and the "x" are inside the transparent `Modal`, its layer at the
  provider's frame), "closes on the Android back button" (the `Modal`'s `onRequestClose` closes without
  `onChange`) and "hides the closed button while open". Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-01 · Done when: `npx jest src/modules/classes/components src/modules/classes/screens/classes-week.screen.test.tsx`
  (from `apps/mobile`) passes with every changed line covered, and in the iOS simulator the open filter dims the
  student Agenda's header and the tab bar.

### Verification

- [ ] **T-02** — Run every command in the Verification Plan from the repo root; all pass. Follow the simulator
  journey of ER-01 (student's Agenda and admin's Aulas, light and dark). Record the output summary as evidence.
  Covers: all · Done when: every command exits 0 and the journey shows what ER-01 describes.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 051` — the related tests pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 051` — every line this spec adds or changes is covered
  - `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` — no errors
- Manual (no mobile e2e suite): in the iOS simulator, as a student, open the filter on the Agenda — the user header
  (avatar, greeting, bell), the calendar, the list and the tab bar are dimmed, the options and the "x" bright, the
  "x" where the closed button was; a press on the dimmed header closes it; as an admin, the same on the Aulas tab
  (title and "+" dimmed); repeat in dark theme.

## Memory Impact

- `memory/technical-context.md` — Classes → "Mobile week and details": `DisciplineFilter` renders
  `DisciplineFilterMenu`, whose open state (backdrop, options, open button) is a full-window transparent `Modal`
  placed at the provider's frame and bottom inset, above the native header and tab bar; `DisciplineFilterButton`
  draws the closed and the open button, which share the turn.

## Amendments

## Review
