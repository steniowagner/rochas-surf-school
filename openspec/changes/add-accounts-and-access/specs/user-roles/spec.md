# Spec Delta

## Purpose

Defines the student, instructor and admin roles, what sets them apart, and how admins change a user's role.

## ADDED Requirements

### Requirement: One role per user
Every user SHALL have exactly one role: student, instructor or admin. New accounts SHALL start as students.

#### Scenario: Newly approved account
- **WHEN** a registration is approved
- **THEN** the user has the student role

### Requirement: Only students take classes
Only students SHALL be able to request or hold seats in classes. Instructors and admins SHALL NOT request or hold seats.

#### Scenario: Instructor views a class
- **WHEN** an instructor or an admin views a class
- **THEN** they cannot request a seat in it

### Requirement: Admins can teach
Admins SHALL be able to teach classes, and SHALL see the classes they teach among their own classes, as instructors do.

#### Scenario: Admin assigned to a class
- **WHEN** an admin is assigned to teach a class
- **THEN** the class appears among that admin's own classes

### Requirement: Promoting users
Admins SHALL be able to make a student an instructor, and make any user an admin. Promoting a student SHALL cancel their upcoming seats and pending requests.

#### Scenario: Student promoted
- **WHEN** an admin promotes a student with upcoming seats to instructor
- **THEN** the user becomes an instructor
- **AND** their upcoming seats and pending requests are cancelled

### Requirement: Demoting instructors
Admins SHALL be able to demote an instructor to student. The demoted user SHALL be removed from the classes they teach that have not started, and SHALL stay on the other classes they taught.

#### Scenario: Instructor demoted
- **WHEN** an admin demotes an instructor who teaches upcoming classes and has taught past ones
- **THEN** the user becomes a student
- **AND** they are removed from the upcoming classes and stay on the past ones

### Requirement: Changing admins
Admins SHALL be able to change another admin's role or remove another admin.

#### Scenario: Admin made an instructor
- **WHEN** an admin changes another admin's role to instructor
- **THEN** that user becomes an instructor

### Requirement: At least one admin
The system SHALL always keep at least one admin. The only admin SHALL NOT be demoted or removed, and SHALL make someone else an admin before deleting their own account.

#### Scenario: Only admin tries to delete their account
- **WHEN** the only admin tries to delete their account
- **THEN** they are told to make someone else an admin first
- **AND** the account is not deleted

#### Scenario: Demoting the only admin
- **WHEN** anyone tries to demote or remove the only admin
- **THEN** the change is refused

### Requirement: Role change notification
The system SHALL notify users when their role changes. When a promotion cancels a student's seats and pending requests, the notification SHALL say so.

#### Scenario: Promotion notified
- **WHEN** an admin promotes a student who had upcoming seats
- **THEN** the user is notified of their new role
- **AND** the notification says their seats and pending requests were cancelled
