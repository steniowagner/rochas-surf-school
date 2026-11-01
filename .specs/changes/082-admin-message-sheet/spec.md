---
id: "082"
slug: admin-message-sheet
title: Admin messages open in a sheet and stay on the class
status: in-review
created: 2026-10-31
started: 2026-10-31
base_commit: 1fad1cf64e369b66c7644648312065dd1db302fc
fronts: [classes, notifications, backend, packages, mobile]
depends_on: []
---

# 082 — Admin messages open in a sheet and stay on the class

## Goal

Today, tapping the push of an admin's message takes the person away from what it said: a class message opens the
class, and a notice opens the home. With this change the push and the Avisos row of a notice or a class message open a
sheet with the message, its sender and, for a class message, the class. Every class also keeps its messages, so anyone
who opens class details can read them in a new "Mensagens desta aula" section.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: **Notification**, **Broadcast**, **Class message**,
  the rule on text written by admins (shown as written), and the people directory's WhatsApp rule.
- Requirements: [requirements.md → Notifications screen](../../../.docs/requirements.md#notifications-screen) — every
  notification stays on the screen; [requirements.md → Broadcasts](../../../.docs/requirements.md#broadcasts) — notices
  to an audience; [requirements.md → Text written by admins](../../../.docs/requirements.md#text-written-by-admins) —
  shown as written, whatever the language.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Applications (`apps/mobile`:
  Push, Notifications screen, Dates), Persistence, Automated validation, Coverage.
- Modules: [notifications.md](../../memory/modules/notifications.md), [classes.md](../../memory/modules/classes.md).
- Design references (layout only, see D-01):
  - [message-sheet.png](designs/message-sheet.png) — the sheet, with a class message on the left and a notice on the
    right. It draws the sheet over the home; here it opens over Avisos or class details. Its one-line class card is
    replaced by D-18, and it has the close button D-17 removes. Its sender line is what D-20 goes back to.
  - [message-sheet-content.png](designs/message-sheet-content.png) — the title, the description, the label and the class
    card under them (D-18, D-19). The label reads "A aula" here, and the card's colors follow D-18.
  - [message-sheet-sender.png](designs/message-sheet-sender.png) — the sender as text (D-20). The time stays relative.
  - [class-messages-section.png](designs/class-messages-section.png) — the class details section.
  - ~~[request-seat-class-card.webp](designs/request-seat-class-card.webp) — the "Pedir para entrar" sheet; its class card
    is the one this spec reuses.~~ (removed: D-18 replaces that card)
  - ~~[sender-chip.png](designs/sender-chip.png) — the instructor pill of class details, used for the sender.~~ (removed:
    D-20)
- Existing code this builds on:
  - `modules/classes/src/school-class/usecase/send-class-message.usecase.ts` — validates, then tells the instructors and
    the class audience. It returns early when nobody is left to tell, and stores nothing.
  - `modules/classes/src/school-class/usecase/get-class.usecase.ts` — `visibleNumber`, the WhatsApp rule; a local function
    today.
  - `modules/classes/src/school-class/provider/class-change-notifier.provider.ts` — the `ClassMessage` event.
  - `modules/notifications/src/notification/usecase/send-broadcast.usecase.ts`, `list-notifications.usecase.ts`.
  - `apps/backend/src/modules/notifications/notifications.controller.ts` — `GET /notifications`; `renderInApp` writes a
    `class.message` body with the class line before the text, which is why the sheet needs the text on its own.
  - `apps/backend/src/modules/notifications/notifications.class-change-notifier.ts` — stores `class.message`.
  - `apps/mobile/src/modules/notifications/utils/notification-target.ts`, `hooks/use-notification-response.hook.ts`,
    `hooks/use-notification-received.hook.ts`, `screens/notifications.screen.hook.ts`.
  - `apps/mobile/src/modules/classes/screens/class-details.screen.tsx`, `components/instructor-pill/`,
    `hooks/use-class.hook.ts` (query `["classes", "detail", id]`).
  - ~~`apps/mobile/src/modules/enrolment/components/request-seat-class-card/`.~~ (removed: D-18)
  - `apps/mobile/src/modules/enrolment/components/class-requests-group/` — the class header of Class enrolments (D-18).
  - ~~`apps/mobile/src/modules/people/components/person-sheet/` — takes `name`, `photoUrl`, `role` and `whatsappNumber`.~~
    (removed: D-20)
  - `apps/mobile/src/modules/notices/hooks/use-send-class-message.hook.ts`.

### API contract

The sender, in every answer below (`null` by ER-05):

```json
{ "id": "uuid", "name": "Ana Souza", "photoUrl": null, "role": "admin", "whatsappNumber": null }
```

| Route | Auth | Answer |
| --- | --- | --- |
| `GET /classes/:id/messages` | approved account, any role | 200 `{ items: [{ id, title, message, createdAt, sender }] }`, newest first. 403 not approved, 404 `class.notFound`. |
| `GET /notifications` | as today | Each item gains `adminMessage`: `{ title, text, sender }` for `broadcast` and `class.message`, `null` for every other type. `title`, `body` and the other fields don't change. |
| `GET /notifications/:id?locale=` | any signed-in account | 200, one item of the same shape. 404 `notification.notFound` for a malformed id, an unknown one or someone else's. Declared after `unread-count`. |

## Scope

### In scope

- The `class_messages` table, its aggregate in `modules/classes` and `GET /classes/:id/messages`.
- `senderId` in the params of new `broadcast` and `class.message` notifications, and the sender read when reading.
- `adminMessage` on notifications, and `GET /notifications/:id`.
- The message sheet, opened on Avisos (from a push or a row) and on class details.
- The "Mensagens desta aula" section of class details, for every role.
- The copy in pt-BR, es-ES and en-US, and one type token.

### Out of scope

- The web designs (`apps/web/src/modules/designs`, `.docs/designs`) and the user journey pages.
- Backfilling `class_messages` from notifications sent before this spec.
- Editing or deleting a sent message.
- A list of the notices an admin sent. Notices aren't stored outside the notifications.
- The sheet for `class.cancelled` and for denial or take-out reasons. Those keep opening the class.
- Unread dots in the section, or any link between a section row and the reader's notification.
- The Avisos row's text, icon or layout.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | All new app copy is Brazilian Portuguese in pt-BR, with es-ES and en-US next to it: "Mensagem da escola", "Mensagens desta aula", "Ok, entendi" (never "Ok, percebi"). The mockups are a layout reference only; their European Portuguese text doesn't bind. | Decided with the user: the product is written in Brazilian Portuguese. |
| D-02 | `class_messages` belongs to the Classes module, in a new `class-message` aggregate: `id`, `class_id` (→ `classes`, `ON DELETE CASCADE`), `sender_id` (→ `users`, required, `ON DELETE RESTRICT`), `title`, `message`, `created_at`, indexed on `class_id` + `created_at`. | Decided with the user: messages must be readable by anyone who opens the class, which the per-recipient notifications can't do. Deleted classes were mistakes, so their messages go with them. Accounts stay as anonymous records (spec 067), so the sender row always exists. |
| D-03 | Every approved account that can read a class can read its messages, in any class state and whether or not it has a seat there. The send screen's copy doesn't change. | Decided with the user. It also fits the product's rule that everything is visible to every approved user. |
| D-04 | No backfill. The section starts empty, and notifications sent before this spec still open their sheet from their own params, without a sender. | The app is only on staging, and rebuilding old rows would mean guessing which notifications were one message. |
| D-05 | The sheet is only for `broadcast` and `class.message`. This replaces spec 063 D-05 (a notice shows the home) and spec 069 (a class message opens the class), and it applies to both the push and the Avisos row, which spec 055 D-07 keeps the same. | They are the messages admins write to people. `class.cancelled` and the reasons already lead to a screen that shows them. |
| D-06 | A `class.message` notification keeps its own `title` and `message`, as today, and doesn't reference the `class_messages` row. | An inbox must survive the class being deleted. |
| D-07 | The sender is read when reading, never stored in a notification: notifications store only `senderId`, and name, photo, role and WhatsApp number come from the account. Notifications gets a new port, `MessageSenderReader` (it doesn't depend on `auth`), and the Classes read joins the account. `role` is part of the answer because the person sheet shows it. | Decided with the user. Storing a name would break erasure (spec 067), or force deleting the message from people's inboxes. |
| D-08 | A sender whose account is closed but not yet erased keeps their name in the sheet, and the API answers no number (the WhatsApp rule answers `null` for anyone who isn't approved). | The same behavior as a class's instructors (`visibleNumber`). |
| D-09 | ~~The sender is drawn with `InstructorPill`, imported from `modules/classes`, not copied. It reads "Você" with a `lagoon` border when the viewer is the sender. It sits below the header row, which keeps the icon tile, "Mensagem da escola" and the relative time.~~ (removed: replaced by D-20) | Decided with the user: the chip describes the sender and opens their details. |
| D-10 | ~~Pressing the chip hides the message sheet and opens `PersonSheet`; closing `PersonSheet` shows the message sheet again. One sheet is visible at a time, and `MessageSheet` owns the swap, so both screens get it.~~ (removed: D-20, there is no chip to press) | It doesn't depend on how the sheet library stacks modals. |
| D-11 | ~~The class card is `RequestSeatClassCard`, which gains an optional `onPress`: with it the card is pressable and shows a chevron. Without it, nothing changes on the "Pedir para entrar" sheet. Its data comes from the class query, so it's never stale.~~ (removed: replaced by D-18) | Decided with the user (PS2 of the request), over the mockup's one-line card. A notification holds no level, end time or location, and those can change. |
| D-12 | Opening a message from class details never marks a notification read. | Most readers have no notification for that message, and linking the two needs a new read across modules. The dot stays on Avisos until it is tapped there or marked with "mark all". |
| D-13 | The sheet's title uses a new type token, `messageTitle` (`ds-text-message-title`): display font, weight 700, size 30, not uppercase. | Admin text is shown as written, and `sheetTitle` is uppercase. |
| D-14 | A section row's time, in America/Fortaleza and the app's language: `HH:mm` for today, the short weekday for the 6 days before today ("Qui"), and `d MMM` before that ("12 out", without a trailing "."). | As in the mockup, which leaves older messages open. |
| D-15 | The section sits between the people card (with its read-only note) and "Regras". Its label reads "Mensagens desta aula · N". Each row shows at most 2 lines of title and 2 of text, and there is no pagination. | A class is one session, so it holds few messages. |
| D-16 | The sheet doesn't scroll. | 60 characters of title and 500 of text fit on a phone with the class card. |
| D-17 | The sheet has no close button. "Ok, entendi", the backdrop and dragging down close it. | Decided with the user: the primary button already closes it. |
| D-18 | The class card is the class header of Class enrolments (`ClassRequestsGroup`), extracted to `ClassDayHeader` in `modules/enrolment` and not copied: the day block, the chips, the time range and the location, with its colors and without its occupancy bar. In the sheet it sits in a pressable card with a chevron, under the "A aula" label, and the day block drops the year and shows the month in uppercase ("NOV"). Class enrolments doesn't change. Its data comes from the class query, so it's never stale. `RequestSeatClassCard` goes back to how it was. | Decided with the user. A notification holds no level, end time or location, and those can change. |
| D-19 | The description is `ds-text-body` in `text-ink`, 12 px under the title, as in [message-sheet-content.png](designs/message-sheet-content.png). The title stays as D-13 says. | Decided with the user. |
| D-20 | The sender is plain text in the header row, under "Mensagem da escola", with the relative time: "Ana Rocha · há 5 minutos", in `ds-text-list-subtitle`. It shows the account's name even for the viewer, and it isn't pressable. The API contract doesn't change, so `role` and `whatsappNumber` stay in the answer with no screen reading them. The time stays relative, as in ER-11. | Decided with the user, from [message-sheet-sender.png](designs/message-sheet-sender.png). |

## Expected Results

### ER-01 — A class message is stored on the class

- **Front:** backend
- **Behavior:** Given an approved admin and a class that hasn't finished, when they send a valid
  `POST /classes/:id/message`, then one `class_messages` row holds the class, the sender and the trimmed title and
  message, and the people of the class are told as before.
- **Edge and error cases:** the row is stored when nobody would be told (a class with no students whose only instructor
  is the sender). Every refusal of spec 069 (403, 404, 409, 422) stores nothing. A failing notifier still answers 204 and
  keeps the row. A failing store answers an error and tells nobody.
- **Verify by:** `npm test -w @rochas-surf-school/classes` (`send-class-message.usecase.test.ts`) and the "stores" tests
  of `apps/backend/test/class-messages.e2e-spec.ts`.

### ER-02 — Anyone who can open a class reads its messages

- **Front:** backend
- **Behavior:** Given a class with messages, when any approved account of any role calls `GET /classes/:id/messages`,
  then it answers 200 with every message of the class, newest first, whether or not the reader is part of the class.
- **Edge and error cases:** a class with none answers `{ items: [] }`. A started, finished or cancelled class still
  answers its messages. A pending, denied, deleted or removed account answers 403. A malformed or unknown id answers 404
  `class.notFound`. Deleting a class deletes its messages.
- **Verify by:** `npm test -w @rochas-surf-school/classes` (`list-class-messages.usecase.test.ts`) and the "list" tests of
  `apps/backend/test/class-messages.e2e-spec.ts`.

### ER-03 — The sender comes from the account when reading

- **Front:** backend
- **Behavior:** Given a message or a new notice, when it is read through any route of the API contract, then `sender`
  holds the account's current id, name, photo URL and role.
- **Edge and error cases:** a sender who changed their name or photo after sending shows the new values. A notification
  row holds no name, photo or number.
- **Verify by:** the "sender" tests of `apps/backend/test/class-messages.e2e-spec.ts` and of
  `apps/backend/test/notifications.e2e-spec.ts`.

### ER-04 — The sender's WhatsApp number follows the existing rule

- **Front:** backend
- **Behavior:** Given a sender with a WhatsApp number, when a message is read, then `whatsappNumber` is the number when
  the sender shares it or the reader is an admin, and `null` otherwise.
- **Edge and error cases:** a sender who has no number, or who isn't approved any more (D-08), answers `null` to everyone,
  admins included.
- **Verify by:** `npm test -w @rochas-surf-school/classes` (`list-class-messages.usecase.test.ts`),
  `npm test -w @rochas-surf-school/notifications` (`list-notifications.usecase.test.ts`) and the "whatsapp" tests of both
  e2e files of ER-03.

### ER-05 — A sender that can't be read is absent

- **Front:** backend
- **Behavior:** Given a notification or message whose sender's account was erased, when it is read, then `sender` is
  `null` and the title and text still answer.
- **Edge and error cases:** a notification stored before this spec, with no `senderId`, answers `sender: null`. So does
  a `senderId` that matches no account.
- **Verify by:** `npm test -w @rochas-surf-school/notifications` (`list-notifications.usecase.test.ts`) and the "erased
  sender" tests of both e2e files of ER-03.

### ER-06 — New notices and class messages store who sent them

- **Front:** backend
- **Behavior:** Given an admin sends a notice or a class message, when its notifications are stored, then their params
  hold `senderId` next to the fields they already had.
- **Edge and error cases:** the push title, the push body and the in-app text don't change.
- **Verify by:** `npm test -w @rochas-surf-school/notifications` (`broadcast.usecase.test.ts`), the adapter's spec
  `apps/backend/src/modules/notifications/notifications.class-change-notifier.spec.ts` and the existing
  `push-messages.spec.ts`.

### ER-07 — One notification can be read by its owner

- **Front:** backend
- **Behavior:** Given a person with a notification, when they call `GET /notifications/:id?locale=pt-BR`, then it answers
  200 with the item in the same shape as the list.
- **Edge and error cases:** a malformed id, an unknown one and someone else's answer 404 `notification.notFound`. An
  invalid locale answers 422 `notifications.locale.invalid`. Reading doesn't mark it read. `GET /notifications/unread-count`
  still answers the count.
- **Verify by:** `npm test -w @rochas-surf-school/notifications` (`get-notification.usecase.test.ts`) and the "one
  notification" tests of `apps/backend/test/notifications.e2e-spec.ts`.

### ER-08 — Notifications carry the admin's text on its own

- **Front:** backend
- **Behavior:** Given a `broadcast` or `class.message` notification, when it is read, then `adminMessage` holds the title
  and the text exactly as written, without the class line.
- **Edge and error cases:** every other type answers `adminMessage: null`. `body` keeps the class line, so the Avisos row
  doesn't change.
- **Verify by:** the "admin message" tests of `apps/backend/test/notifications.e2e-spec.ts`.

### ER-09 — A tapped push opens Avisos with its message

- **Front:** mobile
- **Behavior:** Given a `broadcast` or `class.message` push and an account in the student, instructor or admin flow, when
  it is tapped, then the app opens that flow's Avisos screen with the sheet of that notification, and the notification is
  marked read as before.
- **Edge and error cases:** a notification beyond the loaded pages is fetched with `GET /notifications/:id`. A failed fetch
  shows Avisos with the `notifications.messageSheet.loadError` toast and no sheet, and an expired session shows no toast. A
  tap while Avisos is already open shows the new message on that screen: the back button doesn't lead to a second Avisos.
  Closing the sheet leaves Avisos, and it doesn't open again on its own.
- **Verify by:** `notification-target.test.ts`, `use-notification-response.hook.test.tsx` and
  `notifications.screen.test.tsx` (`npx jest src/modules/notifications`, from `apps/mobile`); the user journey "Push".

### ER-10 — An Avisos row of an admin's message opens the sheet

- **Front:** mobile
- **Behavior:** Given a `broadcast` or `class.message` row on Avisos, when it is tapped, then the sheet opens on that
  screen at once, with no navigation and no extra request, and an unread row is marked read.
- **Edge and error cases:** every other type behaves as before, `class.cancelled` and `class.edited` included.
- **Verify by:** `notifications.screen.test.tsx` (`npx jest src/modules/notifications`).

### ER-11 — The sheet shows a notice

- **Front:** mobile
- **Behavior:** Given a `broadcast`, when its sheet opens, then it shows the icon tile, "Mensagem da escola", the sender's
  name with the relative time on one line (D-20), the title and the text as written, and no class card; "Ok, entendi"
  closes it.
- **Edge and error cases:** the backdrop and dragging down also close it, and there is no close button (D-17). With no
  sender the line holds only the time, and with a date it can't read, only the sender. The sender isn't pressable. The
  title isn't uppercased.
- **Verify by:** `message-sheet.component.test.tsx` (`npx jest src/modules/notifications`); the user journey "Sheet".

### ER-12 — The sheet shows the class of a class message

- **Front:** mobile
- **Behavior:** Given a `class.message` opened from Avisos, when its sheet opens, then it shows the "A aula" label and
  the card of D-18 with the class's current data and a chevron, and pressing it closes the sheet and opens that class's
  details in the account's flow.
- **Edge and error cases:** a skeleton shows while the class loads. A deleted class or a failed read shows the sheet
  without the label or the card, and the message stays readable. A cancelled class still shows the card. The day block
  shows no year, and its month is uppercase.
- **Verify by:** `message-sheet.component.test.tsx` and `notifications.screen.test.tsx`
  (`npx jest src/modules/notifications`); the user journey "Sheet".

### ~~ER-13 — The sender chip opens their details~~ (removed: D-20, the sender is plain text)

- **Front:** mobile
- **Behavior:** Given a sheet with a sender, when the chip is pressed, then the person sheet shows the sender's name,
  photo, role and, when the API gave one, the WhatsApp row; closing it shows the message sheet again.
- **Edge and error cases:** the chip reads "Você" when the viewer is the sender (D-09). A sender with no number shows no
  WhatsApp row.
- **Verify by:** `message-sheet.component.test.tsx` (`npx jest src/modules/notifications`); the user journey "Sheet".

### ER-14 — Class details lists the class's messages

- **Front:** mobile
- **Behavior:** Given a class with messages, when any role opens its details, then "Mensagens desta aula · N" lists them
  newest first, each with the megaphone tile, the title, the text and the time of D-14, in the place of D-15.
- **Edge and error cases:** the section is hidden with no messages, while they load and when the read fails, and the rest
  of the screen is unaffected. It shows on finished and cancelled classes.
- **Verify by:** `class-messages.component.test.tsx` and `class-details.screen.test.tsx`
  (`npx jest src/modules/classes`), and `class-message-time.test.ts`; the user journey "Section".

### ER-15 — A section row opens the sheet

- **Front:** mobile
- **Behavior:** Given a row of the section, when it is pressed, then the message sheet opens with no class card, and no
  notification is marked read.
- **Edge and error cases:** the sender shows as in ER-11. The Avisos bell's count doesn't change.
- **Verify by:** `class-details.screen.test.tsx` (`npx jest src/modules/classes`).

### ER-16 — A new message reaches an open class details screen

- **Front:** mobile
- **Behavior:** Given a person on a class's details, when a `class.message` push about that class arrives with the app
  open, then the section reloads, and the same happens for the admin after sending one.
- **Edge and error cases:** the notifications list and the unread count reload as before. A push about another class
  doesn't reload this section.
- **Verify by:** `use-notification-received.hook.test.tsx` (`npx jest src/modules/notifications`) and
  `use-send-class-message.hook.test.tsx` (`npx jest src/modules/notices`); the user journey "Section".

### ER-17 — Flows without Avisos keep working

- **Front:** mobile
- **Behavior:** Given an account in any flow but student, instructor or admin (onboarding or the rules-update screen, for
  example), when a `broadcast` or `class.message` push is tapped, then the app goes to the flow's home as it does today.
- **Edge and error cases:** the notification is marked read and stays on Avisos for later.
- **Verify by:** `notification-target.test.ts` and `use-notification-response.hook.test.tsx`
  (`npx jest src/modules/notifications`).

## Tasks

### Classes (`modules/classes`)

- [x] **T-01** — Create the `class-message` aggregate in `modules/classes/src/class-message/`: `model/class-message.entity.ts`
  (`ClassMessage`, using `CLASS_MESSAGE_TITLE_MAX` and `CLASS_MESSAGE_TEXT_MAX`), `provider/class-message.repository.ts`
  (`create`, `findByClass` → the view with the sender's contact and name, newest first) and
  `usecase/list-class-messages.usecase.ts` (`assertCanReadClasses`, 404, the sender answer, `null` for an erased one),
  with `FakeClassMessageRepository` in `test/mock/` and tests in `test/class-message/`. Move `visibleNumber` out of
  `get-class.usecase.ts` to a shared helper, so both read the same rule. Skills:
  [`module-aggregate`](../../../.claude/skills/module-aggregate), [`module-entity`](../../../.claude/skills/module-entity),
  [`module-repository`](../../../.claude/skills/module-repository), [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-02, ER-03, ER-04, ER-05 · Done when: `npm test -w @rochas-surf-school/classes` passes.
  > ✅ 2026-10-31 23:38 — Created the class-message aggregate (entity with the title/text limits, repository contract
  > with the sender view, ListClassMessages) and moved visibleNumber to a shared helper; files:
  > `modules/classes/src/index.ts`, `modules/classes/src/class-message/index.ts`,
  > `modules/classes/src/class-message/model/index.ts`,
  > `modules/classes/src/class-message/model/class-message.entity.ts`,
  > `modules/classes/src/class-message/provider/index.ts`,
  > `modules/classes/src/class-message/provider/class-message.repository.ts`,
  > `modules/classes/src/class-message/usecase/index.ts`,
  > `modules/classes/src/class-message/usecase/list-class-messages.usecase.ts`,
  > `modules/classes/src/school-class/usecase/visible-number.ts`,
  > `modules/classes/src/school-class/usecase/get-class.usecase.ts`,
  > `modules/classes/src/school-class/provider/class-change-notifier.provider.ts`,
  > `modules/classes/test/mock/index.ts`, `modules/classes/test/mock/fake-class-message.repository.ts`,
  > `modules/classes/test/mock/fake-class-change.notifier.ts`,
  > `modules/classes/test/class-message/model/class-message.entity.test.ts`,
  > `modules/classes/test/class-message/usecase/list-class-messages.usecase.test.ts`,
  > `apps/backend/src/modules/notifications/notifications.class-change-notifier.ts`; verified: `npm test -w
  > @rochas-surf-school/classes` (42 suites, 638 passed); deviations: the notifier event `ClassMessage` was renamed
  > `ClassMessageSent`, because the module barrel cannot export it next to the new `ClassMessage` entity (this
  > touches the backend adapter too).

- [x] **T-02** — In `send-class-message.usecase.ts`, store the `ClassMessage` after the state checks and before the early
  return for nobody to tell, and pass `senderId` in the `ClassMessage` event (`class-change-notifier.provider.ts` and
  `test/mock/fake-class-change.notifier.ts`), with one test per case of ER-01. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-06 · Done when: `npm test -w @rochas-surf-school/classes` passes.
  > ✅ 2026-10-31 23:39 — SendClassMessage builds and validates the ClassMessage (same keys as before, now in the
  > entity), stores it after the state checks and before the early return, and passes `senderId` in the event;
  > files: `modules/classes/src/school-class/usecase/send-class-message.usecase.ts`,
  > `modules/classes/src/school-class/provider/class-change-notifier.provider.ts`,
  > `modules/classes/test/school-class/usecase/send-class-message.usecase.test.ts`; verified: `npm test -w
  > @rochas-surf-school/classes` (42 suites, 647 passed, send-class-message.usecase.ts 100%); deviations: the
  > validation moved from the use case to `ClassMessage.validate()` so the rule lives once.

### Notifications (`modules/notifications`)

- [x] **T-03** — In `modules/notifications/src/notification/`: `SendBroadcast` stores `senderId`; add
  `provider/message-sender-reader.provider.ts` (`MessageSenderReader.findSenders(ids)`: the accounts found, by id, with
  name, photo, role, status and WhatsApp fields, D-07) with its fake in `test/mock/`; add `repository.findById(userId, id)`;
  `ListNotifications` takes whether the viewer is an admin and answers `adminMessage` for the two types, with one sender
  read per page; add `usecase/get-notification.usecase.ts`, sharing that mapping. Tests in `test/notification/usecase/`.
  Skills: [`module-use-case`](../../../.claude/skills/module-use-case),
  [`module-repository`](../../../.claude/skills/module-repository).
  Covers: ER-03, ER-04, ER-05, ER-06, ER-07, ER-08 · Done when: `npm test -w @rochas-surf-school/notifications` passes.
  > ✅ 2026-10-31 23:40 — SendBroadcast stores `senderId`; added the MessageSenderReader port and fake, `findById` on
  > the repository, the shared `toNotificationsOut` mapping (one sender read per page, `adminMessage` only for the
  > two types, the WhatsApp rule), `viewerIsAdmin` on ListNotifications and the GetNotification use case; files:
  > `modules/notifications/src/notification/provider/message-sender-reader.provider.ts`,
  > `modules/notifications/src/notification/provider/index.ts`,
  > `modules/notifications/src/notification/provider/notification.repository.ts`,
  > `modules/notifications/src/notification/usecase/notification-out.ts`,
  > `modules/notifications/src/notification/usecase/get-notification.usecase.ts`,
  > `modules/notifications/src/notification/usecase/list-notifications.usecase.ts`,
  > `modules/notifications/src/notification/usecase/send-broadcast.usecase.ts`,
  > `modules/notifications/src/notification/usecase/index.ts`,
  > `modules/notifications/test/mock/fake-message-sender.reader.ts`,
  > `modules/notifications/test/mock/fake-notification.repository.ts`, `modules/notifications/test/mock/index.ts`,
  > `modules/notifications/test/notification/usecase/get-notification.usecase.test.ts`,
  > `modules/notifications/test/notification/usecase/list-notifications.usecase.test.ts`,
  > `modules/notifications/test/notification/usecase/broadcast.usecase.test.ts`; verified: `npm test -w
  > @rochas-surf-school/notifications` (19 suites, all passed; the new and changed use cases at 100%); deviations:
  > none.

### Backend (`apps/backend`)

- [x] **T-04** — Add `ClassMessage` to `apps/backend/prisma/models/classes.model.prisma` (D-02) with its back-relation in
  `auth.model.prisma`, the migration `classes-add-class-messages`, and `src/modules/classes/class-message.prisma.ts`, with
  its spec. Skills: [`backend-prisma-sync-module`](../../../.claude/skills/backend-prisma-sync-module),
  [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: enabling · Done when: `npm run prisma:migrate:deploy --workspace apps/backend` applies cleanly and the
  repository's spec passes.
  > ✅ 2026-10-31 23:41 — Added the ClassMessage model (D-02) with its back-relations, the migration and
  > PrismaClassMessageRepository (an erased sender reads as null); files:
  > `apps/backend/prisma/models/classes.model.prisma`, `apps/backend/prisma/models/auth.model.prisma`,
  > `apps/backend/prisma/migrations/20261031120000_classes_add_class_messages/migration.sql`,
  > `apps/backend/src/modules/classes/class-message.prisma.ts`,
  > `apps/backend/src/modules/classes/class-message.prisma.spec.ts`; verified: `npm run prisma:migrate:deploy
  > --workspace apps/backend` applied cleanly, `prisma migrate diff` against the schema is empty, `npx vitest run
  > src/modules/classes/class-message.prisma.spec.ts` (3 passed); deviations: the migration SQL came from `prisma
  > migrate diff` instead of `prisma migrate dev`, which needs a TTY; the file is what `migrate dev` would generate.

- [x] **T-05** — In `src/modules/classes/classes.controller.ts`, add `GET /classes/:id/messages` and give `SendClassMessage`
  its repository, wire them in `classes.module.ts`, add the requests to `classes.integration.http`, and write
  `apps/backend/test/class-messages.e2e-spec.ts` with the "stores", "list", "sender", "whatsapp" and "erased sender" tests.
  Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05 · Done when: `npm run test:e2e -- test/class-messages.e2e-spec.ts` passes from
  `apps/backend`.
  > ✅ 2026-10-31 23:43 — Added `GET /classes/:id/messages`, gave SendClassMessage its repository, wired the module,
  > added the requests and the e2e suite; files: `apps/backend/src/modules/classes/classes.controller.ts`,
  > `apps/backend/src/modules/classes/classes.controller.spec.ts`,
  > `apps/backend/src/modules/classes/classes.module.ts`,
  > `apps/backend/src/modules/classes/classes.integration.http`, `apps/backend/test/class-messages.e2e-spec.ts`;
  > verified: `npm run test:e2e -- test/class-messages.e2e-spec.ts` from `apps/backend` (18 passed), `npx vitest run
  > src/modules/classes/classes.controller.spec.ts` (54 passed); deviations: none.

- [x] **T-06** — In `src/modules/notifications/`: add `message-sender-reader.prisma.ts` (leaving erased accounts out), pass
  `senderId` in `notifications.class-change-notifier.ts`, add `adminMessage` to `GET /notifications`, and add
  `GET /notifications/:id` after `unread-count`, with its requests in `notifications.integration.http`, specs for the
  adapters and the "sender", "whatsapp", "erased sender", "one notification" and "admin message" tests in
  `test/notifications.e2e-spec.ts`. Skills: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation),
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-03, ER-04, ER-05, ER-06, ER-07, ER-08 · Done when: `npx vitest run src/modules/notifications` and
  `npm run test:e2e -- test/notifications.e2e-spec.ts` pass from `apps/backend`.
  > ✅ 2026-10-31 23:45 — Added PrismaMessageSenderReader (erased accounts left out), `senderId` in the class.message
  > params, `findById` on the Prisma repository, `adminMessage` on `GET /notifications` and `GET /notifications/:id`
  > after `unread-count`; files: `apps/backend/src/modules/notifications/message-sender-reader.prisma.ts`,
  > `apps/backend/src/modules/notifications/message-sender-reader.prisma.spec.ts`,
  > `apps/backend/src/modules/notifications/notification.prisma.ts`,
  > `apps/backend/src/modules/notifications/notification.prisma.spec.ts`,
  > `apps/backend/src/modules/notifications/notifications.class-change-notifier.ts`,
  > `apps/backend/src/modules/notifications/notifications.class-change-notifier.spec.ts`,
  > `apps/backend/src/modules/notifications/notifications.controller.ts`,
  > `apps/backend/src/modules/notifications/notifications.controller.spec.ts`,
  > `apps/backend/src/modules/notifications/notifications.module.ts`,
  > `apps/backend/src/modules/notifications/notifications.integration.http`,
  > `apps/backend/test/notifications.e2e-spec.ts`; verified: `npx vitest run src/modules/notifications` (23 files,
  > 263 passed), `npm run test:e2e -- test/notifications.e2e-spec.ts` (66 passed), `npx tsc --noEmit -p .` clean,
  > both from `apps/backend`; deviations: `viewerIsAdmin` is true only for an approved admin, because these routes
  > answer accounts of any status.

### Packages (`packages/design-tokens`, `packages/app-messages`)

- [x] **T-07** — Add the `messageTitle` type token to `packages/design-tokens/src/tokens.ts` (D-13) and regenerate
  `tokens.css`. Add to `packages/app-messages/src/{pt-BR,es-ES,en-US}.ts` the keys `notifications.messageSheet.{eyebrow,
  confirm,close,loadError}` and `classDetails.messages.title`, with pt-BR "Mensagem da escola", "Ok, entendi" and
  "Mensagens desta aula · {{count}}", es-ES "Mensaje de la escuela", "Ok, entendido" and "Mensajes de esta clase ·
  {{count}}", and en-US "Message from the school", "OK, got it" and "Messages for this class · {{count}}" (D-01).
  Covers: enabling · Done when: `npm test -w @rochas-surf-school/app-messages` and
  `npm run check-types -w @rochas-surf-school/design-tokens` pass.
  > ✅ 2026-10-31 23:45 — Added the `messageTitle` type token (with `tokens.css` regenerated) and the
  > `notifications.messageSheet` and `classDetails.messages` copy in the three locales; files:
  > `packages/design-tokens/src/tokens.ts`, `packages/design-tokens/src/tokens.css`,
  > `packages/app-messages/src/pt-BR.ts`, `packages/app-messages/src/es-ES.ts`,
  > `packages/app-messages/src/en-US.ts`; verified: `npm test -w @rochas-surf-school/app-messages` (4 passed), `npm
  > run check-types -w @rochas-surf-school/design-tokens` (no errors, CSS not stale); deviations: the spec gave no
  > copy for `close` and `loadError`, so they follow the existing wording of each locale; `messageTitle` has line
  > height 1.1 so wrapped lowercase text does not clip.

- [x] **T-16** — Add `notifications.messageSheet.classLabel` to `packages/app-messages/src/{pt-BR,es-ES,en-US}.ts`: "A aula",
  "La clase" and "The class" (D-18).
  Covers: enabling · Done when: `npm test -w @rochas-surf-school/app-messages` passes.
  > ✅ 2026-11-01 14:10 — Added `notifications.messageSheet.classLabel` in the three locales; files:
  > `packages/app-messages/src/pt-BR.ts`, `packages/app-messages/src/es-ES.ts`, `packages/app-messages/src/en-US.ts`;
  > verified: `npm test -w @rochas-surf-school/app-messages` passes; deviations: none.

### Mobile (`apps/mobile`)

- [x] **T-08** — Add the types and the reads: `adminMessage` on `NotificationItem` with an `AdminMessage` type
  (`title`, `text`, `createdAt`, `classId`, `sender`) in `src/modules/notifications/notifications.types.ts`;
  `hooks/use-notification.hook.ts` (`GET /notifications/:id`, enabled only for an id that isn't in the loaded pages);
  `src/modules/classes/hooks/use-class-messages.hook.ts` (query `["classes", "messages", id]`). Each with its hook test.
  Covers: enabling · Done when: `npx jest src/modules/notifications/hooks src/modules/classes/hooks` passes from
  `apps/mobile`.
  > ✅ 2026-10-31 23:49 — Added `adminMessage` on NotificationItem with the AdminMessage type and `toAdminMessage`,
  > the `useNotification` read of one notification, the class message types and `useClassMessages` with its query
  > key; files: `apps/mobile/src/modules/notifications/notifications.types.ts`,
  > `apps/mobile/src/modules/notifications/notifications.test-utils.tsx`,
  > `apps/mobile/src/modules/notifications/hooks/use-notification.hook.ts`,
  > `apps/mobile/src/modules/notifications/hooks/use-notification.hook.test.tsx`,
  > `apps/mobile/src/modules/notifications/utils/admin-message.ts`,
  > `apps/mobile/src/modules/notifications/utils/admin-message.test.ts`,
  > `apps/mobile/src/modules/notifications/utils/notifications-cache.ts`,
  > `apps/mobile/src/modules/classes/classes.types.ts`,
  > `apps/mobile/src/modules/classes/hooks/use-class-messages.hook.ts`,
  > `apps/mobile/src/modules/classes/hooks/use-class-messages.hook.test.tsx`,
  > `apps/mobile/src/modules/classes/utils/class-messages-cache.ts`; verified: `npx jest
  > src/modules/notifications/hooks src/modules/classes/hooks` passes; deviations: none.

- [x] **T-09** — Give `RequestSeatClassCard` the optional `onPress` of D-11 (a touchable card with a `chevron-forward`),
  with its test; the sheet that uses it doesn't change.
  Covers: enabling · Done when: `npx jest src/modules/enrolment/components/request-seat` passes.
  > ✅ 2026-10-31 23:49 — RequestSeatClassCard takes an optional `onPress`: a touchable card with a
  > `chevron-forward`, unchanged without it; files:
  > `apps/mobile/src/modules/enrolment/components/request-seat-class-card/request-seat-class-card.component.tsx`,
  > `apps/mobile/src/modules/enrolment/components/request-seat-class-card/request-seat-class-card.types.ts`,
  > `apps/mobile/src/modules/enrolment/components/request-seat-class-card/request-seat-class-card.component.test.tsx`;
  > verified: `npx jest src/modules/enrolment/components/request-seat` passes; deviations: none.

- [x] **T-10** — Create `src/modules/notifications/components/message-sheet/` (`MessageSheet`, following
  `.claude/rules/react.md`): `BottomModal` with the `bg-sun` megaphone tile, "Mensagem da escola", the relative time (the
  helper the Avisos row uses, extracted when needed), a close button with a 44 px target, `InstructorPill` (D-09), the
  title in `ds-text-message-title`, the text in `ds-text-body`, `RequestSeatClassCard` when `onOpenClass` is given and the
  class loads (`useClass`, a skeleton while loading, nothing on failure), a primary "Ok, entendi", and its own
  `PersonSheet` with the swap of D-10. Skills: `vercel-react-native-skills`, `vercel-react-best-practices`.
  Covers: ER-11, ER-12, ER-13 · Done when: `npx jest src/modules/notifications/components/message-sheet` passes.
  > ✅ 2026-10-31 23:51 — Created MessageSheet (tile, eyebrow, relative time, close button, sender chip, title, text,
  > class card with skeleton, confirm) and its own PersonSheet with the swap of D-10; the Avisos row and the sheet
  > now share `useRelativeTime`; files: `apps/mobile/src/modules/notifications/components/message-sheet/index.ts`,
  > `apps/mobile/src/modules/notifications/components/message-sheet/message-sheet.component.tsx`,
  > `apps/mobile/src/modules/notifications/components/message-sheet/message-sheet.hook.ts`,
  > `apps/mobile/src/modules/notifications/components/message-sheet/message-sheet.types.ts`,
  > `apps/mobile/src/modules/notifications/components/message-sheet/message-sheet.component.test.tsx`,
  > `apps/mobile/src/modules/notifications/hooks/use-relative-time.hook.ts`,
  > `apps/mobile/src/modules/notifications/components/notification-row/notification-row.hook.ts`,
  > `apps/mobile/src/modules/people/components/person-sheet/person-sheet.component.tsx`,
  > `apps/mobile/src/modules/people/components/person-sheet/person-sheet.types.ts`,
  > `apps/mobile/src/modules/people/components/person-sheet/person-sheet.component.test.tsx`; verified: `npx jest
  > src/modules/notifications/components src/modules/people/components/person-sheet` passes; deviations: PersonSheet
  > gained the optional `hideMissingWhatsapp` prop, because ER-13 asks for no WhatsApp row where the sheet otherwise
  > shows "Number not shared". BottomModal calls `onClose` on any dismiss, so MessageSheet ignores it while the
  > person sheet is open.

- [x] **T-11** — Lead the two types to Avisos: add `routes.<role>.notificationMessage(id)` in `src/constants/routes.ts`, take
  the notification's id in `notificationTarget` (`broadcast` and `class.message`, for the three role flows) and pass it
  from `use-notification-response.hook.ts`, so other flows still fall to `routes.home`. Update
  `notification-target.test.ts` and `use-notification-response.hook.test.tsx`.
  Covers: ER-09, ER-17 · Done when: `npx jest src/modules/notifications/utils src/modules/notifications/hooks` passes.
  > ✅ 2026-10-31 23:53 — Added `routes.<role>.notificationMessage(id)`; `notificationTarget` takes the id and leads
  > `broadcast` and `class.message` to Avisos in the three role flows (other flows still fall to `routes.home`); a
  > tap pushes it with `dangerouslySingular`, so an open Avisos takes the new message; files:
  > `apps/mobile/src/constants/routes.ts`, `apps/mobile/src/modules/notifications/utils/notification-target.ts`,
  > `apps/mobile/src/modules/notifications/utils/notification-target.test.ts`,
  > `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.ts`,
  > `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.test.tsx`; verified: `npx jest
  > src/modules/notifications/utils src/modules/notifications/hooks` (14 suites, 407 passed), and the "without a
  > second one" test fails with the singular option removed; deviations: not stacking Avisos is done here, in the
  > push handler, rather than in T-12, because that is where the navigation happens; added `classDetailTarget`,
  > which T-12 uses.

- [x] **T-12** — In `notifications.screen.hook.ts` and the screen, open `MessageSheet` from a row with `adminMessage` (marking
  it read, without navigating) and from the `notificationId` route param (from the loaded pages, else
  `useNotification`, with the toast of ER-09), clear the param on close, and make a tap on a push while Avisos is open show
  the message without stacking the screen. `onOpenClass` closes the sheet and opens the class in the account's flow.
  Remove the `broadcast` branch that went home. Update `notifications.screen.test.tsx`.
  Covers: ER-09, ER-10, ER-11, ER-12, ER-13 · Done when: `npx jest src/modules/notifications/screens` passes.
  > ✅ 2026-10-31 23:55 — Avisos opens MessageSheet from a row with `adminMessage` (marked read, no navigation) and
  > from the `notificationId` route param (loaded pages, else `useNotification` once the list answered, with the
  > toast of ER-09), clears the param on close without reopening, and the card closes the sheet and opens the class
  > in the account flow; the `broadcast` branch that went home is gone; files:
  > `apps/mobile/src/modules/notifications/screens/notifications.screen.hook.ts`,
  > `apps/mobile/src/modules/notifications/screens/notifications.screen.tsx`,
  > `apps/mobile/src/modules/notifications/screens/notifications.screen.types.ts`,
  > `apps/mobile/src/modules/notifications/screens/notifications.screen.test.tsx`; verified: `npx jest
  > src/modules/notifications` (17 suites, 477 passed), `npx tsc --noEmit -p .` clean, and the expired-session test
  > fails with its guard removed; deviations: the push handler part of not stacking the screen landed in T-11, as
  > noted there.

- [x] **T-13** — Create `src/modules/classes/components/class-messages/` (the section of D-15, with `bg-sun-tint` megaphone
  tiles in one grouped card) and `src/modules/classes/utils/class-message-time.ts` (D-14), and render them in
  `class-details.screen.tsx` with `MessageSheet` and no `onOpenClass`. Tests in `class-messages.component.test.tsx`,
  `class-message-time.test.ts` and `class-details.screen.test.tsx`.
  Covers: ER-14, ER-15 · Done when: `npx jest src/modules/classes` passes.
  > ✅ 2026-11-01 00:05 — Created the "Mensagens desta aula" section (D-15) and `classMessageTime` (D-14), rendered
  > between the people and the rules on class details, with MessageSheet and no `onOpenClass`; files:
  > `apps/mobile/src/modules/classes/components/class-messages/index.ts`,
  > `apps/mobile/src/modules/classes/components/class-messages/class-messages.component.tsx`,
  > `apps/mobile/src/modules/classes/components/class-messages/class-messages.types.ts`,
  > `apps/mobile/src/modules/classes/components/class-messages/class-messages.component.test.tsx`,
  > `apps/mobile/src/modules/classes/utils/class-message-time.ts`,
  > `apps/mobile/src/modules/classes/utils/class-message-time.test.ts`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.tsx`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.hook.ts`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`; verified: `npx jest
  > src/modules/classes` (95 suites, 1120 passed); deviations: `classMessageTime` reuses `weekdayAbbreviation`,
  > because date-fns `EEE` gives "Quinta" in pt-BR.

- [x] **T-14** — Invalidate `["classes", "messages", classId]` for a received `class.message` in
  `use-notification-received.hook.ts` and after a sent one in `src/modules/notices/hooks/use-send-class-message.hook.ts`, with
  tests in both hook test files.
  Covers: ER-16 · Done when: `npx jest src/modules/notifications/hooks src/modules/notices/hooks` passes.
  > ✅ 2026-11-01 00:05 — A received `class.message` invalidates `["classes", "messages", classId]`, and so does a
  > sent one; files: `apps/mobile/src/modules/notifications/hooks/use-notification-received.hook.ts`,
  > `apps/mobile/src/modules/notifications/hooks/use-notification-received.hook.test.tsx`,
  > `apps/mobile/src/modules/notices/hooks/use-send-class-message.hook.ts`,
  > `apps/mobile/src/modules/notices/hooks/use-send-class-message.hook.test.tsx`; verified: `npx jest
  > src/modules/notifications/hooks src/modules/notices/hooks` (13 suites, 205 passed); deviations: none.

- [x] **T-17** — Extract the class header of `ClassRequestsGroup` to `src/modules/enrolment/components/class-day-header/`
  (`ClassDayHeader`, following `.claude/rules/react.md`), with an optional `showYear` that Class enrolments passes, so that
  screen doesn't change; without it the block shows only the uppercase month (D-18). Test in
  `class-day-header.component.test.tsx`. Skills: `vercel-react-native-skills`, `vercel-react-best-practices`.
  Covers: enabling · Done when: `npx jest src/modules/enrolment` passes.
  > ✅ 2026-11-01 14:20 — Extracted the class header to ClassDayHeader, which Class enrolments renders with `showYear`,
  > so that screen doesn't change; files:
  > `apps/mobile/src/modules/enrolment/components/class-day-header/index.ts`,
  > `apps/mobile/src/modules/enrolment/components/class-day-header/class-day-header.component.tsx`,
  > `apps/mobile/src/modules/enrolment/components/class-day-header/class-day-header.hook.ts`,
  > `apps/mobile/src/modules/enrolment/components/class-day-header/class-day-header.types.ts`,
  > `apps/mobile/src/modules/enrolment/components/class-day-header/class-day-header.component.test.tsx`,
  > `apps/mobile/src/modules/enrolment/components/class-requests-group/class-requests-group.component.tsx`; verified:
  > `npx jest src/modules/enrolment` (31 suites passed, `class-requests.screen.test.tsx` still finds "OCT 2026"), `npx
  > tsc --noEmit -p .` clean; deviations: none.

- [x] **T-18** — In `MessageSheet`: remove the close button and the `notifications.messageSheet.close` key (D-17), set the
  description of D-19, and replace `RequestSeatClassCard` with the label and the card of D-18, with a skeleton of that
  card's height. Undo T-09 in `request-seat-class-card/`. Update `message-sheet.component.test.tsx` and
  `notifications.screen.test.tsx`. Skills: `vercel-react-native-skills`, `vercel-react-best-practices`.
  Covers: ER-11, ER-12 · Done when: `npx jest src/modules/notifications src/modules/enrolment` passes.
  > ✅ 2026-11-01 14:50 — MessageSheet has no close button, the description is `text-ink` 12 px under the title, and the
  > class card is ClassDayHeader in a pressable card with a chevron, under the "A aula" label, with a `h-32` skeleton;
  > `RequestSeatClassCard` is back to its `base_commit` content; files:
  > `apps/mobile/src/modules/notifications/components/message-sheet/message-sheet.component.tsx`,
  > `apps/mobile/src/modules/notifications/components/message-sheet/message-sheet.component.test.tsx`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`,
  > `apps/mobile/src/modules/enrolment/components/request-seat-class-card/request-seat-class-card.component.tsx`,
  > `apps/mobile/src/modules/enrolment/components/request-seat-class-card/request-seat-class-card.component.test.tsx`,
  > `apps/mobile/src/modules/enrolment/components/request-seat-class-card/request-seat-class-card.types.ts`,
  > `packages/app-messages/src/pt-BR.ts`, `packages/app-messages/src/es-ES.ts`, `packages/app-messages/src/en-US.ts`;
  > verified: `npx jest src/modules/notifications src/modules/enrolment src/modules/classes/screens/class-details` (49
  > suites, 1039 passed), `npx tsc --noEmit -p .` clean; deviations: `notifications.screen.test.tsx` needed no change,
  > because it reaches the card by its location's text, which is still there.

- [x] **T-20** — In `MessageSheet`, replace `InstructorPill` with the text of D-20 and remove `PersonSheet` and its swap from
  the component and the hook. Undo the `hideMissingWhatsapp` prop of T-10 in `person-sheet/`, which nothing else uses. Update
  `message-sheet.component.test.tsx` and `class-details.screen.test.tsx`.
  Skills: `vercel-react-native-skills`, `vercel-react-best-practices`.
  Covers: ER-11, ER-15 · Done when: `npx jest src/modules/notifications src/modules/people src/modules/classes/screens`
  passes.
  > ✅ 2026-11-01 15:30 — MessageSheet shows the sender as text next to the relative time, with no `InstructorPill`,
  > `PersonSheet` or swap, so the hook no longer reads the session; `person-sheet/` is back to its `base_commit` content;
  > files: `apps/mobile/src/modules/notifications/components/message-sheet/message-sheet.component.tsx`,
  > `apps/mobile/src/modules/notifications/components/message-sheet/message-sheet.hook.ts`,
  > `apps/mobile/src/modules/notifications/components/message-sheet/message-sheet.types.ts`,
  > `apps/mobile/src/modules/notifications/components/message-sheet/message-sheet.component.test.tsx`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`,
  > `apps/mobile/src/modules/people/components/person-sheet/person-sheet.component.tsx`,
  > `apps/mobile/src/modules/people/components/person-sheet/person-sheet.component.test.tsx`,
  > `apps/mobile/src/modules/people/components/person-sheet/person-sheet.types.ts`; verified: `npx jest
  > src/modules/notifications src/modules/people src/modules/classes/screens` (53 suites, 1226 passed), `npx tsc --noEmit
  > -p .` and ESLint on the component clean; deviations: none.

### Verification

- [x] **T-15** — Run every command in the Verification Plan from the repo root; all pass. Record the output summary as
  evidence. Covers: all · Done when: every command exits 0 and each user journey is recorded.
  > ✅ 2026-11-01 00:27 — Ran the Verification Plan on the final code; verified: `node
  > .specs/scripts/run-related-tests.mjs 082` RELATED TESTS PASSED; `node .specs/scripts/check-coverage.mjs 082`
  > COVERAGE OK (41 files); `node .specs/scripts/run-e2e.mjs 082` E2E PASSED (backend 856 tests in 30 files, web
  > 77); the `turbo run lint check-types build` of the plan exited 0 (29 tasks). Journeys, on the iOS simulator as
  > the signed-in Dev Admin (not a student or instructor), with a second local admin sending through the local API.
  > Sheet: notice with chip, text and no card; class message with card and chevron; chip swaps to the person sheet
  > and Fechar brings the message back; the card closes the sheet and opens the class; a deleted class shows the
  > message with no card. Section: "Mensagens desta aula" between the people and Regras, newest first, its row opens
  > the sheet with no card. Push: the `notificationId` route param, opened by deep link, shows the sheet, stays
  > closed once closed, and an unknown id shows the toast and no sheet. The simulator found two bugs the Jest mock
  > could not, both fixed in `bc9fc178` with tests that failed first: the library calling a stale dismiss callback
  > closed both sheets on the swap, and reopening the sheet for the same class never read the class again. Not
  > verified: (1) a real tapped push and ER-16 reloading on a received push, because `xcrun simctl push` is refused
  > (UNErrorDomain 2003, the simulator app has no notification permission), so those rest on
  > `use-notification-response.hook.test.tsx` and `use-notification-received.hook.test.tsx`; to check them, on a
  > phone build from EAS tap a notice push with the app closed and see Avisos open with its sheet, then with a class
  > open receive a message for it and see the count go up. (2) The `messageTitle` look on screen: the running Metro
  > predates the token, so the title showed as body text, and a fresh Metro bundle was confirmed to contain
  > `ds-text-message-title`; restart Metro with `--clear`, open a message and see the title in the display font, not
  > uppercased. (3) The Sheet and Section journeys signed in as a student and as an instructor who does not teach
  > the class, covered by `class-messages.e2e-spec.ts` and the screen tests; deviations: journeys ran as an admin
  > rather than the signed-in student of the plan.

- [x] **T-19** — Run every command in the Verification Plan again and check the sheet of D-17, D-18 and D-19 on the iOS
  simulator, on a Metro started after the `messageTitle` token, with the look T-15 couldn't check. Record the output
  summary as evidence.
  Covers: ER-11, ER-12 · Done when: every command exits 0 and the sheet is seen on the simulator.
  > ✅ 2026-11-01 15:05 — Ran the Verification Plan on the final code; verified: `node
  > .specs/scripts/run-related-tests.mjs 082` RELATED TESTS PASSED; `node .specs/scripts/check-coverage.mjs 082` COVERAGE
  > OK; `node .specs/scripts/run-e2e.mjs 082` E2E PASSED (web 77 passed); the `turbo run lint check-types build` of the
  > plan exited 0 (29 tasks). On the iOS simulator, signed in as a student, on a Metro started with `--clear` on port 8082
  > (the app launched with `-RCT_jsLocation localhost:8082`, and its connections checked to be on that port): a class
  > message from Avisos shows no close button, the title in the display font at 30, not uppercased (the look T-15 left
  > unverified: on the older Metro of port 8081 it shows as body text), the description, the "A aula" label and the card
  > with DOM / 1 / NOV, no year, and a chevron; pressing the card closes the sheet and opens the class; a row of "Mensagens
  > desta aula" opens the sheet with no label and no card; "Ok, entendi" closes it. Not verified: the light theme (the
  > account uses the dark one, and the simulator's setting doesn't change it), the skeleton on a device, and es-ES and
  > en-US on screen, which rest on the tests; to check the light theme, switch the app's theme in Perfil and open a class
  > message. T-15's other unverified items stand; deviations: none.

- [x] **T-21** — Run every command in the Verification Plan again and check the sender line of D-20 on the iOS simulator.
  Record the output summary as evidence.
  Covers: ER-11, ER-15 · Done when: every command exits 0 and the sheet is seen on the simulator.
  > ✅ 2026-11-01 15:45 — Ran the Verification Plan on the final code; verified: `node
  > .specs/scripts/run-related-tests.mjs 082` RELATED TESTS PASSED; `node .specs/scripts/check-coverage.mjs 082` COVERAGE
  > OK (42 files); `node .specs/scripts/run-e2e.mjs 082` E2E PASSED; the `turbo run lint check-types build` of the plan
  > exited 0 (29 tasks). On the iOS simulator, signed in as a student, on the Metro of port 8081, restarted at 01:00 and so
  > with the `messageTitle` token, a class message from Avisos shows "Dev Admin · há 33 minutos" as text under "Mensagem
  > da escola", with no chip, and the title in the display font. Not verified: the same as T-19; deviations: none.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 082` — the tests this spec added or changed, and the existing tests related
    to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 082` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 082` — the backend e2e suite passes, `class-messages.e2e-spec.ts` and the new tests of
    `notifications.e2e-spec.ts` included.
  - `npx turbo run lint check-types build --concurrency=1 --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/app-messages --filter=@rochas-surf-school/design-tokens`
    — no errors.
- User journeys (iOS simulator, with the backend running and one admin and one student signed in on separate runs):
  - **Sheet** (ER-11, ER-12): as an admin, send a notice to everyone and a message to a class the student holds a
    seat in. As the student, open Avisos. Tap the notice's row: the sheet shows the sender as text, the title as written and no
    class card, and "Ok, entendi" closes it. Tap the class message's row: the class card shows with a chevron. Press the card: the class's details open.
  - **Section** (ER-14, ER-16): on that class's details, "Mensagens desta aula · 1" shows between the people and "Regras".
    Sign in as an instructor who doesn't teach it: the same message shows. As the admin, send another with the class open
    on the student's side: the count becomes 2 without leaving the screen.
  - **Push** (ER-09): on a build that receives pushes (a real phone on staging, or `xcrun simctl push` with a payload whose
    `body` holds the `type` and the `notificationId`), tap a notice's push with the app closed: Avisos opens with its sheet.

## Memory Impact

- `memory/product.md` — **Class message**: kept on the class, and readable by every approved account that can open it;
  **Broadcast** and **Notification**: tapping one opens its sheet on Avisos ("a notice has no screen of its own" no longer
  holds); Current state.
- `memory/technical-context.md` — Applications: the push routing of the two types, `MessageSheet`, the class messages
  query; Persistence: `class_messages`; the `messageTitle` token under `packages/design-tokens`.
- `memory/structure.md` — the `class-message` aggregate, `class-message.prisma.ts`, `message-sender-reader.prisma.ts`,
  `class-messages.e2e-spec.ts`, the `MessageSheet`, `class-messages` and `ClassDayHeader` components, the table in the Prisma models.
- `memory/modules.md` — Classes keeps the messages sent to a class.
- `memory/modules/classes.md` — the `class-message` aggregate, storing before telling, who reads messages, and the notifier
  event `ClassMessage`, now `ClassMessageSent`.
- `memory/modules/notifications.md` — `senderId` in the params, `adminMessage`, `GET /notifications/:id`,
  `MessageSenderReader`, what tapping the two types does.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

- 2026-11-01 — D-09, D-11 and ER-11 changed, D-17 added, T-18 added: before, the sheet had a close button; after, it has
  none. The `notifications.messageSheet.close` key of T-07 goes with it. Reason: the user asked to remove it before the
  review. Approved by the user.
- 2026-11-01 — D-11 removed, D-18 added, ER-12 changed, T-16, T-17 and T-18 added, and the `RequestSeatClassCard`
  references in Context struck: before, the class card was `RequestSeatClassCard` with the `onPress` of T-09; after, it is
  the class header of Class enrolments, extracted to `ClassDayHeader`, with no year and an uppercase month, under an "A
  aula" label, and T-18 undoes T-09. Reason: the user asked for that component and that label before the review. Class
  enrolments keeps its year: the user asked to remove it from this card only. Approved by the user.
- 2026-11-01 — D-19 added, T-18 added: before, the description was `text-ink-2`, 8 px under the title; after, it is
  `text-ink`, 12 px under it. Reason: the user asked to match
  [message-sheet-content.png](designs/message-sheet-content.png). Approved by the user.
- 2026-11-01 — T-19 added, and the status went from `in-review` back to `in-progress` for these changes. Reason: the
  user reopened the spec before the review. Approved by the user.
- 2026-11-01 — D-08, ER-11 and ER-15 changed, D-09, D-10 and ER-13 removed, D-20, T-20 and T-21 added, and the sender
  chip and `PersonSheet` references in Context struck: before, the sender was an `InstructorPill` that opened their
  person sheet; after, it is plain text next to the relative time, and the sheet leads nowhere from it. T-20 undoes the
  `hideMissingWhatsapp` prop of T-10. `sender.role` and `sender.whatsappNumber` stay in the API (ER-03, ER-04), with no
  screen reading them. The status went from `in-review` back to `in-progress`. Reason: the user asked for the sender as
  text, with just the name, before the review. Approved by the user.

## Review

### Round 1 — 2026-11-01 — changes-requested

**Checks**

- lint ✅ · type check ✅ · build ✅ (29 Turbo tasks, all cache hits; backend, mobile, classes, notifications,
  app-messages, design-tokens)
- related tests ⚠️ the gate printed `RELATED TESTS FAILED` with the machine at load 48: apps/mobile 2 of 1934 and apps/web
  1 of 812, each a 5 s timeout, in tests this spec didn't write or change (see Notes). Each passed when rerun once alone,
  so none is a finding. backend, classes, notifications, app-messages and enrolment ✅
- coverage of the changed lines ✅ `COVERAGE OK`, 42 files; no coverage-ignore comment in the diff
- e2e: backend suite ✅ 856 passed · web suite ✅ 77 passed · `E2E PASSED`
- iOS simulator, signed in as a student, light theme ✅ for the Sheet and Section journeys; the real push tap and the
  reload on a received push couldn't be driven (see Notes)

**Expected Results**

- ER-01 ✅ — `class-messages.e2e-spec.ts` "stores" and `send-class-message.usecase.test.ts`; `POST /classes/:id/message`
  answered 204 and the row reads back from `GET /classes/:id/messages`
- ER-02 ✅ — the "list" tests, and a live `GET /classes/:id/messages` as the student
- ER-03 ✅ — the "sender" tests of both e2e files
- ER-04 ✅ — the "whatsapp" tests of both e2e files and the two use case tests
- ER-05 ✅ — the "erased sender" tests of both e2e files
- ER-06 ✅ — `broadcast.usecase.test.ts`, the adapter's spec, `push-messages.spec.ts`; the stored row holds `senderId`
- ER-07 ✅ — the "one notification" tests; live `GET /notifications/:id?locale=pt-BR` answered the item with `read: true`
- ER-08 ✅ — the "admin message" tests; on screen the row keeps its class line and the sheet shows the text alone
- ER-09 ❌ — see F-01. The routing edge cases hold: `use-notification-response.hook.test.tsx` runs the real router, and
  the source of Expo Router 57 confirms that a singular push reuses the route. A real tap was not seen (see Notes)
- ER-10 ✅ — on the simulator a notice row opened the sheet at once and its dot cleared; `notifications.screen.test.tsx`
- ER-11 ✅ — notice sheet on the simulator: tile, "Mensagem da escola", "Dev Admin · Agora", title as written, no class
  card, no close button; "Ok, entendi", the backdrop and dragging down all close it
- ER-12 ✅ — "A aula", the card with DOM / 1 / NOV, no year and a chevron; pressing it closed the sheet and opened the class
- ~~ER-13~~ — removed; no `InstructorPill`, `PersonSheet` or `hideMissingWhatsapp` left in the sheet
- ER-14 ✅ — "Mensagens desta aula · 2" between the people and "Regras", newest first, with `HH:mm` times; the
  component, screen and time tests cover the rest
- ER-15 ✅ — a section row opened the sheet with no class card, on the simulator; `class-details.screen.test.tsx`
- ER-16 ⚠️ — the named tests pass and assert the reload for that class only, but the reload was not seen on a device
  (see Notes)
- ER-17 ✅ — `notification-target.test.ts` and `use-notification-response.hook.test.tsx`

**Findings**

- [x] **F-01** (ER-09) — a push tapped while Avisos is open leaves its row unread on screen, though the notification is
  read. `handle` in `use-notification-response.hook.ts` sends `POST /notifications/:id/read` and never touches the list or
  the count cache, and the screen doesn't mark the message it opens from the route, so nothing refreshes the row. It also
  differs from ER-10, where the dot clears at once. Reproduce: with Avisos open on an unread `class.message` row, send
  `POST /notifications/<id>/read` (what the handler does), then open
  `rochassurfschool://student/notifications?notificationId=<id>`. `GET /notifications/<id>` answers `read: true`, but the
  row keeps its orange dot behind the sheet and after closing it, until the list reloads. Expected: the row shows read and
  the unread count drops by one, with a test for a push tapped while Avisos is open.
  > ✅ 2026-11-01 08:36 — Avisos now marks the unread message it opens from the route, through the same
  > `useMarkNotificationRead` as a row, so the row and the count change at once. The fix is on the screen, not in the push
  > handler, so it also covers a list that answers before the handler's POST lands. The handler keeps its POST, because the
  > flows without Avisos need it (ER-17), so a tap can send the mark twice, which `markRead` answers harmlessly and which
  > keeps the first `readAt`; files: `apps/mobile/src/modules/notifications/screens/notifications.screen.hook.ts`,
  > `apps/mobile/src/modules/notifications/screens/notifications.screen.test.tsx`; verified: the 2 new tests that expect
  > the mark failed before the fix (the row kept its dot, and no POST left for one beyond the loaded pages), `npx jest
  > src/modules/notifications` (17 suites, 487 passed), `npx tsc --noEmit -p .` and ESLint clean. Reproduced as the reviewer
  > did, on the iOS simulator as the student, with the app relaunched on the current bundle: with Avisos open on the
  > unread "Revisão 082: ponto de encontro" row (its `read_at` nulled in the local database and restored to the same value
  > for the handler's mark, the only data touched), opening
  > `rochassurfschool://student/notifications?notificationId=<id>` shows the sheet with the dot already gone, the row stays
  > read after "Ok, entendi", the sheet doesn't reopen, and the bell goes from 2 to 1. The same steps on the app process
  > that predated the fix kept the dot, as the finding says. Verification Plan rerun on this commit: `node
  > .specs/scripts/run-related-tests.mjs 082` RELATED TESTS PASSED, `node .specs/scripts/check-coverage.mjs 082` passed,
  > `node .specs/scripts/run-e2e.mjs 082` E2E PASSED, and the `turbo run lint check-types build` of the plan exited 0 (29
  > tasks). Not verified: a real tapped push and ER-16's reload on a received push, as in the review's Notes; deviations:
  > none.

**Notes**

- Not seen on a device, for the next round: the real tap of ER-09 and the reload of ER-16. The simulator can't take them:
  `simctl privacy` has no notifications service, and `getPushToken` returns `null` off a physical device. Steps, on a phone
  build from EAS on staging: (1) with the app closed, tap a notice's push: Avisos opens with its sheet, and closing it
  leaves Avisos. (2) With Avisos open, tap a second push: the sheet changes, the row shows read, and back goes home, not to
  a second Avisos. (3) With a class's details open, have an admin send that class a message: the section's count goes up
  without leaving the screen. Report what is seen.
- The timed-out tests: `new-class.screen.test.tsx` "shows the no-connection toast when there is no answer",
  `class-details.screen.test.tsx` "shows the closed text as a toast and reloads when the request is refused" and the web's
  `location-form-screen.component.test.tsx` "AD-04-09". They are load-sensitive, and the whole `run-related-tests.mjs`
  should print `RELATED TESTS PASSED` next round.
- Not seen on screen: es-ES and en-US, which rest on the tests, and an instructor who doesn't teach the class, which rests
  on `class-messages.e2e-spec.ts` and the screen tests. T-19's light theme is now seen.
- `## Memory Impact` misses one item: the notifier event `ClassMessage` is now `ClassMessageSent`, and
  `memory/modules/classes.md` line 609 still names the old one.
- `visibleNumber` exists in both `modules/classes` and `modules/notifications`. That follows from D-07, as Notifications
  depends on neither module, but a change to the WhatsApp rule must touch both.
- `sender.role` and `sender.whatsappNumber` have no screen reading them, as D-20 says.
- `check-spec.mjs` warns that T-10 and T-12 still cover the removed ER-13. Both are finished tasks, so this is only history.
- `git status` showed the untracked `.specs/changes/081-staging-follow-ups/`, another spec's plan. It is not this spec's
  code, so the review went on, and it isn't part of this commit.
- The local database keeps this review's test data: the class message and notifications "Revisão 082: ponto de encontro"
  on class `5a1e0000-0000-4000-8000-000000000108`, and the student's notice "Revisão 082: aviso geral". No push left the
  machine: the local database has no push tokens.

### Round 2 — 2026-11-01 — changes-requested

**Checks**

- lint ✅ · type check ✅ · build ✅ (29 Turbo tasks, all cache hits; backend, mobile, classes, notifications,
  app-messages, design-tokens)
- related tests ✅ `RELATED TESTS PASSED`: backend, mobile, classes, notifications, app-messages, enrolment and web (812)
- coverage of the changed lines ✅ `COVERAGE OK`, 42 files; no coverage-ignore comment in the diff
- e2e: backend suite ✅ 856 passed · web suite ✅ 77 passed · `E2E PASSED`
- iOS simulator, the first real pushes of this spec ✅ `xcrun simctl push` with the Verification Plan's payload, tapped on
  the banner, as a student and as an instructor who doesn't teach the class; one case ❌ (F-02). How: see Notes

**Expected Results**

- F-01 of round 1 ✅ — pushes tapped with Avisos open, on home and with the app closed all show their row read at once,
  and the stored `read_at` is set
- ER-01 ✅ — `send-class-message.usecase.test.ts` and the "stores" tests
- ER-02 ✅ — `list-class-messages.usecase.test.ts` and the "list" tests
- ER-03 ✅ — the "sender" tests of both e2e files
- ER-04 ✅ — the "whatsapp" tests of both e2e files and the two use case tests
- ER-05 ✅ — the "erased sender" tests of both e2e files
- ER-06 ✅ — `broadcast.usecase.test.ts`, the adapter's spec, `push-messages.spec.ts`
- ER-07 ✅ — the "one notification" tests
- ER-08 ✅ — the "admin message" tests; on screen the row keeps its class line and the sheet shows the text alone
- ER-09 ❌ — see F-02. Everything else now seen on real taps: app closed, app open on home, and a second push with Avisos
  and a sheet open (the sheet changes, its row reads as read, closing leaves Avisos and back goes home, not to a second
  Avisos), plus the instructor flow
- ER-10 ✅ — `notifications.screen.test.tsx`
- ER-11 ✅ — notice sheet from a tapped push: tile, "Mensagem da escola", "Dev Admin · Agora", title as written, no card
- ER-12 ✅ — "A aula", DOM / 1 / NOV, chevron; in the instructor flow the card closed the sheet and opened that flow's class
  details
- ~~ER-13~~ — removed; nothing in the code still builds it
- ER-14 ✅ — seen as a student and as an instructor who doesn't teach the class, under the read-only note; 2-line rows
- ER-15 ✅ — a section row opened the sheet with no card; the test asserts no read is sent
- ER-16 ✅ — seen on a real push: with the class open the section went from 3 to 4 with nothing tapped; the tests cover
  another class, which reloads nothing
- ER-17 ✅ — `notification-target.test.ts` and `use-notification-response.hook.test.tsx`

**Findings**

- [x] **F-02** (ER-09) — a push tapped while the app is in the background with Avisos open shows the sheet, but the
  message never joins the list. No received event fires in the background, and neither the tap nor the mark reloads
  `["notifications", "list"]`, so the screen keeps its old pages: the row is missing behind the sheet and after closing
  it, though `GET /notifications` holds it, read. `requirements.md → Notifications screen` says every notification
  appears there, and this is the screen the tap just opened. Pull to refresh brings it in. Reproduce: open Avisos, press
  Home, send a `broadcast` with `xcrun simctl push` and a `notifications` row for it, tap the banner, then press "Ok,
  entendi". Expected: the row shows at the top of the list, read, with no pull to refresh, with a test for a route's
  notification that isn't in the loaded pages.
  > ✅ 2026-11-01 11:00 — A message the route opens that the loaded pages don't hold may be newer than them, so Avisos now reloads
  > the list and the unread count for it, once: an older one stays out of the list, and one the list holds reloads
  > nothing. The count goes with it because other pushes may have arrived in the background too. For an
  > unread one the reload waits for the mark, because `useMarkNotificationRead` cancels list queries in flight; files:
  > `apps/mobile/src/modules/notifications/screens/notifications.screen.hook.ts`,
  > `apps/mobile/src/modules/notifications/screens/notifications.screen.test.tsx`; verified: the 4 new tests that expect the
  > reload failed before the fix (and the one that expects none passed), `npx jest src/modules/notifications` (17 suites, 492
  > passed), `npx tsc --noEmit -p .` and ESLint clean. Reproduced as the reviewer did, on the iOS simulator as the student,
  > with the app relaunched on the current bundle: with Avisos open, Home, a new `broadcast` row and `xcrun simctl push`,
  > then a tap on the banner: "F-02: aviso em segundo plano" shows at the top of the list behind the sheet, with no dot and
  > no pull to refresh, it stays there after "Ok, entendi", the sheet doesn't reopen, and its stored `read_at` is set.
  > Verification Plan rerun on this commit (`3836b9e6`): `node .specs/scripts/run-related-tests.mjs 082` RELATED TESTS
  > PASSED, `node .specs/scripts/check-coverage.mjs 082` COVERAGE OK (42 files), `node .specs/scripts/run-e2e.mjs 082` E2E
  > PASSED, and the `turbo run lint check-types build` of the plan exited 0 (29 tasks). Not verified: APNs delivery on a
  > real phone, and es-ES and en-US on screen, as in the review's Notes; deviations: none.

**Notes**

- How the pushes were driven, since round 1 couldn't: the simulator build never asks for the OS permission (`getPushToken`
  stops at `isDevice`). A temporary line in `push.service.ts` asked once, Allow was tapped, and the line was reverted with
  `git checkout` before any check ran, so no code changed. The permission stays granted on that simulator, so
  `xcrun simctl push` works from now on. This makes round 1's "on a phone build" steps optional for ER-09 and ER-16; the
  APNs delivery itself still isn't exercised here.
- A push of **another** type tapped while a message sheet is open navigates under the sheet and leaves it up: tapping a
  `location.changed` push left "app fechado" open over the home. "Ok, entendi" still closes it. The review started with the
  app in this state. No Expected Result covers it and it follows from how every `BottomModal` works, so it isn't a finding.
- D-16 holds on this phone: a 62-character title and a 505-character text (past the limits, inserted by SQL) fill 55% of
  the screen with no card, and the card adds about 150 pt. A 667 pt phone would be tight; not checked.
- `## Memory Impact` still misses that the notifier event `ClassMessage` is now `ClassMessageSent`;
  `memory/modules/classes.md` line 609 still names the old one.
- `DeleteUser` has no caller in the backend and `deleteDenied` only touches denied accounts, so `sender_id ON DELETE
  RESTRICT` can't block anything today.
- Not seen on screen, still resting on the tests: es-ES and en-US.
- `git status` showed the untracked `.specs/changes/081-staging-follow-ups/`, another spec's plan; it isn't part of this
  commit.
- Local data: the account `6cdee4f8-3f18-4d0d-98bb-5619810cb3d4` was set to `instructor` by SQL for the journey and is
  `student` again. Its "Revisão 082 R2: …" notifications and the class messages on class
  `5a1e0000-0000-4000-8000-000000000108` remain. No push left the machine.
