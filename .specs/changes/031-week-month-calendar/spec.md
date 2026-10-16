---
id: "031"
slug: week-month-calendar
title: Week and month calendar on the classes screen
status: in-progress
created: 2026-10-16
started: 2026-10-16
base_commit: 8b546cef26995f5b746fef96a41b02b3cf6a41ab
fronts: [mobile]
depends_on: []
---

# 031 — Week and month calendar on the classes screen

## Goal

The classes screen (the student's Agenda and the Aulas tab of instructors and admins) gets a reusable
`WeekMonthCalendar`: it opens on the week, and the pill in the middle of its header switches between the week and
the whole month. Selecting a day only selects it — the view never changes by itself — and the selected day stays
selected when the view switches. Every day that has classes shows a single dot. The component lives outside the
classes module so that other screens can plug it in later.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: Class, the roles (every approved user sees
  every class), the decision "All times are America/Fortaleza, whatever the phone's time zone; weeks run Monday to
  Sunday"; Current state → "Week view and class details" (spec 030); Out of scope → "the student Agenda's month view",
  which this spec takes up (D-03).
- Requirements: [requirements.md → Seeing classes](../../../.docs/requirements.md#seeing-classes) — the classes view
  opens on the current week and the user can move to past and future weeks; this spec adds the month view on top.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Classes (the
  `GET /classes?date=` week request and the mobile week paragraph), Applications → `apps/mobile` (TanStack Query,
  i18next), Fixed conventions (Mobile shared UI), Automated validation, Coverage. Rules for components:
  [.claude/rules/react.md](../../../.claude/rules/react.md) (one folder per component, child components in sibling
  folders); design rules: [CLAUDE.md → Design system](../../../CLAUDE.md#design-system).
- Designs: `.docs/designs/student-app.html` **AGENDA-01** (Week) and **AGENDA-01A** (Month): the header with the two
  round arrows and the pill with a calendar icon in the middle ("14 – 20 SET" with a down chevron on the week; "SETEMBRO
  2026" with an up chevron, filled, on the month); the week strip where only the selected day has a background; the
  month grid with the weekday initials, the selected day in a filled circle and the days of the months around it in a
  lighter color. The file is a bundle (sources unpack from the `__bundler/manifest` script). The design note
  "Picking a day collapses back to that week" is overridden by D-01, and the design's several dots per day by D-02.
- Existing code this builds on (all under `apps/mobile/src/`):
  - `modules/classes/screens/classes-week.screen.tsx` / `.hook.ts` — the week screen (spec 030): title, relative-week
    subtitle, `WeekNav` (arrows, caption "12 out – 18 out", "Hoje"), `DayStrip` (seven days, one dot per class up to
    3, every day on `bg-surface`), the selected day's title and cards; the selection is a `weekStart` + `weekday`
    pair; admins' create buttons depend on the selected day.
  - `modules/classes/components/{week-nav,day-strip}/` — replaced and deleted by this spec.
  - `modules/classes/hooks/use-week-classes.hook.ts` — `useWeekClasses(weekStart)`, key `["classes", "week",
    weekStart]`, `GET /classes?date=<weekStart>`.
  - `modules/classes/utils/calendar.ts` (`toLocalDate`, `toIsoDate`, `monthOf`, `addMonths`, `isSameMonth`,
    `isoWeekdayOf`, `buildMonthGrid`, `formatIsoDate`, `getDateLocale`, plus the school-zone and date-range helpers)
    and `modules/classes/utils/week.ts` (`addDays`, `mondayOf`, `addWeeks`, `weekDays`, `weekCaption`, `weekdayName`,
    `weekdayAbbreviation`, plus `relativeWeek`, `weeksBetween`, `schoolDayOf`, `schoolTimeOf`, `formatDateLine`);
    `CalendarMonth` in `modules/classes/classes.types.ts`.
  - `modules/classes/components/date-range-calendar/` — Nova aula's month grid (`buildMonthGrid`, narrow weekday
    initials from date-fns `EEEEE`); not changed by this spec beyond its imports.
  - `modules/classes/screens/classes-week.screen.test.tsx` — the screen test: fixed clock at Wednesday 2026-10-14
    10:15 Fortaleza, `fetch` served per week (`serveWeeks`), `requestedPaths`.

## Scope

### In scope

- A shared `WeekMonthCalendar` in `apps/mobile/src/components/week-month-calendar/`, with its child components
  `CalendarWeekRow` and `CalendarMonthGrid` in sibling folders, and its copy in pt-BR, es-ES and en-US.
- Moving the general date helpers out of the classes module to `apps/mobile/src/utils/calendar-dates.ts`, and the
  new helpers the calendar needs (fitted month grid, captions, month moves, weekday initials).
- Loading the classes of every week the calendar shows (the month grid's weeks) for the dots.
- Rewiring `ClassesWeekScreen` to the new component, for the three roles.
- Deleting `WeekNav`, `DayStrip` and the copy keys they alone used.

### Out of scope

- A backend endpoint for a date range: the month is loaded week by week with the existing request (D-04).
- The sport filter (AGENDA-01B) and the notifications bell (AGENDA-07) of the student Agenda.
- Any animation when the view switches (the month grid simply replaces the week row).
- Changing `DateRangeCalendar` / `CalendarDay` (Nova aula), apart from their imports moving.
- Using `WeekMonthCalendar` on any other screen; remembering the chosen view after leaving the screen.
- Swiping between weeks or months (only the arrows move).

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | Selecting a day — in the week row or the month grid — only selects it: the view stays as it is. The only way to switch between the week and the month is the pill in the header. This departs from the AGENDA-01A note "Picking a day collapses back to that week". | The user's choice: the month stays open while they look at several days. |
| D-02 | A day with at least one class shows exactly one dot; a day with none shows no dot, in both views, including the days of the months around the shown one. The dot is `lagoon`, except on the selected day of the week row, where it is `on-color`; in the month grid it sits below the day's circle and stays `lagoon`. Replaces spec 030's D-06 "one dot per class, at most 3". | The user asked for a single dot; the count isn't the point, whether the day has classes is. |
| D-03 | The month view comes with `ClassesWeekScreen`, so it is on the student's Agenda and on the Aulas tab of instructors and admins alike. This takes "the student Agenda's month view" out of product.md → Out of scope. | One shared screen for the three roles (spec 030, D-06); a per-role branch nobody asked for would add a code path to test. |
| D-04 | No backend change. The screen loads the classes of every week the calendar shows (one week in the week view; each Monday of the month grid, 4 to 6, in the month view) with `useQueries`, each under the existing key `["classes", "week", <Monday>]` and the existing `GET /classes?date=<Monday>`, so a week already loaded is not requested again and the week and month share the cache. The list's loading and error-with-retry states keep following only the selected day's week (`useWeekClasses`); a failed load of another visible week just leaves its days without dots, with no message. Pull-to-refresh refetches every visible week. | A month is at most 6 small week requests that are mostly cached already; a range endpoint can come later if it is ever needed. |
| D-05 | `WeekMonthCalendar` (`src/components/week-month-calendar/`) is controlled for the selection and owns only the view. Props: `selectedDate` (`YYYY-MM-DD`), `today` (`YYYY-MM-DD`, given by the parent — the classes screen passes Fortaleza's today), `markedDates: string[]` (the days that get a dot), `onSelectDate(date: string)`, `onVisibleRangeChange?(range: { from: string; to: string })` (first and last day drawn, called on mount and whenever they change), `markedLabel?: string` (appended to a marked day's accessibility label). The view (`"week"` \| `"month"`) is internal state, starting on `"week"`. Neither the component nor its children import anything from `src/modules/`. | A shared component can't depend on a feature module; keeping the selection in the parent lets each screen decide what a selected day means. |
| D-06 | What the calendar shows is always derived from `selectedDate` and the view: the week view shows the Monday-to-Sunday week that holds the selected day; the month view shows the month of the selected day. So every move goes through `onSelectDate`: the week arrows select the same weekday one week before or after (±7 days); the month arrows select the same day number one month before or after, capped at that month's last day (31 Jan 2027 → 28 Feb 2027, 31 Mar → 30 Apr); tapping a day of the month before or after in the grid selects it, and the grid therefore moves to that month. | The selected day is always on screen, and switching views always lands on it (the user's requirement), without a second "visible period" state to keep in sync. |
| D-07 | "Hoje" (a chip like today's, `grape-tint` with `grape` text) sits in the header between the pill and the right arrow, only while today isn't drawn as part of the shown period: in the week view, when today isn't in the shown week; in the month view, when today isn't in the shown month (a day of an adjacent month drawn in the grid doesn't count). Tapping it selects today and keeps the view. While it shows, the pill is no longer centered. The screen's subtitle ("Esta semana", "Semana passada", …) keeps describing the selected day's week in both views. | Keeps spec 030's way back to today; the subtitle already describes the selected day's week, and the list below shows that day. |
| D-08 | Captions, built with the date-fns locale of the app language, upper-cased, with a trailing "." dropped from month abbreviations: week inside one month "12 – 18 OUT" (`d` – `d MMM`); week across two months "28 SET – 4 OUT" (`d MMM` – `d MMM`); across two years the same, without the year ("28 DEZ – 3 JAN"); month "OUTUBRO 2026" (`MMMM yyyy`). The weekday abbreviations of the week row stay as in spec 030 ("QUA", "SÁB"); the month grid's weekday initials are date-fns `EEEEE`, upper-cased, Monday first ("S T Q Q S S D" in pt-BR, "M T W T F S S" in en-US). | AGENDA-01 / 01A; a week that spans two months needs both months to be unambiguous. |
| D-09 | Look, with design tokens only (no raw colors, sizes or radii; every touch target at least 44 pt): the header row has the two round arrows (as today's `WeekNav`) and the pill with a calendar icon, the caption in `ds-text-button` and a chevron — outlined (`border-line`, `bg-surface`, `ink` text) with a down chevron in the week view, filled `grape` with `on-color` text and an up chevron in the month view. Week row: seven columns, weekday in `ds-text-chip` and number in `ds-text-day-number`; only the selected day has a background (a `grape` card, `rounded-card`, `on-color` text); the other days have none. Month grid: initials in `ds-text-section-label` `ink-2`, numbers in `ds-text-day-number`; the selected day sits in a filled `grape` circle with `on-color` text; the days of the months around it are `ink-3`. Today's number is `sun` (when not selected) in both views, with no background or ring. The grid has only the weeks it needs: from the week of the 1st to the week of the last day (4, 5 or 6 rows). | AGENDA-01 / 01A as the user described them; CLAUDE.md's design rules. |
| D-10 | Accessibility: the pill is a button labelled "Ver o mês" in the week view and "Ver a semana" in the month view, with `accessibilityState.expanded` true in the month view; the arrows are labelled by the view ("Ver a semana anterior" / "Ver a semana seguinte", "Ver o mês anterior" / "Ver o mês seguinte"); each day is a button whose label is its full date (date-fns `PPPP` in the app language) followed by `, <markedLabel>` when it has a dot and a `markedLabel` was given, with `accessibilityState.selected`. The classes screen passes `markedLabel` = `classesWeek.hasClasses`. Each day has `testID` `calendar-day-<YYYY-MM-DD>` and each dot `calendar-day-<YYYY-MM-DD>-dot`. | Screen readers need to know the view, the move and which days have classes; stable ids for the tests. |
| D-11 | The general date helpers move to `src/utils/calendar-dates.ts` (types in `calendar-dates.types.ts`): `CalendarMonth`, `toLocalDate`, `toIsoDate`, `monthOf`, `addMonths`, `isSameMonth`, `isoWeekdayOf`, `buildMonthGrid`, `formatIsoDate`, `getDateLocale`, `addDays`, `mondayOf`, `addWeeks`, `weekDays`, `weekCaption`, `weekdayName`, `weekdayAbbreviation`; their tests move with them, and every import in `src/modules/classes/` points at the new file (no re-exports left behind). The school-zone, date-range and class helpers stay in the classes module. `WeekNav`, `DayStrip` (with their tests) and the keys `classesWeek.previousWeek`, `classesWeek.nextWeek` and `classesWeek.today` are deleted. | Shared code can't import a module; leaving re-exports would keep two homes for the same helper. |
| D-12 | New copy, under `weekMonthCalendar` in `src/i18n/messages/{pt-BR,en-US,es-ES}.ts`: `showMonth` "Ver o mês" / "Show the month" / "Ver el mes"; `showWeek` "Ver a semana" / "Show the week" / "Ver la semana"; `previousWeek` "Ver a semana anterior" / "Show the previous week" / "Ver la semana anterior"; `nextWeek` "Ver a semana seguinte" / "Show the next week" / "Ver la semana siguiente"; `previousMonth` "Ver o mês anterior" / "Show the previous month" / "Ver el mes anterior"; `nextMonth` "Ver o mês seguinte" / "Show the next month" / "Ver el mes siguiente"; `today` "Hoje" / "Today" / "Hoy". Under `classesWeek`: `hasClasses` "com aulas" / "with classes" / "con clases". | The component's copy is generic and lives in its own namespace; "with classes" is the classes screen's word. |

## Expected Results

The mobile tests run in English (US) (`jest.setup.ts`), so the test examples below are in English; the pt-BR
examples are what the simulator shows. The screen tests use the fixed clock of `classes-week.screen.test.tsx`
(Wednesday 2026-10-14 in Fortaleza). Commands run from `apps/mobile`.

### ER-01 — The calendar opens on the week view

- **Front:** mobile
- **Behavior:** Given an approved user opens the classes screen (Agenda or Aulas) on Wednesday 2026-10-14, when it
  renders, then the calendar shows the seven days 2026-10-12 to 2026-10-18 (Monday first), 2026-10-14 is selected,
  the pill reads "12 – 18 OCT" ("12 – 18 OUT" in pt-BR) and is labelled "Show the month", and no month grid is
  drawn.
- **Edge and error cases:** only the selected day has a background: the selected day is drawn on `grape`, the six
  others have no background class; today's number is `sun` when today isn't the selected day.
- **Verify by:** `npx jest src/modules/classes/screens/classes-week.screen.test.tsx -t "opens on the week view"`;
  `npx jest src/components/calendar-week-row -t "only the selected day has a background"`; the iOS simulator journey
  in the Verification Plan.

### ER-02 — The week caption

- **Front:** mobile
- **Behavior:** Given the week view, when the shown week lies in one month, then the pill reads "12 – 18 OCT"; when it
  spans two months, "28 SEP – 4 OCT"; when it spans two years, "28 DEC – 3 JAN" (no year).
- **Edge and error cases:** in pt-BR "12 – 18 OUT" and "28 SET – 4 OUT"; in es-ES the month abbreviations have no
  trailing dot.
- **Verify by:** `npx jest src/utils/calendar-dates.test.ts -t "weekCaption"`.

### ER-03 — One dot for a day with classes

- **Front:** mobile
- **Behavior:** Given 2026-10-14 has three classes and 2026-10-15 one, when the week view shows that week, then
  2026-10-14 and 2026-10-15 each show exactly one dot and the other five days show none; when the month view shows
  October 2026, the same days show exactly one dot each.
- **Edge and error cases:** a day of an adjacent month drawn in the grid (e.g. 2026-11-01 in October) with classes
  shows one dot too; the selected day's dot in the week row is `on-color`.
- **Verify by:** `npx jest src/components/calendar-week-row -t "one dot"`; `npx jest src/components/calendar-month-grid
  -t "one dot"`; `npx jest src/modules/classes/screens/classes-week.screen.test.tsx -t "one dot per day with
  classes"`.

### ER-04 — The pill switches between week and month

- **Front:** mobile
- **Behavior:** Given the week view of 12–18 Oct 2026, when the user taps the pill, then the month grid of October 2026
  is shown, the week row is gone, and the pill reads "OCTOBER 2026" ("OUTUBRO 2026" in pt-BR), labelled "Show the
  week" with `expanded` true; when they tap it again, the week row of 12–18 Oct is back and the pill reads "12 – 18
  OCT".
- **Edge and error cases:** the arrows' labels follow the view ("Show the previous week" / "Show the next week" on the
  week, "Show the previous month" / "Show the next month" on the month).
- **Verify by:** `npx jest src/components/week-month-calendar -t "switches between week and month"`.

### ER-05 — Selecting a day doesn't change the view

- **Front:** mobile
- **Behavior:** Given the month view of October 2026, when the user taps 2026-10-20, then 2026-10-20 is selected (in
  its circle), the month grid is still shown, and the list below shows that day's title and classes; given the week
  view, when the user taps 2026-10-16, then it is selected and the week row is still shown.
- **Edge and error cases:** tapping the already selected day changes nothing.
- **Verify by:** `npx jest src/components/week-month-calendar -t "selecting a day keeps the view"`;
  `npx jest src/modules/classes/screens/classes-week.screen.test.tsx -t "selecting a day in the month"`.

### ER-06 — The selected day carries across views

- **Front:** mobile
- **Behavior:** Given the month view of October 2026 with 2026-10-23 selected, when the user taps the pill, then the
  week row shows 2026-10-19 to 2026-10-25 with 2026-10-23 selected; given the week view of 26 Oct – 1 Nov 2026 with
  2026-11-01 selected, when the user taps the pill, then the month grid of November 2026 is shown with 2026-11-01
  selected.
- **Edge and error cases:** a day selected with the arrows (D-06) carries across the same way.
- **Verify by:** `npx jest src/components/week-month-calendar -t "selection carries across views"`.

### ER-07 — The month grid

- **Front:** mobile
- **Behavior:** Given the month view, when it shows a month, then the grid starts on Monday under a row of weekday
  initials ("M T W T F S S"), and it has only the weeks it needs: February 2027 has 4 rows (1–28 Feb), September 2026
  has 5 (31 Aug – 4 Oct), August 2026 has 6 (27 Jul – 6 Sep).
- **Edge and error cases:** the days of the months before and after are drawn in `ink-3`, those of the shown month in
  `ink` (today in `sun`, the selected day on `grape`).
- **Verify by:** `npx jest src/utils/calendar-dates.test.ts -t "fitted month grid"`; `npx jest
  src/components/calendar-month-grid -t "adjacent days"`.

### ER-08 — Selecting a day of an adjacent month moves the grid

- **Front:** mobile
- **Behavior:** Given the month view of October 2026, when the user taps 2026-11-01 (drawn after 31 Oct), then
  2026-11-01 is selected and the grid shows November 2026 ("NOVEMBER 2026"), still in the month view.
- **Edge and error cases:** tapping 2026-09-28 (drawn before 1 Oct) selects it and shows September 2026.
- **Verify by:** `npx jest src/components/week-month-calendar -t "adjacent month day moves the grid"`.

### ER-09 — The arrows move by the view

- **Front:** mobile
- **Behavior:** Given the week view with 2026-10-14 selected, when the user taps the next arrow, then 2026-10-21 is
  selected and the week 19–25 Oct is shown (the previous arrow: 2026-10-07, week 5–11 Oct); given the month view with
  2026-10-14 selected, when the user taps the next arrow, then 2026-11-14 is selected and November 2026 is shown (the
  previous arrow: 2026-09-14, September 2026).
- **Edge and error cases:** the day number is capped at the month's last day: 2027-01-31 → next → 2027-02-28;
  2026-03-31 → next → 2026-04-30; 2027-03-31 → previous → 2027-02-28.
- **Verify by:** `npx jest src/components/week-month-calendar -t "arrows"`; `npx jest src/utils/calendar-dates.test.ts
  -t "addMonthsKeepingDay"`.

### ER-10 — "Today" and the subtitle

- **Front:** mobile
- **Behavior:** Given the week view after one tap on the next arrow, when the screen shows 19–25 Oct, then "Today" is
  shown, and tapping it selects 2026-10-14 and shows 12–18 Oct, still in the week view; given the month view after one
  tap on the next arrow (November), then "Today" is shown, and tapping it selects 2026-10-14 and shows October 2026,
  still in the month view.
- **Edge and error cases:** "Today" is hidden while today's week (week view) or today's month (month view) is shown,
  whichever day is selected; in October's month view with 2026-10-20 selected the subtitle reads "Next week", and with
  2026-10-14 selected "This week".
- **Verify by:** `npx jest src/components/week-month-calendar -t "Today"`; `npx jest
  src/modules/classes/screens/classes-week.screen.test.tsx -t "subtitle follows the selected day"`.

### ER-11 — The month view loads every week it shows

- **Front:** mobile
- **Behavior:** Given the screen opened on 12–18 Oct 2026 (one request, `date=2026-10-12`), when the user switches to
  the month view of October 2026, then the app requests `date=2026-09-28`, `2026-10-05`, `2026-10-19` and
  `2026-10-26` — and not `2026-10-12` again — and the days of those weeks with classes show their dot.
- **Edge and error cases:** when one of those weeks (not the selected day's) fails, its days show no dot and no error
  is shown; pulling the list down refetches every visible week; a failure of the selected day's week still shows the
  error with "Try again" (spec 030).
- **Verify by:** `npx jest src/modules/classes/screens/classes-week.screen.test.tsx -t "month view loads its weeks"`;
  `npx jest src/modules/classes/hooks/use-visible-weeks-classes.hook.test.tsx`.

### ER-12 — The calendar is reusable

- **Front:** mobile
- **Behavior:** Given `WeekMonthCalendar`, `CalendarWeekRow` and `CalendarMonthGrid`, when their source is searched
  for imports from the feature modules, then there are none, and their tests render them with props only (no query
  client, no session, no route), reporting the drawn range through `onVisibleRangeChange`.
- **Edge and error cases:** the week view reports `{ from: Monday, to: Sunday }` of the selected day's week; the month
  view reports the first and last day drawn (October 2026 → `2026-09-28` to `2026-11-01`).
- **Verify by:** `grep -rnE "@/modules|\.\./modules|modules/classes" apps/mobile/src/components/week-month-calendar
  apps/mobile/src/components/calendar-week-row apps/mobile/src/components/calendar-month-grid` (from the repo root)
  prints nothing; `npx jest src/components/week-month-calendar -t "visible range"`.

## Tasks

### Mobile (`apps/mobile`)

Before writing code under `apps/mobile`, load the `vercel-react-native-skills` and `vercel-react-best-practices`
skills and follow [.claude/rules/react.md](../../../.claude/rules/react.md) (component folders split into
`*.component.tsx`, `*.hook.ts`, `*.types.ts`, `index.ts`; child components in sibling folders).

- [x] **T-01** — Move the general date helpers listed in D-11 from `src/modules/classes/utils/calendar.ts` and
  `src/modules/classes/utils/week.ts` (and `CalendarMonth` from `src/modules/classes/classes.types.ts`) to
  `src/utils/calendar-dates.ts` / `src/utils/calendar-dates.types.ts`, moving their tests from
  `src/modules/classes/utils/{calendar,week}.test.ts` to `src/utils/calendar-dates.test.ts`, and point every import
  in `src/modules/classes/` at the new file (no re-exports). No behavior changes. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: enabling · Done when: `npx jest src/utils src/modules/classes` passes and `npm run check-types` exits 0
  (both from `apps/mobile`).
  > ✅ 2026-10-16 — moved the D-11 helpers (and `CalendarMonth`) to `src/utils/calendar-dates.ts` /
  > `calendar-dates.types.ts`, pointed every import in `src/modules/classes/` at them, no re-exports; the school-zone,
  > date-range and class helpers stay; files: `apps/mobile/src/utils/calendar-dates.ts`,
  > `apps/mobile/src/utils/calendar-dates.types.ts`, `apps/mobile/src/utils/calendar-dates.test.ts`,
  > `apps/mobile/src/modules/classes/utils/{calendar,week}.ts`, `…/utils/{calendar,week}.test.ts`,
  > `apps/mobile/src/modules/classes/classes.types.ts`,
  > `apps/mobile/src/modules/classes/screens/{classes-week.screen.hook,class-details.screen.hook}.ts`,
  > `apps/mobile/src/modules/classes/components/{date-range-calendar/date-range-calendar.hook,date-range-summary/date-range-summary.hook}.ts`,
  > `apps/mobile/src/modules/classes/components/day-strip/day-strip.component{,.test}.tsx`; verified: `npx jest src/utils
  > src/modules/classes` (36 suites, 305 tests passed), `npm run check-types` (exit 0), `npx eslint src/utils
  > src/modules/classes` (clean); deviations: `toUtcMs` is also exported from `calendar-dates.ts` (a small technical
  > step: `addDays` needs it there and `weeksBetween` / `formatDateLine` stay in the classes `week.ts`)

- [ ] **T-02** — Add to `src/utils/calendar-dates.ts`, with tests in `src/utils/calendar-dates.test.ts`: a fitted
  month grid (the days of the previous month before the 1st, only the weeks needed — D-09; `buildMonthGrid`'s
  existing modes keep working for Nova aula), `weekCaption` in the new format (D-08, replacing the old "12 Oct – 18
  Oct" one and updating its caller), `monthCaption` ("OCTOBER 2026"), `addMonthsKeepingDay(date, amount)` (capped at
  the month's last day, D-06) and `weekdayInitials(locale)` (D-08). Tests named "weekCaption", "fitted month grid"
  and "addMonthsKeepingDay" cover every example of ER-02, ER-07 and ER-09.
  Covers: ER-02, ER-07, ER-09 · Done when: `npx jest src/utils/calendar-dates.test.ts` passes.

- [ ] **T-03** — Add the presentational children `CalendarWeekRow` (`src/components/calendar-week-row/`: seven days,
  weekday and number, only the selected day on `grape`, today in `sun`, one dot per marked day, `on-color` on the
  selected one) and `CalendarMonthGrid` (`src/components/calendar-month-grid/`: weekday initials, fitted grid,
  adjacent days in `ink-3`, selected circle, today in `sun`, one `lagoon` dot per marked day), both with the day
  buttons, labels, states and `testID`s of D-10 and the tokens of D-09, each with its
  `<name>.component.test.tsx` (tests "only the selected day has a background", "one dot", "adjacent days").
  Covers: ER-03, ER-07 · Done when: `npx jest src/components/calendar-week-row src/components/calendar-month-grid`
  passes.

- [ ] **T-04** — Add `WeekMonthCalendar` in `src/components/week-month-calendar/` (`.component.tsx`, `.hook.ts`,
  `.types.ts`, `index.ts`) with the props of D-05: the header (arrows, pill with icon, caption and chevron, "Hoje" —
  D-07, D-09, D-10), the internal view starting on `"week"`, the moves of D-06 through `onSelectDate`, and
  `onVisibleRangeChange`; add the `weekMonthCalendar` keys of D-12 to `src/i18n/messages/{pt-BR,en-US,es-ES}.ts`.
  Its test `week-month-calendar.component.test.tsx` drives the component through a small controlled wrapper holding
  `selectedDate`, with tests "switches between week and month", "selecting a day keeps the view", "selection carries
  across views", "adjacent month day moves the grid", "arrows", "Today" and "visible range".
  Covers: ER-01, ER-04, ER-05, ER-06, ER-08, ER-09, ER-10, ER-12 · Done when: `npx jest
  src/components/week-month-calendar` passes and the grep of ER-12 prints nothing.

- [ ] **T-05** — Add `useVisibleWeeksClasses({ from, to })` in
  `src/modules/classes/hooks/use-visible-weeks-classes.hook.ts`: one query per Monday from `mondayOf(from)` to `to`
  with `useQueries`, sharing the key and request of `useWeekClasses` through a query-options factory exported from
  `use-week-classes.hook.ts`; returns the loaded items of every week (failed weeks contribute nothing), and
  `refetch()` for all of them (D-04). Test `use-visible-weeks-classes.hook.test.tsx`: the Mondays requested for a
  month range, cached weeks not requested again, a failed week leaves the others' items, `refetch` refetches all.
  Covers: ER-11 · Done when: `npx jest src/modules/classes/hooks` passes.

- [ ] **T-06** — Rewire `ClassesWeekScreen` (`src/modules/classes/screens/classes-week.screen.tsx`, `.hook.ts`):
  replace `WeekNav` and `DayStrip` with `WeekMonthCalendar`; keep the selection as one `selectedDate` (opening on
  Fortaleza's today); load the list with `useWeekClasses(mondayOf(selectedDate))` and the dots with
  `useVisibleWeeksClasses` over the range the calendar reports (`markedDates` = the days with at least one class);
  the subtitle from the selected day's week (D-07); pull-to-refresh refetches every visible week (D-04); pass
  `markedLabel` = `classesWeek.hasClasses` (D-12, added in the three locales); admins' create buttons keep working
  from the selected day. Delete `src/modules/classes/components/{week-nav,day-strip}/` and the keys
  `classesWeek.previousWeek`, `classesWeek.nextWeek`, `classesWeek.today` (D-11). Update
  `classes-week.screen.test.tsx` (the spec 030 tests adapted to the new calendar — "Hoje" now in the calendar, one dot
  instead of three) and add the tests "opens on the week view", "one dot per day with classes", "selecting a day in
  the month", "subtitle follows the selected day" and "month view loads its weeks".
  Covers: ER-01, ER-03, ER-05, ER-10, ER-11 · Done when: `npx jest src/modules/classes` passes and `npm run lint`
  and `npm run check-types` exit 0 (from `apps/mobile`).

### Verification

- [ ] **T-07** — Run every command in the Verification Plan from the repo root and follow its user journey on the iOS
  simulator; all pass. Record the output summary and what was seen as evidence.
  Covers: all · Done when: every command exits 0 and the journey shows what it describes.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 031` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 031` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 031` — passes (no e2e suite applies to the mobile app).
  - `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` — no errors.
  - `grep -rnE "@/modules|\.\./modules|modules/classes" apps/mobile/src/components/week-month-calendar
    apps/mobile/src/components/calendar-week-row apps/mobile/src/components/calendar-month-grid` — prints nothing
    (ER-12).
  - The named tests in each Expected Result's `Verify by`, from `apps/mobile` (they are part of the related tests
    above; run them alone to check a single result).
- User journeys (iOS simulator, local backend with classes on a few days of this month and the next, pt-BR, light
  and dark theme):
  - Sign in as a student: the Agenda opens on the week, today selected, the pill "d – d MMM" with a down chevron,
    only the selected day with a background, one dot under each day with classes. Tap the pill: the month grid,
    pill "OUTUBRO 2026" (the current month) filled with an up chevron, adjacent days lighter, one dot per day with
    classes. Tap another day: it is selected, the month stays, its classes show below. Tap the pill: the week of that
    day, with it selected. Use both arrows in each view and "Hoje"; tap a day of the next month in the grid: the grid
    moves to that month.
  - Sign in as an admin: the Aulas tab has the same calendar, and "Criar aula neste dia" still opens Nova aula with
    the selected day.

## Memory Impact

- `memory/product.md` — Current state: the week view gains the month view (pill in the middle of the header, the
  selected day kept across views, selecting a day never switching the view, one dot per day with classes, the arrows
  moving a week or a month, "Hoje"), for the three roles; remove "the student Agenda's month view" from Out of scope
  → spec 030's item.
- `memory/technical-context.md` — Classes → the mobile week paragraph: `WeekMonthCalendar` instead of `WeekNav` /
  `DayStrip`, the selection as one date, `useVisibleWeeksClasses` (`useQueries` over the visible weeks, shared key);
  Fixed conventions → Mobile shared UI: `WeekMonthCalendar` (props of D-05) with `CalendarWeekRow` and
  `CalendarMonthGrid`, and the date helpers in `src/utils/calendar-dates.ts`.
- `memory/structure.md` — `src/components/{week-month-calendar,calendar-week-row,calendar-month-grid}/` and
  `src/utils/calendar-dates.ts` added; `week-nav` and `day-strip` removed from the classes module's components.

## Assumptions

- Loading a month as 4 to 6 week requests is fast enough on a phone (each week is a few dozen classes at most, and
  most weeks are already cached); a range endpoint is a later spec if it isn't. Accepted by the user (D-04).

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
