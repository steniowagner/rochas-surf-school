# Proposal

## Why

Rocha's Surf School needs a mobile app (Android and iOS) where students, instructors and admins manage surf and skate classes. Every other feature sits behind signing in and being approved by the school, so accounts, roles and the school rules come first. The requirements come from the product brief in `openspec/specs/user-journeys.md`, refined during exploration.

## What Changes

- Sign-in with Google, Apple (iOS only) or a 6-digit code sent by email, on one screen that both signs in and signs up, with one account per email address.
- Admin approval of every registration, with a reason when denied, and onboarding (WhatsApp number and school rules) after approval.
- Account deletion with a 30-day reactivation window, one reactivation request per account, removal and restoration by admins, and erasure of personal data when the window ends.
- Profiles (photo, name, WhatsApp number with a visibility setting) and a directory of approved users.
- Student, instructor and admin roles, promotions and demotions, and a guarantee that at least one admin always exists.
- School rules managed by admins and accepted by users, with optional re-acceptance after a change.
- Pre-approved review accounts for App Store and Google Play reviewers.

## Capabilities

### New Capabilities

- `user-authentication`: signing in and out, the sign-in methods, one account per email address, and review accounts.
- `account-lifecycle`: registration approval and denial, onboarding, account deletion, reactivation, removal and restoration by admins, and erasure.
- `user-profiles`: editing one's own profile, WhatsApp number visibility, and the user directory.
- `user-roles`: the student, instructor and admin roles, promotions and demotions, and the last-admin rule.
- `school-rules`: managing the school rules and users accepting them.

### Modified Capabilities

None. The project has no specs yet.

## Impact

- New mobile app (Android and iOS) and backend. No code exists yet, and the tech stack is still to be chosen.
- External services: Google and Apple sign-in, an email service for sign-in codes, and push notifications for approval results.
- Builds together with `add-notifications-and-preferences`, which delivers the notifications these flows send.
- Personal data (name, email, photo, WhatsApp number) falls under LGPD. Deletion and erasure follow the App Store and Google Play account-deletion rules.
- Out of scope: accounts for children (all students are assumed to be adults for now), WhatsApp messages sent by the app, and undoing admin decisions (mistakes go to the system administrators).
