# Product Interview Guide

What to learn about the product, which section of `.specs/templates/product-model.md` each answer feeds, what
a good answer looks like, and the red flags to call out. Skip whatever the sources already answer; use this
to notice what is missing, not as a questionnaire.

Examples use a made-up dog-walking app so they don't leak assumptions into the real product.

## Contents

1. Identity and value → `In one sentence`
2. Users and roles → `For whom`
3. Domain concepts → `Domain concepts`
4. Main journeys (discovery aid)
5. Rules and product decisions → `Relevant product decisions`
6. Business model and constraints
7. Current state → `Current state`
8. Out of scope → `Out of scope`
9. Red flags

## 1. Identity and value → `In one sentence`

Learn: the product name as users see it, what kind of thing it is, who uses it, the core action and the
value it delivers. Then the **central narrative**: the value cycle in a short phrase.

- Good: **"Walkies"** is a mobile app where dog owners book vetted walkers near them for one-off or recurring
  walks and follow each walk live. Narrative: *"find a walker, book, follow the walk"*.
- Weak: "a platform that connects people and makes their lives easier" — no actor, no action, no outcome.

Useful questions: what does someone do in their first five minutes? What do they use today instead? What
would make them stop using it?

## 2. Users and roles → `For whom`

For **each role**: who they are, what they want, what they can do and see, which platform they use (web,
mobile, both), how they get an account (self sign-up, invitation, created by an admin), and whether one
person can hold several roles.

Also decide **data ownership and tenancy**: one organization or many? What is private to a person, shared
within an organization, public to anyone?

Sensitive groups and data (minors, health, payments, location) bring legal constraints — surface them here.

When there is more than one role, add a `Roles and permissions` section right after `For whom` with one
bullet per role.

## 3. Domain concepts → `Domain concepts`

Harvest the nouns from the user's descriptions and the docs. For **each concept**:

- **Definition** — what it is and why it exists.
- **Key fields** at product level — what users see or decide, not database columns.
- **Relationships** with cardinality — a Walk has one Walker; a Walker has many Walks.
- **Lifecycle** — states, transitions and who triggers them (Booking: requested → confirmed → completed |
  cancelled).
- **Limits and rules** — max 3 dogs per walk; cancellation up to 2h before.
- **One name.** If people use several ("lesson", "class", "session"), choose one with the user and record
  the aliases to avoid. One concept with two names — or one name for two concepts — breaks every spec that
  follows.
- **Id** — kebab-case identifier the code will use (`walk`, `booking`).

Order concepts as the user meets them in the value cycle. Probes: "Can X exist without Y?", "What happens to
X when Y is cancelled or deleted?", "Who creates X, and who can change it afterwards?"

## 4. Main journeys (discovery aid)

Walk through the main journeys end to end, per role. It is the fastest way to find missing concepts, states
and rules. If the product benefits from it, add a short `Main journeys` section (one line per journey,
linking to detailed docs when they exist); the details belong in docs or specs, not here.

## 5. Rules and product decisions → `Relevant product decisions`

Policies with their numbers (cancellation windows, prices, quotas, approval steps) and the non-obvious
choices someone could "fix" by mistake (e.g. "payments happen outside the app — the product only records
them"). Each decision in **bold**, followed by its reason or consequence.

## 6. Business model and constraints

Who pays, for what, and whether money moves inside the product; markets, languages and time zones; legal
and regulatory constraints; accessibility expectations. Record what shapes behavior — as a decision, in
`For whom`, or as out of scope. Skip what doesn't.

## 7. Current state → `Current state`

From the code, the git history and the specs: what is actually built today (nothing yet, a scaffold, an
MVP…) and which specs are active. Plans are not state: an idea in a doc is not a delivered feature.

## 8. Out of scope → `Out of scope`

What the product deliberately does not do, now or ever, and the ideas parked for later. Ask: "What will
people expect that we are not doing?" Without this list, every spec quietly grows.

## 9. Red flags

- A value statement with no actor, action or outcome.
- Roles with blurry boundaries ("admins and managers can do most things").
- One concept with several names, or one name covering several concepts.
- Concepts without a lifecycle; rules without numbers ("cancel close to the class").
- Sources that disagree (docs vs. user vs. code) — quote both and ask which wins.
- Technical answers to product questions ("we'll use Firebase") — note them for the technical phase and
  bring the question back to behavior.
- A first version that is everything at once ("and a marketplace, and a social feed").
