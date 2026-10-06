# Rocha's Surf School

## Surf & Skate School Scheduling Platform - User Journeys

Rocha's Surf School is a cross-platform mobile app (Android and iOS) for managing surf and skate classes between instructors, students and admins. It's three apps in one: what each person sees depends on their role.

- Detailed requirements: [requirements.md](requirements.md), by area. Specs planned from them live in `.specs/`.
- Designs: the Claude Design project "Rocha's Surf School App" (https://claude.ai/design/p/5359a9f1-ab7a-4ff8-9beb-3ef5e4947c80). Exports go in `docs/designs/`.

## General User Journeys

Applies to students, instructors and admins.

### Account and access

- As a user, I'd like to sign in or create an account with Google or my email and a 6-digit code sent to that email, with no password. On iOS, I'd also like to use Sign in with Apple. The same screen is used to sign in and to create an account. The code expires after 10 minutes, and a new one can be requested after 30 seconds.
- As a user, I'd like one account per email address, whichever sign-in method I use. My email address can't be changed later.
- As a user signing up with the email code, I'd like to give my name before my account waits for approval.
- As a user, after signing up I'd like to see that my account is waiting for approval, and to be told by a push notification when it's approved or denied.
- As a user, once I'm approved I'd like to add my WhatsApp number and accept the school rules before I start. The WhatsApp number is always required.
- As a user, if my registration is denied I'd like to see the reason and a button that opens WhatsApp with the school's number. My data is erased 30 days after the denial, and after that I can sign up again with the same email.
- As a user, I'd like to update my profile: profile picture, name and WhatsApp number. The WhatsApp number can be changed but never left empty. WhatsApp numbers include the country code, with Brazil (+55) preselected.
- As a user, I'd like to choose whether other users can see my WhatsApp number. It's hidden by default, and admins always see it.
- As a user, I'd like to be notified when my role changes.
- As a user, I'd like to accept the school rules again when an admin changes them and asks everyone to accept the new version. I'm asked the next time I open the app.
- As a user, I'd like to sign out.
- As a user, I'd like to delete my account, after a confirmation step. My upcoming seats, pending requests and class assignments are cancelled. The account can be reactivated for 30 days. After that it's erased:
  - name, email, photo and WhatsApp number are removed;
  - comments are deleted, and star ratings stay without a name;
  - photos and class lists show "Former student" in my place;
  - the email is free to sign up again.
- As a user whose account was deleted, I'd like to ask the admins to reactivate it. Signing in with a deleted account during the 30 days shows an "Account deleted" screen. From there I send a reactivation request inside the app, or sign in with another email.
  - Each account can send one request. If it's denied, the screen says so and only offers signing in with another email.
  - Approval restores the account, its history and its role, but not the cancelled seats or class assignments.
  - If the school rules changed in a way that needs acceptance while I was away, I accept them again.
- As a user removed by an admin, I'd like to see that my access was removed and a button to contact the school on WhatsApp. I can't request reactivation. An admin can restore my account, with its history and role, within 30 days; after that it's erased.

### Preferences and notifications

- As a user, I'd like to choose the app's theme (light or dark) and language (Brazilian Portuguese, Spanish or English). Until I choose, both follow my phone. If my phone's language isn't one of the three, the app uses Brazilian Portuguese.
- As a user, I'd like to get notifications as pushes on my phone. The app doesn't send notifications by email or WhatsApp; the sign-in code is the only email it sends.
- As a user, I'd like to turn phone pushes off. Notifications still appear on the notifications screen.
- As a user, I'd like to see a list of all my notifications, including the admins' broadcasts, and mark one as read or all as read at once.
- As a user, I'd like to read the school rules and the cancellation rules (one for surf, one for skate) at any time.
- Text written by admins (school rules, cancellation rules, notes, reasons and broadcasts) is shown as written, with no translation. It's assumed to be in Brazilian Portuguese.

### People and classes

- As a user, I'd like to see a directory of approved, active users, with their name, photo and role, and their WhatsApp number if they share it. The list can be searched by name and filtered by role (admin, instructor or student). Pending, denied, deleted and removed accounts don't appear.
- As a user, I'd like to see every class, past and future. The classes view opens on the current week, day by day, and I can move freely to other weeks. A week-day picker shows one dot for each class on that day.
- As a user, I'd like to see past classes grouped under a label for each day, filtered by day, week or month.
- As a user, I'd like to see a class's details: discipline, level, instructors, date, time and location, capacity and seats taken, notes, and who holds its seats. Guests appear as "Trial" to everyone except admins and the class's instructors.
- As a user, I'd like to see the ratings and comments of any class, with their authors' names, and to see and download its photos.
- All times are in the America/Fortaleza time zone, whatever time zone the phone uses. Weeks run from Monday to Sunday.

## Roles

Each user has exactly one role: student, instructor or admin. New accounts start as students. Only students take classes; instructors and admins can't request seats. Admins can also teach classes.

## Admin

Admins have full control over schedules, users and settings. An admin can also teach classes, and sees their own classes under My classes. Admins decide who gets into every class: payments and credits are tracked outside the app, and approving a request is how admins apply them.

### Permissions

- Manage the schedule of surf and skate classes.
- Manage students, instructors and admins.
- Send notifications to everyone, only students or only instructors.
- Write the two cancellation rules, one for surf and one for skate.
- Manage the school rules.
- Turn the waiting list on or off (it's on by default), and set the school's WhatsApp number.
- Enrol students directly, and enrol guests who have no account.

### For each class, define

- Discipline: surf or skate.
- Skill level: beginner, advanced or expert. This is an informational label only.
- Dates. When creating classes, the admin picks a date range on a calendar and can filter it by weekday. Editing a class changes only that class, and can move it to any future date.
- Times. One or more time ranges, each with a start and an end. Classes usually last 1 hour, and surf trips can last all day.
  - The form suggests the time ranges used by the previous week's classes. New ones can be added, and they aren't saved for later.
  - Each time range must end after it starts, and time ranges in one batch can't overlap. Classes from different batches can overlap.
- Location. One location per class, chosen from saved locations. New locations are added with address suggestions and a map.
  - Editing a location changes every class that uses it, past ones included. If upcoming classes use it, the admin chooses whether to notify their students and instructors.
  - Removing a location archives it: it's no longer offered, and classes that used it keep it. If the location selected in the create form is removed, the selection is cleared.
- Assigned instructors, who can be instructors or admins. At least one is required.
- Maximum capacity. It can't be lowered below the seats taken (approved students plus guests).
- Notes, optional, up to 300 characters, for example a meeting point or equipment instructions. Everyone who can see the class sees them.

Each combination of date and time range creates its own class. All the classes in one batch share the same discipline, level, location, instructors, capacity and notes. No class can be created to start in the past.

### Class states

- A class is **not started** until its start time, **started** until its end time, and **finished** after that. These changes happen on their own. A class is **cancelled** only when an admin cancels it.
- Not started: the class can be edited (never into the past), cancelled or deleted.
- Started: admins can only cancel it or change its instructors. Requests close, and pending ones expire.
- Finished: the class can't change. Students rate it, and photos can be added.
- Cancelled: final. A cancelled class can't be restored; the admin creates a new one instead.
- A finished class can't be cancelled.
- Deleting is only for mistakes: a class can be deleted only if it hasn't started and nobody has requested or joined it, guests included. Otherwise it gets cancelled.

### Approve or deny

- New registrations to the platform, in the Join the school tool.
- Student requests to enrol in classes, in the Class enrolments tool.
- Reactivation requests from users whose accounts were deleted, in the Reactivate accounts tool. Each request shows the person's name, email, the date the account was deleted and the number of classes they took.

All three tools share the same pattern: a card for each pending request with Deny and Approve buttons, and a "Decided just now" list underneath. Denying opens a sheet where the admin can write a reason, which is sent to the person. Decisions are final in the app; mistakes go to the system administrators.

### Enrolment and the waiting list

- A pending request doesn't hold a seat. Seats taken are approved students plus guests.
- Admins can approve a request only while the class has a free seat and hasn't started.
- While a class is full, its pending requests show as "on the waiting list", to the student and to admins. Admins see the list in the order students asked, with the time each one asked.
- When a seat opens, nobody is moved automatically: admins choose who gets it.
- When the waiting list is turned off, students can't request a full class.
- Requests still pending when a class starts expire.

### Cancellation rules

- Admins write two cancellation rules as free text: one for surf classes and one for skate classes. Each class uses the rule for its discipline.
- For each class, the app uses an AI language model to work out the cancellation deadline from the rule and the class's details. It does this when the class is created, and again when the class is edited or its rule changes. Every student in the class gets the same deadline, and it's never after the class starts.
- Only the rule text and the class's details are sent to the language model. Nothing written by students, and no personal data such as names, is sent.
- Rules are assumed to be clear, so the app doesn't check them when admins save them.
- If a class's deadline can't be worked out, the app keeps trying. Meanwhile, students who try to cancel are told to contact the school.
- What a late cancellation costs, for example "counts as a used class", belongs to the admins' own records outside the app. Admins can explain it in the rule's text.

### User journeys

- As an admin, I'd like to approve or deny people who want to join the platform. I'm notified when someone new is waiting.
- As an admin, I'd like to remove a user from the platform, and restore a removed account within 30 days.
- As an admin, I'd like to promote a student to instructor, and make any user an admin. Promoting a student cancels their upcoming seats and pending requests, and they're told.
- As an admin, I'd like to demote an instructor to student. They're removed from the upcoming classes they teach and stay on past ones. A class that loses its only instructor stays scheduled, is flagged, and admins are notified.
- As an admin, I'd like to change another admin's role or remove them. There's always at least one admin: the last one can't be demoted or removed, and must make someone else an admin before deleting their own account.
- As an admin, I'd like to create several classes at once, across different days and times, with shared settings.
- As an admin, I'd like to assign instructors to a class. Instructors are notified when they're assigned to a class or removed from one.
- As an admin, I'd like to set the maximum number of students in a class.
- As an admin, I'd like to add notes to a class.
- As an admin, I'd like to manage saved locations.
- As an admin, I'd like to approve or deny students' requests to enrol in classes, and see each class's waiting list. I'm notified of every new request.
- As an admin, I'd like to enrol a student directly, without a request, in a class that hasn't started and has a free seat. If they had a pending request for it, it becomes approved. The student is notified.
- As an admin, I'd like to take a student out of a class that hasn't started, with an optional reason. The student is notified.
- As an admin, I'd like to enrol a guest, someone without an account who's trying surf or skate, so a newcomer doesn't have to go through onboarding.
  - I enter their name and WhatsApp number and pick a class that hasn't started and has a free seat.
  - The guest takes a seat and gets nothing from the app. I'm warned when I edit or cancel a class that has guests.
  - A guest's trial class isn't linked to an account they create later.
- As an admin, I'd like to edit a class and notify its students, the people with pending requests for it, and its instructors.
- As an admin, I'd like to cancel a class until it finishes, for example because of bad weather, with an optional message. Its students, the people with pending requests for it and its instructors are notified with the message.
- As an admin, I'd like to delete a class created by mistake, after a confirmation step. Its instructors are notified.
- As an admin, I'd like to be notified when a student cancels a seat, including by deleting their account, with how many students are on the class's waiting list.
- As an admin, I'd like to send a notification to everyone, only students or only instructors. "Everyone" includes admins. The notification has a title and a description, and shows the number of recipients before it's sent. A confirmation step follows.
- As an admin, I'd like to write the surf and skate cancellation rules.
- As an admin, I'd like to turn the waiting list on or off.
- As an admin, I'd like to add, edit and remove the school rules that students accept when they join. When I change them, I choose whether everyone must accept the new version.
- As an admin, I'd like a dashboard with key metrics. Cancelled classes are left out, and averages include ratings that no longer show a name. The metrics are:
  - Classes today, split by discipline.
  - Weekly occupancy, compared with the previous week.
  - Average rating by day, week or month, with a filter by discipline.
  - Ratings list, which can be sorted.
  - Seats taken and seats free in each of the week's classes.
- As an admin, I'd like to upload photos to any finished class, and delete any photo.
- As an admin, I'd like to delete any comment. The author isn't told.
- As an admin, I'd like to approve or deny account reactivation requests. I'm notified of each one.
- As an admin, I'd like to contact any user on WhatsApp from their profile. It opens WhatsApp on my phone.

## Instructor

Instructors teach and follow classes, but can't change schedules or rules.

### Permissions

- View all classes, read-only, with the classes they teach under My classes.
- See the ratings and the occupancy of any class.
- Upload photos to any finished class.
- Comment on finished classes they taught.

Instructors cannot approve or deny registrations or requests, cancel classes, change the cancellation rules, or request seats in classes.

### User journeys

- As an instructor, I'd like to see the details of the classes I'll teach, including the students confirmed for each one and any guests, with their names.
- As an instructor, I'd like my next class to stand out at the top of My classes.
- As an instructor, I'd like to see all the classes I've taught. The Past classes screen groups them by day and can be filtered by day, week or month.
- As an instructor, I'd like a notification 30 minutes before a class I'm teaching starts.
- As an instructor, I'd like to be notified when:
  - a student requests one of my classes (the admins decide);
  - a student cancels a seat in one of my classes;
  - I'm assigned to a class or removed from one;
  - a class I'm teaching is edited, cancelled or deleted;
  - a location used by my upcoming classes changes, when the admin chooses to notify;
  - a student rates one of my classes.
- As an instructor, I'd like to upload photos to any finished class.
- As an instructor, I'd like to leave one comment, without stars, on a finished class I taught, and edit or delete it. Comments have no replies.
- As an instructor, I'd like to see class ratings, average ratings and occupancy.

## Student

### Permissions and workflow

- Sign up, give a name, and wait for admin approval before using the app.
- Once approved, add a WhatsApp number and accept the school rules.
- View every class, past and future.
- Request a seat in any class that hasn't started, as many times as they want once an earlier request has ended. The request sheet shows the cancellation rule for the class's discipline, which the student must accept.
- If the class is full and the waiting list is on, the request shows as "on the waiting list".
- See the status of each request: pending (or on the waiting list), approved, denied, withdrawn, cancelled, taken out, expired, or class cancelled.
- Withdraw a pending request until the class starts.
- Cancel an approved seat until the class's cancellation deadline. After that, contact the school.
- Rate a class after it ends: one rating, from 1 to 5 stars with an optional comment, which can be edited or deleted. Ratings are about the class, visible to everyone, and show the author's name.
- Upload photos to finished classes they took. Everyone can see and download them, and uploaders can delete their own.

Students cannot:

- take a seat in a full class; they can only join the waiting list;
- cancel a seat after the class's deadline, or request or withdraw once a class has started;
- see classes or schedules before an admin approves their account.

### User journeys

- As a student, I'd like to request a seat in a class.
- As a student, I'd like to join the waiting list of a full class. I'm told when my request is approved, denied or expires, not when a seat opens.
- As a student, I'd like to request a class again after a denial, a withdrawal or a cancellation, while it hasn't started.
- As a student, I'd like to cancel an enrolment that has already been approved.
- As a student, I'd like to filter the list of classes I've requested by status.
- As a student, I'd like to upload pictures of classes I took after they end.
- As a student, I'd like to be notified when:
  - my request is approved, denied (with the reason) or expires;
  - an admin enrols me directly, or takes me out of a class (with the reason);
  - a class I'm enrolled in, or have requested, is edited or cancelled;
  - the location of one of my upcoming classes changes, when the admin chooses to notify.
- As a student, I'd like a notification 30 minutes before a class I'm enrolled in starts.
- As a student, I'd like a notification 30 minutes after a class I took ends, asking me to rate it and leave a comment.

## Platform

- Sign in with Apple is offered on iOS, because the app offers Google sign-in.
- App Store and Google Play reviewers get one pre-approved account per role, each with a fixed sign-in code that only works for that account.
- Two public web pages, in Brazilian Portuguese, Spanish and English:
  - a privacy policy, which says what the app collects, why, how long it's kept, and which services handle it;
  - a page explaining how to delete an account, with the school's WhatsApp number for people who no longer have the app. Admins handle those requests by removing the account.
- There's no option to report comments or photos. This is an accepted App Review risk; if Apple rejects the app for it, the fix is a report button that notifies admins.

## Out of scope for now

- Accounts for children. All students are assumed to be adults.
- Payments and credits.
- WhatsApp messages sent by the app, and email notifications.
- Saved lists of time ranges.
- Undoing admin decisions.
- Reporting comments or photos.
- Translating text written by admins.
- Checking a cancellation rule's wording when it's saved.

## Open Questions

None right now.

## Deferred to development

The designs include these items, which the specs don't cover yet. They'll be decided when development starts:

- weather and sea conditions on class details;
- class names, such as "Ondas da Manhã";
- a message from an admin to one class;
- notes on registrations and class requests;
- an "also an instructor" option when promoting someone to admin.
