# Product — "Rocha's Surf School"

## In one sentence

**"Rocha's Surf School"** is the Android and iOS app of one surf and skate school, where approved students
ask for seats in classes, admins schedule the classes and decide every seat, and instructors follow the
classes they teach — and, once a class is over, everyone rates it and shares its photos.

Central narrative of the product: **"get approved, ask for a seat, surf, rate and share"**.

## For whom

The students, instructors and admins of **one** school, Rocha's Surf School, in Brazil (America/Fortaleza
time). Students are adults trying or practising surf and skate; instructors teach the classes; admins run the
schedule, the people and the rules. Everyone uses the **same mobile app** (Android and iOS), and what each
person sees depends on their role. The only web surface is a small public site with the privacy policy, the terms of
use and the account-deletion page, for the app stores and for people without the app.

Nobody gets in on their own: every account signs up in the app and then waits for an admin's approval before
it can see anything. The app is in Brazilian Portuguese, Spanish and English.

**Data ownership**: there is one school and one app — no tenants, no organizations. Everything belongs to the
school and is visible to every approved user, except:

- a user's **WhatsApp number**, visible to other users only when its owner shares it, and always to admins;
- a **guest's name**, visible only to admins and to the instructors of the guest's class (others see "Trial");
- what an account can see **before approval**: only its own approval state.

### Roles and permissions

Each user has exactly one role. New accounts start as students. Only students take seats.

- **Student** — wants to get into classes and keep a record of them. Asks for seats (enrolments), withdraws
  pending ones, cancels approved seats until the class's cancellation deadline, rates finished classes they
  took, and uploads photos to them. Sees every class, past and future, with who holds its seats.
- **Instructor** — teaches and follows classes, read-only. Sees every class, with the ones they teach under
  "My classes" (the next one highlighted), and guests' names on their own classes. Comments on finished
  classes they taught and uploads photos to any finished class. Cannot request seats, decide registrations or
  enrolments, cancel classes or change any rule.
- **Admin** — runs the school in the app: schedules, edits, cancels and deletes classes; manages locations;
  approves or denies registrations, enrolments and reactivation requests; enrols students directly and adds
  guests; changes roles, removes and restores accounts; writes the school rules and the cancellation rules;
  sets the school's WhatsApp number and the waiting-list switch; sends broadcasts; deletes any comment or
  photo. An admin can also teach, and then sees their classes under "My classes" like an instructor. There is
  always at least one admin.

## Domain concepts

Listed in the order people meet them.

- **User** (`user`): a person's account — one per email address. Key fields: name, email (fixed forever),
  photo, WhatsApp number (with country code, Brazil +55 preselected; required once approved, never empty
  after), WhatsApp visibility (hidden by default), role (`student` | `instructor` | `admin`), status, and
  preferences: language (follows the phone until chosen; Brazilian Portuguese when the phone's language is
  not one of the three), theme (same as the phone, light or dark; follows the phone until chosen) and phone pushes
  (on/off, on by default). The preferences belong to the **phone**, not the account: they are kept on it, survive
  signing out and don't follow the person to another phone. Turning pushes off removes the phone from the
  account's push recipients; the notifications are still stored.
  Relationships: has one or more identities; has many enrolments, ratings, photos and notifications; an
  instructor or admin teaches many classes. Lifecycle:
  - `pending` (a **registration**: sees only "waiting for approval") → `approved` or `denied` by an admin.
    Admins are notified of each new registration; the person is notified of the result, with the reason on a
    denial.
  - `approved` → onboarding (WhatsApp number + school rules) before using the app.
  - `denied` → sees the reason and a contact-the-school button; erased 30 days after the denial.
  - `approved` → `deleted` by the user (confirmation step; not allowed for the only admin) or `removed` by an
    admin. Both cancel the user's upcoming seats, pending enrolments and class assignments (as built, deletion
    does — specs 035 and 043 —; removal comes with its own spec).
  - `deleted` → back to `approved` through an approved reactivation request, or erased 30 days after the
    deletion. `removed` → back to `approved` when an admin restores it, or erased 30 days after the removal.
    A return restores the account, its history and its role — not the seats, enrolments or assignments
    cancelled when it left.
  - **Erasure** removes name, email, photo and WhatsApp number and deletes the account's comments; star ratings
    stay without a name; class lists and photos show "Former student" (or "Former instructor" for an
    instructor or admin). The email is then free to sign up again as a new registration.
  - Role changes (admins only): student → instructor (cancels the student's upcoming seats and pending
    enrolments, and the notification says so); any user → admin; instructor → student (unassigned from the
    classes they teach that haven't started, kept on the others); admin → another role. The only admin can't
    be demoted or removed. Users are notified when their role changes.
- **Identity** (`identity`): one way a user signs in — Google, Apple (iOS only) or a code sent by email. Key
  fields: method, the email it provides. Relationship: belongs to one user; a user has one or more. Any method
  that provides the same email opens the same account; a Google sign-in keeps opening its account even after
  the Google address changes, and the account's email never changes. The name shared by Google or Apple becomes
  the account's name when it fits the name rules, otherwise the person types one before the account is created;
  email-code sign-ups type their name after entering a correct code, and the account is created (as a pending
  student) only then.
- **Sign-in code** (`sign-in-code`): a 6-digit code emailed to sign in or sign up — no passwords exist.
  Expires 10 minutes after it is sent; a new one can be requested 30 seconds after the previous one, and it
  replaces the previous code. Works once. Five wrong guesses lock it until a new code is requested. The email
  is written in the language picked on the sign-in screen (Brazilian Portuguese, Spanish or English; it starts
  as the phone's language). Each phone's network address can ask for at most 5 codes and try at most 10 codes
  per minute. It is the only email the app ever sends; if sending fails, no waiting time applies before asking
  again. The answer to a code request is the same whether or not an account exists. **Review accounts**: one
  pre-approved account per role for App Store and Google Play reviewers, each with a fixed code that works only
  for its own email; no email is sent to them, and the waiting time and the lock apply to them too.
- **Reactivation request** (`reactivation-request`): a deleted user's request, sent from the "Account deleted"
  screen during the 30 days, to get the account back. One per account: `requested` → `approved` | `denied` by
  an admin. Admins are notified of each one and see the name, email, deletion date and number of classes
  taken; the person is notified of the decision. After a denial the screen only offers signing in with another
  email. Removed users can't send one.
- **School rules** (`school-rules`): the rules every user accepts at onboarding (and again on the "Regras
  atualizadas" screen after a change), written by admins — an
  ordered list of rules, each with a title (up to 60 characters) and an explanation (up to 300), shown in the
  order admins chose. Admins add (a new rule goes last), edit, delete (the rules after it move up) and reorder
  them. Versioned: every add, edit or delete creates a new version that each user accepts the next time they
  open the app (no notification; admins don't choose); reordering, or saving a rule without changing its text,
  doesn't. Only the current text is kept, not the text of past versions. Each user's acceptances are kept per
  version, with when they accepted; a user can only accept the current version, and accepting it again changes
  nothing. While no rule was ever written (version 0) there is nothing to accept. A returning (reactivated or restored) account accepts again if a change happened while it was away.
  Any approved account, of any role, can read them at any time.
- **School settings** (`school-settings`): the school-wide switches admins control — the school's WhatsApp
  number (used by every contact-the-school button) and the waiting list (on by default).
- **Cancellation rule** (`cancellation-rule`): free text written by admins, one for surf and one for skate,
  saying until when a student may cancel a seat. Readable by everyone at any time; a student accepts the rule
  of the class's discipline when requesting a seat. Saved as written, with no check of its wording. As built
  (spec 036): approved admins save each rule (trimmed, 1–2000 characters) from the admin home's "Regras de
  cancelamento" screen; every approved account reads both from the Profile. Only the current text is kept (with
  the last editor and when), and saving a different text clears the deadlines of the discipline's upcoming,
  not-cancelled classes so they are worked out again; saving the same text changes nothing.
- **Location** (`location`): a saved place where classes happen. Key fields: name, address, position on a map.
  Relationship: a class has one location; a location has many classes. Lifecycle: `active` → `archived`
  ("removing" it archives it: no longer offered, kept by the classes that used it). Editing it changes every
  class that uses it, past ones included; if upcoming classes use it, the admin chooses whether to notify
  their students and instructors. As built (specs 028, 037), a location has a name (1–40 characters, unique
  among active locations ignoring case and accents), an address (free text, 1–200 characters) and a point on the
  map (latitude and longitude), required whenever it is created or edited; locations saved before spec 037 have
  no point until edited, can still be picked, and show no map. Approved admins create, edit and remove
  locations; every approved account lists the active ones. A change to the name or the address sends the
  deadlines of the location's upcoming classes to be worked out again. When the admin chooses to notify, the
  instructors and the students with a seat or a pending request in those upcoming classes are told (spec 047). A removed (archived) location frees its name, can't be given to a
  class, and can't be restored.
- **Class** (`class`): one surf or skate session at one date and time. Key fields: discipline (`surf` |
  `skate`), level (`beginner` | `advanced` | `expert` — a label only), date, start and end time, location,
  instructors (at least one; instructors or admins), capacity, notes (optional, max 300 characters, visible to
  everyone), cancellation deadline. Relationships: one location; one or more instructors; many enrolments,
  guests, ratings, instructor comments and photos. Created one at a time or in a **batch** (a date range with
  single days removed, and one or more non-overlapping time ranges, each ending after it starts; one class per
  remaining day and time range, all sharing the other fields) — the batch only exists while creating: afterwards each class
  is edited on its own. The form suggests the time ranges of the previous week's classes (Monday to Sunday,
  distinct start–end pairs). No class starts in the past. Limits: capacity 1 to 20 (8 by default), at most 200
  classes per batch; a batch is created whole or not at all. Lifecycle, by the clock:
  - `not started` → `started` (at its start time) → `finished` (at its end time), with nobody acting.
  - `not started`: can be edited (never into the past), cancelled, or deleted — deleted only when nobody has
    an enrolment or a guest in it (instructors are notified). Capacity can't go below the seats taken.
  - `started`: only cancelling and changing instructors; pending enrolments expire.
  - `finished`: frozen; ratings, instructor comments and photos can be added. Can't be cancelled.
  - `cancelled` (by an admin, any time before it finishes, with an optional message of up to 300 characters):
    final — it stays on the schedule for everyone, marked as cancelled, whatever the clock says, and can't be
    edited, cancelled again or restored. It is the one state set by a person instead of the clock.
  - Flags shown to admins: **no instructor** (an upcoming class lost its only instructor — admins are notified)
    and **no cancellation deadline** (the deadline couldn't be worked out yet — no notification).
  - Notifications: edits and cancellations reach its students, the people with pending enrolments and its
    instructors; instructors hear when they are assigned or unassigned; its students with an approved seat and
    its instructors get a reminder 30 minutes before it starts — once per start (again when an edit moves the
    start), never for a cancelled or started class, never to pending requests or guests.
- **Cancellation deadline** (part of a class): the moment until which a student may cancel a seat in that
  class — one per class, the same for all its students, never after the start. It is worked out by a language
  model from the discipline's cancellation rule and the class's details (never personal data or anything
  students wrote) when the class is created, and again when the class is edited or the rule changes. While it
  can't be worked out, the system keeps trying, the class is flagged, and students who try to cancel are told
  to contact the school. As built (spec 036): Claude (Anthropic) describes the deadline from the rule and the
  class's discipline, level, date, weekday, start and end times, location name and address, capacity and notes;
  the backend computes the exact instant (in Fortaleza time) and caps it at the start. A background job works
  out the classes without one every minute, retrying a failed class after 1, 2, 4… up to 60 minutes; an edit
  that changes a detail the model reads (not only the instructors) clears it, and so does a rule change. A
  discipline without a rule gets no deadline and nothing is sent. Every role sees the "Cancelamento" row reading
  "Até <dia, data · hora>" on a class's details (spec 049); admins see the "Sem prazo" flag. As built (spec 043): a student cancels an
  approved seat while it is still before the deadline (at the deadline it is refused); after it, or while the
  class has none, the app tells them to contact the school and offers the school's WhatsApp.
- **Enrolment** (`enrolment`): a student's place, or attempt at a place, in one class. A student **requests**
  a seat in a class that hasn't started (accepting the discipline's cancellation rule), which creates a
  pending enrolment; admins and the class's instructors are notified. Key fields: student, class, status, when
  it was requested, reason (on a denial or a take-out). Statuses:
  - `pending` — shown as **"on the waiting list"** to the student and to admins while the class is full. Does
    not hold a seat. Ends as `approved` (by an admin, only while there is a free seat and the class hasn't
    started), `denied` (by an admin, optional reason), `withdrawn` (by the student, until the class starts;
    nobody notified), `expired` (still pending when the class starts) or `class cancelled`.
  - `approved` — holds a seat. Ends as `cancelled` (by the student, until the deadline; admins are notified
    with the number of waiting students, and so are the instructors), `taken out` (by an admin before the
    class starts, optional reason) or `class cancelled`.
  - An admin can **enrol a student directly** into a class that hasn't started and has a free seat: it creates
    an approved enrolment, or approves the student's pending one.
  - A student can have only one open (pending or approved) enrolment per class, and may request again after
    an earlier one ended, as many times as they want until the class starts. With the waiting list off,
    students can't request a full class. Admins see a class's waiting list in the order students asked, with
    the time of each request. When a seat opens nobody is moved or told: admins choose.
  - Students are notified when an enrolment is approved, denied (with the reason), expires, is created
    directly, or is taken out (with the reason), and when its class is edited or cancelled.
  - As built (spec 041): approved students request a seat from a class's details; the rule of the class's
    discipline is accepted only when there is one, and the moment is kept, never the text. A full class still takes
    requests while the waiting list is on (spec 046). Students withdraw their pending request until the
    class starts, request again after any ended one, and never hold more than one open enrolment per class (two
    requests at the same moment leave one). Every approved admin and every instructor of the class is told of each
    request, each person once. Pending requests expire when the class starts, and the student is told; cancelling
    a class ends its pending and approved enrolments as `class cancelled` and tells those students with the
    instructors.
  - As built (spec 042): approved admins see the pending requests grouped by class — the classes that haven't
    started and aren't cancelled, by start — with each class's occupancy and its requests in the order asked,
    with the time; they approve one while the class has a free seat and hasn't started (two approvals for the
    last seat leave exactly one) and deny one with an optional reason (up to 500 characters). Only the student is
    told, with the reason when one was written; nobody is told when a seat opens. A denied student may request
    again.
  - As built (spec 043): a student cancels their approved seat in a class that hasn't started while it is before
    the class's deadline; the seat frees at once and they may request again. Every approved admin and every
    instructor of the class is told once, with the number of pending requests left. Deleting an account cancels
    the person's approved seats in classes that haven't started and aren't cancelled (with no deadline check and
    the same notice) and withdraws their pending requests, telling nobody.
  - As built (spec 044): approved admins enrol an approved student directly into a class that hasn't started, isn't
    cancelled and has a free seat (two writes for the last seat leave exactly one). A student with a pending request
    in the class has that request approved and hears "Pedido aprovado"; otherwise a new approved enrolment is
    created (no cancellation rule is accepted on the student's behalf) and the student hears "Você foi inscrito".
    Instructors, admins, pending or deleted accounts and a student who already holds a seat can't be enrolled.
    Admins take a student with an approved seat out of a class that hasn't started, with an optional reason (up to
    300 characters); the seat frees at once, only the student is told (with the reason as written, or a default
    line), and they may request again.
  - As built (spec 046): approved admins turn the school's waiting list on or off (on by default, for every class
    at once). While it is off, a student can't request a seat in a full class that hasn't started; a class with a
    free seat is requested as before. Turning it off ends nothing: requests already waiting stay pending, and admins
    can still approve them when a seat opens.
  - As built (spec 048): a student's **classes** ("Minhas aulas") are the classes that haven't ended where they have
    any enrolment, cancelled classes included, each shown with its latest enrolment. Their **history** (the
    classes they **took**) is the classes that ended, aren't cancelled, and where their latest enrolment is
    `approved`: a seat held when the class ended. Only approved students have either list. Since spec 053 the
    history is read one period at a time (a day, a week or a month): a class belongs to the America/Fortaleza day
    its start falls on.
  - As built (spec 057): the classes a person **teaches** are the classes where they are one of the instructors. An
    admin **teaches** when they are an instructor of at least one class, in any state (not started, under way, ended
    or cancelled); nothing is stored on the account, and a deleted class doesn't count. An instructor's or a teaching
    admin's "Minhas aulas" lists the classes they teach that haven't ended, cancelled ones included; the **next**
    class is the earliest one that hasn't started and isn't cancelled.
- **Seat**: not stored on its own — a class's **seats taken** are its approved enrolments plus its guests,
  shown with the capacity to everyone who sees the class, together with the class's approved students (name and
  photo, or initials while there is no photo) and its guests ("Trial", or the name for admins and the class's
  instructors). As built (specs 041–045) they are counted from the stored approved enrolments plus the stored
  guests; a seat is taken when an admin approves a request, enrols a student directly or adds a guest.
- **Guest** (`guest`): someone without an account trying surf or skate, put into one class by an admin. Key
  fields: name, WhatsApp number. Takes a seat; only in a class that hasn't started and has a free seat. Gets
  nothing from the app; admins are warned of that when they edit or cancel a class with guests. Shown as
  "Trial" to everyone except admins and the class's instructors. Never linked to an account the person creates
  later. Its name and WhatsApp number are erased 30 days after the class finishes or is cancelled; the seat
  then shows "Trial" to everyone.
  - As built (spec 045): approved admins add a guest (a name under the user name rules and a valid WhatsApp
    number, both required) to a class that hasn't started, isn't cancelled and has a free seat — the same seat
    check as approvals and direct enrolment, so two writes for the last seat leave exactly one. Admins take a guest
    out of a class that hasn't started; the seat frees at once. Nobody is told either way. The WhatsApp number is
    only stored, never shown in the app. A class with a guest can't be deleted, and its capacity can't go below the
    seats taken, guests included.
- **Rating** (`rating`): a student's verdict on a finished class they held a seat in: 1 to 5 stars and an
  optional comment. One per student per class; the author can edit or delete it. About the class, not its
  instructors. Visible to everyone with the author's name. Students are asked to rate 30 minutes after the
  class ends (not for cancelled classes); the class's instructors are notified of each rating. An admin can
  delete its comment — the stars stay and the author isn't told.
- **Instructor comment** (`instructor-comment`): text without stars left by someone who taught a finished
  class (an instructor or an admin). One per person per class, editable and deletable by its author, no
  replies, shown with the class's ratings. Admins can delete it without telling the author.
- **Class photo** (`class-photo`): a photo of a finished class. Uploaded by students who held a seat in it,
  any instructor or any admin; nobody is notified. Everyone can see and download it. The uploader can delete
  their own; admins can delete any without telling the uploader.
- **Notification** (`notification`): a message to one user about an event. Always kept on the user's
  notifications screen, with a read/unread state (mark one or all as read), and also pushed to the phone
  unless the user turned pushes off. Pushes are the only outbound channel. Its text is written for the reader in
  their language, the same on the push and on the screen (without the push's "open the app"), and it stays until
  the account is gone.
- **Broadcast** (`broadcast`): a notification an admin writes (title and description) for an audience —
  `everyone` (admins included), `students` or `instructors` — reaching the approved, active users of those
  roles. The admin sees the number of recipients and confirms before it is sent.
- **People directory**: not a concept of its own — the list of every approved user of any role, the viewer
  included (name, photo, role, member since, and the WhatsApp number when its owner shares it or the viewer is an
  admin), always sorted A–Z by name ignoring case and accents, 20 at a time. It is searched by name (ignoring case
  and accents) and filtered by any number of roles (a user with one of the chosen roles is listed; none chosen means
  everyone). Opening a person offers a WhatsApp chat, in WhatsApp on the viewer's own phone, whenever the viewer
  may see the number — so admins can chat with anyone who has a number. The same person sheet, with the same rule,
  opens from a class's instructors and students on its details (spec 049); trial guests open none.

## Main journeys

Detailed in [user-journeys.md](../../.docs/user-journeys.md) and, area by area, in
[requirements.md](../../.docs/requirements.md).

- **Join**: sign in with Google, Apple or an email code → give a name → wait for approval → add WhatsApp and
  accept the school rules ([1.1](../../.docs/requirements.md#11-user-authentication),
  [1.2](../../.docs/requirements.md#12-account-lifecycle)).
- **Schedule**: an admin creates classes in a batch, assigns instructors, then edits, cancels or deletes them
  ([3.1](../../.docs/requirements.md#31-class-scheduling), [3.2](../../.docs/requirements.md#32-class-locations)).
- **Get a seat**: a student requests a class → admins approve or deny (or the request waits on the waiting
  list) → the student cancels before the deadline if needed
  ([4.1](../../.docs/requirements.md#41-class-enrolment), [4.2](../../.docs/requirements.md#42-cancellation-rules)).
- **After the class**: students rate it, instructors comment, everyone shares photos
  ([5.1](../../.docs/requirements.md#51-class-ratings), [5.2](../../.docs/requirements.md#52-class-photos)).
- **Leave and come back**: delete the account, ask for reactivation within 30 days, or be removed and restored
  by an admin ([1.2](../../.docs/requirements.md#12-account-lifecycle)).

## Relevant product decisions

- **Every account waits for an admin's approval before seeing anything**: the school only lets in people it
  knows. Nothing — not even the class list — is visible while pending.
- **Admins decide every seat; no money moves in the app**: payments and credits are tracked outside the app,
  and approving an enrolment is how admins apply them. Don't add automatic approvals or payment data.
- **A pending enrolment never holds a seat, and nobody is moved off the waiting list automatically**: admins
  choose who gets a freed seat, and waiting students aren't told when one opens — only when their enrolment
  is approved, denied or expires.
- **One cancellation deadline per class, worked out by a language model, never after the class starts**:
  admins write rules in plain language and the app applies them the same way to every student of the class.
  Only the rule text and the class's details are sent — never names or anything students wrote. Rules aren't
  checked when saved; when a deadline can't be worked out, the class is flagged and students are sent to the
  school. What a late cancellation costs belongs to the admins' records outside the app.
- **Admin decisions are final in the app**: there is no undo for approvals, denials, removals or role changes;
  mistakes go to the system administrators (the developers), who fix them outside the app.
- **There is always at least one admin**: the only admin can't be demoted or removed and must make someone
  else an admin before deleting their own account.
- **Deleting and removing are different**: a user who deletes their account can ask once for reactivation; a
  user removed by an admin can't, and only an admin can restore them. Both are erased after 30 days.
- **Erasure keeps the school's history without the person**: personal data and comments go, star ratings stay
  without a name, and the person appears as "Former student" or "Former instructor". This satisfies LGPD and
  the App Store and Google Play account-deletion rules while keeping class history readable.
- **People without the app ask the school on WhatsApp to delete their account**: the account deletion page gives
  the school's number, and an admin carries out the request by removing the account, which is then erased like
  any removed account. The site's number is a copy of the school setting made when the site is built, so
  changing the number in the app needs the site rebuilt.
- **The privacy policy names only the providers already chosen**: Google, Apple, Resend, Expo and Anthropic
  (the language model, spec 036) by name; the hosting and the photo storage by category until a spec chooses
  them — that spec updates the policy.
- **The site has terms of use next to the school rules**: the terms govern the app (adults only, accounts approved
  by the school, admins' decisions final, forbidden content removed by admins who can also remove the account,
  reports sent to the school on WhatsApp because the app has no report button, no payments, not a liability
  waiver, Brazilian law with no forum named); the school rules keep governing conduct at the school. The policy
  names the legal controller and the encarregado (data protection contact) from build configuration.
- **Guests get nothing from the app and leave no trace**: no notifications, no link to a later account, and
  their name and WhatsApp number are erased 30 days after their class.
- **One account per email address, and the email never changes**: every sign-in method with the same email
  opens the same account; there are no passwords.
- **Five wrong guesses lock a sign-in code, review accounts included**: a 6-digit code is guessable, and the
  admin review account has a fixed code; a new code (after the 30-second wait) unlocks it.
- **The sign-in email is the one text the backend writes in the user's language**: email can't be translated
  by the app, so its three versions live in the backend, chosen by the language on the sign-in screen.
- **Onboarding is the WhatsApp number first, then the school rules**, and an approved account reaches its
  role's experience only after both. Hiding the number (the default) means only admins see it — not students
  or instructors. One number may belong to several accounts (a family phone), and the review accounts add one
  like anyone.
- **Pushes are the only notification channel**: no email (except the sign-in code) and no WhatsApp messages.
  Turning pushes off never hides notifications from the notifications screen.
- **Every change to the school rules asks everyone to accept them again; reordering doesn't**: users always
  accept the rules as they are now, so admins don't choose whether a change needs acceptance. Only the order
  of the list, or a save that changes no text, leaves the version alone, so an accidental save doesn't make
  every user accept again. An account that accepted some version before is asked again, at the next sign-in,
  on a dedicated "Regras atualizadas" screen — the same layout as the onboarding step, with copy that says the
  rules changed — that has no way back: the only way out is accepting. A first acceptance stays on the School
  rules step of onboarding; the backend tells the two apart by saying, in every account answer, whether the
  account ever accepted any version. An account that finished onboarding while no rule existed (version 0) has
  never accepted, so the first rule written takes it to the onboarding step, not the update screen.
- **Text written by admins is shown as written**: school rules, cancellation rules, notes, reasons and
  broadcasts aren't translated; they're assumed to be Brazilian Portuguese.
- **All times are America/Fortaleza, whatever the phone's time zone; weeks run Monday to Sunday.**
- **The level is a label only**: it never restricts who can request a class.
- **A batch isn't kept**: it only exists while creating classes; each class is edited on its own, and time
  ranges are suggested from the previous week's classes rather than from a saved list.
- **A batch is all or nothing, and each instructor hears about it once**: "Criar N aulas" always creates
  exactly N classes, or none when any of them is refused (one in the past refuses the whole batch). The one
  exception is today's past times: when today is among the dates and a chosen time has already started, the app
  skips today's class at that time and creates the rest — N already leaves it out, so N still means N; each
  assigned instructor gets one notification per batch with its count, never one per class, and the admin who
  created it gets none.
- **Editing a location changes past classes too**: a location is a reference, not a copy; "removing" one only
  archives it.
- **No option to report comments or photos**: an accepted App Store risk (guideline 1.2). If Apple rejects the
  app for it, the fix is a report button that notifies admins.

## Glossary

The source documents use some words loosely; in specs and code use the concept names above.

- **Request / requested** — the student's action of asking for a seat; it creates a `pending` enrolment.
  "Classes I've requested" are the student's enrolments.
- **Seat** — an approved enrolment or a guest; **seats taken** counts both.
- **Registration** — a user in `pending`, waiting for approval ("Join the school" is the admin tool).
- **Trial** — the label a guest's seat shows to people who can't see the guest's name.
- **Remove** — means removing an **account** (by an admin). Taking an instructor off a class is
  **unassigning**; taking a student out of a class is **taking out**; "removing" a location archives it.
- **Comment** — the optional text of a rating, or an instructor comment; "delete any comment" covers both.
- **Admin tools** — "Join the school" (registrations), "Class enrolments" (enrolments), "Reactivate accounts"
  (reactivation requests): each shows a card per pending item with Deny and Approve (a decided card just leaves
  the list), and a sheet for the denial reason; on "Join the school" a tap on the card opens the person's sheet.

## Current state

Delivered: **email code sign-in on the backend** (spec `001-email-sign-in-code`) — a person can ask for a
6-digit code by email (in pt-BR, es or en), sign in with it to the one account of that address, or sign up as
a pending student by giving a name; the backend returns a session (a 15-minute access token and a 30-day
refresh token) and the account's status. The review accounts are seeded and sign in with their fixed codes.

**Create account in the app** (spec `002-email-create-account-screen`) — "I'm new here" on the Choose screen
(spec 007) opens the Create account screen, where a person types their name and email address and asks for a
sign-in code, sent in the language picked on the sign-in screen. The button works only once both values follow
the same rules the backend applies, and every error the backend can answer is shown as a short translated
message. The name is collected here, before the code, and kept in the app until the code is checked.

**Confirm email in the app** (spec `003-email-confirm-code-screen`) — once the code is sent, the app opens the
Confirm email screen, where the person types or pastes the 6-digit code; it is checked as soon as six digits are
there, with the name from Create account, which creates the pending account. A wrong, expired or locked code is
shown under the code boxes; every other error in a toast. A new code can be asked 30 seconds after the last one,
with a countdown.

**Sessions on the backend** (spec `004-backend-session-endpoints`) — a signed-in app can ask the backend who
the account is (name, email, role, status and when it was created, whatever its status), renew its session
before the 15-minute access token runs out, and sign out, which ends that one sign-in and leaves the account's
other devices signed in. Every request reloads the account's role and status, so an approval, a denial, a
removal or a role change takes effect at once. Reusing an old refresh token ends that whole sign-in. The app
uses them to keep and renew its session (spec 018).

**One flow per account state in the app** (spec `005-mobile-flow-routing`) — after a correct code, the app
opens the part of the app that matches the account: a pending account goes to its own waiting screen (spec 006), an approved one to
the student, instructor or admin experience of its role, a deleted one to reactivation, and a denied or removed
one to its own offboarding screen. Nobody can reach another part of the app, and going back after signing in
doesn't return to the sign-in screens. Each part shows only its name for now; its real screens come with their
specs. The session survives closing the app (spec 018).

**Pending screen and sign-out in the app** (spec `006-mobile-pending-screen`) — a pending account, whatever
its role, opens the Pending screen instead of onboarding: it tells the person the school still has to approve
the account, shows the address they signed in with and since when the account exists ("Now", a relative time,
then the date after a week), and offers only "Sign out". Signing out returns to the sign-in screen at once,
even offline, and ends that sign-in on the backend. The approval is seen the next time the person signs in.

**Signing in with email to an existing account** (spec `007-email-sign-in-screens`) — "Continue with email" on
the sign-in screen opens the Choose screen, where the person says whether they already have an account. "I have
an account" opens Sign in with email, which asks only for the address, sends the code and goes through the same
Confirm email screen without asking for a name, into the part of the app that matches the account. Whoever picks
the wrong path is sent to the right one with the address already typed: "Create account" on Sign in with email
opens Create account with it, and an address with no account on the sign-in path shows a message and opens
Create account with it after the code, so the person only adds their name (the code stays usable). Accounts are
created only on the path that collects a name.

**WhatsApp step of onboarding** (spec `008-onboarding-whatsapp`) — an approved account without a WhatsApp
number, of any role, opens the WhatsApp screen: it welcomes the person by first name and asks for the number
with its country (Brazil +55 preselected, any country picked from a searchable list), with "Hide my number" on
by default — hidden means only admins see it. The number must be valid for the chosen country; it is saved
with its country code, and the app moves on to the School rules step (spec 012). An approved account that
already has a number opens School rules directly.

**Brazilian number mask** (spec `009-brazilian-whatsapp-mask`) — with Brazil selected, the WhatsApp number is
formatted as it is typed: `(XX) XXXX-XXXX` for a landline and `(XX) XXXXX-XXXX` for a mobile. Letters and
digits past the eleventh are ignored, and a pasted `+55 …` number loses its country code. The number is still
saved with +55; other countries show the number as typed.

**School rules on the backend** (spec `010-school-rules-management`) — admins add, edit, delete and reorder the
school rules through the backend, and any approved account reads them, in the admins' order, with the current
version. Every add, edit or delete raises the version by one; reordering and an unchanged save don't. The app's
screens on top of it came later: reading and accepting (specs 012, 013, 026) and the admin's management screen
(spec 056).

**Accepting the school rules on the backend** (spec `011-school-rules-acceptance`) — an approved account of any
role accepts the current version of the rules through the backend, which records the version and when it was
accepted; an older or newer version is refused, so the app reloads the rules, and accepting the same version
again changes nothing. Every answer that carries the account (who the account is, a correct code, a renewed
session, saving the WhatsApp number) now says whether the account still has to accept the current rules — not
after an add, edit or delete it hasn't accepted, yes while no rule was ever written. The app routes by it
(spec 012).

**School rules step of onboarding** (spec `012-onboarding-school-rules`) — the last onboarding step shows the
current school rules, numbered in the admins' order and exactly as written, and asks the person to tick "Li e
aceito as regras e os termos da Rocha's Surf School." before "Entrar no app" records the acceptance of that
version and opens the home of the account's role (still a placeholder). Onboarding can now be completed. When
the school has no rules left the step says so and still asks for the acceptance; a failed load offers "Tentar
novamente"; when the rules changed while the step was open, the app shows the new rules, unticks the box and
asks again. An account that has a number but hasn't accepted the current version lands on this step — at
onboarding, and again at the next sign-in after an admin adds, edits or deletes a rule. The list of rules is a
reusable piece for the later screens that show them. The design's line linking to the Terms and Privacy
policy isn't shown, since those pages don't exist.

**Accepting updated school rules** (spec `013-school-rules-update`) — an approved account with a number that
accepted the rules before and hasn't accepted the current version opens, at sign-in, a dedicated "Regras
atualizadas" screen instead of the onboarding step: the same shield, rules list, checkbox and footer, with the
eyebrow "Regras atualizadas", the description "Atualizamos as regras da escola. Leia e aceite para continuar
usando o app." and the button "Aceitar e continuar" (in pt-BR, es-ES and en-US). It has no back button, no
sign-out and no swipe-back; accepting opens the home of the account's role, and an expired session returns to
sign-in. A first acceptance still happens on the onboarding step. Every account answer of the backend now also
says whether the account ever accepted any version of the rules.

**Closed accounts on the backend** (spec `014-account-reactivation-request`) — every account answer of the
backend now also carries the reason a registration was denied (or nothing, when no reason was given) and
whether the account's reactivation request was sent or denied, whatever the account's status. A deleted
account, of any role, sends its one reactivation request through the backend, which records when it was sent;
sending it again changes nothing, after a denial it is refused, and an account that isn't deleted can't send
one. Admins aren't notified of a request and can't decide it yet, and the 30-day window isn't checked when a
request is sent. The app sends it from the Account deleted screen (spec 016).

Before the spec workflow, groundwork was laid without a spec: the monorepo with the backend, mobile and web
apps, the design tokens shared by web and mobile, the domain of user accounts and sign-in identities with its
storage, and the app's sign-in screen with its language picker. The real screens of each flow (every student and instructor screen, every admin screen besides the
School tools home, "Join the school" and the Profile tab included), reloading the account when the app returns from the
background (a rule change or an admin's decision is seen at the next launch or session renewal), and Apple sign-in
don't exist yet.

**The school's WhatsApp number on the backend** (spec `015-school-settings-whatsapp`) — an approved admin sets
the school's WhatsApp number through the backend, with its country code and no spaces or other characters (the
same shape as a user's number); it can be replaced but never emptied, and the last save wins. Any signed-in
account, whatever its role or status, reads it (nothing until one is set), so denied and removed accounts can
use it. Admins set it on "Configurações da escola" (spec 046), which also holds the waiting-list switch; the
Denied and Access removed screens use it (spec 016).

**Closed-account screens in the app** (spec `016-closed-account-screens`) — a denied, deleted or removed account
now opens the real screen of its state instead of a placeholder, all built on one shared layout: why the
account is closed, the address it signed in with, and "Usar outro email", which signs out at once (even
offline) and returns to sign-in. The Denied screen shows the admin's reason exactly as written in a "Mensagem
da equipe" card (no card when no reason was given); the Access removed screen says the account can't be
reactivated from the app. Both offer "Falar com a escola", which opens a WhatsApp chat with the school's number
— only when the school has one; while it loads, when it fails or when there is none, the button isn't shown.
The Account deleted screen has three states: not requested, with "Pedir reativação", which sends the one
request and switches the screen to "Pedido enviado" in place; requested, waiting for the team; and denied, with
only "Usar outro email". An admin's decision is seen at the next launch or sign-in, or when the session renews
while the screen is open (spec 018), or at once when its push arrives (spec 020). All copy is in pt-BR, es-ES and
en-US.

**Google sign-in** (spec `017-google-sign-in`) — "Continue with Google" on the sign-in screen signs in or signs
up with a Google account, on iOS and Android. The backend checks Google's token and opens the one account for
that person: the account already signed in with that Google account (even if its Google address changed since),
else the account with the same email, which gets Google as another way in, else a new pending student. A Google
address Google hasn't verified is refused. A new account takes Google's name when it fits the name rules;
otherwise the app opens "Your name", with Google's name filled in, and the account is created once a valid name
is sent. The person then lands where any sign-in leads (Pending for a new account). Closing Google's account
picker shows nothing; every other failure shows one short message in the app's language. Signing out also signs
out of Google, so the next Google sign-in shows the account picker. The Apple button is hidden until Apple
sign-in is built; Google's profile photo isn't stored, and Google sign-in on Android hasn't been tried on a
device yet.

**Staying signed in on the phone** (spec `018-mobile-session-persistence`) — a signed-in person stays signed in
when they close and reopen the app: the session is kept on the device, and at launch the app reloads the account
behind the splash screen and opens the part of the app that matches it now (an approval or a role change made
while the app was closed is seen at once). Offline, or when the backend doesn't answer within about 8 seconds,
the app opens by the last known account. The session renews by itself while the app is used, and a renewal
also brings the account's current state, so it can move the person to their new part of the app. The person is
signed out only by "Sign out" (or "Usar outro email") or when the backend refuses to renew the session: then the
app returns to sign-in with "Your session expired. Sign in again." once (in pt-BR, es-ES and en-US). Being
offline or a backend outage never signs anyone out. On iOS a still-valid session can survive reinstalling the
app.

**Admins decide registrations** (spec `019-admin-registration-decisions`) — an approved admin who finished
onboarding opens the admin home, "School tools", with one tool so far: "Join the school", which shows how many
registrations are waiting. The tool lists a card per pending account, oldest first, with initials, name and email,
and Deny and Approve (spec 039 changed its look and removed the request time).
Approve acts at once; Deny opens a sheet with an optional reason of up to 500 characters, shown to the person on
the Denied screen exactly as written (trimmed; a blank reason counts as none). A decided card leaves the list
(spec 039 removed the "Decided just now" list). Every decision is final: a registration already decided, by another admin or at the same
moment, is refused, and the app says "This registration was already decided." and reloads the list. Only an
approved admin may list or decide registrations; a pending account of any role is one. The person is told of the
decision by a push (spec 020), and otherwise sees it at the next launch, sign-in or session renewal. The card and the
deny sheet are built to be reused by "Reactivate accounts" and "Class enrolments". All copy is in pt-BR, es-ES and
en-US.

**Push notifications for registrations** (spec `020-push-notifications-registrations`) — the app now has its
only outbound channel: every notification is stored for the person first, then pushed to every phone they are
signed in on (pending and approved accounts register their phone at sign-in, at each launch and when the app
language changes), in that phone's language (pt-BR, es or en). The OS permission is asked right after the session
starts, with no screen before it; refusing it, or a phone that can't have a push token (a simulator), shows
nothing. Every approved admin is told when a new account starts waiting ("New registration — Ana Souza is waiting
for approval."), and the person is told when their registration is approved ("Account approved") or denied
("Registration denied", with the admin's reason as written, or "Open the app to learn more." without one).
Tapping a push reloads the account and opens the screen of its current state: "Join the school" for an admin, the
onboarding WhatsApp step after an approval, the Denied screen after a denial. A push that arrives with the app
open is shown as a banner and updates the screen at once (the Pending screen moves on; the admin's waiting count
and list reload). A failed push never changes the answer of the sign-up or the decision. Signing out stops the
pushes to that phone; a phone whose session expired without a sign-out keeps receiving its account's pushes
until someone signs in on it. The notifications screen (with read state) came with spec 055. The in-app push switch came with the Profile tab (spec 026). Delivery to a real phone needs the EAS project and the APNs / FCM credentials, which aren't set up yet.

**Denied registrations are erased** (spec `021-denied-registration-erasure`) — 30 days after an admin denies a
registration, the account is erased with everything it has (its sign-ins, sessions, rules acceptances,
notifications and phones), together with the admins' "new registration" notifications that carry the person's
name. Nothing else is kept and nobody is told. The same email address can then sign up again, by email code or
Google, as a new registration waiting for approval; a phone still signed in to the erased account gets the
existing "session expired" handling. Deleted and removed accounts are not erased yet; guest data is erased since
spec 045.

**Public web pages** (spec `022-public-web-pages`) — the small public site the App Store and Google Play require
exists, in pt-BR, es and en: a home page linking the three pages, the privacy policy (what the app collects, why,
how long it keeps it — including the 30-day erasures of deleted and removed accounts, denied registrations and
guest data — which services handle it, and the school as the controller with its WhatsApp number as the contact)
and the account deletion page (deleting in the app at Perfil → Excluir conta, or asking the school on WhatsApp
when the app is gone, which an admin carries out by removing the account; what is erased, what stays without a
name, and when). The language is in the address (`/pt-br/…`, `/es/…`, `/en/…`); an address without one opens in
the browser's language, Brazilian Portuguese when it is none of the three, and a picker on every page switches
it. The pages follow the system's light or dark theme (a header toggle overrides it, spec 024), set no cookies and have no tracking. The site isn't
deployed yet (the app links to it from the Profile, spec 026), and the copy hasn't had its legal review. The pages describe in-app deletion, admin removal and the erasure of deleted and removed
accounts before those exist.

**Terms of use and an LGPD-complete policy** (spec `023-terms-and-lgpd-privacy`) — the site gains a terms of use
page in the three languages (who can use the app, the school rules, what may be posted and how admins handle it,
reporting through WhatsApp, payments, what the terms don't cover, privacy links, changes, applicable law), a third
row on the home and the redirect of `/terms-of-use`. The privacy policy now has fourteen sections: the controller
(school name, legal name, optional CNPJ, WhatsApp) and the encarregado (name and email) from build configuration,
what is collected, each purpose with its LGPD legal basis, the providers, transfers outside Brazil, every
retention period, security, adults only, the Art. 18 rights with the ANPD, and links to deletion and the terms.

**Theme toggle on the site** (spec `024-web-theme-toggle`) — the site's header has a sun/moon button that switches
the pages between light and dark. Until a visitor presses it, the site follows the device's theme; once pressed,
the choice is kept in that browser across pages, languages and visits. There is no "follow the device" option
to go back to; clearing the site's data does.

**Automated checks on every change** (spec `025-ci-tests`) — no change for users: every change proposed or
pushed to the main line runs, automatically, the tests of the parts of the product it affects (the backend, the
app, the public site, the business rules), and one summary check says whether they all passed. The public site
gains its own automated tests, including checks that every page opens in each language.

**Tab bars and the Profile tab** (spec `026-profile-tab`) — an approved account that finished onboarding now
opens the tab bar of its role: a student has Agenda, Minhas aulas, Escola and Perfil (Agenda first); an instructor
and an admin have Início, Aulas and Perfil (Início first). Every tab except Perfil and the admin's Início ("School
tools") was a placeholder (spec 027 then filled the student's Escola and the instructor's Início, spec 030 the
student's Agenda and the Aulas tab, and spec 048 the student's Minhas aulas) with its name; inner screens such as "Join the school" open above the tab bar,
without it. Perfil is the same for the three roles: the person's initials, name and role, then "Editar perfil" (the
name, with the email read-only and the photo "coming soon"), WhatsApp ("Visível" / "Oculto"; the number, its
country and the share switch), Tema (same as the phone, light or dark, applied at once), Idioma (pt-BR, es-ES or
en-US, applied at once; the sign-in screen's picker keeps its choice too), "Notificações push" with a switch and a
note that notifications always stay in the app, "Regras da escola" (the rules, read-only), "Regras de
cancelamento" (a sheet with both rules, spec 036), "Sobre o app" (a sheet with mocked content: version, description, creator and
links), the privacy policy and the terms of use (the site's pages in the app's language, in the in-app browser;
hidden while the site's address isn't configured), "Sair" (a confirmation sheet, then the sign-in screen) and
"Remover a conta" (a confirmation sheet; the account becomes deleted at once and the phone signs out, so the next
sign-in shows the Account deleted screen). Theme, language and pushes are kept on the phone and survive signing
out. Turning pushes off removes the phone from the account's pushes at once (retried at the next launch or
sign-in if it fails); turning them on registers it again, and a refused OS permission keeps the switch off with a
message. Deleting the account takes the person off their classes that haven't started (spec 035, below), then
cancels their seats in classes that haven't started and withdraws their pending requests (spec 043, below); it
doesn't yet refuse the only admin. All copy is in pt-BR, es-ES and en-US.

**People directory** (spec `027-people-directory`) — every approved member can now see the school's other
approved members on one "Pessoas" screen, the same for the three roles: a student opens it from the Escola tab; an
admin from a "Pessoas" row under a new "Escola" section of the home (the "Entrar na escola" row now sits under
"Ferramentas"); an instructor from the Início tab, which became "Painel" with that one row. The rows on the homes
read "9 na plataforma", a fixed number until the real count can be read. The screen shows the real number of
approved members ("N na plataforma", which doesn't change with the search or the filter), a search box that
ignores case and accents ("joao" finds "João"), one toggle button per role (Alunos, Instrutores, Admins; any
number selected, none = everyone), and the list A–Z under letter headers — initials, name, "desde <mês ano>" and
the role — loading 20 more at the end of the list, with pull-to-refresh, a loading, empty and error-with-retry
state. Pending, denied, deleted and removed accounts never appear. Tapping a person opens a sheet with their
initials, name and role and a "Conversar por WhatsApp" row with the number, which opens the chat in WhatsApp on
the phone; when the viewer may not see the number (not shared and the viewer isn't an admin, or no number), the
row is disabled and says "Número não compartilhado.". A hidden number never leaves the backend for a non-admin.
All copy is in pt-BR, es-ES and en-US.

**Admins create classes in a batch** (spec `028-create-classes`) — classes exist for the first time. An approved
admin opens "Criar aulas" (below "Entrar na escola" under "Ferramentas" on the home) and, on the "Nova aula"
screen, creates one class or a batch that share the discipline (Surf or Skate), the level (a label), the
location, the instructors, the capacity (a stepper from 1 to 20, 8 by default) and optional notes (up to 300
characters). Days are picked on a Monday-first calendar (no day before today): one day, or a range shown as a
band from which single days are removed by pressing them (struck through, listed under "Dias removidos"; pressed
again, they come back; pressing an end of the range clears it) — spec `029-batch-excluded-dates-skip-past`
replaced the "Nos dias" weekday filter this way. Time ranges are chips suggested from last week's classes, plus any
added with "Novo horário" for this batch only (end after start; a chip that overlaps a selected one is blocked). A
time that has already started today stays selectable: when today is among the dates, its class today is skipped
("Os horários que já passaram não terão aula hoje.") and the other days are created (spec 029).
A location is picked from the saved ones or added in place with "Novo local"
(name and address; a name already used, ignoring case and accents, is refused). Instructors are the approved
instructors and admins of the school, none preselected. The screen shows "N dias × M horários · <local>" and
"Criar aula" / "Criar N aulas", enabled for 1 to 200 classes with a location and an instructor; on success a
toast ("N aulas criadas") and back to the home. The backend creates the whole batch or nothing — refusing past
classes (unless asked to skip them, spec 029), unknown locations, instructors who can't teach, more than 200 classes and every invalid field — and
pushes one "Novas aulas na sua escala" notification per assigned instructor (not the creator). Spec 030 shows the
classes (see below), spec 032 lets admins edit them one at a time, spec 033 cancel them and spec 034 delete them
(see below). All copy is in pt-BR, es-ES and en-US.

**Batches without single days and without the past** (spec `029-batch-excluded-dates-skip-past`) — a batch can
leave out single dates of its range, whatever their weekday, and can skip the classes that have already started
instead of being refused whole; the "Nova aula" form uses both (see the paragraph above). Days before today never
get a class, and the 200-class limit counts only the classes that will be created.

**Week view and class details** (spec `030-classes-week-view`) — every approved person who finished onboarding sees
the school's classes, past and future, on one week screen: the student's Agenda tab and the Aulas tab of
instructors and admins. It opens on the current week (Monday to Sunday, Fortaleza) with today selected, in the
week and month calendar of spec 031 (below), and shows the selected day's classes as cards: discipline and level,
the time, the location and the instructors ("Ana · Bruno +1"). A class's state follows the clock with nobody acting:
"Em andamento" (highlighted border) from its start, "Finalizada" (faded) from its end, nothing before — updated
every minute while the screen is open. Pulling the list down reloads every week the calendar shows; loading,
error-with-retry (for the selected day's week) and "Sem aulas neste dia." states are shown. Pressing a card opens
the class details: the chips, the time, the date
("Hoje", "Amanhã", "Ontem" or the weekday, with the year when it isn't this one), a banner while it is under way
("Começou às … e termina às …") or once it finished ("Terminou às …"), the instructors with initials ("Você" for
the viewer), "Máx. N alunos", the notes (only when there are any) and the location's name and address; a class
that no longer exists says so. Admins also get a round "+" in the header, "Criar aula" on an empty day and "Criar
aula neste dia" below a day's classes; on today or a later day they open Nova aula with that day already picked,
and on a past day only the "+" shows and opens Nova aula with no day. After creating classes, the Aulas tab shows
them without reloading by hand. Tapping a "Novas aulas na sua escala" push opens the instructor's or admin's Aulas
tab, and one that arrives with the app open reloads the shown weeks. Seats taken aren't shown yet (only the
capacity). All copy is in pt-BR, es-ES and en-US.

**Week and month calendar** (spec `031-week-month-calendar`) — the classes screen of the three roles (the
student's Agenda, the Aulas tab of instructors and admins) picks its day in a calendar that opens on the week. The
pill in the middle of its header ("12 – 18 OUT", "28 SET – 4 OUT" across two months) switches to the whole month
("OUTUBRO 2026", filled, with an up chevron) and back; it is the only way to switch: selecting a day, in the week or
in the month, only selects it, and the selected day stays selected when the view switches. The week shows the
seven days with only the selected one filled; the month shows Monday-first weekday initials and only the weeks it
needs (4 to 6 rows), the days of the months around it in a lighter color, the selected day in a filled circle, and
tapping one of those days moves the grid to its month. Today's number is highlighted in both views. The arrows move
one week (the same weekday) in the week view and one month (the same day number, capped at the month's last day:
31 Jan → 28 Feb) in the month view. Every day with at least one class shows a single dot, in both views and on the
days of the months around. There is no "Hoje" shortcut, no relative-week subtitle ("Esta semana"…) and no day title
or class count above the cards. The calendar is a shared piece of the app that other screens can reuse.

**Editing a class** (spec `032-class-editing`) — an approved admin edits one class at a time from "Editar aula" in
the class tools of its details (spec 033; shown to admins only, and not on a finished or cancelled class). Before
the class starts every
field can change, but its start never moves to now or earlier; once it has started only its instructors can
change (a substitute); once it has finished nothing can. The capacity can't go below the seats taken (always zero
until enrolment exists). An edit can't leave a class without an instructor; a new instructor must be an approved
instructor or admin, while the ones already on the class can stay whatever their role is now. The "Editar aula"
screen starts from the class's values with the Nova aula sections, but one day ("Dia", no day before today) and
one time range ("Início e fim": the class's own, last week's suggestions and any added with "Novo horário"; on
today a time that has already started is blocked, except the class's own while it hasn't started); the
instructor list also shows the class's instructors who no longer teach, so they can be removed. A started class
shows "A aula já começou" / "Só dá para trocar os instrutores." and only the instructors. "Salvar e notificar"
(with "Ao salvar, avisamos os instrutores da aula.", which since spec 047 also names the enrolled students and
pending requests) is enabled only when something changed and the form is
valid; on success "Alterações salvas" and back to the details, with the week and the details reloaded; each
refusal has its own message (started — the screen switches to the instructors only —, finished, gone, past,
seats taken, unknown instructor or location). Saving without a change does nothing and tells nobody. The
instructors (and, since spec 047, the class's students and pending requests) are told, never the admin who edits: the ones who stay get "Aula alterada" when a class field
changed, the new ones "Novas aulas na sua escala", the removed ones "Você saiu de uma aula"; tapping one of the
first or last opens that class's details, and one received with the app open reloads the classes. All copy is in
pt-BR, es-ES and en-US.

**Cancelling a class** (spec `033-class-cancellation`) — an approved admin cancels a class any time before it
finishes, a started one included, with an optional message (up to 300 characters, shown exactly as written, e.g.
"Mar muito grande."). The admin's tools for one class sit behind a round tools button in the header of its
details, where the pencil was (admins only; hidden on a finished or cancelled class): the "Ferramentas da aula"
sheet holds "Editar aula" (opens the editor), "Avisar alunos e instrutores" (drawn, does nothing yet; "Enviar
mensagem" since spec 049, which makes the tools four cards) and "Cancelar aula". The last opens "Cancelar esta aula?" with "Mensagem (opcional)" and its counter, "Cancelar e
avisar" and "Manter aula"; on success "Aula cancelada", and the details stay on screen. Cancelling is final: the
class stays on the schedule for every role, its card shows "Cancelada" with the time struck through (never "Em
andamento" or "Finalizada", and its day keeps the calendar dot), its details show one "Aula cancelada" banner with
the message (or "Esta aula não vai acontecer."), and it can't be edited or cancelled again — "Editar aula" opened on
it says so, and a cancel that arrives after another one, or after the class finished, is refused with its own
message. Its instructors are told with the message ("Aula cancelada"), never the admin who cancels; tapping the push
opens the class's details, and one received with the app open reloads the classes. Back on the classes screen,
the cards already show a class just cancelled or edited. All copy is in pt-BR, es-ES and en-US.

**Deleting a class** (spec `034-class-deletion`) — an approved admin deletes a class created by mistake, from
"Excluir aula" in the class tools, below "Cancelar aula" — offered only while the class hasn't started (a started
class can only be cancelled; finished and cancelled classes show no tools). Since spec 049 it is the "Apagar aula"
card, disabled with "Já começou" or "Tem inscritos" (anybody holding a seat). It opens "Excluir esta aula?" with the
class in one line ("Surf Iniciante · Amanhã · 19 out, 08:00 – 09:00 · <local>"), "Os instrutores são avisados e a
aula sai da agenda. Não dá para desfazer.", "Excluir aula" and "Manter aula". On success "Aula excluída", the app
leaves the details, and the class is gone from the schedule for good, for every role — nothing of it is kept.
Deleting is refused once the class has started (finished included), for a cancelled class, and when anybody holds
a seat or has a pending request in it — then the sheet turns into "Não dá para excluir", whose "Cancelar aula"
opens the cancel sheet instead. Until enrolment exists nobody can be in a class, so that refusal never happens
yet. Its instructors are told ("Aula excluída", with the class's discipline, day and time), never the admin who
deletes; tapping the push opens the Aulas tab, and one received with the app open reloads the classes.
Notifications sent earlier about the class stay; opening one shows "Esta aula não existe mais.". All copy is in
pt-BR, es-ES and en-US.

**Classes left without an instructor** (spec `035-class-no-instructor`) — when an instructor or an admin deletes
their account, they are first taken off every class of theirs that hasn't started and isn't cancelled; classes
under way, finished or cancelled keep them, and the deletion fails as a whole (the account stays approved) if
that step fails. A class left with nobody stays scheduled and is flagged "Sem instrutor" for admins while it
hasn't started: a warn chip on its card in the admin's Aulas tab, and on its details a "Sem instrutor" / "Atribua
um instrutor antes da aula." banner that opens "Editar aula" — assigning an instructor there clears the flag. For
every role, the details of a class with no instructor say "Sem instrutor
atribuído" (since spec 040 the card shows no instructors). Every other approved admin is told once per deletion ("Aula sem instrutor", or "N aulas ficaram sem
instrutor. A próxima: …" for several), naming the earliest such class; tapping the push opens that class's
details, and one received with the app open reloads the classes. The person who leaves and the instructors who
stay on a class aren't told. Reactivating the account doesn't restore the assignments. All copy is in pt-BR,
es-ES and en-US.

**Cancellation rules and deadlines** (spec `036-cancellation-rules-deadline`) — admins write two free-text
cancellation rules, one for surf and one for skate, on the "Regras de cancelamento" screen opened from a new row
on the admin home ("Uma para surf, outra para skate"): a Surf / Skate switch that keeps each draft, two writing
tips, the text (up to 2000 characters, with a counter), a note ("Alterações não salvas", "Regra de surf em vigor"
or "Ainda não há regra de surf") and "Salvar regra de surf", on only when the text changed and isn't blank; saving
shows "Regra de surf salva" and stays on the screen. Every approved person reads both rules from Perfil →
"Regras de cancelamento", a sheet with one card per discipline ("A escola ainda não escreveu esta regra." for a
missing one). Each upcoming class gets one cancellation deadline, worked out in the background by Claude from
its discipline's rule and its details, never anything about a person; it is redone after an edit that changes
a detail the model reads and after the rule changes, and retried with growing waits while it can't be worked out.
Until it exists, admins see a "Sem prazo" chip on the class's card (under "Sem instrutor" when both apply) and a
"Sem prazo de cancelamento" banner on its details ("… Confira a regra de surf."), which opens the rules screen;
nobody is notified. Every role sees the deadline on the details of a class that has one and isn't cancelled
(since spec 049 the "Cancelamento" row reads "Até seg, 19 out · 20:00"). The site's privacy policy names Anthropic as the service that works out the
deadline. All copy is in pt-BR, es-ES and en-US.

**Class locations** (spec `037-class-locations`) — a location now has a point on the map, and admins edit and
remove locations. The "Novo local" sheet on Nova aula and Editar aula has Nome, Endereço with up to 5 address
suggestions from Google Maps as the admin types (picking one fills the address, moves the point and fills an
empty Nome), and "Ponto no mapa", a small map where a tap places the point; "Salvar local" needs a name, an address
and a point. The "Local" section shows "Gerir" while a location exists: in that mode each row has a pencil that
opens "Editar local" (the same sheet, plus "As alterações valem também para as aulas que já usam este local."), and
"Concluir" leaves it. An edit applies to every class at the location, past ones included, and the classes on
screen reload; when upcoming classes use it, a ticked "Avisar alunos e instrutores das próximas aulas?" box (spec 047) tells their
instructors, and their students and pending requests, once each ("Local de aula alterado", with their count; never the admin who edits; tapping it opens the
Aulas tab). A new name or address makes the upcoming classes' deadlines be worked out again. "Remover local" asks
"Remover local?" (with how many classes keep it) and archives the location: it leaves the list, its name can be
used again, it can't be given to a class, the classes that used it keep showing it, and when it was the form's
choice another must be picked; on Editar aula a class whose location was removed shows it with "Removido" and can
keep it. The last location can be removed. Every role sees, on the details of a class whose location has a point,
a small fixed map with a pin and "Direções" (since spec 049 in the "Onde e como" card), which opens Apple Maps on
iPhone and Google Maps on Android. The
site's privacy policy names Google's address suggestions and Apple Maps. All copy is in pt-BR, es-ES and en-US.

**Fixed header on the screens that go back** (spec `038-native-stack-header`) — every app screen that can go
back (the e-mail sign-in and sign-up screens, and above the tab bar Registrations, People, Nova aula, a class's
details, Editar aula, Regras de cancelamento, Editar perfil, WhatsApp and the school rules) now has the phone's own
navigation header, which stays at the top while only the content scrolls, with the system back button, the iPhone
swipe-back and Android's back. On iPhones with Liquid Glass (iOS 26+) the header is see-through and the content
fades softly as it scrolls under it; elsewhere it has the page's color. A class's details, Nova aula and Editar
aula show their title in the header, and a class's details its tools button at the header's right.

**"Join the school" follows its designs** (spec `039-join-school-design`) — the admin's "Join the school" screen
opens with "N waiting for approval" (hidden while loading, on an error and when no one is waiting), the title and
"New accounts can only book classes once approved. The person gets a push notification." Each card shows the
person's initials, name and email (no request time), a chevron, an outline "Deny" with ✕ and a green "Approve"
with ✓. Tapping the card's upper part opens the person's sheet: initials, name, the "Student" chip and their email
(a registration has no WhatsApp number yet), with "Close". "Deny" opens "Deny entry?", "<name> won't join the
school. You can explain why (optional) — the person gets this message.", a reason field with an example as its
placeholder, "Deny and notify" and "Back", which closes the sheet and clears the reason; the sheet rises above the
keyboard while the reason is typed. A decided card just leaves the list: the "Decided just now" list is gone. All
copy is in pt-BR, es-ES and en-US.

**Seats and students on the class card and details** (spec `040-class-seats-read-model`) — every class read now
carries its seats taken and its approved students, which everyone who sees the class sees (always 0 and nobody until
enrolment exists). The week cards follow the AGENDA-01 design: no instructors line any more; an occupancy bar with
"N/M vagas" (red when full, sun above 80%, otherwise the discipline's colour) and a "Sem vagas" chip on a full class
that hasn't started; a footer with up to 4 student avatars, "+N" for the other seats taken and "Ainda sem alunos",
"1 aluno confirmado" / "N alunos confirmados", or "N alunos presentes" once finished. A finished card has no bar, a
cancelled one neither bar nor footer. A class's details show "A aula": the instructors with their avatars ("Você" for
the viewer, "Sem instrutor atribuído" when none), the students row with up to 5 avatars and the same label, which
opens the list of every student, and "Máx. N alunos · X vagas livres" (or "· esgotado", in red), hidden for
finished and cancelled classes; a "Turma cheia" banner on a full class that hasn't started; and, except for a
cancelled class, "Regras": the cancellation row ("Ler a regra" without a deadline), opening the cancellation rules
sheet, and "Regras da escola", opening the role's school rules (spec 049 redrew all of it, see below). Instructors also see
a note: the school makes enrolments, cancellations and schedule changes on a class they teach, and they see a class
they don't teach in read-only mode. A person without a photo shows their initials on a `sand` circle. All copy is
in pt-BR, es-ES and en-US.

**Students request seats in classes** (spec `041-enrolment-requests`) — on a class that hasn't started, a student's
details now end in one sticky button: "Pedir para entrar", or "Entrar na lista de espera" on a full class (the "Turma
cheia" banner adds "Você pode entrar na lista de espera."). It opens a sheet with the class line ("Surf Iniciante ·
Amanhã · 21 out · 12:00. O pedido fica pendente até a escola confirmar.", or the waiting-list version), "Cancelamento ·
Surf", a card with "Cancelamento até …" or "Prazo ainda não definido" and the box "Li e aceito a regra de
cancelamento" with "Ler" (the rules sheet, which then brings the request sheet back), "Enviar pedido" (on once the
box is ticked) and "Agora não"; with no rule for the discipline the card says "A escola ainda não escreveu esta
regra." and there is no box. Sending shows "Pedido enviado" (or "Você está na lista de espera"). The details then
show the request: "Pedido pendente" with "Anular pedido", which asks first ("Sim, anular" / "Manter pedido"), or, on a
full class, "Você está na lista de espera" with "Sair da lista de espera", which withdraws at once; then "Pedido
anulado" or "Você não conseguiu vaga" with "Pedir novamente". On the student's Agenda the card shows "Pendente", "Na
lista de espera", "Anulado" or "Expirado" in place of "Sem vagas"; started, finished and cancelled classes keep their
own chip and banner and offer no button, and instructors and admins never see any of it. Admins and the class's
instructors get "Novo pedido de vaga" for every request, and tapping it opens the class; a student gets "Você não
conseguiu vaga" when the class starts with the request still pending, and "Aula cancelada" when a class they asked
for is cancelled, each opening the class. The seats, the students and the "not empty" check of deleting a class now
count stored enrolments. All copy is in pt-BR, es-ES and en-US.

**Admins approve and deny class requests** (spec `042-enrolment-decisions`) — while requests are pending, an admin's
home shows the row "Inscrições em aulas" with "N pedidos" under "Ferramentas", after "Entrar na escola". The tool's
header reads "Inscrições em aulas" with "N pedidos · M aulas", and each class with pending requests (not started, not
cancelled, by start) gets a card: a day block (weekday, day, month), "Surf · Iniciante", the time range, the location,
"Máx. N alunos", "X vagas livres" or "Esgotado" (red) and an occupancy bar; then one card per request with the
student's avatar, name and "Pediu às 09:12 · 19 out", "Recusar" and "Inscrever". "Inscrever" approves at once
("<nome> inscrito · aluno avisado"); "Recusar" opens "Recusar inscrição?" with an optional reason, and "Recusar e
avisar" denies ("<nome> recusado · aluno avisado"); a decided card leaves. A full class shows "Lista de espera · por
ordem de pedido", the position ("1º", "2º"…) before each name, "Inscrever" disabled and the note "Inscrever fica
bloqueado enquanto a turma estiver cheia. Aumente a lotação ou espere abrir uma vaga."; with nothing left it shows
"Nada à espera" / "Todas as inscrições foram decididas.". A request decided elsewhere, a class that started or one
that filled up shows its toast and reloads the list. The student gets "Pedido aprovado" ("Sua vaga na aula de Surf de
19/10 às 08:00 está confirmada.") or "Pedido recusado" (the reason as written, or a default line), each opening the
class; there an approved request shows "Você está inscrito" / "Sua vaga está garantida." with no button and the
Agenda chip "Aprovado", and a denied one shows "Pedido recusado" / "Toque para ver o motivo.", which opens a sheet
with the class, "Motivo da escola" and the reason (or "Sem motivo indicado."), plus "Pedir novamente" until the class
starts, and the chip "Recusado". An admin's "Novo pedido de vaga" now opens the tool. All copy is in pt-BR, es-ES and
en-US.

**Students cancel their seat until the deadline** (spec `043-seat-cancellation`) — on the details of a class that
hasn't started, a student with an approved seat sees "Cancelar inscrição" (outline) while it is before the class's
cancellation deadline. It opens "Cancelar inscrição" / "Sua vaga fica livre. Você pode cancelar até seg, 19 out ·
20:00." with "Sim, cancelar" and "Manter inscrição"; confirming shows "Inscrição cancelada", the banner "Você
cancelou a inscrição" / "Sua vaga ficou livre.", the Agenda chip "Você cancelou" and "Pedir novamente". Once the
deadline has passed (also while the screen is open) the footer shows "O prazo para cancelar terminou em <dia, data ·
hora>. Fale com a escola." instead, and a class without a deadline shows "O prazo de cancelamento desta aula ainda
não foi definido. Fale com a escola para cancelar."; both come with "Falar com a escola", which opens the school's
WhatsApp and is hidden while the school has no number. A seat no longer approved or a class that started shows its
toast and reloads the class. Admins and the class's instructors get "Vaga cancelada" ("Ana Souza cancelou a vaga na
aula de Surf de 19/10 às 08:00. 2 na lista de espera.", the count only when someone waits), which opens the class.
Deleting an account now cancels the person's upcoming seats, with the same notice, and withdraws their pending
requests. All copy is in pt-BR, es-ES and en-US.

**Admins enrol students directly and take them out** (spec `044-direct-enrolment-take-out`) — the admin home's
"Inscrever aluno" row (under the school's tools) opens "Inscrever aluno" / "Inscreva um aluno da escola numa aula.":
"1 · Quem" searches the approved students ("Procurar aluno"; A–Z, more as the list scrolls; initials, name and a
radio; "Nenhum aluno encontrado." when none) and "2 · Aula" shows the week or month calendar, marking the days with
upcoming classes, and the chosen day's classes that haven't started and aren't cancelled as class cards — full ones
faded and not selectable, "Sem aulas por começar neste dia." when none. "Inscrever <nome>" enrols the student,
shows "<nome> inscrito · aluno avisado" and goes back; a class that filled, started or was cancelled, a student
already in it or no longer enrollable shows its toast and reloads the classes. On an admin's details of a class that
hasn't started, each student in the list has "Retirar", which opens "Retirar <primeiro nome> da aula?" with the
class line ("Surf Iniciante · Amanhã, 08:00 – 09:00. A vaga fica livre. A pessoa recebe uma notificação, com o
motivo se você escrever."), "Motivo (opcional)" (up to 300 characters), "Retirar da aula" and "Voltar"; confirming
shows "<nome> retirado · aluno avisado" and the class reloads. The student gets "Você foi inscrito" ("A escola
inscreveu você na aula de Surf de 19/10 às 08:00.") or "Você foi retirado de uma aula" (the reason as written, or a
default line), each opening the class; there a taken-out student reads "Você foi retirado da aula" / "Motivo: “…”"
(or "Sem motivo indicado.") on the `bad` tint — kept after the class starts or is cancelled —, the Agenda chip
"Retirado" and "Pedir novamente" while the class hasn't started. All copy is in pt-BR, es-ES and en-US.

**Trial guests in classes** (spec `045-guests`) — "Inscrever aluno" now reads "Inscreve um aluno da escola, ou
alguém sem conta numa aula experimental." and starts with a switch, "Aula experimental" / "Aluno da escola" (the
latter selected). In "Aula experimental", "1 · Quem" shows "Nome" ("Ex.: Carolina Reis"), "WhatsApp" (the country
picker, Brazil preselected, with the Brazilian mask) and "Esta aula não fica no histórico — se a pessoa criar conta
depois, começa do zero."; "Inscrever <nome>" is on once the name, the number and a class are valid, adds the guest,
shows "<nome> inscrito" and goes back, and a class that filled, started or was cancelled shows its toast and reloads
the classes. On a class's details the students list ends with the guests: a `sand` avatar, the name (admins and the
class's instructors) or "Trial" (everyone else) and a "Trial" chip; guests open no person sheet. Admins get
"Retirar" on a guest of a class that hasn't started: "Retirar <nome> da aula?" with "É um aluno trial, sem conta —
avise-o por WhatsApp." and no reason field; confirming shows "<nome> retirado". The students row, the card's "N/M
vagas" and "+N" count guests, and the admin's capacity line ends with "· inclui N trial". On Editar aula's footer and
the "Cancelar esta aula?" sheet of a class with guests, admins read "N alunos trial não têm conta e não recebem o
aviso — fale com eles por WhatsApp." (singular for one) on the `warn` tint. Thirty days after a guest's class ended or
was cancelled, the guest's name and number are erased and the seat shows "Trial" to everyone. All copy is in pt-BR,
es-ES and en-US.

**School settings screen** (spec `046-school-settings-screen`) — the admin home's "Escola" section has a
"Configurações da escola" row, which opens the screen of the same name. Its "Lista de espera" section has the switch
"Lista de espera nas turmas cheias" with "Numa aula cheia, os alunos podem entrar na lista de espera. Se abrir vaga,
o pedido passa para a sua aprovação." while on, or "Desligada — numa aula cheia, os alunos veem «Turma cheia» e não
podem pedir." while off; its "WhatsApp da escola" section has the country picker and number (Brazil preselected and
the field empty while the school has no number) with "É o número do botão «Falar com a escola».". One "Salvar" is on
only when the switch or the number differs from what is saved and the number, when typed, is valid (an invalid one
shows the field's error); it saves only what changed, shows "Configurações salvas" and stays on the screen, and a
failed save shows the usual toasts and keeps the edits. The school's number can be replaced but not cleared. While
the waiting list is off, a student without an open request on a full class that hasn't started sees no button and
"A lista de espera está fechada para esta aula." under "Turma cheia"; a request sent just as the switch went off
shows that text as a toast and the class reloads. A student already waiting keeps "Sair da lista de espera". On a
full class that hasn't started, admins read "Turma cheia" with "Novos pedidos entram na lista de espera." or "A
lista de espera está desligada — ninguém pode pedir."; instructors see the banner alone. While the app can't read
the settings, it treats the waiting list as on and the school decides. All copy is in pt-BR, es-ES and en-US.

**Class changes reach students** (spec `047-class-changes-reach-students`) — when an admin edits a class or changes a
location, the students who hold a seat and the people with a pending request are told as well as the instructors.
An edit that changes a class field sends "Aula alterada" to the class's approved and pending students and to the
instructors who stay; changing only the instructors, or saving without a change, tells no student; withdrawn,
expired and denied students are never told. A location edit with "Avisar alunos e instrutores das próximas aulas?"
ticked (on by default) sends one "Local de aula alterado" to each person with a seat or a request in its upcoming,
not cancelled classes, with how many of those classes they are in; a person who is also an instructor there gets
one notification, with the larger count. The admin who edits is never told, and guests never are. Before acting,
the admin sees who will be told: "Cancelar esta aula?" reads "Avisamos N inscritos, M pessoas com pedido pendente e
K instrutores. A aula fica na agenda, marcada como cancelada." (only the groups with someone in them, singular for
one; K excludes the admin), and Editar aula's footer reads "Ao salvar, avisamos os instrutores, N inscritos e M com
pedido pendente." (or "Ao salvar, avisamos os instrutores da aula." when there is no student and no request). A
student who taps "Aula alterada" opens that class's details, and "Local de aula alterado" opens the Agenda; one
received with the app open reloads the classes. All copy is in pt-BR, es-ES and en-US.

**"Minhas aulas" and the class history** (spec `048-my-classes-tab`) — the student's "Minhas aulas" tab lists every
class they asked for that hasn't ended (cancelled ones included), by start, as the Agenda's cards with the status
chip of their latest request. Since spec `052-my-classes-grouped-filters` a row of four chips filters it by group:
Todas, Pendentes (pending requests, the waiting list included), Confirmadas (approved) and Encerradas (denied,
withdrawn, cancelled, taken out, expired, ended by the class's cancellation, and any request in a cancelled class);
a class without a request shows only under Todas, and each card keeps its request's exact status chip. The chips go
back to Todas whenever the tab loses focus, a class or the history opened above it included. With nothing to show
it reads "Nada por aqui" with "Você ainda não pediu vaga em nenhuma aula." (Todas) or "Você não tem pedidos com
este status." (a group without classes); the list reloads when the tab is shown
again and on pull-to-refresh, and a failed load offers "Tentar novamente". A card opens the class's details. The round
history button opens "Histórico": the classes the student took (a seat held when the class ended, not cancelled),
each card reading "N alunos presentes", found by day, week or month since spec 053 (below). All copy is in pt-BR,
es-ES and en-US.

**Class details as designed, with the person sheet** (spec `049-class-details-people-design`) — on a class's
details, for every role, "A aula" has "Máx. N alunos · X vagas livres" (or "esgotado", in red; "· inclui N trial"
for admins) at the right of its label, in the label's style, hidden once finished or cancelled. The card opens with a
tinted header, "Instrutor" / "Instrutores" (or "Sem instrutor atribuído"), and one pill per instructor with their
avatar and name ("Você" with a lagoon border for the viewer). The students row stacks the first 5 seats, students
then guests (a person icon on `sand`), with "+N" for the rest; the list shows each student with their avatar, name
and a chevron, and each guest with the person icon and the name followed by "Trial" (admins and the class's
instructors) or "Trial" alone. Tapping an instructor or a student opens the People directory's sheet — initials, name,
the "Instrutor" / "Admin" / "Aluno" chip and "Conversar por WhatsApp" with the number, or "Número não compartilhado."
— by the directory's rule: a person's number shows when they are approved and share it, and admins see every number;
guests open nothing. On an admin's view of a class that hasn't started, "Retirar" takes the chevron's place and opens
only the take-out sheet. "Regras" is a card of two rows with icon tiles: "Cancelamento" with "Até <dia, data · hora>"
(or "Ler a regra") and "Regras da escola" with "N regras para todos os alunos" once the school has any. The notes
sit in a card with a note icon, as written. "Onde e como" is one card: the fixed map across the top when the
location has a point, then the pin, the name and the address, and "Direções" at the right. The "finished" banner
shows a checkmark beside "Aula finalizada". The admin's class tools are four cards under the unchanged title:
"Editar aula" ("Data, hora, local…"), "Enviar mensagem" ("N pessoas" or "Ninguém ainda"; does nothing yet),
"Cancelar aula" in red ("Avisa N pessoas" or "Ninguém para avisar") and "Apagar aula" ("Ninguém inscrito", or
disabled with "Tem inscritos" or "Já começou"); N is the people a cancellation tells — the other instructors, the
enrolled students and the pending requests. All copy is in pt-BR, es-ES and en-US.

**Filtering the week by sport** (spec `050-classes-discipline-filter`) — on the classes week screen of every role
(the student's Agenda, the Aulas tab of instructors and admins), a floating `grape` button at the bottom right,
above the tab bar, opens three options over a dimmed phone: "Todas", "Surf" and "Skate" (labels only, the current
one highlighted). Since spec `051-classes-filter-full-screen-scrim` the dimming covers everything, the header and the
tab bar included, and a press anywhere on it — or Android's back button — closes the options and keeps the sport. Choosing a sport lists only that sport's classes on the selected day and marks only the days that
have one, in the week and in the month; "Todas" shows everything again. A day whose classes are all of the other
sport shows the usual empty day ("Criar aula" still offered to admins on today or later). The choice stays while the
user changes day, week or view and pulls to refresh, and goes back to "Todas" when the screen opens again; nothing
is saved on the phone, and switching makes no request. All copy is in pt-BR, es-ES and en-US.

**Filtering the class history by day, week or month** (spec `053-history-calendar-filter`) — "Histórico" shows only
the back button in its header, then the classes screen's week and month calendar in a card, opening on the current
month (America/Fortaleza) with no day selected, and the legend "Dias em que você fez aula": each day with one or more
classes taken has one dot. Below, "Todas as aulas" sits at the left with the period on screen at the right ("OUTUBRO
2026", "12 – 18 OUT"), and the period's classes are grouped under a label per day ("QUA, 21 OUT"), newest day first,
a day's classes newest first; a card opens the class's details. The arrows move one month (or one week) and clear
the selected day; the pill switches between month and week and keeps it (with no day, month → week opens today's
week when today is in that month, else the week of its 1st; week → month opens the month of the week's Monday).
Tapping a day narrows the list to it and puts a "21 OUT ✕" chip in place of the period; the chip, or the day again,
shows the whole period, and a faded day of the month around opens that month with the day selected. Picking a day
makes no request. While a period loads, class-card placeholders show under the calendar; a failed load shows "Algo
deu errado" with "Tentar novamente"; nothing to show reads "Sem aulas neste dia" or "Sem aulas neste período";
pull-to-refresh reloads the period on screen. A period already seen shows at once when the student goes back to it,
and the screen opens on the current month again each time. All copy is in pt-BR, es-ES and en-US.

**Class reminders** (spec `054-class-reminders`) — about 30 minutes before a class starts, the students with an
approved seat in it and every instructor who teaches it (admins included), each once, get a notification "Sua aula
começa em breve" / "A aula de Surf começa às 08:00 · Praia do Futuro." (the start time in Fortaleza, no day, and the
location's name; also in es and en). The first check inside the 30 minutes sends it, so a class created or moved
into that window, or a backend back from downtime, is still reminded before the start; once the class has started,
none is sent. Each start is reminded once: a cancelled class never is, and an edit that moves the start re-arms the
reminder for the new time, while any other edit doesn't. Pending requests (waiting list included) and guests are
never reminded, nor are people added after the reminder went out; a failed push isn't retried. The notification is
stored even when the person turned pushes off. Tapping the push opens the class's details in the student's,
instructor's or admin's flow; received with the app open it reloads nothing. Delivery to a real phone still needs the
EAS project and the APNs / FCM credentials.

**Notifications screen** (spec `055-notifications-screen`) — every student, instructor and admin opens "Avisos"
from the bell on their home screen (the student's Agenda, the instructor's and the admin's Início), above the tabs:
every notification kept for them, newest first, 20 at a time, in the app's language (pt-BR, es or en), each with an
icon and color for its kind, its title, its text when there is one, when it arrived ("Agora", "há 5 minutos", then
the date after a week) and an orange dot while unread. The text is the push's, without its "open the app" sentence
(a denied registration without a reason shows only its title). Tapping a notification marks it read at once and
opens what it is about, the same screen its push opens (a kind with nothing to open, such as "Account approved",
only becomes read); a failure there shows nothing. The check button in the header marks them all read and shows only
while something is unread; if that fails, the dots come back with a message. Tapping a push also marks its
notification read. The bell shows the real number of unread notifications ("9+" above nine, nothing at zero or when
the count can't load), updated when the home screen shows again, after marking and when a push arrives with the app
open. Notifications are never deleted, hidden or marked read just by being seen. Pending, denied, deleted and
removed accounts have no bell. All copy is in pt-BR, es-ES and en-US.

**Managing the school rules in the app** (spec `056-school-rules-admin-screen`) — approved admins open "Regras da
escola" from a "Regras" row, the first under "Escola" on their Início, above "Pessoas". Its subtitle reads "N regras
no onboarding dos alunos" ("1 regra…", "Nenhuma regra ainda" with none; no subtitle while loading or after an error).
The screen shows the intro, then the rules in the admins' order, numbered "01", "02"… with each title and explanation
as written, each with ↑ / ↓ arrows, and an "Adicionar regra" button below. ↑ / ↓ move a rule one place at once and
send the whole new order; every arrow is off until the answer, the first ↑ and the last ↓ are always off, and there
is no success toast. A failure puts the list back with a toast, and a stale order (another admin changed the list)
reloads it with "As regras mudaram. Confira a nova ordem.". "Adicionar regra" opens "Nova regra" and tapping a rule
opens "Editar regra": "Título" (up to 60 characters) and "Explicação" (up to 300), each with its counter, sent
trimmed. "Adicionar regra" turns on when both fields have text; "Salvar" turns on only when the trimmed text also
differs from the stored one. Each sheet notes that, once saved, everyone will need to accept the rules again the
next time they open the app; there is no checkbox, since admins don't choose. "Excluir regra" in the edit sheet
opens "Excluir esta regra?" with the rule's title and the same note for deleting, then deletes it, and the rules
after it move up. The toasts are "Regra adicionada", "Regra salva" and "Regra excluída". A rule that is already gone
closes the sheet, reloads the list and says "Esta regra já foi excluída."; any other failure keeps the sheet and
the draft. The screen has a loading state (placeholder rows), an error state with "Tentar novamente", and an empty
state "Nenhuma regra ainda" with its own "Adicionar regra". The admin who changed the rules accepts the new version
like everyone else, at their next launch, sign-in or session renewal. Perfil and the class details still open the
read-only rules. Instructors get the same "Regras" row on their Início ("N regras para todos os alunos"), which opens
the read-only rules. All copy is in pt-BR, es-ES and en-US.

**"Minhas aulas" for instructors and admins who teach** (spec `057-teaching-classes`) — the first row under "Escola"
on the instructor's and the admin's Início is "Minhas aulas", above "Regras", with the subtitle "N aulas atribuídas
a você" ("1 aula atribuída a você", "Nenhuma aula atribuída" at zero; no subtitle while loading or after a failed
first load) counting the classes they teach that haven't ended and aren't cancelled. Instructors always see the row;
an admin sees it only once they teach a class (never while it loads or after an error), and it appears when they come
back to the home after being assigned one. The row opens "Minhas aulas", an inner screen above the tab bar with its
title centered and nothing on the right: the classes under way first, each on a grape card with "Em andamento", then
the other classes grouped by day, each day headed "Hoje", "Amanhã" or the weekday ("Quarta", "Sábado" — without
"-feira") with its short date ("17 set"). The next class has the "Próxima" chip and a sun border; cancelled classes
stay in their day with "Cancelada" and are never the next one nor under way. The list moves on every minute without
reloading (a class that ends disappears, one that starts moves to the top), reloads when the screen or the home
shows again and on pull-to-refresh, and has a loading state, an empty state "Nada por aqui" ("Você ainda não tem aulas
atribuídas.") and an error state with "Tentar novamente". A card opens the class's details. Every stack screen's
header title now uses the smaller type style of a title next to the back button. All copy is in pt-BR, es-ES and
en-US.

Active specs: none.

## Out of scope (future evolution, recorded in the specs)

- Accounts for children — all students are assumed to be adults.
- Payments and credits.
- WhatsApp messages sent by the app, and email notifications.
- Saved lists of time ranges.
- Undoing admin decisions.
- A stored history of registration decisions (who decided, when an account was approved), shown anywhere in the
  app (spec 039 removed the per-visit "Decided just now" list); and searching, filtering or paging the
  registrations.
- Ratings and photos ([section 5](../../.docs/requirements.md#5-ratings-and-photos)): ratings, instructor
  comments, class photos and the prompt to rate a class; planned for a future version, not the first release.
- Reporting comments or photos.
- Translating text written by admins.
- Checking a cancellation rule's wording when it's saved, and previewing the deadline a rule would give.
- An admin dashboard with metrics (classes per day, occupancy, average ratings, a ratings list); each class
  already shows its seats taken and ratings.
- Keeping the text of past versions of the school rules (spec 010 keeps only the current text; an acceptance
  records only the version number), and recording who edited, deleted or reordered a rule (only its creator is
  kept).
- Withdrawing an acceptance of the school rules, and an admin view of who accepted which version.
- Signing out of every device at once: signing out ends the sign-in of one device only.
- A biometric or PIN lock on the session kept on the phone, and an offline screen or banner (spec 018 opens an
  offline launch by the last known account).
- Using the Google profile photo as the account's photo (spec 017 doesn't store it), and Google One Tap /
  automatic sign-in.
- On notifications: badges on the app icon, rich pushes, and a screen before the OS
  permission dialog (or asking again after a refusal); deleting, hiding or expiring notifications (spec 055 keeps
  them for as long as the account), and class names or before/after values in their text.
- Erasing deleted and removed accounts 30 days after the deletion or removal (with the "Former student" /
  "Former instructor" handling): spec 021 erases only denied registrations, and spec 045 guest data.
- Deploying the public site (host and domain), linking the privacy policy from the store listings, the onboarding
  line linking the terms and the policy, a report button for objectionable content, the
  legal (LGPD) review of the pages' copy, and a light/dark
  switch on the site (it follows the system theme).
- On the Profile (spec 026): uploading or changing the profile photo (the camera button says "coming soon"),
  splitting the name into first and last name, real data in the
  About sheet (mocked), keeping the theme, language and push preferences on the account or syncing them across
  phones, and, when a person deletes their account, refusing the only admin.
- On the People directory (spec 027): profile photos (initials only), class counts and the "Acesso total" /
  "Dono da escola" subtitles on the rows, the removed accounts section with "Restaurar", promoting, demoting or
  removing someone from their sheet, searching by email, the real count on the home rows (a fixed "9 na
  plataforma" until the backend can give it), and the rest of the admin and instructor dashboards (greeting,
  metrics and every other row).
- A daily limit on the sign-in codes sent to one email address (spec 001 limits codes per network address
  only).
- After creating classes (spec 028): the instructors' "Surf" / "Skate" subtitles and photos in the picker; a real
  count on the "Criar aulas" row.
- On class locations (spec 037): restoring an archived location, listing archived locations, and a locations screen outside
  the class form; filling the address from a tapped point, "near me" from the phone's own location, and an
  interactive map on the class details (it is a fixed preview); Google Maps on iPhone (iPhone uses Apple Maps).
- On the week view and class details (spec 030): a marker on the cards of one's own classes; "Depois da aula"
  (photos and ratings).
- On the sport filter (spec 050): keeping the chosen sport across app launches, a mark on the closed button
  showing a filter is on, and filtering other lists ("Minhas aulas", the class history, the people directory) by
  sport.
- On seats and students (spec 040): the "1ª vez" badge on the details; the weather and sea conditions on the details (no data source); an "A começar" state for a class
  about to start; and profile photos (initials until photos can be uploaded).
- On the class details' design (spec 049): the "Condições previstas" row of "Onde e como" (weather and waves), "Sem
  penalização até N h antes" as the cancellation row's value (the rules are free text), sending a message to a
  class's people from "Enviar mensagem" (the card is drawn and does nothing), and opening a sheet or a chat for a
  trial guest.
- On editing a class (spec 032): editing several classes at once, and the editor's "gerir" links to manage time ranges and locations.
- On cancelling a class (spec 033): storing who cancelled it,
  restoring a cancelled class and editing its message; what "Avisar alunos e instrutores" in the class tools does
  (a message to a class's people, its own spec).
- On deleting a class (spec 034): the seat and pending-request counts on the confirmation sheet; deleting several
  classes at once; restoring a deleted class or keeping any record of it.
- On classes left without an instructor (spec 035): releasing the classes when an instructor is demoted to
  student or an account is removed (their specs reuse the same step); telling the students of a class that lost
  its instructor; a list or filter of the classes without an instructor.
- On cancellation rules and deadlines (spec 036): notifying anyone about rules, deadlines or the flag; keeping the text of past rules or
  showing who saved a rule; a list or filter of the classes without a deadline, and admins setting a deadline by
  hand.
- On the week and month calendar (spec 031): swiping between weeks or months (only the arrows move), an animation
  when the view switches, remembering the chosen view after leaving the screen, and using the calendar on other
  screens.
- On "Minhas aulas" (spec 048): keeping the chosen chip after a class or the history opened above the tab.
- On the instructor's and admin's "Minhas aulas" (spec 057): the past classes they taught ("Aulas anteriores") and the
  header's clock button that opens them; the "Atualizada" chip of a recently edited class; a stored "also an
  instructor" option on admin accounts; filtering the list by sport, level or status, searching it and paging it; the
  admin's week-by-week layout; and the rest of the dashboards (greeting, metrics, "Avaliações das aulas", "Ocupação
  semanal").
- On the class history's calendar (spec 053): a "Hoje" button, keeping the chosen period or day after leaving the
  screen, filtering the history by sport, level or status and searching it, and swiping between weeks or months.
- On class reminders (spec 054): choosing the lead time or turning reminders off per person or per type (only the
  phone's push switch applies), reminding pending requests or guests, reminding people who join a class after its
  reminder was sent, and retrying a reminder whose push failed.
- On enrolment requests (specs 041–045): storing the text of the cancellation rule a student accepted, and a
  success style for toasts (every toast uses the error style). On decisions (spec 042): listing the pending
  requests on the admin's class details, filtering or searching the tool, a stored history of who decided and
  when, and undoing a decision; telling waiting students when a seat opens is never done, by product decision. On
  cancelling a seat (spec 043): what a late cancellation costs (handled outside the app, by product decision),
  cancelling several seats at once, undoing a cancellation (the student requests again), and releasing the seats
  and requests of a removed account or of a student promoted to instructor (their specs reuse the same release). On
  direct enrolment and taking out (spec 044): taking a student out after the class starts, moving a student between
  classes, enrolling several students at once, and enrolling from a class's details. On guests (spec 045):
  editing a guest's name or number, listing a person's past trials, showing a guest's WhatsApp number anywhere in
  the app, and turning a guest into a student; messaging guests and linking a guest to a later account are never
  done, by product decision. On the waiting-list switch (spec 046): turning the waiting list on or off per class,
  ending the waiting requests when it is turned off, recording who changed a school setting, and an open class's
  details following a switch turned back on (it shows at the next opening).
- Items shown in the designs but not specified, to be decided by the spec that takes them up: class names (e.g. "Ondas da Manhã"); a message from an admin to one class;
  notes on registrations and enrolment requests; an "also an instructor" option when promoting someone to
  admin.

## Source documents

- `.docs/user-journeys.md` — the product brief: user journeys per role, platform rules, out of scope.
- `.docs/requirements.md` — the detailed requirements by area (accounts, notifications, scheduling,
  enrolment, ratings and photos, public web pages), each with testable scenarios.
- `.docs/designs/design-system.html` — the design system: colors, typography, components and usage rules.
- `.docs/designs/auth-flow.html` — the designs of the sign-in screens.
