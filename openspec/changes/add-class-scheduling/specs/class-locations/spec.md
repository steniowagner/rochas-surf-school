# Spec Delta

## Purpose

Lets admins keep a list of saved locations for classes and controls how changes to a location reach the classes that use it.

## ADDED Requirements

### Requirement: Saved locations
Admins SHALL be able to save locations with an address, helped by address suggestions and a map, and SHALL pick one saved location for each class.

#### Scenario: Adding a location
- **WHEN** an admin adds a location by searching for its address
- **THEN** the system suggests matching addresses and shows the place on a map
- **AND** the saved location can be picked for classes

### Requirement: Editing a location
Admins SHALL be able to edit a saved location. The change SHALL apply to every class that uses it, including past classes.

#### Scenario: Location renamed
- **WHEN** an admin changes a location's name
- **THEN** every class at that location, past and upcoming, shows the new name

### Requirement: Notifying about a location change
When an edited location is used by classes that haven't started, the admin SHALL choose whether to notify those classes' students and instructors.

#### Scenario: Meeting point moved
- **WHEN** an admin edits a location used by upcoming classes and chooses to notify
- **THEN** the students and instructors of those upcoming classes are notified

#### Scenario: Typo fixed
- **WHEN** an admin edits a location used by upcoming classes and chooses not to notify
- **THEN** nobody is notified

### Requirement: Archiving instead of deleting
Removing a saved location SHALL archive it: it SHALL no longer be offered for new classes, and classes that use it SHALL keep showing it.

#### Scenario: Location removed
- **WHEN** an admin removes a location used by past classes
- **THEN** it is no longer offered when creating classes
- **AND** those past classes still show it

### Requirement: Removing the selected location while creating classes
If an admin removes the location currently selected while creating classes, the selection SHALL be cleared, and the admin SHALL pick a location again before the classes can be created.

#### Scenario: Selected location removed
- **WHEN** an admin removes the location they had selected for a new batch
- **THEN** no location is selected
- **AND** the batch can't be created until they pick one
