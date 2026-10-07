# Rocha's Surf School — Requirements

The detailed requirements of the app, area by area. They refine the product brief in
[user-journeys.md](user-journeys.md): each area says why it exists, what it covers and what it depends on,
then lists its requirements, each with the scenarios that make it testable. Specs in `.specs/` are planned
from them.

Requirements use **SHALL** for what the app must do and **SHALL NOT** for what it must not. All times are in
the America/Fortaleza time zone.

## Contents

1. [Accounts and access](#1-accounts-and-access)
   - [1.1 User authentication](#11-user-authentication)
   - [1.2 Account lifecycle](#12-account-lifecycle)
   - [1.3 User profiles](#13-user-profiles)
   - [1.4 User roles](#14-user-roles)
   - [1.5 School rules](#15-school-rules)
2. [Notifications and preferences](#2-notifications-and-preferences)
   - [2.1 Notifications](#21-notifications)
   - [2.2 App preferences](#22-app-preferences)
3. [Class scheduling](#3-class-scheduling)
   - [3.1 Class scheduling](#31-class-scheduling)
   - [3.2 Class locations](#32-class-locations)
4. [Class enrolment](#4-class-enrolment)
   - [4.1 Class enrolment](#41-class-enrolment)
   - [4.2 Cancellation rules](#42-cancellation-rules)
5. [Ratings and photos](#5-ratings-and-photos)
   - [5.1 Class ratings](#51-class-ratings)
   - [5.2 Class photos](#52-class-photos)
6. [Public web pages](#6-public-web-pages)
   - [6.1 Public web pages](#61-public-web-pages)

## 1. Accounts and access

Rocha's Surf School needs a mobile app (Android and iOS) where students, instructors and admins manage surf and skate classes. Every other feature sits behind signing in and being approved by the school, so accounts, roles and the school rules come first. The requirements come from the product brief in [user-journeys.md](user-journeys.md), refined during exploration.

**What it covers**

- Sign-in with Google, Apple (iOS only) or a 6-digit code sent by email, on one screen that both signs in and signs up, with one account per email address.
- Admin approval of every registration, with a reason when denied, and onboarding (WhatsApp number and school rules) after approval.
- Account deletion with a 30-day reactivation window, one reactivation request per account, removal and restoration by admins, and erasure of personal data when the window ends.
- Profiles (photo, name, WhatsApp number with a visibility setting) and a directory of approved users.
- Student, instructor and admin roles, promotions and demotions, and a guarantee that at least one admin always exists.
- School rules managed by admins and accepted by users, with optional re-acceptance after a change.
- Pre-approved review accounts for App Store and Google Play reviewers.

**Capabilities**

- [User authentication](#11-user-authentication): signing in and out, the sign-in methods, one account per email address, and review accounts.
- [Account lifecycle](#12-account-lifecycle): registration approval and denial, onboarding, account deletion, reactivation, removal and restoration by admins, and erasure.
- [User profiles](#13-user-profiles): editing one's own profile, WhatsApp number visibility, and the user directory.
- [User roles](#14-user-roles): the student, instructor and admin roles, promotions and demotions, and the last-admin rule.
- [School rules](#15-school-rules): managing the school rules and users accepting them.

**Dependencies and constraints**

- External services: Google and Apple sign-in, an email service for sign-in codes, and push notifications for approval results.
- Builds together with [Notifications and preferences](#2-notifications-and-preferences), which delivers the notifications these flows send.
- Personal data (name, email, photo, WhatsApp number) falls under LGPD. Deletion and erasure follow the App Store and Google Play account-deletion rules.
- Out of scope: accounts for children (all students are assumed to be adults for now), WhatsApp messages sent by the app, and undoing admin decisions (mistakes go to the system administrators).

### 1.1 User authentication

Lets people sign in to the app with the method they prefer while keeping exactly one account per email address.

#### Sign-in methods

The app SHALL let people sign in with Google or a 6-digit code sent to their email address. On iOS, the app SHALL also offer Sign in with Apple. The same screen SHALL serve both signing in and signing up.

- _First sign-in creates an account:_ When a person without an account signs in with any available method, then the system creates an account for them.
- _Sign in with Apple on iOS:_ When the app runs on iOS, then Sign in with Apple is offered alongside the other methods.
- _No Sign in with Apple on Android:_ When the app runs on Android, then Sign in with Apple is not offered.

#### Email code sign-in

The system SHALL send a 6-digit code to the email address a person enters and SHALL sign them in only when they enter that code. Signing in SHALL NOT require a password.

- _Correct code:_ When a person enters the 6-digit code sent to their email address, then they are signed in.
- _Wrong code:_ When a person enters a code that does not match the one sent, then they are not signed in.

#### Code expiry and resending

A sign-in code SHALL expire 10 minutes after it is sent. A person SHALL be able to request a new code once 30 seconds have passed since the previous one was sent, and not sooner.

- _Expired code:_ When a person enters a code more than 10 minutes after it was sent, then they are not signed in, and they can request a new code.
- _Requesting a new code:_ When 30 seconds have passed since the last code was sent, then the person can request a new code.
- _Requesting a new code too soon:_ When a person tries to request a new code less than 30 seconds after the previous one was sent, then no new code is sent.

#### One account per email address

The system SHALL keep one account per email address. Signing in with any method that provides the same address SHALL open the same account.

- _Same address, different method:_ When a person who signed up with Google later signs in with an email code sent to the same address, then they reach the account they created with Google.

#### Fixed email address

An account's email address SHALL NOT change after the account is created.

- _Editing the profile:_ When a user edits their profile, then they cannot change their email address.

#### Signing out

Users SHALL be able to sign out.

- _Sign out:_ When a signed-in user signs out, then the app returns to the sign-in screen.

#### Review accounts

The system SHALL provide one pre-approved review account for each role (student, instructor and admin), so App Store and Google Play reviewers can use the app. Each review account SHALL sign in with a fixed code that works only for that account's email address.

- _Reviewer signs in:_ When a reviewer enters a review account's email address and its fixed code, then they are signed in to an approved account with that role.
- _Fixed code used with another address:_ When someone enters a review account's fixed code for any other email address, then they are not signed in.

### 1.2 Account lifecycle

Covers an account from registration to erasure: admin approval, onboarding, deletion, reactivation, and removal by admins.

#### Registrations wait for approval

A new account SHALL wait for an admin's approval before its user can use the app. While waiting, the user SHALL only see that their account is waiting for approval.

- _New account:_ When a person signs up, then they see that their account is waiting for approval, and they cannot see classes or any other part of the app.

#### Name before approval

Every new account SHALL have a name before it waits for approval. The system SHALL use the name shared by Google or Apple when available, and SHALL ask the person to type one otherwise.

- _Email code sign-up:_ When a person signs up with an email code, then they are asked for their name before their account waits for approval.
- _Name shared by the sign-in method:_ When a person signs up with a method that shares their name, then that name is used for the account.

#### Admins decide registrations

Admins SHALL approve or deny each pending registration. When denying, the admin SHALL be able to write a reason, which is sent to the person. A decision SHALL be final in the app.

- _Registration approved:_ When an admin approves a pending registration, then the account is approved.
- _Registration denied with a reason:_ When an admin denies a pending registration and writes a reason, then the account is denied, and the reason is sent to the person.

#### Admins are told about new registrations

The system SHALL notify admins when a new registration is waiting for approval.

- _Someone signs up:_ When a new account starts waiting for approval, then every admin is notified.

#### People are told the result of their registration

The system SHALL notify a person when their registration is approved or denied, including the reason when one was given.

- _Approval notification:_ When an admin approves a registration, then the person is notified that they can start using the app.
- _Denial notification:_ When an admin denies a registration with a reason, then the person is notified of the denial and its reason.

#### Denied registration screen

A person whose registration was denied SHALL see the denial, with its reason when one was given, and a button that opens WhatsApp on their phone with a chat to the school's number.

- _Denied person opens the app:_ When a person whose registration was denied opens the app, then they see the denial and its reason, and they can open a WhatsApp chat with the school.

#### School WhatsApp number

Admins SHALL be able to set the school's WhatsApp number, which every contact-the-school button in the app uses.

- _Admin changes the number:_ When an admin sets a new school WhatsApp number, then contact-the-school buttons open a chat with that number.

#### Denied registrations are erased

The system SHALL erase a denied registration's data 30 days after the denial. After that, the same email address SHALL be able to sign up again as a new registration.

- _Signing up again after erasure:_ When a person whose registration was denied more than 30 days ago signs in with the same email address, then a new registration is created and waits for approval.

#### Onboarding after approval

After their registration is approved, and before using the rest of the app, users SHALL add their WhatsApp number and accept the school rules.

- _First use after approval:_ When an approved user opens the app for the first time, then they are asked for their WhatsApp number and to accept the school rules, and they can continue only after doing both.

#### Deleting an account

Users SHALL be able to delete their account after a confirmation step. Deleting SHALL close the account immediately and cancel the user's upcoming class seats, pending requests and class assignments.

- _Confirmed deletion:_ When a user confirms they want to delete their account, then their account is closed and they are signed out, and their upcoming seats, pending requests and class assignments are cancelled.

#### Reactivation window

A deleted account SHALL be reactivatable for 30 days after its deletion. When the 30 days end, the system SHALL erase the account.

- _Window ends:_ When 30 days pass after an account was deleted and it has not been reactivated, then the system erases the account.

#### Erasure

When the system erases an account, it SHALL remove the account's name, email address, photo and WhatsApp number, and delete its comments. Its star ratings SHALL remain without a name, and photos and class lists SHALL show "Former student" in its place, or "Former instructor" when the account was an instructor or an admin. The email address SHALL then be free to sign up again.

- _After erasure:_ When an account has been erased, then class lists and photos show "Former student" in its place, and its comments no longer appear and its star ratings remain without a name.
- _Erased instructor:_ When the account of an instructor or an admin has been erased, then the classes they taught and the photos they uploaded show "Former instructor" in its place.
- _Same email address signs up again:_ When someone signs in with the email address of an erased account, then a new registration is created and waits for approval.

#### Account deleted screen

Signing in with a deleted account during its reactivation window SHALL show an "Account deleted" screen that offers to request reactivation or to sign in with another email address.

- _Deleted user signs in:_ When a person signs in with an account deleted less than 30 days ago, then they see the "Account deleted" screen with both options.

#### One reactivation request

A deleted account SHALL be able to send one reactivation request, from the app. Once that request is denied, the account SHALL NOT be able to request reactivation again.

- _Request sent:_ When a person on the "Account deleted" screen requests reactivation, then the request is sent to the admins.
- _Returning after a denial:_ When a person whose reactivation request was denied returns to the "Account deleted" screen, then the screen says the request was denied, and the only option offered is signing in with another email address.

#### Admins decide reactivation requests

The system SHALL notify admins of each reactivation request. Admins SHALL approve or deny it, seeing the person's name, email address, deletion date and number of classes taken. The person SHALL be notified of the decision.

- _Admin reviews a request:_ When a reactivation request arrives, then admins are notified, and the request shows the person's name, email address, deletion date and number of classes taken.
- _Decision notified:_ When an admin approves or denies a reactivation request, then the person is notified of the decision.

#### What reactivation restores

Approving a reactivation request SHALL restore the account, its history and its role. It SHALL NOT restore the seats, pending requests or class assignments cancelled when the account was deleted.

- _Reactivated student:_ When an admin approves the reactivation of a student who had upcoming seats when they deleted their account, then the student can use the app again with their history and role, and their cancelled seats are not restored.

#### Removal by admins

Admins SHALL be able to remove a user. Removing SHALL close the account and cancel its upcoming seats, pending requests and class assignments, as deleting does. A removed user SHALL see that their access was removed and a button to contact the school on WhatsApp, and SHALL NOT be able to request reactivation.

- _Removed user signs in:_ When a user removed by an admin signs in, then they see that their access was removed and can open a WhatsApp chat with the school, and they cannot request reactivation.

#### Restoring a removed account

Admins SHALL be able to restore a removed account within 30 days of its removal, bringing back what an approved reactivation brings back. When the 30 days end, the system SHALL erase the account as it erases deleted accounts.

- _Restored within the window:_ When an admin restores an account removed less than 30 days ago, then the user can use the app again with their history and role.
- _Removal window ends:_ When 30 days pass after a removal without a restore, then the system erases the account.

### 1.3 User profiles

Lets users manage their own profile and see the other members of the school.

#### Editing one's profile

Users SHALL be able to change their profile photo, name and WhatsApp number. The WhatsApp number SHALL NOT be left empty.

- _User changes their name:_ When a user changes their name, then the new name is shown wherever their name appears in the app.
- _Clearing the WhatsApp number:_ When a user removes their WhatsApp number and tries to save their profile, then the change is not saved.

#### WhatsApp number format

WhatsApp numbers SHALL include a country code, with Brazil (+55) preselected.

- _Brazilian number:_ When a user types a number without changing the country, then the number is saved with the +55 country code.
- _Foreign number:_ When a user picks another country and types their number, then the number is saved with that country's code.

#### WhatsApp number visibility

Users SHALL choose whether other users can see their WhatsApp number, and the number SHALL be hidden by default. Admins SHALL always see every user's WhatsApp number.

- _Default visibility:_ When a user has not changed the visibility setting, then only admins can see their WhatsApp number.
- _User shares their number:_ When a user chooses to share their WhatsApp number, then every user can see it on their profile and in the directory.

#### Contacting a user on WhatsApp

Admins SHALL be able to open a WhatsApp chat with any user from that user's profile. The chat SHALL open in WhatsApp on the admin's own phone; the app SHALL NOT send WhatsApp messages itself.

- _Admin contacts a user:_ When an admin taps the WhatsApp button on a user's profile, then WhatsApp opens on the admin's phone with a chat to that user's number.

#### User directory

The app SHALL show users a directory of approved, active users, with each user's name, photo and role, and their WhatsApp number when they share it. Pending, denied, deleted and removed accounts SHALL NOT appear in it.

- _Pending account:_ When an account is waiting for approval, then it does not appear in the directory.
- _Shared number:_ When a user shares their WhatsApp number, then their directory entry shows it.

#### Directory search and filter

Users SHALL be able to search the directory by name and filter it by role.

- _Search by name:_ When a user searches the directory for a name, then only users whose name matches are listed.
- _Filter by role:_ When a user filters the directory by the instructor role, then only instructors are listed.

### 1.4 User roles

Defines the student, instructor and admin roles, what sets them apart, and how admins change a user's role.

#### One role per user

Every user SHALL have exactly one role: student, instructor or admin. New accounts SHALL start as students.

- _Newly approved account:_ When a registration is approved, then the user has the student role.

#### Only students take classes

Only students SHALL be able to request or hold seats in classes. Instructors and admins SHALL NOT request or hold seats.

- _Instructor views a class:_ When an instructor or an admin views a class, then they cannot request a seat in it.

#### Admins can teach

Admins SHALL be able to teach classes, and SHALL see the classes they teach among their own classes, as instructors do.

- _Admin assigned to a class:_ When an admin is assigned to teach a class, then the class appears among that admin's own classes.

#### Promoting users

Admins SHALL be able to make a student an instructor, and make any user an admin. Promoting a student SHALL cancel their upcoming seats and pending requests.

- _Student promoted:_ When an admin promotes a student with upcoming seats to instructor, then the user becomes an instructor, and their upcoming seats and pending requests are cancelled.

#### Demoting instructors

Admins SHALL be able to demote an instructor to student. The demoted user SHALL be removed from the classes they teach that have not started, and SHALL stay on the other classes they taught.

- _Instructor demoted:_ When an admin demotes an instructor who teaches upcoming classes and has taught past ones, then the user becomes a student, and they are removed from the upcoming classes and stay on the past ones.

#### Changing admins

Admins SHALL be able to change another admin's role or remove another admin.

- _Admin made an instructor:_ When an admin changes another admin's role to instructor, then that user becomes an instructor.

#### At least one admin

The system SHALL always keep at least one admin. The only admin SHALL NOT be demoted or removed, and SHALL make someone else an admin before deleting their own account.

- _Only admin tries to delete their account:_ When the only admin tries to delete their account, then they are told to make someone else an admin first, and the account is not deleted.
- _Demoting the only admin:_ When anyone tries to demote or remove the only admin, then the change is refused.

#### Role change notification

The system SHALL notify users when their role changes. When a promotion cancels a student's seats and pending requests, the notification SHALL say so.

- _Promotion notified:_ When an admin promotes a student who had upcoming seats, then the user is notified of their new role, and the notification says their seats and pending requests were cancelled.

### 1.5 School rules

Lets admins keep the school rules up to date and makes sure users accept the rules that apply to them.

#### Managing the school rules

Admins SHALL be able to add, edit and remove school rules.

- _Admin adds a rule:_ When an admin adds a school rule, then the rule appears in the school rules.

#### Accepting the rules

Users SHALL accept the school rules after their registration is approved and before using the rest of the app.

- _Newly approved user:_ When a newly approved user opens the app, then they must accept the school rules before continuing.

#### Reading the rules

Users SHALL be able to read the school rules at any time.

- _Reading the rules later:_ When a user opens the school rules in the app, then they see the current rules.

#### Accepting again after a change

When admins change the school rules, they SHALL choose whether users must accept the new version. If they must, each user SHALL accept it the next time they open the app, before continuing. The change SHALL NOT send a notification.

- _Change that needs acceptance:_ When an admin changes the rules and requires acceptance, then each user is asked to accept the new rules the next time they open the app.
- _Change that doesn't need acceptance:_ When an admin changes the rules without requiring acceptance, then users are not asked to accept them again.

#### Rule changes while an account was away

A reactivated or restored account SHALL accept the school rules again if a change that required acceptance happened while it was deleted or removed.

- _Rules changed while deleted:_ When an account is reactivated after a rule change that required acceptance, then the user must accept the current rules before continuing.

## 2. Notifications and preferences

Users need to hear about approvals, enrolments and class changes, and to use the app in their language and preferred theme. Push notifications are the app's only outbound channel (no email or WhatsApp messages), so delivering them and keeping them on a notifications screen is shared groundwork for every other change.

**What it covers**

- Every notification is delivered as a push and kept on an in-app notifications screen, where users mark one or all as read.
- A notifications setting that only turns phone pushes on or off.
- Admin broadcasts to everyone, students only or instructors only, with a title, a description, the recipient count and a confirmation step.
- Language (Brazilian Portuguese, Spanish or English) and theme (light or dark) that follow the phone until the user changes them, with Brazilian Portuguese as the fallback language.

**Capabilities**

- [Notifications](#21-notifications): delivery as a push plus the notifications screen, read state, the push setting, and admin broadcasts.
- [App preferences](#22-app-preferences): the app's language and theme.

**Dependencies and constraints**

- Push notification services for iOS and Android.
- The notifications each event sends are specified by the capability that owns the event, for example [Account lifecycle](#12-account-lifecycle) or [Class enrolment](#41-class-enrolment). This area defines how notifications are delivered and shown.
- Builds together with [Accounts and access](#1-accounts-and-access), which is the first area to send notifications.
- Out of scope: email and WhatsApp notifications, and translating text written by admins.

### 2.1 Notifications

Delivers every notification as a push and keeps it on an in-app notifications screen, and lets admins broadcast messages to groups of users.

#### Push delivery

The system SHALL deliver notifications as pushes to the user's phone. It SHALL NOT send notifications by email or WhatsApp.

- _Notification sent:_ When an event notifies a user who allows pushes, then the user receives a push on their phone.

#### Notifications screen

Every notification SHALL also appear on an in-app notifications screen, whether or not its push was shown.

- _Push not shown:_ When a user who turned pushes off is notified, then the notification appears on their notifications screen.

#### Read state

Users SHALL be able to mark a notification as read, and mark all their notifications as read at once.

- _Mark one as read:_ When a user marks a notification as read, then that notification no longer shows as unread.
- _Mark all as read:_ When a user marks all notifications as read, then none of their notifications show as unread.

#### Push setting

Users SHALL be able to turn phone pushes on or off. Turning them off SHALL only stop pushes on the phone, not notifications on the notifications screen.

- _Pushes turned off:_ When a user turns pushes off, then they stop receiving pushes on their phone, and new notifications still appear on their notifications screen.

#### Broadcasts

Admins SHALL be able to send a notification with a title and a description to everyone, to students only, or to instructors only. Audiences SHALL follow roles, "everyone" SHALL include admins, and only approved, active users SHALL receive broadcasts.

- _Broadcast to students:_ When an admin sends a broadcast to students only, then every approved, active student is notified, and instructors and admins are not.
- _Broadcast to everyone:_ When an admin sends a broadcast to everyone, then every approved, active student, instructor and admin is notified.

#### Broadcast confirmation

Before a broadcast is sent, the admin SHALL see how many users will receive it and SHALL confirm sending it.

- _Admin reviews the recipients:_ When an admin finishes writing a broadcast, then they see the number of recipients, and the broadcast is sent only after they confirm.

### 2.2 App preferences

Lets users choose the app's language and theme, which otherwise follow the phone's settings.

#### Languages

The app SHALL be available in Brazilian Portuguese, Spanish and English, and users SHALL be able to choose one of them.

- _User picks Spanish:_ When a user chooses Spanish, then the app is shown in Spanish.

#### Default language

Until a user chooses a language, the app SHALL use the phone's language if it is Portuguese, Spanish or English, and Brazilian Portuguese otherwise.

- _Phone in English:_ When a user who hasn't chosen a language has their phone set to English, then the app is shown in English.
- _Phone in another language:_ When a user who hasn't chosen a language has their phone set to French, then the app is shown in Brazilian Portuguese.

#### Theme

The app SHALL offer a light theme and a dark theme. Until a user chooses one, the app SHALL follow the phone's setting.

- _Phone in dark mode:_ When a user who hasn't chosen a theme has their phone in dark mode, then the app uses the dark theme.
- _User picks a theme:_ When a user chooses the light theme, then the app stays light whatever the phone's setting.

#### Text written by admins

Text written by admins, such as school rules, cancellation rules, class notes, reasons and broadcasts, SHALL be shown as written, whatever language the user chose.

- _Rules written in Portuguese:_ When a user who chose English opens school rules written in Portuguese, then the rules are shown in Portuguese.

## 3. Class scheduling

Admins need to schedule surf and skate classes, often many at once, and everyone needs to see them. A class's states, and what each state allows, are the base that enrolment, ratings and photos build on.

**What it covers**

- Classes with a discipline, a level, a date, a start and end time, a location, instructors, a capacity and optional notes.
- Batch creation from a date range, a weekday filter and one or more time ranges, with time ranges suggested from last week's classes.
- Class states that follow the clock (not started, started, finished) plus cancelled, and rules for editing, cancelling and deleting in each state.
- Saved locations that admins edit or archive, with an optional notification when an edit affects upcoming classes.
- All times in the America/Fortaleza time zone, and every user able to see all classes.

**Capabilities**

- [Class scheduling](#31-class-scheduling): classes, batch creation, class states, editing, cancelling and deleting, instructors, capacity, reminders, and who can see classes.
- [Class locations](#32-class-locations): saved locations, and how editing or archiving one affects the classes that use it.

**Dependencies and constraints**

- Depends on [Accounts and access](#1-accounts-and-access) for roles and on [Notifications and preferences](#2-notifications-and-preferences) for delivering notifications.
- Some requirements notify a class's students and the people with pending requests. Those are defined by [Class enrolment](#4-class-enrolment), so they take effect once enrolment exists.
- Reminders and state changes happen at set times, so the backend needs scheduled work.
- Locations need address suggestions and a map from an external maps service.
- Out of scope: saved lists of time ranges (time ranges are typed or suggested each time) and the visual details of the creation screen.

### 3.1 Class scheduling

Lets admins schedule surf and skate classes, one at a time or in batches, and defines each class's states and what can change in each.

#### Class details

A class SHALL have a discipline (surf or skate), a level (beginner, advanced or expert), a date, a start time and an end time, one location, at least one instructor, a capacity, and optional notes of up to 300 characters. The level SHALL only be a label.

- _Class without an instructor:_ When an admin tries to save a class with no instructor, then the class is not saved.
- _Notes too long:_ When an admin writes notes longer than 300 characters, then the notes are not accepted.
- _Level is only a label:_ When a student requests a class marked as expert, then the class's level doesn't affect the request.

#### Time zone

All class dates and times SHALL be in the America/Fortaleza time zone, whatever time zone a phone uses.

- _Phone in another time zone:_ When a user whose phone is set to another time zone views a class that starts at 08:00, then the class is shown as starting at 08:00, Fortaleza time.

#### Batch creation

Admins SHALL be able to create classes in a batch by choosing a date range, the weekdays to include, and one or more time ranges. The system SHALL create one class for each included day and time range, all sharing the batch's discipline, level, location, instructors, capacity and notes.

- _Two days and two time ranges:_ When an admin creates a batch from Thursday to Saturday with only Wednesday, Thursday and Friday included, and two time ranges, then four classes are created: two on Thursday and two on Friday.

#### Time range suggestions

When an admin creates a batch, the system SHALL suggest the time ranges used by the previous week's classes, and admins SHALL be able to add other time ranges. The system SHALL NOT keep a separate saved list of time ranges.

- _Suggestions from last week:_ When an admin starts a batch and last week had classes from 08:00 to 09:00 and from 16:00 to 17:00, then both time ranges are suggested.
- _New time range:_ When an admin adds a time range that no class used last week, then it is used for this batch only, and it is suggested later only if classes in the previous week use it.

#### Valid time ranges

Each time range SHALL end after it starts, and time ranges in the same batch SHALL NOT overlap. Classes from different batches SHALL be allowed to overlap.

- _Overlapping time ranges in one batch:_ When an admin adds 08:00 to 09:00 and 08:30 to 09:30 to the same batch, then the batch can't be created until the overlap is removed.
- _Time range ending before it starts:_ When an admin adds a time range from 10:00 to 09:00, then the time range is not accepted.
- _Overlapping batches:_ When an admin creates a batch whose classes overlap classes from another batch, then the classes are created.

#### No classes in the past

The system SHALL NOT create a class whose start time has already passed.

- _Earlier time today:_ When an admin tries to create a class today at a time that has already passed, then the class is not created.

#### Editing a class

Admins SHALL be able to edit a single class. An edit SHALL NOT move a class's start into the past.

- _One class edited:_ When an admin edits one class from a batch, then only that class changes.
- _Moving a class into the past:_ When an admin changes a class's date to yesterday, then the change is refused.

#### Edit notifications

When a class is edited, its students, anyone with a pending request for it, and its instructors SHALL be notified.

- _Time changed:_ When an admin changes a class's time, then its students, the people with pending requests for it and its instructors are notified.

#### Class states

A class SHALL be not started until its start time, started from its start time until its end time, and finished after its end time. These changes SHALL happen on their own at those times. A class SHALL become cancelled only when an admin cancels it.

- _Class reaches its start time:_ When a class's start time arrives, then the class is started, without anyone acting.
- _Class reaches its end time:_ When a class's end time arrives, then the class is finished.

#### Changes after a class starts

Once a class has started, admins SHALL only be able to cancel it or change its instructors. Once it has finished, the class itself SHALL NOT change, and only ratings, comments and photos SHALL be added to it.

- _Editing a started class:_ When an admin tries to change the location of a class that has started, then the change is refused.
- _Substitute instructor:_ When an admin changes the instructors of a class that has started, then the change is saved.
- _Editing a finished class:_ When an admin tries to change anything about a finished class, then the change is refused.

#### Cancelling a class

Admins SHALL be able to cancel a class until it finishes, with an optional message. Its students, anyone with a pending request for it, and its instructors SHALL be notified, with the message.

- _Cancelled during the class:_ When an admin cancels a class that has started because of bad weather and writes a message, then the class is cancelled, and its students, the people with pending requests for it and its instructors are notified with the message.

#### Finished and cancelled classes are final

A finished class SHALL NOT be cancelled, and a cancelled class SHALL NOT be restored.

- _Cancelling a finished class:_ When an admin tries to cancel a finished class, then the class is not cancelled.
- _Restoring a cancelled class:_ When an admin wants a cancelled class back, then they have to create a new class.

#### Deleting a class

Admins SHALL be able to delete a class, after a confirmation step, only if it hasn't started, has no pending requests and has nobody enrolled. Its instructors SHALL be notified.

- _Class created by mistake:_ When an admin deletes an upcoming class that nobody has requested or joined, then the class is removed once the admin confirms, and its instructors are notified.
- _Class with a pending request:_ When an admin tries to delete a class that has a pending request, then the class is not deleted, and the admin can cancel it instead.

#### Assigning instructors

Admins SHALL be able to assign instructors and admins to teach a class, and remove them from it. An instructor SHALL be notified when assigned to a class or removed from one.

- _Instructor assigned:_ When an admin assigns an instructor to a class, then the instructor is notified.
- _Instructor removed:_ When an admin removes an instructor from a class, then the instructor is notified.

#### Class without an instructor

When a class that hasn't started loses its only instructor, because that instructor was demoted or removed or deleted their account, the class SHALL stay scheduled and be flagged as having no instructor, and admins SHALL be notified.

- _Only instructor deletes their account:_ When the only instructor of an upcoming class deletes their account, then the class stays scheduled and is flagged as having no instructor, and admins are notified.

#### Capacity

Admins SHALL set each class's capacity. The capacity SHALL NOT be set below the number of seats taken, which counts approved students and guests.

- _Lowering capacity below seats taken:_ When an admin tries to lower the capacity of a class with 8 seats taken to 6, then the change is refused.

#### Class notes visibility

Class notes SHALL be shown to everyone who can see the class.

- _Student reads the notes:_ When a student opens a class that has notes, then they see the notes.

#### Seeing classes

Every approved user SHALL be able to see all classes, past and future, with their details. The classes view SHALL open on the current week, and users SHALL be able to move to any other week.

- _Opening the classes view:_ When a user opens the classes view, then it shows the current week, and the user can move to past and future weeks.

#### Reminders

30 minutes before a class starts, its students and instructors SHALL be notified. No reminder SHALL be sent for a cancelled class.

- _Class about to start:_ When a class starts in 30 minutes, then its students and instructors are notified.
- _Cancelled class:_ When a cancelled class's start time is 30 minutes away, then no reminder is sent.

### 3.2 Class locations

Lets admins keep a list of saved locations for classes and controls how changes to a location reach the classes that use it.

#### Saved locations

Admins SHALL be able to save locations with an address, helped by address suggestions and a map, and SHALL pick one saved location for each class.

- _Adding a location:_ When an admin adds a location by searching for its address, then the system suggests matching addresses and shows the place on a map, and the saved location can be picked for classes.

#### Editing a location

Admins SHALL be able to edit a saved location. The change SHALL apply to every class that uses it, including past classes.

- _Location renamed:_ When an admin changes a location's name, then every class at that location, past and upcoming, shows the new name.

#### Notifying about a location change

When an edited location is used by classes that haven't started, the admin SHALL choose whether to notify those classes' students and instructors.

- _Meeting point moved:_ When an admin edits a location used by upcoming classes and chooses to notify, then the students and instructors of those upcoming classes are notified.
- _Typo fixed:_ When an admin edits a location used by upcoming classes and chooses not to notify, then nobody is notified.

#### Archiving instead of deleting

Removing a saved location SHALL archive it: it SHALL no longer be offered for new classes, and classes that use it SHALL keep showing it.

- _Location removed:_ When an admin removes a location used by past classes, then it is no longer offered when creating classes, and those past classes still show it.

#### Removing the selected location while creating classes

If an admin removes the location currently selected while creating classes, the selection SHALL be cleared, and the admin SHALL pick a location again before the classes can be created.

- _Selected location removed:_ When an admin removes the location they had selected for a new batch, then no location is selected, and the batch can't be created until they pick one.

## 4. Class enrolment

Students need to get into classes, and admins need full control over who does: payments and credits are tracked outside the app, and approving a request is how admins apply them. Cancellations follow rules the admins write in plain text, so the app has to apply free-text rules consistently.

**What it covers**

- Requests that students can repeat until a class starts, approvals that need a free seat, denials with a reason, withdrawals, and expiry when the class starts.
- A waiting list shown as a label on pending requests for full classes, in the order students asked, with a switch to turn it off.
- Direct enrolment of students by admins, taking students out of classes, and guests (trial) who have no account.
- Student cancellation limited by a deadline that a language model works out for each class from the admins' rule for that discipline.
- Notifications for every request and seat event.

**Capabilities**

- [Class enrolment](#41-class-enrolment): requests, the waiting list, approvals, direct enrolment, guests, taking students out, request statuses, and the related notifications.
- [Cancellation rules](#42-cancellation-rules): the surf and skate cancellation rules, how each class's deadline is worked out, and how students cancel.

**Dependencies and constraints**

- Depends on [Accounts and access](#1-accounts-and-access), [Notifications and preferences](#2-notifications-and-preferences) and [Class scheduling](#3-class-scheduling).
- New external dependency: a language model provider. It only receives the rule text and the class's details, never personal data.
- No payment or credit data anywhere in the app.
- Out of scope: children's enrolments, messages to guests, and checking a rule's wording when admins save it (rules are assumed to be clear).

### 4.1 Class enrolment

Controls how students and guests get into classes, with admins deciding every seat, and how seats are given up or taken away.

#### Requesting a class

Students SHALL be able to request a seat in any class that hasn't started. A student SHALL be able to request the same class again, as many times as they want, once an earlier request for it has ended.

- _Request sent:_ When a student requests a seat in an upcoming class, then a pending request is created.
- _Requesting again after a denial:_ When a student whose request was denied requests the same class again before it starts, then a new pending request is created.
- _Class already started:_ When a student tries to request a class that has started, then no request is created.

#### New request notification

When a student requests a class, admins and the class's instructors SHALL be notified.

- _Request arrives:_ When a student requests a class, then admins and the class's instructors are notified.

#### Seats

A pending request SHALL NOT hold a seat. A class's seats taken SHALL count its approved students and its guests. Everyone who can see a class SHALL see its capacity and how many seats are taken.

- _More requests than seats:_ When a class with 8 seats has 12 pending requests and no approved students, then all 8 seats are still free.
- _Seeing a class's seats:_ When any user opens a class, then they see its capacity and how many seats are taken.

#### Approving a request

Admins SHALL be able to approve a pending request only while the class has a free seat and hasn't started. The student SHALL be notified.

- _Free seat:_ When an admin approves a pending request for a class with a free seat, then the student takes a seat and is notified.
- _Full class:_ When a class has no free seat, then admins cannot approve its pending requests.

#### Denying a request

Admins SHALL be able to deny a pending request and give a reason. The student SHALL be notified, with the reason when one was given.

- _Request denied:_ When an admin denies a request and writes a reason, then the student is notified of the denial and the reason.

#### Waiting list

While a class has no free seat, its pending requests SHALL be shown as "on the waiting list" to their students and to admins. Admins SHALL see a class's waiting list in the order students asked, with the time each one asked.

- _Class fills up:_ When the last seat of a class is taken while requests are pending, then those requests show as "on the waiting list".
- _Seat frees up:_ When a seat frees up in a full class, then its waiting requests show as pending again, and admins can approve any of them.
- _Admin views the waiting list:_ When an admin views a full class's requests, then they are listed in the order students asked, each with the time it was made.

#### No notice when a seat opens

Students on the waiting list SHALL NOT be notified when a seat opens. They SHALL be notified when their request is approved, denied or expires.

- _Seat opens:_ When a seat opens in a class with waiting requests, then the waiting students are not notified.

#### Waiting list switch

Admins SHALL be able to turn the waiting list on or off, and it SHALL be on by default. While it is off, students SHALL NOT be able to request a class that has no free seat.

- _Waiting list off:_ When the waiting list is off and a student views a full class, then they cannot request it.
- _Waiting list on:_ When the waiting list is on and a student requests a full class, then the request is created and shows as "on the waiting list".

#### Withdrawing a request

Students SHALL be able to withdraw a pending request until the class starts. Nobody SHALL be notified.

- _Request withdrawn:_ When a student withdraws a pending request, then the request ends and nobody is notified.

#### Expiry

Requests still pending when a class starts SHALL expire, and their students SHALL be notified that they didn't get a seat.

- _Class starts with pending requests:_ When a class starts while requests for it are still pending, then those requests expire, and their students are notified that they didn't get a seat.

#### Cancellation notification

When a student cancels their seat, or deleting their account cancels it, admins SHALL be notified with the number of students on the class's waiting list, and the class's instructors SHALL be notified.

- _Student cancels:_ When a student cancels their seat in a class with 2 waiting requests, then admins are notified of the cancellation, with 2 students waiting, and the class's instructors are notified.
- _Student deletes their account:_ When a student with upcoming seats deletes their account, then admins and each class's instructors are notified as for a cancellation.

#### Direct enrolment

Admins SHALL be able to enrol a student directly, without a request, in a class that hasn't started and has a free seat. If the student has a pending request for that class, it SHALL become approved. The student SHALL be notified.

- _Student enrolled directly:_ When an admin enrols a student directly in a class with a free seat, then the student takes a seat and is notified.
- _Student with a pending request:_ When an admin enrols a student who has a pending request for that class, then the pending request becomes approved.

#### Taking a student out

Admins SHALL be able to take an approved student out of a class that hasn't started, with an optional reason. The student SHALL be notified, with the reason when one was given.

- _Student taken out:_ When an admin takes a student out of a class and writes a reason, then the student loses their seat, and they are notified with the reason.

#### Guests

Admins SHALL be able to enrol a guest, someone without an account who is trying the sport, in a class that hasn't started and has a free seat, by entering the guest's name and WhatsApp number. A guest SHALL take a seat.

- _Guest enrolled:_ When an admin enrols a guest with their name and WhatsApp number, then the guest takes a seat in the class.
- _Full class:_ When a class has no free seat, then admins cannot enrol a guest in it.

#### Guests get nothing from the app

The app SHALL NOT send anything to guests. When an admin edits or cancels a class that has guests, the app SHALL warn the admin that the guests won't be notified.

- _Class with a guest cancelled:_ When an admin cancels a class that has a guest, then the app warns the admin that the guest won't be notified.

#### Class lists

Everyone who can see a class SHALL see who holds its seats: approved students by name, and guests labelled "Trial". Admins and the class's instructors SHALL also see each guest's name.

- _Student views the class list:_ When a student views the people in a class that has a guest, then the guest appears as "Trial".
- _Instructor views the class list:_ When an instructor views the people in a class they teach that has a guest, then they see the guest's name.

#### Trial classes don't carry over

A guest's trial class SHALL NOT be linked to an account the guest creates later.

- _Former guest signs up:_ When a former guest creates an account, then their trial class does not appear in their history.

#### Guest data is erased

The system SHALL erase a guest's name and WhatsApp number 30 days after their class finishes or is cancelled. The guest's seat SHALL then show "Trial" to everyone, admins and the class's instructors included.

- _Window ends:_ When 30 days have passed since a class with a guest finished, then the guest's name and WhatsApp number are erased, and the seat shows "Trial" to everyone.

#### Request statuses

Students SHALL be able to see the status of each of their requests: pending (shown as "on the waiting list" while the class is full), approved, denied, withdrawn, cancelled, taken out, expired, or class cancelled.

- _Class cancelled:_ When a class a student had a seat in is cancelled, then the student sees that request's status as class cancelled.

### 4.2 Cancellation rules

Lets admins write the cancellation rules in plain text and decides, for each class, until when its students can cancel their seats.

#### Surf and skate rules

Admins SHALL write and edit two cancellation rules as free text: one for surf classes and one for skate classes. Each class SHALL use the rule for its discipline.

- _Skate class:_ When a student looks at a skate class's cancellation rule, then they see the skate rule.

#### Reading and accepting the rules

Users SHALL be able to read both cancellation rules at any time. When requesting a seat, a student SHALL be shown the rule for the class's discipline and SHALL accept it.

- _Requesting a surf class:_ When a student requests a surf class, then they are shown the surf rule, and the request is sent only after they accept it.

#### One deadline per class

Each class SHALL have one cancellation deadline, the same for all its students. The deadline SHALL be worked out from the rule for the class's discipline and the class's details when the class is created, and again whenever the class is edited or that rule changes.

- _Rule changed:_ When an admin changes the surf rule, then the deadlines of all surf classes that haven't started are worked out again.
- _Class edited:_ When an admin changes a class's date, then that class's deadline is worked out again.

#### Working out the deadline

The system SHALL use a language model to read the rule text and the class's details (discipline, level, date, start and end time, location, capacity and notes) and describe the deadline. The system SHALL calculate the exact date and time from that description itself, and SHALL retry when the description can't be used.

- _Rule with a notice period:_ When the surf rule says students can cancel up to 12 hours before a class, and a surf class starts on Tuesday at 08:00, then that class's deadline is Monday at 20:00.
- _Unusable answer:_ When the language model's answer can't be turned into a date and time, then the system tries again.

#### Data sent to the language model

Only the rule text and the class's details SHALL be sent to the language model. Nothing written by students and no personal data, including student and instructor names, SHALL be sent to it.

- _Deadline worked out:_ When a class's deadline is worked out, then no student or instructor names are sent to the language model.

#### Deadline never after the start

A class's cancellation deadline SHALL NOT be later than the class's start time.

- _Rule allows cancelling at any time:_ When the rule lets students cancel at any time, then the class's deadline is its start time.

#### Cancelling a seat

A student SHALL be able to cancel their seat until the class's deadline, and SHALL NOT be able to cancel it after the deadline.

- _Before the deadline:_ When a student cancels their seat before the class's deadline, then the seat is cancelled.
- _After the deadline:_ When a student tries to cancel their seat after the class's deadline, then the seat is not cancelled.

#### No deadline available

While a class has no deadline because it couldn't be worked out, students who try to cancel a seat in it SHALL be told to contact the school, and the system SHALL keep trying to work the deadline out. Admins SHALL see the class flagged as having no cancellation deadline; nobody SHALL be notified.

- _Deadline missing:_ When a student tries to cancel a seat in a class whose deadline couldn't be worked out, then they are told to contact the school.
- _Admin sees the flag:_ When an admin opens a class whose deadline couldn't be worked out, then the class is flagged as having no cancellation deadline, and no notification was sent.

## 5. Ratings and photos

After a class, the school wants feedback and memories: students rate the classes they took, instructors comment, and everyone shares photos.

**What it covers**

- One rating per student for each finished class (stars and an optional comment), visible to everyone with the author's name.
- Comments from the instructors who taught a class, and admins able to delete any comment.
- Photos on finished classes, uploaded by the class's students, instructors and admins, and visible and downloadable by everyone.
- A prompt to rate a class 30 minutes after it ends, and a notification to instructors when a student rates their class.

**Capabilities**

- [Class ratings](#51-class-ratings): ratings and comments on finished classes.
- [Class photos](#52-class-photos): photos on finished classes.

**Dependencies and constraints**

- Depends on [Class scheduling](#3-class-scheduling) and [Class enrolment](#4-class-enrolment).
- Photo storage and downloads.
- Users can see each other's content with no report option. This is an accepted App Review risk under Apple's guideline 1.2; if Apple rejects the app for it, the fix would be a report button that notifies admins.
- Out of scope: an admin dashboard with metrics (classes per day, occupancy, average ratings, a ratings list). Each class already shows its capacity and seats taken to everyone ([Class enrolment](#41-class-enrolment)) and its ratings ([Class ratings](#51-class-ratings)).

### 5.1 Class ratings

Lets students rate the classes they took and instructors comment on the classes they taught, with everything visible to the whole school.

#### Rating a class

A student who held a seat in a class SHALL be able to leave one rating for it once it has finished: from 1 to 5 stars, and an optional comment. Ratings SHALL be about the class, not its instructors.

- _Student rates a class:_ When a student who was in a finished class gives it 4 stars and a comment, then the rating is saved.
- _Rating without a comment:_ When a student gives a finished class stars without a comment, then the rating is saved.
- _Rating twice:_ When a student who already rated a class tries to rate it again, then they can only change their existing rating.
- _Student who wasn't in the class:_ When a student who wasn't in a class tries to rate it, then they cannot.

#### Changing one's rating

Students SHALL be able to edit or delete their own rating.

- _Rating edited:_ When a student changes the stars of their rating, then the new stars replace the old ones.
- _Rating deleted:_ When a student deletes their rating, then it no longer appears.

#### Rating prompt

30 minutes after a class ends, each student who was in it SHALL be notified and asked to rate it. Cancelled classes SHALL NOT prompt anyone.

- _Class ended:_ When 30 minutes have passed since a class ended, then each student who was in it is asked to rate it.
- _Cancelled class:_ When a class was cancelled, then no one is asked to rate it.

#### Ratings are public

Every user SHALL be able to see the ratings and comments of any class, each with its author's name.

- _Viewing a class's ratings:_ When any user opens a finished class, then they see its ratings and comments with their authors' names.

#### Instructor notification

When a student rates a class, the class's instructors SHALL be notified.

- _New rating:_ When a student rates a class, then the class's instructors are notified.

#### Instructor comments

Instructors who taught a finished class, including admins who taught it, SHALL be able to leave one comment on it, without stars, and edit or delete it. Comments SHALL NOT have replies.

- _Instructor comments:_ When an instructor who taught a finished class comments on it, then the comment appears with the class's ratings, without stars.
- _Instructor who didn't teach the class:_ When an instructor who didn't teach a class tries to comment on it, then they cannot.

#### Admins delete comments

Admins SHALL be able to delete any comment. Deleting a student's comment SHALL keep the stars of their rating, and the author SHALL NOT be notified.

- _Comment deleted:_ When an admin deletes a student's comment, then the comment no longer appears and the rating's stars remain, and the student is not notified.

### 5.2 Class photos

Lets the school community share photos of finished classes, which everyone can see and download.

#### Uploading photos

Students who were in a finished class, any instructor and any admin SHALL be able to upload photos to it. Uploading a photo SHALL NOT notify anyone.

- _Student uploads a photo:_ When a student who was in a finished class uploads a photo to it, then the photo is added to the class, and nobody is notified.
- _Instructor who didn't teach the class:_ When an instructor uploads a photo to a finished class they didn't teach, then the photo is added to the class.
- _Student who wasn't in the class:_ When a student who wasn't in a class tries to upload a photo to it, then they cannot.

#### Only finished classes

Photos SHALL only be added to finished classes.

- _Class not finished:_ When someone tries to add a photo to a class that hasn't finished, then they cannot.

#### Viewing and downloading photos

Every user SHALL be able to see and download the photos of any class.

- _Downloading a photo:_ When a user downloads a photo from a class, then the photo is saved to their phone.

#### Deleting photos

Uploaders SHALL be able to delete their own photos, and admins SHALL be able to delete any photo. When an admin deletes someone else's photo, the uploader SHALL NOT be notified.

- _Uploader deletes their photo:_ When a user deletes a photo they uploaded, then the photo no longer appears.
- _Admin deletes a photo:_ When an admin deletes a photo a student uploaded, then the photo no longer appears, and the student is not notified.

## 6. Public web pages

Both app stores require a privacy policy at a public web address, and Google Play also requires a web page where people can request account deletion without the app. The school has no website, so the project has to provide these pages.

**What it covers**

- A public privacy policy page.
- A public page explaining how to request account deletion, including for people who no longer have the app.
- Both pages in Brazilian Portuguese, Spanish and English.

**Capabilities**

- [Public web pages](#61-public-web-pages): the privacy policy page and the account-deletion page.

**Dependencies and constraints**

- A small hosted website. Where it's hosted is still to be decided.
- Linked from the app and from the App Store and Google Play listings.
- Relies on the account removal and erasure defined by [Accounts and access](#1-accounts-and-access).
- Someone familiar with LGPD should review the privacy policy before launch.

### 6.1 Public web pages

Publishes the public web pages the app stores require: the privacy policy and a way to request account deletion without the app.

#### Privacy policy page

A privacy policy SHALL be published at a public web address and linked from the app and from the App Store and Google Play listings. It SHALL say what data the app collects, why, how long it is kept, and which services handle it, including the sign-in providers, the push service, hosting, and the language model, which only receives class details.

- _Opening the policy from the app:_ When a user opens the privacy policy from the app, then the public privacy policy page opens.
- _Retention explained:_ When someone reads the privacy policy, then it explains that deleted accounts are erased 30 days after deletion.

#### Account deletion page

A public web page SHALL explain how to delete an account in the app and, for people who no longer have the app, give the school's WhatsApp number to request deletion. It SHALL say what is erased, what is kept without a name, and when erasure happens.

- _Person without the app:_ When someone without the app opens the account deletion page, then they find the school's WhatsApp number to request deletion.
- _What happens to the data:_ When someone reads the account deletion page, then it says that personal data and comments are erased 30 days after deletion, and that star ratings remain without a name.

#### Handling deletion requests from the page

An admin SHALL carry out a deletion request received through the page by removing the account, which the system then erases 30 days later.

- _Request received:_ When an admin receives a deletion request from someone who used the page, then they remove the account, and the account is erased 30 days later.

#### Page languages

Both pages SHALL be available in Brazilian Portuguese, Spanish and English.

- _Reading in Spanish:_ When someone chooses Spanish on either page, then the whole page is shown in Spanish.
