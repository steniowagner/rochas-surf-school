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
person sees depends on their role. The only web surface is a small public site with the privacy policy and the
account-deletion page, for the app stores and for people without the app.

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
  not one of the three), theme (light/dark, follows the phone until chosen) and phone pushes (on/off).
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
  that provides the same email opens the same account. The name shared by Google or Apple becomes the
  account's name; email-code sign-ups type their name after entering a correct code, and the account is
  created (as a pending student) only then.
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
- **School rules** (`school-rules`): the rules every user accepts at onboarding, written by admins. Versioned:
  when admins change them they choose whether the new version must be accepted again; if so, each user accepts
  it the next time they open the app (no notification). Each user's acceptances are kept per version. A
  returning (reactivated or restored) account accepts again if a required change happened while it was away.
  Anyone can read them at any time.
- **School settings** (`school-settings`): the school-wide switches admins control — the school's WhatsApp
  number (used by every contact-the-school button) and the waiting list (on by default).
- **Cancellation rule** (`cancellation-rule`): free text written by admins, one for surf and one for skate,
  saying until when a student may cancel a seat. Readable by everyone at any time; a student accepts the rule
  of the class's discipline when requesting a seat. Saved as written, with no check of its wording.
- **Location** (`location`): a saved place where classes happen. Key fields: name, address, position on a map.
  Relationship: a class has one location; a location has many classes. Lifecycle: `active` → `archived`
  ("removing" it archives it: no longer offered, kept by the classes that used it). Editing it changes every
  class that uses it, past ones included; if upcoming classes use it, the admin chooses whether to notify
  their students and instructors.
- **Class** (`class`): one surf or skate session at one date and time. Key fields: discipline (`surf` |
  `skate`), level (`beginner` | `advanced` | `expert` — a label only), date, start and end time, location,
  instructors (at least one; instructors or admins), capacity, notes (optional, max 300 characters, visible to
  everyone), cancellation deadline. Relationships: one location; one or more instructors; many enrolments,
  guests, ratings, instructor comments and photos. Created one at a time or in a **batch** (a date range, a
  weekday filter and one or more non-overlapping time ranges, each ending after it starts; one class per day
  and time range, all sharing the other fields) — the batch only exists while creating: afterwards each class
  is edited on its own. The form suggests the time ranges of the previous week's classes. No class starts in
  the past. Lifecycle, by the clock:
  - `not started` → `started` (at its start time) → `finished` (at its end time), with nobody acting.
  - `not started`: can be edited (never into the past), cancelled, or deleted — deleted only when nobody has
    an enrolment or a guest in it (instructors are notified). Capacity can't go below the seats taken.
  - `started`: only cancelling and changing instructors; pending enrolments expire.
  - `finished`: frozen; ratings, instructor comments and photos can be added. Can't be cancelled.
  - `cancelled` (by an admin, any time before it finishes, with an optional message): final; never restored.
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
  to contact the school.
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
- **People directory**: not a concept of its own — the list of approved, active users (name, photo, role, and
  the WhatsApp number when shared), searchable by name and filterable by role. Admins can open a WhatsApp chat
  with any user from their profile, in WhatsApp on the admin's own phone.

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
- **Guests get nothing from the app and leave no trace**: no notifications, no link to a later account, and
  their name and WhatsApp number are erased 30 days after their class.
- **One account per email address, and the email never changes**: every sign-in method with the same email
  opens the same account; there are no passwords.
- **Five wrong guesses lock a sign-in code, review accounts included**: a 6-digit code is guessable, and the
  admin review account has a fixed code; a new code (after the 30-second wait) unlocks it.
- **The sign-in email is the one text the backend writes in the user's language**: email can't be translated
  by the app, so its three versions live in the backend, chosen by the language on the sign-in screen.
- **Pushes are the only notification channel**: no email (except the sign-in code) and no WhatsApp messages.
  Turning pushes off never hides notifications from the notifications screen.
- **Text written by admins is shown as written**: school rules, cancellation rules, notes, reasons and
  broadcasts aren't translated; they're assumed to be Brazilian Portuguese.
- **All times are America/Fortaleza, whatever the phone's time zone; weeks run Monday to Sunday.**
- **The level is a label only**: it never restricts who can request a class.
- **A batch isn't kept**: it only exists while creating classes; each class is edited on its own, and time
  ranges are suggested from the previous week's classes rather than from a saved list.
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

Before the spec workflow, groundwork was laid without a spec: the monorepo with the backend, mobile and web
apps, the design tokens shared by web and mobile, and the domain of user accounts and sign-in identities with
its storage. The mobile and web apps are still on their framework templates: no screen of the product works
yet, so the email sign-in can't be used from the app. Renewing a session, signing out, and Google and Apple
sign-in don't exist yet.

No spec is active.

## Out of scope (future evolution, recorded in the specs)

- Accounts for children — all students are assumed to be adults.
- Payments and credits.
- WhatsApp messages sent by the app, and email notifications.
- Saved lists of time ranges.
- Undoing admin decisions.
- Reporting comments or photos.
- Translating text written by admins.
- Checking a cancellation rule's wording when it's saved.
- An admin dashboard with metrics (classes per day, occupancy, average ratings, a ratings list); each class
  already shows its seats taken and ratings.
- A terms-of-use page; the school rules play that role inside the app.
- A daily limit on the sign-in codes sent to one email address (spec 001 limits codes per network address
  only).
- Items shown in the designs but not specified, to be decided by the spec that takes them up: weather and sea
  conditions on class details; class names (e.g. "Ondas da Manhã"); a message from an admin to one class;
  notes on registrations and enrolment requests; an "also an instructor" option when promoting someone to
  admin.

## Source documents

- `.docs/user-journeys.md` — the product brief: user journeys per role, platform rules, out of scope.
- `.docs/requirements.md` — the detailed requirements by area (accounts, notifications, scheduling,
  enrolment, ratings and photos, public web pages), each with testable scenarios.
- `.docs/designs/design-system.html` — the design system: colors, typography, components and usage rules.
- `.docs/designs/login-pages.html` — the designs of the sign-in screens.
