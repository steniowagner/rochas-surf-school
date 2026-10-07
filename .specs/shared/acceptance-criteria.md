# Acceptance Criteria Rules

How Expected Results are written (by `spec-plan`) and verified (by `spec-review`). The reviewer is a
different agent that never saw the planning conversation, so an Expected Result is only useful if that
agent can decide pass/fail from the spec and the code alone.

## Every Expected Result

1. **Has an id** (`ER-01`, `ER-02`…), never renumbered after the spec is written. One an amendment removes
   stays, struck through and marked `(removed: <reason>)`; it needs no task and no verification.
2. **Describes observable behavior**, not implementation: what a user, a client of the API or a test sees.
   Implementation constraints belong in `## Decisions`.
3. **Is binary.** Two reviewers reading it reach the same verdict. Words like *fast*, *simple*, *intuitive*,
   *properly*, *user-friendly*, *robust* or *etc.* are not allowed unless they are quantified or replaced by a
   concrete observation.
4. **Covers one behavior.** If it needs "and" to describe two independent outcomes, split it.
5. **States its edge and error cases**: invalid input, missing permission, not found, duplicate, empty state,
   offline/failure of a dependency — whichever apply. The happy path alone is not a contract.
6. **Names its front** — one of the fronts listed in `technical-context.md` → Applications (e.g. `backend`,
   `web`, `mobile`, `infra`) — so the reviewer knows where to look.
7. **Has a verification method** the reviewer can run or follow, in this order of preference:
   - an automated test (file and test name, and the command that runs it);
   - a command with an expected output (the type check exits 0, a migration applies cleanly);
   - an HTTP request (method, path, body, auth) with the expected status and response shape;
   - for user-facing behavior, an end-to-end check: the e2e test (file and test name) when the app has a suite
     in the technical context's `e2e` block — `run-e2e.mjs` runs it, locally and in CI — otherwise the user
     journey — where to go, what to do, what must be seen — precise enough for the reviewer to follow it in a
     browser or a simulator (see `Automated validation` in the technical context).

## The set of Expected Results

- Every Expected Result is covered by at least one task, and every task covers at least one Expected Result
  or is marked `Covers: enabling`.
- Together they describe the whole Goal. If the Goal promises something no Expected Result checks, either an
  Expected Result is missing or the Goal overpromises.
- Out-of-scope items never appear as Expected Results.

## Format

```md
### ER-03 — A walker cannot be double-booked

- **Front:** backend
- **Behavior:** Given walker W has a confirmed booking from 10:00 to 11:00, when an owner calls
  `POST /bookings` for W from 10:30 to 11:30, then the API answers 409 with
  `errors: ["booking.walker_unavailable"]` and no booking is stored.
- **Edge and error cases:** a cancelled booking does not block the slot; back-to-back bookings
  (11:00–12:00) are allowed.
- **Verify by:** `npx vitest run src/booking/create-booking.spec.ts -t "walker unavailable"` and the
  `overlapping booking` request in `booking.integration.http`.
```
