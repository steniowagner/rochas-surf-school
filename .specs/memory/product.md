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
    admin. Both cancel the user's upcoming seats, pending enrolments and class assignments.
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
  their students and instructors. As built (spec 028), a location has only a name (1–40 characters, unique
  ignoring case and accents) and an address (free text, 1–200 characters); admins create it, every approved
  account lists it, and the map position, editing and archiving don't exist yet.
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
    instructors; instructors hear when they are assigned or unassigned; students and instructors get a reminder
    30 minutes before it starts (not when cancelled).
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
  discipline without a rule gets no deadline and nothing is sent. Every role sees "Cancelamento até <dia, data
  · hora>" on a class's details; admins see the "Sem prazo" flag. Cancelling a seat until the deadline arrives
  with enrolment.
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
- **Seat**: not stored on its own — a class's **seats taken** are its approved enrolments plus its guests,
  shown with the capacity to everyone who sees the class.
- **Guest** (`guest`): someone without an account trying surf or skate, put into one class by an admin. Key
  fields: name, WhatsApp number. Takes a seat; only in a class that hasn't started and has a free seat. Gets
  nothing from the app; admins are warned of that when they edit or cancel a class with guests. Shown as
  "Trial" to everyone except admins and the class's instructors. Never linked to an account the person creates
  later. Its name and WhatsApp number are erased 30 days after the class finishes or is cancelled; the seat
  then shows "Trial" to everyone.
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
  unless the user turned pushes off. Pushes are the only outbound channel.
- **Broadcast** (`broadcast`): a notification an admin writes (title and description) for an audience —
  `everyone` (admins included), `students` or `instructors` — reaching the approved, active users of those
  roles. The admin sees the number of recipients and confirms before it is sent.
- **People directory**: not a concept of its own — the list of every approved user of any role, the viewer
  included (name, photo, role, member since, and the WhatsApp number when its owner shares it or the viewer is an
  admin), always sorted A–Z by name ignoring case and accents, 20 at a time. It is searched by name (ignoring case
  and accents) and filtered by any number of roles (a user with one of the chosen roles is listed; none chosen means
  everyone). Opening a person offers a WhatsApp chat, in WhatsApp on the viewer's own phone, whenever the viewer
  may see the number — so admins can chat with anyone who has a number.

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
  (reactivation requests): each shows a card per pending item with Deny and Approve, a "Decided just now" list,
  and a sheet for the denial reason.

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
version. Every add, edit or delete raises the version by one; reordering and an unchanged save don't. Only the
backend exists: no screen shows or manages the rules yet.

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
School tools home, "Join the school" and the Profile tab included, and the admin's school rules screen), reloading the account when the app returns from the
background (a rule change or an admin's decision is seen at the next launch or session renewal), and Apple sign-in
don't exist yet.

**The school's WhatsApp number on the backend** (spec `015-school-settings-whatsapp`) — an approved admin sets
the school's WhatsApp number through the backend, with its country code and no spaces or other characters (the
same shape as a user's number); it can be replaced but never emptied, and the last save wins. Any signed-in
account, whatever its role or status, reads it (nothing until one is set), so denied and removed accounts can
use it. No screen sets the number yet (the admin's settings screens); the Denied and Access removed screens use
it (spec 016). The waiting-list switch of the school settings isn't built.

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
registrations are waiting. The tool lists a card per pending account, oldest first, with initials, name, email
and when the person asked ("Asked just now", a relative time, then the date after a week), and Deny and Approve.
Approve acts at once; Deny opens a sheet with an optional reason of up to 500 characters, shown to the person on
the Denied screen exactly as written (trimmed; a blank reason counts as none). A decided card leaves the list and
the person appears under "Decided just now" with "Approved" or "Denied" — newest first, only for the current
visit to the tool. Every decision is final: a registration already decided, by another admin or at the same
moment, is refused, and the app says "This registration was already decided." and reloads the list. Only an
approved admin may list or decide registrations; a pending account of any role is one. The person is told of the
decision by a push (spec 020), and otherwise sees it at the next launch, sign-in or session renewal. The card, the "Decided just now" list and the
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
until someone signs in on it. The notifications screen (with read state) doesn't exist yet: the stored
notifications aren't shown anywhere. The in-app push switch came with the Profile tab (spec 026). Delivery to a real phone needs the EAS project and the APNs / FCM credentials, which aren't set up yet.

**Denied registrations are erased** (spec `021-denied-registration-erasure`) — 30 days after an admin denies a
registration, the account is erased with everything it has (its sign-ins, sessions, rules acceptances,
notifications and phones), together with the admins' "new registration" notifications that carry the person's
name. Nothing else is kept and nobody is told. The same email address can then sign up again, by email code or
Google, as a new registration waiting for approval; a phone still signed in to the erased account gets the
existing "session expired" handling. Deleted and removed accounts are not erased yet, nor is guest data.

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
tools") was a placeholder (spec 027 then filled the student's Escola and the instructor's Início, and spec 030 the
student's Agenda and the Aulas tab) with its name; inner screens such as "Join the school" open above the tab bar,
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
message. Deleting the account takes the person off their classes that haven't started (spec 035, below); it
doesn't yet refuse the only admin, nor cancel seats or enrolments (none exist yet). All copy is in pt-BR, es-ES
and en-US.

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
(with "Ao salvar, avisamos os instrutores da aula.") is enabled only when something changed and the form is
valid; on success "Alterações salvas" and back to the details, with the week and the details reloaded; each
refusal has its own message (started — the screen switches to the instructors only —, finished, gone, past,
seats taken, unknown instructor or location). Saving without a change does nothing and tells nobody. The
instructors are told, never the admin who edits: the ones who stay get "Aula alterada" when a class field
changed, the new ones "Novas aulas na sua escala", the removed ones "Você saiu de uma aula"; tapping one of the
first or last opens that class's details, and one received with the app open reloads the classes. All copy is in
pt-BR, es-ES and en-US.

**Cancelling a class** (spec `033-class-cancellation`) — an approved admin cancels a class any time before it
finishes, a started one included, with an optional message (up to 300 characters, shown exactly as written, e.g.
"Mar muito grande."). The admin's tools for one class sit behind a round tools button in the header of its
details, where the pencil was (admins only; hidden on a finished or cancelled class): the "Ferramentas da aula"
sheet holds "Editar aula" (opens the editor), "Avisar alunos e instrutores" (drawn, does nothing yet) and
"Cancelar aula". The last opens "Cancelar esta aula?" with "Mensagem (opcional)" and its counter, "Cancelar e
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
class can only be cancelled; finished and cancelled classes show no tools). It opens "Excluir esta aula?" with the
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
every role, a card with no instructor says "Sem instrutor" in its footer and the details say "Sem instrutor
atribuído". Every other approved admin is told once per deletion ("Aula sem instrutor", or "N aulas ficaram sem
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
nobody is notified. Every role sees "Cancelamento até seg, 19 out · 20:00" on the details of a class that has a
deadline and isn't cancelled. The site's privacy policy names Anthropic as the service that works out the
deadline. All copy is in pt-BR, es-ES and en-US.

Active specs: none.

## Out of scope (future evolution, recorded in the specs)

- Accounts for children — all students are assumed to be adults.
- Payments and credits.
- WhatsApp messages sent by the app, and email notifications.
- Saved lists of time ranges.
- Undoing admin decisions.
- A stored history of registration decisions (who decided, when an account was approved): "Decided just now"
  lasts only for the admin's visit to the tool (spec 019); and searching, filtering or paging the registrations.
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
- The notifications screen (with read / unread state): spec 020 stores every notification but nothing shows
  them; badges on the app icon, rich pushes, and a screen before the OS
  permission dialog (or asking again after a refusal).
- Erasing deleted and removed accounts 30 days after the deletion or removal (with the "Former student" /
  "Former instructor" handling), and erasing guest data: spec 021 erases only denied registrations.
- Deploying the public site (host and domain), linking the privacy policy from the store listings, the onboarding
  line linking the terms and the policy, a report button for objectionable content, the
  legal (LGPD) review of the pages' copy, and a light/dark
  switch on the site (it follows the system theme).
- On the Profile (spec 026): uploading or changing the profile photo (the camera button says "coming soon"),
  splitting the name into first and last name, real data in the
  About sheet (mocked), keeping the theme, language and push preferences on the account or syncing them across
  phones, and, when a person deletes their account, refusing the only admin and cancelling their seats and
  pending enrolments (with enrolment).
- On the People directory (spec 027): profile photos (initials only), class counts and the "Acesso total" /
  "Dono da escola" subtitles on the rows, the removed accounts section with "Restaurar", promoting, demoting or
  removing someone from their sheet, searching by email, the real count on the home rows (a fixed "9 na
  plataforma" until the backend can give it), and the rest of the admin and instructor dashboards (greeting,
  bell, metrics and every other row).
- A daily limit on the sign-in codes sent to one email address (spec 001 limits codes per network address
  only).
- After creating classes (spec 028): the map, address suggestions, editing and archiving of locations and the
  location-change notification (the class-locations spec); the instructors' "Surf" / "Skate" subtitles and photos
  in the picker; a real count on the "Criar aulas" row; and "My classes" for admins who teach.
- On the week view and class details (spec 030): "My classes" for instructors and admins who teach, with the next
  class highlighted, and a marker on the cards of one's own classes; seats taken, the occupancy bar, "Sem vagas" /
  "Turma cheia", the list of students and the request / waiting-list button (with enrolment); the cancellation-rule and school-rules rows, the map, "Direções"
  and the weather on the details; "Depois da aula" (photos and ratings); the student Agenda's sport filter and
  notifications bell; opening a person's sheet from the details, and profile photos (initials only).
- On editing a class (spec 032): telling its students and the people with pending requests, and warning the
  admin about guests (with enrolment); editing several classes at once; the seat and pending-request counts in the editor's
  footer note, and its "gerir" links to manage time ranges and locations.
- On cancelling a class (spec 033): telling its students and the people with pending requests, ending their
  enrolments as `class cancelled`, and warning the admin about guests (with enrolment); storing who cancelled it,
  restoring a cancelled class and editing its message; what "Avisar alunos e instrutores" in the class tools does
  (a message to a class's people, its own spec); the enrolled and pending counts on the cancel sheet.
- On deleting a class (spec 034): counting real seats and pending requests, and guests (with enrolment — until
  then a class is always empty); the seat and pending-request counts on the confirmation sheet; deleting several
  classes at once; restoring a deleted class or keeping any record of it.
- On classes left without an instructor (spec 035): releasing the classes when an instructor is demoted to
  student or an account is removed (their specs reuse the same step); telling the students of a class that lost
  its instructor (with enrolment); a list or filter of the classes without an instructor.
- On cancellation rules and deadlines (spec 036): showing the rule and requiring its acceptance when a student
  requests a seat, cancelling a seat until the deadline, and telling a student without a deadline to contact the
  school (with enrolment); notifying anyone about rules, deadlines or the flag; keeping the text of past rules or
  showing who saved a rule; a list or filter of the classes without a deadline, and admins setting a deadline by
  hand; recomputing deadlines when a location's name or address changes (locations can't be edited yet).
- On the week and month calendar (spec 031): swiping between weeks or months (only the arrows move), an animation
  when the view switches, remembering the chosen view after leaving the screen, and using the calendar on other
  screens.
- Items shown in the designs but not specified, to be decided by the spec that takes them up: weather and sea
  conditions on class details; class names (e.g. "Ondas da Manhã"); a message from an admin to one class;
  notes on registrations and enrolment requests; an "also an instructor" option when promoting someone to
  admin.

## Source documents

- `.docs/user-journeys.md` — the product brief: user journeys per role, platform rules, out of scope.
- `.docs/requirements.md` — the detailed requirements by area (accounts, notifications, scheduling,
  enrolment, ratings and photos, public web pages), each with testable scenarios.
- `.docs/designs/design-system.html` — the design system: colors, typography, components and usage rules.
- `.docs/designs/auth-flow.html` — the designs of the sign-in screens.
