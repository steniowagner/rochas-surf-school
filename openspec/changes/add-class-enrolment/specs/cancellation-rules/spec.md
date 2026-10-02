# Spec Delta

## Purpose

Lets admins write the cancellation rules in plain text and decides, for each class, until when its students can cancel their seats.

## ADDED Requirements

### Requirement: Surf and skate rules
Admins SHALL write and edit two cancellation rules as free text: one for surf classes and one for skate classes. Each class SHALL use the rule for its discipline.

#### Scenario: Skate class
- **WHEN** a student looks at a skate class's cancellation rule
- **THEN** they see the skate rule

### Requirement: Reading and accepting the rules
Users SHALL be able to read both cancellation rules at any time. When requesting a seat, a student SHALL be shown the rule for the class's discipline and SHALL accept it.

#### Scenario: Requesting a surf class
- **WHEN** a student requests a surf class
- **THEN** they are shown the surf rule
- **AND** the request is sent only after they accept it

### Requirement: One deadline per class
Each class SHALL have one cancellation deadline, the same for all its students. The deadline SHALL be worked out from the rule for the class's discipline and the class's details when the class is created, and again whenever the class is edited or that rule changes.

#### Scenario: Rule changed
- **WHEN** an admin changes the surf rule
- **THEN** the deadlines of all surf classes that haven't started are worked out again

#### Scenario: Class edited
- **WHEN** an admin changes a class's date
- **THEN** that class's deadline is worked out again

### Requirement: Working out the deadline
The system SHALL use a language model to read the rule text and the class's details (discipline, level, date, start and end time, location, capacity and notes) and describe the deadline. The system SHALL calculate the exact date and time from that description itself, and SHALL retry when the description can't be used.

#### Scenario: Rule with a notice period
- **WHEN** the surf rule says students can cancel up to 12 hours before a class, and a surf class starts on Tuesday at 08:00
- **THEN** that class's deadline is Monday at 20:00

#### Scenario: Unusable answer
- **WHEN** the language model's answer can't be turned into a date and time
- **THEN** the system tries again

### Requirement: Data sent to the language model
Only the rule text and the class's details SHALL be sent to the language model. Nothing written by students and no personal data, including student and instructor names, SHALL be sent to it.

#### Scenario: Deadline worked out
- **WHEN** a class's deadline is worked out
- **THEN** no student or instructor names are sent to the language model

### Requirement: Deadline never after the start
A class's cancellation deadline SHALL NOT be later than the class's start time.

#### Scenario: Rule allows cancelling at any time
- **WHEN** the rule lets students cancel at any time
- **THEN** the class's deadline is its start time

### Requirement: Cancelling a seat
A student SHALL be able to cancel their seat until the class's deadline, and SHALL NOT be able to cancel it after the deadline.

#### Scenario: Before the deadline
- **WHEN** a student cancels their seat before the class's deadline
- **THEN** the seat is cancelled

#### Scenario: After the deadline
- **WHEN** a student tries to cancel their seat after the class's deadline
- **THEN** the seat is not cancelled

### Requirement: No deadline available
While a class has no deadline because it couldn't be worked out, students who try to cancel a seat in it SHALL be told to contact the school, and the system SHALL keep trying to work the deadline out.

#### Scenario: Deadline missing
- **WHEN** a student tries to cancel a seat in a class whose deadline couldn't be worked out
- **THEN** they are told to contact the school
