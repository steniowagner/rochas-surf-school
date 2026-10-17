# Module: Notifications

## What it is for

It is the product's only outbound channel, as [Product](../product.md) describes **Notification**
(`notification`) and the decision "Pushes are the only notification channel": every notification is kept for the
person it is for, then pushed to every phone they are signed in on, in that phone's language. It brings together
two business areas: **Notifications** (what is stored and sent) and **Devices** (the phones that receive pushes).

## Notifications

What the person is told, and how it reaches them.

- **Notification** (`notification`): one message to one person about an event. Key fields: the person, the
  type, the details the type needs, when it was created. It holds **no text**: the app (and the push) write it
  from the type and its details, in the reader's language. Types today:
  - `registration.pending` — a new account is waiting for approval; details: its name and its id (`userId`).
    When that account is erased (a denied registration, spec 021), every `registration.pending` about it is
    deleted on Authentication's request; older rows without an id are not touched.
  - `registration.approved` — the person's registration was approved; no details.
  - `registration.denied` — the person's registration was denied; details: the admin's reason, exactly as
    stored, when one was given.
  - `class.assigned` — the person was assigned to the classes of a batch an admin created; details: how many
    classes (`count`) and their discipline (`surf` | `skate`). One per instructor and batch, and one (count 1)
    for an instructor added to a class by an edit.
  - `class.edited` — a class the person teaches (before and after the edit) was changed; details: the class's id
    (`classId`), its discipline and its new start (`startsAt`, ISO UTC).
  - `class.unassigned` — the person was removed from a class by an edit; details: the class's id, its discipline
    and its start.
- **Push text**: drawn per phone in its language (pt-BR, es, en):

  | Type | Title (en) | Body (en) |
  | --- | --- | --- |
  | `registration.pending` | New registration | {name} is waiting for approval. |
  | `registration.approved` | Account approved | You can start using the app now. |
  | `registration.denied` | Registration denied | the reason as written, or "Open the app to learn more." |
  | `class.assigned` | New classes on your schedule | You've been assigned 1 {discipline} class. / You've been assigned {count} {discipline} classes. |
  | `class.edited` | Class changed | Your {discipline} class on {MM/dd} at {HH:mm} was changed. Open the app to see it. |
  | `class.unassigned` | Removed from a class | You're no longer teaching the {discipline} class on {MM/dd} at {HH:mm}. |

  pt-BR: "Nova inscrição" / "{name} está aguardando aprovação.", "Conta aprovada" / "Você já pode começar a usar
  o app.", "Inscrição recusada" / "Abra o app para saber mais.", "Novas aulas na sua escala" / "Você foi escalado
  para 1 aula de {discipline}." ("{count} aulas de"). es: "Nueva inscripción" / "{name} está esperando
  aprobación.", "Cuenta aprobada" / "Ya puedes empezar a usar la app.", "Inscripción rechazada" / "Abre la app
  para saber más.", "Nuevas clases en tu agenda" / "Te asignaron 1 clase de {discipline}." ("{count} clases de").
  `class.edited`: pt-BR "Aula alterada" / "A aula de {discipline} de {dd/MM} às {HH:mm} foi alterada. Abra o app
  para ver.", es "Clase modificada" / "La clase de {discipline} del {dd/MM} a las {HH:mm} cambió. Abre la app para
  verla."; `class.unassigned`: pt-BR "Você saiu de uma aula" / "Você não dá mais a aula de {discipline} de {dd/MM}
  às {HH:mm}.", es "Saliste de una clase" / "Ya no das la clase de {discipline} del {dd/MM} a las {HH:mm}.". The
  start is written in America/Fortaleza time, the same on every machine.
  `{discipline}` is "Surf" or "Skate" in every language. Tapping a `class.assigned` push reloads the account and
  opens its Aulas tab when it is still an instructor or an admin (else its home, the app's default); one received
  with the app open reloads the classes of the weeks it shows. Tapping a `class.edited` or `class.unassigned` push
  reloads the account and opens that class's details as an instructor or an admin (else the home, also when the
  push carries no class); one received with the app open reloads every class shown (weeks and details).

Rules:

- **Stored first, then pushed**: every notification of an event is stored, for every recipient, before the first
  push is sent, so a failed push never loses one. A person without phones gets the stored notification only.
- **One push per phone**: each phone of each recipient gets its own push, in the language it registered, carrying
  the type and the notification it belongs to, plus the class's id when the details carry one (so a tap can open
  the right screen).
- **Who hears about a registration**: every account with role admin **and** status approved (onboarding finished
  or not) — a pending, denied, deleted or removed admin is a registration or a closed account, not an admin. With
  no approved admin nothing is stored or sent. The result of a registration goes to the person only.
- **Nothing is retried**: a push that fails is not sent again; the notification stays stored.

## Devices

The phones that receive pushes.

- **Push token** (`push-token`): one phone of one person — the address Expo gives that phone, and the language its
  pushes are written in. A person may have several; a phone belongs to one account at a time.
- **Push ticket**: Expo's receipt number for a push it accepted, kept for at most a day so Expo can later say
  whether the phone is still there.

Rules:

- **Only pending and approved accounts register a phone**: a denied, deleted or removed account is refused with
  `pushToken.status.notAllowed`, checked before anything else. A token that isn't an Expo push token
  (`pushToken.token.invalid`) or a language other than pt-BR, es or en (`pushToken.locale.invalid`) is refused,
  both reported together. Nothing is stored on a refusal.
- **Registering again updates the phone**: the same token keeps one entry with the newest language; a token
  registered by another account moves to the caller, since it is now that person's phone.
- **A phone stops receiving pushes** when its person signs out on it (only that account's phone is removed), when
  its person turns pushes off on it (the phone asks to remove its own token; a token of another account, or an
  unknown one, changes nothing, and a token missing or empty is refused with `pushToken.token.required`), or
  when Expo says the app is no longer installed there — on sending, or when the receipt is checked 15 minutes or
  more later. It is **not** removed when a session expires without a sign-out, when the account changes status,
  or with age: the next person who signs in on that phone takes it over.
- **Receipts are checked once**: every ticket asked about is forgotten, whatever the answer; tickets older than a
  day are forgotten without asking.

## Who can do what

- **A pending or approved account** — registers the phone it is signed in on, with its language.
- **Any account that signs out** — stops the pushes to that phone.
- **Any signed-in account, whatever its status** — removes its own phone's token. In the app, the Profile's
  "Notificações push" switch does it: pushes are a setting of the phone (on by default, kept after signing out);
  while it is off the phone never registers again and retries the removal at each launch or sign-in, and turning
  it on registers the phone at once (a refused OS permission turns it back off). Turning pushes off never touches
  the stored notifications.
- **Approved admins** — receive a push for each new registration.
- **The person whose registration was decided** — receives the approval, or the denial with its reason.
- **An instructor or admin assigned to a batch of classes** — receives one `class.assigned`, unless they
  created the batch.
- **An instructor or admin of an edited class** — receives `class.edited` (kept, when a class field changed),
  `class.assigned` (added) or `class.unassigned` (removed), unless they made the edit.

## Boundaries

It knows people only by their ids and the phones they registered, and it doesn't depend on
[Authentication](auth.md): the list of approved admins comes through its own contract, and Authentication reaches
it through three contracts of its own (one that notifies about registrations, one that removes a phone's token on
sign-out, one that deletes the "new registration" notifications about erased accounts), all provided by the
backend. [Classes](classes.md) reaches it the same way, through its own contracts for class assignments (added
and removed) and class changes; a failure there is logged and never changes the class creation or edit. It doesn't decide when an event happens — the
module of the event does.
It doesn't talk to Expo itself: sending and reading receipts are behind a contract, provided by the backend,
which also writes the push text. Nothing reads the stored notifications yet: the notifications screen, read
state, badges and rich pushes come
with their specs, as do the notifications of every other event (reactivation requests, role changes, class
cancellations, deletions, the "no instructor" flag and reminders, enrolments, broadcasts) and those of an edit
to the class's students and pending requests.

## Spec history

- `020-push-notifications-registrations` — created the module: stored notifications and their push to every
  registered phone, in its language; phone registration and its cleanup (sign-out, Expo's "not registered" on
  sending and in receipts); the three registration notifications.
- `021-denied-registration-erasure` — `registration.pending` carries the account's id, and those about an erased
  account are deleted on Authentication's request.
- `026-profile-tab` — a phone removes its own token (`DELETE /notifications/push-token`, `UnregisterPushToken`,
  any status); the app's push switch on the Profile, kept on the phone.
- `028-create-classes` — the `class.assigned` type (`{ count, discipline }`) and its push copy, sent once per
  instructor and batch through the Classes module's contract.
- `030-classes-week-view` — in the app, tapping a `class.assigned` push opens the Aulas tab, and one received
  with the app open reloads the shown weeks.
- `032-class-editing` — the `class.edited` and `class.unassigned` types (`{ classId, discipline, startsAt }`) and
  their push copy with the start in Fortaleza time; `classId` in the push data; in the app, tapping one opens the
  class's details and one received with the app open reloads the classes.
