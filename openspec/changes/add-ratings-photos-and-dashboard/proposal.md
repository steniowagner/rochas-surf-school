# Proposal

## Why

After a class, the school wants feedback and memories: students rate the classes they took, instructors comment, and everyone shares photos. Admins need a dashboard to see how full and how well rated the classes are.

## What Changes

- One rating per student for each finished class (stars and an optional comment), visible to everyone with the author's name.
- Comments from the instructors who taught a class, and admins able to delete any comment.
- Photos on finished classes, uploaded by the class's students, instructors and admins, and visible and downloadable by everyone.
- A prompt to rate a class 30 minutes after it ends, and a notification to instructors when a student rates their class.
- A dashboard for admins with classes today, weekly occupancy, average ratings and a ratings list, plus the seats taken and free in each of the week's classes.

## Capabilities

### New Capabilities

- `class-ratings`: ratings and comments on finished classes.
- `class-photos`: photos on finished classes.
- `admin-dashboard`: the dashboard metrics, including the occupancy of each of the week's classes. Any user can already see a class's seats on the class itself (`class-enrolment`).

### Modified Capabilities

None. The project has no specs yet.

## Impact

- Depends on `add-class-scheduling` and `add-class-enrolment`.
- Photo storage and downloads.
- Users can see each other's content with no report option. This is an accepted App Review risk under Apple's guideline 1.2; if Apple rejects the app for it, the fix would be a report button that notifies admins.
