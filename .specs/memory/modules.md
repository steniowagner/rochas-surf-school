# Modules

This file is the **header of the business modules** of "Rocha's Surf School": a general, non-technical
overview of what each module does and why it exists. The details of the concepts and business rules of each
module live in their own markdown inside `modules/`.

The product has **five business modules** so far: **Authentication**, **School rules**, **School settings**,
**Notifications** and **Classes**. The other areas of the product (enrolment, ratings and photos) enter as new
modules when their specs are planned.
Email delivery is treated as **infrastructure**, not as a business module.

---

## Authentication

Takes care of who people are and how they get in: their accounts (one per email address, with a role and an
approval status), the ways they sign in (Google, Apple, a code sent by email), the sign-in codes themselves
and the sessions that keep them signed in. It also lets admins decide registrations — approving or denying
each account waiting for approval, once and for good, and shows every approved member the people directory,
with each WhatsApp number only to who may see it. It does not decide anything about classes; that belongs to
Classes and to the modules that come with their specs.
It groups four areas: **Accounts**, **Identities**, **Sign-in codes** and **Sessions**.

- Where it physically lives: `modules/auth`
- Business details: [modules/auth.md](modules/auth.md)

---

## School rules

Keeps the school's rules: the ordered list admins write, edit, delete and reorder, and its current version,
which goes up with every change to the rules' text so users can be asked to accept them again. Every approved
account reads them and accepts the current version here; the accepted versions are stored on the account, in
Authentication, which says on every answer whether the account still has to accept the current rules.

- Where it physically lives: `modules/school-rules`
- Business details: [modules/school-rules.md](modules/school-rules.md)

---

## School settings

Keeps the school-wide settings admins control. Today that is the school's WhatsApp number, which every
contact-the-school button will use: admins set it, and any signed-in account reads it, whatever its status, so a
denied or removed account can still contact the school. The waiting-list switch joins it with enrolment.

- Where it physically lives: `modules/school-settings`
- Business details: [modules/school-settings.md](modules/school-settings.md)

---

## Notifications

The product's only way to reach people outside the app: it keeps every notification for the person it is for,
then pushes it to each phone they are signed in on, in that phone's language. It knows the people only by their
ids and the phones they registered; who must be told what, and when, is decided by the module where the event
happens (Authentication for registrations, Classes for class assignments, edits, cancellations, deletions and
classes left without an instructor), which reaches it through abstract contracts. Today it carries the three
registration notifications and the class ones (assigned, edited, unassigned, cancelled, deleted, no instructor);
nothing shows the stored notifications yet.

- Where it physically lives: `modules/notifications`
- Business details: [modules/notifications.md](modules/notifications.md)

---

## Classes

Schedules the school's classes and keeps the places where they happen. Admins save locations (a name and an
address) and create classes one at a time or in a batch — one class per chosen day and time range, all or
nothing, never in the past — with the instructors who teach them, who are told once per batch. Time ranges are
suggested from last week's classes. Every approved person browses the classes by week (Monday to Sunday,
Fortaleza) or by month and reads each one; a class is not started, started or finished by the clock, unless an
admin cancelled it. Admins edit one class at a time — anything before it starts, only its instructors once started,
nothing once finished or cancelled — and cancel a class until it finishes, with an optional message; it stays on
the schedule marked as cancelled, for good. A class created by mistake is deleted instead — only before it
starts, never a cancelled one, and only with nobody in it — and leaves the schedule for good. Its instructors are
told of edits, cancellations and deletions. When a person's account is deleted, it takes them off every class
that hasn't started; a class left with nobody stays scheduled, is flagged "no instructor" for admins until someone
is assigned, and the admins are told. Enrolment, ratings and photos will build on its classes.

- Where it physically lives: `modules/classes`
- Business details: [modules/classes.md](modules/classes.md)

---

## Email delivery (not a business module)

Sends the sign-in code email — the only email the app sends — through an external provider. It knows nothing
about accounts or codes beyond the message it is given; the Authentication module uses it only through an
abstract contract, so the provider can be swapped without touching the sign-in rules.
