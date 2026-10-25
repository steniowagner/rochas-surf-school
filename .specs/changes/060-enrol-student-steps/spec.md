---
id: "060"
slug: enrol-student-steps
title: "Split \"Inscrever aluno\" into Quem and Aula steps"
template: quick
status: in-review
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
| D-01 | A new `StepTabs` component in `apps/mobile/src/components/ui/step-tabs/` (component, types, index; a hook only if it needs one). It is a sand pill (`bg-sand`, rounded, padded like `SegmentedControl`) holding one card per step, side by side, each a `TouchableOpacity` with `accessibilityRole="tab"` and `accessibilityState={{ selected, disabled }}`. The selected card is `bg-surface` with `shadowStyle("iconButton", theme)`. Each card shows a status circle — the step number on `bg-sand` in `text-ink-2` while the step isn't done, a white `checkmark` on `bg-ok` once it is — then a small uppercase label and, under it, a value line. A disabled card is dimmed and ignores presses. Props: the steps (`key`, `label`, `value`, `done`, `disabled`), the selected key and `onChange`. Colors, type and radii come from the tokens only. | The design's tab cards; `SegmentedControl` has no status, no value line and no disabled state, and stacking two identical pill switches would read as one control. |
| D-02 | The step is local state of `useEnrolStudentScreen` (`"who" \| "class"`, starting at `"who"`). The Quem step is done when the person is ready: a picked student in student mode, or a valid trial name and a valid WhatsApp number in trial mode — the same rule `submit` uses today. The Aula step is done when a class with a free seat is picked. The Quem tab can always be pressed; the Aula tab is disabled while the Quem step isn't done. Leaving a step keeps every selection (student, mode, trial fields, day, class). Back on the Quem step, if the admin changes the person so that the step is no longer done, the Aula tab and "Escolher aula" turn off. | Matches the requested gate ("disabled until the admin selects some student or trial student"); tapping a tab can't skip it. |
| D-03 | Tab copy: labels `enrolStudent.steps.who` — pt-BR "Quem", es-ES "Quién", en-US "Who" — and `enrolStudent.steps.class` — pt-BR "Aula", es-ES "Clase", en-US "Class"; the value line reads `enrolStudent.steps.pending` — pt-BR "Por escolher", es-ES "Por elegir", en-US "Not chosen" — until the step is done. When done, Quem shows the picked student's name, or the trimmed trial name; Aula shows the class's school day as the short weekday with its first letter capitalized and the day of the month, then " · " and the start time in the school's time zone (pt-BR "Qua 16 · 09:00"), built with `formatIsoDate(schoolDayOf(startsAt), "EEE d", locale)` and `schoolTimeOf(startsAt)`. The old `enrolStudent.whoStep` / `classStep` section labels are removed from the screen and from the three locales. | The design's tab content; the numbered section labels are replaced by the tabs. |
| D-04 | The button is the standard `Button` (`variant="primary"`) inside a footer fixed under the scroll (the `edit-class` pattern). On the Quem step it reads `enrolStudent.next` — pt-BR "Escolher aula", es-ES "Elegir clase", en-US "Choose class" — with an `Ionicons` `chevron-forward` icon, is disabled until the Quem step is done, and moves to the Aula step. On the Aula step it reads the existing `enrolStudent.submitEmpty` — pt-BR "Inscrever", es-ES "Inscribir", en-US "Enrol" — with an `Ionicons` `person-add-outline` icon, is disabled until `submit` is defined, shows the `loading` spinner while sending and calls `submit`. The `enrolStudent.submit` ("Inscrever {{name}}") key and `submitName` are removed. No summary line above the button. | The design's buttons, using the project's standard button (user's instruction); the name now lives in the Quem tab. |
| D-05 | The `ScreenIntro` (icon and description) is removed from the screen; the collapsing-title header keeps "Inscrever aluno" as its title. The top of the scroll is the `StepTabs`, then the current step's content. The `enrolStudent.description` key is removed from the three locales if nothing else uses it. | The design has no intro; the header already carries the title. |
| D-06 | Each step's content is reused as it is: on Quem the trial/student `SegmentedControl` then the search and student list (with its skeleton, "Nenhum aluno encontrado" empty state, load error with retry and the "load more" spinner) or the trial name, WhatsApp and note; on Aula the `WeekMonthCalendar` then the class cards (with their skeletons, "Sem aulas neste dia" empty state, load error with retry, and full classes dimmed and not pickable). Only the current step's content is rendered. Details of the screenshots that don't exist today (student subtitles such as "6 aulas · desde jul 2026", a day header with the class count) are not built. | "Reuse what we already have" and "keep the loading, empty and error states" (user's instructions). |

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
  skeletons show, a day without classes shows "Sem aulas neste dia", and a failed load shows the error with retry.
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
  button into the fixed footer with both labels, icons and states (D-04); in `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`
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

## Review
