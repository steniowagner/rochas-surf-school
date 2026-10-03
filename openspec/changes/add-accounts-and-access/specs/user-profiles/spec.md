# Spec Delta

## Purpose

Lets users manage their own profile and see the other members of the school.

## ADDED Requirements

### Requirement: Editing one's profile
Users SHALL be able to change their profile photo, name and WhatsApp number. The WhatsApp number SHALL NOT be left empty.

#### Scenario: User changes their name
- **WHEN** a user changes their name
- **THEN** the new name is shown wherever their name appears in the app

#### Scenario: Clearing the WhatsApp number
- **WHEN** a user removes their WhatsApp number and tries to save their profile
- **THEN** the change is not saved

### Requirement: WhatsApp number format
WhatsApp numbers SHALL include a country code, with Brazil (+55) preselected.

#### Scenario: Brazilian number
- **WHEN** a user types a number without changing the country
- **THEN** the number is saved with the +55 country code

#### Scenario: Foreign number
- **WHEN** a user picks another country and types their number
- **THEN** the number is saved with that country's code

### Requirement: WhatsApp number visibility
Users SHALL choose whether other users can see their WhatsApp number, and the number SHALL be hidden by default. Admins SHALL always see every user's WhatsApp number.

#### Scenario: Default visibility
- **WHEN** a user has not changed the visibility setting
- **THEN** only admins can see their WhatsApp number

#### Scenario: User shares their number
- **WHEN** a user chooses to share their WhatsApp number
- **THEN** every user can see it on their profile and in the directory

### Requirement: Contacting a user on WhatsApp
Admins SHALL be able to open a WhatsApp chat with any user from that user's profile. The chat SHALL open in WhatsApp on the admin's own phone; the app SHALL NOT send WhatsApp messages itself.

#### Scenario: Admin contacts a user
- **WHEN** an admin taps the WhatsApp button on a user's profile
- **THEN** WhatsApp opens on the admin's phone with a chat to that user's number

### Requirement: User directory
The app SHALL show users a directory of approved, active users, with each user's name, photo and role, and their WhatsApp number when they share it. Pending, denied, deleted and removed accounts SHALL NOT appear in it.

#### Scenario: Pending account
- **WHEN** an account is waiting for approval
- **THEN** it does not appear in the directory

#### Scenario: Shared number
- **WHEN** a user shares their WhatsApp number
- **THEN** their directory entry shows it

### Requirement: Directory search and filter
Users SHALL be able to search the directory by name and filter it by role.

#### Scenario: Search by name
- **WHEN** a user searches the directory for a name
- **THEN** only users whose name matches are listed

#### Scenario: Filter by role
- **WHEN** a user filters the directory by the instructor role
- **THEN** only instructors are listed
