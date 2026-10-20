# Module: Enrolment

## What it is for

It keeps the students' places in classes, as [Product](../product.md) describes **Enrolment** (`enrolment`) and
**Seat**: a student asks for a seat in a class that hasn't started, accepting the cancellation rule of its
discipline, follows the request, and may take it back or ask again. It also ends requests on the class's behalf:
pending ones expire when the class starts, and open ones end when the class is cancelled. It is the source of
the seats taken, the approved students and the pending requests that [Classes](classes.md) shows. Today it covers
the student's request side; admins' decisions, cancelling a seat, direct enrolment, taking a student out and
guests come with their specs (042–045).

## Main concepts

- **Enrolment** (`enrolment`): one request of one student for one class, and what became of it. Key fields: the
  class, the student, the status, when it was requested, when the student accepted the cancellation rule (none
  when the discipline had no rule), when it was decided, the reason (up to 500 characters; for a denial or a
  take-out) and when it ended. Relationships: a class has any number of enrolments; a student has any number,
  at most one of them open per class. Lifecycle (every status exists now; this module's actions produce the ones
  marked ✓):
  - `pending` ✓ — a new request. It holds no seat. Ends as `withdrawn` ✓ (the student, before the class starts),
    `expired` ✓ (still pending when the class starts), `classCancelled` ✓ (the class was cancelled), or later
    `approved` / `denied` (admins, spec 042).
  - `approved` — holds a seat. Ends as `classCancelled` ✓, or later `cancelled` (the student, spec 043) or
    `takenOut` (an admin, spec 044).
  - `denied`, `withdrawn`, `expired`, `cancelled`, `takenOut`, `classCancelled` — ended: kept as history, never
    changed again.
- **Open enrolment**: a `pending` or `approved` one — the student's one live request or seat in that class.
- **On the waiting list** (not stored): how a `pending` request reads while its class is full (seats taken ≥
  capacity). It is a label, not a status.
- **Viewer's enrolment** (not stored): the latest enrolment of the person reading a class (by when it was
  requested, then id), or none — what the student's card and details show.

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
- **Seats taken are the approved enrolments** (guests join with spec 045); **the students** are the approved
  ones, in the order they were approved (then by id); **pending requests** are the pending ones. Withdrawn,
  expired, class-cancelled and every other ended enrolment count nowhere. Nothing approves a request yet, so the
  seats and the students still read 0 and nobody.
- **A deleted or removed student's requests stay as they are** until spec 043 releases them.

## Who can do what

- **An approved student** — requests a seat in a class that hasn't started and isn't cancelled (accepting its
  rule when there is one), withdraws their own pending request before the class starts, requests again after an
  earlier one ended, and sees their latest enrolment on every class they read.
- **An approved instructor or admin** — can't request; reads no enrolment of their own on any class; is told of
  every new request (admins all of them, instructors those of the classes they teach).
- **Nobody** — expiring requests and ending them for a cancelled class happen without an actor.

## Boundaries

It depends on [Classes](classes.md) (the actor, the access check, the class state and the discipline) and on
[Authentication](auth.md) (role and status names); Classes never depends on it. It reads a class — its
discipline, start, end, capacity, cancellation, instructors and whether its discipline has a cancellation rule —
and a student's name through its own contracts, which the backend fulfils. It answers Classes' contracts for the
roster, the seats taken, the pending requests, the viewer's enrolment and closing a cancelled class's
enrolments, through adapters the backend provides; Classes still decides when a class is cancelled and who else is
told. It doesn't send notifications itself: the new-request and expiry notices go through its own contract, which
[Notifications](notifications.md) fulfils. It doesn't read the clock directly. Approving and denying requests,
the admins' "Class enrolments" tool and the ordered waiting list (spec 042), cancelling a seat and its deadline
(043), direct enrolment and taking out (044), guests (045), the waiting-list switch (046), telling students of
class edits and location changes (047) and the student's "Minhas aulas" (048) aren't built. In the app, students
request from a class's details (a sheet with the class, the cancellation deadline and the rule to accept), withdraw
(with a confirmation, or at once from the waiting list), and see their status on the details and on the Agenda's
cards.

## Spec history

- `041-enrolment-requests` — created the module: the `enrolment` aggregate with every status; approved students
  request a seat (rule accepted when the discipline has one; one open enrolment per class; a full class still
  takes requests), withdraw a pending one, and request again; admins and the class's instructors are told of each
  request; pending requests expire when the class starts; a cancelled class's open enrolments end as
  `classCancelled`; the roster, seats, pending requests and the viewer's enrolment read for Classes; the app's
  request and withdraw sheets, the student's button, banners and card chip, and the push taps.
