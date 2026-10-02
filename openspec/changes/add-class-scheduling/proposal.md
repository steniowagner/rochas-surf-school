# Proposal

## Why

Admins need to schedule surf and skate classes, often many at once, and everyone needs to see them. A class's states, and what each state allows, are the base that enrolment, ratings and photos build on.

## What Changes

- Classes with a discipline, a level, a date, a start and end time, a location, instructors, a capacity and optional notes.
- Batch creation from a date range, a weekday filter and one or more time ranges, with time ranges suggested from last week's classes.
- Class states that follow the clock (not started, started, finished) plus cancelled, and rules for editing, cancelling and deleting in each state.
- Saved locations that admins edit or archive, with an optional notification when an edit affects upcoming classes.
- All times in the America/Fortaleza time zone, and every user able to see all classes.

## Capabilities

### New Capabilities

- `class-scheduling`: classes, batch creation, class states, editing, cancelling and deleting, instructors, capacity, reminders, and who can see classes.
- `class-locations`: saved locations, and how editing or archiving one affects the classes that use it.

### Modified Capabilities

None. The project has no specs yet.

## Impact

- Depends on `add-accounts-and-access` for roles and on `add-notifications-and-preferences` for delivering notifications.
- Some requirements notify a class's students and the people with pending requests. Those are defined by `add-class-enrolment`, so they take effect once enrolment exists.
- Reminders and state changes happen at set times, so the backend needs scheduled work.
- Locations need address suggestions and a map from an external maps service.
- Out of scope: saved lists of time ranges (time ranges are typed or suggested each time) and the visual details of the creation screen.
