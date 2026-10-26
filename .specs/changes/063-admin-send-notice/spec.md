---
id: "063"
slug: admin-send-notice
title: Admin sends a notice to everyone, students or instructors
template: quick
status: in-review
created: 2026-10-26
started: 2026-10-26
base_commit: 880f04238a086ae12a8c3da0d79e5f95865d0819
fronts: [backend, mobile]
depends_on: []
---

# 063 — Admin sends a notice to everyone, students or instructors

## Goal

Admins can write a notice (title and message), pick its audience (everyone, students only or instructors only),
see how many people will receive it, confirm, and send it as a notification to each of them. Recipients see it
as written on their notifications screen and as a push. Design: PAINEL-07 and PAINEL-07A in
[admin-app.html](../../../.docs/designs/admin-app.html).

## Context

- Requirements: [requirements.md → Broadcasts](../../../.docs/requirements.md#broadcasts) — audiences follow roles, only approved, active users receive them; [requirements.md → Broadcast confirmation](../../../.docs/requirements.md#broadcast-confirmation) — the admin sees the recipient count and confirms; [requirements.md → Text written by admins](../../../.docs/requirements.md#text-written-by-admins) — shown as written, in every language.
- Existing code this changes: `modules/notifications/src/notification/` (types, `RecipientsProvider`, `Notify`), `apps/backend/src/modules/notifications/` (controller, `push-messages.ts`, `recipients.prisma.ts`), `apps/mobile/src/modules/admin/screens/admin.screen.tsx` (tools list), `apps/mobile/src/modules/notifications/` (rows and taps). No broadcast exists today.

## Decisions

| ID | Decision | Reason |
| --- | --- | --- |
| D-01 | The title is required, trimmed, 1–60 characters; the message is required, trimmed, 1–500 characters. | Push-friendly lengths; the requirements set no limit. The backend enforces it and the mobile form mirrors it. |
| D-02 | The count is a live read for the chosen audience; sending resolves the recipients again at send time. | The count is advisory, and sending never uses a stale list. |
| D-03 | The admin check (role admin, status approved) lives in the use cases through an actor, as in school-rules. | Keeps the existing convention; no new guard. |
| D-04 | The sender receives the notice only when the audience is "everyone". | The requirements say "everyone" includes admins and audiences follow roles. |
| D-05 | No history of sent notices; tapping a `broadcast` push or row only marks it read and shows the current home. | A notice has no screen of its own; a history is not requested. |

## Expected Results

### ER-01 — Count and send a notice

- **Front:** backend
- **Behavior:** Given an approved admin, when they ask for the recipients of an audience, then they get the number of approved users of that audience (everyone = students, instructors and admins; students; instructors). When they send a notice with a valid title and message, then one `broadcast` notification (title and message in its params) is stored for each of those users before any push, and each phone of each recipient gets a push with the title and message as written.
- **Edge and error cases:** pending, denied, deleted or removed users never receive it; an audience with no recipients stores and sends nothing; a non-admin or non-approved actor is rejected (forbidden) for both calls; an unknown audience, or a blank or over-limit (D-01) title or message, is rejected with a validation error and stores nothing.
- **Verify by:** `npx vitest run src/modules/notifications` (from `apps/backend`) and the `modules/notifications` use case specs · tests named for each case above.

### ER-02 — Compose, confirm and send from the admin app

- **Front:** mobile
- **Behavior:** Given an admin on the Home tab, when they open the "Send notice" tool, then they see an audience selector (everyone, students, instructors), a title field and a message field, with the live recipient count for the selected audience. When they press "Send" with both fields filled and a count above zero, then a confirm sheet names the audience and the count, and on confirming the notice is sent, the screen closes and a toast confirms it.
- **Edge and error cases:** "Send" is disabled while a field is blank or the count is zero or still loading; the fields stop at the D-01 limits; cancelling the sheet changes nothing; a failed send shows an error and keeps the text; a failed count disables "Send".
- **Verify by:** `npx jest src/modules/notices` and `npx jest src/modules/admin/screens` (from `apps/mobile`) · a test per case above.

### ER-03 — Recipients see the notice as written

- **Front:** mobile
- **Behavior:** Given a user who received a `broadcast`, when they open the notifications screen, then the row shows the title and message exactly as written, with its own icon, in every app language. When they tap the row or its push, then the notification is marked read and the app shows the current home.
- **Edge and error cases:** a broadcast push received with the app open refreshes the notifications list and the bell's unread count, as any push does; a user with pushes off still sees the row.
- **Verify by:** `npx jest src/modules/notifications` (from `apps/mobile`) · tests for the icon, the row text and the tap target.

## Tasks

### Backend (`modules/notifications`, `apps/backend`)

- [x] **T-01** — In `modules/notifications/src/notification/`, add the `broadcast` type to `NOTIFICATION_TYPES`, `RecipientsProvider.findApprovedUserIdsByAudience(audience)` (the in-memory test double too) and the `CountBroadcastRecipients` and `SendBroadcast` use cases (admin check through the actor, D-01 validation, `Notify` for the send; skill `module-use-case`), exported from the module index, with unit specs for every case in ER-01.
  Covers: ER-01 · Done when: `npm test -w @rochas-surf-school/notifications` passes.
  > ✅ 2026-10-26 12:00 — added the `broadcast` type, `RecipientsProvider.findApprovedUserIdsByAudience` (audiences `all` | `students` | `instructors`), the admin check/validation helpers and the `CountBroadcastRecipients` / `SendBroadcast` use cases (audience values and error codes `broadcast.role.notAdmin`, `broadcast.audience.*`, `broadcast.title.*`, `broadcast.message.*`); files: `modules/notifications/src/notification/model/notification.entity.ts`, `modules/notifications/src/notification/provider/recipients.provider.ts`, `modules/notifications/src/notification/usecase/broadcast-access.ts`, `modules/notifications/src/notification/usecase/count-broadcast-recipients.usecase.ts`, `modules/notifications/src/notification/usecase/send-broadcast.usecase.ts`, `modules/notifications/src/notification/usecase/index.ts`, `modules/notifications/test/mock/fake-recipients.provider.ts`, `modules/notifications/test/notification/usecase/broadcast.usecase.test.ts`; verified: `npm test -w @rochas-surf-school/notifications` (179 passed, 100% coverage), `check-types`, `lint`, `build` clean; deviations: none
- [x] **T-02** — In `apps/backend/src/modules/notifications/`, implement the audience query in `recipients.prisma.ts`, add `GET /notifications/broadcast/recipients?audience=` and `POST /notifications/broadcast` to the controller (skill `backend-nest-controller`), render `broadcast` in `push-messages.ts` (push and in-app, title and message as written in every locale), and extend `notifications.integration.http`, with specs for the rendering and the controller.
  Covers: ER-01 · Done when: `npx vitest run src/modules/notifications` passes from `apps/backend`.
  > ✅ 2026-10-26 12:05 — `PrismaRecipientsProvider.findApprovedUserIdsByAudience` (approved users by role), `GET /notifications/broadcast/recipients?audience=` (200 `{ count }`) and `POST /notifications/broadcast` (204) on the controller (the admin check and validation run in the use cases, 403/422 through the shared error filter), `broadcast` rendered in `push-messages.ts` (title and message as written in every locale, push and in-app); files: `apps/backend/src/modules/notifications/recipients.prisma.ts`, `apps/backend/src/modules/notifications/recipients.prisma.spec.ts`, `apps/backend/src/modules/notifications/notifications.controller.ts`, `apps/backend/src/modules/notifications/notifications.controller.spec.ts`, `apps/backend/src/modules/notifications/push-messages.ts`, `apps/backend/src/modules/notifications/push-messages.spec.ts`, `apps/backend/src/modules/notifications/notifications.integration.http`; verified: `npx vitest run src/modules/notifications` (213 passed), `npm run check-types` clean, `npm run lint` no errors (only existing warnings in e2e specs); deviations: the controller got three more constructor dependencies (push ticket repository, Expo push provider, recipients provider) to build `Notify`, and the "other types" count in `push-messages.spec.ts` went from 17 to 18.

### Mobile (`apps/mobile`)

- [x] **T-03** — In `src/modules/notifications/`, give `broadcast` an icon and tone in `utils/notification-icon.ts`, make its tap and received-push handling only mark read and refresh (`utils/notification-target.ts`, the response and received hooks), with tests.
  Covers: ER-03 · Done when: `npx jest src/modules/notifications` passes.
  > ✅ 2026-10-26 12:15 — `broadcast` has the megaphone icon on the info tone; it leads nowhere (`notificationTarget` is null), so a tapped push already marks read and shows the home through `router.replace(routes.home)`, and a tapped row now does the same in `useNotificationsScreen`; the received hook already reloads the list and the unread count for every push, now covered for `broadcast`; files: `apps/mobile/src/modules/notifications/utils/notification-icon.ts`, `apps/mobile/src/modules/notifications/utils/notification-icon.test.ts`, `apps/mobile/src/modules/notifications/utils/notification-target.test.ts`, `apps/mobile/src/modules/notifications/screens/notifications.screen.hook.ts`, `apps/mobile/src/modules/notifications/screens/notifications.screen.test.tsx`, `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.test.tsx`, `apps/mobile/src/modules/notifications/hooks/use-notification-received.hook.test.tsx`; verified: `npx jest src/modules/notifications` (328 passed), `check-types` and eslint clean; deviations: none
- [x] **T-04** — Create `src/modules/notices/` (screen, hooks, types, confirm sheet with `BottomModal`, audience `SegmentedControl`, `TextInput`/`TextArea`, count and send hooks on the notifications API), add `routes.admin.sendNotice` and the route file `src/app/(private)/admin/send-notice.tsx`, a "Send notice" `AdminToolRow` in the tools section of `admin.screen.tsx`, and the i18n keys in pt-BR, es-ES and en-US, following PAINEL-07 and PAINEL-07A and `.claude/rules/react.md`, with component and hook tests.
  Covers: ER-02 · Done when: `npx jest src/modules/notices src/modules/admin` passes.
  > ✅ 2026-10-26 13:00 — created `src/modules/notices/` (screen with audience `SegmentedControl`, title `TextInput`, message `TextArea`, live recipient count, Send disabled while a field is blank or the count is zero, loading or failed; confirm sheet on `BottomModal` naming the audience and the count; send closes the screen and shows a toast; a failed send keeps the text and shows an error), the route `routes.admin.sendNotice` with `src/app/(private)/admin/send-notice.tsx`, a "Send notice" `AdminToolRow` in the tools section, and the i18n keys in en-US, pt-BR and es-ES; files: `apps/mobile/src/modules/notices/notices.types.ts`, `apps/mobile/src/modules/notices/notices.constants.ts`, `apps/mobile/src/modules/notices/hooks/use-notice-recipients-count.hook.ts`, `apps/mobile/src/modules/notices/hooks/use-notice-recipients-count.hook.test.tsx`, `apps/mobile/src/modules/notices/hooks/use-send-notice.hook.ts`, `apps/mobile/src/modules/notices/hooks/use-send-notice.hook.test.tsx`, `apps/mobile/src/modules/notices/components/send-notice-confirm-sheet/` (`index.ts`, `.component.tsx`, `.types.ts`, `.component.test.tsx`), `apps/mobile/src/modules/notices/screens/send-notice.screen.tsx`, `apps/mobile/src/modules/notices/screens/send-notice.screen.hook.ts`, `apps/mobile/src/modules/notices/screens/send-notice.screen.types.ts`, `apps/mobile/src/modules/notices/screens/send-notice.screen.test.tsx`, `apps/mobile/src/modules/notices/screens/send-notice.screen.hook.test.tsx`, `apps/mobile/src/app/(private)/admin/send-notice.tsx`, `apps/mobile/src/constants/routes.ts`, `apps/mobile/src/modules/admin/screens/admin.screen.tsx`, `apps/mobile/src/modules/admin/screens/admin.screen.test.tsx`, `apps/mobile/src/i18n/messages/en-US.ts`, `apps/mobile/src/i18n/messages/pt-BR.ts`, `apps/mobile/src/i18n/messages/es-ES.ts`; verified: `npx jest src/modules/notices src/modules/admin src/modules/notifications` (28 suites, 434 passed; notices module 100% covered), `tsc --noEmit` and ESLint clean; deviations: the screen shows the header title plus a `ScreenIntro` (no collapsing title) and the Send button sits at the end of the form instead of pinned to the bottom; the PAINEL-07/07A designs are images in the bundle, so the layout follows the existing admin form screens (school settings) rather than a pixel check.
### Verification

- [x] **T-05** — Run every command in the Verification Plan from the repo root; all pass. Record the output summary as evidence. Covers: all · Done when: every command exits 0.
  > ✅ 2026-10-26 13:30 — ran the Verification Plan from the repo root; files: none; verified: `node .specs/scripts/run-related-tests.mjs 063` (RELATED TESTS PASSED: backend 378, mobile 1679, modules/notifications 179), `node .specs/scripts/check-coverage.mjs 063` (COVERAGE OK, 21 files), `npx turbo run lint check-types build --concurrency=1 --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile` (27/27 tasks, exit 0); deviations: the first turbo run failed because backend `build` and `check-types` ran `prisma generate` in parallel (EEXIST), so it was rerun with `--concurrency=1`; e2e suites were not run (not in the Verification Plan).

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 063` — the related tests pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 063` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile` — no errors.

## Memory Impact

- `memory/product.md` — add the admin notice (broadcast) to the notification concepts, if it lists them.
- `memory/structure.md` — the `send-notice` route and the `notices` mobile module.
- `memory/modules/notifications.md` — the `broadcast` type (params, push text as written, audiences, who receives it, tap behavior), the recipient count and send endpoints.

## Amendments

## Review
