---
id: "059"
slug: teaching-classes-sport-filter
title: "Sport filter on the instructor's and admin's \"Minhas aulas\""
template: quick
status: in-progress
created: 2026-10-24
started: 2026-10-24
base_commit: 9c26c2478e5ae8209924cc58712b9525ba2393d5
fronts: [mobile]
depends_on: []
---

# 059 — Sport filter on the instructor's and admin's "Minhas aulas"

## Goal

Instructors, and admins who teach, can narrow "Minhas aulas" to surf or skate with the same floating filter as the
Aulas tab. The screen's loading, error and empty states keep working under the filter, and a filtered list with
nothing left says so in its own words.

## Context

- Requirements: none — the filter goes beyond the source documents and the design (PAINEL-03 draws none), as spec
  050 did for the week screen.
- Builds on spec 057 ([spec](../../finished/20261023212133-057-teaching-classes/spec.md)), which is only on
  `spec/057-teaching-classes` until pull request #77 is merged: execute this spec after that merge, so its branch
  starts from a `main` that has the screen.
- The week screen's filter (spec 050, [spec](../../finished/20261022203109-050-classes-discipline-filter/spec.md);
  its scrim, spec 051): `apps/mobile/src/modules/classes/components/discipline-filter/` (`DisciplineFilter`,
  `DISCIPLINE_FILTER_CLEARANCE`), the `DisciplineFilterValue` type in `classes.types.ts`, the labels under
  `classesWeek.disciplineFilter`, and how `classes-week.screen.tsx` / `.hook.ts` use them (local state starting at
  `"all"`, the button over the list in every state, the list's bottom padding).
- Existing code this changes: `apps/mobile/src/modules/classes/screens/teaching-classes.screen.tsx`, `.hook.ts` and
  `.types.ts` — "Minhas aulas" builds its rows with `layoutTeachingClasses(items, now)`
  (`utils/teaching-classes.ts`) and shows a skeleton, `ErrorState` with retry, or `EmptyState` "Nada por aqui"
  through `ListEmptyComponent`; the copy is under `teachingClasses` in `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`.

## Scope

- In scope: the sport filter on `TeachingClassesScreen` (both roles), its effect on the classes under way, the day
  groups and the next class, the button over every state, and the filtered empty state in pt-BR, es-ES and en-US.
- Out of scope: keeping the chosen sport after leaving the screen or across launches; filtering by level or status;
  a mark on the closed button showing a filter is on; filtering the home row's count; the student's "Minhas aulas"
  and the class history.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The screen hook filters the loaded items by sport before `layoutTeachingClasses`, so the classes under way, the day groups and the next class ("Próxima") only consider the chosen sport. It reuses `DisciplineFilter`, its `classesWeek.disciplineFilter` labels and `DISCIPLINE_FILTER_CLEARANCE`; no request is sent and `GET /classes/teaching` doesn't change. | The highlight must stay visible when the overall next class is of the other sport; the same component and copy as the Aulas tab (user's choice). |
| D-02 | The chosen sport is local state of `useTeachingClassesScreen` (`DisciplineFilterValue`, starting at `"all"`); nothing is stored on the device. | As on the week screen (spec 050, D-03): a view preference for the moment. |
| D-03 | When the query has items but none of the chosen sport is left at `useNow()`, the screen shows `EmptyState` with the `calendar-outline` icon, no action, and the copy under `teachingClasses.emptyFiltered.{surf,skate}.{title,description}`: pt-BR "Nenhuma aula de surf" / "Você não tem aulas de surf atribuídas." and "Nenhuma aula de skate" / "Você não tem aulas de skate atribuídas."; es-ES "Ninguna clase de surf" / "No tienes clases de surf asignadas." and "Ninguna clase de skate" / "No tienes clases de skate asignadas."; en-US "No surf classes" / "You don't have any surf classes assigned." and "No skate classes" / "You don't have any skate classes assigned.". With no items left whatever the sport, the existing "Nada por aqui" stays. | "Você ainda não tem aulas atribuídas." would be false while classes of the other sport exist. |
| D-04 | `TeachingClassesEntryRow`'s count ignores the filter. | The filter exists only on the screen and resets when it opens again. |

## Expected Results

### ER-01 — Filtering the list by sport

- **Front:** mobile
- **Behavior:** Given (now = Thursday 17 Sep 2026, 08:00 Fortaleza) items Bs (surf, today 07:30–09:00, under way),
  Bk (skate, today 07:00–09:00, under way), Nk (skate, today 09:00–10:00), Ns (surf, today 11:00–12:00) and Fk
  (skate, Saturday 09:00–10:00), when the user chooses "Surf" in the floating filter, then only Bs is on a grape card
  and only the "Hoje" group with Ns is shown, Ns with the "Próxima" chip; when they choose "Skate", Bk is the only
  grape card, "Hoje" has Nk with "Próxima" and "Sábado" has Fk; "Todas" shows every item again, with Nk as
  "Próxima".
- **Edge and error cases:** switching the sport sends no request; the filter starts on "Todas" when the screen opens
  again; a day whose classes are all of the other sport has no header; a cancelled class of the chosen sport stays in
  its day and is never "Próxima"; with the minute tick, the filter keeps applying without a refetch.
- **Verify by:** `npx jest src/modules/classes/screens/teaching-classes.screen.test.tsx` (from `apps/mobile`), and
  the user journey in the Verification Plan.

### ER-02 — The filter button over every state

- **Front:** mobile
- **Behavior:** Given the screen, when it is loading, failed, empty or showing classes, then the floating filter
  button is on screen over it, and the list's bottom padding includes `DISCIPLINE_FILTER_CLEARANCE`, so the last card
  scrolls clear of the button.
- **Edge and error cases:** the skeleton is still one loading state; the error still retries with "Tentar
  novamente"; with no items at all the screen shows "Nada por aqui" / "Você ainda não tem aulas atribuídas." whatever
  the chosen sport; the home row's count doesn't change with the filter.
- **Verify by:** `npx jest src/modules/classes/screens/teaching-classes.screen.test.tsx
  src/modules/classes/components/teaching-classes-entry-row` (from `apps/mobile`).

### ER-03 — Empty after filtering

- **Front:** mobile
- **Behavior:** Given items that are all skate, when the user chooses "Surf", then the screen shows "Nenhuma aula de
  surf" with "Você não tem aulas de surf atribuídas." (pt-BR), and with only surf items, "Skate" shows "Nenhuma aula
  de skate" with "Você não tem aulas de skate atribuídas.".
- **Edge and error cases:** when the only surf class ends at the minute tick while "Surf" is chosen, the filtered
  empty state replaces it without a refetch; the copy exists in es-ES and en-US (D-03); choosing "Todas" brings the
  classes back.
- **Verify by:** `npx jest src/modules/classes/screens/teaching-classes.screen.test.tsx` (from `apps/mobile`).

## Tasks

### Mobile (`apps/mobile`)

- [ ] **T-01** — Add the sport filter to "Minhas aulas": the D-02 state and the D-01 filtering before
  `layoutTeachingClasses` in `src/modules/classes/screens/teaching-classes.screen.hook.ts` (returning the sport and
  its setter, typed in `teaching-classes.screen.types.ts`), and `DisciplineFilter` over the list in every state plus
  `DISCIPLINE_FILTER_CLEARANCE` in the list's bottom padding in `teaching-classes.screen.tsx`, with tests in
  `teaching-classes.screen.test.tsx` for every case of ER-01 and ER-02 (including that no request is sent on a
  switch and that the home row's count is unchanged in `teaching-classes-entry-row.component.test.tsx` if its
  existing tests don't already prove it). Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-01, ER-02 · Done when: `npx jest src/modules/classes/screens/teaching-classes.screen.test.tsx
  src/modules/classes/components/teaching-classes-entry-row` passes from `apps/mobile`.
- [ ] **T-02** — Add the filtered empty state (D-03): the hook tells it apart from the empty list, the screen
  renders it in `ListEmptyComponent`, and the copy goes under `teachingClasses.emptyFiltered` in
  `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`, with tests in `teaching-classes.screen.test.tsx` for every case of ER-03
  in the three languages. Skills:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-03 · Done when: `npx jest src/modules/classes/screens/teaching-classes.screen.test.tsx src/i18n` passes
  from `apps/mobile`.

### Verification

- [ ] **T-03** — Run every command in the Verification Plan from the repo root; all pass. Follow the user journey on
  the iOS simulator and record the output summary and what was seen as evidence.
  Covers: all · Done when: every automated command exits 0 and the user journey is recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 059` — the related tests pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 059` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/mobile` — no errors.
- User journey (iOS simulator, pt-BR): as an approved instructor or admin who teaches surf and skate classes, open
  "Minhas aulas" → the floating filter button is at the bottom right over the list; choose "Surf" → only surf classes,
  with "Próxima" on the next surf class; choose "Skate" → only skate classes; on a sport with no class, the filtered
  empty state; back on Início, the row's count is unchanged; reopening the screen shows "Todas".

## Memory Impact

- `memory/product.md` — Current state: the sport filter on the instructor's and admin's "Minhas aulas"; Out of
  scope: take the instructor's and admin's "Minhas aulas" out of spec 050's "filtering other lists" item (the
  student's stays) and "filtering the list by sport" out of spec 057's item (level and status stay).
- `memory/technical-context.md` — the spec 057 mobile bullet: `TeachingClassesScreen`'s sport state, the filtering
  before `layoutTeachingClasses`, `DisciplineFilter` over every state and the `teachingClasses.emptyFiltered` copy.
- `memory/structure.md` — None.
- `memory/modules.md` — None.
- `memory/modules/classes.md` — Boundaries: "Minhas aulas" filters by sport; a Spec history line.

## Amendments

## Review
