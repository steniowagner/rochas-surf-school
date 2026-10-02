# Spec Delta

## Purpose

Publishes the public web pages the app stores require: the privacy policy and a way to request account deletion without the app.

## ADDED Requirements

### Requirement: Privacy policy page
A privacy policy SHALL be published at a public web address and linked from the app and from the App Store and Google Play listings. It SHALL say what data the app collects, why, how long it is kept, and which services handle it, including the sign-in providers, the push service, hosting, and the language model, which only receives class details.

#### Scenario: Opening the policy from the app
- **WHEN** a user opens the privacy policy from the app
- **THEN** the public privacy policy page opens

#### Scenario: Retention explained
- **WHEN** someone reads the privacy policy
- **THEN** it explains that deleted accounts are erased 30 days after deletion

### Requirement: Account deletion page
A public web page SHALL explain how to delete an account in the app and, for people who no longer have the app, give the school's WhatsApp number to request deletion. It SHALL say what is erased, what is kept without a name, and when erasure happens.

#### Scenario: Person without the app
- **WHEN** someone without the app opens the account deletion page
- **THEN** they find the school's WhatsApp number to request deletion

#### Scenario: What happens to the data
- **WHEN** someone reads the account deletion page
- **THEN** it says that personal data and comments are erased 30 days after deletion, and that star ratings remain without a name

### Requirement: Handling deletion requests from the page
An admin SHALL carry out a deletion request received through the page by removing the account, which the system then erases 30 days later.

#### Scenario: Request received
- **WHEN** an admin receives a deletion request from someone who used the page
- **THEN** they remove the account
- **AND** the account is erased 30 days later

### Requirement: Page languages
Both pages SHALL be available in Brazilian Portuguese, Spanish and English.

#### Scenario: Reading in Spanish
- **WHEN** someone chooses Spanish on either page
- **THEN** the whole page is shown in Spanish
