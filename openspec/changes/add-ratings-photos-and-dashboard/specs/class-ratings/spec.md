# Spec Delta

## Purpose

Lets students rate the classes they took and instructors comment on the classes they taught, with everything visible to the whole school.

## ADDED Requirements

### Requirement: Rating a class
A student who held a seat in a class SHALL be able to leave one rating for it once it has finished: from 1 to 5 stars, and an optional comment. Ratings SHALL be about the class, not its instructors.

#### Scenario: Student rates a class
- **WHEN** a student who was in a finished class gives it 4 stars and a comment
- **THEN** the rating is saved

#### Scenario: Rating without a comment
- **WHEN** a student gives a finished class stars without a comment
- **THEN** the rating is saved

#### Scenario: Rating twice
- **WHEN** a student who already rated a class tries to rate it again
- **THEN** they can only change their existing rating

#### Scenario: Student who wasn't in the class
- **WHEN** a student who wasn't in a class tries to rate it
- **THEN** they cannot

### Requirement: Changing one's rating
Students SHALL be able to edit or delete their own rating.

#### Scenario: Rating edited
- **WHEN** a student changes the stars of their rating
- **THEN** the new stars replace the old ones

#### Scenario: Rating deleted
- **WHEN** a student deletes their rating
- **THEN** it no longer appears

### Requirement: Rating prompt
30 minutes after a class ends, each student who was in it SHALL be notified and asked to rate it. Cancelled classes SHALL NOT prompt anyone.

#### Scenario: Class ended
- **WHEN** 30 minutes have passed since a class ended
- **THEN** each student who was in it is asked to rate it

#### Scenario: Cancelled class
- **WHEN** a class was cancelled
- **THEN** no one is asked to rate it

### Requirement: Ratings are public
Every user SHALL be able to see the ratings and comments of any class, each with its author's name.

#### Scenario: Viewing a class's ratings
- **WHEN** any user opens a finished class
- **THEN** they see its ratings and comments with their authors' names

### Requirement: Instructor notification
When a student rates a class, the class's instructors SHALL be notified.

#### Scenario: New rating
- **WHEN** a student rates a class
- **THEN** the class's instructors are notified

### Requirement: Instructor comments
Instructors who taught a finished class, including admins who taught it, SHALL be able to leave one comment on it, without stars, and edit or delete it. Comments SHALL NOT have replies.

#### Scenario: Instructor comments
- **WHEN** an instructor who taught a finished class comments on it
- **THEN** the comment appears with the class's ratings, without stars

#### Scenario: Instructor who didn't teach the class
- **WHEN** an instructor who didn't teach a class tries to comment on it
- **THEN** they cannot

### Requirement: Admins delete comments
Admins SHALL be able to delete any comment. Deleting a student's comment SHALL keep the stars of their rating, and the author SHALL NOT be notified.

#### Scenario: Comment deleted
- **WHEN** an admin deletes a student's comment
- **THEN** the comment no longer appears and the rating's stars remain
- **AND** the student is not notified
