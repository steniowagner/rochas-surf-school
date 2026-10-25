---
id: "060"
slug: enrol-student-steps
title: "Split \"Inscrever aluno\" into Quem and Aula steps"
template: quick
status: changes-requested
created: 2026-10-25
started: 2026-10-25
base_commit: 8e31960b5c4e9506b388de0ab4e3e0f5b272f34a
fronts: [mobile]
depends_on: []
---

# 060 — Split "Inscrever aluno" into Quem and Aula steps

## Goal

The admin's "Inscrever aluno" screen stops stacking "1 · Quem" and "2 · Aula" on one scroll. It becomes two steps
shown as tabs, with a button fixed at the bottom: first the admin chooses the person (a school student or a trial
guest) and presses "Escolher aula", then chooses the class and presses "Inscrever". It is a UI change only: what each
step shows inside, the requests and their outcomes stay as they are.

## Context

- Requirements: [requirements.md → Direct enrolment](../../../.docs/requirements.md#direct-enrolment) and
  [requirements.md → Guests](../../../.docs/requirements.md#guests) — unchanged; this spec only reorganizes the screen
  that implements them (specs 044 and 045).
- Existing code this changes:
  - `apps/mobile/src/modules/enrolment/screens/enrol-student.screen.tsx` — one `Animated.ScrollView` with the
    `ScreenIntro` (icon and description), the trial/student `SegmentedControl`, the "1 · Quem" section (search and
    student list, or the trial name, WhatsApp and note), the "2 · Aula" section (`WeekMonthCalendar` and the class
    cards) and the "Inscrever {name}" / "Inscrever" `Button` at the end of the content.
  - `apps/mobile/src/modules/enrolment/screens/enrol-student.screen.hook.ts` (+ `.types.ts`) — the selections, the
    queries and `submit`, which is undefined until a person and a class with a free seat are set.
  - `apps/mobile/src/components/ui/segmented-control/` — the existing pill switch; its look (sand pill, selected
    option on `bg-surface` with `shadowStyle("iconButton")`) is the base of the step tabs.
  - `apps/mobile/src/modules/classes/screens/edit-class.screen.tsx` — the fixed footer pattern this screen follows
    (`border-t border-line bg-page px-screen pt-3`, bottom padding `Math.max(insets.bottom, 16)`).
- Design: the two screenshots the user shared while planning (step 1 with "Ana Silva" picked, step 2 with
  "Qua 16 · 09:00" picked). The summary line above the button in those images is not built (D-04).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | A new `StepTabs` component in `apps/mobile/src/components/ui/step-tabs/` (component, types, index; a hook only if it needs one). It is a sand pill (`bg-sand`, rounded, padded like `SegmentedControl`) holding one card per step, side by side, each a `TouchableOpacity` with `accessibilityRole="tab"` and `accessibilityState={{ selected, disabled }}`. The selected card is `bg-surface` with `shadowStyle("iconButton", theme)`. Each card is `rounded-card` with its content left-aligned and shows a round status circle — the step number on `bg-tan` in `text-on-color` while the step isn't done, a white `checkmark` on `bg-ok` once it is — then a small uppercase label and, under it, a value line. A disabled card is dimmed and ignores presses. Props: the steps (`key`, `label`, `value`, `done`, `disabled`), the selected key and `onChange`. Colors, type and radii come from the tokens only. | The design's tab cards; `SegmentedControl` has no status, no value line and no disabled state, and stacking two identical pill switches would read as one control. |
| D-02 | The step is local state of `useEnrolStudentScreen` (`"who" \| "class"`, starting at `"who"`). The Quem step is done when the person is ready: a picked student in student mode, or a valid trial name and a valid WhatsApp number in trial mode — the same rule `submit` uses today. The Aula step is done when a class with a free seat is picked. The Quem tab can always be pressed; the Aula tab is disabled while the Quem step isn't done. Leaving a step keeps every selection (student, mode, trial fields, day, class). Back on the Quem step, if the admin changes the person so that the step is no longer done, the Aula tab and "Escolher aula" turn off. | Matches the requested gate ("disabled until the admin selects some student or trial student"); tapping a tab can't skip it. |
| D-03 | Tab copy: labels `enrolStudent.steps.who` — pt-BR "Quem", es-ES "Quién", en-US "Who" — and `enrolStudent.steps.class` — pt-BR "Aula", es-ES "Clase", en-US "Class"; the value line reads `enrolStudent.steps.pending` — pt-BR "Por escolher", es-ES "Por elegir", en-US "Not chosen" — until the step is done. When done, Quem shows the picked student's name, or the trimmed trial name; Aula shows the class's school day as the short weekday with its first letter capitalized and the day of the month, then " · " and the start time in the school's time zone (pt-BR "Qua 16 · 09:00"), built with `formatIsoDate(schoolDayOf(startsAt), "EEE d", locale)` and `schoolTimeOf(startsAt)`. The old `enrolStudent.whoStep` / `classStep` section labels are removed from the screen and from the three locales. | The design's tab content; the numbered section labels are replaced by the tabs. |
| D-04 | The button is the standard `Button` (`variant="primary"`) inside a footer fixed under the scroll (the `edit-class` pattern). On the Quem step it reads `enrolStudent.next` — pt-BR "Escolher aula", es-ES "Elegir clase", en-US "Choose class" —, is disabled until the Quem step is done, and moves to the Aula step. On the Aula step it reads the existing `enrolStudent.submitEmpty` — pt-BR "Inscrever", es-ES "Inscribir", en-US "Enrol" —, is disabled until `submit` is defined, shows the `loading` spinner while sending and calls `submit`. The `enrolStudent.submit` ("Inscrever {{name}}") key and `submitName` are removed. No summary line above the button. | The design's buttons, using the project's standard button (user's instruction); the name now lives in the Quem tab. |
| D-05 | The `ScreenIntro` (icon and description) is removed from the screen; the collapsing-title header keeps "Inscrever aluno" as its title. The top of the scroll is the `StepTabs`, then the current step's content. The `enrolStudent.description` key is removed from the three locales if nothing else uses it. | The design has no intro; the header already carries the title. |
| D-06 | Each step's content is reused as it is: on Quem the trial/student `SegmentedControl` then the search and student list (with its skeleton, "Nenhum aluno encontrado" empty state, load error with retry and the "load more" spinner) or the trial name, WhatsApp and note; on Aula the `WeekMonthCalendar` then the class cards (with their skeletons, "Sem aulas neste dia" empty state, load error with retry, and full classes dimmed and not pickable). Only the current step's content is rendered. Details of the screenshots that don't exist today (student subtitles such as "6 aulas · desde jul 2026", a day header with the class count) are not built. | "Reuse what we already have" and "keep the loading, empty and error states" (user's instructions). |
| D-07 | The Aula step also shows the floating sport filter (`DisciplineFilter`, as on the classes week screen) over the step's content, above the fixed footer (not over the button). The filter value (`all`, `surf`, `skate`) is local state of the hook, starts on `all`, and narrows the selected day's class cards to that sport. The scroll gets the filter's bottom clearance (`DISCIPLINE_FILTER_CLEARANCE`) so the last card isn't covered. A picked class the filter hides stops counting as picked. | Requested by the user during execution (amendment 2026-10-25); reuses the existing component. |

## Expected Results

### ER-01 — The screen opens on the Quem step, with "Escolher aula" disabled until someone is chosen

- **Front:** mobile
- **Behavior:** Given an admin opens "Inscrever aluno", when the screen renders, then it shows the step tabs with
  "Quem" selected and both values reading "Por escolher", the trial/student switch on "Aluno da escola", the search and
  the student list, no calendar and no class card, and a fixed "Escolher aula" button that is disabled; when the admin
  picks a student, then the Quem tab shows a check and the student's name, the Aula tab becomes pressable and
  "Escolher aula" is enabled. No intro description and no "1 · Quem" / "2 · Aula" labels are shown.
- **Edge and error cases:** in trial mode the button stays disabled (and the Aula tab too) until the name is a first
  and last name and the WhatsApp number is valid, then the Quem tab shows the trimmed name; switching the mode
  re-applies the rule of the new mode; while the students load the skeleton shows, an empty search shows "Nenhum
  aluno encontrado", a failed load shows the error with "Tentar novamente" (which retries), and the "load more" spinner
  still shows under the list; pressing the Aula tab while it is disabled does nothing.
- **Verify by:** `npx jest src/components/ui/step-tabs src/modules/enrolment/screens/enrol-student.screen.test.tsx
  src/modules/enrolment/screens/enrol-student.screen.hook.test.tsx` (from `apps/mobile`), and the user journey in the
  Verification Plan.

### ER-02 — "Escolher aula" shows the Aula step, with "Inscrever" disabled until a class with a free seat is picked

- **Front:** mobile
- **Behavior:** Given the Quem step is done, when the admin presses "Escolher aula" (or the Aula tab), then the Aula
  tab is selected, the calendar and the selected day's class cards show, the Quem content is hidden, and the button
  reads "Inscrever" and is disabled; when the admin picks a class with a free seat, then the Aula tab shows a check and
  the class as "<weekday> <day> · <HH:mm>" (pt-BR "Qua 16 · 09:00" for a class on Wednesday the 16th at 09:00 school
  time) and "Inscrever" is enabled.
- **Edge and error cases:** a full class is dimmed and can't be picked; picking another day clears the class, the Aula
  value goes back to "Por escolher" and the button is disabled again; pressing the Quem tab shows step 1 with the
  student (or trial fields) still filled and, back on Aula, the day and class still picked; while the classes load the
  skeletons show, a day without classes shows "Sem aulas neste dia", and a failed load shows the error with retry. The Aula step also shows the floating sport filter (D-07; not on the
  Quem step, not over the button): "Surf" or "Skate" lists only that sport's classes and "All" lists them again; a
  picked class the filter hides is no longer picked (the Aula tab reads "Por escolher", "Inscrever" is disabled); a
  sport with no class that day shows "Sem aulas neste dia".
- **Verify by:** `npx jest src/modules/enrolment/screens/enrol-student.screen.test.tsx
  src/modules/enrolment/screens/enrol-student.screen.hook.test.tsx` (from `apps/mobile`), and the user journey in the
  Verification Plan.

### ER-03 — Enrolling from the Aula step works as it does today

- **Front:** mobile
- **Behavior:** Given a student (or a valid trial guest) and a class with a free seat are picked, when the admin
  presses "Inscrever", then the same request as today is sent (`POST /classes/:id/enrolments/direct` for a student, the
  guest request for a trial guest), the button shows its spinner, and on success the same toast as today shows
  ("{name} inscrito · aluno avisado" for a student, the trial message for a guest) and the screen goes back.
- **Edge and error cases:** pressing twice sends once; a refused enrolment shows the same error toast as today and
  keeps the selection; an error that reloads the classes clears the picked class (the button turns disabled again);
  any other failure shows the generic toast and keeps the selection.
- **Verify by:** `npx jest src/modules/enrolment/screens/enrol-student.screen.test.tsx` (from `apps/mobile`) — the
  existing submit, double-press and error tests, updated to go through "Escolher aula" first.

## Tasks

### Mobile (`apps/mobile`)

- [x] **T-01** — Create `StepTabs` (D-01) in `src/components/ui/step-tabs/` (`step-tabs.component.tsx`,
  `step-tabs.types.ts`, `index.ts`), following `.claude/rules/react.md`, with
  `step-tabs.component.test.tsx` covering: each step's label and value, the number while not done and the check when
  done, the selected tab's `accessibilityState`, `onChange` on pressing another enabled tab, and no call on a disabled
  tab or on the selected one. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-01, ER-02 · Done when: `npx jest src/components/ui/step-tabs` passes from `apps/mobile`.
  > ✅ 2026-10-25 — created `StepTabs`; files: `apps/mobile/src/components/ui/step-tabs/index.ts`,
  > `step-tabs.component.tsx`, `step-tabs.types.ts`, `step-tabs.component.test.tsx`; verified: `npx jest src/components/ui/step-tabs` (6 passed);
  > deviations: none (no hook file: the component has no state)
- [x] **T-02** — In `src/modules/enrolment/screens/enrol-student.screen.hook.ts` and `.types.ts`, add the step state
  and rules of D-02 (`step`, `isWhoDone`, `isClassDone`, `goToStep`, or names to that effect), the tab values of D-03
  (the person's name, the class's "<weekday> <day> · <HH:mm>" in the active locale, or `null` when not done), and
  remove `submitName` (D-04); extend `enrol-student.screen.hook.test.tsx` with: the initial step, the Quem rule in
  both modes, the Aula rule (free seat, cleared on another day), selections kept across steps, and the class value in
  pt-BR, es-ES and en-US. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-01, ER-02 · Done when: `npx jest src/modules/enrolment/screens/enrol-student.screen.hook.test.tsx`
  passes from `apps/mobile`.
  > ✅ 2026-10-25 — added `step`, `goToStep`, `isWhoDone`, `isClassDone`, `whoValue`, `classValue`, removed `submitName`;
  > files: `apps/mobile/src/modules/enrolment/screens/enrol-student.screen.hook.ts`, `.types.ts`,
  > `enrol-student.screen.hook.test.tsx`; verified: `npx jest src/modules/enrolment/screens/enrol-student.screen.hook.test.tsx`
  > (14 passed); deviations: D-03 says `formatIsoDate(…, "EEE d", …)`, but date-fns' pt-BR "EEE" gives "Quarta", not "Qua"
  > (the repo's `formatDeadline` hits the same); the weekday is the first three letters of "EEEE" instead, so pt-BR reads
  > "Qua 14 · 16:00" as the ER-02 requires. The screen still reads `submitName` until T-03.
- [x] **T-03** — In `src/modules/enrolment/screens/enrol-student.screen.tsx`, remove the `ScreenIntro` and the section
  labels (D-05), render `StepTabs` at the top of the scroll and only the current step's content (D-06), and move the
  button into the fixed footer with both labels and states (D-04); in `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`
  add `enrolStudent.steps.{who,class,pending}` and `enrolStudent.next` and remove `enrolStudent.whoStep`, `classStep`,
  `submit` and (if unused elsewhere) `description`. Update `enrol-student.screen.test.tsx`: every existing test that
  picks a class goes through "Escolher aula" first, the existing loading, empty, error, full-class, search, paging,
  submit, double-press and error-toast tests keep passing, and new tests cover every case of ER-01 and ER-02
  (initial tabs and disabled button, enabling in both modes, the Aula tab disabled and enabled, the Aula step's
  content and button, the class value, going back to Quem with the picks kept, no intro and no section labels).
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-01, ER-02, ER-03 · Done when: `npx jest src/modules/enrolment src/i18n` passes from `apps/mobile`.
  > ✅ 2026-10-25 — screen now renders `StepTabs`, only the current step's content and a fixed footer with "Escolher aula" /
  > "Inscrever"; `ScreenIntro`, section labels and the `submit`/`whoStep`/`classStep`/`description` keys removed; added
  > `enrolStudent.steps.{who,class,pending}` and `enrolStudent.next`; files:
  > `apps/mobile/src/modules/enrolment/screens/enrol-student.screen.tsx`, `enrol-student.screen.test.tsx`,
  > `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`; verified: `npx jest src/modules/enrolment src/i18n
  > src/components/ui/step-tabs` (36 suites, 323 passed), `tsc --noEmit` clean; deviations: without `ScreenIntro` there is no
  > large title for the collapsing header to track (its title would never show), so the screen sets its header title with
  > `StackHeaderTitle` (as `edit-class` does) and uses a plain `ScrollView`; the header still reads "Inscrever aluno".
  > Follow-up fix found by the related tests: `apps/mobile/src/modules/admin/screens/admin.screen.test.tsx` asserted the removed
  > intro text; it now asserts the "Choose class" button. The hook's `whoValue` was simplified so `isWhoDone = whoValue !== null`.
- [x] **T-05** (added during execution) — In `enrol-student.screen.hook.ts` / `.types.ts` add `discipline` and
  `selectDiscipline` (D-07) and filter `dayItems` by it; in `enrol-student.screen.tsx` render `DisciplineFilter` on the
  Aula step over the scroll area (the footer stays outside it) and add its clearance to the scroll's bottom padding;
  tests in the hook and screen test files for the filter cases of ER-02. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-02 · Done when: `npx jest src/modules/enrolment` passes from `apps/mobile`.
  > ✅ 2026-10-25 — hook has `discipline` / `selectDiscipline` and filters `dayItems`; the Aula step renders `DisciplineFilter`
  > over the scroll area with its clearance as extra bottom padding; also, at the user's request, `StepTabs` container and
  > tabs are `rounded-full`; files: `apps/mobile/src/modules/enrolment/screens/enrol-student.screen.{hook.ts,types.ts,tsx}`,
  > `enrol-student.screen.hook.test.tsx`, `enrol-student.screen.test.tsx`,
  > `apps/mobile/src/components/ui/step-tabs/step-tabs.component.tsx`; verified: `npx jest src/modules/enrolment
  > src/components/ui/step-tabs` (321 passed), `tsc --noEmit` clean; deviations: the screen file was reformatted by prettier. Later design tweaks to the tabs, at the user's request: `c832c51e` (content centered), `797e8576` (card radius, left-aligned content, so the tabs are `rounded-card`, not `rounded-full`), `0f6e92ca` (rounded-square badge) and `4ab2c39e` (back to a round badge).

### Verification

- [x] **T-04** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0 and the user journey matches.
  > ✅ 2026-10-25 — `run-related-tests.mjs 060` (990 passed, RELATED TESTS PASSED); `check-coverage.mjs 060` (COVERAGE OK, 7 files);
  > `npx turbo run lint check-types build --filter=@rochas-surf-school/mobile` (12 tasks successful); deviations: the iOS
  > simulator user journey was not driven in this session — the reviewer or the user must run it (see the Verification Plan).

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 060` — the related tests pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 060` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/mobile` — no errors.
- User journey (iOS simulator, pt-BR, light and dark theme): as an admin, open Início → "Inscrever aluno" → the tabs
  read "Quem · Por escolher" (selected) and "Aula · Por escolher", no intro text, "Escolher aula" fixed at the bottom
  and disabled; pick a student → the Quem tab shows a check and the name, the button turns on; switch to "Aula
  experimental" → the button turns off until a full name and a valid WhatsApp are typed; press "Escolher aula" → the
  calendar and the classes show, "Inscrever" is disabled; pick a class with a free seat → the Aula tab shows
  "<Qua 16 · 09:00>"-style text with a check and "Inscrever" turns on; tap "Quem" → the person is still there; back
  on "Aula" → the class is still picked; press "Inscrever" → the toast shows and the screen closes.

## Memory Impact

- `memory/product.md` — the "Inscrever aluno" paragraphs (specs 044 and 045): the screen is two steps, "Quem" and
  "Aula", as tabs with a fixed "Escolher aula" / "Inscrever" button; the intro text is gone.
- `memory/technical-context.md` — the `EnrolStudentScreen` bullet: the step state and rules, `StepTabs`, the fixed
  footer, the new and removed `enrolStudent.*` keys; the shared UI components list gains `StepTabs`.
- `memory/structure.md` — `src/components/ui/step-tabs/` under the mobile UI components, and the
  `enrol-student.screen.tsx` line reworded ("Quem" and "Aula" steps).
- `memory/modules.md` — None.
- `memory/modules/enrolment.md` — a Spec history line, if the module file lists one.

## Amendments

- 2026-10-25 — Added D-07 and T-05, and the filter cases in ER-02 (a quick spec allows only 3 Expected Results): the Aula step gets the floating sport filter. Before: no filter on the step.
  Reason: the user asked for it after the spec went to review; status went back from `in-review` to `in-progress`.
  Approved by the user in chat.
- 2026-10-25 — D-04: the footer buttons lose their icons. Before: "Escolher aula" with `chevron-forward` and "Inscrever" with `person-add-outline`. After: label only, same disabled and loading states.
  Reason: the user asked for it during review round 1 (F-03).
  Approved by the user in chat.
- 2026-10-25 — D-01: the step tabs are `rounded-card` with left-aligned content, and the not-done status circle is `bg-tan` with `text-on-color`. Before: circle on `bg-sand` in `text-ink-2`.
  Reason: the user adjusted the design after T-05 (commits `c832c51e`, `797e8576`, `0f6e92ca`, `4ab2c39e`); F-01 asked to record it.
  Approved by the user in chat.

## Review

### Round 1 — 2026-10-25 — changes-requested

**Checks**

- lint ✅ · type check ✅ · build ✅ (`npx turbo run lint check-types build --filter=@rochas-surf-school/mobile`, 12 tasks)
- related tests ✅ 874 passed, 45 suites (apps/mobile)
- coverage of the changed lines ✅ COVERAGE OK, 6 measured files at 100%; no coverage-ignore comments in the diff
- e2e: no suite applies (mobile only) · user journey driven in the iOS simulator (iPhone 18 Pro, en-US, dark theme) ✅

**Expected Results**

- ER-01 ✅ — opens on "Who" with both tabs "Not chosen", "School student", search and list, no intro or section labels,
  "Choose class" fixed and disabled; pressing the disabled "Class" tab does nothing; picking a student shows the check
  and the name and turns the button on; "Trial class" turns it off again until a full name and a valid WhatsApp are
  typed, then the tab shows the trimmed name ("Maria Costa" typed with a trailing space); switching back keeps the
  picked student. Loading, empty, error/retry and load-more are covered by `enrol-student.screen.test.tsx`.
- ER-02 ✅ — "Choose class" shows the calendar, the day's cards, the empty state and the sport filter above the footer;
  "Enrol" is disabled until a class is picked, then the tab reads "Sun 1 · 08:00" with a check; "Skate" hides the surf
  class, un-picks it and shows "No classes this day"; going back to "Who" keeps the student and back on "Class" the day
  and the class are still picked. The pt-BR/es-ES/en-US values ("Qua 14 · 16:00", "Mié 14 · 16:00", "Wed 14 · 16:00")
  are asserted in the hook test.
- ER-03 ✅ — "Enrol" sent the enrolment, the toast "Ana Souza enrolled · student notified" showed and the screen went
  back; double press, refused enrolment, reload and generic errors are covered by the existing screen tests, which now
  go through "Choose class".

**Findings**

- [x] **F-01** (D-01) — the step's status circle while not done is `bg-tan` with `text-on-color`
  (`step-tabs.component.tsx` line 129 and 134); D-01 says "the step number on `bg-sand` in `text-ink-2`". Commits
  `c832c51e`, `797e8576`, `0f6e92ca` and `4ab2c39e` changed the tab after T-05 was recorded, with no amendment and no
  evidence (T-05's evidence still says the tabs are `rounded-full`; they are `rounded-card`). Reproduce: open
  "Inscrever aluno" — the "1"/"2" circles are tan with white digits. Expected: either the circle follows D-01, or
  D-01 is amended (`/spec-plan --amend 060`) to say what was built, and T-05's evidence lists those commits.
  > ✅ 2026-10-25 — D-01 amended to what was built (see Amendments) and T-05's evidence lists the four commits; no code change; verified: `check-spec.mjs 060`.
- [x] **F-02** (convention) — `enrol-student.screen.tsx` lines 13–15 import `@/modules/classes/components/discipline-filter`
  and `.../discipline-filter/discipline-filter.constants` before `@/modules/classes/components/class-card` and
  `class-card-skeleton`; `.claude/rules/react.md` §2 sorts each import group alphabetically by path. Expected: the two
  `discipline-filter` imports after `class-card-skeleton`.
  > ✅ 2026-10-25 — the two imports moved after `class-card-skeleton`; file: `apps/mobile/src/modules/enrolment/screens/enrol-student.screen.tsx`; verified: prettier check clean, `npx jest src/modules/enrolment/screens src/modules/admin` (181 passed).
- [x] **F-03** (D-04) — the user asked during this review (2026-10-25) to remove the icons from the footer CTAs. Today
  "Choose class" has the `chevron-forward` icon and "Enrol" the `person-add-outline` icon (`enrol-student.screen.tsx`,
  the two `Button`s in the footer), as D-04 says. Expected: amend D-04 (`/spec-plan --amend 060`) to drop both icons,
  then remove the `icon` prop from both buttons; each button shows its label only, with the same disabled and loading
  states.
  > ✅ 2026-10-25 — D-04 amended (see Amendments) and the `icon` prop removed from both footer `Button`s; file: `apps/mobile/src/modules/enrolment/screens/enrol-student.screen.tsx`; verified: `npx jest src/modules/enrolment/screens src/modules/admin` (181 passed), `tsc --noEmit` clean.

**Notes**

- Not exercised: the light theme (the app's own theme setting is dark; the colors come from tokens only) and the pt-BR
  locale on screen (asserted in the hook test). The trial-guest enrolment was not sent from the simulator; the screen
  tests cover it.
- After a class is un-picked by the filter, choosing "All" again shows it picked again (the id is kept). ER-02 only
  requires it not to count while hidden, so this is fine. If it should stay un-picked, `selectDiscipline` would need to
  clear `selectedClassId`.
- The keyboard of the trial fields covers the fixed footer until "Done" is pressed, the same as `edit-class`.
- `## Memory Impact` doesn't mention the Aula step's sport filter (D-07). `spec-finish` should add it to the
  `EnrolStudentScreen` bullet and the product paragraph.
- The success toast uses the alert style (red, "!"). This spec didn't change it (`alertMessage.show` is untouched); it
  is out of scope here.

### Round 2 — 2026-10-25 — changes-requested

**Checks**

- lint ✅ · type check ✅ · build ✅ (`npx turbo run lint check-types build --filter=@rochas-surf-school/mobile`, 12 tasks)
- related tests ✅ 874 passed, 45 suites (apps/mobile). The "not wrapped in act(...)" warnings in the enrol-student
  tests were already there at `base_commit`.
- coverage of the changed lines ✅ COVERAGE OK, 6 measured files at 100%; no coverage-ignore comments in the diff
- e2e: no suite applies (mobile only) · user journey driven in the iOS simulator (iPhone 18 Pro, en-US, dark theme) ✅

**Round 1 findings**

- F-01 ✅ — D-01 amended to the tan/`text-on-color` circle and `rounded-card` tabs; T-05's evidence lists the four
  commits; the simulator matches.
- F-02 ✅ — the `discipline-filter` imports come after `class-card-skeleton` in `enrol-student.screen.tsx`.
- F-03 ✅ — D-04 amended; neither footer `Button` has an `icon`; in the simulator "Choose class" and "Enrol" show
  their labels only.

**Expected Results**

- ER-01 ✅ — opens on "Who" with both tabs "Not chosen", "School student", the search and list, no intro or section
  labels, "Choose class" fixed and disabled; tapping the disabled "Class" tab did nothing; picking "Ana Souza" showed
  the check and the name and turned the button on. Trial mode, loading, empty, error/retry and load-more are covered
  by `enrol-student.screen.test.tsx`.
- ER-02 ✅ — "Choose class" showed the calendar, the empty state on a day without classes and the sport filter
  above the footer, with "Enrol" disabled; picking the Mon 26 08:00 class showed "Mon 26 · 08:00" with a check and
  turned "Enrol" on. The filter cases, the day change and the pt-BR/es-ES/en-US values are asserted in the screen
  and hook tests.
- ER-03 ✅ on device, ❌ in the tests (see F-04) — "Enrol" showed its spinner, the toast "Ana Souza enrolled ·
  student notified" showed and the screen went back.

**Findings**

- [ ] **F-04** (tests) (ER-03) — no test checks that "Enrol" shows its spinner while the enrolment is sent. If you
  delete `loading={screen.isSubmitting}` from the footer `Button` in `enrol-student.screen.tsx`, all 39 tests in
  `enrol-student.screen.test.tsx` still pass: the double-press tests only count the POSTs, and the hook's own
  `isSubmitting` guard already stops a second send. Reproduce: remove that prop and run
  `npx jest src/modules/enrolment/screens/enrol-student.screen.test.tsx` (from `apps/mobile`). Expected: while the
  POST is pending (the double-press tests already hold it open), assert that the "Enrol" label is gone, or that the
  footer button shows its `ActivityIndicator`, in both the student and the trial test. The test must fail when the
  prop is removed.
- [ ] **F-05** (convention) — `enrol-student.screen.hook.test.tsx` line 12 has `import i18n from "@/i18n"` after
  `@/modules/classes/classes.test-utils`. `.claude/rules/react.md` §2 sorts each import group alphabetically by
  path. Expected: `@/i18n` before `@/modules/classes/classes.test-utils`.

**Notes**

- D-03 names `formatIsoDate(…, "EEE d", …)`, but the code takes the first three letters of `"EEEE"` (recorded as a
  T-02 deviation: date-fns' pt-BR `"EEE"` gives "Quarta"). The output matches D-03 and ER-02 in all three locales, so
  this is not a finding. `spec-finish` may want to word the memory after the code.
- The class-value `it.each` in the hook test switches `i18n` to es-ES and leaves it there. It is the last block in
  the file and Jest isolates modules per file, so nothing breaks today. An `afterEach` that resets the language would
  keep a test added later from running in Spanish.
- `## Memory Impact` still doesn't mention the Aula step's sport filter (D-07), as round 1 noted.
- Not exercised: the light theme and pt-BR on screen, as in round 1.
