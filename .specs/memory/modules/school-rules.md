# Module: School rules

## What it is for

It keeps the school rules that every user accepts at onboarding, as [Product](../product.md) describes
**School rules** (`school-rules`): the list admins write and order, and the version that tells whether users
have to accept the rules again. It is the content behind the admin's "Regras da escola" screen and the
onboarding School rules step.

## Main concepts

- **School rule** (`school-rule`): one rule of the list. Key fields: title, description (the "explanation"),
  position in the list (1, 2, 3…), who created it. Relationships: created by one admin (kept empty if that
  account is later erased); the list has any number of rules (no limit). Lifecycle: added by an admin → edited
  any number of times → deleted (gone for good). Limits: title 1 to 60 characters and description 1 to 300,
  both after removing the spaces at either end.
- **Rules version** (part of `school-rules`): one number for the whole list, 0 until the first change. An
  acceptance records only this number; the text of past versions isn't kept.

## Relevant business rules

- **Every add, edit or delete raises the version by exactly one; admins don't choose**: users always accept the
  rules as they are now, so a later spec can ask everyone to accept the new version.
- **Reordering never changes the version**: only how the rules are shown changes, not what they say.
- **An edit that changes nothing changes nothing**: if the title and description, after trimming, are the ones
  already stored, the version stays — an accidental save must not make every user accept again.
- **Positions are contiguous, 1 to N**: a new rule goes last; deleting a rule moves every rule after it up one
  place; editing keeps the position.
- **Reordering sends the whole list**: the new order must name every current rule exactly once. A list that
  misses, repeats or invents a rule is refused (`schoolRule.order.mismatch`) and nothing changes — e.g. when
  another admin added a rule meanwhile, so the app reloads instead of silently dropping it. A missing list or
  one that isn't a list of ids is refused with `schoolRule.order.required`.
- **A change is all or nothing**: the version, the deleted rule and the moved rules are written together, and a
  failed change never raises the version; two admins saving at the same moment never get the same version.
- **Only the current version can be accepted**: accepting any other version, older or newer, is refused with
  `schoolRules.version.outdated` and the current version, so the app reloads the rules — a user accepts only
  text they actually saw. The acceptance is stored on the account in [Authentication](auth.md) with when it
  happened, and the answer is the account, now with its rules accepted.
- **Version 0 needs no acceptance**: while no rule was ever written there is nothing to accept
  (`schoolRules.version.nothingToAccept`); once the version is above 0 acceptance applies, even if every rule
  was later deleted.
- **Accepting again changes nothing**: a version already accepted is answered as accepted, keeping the first
  acceptance and its date — a double tap or a retry never fails.
- **An acceptance is checked in a fixed order**: the account (unknown → `auth.token.invalid`), its status
  (`user.status.notApproved`), the version's shape (missing → `schoolRules.version.required`, not an integer
  number → `schoolRules.version.integer`), version 0, then whether it is the current version.
- **Text is stored as written**, only trimmed at both ends — no translation, no other normalization.
- **Invalid text is refused with its keys**: `schoolRule.title.required`, `schoolRule.title.max.length`,
  `schoolRule.description.required`, `schoolRule.description.max.length` (all that apply); an unknown rule
  answers `schoolRule.id.notFound`. Every answer — reading or a change — carries the current version and the
  whole list in order, so the screen redraws from it.

## Who can do what

The account's status is checked before its role.

- **An approved account of any role (student, instructor, admin)** — reads the rules, in order, with the current
  version, and accepts the current version. Accepting doesn't require the WhatsApp number first: the order of
  the onboarding steps is the app's. Any other status is refused with `user.status.notApproved`.
- **An approved admin** — adds, edits, deletes and reorders rules. A student or instructor is refused with
  `schoolRule.role.notAdmin`; an admin who isn't approved, with `user.status.notApproved`.

## Boundaries

It decides when an acceptance is allowed, but doesn't store it: the accepted versions belong to the user's
account in [Authentication](auth.md), which also reports on every answer whether the current rules are
accepted. Showing the rules and asking for acceptance in the app (the onboarding School rules step, and again
after a change) is the app's, not built yet. Acceptances can't be withdrawn, and nothing lists who accepted
which version. It sends no notification about changes. It doesn't keep the text of past versions, or who edited, deleted or reordered a
rule.

## Spec history

- `010-school-rules-management` — created the module: the ordered list of rules (add, edit, delete, reorder),
  its version raised by every change to the text, reading by any approved account, changes by approved admins.
- `011-school-rules-acceptance` — any approved account accepts the current version (an outdated one is refused,
  version 0 needs none, a repeat changes nothing); the acceptance is stored on the account in Authentication.
