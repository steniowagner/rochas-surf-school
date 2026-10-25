---
id: "061"
slug: weekly-occupancy
title: Weekly occupancy map for admins
status: changes-requested
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
four-step scale. Above the map, a card sums the week up (occupancy, seats taken out of the total, free seats, full
classes). Tapping a cell shows that class's card, which opens its details. The admin moves week by week, with a label
saying how far the week is from this one, so they can see at a glance which classes still have room and which are
full.

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
- The screen: centered header title with the scroll-edge blur, the week bar (‹ relative-week label over the caption
  ›), the week's stats card (occupancy, seats, free seats, full classes), the week map with its legend, the selected
  class's card, and the loading, error and empty states, pull-to-refresh and refetch on focus.
- New tokens: the color `sunTint` (light and dark), the type style `occupancyCell` and the radii `occupancyCell` and
  `swatch`.
- The copy in pt-BR, es-ES and en-US.

### Out of scope

- The grape summary card at the top of PAINEL-14 as designed there (the large grape block, "N de M lugares ocupados"
  and the comparison with the previous week) — replaced by the stats card of D-03 / D-18; no comparison with another
  week is built.
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
| D-03 | The grape summary card of PAINEL-14 is not built; instead, the stats card of D-18 sits between the week bar and "Mapa da semana". No comparison with the previous week is built. | User's design note ("remove this headline at the top about analytics"), then the user's new design for the week's stats (amendment of 2026-10-25). |
| D-04 | The screen opens on the current week (`mondayOf(todayInSchoolZone(now))`). A week bar at the top of the content has the previous and next arrows — 44 pt round buttons, `h-11 w-11 rounded-full bg-surface` with `shadowStyle("iconButton")`, no border and no `hitSlop`, a `chevron-back` / `chevron-forward` icon in `theme.ink`, labelled `weekMonthCalendar.previousWeek` / `nextWeek` — and between them, centered, the relative-week label of D-17 over the `weekCaption` in `ds-text-day-number text-ink`; each arrow moves one week, with no limit into the past or the future. The bar shows in every state. | User's design (the image of 2026-10-25: round white arrows, "ESTA SEMANA" over "17 – 23 SET"); the request takes any week. The bar stays in the error state so the admin can leave a week that fails. |
| D-05 | The header title is centered: `<Stack.Screen options={{ headerTitleAlign: "center", headerTitle: () => <StackHeaderTitle title={…} /> }} />` with "Ocupação semanal", and the screen's scroll view (a `ScrollView` with `contentInsetAdjustmentBehavior="automatic"` and `RefreshControl`) is its first view, so the native header's scroll-edge blur works. The design's "Semana 17 – 23 set" subtitle is not in the header (the week bar carries the week). | User's design note; same pattern as "Minhas aulas" (commit `a8e75053`). |
| D-06 | The map: a header row (an empty corner, then the 7 days Monday → Sunday of the week, each with `weekdayAbbreviation` in `ds-text-section-label text-ink-2` over its day number in `ds-text-calendar-month-day`, the number in `text-sun` on today's Fortaleza date and `text-ink` otherwise), then one row per distinct start time (`schoolTimeOf(startsAt)`, "HH:mm") of the week's classes, cancelled included, ascending. A 44 pt time column (`ds-text-occupancy-cell text-ink-2`) and 7 equal columns with a 4 pt gap. Cells are 44 pt tall and as wide as the column. | PAINEL-14's grid. On a 375 pt phone 7 columns can't be 44 pt wide, so the 44 px touch-target rule holds on height only (user accepted). |
| D-07 | Overlap: when several classes share a day and a start time, that time gets as many sub-rows as the largest number of classes sharing it on one day; on each day, the k-th of those classes (in the API's order: start, end, id) goes in sub-row k, and the other days' cells of that sub-row are empty slots. The time label shows only on the first sub-row. | Classes of different batches may overlap (`modules/classes.md`); the design would hide all but one (user's choice). |
| D-08 | A cell's look, by `ClassItem`: cancelled (`cancelledAt` set) → `bg-dim`, `border border-line`, "canc." in `ds-text-occupancy-cell text-ink-3` with `line-through`; full (`isClassFull`) → `bg-bad`, `text-on-color`; otherwise by `getOccupancyPercent`: ≥ 90 → `bg-sun`, `text-on-color`; 50–89 → `bg-sun-tint`, `text-ink`; below 50 → `bg-info-tint`, `text-lagoon`; the text is the percent with "%" in `ds-text-occupancy-cell`. A day and sub-row without a class is an empty slot: `border border-dashed border-line`, not pressable and hidden from accessibility. Cells and empty slots use `rounded-occupancy-cell`. | PAINEL-14's scale (`cellCor`). It differs from the card bar's 80% step on purpose: the map has four steps, the bar three. |
| D-09 | New tokens in `packages/design-tokens/src/tokens.ts` (and `tokens.css` regenerated): color `sunTint` — light `rgba(240,116,43,.28)`, dark `rgba(245,138,69,.30)` (the 50–89% cell); type style `occupancyCell` — Barlow Condensed, 15, 700 (the cell percentages, "canc." and the times); radii `occupancyCell` 10 (the map's cells) and `swatch` 3 (the legend's 10 pt swatches). | CLAUDE.md: never inline a raw value; `shadowSun` has the same light value but is a shadow. |
| D-10 | The legend under the map: four 10 pt `rounded-swatch` swatches with their labels — `bg-info-tint` "menos de 50%", `bg-sun-tint` "50–89%", `bg-sun` "90%+", `bg-bad` "Cheia" — in `ds-text-occupancy text-ink-2`. | PAINEL-14's legend. |
| D-11 | Selection: the selected cell has `border-2 border-grape`. When a week's classes load, the selected class is the non-cancelled class with the lowest `seatsTaken / capacity` (ties → the first in the API's order); when every class is cancelled, the first class. Tapping any class cell (cancelled ones too) selects it. Moving to another week resets the selection to that week's default. A refetch keeps the selection while that class is still in the week, otherwise the default. Under the legend, the selected class's `ClassCard` (`showFlags`, `now` from `useNow`) opens `routes.admin.classDetail(id)` when tapped. | PAINEL-14 starts on the least-occupied class (user accepted); `showFlags` as on the admin's Aulas tab. |
| D-12 | Cells are `TouchableOpacity` with `activeOpacity={BUTTON_ACTIVE_OPACITY}`, `accessibilityRole="button"`, `accessibilityState={{ selected }}` and the label `weeklyOccupancy.cell.active` ("{{date}}, {{time}}, {{discipline}}, {{percent}}%") or `weeklyOccupancy.cell.cancelled` ("{{date}}, {{time}}, {{discipline}}, cancelada"), where `date` is the weekday abbreviation and the day number ("SEG 19") and `discipline` is `newClass.discipline.<discipline>`. | Same press pattern as the calendar's day cells (`calendar-week-row`); a cell's colour alone tells nothing to a screen reader. |
| D-13 | States, below the week bar: loading → `OccupancyMapSkeleton` (a skeleton of the stats card, then the header row and 4 rows of skeleton cells, all in one `accessible` view labelled "Carregando a ocupação"); error with no data → `ErrorState` ("Não foi possível carregar a ocupação" / "Confira sua conexão e tente de novo."), whose retry keeps the error on screen with its spinner; a week with no classes at all → `EmptyState` (`calendar-outline`, "Sem aulas nesta semana" / "As aulas criadas para esta semana aparecem aqui.", no action), with no stats card, map, legend or class card. The stats card shows only with the map. A week whose classes are all cancelled shows the map. A failed refetch keeps the map it had; an expired session shows nothing (it is handled centrally). Back on the screen it refetches without restarting a load already running (`cancelRefetch: false`); pull-to-refresh shows the spinner only for the user's pull. | User's design note (loading, error, empty), with the same behaviors as "Minhas aulas". |
| D-14 | The home row is a card of its own in the "Escola" section of `admin.screen.tsx`, after `PeopleEntryRow` and before the school settings card: `Ionicons` `bar-chart-outline` (`theme.lagoon`, 20), "Ocupação semanal" in `ds-text-list-title`, "Lugares ocupados e vagas por aula" in `ds-text-list-subtitle`, a chevron, `accessibilityLabel` the title; it opens `routes.admin.weeklyOccupancy` (`/admin/weekly-occupancy`). | PAINEL-01's "Escola" list puts "Ocupação semanal" there, with the bar-chart icon and that subtitle. |
| D-15 | Copy (`weeklyOccupancy` namespace in `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`): title "Ocupação semanal" / "Ocupación semanal" / "Weekly occupancy"; row subtitle "Lugares ocupados e vagas por aula" / "Plazas ocupadas y libres por clase" / "Seats taken and free per class"; section "Mapa da semana" / "Mapa de la semana" / "Week map"; legend "menos de 50%" / "menos del 50%" / "under 50%", "50–89%", "90%+", "Cheia" / "Llena" / "Full"; cancelled cell "canc." (all three); loading "Carregando a ocupação" / "Cargando la ocupación" / "Loading the occupancy"; load error "Não foi possível carregar a ocupação" / "No se pudo cargar la ocupación" / "Couldn't load the occupancy" with "Confira sua conexão e tente de novo." / "Comprueba tu conexión e inténtalo de nuevo." / "Check your connection and try again."; empty "Sem aulas nesta semana" / "Sin clases esta semana" / "No classes this week" with "As aulas criadas para esta semana aparecem aqui." / "Las clases creadas para esta semana aparecen aquí." / "Classes created for this week show up here."; cell labels as D-12, cancelled word "cancelada" / "cancelada" / "cancelled"; relative week (D-17) "Esta semana" / "Esta semana" / "This week", "Próxima semana" / "Próxima semana" / "Next week", "Daqui a {{count}} semanas" / "Dentro de {{count}} semanas" / "In {{count}} weeks", "Semana passada" / "Semana pasada" / "Last week", "Há {{count}} semanas" / "Hace {{count}} semanas" / "{{count}} weeks ago"; stat labels (D-18) "Ocupação" / "Ocupación" / "Occupancy", "Lugares" / "Plazas" / "Seats", "Livres" / "Libres" / "Free", "Cheias" / "Llenas" / "Full", and their accessibility labels "{{percent}}%, Ocupação" / "{{percent}}%, Ocupación" / "{{percent}}%, Occupancy", "{{taken}} de {{total}} lugares" / "{{taken}} de {{total}} plazas" / "{{taken}} of {{total}} seats", "{{count}} livre(s)" / "{{count}} libre(s)" / "{{count}} free", "{{count}} cheia(s)" / "{{count}} llena(s)" / "{{count}} full" (singular and plural through i18next's `count`). | The app is in pt-BR, es-ES and en-US; the design's European Portuguese is rewritten in Brazilian Portuguese; the es-ES and en-US copy of the amendment was accepted by the user. |
| D-16 | Code lives in the classes module: `src/modules/classes/utils/weekly-occupancy.ts` (pure layout, tones, default selection, relative week and stats), `components/occupancy-map/`, `components/occupancy-map-skeleton/`, `components/occupancy-stats/`, `screens/weekly-occupancy.screen.{tsx,hook.ts,types.ts}`; the route file is `src/app/(private)/admin/weekly-occupancy.tsx`. Components follow `.claude/rules/react.md`. | Occupancy is about classes; the screen is only routed for admins, and access is decided by the flow (`resolveFlow`), never in the screen. |
| D-17 | The relative-week label above the caption: n = whole weeks from the current Fortaleza week (`mondayOf(todayInSchoolZone(now))`) to the week on screen. n = 0 → "Esta semana" in `text-sun`; n = 1 → "Próxima semana"; n ≥ 2 → "Daqui a {{count}} semanas" (count = n); n = −1 → "Semana passada"; n ≤ −2 → "Há {{count}} semanas" (count = −n). Every label but "Esta semana" is `text-ink-2`; all are `ds-text-section-label` (uppercase on screen). It updates with each arrow and shows in every state, like the bar. | User's design and copy (2026-10-25); orange only marks "you are here" (user accepted grey for the other weeks). |
| D-18 | The stats card, between the week bar and "Mapa da semana": computed on the phone from the week's classes, counting only non-cancelled ones, each with its seats taken capped at its capacity (`min(seatsTaken, capacity)`). Four stats side by side, separated by vertical `border-line` dividers, in a `rounded-card border border-line bg-surface` card: OCUPAÇÃO = round(taken ÷ total × 100) with "%" (0 when total is 0), in `text-grape`; LUGARES = "{taken}/{total}" in `text-ink`; LIVRES = total − taken in `text-lagoon`; CHEIAS = the number of classes with `isClassFull` in `text-bad`. Numbers in `ds-text-day-number`, labels under them in `ds-text-chip text-ink-2`. Each stat is one `accessible` element labelled as D-15 ("64%, Ocupação", "28 de 44 lugares", "16 livres", "1 cheia"). A week whose classes are all cancelled shows "0%", "0/0", "0", "0". | User's design (the image of 2026-10-25) and PAINEL-14's figures (`ativas`, `lugares`, `cheios`, `nCheias`); capping keeps LUGARES and LIVRES adding up and free seats never negative, like `getFreeSeats` (user accepted). |

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
  `StackHeaderTitle`), the week bar shows "ESTA SEMANA" (`text-sun`) over "19 – 25 OUT" between the arrows, and no
  grape summary card nor any "semana anterior" text is on screen; when the admin taps the next arrow, then it asks
  for `GET /classes?date=2026-10-26`, the caption is "26 OUT – 1 NOV" and the label "PRÓXIMA SEMANA"; tapping the
  previous arrow twice from there shows "12 – 18 OUT" (`date=2026-10-12`) with "SEMANA PASSADA".
- **Edge and error cases:** two weeks ahead the label is "DAQUI A 2 SEMANAS" and three "DAQUI A 3 SEMANAS"; two weeks
  back "HÁ 2 SEMANAS"; only the current week's label is `text-sun`, the others `text-ink-2`; the labels exist in
  es-ES and en-US (D-15); each arrow is a 44 pt touch target labelled "Ver a semana anterior" / "Ver a semana
  seguinte" (`weekMonthCalendar.previousWeek` / `nextWeek`); a week already loaded comes from the cache
  without a loading state; the week bar is on
  screen while loading, after an error and on an empty week; the scroll view is the screen's first view
  (`contentInsetAdjustmentBehavior="automatic"`), so on iOS 26+ the content scrolls under the header with the soft
  scroll-edge blur.
- **Verify by:** `npx jest src/modules/classes/screens/weekly-occupancy.screen.test.tsx -t "week"`,
  `npx jest src/modules/classes/components/occupancy-week-bar` and
  `npx jest src/modules/classes/utils/weekly-occupancy.test.ts -t "relative week"` (from `apps/mobile`), and the
  user journey (the blur when scrolling).

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

### ER-07 — The week's stats card

- **Front:** mobile
- **Behavior:** Given ER-05's week (A 3/10, B 4/4, C 6/10, D 9/10 and E cancelled 2/10), when it loads, then
  between the week bar and "Mapa da semana" a card shows "65%" over "OCUPAÇÃO" (`text-grape`), "22/34" over
  "LUGARES" (`text-ink`), "12" over "LIVRES" (`text-lagoon`) and "1" over "CHEIAS" (`text-bad`); when the admin moves
  to another week, then the card shows that week's figures.
- **Edge and error cases:** a cancelled class counts nowhere; an overbooked class (12/10) counts as 10/10, so LIVRES
  is never negative and LUGARES and LIVRES add up to the total; a week whose classes are all cancelled shows "0%",
  "0/0", "0", "0"; while the week loads the skeleton includes the card (still one element labelled "Carregando a
  ocupação"); the error and the empty states show no card; each stat is read by a screen reader as one element
  ("65%, Ocupação", "22 de 34 lugares", "12 livres", "1 cheia"); the labels exist in es-ES and en-US (D-15).
- **Verify by:** `npx jest src/modules/classes/utils/weekly-occupancy.test.ts -t "stats"`,
  `npx jest src/modules/classes/components/occupancy-stats` and
  `npx jest src/modules/classes/screens/weekly-occupancy.screen.test.tsx -t "stats"` (from `apps/mobile`).

## Tasks

### Mobile (`apps/mobile`)

- [x] **T-01** — Add the D-09 tokens: color `sunTint` (light and dark), type style `occupancyCell` and radii
  `occupancyCell` and `swatch` in
  `packages/design-tokens/src/tokens.ts`, regenerate `packages/design-tokens/src/tokens.css`
  (`npm run build -w @rochas-surf-school/design-tokens`), and make sure `bg-sun-tint` and `ds-text-occupancy-cell`
  and the two `rounded-*` classes resolve in `apps/mobile` (`tailwind.config.ts` / `src/constants/theme-variables.ts` when they list colors by hand),
  extending the existing theme-variables test when one exists.
  Covers: enabling · Done when: `npm run check-types -w @rochas-surf-school/design-tokens` and
  `npx turbo run check-types --filter=@rochas-surf-school/mobile` pass.
  > ✅ 2026-10-25 — added `sunTint` (light/dark), type style `occupancyCell` and radii `occupancyCell`, `swatch`; regenerated
  > tokens.css; mapped the two radii in the mobile Tailwind theme (colors and type styles resolve automatically);
  > files: `packages/design-tokens/src/tokens.ts`, `packages/design-tokens/src/tokens.css`,
  > `apps/mobile/tailwind.config.ts`; verified: `npm run check-types -w @rochas-surf-school/design-tokens` and
  > `npx turbo run check-types --filter=@rochas-surf-school/mobile` pass, `npx jest src/constants` (3 passed);
  > deviations: none

- [x] **T-02** — Write the pure map logic in `apps/mobile/src/modules/classes/utils/weekly-occupancy.ts`: the 7 days
  of a week (ISO date, weekday abbreviation, day number, is today), the rows by Fortaleza start time with the D-07
  sub-rows and empty slots, the cell tone of D-08 (`cancelled` / `full` / `high` / `mid` / `low`) with its percent,
  and the default selection of D-11, with `weekly-occupancy.test.ts` covering ER-03's layout, every ER-04 threshold
  and edge, and every default-selection case of ER-05.
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-03, ER-04, ER-05 · Done when: `npx jest src/modules/classes/utils/weekly-occupancy.test.ts` passes from
  `apps/mobile`.
  > ✅ 2026-10-25 — pure map logic: `buildOccupancyDays`, `buildOccupancyRows` (D-07 sub-rows and empty slots),
  > `getOccupancyCellLook` (D-08 tones) and `getDefaultSelectedClassId` (D-11); files:
  > `apps/mobile/src/modules/classes/utils/weekly-occupancy.ts`,
  > `apps/mobile/src/modules/classes/utils/weekly-occupancy.test.ts`; verified:
  > `npx jest src/modules/classes/utils/weekly-occupancy.test.ts` (22 passed, 100% coverage of the file);
  > deviations: none

- [x] **T-03** — Build `OccupancyMap` in `apps/mobile/src/modules/classes/components/occupancy-map/` (component,
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
  > ✅ 2026-10-25 — `OccupancyMap` (header row, time column, sub-rows, empty dashed slots, section label) with its
  > children `OccupancyCell` (D-08 looks, D-12 `TouchableOpacity` + labels, grape selected border; the look sits on an
  > inner `View` because a touchable exposes no `className`) and `OccupancyLegend` (D-10), plus
  > `OccupancyMapSkeleton`; `weeklyOccupancy` copy (section, legend, "canc.", cell labels, loading) in the three
  > languages; files: `apps/mobile/src/modules/classes/components/occupancy-map/*`,
  > `apps/mobile/src/modules/classes/components/occupancy-cell/*`,
  > `apps/mobile/src/modules/classes/components/occupancy-legend/*`,
  > `apps/mobile/src/modules/classes/components/occupancy-map-skeleton/*`,
  > `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts`; verified:
  > `npx jest src/modules/classes/components/occupancy-map src/modules/classes/components/occupancy-map-skeleton`
  > passes (the occupancy-* components: 16 tests, 100% coverage), `tsc --noEmit` and eslint clean;
  > deviations: two extra child components (`OccupancyCell`, `OccupancyLegend`) because react.md forbids inline ones

- [x] **T-04** — Build the screen: `apps/mobile/src/modules/classes/screens/weekly-occupancy.screen.tsx`, `.hook.ts`
  and `.types.ts` (the week state of D-04, `useQuery(weekClassesOptions(weekStart))`, the week bar, the D-05 header
  and first-view `ScrollView`, `OccupancyMap`, the D-11 selection and the selected `ClassCard` opening
  `routes.admin.classDetail`), the route file `src/app/(private)/admin/weekly-occupancy.tsx`,
  `routes.admin.weeklyOccupancy` in `src/constants/routes.ts`, and the title copy, with
  `weekly-occupancy.screen.test.tsx` covering ER-02 ("week" tests) and ER-05 ("select" tests).
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-02, ER-05 · Done when: `npx jest src/modules/classes/screens/weekly-occupancy.screen.test.tsx -t
  "week|select"` passes from `apps/mobile`.
  > ✅ 2026-10-25 — `WeeklyOccupancyScreen` (hook, types): week state opening on the current Fortaleza week,
  > `useQuery(weekClassesOptions(weekStart))`, centered `StackHeaderTitle` header, first-view `ScrollView`
  > (`contentInsetAdjustmentBehavior="automatic"`), the week bar, `OccupancyMap`, D-11 selection (reset on a week
  > change, kept by a refetch while the class is still there) and the selected `ClassCard` (`showFlags`) opening
  > `routes.admin.classDetail`; the week bar is the extra `OccupancyWeekBar` component (react.md forbids inline
  > ones); route file and `routes.admin.weeklyOccupancy`; `weeklyOccupancy.title` in the three languages; files:
  > `apps/mobile/src/modules/classes/screens/weekly-occupancy.screen.{tsx,hook.ts,types.ts,test.tsx}`,
  > `apps/mobile/src/modules/classes/components/occupancy-week-bar/*`,
  > `apps/mobile/src/app/(private)/admin/weekly-occupancy.tsx`, `apps/mobile/src/constants/routes.ts`,
  > `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts`; verified:
  > `npx jest src/modules/classes/screens/weekly-occupancy.screen.test.tsx -t "week|select"` (11 passed), `tsc
  > --noEmit` and eslint clean; deviations: none

- [x] **T-05** — Add the D-13 states to the screen: the skeleton while loading, `ErrorState` with the retry that
  keeps the error on screen, `EmptyState` for a week without classes, a failed refetch keeping the map, nothing after
  an expired session, refetch on focus with `cancelRefetch: false`, and pull-to-refresh with its own spinner, plus
  the load-error and empty copy in the three languages, with "state" tests in `weekly-occupancy.screen.test.tsx` for
  every case of ER-06.
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-06 · Done when: `npx jest src/modules/classes/screens/weekly-occupancy.screen.test.tsx` passes from
  `apps/mobile`.
  > ✅ 2026-10-25 — D-13 states on the screen: `OccupancyMapSkeleton` while loading, `ErrorState` whose retry keeps
  > the error on screen with its spinner, `EmptyState` for a week without classes (all-cancelled weeks still show the
  > map), a failed refetch keeping the map, nothing after an expired session, refetch on focus with
  > `cancelRefetch: false` and pull-to-refresh with its own spinner; `loadError` and `empty` copy in the three
  > languages; files: `apps/mobile/src/modules/classes/screens/weekly-occupancy.screen.{tsx,hook.ts,types.ts,test.tsx}`,
  > `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts`; verified:
  > `npx jest src/modules/classes/screens/weekly-occupancy.screen.test.tsx` (25 passed, 100% coverage of the screen
  > and its hook), `tsc --noEmit` and eslint clean; deviations: none

- [x] **T-06** — Add the D-14 "Ocupação semanal" card to the "Escola" section of
  `apps/mobile/src/modules/admin/screens/admin.screen.tsx` and its row subtitle copy, with tests in
  `admin.screen.test.tsx` for its place, text and that tapping it lands on `/admin/weekly-occupancy` with the title
  (registering the new route in the test's router like the other admin routes).
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-01 · Done when: `npx jest src/modules/admin/screens/admin.screen.test.tsx` passes from `apps/mobile`.
  > ✅ 2026-10-25 — "Ocupação semanal" card in the "Escola" section of the admin home, after "Pessoas" and before the
  > school settings card (bar-chart icon, title, subtitle, chevron, opens `routes.admin.weeklyOccupancy`); subtitle copy
  > `weeklyOccupancy.rowSubtitle` in the three languages; the test registers the new route and checks the card's place,
  > text, that it sends no request and that tapping it lands on `/admin/weekly-occupancy` with the title; files:
  > `apps/mobile/src/modules/admin/screens/admin.screen.tsx`, `apps/mobile/src/modules/admin/screens/admin.screen.test.tsx`,
  > `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts`; verified:
  > `npx jest src/modules/admin/screens/admin.screen.test.tsx` (23 passed), `tsc --noEmit` and eslint clean;
  > deviations: none

- [x] **T-08** — Add the pure logic of the amendment to `apps/mobile/src/modules/classes/utils/weekly-occupancy.ts`:
  the relative week of D-17 (the signed number of weeks from the current week's Monday to the week on screen, and the
  label key and count it maps to) and the week's stats of D-18 (percent, taken, total, free, full classes, over the
  non-cancelled classes with seats taken capped at capacity), with tests in `weekly-occupancy.test.ts` under
  `describe("relative week")` (0, ±1, ±2, ±3, across a month and a year) and `describe("stats")` (ER-07's week, an
  overbooked class, cancelled classes ignored, all cancelled, no classes).
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-02, ER-07 · Done when: `npx jest src/modules/classes/utils/weekly-occupancy.test.ts` passes from
  `apps/mobile` with every line of the file covered.
  > ✅ 2026-10-25 — added `getRelativeWeek(currentWeekStart, weekStart)` (key `current|next|previous|ahead|ago`, count,
  > isCurrent) and `getOccupancyStats(classes)` (percent, taken, total, free, fullClasses); files:
  > `apps/mobile/src/modules/classes/utils/weekly-occupancy.ts`,
  > `apps/mobile/src/modules/classes/utils/weekly-occupancy.test.ts`; verified:
  > `npx jest src/modules/classes/utils/weekly-occupancy.test.ts` (33 passed, 100% coverage of the file);
  > deviations: none

- [x] **T-09** — Redesign `OccupancyWeekBar` (`apps/mobile/src/modules/classes/components/occupancy-week-bar/`) to
  D-04 and D-17: the 44 pt round `bg-surface` arrows with `shadowStyle("iconButton")` and no border or `hitSlop`, and
  the relative-week label (`ds-text-section-label`, `text-sun` only for this week) over the caption in
  `ds-text-day-number text-ink`; the screen hook passes the label to it; the relative-week copy in
  `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`. Tests: a new `occupancy-week-bar.component.test.tsx` (every label key,
  the colours, the arrows' labels and presses) and the screen's `describe("week")` tests updated for ER-02 (the label
  after each arrow).
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-02 · Done when: `npx jest src/modules/classes/components/occupancy-week-bar` and
  `npx jest src/modules/classes/screens/weekly-occupancy.screen.test.tsx -t "week"` pass from `apps/mobile`.
  > ✅ 2026-10-25 — `OccupancyWeekBar` redesigned: 44 pt round `bg-surface` arrows with `shadowStyle("iconButton")` (on an
  > inner view carrying the look, since a touchable exposes no `className`), no border or `hitSlop`, and the
  > relative-week label (`ds-text-section-label`, `text-sun` only for this week) over the caption in
  > `ds-text-day-number text-ink`; the screen hook computes the label with `getRelativeWeek`; `weeklyOccupancy.relativeWeek`
  > copy in the three languages; files: `apps/mobile/src/modules/classes/components/occupancy-week-bar/*`,
  > `apps/mobile/src/modules/classes/screens/weekly-occupancy.screen.{tsx,hook.ts,types.ts,test.tsx}`,
  > `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts`; verified:
  > `npx jest src/modules/classes/components/occupancy-week-bar` and the screen test (29 passed, 100% coverage of the
  > changed files), `tsc --noEmit` and eslint clean; deviations: none

- [x] **T-10** — Build `OccupancyStats` in `apps/mobile/src/modules/classes/components/occupancy-stats/` (component,
  types, index, per `.claude/rules/react.md`): the D-18 card with its four stats, dividers, colours, type styles and
  per-stat accessibility labels; the stat labels and their accessibility copy in
  `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`. Tests: `occupancy-stats.component.test.tsx` (ER-07's figures, the
  colour of each number, the all-zero card, each stat's accessibility label with singular and plural, one language
  other than en-US).
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-07 · Done when: `npx jest src/modules/classes/components/occupancy-stats` passes from `apps/mobile`.
  > ✅ 2026-10-25 — `OccupancyStats` (the D-18 card: grape, ink, lagoon and bad figures in `ds-text-day-number`, labels in
  > `ds-text-chip text-ink-2`, `border-line` dividers) with its child `OccupancyStat` (one `accessible` element with its
  > label; react.md forbids inline components); `weeklyOccupancy.stats` copy and accessibility labels (singular and plural)
  > in the three languages; files: `apps/mobile/src/modules/classes/components/occupancy-stats/*`,
  > `apps/mobile/src/modules/classes/components/occupancy-stat/*`, `apps/mobile/src/i18n/messages/{en-US,es-ES,pt-BR}.ts`;
  > verified: `npx jest src/modules/classes/components/occupancy-stats` (6 passed, 100% coverage of both components),
  > `tsc --noEmit` and eslint clean; deviations: one extra child component (`OccupancyStat`)

- [x] **T-11** — Put the stats card on the screen: `weekly-occupancy.screen.{tsx,hook.ts,types.ts}` render
  `OccupancyStats` between the week bar and the map with the week's stats, and `OccupancyMapSkeleton` gains the card's
  skeleton inside its single labelled element (D-13); no card on the error and empty states. Tests: a
  `describe("stats")` block in `weekly-occupancy.screen.test.tsx` (ER-07's figures, another week's figures after an
  arrow, no card on error and empty, the skeleton while loading) and the skeleton's test updated.
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-07 · Done when: `npx jest src/modules/classes/screens/weekly-occupancy.screen.test.tsx
  src/modules/classes/components/occupancy-map-skeleton` passes from `apps/mobile`.
  > ✅ 2026-10-25 — the screen hook returns `stats` (`getOccupancyStats`) and the screen renders `OccupancyStats` between
  > the week bar and the map; `OccupancyMapSkeleton` gains the card's skeleton inside its single labelled element; no
  > card on the error and empty states; files: `apps/mobile/src/modules/classes/screens/weekly-occupancy.screen.{tsx,hook.ts,types.ts,test.tsx}`,
  > `apps/mobile/src/modules/classes/components/occupancy-map-skeleton/*`; verified:
  > `npx jest src/modules/classes/screens/weekly-occupancy.screen.test.tsx src/modules/classes/components/occupancy-map-skeleton`
  > (32 passed, 100% coverage of the changed files), `tsc --noEmit` and eslint clean; deviations: none

### Verification

- [x] **T-07** — Run every command in the Verification Plan from the repo root; all pass. Follow the user journey on
  the iOS simulator and record the output summary and what was seen as evidence.
  Covers: all · Done when: every automated command exits 0 and the user journey is recorded.
  > ✅ 2026-10-25 — every automated command passed: `node .specs/scripts/run-related-tests.mjs 061` (RELATED TESTS PASSED:
  > mobile jest, web vitest), `node .specs/scripts/check-coverage.mjs 061` (COVERAGE OK, 16 files),
  > `node .specs/scripts/run-e2e.mjs 061` (E2E PASSED), `npx turbo run lint check-types build
  > --filter=@rochas-surf-school/mobile --filter=@rochas-surf-school/design-tokens` (12 tasks successful). User journey on the
  > iOS simulator (iPhone 18 Pro, dark, en-US, the dev admin, Metro restarted with `--clear`): the home row opens "WEEKLY
  > OCCUPANCY" (centered title); no summary card; the week bar "19 – 25 OCT" with today's number (25) in sun; rounded cells
  > with 0–13% (low tone), 100% (full) and a struck-through "canc." cell; the 50–89% swatch and the legend show; the
  > least-occupied class (14:00) starts selected with its card; scrolling passes the map under the header with the soft blur;
  > tapping the 13% cell moved the grape border and the card; tapping the card opened that class's details (Wednesday 21 Oct
  > 12:00) and back returned with the selection kept; pull to refresh showed the spinner; › loaded 26 OCT – 1 NOV (skeleton
  > first, selection back to that week's default, 11:00 0%), and two more › reached 9 – 15 NOV, whose skeleton gave way to
  > "No classes this week". NOT driven: the error with "Tentar novamente" (the network and the user's backend were left on;
  > covered by the "state" Jest tests), light mode, pt-BR, a 50–89% / 90%+ cell in real data (seed has none; covered by Jest),
  > and the instructor's and student's homes (covered by `resolveFlow`, no row added to them). Noticed: the admin home is a
  > fixed (non-scrolling) view, so with this row the last cards sit under the floating tab bar on this device (not in this
  > spec's scope). deviations: the journey was driven by deep link and taps on the simulator, not by a human.

- [x] **T-12** — After T-08–T-11, run every command in the Verification
  Plan again from the repo root; all pass. Follow the user journey on the iOS simulator, including the relative-week
  label and the stats card, and record the output summary and what was seen as evidence.
  Covers: all · Done when: every automated command exits 0 and the user journey is recorded.
  > ✅ 2026-10-25 — every automated command passed: `node .specs/scripts/run-related-tests.mjs 061` (RELATED TESTS PASSED),
  > `node .specs/scripts/check-coverage.mjs 061` (COVERAGE OK, 18 files), `node .specs/scripts/run-e2e.mjs 061` (E2E PASSED),
  > `npx turbo run lint check-types build --filter=@rochas-surf-school/mobile --filter=@rochas-surf-school/design-tokens`
  > (12 tasks successful). User journey on the iOS simulator (iPhone 18 Pro, dark, en-US, the dev admin): the week bar shows
  > 44 pt round arrows without border over the label and caption; "3 WEEKS AGO" (28 SEP – 4 OCT) with no stats card (empty
  > week); "LAST WEEK" (12 – 18 OCT) with the card 0% / 0/48 / 48 / 0 in grape, ink, lagoon and red; "THIS WEEK" in orange
  > (19 – 25 OCT) with 5% / 4/78 / 74 / 2 and today's number in sun; "NEXT WEEK" in grey (26 OCT – 1 NOV) with 15% / 7/48 / 41 / 1;
  > the card sits between the bar and "WEEK MAP". NOT driven: pt-BR and light mode (covered by Jest), the network-off error
  > (covered by Jest "state" tests), "In 2 weeks" in the simulator (covered by Jest), the instructor and student homes. deviations:
  > driven by taps on the simulator, not by a human.

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
  2. The header title "OCUPAÇÃO SEMANAL" is centered; there is no grape summary card; the week bar shows "ESTA
     SEMANA" in orange over the current week, between two round 44 pt arrows; the stats card under it shows the
     week's occupancy, seats, free seats and full classes in grape, ink, lagoon and red; today's day number is
     sun-coloured; the cells show percentages in the four tones and "canc." for a
     cancelled class; the legend is under the map; the least-occupied class is selected and its card shown.
  3. Scroll: the content passes under the header with the soft blur.
  4. Tap another cell → its border and card change; tap the card → the class details open; go back.
  5. Tap › → the next week loads (skeleton first, the card's included), the label reads "PRÓXIMA SEMANA" in grey and
     the stats change; tap › again → "DAQUI A 2 SEMANAS"; a week without classes shows "Sem aulas nesta semana" with
     no stats card; tap ‹ back past this week → "SEMANA PASSADA", then "HÁ 2 SEMANAS".
  6. Turn off the network and open a week not loaded yet → the error with "Tentar novamente"; turn it back on and
     retry → the map appears. Pull to refresh → the spinner, then the map.
  7. Signed in as an instructor and as a student, the home has no "Ocupação semanal" row.

## Memory Impact

- `memory/product.md` — Current state: admins have the weekly occupancy map (from the home's "Escola" section, week
  by week with a relative-week label, the week's stats card — occupancy, seats, free seats, full classes, counting
  non-cancelled classes with seats capped at capacity — four-step colours, the selected class's card). Out of
  scope: narrow the "admin dashboard with metrics" item and spec 057's "rest of the dashboards" item so they no
  longer include the weekly occupancy screen; add this spec's out-of-scope items (the grape summary card and the
  comparison with another week, filters on the map, swiping weeks, remembering the week).
- `memory/technical-context.md` — the mobile classes bullets: `utils/weekly-occupancy.ts` (layout, tones, default
  selection, relative week, stats), `OccupancyMap` and its children `OccupancyCell` and `OccupancyLegend`,
  `OccupancyMapSkeleton`, `OccupancyWeekBar`, `OccupancyStats`, the screen and its reuse of `weekClassesOptions`; `packages/design-tokens`: `sunTint`, the type style
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

- 2026-10-25 — /spec-plan --amend — D-03 changed: "the grape summary card of PAINEL-14 is not built at all; the
  screen starts with the week bar, then 'Mapa da semana'" → "the grape card is not built; the stats card of D-18 sits
  between the week bar and 'Mapa da semana'; no comparison with the previous week". Reason: the user's new design for
  the week's stats. Approved by the user.
- 2026-10-25 — /spec-plan --amend — D-04 changed: arrows "the `WeekMonthCalendar` arrow style" (36 pt, bordered,
  `hitSlop`) and caption `ds-text-pill text-ink` → 44 pt round `bg-surface` arrows with `shadowStyle("iconButton")`,
  no border or `hitSlop`, and the D-17 label over the caption in `ds-text-day-number text-ink`. Reason: the user's
  design of the week bar. Approved by the user.
- 2026-10-25 — /spec-plan --amend — D-13 changed: the loading skeleton also covers the stats card, and the error and
  empty states show no stats card. Reason: the stats card shows only with the map. Approved by the user.
- 2026-10-25 — /spec-plan --amend — D-15 changed: adds the relative-week labels and the stat labels with their
  accessibility copy in pt-BR, es-ES and en-US. Reason: the new UI's copy (pt-BR from the user, es-ES and en-US
  accepted by the user). Approved by the user.
- 2026-10-25 — /spec-plan --amend — D-16 changed: adds `components/occupancy-stats/` and the relative week and stats
  to `utils/weekly-occupancy.ts`. Reason: where the new code lives. Approved by the user.
- 2026-10-25 — /spec-plan --amend — D-17 added: the relative-week label ("Esta semana" in `text-sun`, "Próxima
  semana", "Daqui a N semanas", "Semana passada", "Há N semanas", the others in `text-ink-2`). Reason: the user's
  design and copy. Approved by the user.
- 2026-10-25 — /spec-plan --amend — D-18 added: the stats card (non-cancelled classes, seats capped at capacity;
  OCUPAÇÃO, LUGARES, LIVRES, CHEIAS in grape, ink, lagoon and bad). Reason: the user's design. Approved by the user.
- 2026-10-25 — /spec-plan --amend — ER-02 changed: the week bar shows the relative-week label ("ESTA SEMANA",
  "PRÓXIMA SEMANA", "SEMANA PASSADA", "DAQUI A N SEMANAS", "HÁ N SEMANAS") and 44 pt arrows; Verify by adds the week
  bar's component test and the util's "relative week" tests. Reason: D-04 and D-17. Approved by the user.
- 2026-10-25 — /spec-plan --amend — ER-07 added: the week's stats card. Reason: D-18. Approved by the user.
- 2026-10-25 — /spec-plan --amend — T-08, T-09, T-10, T-11 added (Covers: ER-02, ER-07) and T-12 added (the
  Verification task, run again after them). T-04's week bar stays; T-09 redesigns it. Goal, Scope, the Verification
  Plan's user journey and Memory Impact updated to match. Reason: the amendment's work. Approved by the user.
- 2026-10-25 — /spec-plan --amend — Round 1's findings F-01, F-02 and F-03 are not affected by the amendment (they
  were fixed in commits `862fcf76`, `493c66b9` and `74c6aab8`, before it).
- 2026-10-25 — /spec-plan --amend — status changed: `in-review` → `in-progress`, outside the usual transitions, so
  that T-08–T-12 can be built; the round 1 fixes and the amendment are reviewed together after T-12. Reason: the
  amendment arrived while the fixes were being handed to review. Approved by the user.

## Review

### Round 1 — 2026-10-25 — changes-requested

**Checks**

- lint ✅ · type check ✅ · build ✅ (`npx turbo run lint check-types build --filter=@rochas-surf-school/mobile
  --filter=@rochas-surf-school/design-tokens`: 12 tasks; the tokens' `check-types` confirms `tokens.css` is current)
- related tests ✅ apps/mobile 77 suites, 1602 passed · apps/web 5 files, 22 passed (`RELATED TESTS PASSED`)
- coverage of the changed lines ✅ `COVERAGE OK`, 16 files measured; no coverage-ignore comments in the diff
- e2e ✅ `E2E PASSED` (web Playwright 22 passed; backend not affected; no mobile suite)
- user journey on the iOS simulator (iPhone 18 Pro, iOS 27, en-US, dark, the dev admin): home → row → map, selection,
  card → details → back, pull-to-refresh, › / ‹ with the default selection reset, an empty week. Not driven: the
  error state with the network off (the backend was the user's own process; covered by the "state" Jest tests), light
  mode and pt-BR (the app follows its own theme preference and the OS language; copy and tokens covered by Jest and
  the tokens' check-types), the instructor and student homes (unchanged files).

**Expected Results**

- ER-01 ❌ — the row is on the "Escola" section and opens the screen with "WEEKLY OCCUPANCY" (Jest and simulator), but
  see F-01
- ER-02 ✅ — `-t "week"` tests; simulator: centered title, "19 – 25 OCT", › gives "26 OCT – 1 NOV", ‹ back comes from
  the cache, the content scrolls under the header with the scroll-edge blur
- ER-03 ❌ — rows, sub-rows, labels, Fortaleza times and hidden empty slots hold (util and component tests; a two-row
  overlap at Wed 12:00 on the simulator), but see F-02
- ER-04 ✅ — every threshold, edge and label in the util and component tests; `sunTint` in light and dark; the legend
  swatches look right on the simulator (their test gap is F-03)
- ER-05 ✅ — `-t "select"` and `-t "default"` tests; simulator: the least-occupied class starts selected, a tap moves
  the border and the card, the card opens that class's details, back keeps the selection, another week and back
  resets it
- ER-06 ✅ — `-t "state"` tests (loading, error with retry and spinner, empty, all cancelled, failed refetch, expired
  session, focus refetch, pull-to-refresh, arrows from the error, es-ES and pt-BR); simulator: skeleton on a new
  week, "No classes this week" on 2 – 8 Nov with the week bar, pull-to-refresh spinner

**Findings**

- [x] **F-01** (ER-01) — the admin home is a fixed `View` that doesn't scroll, so the new card pushes "School settings"
  ("Configurações da escola") off the screen: on an iPhone 18 Pro (402×874 pt) it can no longer be reached, and the
  new "Weekly occupancy" card itself sits almost entirely under the floating tab bar. Before this spec the settings
  card was the one partly under the tab bar, but you could still tap it. Reproduce: sign in as the dev admin on the
  iPhone 18 Pro simulator, open Home and try to scroll down. Expected: every card in "Escola", including "Ocupação
  semanal" and "Configurações da escola", can be reached and tapped clear of the tab bar (for example, the home
  scrolls with bottom padding for the tab bar), with a test that both cards are still there and work.
  > ✅ 2026-10-25 — the admin home is now a `ScrollView` (`contentInsetAdjustmentBehavior="automatic"`, as the classes week
  > screen does, so iOS adds the floating tab bar and the safe area); the cards keep their order. New test "scrolls the home
  > above the tab bar…" checks the scroll view and that the Weekly occupancy and School settings cards are inside it; files:
  > `apps/mobile/src/modules/admin/screens/admin.screen.tsx`, `apps/mobile/src/modules/admin/screens/admin.screen.test.tsx`;
  > verified: `npx jest src/modules/admin/screens` (passed); deviations: none (not re-driven on the simulator)
- [x] **F-02** (D-06) — the map's 7 columns aren't equal, so cells don't line up from one row to the next. Each empty
  slot is a `flex-1` view with a border, and Yoga adds the border's width to its flex basis, while class cells (a
  borderless `TouchableOpacity` around a bordered inner `View`) don't get that extra width. So each column's width
  depends on how many empty slots its row has. Reproduce: on the simulator, week 19 – 25 Oct: the Saturday cell of
  the 17:00 row is visibly offset from the Saturday cells of the 19:00 and 23:44 rows (about 1 pt). The same happens
  on 26 Oct – 1 Nov (Sunday 08:00). Expected: every row's day columns share the same x and width as the header's
  (D-06 "7 equal columns"). For example, give the empty slot the same outer `flex-1` wrapper with the dashed border
  on an inner view, as the cell does.
  > ✅ 2026-10-25 — the empty slot is now a borderless `flex-1` wrapper with the dashed border on an inner view, like the
  > class cell, so every column has the same flex basis; the test checks the wrapper has no border and the inner view has
  > `border-dashed`; files: `apps/mobile/src/modules/classes/components/occupancy-map/occupancy-map.component.tsx`,
  > `apps/mobile/src/modules/classes/components/occupancy-map/occupancy-map.component.test.tsx`; verified:
  > `npx jest src/modules/classes` (passed); deviations: pixel alignment not re-measured on the simulator
- [x] **F-03** (tests) — ER-04 requires the legend to show its four labels "with their swatches". The test
  `occupancy-map.component.test.tsx` → "shows the section label and the legend" checks only the labels: removing or
  swapping the swatch classes (`bg-info-tint`, `bg-sun-tint`, `bg-sun`, `bg-bad`, `rounded-swatch`) in
  `occupancy-legend.constants.ts` / the component still passes. Expected: the test checks each label's swatch and
  its class.
  > ✅ 2026-10-25 — the legend swatches got a testID; the legend test checks each swatch's fill class and `rounded-swatch`;
  > files: `apps/mobile/src/modules/classes/components/occupancy-legend/occupancy-legend.component.tsx`,
  > `apps/mobile/src/modules/classes/components/occupancy-map/occupancy-map.component.test.tsx`; verified:
  > `npx jest src/modules/classes` (passed); deviations: none

**Notes**

- `## Memory Impact` lists `OccupancyMap` and `OccupancyMapSkeleton` but not the three extra components T-03/T-04
  added (`OccupancyCell`, `OccupancyLegend`, `OccupancyWeekBar`). `spec-finish` should name them in
  `technical-context.md` and `structure.md`.
- ER-04 gives the cell labels in pt-BR ("SEG 19, 08:00, Surf, 30%"). The tests check the same format in en-US, and
  the pt-BR copy uses the same placeholders. A pt-BR assertion would close that gap cheaply.
- `weekly-occupancy.screen.test.tsx` logs a TanStack "not wrapped in act(...)" warning. `my-classes.screen.test.tsx`
  does the same, so it's not a regression.

### Round 2 — 2026-10-25 — changes-requested

**Checks**

- lint ✅ · type check ✅ · build ✅ (`npx turbo run lint check-types build --filter=@rochas-surf-school/mobile
  --filter=@rochas-surf-school/design-tokens`: 12 tasks; the tokens' `check-types` confirms `tokens.css` is current)
- related tests ✅ apps/mobile 79 suites, 1629 passed · apps/web 5 files, 22 passed (`RELATED TESTS PASSED`)
- coverage of the changed lines ✅ `COVERAGE OK`, 18 files measured; no coverage-ignore comments in the diff
- e2e ✅ `E2E PASSED` (web passed; backend not affected; no mobile suite)
- user journey on the iOS simulator (iPhone 18 Pro, en-US, dark, the dev admin, now = Sun 25 Oct 2026): the week bar
  with the round 44 pt arrows; "THIS WEEK" in sun over "19 – 25 OCT" (5% · 4/78 · 74 · 2, "25" in sun); "NEXT WEEK"
  (15% · 7/48 · 41 · 1), "LAST WEEK" (0% · 0/48 · 48 · 0), "2 WEEKS AGO" (0% · 0/8 · 8 · 0), "3 WEEKS AGO" and "IN 2
  WEEKS" empty with no stats card, all in grey; the card sits between the week bar and "WEEK MAP"; the day columns line
  up across rows with empty slots (F-02); the selected class's card opens its details; the admin home scrolls and both
  "Weekly occupancy" and "School settings" clear the tab bar (F-01), but see F-04. Not driven: pt-BR and light mode
  (copy and tokens covered by Jest and the tokens' check-types), the network-off error (covered by the "state" Jest
  tests), the instructor and student homes (unchanged files).

**Expected Results**

- ER-01 ✅ — Jest (`admin.screen.test.tsx`) and simulator: the row sits after "People" and before "School settings",
  opens "WEEKLY OCCUPANCY"; es-ES and en-US copy present (the admin home regression is F-04, outside this ER's
  Given/When/Then)
- ER-02 ✅ — `-t "week"`, the week bar's component test and `-t "relative week"`; simulator: every relative label, sun
  only on this week, arrows move one week, a cached week shows without a skeleton
- ER-03 ✅ — util and component tests; simulator: sub-rows with the time only on the first, equal columns
- ER-04 ✅ — util and component tests (thresholds, 199/200, overbooked, labels, legend swatches now asserted — F-03)
- ER-05 ✅ — `-t "select"` and `-t "default"`; simulator: default selection per week, the card opens the class details
- ER-06 ✅ — `-t "state"` tests; simulator: empty weeks keep the week bar and show no stats card
- ER-07 ✅ — util `-t "stats"` (ER-07's week, overbooked, all cancelled, none), `occupancy-stats` (colours, dividers,
  one element per stat, singular/plural, pt-BR) and the screen's `-t "stats"`; simulator: figures change with the week
  (test gap: F-05)

**Findings**

- [x] **F-04** (convention) — the F-01 fix made the admin home a `ScrollView` with
  `contentInsetAdjustmentBehavior="automatic"` but kept `paddingTop: headerInset + 16`. `useHeaderInset` is documented
  as the top padding "for a screen that doesn't scroll" (`src/navigation/stack-header/header-inset.hook.ts`); with the
  automatic inset iOS adds the top inset again, so the home's content starts about 60 pt lower than before this spec,
  leaving an empty band between the greeting header and "School tools". Reproduce: sign in as the dev admin on the
  iPhone 18 Pro simulator, open Home, scroll to the top: the "School tools" icon starts at ~204 pt, against ~140 pt
  (header height + 16) before. Expected: the same top spacing as before the spec, as `registrations.screen.tsx` does
  in its scroll view (`contentInsetAdjustmentBehavior="automatic"` with a plain `paddingTop`, no `headerInset`), with a
  test of the scroll view's top padding.
  > ✅ 2026-10-25 — the admin home keeps `contentInsetAdjustmentBehavior="automatic"` and its top padding is now a plain 16
  > (no `useHeaderInset`), as `registrations.screen.tsx` does; the F-01 test also asserts `paddingTop: 16`; files:
  > `apps/mobile/src/modules/admin/screens/admin.screen.tsx`, `apps/mobile/src/modules/admin/screens/admin.screen.test.tsx`;
  > verified: `npx jest src/modules/admin/screens` (passed); deviations: not re-driven on the simulator
- [x] **F-05** (tests) — ER-07 says the card sits "between the week bar and 'Mapa da semana'", and the screen test
  "shows the week's figures between the week bar and the map" checks only the figures: moving `<OccupancyStats>` below
  `<OccupancyMap>` (or under the class card) in `weekly-occupancy.screen.tsx` still passes. Expected: the test asserts
  the order (for example, the stats card comes after the week label and before the "Week map" section label in the
  rendered tree).
  > ✅ 2026-10-25 — new test "puts the stats card after the week bar and before the week map" walks the rendered tree and
  > checks the order week label → stats card → "Week map"; it fails (watched) with `<OccupancyStats>` moved below the map;
  > files: `apps/mobile/src/modules/classes/screens/weekly-occupancy.screen.test.tsx`; verified:
  > `npx jest src/modules/classes/screens/weekly-occupancy` (32 passed); deviations: the `OccupancyCell` hook extraction
  > note was left as is (minor, outside the findings)

**Notes**

- Round 1's F-01, F-02 and F-03 are fixed: the home scrolls with both School cards reachable, the columns line up on the
  simulator, and the legend test asserts each swatch's class.
- `## Memory Impact` names `OccupancyStats` but not its child `OccupancyStat` (T-10); `spec-finish` should list it
  with the other children in `technical-context.md` and `structure.md`.
- `OccupancyCell` computes its look and label parameters in the component file; `.claude/rules/react.md` puts such
  calculations in a `*.hook.ts`. Unchanged since round 1 and minor; worth folding into the F-04/F-05 round if cheap.

### Round 3 — 2026-10-25 — changes-requested

**Checks**

- lint ✅ · type check ✅ · build ✅ (`npx turbo run lint check-types build --filter=@rochas-surf-school/mobile
  --filter=@rochas-surf-school/design-tokens`: 12 tasks; the tokens' `check-types` confirms `tokens.css` is current)
- related tests ✅ apps/mobile 79 suites, 1630 passed · apps/web 5 files, 22 passed (`RELATED TESTS PASSED`)
- coverage of the changed lines ✅ `COVERAGE OK`, 18 files measured; no coverage-ignore comments, debug leftovers or
  TODOs in the diff
- e2e ✅ `E2E PASSED` (web Playwright 22 passed; backend not affected; no mobile suite)
- user journey on the iOS simulator (iPhone 18 Pro, iOS 27, en-US, dark, the dev admin, now = Sun 25 Oct 2026): the
  admin home at rest and pulled down (F-04's fix, see F-06); the weekly occupancy screen opened by deep link: "THIS
  WEEK" in sun over "19 – 25 OCT", the stats card (5% · 4/78 · 74 · 2) between the week bar and "WEEK MAP", "25" in
  sun, the default selection on the first 0% class (Mon 14:00); ‹ → "LAST WEEK" (12 – 18 OCT, 0% · 0/48 · 48 · 0) with
  the selection back to that week's default (Fri 12:00), cancelled cells struck through, equal columns. Not driven:
  pt-BR and light mode (copy and tokens covered by Jest and the tokens' check-types), the network-off error (covered
  by the "state" Jest tests), the instructor and student homes (unchanged files).

**Expected Results**

- ER-01 ✅ — `admin.screen.test.tsx`: the card after "People" and before "School settings", no request of its own,
  opens `/admin/weekly-occupancy` with "WEEKLY OCCUPANCY"; es-ES and en-US copy present (the admin home's top
  regression is F-06, outside this ER's Given/When/Then)
- ER-02 ✅ — `-t "week"`, the week bar's component test and `-t "relative week"`; simulator: labels and caption per week,
  sun only on this week
- ER-03 ✅ — util and component tests; simulator: sub-rows with the time only on the first, equal columns
- ER-04 ✅ — util and component tests (every threshold, 199/200, overbooked, labels, legend swatches)
- ER-05 ✅ — `-t "select"` and `-t "default"`; simulator: the default selection per week, reset on a week change
- ER-06 ✅ — `-t "state"` tests (loading, error with retry and spinner, empty, all cancelled, failed refetch, expired
  session, focus refetch, pull-to-refresh, arrows from the error, es-ES and pt-BR)
- ER-07 ✅ — util `-t "stats"`, `occupancy-stats` and the screen's `-t "stats"`, now including the card's place (F-05:
  week label → stats card → "Week map"); simulator: figures change with the week

**Findings**

- [ ] **F-06** (convention) — the F-04 fix hides the top of the admin home under the user header. The home's stack
  draws the user header (avatar, greeting, bell) as a custom transparent `header` (`useUserStackHeader`), not as the
  native navigation bar, so `contentInsetAdjustmentBehavior="automatic"` adds only the safe area (~62 pt), not the
  user header's height. With `paddingTop: 16` the content now starts at ~78 pt while the user header ends at ~126 pt:
  at rest the "School tools" toolbox icon of `ScreenIntro` is almost entirely behind the header (only its bottom
  edge shows), and it appears only while the scroll view is pulled down. Before this spec the icon started fully
  visible at ~140 pt (`headerInset + 16`). `registrations.screen.tsx`, which F-04 pointed to, sits under the native
  header, where the automatic inset does clear it, so the pattern doesn't carry over to the user header. The test
  "scrolls the home above the tab bar…" asserts the literal `paddingTop: 16`, so it locks the bug in. Reproduce: sign
  in as the dev admin on the iPhone 18 Pro simulator, open Home and leave the scroll view at rest: the toolbox icon
  above "SCHOOL TOOLS" is cut off by the greeting header. Expected: at rest the home's content starts 16 pt below the
  user header, as before the spec (the icon's top at ~140 pt on this device), while every "School" card can still be
  scrolled clear of the tab bar (F-01). For example, keep the automatic inset and pad by the header's height minus
  the safe-area top it already adds, or turn the automatic inset off (`"never"`) and pad by `headerInset + 16` at the
  top and by the tab bar's height at the bottom; the test should assert the top padding against the header inset,
  not a literal.

**Notes**

- Round 2's F-05 is fixed: the new test walks the rendered tree and fails with `<OccupancyStats>` moved below the map.
  F-04's original symptom (an empty band of ~60 pt) is gone, but the fix overshoots: F-06.
- `## Memory Impact` still doesn't name `OccupancyStat` (T-10's child of `OccupancyStats`), nor that the admin home is
  now a scroll view (F-01). `spec-finish` should add both to `technical-context.md` / `structure.md`.
- `OccupancyCell` still computes its look and label parameters in the component file, where `.claude/rules/react.md`
  wants a `*.hook.ts`; minor, unchanged since round 1.
- pt-BR plurals follow i18next's CLDR rules, where 0 takes the `_one` form: an all-cancelled week reads "0 livre" /
  "0 cheia" to a screen reader. D-15 asks for i18next's `count`, so this is per the spec; worth a look if the user
  prefers "0 livres" / "0 cheias".
