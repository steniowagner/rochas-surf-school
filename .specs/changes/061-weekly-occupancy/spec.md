---
id: "061"
slug: weekly-occupancy
title: Weekly occupancy map for admins
status: in-progress
created: 2026-10-25
started: 2026-10-25
base_commit: eb2c201b331995da009917e5baf5dc8e934606a5
fronts: [mobile]
depends_on: []
---

# 061 — Weekly occupancy map for admins

## Goal

Admins get an "Ocupação semanal" screen, opened from their home, that shows a week of classes as a map: one column
per day, one row per start time, and in each cell the share of the class's seats that are taken, coloured on a
four-step scale. Tapping a cell shows that class's card, which opens its details. The admin moves week by week, so
they can see at a glance which classes still have room and which are full.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: admin, class, capacity, seats taken (approved
  students plus guests), cancelled class, the America/Fortaleza week. Out of scope there today: "An admin dashboard
  with metrics (classes per day, occupancy, average ratings, a ratings list)" and, under spec 057, "the rest of the
  dashboards (… "Ocupação semanal")". D-01 brings this one screen in.
- Requirements: [user-journeys.md → Out of scope for now](../../../.docs/user-journeys.md#out-of-scope-for-now) and
  [requirements.md → 5. Ratings and photos](../../../.docs/requirements.md#5-ratings-and-photos) (its "Dependencies
  and constraints" list) both put the admin dashboard with occupancy out of scope; this spec departs from them for the
  weekly occupancy screen only (D-01). The design is `.docs/designs/admin-app.html` → PAINEL-14 "Weekly occupancy"
  (the `ocupSemanaScreen` of the "App Admin" component), changed by D-03, D-04 and D-05.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Applications →
  `apps/mobile` and `packages/design-tokens`, the mobile rules in `CLAUDE.md` (NativeWind, tokens only,
  `TouchableOpacity` buttons, the shared Stack header), Automated validation (no mobile e2e suite: Jest + RNTL and
  user journeys).
- Existing code this builds on:
  - `apps/mobile/src/modules/classes/hooks/use-week-classes.hook.ts` — `weekClassesOptions(weekStart)` /
    `useWeekClasses`, which call `GET /classes?date=<Monday>`. The API answers every class starting in that
    Fortaleza week (Monday 00:00 to the next Monday 00:00), cancelled and past ones included, sorted by start, then
    end, then id, each with `capacity`, `seatsTaken` and `cancelledAt` (`ClassItem` in `classes.types.ts`). Any
    approved account may read any week, past or future.
  - `apps/mobile/src/modules/classes/utils/occupancy.ts` — `getOccupancyPercent` (0–100, rounded, capped) and
    `isClassFull`; `utils/week.ts` — `schoolDayOf`, `schoolTimeOf`; `utils/calendar.ts` — `todayInSchoolZone`;
    `src/utils/calendar-dates.ts` — `mondayOf`, `addWeeks`, `weekDays`, `weekCaption`, `weekdayAbbreviation`,
    `formatIsoDate`, `getDateLocale`; `hooks/use-now.hook.ts` — `useNow`.
  - `apps/mobile/src/modules/classes/components/class-card/` (`ClassCard`, with `showFlags` for admins) and
    `class-card-skeleton/`; `src/components/ui/{empty-state,error-state,skeleton}`.
  - `apps/mobile/src/components/week-month-calendar/week-month-calendar.component.tsx` — the ‹ › arrow buttons
    (`h-9 w-9 rounded-full border border-line bg-surface`, `hitSlop`) and their labels
    `weekMonthCalendar.previousWeek` / `nextWeek`.
  - `apps/mobile/src/modules/classes/screens/teaching-classes.screen.tsx` / `.hook.ts` — the pattern for the states:
    refetch on focus (`cancelRefetch: false`), pull-to-refresh, retry keeping the error on screen while it runs, a
    failed refetch keeping the data, nothing shown after an expired session.
  - `apps/mobile/src/modules/enrolment/screens/my-classes.screen.tsx` (commit `a8e75053`) — the centered
    `StackHeaderTitle` and the scroll view as the screen's first view, so the native header's scroll-edge blur
    finds it.
  - `apps/mobile/src/modules/admin/screens/admin.screen.tsx` — the admin home ("Ferramentas" and "Escola"
    sections); `src/constants/routes.ts` — `routes.admin`; `src/app/(private)/admin/` — the admin stack, whose
    files Expo Router registers on their own.
  - `packages/design-tokens/src/tokens.ts` — colors `infoTint`, `sun`, `bad`, `dim`, `line`, `grape`, `lagoon`,
    `ink`, `ink3`, `onColor`; type styles `calendarMonthDay`, `sectionLabel`.

## Scope

### In scope

- The "Ocupação semanal" row on the admin home and the admin route `/admin/weekly-occupancy`.
- The screen: centered header title with the scroll-edge blur, the week bar (‹ caption ›), the week map with its
  legend, the selected class's card, and the loading, error and empty states, pull-to-refresh and refetch on focus.
- New tokens: the color `sunTint` (light and dark), the type style `occupancyCell` and the radii `occupancyCell` and
  `swatch`.
- The copy in pt-BR, es-ES and en-US.

### Out of scope

- The grape summary card at the top of PAINEL-14 (percentage, "N de M lugares ocupados", free seats, full classes
  and the comparison with the previous week) — removed by D-03.
- The rest of the admin dashboard: the grape "Ocupação da semana" card on the home, classes per day, average
  ratings, "Avaliações das aulas", the greeting.
- Any backend or API change, and any stored or precomputed occupancy figure.
- A sport, level or instructor filter on the map; swiping between weeks; a month view; remembering the chosen week
  after leaving the screen.
- The screen for instructors or students.
- Changing the class card's occupancy bar thresholds (above 80% sun) to match the map's.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The weekly occupancy screen comes into scope for admins only, on mobile; the other dashboard metrics stay out of scope. `spec-finish` updates the out-of-scope lines in `product.md`, `user-journeys.md` → Out of scope for now and `requirements.md` → 5 (Dependencies and constraints) to say the weekly occupancy screen exists. | User's choice: it needs no new data or API, and the rest of the dashboard is still unplanned. |
| D-02 | The screen reads the week with the existing `weekClassesOptions(weekStart)` (`GET /classes?date=<Monday>`, same query key as the Aulas tab) and computes everything on the phone; the backend doesn't change. | The week list already carries capacity, seats taken and cancellation for every class of the week; sharing the query keeps the Aulas tab and the map in sync. |
| D-03 | The grape summary card of PAINEL-14 is not built at all; the screen starts with the week bar, then "Mapa da semana". | User's design note ("remove this headline at the top about analytics"); the map and the selected card already show the seats. |
| D-04 | The screen opens on the current week (`mondayOf(todayInSchoolZone(now))`). A week bar at the top of the content has the previous and next arrows (the `WeekMonthCalendar` arrow style and its `weekMonthCalendar.previousWeek` / `nextWeek` labels) and the `weekCaption` between them (`ds-text-pill text-ink`, centered); each arrow moves one week, with no limit into the past or the future. The bar shows in every state. | User's choice (the design has a fixed week); the request takes any week. The bar stays in the error state so the admin can leave a week that fails. |
| D-05 | The header title is centered: `<Stack.Screen options={{ headerTitleAlign: "center", headerTitle: () => <StackHeaderTitle title={…} /> }} />` with "Ocupação semanal", and the screen's scroll view (a `ScrollView` with `contentInsetAdjustmentBehavior="automatic"` and `RefreshControl`) is its first view, so the native header's scroll-edge blur works. The design's "Semana 17 – 23 set" subtitle is not in the header (the week bar carries the week). | User's design note; same pattern as "Minhas aulas" (commit `a8e75053`). |
| D-06 | The map: a header row (an empty corner, then the 7 days Monday → Sunday of the week, each with `weekdayAbbreviation` in `ds-text-section-label text-ink-2` over its day number in `ds-text-calendar-month-day`, the number in `text-sun` on today's Fortaleza date and `text-ink` otherwise), then one row per distinct start time (`schoolTimeOf(startsAt)`, "HH:mm") of the week's classes, cancelled included, ascending. A 44 pt time column (`ds-text-occupancy-cell text-ink-2`) and 7 equal columns with a 4 pt gap. Cells are 44 pt tall and as wide as the column. | PAINEL-14's grid. On a 375 pt phone 7 columns can't be 44 pt wide, so the 44 px touch-target rule holds on height only (user accepted). |
| D-07 | Overlap: when several classes share a day and a start time, that time gets as many sub-rows as the largest number of classes sharing it on one day; on each day, the k-th of those classes (in the API's order: start, end, id) goes in sub-row k, and the other days' cells of that sub-row are empty slots. The time label shows only on the first sub-row. | Classes of different batches may overlap (`modules/classes.md`); the design would hide all but one (user's choice). |
| D-08 | A cell's look, by `ClassItem`: cancelled (`cancelledAt` set) → `bg-dim`, `border border-line`, "canc." in `ds-text-occupancy-cell text-ink-3` with `line-through`; full (`isClassFull`) → `bg-bad`, `text-on-color`; otherwise by `getOccupancyPercent`: ≥ 90 → `bg-sun`, `text-on-color`; 50–89 → `bg-sun-tint`, `text-ink`; below 50 → `bg-info-tint`, `text-lagoon`; the text is the percent with "%" in `ds-text-occupancy-cell`. A day and sub-row without a class is an empty slot: `border border-dashed border-line`, not pressable and hidden from accessibility. Cells and empty slots use `rounded-occupancy-cell`. | PAINEL-14's scale (`cellCor`). It differs from the card bar's 80% step on purpose: the map has four steps, the bar three. |
| D-09 | New tokens in `packages/design-tokens/src/tokens.ts` (and `tokens.css` regenerated): color `sunTint` — light `rgba(240,116,43,.28)`, dark `rgba(245,138,69,.30)` (the 50–89% cell); type style `occupancyCell` — Barlow Condensed, 15, 700 (the cell percentages, "canc." and the times); radii `occupancyCell` 10 (the map's cells) and `swatch` 3 (the legend's 10 pt swatches). | CLAUDE.md: never inline a raw value; `shadowSun` has the same light value but is a shadow. |
| D-10 | The legend under the map: four 10 pt `rounded-swatch` swatches with their labels — `bg-info-tint` "menos de 50%", `bg-sun-tint` "50–89%", `bg-sun` "90%+", `bg-bad` "Cheia" — in `ds-text-occupancy text-ink-2`. | PAINEL-14's legend. |
| D-11 | Selection: the selected cell has `border-2 border-grape`. When a week's classes load, the selected class is the non-cancelled class with the lowest `seatsTaken / capacity` (ties → the first in the API's order); when every class is cancelled, the first class. Tapping any class cell (cancelled ones too) selects it. Moving to another week resets the selection to that week's default. A refetch keeps the selection while that class is still in the week, otherwise the default. Under the legend, the selected class's `ClassCard` (`showFlags`, `now` from `useNow`) opens `routes.admin.classDetail(id)` when tapped. | PAINEL-14 starts on the least-occupied class (user accepted); `showFlags` as on the admin's Aulas tab. |
| D-12 | Cells are `TouchableOpacity` with `activeOpacity={BUTTON_ACTIVE_OPACITY}`, `accessibilityRole="button"`, `accessibilityState={{ selected }}` and the label `weeklyOccupancy.cell.active` ("{{date}}, {{time}}, {{discipline}}, {{percent}}%") or `weeklyOccupancy.cell.cancelled` ("{{date}}, {{time}}, {{discipline}}, cancelada"), where `date` is the weekday abbreviation and the day number ("SEG 19") and `discipline` is `newClass.discipline.<discipline>`. | Same press pattern as the calendar's day cells (`calendar-week-row`); a cell's colour alone tells nothing to a screen reader. |
| D-13 | States, below the week bar: loading → `OccupancyMapSkeleton` (the header row and 4 rows of skeleton cells, one `accessible` view labelled "Carregando a ocupação"); error with no data → `ErrorState` ("Não foi possível carregar a ocupação" / "Confira sua conexão e tente de novo."), whose retry keeps the error on screen with its spinner; a week with no classes at all → `EmptyState` (`calendar-outline`, "Sem aulas nesta semana" / "As aulas criadas para esta semana aparecem aqui.", no action), with no map, legend or card. A week whose classes are all cancelled shows the map. A failed refetch keeps the map it had; an expired session shows nothing (it is handled centrally). Back on the screen it refetches without restarting a load already running (`cancelRefetch: false`); pull-to-refresh shows the spinner only for the user's pull. | User's design note (loading, error, empty), with the same behaviors as "Minhas aulas". |
| D-14 | The home row is a card of its own in the "Escola" section of `admin.screen.tsx`, after `PeopleEntryRow` and before the school settings card: `Ionicons` `bar-chart-outline` (`theme.lagoon`, 20), "Ocupação semanal" in `ds-text-list-title`, "Lugares ocupados e vagas por aula" in `ds-text-list-subtitle`, a chevron, `accessibilityLabel` the title; it opens `routes.admin.weeklyOccupancy` (`/admin/weekly-occupancy`). | PAINEL-01's "Escola" list puts "Ocupação semanal" there, with the bar-chart icon and that subtitle. |
| D-15 | Copy (`weeklyOccupancy` namespace in `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`): title "Ocupação semanal" / "Ocupación semanal" / "Weekly occupancy"; row subtitle "Lugares ocupados e vagas por aula" / "Plazas ocupadas y libres por clase" / "Seats taken and free per class"; section "Mapa da semana" / "Mapa de la semana" / "Week map"; legend "menos de 50%" / "menos del 50%" / "under 50%", "50–89%", "90%+", "Cheia" / "Llena" / "Full"; cancelled cell "canc." (all three); loading "Carregando a ocupação" / "Cargando la ocupación" / "Loading the occupancy"; load error "Não foi possível carregar a ocupação" / "No se pudo cargar la ocupación" / "Couldn't load the occupancy" with "Confira sua conexão e tente de novo." / "Comprueba tu conexión e inténtalo de nuevo." / "Check your connection and try again."; empty "Sem aulas nesta semana" / "Sin clases esta semana" / "No classes this week" with "As aulas criadas para esta semana aparecem aqui." / "Las clases creadas para esta semana aparecen aquí." / "Classes created for this week show up here."; cell labels as D-12, cancelled word "cancelada" / "cancelada" / "cancelled". | The app is in pt-BR, es-ES and en-US; the design's European Portuguese is rewritten in Brazilian Portuguese. |
| D-16 | Code lives in the classes module: `src/modules/classes/utils/weekly-occupancy.ts` (pure layout, tones and default selection), `components/occupancy-map/`, `components/occupancy-map-skeleton/`, `screens/weekly-occupancy.screen.{tsx,hook.ts,types.ts}`; the route file is `src/app/(private)/admin/weekly-occupancy.tsx`. Components follow `.claude/rules/react.md`. | Occupancy is about classes; the screen is only routed for admins, and access is decided by the flow (`resolveFlow`), never in the screen. |

## Expected Results

### ER-01 — The admin home row opens the screen

- **Front:** mobile
- **Behavior:** Given an approved admin on the home tab, when the screen renders, then the "Escola" section shows the
  "Ocupação semanal" card with "Lugares ocupados e vagas por aula", after "Pessoas" and before "Configurações da
  escola"; when the admin taps it, then the app is on `/admin/weekly-occupancy` with the header title "OCUPAÇÃO
  SEMANAL".
- **Edge and error cases:** the row sends no request of its own and shows no count; the instructor's and the
  student's homes have no such row; the copy exists in es-ES and en-US (D-15).
- **Verify by:** `npx jest src/modules/admin/screens/admin.screen.test.tsx` (from `apps/mobile`) and the user journey
  in the Verification Plan.

### ER-02 — Header, week bar and week navigation

- **Front:** mobile
- **Behavior:** Given now = Wednesday 21 Oct 2026 10:00 Fortaleza, when the screen opens, then it asks for
  `GET /classes?date=2026-10-19`, the header shows the centered title (`headerTitleAlign: "center"`,
  `StackHeaderTitle`), the week bar shows "19 – 25 OUT" between the arrows, and no grape summary card nor any
  "semana anterior" text is on screen; when the admin taps the next arrow, then it asks for
  `GET /classes?date=2026-10-26` and the caption is "26 OUT – 1 NOV"; tapping the previous arrow twice from there
  shows "12 – 18 OUT" (`date=2026-10-12`).
- **Edge and error cases:** a week already loaded comes from the cache without a loading state; the week bar is on
  screen while loading, after an error and on an empty week; the scroll view is the screen's first view
  (`contentInsetAdjustmentBehavior="automatic"`), so on iOS 26+ the content scrolls under the header with the soft
  scroll-edge blur.
- **Verify by:** `npx jest src/modules/classes/screens/weekly-occupancy.screen.test.tsx -t "week"` (from
  `apps/mobile`) and the user journey (the blur when scrolling).

### ER-03 — The map's layout

- **Front:** mobile
- **Behavior:** Given now = Wednesday 21 Oct 2026 10:00 Fortaleza and the week of 19 Oct with A (Mon 08:00–09:00,
  surf), B (Mon 08:00–09:30, skate), C (Wed 08:00–09:00), D (Fri 16:00–17:00) and E (Sat 16:00–17:00, cancelled),
  when the map renders, then the header row shows SEG 19 … DOM 25 with "21" in `text-sun` and the others in
  `text-ink`, and the rows are "08:00" (two sub-rows: A then B under Monday; C in the first sub-row under Wednesday;
  the label only on the first sub-row) and "16:00" (D under Friday, E under Saturday); every other day and sub-row is
  an empty dashed slot.
- **Edge and error cases:** a week that doesn't contain today has no day in `text-sun`; times are Fortaleza times
  whatever the phone's time zone; a class whose start and end match another's is ordered by id; the empty slots
  aren't pressable and aren't read by a screen reader.
- **Verify by:** `npx jest src/modules/classes/utils/weekly-occupancy.test.ts
  src/modules/classes/components/occupancy-map` (from `apps/mobile`).

### ER-04 — Cell tones and contents

- **Front:** mobile
- **Behavior:** Given classes with (seats taken / capacity) 3/10, 5/10, 89/100, 9/10, 4/4 and a cancelled 2/10, when
  the map renders, then their cells read "30%" (`bg-info-tint`, `text-lagoon`), "50%" (`bg-sun-tint`, `text-ink`),
  "89%" (`bg-sun-tint`), "90%" (`bg-sun`, `text-on-color`), "100%" (`bg-bad`, `text-on-color`) and "canc."
  (`bg-dim`, `text-ink-3`, line-through), and the legend under "Mapa da semana" shows "menos de 50%", "50–89%",
  "90%+" and "Cheia" with their swatches.
- **Edge and error cases:** 0 seats taken reads "0%"; more seats than the capacity reads "100%" in `bg-bad`; 199/200
  (rounds to 100%, not full) is `bg-sun`; each class cell's accessibility label is D-12's ("SEG 19, 08:00, Surf, 30%"
  / "SÁB 24, 16:00, Skate, cancelada" in pt-BR); the `sunTint` token exists in light and dark and `tokens.css` is
  current.
- **Verify by:** `npx jest src/modules/classes/utils/weekly-occupancy.test.ts
  src/modules/classes/components/occupancy-map` (from `apps/mobile`) and
  `npm run check-types -w @rochas-surf-school/design-tokens`.

### ER-05 — Selecting a class and opening it

- **Front:** mobile
- **Behavior:** Given ER-03's week with A 3/10, B 4/4, C 6/10, D 9/10 and E cancelled, when it loads, then A's cell
  has the grape border and A's `ClassCard` is under the legend; when the admin taps C's cell, then C's cell has the
  border, A's doesn't, and C's card replaces A's; when they tap the card, then the app opens
  `routes.admin.classDetail("C")`.
- **Edge and error cases:** two classes with the same lowest ratio → the first in the API's order is selected; a
  week where every class is cancelled selects its first class; tapping E (cancelled) selects it and shows its
  cancelled card; moving to another week and back selects that week's default again; a refetch that still has C
  keeps C, one without C falls back to the default; only one cell is ever selected.
- **Verify by:** `npx jest src/modules/classes/screens/weekly-occupancy.screen.test.tsx -t "select"` and
  `npx jest src/modules/classes/utils/weekly-occupancy.test.ts -t "default"` (from `apps/mobile`).

### ER-06 — Loading, error and empty states

- **Front:** mobile
- **Behavior:** Given the screen, when the week is loading, then the week bar and the skeleton map (one element
  labelled "Carregando a ocupação") are shown; when the request fails, then "Não foi possível carregar a ocupação"
  / "Confira sua conexão e tente de novo." with "Tentar novamente" is shown, and tapping it asks again while the error
  stays with its spinner; when the week has no classes, then "Sem aulas nesta semana" / "As aulas criadas para esta
  semana aparecem aqui." is shown with no map, legend or card.
- **Edge and error cases:** a week whose classes are all cancelled shows the map, not the empty state; a refetch that
  fails after a successful load keeps the map; an expired session (`SessionExpiredError`) shows neither the error
  nor the empty state; coming back to the screen refetches once without restarting a running load; pull-to-refresh
  refetches and shows its spinner only while the pull's request runs; from the error the arrows still move to
  another week; the copy exists in es-ES and en-US (D-15).
- **Verify by:** `npx jest src/modules/classes/screens/weekly-occupancy.screen.test.tsx -t "state"` (from
  `apps/mobile`).

## Tasks

### Mobile (`apps/mobile`)

- [ ] **T-01** — Add the D-09 tokens: color `sunTint` (light and dark), type style `occupancyCell` and radii
  `occupancyCell` and `swatch` in
  `packages/design-tokens/src/tokens.ts`, regenerate `packages/design-tokens/src/tokens.css`
  (`npm run build -w @rochas-surf-school/design-tokens`), and make sure `bg-sun-tint` and `ds-text-occupancy-cell`
  and the two `rounded-*` classes resolve in `apps/mobile` (`tailwind.config.ts` / `src/constants/theme-variables.ts` when they list colors by hand),
  extending the existing theme-variables test when one exists.
  Covers: enabling · Done when: `npm run check-types -w @rochas-surf-school/design-tokens` and
  `npx turbo run check-types --filter=@rochas-surf-school/mobile` pass.

- [ ] **T-02** — Write the pure map logic in `apps/mobile/src/modules/classes/utils/weekly-occupancy.ts`: the 7 days
  of a week (ISO date, weekday abbreviation, day number, is today), the rows by Fortaleza start time with the D-07
  sub-rows and empty slots, the cell tone of D-08 (`cancelled` / `full` / `high` / `mid` / `low`) with its percent,
  and the default selection of D-11, with `weekly-occupancy.test.ts` covering ER-03's layout, every ER-04 threshold
  and edge, and every default-selection case of ER-05.
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-03, ER-04, ER-05 · Done when: `npx jest src/modules/classes/utils/weekly-occupancy.test.ts` passes from
  `apps/mobile`.

- [ ] **T-03** — Build `OccupancyMap` in `apps/mobile/src/modules/classes/components/occupancy-map/` (component,
  hook, types, index, per `.claude/rules/react.md`): the header row, the time column, the cells with the D-08 looks,
  the selected border, the D-12 `TouchableOpacity` and accessibility labels, empty slots, and the D-10 legend with
  the "Mapa da semana" section label; and `OccupancyMapSkeleton` in `components/occupancy-map-skeleton/`. Copy under
  `weeklyOccupancy` (section, legend, "canc.", cell labels, loading) in `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`.
  Tests: `occupancy-map.component.test.tsx` (ER-03's rendering, ER-04's classes and labels, `onSelect` called with
  the tapped class's id, empty slots not pressable) and `occupancy-map-skeleton.component.test.tsx`.
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-03, ER-04 · Done when: `npx jest src/modules/classes/components/occupancy-map
  src/modules/classes/components/occupancy-map-skeleton` passes from `apps/mobile`.

- [ ] **T-04** — Build the screen: `apps/mobile/src/modules/classes/screens/weekly-occupancy.screen.tsx`, `.hook.ts`
  and `.types.ts` (the week state of D-04, `useQuery(weekClassesOptions(weekStart))`, the week bar, the D-05 header
  and first-view `ScrollView`, `OccupancyMap`, the D-11 selection and the selected `ClassCard` opening
  `routes.admin.classDetail`), the route file `src/app/(private)/admin/weekly-occupancy.tsx`,
  `routes.admin.weeklyOccupancy` in `src/constants/routes.ts`, and the title copy, with
  `weekly-occupancy.screen.test.tsx` covering ER-02 ("week" tests) and ER-05 ("select" tests).
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-02, ER-05 · Done when: `npx jest src/modules/classes/screens/weekly-occupancy.screen.test.tsx -t
  "week|select"` passes from `apps/mobile`.

- [ ] **T-05** — Add the D-13 states to the screen: the skeleton while loading, `ErrorState` with the retry that
  keeps the error on screen, `EmptyState` for a week without classes, a failed refetch keeping the map, nothing after
  an expired session, refetch on focus with `cancelRefetch: false`, and pull-to-refresh with its own spinner, plus
  the load-error and empty copy in the three languages, with "state" tests in `weekly-occupancy.screen.test.tsx` for
  every case of ER-06.
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-06 · Done when: `npx jest src/modules/classes/screens/weekly-occupancy.screen.test.tsx` passes from
  `apps/mobile`.

- [ ] **T-06** — Add the D-14 "Ocupação semanal" card to the "Escola" section of
  `apps/mobile/src/modules/admin/screens/admin.screen.tsx` and its row subtitle copy, with tests in
  `admin.screen.test.tsx` for its place, text and that tapping it lands on `/admin/weekly-occupancy` with the title
  (registering the new route in the test's router like the other admin routes).
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-01 · Done when: `npx jest src/modules/admin/screens/admin.screen.test.tsx` passes from `apps/mobile`.

### Verification

- [ ] **T-07** — Run every command in the Verification Plan from the repo root; all pass. Follow the user journey on
  the iOS simulator and record the output summary and what was seen as evidence.
  Covers: all · Done when: every automated command exits 0 and the user journey is recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 061` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 061` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 061` — no e2e suite applies to `apps/mobile` (prints `E2E PASSED`).
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/mobile --filter=@rochas-surf-school/design-tokens`
    — no errors (`check-types` of the tokens also proves `tokens.css` is current).
- User journey (iOS simulator, pt-BR, light and dark), signed in as an approved admin with classes this week and
  next week (the backend seed has sample classes):
  1. On Início → "Escola", "Ocupação semanal" with "Lugares ocupados e vagas por aula" sits between "Pessoas" and
     "Configurações da escola"; tap it.
  2. The header title "OCUPAÇÃO SEMANAL" is centered; there is no grape summary card; the week bar shows the current
     week; today's day number is sun-coloured; the cells show percentages in the four tones and "canc." for a
     cancelled class; the legend is under the map; the least-occupied class is selected and its card shown.
  3. Scroll: the content passes under the header with the soft blur.
  4. Tap another cell → its border and card change; tap the card → the class details open; go back.
  5. Tap › → the next week loads (skeleton first); a week without classes shows "Sem aulas nesta semana"; tap ‹
     back.
  6. Turn off the network and open a week not loaded yet → the error with "Tentar novamente"; turn it back on and
     retry → the map appears. Pull to refresh → the spinner, then the map.
  7. Signed in as an instructor and as a student, the home has no "Ocupação semanal" row.

## Memory Impact

- `memory/product.md` — Current state: admins have the weekly occupancy map (from the home's "Escola" section, week
  by week, four-step colours, the selected class's card). Out of scope: narrow the "admin dashboard with metrics"
  item and spec 057's "rest of the dashboards" item so they no longer include the weekly occupancy screen; add this
  spec's out-of-scope items (the summary card and comparison, filters on the map, swiping weeks, remembering the
  week).
- `memory/technical-context.md` — the mobile classes bullets: `utils/weekly-occupancy.ts`, `OccupancyMap`,
  `OccupancyMapSkeleton`, the screen and its reuse of `weekClassesOptions`; `packages/design-tokens`: `sunTint`, the type style
  `occupancyCell` and the radii `occupancyCell` and `swatch`.
- `memory/structure.md` — the route `src/app/(private)/admin/weekly-occupancy.tsx` and the new files in
  `src/modules/classes/` (utils, components, screen).
- `memory/modules.md` — None.
- `memory/modules/classes.md` — Boundaries: the app's weekly occupancy map reads the week list (no API change); a Spec
  history line for 061.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
