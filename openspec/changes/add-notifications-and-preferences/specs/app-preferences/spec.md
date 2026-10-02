# Spec Delta

## Purpose

Lets users choose the app's language and theme, which otherwise follow the phone's settings.

## ADDED Requirements

### Requirement: Languages
The app SHALL be available in Brazilian Portuguese, Spanish and English, and users SHALL be able to choose one of them.

#### Scenario: User picks Spanish
- **WHEN** a user chooses Spanish
- **THEN** the app is shown in Spanish

### Requirement: Default language
Until a user chooses a language, the app SHALL use the phone's language if it is Portuguese, Spanish or English, and Brazilian Portuguese otherwise.

#### Scenario: Phone in English
- **WHEN** a user who hasn't chosen a language has their phone set to English
- **THEN** the app is shown in English

#### Scenario: Phone in another language
- **WHEN** a user who hasn't chosen a language has their phone set to French
- **THEN** the app is shown in Brazilian Portuguese

### Requirement: Theme
The app SHALL offer a light theme and a dark theme. Until a user chooses one, the app SHALL follow the phone's setting.

#### Scenario: Phone in dark mode
- **WHEN** a user who hasn't chosen a theme has their phone in dark mode
- **THEN** the app uses the dark theme

#### Scenario: User picks a theme
- **WHEN** a user chooses the light theme
- **THEN** the app stays light whatever the phone's setting

### Requirement: Text written by admins
Text written by admins, such as school rules, cancellation rules, class notes, reasons and broadcasts, SHALL be shown as written, whatever language the user chose.

#### Scenario: Rules written in Portuguese
- **WHEN** a user who chose English opens school rules written in Portuguese
- **THEN** the rules are shown in Portuguese
