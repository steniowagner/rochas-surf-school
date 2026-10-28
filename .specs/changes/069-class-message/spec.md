---
id: "069"
slug: class-message
title: Admin sends a message to one class
template: quick
status: in-review
started: 2026-10-27
base_commit: 6f5a9895ee828032a5cf4e986970fe2b1d390605
created: 2026-10-27
fronts: [backend, mobile]
depends_on: ["068"]
---

# 069 — Admin sends a message to one class

## Goal

An admin can write a message (title and text) on a class that hasn't finished and send it only to that class's
people: its instructors and its students with a seat or a request. They get a push and a notification that
opens the class. Today the class tools' "Send message" card opens the school-wide notice screen instead; it
will open that same screen in a class mode, which shows the class and its people instead of the audience picker.
Design reference for the content: the `msgAula` sheet ("Mensagem à turma") in
[admin-app.html](../../../.docs/designs/admin-app.html).

## Context

- Requirements: [user-journeys.md → Deferred to development](../../../.docs/user-journeys.md#deferred-to-development)
  — "a message from an admin to one class"; [requirements.md → Text written by admins](../../../.docs/requirements.md#text-written-by-admins)
  — shown as written, whatever the language.
- Existing code this changes:
  - `modules/classes/src/school-class/` — `CancelClass` (the model for access, states and notifying),
    `ClassAudienceReader.findClassAudience` (the students with an approved or pending enrolment) and the
    `ClassChangeNotifier` port, with its fake in `modules/classes/test/mock/fake-class-change.notifier.ts`.
  - `modules/notifications/src/notification/model/notification.entity.ts` — `NOTIFICATION_TYPES`; `type` is a
    plain string column, so a new type needs no migration.
  - `apps/backend/src/modules/classes/classes.controller.ts` (`POST :id/cancel` is the model),
    `apps/backend/src/modules/notifications/notifications.class-change-notifier.ts` (the port's adapter) and
    `push-messages.ts` (push and in-app text per type and locale).
  - `apps/mobile/src/modules/classes/screens/class-details.screen.hook.ts` — `notify` pushes
    `routes.admin.sendNotice`; `messageCount` counts instructors, students and pending requests, the sender
    included when they teach the class. The tools sheet (`components/class-tools-sheet/`) shows only to admins
    on a class that hasn't finished and isn't cancelled (`showTools`).
  - `apps/mobile/src/modules/notices/` — the Send notice screen of spec 063 (`screens/send-notice.screen.tsx` and
    its hook, `components/send-notice-confirm-sheet/`, `hooks/use-send-notice.hook.ts`), routed at
    `/admin/send-notice` (`src/app/(private)/admin/send-notice.tsx`, `routes.admin.sendNotice`): an audience
    `SegmentedControl` ("Quem recebe") with the recipient count, title and message fields, a pinned "Enviar"
    button and a confirm sheet; its description reads "Escreva um título e uma mensagem. Todos do público
    recebem como notificação.".
  - `apps/mobile/src/modules/notifications/utils/` — `notification-icon.ts` and `notification-target.ts`.

## Decisions

| ID | Decision | Reason |
|---|---|---|
| D-01 | The recipients are the class's instructors and its students with an approved or pending enrolment (waiting list included), each person once, never the sender. Guests get nothing. | The same people the cancellation notice reaches, and what the tools card already counts. Guests have no account. |
| D-02 | The title is required, trimmed, 1–60 characters; the message is required, trimmed, 1–500 characters. Error codes `class.message.title.*` and `class.message.text.*`. | The limits of the admin notices (spec 063) and of the design's fields. |
| D-03 | A message can be sent while the class hasn't finished and isn't cancelled (not started or started). | The same window as the tools sheet and as cancelling. |
| D-04 | ~~No confirm step: the sheet's button already reads "Enviar a N pessoas". The design's stack of avatars becomes a people icon.~~ (removed: replaced by D-09, the class mode of the Send notice screen) | As in the design; profile photos aren't built, so avatars would only be initials. |
| D-05 | `SendClassMessage` lives in `modules/classes`, checks access with `assertCanManageClasses`, reads the students with `ClassAudienceReader.findClassAudience`, and notifies through a new `ClassChangeNotifier.classMessage` method. Notifying never changes the answer (errors are logged and swallowed), as in `CancelClass`. | Reuses the class's access rules, audience and notifier instead of a new port. |
| D-06 | The `class.message` push and row: the title is the admin's title as written; the body is the class line and the message, as a cancellation message does — pt-BR `"Surf, sáb 25/10 às 09:00: <message>"`, es and en in the same form as `class.cancelled`. Params: `classId`, `discipline`, `startsAt`, `title`, `message`. | Text written by admins is never translated; the class line tells which class it is about. |
| D-07 | The count on the tools cards and on the Send notice screen in class mode leaves out the admin when they teach the class. | The sender is never notified (D-01); the cancel card's count was off by one for the same reason. |
| D-08 | After sending, the screen closes and the toast "Mensagem enviada" uses the success tone of spec 068. | Success toasts look like success once 068 lands, hence `depends_on`. |
| D-09 | The class message reuses the Send notice screen in a class mode, opened from the tools card with the class id (a `classId` param on the existing route); without it the screen is unchanged. In class mode: the audience `SegmentedControl` is replaced by a view of the class — its date, time and location, and the people who receive the message; how the people are shown is the coding agent's choice, but they must match D-01 (instructors and students with a seat by name, and at least the number of students with a pending request, since the class details carry only that number); the title and the description name the class instead of everyone (pt-BR "Mensagem para a turma" and "Escreva um título e uma mensagem. Os instrutores e os alunos desta aula recebem como notificação."; es-ES and en-US written to match); the confirm sheet stays ("Enviar a N pessoas?") with a line naming the class's people instead of an audience. | One compose screen for admins instead of a second one; the confirm stays because a sent message can't be deleted. |

## Expected Results

### ER-01 — Send a message to a class

- **Front:** backend
- **Behavior:** Given an approved admin and a class that hasn't finished, when they send
  `POST /classes/:id/message` with a valid `{ title, message }`, then it answers 204, one `class.message`
  notification (params of D-06) is stored for each recipient of D-01 before any push, and each of their phones
  gets a push with the D-06 title and body.
- **Edge and error cases:** an unknown or malformed id answers 404 `class.notFound`; a finished class answers
  409 `class.finished` and a cancelled one 409 `class.cancelled`; a non-admin or non-approved actor answers
  403; a blank or over-limit title or message answers 422 (D-02) and stores nothing; the sender is not notified
  even when they teach the class; a class with nobody to tell answers 204 and stores nothing; a person who is
  both an instructor and in the audience is told once; a failing notifier still answers 204.
- **Verify by:** `npm test -w @rochas-surf-school/classes` (`send-class-message.usecase.test.ts`, a test per
  case), `npx vitest run src/modules/classes src/modules/notifications` (from `apps/backend`) and the
  "class message" tests of `test/classes.e2e-spec.ts` (`npm run test:e2e`).

### ER-02 — Compose and send from the class

- **Front:** mobile
- **Behavior:** Given an admin on a class's tools sheet, when they tap "Send message", then the Send notice
  screen opens in class mode (D-09): the title "Mensagem para a turma", the class description, the class's
  date, time and location, the people who will receive it, the title and message fields and the send button,
  with no audience selector. When they fill both fields, send and confirm on the sheet ("Enviar a N pessoas?",
  a line naming the class's people), then the message is sent to that class (`POST /classes/:id/message`),
  the screen closes and the success toast "Mensagem enviada" shows.
- **Edge and error cases:** the send button is disabled while a field is blank or nobody would receive it
  (N = 0); the fields stop at 60 and 500 characters; closing the confirm sheet sends nothing and keeps the
  text; a failed send shows the error toast (no connection, or the 409 texts for a finished or cancelled class)
  and keeps the text; a second tap while sending sends nothing; N leaves out the admin when they teach the
  class (D-07), on the screen and on both tools cards; opened without a class id, the screen is the notice
  screen of spec 063, unchanged.
- **Verify by:** `npx jest src/modules/notices src/modules/classes` (from `apps/mobile`) · tests for the screen
  in both modes, the send hook and the class details screen, one per case; in the iOS simulator, an admin sends
  a message to a class with a student, and the student's phone gets it.

### ER-03 — Recipients see the message and open the class

- **Front:** mobile
- **Behavior:** Given a user who received a `class.message`, when they open the notifications screen, then
  its row shows the title and the D-06 body as written, with the `chatbubble-outline` icon on the info tone;
  when they tap the row or its push, then it is marked read and the class's details open.
- **Edge and error cases:** a push received with the app open refreshes the notifications list and the unread
  count, as any push does; a user with pushes off still sees the row; an instructor and a student both land on
  their own class details route.
- **Verify by:** `npx jest src/modules/notifications` (from `apps/mobile`) · tests for the icon, the tap target
  for each role, and the row.

## Tasks

### Backend (`modules/classes`, `modules/notifications`, `apps/backend`)

- [x] **T-01** — In `modules/notifications/src/notification/model/notification.entity.ts`, add `class.message`
  to `NOTIFICATION_TYPES`. In `modules/classes/src/school-class/`, add the D-02 limits to the model, the
  `ClassMessage` event and `classMessage` method to `ClassChangeNotifier` (and to
  `test/mock/fake-class-change.notifier.ts`), and the `SendClassMessage` use case (D-01, D-03, D-05; skill
  `module-use-case`), exported from the module index, with `test/school-class/usecase/send-class-message.usecase.test.ts`
  covering every case of ER-01.
  Covers: ER-01 · Done when: `npm test -w @rochas-surf-school/classes` and
  `npm test -w @rochas-surf-school/notifications` pass.
  > ✅ 2026-10-27 22:10 — added `class.message` to `NOTIFICATION_TYPES`; `CLASS_MESSAGE_TITLE_MAX` (60) and
  > `CLASS_MESSAGE_TEXT_MAX` (500); the `ClassMessage` event and `ClassChangeNotifier.classMessage` (and the fake's
  > `messageEvents`); `SendClassMessage` (access → id → title/text, codes `class.message.title.*` /
  > `class.message.text.*` → state; instructors and the deduplicated audience, never the sender, someone who teaches
  > and is in the audience told once as an instructor; nobody → no call; a failed audience read tells the instructors
  > only; a failing notifier is swallowed), exported from the usecase index, with a test per ER-01 case (27 tests,
  > written first and seen failing); files: `modules/notifications/src/notification/model/notification.entity.ts`,
  > `modules/notifications/test/notification/model/notification.entity.test.ts`,
  > `modules/classes/src/school-class/model/class-limits.ts`,
  > `modules/classes/src/school-class/provider/class-change-notifier.provider.ts`,
  > `modules/classes/src/school-class/usecase/send-class-message.usecase.ts`,
  > `modules/classes/src/school-class/usecase/index.ts`, `modules/classes/test/mock/fake-class-change.notifier.ts`,
  > `modules/classes/test/school-class/provider/fake-class-change.notifier.test.ts`,
  > `modules/classes/test/school-class/usecase/send-class-message.usecase.test.ts`; verified:
  > `npm test -w @rochas-surf-school/classes` (40 suites, 606 passed; the use case 100% covered),
  > `npm test -w @rochas-surf-school/notifications` (18 suites, 194 passed, 100%), `check-types` and `lint` of
  > `classes` clean; deviations: the `module-use-case` skill's mandatory readings in `modules/auth`
  > (`register-user.usecase.ts`, its test, `fake-crypto.provider.ts`) no longer exist, so the use case follows the
  > skill's few-shots and the module's own `CancelClass`.
- [x] **T-02** — In `apps/backend`, add `POST /classes/:id/message` (204) to `src/modules/classes/classes.controller.ts`
  (skill `backend-nest-controller`), `classMessage` to `src/modules/notifications/notifications.class-change-notifier.ts`,
  the `class.message` text in pt-BR, es and en to `push-messages.ts` (D-06), and the requests to
  `classes.integration.http`, with specs for the controller, the adapter and the rendering, and "class message"
  tests in `test/classes.e2e-spec.ts` (stored notifications per recipient, sender left out, 403, 404, 409, 422).
  Covers: ER-01 · Done when: `npx vitest run src/modules/classes src/modules/notifications` and
  `npm run test:e2e -- test/classes.e2e-spec.ts` pass from `apps/backend`.
  > ✅ 2026-10-27 21:40 — `POST /classes/:id/message` (204, protected) builds `SendClassMessage` with the class
  > repository, the audience reader, the change notifier and the clock, passing `body?.title` / `body?.message`;
  > `NotificationsClassChangeNotifier.classMessage` stores and pushes one `class.message` per person (instructors and
  > students, each once) with `classId`, `discipline`, `startsAt`, `title`, `message`, logging and swallowing errors;
  > `push-messages.ts` writes the title as written and the body "<discipline>, <weekday> <day> <at> <time>: <message>"
  > in pt-BR / es / en, the same in the app (`renderInApp`); four requests in `classes.integration.http`, placed before
  > the cancel ones so the file still runs top to bottom; specs for the route metadata, the controller, the adapter
  > and the rendering; six "class message" e2e tests (stored rows per recipient with their params, the pushes and
  > their text, withdrawn and denied students left out, sender left out and a person told once, nobody → 204 and
  > nothing stored, started → 204, finished / cancelled → 409, 422 per text case and the exact limits, 404, 403 for
  > roles and statuses, 401, a failing push provider still 204); files:
  > `apps/backend/src/modules/classes/classes.controller.ts`, `apps/backend/src/modules/classes/classes.controller.spec.ts`,
  > `apps/backend/src/modules/classes/classes.integration.http`,
  > `apps/backend/src/modules/notifications/notifications.class-change-notifier.ts`,
  > `apps/backend/src/modules/notifications/notifications.class-change-notifier.spec.ts`,
  > `apps/backend/src/modules/notifications/push-messages.ts`, `apps/backend/src/modules/notifications/push-messages.spec.ts`,
  > `apps/backend/test/classes.e2e-spec.ts`; verified: `npx vitest run src/modules/classes src/modules/notifications`
  > (38 files, 430 passed), `tsc --noEmit` and `npm run lint` clean (no new warnings),
  > `npm run test:e2e -- test/classes.e2e-spec.ts` → the 6 "class message" tests pass (102 of 105 pass); the 3 failures
  > are the "suggestions" tests, broken by a local dev row in the shared database (class
  > `5a1e0000-0000-4000-8000-000000000101` by `admin@example.com`, starting 2026-10-11, in the tests' "last week"),
  > not by this change: left in place, it is the user's data; deviations: D-06's pt-BR example
  > ("Surf, sáb 25/10 às 09:00: …") carries a weekday that `class.cancelled` doesn't, so the body follows the example
  > and adds the short weekday in Fortaleza in all three locales (`dom…sáb`, `dom…sáb`, `Sun…Sat`); the existing
  > "every other type" rendering test now counts 23 types.

### Mobile (`apps/mobile`)

- [x] **T-03** — In `src/modules/notifications/utils/`, give `class.message` the `chatbubble-outline` icon on the
  info tone (`notification-icon.ts`) and the class details as its target for every role
  (`notification-target.ts`), with tests in `notification-icon.test.ts`, `notification-target.test.ts` and the
  notifications screen test.
  Covers: ER-03 · Done when: `npx jest src/modules/notifications` passes.
  > ✅ 2026-10-27 21:50 — `class.message` draws `chatbubble-outline` on the info tone, and its push and row open the
  > class's details in the student, instructor and admin flows (nowhere without a class id or in other flows, as the
  > table-driven test checks); tests: the icon, the target table (now 25 types), and on the notifications screen a
  > `class.message` row showing the title and the body as written with the chat bubble on `bg-info-tint`, and its tap
  > marking it read and opening each role's class details. The push received in the foreground and the unread count
  > are the existing, type-independent handling (no change needed); files:
  > `apps/mobile/src/modules/notifications/utils/notification-icon.ts`,
  > `apps/mobile/src/modules/notifications/utils/notification-icon.test.ts`,
  > `apps/mobile/src/modules/notifications/utils/notification-target.ts`,
  > `apps/mobile/src/modules/notifications/utils/notification-target.test.ts`,
  > `apps/mobile/src/modules/notifications/screens/notifications.screen.test.tsx`; verified:
  > `npx jest src/modules/notifications` (14 suites, 392 passed), `npx tsc --noEmit` and `npx eslint
  > src/modules/notifications` clean; deviations: none.
- [x] **T-04** — In `src/modules/notices/`, give the Send notice screen its class mode (D-09): read the `classId`
  route param (`routes.admin.sendNotice` gains a way to pass it), load the class with the classes module's
  details query, replace the audience section with the class view (date, time, location and the D-01 people,
  shown as the agent judges best within the design system), switch the title, description and confirm line to
  the class copy, and send through a new `useSendClassMessage` hook (`hooks/`, `POST /classes/:id/message`, no
  retry), closing the screen with the success toast (D-08); add the i18n keys in pt-BR, es-ES and en-US. Notice
  mode stays as it is. Screen, screen-hook and hook tests for both modes, one per case of ER-02, following
  `.claude/rules/react.md`.
  Covers: ER-02 · Done when: `npx jest src/modules/notices` passes.
  > ✅ 2026-10-27 22:45 — `routes.admin.sendNotice` became `sendNotice()` / `sendNotice({ classId })` (the routes
  > convention for optional params; its two callers and their tests follow). `useSendNoticeScreen` reads `classId`:
  > in class mode it loads the class with `useClass(classId, { enabled })` (the broadcast counts are off through
  > `useNoticeRecipientsCounts(false)`), counts the people with `classMessageRecipients` (new,
  > `classes/utils/class-message.ts`: instructors and students with a seat, each once, never the sender, plus the
  > pending requests; guests left out — shared with T-06), and sends with the new `useSendClassMessage`
  > (`POST /classes/:id/message`, no retry; toasts for 409 finished / cancelled, 404, no connection, generic). The
  > screen swaps the `SegmentedControl` for `ClassMessageCard` (new component: name, day and time, location, then the
  > instructors and the students by name and "+ N pending requests"), the title, description, icon and count copy for
  > the class ones, and the confirm sheet now takes its `description` line from the screen (the audience line in
  > notice mode, "The instructors and students of <class line> get…" in class mode). After sending, the screen closes
  > and "Mensagem enviada" shows on the success tone. Copy under `notices.classMessage` in pt-BR, es-ES and en-US.
  > Notice mode unchanged (its tests pass untouched, apart from the router mock gaining `useLocalSearchParams` and a
  > session mock in the hook test; the audience lines moved from the sheet test to a screen test). Tests, one per
  > ER-02 case: class view and no selector, loading and failed class, Send off while a field is blank or N = 0, the
  > 60 / 500 limits, confirm and back (nothing sent, text kept), send → POST, close, success toast, 409 finished /
  > cancelled and no connection keep the text, a second confirm in the same frame sends once, the admin who teaches
  > left out of N; files: `apps/mobile/src/constants/routes.ts`, `apps/mobile/src/i18n/messages/pt-BR.ts`,
  > `apps/mobile/src/i18n/messages/es-ES.ts`, `apps/mobile/src/i18n/messages/en-US.ts`,
  > `apps/mobile/src/modules/admin/screens/admin.screen.tsx`, `apps/mobile/src/modules/admin/screens/admin.screen.test.tsx`,
  > `apps/mobile/src/modules/classes/hooks/use-class.hook.ts`, `apps/mobile/src/modules/classes/hooks/use-class.hook.test.tsx`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.hook.ts`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`,
  > `apps/mobile/src/modules/classes/utils/class-message.ts`, `apps/mobile/src/modules/classes/utils/class-message.test.ts`,
  > `apps/mobile/src/modules/notices/notices.types.ts`,
  > `apps/mobile/src/modules/notices/components/class-message-card/index.ts`,
  > `apps/mobile/src/modules/notices/components/class-message-card/class-message-card.component.tsx`,
  > `apps/mobile/src/modules/notices/components/class-message-card/class-message-card.types.ts`,
  > `apps/mobile/src/modules/notices/components/class-message-card/class-message-card.component.test.tsx`,
  > `apps/mobile/src/modules/notices/components/send-notice-confirm-sheet/send-notice-confirm-sheet.component.tsx`,
  > `apps/mobile/src/modules/notices/components/send-notice-confirm-sheet/send-notice-confirm-sheet.types.ts`,
  > `apps/mobile/src/modules/notices/components/send-notice-confirm-sheet/send-notice-confirm-sheet.component.test.tsx`,
  > `apps/mobile/src/modules/notices/hooks/use-notice-recipients-counts.hook.ts`,
  > `apps/mobile/src/modules/notices/hooks/use-notice-recipients-counts.hook.test.tsx`,
  > `apps/mobile/src/modules/notices/hooks/use-send-class-message.hook.ts`,
  > `apps/mobile/src/modules/notices/hooks/use-send-class-message.hook.test.tsx`,
  > `apps/mobile/src/modules/notices/screens/send-notice.screen.tsx`,
  > `apps/mobile/src/modules/notices/screens/send-notice.screen.hook.ts`,
  > `apps/mobile/src/modules/notices/screens/send-notice.screen.types.ts`,
  > `apps/mobile/src/modules/notices/screens/send-notice.screen.test.tsx`,
  > `apps/mobile/src/modules/notices/screens/send-notice.screen.hook.test.tsx`; verified: `npx jest src/modules/notices`
  > with the class-message, `use-class`, admin and class details tests (13 suites, 334 passed; every notices file,
  > `class-message.ts` and `use-class.hook.ts` 100% covered), `npx tsc --noEmit` and `npx eslint` clean;
  > deviations: the class-mode screen tests render with their own `QueryClient` (`gcTime: Infinity`), because the
  > default 5-minute cache time of a query or a mutation keeps Jest running for 5 minutes when that file runs alone —
  > the notice-mode send tests already do this with `renderWithProviders` (left as is, a follow-up).
- [x] **T-06** — In `src/modules/classes/screens/class-details.screen.hook.ts`, make the tools card's "Send
  message" open the Send notice screen with the class id instead of the plain notice route, and leave the
  admin out of `messageCount` when they teach the class (D-07), with tests in `class-details.screen.test.tsx`
  and the tools sheet tests.
  Covers: ER-02 · Done when: `npx jest src/modules/classes` passes.
  > ✅ 2026-10-27 22:55 — the tools card's "Send message" pushes `routes.admin.sendNotice({ classId: id })`, and
  > `messageCount` (both cards' subtitles) is `classMessageRecipients(item, user.id).count`: the viewer was already
  > left out as an instructor; now they are also left out when they hold a seat, and an instructor who holds a seat
  > counts once. Tests: the push with the class id, and a class where the viewer teaches and holds a seat and the other
  > instructor holds one ("3 people" / "Notifies 3 people"), both seen failing on the previous hook; the tools sheet's
  > notify test and prop docs name the class message; files:
  > `apps/mobile/src/modules/classes/screens/class-details.screen.hook.ts`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`,
  > `apps/mobile/src/modules/classes/components/class-tools-sheet/class-tools-sheet.types.ts`,
  > `apps/mobile/src/modules/classes/components/class-tools-sheet/class-tools-sheet.component.test.tsx`; verified:
  > `npx jest src/modules/classes` (89 suites, 1082 passed), `npx tsc --noEmit` and `npx eslint src/modules/classes`
  > clean; deviations: none.

### Verification

- [x] **T-05** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0.
  > ✅ 2026-10-27 23:25 — every command of the Verification Plan exits 0: `run-related-tests.mjs 069` → RELATED
  > TESTS PASSED (backend 25 files; mobile 95 suites, 1851 tests; classes 606; notifications 194; enrolment 292);
  > `check-coverage.mjs 069` → COVERAGE OK (22 files); `turbo run lint check-types build --concurrency=1` for backend
  > and mobile → 27/27 tasks, 0 errors (the lint warnings existed before); `run-e2e.mjs 069` → E2E PASSED (28 files,
  > 788 tests). The first e2e run failed 3 "suggestions" tests on a local dev class in the shared database
  > (`5a1e0000-0000-4000-8000-000000000101`, `admin@example.com`, 2026-10-11 08:00 Fortaleza); the user had it deleted,
  > and the rerun passed. Files: none (verification only); deviations: the iOS simulator journey was not driven here —
  > the backend on :4000 and Metro on :8081 belong to another session and that backend predates this branch. For the
  > user: restart the backend from this branch; as an admin, open a class with a student and an instructor → tools →
  > Send message; the screen reads "Mensagem para a turma" with the class, its date, time, location and people; write
  > a title and a message, tap Enviar and confirm "Enviar a N pessoas?"; the screen closes and the green "Mensagem
  > enviada" toast shows; signed in as that student, the notifications row shows the title and "Surf, <weekday>
  > <dd/MM> às <HH:mm>: <message>" with the chat bubble, and tapping it opens the class.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 069` — the related tests pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 069` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 069` — the backend e2e suite passes, the "class message" tests included.
  - `npx turbo run lint check-types build --concurrency=1 --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
- User journey (iOS simulator): as an admin, open a class with a student and an instructor, send a message
  from the tools sheet, see the success toast; signed in as the student, the notification shows the title and
  the class line with the message, and tapping it opens the class (ER-02, ER-03).

## Memory Impact

- `memory/modules/classes.md` — the class message: who can send it and when, who receives it, the limits, the
  `classMessage` event and `POST /classes/:id/message`.
- `memory/modules/notifications.md` — the `class.message` type: params, push text, icon and tap target.
- `memory/structure.md` — the class mode of the mobile `notices` screen (the `classId` param of
  `/admin/send-notice`) and the `useSendClassMessage` hook.

## Amendments

- 2026-10-27 — /spec-plan --amend — Goal changed: a new bottom sheet → the Send notice screen in a class mode. Reason: the user wants one compose screen, with the audience selector replaced by the class and its people. Approved by the user.
- 2026-10-27 — /spec-plan --amend — Context changed: added the `notices` module the class mode builds on. Reason: same as above. Approved by the user.
- 2026-10-27 — /spec-plan --amend — D-04 removed: "no confirm step, a sheet with a people icon" → replaced by D-09. Reason: the message is written on the Send notice screen, which keeps its confirm sheet. Approved by the user.
- 2026-10-27 — /spec-plan --amend — D-07 changed: "the tools cards and the sheet" → "the tools cards and the Send notice screen in class mode". Reason: the sheet no longer exists. Approved by the user.
- 2026-10-27 — /spec-plan --amend — D-08 changed: "the sheet closes" → "the screen closes". Reason: the sheet no longer exists. Approved by the user.
- 2026-10-27 — /spec-plan --amend — D-09 added: the class mode of the Send notice screen (class view instead of the audience selector, the agent chooses how to show the people, class copy, confirm kept). Reason: the user's request. Approved by the user.
- 2026-10-27 — /spec-plan --amend — ER-02 changed: a bottom sheet with "Enviar a N pessoas" and "Cancelar" → the Send notice screen in class mode with its confirm sheet; notice mode unchanged; Verify by adds `src/modules/notices`. Reason: D-09. Approved by the user.
- 2026-10-27 — /spec-plan --amend — T-04 changed: `ClassMessageSheet` and the class details wiring in `src/modules/classes` → the class mode and `useSendClassMessage` in `src/modules/notices`. Reason: D-09. Approved by the user.
- 2026-10-27 — /spec-plan --amend — T-06 added (Covers: ER-02): the tools card opens the screen with the class id, and the D-07 count. Reason: the class details wiring moved out of T-04. Approved by the user.
- 2026-10-27 — /spec-plan --amend — Memory Impact changed: `structure.md` records the class mode of the notices screen instead of the `class-message-sheet` component. Reason: D-09. Approved by the user.

## Review
