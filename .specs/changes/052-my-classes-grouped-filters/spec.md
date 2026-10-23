---
id: "052"
slug: my-classes-grouped-filters
title: Group the "Minhas aulas" filters into four chips
template: quick
status: in-progress
created: 2026-10-22
started: 2026-10-22
base_commit: 21bdb997f42514d748d4507c6294bca1029ba02e
fronts: [mobile]
depends_on: []
---

# 052 — Group the "Minhas aulas" filters into four chips

## Goal

The student's "Minhas aulas" tab replaces its nine status chips (one per request status) with four groups —
Todas, Pendentes, Confirmadas, Encerradas — so the row reads at a glance. Each card keeps its request's exact
status chip, so the student still sees every status the requirements ask for.

## Context

- Requirements: [requirements.md → Request statuses](../../../.docs/requirements.md#request-statuses) — students
  see the status of each of their requests; it doesn't ask for one filter per status.
- Existing code this changes:
  - `apps/mobile/src/modules/enrolment/enrolment.types.ts` — `MyClassesFilter` lists `all` plus the eight
    request statuses.
  - `apps/mobile/src/modules/enrolment/utils/my-classes-filter.ts` — `MY_CLASSES_FILTERS` (the chips, in order)
    and `getMyClassFilter` (the one chip a class belongs to: `classCancelled` for a cancelled class, otherwise the
    request's status, `null` without a request); `filterMyClasses` filters on the client.
  - `apps/mobile/src/i18n/messages/{pt-BR,en-US,es-ES}.ts` → `myClasses.filters` — the chip labels.
  - `MyClassesFilters` (`components/my-classes-filters/`) draws whatever `MY_CLASSES_FILTERS` holds, and the
    screen hook (`screens/my-classes.screen.hook.ts`) starts on `all` and goes back to it when the tab loses
    focus; neither needs a code change.

## Decisions

| Id | Decision | Reason |
| --- | --- | --- |
| D-01 | The filter keys become `all`, `pending`, `confirmed`, `ended`. | The i18n keys keep meaning what they show; the type is app-only and never sent to the API. |
| D-02 | The empty state of a group keeps "Você não tem pedidos com este status." (and its translations). | The copy still reads right for a group; no new message to translate. |
| D-03 | pt-BR labels are feminine (they name *aulas*, like the screen title): "Todas", not "Todos". | Mixing "Todos" (pedidos) with "Confirmadas" (aulas) in one row reads wrong. Chosen by the user. |

## Expected Results

### ER-01 — Four chips, in order

- **Front:** mobile
- **Behavior:** Given a student opens "Minhas aulas", when the chip row is drawn, then it shows exactly four
  chips in this order, with the first selected: pt-BR "Todas", "Pendentes", "Confirmadas", "Encerradas"; en-US
  "All", "Pending", "Confirmed", "Ended"; es-ES "Todas", "Pendientes", "Confirmadas", "Cerradas".
- **Edge and error cases:** none of the old chips ("Recusados", "Anulados", "Cancelados", "Retirados",
  "Expirados", "Aula cancelada") is drawn; pressing a chip reports its key (`ended` for "Ended").
- **Verify by:** `npx jest src/modules/enrolment/components/my-classes-filters` (from `apps/mobile`) — "draws the
  four chips in order with only the selected one selected, and reports a press"; the labels of every locale are
  checked in `src/modules/enrolment/utils/my-classes-filter.test.ts` — "labels the four chips in every language".

### ER-02 — Each request belongs to exactly one group

- **Front:** mobile
- **Behavior:** Given a class in the student's list, when its group is worked out, then a `pending` request
  (on the waiting list or not) is in Pendentes, an `approved` request is in Confirmadas, and a `denied`,
  `withdrawn`, `cancelled`, `takenOut`, `expired` or `classCancelled` request is in Encerradas.
- **Edge and error cases:** any request in a cancelled class (`cancelledAt` set), an approved or pending one
  included, is in Encerradas; a class without a request belongs to no group and shows only under Todas; Todas
  keeps every class in its order.
- **Verify by:** `npx jest src/modules/enrolment/utils/my-classes-filter.test.ts` (from `apps/mobile`).

### ER-03 — Choosing a group on the screen

- **Front:** mobile
- **Behavior:** Given the student has pending, approved and ended requests, when they press "Encerradas"
  ("Ended"), then only the ended classes' cards are listed, and each card keeps its own status chip (e.g.
  "Withdrawn", "Cancelled").
- **Edge and error cases:** a group without classes shows "Nothing here" and "You have no requests with this
  status."; leaving the tab puts the row back on Todas ("All") with every card listed.
- **Verify by:** `npx jest src/modules/enrolment/screens/my-classes.screen.test.tsx` (from `apps/mobile`) — "shows
  only the chosen group, each card with its own status, and the empty state for a group without classes" and
  "puts the chips back on All when the tab is left".

## Tasks

### Mobile (`apps/mobile`)

- [x] **T-01** — Group the chips: change `MyClassesFilter` in `src/modules/enrolment/enrolment.types.ts` to
  `all | pending | confirmed | ended`; in `src/modules/enrolment/utils/my-classes-filter.ts` set
  `MY_CLASSES_FILTERS` to the four keys and make `getMyClassFilter` map each status to its group (a cancelled
  class first, as today); replace the `myClasses.filters` labels in `src/i18n/messages/{pt-BR,en-US,es-ES}.ts`
  with the four of ER-01. Update the tests: `utils/my-classes-filter.test.ts` (the order, every status's group,
  the cancelled-class and no-request cases, filtering, and the labels of the three locales),
  `components/my-classes-filters/my-classes-filters.component.test.tsx` (four chips, pressing "Ended") and
  `screens/my-classes.screen.test.tsx` (the group cases of ER-03). Skills: `vercel-react-native-skills`,
  `vercel-react-best-practices`.
  Covers: ER-01, ER-02, ER-03 · Done when: `npx jest src/modules/enrolment` (from `apps/mobile`) passes.
  > ✅ 2026-10-22 — `MyClassesFilter` is now `all | pending | confirmed | ended`; `MY_CLASSES_FILTERS` holds the
  > four keys and `getMyClassFilter` maps each status to its group through a `Record<EnrolmentStatus, …>` (a
  > cancelled class first → `ended`; no request → `null`); the `myClasses.filters` labels of pt-BR, en-US and es-ES
  > are the four of ER-01 (pt-BR "Todos" → "Todas", D-03). Tests written first and watched fail (5 failing, 3
  > suites), then pass: the util test checks the order, every status's group, a cancelled class with an approved
  > or pending request, no request, filtering, and the labels of the three locales; the component test draws the
  > four chips and presses "Ended"; the screen test covers "Ended" (Withdrawn and Cancelled cards), "Pending",
  > "Confirmed", the empty state of a group, the reset to All, and the pt-BR labels. Files:
  > `apps/mobile/src/modules/enrolment/enrolment.types.ts`,
  > `apps/mobile/src/modules/enrolment/utils/my-classes-filter.ts`,
  > `apps/mobile/src/modules/enrolment/utils/my-classes-filter.test.ts`,
  > `apps/mobile/src/modules/enrolment/components/my-classes-filters/my-classes-filters.component.test.tsx`,
  > `apps/mobile/src/modules/enrolment/screens/my-classes.screen.test.tsx`,
  > `apps/mobile/src/i18n/messages/pt-BR.ts`, `apps/mobile/src/i18n/messages/en-US.ts`,
  > `apps/mobile/src/i18n/messages/es-ES.ts`; verified: `npx jest src/modules/enrolment` (29 suites, 263 passed),
  > `npx tsc --noEmit` and `npx eslint src/modules/enrolment src/i18n` clean; deviations: none.

### Verification

- [ ] **T-02** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 052` — the related tests pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 052` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` — no errors.
- Manual (optional, the Jest tests cover every Expected Result): on the iOS simulator, signed in as a student
  with requests in several statuses, open "Minhas aulas", press each of the four chips and check the cards.

## Memory Impact

- `memory/modules/enrolment.md` — the "Minhas aulas" chip list becomes the four groups (Todas, Pendentes,
  Confirmadas, Encerradas — denied, withdrawn, cancelled, taken out, expired and any request in a cancelled
  class), each card keeping its exact status chip.
- `memory/product.md` — Current state notes the grouped filters.

## Amendments

## Review
