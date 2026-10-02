# Spec Delta

## Purpose

Delivers every notification as a push and keeps it on an in-app notifications screen, and lets admins broadcast messages to groups of users.

## ADDED Requirements

### Requirement: Push delivery
The system SHALL deliver notifications as pushes to the user's phone. It SHALL NOT send notifications by email or WhatsApp.

#### Scenario: Notification sent
- **WHEN** an event notifies a user who allows pushes
- **THEN** the user receives a push on their phone

### Requirement: Notifications screen
Every notification SHALL also appear on an in-app notifications screen, whether or not its push was shown.

#### Scenario: Push not shown
- **WHEN** a user who turned pushes off is notified
- **THEN** the notification appears on their notifications screen

### Requirement: Read state
Users SHALL be able to mark a notification as read, and mark all their notifications as read at once.

#### Scenario: Mark one as read
- **WHEN** a user marks a notification as read
- **THEN** that notification no longer shows as unread

#### Scenario: Mark all as read
- **WHEN** a user marks all notifications as read
- **THEN** none of their notifications show as unread

### Requirement: Push setting
Users SHALL be able to turn phone pushes on or off. Turning them off SHALL only stop pushes on the phone, not notifications on the notifications screen.

#### Scenario: Pushes turned off
- **WHEN** a user turns pushes off
- **THEN** they stop receiving pushes on their phone
- **AND** new notifications still appear on their notifications screen

### Requirement: Broadcasts
Admins SHALL be able to send a notification with a title and a description to everyone, to students only, or to instructors only. Audiences SHALL follow roles, "everyone" SHALL include admins, and only approved, active users SHALL receive broadcasts.

#### Scenario: Broadcast to students
- **WHEN** an admin sends a broadcast to students only
- **THEN** every approved, active student is notified
- **AND** instructors and admins are not

#### Scenario: Broadcast to everyone
- **WHEN** an admin sends a broadcast to everyone
- **THEN** every approved, active student, instructor and admin is notified

### Requirement: Broadcast confirmation
Before a broadcast is sent, the admin SHALL see how many users will receive it and SHALL confirm sending it.

#### Scenario: Admin reviews the recipients
- **WHEN** an admin finishes writing a broadcast
- **THEN** they see the number of recipients
- **AND** the broadcast is sent only after they confirm
