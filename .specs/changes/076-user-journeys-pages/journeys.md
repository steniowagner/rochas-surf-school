# User journeys — the test cases of spec 076

The content of the four flow pages: each flow's description, the account it needs, its groups and its rows, in
English (en). The executor writes this content as the English texts of the pages and translates it into pt-BR and
es; the ids, the groups, the order and the design ids are the same in every language.

Rules for the executor:

- Words in quotes are the app's own labels. In each language, use the exact string from
  `@rochas-surf-school/app-messages` (`en-US.ts`, `es-ES.ts`, `pt-BR.ts`) or, for notification titles, from
  `apps/backend/src/modules/notifications/push-messages.ts`. Where this file's English differs from `en-US.ts`, the
  app's string wins.
- "Design" lists the design inventory ids each row links to, on the flow's design page (`auth-flow`,
  `student-app`, `instructor-app`, `admin-app`). "—" means the row has no design link.
- A row whose expected behavior includes a notification means the notification on the Notifications screen (the
  bell). A push to the phone is expected as well, but a missing push alone is not a failure while the test build
  can't deliver pushes. The flow descriptions say so.

## Auth (`auth`, IDs `AU-NN`)

**Description:** Everything a person goes through before reaching their home: choosing a language, signing in
with Google or with a code sent by email, creating an account, waiting for the school's approval, giving a WhatsApp
number, accepting the school rules, and the screens of a closed account (deleted, denied or removed).

**Account to use:** The sign-up rows need an email address or a Google account of your own that has never been used
in the app (your test set's accounts are already approved). The other rows can use the student account of your
test set. Some rows need the school to approve, deny, remove or restore an account: ask for it when the row says so.

### Sign-in

- **AU-01 — Change the language on the sign-in screen**
  - Before you start: You are signed out.
  - Steps: Open the app. Tap the language button at the top. Pick another language.
  - Expected: A sheet lists the three languages with the current one selected. After picking, the whole sign-in
    screen switches to that language at once. Closing and reopening the app keeps it.
  - Design: AF-01-01, AF-01-02
- **AU-02 — Sign up with Google**
  - Before you start: You are signed out. Use a Google account never used in the app.
  - Steps: Tap "Continue with Google" and choose the account.
  - Expected: The button shows a spinner while it works. You land on the screen that says your account is waiting
    for approval. If Google doesn't share a usable name, a "Your name" screen asks for it first, with Google's name
    filled in.
  - Design: AF-01-03, AF-02-15, AF-03-01
- **AU-03 — Close the Google account picker**
  - Before you start: You are signed out.
  - Steps: Tap "Continue with Google" and close the account picker without choosing.
  - Expected: You are back on the sign-in screen, with no error message.
  - Design: AF-01-01

### Email

- **AU-04 — Create an account with email**
  - Before you start: You are signed out. Use an email address never used in the app.
  - Steps: Tap "Continue with email", then "I'm new here". Type your name and email address and ask for the code.
  - Expected: The button stays off until the name and the email are valid; an invalid email shows a message under
    the field. After sending, the code screen opens with your address and a 30-second countdown, and an email with
    a 6-digit code arrives.
  - Design: AF-02-01, AF-02-06, AF-02-07, AF-02-10
- **AU-05 — Confirm the code**
  - Before you start: AU-04 done; you are on the code screen.
  - Steps: Type the 6 digits from the email, or paste them.
  - Expected: The code is checked as soon as the sixth digit is in, with no button to press. You land on the
    screen that says your account is waiting for approval.
  - Design: AF-02-13, AF-03-01
- **AU-06 — Type a wrong code**
  - Before you start: You are on the code screen.
  - Steps: Type six digits that are not your code.
  - Expected: A message under the code boxes says the code is wrong, and you can type it again.
  - Design: AF-02-12
- **AU-07 — Ask for a new code**
  - Before you start: You are on the code screen.
  - Steps: Wait for the countdown to end, then ask for a new code.
  - Expected: Asking again is not possible during the 30-second countdown. Once it ends, a new code is sent by
    email and the countdown starts again.
  - Design: AF-02-10, AF-02-11
- **AU-08 — Sign in with email to an existing account**
  - Before you start: You already have an account. You are signed out.
  - Steps: Tap "Continue with email", then "I have an account". Type your email address and then the code you
    receive.
  - Expected: No name is asked. You land on the screen that matches your account: waiting for approval, onboarding
    or your home.
  - Design: AF-02-02, AF-02-10
- **AU-09 — Sign in with an address that has no account**
  - Before you start: You are signed out. Use an email address never used in the app.
  - Steps: Tap "Continue with email", then "I have an account". Type the address, then the code you receive.
  - Expected: The app says there is no account with that address and opens the create-account screen with the
    address already filled in, so you only add your name. The account is created after that.
  - Design: AF-02-02, AF-02-06

### Approval and onboarding

- **AU-10 — Wait for approval**
  - Before you start: You just created an account (AU-04 to AU-05).
  - Steps: Look at the screen, then tap "Sign out".
  - Expected: The screen says the school still has to approve the account, shows your email address and since when
    the account exists, and offers only "Sign out". Signing out returns to the sign-in screen at once.
  - Design: AF-03-01
- **AU-11 — Get approved**
  - Before you start: Your account is waiting for approval. Ask the school to approve it.
  - Steps: Keep the app open, or reopen it after the approval.
  - Expected: You get the "Account approved" notification, and the app moves on to the WhatsApp step.
  - Design: AF-03-02
- **AU-12 — Give your WhatsApp number**
  - Before you start: You are on the WhatsApp step.
  - Steps: Type a Brazilian mobile number. Then pick another country from the list and type a number that is not
    valid for it.
  - Expected: The screen welcomes you by first name. Brazil (+55) is preselected and the number is formatted as you
    type ("(85) 99999-9999"). "Hide my number" is on by default. The country list can be searched. An invalid
    number shows a message and you can't continue; a valid one takes you to the school rules.
  - Design: AF-03-02, AF-03-03, AF-03-04, AF-03-05
- **AU-13 — Accept the school rules**
  - Before you start: You are on the school rules step.
  - Steps: Read the rules, tick the box and tap "Enter the app".
  - Expected: The rules are numbered in the school's order. "Enter the app" stays off until the box is ticked.
    After it, the home of your role opens (a student opens on the "Schedule" tab).
  - Design: AF-03-09, AF-03-10
- **AU-14 — Accept updated school rules**
  - Before you start: Your account finished onboarding. Ask an admin to add or edit a school rule.
  - Steps: Close the app completely and open it again.
  - Expected: A "School rules" screen says the rules were updated and asks you to accept them, with no way back and
    no sign-out. "Accept and continue" turns on once the box is ticked and opens your home.
  - Design: AF-03-14
- **AU-15 — Stay signed in**
  - Before you start: You are signed in.
  - Steps: Close the app completely and open it again, once online and once with the phone offline.
  - Expected: Both times the app opens where your account belongs, without asking you to sign in again.
  - Design: —

### Closed account

- **AU-16 — Registration denied**
  - Before you start: Your account is waiting for approval. Ask the school to deny it with a reason.
  - Steps: Keep the app open, or reopen it after the denial.
  - Expected: You get the "Registration denied" notification. The denied screen shows the school's reason in a
    card, exactly as written. "Talk to the school" opens a WhatsApp chat with the school (it only shows when the
    school has a number). "Use another email" signs you out and returns to sign-in.
  - Design: AF-04-07, AF-04-08
- **AU-17 — Delete your account and ask to come back**
  - Before you start: An approved student account. Not the school's only admin.
  - Steps: On "Profile", tap "Remove account" and confirm. Sign in again with the same address. Tap "Request
    reactivation".
  - Expected: Removing signs you out at once. Signing in again opens the deleted-account screen with "Request
    reactivation". After tapping it, the same screen switches to "Request sent".
  - Design: ST-05-07, AF-04-01, AF-04-04
- **AU-18 — Reactivation decided**
  - Before you start: AU-17 done. Ask the school to reactivate your account; on another try, to deny it with a
    reason.
  - Steps: Keep the app open, or reopen it after the decision.
  - Expected: Approved: you get the "Account reactivated" notification and the app opens your home, with your role
    and history back (seats cancelled when you deleted the account stay cancelled). Denied: you get "Reactivation
    denied", the screen shows the school's reason and offers only "Use another email".
  - Design: AF-04-05, AF-04-06
- **AU-19 — Access removed and restored**
  - Before you start: An approved account. Ask an admin to remove your account, and later to restore it.
  - Steps: Keep the app open while the admin acts.
  - Expected: After the removal you get "Access removed" and the app moves to a screen that says your access was
    removed and the account can't be reactivated from the app, with "Talk to the school" and "Use another email".
    After the restore you get "Access restored" and the app goes back to your home.
  - Design: AF-04-10

## Student app (`student`, IDs `ST-NN`)

**Description:** Everything an approved student does: browse the school's classes, ask for a seat, join a waiting
list, withdraw or cancel, follow their bookings and history, find people, manage the profile and read
notifications.

**Account to use:** The student account of your test set. The first sign-in asks for a WhatsApp number and the
school rules (see the auth flow). Many rows need
classes the school prepares or an admin's action: ask the school before testing them. Every notification also
shows on the Notifications screen (the bell on "Schedule"); check there when no push arrives.

### Schedule

- **ST-01 — The schedule opens on this week**
  - Before you start: The school has classes this week.
  - Steps: Open the "Schedule" tab.
  - Expected: The week (Monday to Sunday) is shown with today selected and highlighted. Days with classes have a
    dot. Each class card shows the sport and level, the time, the location, a seats bar with "N/M seats" and the
    confirmed students.
  - Design: ST-01-01
- **ST-02 — Switch between week and month**
  - Before you start: You are on "Schedule".
  - Steps: Tap the dates pill in the middle of the calendar header. Use the arrows. Pick a day. Tap the pill again.
  - Expected: The pill switches to the whole month and back. The arrows move one week in the week view and one
    month in the month view. Picking a day only selects it and shows its classes; the selected day stays selected
    when the view switches.
  - Design: ST-01-01, ST-01-02
- **ST-03 — Filter the classes by sport**
  - Before you start: The school has surf and skate classes this week.
  - Steps: Tap the round button at the bottom right and choose "Surf". Change day. Then choose "All".
  - Expected: Only surf classes, and only the days that have one, are shown while you move between days. "All"
    shows everything again. Leaving the screen and coming back starts on "All".
  - Design: ST-01-03, ST-01-04
- **ST-04 — A day without classes**
  - Before you start: You are on "Schedule".
  - Steps: Select a day with no class.
  - Expected: The day reads that there are no classes on it.
  - Design: ST-01-06
- **ST-05 — Open a class**
  - Before you start: You are on "Schedule".
  - Steps: Tap a class card.
  - Expected: The details show the date and time, the instructors, the seats ("Max. N students · X seats free"),
    the confirmed students, the notes (only when there are any), the cancellation deadline and the school rules, and
    the location with "Directions", which opens the phone's maps app.
  - Design: ST-02-01

### Request a seat

- **ST-06 — Request a seat**
  - Before you start: A class that hasn't started and has free seats. The school has written the cancellation rule
    for its sport.
  - Steps: Open the class. Tap "Request a seat". Tick "I read and accept the cancellation rule". Tap "Send request".
  - Expected: The sheet shows the class and its cancellation deadline. "Send request" stays off until the box is
    ticked. After sending you see "Request sent", the class shows your pending request, and its card in the
    schedule shows "Pending".
  - Design: ST-02-02, ST-02-05, ST-02-06
- **ST-07 — Withdraw a pending request**
  - Before you start: ST-06 done.
  - Steps: On the class, tap "Withdraw request", then "Yes, withdraw".
  - Expected: You see "Request withdrawn". The class offers "Request again" and its card shows "Withdrawn".
  - Design: ST-02-07, ST-02-19
- **ST-08 — Join and leave the waiting list**
  - Before you start: A full class that hasn't started. The waiting list is on (ask the school).
  - Steps: Open the class. Tap "Join the waiting list", tick the box and confirm. Then tap "Leave the waiting list".
  - Expected: The class shows the "class full" banner and offers "Join the waiting list". After joining you see
    "You're on the waiting list". Leaving takes effect at once, with no confirmation.
  - Design: ST-02-08, ST-02-09, ST-02-10
- **ST-09 — The waiting list is closed**
  - Before you start: A full class that hasn't started. Ask the school to turn the waiting list off.
  - Steps: Open the class.
  - Expected: There is no request button, and the class says "The waiting list is closed for this class."
  - Design: ST-02-11
- **ST-10 — Your request is approved**
  - Before you start: A pending request (ST-06). Ask the school to approve it.
  - Steps: Open the notification.
  - Expected: You get "Request approved", which opens the class. The class shows you are enrolled and that your
    seat is guaranteed, with no button, and its card shows "Approved".
  - Design: ST-02-12
- **ST-11 — Your request is denied**
  - Before you start: A pending request. Ask the school to deny it with a reason.
  - Steps: Open the notification. On the class, tap the denied request.
  - Expected: You get "Request denied" with the reason. The class shows the request was denied; tapping it opens a
    sheet with the school's reason. "Request again" is offered until the class starts, and the card shows "Denied".
  - Design: ST-02-17, ST-02-18
- **ST-12 — Cancel your seat before the deadline**
  - Before you start: An approved seat in a class whose cancellation deadline hasn't passed.
  - Steps: On the class, tap "Cancel enrolment", then "Yes, cancel".
  - Expected: The sheet shows until when you can cancel. After confirming you see "Enrolment cancelled", the class
    says your seat was freed and offers "Request again", and the card shows "You cancelled".
  - Design: ST-02-13, ST-02-14
- **ST-13 — The cancellation deadline has passed**
  - Before you start: An approved seat in a class that hasn't started but whose cancellation deadline has passed.
  - Steps: Open the class.
  - Expected: There is no "Cancel enrolment". The class says when the deadline ended and asks you to contact the
    school, with "Talk to the school", which opens WhatsApp.
  - Design: ST-02-15
- **ST-14 — Enrolled and taken out by the school**
  - Before you start: Ask an admin to enrol you directly in a class, and then to take you out of it with a reason.
  - Steps: Open each notification.
  - Expected: You get a notification that the school enrolled you, which opens the class with your seat confirmed.
    After the take-out you get "You were taken out of a class" with the reason; the class shows it with the reason,
    offers "Request again", and the card shows "Taken out".
  - Design: ST-02-12, ST-02-22
- **ST-15 — A class is cancelled by the school**
  - Before you start: A seat or a pending request in a class. Ask an admin to cancel it with a message.
  - Steps: Open the notification.
  - Expected: You get "Class cancelled" with the admin's message. The card shows "Cancelled" with its time struck
    through, and the class shows the cancellation with the message and offers no button.
  - Design: ST-02-25
- **ST-16 — Class reminder**
  - Before you start: An approved seat in a class that starts within the next hour.
  - Steps: Wait until about 30 minutes before the start.
  - Expected: You get "Your class starts soon", with the start time and the location. Tapping it opens the class.
  - Design: ST-06-01
- **ST-17 — A class under way and a finished class**
  - Before you start: A class that has started, and one that has finished.
  - Steps: Open each class.
  - Expected: The class under way is marked "In progress" with its start and end times, and offers no request
    button. The finished one is marked as finished, its card is faded and it offers no button.
  - Design: ST-02-23, ST-02-24

### Bookings and history

- **ST-18 — Follow your bookings**
  - Before you start: You have requests in several states (pending, approved, withdrawn…).
  - Steps: Open the "Bookings" tab. Tap "Pending", "Confirmed", "Ended" and "All".
  - Expected: Every class you asked for that hasn't ended is listed by start time, each with the chip of its latest
    request. Each filter shows only its group; a filter with nothing in it says so. Leaving the tab resets the
    filter to "All".
  - Design: ST-03-01, ST-03-02, ST-03-03, ST-03-04, ST-03-07
- **ST-19 — See your class history**
  - Before you start: You held a seat in a class that has finished.
  - Steps: On "Bookings", tap the round history button. Tap a day with a dot, then the chip that appears.
  - Expected: The current month opens with a dot on each day you took a class, and the classes listed by day,
    newest first. Tapping a day narrows the list to it with a chip; the chip shows the whole period again.
  - Design: ST-03-10, ST-03-11

### People

- **ST-20 — Find people**
  - Before you start: You are an approved student.
  - Steps: Open the "School" tab. Search a name without its accents ("joao" for "João"). Toggle a role.
  - Expected: The screen shows how many people are on the platform and the list A–Z. The search ignores case and
    accents; the role toggles narrow the list; a search with no match says nobody was found.
  - Design: ST-04-01, ST-04-02, ST-04-03
- **ST-21 — Contact someone on WhatsApp**
  - Before you start: Someone who shares their number, and someone who hides it.
  - Steps: Tap each person.
  - Expected: A sheet shows the person's name and role. For the one who shares, "Chat on WhatsApp" shows the number
    and opens WhatsApp. For the other, the row is off and says "Number not shared."
  - Design: ST-04-06, ST-04-07

### Profile

- **ST-22 — Edit your name**
  - Before you start: You are on "Profile".
  - Steps: Open "Edit profile". Clear the name, then type a new one and save.
  - Expected: The email can't be changed. An invalid name shows a message and can't be saved; a valid one is saved
    and shown on "Profile".
  - Design: ST-05-13, ST-05-14
- **ST-23 — Change your WhatsApp number and its visibility**
  - Before you start: You are on "Profile".
  - Steps: Open "WhatsApp". Change the number and switch sharing on. Save.
  - Expected: The new number is saved; "Profile" shows whether it is visible or hidden. Other students see it in
    People only while it is shared.
  - Design: ST-05-16, ST-05-17
- **ST-24 — Change the theme and the language**
  - Before you start: You are on "Profile".
  - Steps: Tap "Theme" and pick dark. Tap "Language" and pick another one. Sign out and sign in again.
  - Expected: Each choice applies at once, to the whole app. Both stay after signing out and in.
  - Design: ST-05-03, ST-05-04
- **ST-25 — Turn push notifications off and on**
  - Before you start: You are on "Profile".
  - Steps: Turn "Push notifications" off. Ask the school for something that notifies you. Turn it on again.
  - Expected: While off, no push arrives but the notification still shows on the Notifications screen. If the
    phone's permission is refused, the switch stays off with a message.
  - Design: ST-05-01, ST-05-02
- **ST-26 — Read the school rules and the cancellation rules**
  - Before you start: You are on "Profile".
  - Steps: Open "School rules", go back, then open "Cancellation rules".
  - Expected: The school rules are listed, numbered and read-only. The cancellation rules open in a sheet with one
    card for surf and one for skate; a missing one says the school hasn't written it yet.
  - Design: ST-05-09, ST-05-19
- **ST-27 — Sign out**
  - Before you start: You are on "Profile".
  - Steps: Tap "Sign out" and confirm.
  - Expected: A sheet asks for confirmation; confirming returns to the sign-in screen.
  - Design: ST-05-06

### Notifications

- **ST-28 — Read your notifications**
  - Before you start: You have unread notifications.
  - Steps: On "Schedule", tap the bell. Tap one notification. Go back and tap "Mark all as read".
  - Expected: The bell shows the number of unread notifications. The list shows the newest first, each unread one
    with a dot. Tapping one marks it read and opens what it is about. "Mark all as read" clears every dot and the
    bell's number.
  - Design: ST-06-01

## Instructor app (`instructor`, IDs `IN-NN`)

**Description:** Everything an approved instructor does: see the home and the school's classes, follow the classes
they teach and have taught, see who is in each class, check the weekly occupancy, find people, manage the profile
and read notifications. Instructors only read: the school makes every enrolment and schedule change.

**Account to use:** The instructor account of your test set. Ask the school (or your set's admin) to assign you to a
few classes: one under way or later today, others in the coming days, and one that has finished. Every
notification also shows on the Notifications screen (the bell on "Home"); check there when no push arrives.

### Home

- **IN-01 — The home**
  - Before you start: You are assigned to classes.
  - Steps: Open the "Home" tab.
  - Expected: The home shows "My classes" with how many classes are assigned to you, "Rules" with how many rules
    the school has, and the bell. With no class assigned, "My classes" says so.
  - Design: IN-01-01, IN-01-02

### Classes

- **IN-02 — Browse the classes**
  - Before you start: The school has classes this week.
  - Steps: Open the "Classes" tab. Switch to the month and back, change day and filter by sport.
  - Expected: It works as the student's schedule: the week with today selected, dots on days with classes, the
    month view, and the sport filter that resets when you leave.
  - Design: IN-02-01, IN-02-02, IN-02-03, IN-02-04

### A class

- **IN-03 — A class you teach**
  - Before you start: A class you teach, with students and a trial guest (ask the school).
  - Steps: Open it.
  - Expected: You appear as "You" among the instructors. The students are listed by name, and the guest by name
    with "Trial". A note says the school handles enrolments and schedule changes. There is no request button and
    no tools button.
  - Design: IN-03-01, IN-03-05
- **IN-04 — A class of another instructor**
  - Before you start: A class you don't teach, with a trial guest.
  - Steps: Open it.
  - Expected: The class is read-only. The guest shows as "Trial" without a name.
  - Design: IN-03-02
- **IN-05 — See a student's details**
  - Before you start: A class with students.
  - Steps: Tap a student in the class.
  - Expected: A sheet shows the student's name and role, and "Chat on WhatsApp" when they share their number, or
    "Number not shared." when they don't.
  - Design: IN-03-10

### My classes and past classes

- **IN-06 — Follow your classes**
  - Before you start: You are assigned to classes.
  - Steps: On "Home", tap "My classes". Filter by sport.
  - Expected: Classes under way come first, highlighted and marked "In progress". The others are grouped by day
    ("Today", "Tomorrow" or the weekday); the next one has the "Next" chip. The sport filter keeps only that sport.
  - Design: IN-04-01, IN-04-02, IN-04-03
- **IN-07 — See the classes you taught**
  - Before you start: You taught a class that has finished.
  - Steps: On "My classes", tap the clock button. Tap a day with a dot.
  - Expected: "Past classes" opens on this month with a dot on each day you taught, and the classes by day, newest
    first. Tapping a day narrows the list with a chip that clears it.
  - Design: IN-04-08, IN-04-09
- **IN-08 — Weekly occupancy**
  - Before you start: The school has classes this week.
  - Steps: Open the weekly occupancy. Tap a cell. Move to the next week.
  - Expected: The week's summary (occupancy, seats, free seats, full classes) and a map of the week, one column per
    day and one cell per class with its occupancy. Tapping a cell shows that class's card, which opens it. The
    arrows move one week.
  - Design: IN-05-01, IN-05-02, IN-05-03

### Notifications about your classes

- **IN-09 — Assigned to classes**
  - Before you start: Ask an admin to create a class with you as its instructor.
  - Steps: Open the notification.
  - Expected: You get "New classes on your schedule", and the class shows in "My classes".
  - Design: IN-06-06
- **IN-10 — A class of yours changes**
  - Before you start: Ask an admin to change the time of one of your classes, then to take you off another one.
  - Steps: Open each notification.
  - Expected: You get "Class changed", which opens the class with its new time, and "Removed from a class" for the
    other.
  - Design: IN-06-06
- **IN-11 — A class of yours is cancelled or deleted**
  - Before you start: Ask an admin to cancel one of your classes with a message, and to delete another one.
  - Steps: Open each notification.
  - Expected: You get "Class cancelled" with the message, and "Class deleted" with the class's sport, day and time.
  - Design: IN-06-06
- **IN-12 — Students ask for and cancel seats**
  - Before you start: Ask a student to request a seat in one of your classes, and another to cancel an approved
    seat in one.
  - Steps: Open each notification.
  - Expected: You get "New seat request" and "Seat cancelled", each naming the student and opening the class.
  - Design: IN-06-06
- **IN-13 — Class reminder**
  - Before you start: You teach a class that starts within the next hour.
  - Steps: Wait until about 30 minutes before the start.
  - Expected: You get "Your class starts soon", with the start time and the location.
  - Design: IN-06-06

### People and profile

- **IN-14 — Find people**
  - Before you start: You are an approved instructor.
  - Steps: Open the "People" tab, search and filter by role, then tap a person.
  - Expected: It works as for students: the list A–Z, search ignoring accents, role toggles, and the person's sheet
    with WhatsApp when they share their number.
  - Design: IN-06-01
- **IN-15 — Your profile and the school rules**
  - Before you start: You are on "Profile".
  - Steps: Edit your name, change your WhatsApp number, switch the theme and the language, and open "School rules".
    On "Home", tap "Rules".
  - Expected: Each change is saved or applied at once, as for students. The school rules are read-only from both
    places.
  - Design: IN-06-02, IN-06-03, IN-06-04, IN-06-05
- **IN-16 — Read your notifications**
  - Before you start: You have unread notifications.
  - Steps: On "Home", tap the bell. Tap one notification, then "Mark all as read".
  - Expected: The bell shows the unread count; the list shows the newest first with dots on the unread ones;
    tapping one marks it read and opens what it is about; "Mark all as read" clears every dot.
  - Design: IN-06-06

## Admin app (`admin`, IDs `AD-NN`)

**Description:** Everything an approved admin does to run the school: decide registrations, reactivations and
class requests, create, edit, cancel and delete classes, manage locations, enrol students and trial guests, send
notices and class messages, change roles, remove and restore accounts, set the school's settings, cancellation
rules and school rules, and teach when they also are an instructor.

**Account to use:** The admin account of your test set. Many rows need a second person — a student or an
instructor — on another phone: use your set's student and instructor accounts, or test with another tester. Every
notification also shows on the Notifications screen (the bell on "Home"); check there when no push arrives.

### Home

- **AD-01 — The home**
  - Before you start: You are an approved admin.
  - Steps: Open the "Home" tab.
  - Expected: "Tools" lists "Join the school", "Reactivate accounts", "Class enrolments", "Enrol a student",
    "Create classes" and "Send notice", with the number waiting where there is one. "School" lists the rules,
    people, weekly occupancy, school settings and cancellation rules.
  - Design: AD-01-01, AD-01-02

### Accounts

- **AD-02 — Approve a registration**
  - Before you start: Someone just created an account (another tester, or AU-04 on another phone).
  - Steps: Open the notification. On "Join the school", tap the person's card, then "Approve".
  - Expected: You get "New registration" with the person's name. The tool lists a card per account waiting, oldest
    first; tapping the card shows the person's details. "Approve" removes the card at once, and the person is told.
  - Design: AD-07-01, AD-07-03
- **AD-03 — Deny a registration with a reason**
  - Before you start: An account is waiting for approval.
  - Steps: On "Join the school", tap "Deny", write a reason and tap "Deny and notify".
  - Expected: The sheet asks for an optional reason. The card leaves the list, and the person sees the reason on
    their screen.
  - Design: AD-07-02
- **AD-04 — Decide a reactivation request**
  - Before you start: A deleted account asked to come back (AU-17 on another phone).
  - Steps: Open the notification. On "Reactivate accounts", tap "Reactivate" on one request; deny another with a
    reason.
  - Expected: You get "Reactivation request". Each card shows the name, email and when the account was deleted.
    Reactivating or denying removes the card, and the person is told.
  - Design: AD-07-07, AD-07-08
- **AD-05 — Remove and restore an account**
  - Before you start: Another approved person.
  - Steps: On "People", tap the person, then "Remove from the platform" and confirm. Open "Removed accounts" and tap
    "Restore".
  - Expected: The confirmation says what the person loses. After it the person leaves the list and loses access.
    "Removed accounts" lists them with the date until they can be restored; "Restore" brings them back to the list
    at once, with their role.
  - Design: AD-09-06, AD-07-12

### Classes

- **AD-06 — Browse the classes**
  - Before you start: The school has classes.
  - Steps: Open the "Classes" tab. Pick today, a later day and a past day.
  - Expected: It works as the student's schedule. You also get a "+" in the header, "Create class" on an empty
    day and "Create class on this day" below a day's classes (today or later only). A class with no instructor or
    no cancellation deadline shows a warning chip on its card.
  - Design: AD-02-01, AD-02-05, AD-02-06
- **AD-07 — Create classes in a batch**
  - Before you start: You are on "Create classes".
  - Steps: Pick Surf, a level, a location and an instructor. Pick a range of days and tap one day in it to remove it.
    Pick two times. Tap the create button.
  - Expected: The removed day is struck through. The screen sums up "N days × M times · location", and the button
    shows how many classes it creates. After creating you see "N classes created", the classes appear on
    "Classes", and the instructor is told.
  - Design: AD-04-01, AD-04-02, AD-04-06
- **AD-08 — Add a time**
  - Before you start: You are on "Create classes".
  - Steps: Tap "New time". Try an end before the start, then a valid time that overlaps a chosen one.
  - Expected: An end before the start can't be saved. A time that overlaps a chosen one can't be chosen with it.
  - Design: AD-04-03
- **AD-09 — Add a location on the map**
  - Before you start: You are on "Create classes".
  - Steps: Tap "New location". Search an address and pick a suggestion. Tap elsewhere on the map. Name it and tap
    "Save location". Then try a new location with the same name.
  - Expected: Suggestions appear as you type; picking one moves the map and the pin there and fills the name.
    Tapping the map moves the pin. Saving returns to the form with the location chosen. A name already in use is
    refused.
  - Design: AD-04-07, AD-04-08, AD-04-10
- **AD-10 — Edit and remove a location**
  - Before you start: A location used by upcoming classes.
  - Steps: On "Create classes", tap "Manage", then a location. Change its name and save with the notify box ticked.
    Then remove another location.
  - Expected: The edit applies to every class at that location, and the people of its upcoming classes are told
    ("Class location changed"). "Remove location" says how many classes keep it; the removed location leaves the
    list, and its classes keep showing it.
  - Design: AD-04-04, AD-04-05, AD-04-09
- **AD-11 — Edit a class**
  - Before you start: A class that hasn't started, with a student enrolled.
  - Steps: On the class, tap the tools button, then "Edit class". Change the time and tap "Save and notify".
  - Expected: The footer says who will be told. "Save and notify" is on only when something changed. You see
    "Changes saved", and the class's students and instructors get "Class changed". On a class under way, only
    the instructors can be changed.
  - Design: AD-03-09, AD-04-11, AD-04-12
- **AD-12 — Cancel a class**
  - Before you start: A class that hasn't finished, with a student enrolled.
  - Steps: On the class tools, tap "Cancel class", write a message and tap "Cancel and notify".
  - Expected: The sheet says how many people will be told. You see "Class cancelled"; the class stays on the
    schedule marked "Cancelled", shows the message and has no tools any more. Its students and instructors get the
    message.
  - Design: AD-03-11, AD-03-08
- **AD-13 — Delete a class**
  - Before you start: A class that hasn't started and has nobody in it, and another with a student.
  - Steps: On the empty class, tap "Delete class" in the tools and confirm. Open the tools of the other class.
  - Expected: The empty class is deleted ("Class deleted") and leaves the schedule; its instructors are told. On
    the class with a student, "Delete class" is off and says it has enrolments.
  - Design: AD-03-12, AD-03-10, AD-03-09
- **AD-14 — A class without an instructor or a deadline**
  - Before you start: A class whose only instructor was demoted or deleted, or one without a cancellation deadline.
  - Steps: Open the class and tap its warning banner.
  - Expected: "No instructor" opens the class editor; assigning an instructor clears the warning. "No cancellation
    deadline" opens the cancellation rules.
  - Design: AD-03-02, AD-03-03

### Messages

- **AD-15 — Send a notice**
  - Before you start: You are on "Send notice".
  - Steps: Pick "Students". Write a title and a message. Tap "Send", then "Yes, send".
  - Expected: Each audience shows how many people will receive it. "Send" stays off while a field is empty. The
    sheet asks to confirm and previews the notice. You see "Notice sent", and every student gets it.
  - Design: AD-05-01, AD-05-02, AD-05-03, AD-05-04
- **AD-16 — Message one class**
  - Before you start: A class that hasn't finished, with students.
  - Steps: On the class tools, tap "Send message". Write a title and a message and send it.
  - Expected: The screen shows the class and who receives it. You see "Message sent". Its students and instructors
    get the message, with the class named before it; you don't.
  - Design: AD-05-05, AD-05-06

### Enrolments

- **AD-17 — Approve a class request**
  - Before you start: A student requested a seat (ST-06 on another phone).
  - Steps: Open the notification. On "Class enrolments", tap "Enrol" on the request.
  - Expected: You get "New seat request". The tool lists each class with pending requests and its free seats; each
    request shows the student and when they asked. "Enrol" removes the request with a confirmation message, and the
    student gets "Request approved".
  - Design: AD-06-01, AD-06-05
- **AD-18 — Deny a class request**
  - Before you start: A pending class request.
  - Steps: Tap "Deny" on it, write a reason and tap "Deny and notify".
  - Expected: The request leaves the list, and the student gets "Request denied" with the reason.
  - Design: AD-06-04
- **AD-19 — A full class with a waiting list**
  - Before you start: A full class with requests on its waiting list.
  - Steps: Open "Class enrolments".
  - Expected: The class shows its waiting list in the order of the requests (1st, 2nd…), and "Enrol" is off while
    the class is full, with a note explaining why.
  - Design: AD-06-02
- **AD-20 — Enrol a school student**
  - Before you start: An approved student and a class with free seats that hasn't started.
  - Steps: On "Enrol a student", search and pick the student, tap "Choose class", pick a day and a class, and tap
    "Enrol".
  - Expected: Full classes can't be picked. After enrolling, a confirmation says the student was told, and the
    student holds a seat in the class.
  - Design: AD-08-01, AD-08-02, AD-08-06, AD-08-09
- **AD-21 — Add a trial guest**
  - Before you start: A class with free seats that hasn't started.
  - Steps: On "Enrol a student", switch to "Trial class", type a name and a WhatsApp number, choose the class and
    enrol.
  - Expected: The guest takes a seat. On the class, you see the guest by name with "Trial", and the seats line says
    it includes a trial. Students see only "Trial".
  - Design: AD-08-05, AD-03-01
- **AD-22 — Take a student or a guest out**
  - Before you start: A class that hasn't started, with a student and a guest.
  - Steps: On the class, tap "Remove" next to the student, write a reason and confirm. Do the same for the guest.
  - Expected: The student's sheet asks for an optional reason; the guest's says to warn them on WhatsApp. Each one
    leaves the class with a confirmation, the seat frees, and the student is told with the reason.
  - Design: AD-03-14, AD-03-15, AD-03-17
- **AD-23 — A student cancels a seat**
  - Before you start: A student cancels an approved seat (ST-12 on another phone).
  - Steps: Open the notification.
  - Expected: You get "Seat cancelled" with the student's name, the class and, when someone waits, how many are on
    the waiting list. It opens the class.
  - Design: AD-11-08

### People and roles

- **AD-24 — See every WhatsApp number**
  - Before you start: Someone who hides their number.
  - Steps: On "People", tap that person.
  - Expected: As an admin you see their number and can open WhatsApp, even though it is hidden from others.
  - Design: AD-09-01, AD-09-02
- **AD-25 — Change someone's role**
  - Before you start: An approved student.
  - Steps: On "People", tap the student, then "Promote to instructor" and confirm. Then promote them to admin with
    "Also an instructor" ticked.
  - Expected: Each action asks for confirmation and says what changes. The list shows the new role, and the person
    gets "Your role changed" and moves to the new role's app.
  - Design: AD-09-02, AD-09-03, AD-09-05
- **AD-26 — Mark yourself as also an instructor**
  - Before you start: You are an approved admin.
  - Steps: On "People", tap your own name. Tick "Also an instructor". Then open "Create classes".
  - Expected: Your sheet shows "Also an instructor" with no role actions for yourself. Ticking it applies at once,
    with no message. On "Create classes" you can now be picked as an instructor; unticking it takes you off that
    list again.
  - Design: AD-09-04

### School

- **AD-27 — Weekly occupancy**
  - Before you start: The school has classes this week.
  - Steps: On "Home", open "Weekly occupancy". Tap a cell. Move one week back.
  - Expected: The week's summary and map as for instructors; the selected class's card opens the class.
  - Design: AD-11-03
- **AD-28 — School settings**
  - Before you start: You are on "School settings".
  - Steps: Turn the waiting list off. Type the school's WhatsApp number. Tap "Save".
  - Expected: The explanation under the switch changes when it is off. "Save" is on only when something changed and
    the number is valid. You see "Settings saved"; students then can't join the waiting list of a full class, and
    "Talk to the school" uses the new number.
  - Design: AD-10-01, AD-10-02
- **AD-29 — Cancellation rules**
  - Before you start: You are on "Cancellation rules".
  - Steps: Switch to Surf, write a rule and save it.
  - Expected: Saving is possible only once the text changed and isn't empty, and confirms it. Students see the rule
    in their profile. Upcoming surf classes get a cancellation deadline after a few minutes.
  - Design: AD-10-05, AD-10-06
- **AD-30 — Manage the school rules**
  - Before you start: You are on the school rules from "Home".
  - Steps: Add a rule. Edit it. Move it up with the arrow. Delete it.
  - Expected: Each sheet warns that everyone must accept the rules again. Adding, saving and deleting each confirm
    with a message; the arrows move a rule at once. At the next launch, everyone (you included) is asked to accept
    the updated rules.
  - Design: AD-10-09, AD-10-10, AD-10-11, AD-10-12

### Teaching, profile and notifications

- **AD-31 — Teach as an admin**
  - Before you start: You have "Also an instructor" and are assigned to a class.
  - Steps: On "Home", open "My classes", then the clock button.
  - Expected: "My classes" and "Past classes" work as for instructors. An admin without "Also an instructor" can't
    be picked as a class's instructor.
  - Design: AD-11-01, AD-11-02
- **AD-32 — Your profile**
  - Before you start: You are on "Profile".
  - Steps: Edit your name and WhatsApp number, switch the theme and the language, and open the school rules.
  - Expected: Each change is saved or applied at once, as for students.
  - Design: AD-11-04, AD-11-05, AD-11-06, AD-11-07
- **AD-33 — Read your notifications**
  - Before you start: You have unread notifications.
  - Steps: On "Home", tap the bell. Tap one notification, then "Mark all as read".
  - Expected: The bell shows the unread count; the list shows the newest first with dots on the unread ones;
    tapping one marks it read and opens what it is about; "Mark all as read" clears every dot.
  - Design: AD-11-08
