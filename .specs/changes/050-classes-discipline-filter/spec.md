---
id: "050"
slug: classes-discipline-filter
title: Filter the week's classes by sport
template: quick
status: in-progress
created: 2026-10-22
started: 2026-10-22
base_commit: e8693a6f03a1dedbe9d39565e2cffd2aeeeebd52
fronts: [mobile]
depends_on: []
---

# 050 — Filter the week's classes by sport

## Goal

On the classes week screen — the student's Agenda and the Aulas tab of instructors and admins — any approved user
can show only the surf or only the skate classes, through the floating filter of AGENDA-01B. The filter works on
the week the app already loaded; the API doesn't change.

## Context

- Requirements: [requirements.md → Seeing classes](../../../.docs/requirements.md#seeing-classes) — every approved
  user sees all classes in a week or month view; this spec adds a sport filter to that view (D-01, D-02).
- Design: `.docs/designs/student-app.html` **AGENDA-01B** ("Sport filter"): a 56×56 `grape` button with a radius of
  20, at the bottom right of the list, above the tab bar, with a filter icon. Pressing it dims the screen with a
  backdrop, turns its icon into an "x" (rotated −90° while open), and stacks three 44px-high options above it
  (radius 16, 16px side padding, `surface` with a `line` border, uppercase Nunito 12 extra-bold with letter
  spacing, a shadow). The selected option is `grape` with white text. Choosing one closes the menu; "Todas" clears the
  filter. Unlike the design, the options carry **no icon** — just the label (the user's request).
- Existing code this changes: `apps/mobile/src/modules/classes/screens/classes-week.screen.tsx` and
  `classes-week.screen.hook.ts` — `useClassesWeekScreen` derives `dayItems` (the selected day's classes of
  `useWeekClasses(mondayOf(selectedDate))`) and `markedDates` (the days with a class over `useVisibleWeeksClasses`);
  the screen is rendered by `app/(private)/student/(tabs)/(agenda)/index.tsx`, `admin/(tabs)/classes/index.tsx` and
  `instructor/(tabs)/classes/index.tsx`. Each `ClassItem` has `discipline: "surf" | "skate"`. The tabs are
  `NativeTabs` (`src/components/role-tabs`).
- Tokens: `packages/design-tokens/src/tokens.ts` has no backdrop color, no grape shadow and no elevation for a
  floating button or a floating menu option (see D-04).

## Scope

- Out of scope: a `discipline` parameter on `GET /classes` (D-01); keeping the chosen filter across app launches
  (D-03); filtering any other list ("Minhas aulas", class history, the people directory); a badge on the closed
  button showing that a filter is active (the design has none).

## Decisions

| ID | Decision | Reason |
|----|----------|--------|
| D-01 | The filter runs in the app over the classes already loaded; `GET /classes` and the domain don't change. | The week is already loaded and small: switching is instant, with no request and no loading state, each week stays one cache entry, and the dots (4–6 weeks in the month grid) follow for free. Decided with the user. |
| D-02 | The filter button shows for every role on `ClassesWeekScreen` (student Agenda, instructor and admin Aulas), with no prop to turn it off. | The user's choice, though only the student design draws it. |
| D-03 | The filter is local state of `useClassesWeekScreen` (`"all"` \| `"surf"` \| `"skate"`, starting at `"all"`); nothing is stored on the device. | A view preference for the moment, as in the design; it resets when the screen mounts again. |
| D-04 | New tokens in `tokens.ts`: colors `scrim` (light `rgba(24,16,10,.28)`, dark `rgba(0,0,0,.45)`) and `shadowGrape` (light `rgba(75,42,99,.34)`, dark `rgba(0,0,0,.4)`); elevations `fab` (`offsetY: 12, blur: 26, color: "shadowGrape"`) and `menuOption` (`offsetY: 8, blur: 22, color: "shadow"`). Sizes use existing scales: the button `w-14 h-14 rounded-card`, the options `h-11 px-4 rounded-control`. | The design's values have no token, and CLAUDE.md forbids inlining raw values. |
| D-05 | Copy under `classesWeek.disciplineFilter`, shown uppercase: options pt-BR / es-ES "Todas" · "Surf" · "Skate", en-US "All" · "Surf" · "Skate"; the button's accessibility label "Filtrar por modalidade" / "Filtrar por modalidad" / "Filter by sport" when closed and "Fechar filtro" / "Cerrar filtro" / "Close filter" when open. | The app's three languages; the design's labels are Portuguese. |
| D-06 | The button and options are `TouchableOpacity` (CLAUDE.md), the backdrop a `Pressable`; the option buttons have `accessibilityRole="button"` and `accessibilityState={{ selected }}`. The list's `contentContainerStyle.paddingBottom` grows by the button's height plus its gap, so the last card scrolls clear of it. | Project button rule; the last card must stay reachable under a floating button. |

## Expected Results

### ER-01 — The filter button opens and closes the three options

- **Front:** mobile
- **Behavior:** Given an approved user on `ClassesWeekScreen` (any role), when they press the button labelled
  "Filtrar por modalidade" at the bottom right, then a backdrop covers the screen and three options show above the
  button — "TODAS", "SURF", "SKATE", each only its label, with no icon — with the current one selected (`grape`
  background, `onColor` text; "TODAS" the first time), and the button's label becomes "Fechar filtro".
- **Edge and error cases:** pressing the button again, or the backdrop, closes the options and keeps the filter as it
  was; the button shows in the loading, error and empty-day states too; with the options closed nothing but the
  button is rendered; the list's bottom padding includes the button's height and gap (D-06).
- **Verify by:** `npx jest src/modules/classes/components/discipline-filter src/modules/classes/screens/classes-week.screen.test.tsx`
  (from `apps/mobile`) — tests "opens the three options", "closes without changing the filter" and "shows the filter
  button for every role"; and in the iOS simulator, signed in as a student, the Agenda shows the button and its
  options as in AGENDA-01B (labels only), in light and dark themes.

### ER-02 — Choosing a sport filters the day's classes and the calendar dots

- **Front:** mobile
- **Behavior:** Given a week with surf and skate classes, when the user opens the filter and chooses "SURF", then the
  options close, the selected day lists only its surf classes, and the calendar marks only the days that have a surf
  class; choosing "TODAS" lists every class of the day and marks every day with a class again.
- **Edge and error cases:** the filter stays when the user selects another day, moves to another week, switches to
  the month and back, or pulls to refresh; it is back to "TODAS" when the screen mounts again; a day with classes but
  none of the chosen sport shows the existing empty-day state ("Criar aula" still offered to admins on today or
  later); changing the filter makes no API request (the mocked `fetch` call count doesn't change).
- **Verify by:** `npx jest src/modules/classes/screens/classes-week.screen.test.tsx` (from `apps/mobile`) — tests
  "lists only the chosen sport", "marks only the days with the chosen sport", "keeps the filter across days and
  weeks", "shows the empty day when no class matches" and "filters without a request"; and in the iOS simulator,
  choosing "SURF" on a week with both sports hides the skate cards and their dots.

## Tasks

### Mobile (`apps/mobile`)

Before writing code under `apps/mobile`, load the `vercel-react-native-skills` and `vercel-react-best-practices`
skills and follow [.claude/rules/react.md](../../../.claude/rules/react.md) (component folders split into
`*.component.tsx`, `*.hook.ts`, `*.types.ts`, `index.ts`).

- [x] **T-01** — Add the D-04 tokens to `packages/design-tokens/src/tokens.ts` (`scrim` and `shadowGrape` in both
  palettes, `fab` and `menuOption` in `elevation`) and regenerate `packages/design-tokens/src/tokens.css`
  (`npm run build -w @rochas-surf-school/design-tokens`); check that `apps/mobile`'s theme variables and
  `tailwind.config.ts` pick the new colors up (`bg-scrim`). Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: enabling · Done when: `npm run check-types -w @rochas-surf-school/design-tokens` and
  `npm run check-types -w @rochas-surf-school/mobile` exit 0.
  > ✅ 2026-10-22 — added `scrim` and `shadowGrape` to both palettes and the `fab` / `menuOption` elevations, and
  > regenerated the CSS (`--ds-scrim`, `--ds-shadow-grape`, `--ds-elevation-fab`, `--ds-elevation-menu-option`);
  > `apps/mobile`'s `theme-variables.ts` and `tailwind.config.ts` build their colors from `Object.keys(colors.light)`
  > through `colorVariable` / `kebab`, so `bg-scrim` → `var(--ds-scrim)` needs no change there. Files:
  > `packages/design-tokens/src/tokens.ts`, `packages/design-tokens/src/tokens.css`; verified:
  > `npm run check-types -w @rochas-surf-school/design-tokens` (exit 0, CSS up to date) and
  > `npm run check-types -w @rochas-surf-school/mobile` (exit 0); deviations: none
- [x] **T-02** — Create `DisciplineFilter` in `src/modules/classes/components/discipline-filter/`
  (`discipline-filter.component.tsx`, `.types.ts`, `index.ts`; a `.hook.ts` only if it holds logic): props
  `value: DisciplineFilterValue` (`"all" | "surf" | "skate"`, exported from `classes.types.ts`) and
  `onChange(value)`; its own open state; the backdrop, the options and the button as in the Context and D-04–D-06,
  with no icon in the options and the filter / close icon on the button (`useTheme()` for the icon color,
  `shadowStyle("fab")` / `shadowStyle("menuOption")`). Add the D-05 copy to `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`.
  Test it in `discipline-filter.component.test.tsx`: "opens the three options" (labels, no icon, the selected one
  has `accessibilityState.selected`), "closes without changing the filter" (button and backdrop), "calls onChange
  and closes" for each option. Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-01 · Done when: `npx jest src/modules/classes/components/discipline-filter` (from `apps/mobile`)
  passes with every line of the component covered.
  > ✅ 2026-10-22 — `DisciplineFilter` (`value`, `onChange`, its own `isOpen` state): closed, only the 56×56 `grape`
  > button (`h-14 w-14 rounded-card`, `shadowStyle("fab")`, Ionicons `filter`, label "Filter by sport"); open, a
  > `bg-scrim` `Pressable` backdrop over the screen and the three label-only options above the button (`h-11 px-4
  > rounded-control`, `surface` + `line` border, or `grape` + `text-on-color` when selected, `shadowStyle("menuOption")`,
  > `accessibilityRole="button"`, `accessibilityState.selected`), the button showing `close` rotated −90° and labelled
  > "Close filter". Choosing an option closes and calls `onChange`; the button or the backdrop close without it.
  > `DisciplineFilterValue` (`"all" | ClassDiscipline`) is in `classes.types.ts`; the D-05 copy under
  > `classesWeek.disciplineFilter` (`all`, `surf`, `skate`, `open`, `close`) in the three languages. Files:
  > `apps/mobile/src/modules/classes/components/discipline-filter/discipline-filter.component.tsx`,
  > `apps/mobile/src/modules/classes/components/discipline-filter/discipline-filter.types.ts`,
  > `apps/mobile/src/modules/classes/components/discipline-filter/index.ts`,
  > `apps/mobile/src/modules/classes/components/discipline-filter/discipline-filter.component.test.tsx`,
  > `apps/mobile/src/modules/classes/classes.types.ts`, `apps/mobile/src/i18n/messages/en-US.ts`,
  > `apps/mobile/src/i18n/messages/es-ES.ts`, `apps/mobile/src/i18n/messages/pt-BR.ts`; verified:
  > `npx jest src/modules/classes/components/discipline-filter --coverage` (7 passed: "renders only the closed button",
  > "opens the three options", "selects All the first time", "closes without changing the filter", "calls onChange and
  > closes when All / Surf / Skate is chosen"; the component 100% statements, branches, functions and lines), `npx tsc
  > --noEmit` and `npx eslint` on the files (exit 0); deviations: no `.hook.ts` — one `useState` and two inline handlers,
  > which `react.md` keeps in the component; the label uses the existing `ds-text-pill` type style (Nunito 12.5
  > extra-bold, uppercase, 0.06em) since no token is 12 / 0.1em and D-04 adds none; the icon is `iconSizes.bar` (22,
  > design 24); the options and button sit `pr-screen` (20, design 18) and `pb-4` (16, design 18) above the bottom
  > inset, which a `SafeAreaProvider` of its own measures so that on iOS it includes the native tab bar the screen
  > extends under; the −90° rotation is applied without the design's transition.
- [x] **T-03** — Wire the filter into `src/modules/classes/screens/classes-week.screen.hook.ts` (the D-03 state,
  `dayItems` and `markedDates` filtered by it, the setter returned) and `classes-week.screen.tsx` (render
  `DisciplineFilter` over the list in every state, the D-06 bottom padding). Add to `classes-week.screen.test.tsx`
  the tests named in ER-01 ("shows the filter button for every role": the student, instructor and admin props) and
  ER-02, with a week mixing surf and skate classes. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-01, ER-02 · Done when: `npx jest src/modules/classes/screens/classes-week.screen.test.tsx` (from
  `apps/mobile`) passes, and in the iOS simulator the student's Agenda filters a mixed week by "SURF" and back to
  "TODAS".
  > ✅ 2026-10-22 — `useClassesWeekScreen` keeps `discipline` (`useState<DisciplineFilterValue>("all")`), filters
  > `dayItems` and `markedDates` by it (`isShown`) and returns it with `selectDiscipline`; `ClassesWeekScreen` renders
  > `DisciplineFilter` after the list, outside its state branches (loading, error, empty day, cards), and adds
  > `DISCIPLINE_FILTER_CLEARANCE` (56 + 16) to the list's `paddingBottom`. Tests added to the screen suite: "opens the
  > three options", "closes without changing the filter", "shows the filter button for every role" (student, instructor
  > and admin props), "shows the filter button while loading, on an error and on an empty day", "pads the list's bottom
  > for the button and its gap", "lists only the chosen sport", "marks only the days with the chosen sport", "keeps the
  > filter across days and weeks" (another day, the next week, the month and back, a pull-to-refresh), "is back to All
  > when the screen mounts again", "shows the empty day when no class matches" (admin, "Create class" still offered)
  > and "filters without a request". Files: `apps/mobile/src/modules/classes/screens/classes-week.screen.hook.ts`,
  > `apps/mobile/src/modules/classes/screens/classes-week.screen.tsx`,
  > `apps/mobile/src/modules/classes/screens/classes-week.screen.test.tsx`,
  > `apps/mobile/src/modules/classes/components/discipline-filter/discipline-filter.constants.ts`,
  > `apps/mobile/src/modules/classes/components/discipline-filter/discipline-filter.component.tsx`; verified: `npx jest
  > src/modules/classes/screens/classes-week.screen.test.tsx src/modules/classes/components/discipline-filter` (55
  > passed; the hook, the constants and the component 100%, the screen 100% of lines, its one uncovered branch — line
  > 39, the title — predates this spec), `npx tsc --noEmit` and `npx eslint` (exit 0); iOS simulator (iPhone 18 Pro,
  > iOS 27, the running dev build, signed in as a student, pt-BR): the Agenda shows the button above the floating tab
  > bar; it opens "TODAS" (selected, `grape`) · "SURF" · "SKATE", labels only, with the "x"; "SKATE" emptied a surf-only
  > week (no dots, the empty day), kept on the previous week (only Saturday 17 marked, its skate card alone), "TODAS"
  > brought every card and dot back, and "SURF" on Saturday 17 hid its skate card. Deviations: opening the filter in the
  > app first threw "Couldn't find a navigation context": Tailwind's `-rotate-90` sets a CSS variable, and adding it
  > after the first render makes NativeWind upgrade the button, whose upgrade warning stringifies props that reach React
  > Navigation's throwing context getters; the closed button now has `rotate-0`, so the variable is set from the first
  > render (a T-02 file, fixed here; Jest doesn't run NativeWind's upgrade, so no test can catch it). The backdrop's
  > dim isn't visible yet: the running Metro predates the `scrim` token (T-01) and needs a restart with `--clear` —
  > checked in T-04 with the dark theme and the admin's Aulas tab.
- [x] **T-05** (added during execution) — Animate `DisciplineFilter` as AGENDA-01B does, with Reanimated, at the user's
  request after T-04: on opening, the backdrop fades in (180 ms, `ease`) and each option rises 14 px while fading in
  (220 ms, `cubic-bezier(.32,.72,0,1)`, 40 ms apart from the first); the button turns to −90° and back over 200 ms with
  the same curve, replacing the `-rotate-90` / `rotate-0` classes; closing stays instant, as in the design. Move the
  state and the rotation into `discipline-filter.hook.ts` (`react.md`), and test the rotation and that the backdrop
  and options animate in. Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-01 · Done when: `npx jest src/modules/classes/components/discipline-filter
  src/modules/classes/screens/classes-week.screen.test.tsx` (from `apps/mobile`) passes with every changed line
  covered, and in the iOS simulator opening the filter shows the fade, the staggered rise and the turning button.
  > ✅ 2026-10-22 — the backdrop is an `Animated.View` with `entering={BACKDROP_ENTERING}` (`FadeIn`, 180 ms, CSS
  > `ease` as `Easing.bezier(0.25, 0.1, 0.25, 1)`, since Reanimated's `Easing.ease` is another curve) around the
  > `Pressable`; each option is wrapped in an `Animated.View` with `OPTION_ENTERING[index]` (`FadeInDown` from
  > `opacity: 0, translateY: 14`, 220 ms, `Easing.bezier(0.32, 0.72, 0, 1)`, delay `index * 40`; one builder per option,
  > since a builder's methods change it in place); the button sits in an `Animated.View` turned by
  > `useDisciplineFilter`'s `buttonTurnStyle` (`useDerivedValue` + `withTiming` to −90° or 0°, 200 ms, the same curve),
  > replacing the `-rotate-90` / `rotate-0` classes; closing stays instant. The state, the handlers and the turn moved
  > into `discipline-filter.hook.ts`; the options list and the animations into `discipline-filter.constants.ts`.
  > Tests added: "fades the backdrop in and raises the options one after another" and "turns the button to −90° while
  > open and back when closed" (fails with the turn set to 0°). Files:
  > `apps/mobile/src/modules/classes/components/discipline-filter/discipline-filter.component.tsx`,
  > `apps/mobile/src/modules/classes/components/discipline-filter/discipline-filter.hook.ts`,
  > `apps/mobile/src/modules/classes/components/discipline-filter/discipline-filter.constants.ts`,
  > `apps/mobile/src/modules/classes/components/discipline-filter/discipline-filter.types.ts`,
  > `apps/mobile/src/modules/classes/components/discipline-filter/discipline-filter.component.test.tsx`; verified:
  > `npx jest src/modules/classes/components/discipline-filter src/modules/classes/screens/classes-week.screen.test.tsx`
  > (57 passed; the component, hook and constants 100%), `npx tsc --noEmit` and `npx eslint` (exit 0); rerun of the
  > Verification Plan: RELATED TESTS PASSED (mobile 1128, web 22), COVERAGE OK (8 files), lint and check-types 8/8.
  > Deviations: the simulator part of Done when was not run by the executor — the simulator was in use by another
  > session — and the user approved moving the spec to review after T-05 was built ("the filter task looks good");
  > the reviewer should watch the opening in the simulator.

### Verification

- [x] **T-04** — Run every command in the Verification Plan from the repo root; all pass. Follow the simulator
  journeys of ER-01 and ER-02 (light and dark). Record the output summary as evidence. Covers: all · Done when: every
  command exits 0 and both journeys show what the Expected Results describe.
  > ✅ 2026-10-22 — automated: `node .specs/scripts/run-related-tests.mjs 050` → RELATED TESTS PASSED (apps/mobile
  > jest 69 suites / 1126 tests, apps/web vitest 22 tests; packages/design-tokens has no runner);
  > `node .specs/scripts/check-coverage.mjs 050` → COVERAGE OK (every changed line covered in 7 files);
  > `npx turbo run lint check-types --filter=@rochas-surf-school/mobile --filter=@rochas-surf-school/design-tokens` →
  > 8/8 tasks successful; `node .specs/scripts/run-e2e.mjs 050` → E2E PASSED (apps/web Playwright 22 passed, the
  > backend not affected). Manual, iOS simulator (iPhone 18 Pro, iOS 27, pt-BR, Metro restarted with `--clear` so the
  > T-01 tokens compile): as a student, the Agenda shows the button above the tab bar; it opens "TODAS" (selected) ·
  > "SURF" · "SKATE", labels only, with the "x"; "SKATE" kept on the previous week (only Saturday 17 marked, its skate
  > card alone), "TODAS" brought every card and dot back, "SURF" on Saturday 17 hid its skate card. As an admin, the
  > Aulas tab shows the button and its options; the `scrim` backdrop dims the screen in light and in dark themes, and
  > a tap on it closes the options; dark theme draws the `surface` / `line` options and the dark `grape`. Files: the
  > spec only. Observed once, not reproduced, and not caused by this spec: the dev build aborted (SIGABRT, report
  > `~/Library/Logs/DiagnosticReports/RochasSurfSchool-2026-10-22-193808.ips`) at 19:38:01, when "Claro" was pressed in
  > the Tema sheet. The simulator log (`log show`) has the assertion: "Attempt to unmount a view which has a different
  > index" in `-[RCTViewComponentView unmountChildComponentView:index:]`, parent a 362×45.7 row at x 20, child a 19 pt
  > Ionicons glyph in light `lagoon` at its right edge, expected index 2, actual 0 — the selected row's checkmark of
  > `ThemeSheet` (`apps/mobile/src/components/theme-sheet/theme-sheet.component.tsx`: icon, label, `checkmark` size 19
  > `lagoon`), moving to the new theme's row. That bottom sheet is on the Perfil tab and this spec doesn't change it;
  > `DisciplineFilter` isn't in that view tree. The same steps, slowly and fast, didn't crash again in three tries.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 050` — the related tests pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 050` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/mobile --filter=@rochas-surf-school/design-tokens`
    — no errors (the tokens' check also fails on a stale `tokens.css`).
- Manual (no mobile e2e suite): the iOS simulator journeys in ER-01 and ER-02 — as a student, open the Agenda on a
  week with surf and skate classes, open the filter (three labels, no icons, "TODAS" selected), choose "SURF" (only
  surf cards and dots), change day and week (still filtered), choose "TODAS" (everything back); repeat the open/close
  in dark theme and check the button on the admin's Aulas tab.

## Memory Impact

- `memory/technical-context.md` — Classes → "Mobile week and details": the sport filter (`DisciplineFilter`, local
  state in `useClassesWeekScreen` filtering `dayItems` and `markedDates`, no API parameter, every role) and the new
  `scrim` / `shadowGrape` colors and `fab` / `menuOption` elevations.
- `memory/product.md` — "Week view and class details": every approved user can filter the week view by sport
  (all, surf, skate); the filter resets when the screen opens again.

## Amendments

## Review
