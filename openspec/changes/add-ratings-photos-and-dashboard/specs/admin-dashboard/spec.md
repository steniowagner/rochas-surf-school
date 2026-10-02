# Spec Delta

## Purpose

Gives admins an overview of how many classes run, how full they are and how well they are rated.

## ADDED Requirements

### Requirement: Dashboard access
The dashboard SHALL be available to admins.

#### Scenario: Admin opens the dashboard
- **WHEN** an admin opens the dashboard
- **THEN** they see the school's classes, occupancy and ratings metrics

### Requirement: Classes today
The dashboard SHALL show how many classes take place today, split by discipline. Cancelled classes SHALL NOT count.

#### Scenario: Cancelled class today
- **WHEN** one of today's three surf classes is cancelled
- **THEN** the dashboard shows two surf classes today

### Requirement: Weekly occupancy
The dashboard SHALL show the current week's occupancy, meaning the seats taken out of the total capacity, compared with the previous week's. Seats taken SHALL count approved students and guests, cancelled classes SHALL NOT count, and weeks SHALL run from Monday to Sunday, Fortaleza time.

#### Scenario: Comparing weeks
- **WHEN** an admin opens the dashboard
- **THEN** they see this week's occupancy next to last week's

#### Scenario: Cancelled class this week
- **WHEN** a class this week is cancelled
- **THEN** its seats and capacity are left out of this week's occupancy

### Requirement: Occupancy of each class
The dashboard SHALL list the week's classes with the number of seats taken and free in each.

#### Scenario: Week's classes
- **WHEN** an admin looks at the week's occupancy
- **THEN** they see each class with its seats taken and free

### Requirement: Average rating
The dashboard SHALL show the average rating by day, week or month, with a filter by discipline. Ratings SHALL be grouped by their class's date, and ratings whose authors' accounts were erased SHALL still count.

#### Scenario: Monthly surf average
- **WHEN** an admin picks the month view and the surf filter
- **THEN** they see the average rating of surf classes for each month

### Requirement: Ratings list
The dashboard SHALL list ratings, and admins SHALL be able to sort the list.

#### Scenario: Sorting ratings
- **WHEN** an admin changes how the ratings list is sorted
- **THEN** the list is shown in the new order
