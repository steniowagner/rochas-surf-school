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
  - `class.cancelled` — a class the person teaches, or in which their enrolment was just ended by the
    cancellation (spec 041), was cancelled; details: the class's id, its discipline, its start and the admin's
    message (`message`, as written after trimming) when there is one. One per person, even one on both lists.
  - `class.deleted` — a class the person taught was deleted; details: its discipline and its start (no class id:
    the class no longer exists).
  - `class.noInstructor` — an account deletion left classes that haven't started with no instructor; details:
    how many (`count`) and the earliest of them — its id, its discipline and its start (`startsAt`, ISO UTC). One
    per approved admin and deletion.
  - `location.changed` — an admin edited a location of classes the person teaches and chose to tell the
    instructors; details: how many of the person's upcoming classes are at that location (`count`) and its new
    name (`locationName`, as stored). One per instructor and edit (no class id: it concerns several classes).
  - `enrolment.requested` — a student asked for a seat in a class; details: the class's id, the student's name
    (`studentName`, as stored), its discipline and start. One per approved admin and per instructor of the class,
    each person once.
  - `enrolment.expired` — the person's pending request was still pending when the class started; details: the
    class's id, its discipline and start.
  - `enrolment.approved` — an admin approved the person's request; details: the class's id, its discipline and
    start.
  - `enrolment.denied` — an admin denied the person's request; details: the class's id, its discipline, its start
    and the admin's reason (`reason`, as written) when there is one.
  - `enrolment.cancelled` — a student gave up their seat in a class (or their account was deleted); details: the
    class's id, the student's name (`studentName`), the class's discipline and start, and how many pending
    requests the class has left (`waitingCount`).
  - `enrolment.enrolled` — an admin enrolled the person in a class directly (without a pending request); details:
    the class's id, its discipline and start.
  - `enrolment.takenOut` — an admin took the person out of a class; details: the class's id, its discipline, its
    start and the admin's reason (`reason`, as written) when there is one.
- **Push text**: drawn per phone in its language (pt-BR, es, en):

  | Type | Title (en) | Body (en) |
  | --- | --- | --- |
  | `registration.pending` | New registration | {name} is waiting for approval. |
  | `registration.approved` | Account approved | You can start using the app now. |
  | `registration.denied` | Registration denied | the reason as written, or "Open the app to learn more." |
  | `class.assigned` | New classes on your schedule | You've been assigned 1 {discipline} class. / You've been assigned {count} {discipline} classes. |
  | `class.edited` | Class changed | Your {discipline} class on {MM/dd} at {HH:mm} was changed. Open the app to see it. |
  | `class.unassigned` | Removed from a class | You're no longer teaching the {discipline} class on {MM/dd} at {HH:mm}. |
  | `class.cancelled` | Class cancelled | Your {discipline} class on {MM/dd} at {HH:mm} was cancelled. / with a message: {discipline}, {MM/dd} at {HH:mm}: {message} |
  | `class.deleted` | Class deleted | Your {discipline} class on {MM/dd} at {HH:mm} was deleted. |
  | `class.noInstructor` | Class without an instructor / Classes without an instructor | The {discipline} class on {MM/dd} at {HH:mm} has no instructor now. / {count} classes have no instructor now. The next one: {discipline}, {MM/dd} at {HH:mm}. |
  | `location.changed` | Class location changed | {locationName} changed. Check your next class there. / {locationName} changed. Check your {count} upcoming classes there. |
  | `enrolment.requested` | New seat request | {studentName} requested a seat in the {discipline} class on {MM/dd} at {HH:mm}. |
  | `enrolment.expired` | You didn't get a seat | The {discipline} class on {MM/dd} at {HH:mm} started without a seat for your request. |
  | `enrolment.approved` | Request approved | Your seat in the {discipline} class on {MM/dd} at {HH:mm} is confirmed. |
  | `enrolment.denied` | Request denied | the reason as written, or "The school declined your request for the {discipline} class on {MM/dd} at {HH:mm}." |
  | `enrolment.cancelled` | Seat cancelled | {studentName} cancelled their seat in the {discipline} class on {MM/dd} at {HH:mm}. {waitingCount} on the waiting list. (the last sentence only when someone waits) |
  | `enrolment.enrolled` | You've been enrolled | The school enrolled you in the {discipline} class on {MM/dd} at {HH:mm}. |
  | `enrolment.takenOut` | You were taken out of a class | the reason as written, or "The school took you out of the {discipline} class on {MM/dd} at {HH:mm}." |

  pt-BR: "Nova inscrição" / "{name} está aguardando aprovação.", "Conta aprovada" / "Você já pode começar a usar
  o app.", "Inscrição recusada" / "Abra o app para saber mais.", "Novas aulas na sua escala" / "Você foi escalado
  para 1 aula de {discipline}." ("{count} aulas de"). es: "Nueva inscripción" / "{name} está esperando
  aprobación.", "Cuenta aprobada" / "Ya puedes empezar a usar la app.", "Inscripción rechazada" / "Abre la app
  para saber más.", "Nuevas clases en tu agenda" / "Te asignaron 1 clase de {discipline}." ("{count} clases de").
  `class.edited`: pt-BR "Aula alterada" / "A aula de {discipline} de {dd/MM} às {HH:mm} foi alterada. Abra o app
  para ver.", es "Clase modificada" / "La clase de {discipline} del {dd/MM} a las {HH:mm} cambió. Abre la app para
  verla."; `class.unassigned`: pt-BR "Você saiu de uma aula" / "Você não dá mais a aula de {discipline} de {dd/MM}
  às {HH:mm}.", es "Saliste de una clase" / "Ya no das la clase de {discipline} del {dd/MM} a las {HH:mm}.";
  `class.cancelled`: pt-BR "Aula cancelada" / "A aula de {discipline} de {dd/MM} às {HH:mm} foi cancelada." or,
  with a message, "{discipline}, {dd/MM} às {HH:mm}: {message}", es "Clase cancelada" / "La clase de {discipline}
  del {dd/MM} a las {HH:mm} fue cancelada." or "{discipline}, {dd/MM} a las {HH:mm}: {message}" (a blank message
  counts as none); `class.deleted`: pt-BR "Aula excluída" / "A aula de {discipline} de {dd/MM} às {HH:mm} foi
  excluída.", es "Clase eliminada" / "La clase de {discipline} del {dd/MM} a las {HH:mm} fue eliminada.";
  `class.noInstructor`: pt-BR "Aula sem instrutor" / "A aula de {discipline} de {dd/MM} às {HH:mm} ficou sem
  instrutor." or "Aulas sem instrutor" / "{count} aulas ficaram sem instrutor. A próxima: {discipline}, {dd/MM} às
  {HH:mm}.", es "Clase sin instructor" / "La clase de {discipline} del {dd/MM} a las {HH:mm} se quedó sin
  instructor." or "Clases sin instructor" / "{count} clases se quedaron sin instructor. La próxima: {discipline},
  {dd/MM} a las {HH:mm}." (a missing count counts as one); `location.changed`: pt-BR "Local de aula alterado" /
  "O local {locationName} mudou. Confira sua próxima aula lá." or "… Confira suas {count} próximas aulas lá.", es
  "Lugar de clase modificado" / "El lugar {locationName} cambió. Revisa tu próxima clase allí." or "… Revisa tus
  {count} próximas clases allí."; `enrolment.requested`: pt-BR "Novo pedido de vaga" / "{studentName} pediu vaga na
  aula de {discipline} de {dd/MM} às {HH:mm}.", es "Nueva solicitud de plaza" / "{studentName} pidió plaza en la
  clase de {discipline} del {dd/MM} a las {HH:mm}."; `enrolment.expired`: pt-BR "Você não conseguiu vaga" / "A aula
  de {discipline} de {dd/MM} às {HH:mm} começou sem vaga para o seu pedido.", es "No conseguiste plaza" / "La clase de
  {discipline} del {dd/MM} a las {HH:mm} empezó sin plaza para tu solicitud."; `enrolment.approved`: pt-BR "Pedido
  aprovado" / "Sua vaga na aula de {discipline} de {dd/MM} às {HH:mm} está confirmada.", es "Solicitud aprobada" /
  "Tu plaza en la clase de {discipline} del {dd/MM} a las {HH:mm} está confirmada."; `enrolment.denied`: pt-BR
  "Pedido recusado" / the reason, or "A escola recusou seu pedido para a aula de {discipline} de {dd/MM} às
  {HH:mm}.", es "Solicitud rechazada" / the reason, or "La escuela rechazó tu solicitud para la clase de
  {discipline} del {dd/MM} a las {HH:mm}."; `enrolment.cancelled`: pt-BR "Vaga cancelada" / "{studentName} cancelou a
  vaga na aula de {discipline} de {dd/MM} às {HH:mm}. {waitingCount} na lista de espera.", es "Plaza cancelada" /
  "{studentName} canceló su plaza en la clase de {discipline} del {dd/MM} a las {HH:mm}. {waitingCount} en lista de
  espera." (the count sentence only above 0); `enrolment.enrolled`: pt-BR "Você foi inscrito" / "A escola inscreveu
  você na aula de {discipline} de {dd/MM} às {HH:mm}.", es "Te inscribieron" / "La escuela te inscribió en la clase
  de {discipline} del {dd/MM} a las {HH:mm}."; `enrolment.takenOut`: pt-BR "Você foi retirado de uma aula" / the
  reason, or "A escola retirou você da aula de {discipline} de {dd/MM} às {HH:mm}.", es "Te retiraron de una clase" /
  the reason, or "La escuela te retiró de la clase de {discipline} del {dd/MM} a las {HH:mm}.". The start is written in America/Fortaleza time, the same on every machine.
  `{discipline}` is "Surf" or "Skate" in every language. Tapping a `class.assigned` or `class.deleted` push reloads the account and
  opens its Aulas tab when it is still an instructor or an admin (else its home, the app's default); one received
  with the app open reloads the classes of the weeks it shows (a `class.deleted` one, every class shown). Tapping a `class.edited`, `class.unassigned` or
  `class.cancelled` push
  reloads the account and opens that class's details as an instructor or an admin (else the home, also when the
  push carries no class); one received with the app open reloads every class shown (weeks and details). Tapping a
  `class.noInstructor` push reloads the account and opens that class's details when it is still an admin (else
  its home, also when the push carries no class); one received with the app open reloads every class shown.
  Tapping a `location.changed` push reloads the account and opens its Aulas tab when it is still an instructor or
  an admin (else its home); one received with the app open reloads every class shown and the locations.
  Tapping an `enrolment.expired`, `enrolment.approved`, `enrolment.denied`, `enrolment.enrolled`,
  `enrolment.takenOut` or `class.cancelled` push as a student
  opens that class's details in the student's flow; tapping an `enrolment.requested` push opens that class's
  details as an instructor and the "Inscrições em aulas" tool as an admin (with or without a class id; a push an
  instructor gets without a class, or a person who now resolves to another flow, falls back as before); tapping an
  `enrolment.cancelled` push opens that class's details as an instructor or an admin. Any enrolment push received
  with the app open reloads every class shown, and an `enrolment.requested` or `enrolment.cancelled` one also the
  admin's pending requests.

Rules:

- **Stored first, then pushed**: every notification of an event is stored, for every recipient, before the first
  push is sent, so a failed push never loses one. A person without phones gets the stored notification only.
- **One push per phone**: each phone of each recipient gets its own push, in the language it registered, carrying
  the type and the notification it belongs to, plus the class's id when the details carry one (so a tap can open
  the right screen).
- **Who hears about a registration**: every account with role admin **and** status approved (onboarding finished
  or not) — a pending, denied, deleted or removed admin is a registration or a closed account, not an admin. With
  no approved admin nothing is stored or sent. The result of a registration goes to the person only.
- **Who hears about a new seat request**: every approved admin plus every instructor of the class, each person
  once; who that is, is decided here from Enrolment's list of instructors. With nobody, nothing is stored or sent.
- **Who hears about classes left without an instructor**: the same approved admins, minus the ones the event
  excludes (the person whose account deletion caused it, still approved while it runs); none left → nothing
  stored or sent.
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
- **An instructor or admin of a cancelled class, and a student whose pending or approved enrolment it ended** —
  receives `class.cancelled`, with the message, unless they cancelled it.
- **Approved admins and the instructors of a class** — receive `enrolment.requested` for each new request in it.
- **A student whose request expired** — receives `enrolment.expired`.
- **A student whose request an admin decided** — receives `enrolment.approved` or `enrolment.denied` (with the
  reason); nobody else is told of a decision, and nobody of a seat that opens.
- **Approved admins and the instructors of a class** — receive one `enrolment.cancelled` for each seat given up in
  it, by the student or by an account deletion, each person once.
- **A student an admin enrolled directly** — receives `enrolment.enrolled`, or `enrolment.approved` when it approved
  their pending request; nobody else is told.
- **A student an admin took out of a class** — receives `enrolment.takenOut` (with the reason); nobody else is
  told.
- **An instructor or admin of a deleted class** — receives `class.deleted`, unless they deleted it.
- **Approved admins** — receive one `class.noInstructor` when an account deletion leaves classes with nobody,
  unless the deleted account is theirs.
- **An instructor or admin of a location's upcoming classes** — receives one `location.changed` when an admin edits
  that location and chooses to tell the instructors, unless they made the edit.

## Boundaries

It knows people only by their ids and the phones they registered, and it doesn't depend on
[Authentication](auth.md): the list of approved admins comes through its own contract, and Authentication reaches
it through three contracts of its own (one that notifies about registrations, one that removes a phone's token on
sign-out, one that deletes the "new registration" notifications about erased accounts), all provided by the
backend. [Classes](classes.md) reaches it the same way, through its own contracts for class assignments (added
and removed), class changes (edits, cancellations, deletions), classes left without an instructor and location
changes; a failure there is logged and never changes the class creation, edit, cancellation, deletion, release or
location edit. [Enrolment](enrolment.md) reaches it through its own contract for new, decided and expired
requests, cancelled seats, direct enrolments and take-outs, with the same guarantee. It doesn't decide when an event happens — the
module of the event does.
It doesn't talk to Expo itself: sending and reading receipts are behind a contract, provided by the backend,
which also writes the push text. Nothing reads the stored notifications yet: the notifications screen, read
state, badges and rich pushes come
with their specs, as do the notifications of every other event (reactivation requests, role changes, reminders,
seat cancellations, broadcasts) and those of an edit or a location change to the classes' students and pending
requests (spec 047).

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
- `033-class-cancellation` — the `class.cancelled` type (`{ classId, discipline, startsAt, message? }`) and its
  push copy, with or without the admin's message; in the app, tapping one opens the class's details and one
  received with the app open reloads the classes.
- `034-class-deletion` — the `class.deleted` type (`{ discipline, startsAt }`, no class id) and its push copy; in
  the app, tapping one opens the Aulas tab and one received with the app open reloads the classes.
- `035-class-no-instructor` — the `class.noInstructor` type (`{ count, classId, discipline, startsAt }`) and its
  push copy for one and many classes; the approved admins minus the excluded ones as recipients; in the app,
  tapping one opens the class's details for an admin and one received with the app open reloads the classes.
- `037-class-locations` — the `location.changed` type (`{ count, locationName }`, no class id) and its push copy
  for one and many classes, sent once per instructor through the Classes module's location-change contract; in
  the app, tapping one opens the Aulas tab and one received with the app open reloads the classes and the
  locations.
- `041-enrolment-requests` — the `enrolment.requested` (`{ classId, studentName, discipline, startsAt }`, to the
  approved admins and the class's instructors, each once) and `enrolment.expired` (`{ classId, discipline,
  startsAt }`) types and their push copy, through Enrolment's contract; `class.cancelled` also reaches the students
  whose enrolment the cancellation ended; in the app, a student's tap on `enrolment.expired` or `class.cancelled`
  opens the class in the student's flow, an admin's or instructor's tap on `enrolment.requested` opens it in theirs,
  and either enrolment push received with the app open reloads the classes.
- `042-enrolment-decisions` — the `enrolment.approved` (`{ classId, discipline, startsAt }`) and `enrolment.denied`
  (`{ classId, discipline, startsAt, reason? }`) types and their push copy, to the student only, through
  Enrolment's contract; in the app, a student's tap on either opens the class in the student's flow, an admin's
  tap on `enrolment.requested` now opens the "Inscrições em aulas" tool, and an `enrolment.requested` push received
  with the app open also reloads the admin's pending requests.
- `043-seat-cancellation` — the `enrolment.cancelled` type (`{ classId, studentName, discipline, startsAt,
  waitingCount }`) and its push copy, to the approved admins and the class's instructors through Enrolment's
  contract; in the app, an instructor's or admin's tap opens the class, and one received with the app open reloads
  the classes and the admin's pending requests.
- `044-direct-enrolment-take-out` — the `enrolment.enrolled` (`{ classId, discipline, startsAt }`) and
  `enrolment.takenOut` (`{ classId, discipline, startsAt, reason? }`) types and their push copy, to the student only,
  through Enrolment's contract; in the app, a student's tap on either opens the class in the student's flow, and one
  received with the app open reloads the classes.
