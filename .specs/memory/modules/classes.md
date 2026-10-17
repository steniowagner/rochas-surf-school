# Module: Classes

## What it is for

It schedules the school's classes, as [Product](../product.md) describes **Class** (`class`) and **Location**
(`location`): admins create classes one at a time or in a batch, at a saved location, with the instructors who
teach them, and the instructors are told; every approved account then browses the classes week by week and
reads each one; admins edit one class at a time, within what its state allows. It is the base that cancelling,
deleting, enrolment, ratings and photos build on. It brings together two business areas: **Locations** and **Classes**.

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
  ends, location, instructors (one or more instructors or admins), capacity, notes (optional), who created it.
  Lifecycle: created, then edited (every field before it starts, only its instructors once started, nothing once
  finished); its state follows the clock — `not-started` before its start, `started` from its start, `finished`
  from its end — computed, never stored. Limits: capacity 1 to 20; notes up to 300 characters after trimming (blank
  notes are stored as none).
- **Batch** (not stored): what the admin chooses to create classes — a first and a last date (inclusive), the
  weekdays to include (Monday 1 to Sunday 7), the dates of the range left out (`excludedDates`, optional), one
  or more time ranges (`HH:mm`), whether to skip the classes that have already started (`skipPast`, optional),
  and the fields every class shares. It becomes one class per included day and time range. The app always sends
  all seven weekdays and removes single days with `excludedDates`; the API keeps `weekdays` for older builds.
- **Edit** (not stored): the whole class sent again — discipline, level, one day (`YYYY-MM-DD`), a start and an
  end (`HH:mm`, the class ends on its start day), location, instructors, capacity, notes — compared field by field
  with the stored class.
- **Seats taken** (not stored): how many seats of a class are held; always 0 until enrolment exists.
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
- **The state is the same everywhere**: `not-started` while now is before the start, `started` from the start
  until before the end, `finished` from the end; the app computes it with the phone's clock, so the API never
  sends a state, and every rule that depends on it (editing, and later cancelling) uses the same boundaries.

Editing one class:

- **Checked in this order**: access; the id (not a UUID, or no class → `class.notFound`, 404); the shape, every
  problem together (422): `class.discipline.invalid`, `class.level.invalid`, `class.date.invalid`,
  `class.time.invalid` (start or end missing or not `HH:mm`), `class.time.endBeforeStart` (end not after start),
  `class.capacity.invalid`, `class.notes.max.length`, `class.instructors.required` (an edit can never leave a
  class without an instructor), `class.location.required`; then, one at a time, against the stored class and the
  server's now: `class.finished` (409), `class.started` (409), `class.location.notFound`,
  `class.instructors.invalid`, `class.startsAt.past`, `class.capacity.belowSeatsTaken` (422, with the seats taken
  in the details).
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

## Who can do what

The account's status is checked before its role (`user.status.notApproved`, then `user.role.notAdmin`, both
403); an unknown account is refused as signed out.

- **An approved account of any role** — lists the locations, lists the classes of any week, past or future,
  and reads any class with its notes.
- **An approved admin** — creates locations and batches of classes, reads the time-range suggestions, and edits
  a class that hasn't finished.
- **An assigned instructor or admin** — receives one notification per batch they were assigned to (unless
  they created it), and one when a class they teach is edited, when they are added to one or removed from one
  (unless they made the edit).

## Boundaries

It knows people only by their ids: whether an id is an approved instructor or admin, and the names shown with a
class, come through its own contracts, provided by the backend from [Authentication](auth.md)'s accounts; it uses Authentication's role and
status names. It doesn't send notifications itself: it hands the instructors and the class's details to two
contracts that [Notifications](notifications.md) fulfils (assignments — added and removed — and class changes).
It doesn't read the clock directly either, and it learns the seats taken through its own contract, which answers
0 until enrolment replaces it. In the app,
admins create classes on the "Nova aula" screen, which uses the module's own batch expansion and limits so its
count matches what the backend creates: it removes single days of a range and, when today is among the dates,
leaves out today's classes of the times that have already started and sends `skipPast`. Every role sees the
classes on its week screen (the student's Agenda, the Aulas tab of instructors and admins) and their details,
built from the module's state rule; seats are not shown yet (capacity only), and the classes a person teaches
aren't marked. Admins edit a class from a pencil on its details ("Editar aula": one day, one time range, the
other Nova aula sections; only the instructors once it has started). Cancelling and deleting classes, the "no
instructor" flag, "My classes", the map, suggestions, editing and archiving of locations, enrolment, ratings
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
- `032-class-editing` — approved admins edit one class: every field before it starts (never into the past), only
  the instructors once started, nothing once finished; capacity never below the seats taken (0 until enrolment);
  only added instructors checked; an unchanged save does nothing; kept, added and removed instructors told
  (`class.edited`, `class.assigned`, `class.unassigned`), never the editor; the app's pencil and "Editar aula".
