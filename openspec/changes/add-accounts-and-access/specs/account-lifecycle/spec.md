# Spec Delta

## Purpose

Covers an account from registration to erasure: admin approval, onboarding, deletion, reactivation, and removal by admins.

## ADDED Requirements

### Requirement: Registrations wait for approval
A new account SHALL wait for an admin's approval before its user can use the app. While waiting, the user SHALL only see that their account is waiting for approval.

#### Scenario: New account
- **WHEN** a person signs up
- **THEN** they see that their account is waiting for approval
- **AND** they cannot see classes or any other part of the app

### Requirement: Name before approval
Every new account SHALL have a name before it waits for approval. The system SHALL use the name shared by Google or Apple when available, and SHALL ask the person to type one otherwise.

#### Scenario: Email code sign-up
- **WHEN** a person signs up with an email code
- **THEN** they are asked for their name before their account waits for approval

#### Scenario: Name shared by the sign-in method
- **WHEN** a person signs up with a method that shares their name
- **THEN** that name is used for the account

### Requirement: Admins decide registrations
Admins SHALL approve or deny each pending registration. When denying, the admin SHALL be able to write a reason, which is sent to the person. A decision SHALL be final in the app.

#### Scenario: Registration approved
- **WHEN** an admin approves a pending registration
- **THEN** the account is approved

#### Scenario: Registration denied with a reason
- **WHEN** an admin denies a pending registration and writes a reason
- **THEN** the account is denied
- **AND** the reason is sent to the person

### Requirement: Admins are told about new registrations
The system SHALL notify admins when a new registration is waiting for approval.

#### Scenario: Someone signs up
- **WHEN** a new account starts waiting for approval
- **THEN** every admin is notified

### Requirement: People are told the result of their registration
The system SHALL notify a person when their registration is approved or denied, including the reason when one was given.

#### Scenario: Approval notification
- **WHEN** an admin approves a registration
- **THEN** the person is notified that they can start using the app

#### Scenario: Denial notification
- **WHEN** an admin denies a registration with a reason
- **THEN** the person is notified of the denial and its reason

### Requirement: Denied registration screen
A person whose registration was denied SHALL see the denial, with its reason when one was given, and a button that opens WhatsApp on their phone with a chat to the school's number.

#### Scenario: Denied person opens the app
- **WHEN** a person whose registration was denied opens the app
- **THEN** they see the denial and its reason
- **AND** they can open a WhatsApp chat with the school

### Requirement: School WhatsApp number
Admins SHALL be able to set the school's WhatsApp number, which every contact-the-school button in the app uses.

#### Scenario: Admin changes the number
- **WHEN** an admin sets a new school WhatsApp number
- **THEN** contact-the-school buttons open a chat with that number

### Requirement: Denied registrations are erased
The system SHALL erase a denied registration's data 30 days after the denial. After that, the same email address SHALL be able to sign up again as a new registration.

#### Scenario: Signing up again after erasure
- **WHEN** a person whose registration was denied more than 30 days ago signs in with the same email address
- **THEN** a new registration is created and waits for approval

### Requirement: Onboarding after approval
After their registration is approved, and before using the rest of the app, users SHALL add their WhatsApp number and accept the school rules.

#### Scenario: First use after approval
- **WHEN** an approved user opens the app for the first time
- **THEN** they are asked for their WhatsApp number and to accept the school rules
- **AND** they can continue only after doing both

### Requirement: Deleting an account
Users SHALL be able to delete their account after a confirmation step. Deleting SHALL close the account immediately and cancel the user's upcoming class seats, pending requests and class assignments.

#### Scenario: Confirmed deletion
- **WHEN** a user confirms they want to delete their account
- **THEN** their account is closed and they are signed out
- **AND** their upcoming seats, pending requests and class assignments are cancelled

### Requirement: Reactivation window
A deleted account SHALL be reactivatable for 30 days after its deletion. When the 30 days end, the system SHALL erase the account.

#### Scenario: Window ends
- **WHEN** 30 days pass after an account was deleted and it has not been reactivated
- **THEN** the system erases the account

### Requirement: Erasure
When the system erases an account, it SHALL remove the account's name, email address, photo and WhatsApp number, and delete its comments. Its star ratings SHALL remain without a name, and photos and class lists SHALL show "Former student" in its place. The email address SHALL then be free to sign up again.

#### Scenario: After erasure
- **WHEN** an account has been erased
- **THEN** class lists and photos show "Former student" in its place
- **AND** its comments no longer appear and its star ratings remain without a name

#### Scenario: Same email address signs up again
- **WHEN** someone signs in with the email address of an erased account
- **THEN** a new registration is created and waits for approval

### Requirement: Account deleted screen
Signing in with a deleted account during its reactivation window SHALL show an "Account deleted" screen that offers to request reactivation or to sign in with another email address.

#### Scenario: Deleted user signs in
- **WHEN** a person signs in with an account deleted less than 30 days ago
- **THEN** they see the "Account deleted" screen with both options

### Requirement: One reactivation request
A deleted account SHALL be able to send one reactivation request, from the app. Once that request is denied, the account SHALL NOT be able to request reactivation again.

#### Scenario: Request sent
- **WHEN** a person on the "Account deleted" screen requests reactivation
- **THEN** the request is sent to the admins

#### Scenario: Returning after a denial
- **WHEN** a person whose reactivation request was denied returns to the "Account deleted" screen
- **THEN** the screen says the request was denied
- **AND** the only option offered is signing in with another email address

### Requirement: Admins decide reactivation requests
The system SHALL notify admins of each reactivation request. Admins SHALL approve or deny it, seeing the person's name, email address, deletion date and number of classes taken. The person SHALL be notified of the decision.

#### Scenario: Admin reviews a request
- **WHEN** a reactivation request arrives
- **THEN** admins are notified
- **AND** the request shows the person's name, email address, deletion date and number of classes taken

#### Scenario: Decision notified
- **WHEN** an admin approves or denies a reactivation request
- **THEN** the person is notified of the decision

### Requirement: What reactivation restores
Approving a reactivation request SHALL restore the account, its history and its role. It SHALL NOT restore the seats, pending requests or class assignments cancelled when the account was deleted.

#### Scenario: Reactivated student
- **WHEN** an admin approves the reactivation of a student who had upcoming seats when they deleted their account
- **THEN** the student can use the app again with their history and role
- **AND** their cancelled seats are not restored

### Requirement: Removal by admins
Admins SHALL be able to remove a user. Removing SHALL close the account and cancel its upcoming seats, pending requests and class assignments, as deleting does. A removed user SHALL see that their access was removed and a button to contact the school on WhatsApp, and SHALL NOT be able to request reactivation.

#### Scenario: Removed user signs in
- **WHEN** a user removed by an admin signs in
- **THEN** they see that their access was removed and can open a WhatsApp chat with the school
- **AND** they cannot request reactivation

### Requirement: Restoring a removed account
Admins SHALL be able to restore a removed account within 30 days of its removal, bringing back what an approved reactivation brings back. When the 30 days end, the system SHALL erase the account as it erases deleted accounts.

#### Scenario: Restored within the window
- **WHEN** an admin restores an account removed less than 30 days ago
- **THEN** the user can use the app again with their history and role

#### Scenario: Removal window ends
- **WHEN** 30 days pass after a removal without a restore
- **THEN** the system erases the account
