---
id: "016"
slug: closed-account-screens
title: Denied, Account deleted and Access removed screens
status: changes-requested
started: 2026-10-11
base_commit: 0e3b64851a703cefd14f99087941cf1e78276629
created: 2026-10-11
fronts: [mobile]
depends_on: ["014", "015"]
---

# 016 — Denied, Account deleted and Access removed screens

## Goal

The person behind a denied, deleted or removed account sees the real screen of that state instead of a
placeholder: why the account is closed, what they can still do, and a way back to sign-in. A deleted account
sends its one reactivation request from its screen and sees, at each sign-in, whether the request is waiting or
was denied; a denied or removed account can contact the school on WhatsApp. The screens follow the simplified
design: one shared layout, and one Account deleted screen with three states.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: **User** (`denied`, `deleted`,
  `removed`), **Reactivation request**, **School settings** (the school's WhatsApp number); decisions "Deleting
  and removing are different", "Text written by admins is shown as written", "Pushes are the only notification
  channel".
- Requirements:
  - [requirements.md → Denied registration screen](../../../.docs/requirements.md#denied-registration-screen) —
    the denial, its reason when given, and a WhatsApp chat with the school.
  - [requirements.md → Account deleted screen](../../../.docs/requirements.md#account-deleted-screen) — request
    reactivation or sign in with another email.
  - [requirements.md → One reactivation request](../../../.docs/requirements.md#one-reactivation-request) — the
    request is sent from the screen; after a denial, only "another email" is offered.
  - [requirements.md → Removal by admins](../../../.docs/requirements.md#removal-by-admins) — access removed,
    WhatsApp contact, no reactivation.
- Design: [auth-flow.html](../../../.docs/designs/auth-flow.html) → Alternative states (simplified in commit
  `8a98005`): LOGIN-09 Denied (with and without a reason), LOGIN-10 Account deleted (one screen, three states),
  LOGIN-11 Access removed, light and dark.
- Technical: [technical-context.md](../../memory/technical-context.md) — Applications → `apps/mobile` (TanStack
  Query, the `fetch` client in `src/services/api/`, i18next), Fixed conventions, Automated validation (Jest +
  RNTL, user journeys on the simulator).
- Conventions: `.claude/rules/react.md` (one folder per component: `*.component.tsx`, `*.hook.ts`,
  `*.types.ts`, `index.ts`), CLAUDE.md → Rules for apps/mobile (tokens only, NativeWind classes,
  `TouchableOpacity` buttons, the `vercel-react-native-skills` and `vercel-react-best-practices` skills).
- Existing code this builds on:
  - `apps/mobile/src/navigation/resolve-flow.ts` — routes `denied` → `offboarding-denied`
    (`/offboarding/denied`), `removed` → `offboarding-removed` (`/offboarding/removed`), `deleted` →
    `reactivation` (`/reactivation`). Unchanged by this spec.
  - `apps/mobile/src/modules/offboarding/screens/{denied,removed}.screen.tsx` and
    `apps/mobile/src/modules/reactivation/screens/reactivation.screen.tsx` — placeholders (`FlowPlaceholder`).
  - `apps/mobile/src/modules/pending/components/pending/` — the closest screen: `ScreenIntro` (icon tile,
    eyebrow, title, description with `Trans` and a bold email), a card, a ghost `Button` at the bottom, safe-area
    padding.
  - `apps/mobile/src/modules/onboarding/hooks/use-save-whatsapp.hook.ts` — the mutation pattern: `retry: false`,
    `setSession` on success, toasts through `useAlertMessage`, `whatsapp.sessionExpired` + `useSignOut` on 401.
  - `apps/mobile/src/modules/auth/hooks/use-sign-out.hook.ts` — signs out locally at once and returns to sign-in.
- Depends on: spec 014 (`denialReason` and `reactivationStatus` on the account answer,
  `POST /auth/me/reactivation-request`) and spec 015 (`GET /school-settings`).
- Test data for the journeys: [journeys.md](journeys.md).

## Scope

### In scope

- The shared `AccountStatus` layout.
- The Denied screen (with and without a reason), the Access removed screen, and the Account deleted screen with
  its three states (not requested, requested, denied).
- Requesting reactivation from the Account deleted screen.
- The "Falar com a escola" button on Denied and Removed, from the school's WhatsApp number.
- "Usar outro email" on every state.
- All copy in pt-BR, es-ES and en-US.

### Out of scope

- Push notifications, and seeing an admin's decision while the app is open (the person signs in again).
- Keeping the session across app restarts, and renewing it.
- Any admin screen (deciding requests, setting the school's number), and the flows that delete, remove or deny
  an account.
- Changing `resolveFlow` or the routes.
- The Terms and Privacy policy links.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | One shared component, `AccountStatus` in `apps/mobile/src/components/account-status/`, draws every closed-account state: icon tile (tone `bad` → `bg-bad-tint`/`text-bad`, `dim` → `bg-dim`/`text-ink-2`, `sand` → `bg-sand`/`text-grape`), eyebrow, title, description (a node, so the email can be bold), an optional note card (title and text), an optional primary action, and a ghost "Usar outro email" button that is always last. | The design's simplification; it's used by the `offboarding` and `reactivation` modules, so it can't live in either. |
| D-02 | The Account deleted screen is one screen at `/reactivation`; its state comes from the session's `user.reactivationStatus`: `null` → not requested, `"requested"` → requested, `"denied"` → denied. Routes and `resolveFlow` don't change. | One screen, three states (design LOGIN-10); the session is the single source of the account. |
| D-03 | Denied and Removed read the school's number with a TanStack query on `GET /school-settings` (with the access token). "Falar com a escola" (primary, with the WhatsApp glyph) renders only when the answer has a non-null `whatsappNumber`; while loading, on any error and when it is `null`, it isn't rendered and nothing else replaces it. Tapping it calls `Linking.openURL("https://wa.me/<number without +>")`; if that rejects, the toast shows "Não foi possível abrir o WhatsApp." | The contact is an extra; hiding it is safer than a broken button, and "Usar outro email" always remains. `wa.me` works with or without WhatsApp installed. |
| D-04 | "Pedir reativação" calls `POST /auth/me/reactivation-request` (mutation, `retry: false`), showing the button's loading state and ignoring taps while pending. 200 → `setSession` with the returned account (the screen shows *requested*). 409 `user.reactivation.denied` → `setSession` with the current account and `reactivationStatus: "denied"` (the screen shows *denied*). 401 `auth.token.invalid` → toast `whatsapp.sessionExpired` and sign out. 403 `user.status.notDeleted` → toast "Sua conta mudou. Entre de novo para continuar." and sign out. Network error → toast `createAccount.errors.noConnection`, the button works again. Any other error → toast `createAccount.errors.generic`, the button works again. | Every answer leaves the person on a screen that matches the account's real state; the existing toasts are reused. |
| D-05 | The denial reason is shown exactly as stored, in the "Mensagem da equipe" card; when it is `null` or only spaces, the card isn't rendered. | Admin text isn't translated or edited (product.md); the reason is optional. |
| D-06 | Copy is the table below, in `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`; the email is bold through `Trans`. The design's "we'll email you" isn't used. The placeholder keys `flows.reactivation`, `flows.offboardingDenied` and `flows.offboardingRemoved` are removed once no screen uses them. | D-04 of the planning interview: no email or push answers exist; pt-BR adaptation of the design. |
| D-07 | "Usar outro email" calls `useSignOut().signOut`, which returns to the sign-in screen (`/auth`) at once, even offline. | One secondary action for every state (design simplification); same behavior as the Pending screen. |
| D-08 | Mobile has no e2e suite, so the user-facing results are proven by component tests plus the user journeys of the Verification Plan, with the test data in [journeys.md](journeys.md). | technical-context.md → Automated validation. |
| D-09 | `SessionUser` gains `denialReason: string \| null` and `reactivationStatus: string \| null` (plain strings on the wire, like `role` and `status`). | Spec 014 adds both to every account answer. |

### Copy

The email is shown bold where `{email}` appears.

| Key | pt-BR | es-ES | en-US |
| --- | --- | --- | --- |
| `closedAccount.useAnotherEmail` | Usar outro email | Usar otro email | Use another email |
| `closedAccount.contactSchool` | Falar com a escola | Hablar con la escuela | Contact the school |
| `closedAccount.whatsappUnavailable` | Não foi possível abrir o WhatsApp. | No se pudo abrir WhatsApp. | Couldn't open WhatsApp. |
| `denied.eyebrow` | Cadastro não aprovado | Registro no aprobado | Registration not approved |
| `denied.title` | Não foi dessa vez | Esta vez no ha sido posible | Not this time |
| `denied.description` | A equipe da Rocha's não aprovou o cadastro de {email}. Se você acha que foi um engano, fale com a gente. | El equipo de Rocha's no aprobó el registro de {email}. Si crees que es un error, habla con nosotros. | The Rocha's team didn't approve the registration of {email}. If you think it's a mistake, talk to us. |
| `denied.noteTitle` | Mensagem da equipe | Mensaje del equipo | Message from the team |
| `removed.eyebrow` | Acesso removido | Acceso eliminado | Access removed |
| `removed.title` | Você não tem mais acesso ao app | Ya no tienes acceso a la app | You no longer have access to the app |
| `removed.description` | A equipe da Rocha's removeu o acesso de {email}. Esta conta não pode ser reativada pelo app. | El equipo de Rocha's eliminó el acceso de {email}. Esta cuenta no se puede reactivar desde la app. | The Rocha's team removed access for {email}. This account can't be reactivated from the app. |
| `removed.noteTitle` | Tem dúvidas? | ¿Tienes dudas? | Questions? |
| `removed.noteText` | Fale direto com a escola pelo WhatsApp. | Habla directamente con la escuela por WhatsApp. | Talk to the school directly on WhatsApp. |
| `reactivation.notRequested.eyebrow` | Conta excluída | Cuenta eliminada | Account deleted |
| `reactivation.notRequested.title` | Esta conta não está mais ativa | Esta cuenta ya no está activa | This account is no longer active |
| `reactivation.notRequested.description` | A conta de {email} foi excluída. Para voltar a usá-la, peça à equipe da Rocha's que a reative. | La cuenta de {email} fue eliminada. Para volver a usarla, pide al equipo de Rocha's que la reactive. | The account {email} was deleted. To use it again, ask the Rocha's team to reactivate it. |
| `reactivation.notRequested.noteTitle` | Como reativar | Cómo reactivarla | How to reactivate |
| `reactivation.notRequested.noteText` | Toque em "Pedir reativação". A equipe recebe o pedido e decide. Entre de novo com este email para ver a resposta. | Toca «Pedir reactivación». El equipo recibe la solicitud y decide. Vuelve a entrar con este email para ver la respuesta. | Tap "Request reactivation". The team gets the request and decides. Sign in again with this email to see the answer. |
| `reactivation.notRequested.request` | Pedir reativação | Pedir reactivación | Request reactivation |
| `reactivation.requested.eyebrow` | Pedido enviado | Solicitud enviada | Request sent |
| `reactivation.requested.title` | A equipe vai analisar | El equipo la revisará | The team will review it |
| `reactivation.requested.description` | Recebemos seu pedido para reativar {email}. | Recibimos tu solicitud para reactivar {email}. | We got your request to reactivate {email}. |
| `reactivation.requested.noteTitle` | E agora? | ¿Y ahora? | What now? |
| `reactivation.requested.noteText` | Quando a equipe responder, entre de novo com este email para ver a resposta. | Cuando el equipo responda, vuelve a entrar con este email para ver la respuesta. | When the team answers, sign in again with this email to see the answer. |
| `reactivation.denied.eyebrow` | Pedido recusado | Solicitud rechazada | Request denied |
| `reactivation.denied.title` | Não foi possível reativar | No fue posible reactivarla | Couldn't reactivate |
| `reactivation.denied.description` | A equipe da Rocha's recusou o pedido para reativar {email}. Esta conta vai continuar inativa. | El equipo de Rocha's rechazó la solicitud para reactivar {email}. Esta cuenta seguirá inactiva. | The Rocha's team denied the request to reactivate {email}. This account will stay inactive. |
| `reactivation.accountChanged` | Sua conta mudou. Entre de novo para continuar. | Tu cuenta cambió. Vuelve a entrar para continuar. | Your account changed. Sign in again to continue. |

## Expected Results

### ER-01 — The Denied screen shows the denial and its reason

- **Front:** mobile
- **Behavior:** Given a signed-in account with status `denied` and a `denialReason`, when the Denied screen
  opens, then it shows the eyebrow "Cadastro não aprovado", the title "Não foi dessa vez", the description with
  the account's email in bold, and a card titled "Mensagem da equipe" with the reason exactly as stored.
- **Edge and error cases:** a reason with line breaks or accents is shown unchanged; the screen has no back
  button.
- **Verify by:** `npx jest src/modules/offboarding/screens/denied.screen.test.tsx -t "with a reason"` (from
  `apps/mobile`) and journey 1 of the Verification Plan.

### ER-02 — A denial without a reason has no note

- **Front:** mobile
- **Behavior:** Given a signed-in account with status `denied` and `denialReason` `null`, when the Denied screen
  opens, then the "Mensagem da equipe" card isn't rendered and the rest of ER-01 is.
- **Edge and error cases:** a reason made only of spaces is treated as no reason.
- **Verify by:** `npx jest src/modules/offboarding/screens/denied.screen.test.tsx -t "without a reason"` and
  journey 2.

### ER-03 — "Falar com a escola" appears only with the school's number

- **Front:** mobile
- **Behavior:** Given the Denied or Removed screen, when `GET /school-settings` answers
  `{ "whatsappNumber": "+5585999998888" }`, then a "Falar com a escola" button is shown, and tapping it opens
  `https://wa.me/5585999998888`.
- **Edge and error cases:** while the request is pending, when it fails (any error or no connection) and when it
  answers `{ "whatsappNumber": null }`, the button isn't rendered and the screen shows nothing in its place;
  when opening the link rejects, the toast shows "Não foi possível abrir o WhatsApp.".
- **Verify by:** `npx jest src/modules/offboarding/components/contact-school-button` (number, null, error,
  loading, link failure) and journeys 1 and 3.

### ER-04 — The Access removed screen

- **Front:** mobile
- **Behavior:** Given a signed-in account with status `removed`, when the Access removed screen opens, then it
  shows the eyebrow "Acesso removido", the title "Você não tem mais acesso ao app", the description with the
  email in bold, the card "Tem dúvidas?" / "Fale direto com a escola pelo WhatsApp." and the contact button of
  ER-03; there is no way to request reactivation.
- **Edge and error cases:** a stored `reactivationStatus` doesn't change the screen.
- **Verify by:** `npx jest src/modules/offboarding/screens/removed.screen.test.tsx` and journey 3.

### ER-05 — Account deleted, no request yet

- **Front:** mobile
- **Behavior:** Given a signed-in account with status `deleted` and `reactivationStatus` `null`, when the
  Account deleted screen opens, then it shows the eyebrow "Conta excluída", the title "Esta conta não está mais
  ativa", the description with the email in bold, the card "Como reativar" with its text, and the primary button
  "Pedir reativação".
- **Edge and error cases:** none beyond ER-06 and ER-09.
- **Verify by:** `npx jest src/modules/reactivation/screens/reactivation.screen.test.tsx -t "not requested"` and
  journey 4.

### ER-06 — Requesting reactivation switches the screen to "requested"

- **Front:** mobile
- **Behavior:** Given the Account deleted screen in the not-requested state, when the person taps "Pedir
  reativação", then the button shows its loading state and ignores further taps until the answer, and on a 200
  answer the same screen shows the requested state (ER-07) without navigating.
- **Edge and error cases:** a double tap sends one request.
- **Verify by:** `npx jest src/modules/reactivation/hooks/use-request-reactivation.hook.test.tsx -t "success"`,
  `npx jest src/modules/reactivation/screens/reactivation.screen.test.tsx -t "request"`, and journey 4 (the row
  stores `requested`).

### ER-07 — Account deleted, request waiting

- **Front:** mobile
- **Behavior:** Given a signed-in account with status `deleted` and `reactivationStatus` `"requested"` (at
  sign-in, or after ER-06), when the Account deleted screen shows, then it has the eyebrow "Pedido enviado", the
  title "A equipe vai analisar", the description "Recebemos seu pedido para reativar {email}.", the card "E
  agora?" with its text, and no primary button.
- **Edge and error cases:** none.
- **Verify by:** `npx jest src/modules/reactivation/screens/reactivation.screen.test.tsx -t "requested"` and
  journey 5.

### ER-08 — Account deleted, request denied

- **Front:** mobile
- **Behavior:** Given a signed-in account with status `deleted` and `reactivationStatus` `"denied"`, when the
  Account deleted screen shows, then it has the eyebrow "Pedido recusado", the title "Não foi possível
  reativar", the description with the email in bold, no card and no primary button — only "Usar outro email".
- **Edge and error cases:** when "Pedir reativação" answers 409 `user.reactivation.denied`, the screen switches
  to this state in place.
- **Verify by:** `npx jest src/modules/reactivation/screens/reactivation.screen.test.tsx -t "denied"`,
  `npx jest src/modules/reactivation/hooks/use-request-reactivation.hook.test.tsx -t "denied"`, and journey 6.

### ER-09 — A failed request leaves the person on the right screen

- **Front:** mobile
- **Behavior:** Given the Account deleted screen in the not-requested state, when "Pedir reativação" fails, then:
  401 `auth.token.invalid` → the toast "Sua sessão expirou. Entre novamente." and the sign-in screen opens;
  403 `user.status.notDeleted` → the toast "Sua conta mudou. Entre de novo para continuar." and the sign-in
  screen opens; no connection → the toast "Sem conexão. Verifique sua internet e tente de novo." and the button
  works again; any other error → "Algo deu errado. Tente de novo." and the button works again.
- **Edge and error cases:** none.
- **Verify by:** `npx jest src/modules/reactivation/hooks/use-request-reactivation.hook.test.tsx` (each case)
  and journey 7 (403).

### ER-10 — "Usar outro email" returns to sign-in from every state

- **Front:** mobile
- **Behavior:** Given any of the five states (Denied with or without a reason, Removed, Account deleted in each
  state), when the person taps "Usar outro email", then the session is cleared and the sign-in screen opens.
- **Edge and error cases:** it works offline; going back after it doesn't return to the closed-account screen.
- **Verify by:** `npx jest src/components/account-status` (the button calls its handler) and the "use another
  email" test in each screen test file, plus journeys 1–6.

### ER-11 — Every screen follows the app language

- **Front:** mobile
- **Behavior:** Given the app language is es-ES or en-US, when any of the states shows, then every text is the
  one of the Copy table for that language.
- **Edge and error cases:** the denial reason stays as stored in every language (D-05).
- **Verify by:** a test per screen file rendering in es-ES and checking the title and the secondary button
  (`-t "spanish"`), the default en-US rendering of the tests, and journey 8.

## Tasks

### Mobile (`apps/mobile`)

- [x] **T-01** — Add `denialReason: string | null` and `reactivationStatus: string | null` to `SessionUser` in
  `apps/mobile/src/navigation/resolve-flow.types.ts` (D-09), and add both fields (as `null`) to every test
  fixture and mock that builds a `SessionUser` or an account answer, so they match the API of spec 014. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: enabling · Done when: `npx turbo run check-types --filter=@rochas-surf-school/mobile` exits 0 and
  `npm test --workspace @rochas-surf-school/mobile` passes.
  > ✅ 2026-10-11 — added `denialReason` and `reactivationStatus` to `SessionUser` and to the verify response type; both `null` in every fixture; files: `apps/mobile/src/navigation/resolve-flow.types.ts`, `apps/mobile/src/modules/auth/hooks/use-verify-sign-in-code.hook.ts`, and the `SessionUser` fixtures in 12 mobile test files (`git diff --stat` lists them); verified: `npx turbo run check-types --filter=@rochas-surf-school/mobile` (exit 0), `npm test` in apps/mobile (54 suites, 573 passed); deviations: none

- [x] **T-02** — Create `AccountStatus` in `apps/mobile/src/components/account-status/`
  (`account-status.component.tsx`, `account-status.types.ts`, `index.ts`) per D-01: it reuses `ScreenIntro` for
  the icon tile, eyebrow, title and description, renders the note card only when given, the primary action only
  when given (a `Button` with its loading state), and always the ghost `Button` "Usar outro email" calling
  `onUseAnotherEmail`, with the Pending screen's safe-area padding; add the `closedAccount.*` keys of the Copy
  table in the three message files. Test it in `account-status.component.test.tsx` (with and without note, with
  and without primary action, loading, the secondary button calls its handler). Follow `.claude/rules/react.md`.
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-01, ER-02, ER-10 · Done when: `npx jest src/components/account-status` passes and
  `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` exits 0.
  > ✅ 2026-10-11 — added the shared `AccountStatus` (ScreenIntro + optional note card + primary-action slot + ghost "Usar outro email") and the `closedAccount.*` copy in the three message files; files: `apps/mobile/src/components/account-status/{index.ts,account-status.component.tsx,account-status.types.ts,account-status.component.test.tsx}`, `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`; verified: `npx jest src/components/account-status` (7 passed), `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` (exit 0); deviations: the primary action is a `primaryAction` ReactNode slot instead of label/onPress props, so the Contact button (T-03) and the loading Button (T-07) plug in unchanged

- [x] **T-03** — Create `useSchoolWhatsapp` in `apps/mobile/src/modules/offboarding/hooks/` (TanStack query on
  `GET /school-settings` with the session's access token, returning the number or `null`) and
  `ContactSchoolButton` in `apps/mobile/src/modules/offboarding/components/contact-school-button/` (renders
  nothing unless a number loaded; a primary `Button` "Falar com a escola" with the WhatsApp glyph; opens
  `https://wa.me/<digits>` with `Linking.openURL` and shows `closedAccount.whatsappUnavailable` when it rejects —
  D-03). Tests: `use-school-whatsapp.hook.test.tsx` (number, null, error) and
  `contact-school-button.component.test.tsx` (number, null, error, loading, the URL opened, link failure).
  Follow `.claude/rules/react.md`. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-03 · Done when: `npx jest src/modules/offboarding` passes and
  `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` exits 0.
  > ✅ 2026-10-11 — added `useSchoolWhatsapp` (query on `GET /school-settings`, number or null) and `ContactSchoolButton` (renders only with a number, opens `https://wa.me/<digits>`, toast when the link rejects); files: `apps/mobile/src/modules/offboarding/hooks/{use-school-whatsapp.hook.ts,use-school-whatsapp.types.ts,use-school-whatsapp.hook.test.tsx}`, `apps/mobile/src/modules/offboarding/components/contact-school-button/{index.ts,contact-school-button.component.tsx,contact-school-button.hook.ts,contact-school-button.types.ts,contact-school-button.component.test.tsx}`, `apps/mobile/src/components/ui/button/{button.component.tsx,button.types.ts,button.component.test.tsx}`; verified: `npx jest src/modules/offboarding src/components/ui/button` (passed), `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` (exit 0); deviations: the shared mobile `Button` gained an optional `icon` prop (with a test) to draw the WhatsApp glyph; the web Button has no such prop yet

- [x] **T-04** — Replace the placeholder of `apps/mobile/src/modules/offboarding/screens/denied.screen.tsx` with
  the Denied screen built from `AccountStatus` (tone `bad`, icon `close`), the `denied.*` copy in the three
  message files, the reason card per D-05, `ContactSchoolButton` as primary action and `useSignOut` for "Usar
  outro email" (D-07); remove `flows.offboardingDenied` if unused. Update `denied.screen.test.tsx`:
  `with a reason`, `without a reason` (null and blank), `use another email`, `spanish`. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-01, ER-02, ER-10, ER-11 · Done when: `npx jest src/modules/offboarding/screens/denied.screen.test.tsx`
  passes and `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` exits 0.
  > ✅ 2026-10-11 — replaced the Denied placeholder with the real screen (`AccountStatus`, tone `bad`, icon `close`, reason card per D-05, `ContactSchoolButton`, `useSignOut`), added `denied.*` copy, removed the unused `flows.offboardingDenied` key; files: `apps/mobile/src/modules/offboarding/screens/denied.screen.tsx`, `apps/mobile/src/modules/offboarding/screens/denied.screen.test.tsx`, `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`, `apps/mobile/src/components/flow-placeholder/flow-placeholder.component.test.tsx`; verified: `npx jest src/modules/offboarding/screens/denied src/components/flow-placeholder` (8 passed), `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` (exit 0); deviations: the flow-placeholder test dropped the removed key

- [x] **T-05** — Replace the placeholder of `apps/mobile/src/modules/offboarding/screens/removed.screen.tsx` with
  the Access removed screen built from `AccountStatus` (tone `bad`, icon `account-minus`), the `removed.*` copy
  in the three message files, the "Tem dúvidas?" card, `ContactSchoolButton` and `useSignOut`; remove
  `flows.offboardingRemoved` if unused. Update `removed.screen.test.tsx`: the copy and card, no reactivation
  action (also with a stored `reactivationStatus`), `use another email`, `spanish`. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-04, ER-10, ER-11 · Done when: `npx jest src/modules/offboarding/screens/removed.screen.test.tsx`
  passes and `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` exits 0.
  > ✅ 2026-10-11 — replaced the Removed placeholder with the Access removed screen (`AccountStatus`, tone `bad`, icon `account-minus`, "Tem dúvidas?" card, `ContactSchoolButton`, `useSignOut`), added `removed.*` copy, removed the unused `flows.offboardingRemoved` key; files: `apps/mobile/src/modules/offboarding/screens/removed.screen.tsx`, `apps/mobile/src/modules/offboarding/screens/removed.screen.test.tsx`, `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`, `apps/mobile/src/components/flow-placeholder/flow-placeholder.component.test.tsx`; verified: `npx jest src/modules/offboarding/screens/removed src/components/flow-placeholder` (7 passed), `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` (exit 0); deviations: the flow-placeholder test dropped the removed key

- [x] **T-06** — Create `useRequestReactivation` in `apps/mobile/src/modules/reactivation/hooks/`
  (`use-request-reactivation.hook.ts`, `.types.ts`): a mutation on `POST /auth/me/reactivation-request` with the
  access token, handling every answer of D-04 (add `reactivation.accountChanged` to the three message files).
  Test it in `use-request-reactivation.hook.test.tsx`: `success` (session updated with the answer), `denied`
  (session's `reactivationStatus` becomes `"denied"`), `session expired`, `account changed`, `no connection`,
  `other error`. Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-06, ER-08, ER-09 · Done when: `npx jest src/modules/reactivation/hooks` passes and
  `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` exits 0.
  > ✅ 2026-10-11 — added `useRequestReactivation` (mutation on `POST /auth/me/reactivation-request`, every answer of D-04) and the `reactivation.accountChanged` copy; files: `apps/mobile/src/modules/reactivation/hooks/{use-request-reactivation.hook.ts,use-request-reactivation.types.ts,use-request-reactivation.hook.test.tsx}`, `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`; verified: `npx jest src/modules/reactivation/hooks` (8 passed), `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` (exit 0); deviations: none

- [x] **T-07** — Replace the placeholder of
  `apps/mobile/src/modules/reactivation/screens/reactivation.screen.tsx` with the Account deleted screen: one
  `AccountStatus` whose content follows the session's `reactivationStatus` (D-02) — not requested (tone `dim`,
  icon `account-remove-outline`, "Como reativar" card, primary "Pedir reativação" wired to
  `useRequestReactivation` with its loading state), requested (tone `sand`, icon `send-outline`, "E agora?"
  card, no primary), denied (tone `bad`, icon `close-circle-outline`, no card, no primary) — the
  `reactivation.*` copy in the three message files, and `useSignOut` for "Usar outro email"; remove
  `flows.reactivation` if unused. Update `reactivation.screen.test.tsx`: `not requested`, `request` (tap → the
  requested state, one request on a double tap), `requested`, `denied` (stored, and after a 409),
  `use another email` in each state, `spanish`. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-05, ER-06, ER-07, ER-08, ER-10, ER-11 · Done when:
  `npx jest src/modules/reactivation` passes and
  `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` exits 0.
  > ✅ 2026-10-11 — replaced the Reactivation placeholder with the Account deleted screen (one `AccountStatus` per state from `user.reactivationStatus`: not requested → `dim` + request button wired to `useRequestReactivation`; requested → `sand`; denied → `bad`), added the `reactivation.*` copy, removed the now unused `flows.reactivation` key; files: `apps/mobile/src/modules/reactivation/screens/reactivation.screen.tsx`, `apps/mobile/src/modules/reactivation/screens/reactivation.screen.test.tsx`, `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`, `apps/mobile/src/components/flow-placeholder/flow-placeholder.component.test.tsx`; verified: `npx jest src/modules/reactivation` (19 passed), `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` (exit 0); deviations: the flow-placeholder test dropped the removed key; found while running the related tests (T-08): the route tests expected the placeholder headers of the three flows, so `apps/mobile/src/navigation/root-navigator/root-navigator.component.test.tsx` now expects the new screen titles (`npx jest src/navigation`, 149 passed)

### Verification

- [x] **T-08** — Run every command in the Verification Plan from the repo root and follow its user journeys on
  the iOS simulator; all pass. Record the output summary and what each journey showed as evidence.
  Covers: all · Done when: every Verification Plan command exits 0 with `COVERAGE OK` printed, and journeys 1–8
  match their expected observations.
  > ✅ 2026-10-11 — ran the Verification Plan. Automated: `node .specs/scripts/run-related-tests.mjs 016` RELATED TESTS PASSED (apps/mobile, 42 changed files); `node .specs/scripts/check-coverage.mjs 016` COVERAGE OK (12 files); `npm test --workspace @rochas-surf-school/mobile` 58 suites, 620 tests passed; `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` exit 0 (it also caught and fixed two uncovered-branch gaps and the root-navigator route tests that still expected the placeholder titles). Journeys on the iOS simulator (iPhone 18 Pro, debug build from this branch, backend of specs 014/015 on local Postgres, backend started without `RESEND_API_KEY` so codes are only logged; account closed.test@example.com, deleted afterwards): 1 ✅ (light) Denied with reason shows the eyebrow, title, bold email, "Mensagem da equipe" card with the accented reason, the contact button with the WhatsApp glyph and "Use another email"; tapping contact opened wa.me in Safari: "Chat on WhatsApp with +55 85 99999-8888"; "Use another email" returned to sign-in; 2 ✅ (light and dark) no reason → no card; 3 ✅ (dark) Removed shows the "Questions?" card and contact button, and after `DELETE FROM school_settings` the same screen without the button; 4 ✅ (dark) not requested → tap → "REQUEST SENT / THE TEAM WILL REVIEW IT" in place, row stored `reactivation_status = 'requested'` with `reactivation_requested_at` 2026-10-12 03:21:42; 5 ✅ signing in again opens the requested state directly; 6 ✅ `reactivation_status = 'denied'` → "REQUEST DENIED / COULDN'T REACTIVATE" with only "Use another email"; 7 ✅ account set to approved while the screen was open, "Pedir reactivación" → toast "Tu cuenta cambió. Vuelve a entrar para continuar." and the sign-in screen; 8 ✅ (partly) with the app in Spanish the Account deleted screen showed the es-ES copy (eyebrow, title, bold email, card, both buttons); the Denied screen in Spanish and the pt-BR copy were not driven (component tests cover both, `-t spanish`). Not driven: Android, light mode for journeys 3–8 (dark used), the physical pt-BR phone language. deviations: journeys 7 and 8 were run in Spanish instead of Portuguese, so journey 7's toast was checked in Spanish

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 016` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 016` — every line this spec adds or changes is covered
  - `npm test --workspace @rochas-surf-school/mobile` — the whole mobile suite passes (the `SessionUser` change
    touches many fixtures)
  - `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` — no errors (mobile has no build
    script)
- User journeys (iOS simulator, light and dark; backend of specs 014 and 015 running locally with Postgres;
  test data and SQL in [journeys.md](journeys.md)):
  1. School number set; account denied with a reason → sign in → the Denied screen matches LOGIN-09 "with
     reason": "CADASTRO NÃO APROVADO", "NÃO FOI DESSA VEZ", the bold email, the "Mensagem da equipe" card with
     the reason, "FALAR COM A ESCOLA" and "USAR OUTRO EMAIL". Tap "Falar com a escola" → WhatsApp (or Safari on
     wa.me) opens a chat with +55 85 99999-8888. Back in the app, tap "Usar outro email" → the sign-in screen.
  2. Denied without a reason → no card (LOGIN-09 "no reason").
  3. Removed → matches LOGIN-11 with the contact button. Then `DELETE FROM school_settings;`, sign in again →
     same screen without "Falar com a escola".
  4. Deleted, no request → matches LOGIN-10 "not requested"; tap "Pedir reativação" → the button loads, then the
     screen shows "PEDIDO ENVIADO" / "A EQUIPE VAI ANALISAR" without navigating; the row stores
     `reactivation_status = 'requested'` with a date.
  5. Tap "Usar outro email", sign in again → the requested state opens directly (LOGIN-10 "requested").
  6. Set `reactivation_status = 'denied'`, sign in → "PEDIDO RECUSADO" / "NÃO FOI POSSÍVEL REATIVAR", only "USAR
     OUTRO EMAIL" (LOGIN-10 "denied").
  7. Deleted, no request, screen open; set the account back to `approved` in SQL; tap "Pedir reativação" → the
     toast "Sua conta mudou. Entre de novo para continuar." and the sign-in screen.
  8. Switch the phone to Spanish and repeat journey 1 and 4 → the es-ES copy of the table; the reason stays in
     Portuguese.

## Memory Impact

- `memory/product.md` — Current state: the Denied, Account deleted (three states, reactivation request) and
  Access removed screens exist in the app, with "Falar com a escola" when the school has a number; admins still
  can't decide requests, and decisions are seen at the next sign-in. Remove these screens from the "don't exist
  yet" list.
- `memory/technical-context.md` — `apps/mobile`: the shared `AccountStatus` component and the
  `GET /school-settings` / `POST /auth/me/reactivation-request` calls; `SessionUser` gains `denialReason` and
  `reactivationStatus`.
- `memory/structure.md` — `apps/mobile/src/components/account-status/`;
  `modules/offboarding/{components/contact-school-button,hooks/use-school-whatsapp.hook.ts}`;
  `modules/reactivation/hooks/use-request-reactivation.hook.ts`; the three screens no longer placeholders.
- `memory/modules/auth.md` — Who can do what (in the app): a denied account sees the reason and contacts the
  school; a deleted account requests reactivation once and sees its state at each sign-in; a removed account
  contacts the school; every closed state signs out with "Usar outro email". Spec history.
- `memory/modules/school-settings.md` — the app reads the number for the contact buttons of the Denied and
  Removed screens; hidden while unset. Spec history.

## Assumptions

- The person sees an admin's decision on a reactivation request only by signing in again: there are no
  notifications, and the session isn't refreshed while the screen is open. Accepted because the copy says so
  ("entre de novo com este email para ver a resposta").

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)
- [Test data for the journeys](journeys.md)

## Amendments

## Review

### Round 1 — 2026-10-12 — changes-requested

**Checks**

- lint ✅ · type check ✅ (apps/mobile; mobile has no build script)
- related tests ✅ `RELATED TESTS PASSED` (apps/mobile, 42 changed files) · whole mobile suite ✅ 58 suites, 620 passed
- coverage of the changed lines ✅ `COVERAGE OK` (12 files); no coverage-ignore comments in the diff
- e2e ✅ `E2E PASSED` — no suite applies (mobile has none, D-08)
- each Expected Result's `Verify by` command ❌ — every filter matches and passes, but five of the new test files
  keep Jest from exiting (F-01)
- user journeys: not re-driven on the simulator this round (the findings below already require another round);
  the executor's T-08 evidence covers journeys 1–8, with 8 only partly

**Expected Results**

- ER-01 ✅ — reason shown as stored (line break and accent), eyebrow/title/bold email; no back button
- ER-02 ✅ — `null` and `"   "` hide the card
- ER-03 ❌ — behavior correct in code (`wa.me/<digits>`, hidden while loading/on error/on null, toast on reject),
  but the component tests of the null and error cases don't prove it (F-02)
- ER-04 ✅ — card, contact button, no reactivation even with a stored `reactivationStatus`
- ER-05 ✅ · ER-06 ✅ (in-place switch, one request on a double tap) · ER-07 ✅ · ER-08 ✅ (stored and after 409)
- ER-09 ✅ — 401, 403, no connection, other error each tested in the hook
- ER-10 ✅ — "Use another email" signs out from all five states (component tests)
- ER-11 ✅ — `-t "spanish"` passes in the three screen files; copy matches the Copy table in all three languages

**Findings**

- [ ] **F-01** (tests) — `use-school-whatsapp.hook.test.tsx`, `contact-school-button.component.test.tsx`,
  `denied.screen.test.tsx`, `removed.screen.test.tsx` and `reactivation.screen.test.tsx` create
  `new QueryClient()` with the default `gcTime`, so the 5-minute garbage-collection timers keep Jest open after
  the run: each `Verify by` command of ER-01–ER-08 and ER-11 prints its results and then hangs ("Jest did not
  exit one second after the test run has completed"). Reproduce (from `apps/mobile`):
  `npx jest src/modules/offboarding/screens/removed.screen.test.tsx` — never exits. Expected: it exits like the
  existing tests do (`use-save-whatsapp.hook.test.tsx` and `use-request-reactivation.hook.test.tsx` set
  `gcTime: Infinity`; queries need the same, or clear the client after each test).
- [ ] **F-02** (tests) — in `contact-school-button.component.test.tsx`, "renders nothing when the school has no
  number" and "renders nothing when the request fails" assert right after `fetch` was called, before the query
  settles, so they pass even when the button is wrongly rendered. Reproduce: change the last line of
  `use-school-whatsapp.hook.ts` to `return data ? (data.whatsappNumber ?? "+1") : null;` — all 5 tests still
  pass. Expected: both tests wait until the query has settled (e.g. the answer was consumed) before asserting
  the button is absent, and fail with that change.
- [ ] **F-03** (convention) — the mobile `Button` gained an `icon` prop (T-03), but the web `Button`
  (`apps/web/src/components/ui/button.tsx`) has none; CLAUDE.md requires the same names and props on both
  platforms. Expected: add the same optional `icon` prop to the web `Button` (with a test), or record an
  amendment that explains the exception. Either way, list the `Button` change under `## Memory Impact`.

**Notes**

- `AccountStatus` repeats the Pending screen's raw values (`px-[22px]`, icon `size={30}`); not a finding since it
  follows the existing screen, but both could move to tokens later.
- Next round: drive at least journeys 1, 3 and 4 on the simulator in light mode and journey 8 in pt-BR/es-ES on
  the Denied screen, which T-08 left undriven.
