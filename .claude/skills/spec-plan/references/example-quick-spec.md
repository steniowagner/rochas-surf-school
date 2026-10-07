---
id: "007"
slug: walk-duration-label
title: Show the walk duration in hours and minutes
template: quick
status: planned
created: 2026-10-06
fronts: [mobile]
depends_on: []
---

# 007 — Show the walk duration in hours and minutes

<!-- Example of a quick spec that passes check-spec.mjs. The product (a dog-walking app) and paths are
illustrative: in a real spec the links must resolve, since check-spec.mjs checks them. -->

## Goal

Owners see a walk's duration as "1h 30min" instead of "90 min" on the booking detail screen, as the
requirements ask. Long walks are hard to read in minutes.

## Context

- Requirements: [requirements.md → Booking detail](../../../.docs/requirements.md#booking-detail) — durations
  are shown in hours and minutes.
- Existing code this changes: `apps/mobile/src/modules/booking/utils/format-duration.ts` — returns
  `"<minutes> min"`.

## Expected Results

### ER-01 — Durations of an hour or more show hours and minutes

- **Front:** mobile
- **Behavior:** Given a walk of 90 minutes, when the booking detail screen formats its duration, then it shows
  "1h 30min".
- **Edge and error cases:** 60 minutes shows "1h"; 45 minutes keeps "45 min"; 0 minutes shows "0 min".
- **Verify by:** `npx jest src/modules/booking/utils/format-duration.test.ts` (from `apps/mobile`).

## Tasks

### Mobile (`apps/mobile`)

- [ ] **T-01** — Change `src/modules/booking/utils/format-duration.ts` to return hours and minutes from 60
  minutes on, with a test for each case in ER-01 in `format-duration.test.ts`.
  Covers: ER-01 · Done when: `npx jest src/modules/booking/utils/format-duration.test.ts` passes.

### Verification

- [ ] **T-02** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 007` — the related tests pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 007` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types --filter=@walkies/mobile` — no errors.

## Memory Impact

None.

## Amendments

## Review
