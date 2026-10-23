---
id: "055"
slug: notifications-screen
title: Notifications screen with read state
status: in-progress
created: 2026-10-23
started: 2026-10-23
base_commit: 66686ab329a0a62b13f5656dc7557ab0e403465f
fronts: [notifications, backend, mobile]
depends_on: []
---

# 055 — Notifications screen with read state

## Goal

Every signed-in person opens "Avisos" from the bell on their home screen — the student's Agenda, the instructor's
and the admin's home — and sees every notification stored for them, newest first, written in the app's language, each
marked read or unread. Tapping one marks it read and opens what it is about; one header button marks them all read.
The bell's badge shows the real number of unread notifications instead of the fixed 3. This builds the notifications
screen and the read state that spec 020 left for later, so a notification is never lost when its push wasn't seen.

## Context

- Product: [product.md](../../memory/product.md) — concepts: Notification ("Always kept on the user's notifications
  screen, with a read/unread state (mark one or all as read)"); decision "Pushes are the only notification channel …
  Turning pushes off never hides notifications from the notifications screen"; Out of scope lists "The notifications
  screen (with read / unread state)", which this spec builds.
- Module: [modules/notifications.md](../../memory/modules/notifications.md) — the 18 notification types and their
  params, the push copy in three languages, and the push tap routes per type and flow.
- Requirements: [requirements.md → Notifications screen](../../../.docs/requirements.md#notifications-screen) — every
  notification also appears on an in-app notifications screen, whether or not its push was shown;
  [requirements.md → Read state](../../../.docs/requirements.md#read-state) — mark one notification as read, and mark
  all as read at once; [user-journeys.md → Preferences and notifications](../../../.docs/user-journeys.md#preferences-and-notifications)
  — "see a list of all my notifications … and mark one as read or all as read at once".
- Design: `.docs/designs/student-app.html` → AGENDA-07 "Notices" ("Avisos"): a list of cards, each with a tinted
  round icon, a bold title, an optional body, a relative time and an orange (`sun`) unread dot; "Marcar lidos" at the
  right of the header. AGENDA-01: "The bell opens AGENDA-07". The design's copy (class names such as "Surf da
  Tarde", before/after values such as "era às 16:30") and its broadcast, rating-prompt and role-change rows are not
  built (see Out of scope and D-02).
- Technical: [technical-context.md](../../memory/technical-context.md) — External integrations → Push notifications
  (`renderPush` catalog in `apps/backend/src/modules/notifications/push-messages.ts`, push `data: { type,
  notificationId, classId? }`), Authentication (the people directory's `page` / `perPage` validation, which D-03
  mirrors), Applications (mobile: `useInfiniteQuery` per list, the native Stack header, `HeaderButton`), Automated
  validation (`notifications.e2e-spec.ts` with a faked `ExpoPushProvider`).
- Existing code this builds on:
  - `modules/notifications/src/notification/model/notification.entity.ts` — `Notification` (`userId`, `type`,
    `params`, `createdAt`), no read state; `provider/notification.repository.ts` — `createMany`,
    `deleteRegistrationPending`.
  - `apps/backend/prisma/models/notifications.model.prisma` — `notifications` (`id`, `user_id`, `type`, `params`,
    `created_at`, index on `user_id, created_at`).
  - `apps/backend/src/modules/notifications/notifications.controller.ts` — `@Controller('notifications')` with the
    push-token endpoints only; `notification.prisma.ts` — `PrismaNotificationRepository`.
  - `apps/backend/src/modules/notifications/push-messages.ts` — `renderPush(type, params, locale)` → `{ title, body }`
    for `pt-BR` / `es` / `en`, dates in Fortaleza time.
  - `modules/auth/src/user/usecase/list-people.usecase.ts` — the page / perPage parsing to mirror.
  - `apps/mobile/src/components/user-header/` — the bell (`HeaderButton`, `standalone`, no `onPress`) and
    `UNREAD_NOTIFICATIONS_COUNT = 3` in `user-header.constants.ts`; rendered on the three home stacks by
    `navigation/stack-header/user-stack-header/`.
  - `apps/mobile/src/components/ui/header-button/` — the badge shows `9+` above 9 and hides at 0.
  - `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.ts` — routes a push tap by type,
    class id and resolved flow; `use-notification-received.hook.ts` — invalidates caches when a push arrives with the
    app open.
  - `apps/mobile/src/modules/people/hooks/use-people.hook.ts` — the infinite list pattern; `src/utils/format-created-at.ts`
    — relative time up to a week, then the date, in the app's locale; `src/i18n/backend-locale.ts` — `toBackendLocale`.
  - `apps/mobile/src/components/ui/{empty-state,error-state,skeleton,toast}` — the list states.

## Scope

### In scope

- Read state on stored notifications (`read_at`), with use cases to list, count unread, mark one and mark all read.
- Four protected endpoints: `GET /notifications`, `GET /notifications/unread-count`,
  `POST /notifications/:id/read`, `POST /notifications/read-all`.
- The in-app text of every notification type in pt-BR, es and en, written by the backend from the push copy.
- The "Avisos" screen for students, instructors and admins, opened from the bell, above the tab bar.
- The bell's real unread badge, and its reloads.
- Tapping a row or a push marks that notification read; tapping a row opens the screen its push opens.

### Out of scope

- Broadcasts ("Aviso geral"), the rating prompt and the role-change notification shown in the design: their types
  don't exist yet and come with their own specs.
- Class names and before/after values in the copy ("Skate Iniciados", "era às 16:30").
- Deleting notifications, hiding them, or expiring old ones; a notification is kept for as long as its account.
- Marking notifications read just by opening the screen, or by scrolling past them.
- The badge on the app icon, rich pushes, and any change to which events notify whom.
- A notifications screen for pending, denied, deleted or removed accounts (their flows have no bell), and the web app.

## Decisions

| ID | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | A notification is unread while its new nullable `read_at` column is null. Marking it read sets `read_at` to the clock's now; marking an already-read one again keeps its first `read_at` and still succeeds. Existing rows migrate as unread. | One nullable column carries the state and when it changed; idempotent marks make retries and double taps harmless. |
| D-02 | The backend writes each row's `title` and `body` (`renderInApp(type, params, locale)` in `push-messages.ts`), from the same catalog as the push, in the locale the app sends as `?locale=` (`pt-BR` / `es` / `en`; missing → `pt-BR`). The in-app text equals the push text except that it drops the "open the app" sentences: `class.edited` ends after "…foi alterada." / "…cambió." / "…was changed."; `registration.denied` without a reason has an empty body (with a reason, the reason). This replaces the memory's "the app writes the text". | One catalog for 18 types × 3 languages, already tested with Fortaleza time; an installed app that doesn't know a newer type still shows its text (store versions lag). "Open the app" makes no sense inside it. |
| D-03 | `GET /notifications` pages like `GET /people`: `page` digits only ≥ 1 (default 1) → else `notifications.page.invalid`; `perPage` digits only 1–50 (default 20) → else `notifications.perPage.invalid`; `locale` other than the three → `notifications.locale.invalid`; every failure collected into one 422. Order: `created_at` descending, then `id` descending. | Same contract as the existing list the app already pages; a stable tie-break keeps pages from repeating rows. |
| D-04 | Any signed-in account, whatever its status, lists, counts and marks only its own notifications (no status check). An id that is unknown, belongs to someone else or isn't a UUID → 404 `notification.notFound`, never 403. | The data belongs to the caller, as with the push-token removal; 404 doesn't reveal that someone else's notification exists. |
| D-05 | The screen is a route of each role's stack, above the tabs: `/student/notifications`, `/instructor/notifications`, `/admin/notifications` (`routes.<role>.notifications`), rendering one shared `NotificationsScreen`. No tab bar shows on it, and the native header draws the back button and the title. | Matches class details and every other inner screen (`useStackHeader`); the design's tab bar under AGENDA-07 is not followed. |
| D-06 | "Mark all as read" is a `HeaderButton` in `headerRight` with icon `checkmark-done-outline` and label "Marcar todos como lidos" / "Marcar todos como leídos" / "Mark all as read", not the design's "MARCAR LIDOS" text. It is hidden while the unread count is 0. | CLAUDE.md: header actions are `HeaderButton` icons only; a button that does nothing is noise. |
| D-07 | Tapping a row marks it read at once on screen (its dot goes, the badge drops by one) without waiting for the request, and opens the destination its push opens for the account's current flow, through a shared `notificationTarget(type, classId, flow)` that `useNotificationResponse` also uses. A type or flow with no destination there (e.g. `registration.approved`, or an unknown type) only marks the row read; the push handler's fallback to `routes.home` stays in the push handler only. A failed mark is silent: the next reload shows the stored state. | The same tap leads to the same place from a push or a row; navigating never waits on the network. |
| D-08 | Tapping a push marks its `notificationId` (from the push data) read, without awaiting it and ignoring any failure, before routing as today. A push without `notificationId` marks nothing. | A notification seen through its push shouldn't stay unread on the screen. |
| D-09 | The badge reads `GET /notifications/unread-count` (`{ count }`). The count reloads when a home screen gains focus, after any mark (one or all), and when a push arrives with the app open; that push also reloads the list. Query keys: `["notifications", "list"]` and `["notifications", "unread-count"]`. | The fixed 3 becomes the real number without polling; every event that changes the count refreshes it. |
| D-10 | A row's time is `formatCreatedAt(createdAt, now, locale)` (relative up to a week, then the date in Fortaleza); its `now` case (under a minute) shows "Agora" / "Ahora" / "Now", as the pending screen does; the unread dot is `sun`; a read row shows no dot. Pages of 20, the next one loaded at the end of the list while `page * perPage < total`, rows repeated across pages dropped by `id`; pull to refresh reloads from page 1. | Reuses the app's existing time label and list pattern; the dot color is the design's. |
| D-11 | Each type has a fixed Ionicons glyph and tone (tint background with the matching color glyph): see [Row icons](#row-icons). An unknown type uses `notifications-outline` on `infoTint`. | The design gives each kind of event its own icon and tone; a table makes it reviewable. |
| D-12 | "Mark all" clears every dot and the badge at once; on failure the previous state comes back and a toast says "Não foi possível marcar os avisos como lidos. Tente de novo." / "No se pudieron marcar los avisos como leídos. Inténtalo de nuevo." / "Couldn't mark the notifications as read. Try again.". | The person asked for one explicit action, so its failure is reported; a single row's failure (D-07) is not. |
| D-13 | Copy: header title "Avisos" / "Avisos" / "Notifications"; empty state (icon `notifications-outline`) "Nenhum aviso por enquanto" + "Quando algo mudar nas suas aulas ou na sua conta, avisamos aqui." / "Ningún aviso por ahora" + "Cuando algo cambie en tus clases o en tu cuenta, te avisamos aquí." / "No notifications yet" + "When something changes in your classes or your account, you'll see it here."; error state "Não foi possível carregar os avisos" + "Verifique sua conexão e tente de novo." / "No se pudieron cargar los avisos" + "Revisa tu conexión e inténtalo de nuevo." / "Couldn't load your notifications" + "Check your connection and try again.", with the existing `ErrorState` retry button. Each row's accessibility label is its title, body and time, plus ", não lido" / ", no leído" / ", unread" when unread. | Every user-facing string is decided here, in the product's three languages. |
| D-14 | `GET /notifications` items: `{ id, type, classId, title, body, createdAt, read }` — `classId` is `params.classId` when it is a string, else `null` (as the push data); `createdAt` ISO UTC; `read` is `read_at !== null`. `params` are not returned. | The app needs only what it shows and where a tap leads; the text is already written (D-02). |

### Row icons

| Type | Glyph | Tone (tint / glyph color) |
| --- | --- | --- |
| `registration.pending` | `person-add-outline` | `infoTint` / `lagoon` |
| `registration.approved` | `checkmark-circle-outline` | `okTint` / `ok` |
| `registration.denied` | `close-circle-outline` | `badTint` / `bad` |
| `class.assigned` | `calendar-outline` | `infoTint` / `lagoon` |
| `class.edited` | `create-outline` | `infoTint` / `lagoon` |
| `class.unassigned` | `remove-circle-outline` | `badTint` / `bad` |
| `class.cancelled` | `calendar-outline` | `badTint` / `bad` |
| `class.deleted` | `trash-outline` | `badTint` / `bad` |
| `class.noInstructor` | `alert-circle-outline` | `warnTint` / `warn` |
| `class.reminder` | `time-outline` | `warnTint` / `warn` |
| `location.changed` | `location-outline` | `infoTint` / `lagoon` |
| `enrolment.requested` | `hand-left-outline` | `infoTint` / `lagoon` |
| `enrolment.expired` | `hourglass-outline` | `warnTint` / `warn` |
| `enrolment.approved` | `checkmark-circle-outline` | `okTint` / `ok` |
| `enrolment.denied` | `close-circle-outline` | `badTint` / `bad` |
| `enrolment.cancelled` | `person-remove-outline` | `warnTint` / `warn` |
| `enrolment.enrolled` | `person-add-outline` | `okTint` / `ok` |
| `enrolment.takenOut` | `person-remove-outline` | `badTint` / `bad` |
| any other | `notifications-outline` | `infoTint` / `lagoon` |

## Expected Results

### ER-01 — The list shows the caller's notifications, newest first, paged

- **Front:** backend
- **Behavior:** Given user U has 25 notifications created at distinct times and user V has 3, when U calls
  `GET /notifications?locale=en` with U's token, then the API answers 200 with `{ items, page: 1, perPage: 20,
  total: 25 }`, `items` holding U's 20 newest notifications newest first, each `{ id, type, classId, title, body,
  createdAt, read }` (D-14); `GET /notifications?page=2&locale=en` answers U's 5 oldest, and no item of V ever
  appears.
- **Edge and error cases:** a user with no notifications gets `items: []`, `total: 0`; a `class.deleted` item has
  `classId: null`; a read notification has `read: true`; `page=0`, `page=abc`, `perPage=51` and `locale=fr` together
  answer one 422 with `notifications.page.invalid`, `notifications.perPage.invalid` and `notifications.locale.invalid`;
  no `locale` writes pt-BR; no token → 401; a pending account lists its own (no status check, D-04).
- **Verify by:** `npx jest test/notification/usecase/list-notifications.usecase.test.ts` (from
  `modules/notifications`) and the "lists notifications" cases of `apps/backend/test/notifications.e2e-spec.ts`
  (`npm run test:e2e --workspace apps/backend`).

### ER-02 — Row text is written in the requested language, without "open the app"

- **Front:** backend
- **Behavior:** Given a `class.edited` notification `{ classId, discipline: "surf", startsAt: "2026-10-20T11:00:00.000Z" }`,
  when it is listed with `locale=pt-BR`, then its `title` is "Aula alterada" and its `body` is "A aula de Surf de
  20/10 às 08:00 foi alterada." (with `es`: "Clase modificada" / "La clase de Surf del 20/10 a las 08:00 cambió.";
  with `en`: "Class changed" / "Your Surf class on 10/20 at 08:00 was changed.").
- **Edge and error cases:** a `registration.denied` with a reason has the reason as its body, and without one an empty
  body (`""`); every other type's title and body equal `renderPush` for the same params and locale; the push text
  itself is unchanged (still "…Abra o app para ver.").
- **Verify by:** `npx vitest run src/modules/notifications/push-messages.spec.ts -t "renderInApp"` (from
  `apps/backend`) and the "writes the text in the requested language" case of `apps/backend/test/notifications.e2e-spec.ts`.

### ER-03 — The unread count counts only the caller's unread notifications

- **Front:** backend
- **Behavior:** Given U has 4 notifications, 1 of them read, and V has 2 unread, when U calls
  `GET /notifications/unread-count`, then the API answers 200 `{ "count": 3 }`.
- **Edge and error cases:** no notifications → `{ "count": 0 }`; no token → 401.
- **Verify by:** `npx jest test/notification/usecase/count-unread-notifications.usecase.test.ts` (from
  `modules/notifications`) and the "counts unread" case of `apps/backend/test/notifications.e2e-spec.ts`.

### ER-04 — Marking one notification read

- **Front:** backend
- **Behavior:** Given U's unread notification N, when U calls `POST /notifications/N/read`, then the API answers 204,
  N is listed with `read: true` and the unread count drops by one.
- **Edge and error cases:** calling it again answers 204 and keeps N read with its first `read_at`; V's notification
  id, an unknown UUID and `not-a-uuid` each answer 404 `notification.notFound` and change nothing; no token → 401.
- **Verify by:** `npx jest test/notification/usecase/mark-notification-read.usecase.test.ts` (from
  `modules/notifications`) and the "marks one read" cases of `apps/backend/test/notifications.e2e-spec.ts`.

### ER-05 — Marking all notifications read

- **Front:** backend
- **Behavior:** Given U has 3 unread notifications and V has 2, when U calls `POST /notifications/read-all`, then the
  API answers 204, U's unread count is 0 and every item of U's list has `read: true`, while V's unread count is still 2.
- **Edge and error cases:** with nothing unread it answers 204 and changes nothing; notifications already read keep
  their first `read_at`; no token → 401.
- **Verify by:** `npx jest test/notification/usecase/mark-all-notifications-read.usecase.test.ts` (from
  `modules/notifications`) and the "marks all read" cases of `apps/backend/test/notifications.e2e-spec.ts`.

### ER-06 — The bell opens "Avisos" and shows the real unread count

- **Front:** mobile
- **Behavior:** Given a signed-in student, instructor or admin with 3 unread notifications, when their home screen
  shows, then the bell's badge reads "3" and its label is "Notificações, 3 não lidas" (en "Notifications, 3 unread");
  when they tap the bell, then the "Avisos" screen of their role (`/<role>/notifications`) opens above the tabs with a
  back button.
- **Edge and error cases:** 0 unread → no badge and the label "Notificações"; 12 unread → "9+"; a failed count shows
  no badge; coming back to the home screen after marking notifications read shows the new count.
- **Verify by:** `npx jest src/components/user-header` (from `apps/mobile`) and the journey "Bell and badge" in the
  Verification Plan.

### ER-07 — The list shows each notification's text, time, icon and unread dot

- **Front:** mobile
- **Behavior:** Given the API lists an unread `enrolment.approved` (title "Pedido aprovado", body "Sua vaga…",
  created 5 minutes ago) and a read `class.deleted`, when "Avisos" opens, then the first row shows the
  `checkmark-circle-outline` icon on `okTint`, the title, the body, "há 5 minutos" and the `sun` unread dot, and the
  second row shows `trash-outline` on `badTint` and no dot.
- **Edge and error cases:** a row with an empty body shows the title and time only; an unknown type shows
  `notifications-outline` on `infoTint`; with 25 notifications the first 20 show and the next 5 load at the end of the
  list; pulling to refresh reloads from page 1; each row's accessibility label ends with ", não lido" only when unread.
- **Verify by:** `npx jest src/modules/notifications/components/notification-row src/modules/notifications/screens`
  (from `apps/mobile`).

### ER-08 — Loading, empty and error states

- **Front:** mobile
- **Behavior:** Given "Avisos" opens, while the first page loads then skeleton rows show; when the API answers no
  items, then the empty state "Nenhum aviso por enquanto" with its description shows; when the request fails, then the
  error state "Não foi possível carregar os avisos" shows, and tapping its retry button loads the list again.
- **Edge and error cases:** the "mark all" button is hidden in all three states.
- **Verify by:** `npx jest src/modules/notifications/screens` (from `apps/mobile`).

### ER-09 — Tapping a row marks it read and opens what it is about

- **Front:** mobile
- **Behavior:** Given a student's unread `enrolment.approved` row with `classId` C, when they tap it, then its dot
  disappears at once, `POST /notifications/<id>/read` is sent and the student's class details for C open; given an
  admin's `registration.pending` row, the tap opens the registrations screen "Entrar na escola"
  (`routes.admin.registrations`).
- **Edge and error cases:** a row with no destination for the flow (`registration.approved`, an unknown type, a
  `class.edited` without `classId`) only marks it read and stays on "Avisos"; tapping a read row sends no request and
  still opens its destination; a failed mark shows nothing and navigation still happens; the destination for every
  type and flow is the one `useNotificationResponse` already uses (the push handler's tests keep passing).
- **Verify by:** `npx jest src/modules/notifications/utils/notification-target.test.ts src/modules/notifications/screens`
  (from `apps/mobile`).

### ER-10 — "Mark all as read"

- **Front:** mobile
- **Behavior:** Given "Avisos" with 3 unread rows, when the person taps the header's "Marcar todos como lidos" button,
  then every dot disappears, `POST /notifications/read-all` is sent, the button hides and, back on the home, the badge
  is gone.
- **Edge and error cases:** with 0 unread the button is not shown; when the request fails, the dots and the button come
  back and the toast "Não foi possível marcar os avisos como lidos. Tente de novo." shows.
- **Verify by:** `npx jest src/modules/notifications/screens` (from `apps/mobile`) and the journey "Mark all" in the
  Verification Plan.

### ER-11 — Tapping a push marks its notification read

- **Front:** mobile
- **Behavior:** Given a push with data `{ type: "enrolment.approved", notificationId: N, classId: C }`, when a signed-in
  student taps it, then `POST /notifications/N/read` is sent and the class details for C open as before.
- **Edge and error cases:** a push without `notificationId` sends no mark; a failed mark doesn't change the routing;
  the same response handled twice sends one mark; with no session nothing is sent.
- **Verify by:** `npx jest src/modules/notifications/hooks/use-notification-response.hook.test.tsx` (from `apps/mobile`).

### ER-12 — A push that arrives with the app open refreshes the list and the badge

- **Front:** mobile
- **Behavior:** Given the app is open, when a push of any type arrives, then the queries `["notifications", "list"]`
  and `["notifications", "unread-count"]` are invalidated, in addition to the invalidations each type already does.
- **Edge and error cases:** a push with an unknown type still invalidates both; nothing navigates.
- **Verify by:** `npx jest src/modules/notifications/hooks/use-notification-received.hook.test.tsx` (from `apps/mobile`).

## Tasks

### Notifications module (`modules/notifications`)

- [x] **T-01** — Add `readAt: Date | null` (optional in the state, default `null`, with a getter) to `Notification` in
  `modules/notifications/src/notification/model/notification.entity.ts`, and to `NotificationRepository`
  (`provider/notification.repository.ts`) `findPage(userId, page, perPage)` → `{ items, total }` (newest first, D-03),
  `countUnread(userId)`, `markRead(userId, id, at)` → whether the caller's notification exists (sets `readAt` only
  when null, D-01) and `markAllRead(userId, at)`; implement them in `test/mock/fake-notification.repository.ts`, with
  tests in `test/notification/model/notification.entity.test.ts` and a fake-repository test. Skill:
  [`module-entity`](../../../.claude/skills/module-entity).
  Covers: enabling · Done when: `npx jest` passes from `modules/notifications`.
  > ✅ 2026-10-23 13:32 — Added `readAt` (optional, defaults to `null`, copied in and out, validated with `DateRule`)
  > to `Notification`, and `findPage` / `countUnread` / `markRead` / `markAllRead` (with `NotificationPage`) to the
  > `NotificationRepository` port, implemented in the fake (newest first, `id` descending on a tie; `markRead` keeps
  > the first `readAt` and answers whether the caller owns the id); files:
  > `modules/notifications/src/notification/model/notification.entity.ts`,
  > `modules/notifications/src/notification/provider/notification.repository.ts`,
  > `modules/notifications/test/mock/fake-notification.repository.ts`,
  > `modules/notifications/test/notification/model/notification.entity.test.ts`,
  > `modules/notifications/test/push-token/provider/fakes.test.ts`; verified: `npx jest` from
  > `modules/notifications` (12 suites, 124 passed; entity and fake at 100% lines and branches), `npx tsc --noEmit`
  > clean; deviations: the module-entity skill was followed by hand (an existing entity gained one field: its
  > pattern for nullable dates, as `SchoolClass.cancelledAt`); the fake-repository tests sit in the existing
  > `test/push-token/provider/fakes.test.ts`, where the other fakes are tested. The backend’s
  > `PrismaNotificationRepository` gains the four methods in T-03.

- [x] **T-02** — Add the use cases `ListNotifications` (`{ userId, page?, perPage?, locale? }` → `{ items: [{ id,
  type, params, createdAt, read }], page, perPage, total, locale }`, D-03, `PUSH_LOCALES` for the locale),
  `CountUnreadNotifications` (`{ userId }` → `{ count }`), `MarkNotificationRead` (`{ userId, notificationId }`,
  `NotFoundError("notification.notFound")` for an unknown, foreign or non-UUID id, D-04) and
  `MarkAllNotificationsRead` (`{ userId }`), with the clock provider, in
  `modules/notifications/src/notification/usecase/`, exported through the barrels, with one test file each in
  `modules/notifications/test/notification/usecase/`. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-03, ER-04, ER-05 · Done when: `npx jest` passes from `modules/notifications` with the four use
  cases at 100% lines and branches.
  > ✅ 2026-10-23 13:34 — Added `ListNotifications` (page / perPage parsed as `ListPeople` does, `locale` one of
  > `PUSH_LOCALES` defaulting to `pt-BR`, every invalid field in one `ValidationException` with
  > `notifications.{page,perPage,locale}.invalid`; items `{ id, type, params, createdAt (ISO), read }` plus `page`,
  > `perPage`, `total`, `locale`), `CountUnreadNotifications`, `MarkNotificationRead`
  > (`NotFoundError("notification.notFound")` for an id failing the shared `RequiredRule` / `UuidRule`, or one
  > `markRead` does not find for the caller) and `MarkAllNotificationsRead`, both with the clock, exported through
  > the usecase barrel; files: `modules/notifications/src/notification/usecase/list-notifications.usecase.ts`,
  > `modules/notifications/src/notification/usecase/count-unread-notifications.usecase.ts`,
  > `modules/notifications/src/notification/usecase/mark-notification-read.usecase.ts`,
  > `modules/notifications/src/notification/usecase/mark-all-notifications-read.usecase.ts`,
  > `modules/notifications/src/notification/usecase/index.ts`,
  > `modules/notifications/test/notification/usecase/list-notifications.usecase.test.ts`,
  > `modules/notifications/test/notification/usecase/count-unread-notifications.usecase.test.ts`,
  > `modules/notifications/test/notification/usecase/mark-notification-read.usecase.test.ts`,
  > `modules/notifications/test/notification/usecase/mark-all-notifications-read.usecase.test.ts`; verified: `npx
  > jest --coverage` from `modules/notifications` (151 passed; the four use cases at 100% statements, branches,
  > functions and lines), `tsc --noEmit` and `npm run lint` clean; deviations: none.

### Backend (`apps/backend`)

- [x] **T-03** — Add `readAt DateTime? @map("read_at")` to `Notification` in
  `apps/backend/prisma/models/notifications.model.prisma` with the migration
  `apps/backend/prisma/migrations/<timestamp>_notifications_add_read_at/` (column only, existing rows unread), and
  implement `findPage`, `countUnread`, `markRead` (one conditional `updateMany` by id, user and `read_at` null, then
  an existence check) and `markAllRead` in `apps/backend/src/modules/notifications/notification.prisma.ts`, with
  `notification.prisma.spec.ts`. Skill:
  [`backend-prisma-sync-module`](../../../.claude/skills/backend-prisma-sync-module).
  Covers: enabling · Done when: the migration applies (`npm run prisma:migrate:deploy --workspace apps/backend`) and
  `npx vitest run src/modules/notifications/notification.prisma.spec.ts` passes.
  > ✅ 2026-10-23 13:35 — Added `readAt DateTime? @map("read_at")` to the `Notification` model and created the
  > migration with `prisma migrate dev --create-only --name notifications_add_read_at` (SQL: one `ALTER TABLE
  > "notifications" ADD COLUMN "read_at" TIMESTAMP(3)`, so existing rows stay unread), applied with `npm run
  > prisma:migrate:deploy` (all applied); implemented in `PrismaNotificationRepository` `findPage` (`findMany` by
  > user ordered `createdAt` desc then `id` desc, `skip` / `take`, plus `count`, mapped to `Notification` with
  > `readAt`), `countUnread`, `markRead` (one `updateMany` by id, user and `readAt: null`, then a `count` by id and
  > user when nothing changed) and `markAllRead`; files: `apps/backend/prisma/models/notifications.model.prisma`,
  > `apps/backend/prisma/migrations/20261023163428_notifications_add_read_at/migration.sql`,
  > `apps/backend/src/modules/notifications/notification.prisma.ts`,
  > `apps/backend/src/modules/notifications/notification.prisma.spec.ts`; verified: `npx vitest run
  > src/modules/notifications/notification.prisma.spec.ts` (9 passed; 100% lines, the one uncovered branch is the
  > `@Injectable()` decorator metadata the coverage gate skips), `tsc --noEmit` clean; deviations: the
  > backend-prisma-sync-module skill’s `migrate dev` was split into `--create-only` + `migrate deploy` so the SQL
  > was read before it touched the local database.

- [x] **T-04** — Add `renderInApp(type, params, locale)` to `apps/backend/src/modules/notifications/push-messages.ts`
  (D-02: the push text, minus the "open the app" sentences of `class.edited` and the no-reason `registration.denied`),
  with cases in `push-messages.spec.ts` for those two types in the three languages and for every other type matching
  `renderPush`.
  Covers: ER-02 · Done when: `npx vitest run src/modules/notifications/push-messages.spec.ts` passes.
  > ✅ 2026-10-23 13:36 — Added `renderInApp(type, params, locale)`: the push title and body from the same catalog,
  > except where a catalog entry has the new optional `inAppBody` — `class.edited` (its shared sentence moved to
  > `classEdited`, so the push still appends “Abra o app para ver.” / “Abre la app para verla.” / “Open the app to
  > see it.”) and `registration.denied` (the trimmed reason, or `""`); files:
  > `apps/backend/src/modules/notifications/push-messages.ts`,
  > `apps/backend/src/modules/notifications/push-messages.spec.ts`; verified: `npx vitest run
  > src/modules/notifications/push-messages.spec.ts` (83 passed, including the existing push cases;
  > `push-messages.ts` at 100% statements, branches, functions and lines), `tsc --noEmit` clean; deviations: none.

- [x] **T-05** — Expose in `apps/backend/src/modules/notifications/notifications.controller.ts` (protected):
  `GET /notifications` (query `page`, `perPage`, `locale` → `ListNotifications`, items mapped by D-14 with
  `renderInApp`), `GET /notifications/unread-count`, `POST /notifications/read-all` (204) and
  `POST /notifications/:id/read` (204), wiring the repository and clock in `notifications.module.ts`; add the cases to
  `notifications.controller.spec.ts`, the scenarios of ER-01 to ER-05 to `apps/backend/test/notifications.e2e-spec.ts`
  and the requests to `notifications.integration.http`. Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05 · Done when: `npx vitest run src/modules/notifications/notifications.controller.spec.ts`
  and `npm run test:e2e --workspace apps/backend -- notifications` pass.
  > ✅ 2026-10-23 13:38 — Added to `NotificationsController` (protected by the global guard, no `@Public`) `GET
  > /notifications` (`page`, `perPage`, `locale` → `ListNotifications`; items mapped to `{ id, type, classId, title,
  > body, createdAt, read }` with `classId` from a string `params.classId`, else `null`, and the text from
  > `renderInApp` in the use case’s locale), `GET /notifications/unread-count`, `POST /notifications/read-all` (204)
  > and `POST /notifications/:id/read` (204); added the controller cases, a “the notifications screen” block to the
  > e2e suite (“lists notifications”, “writes the text in the requested language”, “counts unread”, “marks one
  > read”, “marks all read”: paging 25 rows with another user’s 3, empty list, `classId: null`, `read: true`, a
  > pending account, the one 422 with three keys, 401s, repeat marks keeping the first `read_at`, 404 for a foreign
  > / unknown / non-UUID id) and the requests to the `.integration.http`; files:
  > `apps/backend/src/modules/notifications/notifications.controller.ts`,
  > `apps/backend/src/modules/notifications/notifications.controller.spec.ts`,
  > `apps/backend/src/modules/notifications/notifications.integration.http`,
  > `apps/backend/test/notifications.e2e-spec.ts`; verified: `npx vitest run
  > src/modules/notifications/notifications.controller.spec.ts` (18 passed, controller at 100%), `npm run test:e2e
  > --workspace apps/backend -- notifications` (51 passed), `tsc --noEmit` clean, `npm run lint` exit 0 with the
  > same 10 pre-existing warnings as before the change; deviations: `notifications.module.ts` needed no change — it
  > already provides `PrismaNotificationRepository` and `SystemClockProvider`, which the controller now injects.

### Mobile (`apps/mobile`)

- [x] **T-06** — Extract the routing of `use-notification-response.hook.ts` into
  `apps/mobile/src/modules/notifications/utils/notification-target.ts` (`notificationTarget(type, classId, flow)` →
  an href or `null`, same destinations, D-07), keep the push handler's `routes.home` fallback for `null`, and send
  `POST /notifications/<notificationId>/read` on a handled tap (D-08); tests in `notification-target.test.ts` (every
  type × flow destination and `null`) and `use-notification-response.hook.test.tsx` (mark sent, none without id, a
  failed mark still routes). Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-09, ER-11 · Done when: `npx jest src/modules/notifications` passes from `apps/mobile`.
  > ✅ 2026-10-23 13:39 — Moved the routing of the push handler into `notificationTarget(type, classId, flow)` → an
  > href or `null` (same destinations and order; the two instructor class-detail branches of `enrolment.requested` /
  > `enrolment.cancelled` merged into one condition), the handler keeps `router.replace(routes.home)` for `null`; on
  > a handled tap with a session and a string `notificationId` it now sends `POST /notifications/<id>/read`, not
  > awaited, failures ignored (D-08); files: `apps/mobile/src/modules/notifications/utils/notification-target.ts`,
  > `apps/mobile/src/modules/notifications/utils/notification-target.test.ts`,
  > `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.ts`,
  > `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.test.tsx`; verified: `npx jest
  > src/modules/notifications` from `apps/mobile` (7 suites, 241 passed, including every existing push-routing case;
  > every type × student / instructor / admin with and without a class id, the seven other flows and unknown types
  > in `notification-target.test.ts`; the mark sent, none without an id or a session, a failed mark still routing,
  > one mark for a response handled twice), coverage of `src/modules/notifications` 100%, `tsc --noEmit` clean;
  > deviations: none.

- [x] **T-07** — Add the hooks in `apps/mobile/src/modules/notifications/hooks/`: `useNotifications` (infinite query
  `["notifications", "list"]`, `locale` from `toBackendLocale`, D-10), `useUnreadNotificationsCount`
  (`["notifications", "unread-count"]`), `useMarkNotificationRead` and `useMarkAllNotificationsRead` (optimistic cache
  updates, rollback on failure for "all", both invalidate the count, D-07, D-12), with the types in
  `modules/notifications/notifications.types.ts`; make `use-notification-received.hook.ts` invalidate both keys for
  every push (D-09); tests next to each hook. Skill:
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-12 · Done when: `npx jest src/modules/notifications/hooks` passes from `apps/mobile`.
  > ✅ 2026-10-23 13:48 — Added `useNotifications` (infinite query `["notifications", "list"]`, `GET
  > /notifications?page=N&perPage=20&locale=<toBackendLocale>`, next page while `page * perPage < total`, rows
  > repeated across pages dropped by `id`), `useUnreadNotificationsCount` (`["notifications", "unread-count"]`,
  > `count` 0 while unknown or failed), `useMarkNotificationRead` (optimistic: the row read and the cached count
  > down by one when it was unread; silent on failure; count invalidated when settled) and
  > `useMarkAllNotificationsRead` (optimistic: every row read and the count 0; snapshot put back on failure; count
  > invalidated when settled), the API types in `notifications.types.ts`, the keys / page size / `markReadInPages`
  > in `utils/notifications-cache.ts`; `useNotificationReceived` now invalidates both keys for every push before its
  > per-type invalidations; files: `apps/mobile/src/modules/notifications/notifications.types.ts`,
  > `apps/mobile/src/modules/notifications/notifications.test-utils.tsx`,
  > `apps/mobile/src/modules/notifications/utils/notifications-cache.ts`,
  > `apps/mobile/src/modules/notifications/hooks/use-notifications.hook.ts`,
  > `apps/mobile/src/modules/notifications/hooks/use-notifications.hook.test.tsx`,
  > `apps/mobile/src/modules/notifications/hooks/use-unread-notifications-count.hook.ts`,
  > `apps/mobile/src/modules/notifications/hooks/use-unread-notifications-count.hook.test.tsx`,
  > `apps/mobile/src/modules/notifications/hooks/use-mark-notification-read.hook.ts`,
  > `apps/mobile/src/modules/notifications/hooks/use-mark-notification-read.hook.test.tsx`,
  > `apps/mobile/src/modules/notifications/hooks/use-mark-all-notifications-read.hook.ts`,
  > `apps/mobile/src/modules/notifications/hooks/use-mark-all-notifications-read.hook.test.tsx`,
  > `apps/mobile/src/modules/notifications/hooks/use-notification-received.hook.ts`,
  > `apps/mobile/src/modules/notifications/hooks/use-notification-received.hook.test.tsx`; verified: `npx jest
  > src/modules/notifications` from `apps/mobile` (274 passed, every source file of the module at 100%; the
  > received-hook cases that asserted “no invalidation” for `class.reminder` and unknown types now assert exactly
  > the two notification keys, and all 18 types are checked to invalidate both), `tsc --noEmit` and `eslint
  > src/modules/notifications` clean; deviations: the shared keys and the optimistic-update helper live in a new
  > `utils/notifications-cache.ts` (as `modules/admin/utils/registrations-cache.ts`), and a
  > `notifications.test-utils.tsx` (as the people module’s) holds the test fixtures.

- [x] **T-08** — Add `NotificationRow` in `apps/mobile/src/modules/notifications/components/notification-row/`
  (component, hook, types, index; icon and tone by [Row icons](#row-icons), title, optional body, `formatCreatedAt`
  time, `sun` dot when unread, accessibility label by D-13, `Pressable`), with
  `notification-row.component.test.tsx`. Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-07 · Done when: `npx jest src/modules/notifications/components` passes from `apps/mobile`.
  > ✅ 2026-10-23 13:51 — Added `NotificationRow` (component, hook, types, index): a `Pressable` card
  > (`rounded-card`, `bg-surface`, `shadowStyle("card")`) with a round tinted tile and Ionicons glyph from
  > `notificationIcon(type)` (the Row icons table; unknown types → `notifications-outline` on `infoTint`), the title
  > (`ds-text-list-title`), the body only when not empty, the `formatCreatedAt` time (“Agora” / “Ahora” / “Now”
  > under a minute), a `bg-sun` dot while unread, and the accessibility label “title, body, time” plus “, não lido”
  > / “, no leído” / “, unread” when unread (D-13); the two row strings went into a new `notifications` namespace of
  > the three message files; files:
  > `apps/mobile/src/modules/notifications/components/notification-row/notification-row.component.tsx`,
  > `apps/mobile/src/modules/notifications/components/notification-row/notification-row.hook.ts`,
  > `apps/mobile/src/modules/notifications/components/notification-row/notification-row.types.ts`,
  > `apps/mobile/src/modules/notifications/components/notification-row/index.ts`,
  > `apps/mobile/src/modules/notifications/components/notification-row/notification-row.component.test.tsx`,
  > `apps/mobile/src/modules/notifications/utils/notification-icon.ts`,
  > `apps/mobile/src/modules/notifications/notifications.test-utils.tsx`, `apps/mobile/src/i18n/messages/en-US.ts`,
  > `apps/mobile/src/i18n/messages/pt-BR.ts`, `apps/mobile/src/i18n/messages/es-ES.ts`; verified: `npx jest
  > src/modules/notifications/components` from `apps/mobile` (10 passed; component, hook and `notification-icon.ts`
  > at 100%), `npx jest src/i18n` (passes, the three locales keep the same keys), `tsc --noEmit` and `eslint` clean;
  > deviations: the icon table lives in `utils/notification-icon.ts` so the screen and tests share it.

- [ ] **T-09** — Add `NotificationsScreen` in `apps/mobile/src/modules/notifications/screens/notifications.screen.tsx`
  (title "Avisos" and the `headerRight` mark-all `HeaderButton` through `<Stack.Screen options>`, skeleton, empty and
  error states, the list with paging and pull to refresh, row tap → mark read and `router.push(notificationTarget(…))`
  for the session's flow, mark-all with its toast), the copy of D-06, D-12 and D-13 in
  `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`, with `notifications.screen.test.tsx`. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-07, ER-08, ER-09, ER-10 · Done when: `npx jest src/modules/notifications/screens` passes from `apps/mobile`.

- [ ] **T-10** — Add the routes `apps/mobile/src/app/(private)/{student,instructor,admin}/notifications.tsx` (each
  renders `NotificationsScreen`) and `routes.<role>.notifications` in `apps/mobile/src/constants/routes.ts`; in
  `apps/mobile/src/components/user-header/` give the bell an `onPress` that pushes the signed-in role's notifications
  route, replace `UNREAD_NOTIFICATIONS_COUNT` with `useUnreadNotificationsCount` (refetched when the screen gains
  focus, no badge on failure) and delete `user-header.constants.ts`; update `user-header.component.test.tsx`. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-06 · Done when: `npx jest src/components/user-header src/navigation` passes from `apps/mobile`.

### Verification

- [ ] **T-11** — Run every command in the Verification Plan from the repo root; all pass. Follow the user journeys on
  the iOS simulator and record what was seen. Record the output summary as evidence. Covers: all · Done when: every
  automated command exits 0 and each journey's expected observation is recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 055` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 055` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 055` — the backend e2e suite passes, including the new cases of
    `apps/backend/test/notifications.e2e-spec.ts`.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
- User journeys (iOS simulator, backend running with the migration applied, a database seeded with notifications for
  the signed-in accounts, e.g. by approving a seat request and editing a class):
  - **Bell and badge** — signed in as a student with 3 unread notifications: the Agenda's bell shows "3"; tapping it
    opens "Avisos" above the tabs with a back button; the rows show icon, title, body, relative time and the orange
    dot. Repeat the bell tap as an instructor and as an admin: their "Avisos" opens.
  - **Row tap** — tapping the unread `enrolment.approved` row opens that class's details; going back, the row has no
    dot; going back to the Agenda, the badge shows "2".
  - **Mark all** — on "Avisos", tapping the header's check button clears every dot and hides the button; back on the
    home, the bell has no badge. With the device in Spanish or English, the title and the rows are in that language.
  - **Empty** — signed in as an account with no notifications: "Avisos" shows "Nenhum aviso por enquanto" and no
    header button.

## Memory Impact

- `memory/product.md` — Current state: the notifications screen with read state for students, instructors and admins
  (opened from the bell, mark one by tapping, mark all, real badge); remove "The notifications screen (with read /
  unread state)" from Out of scope (keep app-icon badges, rich pushes and the pre-permission screen there); the
  Notification concept's text is now written by the backend for the app as well as for the push.
- `memory/modules/notifications.md` — the read state (`readAt`, idempotent marks), the four use cases and who can use
  them (own notifications only, any status, 404 for others'), the in-app text (push copy minus "open the app"),
  and remove "Nothing reads the stored notifications yet" from Boundaries.
- `memory/modules.md` — Notifications: it now also shows each person their notifications with read state; drop
  "nothing shows the stored notifications yet".
- `memory/technical-context.md` — Push notifications / Applications: `read_at`, the four endpoints with their errors,
  `renderInApp`, the mobile query keys `["notifications", "list" | "unread-count"]`, `notificationTarget` shared by
  the push handler and the screen, and the bell's real count.
- `memory/structure.md` — the `notifications_add_read_at` migration, the four use cases, the
  `/<role>/notifications` routes and `modules/notifications/{components,screens}` in the mobile app.

## Assumptions

- Seeing the design's exact copy (class names, before/after values) is not expected; rows use the push copy (D-02).

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
