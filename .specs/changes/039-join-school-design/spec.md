---
id: "039"
slug: join-school-design
title: Align "Entrar na escola" with the PAINEL-03 and PAINEL-03A designs
template: quick
status: in-progress
started: 2026-10-18
base_commit: 2303207495e4113910c18c365929b4170cbdea98
created: 2026-10-18
fronts: [mobile]
depends_on: []
---

# 039 — Align "Entrar na escola" with the PAINEL-03 and PAINEL-03A designs

## Goal

The admin's "Entrar na escola" screen (pending registrations) and its deny sheet follow the designs PAINEL-03 and
PAINEL-03A of `.docs/designs/admin-app.html`: a header with the waiting count, cards with the person's name and email,
an outline "Recusar" and a green "Aprovar" with icons, and a deny sheet with the designed copy and a "Voltar" button.
Pressing a card's upper content opens the person's detail sheet, and the "Decididos agora" list goes away.

## Context

- Requirements: [requirements.md → Admins decide registrations](../../../.docs/requirements.md#admins-decide-registrations)
  — admins approve or deny each pending registration, with an optional reason sent to the person (unchanged here);
  [user-journeys.md → Approve or deny](../../../.docs/user-journeys.md#approve-or-deny) — the shared pattern of the
  admin tools, whose "Decided just now" list this spec removes (D-06).
- Designs: `.docs/designs/admin-app.html` → PAINEL-03 "Join the school" (`screen="pedEscola"`) and PAINEL-03A
  "Reject request" (`sheet="recusar"`). Pressing a card's upper row in the design opens the person sheet (name,
  "ALUNO" chip, WhatsApp row, "Fechar"). The design's copy is European Portuguese and uses photos.
- Existing code this changes (all under `apps/mobile/src`):
  - `modules/admin/screens/registrations.screen.tsx` — `ScreenIntro` with an `account-check-outline` icon tile, title
    and description; a `DecisionCard` per registration with details `[email, "Pediu …"]`; a `DecidedList`
    ("Decididos agora") in the list footer; the `DenySheet`.
  - `modules/admin/hooks/use-registrations-screen.hook.ts` (+ `.types.ts`) — keeps `decided` (the decisions of the
    visit) besides `sending` and `denying`.
  - `components/decision/decision-card` — initials on `bg-sand`, title, subtitle, detail lines, `ghost` Deny and
    `primary` Approve; `components/decision/deny-sheet` — title, hint, labelled `TextArea`, `danger` confirm;
    `components/decision/decided-list` — used only by the registrations screen.
  - `components/ui/button` — variants `primary | dark | outline | subtle | danger | ghost`; no green one.
  - `modules/people/components/person-sheet` — `PersonSheet` (avatar, name, role chip, WhatsApp row, "Fechar") for a
    `Person`; `modules/people/components/person-avatar` — `PersonAvatar` (initials).
  - `i18n/messages/{en-US,es-ES,pt-BR}.ts` — `registrations.*` and `decision.*`.
- A registration (`GET /registrations`: `id`, `name`, `email`, `createdAt`) is always a pending **student** and has
  no WhatsApp number yet: it is added in onboarding, after approval ([product.md](../../memory/product.md)). The
  backend doesn't change.

## Scope

### Out of scope

- The backend and `GET /registrations` (no new fields).
- Profile photos (none can be uploaded yet): avatars stay initials.
- The web `Button` (no `success` variant there).
- "Reactivate accounts" and "Class enrolments" (not built yet); they will reuse the changed `DecisionCard` and
  `DenySheet` when they are.
- The admin home's "Entrar na escola" row.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | Avatars are the initials `PersonAvatar` (`md` on the card, `lg` in the sheet), not photos. | No photo can be uploaded yet; same avatar as the People screen. |
| D-02 | The detail sheet is the People `PersonSheet`, given the registration as a `Person` with `role: "student"` and `whatsappNumber: null`, plus a new optional `email` prop: when `email` is given, the sheet shows an email row (mail icon, the email) **instead of** the WhatsApp row. Without `email` the sheet is unchanged. | A registration is always a pending student and has no WhatsApp number yet; a "Número não compartilhado" row would be misleading. Decided with the user. |
| D-03 | The design's European Portuguese copy is adapted to Brazilian Portuguese, with English and Spanish versions (the strings in the Expected Results). | The app's languages are en-US, es-ES and pt-BR. |
| D-04 | The title stays "Entrar na escola" / "Join the school" / "Unirse a la escuela" (the design says "Entrada na escola"). | It matches the admin home row and the user's wording. |
| D-05 | A green `success` variant (`bg-ok`, `text-on-color`, no shadow) is added to the mobile `Button` only. | "Aprovar" uses the `ok` color in the design; the web Button already differs (it has no `ghost`). |
| D-06 | The "Decididos agora" list is removed: a decided card just leaves the list. `DecidedList`, the hook's `decided` state and the `decision.*` strings are deleted, since nothing else uses them. | Decided with the user; it departs from user-journeys.md → Approve or deny, which `spec-finish` updates. |
| D-07 | The "Pediu …" line is removed from the card; the card's only detail is the email, right below the name. The list order (oldest first, from the API) is unchanged. | The design shows no request time; decided with the user. |
| D-08 | The header is drawn in the list's header like the People screen: a `ds-text-section-label text-ink-2` count line (only when at least one registration is listed), a `ds-text-screen-title` title with `accessibilityRole="header"`, and a `ds-text-body text-ink-2` description. `ScreenIntro` and the icon tile are no longer used here. The native Stack header still draws only the back button. | Matches PAINEL-03 and the existing People screen pattern. |
| D-09 | `DecisionCard` stays generic (no registration fields): `initials` becomes `avatar: ReactNode`, and an optional `onPress` makes the upper row (avatar, text, chevron) one `Pressable` (`accessibilityRole="button"`, label = `title`); without `onPress` there is no chevron and the row isn't pressable. The card gets `shadowStyle("card")`. Deny is `variant="outline"` with a Feather `x` icon, Approve `variant="success"` with a Feather `check` icon. | The other admin tools will reuse it with their own data. |
| D-10 | `DenySheet` gets a `placeholder` and a `backLabel`; `label` becomes the `TextArea`'s `accessibilityLabel` (no visible label). The confirm button keeps `danger` with a Feather `x-circle` icon; a `subtle` "Voltar" button below it closes the sheet like a swipe down (`onClose`, the text is cleared). | PAINEL-03A. |

## Expected Results

### ER-01 — The registrations list follows PAINEL-03

- **Front:** mobile
- **Behavior:** Given an admin with pending registrations Ana Souza (`ana@example.com`) and Bruno Lima, when they open
  "Entrar na escola", then the list header shows "2 esperando aprovação", the title "Entrar na escola" and
  "Contas novas só podem marcar aulas depois de aprovadas. A pessoa recebe uma notificação push." (en-US: "2 waiting
  for approval", "Join the school", "New accounts can only book classes once approved. The person gets a push
  notification."; es-ES: "2 esperando aprobación", "Unirse a la escuela", "Las cuentas nuevas solo pueden reservar
  clases después de ser aprobadas. La persona recibe una notificación push."), with no icon tile; each card shows the
  initials avatar, the name, the email right below it, a chevron, an outline "Recusar" with an ✕ icon and a green
  (`bg-ok`) "Aprovar" with a ✓ icon, and no "Pediu …" text.
- **Edge and error cases:** with no registration the count line is hidden and "Ninguém esperando para entrar." shows;
  while loading and on a load error the count line is hidden and the spinner / error with "Tentar novamente" are
  unchanged; after approving or denying a card, that card leaves the list, the count goes down and no "Decididos
  agora" / "Aprovado" / "Recusado" text appears; while a card is being sent its buttons are disabled and the pressed
  one shows its spinner, as today; the count, title and description show in light and dark themes with token colors
  only.
- **Verify by:** `npx jest src/modules/admin src/components/decision src/components/ui/button` (from `apps/mobile`) —
  `registrations.screen.test.tsx` (header with count, hidden count on empty / loading / error, card with name, email
  and both buttons, no "Pediu", no decided list after a decision), `decision-card.component.test.tsx` and
  `button.component.test.tsx` (the `success` variant's classes); and the user journey in the Verification Plan.

### ER-02 — Pressing a card's upper content opens the person's detail sheet

- **Front:** mobile
- **Behavior:** Given the registrations list, when the admin presses Ana Souza's upper row (avatar, name and email, or
  the chevron), then the detail sheet opens with Ana's large initials avatar, "Ana Souza", the "Aluno" chip and an
  email row showing `ana@example.com`, and no WhatsApp row; pressing "Fechar" closes it.
- **Edge and error cases:** pressing "Recusar" or "Aprovar" doesn't open the detail sheet; the sheet keeps its content
  while sliding away; a `PersonSheet` without `email` (the People screen) still shows the WhatsApp row exactly as
  before.
- **Verify by:** `npx jest src/modules/admin/screens/registrations.screen.test.tsx
  src/modules/people/components/person-sheet src/components/decision/decision-card` (from `apps/mobile`) — the card
  press opens the sheet with name, "Student" chip and email and no WhatsApp; the buttons don't open it;
  `person-sheet.component.test.tsx` covers both the email and the WhatsApp branches; and the user journey in the
  Verification Plan.

### ER-03 — The deny sheet follows PAINEL-03A, with a "Voltar" button under "Recusar e avisar"

- **Front:** mobile
- **Behavior:** Given the registrations list, when the admin presses "Recusar" on Helena Prata's card, then a sheet
  shows the title "Recusar entrada?", the text "Helena Prata não vai entrar na escola. Você pode explicar o motivo
  (opcional) — a pessoa recebe esta mensagem.", a text area with the placeholder "Ex.: No momento não temos vagas
  para novos alunos." and no visible label, a red "Recusar e avisar" button with an icon and a "Voltar" button;
  pressing "Recusar e avisar" denies the registration with the typed reason (en-US: "Deny entry?", "Helena Prata won't
  join the school. You can explain why (optional) — the person gets this message.", "E.g.: We have no spots for new
  students right now.", "Deny and notify", "Back"; es-ES: "¿Rechazar la entrada?", "Helena Prata no entrará en la
  escuela. Puedes explicar el motivo (opcional): la persona recibe este mensaje.", "Ej.: Por el momento no tenemos
  plazas para nuevos alumnos.", "Rechazar y avisar", "Volver").
- **Edge and error cases:** an empty reason denies without one (the request's `reason` is `""`, as today); "Voltar"
  closes the sheet without sending anything, and reopening it shows an empty text area; the text area's accessibility
  label is "Motivo (opcional)"; the 500-character limit, the confirm spinner while sending and the "already decided"
  handling are unchanged.
- **Verify by:** `npx jest src/modules/admin/screens/registrations.screen.test.tsx src/components/decision/deny-sheet`
  (from `apps/mobile`) — the sheet's copy, placeholder and accessibility label, confirm sends the reason, "Voltar"
  closes without a request and clears the text; and the user journey in the Verification Plan.

## Tasks

### Mobile (`apps/mobile`)

- [x] **T-01** — Add the `success` variant (`bg-ok` container, `text-on-color` label, no shadow) to
  `src/components/ui/button/button.types.ts` and `button.constants.ts` (D-05), with a test in
  `button.component.test.tsx` for its classes and its disabled state.
  Covers: ER-01 · Done when: `npx jest src/components/ui/button` passes.
  > ✅ 2026-10-18 — added the `success` variant; files: `apps/mobile/src/components/ui/button/button.types.ts`,
  > `button.constants.ts`, `button.component.test.tsx`; verified: `npx jest src/components/ui/button` (14 passed);
  > deviations: none
- [x] **T-02** — Change `src/components/decision/decision-card` (D-01, D-09): `avatar: ReactNode` replaces
  `initials`; optional `onPress` makes the upper row one `Pressable` with an Ionicons `chevron-forward` (`ink3`)
  at its end; `shadowStyle("card", theme)` on the card; Deny `outline` + Feather `x`, Approve `success` + Feather
  `check` (icon colors from `useTheme()`); keep `details`, `disabled` and `loading`. Update
  `decision-card.component.test.tsx` (avatar rendered, press on the upper row calls `onPress`, no chevron and no
  pressable row without it, buttons call their handlers and not `onPress`, disabled / loading states). Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-01, ER-02 · Done when: `npx jest src/components/decision/decision-card` passes.
  > ✅ 2026-10-18 — DecisionCard takes `avatar`, optional `onPress` row with chevron, card shadow, outline/success buttons with icons;
  > files: `apps/mobile/src/components/decision/decision-card/decision-card.{component.tsx,types.ts,component.test.tsx}`;
  > verified: `npx jest src/components/decision/decision-card` (8 passed); deviations: none (the registrations screen still passes
  > `initials` until T-05, so type check fails until then)
- [ ] **T-03** — Change `src/components/decision/deny-sheet` (D-10): `placeholder` and `backLabel` props, `label`
  used as the `TextArea`'s `accessibilityLabel` only, a Feather `x-circle` icon on the `danger` confirm, and a
  `subtle` back button that calls the same close as a swipe (text cleared). Update
  `deny-sheet.component.test.tsx` (placeholder, accessibility label, no visible label, confirm sends the text,
  back closes and clears). Covers: ER-03 · Done when: `npx jest src/components/decision/deny-sheet` passes.
- [ ] **T-04** — Add the optional `email` prop to `src/modules/people/components/person-sheet` (D-02): with it, an
  email row (Feather `mail` icon, `people.email` label, the email as subtitle, not pressable) replaces the WhatsApp
  row; add `people.email` ("E-mail" / "Email" / "Correo electrónico") to the three message files. Extend
  `person-sheet.component.test.tsx` for the email branch (and that the WhatsApp branches are unchanged).
  Covers: ER-02 · Done when: `npx jest src/modules/people/components/person-sheet` passes.
- [ ] **T-05** — Rework `src/modules/admin/screens/registrations.screen.tsx` and
  `src/modules/admin/hooks/use-registrations-screen.hook.ts` (+ `.types.ts`) (D-02, D-06, D-07, D-08): the
  People-style list header with the `registrations.waiting` count line; `DecisionCard` with `PersonAvatar`, details
  `[email]` and `onPress` opening `PersonSheet` (selected registration kept while it slides away, as on the People
  screen) with `email`; `DenySheet` with the new props; remove `ScreenIntro`, the "Pediu" label, `DecidedList` and
  the hook's `decided` state. Delete `src/components/decision/decided-list/`. In the three message files: add
  `registrations.waiting`, `registrations.denySheet.placeholder` and `registrations.denySheet.back`; change
  `registrations.description`, `registrations.denySheet.{title,hint,confirm}` to the strings in ER-01 and ER-03
  (`hint` takes `{{name}}`, `title` no longer does); remove `registrations.asked`, `registrations.askedNow` and the
  `decision` block. Update `registrations.screen.test.tsx` and `use-registrations-screen.hook.test.tsx` for ER-01–ER-03
  (drop the "decided just now" tests and assertions). Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-01, ER-02, ER-03 · Done when: `npx jest src/modules/admin` passes and
  `grep -rn "DecidedList\|decision\.\|registrations.asked" apps/mobile/src` finds nothing.

### Verification

- [ ] **T-06** — Run every command in the Verification Plan from the repo root and walk the user journey; all pass.
  Record the output summary and the journey's result as evidence. Covers: all · Done when: every command exits 0
  and every journey step behaves as described.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 039` — the tests this spec adds or changes, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 039` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` — no errors.
- User journey (iOS simulator, `npx expo run:ios`, backend running, signed in as an admin, with at least two pending
  registrations — e.g. two accounts created with the email code — in pt-BR, light and dark themes):
  - Open "Entrar na escola": the header, cards and buttons look like PAINEL-03 (count line, title, description,
    initials, name, email, chevron, outline "Recusar" with ✕, green "Aprovar" with ✓), with no "Pediu".
  - Press a card's name: the detail sheet shows initials, name, "Aluno" and the email, no WhatsApp; "Fechar" closes it.
  - Press "Recusar": the sheet looks like PAINEL-03A; "Voltar" closes it and nothing changes; open it again, type a
    reason and press "Recusar e avisar": the card leaves the list, the count goes down, and no "Decididos agora"
    appears.
  - Press "Aprovar" on the last card: it leaves the list and "Ninguém esperando para entrar." shows without a count.

## Memory Impact

- `memory/product.md` — Glossary → "Admin tools": a card per pending item with Deny and Approve (and, on "Join the
  school", a tap opening the person's sheet), no "Decided just now" list; the registrations decision notes
  (around "Decided just now") say a decided card just leaves the list.
- `memory/technical-context.md` — Fixed conventions → mobile shared UI: `src/components/decision/` holds
  `DecisionCard` (`avatar` node, optional `onPress` upper row with chevron, card shadow, outline Deny / `success`
  Approve with icons) and `DenySheet` (placeholder, accessibility-only label, icon confirm, back button);
  `DecidedList` no longer exists; the mobile `Button` has a `success` variant; `PersonSheet` takes an optional
  `email` that replaces the WhatsApp row; the registrations screen no longer keeps "Decided just now" state.
- `memory/structure.md` — `src/components/decision/` without `decided-list`; the registrations screen comment
  without "Decided just now".
- `memory/modules/auth.md` — registration decisions on mobile: a decided card leaves the list (no "Decided just
  now"); the card opens the person's sheet with the email.

## Amendments

## Review
