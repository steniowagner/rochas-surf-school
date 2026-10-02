# Spec Delta

## Purpose

Controls how students and guests get into classes, with admins deciding every seat, and how seats are given up or taken away.

## ADDED Requirements

### Requirement: Requesting a class
Students SHALL be able to request a seat in any class that hasn't started. A student SHALL be able to request the same class again, as many times as they want, once an earlier request for it has ended.

#### Scenario: Request sent
- **WHEN** a student requests a seat in an upcoming class
- **THEN** a pending request is created

#### Scenario: Requesting again after a denial
- **WHEN** a student whose request was denied requests the same class again before it starts
- **THEN** a new pending request is created

#### Scenario: Class already started
- **WHEN** a student tries to request a class that has started
- **THEN** no request is created

### Requirement: New request notification
When a student requests a class, admins and the class's instructors SHALL be notified.

#### Scenario: Request arrives
- **WHEN** a student requests a class
- **THEN** admins and the class's instructors are notified

### Requirement: Seats
A pending request SHALL NOT hold a seat. A class's seats taken SHALL count its approved students and its guests. Everyone who can see a class SHALL see its capacity and how many seats are taken.

#### Scenario: More requests than seats
- **WHEN** a class with 8 seats has 12 pending requests and no approved students
- **THEN** all 8 seats are still free

#### Scenario: Seeing a class's seats
- **WHEN** any user opens a class
- **THEN** they see its capacity and how many seats are taken

### Requirement: Approving a request
Admins SHALL be able to approve a pending request only while the class has a free seat and hasn't started. The student SHALL be notified.

#### Scenario: Free seat
- **WHEN** an admin approves a pending request for a class with a free seat
- **THEN** the student takes a seat and is notified

#### Scenario: Full class
- **WHEN** a class has no free seat
- **THEN** admins cannot approve its pending requests

### Requirement: Denying a request
Admins SHALL be able to deny a pending request and give a reason. The student SHALL be notified, with the reason when one was given.

#### Scenario: Request denied
- **WHEN** an admin denies a request and writes a reason
- **THEN** the student is notified of the denial and the reason

### Requirement: Waiting list
While a class has no free seat, its pending requests SHALL be shown as "on the waiting list" to their students and to admins. Admins SHALL see a class's waiting list in the order students asked, with the time each one asked.

#### Scenario: Class fills up
- **WHEN** the last seat of a class is taken while requests are pending
- **THEN** those requests show as "on the waiting list"

#### Scenario: Seat frees up
- **WHEN** a seat frees up in a full class
- **THEN** its waiting requests show as pending again
- **AND** admins can approve any of them

#### Scenario: Admin views the waiting list
- **WHEN** an admin views a full class's requests
- **THEN** they are listed in the order students asked, each with the time it was made

### Requirement: No notice when a seat opens
Students on the waiting list SHALL NOT be notified when a seat opens. They SHALL be notified when their request is approved, denied or expires.

#### Scenario: Seat opens
- **WHEN** a seat opens in a class with waiting requests
- **THEN** the waiting students are not notified

### Requirement: Waiting list switch
Admins SHALL be able to turn the waiting list on or off, and it SHALL be on by default. While it is off, students SHALL NOT be able to request a class that has no free seat.

#### Scenario: Waiting list off
- **WHEN** the waiting list is off and a student views a full class
- **THEN** they cannot request it

#### Scenario: Waiting list on
- **WHEN** the waiting list is on and a student requests a full class
- **THEN** the request is created and shows as "on the waiting list"

### Requirement: Withdrawing a request
Students SHALL be able to withdraw a pending request until the class starts. Nobody SHALL be notified.

#### Scenario: Request withdrawn
- **WHEN** a student withdraws a pending request
- **THEN** the request ends and nobody is notified

### Requirement: Expiry
Requests still pending when a class starts SHALL expire, and their students SHALL be notified that they didn't get a seat.

#### Scenario: Class starts with pending requests
- **WHEN** a class starts while requests for it are still pending
- **THEN** those requests expire
- **AND** their students are notified that they didn't get a seat

### Requirement: Cancellation notification
When a student cancels their seat, or deleting their account cancels it, admins SHALL be notified with the number of students on the class's waiting list, and the class's instructors SHALL be notified.

#### Scenario: Student cancels
- **WHEN** a student cancels their seat in a class with 2 waiting requests
- **THEN** admins are notified of the cancellation, with 2 students waiting
- **AND** the class's instructors are notified

#### Scenario: Student deletes their account
- **WHEN** a student with upcoming seats deletes their account
- **THEN** admins and each class's instructors are notified as for a cancellation

### Requirement: Direct enrolment
Admins SHALL be able to enrol a student directly, without a request, in a class that hasn't started and has a free seat. If the student has a pending request for that class, it SHALL become approved. The student SHALL be notified.

#### Scenario: Student enrolled directly
- **WHEN** an admin enrols a student directly in a class with a free seat
- **THEN** the student takes a seat and is notified

#### Scenario: Student with a pending request
- **WHEN** an admin enrols a student who has a pending request for that class
- **THEN** the pending request becomes approved

### Requirement: Taking a student out
Admins SHALL be able to take an approved student out of a class that hasn't started, with an optional reason. The student SHALL be notified, with the reason when one was given.

#### Scenario: Student taken out
- **WHEN** an admin takes a student out of a class and writes a reason
- **THEN** the student loses their seat
- **AND** they are notified with the reason

### Requirement: Guests
Admins SHALL be able to enrol a guest, someone without an account who is trying the sport, in a class that hasn't started and has a free seat, by entering the guest's name and WhatsApp number. A guest SHALL take a seat.

#### Scenario: Guest enrolled
- **WHEN** an admin enrols a guest with their name and WhatsApp number
- **THEN** the guest takes a seat in the class

#### Scenario: Full class
- **WHEN** a class has no free seat
- **THEN** admins cannot enrol a guest in it

### Requirement: Guests get nothing from the app
The app SHALL NOT send anything to guests. When an admin edits or cancels a class that has guests, the app SHALL warn the admin that the guests won't be notified.

#### Scenario: Class with a guest cancelled
- **WHEN** an admin cancels a class that has a guest
- **THEN** the app warns the admin that the guest won't be notified

### Requirement: Class lists
Everyone who can see a class SHALL see who holds its seats: approved students by name, and guests labelled "Trial". Admins and the class's instructors SHALL also see each guest's name.

#### Scenario: Student views the class list
- **WHEN** a student views the people in a class that has a guest
- **THEN** the guest appears as "Trial"

#### Scenario: Instructor views the class list
- **WHEN** an instructor views the people in a class they teach that has a guest
- **THEN** they see the guest's name

### Requirement: Trial classes don't carry over
A guest's trial class SHALL NOT be linked to an account the guest creates later.

#### Scenario: Former guest signs up
- **WHEN** a former guest creates an account
- **THEN** their trial class does not appear in their history

### Requirement: Request statuses
Students SHALL be able to see the status of each of their requests: pending (shown as "on the waiting list" while the class is full), approved, denied, withdrawn, cancelled, taken out, expired, or class cancelled.

#### Scenario: Class cancelled
- **WHEN** a class a student had a seat in is cancelled
- **THEN** the student sees that request's status as class cancelled
