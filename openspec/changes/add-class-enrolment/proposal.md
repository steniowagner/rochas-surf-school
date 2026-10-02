# Proposal

## Why

Students need to get into classes, and admins need full control over who does: payments and credits are tracked outside the app, and approving a request is how admins apply them. Cancellations follow rules the admins write in plain text, so the app has to apply free-text rules consistently.

## What Changes

- Requests that students can repeat until a class starts, approvals that need a free seat, denials with a reason, withdrawals, and expiry when the class starts.
- A waiting list shown as a label on pending requests for full classes, in the order students asked, with a switch to turn it off.
- Direct enrolment of students by admins, taking students out of classes, and guests (trial) who have no account.
- Student cancellation limited by a deadline that a language model works out for each class from the admins' rule for that discipline.
- Notifications for every request and seat event.

## Capabilities

### New Capabilities

- `class-enrolment`: requests, the waiting list, approvals, direct enrolment, guests, taking students out, request statuses, and the related notifications.
- `cancellation-rules`: the surf and skate cancellation rules, how each class's deadline is worked out, and how students cancel.

### Modified Capabilities

None. The project has no specs yet.

## Impact

- Depends on `add-accounts-and-access`, `add-notifications-and-preferences` and `add-class-scheduling`.
- New external dependency: a language model provider. It only receives the rule text and the class's details, never personal data.
- No payment or credit data anywhere in the app.
- Out of scope: children's enrolments, messages to guests, and checking a rule's wording when admins save it (rules are assumed to be clear).
