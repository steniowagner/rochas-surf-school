# Spec Delta

## Purpose

Lets people sign in to the app with the method they prefer while keeping exactly one account per email address.

## ADDED Requirements

### Requirement: Sign-in methods
The app SHALL let people sign in with Google, Facebook, or a 6-digit code sent to their email address. On iOS, the app SHALL also offer Sign in with Apple. The same screen SHALL serve both signing in and signing up.

#### Scenario: First sign-in creates an account
- **WHEN** a person without an account signs in with any available method
- **THEN** the system creates an account for them

#### Scenario: Sign in with Apple on iOS
- **WHEN** the app runs on iOS
- **THEN** Sign in with Apple is offered alongside the other methods

#### Scenario: No Sign in with Apple on Android
- **WHEN** the app runs on Android
- **THEN** Sign in with Apple is not offered

### Requirement: Email code sign-in
The system SHALL send a 6-digit code to the email address a person enters and SHALL sign them in only when they enter that code. Signing in SHALL NOT require a password.

#### Scenario: Correct code
- **WHEN** a person enters the 6-digit code sent to their email address
- **THEN** they are signed in

#### Scenario: Wrong code
- **WHEN** a person enters a code that does not match the one sent
- **THEN** they are not signed in

### Requirement: Code expiry and resending
A sign-in code SHALL expire 10 minutes after it is sent. A person SHALL be able to request a new code once 30 seconds have passed since the previous one was sent, and not sooner.

#### Scenario: Expired code
- **WHEN** a person enters a code more than 10 minutes after it was sent
- **THEN** they are not signed in
- **AND** they can request a new code

#### Scenario: Requesting a new code
- **WHEN** 30 seconds have passed since the last code was sent
- **THEN** the person can request a new code

#### Scenario: Requesting a new code too soon
- **WHEN** a person tries to request a new code less than 30 seconds after the previous one was sent
- **THEN** no new code is sent

### Requirement: One account per email address
The system SHALL keep one account per email address. Signing in with any method that provides the same address SHALL open the same account.

#### Scenario: Same address, different method
- **WHEN** a person who signed up with Google later signs in with an email code sent to the same address
- **THEN** they reach the account they created with Google

### Requirement: Facebook sign-in without an email address
When Facebook does not share an email address, the system SHALL ask the person to type one and SHALL confirm it with a 6-digit code before continuing.

#### Scenario: Facebook shares no email address
- **WHEN** a person signs in with Facebook and Facebook shares no email address
- **THEN** they are asked for an email address
- **AND** they continue only after entering the code sent to it

### Requirement: Fixed email address
An account's email address SHALL NOT change after the account is created.

#### Scenario: Editing the profile
- **WHEN** a user edits their profile
- **THEN** they cannot change their email address

### Requirement: Signing out
Users SHALL be able to sign out.

#### Scenario: Sign out
- **WHEN** a signed-in user signs out
- **THEN** the app returns to the sign-in screen

### Requirement: Review accounts
The system SHALL provide one pre-approved review account for each role (student, instructor and admin), so App Store and Google Play reviewers can use the app. Each review account SHALL sign in with a fixed code that works only for that account's email address.

#### Scenario: Reviewer signs in
- **WHEN** a reviewer enters a review account's email address and its fixed code
- **THEN** they are signed in to an approved account with that role

#### Scenario: Fixed code used with another address
- **WHEN** someone enters a review account's fixed code for any other email address
- **THEN** they are not signed in
