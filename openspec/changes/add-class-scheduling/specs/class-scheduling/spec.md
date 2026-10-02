# Spec Delta

## Purpose

Lets admins schedule surf and skate classes, one at a time or in batches, and defines each class's states and what can change in each.

## ADDED Requirements

### Requirement: Class details
A class SHALL have a discipline (surf or skate), a level (beginner, advanced or expert), a date, a start time and an end time, one location, at least one instructor, a capacity, and optional notes of up to 300 characters. The level SHALL only be a label.

#### Scenario: Class without an instructor
- **WHEN** an admin tries to save a class with no instructor
- **THEN** the class is not saved

#### Scenario: Notes too long
- **WHEN** an admin writes notes longer than 300 characters
- **THEN** the notes are not accepted

#### Scenario: Level is only a label
- **WHEN** a student requests a class marked as expert
- **THEN** the class's level doesn't affect the request

### Requirement: Time zone
All class dates and times SHALL be in the America/Fortaleza time zone, whatever time zone a phone uses.

#### Scenario: Phone in another time zone
- **WHEN** a user whose phone is set to another time zone views a class that starts at 08:00
- **THEN** the class is shown as starting at 08:00, Fortaleza time

### Requirement: Batch creation
Admins SHALL be able to create classes in a batch by choosing a date range, the weekdays to include, and one or more time ranges. The system SHALL create one class for each included day and time range, all sharing the batch's discipline, level, location, instructors, capacity and notes.

#### Scenario: Two days and two time ranges
- **WHEN** an admin creates a batch from Thursday to Saturday with only Wednesday, Thursday and Friday included, and two time ranges
- **THEN** four classes are created: two on Thursday and two on Friday

### Requirement: Time range suggestions
When an admin creates a batch, the system SHALL suggest the time ranges used by the previous week's classes, and admins SHALL be able to add other time ranges. The system SHALL NOT keep a separate saved list of time ranges.

#### Scenario: Suggestions from last week
- **WHEN** an admin starts a batch and last week had classes from 08:00 to 09:00 and from 16:00 to 17:00
- **THEN** both time ranges are suggested

#### Scenario: New time range
- **WHEN** an admin adds a time range that no class used last week
- **THEN** it is used for this batch only
- **AND** it is suggested later only if classes in the previous week use it

### Requirement: Valid time ranges
Each time range SHALL end after it starts, and time ranges in the same batch SHALL NOT overlap. Classes from different batches SHALL be allowed to overlap.

#### Scenario: Overlapping time ranges in one batch
- **WHEN** an admin adds 08:00 to 09:00 and 08:30 to 09:30 to the same batch
- **THEN** the batch can't be created until the overlap is removed

#### Scenario: Time range ending before it starts
- **WHEN** an admin adds a time range from 10:00 to 09:00
- **THEN** the time range is not accepted

#### Scenario: Overlapping batches
- **WHEN** an admin creates a batch whose classes overlap classes from another batch
- **THEN** the classes are created

### Requirement: No classes in the past
The system SHALL NOT create a class whose start time has already passed.

#### Scenario: Earlier time today
- **WHEN** an admin tries to create a class today at a time that has already passed
- **THEN** the class is not created

### Requirement: Editing a class
Admins SHALL be able to edit a single class. An edit SHALL NOT move a class's start into the past.

#### Scenario: One class edited
- **WHEN** an admin edits one class from a batch
- **THEN** only that class changes

#### Scenario: Moving a class into the past
- **WHEN** an admin changes a class's date to yesterday
- **THEN** the change is refused

### Requirement: Edit notifications
When a class is edited, its students, anyone with a pending request for it, and its instructors SHALL be notified.

#### Scenario: Time changed
- **WHEN** an admin changes a class's time
- **THEN** its students, the people with pending requests for it and its instructors are notified

### Requirement: Class states
A class SHALL be not started until its start time, started from its start time until its end time, and finished after its end time. These changes SHALL happen on their own at those times. A class SHALL become cancelled only when an admin cancels it.

#### Scenario: Class reaches its start time
- **WHEN** a class's start time arrives
- **THEN** the class is started, without anyone acting

#### Scenario: Class reaches its end time
- **WHEN** a class's end time arrives
- **THEN** the class is finished

### Requirement: Changes after a class starts
Once a class has started, admins SHALL only be able to cancel it or change its instructors. Once it has finished, the class itself SHALL NOT change, and only ratings, comments and photos SHALL be added to it.

#### Scenario: Editing a started class
- **WHEN** an admin tries to change the location of a class that has started
- **THEN** the change is refused

#### Scenario: Substitute instructor
- **WHEN** an admin changes the instructors of a class that has started
- **THEN** the change is saved

#### Scenario: Editing a finished class
- **WHEN** an admin tries to change anything about a finished class
- **THEN** the change is refused

### Requirement: Cancelling a class
Admins SHALL be able to cancel a class until it finishes, with an optional message. Its students, anyone with a pending request for it, and its instructors SHALL be notified, with the message.

#### Scenario: Cancelled during the class
- **WHEN** an admin cancels a class that has started because of bad weather and writes a message
- **THEN** the class is cancelled
- **AND** its students, the people with pending requests for it and its instructors are notified with the message

### Requirement: Finished and cancelled classes are final
A finished class SHALL NOT be cancelled, and a cancelled class SHALL NOT be restored.

#### Scenario: Cancelling a finished class
- **WHEN** an admin tries to cancel a finished class
- **THEN** the class is not cancelled

#### Scenario: Restoring a cancelled class
- **WHEN** an admin wants a cancelled class back
- **THEN** they have to create a new class

### Requirement: Deleting a class
Admins SHALL be able to delete a class, after a confirmation step, only if it hasn't started, has no pending requests and has nobody enrolled. Its instructors SHALL be notified.

#### Scenario: Class created by mistake
- **WHEN** an admin deletes an upcoming class that nobody has requested or joined
- **THEN** the class is removed once the admin confirms
- **AND** its instructors are notified

#### Scenario: Class with a pending request
- **WHEN** an admin tries to delete a class that has a pending request
- **THEN** the class is not deleted
- **AND** the admin can cancel it instead

### Requirement: Assigning instructors
Admins SHALL be able to assign instructors and admins to teach a class, and remove them from it. An instructor SHALL be notified when assigned to a class or removed from one.

#### Scenario: Instructor assigned
- **WHEN** an admin assigns an instructor to a class
- **THEN** the instructor is notified

#### Scenario: Instructor removed
- **WHEN** an admin removes an instructor from a class
- **THEN** the instructor is notified

### Requirement: Class without an instructor
When a class that hasn't started loses its only instructor, because that instructor was demoted or removed or deleted their account, the class SHALL stay scheduled and be flagged as having no instructor, and admins SHALL be notified.

#### Scenario: Only instructor deletes their account
- **WHEN** the only instructor of an upcoming class deletes their account
- **THEN** the class stays scheduled and is flagged as having no instructor
- **AND** admins are notified

### Requirement: Capacity
Admins SHALL set each class's capacity. The capacity SHALL NOT be set below the number of seats taken, which counts approved students and guests.

#### Scenario: Lowering capacity below seats taken
- **WHEN** an admin tries to lower the capacity of a class with 8 seats taken to 6
- **THEN** the change is refused

### Requirement: Class notes visibility
Class notes SHALL be shown to everyone who can see the class.

#### Scenario: Student reads the notes
- **WHEN** a student opens a class that has notes
- **THEN** they see the notes

### Requirement: Seeing classes
Every approved user SHALL be able to see all classes, past and future, with their details. The classes view SHALL open on the current week, and users SHALL be able to move to any other week.

#### Scenario: Opening the classes view
- **WHEN** a user opens the classes view
- **THEN** it shows the current week
- **AND** the user can move to past and future weeks

### Requirement: Reminders
30 minutes before a class starts, its students and instructors SHALL be notified. No reminder SHALL be sent for a cancelled class.

#### Scenario: Class about to start
- **WHEN** a class starts in 30 minutes
- **THEN** its students and instructors are notified

#### Scenario: Cancelled class
- **WHEN** a cancelled class's start time is 30 minutes away
- **THEN** no reminder is sent
