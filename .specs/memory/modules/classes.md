# Module: Classes

## What it is for

It schedules the school's classes, as [Product](../product.md) describes **Class** (`class`) and **Location**
(`location`): admins create classes one at a time or in a batch, at a saved location, with the instructors who
teach them, and the instructors are told; every approved account then browses the classes by week or by month,
all or one sport at a time, and reads each one; admins edit and remove (archive) locations, and every class at a location follows its edits;
admins edit one class at a time, within what its state allows, cancel a class until it
finishes, and delete one created by mistake before it starts. It also keeps the school's **Cancellation rule**
(`cancellation-rule`) of each discipline and gives every upcoming class its **Cancellation deadline**. It is the
base that [Enrolment](enrolment.md), ratings and photos build on. It brings together three business areas: **Locations**,
**Classes** and **Cancellation rules and deadlines**.

## Locations

The places where classes happen.

- **Location** (`location`): a saved place. Key fields: name, address, a point on the map (latitude and
  longitude), when it was created and, once removed, when it was archived. Relationships: a class has one
  location; a location has any number of classes. Lifecycle: `active` → `archived` (an admin "removes" it;
  nothing restores it). Limits: name 1 to 40 characters and address 1 to 200 (free text), both after removing the
  spaces at either end; latitude −90 to 90 and longitude −180 to 180. Locations saved before spec 037 have no
  point until they are edited.
- **Upcoming classes of a location** (not stored): its classes that start after now and aren't cancelled; the
  list shows their count.
- **Address suggestion** (not stored): a place an external maps service proposes for what the admin typed — an id,
  a title and a description — and the place behind it: its address, point and name.

Rules:

- **A name is unique among active locations, ignoring case and accents**: "Praia do Futuro", "praia do futuro"
  and "Práia do Futuro" are the same place. A second one is refused with `location.name.duplicate` (409), also
  when two admins create it at the same moment — exactly one of them wins. An archived location frees its name.
- **Invalid values are refused with their keys, all together** (422): `location.name.required`,
  `location.name.max.length`, `location.address.required`, `location.address.max.length` (a value that isn't text
  counts as missing), `location.point.required` (latitude or longitude missing or empty) and
  `location.point.invalid` (not a finite number, or out of range). Creating and editing both require the point.
- **The list is the active locations, sorted by name ignoring case and accents, then id**, not paged, each with its
  point (none for an old location) and its number of upcoming classes. Archived locations are never listed.

Editing a location:

- **Checked in this order**: access; the id (not a UUID, or no location → `location.notFound`, 404); the values,
  every problem together (422) — the keys above plus `location.notify.invalid` when the notify choice is present
  and isn't yes/no; `location.archived` (409, an archived location can't be edited); `location.name.duplicate`
  (409, another active location; its own name in another case or with other accents is fine).
- **An edit applies to every class at the location**, past ones included: a class refers to its location, it
  doesn't copy it. A save where the name, address and point are all the same (after trimming) writes nothing and
  tells nobody.
- **A new name or address clears the deadlines of the location's upcoming classes** in the same write, so they
  are worked out again (the model reads the name and the address); moving only the point keeps them, and started,
  finished and cancelled classes keep theirs.
- **The admin chooses whether to tell the students and instructors**: with the choice on and something changed,
  every instructor of the location's upcoming classes and every student with a seat or a pending request in them,
  except the admin who edits, gets one `location.changed` with how many of their upcoming classes are there and the
  new name, through [Notifications](notifications.md); a person who is both gets one, with the larger count. Past
  and cancelled classes don't count. A notification that fails never changes the answer or the edit, and when the
  students can't be read only the instructors are told.

Removing (archiving) a location:

- **Checked in this order**: access; the id (`location.notFound`, 404); `location.archived` (409, already
  archived). Of two admins removing it at the same moment, one succeeds and the other gets `location.archived`.
- **An archived location is kept, not deleted**: the classes that use it keep showing its name, address and point;
  it can't be edited, listed or given to a class. The last active location can be removed.

Address suggestions (admins):

- **The search text is trimmed and must have 3 to 100 characters** (`location.suggestions.query.invalid`), and the
  session token, which groups one search for billing, 1 to 64 letters, digits, `_` or `-`
  (`location.suggestions.sessionToken.invalid`), both reported together (422); the language is `pt-BR`, `es` or
  `en`, anything else counts as `pt-BR`. At most 5 suggestions.
- **The service failing is `location.suggestions.unavailable` (502)**; a place it doesn't know is
  `location.place.notFound` (404). Without the service's key outside production, there are no suggestions and no
  places.

## Classes

The classes themselves, and how a batch becomes classes.

- **Class** (`class`, `school-class` in code — "Class" is avoided as a name): one session. Key fields:
  discipline (`surf` | `skate`), level (`beginner` | `advanced` | `expert`, a label only), when it starts and
  ends, location, instructors (one or more instructors or admins), capacity, notes (optional), who created it, and
  — once cancelled — when it was cancelled and the cancellation message (optional). Lifecycle: created, then
  edited (every field before it starts, only its instructors once started, nothing once finished or cancelled),
  and cancelled at most once, any time before it finishes, or deleted — removed for good, with nothing kept —
  while it hasn't started, isn't cancelled and is empty; its state follows the clock — `not-started` before its
  start, `started` from its start, `finished` from its end — computed, never stored, except `cancelled`, which is
  stored and wins over the clock. Limits: capacity 1 to 20; notes and the cancellation message up to 300
  characters after trimming (blank ones are stored as none).
- **Batch** (not stored): what the admin chooses to create classes — a first and a last date (inclusive), the
  weekdays to include (Monday 1 to Sunday 7), the dates of the range left out (`excludedDates`, optional), one
  or more time ranges (`HH:mm`), whether to skip the classes that have already started (`skipPast`, optional),
  and the fields every class shares. It becomes one class per included day and time range. The app always sends
  all seven weekdays and removes single days with `excludedDates`; the API keeps `weekdays` for older builds.
- **Edit** (not stored): the whole class sent again — discipline, level, one day (`YYYY-MM-DD`), a start and an
  end (`HH:mm`, the class ends on its start day), location, instructors, capacity, notes — compared field by field
  with the stored class.
- **Seats taken** (not stored): how many seats of a class are held — its approved students plus its guests;
  counted by [Enrolment](enrolment.md) from its approved enrolments and its guests.
- **Class roster** (not stored): the seats taken, the approved students (id, name, photo or none, and the id of
  the approved enrolment, which an admin can take them out of) and the guests (id and name, the name empty once
  erased) of a class, read for many classes at once, from Enrolment.
- **Class contacts** (not stored): for the students and instructors of one class, each person's role, status,
  WhatsApp number and whether they share it, from the accounts. Reading one class gives each student and
  instructor their number only when they are approved, have one, and share it or the reader is an admin (the
  People directory's rule), and each instructor their role (instructor or admin); the week list and a student's
  own classes never carry either.
- **Pending requests** (not stored): how many enrolment requests of a class still wait for an answer, from
  Enrolment. Reading one class gives the count to an admin and none to every other role; the week list never
  carries it.
- **Class audience** (not stored): the students with a seat (approved) or a pending request in a class, each once —
  or in a location's upcoming classes, each with how many of those classes they are in — from Enrolment; the people
  an edit or a location change reaches besides the instructors.
- **Reader's enrolment** (not stored, `myEnrolment`): the latest enrolment (id, status, when requested, and the
  reason — the admin's denial reason, else none) of the
  person reading the class, by when it was requested and then id, or none; read for many classes at once, from
  Enrolment, for every role (instructors and admins never have one).
- **Classes a person teaches** (not stored, spec 057): the classes where the person is one of the instructors. A
  person **teaches** when they are an instructor of at least one class, in any state — not started, under way,
  ended or cancelled; a deleted class leaves nothing. Their current classes are those that haven't ended, cancelled
  ones included, by start then id, each read as a card with the guests' names and no enrolment.
- **Time-range suggestion** (not stored): a start–end pair taken from last week's classes.
- **Class view** (not stored): a class as people read it — its fields, its location's name, address and point
  (none when the location has none; an archived location reads the same), its instructors' ids and names, its
  roster and the reader's enrolment.

Rules:

- **Every date and time is America/Fortaleza**: the batch is expanded there and each class is stored as an
  instant, so the phone's time zone never matters.
- **A batch is all or nothing**: every class and its instructors are written together, and nothing is stored on
  any refusal — "Criar N aulas" always means N.
- **An excluded date gets no class**, whatever its weekday; excluding every date of the range leaves the batch
  empty.
- **No class is ever created after its start**: without `skipPast`, one class starting at or before the server's
  now refuses the whole batch; with `skipPast`, those classes are left out and the rest is created. With
  `skipPast` the batch is listed from the later of its first date and today (Fortaleza), so the days before today
  get no class and the 200 limit is judged on the classes that remain, whatever the first date.
- **The shape is checked first, every problem reported together** (422): `class.discipline.invalid`,
  `class.level.invalid`, `class.dates.invalid` (malformed or impossible date, or the last before the first),
  `class.weekdays.invalid`, `class.excludedDates.invalid` (a date that isn't a real `YYYY-MM-DD`),
  `class.skipPast.invalid` (not a boolean), `class.timeRanges.required`, `class.timeRanges.invalid` (malformed time),
  `class.timeRanges.endBeforeStart`, `class.timeRanges.overlap` (touching ranges such as 08:00–09:00 and
  09:00–10:00 don't overlap), `class.capacity.invalid`, `class.notes.max.length` (also for notes that aren't
  text), `class.instructors.required`, `class.location.required`.
- **Then, one at a time and in this order** (422): `class.location.notFound`; `class.location.archived` (an
  archived location can't be given to a class); `class.instructors.invalid` (an id
  that isn't an approved instructor or admin — a student or a pending instructor is refused; repeated ids count
  once); `class.batch.empty` (no class left: the weekdays and the excluded dates leave out every date or, with
  `skipPast`, every class has started); `class.batch.tooLarge` (more than 200 classes, with the maximum in the
  details); `class.startsAt.past` (without `skipPast`, any class starting at or before the server's now — one
  past class refuses the whole batch).
- **Classes of different batches may overlap**: only the ranges inside one batch are checked against each
  other.
- **Each assigned instructor is told once per batch**: one `class.assigned` notification with the number of
  classes and the discipline, through [Notifications](notifications.md); the admin who created the batch is
  not told, even when teaching it. A notification that fails never changes the answer or the stored classes.
- **Suggestions come from last week**: the distinct start–end pairs, in Fortaleza time, of the classes starting
  from last Monday 00:00 (inclusive) to this Monday 00:00 (exclusive), sorted by start then end; none →
  an empty list. Ranges added on the spot are never kept.
- **A week is Monday 00:00 to the next Monday 00:00, Fortaleza, by start**: any day of the week (`YYYY-MM-DD`)
  names it; the week answers its Monday and the classes starting in it, sorted by start, then end, then id; a
  week without classes is an empty list. A date that is missing, malformed or impossible is refused with
  `class.date.invalid` (422), after the account's status.
- **The instructors of a class are listed A–Z by name**, ignoring case and accents, then by id.
- **A class is read by its id**: an id that isn't a UUID, or no class with it, is `class.notFound` (404).
- **The state is the same everywhere**: `cancelled` whenever the class was cancelled, whatever the clock;
  otherwise `not-started` while now is before the start, `started` from the start until before the end,
  `finished` from the end. The app computes it with the phone's clock and the class's cancellation, so the API
  never sends a state, and every rule that depends on it (editing, cancelling) uses the same boundaries.

Editing one class:

- **Checked in this order**: access; the id (not a UUID, or no class → `class.notFound`, 404); the shape, every
  problem together (422): `class.discipline.invalid`, `class.level.invalid`, `class.date.invalid`,
  `class.time.invalid` (start or end missing or not `HH:mm`), `class.time.endBeforeStart` (end not after start),
  `class.capacity.invalid`, `class.notes.max.length`, `class.instructors.required` (an edit can never leave a
  class without an instructor), `class.location.required`; then, one at a time, against the stored class and the
  server's now: `class.cancelled` (409), `class.finished` (409), `class.started` (409), `class.location.notFound`,
  `class.location.archived` (only when the location changes: a class keeps its archived location),
  `class.instructors.invalid`, `class.startsAt.past`, `class.capacity.belowSeatsTaken` (422, with the seats taken
  in the details).
- **A cancelled class doesn't change**: any edit is refused with `class.cancelled`, even one that changes nothing
  or on a class that has also finished; an edit that read the class just before it was cancelled is refused the
  same way when it is written, and tells nobody.
- **A finished class doesn't change**: any edit is refused with `class.finished`, even one that changes nothing.
- **A started class only changes its instructors**: any other field that differs is refused with
  `class.started`; a class whose start is exactly now has started.
- **The start never moves into the past**: a class that hasn't started can't get a start at or before now.
- **The capacity never goes below the seats taken** (guests included).
- **Guests' names are shown only to admins and the class's own instructors**: every class read carries its guests,
  with the name for an approved admin and for an instructor of that class, and without it ("Trial") for everyone
  else; an erased guest has no name for anyone. The week list carries every guest (they are few).
- **Only added instructors are checked**: an id not already on the class must be an approved instructor or
  admin; the ones already on it are kept whatever their role or status is now, so a substitute can be swapped
  in even when a co-instructor was demoted. Repeated ids count once.
- **"Changed" means a field differs**: discipline, level, start, end, location, capacity and the trimmed notes
  (none when blank), and the instructors as a set (order ignored). A save where nothing differs is accepted and
  changes nothing — not even when the class was last updated — and tells nobody.
- **The class and its instructors are written together**; two admins saving the same class at once: the last
  save wins.
- **Who is told, after the class is stored, never the admin who edits** (even when teaching it): the
  instructors on the class before and after, and the class's audience (its students with a seat and the people
  with a pending request, never withdrawn, expired or denied ones), get `class.edited` when a class field changed,
  each person once; the added instructors get `class.assigned` (count 1, not `class.edited`); the removed ones get
  `class.unassigned`. Changing only the instructors tells only the added and the removed, and no student. When the
  audience can't be read only the instructors are told. A notification that fails never changes the answer or the
  stored class.

Cancelling one class:

- **Checked in this order**: access; the id (not a UUID, or no class → `class.notFound`, 404); the message
  (present and not text, or over 300 characters after trimming → `class.cancellationMessage.max.length`, 422);
  then, against the stored class and the server's now, `class.cancelled` (409, already cancelled — whatever time
  it is, also after its end) and `class.finished` (409). A class that has started (its start is exactly now
  included) and hasn't finished is cancelled; one whose end is exactly now has finished.
- **The message is optional and shown as written**: trimmed; blank or absent is stored as none; never translated.
- **Cancelling is final**: the class stays on the schedule for everyone, marked as cancelled; it can't be
  cancelled again, edited or restored, and who cancelled it isn't kept.
- **Exactly one cancel wins**: two admins cancelling the same class at the same moment — one succeeds, the other
  is refused with `class.cancelled`.
- **Cancelling ends the class's open enrolments**: after the class is stored as cancelled, its pending and
  approved enrolments become `classCancelled` through [Enrolment](enrolment.md), which hands back their students;
  ended enrolments are untouched. A failure there is swallowed: the class stays cancelled and its enrolments stay
  open (the expiry skips cancelled classes, so they don't end later on their own).
- **Who is told, after the class is stored as cancelled, never the admin who cancels** (even when teaching it):
  every instructor of the class and every student whose enrolment it just ended get one `class.cancelled`, with
  the message when there is one — a person on both lists once. Nobody left → nothing sent. A notification that
  fails never changes the answer or the stored cancellation.

Deleting one class:

- **Deleting is for mistakes**: a class with anybody in it, or one that has started, is cancelled instead.
- **Checked in this order**: access; the id (not a UUID, or no class → `class.notFound`, 404); then, against the
  stored class and the server's now, `class.cancelled` (409, whatever time it is), `class.started` (409, a class
  whose start is exactly now included, and a finished one too), and `class.delete.notEmpty` (409, with the seats
  taken and the pending requests in the details) when anybody holds a seat or has a pending request (counted by
  Enrolment).
- **Deleting is final and leaves nothing**: the class and its instructors are removed; it can't be restored, and
  notifications already sent about it stay.
- **Exactly one delete wins**: the checks sit on the delete itself. Two admins deleting the same class at the
  same moment — one succeeds, the other gets `class.notFound`; a delete that lost to a cancel gets
  `class.cancelled`, and one that lost to the clock `class.started`.
- **Who is told, after the class is deleted, never the admin who deletes** (even when teaching it): every
  instructor of the class gets `class.deleted` with its discipline and start (no class to open). A class taught
  only by that admin tells nobody. A notification that fails never changes the answer or the deletion.

Releasing a person's upcoming classes (when their account is deleted, or an instructor is made a student):

- **No access check**: it runs for an account event or a role change, never on its own request; nobody's role or
  status is checked here. A role change passes the admin who made it (`actorId`), left out of the "no instructor"
  notice; a deletion passes none.
- **It answers how many classes the person left** and how many were left with nobody.
- **Only classes that haven't started and aren't cancelled** lose the person — every one of them, in one write;
  classes under way, finished or cancelled keep them as history. No such class → nothing written or sent.
- **A class left with nobody stays scheduled**: it isn't cancelled or deleted, and it is flagged.
- **Admins are told once per event**, after the write, only when at least one class was left with nobody: the
  count and the earliest such class (by start, then id), never the person who left nor the actor. Classes that keep another
  instructor tell nobody. A notification that fails never changes the result or the write; a failed write tells
  nobody.
- **The "no instructor" flag is computed, never stored**: a class with no instructor that hasn't started. It
  disappears once the class starts, is cancelled, or gets an instructor (an edit always needs one).

Reminding a class's people (spec 054):

- **No actor**: a check runs every minute, never on a request.
- **Who is reminded**: the students with an approved seat in the class and every instructor of the class
  (instructors and admins who teach it), each person once. Pending requests (the waiting list included) and guests
  never are, nor are people added after the reminder went out.
- **When**: a class is due when its start is within the next 30 minutes (the lead time is fixed), it hasn't
  started and isn't cancelled, and its start wasn't reminded yet. The first check inside those 30 minutes reminds
  it, so a class created or moved into them, or one missed while the server was down, is still reminded before
  it starts; a class that has started never is.
- **Once per start**: the class is marked as reminded by a write that only succeeds while it is unmarked and not
  cancelled, and only the check whose write succeeded tells anybody — two checks at once remind once. A class
  cancelled after its reminder gets no second one.
- **Moving the start re-arms it**: an edit that changes the start clears the mark in the same write as the edit,
  so the new start is reminded; any other edit (end, notes, capacity, instructors, location…) keeps it.
- **What it says**: `class.reminder` with the class, its discipline, its start and its location's name, read when
  the reminder is sent. A class whose location can't be found stays due and unmarked. A notification that fails
  keeps the class marked and isn't retried.

## Cancellation rules and deadlines

What a student may cancel, and until when.

- **Cancellation rule** (`cancellation-rule`): the free text of one discipline (`surf` or `skate`), as an admin
  wrote it. Key fields: discipline, text, who saved it last and when. At most one per discipline; only the
  current text is kept. Limit: 1 to 2000 characters after removing the spaces at either end.
- **Cancellation deadline** (part of a class): the moment until which a seat in that class can be cancelled — one
  per class, never after its start. Each class also keeps how many attempts to work it out have failed in a row,
  when the next one is due, and a revision that changes every time the deadline is cleared.
- **Deadline description** (not stored): what the language model understood from a rule for one class — a number
  of minutes before the start (0 to 43200), a number of days before (0 to 30) at a time of day (`HH:mm`), the
  start itself, or "unclear".

Rules:

- **A rule is saved trimmed and otherwise as written**, with no check of its wording. Refusals, in order, after
  access: a discipline other than surf or skate (`cancellationRule.discipline.invalid`), a missing, non-text or
  blank text (`cancellationRule.text.required`), over 2000 characters (`cancellationRule.text.max.length`), all
  422; a refused save stores and clears nothing. The last save wins.
- **A changed rule clears the deadlines of its discipline's upcoming classes**: every class of that discipline
  that starts after now and isn't cancelled loses its deadline, in the same all-or-nothing write as the rule.
  Saving the same text (after trimming) writes nothing and clears nothing; the first rule clears the same way.
- **An edit clears the deadline when a detail the model reads changes** — discipline, level, start, end,
  location, capacity or notes — in the same write as the edit; changing only the instructors keeps it. A new
  class starts without one.
- **Only the rule and the class's details are sent to the model**: the rule text, the discipline, level, date,
  weekday, start and end times (Fortaleza), location name and address, capacity and notes. Never an id, an
  instructor, the creator or anything about a person.
- **The model describes, the module computes**: the instant comes from the description and the class's start, in
  Fortaleza time, and is capped at the start (a rule allowing cancelling any time gives the start). An "unclear"
  description, a missing field or a value out of range gives no deadline; a deadline already past when it is
  computed is kept as it is.
- **Deadlines are worked out in the background**, every minute: at most 20 classes per run, those that start
  after now, aren't cancelled, have no deadline, whose discipline has a rule and whose next attempt is due —
  never-tried first, then by start. A discipline without a rule is never sent; its classes stay without a
  deadline until the rule is saved.
- **A failed attempt waits longer each time**: after the n-th failure in a row the next attempt is 1, 2, 4, 8, 16,
  32, then 60 minutes later; any failure (unclear, unreadable, refused, unreachable) counts the same, and nobody is
  notified. A worked-out deadline resets the count.
- **A stale result is never stored**: a deadline or a failure is written only if the class is still at the
  revision it was read at and isn't cancelled, so an edit or a rule change during the model's answer wins and the
  class is worked out again from the new details.
- **The "no cancellation deadline" flag is computed, never stored**: a class without a deadline that hasn't
  started. It disappears once the class starts, is cancelled, or gets its deadline.

## Who can do what

The account's status is checked before its role (`user.status.notApproved`, then `user.role.notAdmin`, both
403); an unknown account is refused as signed out.

- **An approved account of any role** — lists the active locations, lists the classes of any week, past or future,
  reads any class with its notes, its cancellation deadline, its seats taken, its approved students, its guests
  as "Trial" (names only for admins and the class's instructors), its instructors' roles, the WhatsApp numbers of
  its students and instructors who share them (every number for an admin) and their own
  latest enrolment in it, and reads both cancellation rules.
- **An approved student** — lists their own classes: those that haven't ended where they have any enrolment
  (cancelled ones included), each with their latest enrolment, and, one period at a time (up to 42 days, spec 053),
  the classes they took — ended, not cancelled, with their latest enrolment approved, starting on an America/Fortaleza
  day of the period. Other roles are refused (`enrolment.role.notStudent`).
- **An approved instructor or admin** — lists the classes they teach that haven't ended (cancelled ones included)
  and learns whether they teach any class at all; students are refused (`user.role.notTeacher`, 403, after the
  status check).
- **A student with a seat or a pending request** — receives one notification when the class is edited (a class
  field changed) and one when a location of their upcoming classes changes, if the admin who edits it chooses to
  tell them; with an approved seat, one reminder 30 minutes before each start of the class.
- **An approved admin** — creates, edits and removes locations, gets address suggestions, creates batches of
  classes, reads the time-range suggestions, edits a
  class that hasn't finished and isn't cancelled, reads a class's pending-request count, cancels a class that
  hasn't finished, and deletes a class that
  hasn't started, isn't cancelled and has nobody in it; sees the "no instructor" flag on a class's card and
  details, and is told when an account deletion leaves classes with nobody; saves the cancellation rule of each
  discipline and sees the "no cancellation deadline" flag.
- **An assigned instructor or admin** — receives one notification per batch they were assigned to (unless
  they created it), and one when a class they teach is edited, when they are added to one or removed from one
  (unless they made the edit), when it is cancelled (unless they cancelled it), and when it is deleted (unless
  they deleted it), and one when a location of their upcoming classes changes, if the admin who edits it chooses
  to tell them (unless they made the edit), and one reminder 30 minutes before each start of a class they teach.

## Boundaries

It knows people only by their ids: whether an id is an approved instructor or admin, and the names shown with a
class, and the role, status and WhatsApp number of a class's people (read only for one class's details), come
through its own contracts, provided by the backend from [Authentication](auth.md)'s accounts; it uses Authentication's role and
status names. It doesn't send notifications itself: it hands the instructors and the class's details to two
contracts that [Notifications](notifications.md) fulfils (assignments — added and removed — and class changes:
edits, cancellations and deletions), plus a third for the classes left without an instructor, a fourth for
location changes (each person — instructor or student — with their count, and the location's new name) and a
fifth for class reminders (the people to remind, the class, its discipline, its start and its location's name). The address suggestions come
through their own contract, which the backend fulfils with Google's Places service; the module never sees the
provider. Authentication
reaches the release through its own contract, which the backend fulfils with this module's use case — this module
depends on Authentication, never the reverse.
It doesn't read the clock directly either, and it learns the seats taken, the pending requests, the rosters
(seats taken and approved students), the reader's enrolment and the audience of a class or a location's upcoming
classes through its own contracts, closes a cancelled class's enrolments through another, and learns which
classes are a student's own (current and taken) through a seventh;
[Enrolment](enrolment.md) fulfils all seven through the backend, and this
module never depends on it. The roster keeps the students in the order they were approved, then by id, and the week list carries at
most 4 students per class (a single class all of them) while its seats taken are never capped. The language model that describes the deadlines sits
behind its own contract too, which the backend fulfils with Anthropic's Claude; the module never sees the
provider. In the app,
admins create classes on the "Nova aula" screen, which uses the module's own batch expansion and limits so its
count matches what the backend creates: it removes single days of a range and, when today is among the dates,
leaves out today's classes of the times that have already started and sends `skipPast`. Every role sees the
classes on its week screen (the student's Agenda, the Aulas tab of instructors and admins) and their details,
built from the module's state rule; the classes a person teaches aren't marked. A card shows no instructors: an
occupancy bar with "N/M vagas" (red when full, sun above 80%, otherwise the discipline's colour) and a "Sem vagas"
chip on a full class that hasn't started, and a footer with up to 4 student avatars, "+N" for the other seats
taken (guests included) and "Ainda sem alunos" / "N alunos confirmados", or "N alunos presentes" once finished; a
finished card has no bar and a cancelled one neither bar nor footer. The details show "A aula" — with "Máx. N
alunos · X vagas livres" (or "esgotado") at the right of the label, hidden once finished or cancelled; the
instructors as pills and the students row (up to 5 avatars, students then guests, opening the list of every
student and guest); an instructor's pill and a student's row open the People directory's person sheet, whose
WhatsApp row follows the class's contacts, while guests open nothing —, a "Turma cheia" banner on a full class that
hasn't started, a "Regras" card (the "Cancelamento" row with "Até …" or "Ler a regra", opening the rules sheet, and
"Regras da escola" with how many rules the school has; not on a cancelled class), the notes in a card, the "Onde e
como" card and, for instructors, a note that the school makes the changes (a class
they teach) or that they read it only (one they don't). A person without a photo shows their initials. A cancelled class shows "Cancelada" with its time struck through on its card and one "Aula
cancelada" banner with its message on its details. Admins reach a class's tools from a round button on its
details (hidden once it has finished or is cancelled), four cards: "Editar aula" (one day, one time range, the other Nova
aula sections; only the instructors once it has started), "Enviar mensagem" (with how many people it would reach;
not doing anything yet), "Cancelar aula" (a confirmation with the optional message) and "Apagar aula", disabled
once the class has started or while anybody holds a seat (a confirmation; when the class turns out not to be
empty, a "Não dá para excluir" variant that offers "Cancelar aula" instead). A class with no instructor says "Sem instrutor
atribuído" on its details for everyone; while it hasn't started, admins also see a "Sem instrutor" chip on the
card and a banner on the details that opens "Editar aula". Admins edit the cancellation rules from a screen
reached from their home; everyone reads them in a sheet from the Profile. A class without a deadline shows
admins a "Sem prazo" chip on its card and a "Sem prazo de cancelamento" banner on its details that opens the rules
screen; a class with one shows everyone its deadline in the "Cancelamento" row of its details. The student's request button, its
sheet and the enrolment banners and card chip are Enrolment's (on the student's details, Agenda and "Minhas aulas"), and so
are the "Cancelar inscrição" button and its sheet and the deadline notes with "Falar com a escola" (spec 043). On "Nova aula" and "Editar aula", the "Local" section's "Gerir"
mode opens a location to edit it; the location sheet searches addresses as the admin types, places the point on a
small map, offers to tell the instructors when upcoming classes use it, and removes it after a confirmation; a
class whose location was removed shows it as "Removido" on "Editar aula" and can keep it. A class whose location
has a point shows everyone a small map across the top of the "Onde e como" card, with "Direções" beside the place. Instructors, and admins who teach, open "Minhas aulas" from
the first "Escola" row of their home (an admin's row shows only once they teach a class): the classes under way on
grape cards, then the others by day ("Hoje", "Amanhã", the weekday) with the next class marked "Próxima" and
cancelled ones in their day (spec 057), filtered by sport with the Aulas tab's floating button ("Nenhuma aula de
surf/skate" when the chosen sport has none left, spec 059); their past classes, ratings and photos come with their specs; the student's "Minhas aulas" and "Histórico" screens are Enrolment's, built on this module's cards. A class keeps a link to the admin who created it,
which stops that account from being erased while the link exists — a decision for the erasure spec.

## Spec history

- `028-create-classes` — created the module: locations with a unique name and an address (create, list); classes
  created in an all-or-nothing batch in America/Fortaleza time, with the shape, location, instructor, size and
  past checks; time-range suggestions from last week; one `class.assigned` notification per instructor and
  batch.
- `029-batch-excluded-dates-skip-past` — a batch can leave out single dates (`excludedDates`) and skip the
  classes that have already started (`skipPast`), with their shape errors; with `skipPast` the days before today
  are dropped before the 200 limit is judged; the app's form removes single days and skips today's past times.
- `030-classes-week-view` — the class state by the clock (`not-started` / `started` / `finished`); any approved
  account lists one Fortaleza week of classes (`class.date.invalid`) and reads one class (`class.notFound`), with
  the location and the instructors sorted by name; the app's week view and class details for the three roles.
- `031-week-month-calendar` — no change to the module's rules or API: the app's classes screen picks its day in a
  week and month calendar (one dot per day with classes), loading each week it shows with the existing week request.
- `032-class-editing` — approved admins edit one class: every field before it starts (never into the past), only
  the instructors once started, nothing once finished; capacity never below the seats taken (0 until enrolment);
  only added instructors checked; an unchanged save does nothing; kept, added and removed instructors told
  (`class.edited`, `class.assigned`, `class.unassigned`), never the editor; the app's pencil and "Editar aula".
- `033-class-cancellation` — approved admins cancel a class until it finishes (a started one included), with an
  optional message of up to 300 characters; `cancelled` is stored, final and wins over the clock; a cancelled
  class can't be edited or cancelled again (`class.cancelled`), even by an edit or a cancel racing it; its
  instructors are told (`class.cancelled`), never the admin who cancels; the app's class tools on the details
  (replacing the pencil), the cancel sheet, and the cancelled card and details.
- `034-class-deletion` — approved admins delete a class that hasn't started, isn't cancelled and has nobody in it
  (`class.cancelled`, `class.started`, `class.delete.notEmpty` with the seats taken and the pending requests, the
  latter counted through a new contract answering 0 until enrolment); the delete is conditional, so a racing
  delete gets `class.notFound` and a racing cancel `class.cancelled`; the class and its instructors leave for good;
  its instructors are told (`class.deleted`), never the admin who deletes; the app's "Excluir aula" tool, its
  confirmation and its "Não dá para excluir" variant.
- `035-class-no-instructor` — releasing a person from every class that hasn't started and isn't cancelled, in one
  write, for an account deletion (no actor); the classes left with nobody stay scheduled and the approved admins
  are told once with the count and the earliest one (`class.noInstructor`, not the person who left); the computed
  "no instructor" flag; the app's "Sem instrutor" chip (admins), footer and "Sem instrutor atribuído" (everyone),
  and the admin's banner that opens "Editar aula".
- `036-cancellation-rules-deadline` — the `cancellation-rule` aggregate: approved admins save the surf and skate
  rules (trimmed, 1–2000 characters), every approved account reads both; a changed rule clears the deadlines of
  its discipline's upcoming classes in the same write. Each class gets a cancellation deadline, worked out every
  minute through a language-model contract (only the rule and the class's details sent; the module computes the
  instant, capped at the start), retried with backoff, never stored from stale inputs; an edit of a detail the
  model reads clears it; the computed "no cancellation deadline" flag; the app's rules screen and sheet, the "Sem
  prazo" chip and banner (admins) and the "Cancelamento até …" line (everyone).
- `037-class-locations` — a location's point on the map (required when created or edited; old ones keep working
  without one), its archive state (`location.archived`; the name freed) and the upcoming-class count in the list;
  approved admins edit a location (every class follows, past ones included; a new name or address clears the
  upcoming deadlines; an unchanged save does nothing; `location.changed` to the instructors of its upcoming classes
  when the admin chooses, never the editor) and remove (archive) it; an archived location can't be given to a class
  (`class.location.archived`) but its classes keep it; address suggestions and their places through a new
  contract; the point in the class view; the app's "Gerir" mode, the location sheet with suggestions and the map,
  the removal confirmation, and the map with "Direções" on the details.
- `040-class-seats-read-model` — the class roster read through a new contract (`ClassRosterReader`, one read for
  many classes, students in approval order then by id, a cap that never changes the seats taken), answered by a
  stub with 0 and nobody until enrolment; every class read carries its seats taken and approved students (at most 4
  per class on the week list); the app's card (occupancy bar, "Sem vagas", students footer, no instructors line)
  and details ("A aula", "Turma cheia", "Regras", the instructors' read-only note).
- `041-enrolment-requests` — the three counting contracts are answered by [Enrolment](enrolment.md) (the stubs are
  gone); every class read carries the reader's latest enrolment (`myEnrolment`, through a new contract); cancelling
  a class ends its open enrolments through another new contract and tells those students `class.cancelled` with the
  instructors (each person once); the app's details take the student's request button (`canEnrol`) and the Agenda's
  cards the enrolment chip (`showEnrolment`), both only in the student's flow.
- `042-enrolment-decisions` — the reader's enrolment carries its `reason` (`null` when none); the seats taken and
  the roster now grow as admins approve requests in [Enrolment](enrolment.md).
- `043-seat-cancellation` — no rule change here: a cancelled enrolment is returned as the reader's latest
  enrolment like any other status; Enrolment reads the class's cancellation deadline to decide a cancel.
- `044-direct-enrolment-take-out` — each roster student carries the id of their approved enrolment, read by
  everyone who sees the class (the week list's cap of 4 is unchanged); in the app, the class details' students list
  takes an optional "Retirar" per student, which only an admin gets on a class that hasn't started (Enrolment's
  take-out sheet).
- `045-guests` — the roster and every class read carry the guests (`guests: [{ id, name }]`, the name only for
  admins and the class's instructors, never once erased) and the seats taken count them, so a class with a guest
  can't be deleted and its capacity can't go below them; in the app, the details' students list shows guests with
  a "Trial" chip (and an admin's "Retirar"), the admin's capacity line adds "inclui N trial", and Editar aula and
  the cancel sheet warn the admin that guests aren't told.
- `047-class-changes-reach-students` — an edit that changes a class field and a location change the admin chooses
  to tell reach the students with a seat and the people with a pending request (the location's with their own
  count, one notification for a person who also teaches there), through a new contract answered by Enrolment;
  reading one class gives admins its pending-request count; in the app, the cancel sheet and Editar aula's footer
  name how many students, pending requests and instructors will be told, the location sheet's checkbox reads
  "Avisar alunos e instrutores das próximas aulas?", and a student's `class.edited` and `location.changed` pushes
  open the class's details and the Agenda.
- `048-my-classes-tab` — approved students list their own classes (not ended, any enrolment, cancelled ones
  included, by start) and, paged by up to 50 (20 by default), the classes they took (ended, not cancelled, latest
  enrolment approved, newest first; `class.page.invalid` / `class.perPage.invalid`); other roles get
  `enrolment.role.notStudent`; the ids come through a new contract answered by Enrolment, and the classes are read
  as the week's cards.
- `049-class-details-people-design` — reading one class (and the answers of an edit and a cancellation) gives each
  student and instructor their WhatsApp number by the People directory's rule, and each instructor their role,
  through a new contract the backend answers from the accounts; the week list and a student's own classes don't
  carry them; in the app, the details' "A aula" (capacity beside the label, instructor pills, student and guest
  rows), "Regras", "Notas" and "Onde e como" cards follow the design, instructors and students open the person
  sheet, and the class tools are four cards with "Apagar aula" disabled once started or while anybody holds a seat.
- `050-classes-discipline-filter` — no change to the module's rules or API: the app's classes week screen, for every
  role, filters the selected day's classes and the calendar's marked days by sport (all, surf or skate) over the
  classes it already loaded, from a floating filter; the choice lasts while the screen is open.
- `051-classes-filter-full-screen-scrim` — no change to the module's rules or API: in the app, the open sport filter
  dims the whole phone, the header and the tab bar included.
- `053-history-calendar-filter` — a student's history is read by period instead of pages: `from` and `to` (Fortaleza
  days, both required, up to 42 days counting both ends) answer every class taken whose start falls in them, newest
  first (`class.from.invalid`, `class.to.invalid`, `class.range.invalid`; the paging and its errors are gone); in the
  app, the shared week and month calendar can open on the month, keep no day selected and report the period on
  screen, for the student's "Histórico".
- `054-class-reminders` — 30 minutes before a class starts, its students with an approved seat and its instructors,
  each once, get `class.reminder` (the class, discipline, start and location name) through a new contract answered
  by Notifications; a minute check marks the class with a conditional write, so each start is reminded once, never
  for a cancelled or started class; an edit that moves the start clears the mark in the same write.
- `057-teaching-classes` — the classes a person teaches: `GET /classes/teaching` gives an approved instructor or
  admin the classes they teach that haven't ended (cancelled ones included, by start) and whether they teach any
  class in any state (an admin "teaches" by assignment, nothing stored); students are refused with
  `user.role.notTeacher`. In the app, "Minhas aulas" is the first Escola row of both homes (the admin's only once
  they teach) and opens a screen with the classes under way on grape cards, then the rest by day, the next class
  highlighted.
- `059-teaching-classes-sport-filter` — the instructor's and admin's "Minhas aulas" filters the loaded classes by
  sport with spec 050's floating button (no request, back to "Todas" on reopening): the classes under way, the days
  and "Próxima" follow the chosen sport, and a filtered list with nothing left says "Nenhuma aula de surf/skate"; the
  home row's count ignores the filter.
- `058-admin-role-changes` — `ReleaseUpcomingClasses` takes an optional `actorId`, left out of the
  `class.noInstructor` recipients with the person; Authentication's demotion of an instructor to student now runs
  the release (through `ClassesTeachingReleaser`, which passes the actor and answers how many classes were
  released).
