# Module: Classes

## What it is for

It schedules the school's classes, as [Product](../product.md) describes **Class** (`class`) and **Location**
(`location`): admins create classes one at a time or in a batch, at a saved location, with the instructors who
teach them, and the instructors are told. It is the base that the class list, editing, enrolment, ratings and
photos build on. It brings together two business areas: **Locations** and **Classes**.

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
  Lifecycle: created only, for now. Limits: capacity 1 to 20; notes up to 300 characters after trimming (blank
  notes are stored as none).
- **Batch** (not stored): what the admin chooses to create classes — a first and a last date (inclusive), the
  weekdays to include (Monday 1 to Sunday 7), the dates of the range left out (`excludedDates`, optional), one
  or more time ranges (`HH:mm`), whether to skip the classes that have already started (`skipPast`, optional),
  and the fields every class shares. It becomes one class per included day and time range. The app always sends
  all seven weekdays and removes single days with `excludedDates`; the API keeps `weekdays` for older builds.
- **Time-range suggestion** (not stored): a start–end pair taken from last week's classes.

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

## Who can do what

The account's status is checked before its role (`user.status.notApproved`, then `user.role.notAdmin`, both
403); an unknown account is refused as signed out.

- **An approved account of any role** — lists the locations.
- **An approved admin** — creates locations and batches of classes, and reads the time-range suggestions.
- **An assigned instructor or admin** — receives one notification per batch they were assigned to (unless
  they created it).

## Boundaries

It knows people only by their ids: whether an id is an approved instructor or admin comes through its own
contract, provided by the backend from [Authentication](auth.md)'s accounts; it uses Authentication's role and
status names. It doesn't send notifications itself: it hands the instructors, the count and the discipline to a
contract that [Notifications](notifications.md) fulfils. It doesn't read the clock directly either. In the app,
admins create classes on the "Nova aula" screen, which uses the module's own batch expansion and limits so its
count matches what the backend creates: it removes single days of a range and, when today is among the dates,
leaves out today's classes of the times that have already started and sends `skipPast`. Nothing shows the classes yet (Aulas tab, class details), and editing,
cancelling and deleting classes, unassigning instructors, the map, suggestions, editing and archiving of
locations, enrolment, ratings and photos come with their specs. A class keeps a link to the admin who created it,
which stops that account from being erased while the link exists — a decision for the erasure spec.

## Spec history

- `028-create-classes` — created the module: locations with a unique name and an address (create, list); classes
  created in an all-or-nothing batch in America/Fortaleza time, with the shape, location, instructor, size and
  past checks; time-range suggestions from last week; one `class.assigned` notification per instructor and
  batch.
- `029-batch-excluded-dates-skip-past` — a batch can leave out single dates (`excludedDates`) and skip the
  classes that have already started (`skipPast`), with their shape errors; with `skipPast` the days before today
  are dropped before the 200 limit is judged; the app's form removes single days and skips today's past times.
