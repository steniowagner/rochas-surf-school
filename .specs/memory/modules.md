# Modules

This file is the **header of the business modules** of "Rocha's Surf School": a general, non-technical
overview of what each module does and why it exists. The details of the concepts and business rules of each
module live in their own markdown inside `modules/`.

The product has **one business module** so far: **Authentication**. The other areas of the product
(scheduling, enrolment, ratings and photos, notifications) enter as new modules when their specs are planned.
Email delivery is treated as **infrastructure**, not as a business module.

---

## Authentication

Takes care of who people are and how they get in: their accounts (one per email address, with a role and an
approval status), the ways they sign in (Google, Apple, a code sent by email), the sign-in codes themselves
and the sessions that keep them signed in. It does not decide registrations or anything about classes; those
belong to the modules that come with their specs.
It groups four areas: **Accounts**, **Identities**, **Sign-in codes** and **Sessions**.

- Where it physically lives: `modules/auth`
- Business details: [modules/auth.md](modules/auth.md)

---

## Email delivery (not a business module)

Sends the sign-in code email — the only email the app sends — through an external provider. It knows nothing
about accounts or codes beyond the message it is given; the Authentication module uses it only through an
abstract contract, so the provider can be swapped without touching the sign-in rules.
