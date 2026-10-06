# Task Breakdown

How a spec's work is divided into tasks: written by `spec-plan`, executed by `spec-execute`, checked by
`check-spec.mjs`. A spec is reviewed as one unit but built one task at a time, and `spec-execute` executes
tasks and nothing else — work that isn't in a task doesn't get done. So every spec has tasks, however small
the change: a one-line fix still gets its task and the Verification task.

## Every task

1. **Has an id** `T-NN` — sequential, never renumbered.
2. **Belongs to one front** and sits in that front's group (`### Backend (`apps/api`)`). Work that spans
   fronts is split: the endpoint and the screen that calls it are two tasks.
3. **Is one coherent change** — one layer of one front: an entity with its tests, an endpoint, a screen. If
   describing it needs "and then" twice, split it. Rule of thumb: a handful of files, finished and verified in
   one sitting.
4. **Says where** — the real files or folders it creates or changes.
5. **Names the project skill** that implements it when one fits: `Skill: [name](../../../.claude/skills/name)`.
6. **Says what it covers** — `Covers: ER-01, ER-03`, or `Covers: enabling` for setup no Expected Result checks
   directly (a migration, a dependency, wiring).
7. **Says when it is done** with an observable check — `Done when: <command> passes`, `… answers 201`,
   `… shows the empty state`. "Done when it works" is not a check.
8. **Carries its own tests** — enough to leave every file it creates or changes at 100% coverage. A behavior
   and the test that proves it belong to the same task, not to a "write the tests" task at the end. When an
   Expected Result's `Verify by` names a test, some task creates it.

## The list

- **Ordered by dependency.** Groups go from the inside out (e.g. domain → shared packages → backend → web →
  mobile → infra); within a group, a task depends only on tasks above it. Nothing waits on a later task.
- **Covers everything.** Every Expected Result is named in at least one task's `Covers`. `Covers: all` on the
  verification task doesn't count — it checks, it doesn't build.
- **Ends with a `### Verification` group** whose task runs the Verification Plan.
- **Stays in scope.** No task builds something listed in Out of scope.

## Format

```md
### Backend (`apps/api`)

- [ ] **T-04** — Expose `POST /bookings/:id/cancel` (authenticated) in `src/booking/booking.controller.ts`
  and add the five cancellation scenarios to `src/booking/booking.integration.http`. Skill:
  [`api-endpoint`](../../../.claude/skills/api-endpoint).
  Covers: ER-01, ER-02, ER-03 · Done when: the five scenarios answer 200, 409, 403, 404 and 401 against the
  local API.
```

## Anti-patterns

- "Implement the backend" — that is a front, not a task.
- "Write the tests" as the last task — tests belong to the task whose behavior they prove.
- One task in two fronts ("add the endpoint and the screen").
- No `Covers`, no `Done when`, or "Done when: it works".
- An order that hides a dependency — the screen before the endpoint it calls, with nothing to call.
