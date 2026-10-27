---
id: "068"
slug: mobile-review-polish
title: Mobile polish left by earlier reviews
template: quick
status: accepted
created: 2026-10-27
started: 2026-10-27
base_commit: 31fd0ebc54a9fc60d2726f79ff63e121e3b0f1d1
reviewed_commit: 7859b824eeabf9db35b726ceb5e32ca9e5a0bf6d
fronts: [mobile]
depends_on: []
---

# 068 — Mobile polish left by earlier reviews

## Goal

Three fixes earlier reviews noted and left for later. Success toasts stop looking like errors, the screens with
a hard-coded 22px side margin use the design system's `spacing.screen` token, and the pt-BR wording for deleting
a class is the same on the button and on its confirmation.

## Context

- Requirements: none — the design-system rules in `CLAUDE.md` → Design system ("never hard-code … use the
  tokens") and the review notes of specs 002, 006, 041, 042 and 049.
- Existing code this changes:
  - `apps/mobile/src/components/ui/toast/` — `Toast` draws every message red (`bg-bad`) with the
    `alert-circle-outline` icon, so "Pedido enviado" or "… inscrito · aluno avisado" look like errors.
  - `apps/mobile/src/providers/alert-message/` — `AlertMessageProvider` and `useAlertMessage().show(message)`,
    used by every screen to show a toast.
  - 14 files hard-code `px-[22px]` or `left-[22px] right-[22px]` while `spacing.screen` is 20
    (`px-screen` in NativeWind): `components/ui/toast/toast.component.tsx`,
    `components/account-status/account-status.component.tsx`, and the components of `modules/auth`
    (`auth`, `confirm-code`, `create-account`, `email-choice`, `email-sign-in`, `google-name`),
    `modules/school-rules` (`school-rules-acceptance`), `modules/profile` (`edit-profile`, `profile-whatsapp`,
    `profile`), `modules/onboarding` (`whatsapp`) and `modules/pending` (`pending`).
  - `apps/mobile/src/i18n/messages/pt-BR.ts` — `classTools.delete` reads "Apagar aula" while `deleteClass.title`
    and `deleteClass.confirm` read "Excluir esta aula?" and "Excluir aula".
- Not in this spec, already done in the code: the "Inscrever aluno" screen has no description any more (the
  spec 045 note is obsolete since spec 060), and the backend already logs the sign-in code instead of sending it
  when `RESEND_API_KEY` is unset outside production (`apps/backend/src/modules/auth/resend.email.ts`).

## Decisions

| ID | Decision | Reason |
|---|---|---|
| D-01 | `useAlertMessage().show(message, options?)` takes `{ tone: "success" \| "error" }`; the default tone is `"error"`. `Toast` takes the same `tone` prop. | The ~48 error calls stay unchanged; only the success calls opt in. |
| D-02 | The success tone is `bg-ok` with `text-on-color` and the `checkmark-circle-outline` icon; the error tone keeps `bg-bad` and `alert-circle-outline`. `accessibilityRole="alert"` stays for both. | Same colors as the `success` variant of `Button`; tokens only, so both themes work. |
| D-03 | Success calls are the toasts shown after an action completed: `newClass.created`, `locationSheet.updated`, `archiveLocation.removed`, `editClass.saved`, `cancelClass.done`, `deleteClass.done`, `notices.sent`, `manageSchoolRules.toasts.{added,saved,deleted}`, `cancellationRules.screen.saved`, `schoolSettings.saved`, `enrolStudent.done` / `doneTrial`, the approve and deny toasts of class requests, `takeOutSheet.done` / `guestDone`, `enrolment.requestSheet.done` / `doneWaitingList`, `enrolment.withdrawSheet.done` / `doneWaitingList`, `enrolment.cancelSeatSheet.done`. Everything else, including `profile.comingSoon`, keeps the error tone. | "Coming soon." goes away when profile photos are built; the rest are errors or warnings. |
| D-04 | Only pt-BR changes for the delete wording: `classTools.delete` becomes "Excluir aula". | The app says "Excluir" everywhere else (classes, rules); es-ES ("Eliminar clase") and en-US ("Delete class") already match their confirmations. |

## Expected Results

### ER-01 — Success toasts look like success

- **Front:** mobile
- **Behavior:** Given an action that completes (for example an admin approves a class request), when its toast
  shows, then it has the `bg-ok` background and the `checkmark-circle-outline` icon; given an error (for example
  no connection), its toast keeps `bg-bad` and `alert-circle-outline`.
- **Edge and error cases:** `show(message)` without options shows the error tone; a success toast shown while
  an error toast is on screen replaces it with the success tone (and the reverse); every call listed in D-03
  passes `{ tone: "success" }`, and no other call does.
- **Verify by:** `npx jest src/components/ui/toast src/providers/alert-message` (from `apps/mobile`) and the
  hook and screen tests of the call sites in D-03, which assert `show` is called with `{ tone: "success" }`;
  in the iOS simulator, approving a class request as an admin shows a green toast.

### ER-02 — Screen side margins use the token

- **Front:** mobile
- **Behavior:** Given the 14 files listed in Context, when they render, then their side margin is
  `px-screen` (or `left-screen right-screen` for absolutely positioned views), 20px.
- **Edge and error cases:** no `px-[22px]`, `left-[22px]` or `right-[22px]` is left in `apps/mobile/src`; sizes
  such as `h-[22px]` or `w-[22px]` aren't side margins and stay.
- **Verify by:** `grep -rnE '(px|left|right)-\[22px\]' apps/mobile/src` prints nothing; the existing component
  tests of the changed files pass; in the iOS simulator the sign-in, pending and profile screens keep their
  layout.

### ER-03 — The delete wording matches in pt-BR

- **Front:** mobile
- **Behavior:** Given an admin in pt-BR on a class's tools sheet, when it renders, then the delete row reads
  "Excluir aula", the same words as the confirmation it opens ("Excluir esta aula?" / "Excluir aula").
- **Edge and error cases:** es-ES and en-US are unchanged ("Eliminar clase", "Delete class").
- **Verify by:** `npx jest src/modules/classes/components/class-tools-sheet` (from `apps/mobile`).

## Tasks

### Mobile (`apps/mobile`)

- [x] **T-01** — Add the `tone` prop to `Toast` (`src/components/ui/toast/toast.types.ts`, `toast.component.tsx`) and the
  `options` argument to `show` in `src/providers/alert-message/` (types, provider and the stored content), per
  D-01 and D-02, with tests in `toast.component.test.tsx` and `alert-message.provider.test.tsx` for both tones,
  the default and replacing a toast of the other tone.
  Covers: ER-01 · Done when: `npx jest src/components/ui/toast src/providers/alert-message` passes.
  > ✅ 2026-10-27 — added `tone` to `Toast` (class/icon map in the new `toast.constants.ts`, default `error`) and
  > `options?: { tone }` to `show`, stored in the content; `Toast` also got `left-screen right-screen` (the
  > T-04 change for that file, done here since the line was being rewritten); files:
  > `apps/mobile/src/components/ui/toast/toast.component.tsx`, `toast.constants.ts`, `toast.types.ts`,
  > `toast.component.test.tsx`, `apps/mobile/src/providers/alert-message/alert-message.types.ts`,
  > `alert-message.provider.tsx`, `alert-message.provider.test.tsx`; verified: `npx jest
  > src/components/ui/toast src/providers/alert-message` (9 passed), `npx tsc --noEmit` clean; deviations:
  > NativeWind compiles classes away in tests, so the toast test asserts the `toneStyles` map plus a different
  > rendered icon, and the provider test wraps `Toast` to expose the tone prop.
- [x] **T-02** — Pass `{ tone: "success" }` at the success calls of D-03 in `src/modules/classes`
  (`new-class.screen.hook.ts`, `location-form.screen.hook.ts`, `edit-class.screen.hook.ts`,
  `class-details.screen.hook.ts`), `src/modules/notices` (`send-notice.screen.hook.ts`),
  `src/modules/school-rules` (`school-rule-sheet.hook.ts`, `delete-school-rule-sheet.hook.ts`),
  `src/modules/cancellation-rules` (`cancellation-rules.screen.hook.ts`) and `src/modules/school-settings`
  (`school-settings-form.hook.ts`), updating their tests to assert the tone.
  Covers: ER-01 · Done when: `npx jest src/modules/classes src/modules/notices src/modules/school-rules
  src/modules/cancellation-rules src/modules/school-settings` passes.
  > ✅ 2026-10-27 — passed `{ tone: "success" }` at the D-03 calls of the nine listed hooks (the
  > `classDetails` enrolment toasts belong to T-03); asserted the tone in the screen/component tests;
  > files: `apps/mobile/src/modules/classes/screens/{new-class,edit-class,location-form,class-details}.screen.hook.ts`
  > and their `.screen.test.tsx`, `apps/mobile/src/modules/notices/screens/send-notice.screen.hook.ts`,
  > `.../send-notice.screen.test.tsx`, `apps/mobile/src/modules/school-rules/components/{school-rule-sheet,delete-school-rule-sheet}/*.hook.ts`
  > and the three tests asserting those toasts (`school-rule-sheet`, `delete-school-rule-sheet`,
  > `manage-school-rules.screen.test.tsx`), `.../cancellation-rules/screens/cancellation-rules.screen.hook.ts`
  > and test, `.../school-settings/components/school-settings-form/school-settings-form.hook.ts` and
  > `school-settings.screen.test.tsx`, new `apps/mobile/src/utils/toast-tone-probe.tsx`; verified: `npx jest
  > src/modules/{classes,notices,school-rules,cancellation-rules,school-settings}` (116 suites, 1278 passed),
  > `npx tsc --noEmit` clean; deviations: tests of screens using the real provider read the tone through a
  > small Toast probe, since NativeWind compiles classes away.
- [x] **T-03** — Pass `{ tone: "success" }` at the success calls of D-03 in `src/modules/enrolment`
  (`enrol-student.screen.hook.ts`, `use-class-requests-screen.hook.ts`, `use-take-out.hook.ts`,
  `use-take-guest-out.hook.ts`, `use-class-enrolment.hook.ts`), updating their tests to assert the tone.
  Covers: ER-01 · Done when: `npx jest src/modules/enrolment` passes.
  > ✅ 2026-10-27 — passed `{ tone: "success" }` at the D-03 enrolment calls (enrol student/trial,
  > approve/deny request, take out, take guest out, request/waiting list, withdraw, cancel seat); error calls
  > untouched; updated the assertions that check `show`; files:
  > `apps/mobile/src/modules/enrolment/screens/enrol-student.screen.hook.ts`,
  > `.../hooks/{use-class-requests-screen,use-take-out,use-take-guest-out,use-class-enrolment}.hook.ts`, tests
  > `.../screens/{enrol-student,class-requests}.screen.test.tsx`, `.../hooks/{use-take-out,use-take-guest-out}.hook.test.tsx`
  > and `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx` (which drives the
  > request/withdraw/cancel-seat/take-out sheets); verified: `npx jest src/modules/enrolment
  > src/modules/classes` (1379 passed), `npx tsc --noEmit` clean; deviations: none
- [x] **T-04** — Replace `px-[22px]` with `px-screen` and `left-[22px] right-[22px]` with
  `left-screen right-screen` in the 14 files listed in Context.
  Covers: ER-02 · Done when: `grep -rnE '(px|left|right)-\[22px\]' apps/mobile/src` prints nothing and
  `npm test` (from `apps/mobile`) passes.
  > ✅ 2026-10-27 — replaced `px-[22px]` with `px-screen` in 13 files (15 occurrences); the 14th file, `Toast`,
  > already got `left-screen right-screen` in T-01; files: `apps/mobile/src/components/account-status/account-status.component.tsx`,
  > `apps/mobile/src/modules/auth/components/{auth,confirm-code,email-choice,create-account,email-sign-in,google-name}/*.component.tsx`,
  > `.../school-rules/components/school-rules-acceptance/*.component.tsx`,
  > `.../profile/components/{edit-profile,profile-whatsapp,profile}/*.component.tsx`,
  > `.../onboarding/components/whatsapp/whatsapp.component.tsx`, `.../pending/components/pending/pending.component.tsx`;
  > verified: `grep -rnE '(px|left|right)-\[22px\]' apps/mobile/src` prints nothing, `npm test` in
  > `apps/mobile` (309 suites, 3357 passed); deviations: none
- [x] **T-05** — Change `classTools.delete` in `src/i18n/messages/pt-BR.ts` to "Excluir aula" and update
  `class-tools-sheet.component.test.tsx`.
  Covers: ER-03 · Done when: `npx jest src/modules/classes/components/class-tools-sheet` passes.
  > ✅ 2026-10-27 — `classTools.delete` is "Excluir aula" in pt-BR; es-ES and en-US untouched; files:
  > `apps/mobile/src/i18n/messages/pt-BR.ts`,
  > `apps/mobile/src/modules/classes/components/class-tools-sheet/class-tools-sheet.component.test.tsx`,
  > `.../class-tools-sheet.types.ts` (doc comment quoting the old wording); verified: `npx jest
  > src/modules/classes/components/class-tools-sheet` (12 passed); deviations: none

### Verification

- [x] **T-06** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0.
  > ✅ 2026-10-27 — `run-related-tests.mjs 068`: RELATED TESTS PASSED (116 suites, 1813 tests);
  > `check-coverage.mjs 068`: COVERAGE OK (every changed line covered); the `grep` for `22px` side margins prints
  > nothing; `npx turbo run lint check-types --filter=@rochas-surf-school/mobile`: 0 errors, 4 lint warnings
  > (`no-require-imports` in the test files that use `require`/`requireActual` inside `jest.mock`); not run:
  > the iOS-simulator journeys (green toast on approving a request, red offline, 20px margins on sign-in /
  > pending / profile) — for the reviewer or the user to run.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 068` — the related tests pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 068` — every line this spec adds or changes is covered.
  - `grep -rnE '(px|left|right)-\[22px\]' apps/mobile/src` — prints nothing (ER-02).
  - `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` — no errors.
- User journeys (iOS simulator): approve a class request as an admin and see a green toast, then turn the
  network off and see a red one (ER-01); the sign-in, pending and profile screens keep their layout with the
  20px margin (ER-02).

## Memory Impact

- `memory/technical-context.md` — Mobile shared UI: `useAlertMessage().show(message, { tone })`, the error
  tone by default and the success tone (`bg-ok`, check icon) for toasts after a completed action (D-01–D-03).

## Amendments

## Review

### Round 1 — 2026-10-27 — changes-requested

**Checks**

- lint ⚠️ 0 errors, 4 new warnings (see F-01) · type check ✅ (`npx turbo run lint check-types --filter=@rochas-surf-school/mobile`)
- related tests ✅ 116 suites, 1813 passed (apps/mobile)
- coverage of the changed lines ✅ `COVERAGE OK` (32 files); no coverage-ignore comments in the diff
- e2e: no suite applies (backend and web untouched) · mobile: ER-01 and ER-02 exercised in the iOS simulator (iPhone 18 Pro, pt-BR, admin)
- `grep -rnE '(px|left|right)-\[22px\]' apps/mobile/src` ✅ prints nothing

**Expected Results**

- ER-01 ✅ — approving Lia Prado's request on "Inscrições em aulas" shows a green toast with the check icon
  ("Lia Prado inscrito · aluno avisado"). Approving the same request after it was decided in the database
  shows a red toast with the alert icon ("Este pedido já foi decidido."). Every D-03 call passes
  `{ tone: "success" }` and no other `show` call does (checked all 70 calls in `src`). The tests assert the tone
  at each D-03 call, and the provider test covers the default tone and replacing a toast of the other tone.
  The first approve showed a red toast because the app still ran a bundle from before the branch; after a
  relaunch it was green.
- ER-02 ✅ (sign-in and pending not seen on device) — the grep is clean, and the component tests of the 14
  files pass. On device the profile cards and the toast sit 20pt from both edges. The sign-in and pending
  screens need a signed-out or pending account, so they weren't opened. The change there is the same class
  swap (`px-[22px]` → `px-screen`).
- ER-03 ✅ — `npx jest src/modules/classes/components/class-tools-sheet` passes. pt-BR reads "Excluir aula";
  es-ES ("Eliminar clase") and en-US ("Delete class") are unchanged.

**Findings**

- [x] **F-01** (convention) — the spec adds 4 `@typescript-eslint/no-require-imports` warnings to a mobile
  lint that was clean at `base_commit`: `alert-message.provider.test.tsx:14`,
  `cancellation-rules.screen.test.tsx:43`, `send-notice.screen.test.tsx:74`,
  `school-settings.screen.test.tsx:51`. The existing tests that `require` inside `jest.mock` silence the rule
  with a reasoned comment (`/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories can
  only load modules with require */`, e.g. `country-picker.component.test.tsx:10`).
  Reproduce: `npx turbo run lint --filter=@rochas-surf-school/mobile`. Expected: 0 warnings.
  > ✅ 2026-10-27 — the four `jest.mock("@/components/ui/toast", …)` factories now carry the reasoned
  > `eslint-disable @typescript-eslint/no-require-imports` comment used elsewhere; files:
  > `apps/mobile/src/providers/alert-message/alert-message.provider.test.tsx`,
  > `apps/mobile/src/modules/cancellation-rules/screens/cancellation-rules.screen.test.tsx`,
  > `apps/mobile/src/modules/notices/screens/send-notice.screen.test.tsx`,
  > `apps/mobile/src/modules/school-settings/screens/school-settings.screen.test.tsx`; verified: `npx eslint` on
  > those folders (0 warnings), `npx tsc --noEmit` clean; deviations: none
- [x] **F-02** (convention) — the test double `src/utils/toast-tone-probe.tsx` sits with production utilities
  under a source-file name. It calls `jest.requireActual` when it loads, so any import from app code would
  crash. Test helpers in the app are named `*.test-utils.ts(x)` next to what they serve
  (`classes.test-utils.tsx`, `header-inset.test-utils.ts`…). Also, `alert-message.provider.test.tsx` writes
  the same probe a second time, inline. Expected: one probe, e.g.
  > ✅ 2026-10-27 — moved the probe to `apps/mobile/src/components/ui/toast/toast.test-utils.tsx`
  > (`git mv` from `src/utils/toast-tone-probe.tsx`); the provider test's inline copy now uses it too, so all four
  > tests share one probe; verified: `npx jest` on the provider and the three screens (5 suites, 44 passed);
  > deviations: none
  `src/components/ui/toast/toast.test-utils.tsx`, used by the three screen tests and the provider test.

**Notes**

- `toast.component.test.tsx` checks the `toneStyles` map and that the rendered tree changes with the tone. It
  doesn't prove that `Toast` applies the background. Seeing it on device covers that, because NativeWind
  compiles the classes away in tests.
- Several changed lines run past the width of their neighbours (e.g. `use-take-out.hook.ts:34`,
  `class-requests.screen.test.tsx`). Lint doesn't check line width, so this is a note, not a finding.
- To make the on-device check, the reviewer approved the request once for real, which may have left a
  notification for Lia Prado. The enrolment is back to `pending` with `decided_at` null.
- For the next round, or for the user: sign out (or use a pending account) and check that the sign-in and
  pending screens keep their layout with the 20pt margin.

### Round 2 — 2026-10-27 — accepted

**Checks**

- lint ✅ 0 errors, 0 warnings · type check ✅ (`npx turbo run lint check-types --filter=@rochas-surf-school/mobile`)
- related tests ✅ 116 suites, 1813 passed (apps/mobile)
- coverage of the changed lines ✅ `COVERAGE OK` (32 files measured, 3 with no executable changed lines); no
  coverage-ignore comments in the diff
- e2e ✅ `E2E PASSED` — no suite applies (backend and web untouched)
- `grep -rnE '(px|left|right)-\[22px\]' apps/mobile/src` ✅ prints nothing

**Earlier findings**

- F-01 ✅ — the four `jest.mock("@/components/ui/toast", …)` factories carry the reasoned `eslint-disable`
  comment; mobile lint prints no warnings.
- F-02 ✅ — one probe, `src/components/ui/toast/toast.test-utils.tsx`, next to `Toast` and named like the other
  test helpers; the provider test and the three screen tests use it, the inline copy is gone, and nothing
  references `src/utils/toast-tone-probe` any more.

**Expected Results**

- ER-01 ✅ — every D-03 call passes `{ tone: "success" }` and no other `show` call does. The provider test
  covers the default tone and swapping between the tones, and the hook and screen tests assert the tone at
  each D-03 call. The on-device check is from round 1 (green toast on approving a request, red when the request
  was already decided). Since round 1 only test files and the spec changed (`git diff --stat 18e653f3..HEAD`),
  so that check still holds.
- ER-02 ✅ (pending not seen on device) — the grep is clean and the component tests of the 14 files pass. In
  the iOS simulator (iPhone 18 Pro, pt-BR), the profile, sign-in (welcome), e-mail choice and e-mail sign-in
  screens all sit 20pt from both edges. The pending screen needs a pending account, so it wasn't opened; the
  user accepted that. Its change is the same `px-[22px]` → `px-screen` swap.
- ER-03 ✅ — the `class-tools-sheet` tests pass (in the related run). pt-BR `classTools.delete` reads
  "Excluir aula", like `deleteClass.confirm`; es-ES and en-US are unchanged.

**Findings**

None.

**Notes**

- To check the sign-in screens, the reviewer signed Dev Admin out of the simulator, with the user's OK. The
  simulator is left on the e-mail sign-in screen, so sign back in to go on.
- The round 1 note on line width still applies (e.g. `use-take-out.hook.ts:34`, `use-take-guest-out.hook.ts:34`);
  lint doesn't check it.
