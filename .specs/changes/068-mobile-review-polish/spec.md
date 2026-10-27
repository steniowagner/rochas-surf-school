---
id: "068"
slug: mobile-review-polish
title: Mobile polish left by earlier reviews
template: quick
status: in-progress
created: 2026-10-27
started: 2026-10-27
base_commit: 31fd0ebc54a9fc60d2726f79ff63e121e3b0f1d1
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

- [ ] **T-01** — Add the `tone` prop to `Toast` (`src/components/ui/toast/toast.types.ts`, `toast.component.tsx`) and the
  `options` argument to `show` in `src/providers/alert-message/` (types, provider and the stored content), per
  D-01 and D-02, with tests in `toast.component.test.tsx` and `alert-message.provider.test.tsx` for both tones,
  the default and replacing a toast of the other tone.
  Covers: ER-01 · Done when: `npx jest src/components/ui/toast src/providers/alert-message` passes.
- [ ] **T-02** — Pass `{ tone: "success" }` at the success calls of D-03 in `src/modules/classes`
  (`new-class.screen.hook.ts`, `location-form.screen.hook.ts`, `edit-class.screen.hook.ts`,
  `class-details.screen.hook.ts`), `src/modules/notices` (`send-notice.screen.hook.ts`),
  `src/modules/school-rules` (`school-rule-sheet.hook.ts`, `delete-school-rule-sheet.hook.ts`),
  `src/modules/cancellation-rules` (`cancellation-rules.screen.hook.ts`) and `src/modules/school-settings`
  (`school-settings-form.hook.ts`), updating their tests to assert the tone.
  Covers: ER-01 · Done when: `npx jest src/modules/classes src/modules/notices src/modules/school-rules
  src/modules/cancellation-rules src/modules/school-settings` passes.
- [ ] **T-03** — Pass `{ tone: "success" }` at the success calls of D-03 in `src/modules/enrolment`
  (`enrol-student.screen.hook.ts`, `use-class-requests-screen.hook.ts`, `use-take-out.hook.ts`,
  `use-take-guest-out.hook.ts`, `use-class-enrolment.hook.ts`), updating their tests to assert the tone.
  Covers: ER-01 · Done when: `npx jest src/modules/enrolment` passes.
- [ ] **T-04** — Replace `px-[22px]` with `px-screen` and `left-[22px] right-[22px]` with
  `left-screen right-screen` in the 14 files listed in Context.
  Covers: ER-02 · Done when: `grep -rnE '(px|left|right)-\[22px\]' apps/mobile/src` prints nothing and
  `npm test` (from `apps/mobile`) passes.
- [ ] **T-05** — Change `classTools.delete` in `src/i18n/messages/pt-BR.ts` to "Excluir aula" and update
  `class-tools-sheet.component.test.tsx`.
  Covers: ER-03 · Done when: `npx jest src/modules/classes/components/class-tools-sheet` passes.

### Verification

- [ ] **T-06** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0.

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
