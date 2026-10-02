# Proposal

## Why

Users need to hear about approvals, enrolments and class changes, and to use the app in their language and preferred theme. Push notifications are the app's only outbound channel (no email or WhatsApp messages), so delivering them and keeping them on a notifications screen is shared groundwork for every other change.

## What Changes

- Every notification is delivered as a push and kept on an in-app notifications screen, where users mark one or all as read.
- A notifications setting that only turns phone pushes on or off.
- Admin broadcasts to everyone, students only or instructors only, with a title, a description, the recipient count and a confirmation step.
- Language (Brazilian Portuguese, Spanish or English) and theme (light or dark) that follow the phone until the user changes them, with Brazilian Portuguese as the fallback language.

## Capabilities

### New Capabilities

- `notifications`: delivery as a push plus the notifications screen, read state, the push setting, and admin broadcasts.
- `app-preferences`: the app's language and theme.

### Modified Capabilities

None. The project has no specs yet.

## Impact

- Push notification services for iOS and Android.
- The notifications each event sends are specified by the capability that owns the event, for example `account-lifecycle` or `class-enrolment`. This change defines how notifications are delivered and shown.
- Builds together with `add-accounts-and-access`, which is the first change to send notifications.
- Out of scope: email and WhatsApp notifications, and translating text written by admins.
