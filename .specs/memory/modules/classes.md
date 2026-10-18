# Module: Classes

## What it is for

It schedules the school's classes, as [Product](../product.md) describes **Class** (`class`) and **Location**
(`location`): admins create classes one at a time or in a batch, at a saved location, with the instructors who
teach them, and the instructors are told; every approved account then browses the classes by week or by month and
reads each one; admins edit one class at a time, within what its state allows, cancel a class until it
finishes, and delete one created by mistake before it starts. It also keeps the school's **Cancellation rule**
(`cancellation-rule`) of each discipline and gives every upcoming class its **Cancellation deadline**. It is the
base that enrolment, ratings and photos build on. It brings together three business areas: **Locations**,
**Classes** and **Cancellation rules and deadlines**.

## Locations

The places where classes happen.

- **Location** (`location`): a saved place. Key fields: name, address, when it was created. Relationships: a
  class has one location; a location has any number of classes. Lifecycle: created by an admin and kept; it
  can't yet be edited or archived. Limits: name 1 to 40 characters and address 1 to 200 (free text), both
  after removing the spaces at either end. It has no map position yet.

Rules:

- **A name is unique ignoring case and accents**: "Praia do Futuro", "praia do futuro" and "Práia do Futuro" are
  the same place. A second one is refused with `location.name.duplicate` (409), also when two admins create it
  at the same moment — exactly one of them wins.
- **Invalid text is refused with its keys, all together**: `location.name.required`,
  `location.name.max.length`, `location.address.required`, `location.address.max.length` (422); a value that
  isn't text counts as missing.
- **The list is every location, sorted by name ignoring case and accents**, not paged.

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
- **Seats taken** (not stored): how many seats of a class are held; always 0 until enrolment exists.
- **Pending requests** (not stored): how many enrolment requests of a class still wait for an answer; always 0
  until enrolment exists.
- **Time-range suggestion** (not stored): a start–end pair taken from last week's classes.
- **Class view** (not stored): a class as people read it — its fields, its location's name and address, and
  its instructors' ids and names.

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
- **Then, one at a time and in this order** (422): `class.location.notFound`; `class.instructors.invalid` (an id
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
  `class.instructors.invalid`, `class.startsAt.past`, `class.capacity.belowSeatsTaken` (422, with the seats taken
  in the details).
- **A cancelled class doesn't change**: any edit is refused with `class.cancelled`, even one that changes nothing
  or on a class that has also finished; an edit that read the class just before it was cancelled is refused the
  same way when it is written, and tells nobody.
- **A finished class doesn't change**: any edit is refused with `class.finished`, even one that changes nothing.
- **A started class only changes its instructors**: any other field that differs is refused with
  `class.started`; a class whose start is exactly now has started.
- **The start never moves into the past**: a class that hasn't started can't get a start at or before now.
- **The capacity never goes below the seats taken**.
- **Only added instructors are checked**: an id not already on the class must be an approved instructor or
  admin; the ones already on it are kept whatever their role or status is now, so a substitute can be swapped
  in even when a co-instructor was demoted. Repeated ids count once.
- **"Changed" means a field differs**: discipline, level, start, end, location, capacity and the trimmed notes
  (none when blank), and the instructors as a set (order ignored). A save where nothing differs is accepted and
  changes nothing — not even when the class was last updated — and tells nobody.
- **The class and its instructors are written together**; two admins saving the same class at once: the last
  save wins.
- **Who is told, after the class is stored, never the admin who edits** (even when teaching it): the
  instructors on the class before and after get `class.edited` when a class field changed; the added ones get
  `class.assigned` (count 1, not `class.edited`); the removed ones get `class.unassigned`. Changing only the
  instructors tells only the added and the removed. A notification that fails never changes the answer or the
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
- **Who is told, after the class is stored as cancelled, never the admin who cancels** (even when teaching it):
  every instructor of the class gets `class.cancelled`, with the message when there is one. A class taught only
  by that admin tells nobody. A notification that fails never changes the answer or the stored cancellation.
  Students and people with pending requests will be told when enrolment exists.

Deleting one class:

- **Deleting is for mistakes**: a class with anybody in it, or one that has started, is cancelled instead.
- **Checked in this order**: access; the id (not a UUID, or no class → `class.notFound`, 404); then, against the
  stored class and the server's now, `class.cancelled` (409, whatever time it is), `class.started` (409, a class
  whose start is exactly now included, and a finished one too), and `class.delete.notEmpty` (409, with the seats
  taken and the pending requests in the details) when anybody holds a seat or has a pending request — never yet,
  since both counts are 0 until enrolment exists.
- **Deleting is final and leaves nothing**: the class and its instructors are removed; it can't be restored, and
  notifications already sent about it stay.
- **Exactly one delete wins**: the checks sit on the delete itself. Two admins deleting the same class at the
  same moment — one succeeds, the other gets `class.notFound`; a delete that lost to a cancel gets
  `class.cancelled`, and one that lost to the clock `class.started`.
- **Who is told, after the class is deleted, never the admin who deletes** (even when teaching it): every
  instructor of the class gets `class.deleted` with its discipline and start (no class to open). A class taught
  only by that admin tells nobody. A notification that fails never changes the answer or the deletion.

Releasing a person's upcoming classes (when their account is deleted):

- **No actor**: it runs for an account event, never on a request; nobody's role or status is checked here.
- **Only classes that haven't started and aren't cancelled** lose the person — every one of them, in one write;
  classes under way, finished or cancelled keep them as history. No such class → nothing written or sent.
- **A class left with nobody stays scheduled**: it isn't cancelled or deleted, and it is flagged.
- **Admins are told once per event**, after the write, only when at least one class was left with nobody: the
  count and the earliest such class (by start, then id), never the person who left. Classes that keep another
  instructor tell nobody. A notification that fails never changes the result or the write; a failed write tells
  nobody.
- **The "no instructor" flag is computed, never stored**: a class with no instructor that hasn't started. It
  disappears once the class starts, is cancelled, or gets an instructor (an edit always needs one).

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

- **An approved account of any role** — lists the locations, lists the classes of any week, past or future,
  reads any class with its notes and its cancellation deadline, and reads both cancellation rules.
- **An approved admin** — creates locations and batches of classes, reads the time-range suggestions, edits a
  class that hasn't finished and isn't cancelled, cancels a class that hasn't finished, and deletes a class that
  hasn't started, isn't cancelled and has nobody in it; sees the "no instructor" flag on a class's card and
  details, and is told when an account deletion leaves classes with nobody; saves the cancellation rule of each
  discipline and sees the "no cancellation deadline" flag.
- **An assigned instructor or admin** — receives one notification per batch they were assigned to (unless
  they created it), and one when a class they teach is edited, when they are added to one or removed from one
  (unless they made the edit), when it is cancelled (unless they cancelled it), and when it is deleted (unless
  they deleted it).

## Boundaries

It knows people only by their ids: whether an id is an approved instructor or admin, and the names shown with a
class, come through its own contracts, provided by the backend from [Authentication](auth.md)'s accounts; it uses Authentication's role and
status names. It doesn't send notifications itself: it hands the instructors and the class's details to two
contracts that [Notifications](notifications.md) fulfils (assignments — added and removed — and class changes:
edits, cancellations and deletions), plus a third for the classes left without an instructor. Authentication
reaches the release through its own contract, which the backend fulfils with this module's use case — this module
depends on Authentication, never the reverse.
It doesn't read the clock directly either, and it learns the seats taken and the pending requests through its own
contracts, which answer 0 until enrolment replaces them. The language model that describes the deadlines sits
behind its own contract too, which the backend fulfils with Anthropic's Claude; the module never sees the
provider. In the app,
admins create classes on the "Nova aula" screen, which uses the module's own batch expansion and limits so its
count matches what the backend creates: it removes single days of a range and, when today is among the dates,
leaves out today's classes of the times that have already started and sends `skipPast`. Every role sees the
classes on its week screen (the student's Agenda, the Aulas tab of instructors and admins) and their details,
built from the module's state rule; seats are not shown yet (capacity only), and the classes a person teaches
aren't marked. A cancelled class shows "Cancelada" with its time struck through on its card and one "Aula
cancelada" banner with its message on its details. Admins reach a class's tools from a round button on its
details (hidden once it has finished or is cancelled): "Editar aula" (one day, one time range, the other Nova
aula sections; only the instructors once it has started), "Avisar alunos e instrutores" (not doing anything yet)
and "Cancelar aula" (a confirmation with the optional message), plus "Excluir aula" while the class hasn't
started (a confirmation; when the class turns out not to be empty, a "Não dá para excluir" variant that offers
"Cancelar aula" instead). A class with no instructor says "Sem instrutor" in its card's footer and "Sem instrutor
atribuído" on its details for everyone; while it hasn't started, admins also see a "Sem instrutor" chip on the
card and a banner on the details that opens "Editar aula". Admins edit the cancellation rules from a screen
reached from their home; everyone reads them in a sheet from the Profile. A class without a deadline shows
admins a "Sem prazo" chip on its card and a "Sem prazo de cancelamento" banner on its details that opens the rules
screen; a class with one shows everyone "Cancelamento até …" on its details. Accepting the rule and cancelling a
seat until the deadline come with enrolment. "My classes", the map, suggestions, editing and archiving of locations, enrolment, ratings
and photos come with their specs. A class keeps a link to the admin who created it,
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
