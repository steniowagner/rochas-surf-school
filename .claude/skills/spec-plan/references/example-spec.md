---
id: "003"
slug: booking-cancellation
title: Owners cancel a booked walk
status: planned
created: 2026-10-06
fronts: [domain, backend, mobile]
depends_on: []
---

# 003 — Owners cancel a booked walk

<!-- Example of a complete spec that passes check-spec.mjs. The product (a dog-walking app), paths and skill
names are illustrative: a real spec uses the project's own memory, paths and skills. -->

## Goal

Dog owners can cancel a walk they booked from the mobile app, up to 2 hours before it starts, and the
walker's slot becomes free again. Today only support can cancel a booking, and owners who can't reach support
simply don't show up.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: Booking (requested → confirmed →
  completed), Walker availability; decision "cancellations close 2h before the walk".
- Requirements: [requirements.md → Cancelling a booking](../../../.docs/requirements.md#cancelling-a-booking)
  — owners cancel up to 2h before the walk; [requirements.md → Walker availability](../../../.docs/requirements.md#walker-availability)
  — a cancelled walk frees the slot.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Architecture (use
  cases live in `modules/*`), Error handling (i18n error keys), Automated validation.
- Existing code this builds on: `modules/booking/src/booking/model/booking.entity.ts` — Booking with the
  `requested | confirmed | completed` states; no cancellation yet.

## Scope

### In scope

- Cancelling a `requested` or `confirmed` booking by its owner, up to 2h before the walk.
- Freeing the walker's slot when a booking is cancelled.
- The cancel action on the mobile booking detail screen.

### Out of scope

- Refunds or credits (payments happen outside the app).
- Notifying the walker (spec 005 adds notifications).
- Cancellation by walkers or admins.
- A cancellation reason field.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The 2h window is measured against the walk's start time in the walk's time zone. | Owners and walkers think in local time; the server's time zone means nothing to them. |
| D-02 | A cancelled booking keeps its record, with status `cancelled` and `cancelledAt`; nothing is deleted. | Support needs the history, and the walkers' monthly report counts cancellations. |
| D-03 | Cancelling a booking that is already cancelled answers 409, not 200. | The app must show the real state; a silent success would hide a stale screen. |

## Expected Results

### ER-01 — Owner cancels a booking more than 2h ahead

- **Front:** backend
- **Behavior:** Given a `confirmed` booking that starts in 3h, when its owner calls
  `POST /bookings/:id/cancel`, then the API answers 200, the booking's status is `cancelled` with
  `cancelledAt` set, and the walker's slot at that time is free again.
- **Edge and error cases:** a `requested` booking is cancelled the same way.
- **Verify by:** `npx vitest run src/booking/usecase/cancel-booking.usecase.spec.ts -t "cancels"` (from
  `modules/booking`) and the `cancel booking` request in `apps/api/src/booking/booking.integration.http`.

### ER-02 — Cancellation is refused inside the 2h window

- **Front:** backend
- **Behavior:** Given a `confirmed` booking that starts in 90 minutes, when its owner calls
  `POST /bookings/:id/cancel`, then the API answers 409 with `errors: ["booking.cancellation_window_closed"]`
  and the booking is unchanged.
- **Edge and error cases:** exactly 2h before the start is still allowed (D-01); `completed` and `cancelled`
  bookings answer 409 with `booking.not_cancellable`.
- **Verify by:** `npx vitest run src/booking/usecase/cancel-booking.usecase.spec.ts -t "window"` (from
  `modules/booking`) and the `cancel inside window` request in `booking.integration.http`.

### ER-03 — Only the owner can cancel

- **Front:** backend
- **Behavior:** Given a booking that belongs to owner A, when owner B calls `POST /bookings/:id/cancel`, then
  the API answers 403 with `errors: ["booking.forbidden"]` and the booking is unchanged.
- **Edge and error cases:** an unknown id answers 404 with `booking.not_found`; a call without a token
  answers 401.
- **Verify by:** the `cancel as another owner`, `cancel unknown booking` and `cancel without token` requests
  in `booking.integration.http`.

### ER-04 — Cancel action on the booking detail screen

- **Front:** mobile
- **Behavior:** Given an owner viewing an upcoming booking that starts in more than 2h, when they tap
  "Cancelar passeio" and confirm the dialog, then the screen shows the booking as "Cancelado" and the action
  disappears.
- **Edge and error cases:** inside the 2h window the action is disabled and shows "Cancelamento encerrado 2h
  antes do passeio"; an API error shows a toast with the translated error key.
- **Verify by:** manual check on the iOS simulator with the seeded owner `owner@example.com`: the booking 3h
  ahead cancels; the booking 1h ahead shows the disabled action.

## Tasks

### Domain (`modules/booking`)

- [ ] **T-01** — Add the `cancelled` state and `cancelledAt` to `src/booking/model/booking.entity.ts`, with
  the rule "cancellable only when requested or confirmed, and at least 2h before the start", plus unit tests
  for each state and the 2h boundary. Skill: [`entity`](../../../.claude/skills/entity).
  Covers: ER-01, ER-02 · Done when: `npx vitest run src/booking/model/booking.entity.spec.ts` passes.

- [ ] **T-02** — Add the `cancel-booking` use case in `src/booking/usecase/cancel-booking.usecase.ts`: owner
  check, cancellation and slot release through the availability repository, with tests for success, window
  closed, not cancellable and not owner. Skill: [`use-case`](../../../.claude/skills/use-case).
  Covers: ER-01, ER-02, ER-03 · Done when: `npx vitest run src/booking/usecase/cancel-booking.usecase.spec.ts`
  passes.

### Backend (`apps/api`)

- [ ] **T-03** — Add the `cancelled` status value and the `cancelled_at` column to the booking Prisma model,
  with a migration. Skill: [`prisma-migration`](../../../.claude/skills/prisma-migration).
  Covers: enabling · Done when: `npx prisma migrate dev` applies the migration on the local database.

- [ ] **T-04** — Expose `POST /bookings/:id/cancel` (authenticated) in `src/booking/booking.controller.ts`
  and add the five cancellation scenarios to `src/booking/booking.integration.http`. Skill:
  [`api-endpoint`](../../../.claude/skills/api-endpoint).
  Covers: ER-01, ER-02, ER-03 · Done when: the five scenarios answer 200, 409, 403, 404 and 401 against the
  local API.

### Mobile (`apps/mobile`)

- [ ] **T-05** — Add the "Cancelar passeio" action with a confirmation dialog to
  `src/modules/booking/screens/booking-detail.screen.tsx`, disabled inside the 2h window with its
  explanation, and add the new error keys to the i18n files.
  Covers: ER-04 · Done when: the manual check in ER-04 passes on the iOS simulator.

### Verification

- [ ] **T-06** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence.
  Covers: all · Done when: every automated command exits 0 and the manual check is recorded.

## Verification Plan

- Automated:
  - `npm run lint`, `npm run check-types`, `npm run build` — no errors.
  - `npm test --workspaces -- --coverage` — every suite passes, coverage reports written.
  - `node .claude/skills/spec-plan/scripts/check-coverage.mjs 003` — 100% on every source file this spec
    changes.
  - `npm run test:e2e --workspace apps/api` — the e2e suite passes, including the cancellation scenarios.
  - `booking.integration.http` against `npm run dev` — the five cancellation scenarios answer as ER-01–ER-03
    describe.
- User journeys (e2e, followed in a browser or simulator):
  - ER-04 on the iOS simulator, as described in its Verify by.

## Memory Impact

- `memory/product.md` — the Booking lifecycle gains `cancelled`; record decision D-02 (cancelled bookings are
  kept).
- `memory/modules/booking.md` — Booking lifecycle and the cancellation rules (owner only, up to 2h before the
  walk, slot freed); Owner can cancel their own bookings.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
