# Spec Delta

## Purpose

Lets the school community share photos of finished classes, which everyone can see and download.

## ADDED Requirements

### Requirement: Uploading photos
Students who were in a finished class, any instructor and any admin SHALL be able to upload photos to it. Uploading a photo SHALL NOT notify anyone.

#### Scenario: Student uploads a photo
- **WHEN** a student who was in a finished class uploads a photo to it
- **THEN** the photo is added to the class
- **AND** nobody is notified

#### Scenario: Instructor who didn't teach the class
- **WHEN** an instructor uploads a photo to a finished class they didn't teach
- **THEN** the photo is added to the class

#### Scenario: Student who wasn't in the class
- **WHEN** a student who wasn't in a class tries to upload a photo to it
- **THEN** they cannot

### Requirement: Only finished classes
Photos SHALL only be added to finished classes.

#### Scenario: Class not finished
- **WHEN** someone tries to add a photo to a class that hasn't finished
- **THEN** they cannot

### Requirement: Viewing and downloading photos
Every user SHALL be able to see and download the photos of any class.

#### Scenario: Downloading a photo
- **WHEN** a user downloads a photo from a class
- **THEN** the photo is saved to their phone

### Requirement: Deleting photos
Uploaders SHALL be able to delete their own photos, and admins SHALL be able to delete any photo. When an admin deletes someone else's photo, the uploader SHALL NOT be notified.

#### Scenario: Uploader deletes their photo
- **WHEN** a user deletes a photo they uploaded
- **THEN** the photo no longer appears

#### Scenario: Admin deletes a photo
- **WHEN** an admin deletes a photo a student uploaded
- **THEN** the photo no longer appears
- **AND** the student is not notified
