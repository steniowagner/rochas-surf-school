# Spec Delta

## Purpose

Lets admins keep the school rules up to date and makes sure users accept the rules that apply to them.

## ADDED Requirements

### Requirement: Managing the school rules
Admins SHALL be able to add, edit and remove school rules.

#### Scenario: Admin adds a rule
- **WHEN** an admin adds a school rule
- **THEN** the rule appears in the school rules

### Requirement: Accepting the rules
Users SHALL accept the school rules after their registration is approved and before using the rest of the app.

#### Scenario: Newly approved user
- **WHEN** a newly approved user opens the app
- **THEN** they must accept the school rules before continuing

### Requirement: Reading the rules
Users SHALL be able to read the school rules at any time.

#### Scenario: Reading the rules later
- **WHEN** a user opens the school rules in the app
- **THEN** they see the current rules

### Requirement: Accepting again after a change
When admins change the school rules, they SHALL choose whether users must accept the new version. If they must, each user SHALL accept it the next time they open the app, before continuing. The change SHALL NOT send a notification.

#### Scenario: Change that needs acceptance
- **WHEN** an admin changes the rules and requires acceptance
- **THEN** each user is asked to accept the new rules the next time they open the app

#### Scenario: Change that doesn't need acceptance
- **WHEN** an admin changes the rules without requiring acceptance
- **THEN** users are not asked to accept them again

### Requirement: Rule changes while an account was away
A reactivated or restored account SHALL accept the school rules again if a change that required acceptance happened while it was deleted or removed.

#### Scenario: Rules changed while deleted
- **WHEN** an account is reactivated after a rule change that required acceptance
- **THEN** the user must accept the current rules before continuing
