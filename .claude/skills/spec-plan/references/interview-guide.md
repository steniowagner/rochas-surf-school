# Interview Guide

A checklist of the branches of the decision tree a spec usually has to resolve. It is not a script: skip
what the input, the memory or the code already answers, and never ask a question just because it is on
this list. Use it to notice what is *missing*.

## Contents

1. Problem and value
2. Actors and permissions
3. Domain and data
4. Behavior and rules
5. Edge cases and failures
6. Per-front questions (modules, backend, web, mobile, infra)
7. Non-functional
8. Scope, rollout and dependencies
9. Verification
10. Red flags to call out

## 1. Problem and value

- Who has the problem, and what do they do today without this feature?
- What does "done" look like from the user's point of view — what can they do after that they can't now?
- Is this the smallest change that delivers that value? What can be cut into a follow-up spec?

## 2. Actors and permissions

- Which roles touch the feature (from `product.md`)? What may each one see, create, change, delete?
- What happens when someone without permission tries? (hidden in UI, 403, 404 to avoid leaking existence?)
- Data ownership: whose data is it, and how is it isolated?

## 3. Domain and data

- New concepts vs existing ones: does a new term overlap an existing concept in `product.md` or
  `modules/<id>.md`? Same thing under a new name is a red flag.
- Fields: name, type, required/optional, limits (length, range, max count), uniqueness, defaults.
- Relationships and cardinality; what happens to children when a parent is deleted or cancelled.
- Lifecycle/states of each entity and the allowed transitions.
- Existing data: does anything need a migration or a backfill?

## 4. Behavior and rules

- Every business rule as a testable statement ("a class with 0 free spots rejects enrolment").
- Ordering, sorting, filtering, pagination of any list.
- Time: time zones, deadlines ("up to 24h before" — measured how, in whose time zone?), recurring events.
- Money, counting, rounding — any rule involving numbers needs exact semantics.
- Notifications or side effects: who is told what, when, through which channel.

## 5. Edge cases and failures

- Empty states, first-time use, maximum sizes.
- Concurrency: two users acting on the same thing at once (last spot in a class, double submit).
- Invalid input and how each error is reported (error key, HTTP status, UI message).
- External dependency down or slow: what does the user see?
- Partial failure: if step 2 of 3 fails, what state is left behind?

## 6. Per-front questions

Only for the fronts this spec touches — the applications and packages listed in `technical-context.md`.
Decide explicitly which fronts are in — "web only, mobile later" is a valid answer, but it must be a
decision, not an omission. For each front, check which project skills in `.claude/skills/` implement that
kind of work; the tasks should name them.

- **Domain / business modules**: which module and aggregate owns it? New aggregate or extension? Which use
  cases (commands) vs queries?
- **Backend / API**: endpoints (method, path, auth, request, response, errors), schema and migration,
  providers or adapters to implement.
- **Web**: routes (public/private), screens, states (loading, empty, error, success), navigation entry
  points, design-system tokens/components to use, responsive behavior.
- **Mobile**: screens and where they sit in the navigation, parity with web or intentional differences,
  offline behavior, platform differences (iOS/Android), the design system's touch-target rules.
- **Shared packages**: new shared validation rules, tokens or contracts.
- **Infra**: env vars (names only), containers, CI, scheduled jobs, storage, third-party accounts.

## 7. Non-functional

Only when it matters for this change, and always quantified: performance targets, limits (file size, rate),
security (PII, secrets, auth), accessibility, i18n (which languages, who writes the copy), observability.

## 8. Scope, rollout and dependencies

- What is explicitly out of scope? (Write down the things someone would reasonably assume are in.)
- Does it depend on an active spec in `.specs/changes/` that is not finished? Does it conflict with one?
- Feature flag, data migration order, backwards compatibility with existing clients (mobile apps in the
  stores can't be updated instantly).

## 9. Verification

- For each Expected Result: how will a reviewer agent prove it? Prefer the project's automated standard
  (`Automated validation` in the technical context); fall back to a precise manual step.
- Are there test fixtures/seed data the reviewer needs?

## 10. Red flags to call out

Raise these immediately, quoting the source:

- The request contradicts `product.md` (a decision, a concept, an out-of-scope item) or
  `technical-context.md` (a fixed convention, the architecture).
- The request contradicts itself, or contradicts code that already exists.
- Vague qualifiers: *simple, fast, intuitive, like app X, etc., and so on, standard, the usual*.
- A requirement with no actor, no trigger, or no observable outcome.
- Scope creep: the request is really two or three specs.
- Overlap with an active spec, or rework of something a finished spec deliberately decided.
- A decision that is expensive to reverse (data model, public API, auth) being made casually.
