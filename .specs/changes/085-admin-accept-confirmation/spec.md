---
id: "085"
slug: admin-accept-confirmation
title: Confirm the accept actions of the admin tools
status: in-progress
created: 2026-11-04
started: 2026-11-04
base_commit: 6c4bf5c7268944c8cb92526b2428c6be1004aaf4
fronts: [app-messages, mobile, web, designs]
depends_on: []
---

# 085 — Confirm the accept actions of the admin tools

## Goal

Four admin tools send their "accept" decision the moment the button is tapped: **Approve** in "Join the school",
**Reactivate** in "Reactivate accounts", **Enrol** in "Class enrolments" and **Restore** in "Removed accounts". A
mistaken tap can't be undone in the app, and the person is notified at once. After this spec each of those buttons
first opens a bottom sheet worded for its tool, naming the person, and nothing is sent until the admin confirms —
the same pattern as the Profile's "Sign out" and "Remove account" sheets. The admin app design page,
`.docs/designs/admin-app.html` and the admin user journeys show the new step.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: registrations, reactivation requests, removed
  accounts and enrolment requests, decided by admins; a decision is final in the app.
- Requirements: [requirements.md → Admins decide registrations](../../../.docs/requirements.md#admins-decide-registrations),
  [requirements.md → Admins decide reactivation requests](../../../.docs/requirements.md#admins-decide-reactivation-requests),
  [requirements.md → Restoring a removed account](../../../.docs/requirements.md#restoring-a-removed-account) and
  [requirements.md → Approving a request](../../../.docs/requirements.md#approving-a-request) — what each accept
  decision does. This spec doesn't change what they do; it adds a confirmation before them.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Applications (mobile:
  `BottomModal`, the shared `src/components/decision/` pieces `DecisionCard` and `DenySheet`; web: the design pages
  and the user journeys), Automated validation.
- Design: `.docs/designs/admin-app.html` (a source document) is generated from the web page
  `/pt-br/designs/admin-app` by `node .docs/designs/scripts/build-design.mjs admin-app` (build the web and run
  `next start -p 3100` first); its sources are never edited by hand.
- Existing code this builds on:
  - `apps/mobile/src/modules/profile/components/sign-out-sheet/` and `delete-account-sheet/` — the pattern to follow:
    `BottomModal`, a `ds-text-sheet-title` title, a `ds-text-body text-ink-2` description, the confirm `Button` with
    an icon and a `ghost` "Cancel"; the delete sheet keeps the confirm button `loading` while it sends and closes on
    success.
  - `apps/mobile/src/components/decision/decision-card/` — the card with Deny (`outline`, Feather `x`) and Approve
    (`success`, Feather `check`); `apps/mobile/src/components/decision/deny-sheet/` — the reason sheet every Deny
    opens.
  - `apps/mobile/src/modules/admin/hooks/use-registrations-screen.hook.ts` and `use-reactivations-screen.hook.ts`,
    `apps/mobile/src/modules/enrolment/hooks/use-class-requests-screen.hook.ts` — `approve(item)` calls `decide(…)`
    at once; `decide` guards a second send with `inFlight`, closes the deny sheet on success and on the "already
    decided" errors (`isAlreadyDecided`, `shouldReloadRequests`), and shows the error alert.
  - `apps/mobile/src/modules/people/hooks/use-removed-accounts-screen.hook.ts` — `restore(account)` acts at once
    ("with no confirmation and no success toast", spec 066), one restore at a time; stale errors
    (`isStaleRestoreError`) reload the list.
  - `apps/web/src/modules/designs/components/sign-out-sheet/`, `deny-sheet/` — the web mocks of those sheets;
    `screens/admin/{registrations,reactivations,class-requests,removed-accounts}-screen/` — the screen mocks, each
    with a `state` prop; `components/admin-app-accounts/` (section 07) and `components/admin-app-class-requests/`
    (section 06) — the frames; `data/admin-app-ids.ts` — every frame id; `src/i18n/dictionaries/{en,pt-br,es}.ts` —
    each frame's title and note.
  - `apps/web/src/modules/user-journeys/data/user-journey-flows.ts` and `i18n/{en,pt-br,es}.ts` — the admin rows
    AD-02 (approve a registration), AD-04 (decide a reactivation), AD-05 (remove and restore) and AD-17 (approve a
    class request).

## Scope

### In scope

- A shared confirmation sheet in the mobile app and its use on the four accept actions.
- The sheets' copy in en-US, es-ES and pt-BR.
- The web design mocks of the four sheets, as four new frames of the admin app design page, and the regenerated
  `admin-app.html`.
- The admin user journeys AD-02, AD-04, AD-05 and AD-17, so their steps include the confirmation.

### Out of scope

- The Deny buttons: they keep opening their reason sheet, with no extra confirmation (D-02).
- The "Create class" and "Enrol a student" tools, and every other action of the app (People, class details, the
  take-out sheet…).
- Any backend or API change.
- New user-journey rows: the existing rows are updated, the admin flow keeps its 33 rows.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | One shared `ConfirmSheet` in `apps/mobile/src/components/decision/confirm-sheet/` (component, hook only if it holds logic, types, index), next to `DenySheet`, with generic props: `visible`, `title`, `description`, `confirmLabel`, `confirmIcon`, `confirmVariant`, `cancelLabel`, `loading`, `onConfirm`, `onClose`. It draws like `SignOutSheet`: `BottomModal`, title (`ds-text-sheet-title text-ink`), description (`ds-text-body text-ink-2`), the confirm `Button`, then a `ghost` cancel `Button`. Each screen passes its own copy. | The user asked for the sign-out / remove-account pattern with copy per tool; one component keeps the four sheets identical, as `DenySheet` does for denials. |
| D-02 | Deny keeps its reason sheet and gets no second confirmation. | Its "Deny and notify" button already confirms; a second sheet would ask twice. Confirmed by the user. |
| D-03 | Restore asks for confirmation too, reversing spec 066's "acts at once, with no confirmation". | The user asked for every tool except "Create class" and "Enrol a student"; Restore is the only decision of "Removed accounts". |
| D-04 | The sheet stays open while the decision is sent, its confirm button `loading` and the card's buttons disabled as today. It closes on success and on the errors that already close the deny sheet or reload the list (registrations and reactivations: already decided; class requests: `shouldReloadRequests`; restore: `isStaleRestoreError`), showing the alert. On any other failure it shows the alert and stays open. | Mirrors the remove-account sheet and the deny sheet; closing before sending (as sign-out does) would hide a failure. |
| D-05 | Confirm buttons: Approve, Reactivate and Enrol use the `success` variant with a Feather `check`, like the card's Approve; Restore uses the default (primary) variant with an Ionicons `refresh-outline`. The label is the tool's existing action word. | The sheet repeats the action the admin tapped; one primary action per sheet (design system section 08). |
| D-06 | The sheet opens only from an enabled accept button: Enrol on a full class stays disabled (`approveDisabled`), and a card being sent (or, on "Removed accounts", any row while a restore runs) can't open one. Opening a sheet records the item; closing it (Cancel, swipe, backdrop) clears it and sends nothing. | Keeps every existing guard; the sheet adds a step, not a new path. |
| D-07 | The four new design frames get new ids at the end of their sections: `AD-06-10` (Class enrolments — enrol sheet), `AD-07-16` (Join the school — approve sheet), `AD-07-17` (Reactivate — confirm sheet), `AD-07-18` (Removed accounts — restore sheet), shown with the first mock person of each screen. | Existing ids, and the links to them from the user journeys, stay stable. |
| D-08 | The user journeys AD-02, AD-04, AD-05 and AD-17 are updated in en, pt-br and es: the steps confirm in the sheet, the expected text says the sheet names the person and the card leaves after confirming, and each row links its new frame. | Their steps say the card goes "at once"; a tester following them would fail the row. |

### Copy

Keys and texts, in the order title · description · confirm · cancel. `{{name}}` is the person's (or student's)
name.

| Key | en-US | pt-BR | es-ES |
| --- | --- | --- | --- |
| `registrations.approveSheet` | "Approve entry?" · "{{name}} joins the school and can book classes. The person gets a push notification." · "Approve" · "Cancel" | "Aprovar entrada?" · "{{name}} entra na escola e já pode reservar aulas. A pessoa recebe uma notificação push." · "Aprovar" · "Cancelar" | "¿Aprobar la entrada?" · "{{name}} entra en la escuela y ya puede reservar clases. La persona recibe una notificación push." · "Aprobar" · "Cancelar" |
| `reactivations.approveSheet` | "Reactivate account?" · "{{name}}'s account comes back with its history and role, but not the cancelled seats. The person gets a push notification." · "Reactivate" · "Cancel" | "Reativar conta?" · "A conta de {{name}} volta com o histórico e o papel, mas sem as vagas canceladas. A pessoa recebe uma notificação push." · "Reativar" · "Cancelar" | "¿Reactivar la cuenta?" · "La cuenta de {{name}} vuelve con su historial y su rol, pero sin las plazas canceladas. La persona recibe una notificación push." · "Reactivar" · "Cancelar" |
| `classRequests.approveSheet` | "Enrol in this class?" · "{{name}} takes a seat in this class and gets a notification." · "Enrol" · "Cancel" | "Inscrever nesta aula?" · "{{name}} fica com uma vaga nesta aula e recebe uma notificação." · "Inscrever" · "Cancelar" | "¿Inscribir en esta clase?" · "{{name}} ocupa una plaza en esta clase y recibe una notificación." · "Inscribir" · "Cancelar" |
| `removedAccounts.restoreSheet` | "Restore account?" · "{{name}} comes back with the same details and role, and gets a push notification." · "Restore" · "Cancel" | "Restaurar conta?" · "{{name}} volta com os mesmos dados e o mesmo papel, e recebe uma notificação push." · "Restaurar" · "Cancelar" | "¿Restaurar la cuenta?" · "{{name}} vuelve con los mismos datos y el mismo rol, y recibe una notificación push." · "Restaurar" · "Cancelar" |

Each block has the keys `title`, `description`, `confirm` and `cancel`.

## Expected Results

### ER-01 — An accept button opens its confirmation sheet and sends nothing

- **Front:** mobile
- **Behavior:** Given an admin on one of the four tools with an item listed, when they tap its accept button
  ("Approve" on "Join the school", "Reactivate" on "Reactivate accounts", "Enrol" on "Class enrolments", "Restore" on
  "Removed accounts"), then a bottom sheet opens with that tool's title ("Approve entry?", "Reactivate account?",
  "Enrol in this class?", "Restore account?"), its description with the item's person name, the confirm button and
  "Cancel", and no request is sent.
- **Edge and error cases:** "Deny" still opens the reason sheet ("Deny entry?", "Deny reactivation?", "Deny
  enrolment?") and not the new one; "Enrol" on a full class stays disabled and opens nothing; a card that is being
  sent, or any "Removed accounts" row while a restore runs, opens nothing; the sheet names the person of the card
  tapped, not another one.
- **Verify by:** from `apps/mobile`, `npx jest src/components/decision/confirm-sheet src/modules/admin/screens/registrations.screen.test.tsx src/modules/admin/screens/reactivations.screen.test.tsx src/modules/enrolment/screens/class-requests.screen.test.tsx src/modules/people/screens/removed-accounts.screen.test.tsx -t "confirmation sheet"` — each screen's tests open the sheet, check its texts and that `fetch` received no decision request; the user journey in the Verification Plan.

### ER-02 — Closing the sheet sends nothing

- **Front:** mobile
- **Behavior:** Given an accept confirmation sheet open on any of the four tools, when the admin taps "Cancel",
  swipes it down or taps the backdrop, then the sheet closes, no request is sent and the card stays in the list.
- **Edge and error cases:** tapping the accept button again opens the sheet again; after cancelling, the card's
  "Deny" still works.
- **Verify by:** the same command as ER-01 with `-t "cancel"` — each screen's test presses "Cancel" and checks no
  decision request was sent and the card is still shown; `confirm-sheet.component.test.tsx` checks `onClose` is
  called and `onConfirm` is not.

### ER-03 — Confirming sends the decision

- **Front:** mobile
- **Behavior:** Given an accept confirmation sheet open, when the admin taps its confirm button, then the decision
  request is sent once (`POST` approve for a registration, a reactivation or a class request, restore for a removed
  account), the confirm button shows its loading state while it runs, and on success the sheet closes and the card
  leaves the list ("Enrol" also shows its success alert "{{name}} enrolled · student notified").
- **Edge and error cases:** a second tap while it sends sends nothing more; an "already decided" / stale answer
  (registration or reactivation already decided, class request not pending, class started or full, account not
  removed or its restore window ended) shows the tool's existing alert, closes the sheet and refreshes the list; any
  other failure (e.g. a 500 or no connection) shows the existing alert, if any, and leaves the sheet open with the
  confirm button enabled again.
- **Verify by:** from `apps/mobile`, `npx jest src/modules/admin/hooks/use-registrations-screen.hook.test.tsx src/modules/admin/hooks/use-reactivations-screen.hook.test.tsx src/modules/enrolment/hooks/use-class-requests-screen.hook.test.tsx src/modules/admin/screens src/modules/enrolment/screens/class-requests.screen.test.tsx src/modules/people/screens/removed-accounts.screen.test.tsx -t "confirm"` — success, stale error and other failure per tool; the user journey in the Verification Plan.

### ER-04 — The admin app design shows the four sheets

- **Front:** web
- **Behavior:** Given the admin app design page `/{lang}/designs/admin-app`, when it renders in `pt-br`, `en` or
  `es`, then section 06 ends with the entry `AD-06-10` and section 07 ends with `AD-07-16`, `AD-07-17` and `AD-07-18`,
  each drawing its tool's list under the confirmation sheet with the texts of the Copy table for the first mock person, in
  light and dark, with a translated title and note; and `.docs/designs/admin-app.html` is regenerated from it.
- **Edge and error cases:** every existing entry keeps its id and its content; `node .docs/designs/scripts/pack.mjs
  --check` exits 0 (the `.html` matches its sources); `npm run check-types` of the web fails if an id lacks its title
  or note in a language.
- **Verify by:** from `apps/web`, `npx vitest run src/modules/designs/components/confirm-sheet src/modules/designs/screens/admin src/modules/designs/components/admin-app-accounts src/modules/designs/components/admin-app-class-requests`; from the repo root, `node .docs/designs/scripts/pack.mjs --check` and `node .specs/scripts/run-e2e.mjs 085` (the web suite, which loads the design pages).

### ER-05 — The admin user journeys include the confirmation

- **Front:** web
- **Behavior:** Given the admin user journeys page `/{lang}/user-journeys/admin`, when it renders in `en`, `pt-br`
  or `es`, then rows AD-02, AD-04, AD-05 and AD-17 tell the tester to confirm in the sheet after tapping
  "Approve" / "Reactivate" / "Restore" / "Enrol" (quoted in that language's app labels), their expected text says
  the sheet names the person and the card leaves after confirming, and each row links its new frame (`AD-07-16`,
  `AD-07-17`, `AD-07-18`, `AD-06-10`).
- **Edge and error cases:** the admin flow still has 33 rows; no other row changes; every linked design id exists.
- **Verify by:** from `apps/web`, `npx vitest run src/modules/user-journeys` (`user-journey-flows.test.ts` checks
  the four rows' `designIds`, `user-journey-texts.test.ts` the texts in the three languages); `node .specs/scripts/run-e2e.mjs 085` (`user-journeys.e2e.ts` keeps the 33 rows).

## Tasks

### App messages (`packages/app-messages`)

- [x] **T-01** — Add `registrations.approveSheet`, `reactivations.approveSheet`, `classRequests.approveSheet` and
  `removedAccounts.restoreSheet` (`title`, `description`, `confirm`, `cancel`) with the texts of the Copy table to
  `src/en-US.ts`, `src/pt-BR.ts` and `src/es-ES.ts`, then build the package.
  Covers: enabling · Done when: `npm run build -w @rochas-surf-school/app-messages` and
  `npx turbo run check-types --filter=@rochas-surf-school/app-messages` exit 0.
  > ✅ 2026-11-04 12:18 — added `approveSheet` to `reactivations`, `registrations` and `classRequests` and
  > `restoreSheet` to `removedAccounts` (`title`, `description`, `confirm`, `cancel`, the Copy table texts) in the
  > three locales; files: `packages/app-messages/src/en-US.ts`, `packages/app-messages/src/pt-BR.ts`,
  > `packages/app-messages/src/es-ES.ts`; verified: `npm run build -w @rochas-surf-school/app-messages` (tsc, exit
  > 0), `npx turbo run check-types --filter=@rochas-surf-school/app-messages` (1 successful); deviations: none
  > (`dist/` is gitignored, rebuilt locally).

### Mobile (`apps/mobile`)

- [x] **T-02** — Create `ConfirmSheet` in `src/components/decision/confirm-sheet/`
  (`confirm-sheet.component.tsx`, `confirm-sheet.types.ts`, `index.ts`, per `.claude/rules/react.md`) as D-01
  describes, with `confirm-sheet.component.test.tsx`: it shows title, description and both buttons; confirm calls
  `onConfirm`; "Cancel" calls `onClose` and not `onConfirm`; `loading` shows the button's loading state and ignores
  presses. Load the `vercel-react-native-skills` and `vercel-react-best-practices` skills first.
  Covers: ER-01, ER-02, ER-03 · Done when: `npx jest src/components/decision/confirm-sheet` passes (from
  `apps/mobile`).
  > ✅ 2026-11-04 12:19 — created `ConfirmSheet` (D-01: `BottomModal`, `ds-text-sheet-title` title, `ds-text-body
  > text-ink-2` description, the confirm `Button` with `confirmIcon`, `confirmVariant` (default primary) and
  > `loading`, then a `ghost` cancel); no hook, since it holds no state or logic; files:
  > `apps/mobile/src/components/decision/confirm-sheet/confirm-sheet.component.tsx`,
  > `apps/mobile/src/components/decision/confirm-sheet/confirm-sheet.types.ts`,
  > `apps/mobile/src/components/decision/confirm-sheet/index.ts`,
  > `apps/mobile/src/components/decision/confirm-sheet/confirm-sheet.component.test.tsx`; verified: `npx jest
  > src/components/decision/confirm-sheet` (5 passed, the component 100% covered); deviations: none.

- [x] **T-03** — "Join the school": in `src/modules/admin/hooks/use-registrations-screen.hook.ts` (and its
  `.types.ts`) add `approving` (the registration whose sheet is open), `openApprove`, `closeApprove` and
  `confirmApprove` — `confirmApprove` runs `decide(…, "approve", …)` and the sheet closes as D-04 says; the card's
  `onApprove` opens the sheet; render `ConfirmSheet` with `registrations.approveSheet` in
  `src/modules/admin/screens/registrations.screen.tsx`. Update `use-registrations-screen.hook.test.tsx` and
  `registrations.screen.test.tsx` for ER-01–ER-03, naming the tests so ER-01–ER-03's `-t` filters select them
  ("confirmation sheet", "cancel", "confirm").
  Covers: ER-01, ER-02, ER-03 · Done when: `npx jest src/modules/admin/hooks/use-registrations-screen.hook.test.tsx
  src/modules/admin/screens/registrations.screen.test.tsx` passes (from `apps/mobile`).
  > ✅ 2026-11-04 12:23 — "Approve" on "Join the school" now opens `ConfirmSheet` (`registrations.approveSheet`,
  > `success`, Feather `check`); the hook gained `approving`, `openApprove` (ignored while that card is in flight),
  > `closeApprove` and `confirmApprove` in place of `approve`, and a decision closes both sheets of its card on
  > success and on "already decided" (`closeSheetsOf`, was `closeDenyOf`), keeping the approve sheet open on other
  > failures; files: `apps/mobile/src/modules/admin/hooks/use-registrations-screen.hook.ts`,
  > `apps/mobile/src/modules/admin/hooks/use-registrations-screen.types.ts`,
  > `apps/mobile/src/modules/admin/screens/registrations.screen.tsx`,
  > `apps/mobile/src/modules/admin/hooks/use-registrations-screen.hook.test.tsx`,
  > `apps/mobile/src/modules/admin/screens/registrations.screen.test.tsx`; verified: `npx jest
  > src/modules/admin/hooks/use-registrations-screen.hook.test.tsx
  > src/modules/admin/screens/registrations.screen.test.tsx` (38 passed; hook and screen 100% covered; `-t
  > "confirmation sheet"` selects 14, `-t "cancel"` 3, `-t "confirm"` 17), `tsc --noEmit` and `eslint` clean;
  > deviations: the hook no longer returns `approve` (only the sheet sends an approval), so the existing approve
  > tests now go through the sheet.
  > ✅ 2026-11-04 — fix found by the Verification Plan: `admin.screen.test.tsx` ("shows one less waiting after a
  > decision") pressed the card's "Approve" only; it now confirms in the sheet too (commit `fix(spec-085): … (T-03)`);
  > file: `apps/mobile/src/modules/admin/screens/admin.screen.test.tsx`; verified: `npx jest
  > src/modules/admin/screens/admin.screen.test.tsx` (30 passed).

- [x] **T-04** — "Reactivate accounts": the same change in `src/modules/admin/hooks/use-reactivations-screen.hook.ts`
  (and `.types.ts`) and `src/modules/admin/screens/reactivations.screen.tsx`, with `reactivations.approveSheet`;
  update `use-reactivations-screen.hook.test.tsx` and `reactivations.screen.test.tsx` for ER-01–ER-03, with the
  test names of T-03.
  Covers: ER-01, ER-02, ER-03 · Done when: `npx jest src/modules/admin/hooks/use-reactivations-screen.hook.test.tsx
  src/modules/admin/screens/reactivations.screen.test.tsx` passes.
  > ✅ 2026-11-04 12:25 — "Reactivate" on "Reactivate accounts" now opens `ConfirmSheet`
  > (`reactivations.approveSheet`, `success`, Feather `check`), with the same hook change as T-03 (`approving`,
  > `openApprove`, `closeApprove`, `confirmApprove` in place of `approve`; `closeSheetsOf` on success and on
  > `isReactivationAlreadyDecided`); files: `apps/mobile/src/modules/admin/hooks/use-reactivations-screen.hook.ts`,
  > `apps/mobile/src/modules/admin/hooks/use-reactivations-screen.types.ts`,
  > `apps/mobile/src/modules/admin/screens/reactivations.screen.tsx`,
  > `apps/mobile/src/modules/admin/hooks/use-reactivations-screen.hook.test.tsx`,
  > `apps/mobile/src/modules/admin/screens/reactivations.screen.test.tsx`; verified: `npx jest
  > src/modules/admin/hooks/use-reactivations-screen.hook.test.tsx
  > src/modules/admin/screens/reactivations.screen.test.tsx` (32 passed; hook and screen 100% covered; `-t
  > "confirmation sheet"` 14, `-t "cancel"` 3, `-t "confirm"` 17), `tsc --noEmit` and `eslint src/modules/admin`
  > clean; deviations: as T-03, the hook no longer returns `approve`.

- [x] **T-05** — "Class enrolments": the same change in
  `src/modules/enrolment/hooks/use-class-requests-screen.hook.ts` (and `.types.ts`) and
  `src/modules/enrolment/screens/class-requests.screen.tsx` (the `ClassRequestsGroup` `onApprove` now opens the
  sheet; `approveDisabled` stays), with `classRequests.approveSheet`; the success alert stays. Update
  `use-class-requests-screen.hook.test.tsx` and `class-requests.screen.test.tsx` for ER-01–ER-03, with the test
  names of T-03, including the full class that opens nothing.
  Covers: ER-01, ER-02, ER-03 · Done when: `npx jest src/modules/enrolment/hooks/use-class-requests-screen.hook.test.tsx
  src/modules/enrolment/screens/class-requests.screen.test.tsx` passes.
  > ✅ 2026-11-04 12:28 — "Enrol" on "Class enrolments" now opens `ConfirmSheet` (`classRequests.approveSheet` with
  > the student name, `success`, Feather `check`); the hook gained `approving`, `openApprove`, `closeApprove`,
  > `confirmApprove` in place of `approve`, `closeSheetsOf` closes both sheets on success and on
  > `shouldReloadRequests`; the success alert and `approveDisabled` stay (a full class opens nothing); files:
  > `apps/mobile/src/modules/enrolment/hooks/use-class-requests-screen.hook.ts`,
  > `apps/mobile/src/modules/enrolment/screens/class-requests.screen.tsx`,
  > `apps/mobile/src/modules/enrolment/hooks/use-class-requests-screen.hook.test.tsx`,
  > `apps/mobile/src/modules/enrolment/screens/class-requests.screen.test.tsx`; verified: `npx jest
  > src/modules/enrolment/hooks/use-class-requests-screen.hook.test.tsx
  > src/modules/enrolment/screens/class-requests.screen.test.tsx` (31 passed; screen 100%, every changed hook line
  > covered — the one uncovered line, `closeStudent`, predates the spec; `-t "confirmation sheet"` 10, `-t "cancel"`
  > 3, `-t "confirm"` 18), `tsc --noEmit` and `eslint src/modules/enrolment` clean; deviations:
  > `use-class-requests-screen.types.ts` is unchanged, since it only holds the status type and the hook return type
  > is inferred.

- [x] **T-06** — "Removed accounts": in `src/modules/people/hooks/use-removed-accounts-screen.hook.ts` (and
  `.types.ts`) add `restoreCandidate`, `openRestore`, `closeRestore` and `confirmRestore`; `restore` runs from the
  sheet and the sheet closes as D-04 says; replace the "with no confirmation" comment. The row's `onRestore` opens
  the sheet; render `ConfirmSheet` with `removedAccounts.restoreSheet` in
  `src/modules/people/screens/removed-accounts.screen.tsx`. Update `removed-accounts.screen.test.tsx` for
  ER-01–ER-03, with the test names of T-03.
  Covers: ER-01, ER-02, ER-03 · Done when: `npx jest src/modules/people/screens/removed-accounts.screen.test.tsx`
  passes.
  > ✅ 2026-11-04 12:39 — a row's "Restore" on "Removed accounts" now opens `ConfirmSheet`
  > (`removedAccounts.restoreSheet`, default primary variant, Ionicons `refresh-outline`); the hook gained
  > `restoreCandidate`, `openRestore` (ignored while a restore runs), `closeRestore` and `confirmRestore` in place
  > of `restore`, which now runs from the sheet and clears the candidate on success and on `isStaleRestoreError`;
  > the "with no confirmation" comment was replaced; the sheet is rendered outside the ready/other ternary, so it
  > stays mounted when the last account leaves the list; files:
  > `apps/mobile/src/modules/people/hooks/use-removed-accounts-screen.hook.ts`,
  > `apps/mobile/src/modules/people/hooks/use-removed-accounts-screen.types.ts`,
  > `apps/mobile/src/modules/people/screens/removed-accounts.screen.tsx`,
  > `apps/mobile/src/modules/people/screens/removed-accounts.screen.test.tsx`,
  > `apps/mobile/src/modules/people/hooks/use-removed-accounts-screen.hook.test.tsx` (new); verified: `npx jest
  > src/modules/people/screens/removed-accounts.screen.test.tsx
  > src/modules/people/hooks/use-removed-accounts-screen.hook.test.tsx` (18 passed; screen 100%, every changed hook
  > line covered — the one uncovered branch, the session-expired load status, predates the spec; `-t "confirmation
  > sheet"` 4, `-t "cancel"` 1, `-t "confirm"` 10), `tsc --noEmit` and `eslint src/modules/people` clean;
  > deviations: added `use-removed-accounts-screen.hook.test.tsx` (not named by the task) to cover the
  > double-confirm and open-while-restoring guards; the screen test file already kept Jest from exiting after its
  > run before this spec (it passes; `--forceExit` ends it), noted as a follow-up.

### Web (`apps/web`)

- [x] **T-07** — Create the mock `ConfirmSheet` in `src/modules/designs/components/confirm-sheet/` (like
  `sign-out-sheet/`: `BottomModal`, title, description, the confirm `Button` with its `AppIcon`, a `ghost` cancel),
  taking its texts, icon and variant as props, with `confirm-sheet.component.test.tsx`.
  Covers: ER-04 · Done when: `npx vitest run src/modules/designs/components/confirm-sheet` passes (from `apps/web`).
  > ✅ 2026-11-04 12:40 — created the mock `ConfirmSheet` (like `sign-out-sheet/`: `BottomModal`, title, description,
  > the confirm `Button` with `confirmIcon`, `confirmVariant` (default primary) and an optional `loading`, then a
  > `ghost` cancel), with the same prop names as the mobile one; files:
  > `apps/web/src/modules/designs/components/confirm-sheet/confirm-sheet.component.tsx`,
  > `apps/web/src/modules/designs/components/confirm-sheet/confirm-sheet.types.ts`,
  > `apps/web/src/modules/designs/components/confirm-sheet/index.ts`,
  > `apps/web/src/modules/designs/components/confirm-sheet/confirm-sheet.component.test.tsx`; verified: `npx vitest
  > run src/modules/designs/components/confirm-sheet` (2 passed), `eslint` clean; deviations: the icon is a
  > `ReactNode` (`confirmIcon`), as on mobile, rather than an icon name.

- [x] **T-08** — Add the state `approveSheet` to the `registrations-screen`, `reactivations-screen` and
  `class-requests-screen` mocks and `restoreSheet` to `removed-accounts-screen` (in `src/modules/designs/screens/admin/`,
  each drawing `ConfirmSheet` over its list for the first mock person, with the app's copy through `appT`); add the
  frames `AD-06-10` to `components/admin-app-class-requests` and `AD-07-16`–`AD-07-18` to `components/admin-app-accounts`,
  the ids to `data/admin-app-ids.ts`, and each entry's `title` and `note` to `src/i18n/dictionaries/{en,pt-br,es}.ts`.
  Update the screens' and sections' tests.
  Covers: ER-04 · Done when: `npx vitest run src/modules/designs` passes and `npx turbo run check-types
  --filter=@rochas-surf-school/web` exits 0.
  > ✅ 2026-11-04 12:43 — added the states `approveSheet` to the registrations, reactivations and class-requests
  > screen mocks and `restoreSheet` to the removed-accounts one, each drawing `ConfirmSheet` over its list for the
  > first mock person (Renata Coelho, Fernanda Rocha, Gabriel Moura, Sérgio Matos) with the app copy through `appT`;
  > frames `AD-06-10` (end of section 06) and `AD-07-16`–`AD-07-18` (end of section 07), their ids in
  > `admin-app-ids.ts` (116 ids) and each entry's title and note in the three dictionaries; files:
  > `apps/web/src/modules/designs/screens/admin/registrations-screen/registrations-screen.component.tsx`,
  > `apps/web/src/modules/designs/screens/admin/registrations-screen/registrations-screen.types.ts`,
  > `apps/web/src/modules/designs/screens/admin/registrations-screen/registrations-screen.component.test.tsx`,
  > `apps/web/src/modules/designs/screens/admin/reactivations-screen/reactivations-screen.component.tsx`,
  > `apps/web/src/modules/designs/screens/admin/reactivations-screen/reactivations-screen.types.ts`,
  > `apps/web/src/modules/designs/screens/admin/reactivations-screen/reactivations-screen.component.test.tsx`,
  > `apps/web/src/modules/designs/screens/admin/class-requests-screen/class-requests-screen.component.tsx`,
  > `apps/web/src/modules/designs/screens/admin/class-requests-screen/class-requests-screen.types.ts`,
  > `apps/web/src/modules/designs/screens/admin/class-requests-screen/class-requests-screen.component.test.tsx`,
  > `apps/web/src/modules/designs/screens/admin/removed-accounts-screen/removed-accounts-screen.component.tsx`,
  > `apps/web/src/modules/designs/screens/admin/removed-accounts-screen/removed-accounts-screen.types.ts`,
  > `apps/web/src/modules/designs/screens/admin/removed-accounts-screen/removed-accounts-screen.component.test.tsx`,
  > `apps/web/src/modules/designs/components/admin-app-accounts/admin-app-accounts.component.tsx`,
  > `apps/web/src/modules/designs/components/admin-app-accounts/admin-app-accounts.component.test.tsx`,
  > `apps/web/src/modules/designs/components/admin-app-class-requests/admin-app-class-requests.component.tsx`,
  > `apps/web/src/modules/designs/components/admin-app-class-requests/admin-app-class-requests.component.test.tsx`,
  > `apps/web/src/modules/designs/data/admin-app-ids.ts`,
  > `apps/web/src/modules/designs/pages/admin-app/admin-app.page.test.tsx`, `apps/web/src/i18n/dictionaries/en.ts`,
  > `apps/web/src/i18n/dictionaries/pt-br.ts`, `apps/web/src/i18n/dictionaries/es.ts`; verified: `npx vitest run
  > src/modules/designs` (226 files, 733 tests passed), `npx turbo run check-types --filter=@rochas-surf-school/web`
  > (4 successful), `eslint` clean; deviations: the admin app page test now expects 116 entries (was 112).

- [x] **T-09** — Update the admin rows AD-02, AD-04, AD-05 and AD-17 as D-08 says: `designIds` in
  `src/modules/user-journeys/data/user-journey-flows.ts` (adding `AD-07-16`, `AD-07-17`, `AD-07-18` and `AD-06-10`)
  and `steps` / `expected` in `src/modules/user-journeys/i18n/{en,pt-br,es}.ts`, quoting each language's app labels;
  extend `user-journey-flows.test.ts` and `user-journey-texts.test.ts` for those rows.
  Covers: ER-05 · Done when: `npx vitest run src/modules/user-journeys` passes.
  > ✅ 2026-11-04 12:45 — rows AD-02, AD-04, AD-05 and AD-17 now link `AD-07-16`, `AD-07-17`, `AD-07-18` and
  > `AD-06-10`; their `steps` tell the tester to confirm in the sheet (quoting the app's button and sheet title in
  > each language) and their `expected` says the sheet names the person and the card leaves after confirming (AD-05
  > no longer says "at once"); no other row changed, the admin flow keeps 33 rows; files:
  > `apps/web/src/modules/user-journeys/data/user-journey-flows.ts`,
  > `apps/web/src/modules/user-journeys/i18n/en.ts`, `apps/web/src/modules/user-journeys/i18n/pt-br.ts`,
  > `apps/web/src/modules/user-journeys/i18n/es.ts`,
  > `apps/web/src/modules/user-journeys/data/user-journey-flows.test.ts`,
  > `apps/web/src/modules/user-journeys/i18n/user-journey-texts.test.ts`; verified: `npx vitest run
  > src/modules/user-journeys` (11 files, 77 tests passed; the new text test failed first on a case mismatch, then
  > passed), `eslint` and `tsc --noEmit` clean; deviations: the text test reads the labels and sheet titles from the
  > app messages (`appT`) rather than repeating them.

### Designs (`.docs/designs`)

- [x] **T-10** — Regenerate `.docs/designs/admin-app.html` and its sources: build the web
  (`npx turbo run build --filter=@rochas-surf-school/web`), run `next start -p 3100` in `apps/web`, then
  `node .docs/designs/scripts/build-design.mjs admin-app`. Commit the regenerated sources and `.html`.
  Covers: ER-04 · Done when: `node .docs/designs/scripts/pack.mjs --check` exits 0 and the `.html` contains the four
  new entries.
  > ✅ 2026-11-04 12:46 — built the web (`npx turbo run build --filter=@rochas-surf-school/web`, 4 successful), ran
  > `next start -p 3100` in `apps/web`, then `node .docs/designs/scripts/build-design.mjs admin-app` (rewrote the
  > sources) and `node .docs/designs/scripts/pack.mjs admin-app`; files:
  > `.docs/designs/src/admin-app/template.html`, `.docs/designs/admin-app.html`; verified: `node
  > .docs/designs/scripts/pack.mjs --check` (exit 0, "5 design file(s) match their sources"), the `.html` holds
  > `AD-06-10`, `AD-07-16`, `AD-07-17` and `AD-07-18` and the template the four sheet titles ("Aprovar entrada?",
  > "Reativar conta?", "Inscrever nesta aula?", "Restaurar conta?"), `node --test .docs/designs/scripts/*.test.mjs`
  > (7 passed); deviations: `build-design.mjs` reported the `.html` stale after writing the sources, so `pack.mjs
  > admin-app` was run as `CLAUDE.md` describes.

### Verification

- [ ] **T-11** — Run every command in the Verification Plan from the repo root; all pass. Follow the user journey in
  the iOS simulator. Record the output summary as evidence. Covers: all · Done when: every command exits 0 and the
  journey matches.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 085` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 085` — every line this spec adds or changes is covered
  - `node .specs/scripts/run-e2e.mjs 085` — the web Playwright suite passes (design pages and user journeys, 33 admin
    rows)
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/app-messages --filter=@rochas-surf-school/mobile --filter=@rochas-surf-school/web`
    — no errors
  - `node .docs/designs/scripts/pack.mjs --check` — `admin-app.html` matches its sources
- User journeys (e2e, followed in the iOS simulator, signed in as an approved admin, e.g. `admin01@test.com`):
  - "Join the school" with a pending account: tap "Approve" → the sheet "Approve entry?" names the person; tap
    "Cancel" → the card stays; tap "Approve" again, then the sheet's "Approve" → the button spins, the sheet closes,
    the card leaves. "Deny" still opens "Deny entry?" with the reason field.
  - "Reactivate accounts" with a request: the same with "Reactivate account?".
  - "Class enrolments" with a request in a class with a free seat: the same with "Enrol in this class?", and the
    success alert shows after confirming; on a full class "Enrol" stays disabled.
  - "Removed accounts" with a removed account: the same with "Restore account?".
  - Turn off the network (or stop the backend) and confirm one sheet: the error alert shows and the sheet stays open.

## Memory Impact

- `memory/product.md` — the admin's accept decisions (approve a registration, reactivate, enrol a request, restore a
  removed account) are confirmed in a sheet before they are sent; Deny keeps its reason sheet.
- `memory/technical-context.md` — Applications (mobile): `src/components/decision/` also holds `ConfirmSheet` (D-01),
  used by the four tools; "Removed accounts" restores after a confirmation (no longer "at once"). Applications (web):
  the admin app page has 116 ids (`AD-06-10`, `AD-07-16`–`AD-07-18` added).
- `memory/modules/auth.md` — registrations, reactivations and restores are confirmed in the app before they are sent.
- `memory/modules/enrolment.md` — "Enrol" in "Inscrições em aulas" asks for confirmation before it is sent.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
