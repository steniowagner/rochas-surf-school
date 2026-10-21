# Module: Enrolment

## What it is for

It keeps the students' places in classes, as [Product](../product.md) describes **Enrolment** (`enrolment`) and
**Seat**: a student asks for a seat in a class that hasn't started, accepting the cancellation rule of its
discipline, follows the request, and may take it back or ask again. It also ends requests on the class's behalf:
pending ones expire when the class starts, and open ones end when the class is cancelled. It is the source of
the seats taken, the approved students and the pending requests that [Classes](classes.md) shows. It covers the
student's request side and the admins' decisions: admins see the pending requests by class, in the order asked,
and approve one while the class has a free seat or deny it with an optional reason. A student gives up an
approved seat until the class's cancellation deadline, and a deleted account's upcoming seats and pending requests
are given up on [Authentication](auth.md)'s behalf. Admins also enrol a student directly — approving the student's
pending request when there is one — and take a student out of a class before it starts. Guests come with their
spec (045).

## Main concepts

- **Enrolment** (`enrolment`): one request of one student for one class, and what became of it. Key fields: the
  class, the student, the status, when it was requested, when the student accepted the cancellation rule (none
  when the discipline had no rule), when it was decided, the reason (up to 500 characters; for a denial or a
  take-out; up to 300 for a take-out) and when it ended. Relationships: a class has any number of enrolments; a student has any number,
  at most one of them open per class. Lifecycle (every status exists and this module's actions produce each one):
  - `pending` — a new request. It holds no seat. Becomes `approved` (an admin approves it, or enrols the student
    directly, before the class starts) or `denied` (an admin, before the class starts), or ends as `withdrawn` (the
    student, before the class starts), `expired` (still pending when the class starts) or `classCancelled` (the
    class was cancelled).
  - `approved` — holds a seat; `decidedAt` is when it was approved. An admin's direct enrolment of a student without
    a pending request creates one straight away (requested and decided at the same moment, no rule accepted). Ends
    as `cancelled` (the student, before the deadline; or the account was deleted), `takenOut` (an admin, before the
    class starts) or `classCancelled`.
  - `cancelled` — the seat was given up; `endedAt` is when. The student may request again.
  - `takenOut` — an admin took the student out, with the reason when one was written; `endedAt` is when. The student
    may request again.
  - `denied` — refused by an admin, with the reason when one was written; `decidedAt` is when (`endedAt` stays
    empty). The student may request again.
  - `withdrawn`, `expired`, `cancelled`, `takenOut`, `classCancelled` — ended: kept as history, never
    changed again (a pending request also ends as `withdrawn` when its student's account is deleted).
- **Open enrolment**: a `pending` or `approved` one — the student's one live request or seat in that class.
- **On the waiting list** (not stored): how a `pending` request reads while its class is full (seats taken ≥
  capacity). It is a label, not a status.
- **Viewer's enrolment** (not stored): the latest enrolment of the person reading a class (by when it was
  requested, then id), with its reason (of a denial or a take-out), or none — what
  the student's card and details show.
- **Pending requests by class** (not stored): what admins decide from — the classes that haven't started, aren't
  cancelled and have pending requests, by start (then id), each with its capacity, seats taken, location and its
  requests in the order asked (by when requested, then id), with each student's id, name and photo; the total
  counts the requests.

## Relevant business rules

- **Only approved students request, and only before the class starts**, checked in this order: the account's
  status (`user.status.notApproved`, 403), its role (`enrolment.role.notStudent`, 403 — instructors and admins
  never take seats), the class (an id that isn't a UUID, or no class → `class.notFound`, 404),
  `class.cancelled` (409), `class.started` (409; a class whose start is exactly now has started, and a finished
  one too), `enrolment.rule.notAccepted` (422), `enrolment.alreadyOpen` (409). A refused request stores nothing
  and tells nobody.
- **The cancellation rule is accepted only when there is one**: when the class's discipline has a rule, the
  request must say it accepts it (`true`, nothing else) and the moment is kept; without a rule the request is
  accepted either way and nothing is kept. The rule's text is never stored with the request.
- **A full class still takes requests**: the waiting list is always on for now (the switch is spec 046), so a
  request on a full class is an ordinary pending one, shown as on the waiting list.
- **One open enrolment per student and class**: a second request while one is pending or approved is
  `enrolment.alreadyOpen` (409) — also when two arrive at the same moment, where exactly one is stored. After an
  enrolment ends, the student may request again, as many times as they want until the class starts; every
  request is a new enrolment and the ended ones keep their status.
- **Admins and the class's instructors hear of every new request**: one `enrolment.requested` for each approved
  admin and each instructor of the class — an admin who teaches it hears once — with the student's name, the
  class's discipline and start, through [Notifications](notifications.md). A notification that fails never
  changes the answer.
- **Withdrawing is for the student's own pending request, before the class starts**, checked in this order: the
  account's status (403); the enrolment (an id that isn't a UUID, no enrolment, another person's enrolment, or one
  whose class is gone → `enrolment.notFound`, 404); `enrolment.notPending` (409); `class.started` (409). The write
  only happens while the request is still pending, so of two withdrawals racing, one wins and the other gets
  `enrolment.notPending`. Nobody is told.
- **Pending requests expire when their class starts**: every minute, the pending requests of the classes that
  have started and aren't cancelled become `expired`, and each student hears once (`enrolment.expired`, with the
  class's discipline and start). A request is written only while still pending, and only a request that changed
  is told, so running it again sends nothing; a failed notification keeps the `expired` status.
- **Cancelling a class ends its open enrolments**: every pending or approved enrolment of the class becomes
  `classCancelled` in one write, and the students whose enrolment ended are handed back to Classes to be told;
  ended enrolments are untouched and their students aren't told.
- **Only approved admins decide, and only a pending request before its class starts**, checked in this order:
  the account's status (`user.status.notApproved`, 403), its role (`user.role.notAdmin`, 403 — students and
  instructors never decide); the enrolment (an id that isn't a UUID, no enrolment, or one whose class is gone →
  `enrolment.notFound`, 404); for a denial, the reason; `enrolment.notPending` (409 — already decided, withdrawn,
  expired…); `class.started` (409); for an approval, `enrolment.class.full` (409, seats taken ≥ capacity).
- **Approving takes the last seat exactly once**: the approval locks the class's row, counts the seats taken,
  refuses when the class is full and writes only while the request is still pending, all in one transaction, so of
  two approvals racing for the last seat one wins and the other gets `enrolment.class.full`. Direct enrolment takes
  the same lock, and guests (045) will.
- **The deny reason is optional**: trimmed, a blank one stored as none, at most 500 characters; longer, or not a
  string, is `enrolment.reason.max.length` (422). A full class can still be denied.
- **The student hears of the decision, nobody else**: `enrolment.approved` (the class's discipline and start) or
  `enrolment.denied` (also the reason, as written, when there is one), through [Notifications](notifications.md).
  Admins, instructors and the other waiting students are not told, and nobody is told when a seat opens: admins
  choose who gets it. A notification that fails never changes the answer or the decision.
- **Seats taken are the approved enrolments** (guests join with spec 045); **the students** are the approved
  ones, in the order they were approved (then by id); **pending requests** are the pending ones. Withdrawn,
  expired, class-cancelled, denied and every other ended enrolment count nowhere.
- **A student cancels their own approved seat while it is before the deadline**, checked in this order: the
  account's status (`user.status.notApproved`, 403); the enrolment (an id that isn't a UUID, no enrolment, another
  person's, or one whose class is gone → `enrolment.notFound`, 404); `enrolment.notApproved` (409 — pending, denied
  or any ended status); `class.started` (409); `enrolment.deadline.missing` (409 — the class has no deadline: the
  app tells the student to contact the school); `enrolment.deadline.passed` (409). The deadline is exclusive: at
  the deadline the seat is no longer cancellable. The write happens only while the seat is still approved, so of
  two cancels racing one wins and the other gets `enrolment.notApproved`. A refused cancel changes nothing and
  tells nobody. What a late cancellation costs is settled outside the app.
- **Admins and the class's instructors hear of every cancelled seat**: one `enrolment.cancelled` for each approved
  admin and each instructor of the class — an admin who teaches it hears once — with the student's name, the
  class's discipline and start, and the number of pending requests left after the cancel, through
  [Notifications](notifications.md). A notification that fails never changes the answer.
- **A deleted account gives up what it holds**: when [Authentication](auth.md) closes an account, every approved
  enrolment of the person in a class that hasn't started and isn't cancelled becomes `cancelled` — with no deadline
  check — with one `enrolment.cancelled` per class as above, and every pending one becomes `withdrawn`, telling
  nobody, in one transaction. A failed write fails the deletion (the account stays approved); releasing twice
  changes nothing more. Seats in started, finished or cancelled classes are untouched. A removed account's or a
  promoted student's seats stay as they are until their specs reuse the same release.
- **Only approved admins enrol directly, and only an approved student into a class that hasn't started and has a
  free seat**, checked in this order: the account's status (`user.status.notApproved`, 403), its role
  (`user.role.notAdmin`, 403); the class (an id that isn't a UUID, or no class → `class.notFound`, 404); the student
  (an id that isn't a UUID, or not an approved account with the student role — an instructor, an admin, a pending,
  denied or deleted account → `enrolment.student.invalid`, 422); `class.cancelled` (409); `class.started` (409);
  `enrolment.alreadyApproved` (409, the student already holds a seat); `enrolment.class.full` (409). A refusal stores
  nothing and tells nobody. The write locks the class like an approval, so of two writes for the last seat exactly
  one wins; a request the student sends at the same moment leaves one open enrolment (the other side gets
  `enrolment.alreadyOpen`).
- **A direct enrolment approves the student's pending request when there is one**: the same enrolment becomes
  `approved` (answered 200 with its id) and the student hears `enrolment.approved`, as for any approval. Otherwise a
  new approved enrolment is stored (answered 201) — no cancellation rule is accepted on the student's behalf — and
  the student hears `enrolment.enrolled` (the class's discipline and start). Nobody else is told, and a failed
  notification never changes the answer.
- **Only approved admins take a student out, and only of an approved seat before the class starts**, checked in this
  order: the account's status and role (403); the enrolment (an id that isn't a UUID, no enrolment, or one whose
  class is gone → `enrolment.notFound`, 404); the reason; `enrolment.notApproved` (409 — pending, denied or any
  ended status); `class.started` (409). The reason is optional: trimmed, a blank one stored as none, at most 300
  characters; longer, or not a string, is `enrolment.reason.max.length` (422). The write happens only while the seat
  is still approved, so of two racing one wins and the other gets `enrolment.notApproved`. The seat frees at once,
  and the student may request again.
- **The student hears of a take-out, nobody else**: `enrolment.takenOut` (the class's discipline and start, and the
  reason as written when there is one), through [Notifications](notifications.md). A failed notification never
  undoes the take-out.

## Who can do what

- **An approved student** — requests a seat in a class that hasn't started and isn't cancelled (accepting its
  rule when there is one), withdraws their own pending request before the class starts, cancels their own approved
  seat before the class's deadline, requests again after an earlier one ended, and sees their latest enrolment on
  every class they read.
- **An approved instructor or admin** — can't request; reads no enrolment of their own on any class; is told of
  every new request and every cancelled seat (admins all of them, instructors those of the classes they teach).
- **An approved admin** — lists the pending requests by class, approves one while its class has a free seat and
  hasn't started, and denies one, with an optional reason, before the class starts; enrols an approved student
  directly into a class that hasn't started and has a free seat; takes a student out of an approved seat before
  the class starts, with an optional reason.
- **Nobody** — expiring requests, ending them for a cancelled class and releasing a deleted account's enrolments
  happen without an actor.

## Boundaries

It depends on [Classes](classes.md) (the actor, the access check, the class state and the discipline) and on
[Authentication](auth.md) (role and status names); Classes never depends on it. It reads a class — its
discipline, start, end, capacity, cancellation, cancellation deadline, instructors and whether its discipline has
a cancellation rule —
and a student's name, and whether a user is an approved student, through its own contracts, which the backend fulfils. It answers Classes' contracts for the
roster, the seats taken, the pending requests, the viewer's enrolment and closing a cancelled class's
enrolments, through adapters the backend provides; Classes still decides when a class is cancelled and who else is
told. It fulfils, through a backend adapter, [Authentication](auth.md)'s contract for releasing a deleted account's
seats and requests; Authentication decides when. It doesn't send notifications itself: the new-request, decision,
expiry, cancelled-seat, direct-enrolment and take-out notices go through its own contract, which [Notifications](notifications.md) fulfils. It
doesn't read the clock directly. Guests (045), the waiting-list switch (046), telling
students of class edits and location changes (047) and the student's "Minhas aulas" (048) aren't built, nor a
history of who decided or undoing a decision, cancelling several seats at once or undoing a cancellation, taking a
student out after the class starts, moving a student between classes, or enrolling several students at once. In the
app, students request from a class's details (a sheet with
the class, the cancellation deadline and the rule to accept), withdraw (with a confirmation, or at once from the
waiting list), and see their status on the details and on the Agenda's cards — "Você está inscrito" once approved,
"Pedido recusado" with a sheet showing the school's reason and "Pedir novamente" once denied. An approved student
cancels from the details' "Cancelar inscrição" (a sheet with the deadline) and then reads "Você cancelou a
inscrição", the chip "Você cancelou" and "Pedir novamente"; past the deadline, or without one, the footer tells
them to contact the school, with the school's WhatsApp. Admins decide in the
"Inscrições em aulas" tool, reached from a row on their home with the number of requests. They enrol a student
directly in the "Inscrever aluno" tool (a row on their home: search a student, pick a day and one of its upcoming
classes), and take one out with "Retirar" on a student in the list of an upcoming class's details (a sheet with an
optional reason). A taken-out student reads "Você foi retirado da aula" with the reason, the chip "Retirado" and
"Pedir novamente".

## Spec history

- `041-enrolment-requests` — created the module: the `enrolment` aggregate with every status; approved students
  request a seat (rule accepted when the discipline has one; one open enrolment per class; a full class still
  takes requests), withdraw a pending one, and request again; admins and the class's instructors are told of each
  request; pending requests expire when the class starts; a cancelled class's open enrolments end as
  `classCancelled`; the roster, seats, pending requests and the viewer's enrolment read for Classes; the app's
  request and withdraw sheets, the student's button, banners and card chip, and the push taps.
- `042-enrolment-decisions` — admins list the pending requests by class (`GET /enrolments/pending`), approve one
  while the class has a free seat (`POST /enrolments/:id/approve`, a locked transaction so the last seat goes once)
  and deny one with an optional reason (`POST /enrolments/:id/deny`); the student is told (`enrolment.approved` /
  `enrolment.denied`), nobody else, and nobody when a seat opens; `reason` on the viewer's enrolment; the app's
  "Inscrições em aulas" tool and home row, the student's approved and denied banners, chips, the reason sheet and
  "Pedir novamente", and the decision push taps.
- `043-seat-cancellation` — students cancel their approved seat until the class's deadline (`POST
  /enrolments/:id/cancel`, exclusive deadline, `enrolment.deadline.missing` / `.passed`); admins and the class's
  instructors are told (`enrolment.cancelled`, with the waiting count); a deleted account's upcoming seats are
  cancelled and its pending requests withdrawn (`ReleaseStudentEnrolments`, behind Authentication's
  `SeatReleaser`); the class reader carries the deadline; the app's "Cancelar inscrição" button and sheet, the
  cancelled banner and chip, the deadline notes with "Falar com a escola", and the cancelled-seat push taps.
- `044-direct-enrolment-take-out` — admins enrol an approved student directly (`POST
  /classes/:id/enrolments/direct`: the class's lock, approving a pending request when there is one, else a new
  approved enrolment; `enrolment.student.invalid`, `enrolment.alreadyApproved`) and take a student out of an
  approved seat before the class starts (`POST /enrolments/:id/take-out`, optional reason of 300); the student is
  told (`enrolment.enrolled`, `enrolment.approved` or `enrolment.takenOut`), nobody else; a new `StudentLookup`
  contract; the roster's students carry their enrolment's id for Classes; the app's "Inscrever aluno" tool and home
  row, "Retirar" with its sheet on the admin's class details, the student's taken-out banner, chip and "Pedir
  novamente", and the push taps.
