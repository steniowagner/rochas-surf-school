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
- **Text is stored as written**, only trimmed at both ends — no translation, no other normalization.
- **Invalid text is refused with its keys**: `schoolRule.title.required`, `schoolRule.title.max.length`,
  `schoolRule.description.required`, `schoolRule.description.max.length` (all that apply); an unknown rule
  answers `schoolRule.id.notFound`. Every answer — reading or a change — carries the current version and the
  whole list in order, so the screen redraws from it.

## Who can do what

The account's status is checked before its role.

- **An approved account of any role (student, instructor, admin)** — reads the rules, in order, with the current
  version. Any other status is refused with `user.status.notApproved`.
- **An approved admin** — adds, edits, deletes and reorders rules. A student or instructor is refused with
  `schoolRule.role.notAdmin`; an admin who isn't approved, with `user.status.notApproved`.

## Boundaries

It doesn't record which version a user accepted, nor check whether a user must accept again: the accepted
versions belong to the user's account in [Authentication](auth.md), and asking for acceptance comes with the
onboarding School rules spec, which also decides whether only students or every role accepts. It sends no
notification about changes. It doesn't keep the text of past versions, or who edited, deleted or reordered a
rule.

## Spec history

- `010-school-rules-management` — created the module: the ordered list of rules (add, edit, delete, reorder),
  its version raised by every change to the text, reading by any approved account, changes by approved admins.
