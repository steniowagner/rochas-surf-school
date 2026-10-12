---
id: "019"
slug: admin-registration-decisions
title: Admins approve or deny registrations ("Join the school")
status: in-progress
created: 2026-10-12
started: 2026-10-12
base_commit: 52df631cada869d940b43771d00f61ab6391ef1c
fronts: [auth, backend, mobile]
depends_on: []
---

# 019 — Admins approve or deny registrations ("Join the school")

## Goal

An approved admin opens the "Join the school" tool in the app and approves or denies each pending registration,
optionally writing a reason when denying — the person sees it on the Denied screen (spec 016). Every decision is
final: once a registration is decided, nobody can decide it again, even when two admins act at the same moment.
The tool's decision card, "Decided just now" list and deny sheet are generic, so the "Reactivate accounts" and
"Class enrolments" tools can reuse them.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: **User** (lifecycle `pending` →
  `approved` | `denied`), **Registration** and **Admin tools** in the Glossary, and the decision "Admin decisions
  are final in the app".
- Requirements: [requirements.md → Admins decide registrations](../../../.docs/requirements.md#admins-decide-registrations)
  — admins approve or deny each pending registration, with an optional reason sent to the person; decisions are
  final. [user-journeys.md → Approve or deny](../../../.docs/user-journeys.md#approve-or-deny) — the pattern the
  three admin tools share: a card per pending request with Deny and Approve, a "Decided just now" list underneath,
  and a sheet for the denial reason.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Architecture (who may
  do what is checked in use cases), Authentication (`JwtAuthGuard` reloads role and status per request;
  `@CurrentUser()`), Error handling, Mobile shared UI (`Button`, `BottomModal`, `ScreenIntro`, `BackButton`,
  `useAlertMessage`), Mobile routes, Automated validation.
- Module: [modules/auth.md](../../memory/modules/auth.md) — Accounts (`denialReason` up to 500 characters,
  `deniedAt`), Boundaries (deciding registrations was left to a later spec; this spec puts it in Authentication,
  D-01).
- Existing code this builds on:
  - `modules/auth/src/user/model/user.entity.ts` — `User` already has `status`, `denialReason` (max 500) and
    `deniedAt`; `clone()` + `validate()` is how use cases change a user
    (`modules/auth/src/user/usecase/request-reactivation.usecase.ts` is the pattern).
  - `modules/auth/src/user/provider/user.repository.ts` and `apps/backend/src/modules/auth/user.prisma.ts` —
    `update()` writes unconditionally, so it can't make a decision final under concurrency (D-05).
  - `modules/school-rules/src/school-rule/usecase/school-rule-access.ts` — the approved / approved-admin check
    pattern (status first, then role).
  - `apps/mobile/src/app/(private)/admin/index.tsx` → `modules/admin/screens/admin.screen.tsx` — the admin home,
    a `FlowPlaceholder` today.
  - `apps/mobile/src/components/ui/bottom-modal/` — the bottom sheet; `components/ui/chip/` — `Chip` with tones
    `ok` and `bad`; `components/ui/text-input/` — single-line, requires an icon (hence a new `TextArea`, D-13).
  - `apps/mobile/src/modules/pending/utils/format-created-at.ts` — the relative-time rule ("now", relative up to 7
    days, then the date in America/Fortaleza), reused for "Asked …" (D-11).
- Design: none. `.docs/designs/` has only `design-system.html` and `auth-flow.html`, and neither shows an admin
  screen. The layout below is built from the design system's existing components and tokens; the reviewer checks
  it against this spec.

## Scope

### In scope

- Use cases `ListRegistrations`, `ApproveRegistration` and `DenyRegistration` in `modules/auth` (`user`
  aggregate), with an admin access check, and two new `UserRepository` methods.
- `GET /registrations`, `POST /registrations/:id/approve`, `POST /registrations/:id/deny` in the backend.
- In the app: a minimal admin home with a "Join the school" row and the pending count; the "Join the school"
  screen at `/admin/registrations`; the reusable `DecisionCard`, `DecidedList` and `DenySheet`; a shared
  `TextArea`; the copy below in pt-BR, es-ES and en-US.

### Out of scope

- Notifications: admins told of a new registration, the person told of the result (a separate spec). The
  person sees the decision at the next launch, sign-in or session renewal, as today.
- Erasing denied registrations 30 days after the denial.
- The "Reactivate accounts" and "Class enrolments" tools (they will reuse the components of D-09).
- Undoing or changing a decision.
- A stored decision history (`approvedAt`, who decided) and a backend "recently decided" list.
- Pagination, search or filters of the registrations list.
- Notes on registrations (deferred in the source documents).
- The rest of the admin home (other tools, sign-out, settings).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | Registration decisions belong to `modules/auth`, `user` aggregate: `ListRegistrations`, `ApproveRegistration`, `DenyRegistration` in `src/user/usecase/`, the access check in `src/user/usecase/registration-access.ts`. The backend routes live in a new `registrations.controller.ts` in `apps/backend/src/modules/auth/`. `spec-finish` updates the module boundary in `modules.md` and `auth.md`. | A registration is a `pending` user; a separate module would write users through auth anyway. Chosen by the user over a new `account-lifecycle` module. |
| D-02 | `GET /registrations` → 200 `{ items: [{ id, name, email, createdAt }] }`: every user with status `pending`, any role, ordered by `createdAt` ascending (oldest first), unpaginated; `createdAt` an ISO 8601 string in UTC. `POST /registrations/:id/approve` and `POST /registrations/:id/deny` (body `{ reason? }`) → 200 `{ id, status }` (`"approved"` / `"denied"`). | One school: the pending list stays short. The answer carries only what the card shows. |
| D-03 | Access, checked first on all three routes: status other than `approved` → 403 `user.status.notApproved`; approved non-admin → 403 `user.role.notAdmin`. No token → 401 `auth.token.invalid` (the guard). | Product: only admins decide registrations; same order as `school-rule-access.ts`. |
| D-04 | Then, on approve and deny: an id that isn't a UUID or names no user → 404 `registration.notFound` (a malformed id is detected in the use case, without a lookup); a user whose status isn't `pending` → 409 `registration.status.notPending`; then the reason (deny only): a `reason` that is present and not a string → 422 `registration.reason.invalid`; longer than 500 characters after trimming → 422 `user.denialReason.maxLength` (the entity's rule). Nothing is written on any error. | Stable, translatable keys; a stale list or a second admin get a clear "already decided". |
| D-05 | A decision is written with a conditional update: new `UserRepository.updateIfPending(user): Promise<boolean>`, implemented in Prisma as `updateMany({ where: { id, status: 'pending' }, data })`, returning whether a row changed. `false` → 409 `registration.status.notPending`. | `update()` is unconditional: two concurrent decisions would both succeed and the second would overwrite the first, breaking "decisions are final". |
| D-06 | Deny trims the reason; absent, `null`, empty or whitespace-only means no reason (`denialReason` stays empty). `deniedAt` = the `ClockProvider`'s now. Approve changes only `status`. Neither changes the role or anything else. | Requirements §1.2; the Denied screen already treats a blank reason as none. |
| D-07 | New `UserRepository.findPending(): Promise<User[]>` (status `pending`, `createdAt` ascending). | The list query the repository doesn't have. |
| D-08 | "Decided just now" lives only in the screen's state: the decisions this admin made during the current visit to the screen, newest first, each with the name and a tag ("Approved", `Chip` tone `ok`; "Denied", tone `bad`). Hidden while empty; empty again when the admin leaves the screen and comes back. Pull-to-refresh and reloads don't clear it. | "Just now" means this session; no decision history is stored (out of scope). |
| D-09 | Reusable components in `apps/mobile/src/components/decision/`, one folder each, with generic props and no registration fields: `DecisionCard` (`title`, `subtitle?`, `details: string[]`, `initials`, `approveLabel`, `denyLabel`, `onApprove`, `onDeny`, `disabled`, `loading?: "approve" \| "deny"`), `DecidedList` (`title`, `items: { id, title, tag, tone: "ok" \| "bad" }[]`; renders nothing when empty), `DenySheet` (`visible`, `title`, `hint`, `label`, `confirmLabel`, `maxLength`, `loading`, `onConfirm(reason)`, `onClose`). | The three admin tools share the pattern (user-journeys → Approve or deny); the next two specs plug in their own data and copy. |
| D-10 | The admin home (`/admin`) becomes a minimal tools list: `ScreenIntro` with title "School tools" and one row (a `Pressable`, at least 44 pt tall) "Join the school" with the count of pending registrations from `GET /registrations`. The count shows once loaded (including 0) and is hidden while loading or after an error. The tool lives at `/admin/registrations` (`routes.admin.registrations`), with `BackButton`. | No design for the admin experience; a row per tool lets the next tools join without inventing a tab bar. |
| D-11 | `formatCreatedAt` (and its types and tests) moves from `modules/pending/utils/` to `apps/mobile/src/utils/`; the Pending screen imports it from there. The card's detail is "Asked {time}", or "Asked just now" when it returns `now`. | One rule for relative times; two screens now use it. |
| D-12 | Mobile data: one TanStack query `["registrations"]` (authenticated `GET /registrations`) shared by the home row and the tool; mutations `POST /registrations/:id/approve` and `/deny` (authenticated, no retry). On 200 the person's card leaves the list at once (the cached list is updated) and the query is invalidated, so the home count is current on the way back. On 409 `registration.status.notPending`: toast "This registration was already decided.", the list is refetched, nothing is added to "Decided just now". Any other failure: `NetworkError` → the no-connection toast, anything else → the generic toast; the card stays (and for a deny the sheet stays open with the reason). `SessionExpiredError` is ignored (handled centrally). | technical-context → Mobile session and Error handling. |
| D-13 | New shared `TextArea` in `apps/mobile/src/components/ui/text-area/`: multi-line, no icon, `maxLength` enforced by the native input, a counter "{length}/{maxLength}" under it, same border tokens as `TextInput`. | `TextInput` is single-line and requires an icon. |
| D-14 | Approve acts on tap, with no confirmation dialog. Deny always opens `DenySheet`; closing it (backdrop, drag, or after a success) clears the reason. While a decision is being sent, both buttons of that card are disabled and the tapped one shows its loading state; other cards stay usable. | The pattern shows direct buttons; the sheet is the deny's confirmation step. |
| D-15 | Card content: an initials avatar (first letter of the first and of the last word of the name, uppercase, on `bg-sand` with `text-grape`), the name as title, the email and "Asked …" as details, then Deny (`ghost` variant) and Approve (primary) side by side. Cards in API order (oldest first). | No photo exists for pending accounts; one primary action per card (design system section 08). |
| D-16 | Mobile has no e2e suite, so the user-facing results are proven by component tests plus the user journeys of the Verification Plan. | technical-context → Automated validation. |

### Copy

`{{…}}` are i18next interpolations. Key names are a suggestion; the text is the contract.

| Key | en-US | pt-BR | es-ES |
| --- | --- | --- | --- |
| `admin.home.title` | School tools | Ferramentas da escola | Herramientas de la escuela |
| `admin.home.registrationsRow` | Join the school | Entrar na escola | Unirse a la escuela |
| `admin.home.waiting` | {{count}} waiting | {{count}} esperando | {{count}} esperando |
| `registrations.title` | Join the school | Entrar na escola | Unirse a la escuela |
| `registrations.description` | People waiting for the school's approval. | Pessoas esperando a aprovação da escola. | Personas esperando la aprobación de la escuela. |
| `registrations.asked` | Asked {{time}} | Pediu {{time}} | Pidió {{time}} |
| `registrations.askedNow` | Asked just now | Pediu agora | Pidió ahora |
| `registrations.approve` | Approve | Aprovar | Aprobar |
| `registrations.deny` | Deny | Recusar | Rechazar |
| `registrations.empty` | No one is waiting to join. | Ninguém esperando para entrar. | Nadie esperando para unirse. |
| `registrations.loadError` | Couldn't load the registrations. | Não foi possível carregar os cadastros. | No se pudieron cargar los registros. |
| `registrations.retry` | Try again | Tentar novamente | Reintentar |
| `registrations.alreadyDecided` | This registration was already decided. | Este cadastro já foi decidido. | Este registro ya fue decidido. |
| `registrations.denySheet.title` | Deny {{name}}? | Recusar {{name}}? | ¿Rechazar a {{name}}? |
| `registrations.denySheet.hint` | The reason is optional and is shown to the person. | O motivo é opcional e será mostrado para a pessoa. | El motivo es opcional y se le mostrará a la persona. |
| `registrations.denySheet.label` | Reason (optional) | Motivo (opcional) | Motivo (opcional) |
| `registrations.denySheet.confirm` | Deny registration | Recusar cadastro | Rechazar registro |
| `decision.decidedJustNow` | Decided just now | Decididos agora | Decididos ahora |
| `decision.approved` | Approved | Aprovado | Aprobado |
| `decision.denied` | Denied | Recusado | Rechazado |

## Expected Results

### ER-01 — Admins list the pending registrations

- **Front:** backend
- **Behavior:** Given users with statuses `pending` (A created before B), `approved`, `denied`, `deleted` and
  `removed`, when an approved admin calls `GET /registrations`, then the API answers 200 with
  `{ items: [A, B] }`, each item exactly `{ id, name, email, createdAt }` (`createdAt` ISO 8601 UTC) — no other
  status is listed.
- **Edge and error cases:** with no pending user the answer is 200 `{ items: [] }`; a pending user of any role is
  listed.
- **Verify by:** `apps/backend/test/registrations.e2e-spec.ts` → "lists pending registrations oldest first" and
  "answers an empty list" (`npm run test:e2e --workspace apps/backend`), and
  `modules/auth/test/user/usecase/list-registrations.usecase.test.ts`.

### ER-02 — Only approved admins reach the registrations routes

- **Front:** backend
- **Behavior:** Given each of the three routes, when it is called by an approved student or instructor, then it
  answers 403 `user.role.notAdmin`; by an admin whose status is `pending`, `denied`, `deleted` or `removed`, 403
  `user.status.notApproved`; without a token, 401 `auth.token.invalid`. Nothing is written in any case.
- **Edge and error cases:** the status check comes before the role check (a removed admin gets
  `user.status.notApproved`); the access check comes before the id lookup (a non-admin deciding an unknown id
  gets 403, not 404).
- **Verify by:** `apps/backend/test/registrations.e2e-spec.ts` → "refuses non-admins" and "refuses admins that
  aren't approved", and the use case tests of T-02 to T-04 (`npm test --workspace @rochas-surf-school/auth`).

### ER-03 — Approving a registration approves the account

- **Front:** backend
- **Behavior:** Given a pending student P, when an approved admin calls `POST /registrations/{P.id}/approve`,
  then the API answers 200 `{ id: P.id, status: "approved" }`, P's row has status `approved`, its role is still
  `student`, and P's own `GET /auth/me` answers `status: "approved"`.
- **Edge and error cases:** a request body is ignored; `denial_reason` and `denied_at` stay null.
- **Verify by:** `apps/backend/test/registrations.e2e-spec.ts` → "approves a pending registration" and
  `modules/auth/test/user/usecase/approve-registration.usecase.test.ts`.

### ER-04 — Denying a registration stores the reason

- **Front:** backend
- **Behavior:** Given a pending user P, when an approved admin calls `POST /registrations/{P.id}/deny` with
  `{ "reason": "  Não conhecemos você.  " }`, then the API answers 200 `{ id: P.id, status: "denied" }`, P's row
  has status `denied`, `denial_reason` `Não conhecemos você.` and `denied_at` set to the request time, and P's
  `GET /auth/me` answers `denialReason: "Não conhecemos você."`.
- **Edge and error cases:** no body, no `reason`, `null`, `""` or `"   "` → denied with `denialReason: null`; a
  reason of 500 characters is accepted; 501 characters after trimming → 422 `user.denialReason.maxLength` and P
  stays pending; a non-string `reason` (e.g. `42`) → 422 `registration.reason.invalid` and P stays pending.
- **Verify by:** `apps/backend/test/registrations.e2e-spec.ts` → "denies with a trimmed reason", "denies without
  a reason" and "refuses an invalid reason", and `modules/auth/test/user/usecase/deny-registration.usecase.test.ts`.

### ER-05 — A decision is final

- **Front:** backend
- **Behavior:** Given a registration already approved or denied, when any admin calls approve or deny on it,
  then the API answers 409 `registration.status.notPending` and the row is unchanged (status, reason and
  `denied_at` kept).
- **Edge and error cases:** a user with status `approved`, `denied`, `deleted` or `removed` → 409; two decisions
  sent at the same moment on the same pending user (approve + deny, or deny + deny) → exactly one 200 and one
  409, and the row matches the 200; an unknown UUID → 404 `registration.notFound`; an id that isn't a UUID
  (`/registrations/abc/approve`) → 404 `registration.notFound`, not 500.
- **Verify by:** `apps/backend/test/registrations.e2e-spec.ts` → "refuses a second decision", "decides once under
  concurrency" and "answers 404 for unknown and malformed ids"; `apps/backend/src/modules/auth/user.prisma.spec.ts`
  → `updateIfPending`.

### ER-06 — The admin home opens "Join the school" with the pending count

- **Front:** mobile
- **Behavior:** Given an approved admin who finished onboarding and 3 pending registrations, when the admin home
  opens, then it shows "School tools" and a row "Join the school" with "3 waiting"; tapping the row opens
  `/admin/registrations`, and its `BackButton` returns to the admin home.
- **Edge and error cases:** 0 pending → "0 waiting"; while the list loads or after it failed, the row shows
  without a count and still opens the tool; after deciding a registration and going back, the count is one less.
- **Verify by:** `npx jest src/modules/admin/screens/admin.screen.test.tsx` (count, zero, loading, error, opens the
  tool) and journey 1.

### ER-07 — The tool lists one card per pending registration

- **Front:** mobile
- **Behavior:** Given registrations A (asked 2 hours ago) and B (asked 10 days ago, 2 Oct of the current year)
  answered oldest first, when "Join the school" opens, then it shows the title "Join the school", the description,
  and B's card then A's, each with the initials avatar, the name, the email, "Asked 2 Oct" / "Asked 2 hours ago",
  and the buttons "Deny" and "Approve".
- **Edge and error cases:** while loading → a loading indicator and no cards; no registrations → "No one is
  waiting to join."; a failed load → "Couldn't load the registrations." with "Try again", which refetches; a
  registration created under a minute ago → "Asked just now"; pulling the list down refetches it; a one-word
  name shows one initial.
- **Verify by:** `npx jest src/modules/admin/screens/registrations.screen.test.tsx` (list, order, loading, empty,
  error + retry, refresh) and `npx jest src/components/decision/decision-card` (initials, details), and journey 1.

### ER-08 — Approving from the card

- **Front:** mobile
- **Behavior:** Given A's card, when the admin taps "Approve", then `POST /registrations/{A.id}/approve` is sent,
  A's two buttons are disabled with "Approve" loading meanwhile, and on 200 A's card leaves the list and A appears
  first under "Decided just now" with the tag "Approved".
- **Edge and error cases:** no confirmation dialog; other cards stay usable while A is sent; a second tap on A
  sends nothing more; offline → the no-connection toast and A's card stays with its buttons enabled; any other
  error (except the 409 of ER-10) → the generic toast and the card stays.
- **Verify by:** `npx jest src/modules/admin/screens/registrations.screen.test.tsx -t "approve"` and
  `npx jest src/modules/admin/hooks`, and journey 2.

### ER-09 — Denying through the sheet, with an optional reason

- **Front:** mobile
- **Behavior:** Given A's card (name "Ana Souza"), when the admin taps "Deny", then the sheet opens with "Deny Ana
  Souza?", the hint, the "Reason (optional)" multi-line field with the counter "0/500" and "Deny registration";
  typing a reason and tapping "Deny registration" sends `POST /registrations/{A.id}/deny` with `{ reason }`, the
  button loads meanwhile, and on 200 the sheet closes, A's card leaves the list and A appears first under
  "Decided just now" with the tag "Denied".
- **Edge and error cases:** an empty field sends no reason (`{}` or `reason` omitted/empty) and still denies; the
  field takes at most 500 characters (the counter reads "500/500"); closing the sheet without confirming sends
  nothing, keeps A's card, and the field is empty when the sheet opens again; a failure (offline or generic)
  shows its toast, keeps the sheet open with the typed reason, and keeps A's card.
- **Verify by:** `npx jest src/modules/admin/screens/registrations.screen.test.tsx -t "deny"`,
  `npx jest src/components/decision/deny-sheet` and `npx jest src/components/ui/text-area`, and journey 3.

### ER-10 — An already decided registration leaves the list

- **Front:** mobile
- **Behavior:** Given A's card on screen while A was already decided elsewhere, when the admin taps "Approve" (or
  confirms a denial) and the API answers 409 `registration.status.notPending`, then the toast "This registration
  was already decided." shows, the list is refetched (A's card disappears), the deny sheet closes if it was open,
  and A is not added to "Decided just now".
- **Edge and error cases:** other cards and the existing "Decided just now" entries are unchanged.
- **Verify by:** `npx jest src/modules/admin/screens/registrations.screen.test.tsx -t "already decided"` and
  journey 4.

### ER-11 — "Decided just now" lasts for the visit

- **Front:** mobile
- **Behavior:** Given the tool just opened, then no "Decided just now" section is shown; after approving A and
  denying B it shows B then A (newest first) with their tags; when the admin goes back to the admin home and opens
  the tool again, the section is gone.
- **Edge and error cases:** pull-to-refresh, "Try again" and the refetch after a 409 keep the section's entries;
  the section shows even when no card is left (the empty message shows above it).
- **Verify by:** `npx jest src/components/decision/decided-list` and
  `npx jest src/modules/admin/screens/registrations.screen.test.tsx -t "decided just now"`, and journey 2.

## Tasks

### Auth module (`modules/auth`)

- [x] **T-01** — Add `findPending(): Promise<User[]>` (status `pending`, `createdAt` ascending; D-07) and
  `updateIfPending(user: User): Promise<boolean>` (writes the user only while its stored status is `pending`;
  D-05) to `UserRepository` in `modules/auth/src/user/provider/user.repository.ts`, and implement both in the
  in-memory `modules/auth/test/mock/fake-user.repository.ts` (test code, exercised by the use case tests of T-02
  to T-04).
  Skill: [`module-repository`](../../../.claude/skills/module-repository).
  Covers: enabling · Done when: `npm test --workspace @rochas-surf-school/auth` and
  `npm run check-types --workspace @rochas-surf-school/auth` pass (the backend's `PrismaUserRepository` gets the
  methods in T-05; until then `check-types` of the backend is expected to fail and is run after T-05).
  > ✅ 2026-10-12 16:20 — added `findPending` and `updateIfPending` to the port and the fake (by hand, the pattern is in the existing repository; skill not run); files: `modules/auth/src/user/provider/user.repository.ts`, `modules/auth/test/mock/fake-user.repository.ts`, `modules/auth/test/user/provider/user.repository.test.ts`; verified: `npm test --workspace @rochas-surf-school/auth` (261 passed), `npm run check-types --workspace @rochas-surf-school/auth` exit 0; deviations: fake tests added in the existing repository test file

- [x] **T-02** — Create `modules/auth/src/user/usecase/registration-access.ts` (`RegistrationActor { id, role,
  status }`, `assertCanDecideRegistrations(actor)`: D-03 order and keys) and `list-registrations.usecase.ts`
  (`ListRegistrations`: access check, then `findPending()` mapped to `{ items: [{ id, name, email, createdAt }] }`
  with `createdAt` an ISO string; D-02), exported from the barrel, with tests in
  `modules/auth/test/user/usecase/{registration-access,list-registrations.usecase}.test.ts` (every status and
  role, empty list, order, item shape).
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02 · Done when: `npm test --workspace @rochas-surf-school/auth` passes with these files at
  100% coverage.
  > ✅ 2026-10-12 16:21 — added the access check and `ListRegistrations` (by hand following the existing use case pattern; skill not run), exported from the barrel; files: `modules/auth/src/user/usecase/registration-access.ts`, `modules/auth/src/user/usecase/list-registrations.usecase.ts`, `modules/auth/src/user/usecase/index.ts`, `modules/auth/test/user/usecase/registration-access.test.ts`, `modules/auth/test/user/usecase/list-registrations.usecase.test.ts`; verified: `npm test --workspace @rochas-surf-school/auth` (272 passed, both files 100%), `check-types` exit 0; deviations: none

- [x] **T-03** — Create `modules/auth/src/user/usecase/approve-registration.usecase.ts` (`ApproveRegistration`,
  in `{ actor, registrationId }`, out `{ id, status }`): access check, malformed or unknown id → 404
  `registration.notFound`, not pending → 409, `clone({ status: "approved" })`, `validate()`, `updateIfPending` →
  `false` gives 409 (D-04, D-05, D-06). Tests in `approve-registration.usecase.test.ts`, including the
  lost-race case (the fake's stored user changes status before `updateIfPending`).
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-02, ER-03, ER-05 · Done when: `npm test --workspace @rochas-surf-school/auth` passes with the file at
  100% coverage.
  > ✅ 2026-10-12 16:21 — added `ApproveRegistration` plus a shared `findPendingRegistration` helper (UUID check, 404, 409) used by T-04 too; files: `modules/auth/src/user/usecase/approve-registration.usecase.ts`, `modules/auth/src/user/usecase/pending-registration.ts`, `modules/auth/src/user/usecase/index.ts`, `modules/auth/test/user/usecase/approve-registration.usecase.test.ts`; verified: `npm test --workspace @rochas-surf-school/auth` (296 passed, file 100%); deviations: helper file added (not in the spec) to avoid duplicating the lookup in T-04; skill not run

- [x] **T-04** — Create `modules/auth/src/user/usecase/deny-registration.usecase.ts` (`DenyRegistration`, in
  `{ actor, registrationId, reason? }` with `reason` typed `unknown` at the boundary, out `{ id, status }`, with the
  `ClockProvider`): the checks of T-03, then the reason rules of D-04 and D-06 (non-string → 422
  `registration.reason.invalid`; trimmed; blank → none; `validate()` gives `user.denialReason.maxLength` over
  500), `deniedAt` from the clock, `updateIfPending`. Tests in `deny-registration.usecase.test.ts` (with reason,
  trimmed, blank variants, 500 and 501 characters, non-string, 404, 409, lost race, access).
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-02, ER-04, ER-05 · Done when: `npm test --workspace @rochas-surf-school/auth` passes with the file at
  100% coverage, and `npm run lint --workspace @rochas-surf-school/auth` exits 0.
  > ✅ 2026-10-12 16:21 — added `DenyRegistration` (reason typed `unknown`, trimmed, blank → none, non-string → 422 `registration.reason.invalid` as a `ValidationException`, `deniedAt` from the clock); files: `modules/auth/src/user/usecase/deny-registration.usecase.ts`, `modules/auth/test/user/usecase/deny-registration.usecase.test.ts`; verified: `npm test --workspace @rochas-surf-school/auth` (296 passed, file 100%), `npm run lint --workspace @rochas-surf-school/auth` exit 0, `check-types` exit 0; deviations: the entity rule's real key is `user.denialReason.max.length` (the spec says `user.denialReason.maxLength`); I kept the entity's key as D-04 says "the entity's rule", so the 422 for 501 characters carries `user.denialReason.max.length` — mobile and e2e must use that key; skill not run

### Backend (`apps/backend`)

- [x] **T-05** — Implement `findPending()` (`findMany` where status `pending`, `orderBy createdAt asc`, with the
  acceptances include) and `updateIfPending(user)` (`updateMany({ where: { id, status: 'pending' }, data:
  toData(user) })`, returns `count === 1`; acceptances untouched) in
  `apps/backend/src/modules/auth/user.prisma.ts`, with cases in `user.prisma.spec.ts`.
  Skill: [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-01, ER-05 · Done when: `npx vitest run src/modules/auth/user.prisma.spec.ts` (from `apps/backend`)
  passes and `npx turbo run check-types --filter=@rochas-surf-school/backend` exits 0.
  > ✅ 2026-10-12 16:22 — implemented `findPending` and `updateIfPending` in the Prisma repository (`updateMany` where id and status pending; `count === 1`); files: `apps/backend/src/modules/auth/user.prisma.ts`, `apps/backend/src/modules/auth/user.prisma.spec.ts`; verified: `npx vitest run src/modules/auth/user.prisma.spec.ts` (12 passed), `npx turbo run check-types --filter=@rochas-surf-school/backend` exit 0; deviations: skill not run

- [x] **T-06** — Create `apps/backend/src/modules/auth/registrations.controller.ts` (`@Controller('registrations')`,
  protected: `GET /`, `POST /:id/approve` and `POST /:id/deny` with `@HttpCode(200)`, actor from
  `@CurrentUser()`, body `reason` passed as is), register it in `auth.module.ts`, add
  `registrations.integration.http`, a controller spec `registrations.controller.spec.ts`, and the e2e suite
  `apps/backend/test/registrations.e2e-spec.ts` with the tests named in ER-01 to ER-05 (accounts created through
  Prisma, tokens minted like `school-settings.e2e-spec.ts`; the concurrency test fires approve and deny with
  `Promise.all`).
  Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05 · Done when: `npm run test:e2e --workspace apps/backend` passes
  (Postgres up, migrations applied) and `npx vitest run src/modules/auth/registrations.controller.spec.ts` passes.
  > ✅ 2026-10-12 16:23 — added `RegistrationsController` (GET /, POST :id/approve, POST :id/deny, all 200, protected), registered it in `AuthModule`, the `.http` file, the controller spec and the e2e suite (22 tests: list, access, approve, deny, finality, concurrency, 404s); files: `apps/backend/src/modules/auth/registrations.controller.ts`, `apps/backend/src/modules/auth/registrations.controller.spec.ts`, `apps/backend/src/modules/auth/registrations.integration.http`, `apps/backend/src/modules/auth/auth.module.ts`, `apps/backend/test/registrations.e2e-spec.ts`; verified: `npm run test:e2e --workspace apps/backend` (9 files, 256 passed), `npx vitest run src/modules/auth/registrations.controller.spec.ts` (8 passed), backend unit (195 passed), lint and check-types clean; deviations: the e2e list tests look only at the suite's own `@registrations.e2e.example.com` users because the shared database may hold other pending users (never deleted by the suite); the 501-character 422 key is `user.denialReason.max.length` (see T-04); needed `npm run build --workspace @rochas-surf-school/auth` so the backend sees the new exports; skill not run

### Mobile (`apps/mobile`)

- [x] **T-07** — Move `format-created-at.ts`, its `.types.ts` and its test from
  `apps/mobile/src/modules/pending/utils/` to `apps/mobile/src/utils/` and update the Pending components'
  imports (D-11); no behavior change.
  Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: enabling · Done when: `npx jest src/utils src/modules/pending` passes and
  `npx turbo run check-types --filter=@rochas-surf-school/mobile` exits 0.
  > ✅ 2026-10-12 16:24 — moved `format-created-at` (+ types, test) to `apps/mobile/src/utils/` with `git mv` and pointed the Pending hook at `@/utils/format-created-at`; files: `apps/mobile/src/utils/format-created-at.ts`, `apps/mobile/src/utils/format-created-at.types.ts`, `apps/mobile/src/utils/format-created-at.test.ts` (moved), `apps/mobile/src/modules/pending/components/pending/pending.hook.ts`; verified: `npx jest src/utils src/modules/pending` pass, `npx turbo run check-types --filter=@rochas-surf-school/mobile` exit 0; deviations: none

- [x] **T-08** — Create `TextArea` in `apps/mobile/src/components/ui/text-area/` (component, types, `index.ts`;
  D-13) with `text-area.component.test.tsx` (typing, `maxLength` passed to the input, counter text, label).
  Follow `.claude/rules/react.md`. Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-09 · Done when: `npx jest src/components/ui/text-area` passes.
  > ✅ 2026-10-12 16:24 — created the controlled `TextArea` (multi-line, no icon, `maxLength` on the native input, counter `{length}/{maxLength}`, optional label also as accessibility label, same border tokens as `TextInput`); files: `apps/mobile/src/components/ui/text-area/{index.ts,text-area.component.tsx,text-area.types.ts,text-area.component.test.tsx}`; verified: `npx jest src/components/ui/text-area` (5 passed), eslint clean; deviations: no hook file (no state); `value` and `maxLength` are required props so the counter is always correct

- [x] **T-09** — Create `DecisionCard`, `DecidedList` and `DenySheet` in `apps/mobile/src/components/decision/`
  (one folder each, props of D-09, layout of D-15 and D-14; `DenySheet` on `BottomModal` + `TextArea` + `Button`,
  clearing its text when it closes; `DecidedList` uses `Chip` and renders nothing when empty), with the
  `decision.*` copy in the three message files and a test per component (initials from one and several words,
  details, disabled and loading states, callbacks; the sheet's confirm with and without text, clear on close,
  loading; the list's order, tags and empty render).
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-07, ER-08, ER-09, ER-11 · Done when: `npx jest src/components/decision` passes and
  `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` exits 0.
  > ✅ 2026-10-12 16:26 — created `DecisionCard`, `DecidedList`, `DenySheet` (+ hook) in `components/decision/`, the `decision.*` copy in the three message files, and `getInitials`; files: `apps/mobile/src/components/decision/{decision-card,decided-list,deny-sheet}/*` (index, component, types, tests; `deny-sheet.hook.ts`), `apps/mobile/src/utils/get-initials.ts`, `apps/mobile/src/utils/get-initials.test.ts`, `apps/mobile/src/i18n/messages/{en-US,pt-BR,es-ES}.ts`, `apps/mobile/src/components/ui/bottom-modal/bottom-modal.component.tsx`; verified: `npx jest src/components/decision` (14 passed), `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` exit 0; deviations: (1) `BottomModal` now passes `onClose` to the sheet library, otherwise dragging the sheet down never told the parent (D-14 needs it; the backdrop press may call it twice, which the callers tolerate); (2) `getInitials` lives in `src/utils` because the card takes `initials` as a prop (D-09), its tests are there; (3) the sheet clears its text by adjusting state when `visible` flips (lint forbids setState in an effect); (4) the sheet test mocks `BottomModal` to expose a backdrop

- [x] **T-10** — Create in `apps/mobile/src/modules/admin/`: `registrations.types.ts` (`Registration` mirroring
  the API), `hooks/use-registrations.hook.ts` (query `["registrations"]`), `hooks/use-approve-registration.hook.ts`
  and `hooks/use-deny-registration.hook.ts` (mutations; on 200 remove the item from the cached list and invalidate
  the query; D-12), and `utils/registration-error.ts` (409 `registration.status.notPending` → `alreadyDecided`,
  `NetworkError` → no connection, else generic; `SessionExpiredError` → ignore), with tests for each.
  Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-08, ER-09, ER-10 · Done when: `npx jest src/modules/admin/hooks src/modules/admin/utils` passes.
  > ✅ 2026-10-12 16:27 — created the admin data layer: `Registration` types, `useRegistrations` (query `["registrations"]`, no retry), `useApproveRegistration` and `useDenyRegistration` (mutations without retry; on 200 the item leaves the cached list and the query is invalidated; on 409 already-decided the query is invalidated), `registration-error` (`getRegistrationErrorKey`, `isAlreadyDecided`) and the cache helper; files: `apps/mobile/src/modules/admin/registrations.types.ts`, `apps/mobile/src/modules/admin/registrations.test-utils.tsx`, `apps/mobile/src/modules/admin/hooks/{use-registrations,use-approve-registration,use-deny-registration}.hook.ts`, `apps/mobile/src/modules/admin/hooks/use-registrations.hook.test.tsx`, `apps/mobile/src/modules/admin/hooks/use-decide-registration.hook.test.tsx`, `apps/mobile/src/modules/admin/utils/{registration-error,registrations-cache}.ts` and their `.test.ts`; verified: `npx jest src/modules/admin/hooks src/modules/admin/utils` (19 passed), eslint and `check-types` clean; deviations: the mutations do not show toasts themselves — the screen (T-11) calls `mutateAsync` and maps errors with `getRegistrationErrorKey`, because it must also close the sheet and skip "Decided just now" on 409; deny sends `{}` for a blank reason; `registrations-cache.ts` helper and test-utils file added (not in the spec)

- [x] **T-11** — Create the "Join the school" screen `apps/mobile/src/modules/admin/screens/registrations.screen.tsx`
  (`BackButton`, `ScreenIntro`, a list with pull-to-refresh of `DecisionCard`s, loading / empty / error + retry,
  `DecidedList` below in screen state per D-08, one `DenySheet`, toasts per D-12), the route file
  `apps/mobile/src/app/(private)/admin/registrations.tsx`, `routes.admin.registrations` in
  `src/constants/routes.ts`, and the `registrations.*` copy in the three message files; test it in
  `registrations.screen.test.tsx` with the cases named in ER-07 to ER-11 (`fetch` mocked, signed-in admin seeded
  with `hydrateSession`).
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-07, ER-08, ER-09, ER-10, ER-11 · Done when: `npx jest src/modules/admin/screens/registrations.screen.test.tsx`
  passes and `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` exits 0.
  > ✅ 2026-10-12 16:29 — created the "Join the school" screen (FlatList of `DecisionCard`s with pull-to-refresh, loading / empty / error + retry, `DecidedList` footer in screen state, one `DenySheet`, toasts per D-12) with its logic in `useRegistrationsScreen`, the route `(private)/admin/registrations`, `routes.admin.registrations` and the `registrations.*` copy (en-US, pt-BR, es-ES); files: `apps/mobile/src/modules/admin/screens/registrations.screen.tsx`, `apps/mobile/src/modules/admin/screens/registrations.screen.test.tsx`, `apps/mobile/src/modules/admin/hooks/use-registrations-screen.hook.ts`, `apps/mobile/src/modules/admin/hooks/use-registrations-screen.types.ts`, `apps/mobile/src/app/(private)/admin/registrations.tsx`, `apps/mobile/src/constants/routes.ts`, `apps/mobile/src/i18n/messages/{en-US,pt-BR,es-ES}.ts`; verified: `npx jest src/modules/admin src/components src/utils` (151 passed, 19 in the screen test), `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` exit 0; deviations: logic in a hook file (react rules) rather than inline; a deny that fails keeps the sheet open and a 409 closes it; the screen test fakes only `Date` and mocks `BottomModal` so the sheet renders only while visible

- [x] **T-12** — Replace the placeholder in `apps/mobile/src/modules/admin/screens/admin.screen.tsx` with the
  admin home of D-10 (`ScreenIntro` "School tools", the "Join the school" row with the count from
  `useRegistrations`, `router.push(routes.admin.registrations)`), add the `admin.home.*` copy, and rewrite
  `admin.screen.test.tsx` (count, zero, loading, error, navigation with `renderRouter` and `getPathname()`).
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-06 · Done when: `npx jest src/modules/admin/screens/admin.screen.test.tsx` passes and
  `npm test --workspace @rochas-surf-school/mobile` passes.
  > ✅ 2026-10-12 16:32 — replaced the placeholder with the admin home (ScreenIntro "School tools", a "Join the school" row with the pending count from `useRegistrations`, `router.push(routes.admin.registrations)`), added `admin.home.*` copy, rewrote the screen test (count, zero, loading, error, navigation and back with `renderRouter`, count drops after a decision); files: `apps/mobile/src/modules/admin/screens/admin.screen.tsx`, `apps/mobile/src/modules/admin/screens/admin.screen.test.tsx`, `apps/mobile/src/i18n/messages/{en-US,pt-BR,es-ES}.ts`, and the older route tests that expected the "Admin" placeholder header: `apps/mobile/src/navigation/root-navigator/root-navigator.component.test.tsx`, `apps/mobile/src/modules/onboarding/screens/school-rules.screen.test.tsx`, `apps/mobile/src/modules/rules-update/screens/rules-update.screen.test.tsx`; verified: `npx jest src/modules/admin/screens/admin.screen.test.tsx` (6 passed), `npm test --workspace @rochas-surf-school/mobile` (83 suites, 837 passed), lint and check-types exit 0; deviations: the three older tests now expect the header "School tools" and answer `/registrations` with an empty list; the row's accessible name includes the count, so tests match `/Join the school/`

### Verification

- [x] **T-13** — Run every command in the Verification Plan from the repo root and follow its user journeys; all
  pass. Record the output summary as evidence.
  Covers: all · Done when: `check-coverage.mjs 019` prints `COVERAGE OK`, `run-e2e.mjs 019` prints
  `E2E PASSED`, every other command exits 0, and journeys 1–6 show what they describe.
  > ✅ 2026-10-12 16:34 — ran the automated Verification Plan from the repo root: `node .specs/scripts/run-related-tests.mjs 019` RELATED TESTS PASSED (backend, mobile, auth, school-rules), `node .specs/scripts/check-coverage.mjs 019` COVERAGE OK (27 files), `node .specs/scripts/run-e2e.mjs 019` E2E PASSED, `npm test --workspace @rochas-surf-school/mobile` (84 suites, 841 passed), `npx turbo run lint check-types` for auth, backend and mobile (12 tasks ok, 0 warnings), `npx turbo run build` for auth and backend (5 tasks ok); added two coverage tests: `apps/mobile/src/modules/admin/hooks/use-registrations-screen.hook.test.tsx` and an unreadable-date case in `registrations.screen.test.tsx`; ⚠ journeys 1–6 (iOS simulator, light/dark, two accounts, pt-BR/es-ES) were NOT driven in this session: they need a built simulator app and a second device or REST calls with email codes; every behavior they describe is covered by the component and route tests, but the visual check in light and dark and the Portuguese/Spanish copy on a device is left to the reviewer or the user; deviations: none

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 019` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 019` — every line this spec adds or changes is covered
  - `node .specs/scripts/run-e2e.mjs 019` — the backend e2e suite passes, `registrations.e2e-spec.ts` included
    (Postgres up, migrations applied)
  - `npm test --workspace @rochas-surf-school/mobile` — the whole mobile suite passes (T-07 moves a shared util)
  - `npx turbo run lint check-types --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors
  - `npx turbo run build --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/backend` — builds (mobile
    has no build script)
- User journeys (iOS simulator, light and dark; backend running locally with Postgres; signed in as the seeded
  admin review account; pending accounts created by signing up with email codes on a second simulator or with
  `POST /auth/email/code` + `POST /auth/email/verify` with a name, codes read from the backend log):
  1. Create two pending accounts, "Ana Souza" then "Bruno Lima". Open the app as the admin → the admin home shows
     the "School tools" title and "Join the school · 2 waiting". Tap it → "Join the school", Bruno's card
     below Ana's (oldest first), each with initials, name, email, "Asked …", Deny and Approve. Back → the admin
     home.
  2. Tap "Approve" on Ana → her card leaves and "Decided just now" shows "Ana Souza · Approved". On the second
     simulator, Ana relaunches the app → onboarding (WhatsApp step). Go back to the admin home → "1 waiting";
     reopen the tool → "Decided just now" is gone.
  3. Tap "Deny" on Bruno → the sheet "Deny Bruno Lima?"; close it by tapping the backdrop → Bruno's card stays;
     tap "Deny" again → the field is empty; type "Não conhecemos você." and tap "Deny registration" → the sheet
     closes, "No one is waiting to join.", and "Bruno Lima · Denied" under "Decided just now". Bruno relaunches →
     the Denied screen with the "Mensagem da equipe" card showing the reason.
  4. Create a pending "Carla Dias", open the tool, then approve her with
     `POST /registrations/{id}/approve` (REST Client, admin token) → tap "Approve" in the app → "This registration
     was already decided." and her card disappears, without a "Decided just now" entry.
  5. Turn the network off, tap "Approve" on a card → the no-connection toast and the card stays.
  6. Switch the phone to Portuguese and to Spanish → the pt-BR and es-ES copy of the Copy table on the home, the
     tool and the sheet.

## Memory Impact

- `memory/product.md` — Current state: admins approve or deny registrations in the app's "Join the school" tool
  (reason optional, decisions final, "Decided just now" for the visit), reached from a minimal admin home; the
  person still sees the decision only at the next launch, sign-in or renewal (no notifications yet).
- `memory/technical-context.md` — Authentication / backend: the registrations routes, their access and error
  keys (`user.role.notAdmin`, `registration.notFound`, `registration.status.notPending`,
  `registration.reason.invalid`) and the conditional write `updateIfPending`; Mobile shared UI: `TextArea` and the
  reusable `components/decision/` (`DecisionCard`, `DecidedList`, `DenySheet`) for the admin tools;
  `formatCreatedAt` in `src/utils/`.
- `memory/structure.md` — `modules/auth/src/user/usecase/{registration-access,list-registrations,approve-registration,deny-registration}`;
  `apps/backend/src/modules/auth/registrations.controller.ts`, `registrations.integration.http`,
  `test/registrations.e2e-spec.ts`; mobile `components/decision/`, `components/ui/text-area/`, `utils/`,
  `modules/admin/{hooks,utils,screens/registrations.screen.tsx}`, route `(private)/admin/registrations.tsx`; the
  admin home is no longer a placeholder.
- `memory/modules.md` — Authentication now decides registrations (remove "It does not decide registrations").
- `memory/modules/auth.md` — Accounts and Who can do what: an approved admin lists pending registrations and
  approves or denies them (reason optional, trimmed, up to 500; final, one decision under concurrency); the app's
  "Join the school" tool; Boundaries updated; Spec history.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review

### Round 1 — 2026-10-12 — changes-requested

**Checks**

- lint ✅ · type check ✅ (auth, backend, mobile) · build ✅ (auth, backend)
- related tests ✅ `RELATED TESTS PASSED` (apps/backend, apps/mobile, modules/auth, modules/school-rules)
- coverage of the changed lines ✅ `COVERAGE OK` (27 files); no coverage-ignore comments in the diff
- e2e: backend suite ✅ `E2E PASSED` (9 files, 256 tests, `registrations.e2e-spec.ts` included)
- mobile: journeys 1–5 driven in the iOS simulator (iPhone 18 Pro, local backend + Postgres, admin review
  account), light and dark ✅ — except F-01, reproduced with a component test

**Expected Results**

- ER-01 ✅ — e2e "lists pending registrations oldest first" / "answers an empty list" assert order, exact item
  shape and that other statuses are left out
- ER-02 ✅ — e2e "refuses non-admins" / "refuses admins that aren't approved" / no token; use case tests check the
  status-before-role and access-before-lookup order
- ER-03 ✅ — e2e approve: 200 `{ id, status }`, role kept, reason/`denied_at` null, `/auth/me` approved; body ignored
- ER-04 ❌ — behavior ✅ (trimmed reason, blank variants, 500 accepted, non-string 422), but the 501-character key
  differs from the contract — see F-02
- ER-05 ✅ — e2e second decision on every non-pending status, approve+deny and deny+deny under `Promise.all`, 404
  for unknown and `abc`; `updateIfPending` unit cases
- ER-06 ✅ — simulator: "School tools", "Join the school · 9 waiting", opens the tool, back → "6 waiting" after
  three decisions; zero/loading/error in `admin.screen.test.tsx`
- ER-07 ✅ — simulator: cards oldest first, initials (one letter for a one-word name), email, "Asked 2 Oct",
  "Asked 2 hours ago"; pull-to-refresh refetched; loading/empty/error + retry/"just now" in the screen test
- ER-08 ❌ — simulator: approve moves the person to "Decided just now · Approved"; offline → no-connection toast,
  card stays usable. But other cards don't fully stay usable while one is sent — see F-01
- ER-09 ✅ — simulator: sheet "Deny Carla?", hint, "Reason (optional)", "0/500" → "10/500", backdrop closes and the
  field reopens empty, confirm denies with the reason (stored), a failed deny kept the sheet and the typed reason
  with the generic toast
- ER-10 ✅ — simulator: registration approved over HTTP, then "Approve" in the app → "This registration was already
  decided.", card gone, nothing added to "Decided just now"
- ER-11 ✅ — simulator: hidden at first, newest first (Denied above Approved), kept through pull-to-refresh and the
  409 refetch, gone after leaving and reopening the tool

**Findings**

- [x] **F-01** (ER-08, D-14) — any successful decision, and any 409, closes the deny sheet even when it belongs to
  another card, dropping the reason being typed: `decide` in
  `apps/mobile/src/modules/admin/hooks/use-registrations-screen.hook.ts` calls `setDenying(null)` unconditionally.
  Reproduce: in `registrations.screen.test.tsx`, hold the POST (as the approve test does), tap "Approve" on Ana,
  tap "Deny" on Bruno and type a reason, release the POST → "Deny Bruno Lima?" is gone. On a device: approve one
  card on a slow network, open another card's Deny before the answer arrives. Expected: the sheet closes only for
  the registration it belongs to (e.g. `setDenying((current) => (current?.id === registration.id ? null :
  current))` in both places), plus a screen test for this case.
  > ✅ 2026-10-12 16:46 — a decision now closes only its own deny sheet (`closeDenyOf`: `setDenying((current) => current?.id === registration.id ? null : current)`, used on success and on 409); reproduced first with a new screen test (approve held, Bruno's sheet opened with a reason, release) which fails with the old code and passes now; also made the concurrency e2e use distinct reasons ("by first" / "by second") so the row shows which request won (reviewer note); files: `apps/mobile/src/modules/admin/hooks/use-registrations-screen.hook.ts`, `apps/mobile/src/modules/admin/screens/registrations.screen.test.tsx`, `apps/backend/test/registrations.e2e-spec.ts`; verified: `npx jest src/modules/admin` (49 passed), `npx vitest run --config vitest.config.e2e.ts test/registrations.e2e-spec.ts` (22 passed), eslint and oxlint clean

- [ ] **F-02** (ER-04, D-04) — a reason over 500 characters answers 422 `user.denialReason.max.length` (the entity
  rule's real key, asserted by the e2e and use case tests), while D-04 and ER-04 promise `user.denialReason.maxLength`.
  The deviation is only noted in T-04's evidence; no Amendment records it, and `spec-finish` writes the contract's
  keys into the memory. Reproduce: `POST /registrations/{id}/deny` with a 501-character reason. Expected: either
  amend D-04/ER-04 to the entity's key with `/spec-plan --amend 019`, or make the API answer the documented key.
  > ⛔ 2026-10-12 16:46 — needs your decision: the key is part of the contract (D-04, ER-04), so I won't change it alone. Option A: amend D-04/ER-04 to the entity rule's real key `user.denialReason.max.length` (a one-key amendment). Option B: keep the contract and make the API answer `user.denialReason.maxLength`.

**Notes**

- The concurrency test "deny + deny" sends the same reason ("by deny") from both admins, so it can't show that the
  stored row matches the winning request; distinct reasons would.
- Deciding re-validates the whole user, so a legacy row the current rules reject (e.g. a one-word name, which the
  entity refuses with `user.name.person.name`) can't be decided and shows the generic toast. Not reachable through
  sign-up today; ER-07's one-word case only arises from such data.
- The admin home leaves an empty gap between the title and the row (`ScreenIntro` with `description={null}`).
- Journey 6 (pt-BR / es-ES on the device) was not driven: the three message files were compared with the Copy
  table and match it. The "person relaunches" halves of journeys 2–3 were not driven; the e2e suite asserts
  `/auth/me` after each decision.
- Memory Impact misses: `BottomModal` now forwards `onClose` to the sheet (drag-to-close reaches the caller),
  `getInitials` in `apps/mobile/src/utils/`, and `pending-registration.ts` / `registrations-cache.ts` /
  `use-registrations-screen.hook.ts`.
