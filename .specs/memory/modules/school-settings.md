# Module: School settings

## What it is for

It keeps the school-wide settings that admins control, as [Product](../product.md) describes **School settings**
(`school-settings`): the school's WhatsApp number, the one every contact-the-school button in the app uses, and
the waiting-list switch, which decides whether a full class still takes requests ([Enrolment](enrolment.md) reads
it).

## Main concepts

- **School settings** (`school-settings`): one set of settings for the whole school. Key fields: the WhatsApp
  number (none until an admin sets it) and the waiting-list switch (on until an admin turns it off). There is at
  most one, created by the first save of either field. Lifecycle: set by an admin → changed any number of times;
  it is never deleted and the number is never emptied.
- **School WhatsApp number**: stored exactly as sent, in the international format: `+`, the country code and the
  digits, with no spaces, dashes, brackets or extension, and a number that exists in its country (the same
  shape as a user's WhatsApp number).
- **Waiting list** (the switch): on or off for the whole school, never per class. While it is off, students can't
  request a seat in a full class; turning it off ends no request already waiting.

## Relevant business rules

- **The number can be replaced but never emptied**: a missing, `null` or empty number is refused with
  `schoolSettings.whatsappNumber.required`, so contact-the-school buttons always have a number once one is set.
- **An invalid number is refused with `schoolSettings.whatsappNumber.phone`**: spaces, dashes, brackets, an
  extension, a trailing space, an impossible number or anything that isn't text (a JSON number, a list). Nothing
  is stored.
- **The waiting list is on by default**: with no settings saved yet, reading answers it on.
- **The switch takes only `true` or `false`**: a missing value, `null`, text or a number is refused with
  `schoolSettings.waitingList.invalid`, and the stored switch stays as it was.
- **Saving one field keeps the other**: setting the switch keeps the number (a school may turn the switch before it
  ever sets a number), and setting the number keeps the switch.
- **The last save wins**: two admins saving at the same moment simply leave the later value.
- **Setting the same value again changes nothing** and is answered as a success.
- **Nothing is seeded**: until an admin sets it, reading answers no number, and the app must cope with that.
- **A setting is checked in a fixed order**: the account's status, then its role, then the value.

## Who can do what

The account's status is checked before its role.

- **Any signed-in account, of any role and status** (pending, approved, denied, deleted, removed) — reads the
  school's settings. A denied or removed account needs it above all: contacting the school is the only thing
  its screen offers.
- **An approved admin** — sets the number and turns the waiting list on or off. A student or instructor is refused
  with `schoolSettings.role.notAdmin`; an admin who isn't approved, with `user.status.notApproved`.

## Boundaries

It receives the actor from the backend and doesn't depend on [Authentication](auth.md) or
[Enrolment](enrolment.md): enrolment reads the switch through its own contract, which the backend fulfils from the
same stored settings. It doesn't open WhatsApp chats, doesn't record who changed a setting or when, and has no
seed. In the app, admins change both settings on "Configurações da escola" (a row under "Escola" on their home),
with one "Salvar" that sends only what changed. The app reads the number for the "Falar com a escola" button of
the Denied and Access removed screens and of the class details' deadline notes (hidden while no number is set),
and the switch for the class details' full-class texts. A switch per class isn't built.

## Spec history

- `015-school-settings-whatsapp` — created the module: the school's WhatsApp number, read by any signed-in
  account and set by approved admins.
- `016-closed-account-screens` — the app reads the number for the "Contact the school" button of the Denied and
  Access removed screens (hidden while unset).
- `046-school-settings-screen` — added the waiting-list switch (on by default; `PUT /school-settings/waiting-list`,
  approved admins; `schoolSettings.waitingList.invalid`), read by enrolment; the app's "Configurações da escola"
  screen and its home row, where admins set the switch and the number.
