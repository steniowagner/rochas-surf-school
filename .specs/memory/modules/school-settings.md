# Module: School settings

## What it is for

It keeps the school-wide settings that admins control, as [Product](../product.md) describes **School settings**
(`school-settings`). Today that is only the school's WhatsApp number, the one every contact-the-school button
in the app uses; the waiting-list switch joins it later, with enrolment.

## Main concepts

- **School settings** (`school-settings`): one set of settings for the whole school. Key field: the WhatsApp
  number (none until an admin sets it). There is at most one, created by the first save. Lifecycle: set by an
  admin → replaced any number of times; it is never deleted and the number is never emptied.
- **School WhatsApp number**: stored exactly as sent, in the international format: `+`, the country code and the
  digits, with no spaces, dashes, brackets or extension, and a number that exists in its country (the same
  shape as a user's WhatsApp number).

## Relevant business rules

- **The number can be replaced but never emptied**: a missing, `null` or empty number is refused with
  `schoolSettings.whatsappNumber.required`, so contact-the-school buttons always have a number once one is set.
- **An invalid number is refused with `schoolSettings.whatsappNumber.phone`**: spaces, dashes, brackets, an
  extension, a trailing space, an impossible number or anything that isn't text (a JSON number, a list). Nothing
  is stored.
- **The last save wins**: two admins saving at the same moment simply leave the later number.
- **Setting the same number again changes nothing** and is answered as a success.
- **Nothing is seeded**: until an admin sets it, reading answers no number, and the app must cope with that.
- **A setting is checked in a fixed order**: the account's status, then its role, then the number.

## Who can do what

The account's status is checked before its role.

- **Any signed-in account, of any role and status** (pending, approved, denied, deleted, removed) — reads the
  school's settings. A denied or removed account needs it above all: contacting the school is the only thing
  its screen offers.
- **An approved admin** — sets the number. A student or instructor is refused with
  `schoolSettings.role.notAdmin`; an admin who isn't approved, with `user.status.notApproved`.

## Boundaries

It receives the actor from the backend and doesn't depend on [Authentication](auth.md). It doesn't open WhatsApp
chats, doesn't record who changed the number or when, and has no seed. No screen sets or shows the number yet
(the admin's settings screens and the Denied and Removed screens come with their specs), and the waiting-list
switch isn't built.

## Spec history

- `015-school-settings-whatsapp` — created the module: the school's WhatsApp number, read by any signed-in
  account and set by approved admins.
