---
id: "030"
slug: classes-week-view
title: "Aulas tab: week view and class details"
status: in-progress
created: 2026-10-16
started: 2026-10-16
base_commit: 8a4501ee0316065450772fd48571ce5e187b7832
fronts: [classes, backend, mobile]
depends_on: []
---

# 030 — Aulas tab: week view and class details

## Goal

Every approved user — student, instructor or admin — can browse the school's classes week by week (Monday to
Sunday, America/Fortaleza), past and future, starting on the current week, and open any class to see its
details: discipline, level, date and time, location name and address, instructors, capacity and notes. Each
class shows whether it is not started, started or finished, computed from the clock. Admins also get the
design's entry points to create classes — "+", "Criar aula" and "Criar aula neste dia" — which open "Nova aula"
with that day already picked. Classes created by spec 028 become visible for the first time.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: Class (its lifecycle by the clock), the
  roles (every approved user sees every class), the decision "All times are America/Fortaleza … weeks run Monday
  to Sunday".
- Requirements: [requirements.md → Seeing classes](../../../.docs/requirements.md#seeing-classes) — every approved
  user sees all classes, past and future, opening on the current week and moving to any other week;
  [requirements.md → Class notes visibility](../../../.docs/requirements.md#class-notes-visibility) — notes are
  shown to everyone who can see the class; [requirements.md → Class
  states](../../../.docs/requirements.md#class-states) — not started, started from the start time, finished from
  the end time, with nobody acting; [requirements.md → Seats](../../../.docs/requirements.md#seats) — capacity and
  seats taken shown to everyone (only the capacity here, see D-04).
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Architecture (Time:
  a class's state is computed from the clock, never stored), Classes, Fixed conventions (Mobile routes, Mobile
  flows, Mobile shared UI, Error messages are translation keys), Applications → `apps/mobile` (TanStack Query,
  Dates, Push), Automated validation. Module rules: [modules/classes.md](../../memory/modules/classes.md).
- Designs: `.docs/designs/admin-app.html` **AULAS-01** (Week: `horarioScreen`, `weekNav`, `diaPicker`,
  `aulaCard`) and **AULAS-02 / 02A / 02B** (Class detail: `aulaScreen`, `dHeader`, `dFaixa`, `dComQuem`);
  `.docs/designs/instructor-app.html` **AULAS-01** / **AULAS-02**; `.docs/designs/student-app.html`
  **AGENDA-01** / **AGENDA-02**. The files are bundles: their sources unpack from the `__bundler/manifest` script
  (gzip + base64). The parts that need features that don't exist yet are out of scope (see Scope).
- Existing code this builds on:
  - `modules/classes/src/access/class-actor.ts` — `assertCanReadClasses` (approved, any role).
  - `modules/classes/src/school-class/` — `SchoolClass`, `CLASS_TIME_ZONE`, `isValidIsoDate` (`model/class-batch.ts`),
    `ClockProvider`; fakes in `modules/classes/test/mock/`.
  - `apps/backend/src/modules/classes/` — `ClassesController` (`POST /classes/batch`,
    `GET /classes/time-range-suggestions`), `PrismaSchoolClassRepository`, `PrismaTeacherLookup`,
    `SystemClockProvider`; `apps/backend/test/classes.e2e-spec.ts` (fixed clock at 2026-10-14 10:00 Fortaleza,
    fake Expo push).
  - `apps/mobile/src/app/(private)/student/(tabs)/index.tsx` (Agenda, renders the `StudentScreen` placeholder),
    `.../instructor/(tabs)/classes.tsx` and `.../admin/(tabs)/classes.tsx` (`FlowPlaceholder`);
    `src/constants/routes.ts`; `src/modules/classes/` (Nova aula, `utils/calendar.ts` with `todayInSchoolZone`,
    the query keys `["locations"]`, `["classes", "time-range-suggestions"]`, `useCreateClasses`);
    `src/modules/notifications/hooks/use-notification-response.hook.ts` (a tap on any push other than
    `registration.pending` replaces to `/`) and `use-notification-received.hook.ts`.
- Depends on: nothing unfinished. Spec 029 (excluded dates and skip-past in batches) is finished; its pull request
  must be merged before this spec's branch is created, so the branch starts from a `main` with the current memory.

## Scope

### In scope

- `GET /classes?date=` (one week) and `GET /classes/:id` (one class), for any approved account.
- `getClassState` in `modules/classes`, used by the app.
- One week screen for the three roles: the student's Agenda tab, the instructor's and admin's Aulas tab.
- The class details screen, opened from a card, for the three roles.
- The admin's "+", "Criar aula" and "Criar aula neste dia" entry points, and Nova aula's optional `date`.
- Refreshing the week after classes are created and when a `class.assigned` push arrives with the app open; a
  tap on a `class.assigned` push opens the Aulas tab.
- Copy in pt-BR, es-ES and en-US.

### Out of scope

- "My classes" for instructors and for admins who teach, and the highlighted next class (a spec of its own).
- Seats taken, the occupancy bar, "Sem vagas", "Turma cheia", the list of students, the request / waiting-list
  button (enrolment).
- Cancelled classes ("Cancelada"), the "Sem instrutor" flag, the edit pencil, deleting (their specs).
- The cancellation-rule and school-rules rows of the details screen, the map, "Direções" and the weather.
- "Depois da aula" (photos and ratings) on finished classes.
- The student Agenda's month view (AGENDA-01A), the sport filter button (AGENDA-01B) and the notifications bell.
- Opening a person's sheet from an instructor on the details screen; profile photos (initials only).
- A marker on the week cards for the viewer's own classes.
- Cancelling the class assignments of a deleted or removed account (see Assumptions).
- A push to anyone when classes are created; any new push type or change to the `class.assigned` payload.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | `GET /classes?date=YYYY-MM-DD` (protected). Access through `assertCanReadClasses` first. `date` is any day of the wanted week; the use case lists the classes whose `startsAt` is at or after that week's Monday 00:00 and before the next Monday 00:00, America/Fortaleza, sorted by `startsAt`, then `endsAt`, then `id`. Answer 200 `{ weekStart: "YYYY-MM-DD", items: ClassItem[] }`, where `ClassItem` is `{ id, discipline, level, startsAt, endsAt, capacity, notes, location: { id, name, address }, instructors: [{ id, name }] }` (dates ISO 8601 UTC, `notes` `null` when none), and each class's instructors are sorted A–Z by name ignoring case and accents (`localeCompare` with `sensitivity: "base"`, then `id`). `date` missing, not a string, malformed or impossible (`2026-02-30`) → 422 `ValidationException` with `class.date.invalid`. | One request per week, decided on the server in Fortaleza time; the app sends the Monday it shows. A week is at most a few dozen classes, so no paging. |
| D-02 | `GET /classes/:id` (protected), same access, answers 200 with one `ClassItem`. An id that isn't a UUID, or no class with it → 404 `NotFoundError` `class.notFound` (no lookup for a non-UUID). The route is declared after `GET /classes/time-range-suggestions` in `ClassesController`, so that path keeps its handler. | The details screen loads by id, so it also works when opened from a deep link later. |
| D-03 | The read side is a port `ClassViewReader` (`findStartingBetween(from, to): Promise<ClassView[]>`, `findById(id): Promise<ClassView \| null>`) in `modules/classes/src/school-class/provider/class-view-reader.provider.ts`, with `ClassView` = `ClassItem` with `Date`s; implemented by `PrismaClassViewReader` (`apps/backend/src/modules/classes/class-view-reader.prisma.ts`) in one query per call (`include` of the location and of the instructors' `user.name`), and faked in `modules/classes/test/mock/`. Use cases `ListWeekClasses` and `GetClass`. | The module knows people only through its own contracts (modules/classes.md → Boundaries); a read model avoids loading entities and then names one by one. |
| D-04 | Seats: the details screen shows only the capacity, "Máx. N alunos"; cards show nothing about seats. The enrolment spec adds the seats taken, the bar and "Sem vagas". This departs from requirements → Seats until enrolment exists. | Enrolment doesn't exist: a hard-coded "0 of N" would be a value the API doesn't have. |
| D-05 | `getClassState(startsAt: Date, endsAt: Date, now: Date): ClassState` in `modules/classes/src/school-class/model/class-state.ts`, `ClassState` = `"not-started" \| "started" \| "finished"`: `now < startsAt` → `not-started`; `startsAt <= now < endsAt` → `started`; `now >= endsAt` → `finished`. The API never returns a state. The app computes it with the phone's clock through a `useNow()` hook that re-renders every 60 s while the screen is mounted. | The technical context requires a computed state; one function keeps the app and the later backend rules (editing, cancelling) on the same boundaries. |
| D-06 | One `ClassesWeekScreen` (`src/modules/classes/screens/`) serves the three roles; the route file passes the title key (`tabs.agenda` for students, `tabs.classes` for instructors and admins), the detail route builder and, for admins only, `canCreate`. The screen: the title, under it the relative week label — "Esta semana", "Semana passada", "Próxima semana", "Há N semanas", "Daqui a N semanas" —; `WeekNav` (previous / next arrows, 44 pt touch targets, a caption "12 out – 18 out" built with the date-fns locale, and "Hoje" only when another week is shown); `DayStrip` (seven days, Monday first: weekday abbreviation in upper case and day number in Barlow Condensed, today's number in `sun`, the selected day on `grape` with `on-color` text, one `lagoon` dot per class of that day, at most 3); the section "Segunda · 12 out" with "N aulas"; then the day's cards. | Matches AULAS-01 for the three roles, as the user chose for the student Agenda too (its month view and filter are out of scope). |
| D-07 | Week selection: the screen opens on the week of `todayInSchoolZone()` with today selected; the arrows move one week and keep the same weekday selected; "Hoje" returns to today's week and day. The query key is `["classes", "week", weekStart]` and the request sends `date=<weekStart>`. | The selected weekday staying put matches the design; one cache entry per week. |
| D-08 | A card (`ClassCard`, a `Pressable` row opening the details): chips — discipline (Surf on `lagoon`, Skate on `tan`, icon) and level (on `info-tint`, text `lagoon`) —, on the right the state chip ("Em andamento" on `sun` with a clock icon; "Finalizada" on `dim`, text `ink-2`; nothing when not started), the time range "08:00 – 09:30" in Barlow Condensed, a pill with the location name, and a footer on `dim` with the instructors' names — two joined by " · ", then "+N". A started card has a `sun` border; a finished card is drawn at reduced opacity. | AULAS-01's card without the parts that need enrolment or cancellation. "Em andamento" adapts the design's European Portuguese "A decorrer" for Brazilian Portuguese. |
| D-09 | The details screen (`ClassDetailsScreen`): `BackButton` and the label "Detalhe"; the two chips; the time range in Barlow Condensed; the date line — "Hoje", "Amanhã" or "Ontem" when it applies, else the weekday name, then " · 12 out", plus " 2027" when the class's year isn't the current one; a banner when started ("Em andamento" / "Começou às 08:00 e termina às 09:30.", on `sun`) or finished ("Aula finalizada" / "Terminou às 09:30.", on `dim`); "Instrutor" or "Instrutores" with one pill per instructor (initials avatar on `sand`, the name, "Você" for the signed-in viewer); "Máx. N alunos" ("Máx. 1 aluno"); "Notas" with the notes as written, only when there are notes; "Local" with the location's name and address. | AULAS-02 / 02A / 02B with what exists today; notes visible to everyone as required. |
| D-10 | Admin entry points (only with `canCreate`): a 44 pt round "+" in the header (`sun` background, `on-color` icon, accessibility label "Nova aula"), always shown; on a day without classes the empty card shows "Criar aula" (outline button); below a day's cards, "Criar aula neste dia" (ghost button). The two buttons show only when the selected day is today or later. Each opens `routes.admin.newClass({ date })` with the selected day when it is today or later, and without `date` otherwise (only the "+" can be pressed then). | Matches AULAS-01, without letting an admin start a batch on a past day. |
| D-11 | Nova aula (`useNewClassScreen`) reads an optional `date` route param: a real `YYYY-MM-DD` that is today or later (Fortaleza) becomes a single-day range (`startDate = date`, `endDate = null`, nothing excluded) and the calendar opens on that date's month; anything else is ignored and the screen starts as today. `routes.admin.newClass` becomes a function with optional params, like `routes.auth.createAccount`. | One way into Nova aula with a day, matching the design's `abrirForm`. |
| D-12 | Refreshing: no polling and no new push. The week list has pull-to-refresh (`RefreshControl`, refetches the shown week). A successful batch creation (`useCreateClasses` `onSuccess`) invalidates `["classes", "week"]`, so the Aulas tab shows the new classes after "Nova aula" goes back. A `class.assigned` push received with the app open invalidates `["classes", "week"]` too. | Simple and enough for a small school; avoids a push to every user per batch. |
| D-13 | Tapping a `class.assigned` push, after the account reload `useNotificationResponse` already does: when the account resolves to the `instructor` flow → `router.push(routes.instructor.classes)`; to the `admin` flow → `router.push(routes.admin.classes)`; otherwise the existing `router.replace(routes.home)`. Every other push keeps its behavior. | A batch has many classes and its payload (`count`, `discipline`) names none; the current week is where new classes usually are. |
| D-14 | Routes: `/student/class/[id]`, `/instructor/class/[id]`, `/admin/class/[id]` — route files in each role's `Stack` (outside `(tabs)`), rendering `ClassDetailsScreen`; `routes.<role>.classDetail(id)` in `src/constants/routes.ts`. The student's Agenda (`(tabs)/index.tsx`) renders `ClassesWeekScreen`, and the `StudentScreen` placeholder is deleted. | Inner screens open above the tab bar, as the technical context requires; access stays with `resolveFlow`. |
| D-15 | States: while a week or a class loads, an `ActivityIndicator` in `grape`; a failed load shows "Não foi possível carregar as aulas." with "Tentar novamente" (refetch) on the week, and "Não foi possível carregar a aula." with "Tentar novamente" on the details; a 404 on the details shows "Esta aula não existe mais." with no retry; an empty day shows "Sem aulas neste dia."; `SessionExpiredError` shows nothing (the session flow handles it). Queries use TanStack Query's defaults except `retry: false` for a 404. | Every state the screens can reach is defined, as in the earlier list screens (spec 027). |
| D-16 | Copy keys live in `src/i18n/messages/{pt-BR,en-US,es-ES}.ts` under `classesWeek` and `classDetails`; the pt-BR strings are the ones quoted in this spec, en-US uses the strings below, and es-ES is translated by the executor. en-US: "This week", "Last week", "Next week", "{{count}} weeks ago", "In {{count}} weeks", "Today", "{{count}} class" / "{{count}} classes", "No classes on this day.", "Create class", "Create class on this day", "New class", "Couldn't load the classes.", "Try again", "In progress", "Finished", "Details", "Today" / "Tomorrow" / "Yesterday", "Started at {{start}} and ends at {{end}}.", "Class finished", "Ended at {{end}}.", "Instructor" / "Instructors", "You", "Max. {{count}} student" / "Max. {{count}} students", "Notes", "Location", "Couldn't load the class.", "This class no longer exists.". | No text is hard-coded; the three locales stay in one place. |

## Expected Results

### ER-01 — The week list returns the classes of one Fortaleza week

- **Front:** backend
- **Behavior:** Given classes stored (through Prisma) starting at Sunday 2026-10-11 23:59, Monday 2026-10-12 00:00,
  Wednesday 2026-10-14 08:00 and 16:00 (two instructors, named "Bruno" and "ana"), Sunday 2026-10-18 23:00 and
  Monday 2026-10-19 00:00 — all Fortaleza times —, when an approved account calls `GET /classes?date=2026-10-15`,
  then the API answers 200 with `weekStart: "2026-10-12"` and exactly the four classes from the 12th 00:00 to the
  18th 23:00, in start order, each with its location `{ id, name, address }`, its instructors `[{ id, name }]`
  ("ana" before "Bruno"), `capacity`, `notes` (`null` when none) and ISO `startsAt` / `endsAt`.
- **Edge and error cases:** `date=2026-10-12` and `date=2026-10-18` answer the same week; a week with no class
  answers `{ weekStart, items: [] }`; two classes with the same start come in `endsAt` then `id` order.
- **Verify by:** `apps/backend/test/classes.e2e-spec.ts` → `week` → "lists the classes of the week that holds the
  date, in Fortaleza time" and "answers an empty week" (`npm run test:e2e --workspace apps/backend`);
  `modules/classes/test/school-class/usecase/list-week-classes.usecase.test.ts`.

### ER-02 — The week list checks the date and the account

- **Front:** backend
- **Behavior:** Given an approved student, instructor and admin, when each calls `GET /classes?date=2026-10-15`,
  then each gets 200; when an approved account calls it with no `date`, with `date=15/10/2026` or with
  `date=2026-02-30`, then the API answers 422 with `errors: ["class.date.invalid"]`.
- **Edge and error cases:** a pending account (any role) → 403 `user.status.notApproved`, checked before the date
  (a pending account with a bad date gets 403); no or invalid token → 401 `auth.token.invalid`.
- **Verify by:** `apps/backend/test/classes.e2e-spec.ts` → `week` → "lets every approved role read the week",
  "refuses a missing, malformed or impossible date" and `access` → "refuses a pending account the week and the
  class"; `list-week-classes.usecase.test.ts`.

### ER-03 — One class can be read by its id

- **Front:** backend
- **Behavior:** Given a stored class, when an approved account calls `GET /classes/<its id>`, then the API answers
  200 with the same `ClassItem` the week list gives for it.
- **Edge and error cases:** a UUID with no class → 404 `class.notFound`; `GET /classes/not-a-uuid` → 404
  `class.notFound`; a pending account → 403 `user.status.notApproved`; no token → 401;
  `GET /classes/time-range-suggestions` still answers the suggestions for an admin (and 403 `user.role.notAdmin`
  for a student), not a 404.
- **Verify by:** `apps/backend/test/classes.e2e-spec.ts` → `class` → "answers one class with its location and
  instructors", "answers 404 for an unknown or malformed id" and `suggestions` (existing tests still green);
  `modules/classes/test/school-class/usecase/get-class.usecase.test.ts`.

### ER-04 — A class's state follows the clock

- **Front:** classes
- **Behavior:** Given a class from 08:00 to 09:30, when `getClassState` is called with `now` 1 ms before 08:00, at
  08:00, 1 ms before 09:30 and at 09:30, then it returns `not-started`, `started`, `started` and `finished`.
- **Edge and error cases:** a `now` days before or after gives `not-started` / `finished`; the function reads no
  clock of its own.
- **Verify by:** `npx jest test/school-class/model/class-state.test.ts` from `modules/classes`.

### ER-05 — The week view opens on the current week for every role

- **Front:** mobile
- **Behavior:** Given a signed-in approved account that finished onboarding, when it opens its classes tab — the
  student's Agenda (first tab), the instructor's and the admin's Aulas —, then the screen shows the title
  ("Agenda" or "Aulas"), "Esta semana", the current week's caption, today selected in the day strip, and today's
  classes as cards, loaded with `GET /classes?date=<this Monday>`.
- **Edge and error cases:** the student's Agenda no longer shows the "Agenda" placeholder; a phone in another
  time zone shows the Fortaleza week, days and times.
- **Verify by:** `apps/mobile/src/modules/classes/screens/classes-week.screen.test.tsx` → "opens on the current
  week with today selected"; `src/modules/student/student-tabs.navigation.test.tsx`,
  `src/modules/instructor/instructor-tabs.navigation.test.tsx`, `src/modules/admin/admin-tabs.navigation.test.tsx`
  → the classes tab renders the week screen (`npx jest src/modules` from `apps/mobile`); first user journey.

### ER-06 — Moving between weeks

- **Front:** mobile
- **Behavior:** Given the week view on Wednesday of the current week, when the person presses the next arrow, then
  the next week loads (`date=<next Monday>`), the label reads "Próxima semana", Wednesday stays selected and
  "Hoje" appears; pressing the previous arrow twice shows "Semana passada"; three weeks back shows "Há 3
  semanas", three ahead "Daqui a 3 semanas"; "Hoje" returns to the current week with today selected and hides
  itself.
- **Edge and error cases:** each day of the strip shows one dot per class of that day, at most 3 (5 classes → 3
  dots, none → no dot); selecting another day shows that day's cards and "N aulas" with the day's count ("1
  aula"); a week already loaded shows from the cache.
- **Verify by:** `classes-week.screen.test.tsx` → "moves to the next and previous weeks keeping the weekday",
  "returns to today", "shows one dot per class, at most three"; `src/modules/classes/utils/week.test.ts` (Monday
  of a week, relative labels, captions); `src/modules/classes/components/day-strip/day-strip.component.test.tsx`.

### ER-07 — Cards show each class and its state

- **Front:** mobile
- **Behavior:** Given today's classes at 08:00–09:00 (finished), 10:00–11:30 (started) and 16:00–17:00 (not
  started) with the phone's clock at 10:15, when the day is shown, then each card shows the discipline and level
  chips, the time range, the location name and its instructors; the 10:00 card shows "Em andamento" with a `sun`
  border, the 08:00 card "Finalizada", the 16:00 card no state chip; when the clock reaches 16:00 with the screen
  open, the 16:00 card shows "Em andamento" within a minute, without a reload.
- **Edge and error cases:** three instructors show as "Ana · Bruno +1"; one shows alone; a card is pressable and
  opens `routes.<role>.classDetail(id)`.
- **Verify by:** `src/modules/classes/components/class-card/class-card.component.test.tsx` (chips, states,
  instructor footer); `classes-week.screen.test.tsx` → "updates a card's state as the clock passes its start"
  (Jest fake timers); `src/modules/classes/hooks/use-now.hook.test.tsx`.

### ER-08 — Loading, errors, empty days and pull-to-refresh on the week

- **Front:** mobile
- **Behavior:** Given the week view, while the week loads it shows the loading indicator; when the request fails
  it shows "Não foi possível carregar as aulas." and "Tentar novamente", which loads it again; a selected day
  without classes shows "Sem aulas neste dia."; pulling the list down refetches the shown week.
- **Edge and error cases:** `NetworkError` and any non-2xx answer show the same error state; `SessionExpiredError`
  shows no error state.
- **Verify by:** `classes-week.screen.test.tsx` → "shows the loading state", "shows the error and retries", "shows
  an empty day", "refetches the week when pulled".

### ER-09 — The details screen shows the class

- **Front:** mobile
- **Behavior:** Given a class on Wednesday 2026-10-14, 16:00–17:30, surf, beginner, capacity 8, notes "Ponto de
  encontro na barraca 3.", at "Praia do Futuro" / "Av. Zezé Diogo, 1000", taught by the viewer and by "Bruno
  Lima", when the viewer presses its card, then the details screen (`GET /classes/<id>`) shows "Detalhe", the
  "Surf" and "Iniciante" chips, "16:00 – 17:30", the date line ("Hoje · 14 out" on that day), "Instrutores" with
  "Você" and "Bruno Lima" (initials avatars), "Máx. 8 alunos", "Notas" with the notes as written, and "Local" with
  "Praia do Futuro" and "Av. Zezé Diogo, 1000"; `BackButton` returns to the week.
- **Edge and error cases:** no notes → no "Notas" section; one instructor → "Instrutor"; capacity 1 → "Máx. 1
  aluno"; a class tomorrow → "Amanhã · …", yesterday → "Ontem · …", other days → the weekday name; a class in
  another year → the year added; the details open for students, instructors and admins alike, and nothing on the
  screen edits the class.
- **Verify by:** `src/modules/classes/screens/class-details.screen.test.tsx` → "shows the class", "hides the notes
  when there are none", "names the viewer Você", "writes the date relative to today"; second user journey.

### ER-10 — The details screen's states

- **Front:** mobile
- **Behavior:** Given the details of a class that has started, it shows the banner "Em andamento" — "Começou às
  16:00 e termina às 17:30."; of a finished class, "Aula finalizada" — "Terminou às 17:30."; of a class not
  started, no banner. While loading it shows the loading indicator; a failed load shows "Não foi possível carregar
  a aula." with "Tentar novamente"; a 404 `class.notFound` shows "Esta aula não existe mais." without retry.
- **Edge and error cases:** the banner changes from none to "Em andamento" when the clock passes the start with
  the screen open (the minute tick).
- **Verify by:** `class-details.screen.test.tsx` → "shows the started and finished banners", "shows the error and
  retries", "says a missing class no longer exists".

### ER-11 — Admins create classes from the week

- **Front:** mobile
- **Behavior:** Given an admin on the Aulas tab with a day today or later selected, then the header shows the "+"
  button, an empty day shows "Criar aula", and a day with classes shows "Criar aula neste dia" below its cards;
  pressing any of them opens Nova aula with that day already selected as a single-day range (its month shown).
  With a past day selected, only the "+" shows, and it opens Nova aula with no day selected.
- **Edge and error cases:** the student's Agenda and the instructor's Aulas show none of the three buttons; Nova
  aula ignores a `date` param that is malformed or before today and starts as before.
- **Verify by:** `classes-week.screen.test.tsx` → "offers the admin entry points on today and later",
  "offers only the + on a past day", "offers no entry point without canCreate";
  `src/modules/classes/screens/new-class.screen.test.tsx` → "starts on the day passed by the week",
  "ignores a past or malformed day"; first user journey.

### ER-12 — New classes appear in the week after creating them

- **Front:** mobile
- **Behavior:** Given an admin who opened Nova aula from the Aulas tab, when they create a batch that includes a
  day of the shown week, then after the toast and the automatic return the Aulas tab shows the new classes
  without a pull-to-refresh.
- **Edge and error cases:** a failed creation invalidates nothing; the time-range suggestions and locations
  queries keep their current behavior.
- **Verify by:** `src/modules/classes/hooks/use-create-classes.hook.test.tsx` → "invalidates the cached weeks
  after creating"; first user journey.

### ER-13 — A class assignment push leads to the Aulas tab

- **Front:** mobile
- **Behavior:** Given an instructor (or an admin) signed in, when they tap a `class.assigned` push, then after the
  account reload the app opens their Aulas tab (`/instructor/classes` or `/admin/classes`); when a
  `class.assigned` push arrives with the app open, the cached weeks are invalidated so the shown week reloads.
- **Edge and error cases:** if the reloaded account no longer resolves to the instructor or admin flow (e.g. now a
  student), the tap falls back to `routes.home`; `registration.*` pushes keep their behavior.
- **Verify by:** `src/modules/notifications/hooks/use-notification-response.hook.test.tsx` → "opens the Aulas tab
  for a class assignment"; `use-notification-received.hook.test.tsx` → "reloads the weeks when a class assignment
  arrives".

## Tasks

### Classes module (`modules/classes`)

- [x] **T-01** — Add `src/school-class/model/class-state.ts` (`ClassState`, `getClassState`, D-05), export it from
  the model barrel, with `test/school-class/model/class-state.test.ts`.
  Covers: ER-04 · Done when: `npx jest test/school-class/model/class-state.test.ts` passes from `modules/classes`.
  > ✅ 2026-10-16 — added `getClassState`/`ClassState` and its boundary tests; files:
  > `modules/classes/src/school-class/model/class-state.ts`, `modules/classes/src/school-class/model/index.ts`,
  > `modules/classes/test/school-class/model/class-state.test.ts`; verified: `npx jest
  > test/school-class/model/class-state.test.ts` from `modules/classes` (5 passed); deviations: none

- [x] **T-02** — Add the read port `src/school-class/provider/class-view-reader.provider.ts` (`ClassView`,
  `ClassViewReader`, D-03) with an in-memory fake in `test/mock/fake-class-view.reader.ts` (exported from
  `test/mock/index.ts`), and the use case `src/school-class/usecase/list-week-classes.usecase.ts`
  (`ListWeekClasses`: access, `class.date.invalid` through `isValidIsoDate`, the Fortaleza week bounds from the
  date, the order, the instructors sorted by name; D-01) with
  `test/school-class/usecase/list-week-classes.usecase.test.ts` and the fake's own test. Skills:
  [`module-repository`](../../../.claude/skills/module-repository),
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02 · Done when: `npx jest test/school-class` passes from `modules/classes`.
  > ✅ 2026-10-16 — added the `ClassViewReader` port (`ClassView`), its fake, `ListWeekClasses` (Fortaleza Monday-to-Monday
  > bounds, order, `class.date.invalid`) and the shared `toClassItem` (ISO dates, instructors sorted by name); files:
  > `modules/classes/src/school-class/provider/class-view-reader.provider.ts`,
  > `modules/classes/src/school-class/provider/index.ts`, `modules/classes/src/school-class/usecase/class-item.ts`,
  > `modules/classes/src/school-class/usecase/list-week-classes.usecase.ts`,
  > `modules/classes/src/school-class/usecase/index.ts`, `modules/classes/test/mock/fake-class-view.reader.ts`,
  > `modules/classes/test/mock/index.ts`, `modules/classes/test/mock/school-class.factory.ts` (`buildClassView`),
  > `modules/classes/test/school-class/provider/fake-class-view.reader.test.ts`,
  > `modules/classes/test/school-class/usecase/list-week-classes.usecase.test.ts`; verified: `npx jest
  > test/school-class` from `modules/classes` (150 passed, 100% coverage), `tsc --noEmit` and `oxlint` clean;
  > deviations: `ClassItem`/`toClassItem` live in `usecase/class-item.ts` so both use cases share them

- [x] **T-03** — Add the use case `src/school-class/usecase/get-class.usecase.ts` (`GetClass`: access, non-UUID
  and unknown id → `NotFoundError("class.notFound")`, instructors sorted; D-02) with
  `test/school-class/usecase/get-class.usecase.test.ts`. Skill:
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-03 · Done when: `npx jest test/school-class/usecase/get-class.usecase.test.ts` passes.
  > ✅ 2026-10-16 — added `GetClass` (access, non-UUID without lookup and unknown id → `class.notFound`); files:
  > `modules/classes/src/school-class/usecase/get-class.usecase.ts`,
  > `modules/classes/src/school-class/usecase/index.ts`,
  > `modules/classes/test/school-class/usecase/get-class.usecase.test.ts`; verified: `npx jest
  > test/school-class/usecase/get-class.usecase.test.ts` (4 passed); deviations: none

### Backend (`apps/backend`)

- [x] **T-04** — Add `src/modules/classes/class-view-reader.prisma.ts` (`PrismaClassViewReader`, D-03: one
  `findMany` / `findUnique` with the location and the instructors' `user.name`, ordered by `startsAt`, `endsAt`,
  `id`), register it in `classes.module.ts`, with `class-view-reader.prisma.spec.ts`. Skill:
  [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-01, ER-03 · Done when: `npx vitest run src/modules/classes/class-view-reader.prisma.spec.ts` passes
  from `apps/backend`.
  > ✅ 2026-10-16 — added `PrismaClassViewReader` (one `findMany` / `findUnique` with the location and the
  > instructors' `user` id and name, ordered by `startsAt`, `endsAt`, `id`) and registered it; files:
  > `apps/backend/src/modules/classes/class-view-reader.prisma.ts`,
  > `apps/backend/src/modules/classes/class-view-reader.prisma.spec.ts`,
  > `apps/backend/src/modules/classes/classes.module.ts`; verified: `npx vitest run
  > src/modules/classes/class-view-reader.prisma.spec.ts` from `apps/backend` (3 passed), `npx tsc --noEmit` clean;
  > deviations: none

- [x] **T-05** — Add `GET /classes` (query `date`) and `GET /classes/:id` to `classes.controller.ts` (after
  `time-range-suggestions`, D-02) with their cases in `classes.controller.spec.ts`, the `week`, `class` and
  `access` tests named in ER-01–ER-03 in `test/classes.e2e-spec.ts` (classes in the past stored through Prisma),
  and the requests in `classes.integration.http`. Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03 · Done when: `npx vitest run src/modules/classes` and
  `npm run test:e2e --workspace apps/backend` pass.
  > ✅ 2026-10-16 — added `GET /classes?date=` (`week`) and `GET /classes/:id` (`one`) after `time-range-suggestions`,
  > with `PrismaClassViewReader` injected as the controller's last constructor argument; controller specs, the `week`,
  > `class` and `access` e2e tests (e2e assertions filter by the test's own location because the dev database holds
  > other classes) and the REST Client requests; files: `apps/backend/src/modules/classes/classes.controller.ts`,
  > `apps/backend/src/modules/classes/classes.controller.spec.ts`,
  > `apps/backend/src/modules/classes/classes.integration.http`, `apps/backend/test/classes.e2e-spec.ts`; verified:
  > `npx vitest run src/modules/classes` (37 passed), `npm run test:e2e` (387 passed), `tsc --noEmit` clean;
  > deviations: none

### Mobile (`apps/mobile`)

- [x] **T-06** — Data layer in `src/modules/classes/`: the `ClassItem` / `WeekClasses` types in `classes.types.ts`,
  `hooks/use-week-classes.hook.ts` (`["classes", "week", weekStart]`), `hooks/use-class.hook.ts`
  (`["classes", "detail", id]`, no retry on 404), `hooks/use-now.hook.ts` (60 s tick, D-05), and
  `utils/week.ts` (Monday of a date in Fortaleza, adding weeks, the relative week label, the week caption, the
  date line with Hoje / Amanhã / Ontem; D-06, D-09), each with its test; and in `src/constants/routes.ts`
  `routes.<role>.classDetail(id)` and `routes.admin.newClass(params?)` (D-11, D-14), with every caller of
  `routes.admin.newClass` updated.
  Covers: ER-06, ER-07 · Done when: `npx jest src/modules/classes src/modules/admin` passes from `apps/mobile` and
  `npm run check-types --workspace @rochas-surf-school/mobile` exits 0.
  > ✅ 2026-10-16 — added `ClassItem`/`WeekClasses` types, `useWeekClasses`, `useClass` (no retry on 404), `useNow` (60 s
  > tick), `utils/week.ts` (Monday of a date, week arithmetic, relative week, caption, weekday names, Fortaleza day and
  > time of an instant, date line) with tests; `routes.<role>.classDetail(id)` and `routes.admin.newClass(params?)`, the
  > admin home caller and its test updated; files: `apps/mobile/src/constants/routes.ts`,
  > `apps/mobile/src/modules/admin/screens/admin.screen.tsx`, `apps/mobile/src/modules/admin/screens/admin.screen.test.tsx`,
  > `apps/mobile/src/modules/classes/classes.types.ts`, `apps/mobile/src/modules/classes/hooks/use-week-classes.hook.ts`,
  > `.../use-week-classes.hook.test.tsx`, `.../use-class.hook.ts`, `.../use-class.hook.test.tsx`, `.../use-now.hook.ts`,
  > `.../use-now.hook.test.tsx`, `apps/mobile/src/modules/classes/utils/week.ts`, `.../week.test.ts`,
  > `apps/mobile/src/app/(private)/{student,instructor,admin}/class/[id].tsx` (placeholder routes, see deviations);
  > verified: `npx jest src/modules/classes src/modules/admin` from `apps/mobile` (all pass) and
  > `npm run check-types --workspace @rochas-surf-school/mobile` exit 0; deviations: the three `class/[id].tsx` route files
  > exist as empty placeholders because typed routes fail the type check without them — T-11 renders the details screen
  > in them; weekday abbreviations are the first three letters of the weekday name

- [x] **T-07** — `ClassCard` in `src/modules/classes/components/class-card/` (D-08, using `getClassState` from
  `@rochas-surf-school/classes` and the shared `Chip`), with its copy keys in the three locales and
  `class-card.component.test.tsx`.
  Covers: ER-07 · Done when: `npx jest src/modules/classes/components/class-card` passes.
  > ✅ 2026-10-16 — added `ClassCard` (chips, state chip, time range, location pill, instructors footer, `sun` border when
  > started, reduced opacity when finished) with its hook (`getClassState` from `@rochas-surf-school/classes`) and the
  > `classesWeek` / `classDetails` copy in the three locales; files:
  > `apps/mobile/src/modules/classes/components/class-card/{index.ts,class-card.component.tsx,class-card.hook.ts,class-card.types.ts,class-card.component.test.tsx}`,
  > `apps/mobile/src/i18n/messages/en-US.ts`, `apps/mobile/src/i18n/messages/pt-BR.ts`,
  > `apps/mobile/src/i18n/messages/es-ES.ts`; verified: `npx jest src/modules/classes/components/class-card` from
  > `apps/mobile` (9 passed), `npm run check-types` exit 0; deviations: the shared `Chip` has no icon prop, so the
  > discipline and "Em andamento" chips carry no icon (adding one would change a shared component on both platforms); all
  > the screens' copy keys were added here at once

- [ ] **T-08** — `WeekNav` and `DayStrip` in `src/modules/classes/components/{week-nav,day-strip}/` (D-06), with their
  copy keys and tests.
  Covers: ER-06 · Done when: `npx jest src/modules/classes/components/week-nav src/modules/classes/components/day-strip`
  passes.

- [ ] **T-09** — `ClassesWeekScreen` with its hook in `src/modules/classes/screens/classes-week.screen.tsx` /
  `.hook.ts` (props: title key, detail route builder, `canCreate`; D-06, D-07, D-10, D-15: selection, states,
  pull-to-refresh, admin entry points), its copy keys and `classes-week.screen.test.tsx` with the tests named in
  ER-05–ER-08 and ER-11.
  Covers: ER-05, ER-06, ER-07, ER-08, ER-11 · Done when: `npx jest src/modules/classes/screens/classes-week.screen.test.tsx`
  passes.

- [ ] **T-10** — `ClassDetailsScreen` with its hook in `src/modules/classes/screens/class-details.screen.tsx` /
  `.hook.ts` (reads `id` from the route; D-09, D-15; "Você" from the session user's id), its copy keys and
  `class-details.screen.test.tsx` with the tests named in ER-09 and ER-10.
  Covers: ER-09, ER-10 · Done when: `npx jest src/modules/classes/screens/class-details.screen.test.tsx` passes.

- [ ] **T-11** — Route files (D-14): `src/app/(private)/student/(tabs)/index.tsx`,
  `.../instructor/(tabs)/classes.tsx` and `.../admin/(tabs)/classes.tsx` render `ClassesWeekScreen` (admin with
  `canCreate`); `src/app/(private)/{student,instructor,admin}/class/[id].tsx` render `ClassDetailsScreen`; delete
  `src/modules/student/screens/student.screen.tsx` and its test; the three `*-tabs.navigation.test.tsx` cover the
  classes tab and opening a class.
  Covers: ER-05, ER-09 · Done when: `npx jest src/modules/student src/modules/instructor src/modules/admin` passes.

- [ ] **T-12** — Nova aula's optional `date` param in `src/modules/classes/screens/new-class.screen.hook.ts` (and
  the calendar's initial month, D-11), and the invalidation of `["classes", "week"]` in
  `hooks/use-create-classes.hook.ts` (D-12), with the tests named in ER-11 and ER-12.
  Covers: ER-11, ER-12 · Done when: `npx jest src/modules/classes/screens/new-class.screen.test.tsx src/modules/classes/hooks/use-create-classes.hook.test.tsx`
  passes.

- [ ] **T-13** — `class.assigned` in `src/modules/notifications/hooks/use-notification-response.hook.ts` (D-13)
  and `use-notification-received.hook.ts` (D-12), with the tests named in ER-13.
  Covers: ER-13 · Done when: `npx jest src/modules/notifications` passes.

### Verification

- [ ] **T-14** — Run every command in the Verification Plan from the repo root and follow its user journeys on the
  iOS simulator; all pass. Record the output summary and what was seen as evidence. Covers: all · Done when: every
  command exits 0 and both journeys show what they describe.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 030` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 030` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 030` — the backend e2e suite passes (Postgres up, migrations applied).
  - `npx turbo run lint check-types --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
  - `npx turbo run build --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/backend` — builds.
- User journeys (iOS simulator, local backend):
  - Week (admin, then a student and an instructor): as an approved admin, open Aulas: "Esta semana", today
    selected and today's classes as cards (the one under way marked "Em andamento", past ones "Finalizada"). Press
    the next arrow: "Próxima semana", same weekday, "Hoje" shown; press "Hoje": back to today. On a future day
    without classes press "Criar aula": Nova aula opens with that day selected; create one class at a free time:
    the toast shows, the app returns to Aulas and the new card is on that day. Select yesterday: only "+" shows.
    Sign in as a student: Agenda shows the same week and cards with no "+"; as an instructor, Aulas the same.
  - Details: open the class created above as the admin who teaches it: chips, time, "Amanhã · …" (or the
    weekday), "Instrutores" with "Você", "Máx. N alunos", the notes, the location's name and address; back returns
    to the week. Open it as a student: the same, without "Você".

## Memory Impact

- `memory/modules/classes.md` — Classes: the read side (`ClassView`, `ClassViewReader`, `ListWeekClasses`,
  `GetClass`), `getClassState` and its boundaries, the week rule (Monday 00:00 to the next Monday, Fortaleza, by
  start), `class.date.invalid` and `class.notFound`; Who can do what: any approved account lists a week and reads a
  class; Boundaries: the class list and details now exist (remove them from "nothing shows the classes yet").
- `memory/technical-context.md` — Classes: `GET /classes?date=` and `GET /classes/:id` (answer shape, errors,
  route order), `PrismaClassViewReader`; the mobile part: `ClassesWeekScreen` / `ClassDetailsScreen`, the query
  keys `["classes", "week", weekStart]` and `["classes", "detail", id]`, `useNow`, the invalidation after creating
  and on a `class.assigned` push, Nova aula's `date` param; Push: a `class.assigned` tap opens the Aulas tab;
  Fixed conventions → Mobile routes: the `class/[id]` inner routes and `routes.admin.newClass(params?)`.
- `memory/structure.md` — the new files of `modules/classes` (class-state, class-view-reader, the two use
  cases), of the backend classes module, and of `apps/mobile` (screens, components, hooks, `utils/week.ts`, the
  `class/[id]` routes; the student's `StudentScreen` placeholder removed).
- `memory/product.md` — Current state: the week view and class details for the three roles, the admin entry
  points and the `class.assigned` tap; Out of scope: drop the Aulas tab and class details from spec 028's list,
  add this spec's out-of-scope items (seats until enrolment, the student's month view and sport filter, the
  marker for one's own classes, "My classes").
- Source documents (by `spec-finish`, the linked sections): Seeing classes, Class notes visibility and Class states
  implemented; Seats noted as partly implemented (capacity only until enrolment).

## Assumptions

- A class lists the instructors stored for it as they are, including one whose account was deleted or removed
  since: cancelling those assignments and flagging a class without an instructor belong to the spec that handles
  account deletion and the "Sem instrutor" flag. Accepted by the user.
- The phone's clock is close enough to the server's to compute the state and today's date; the backend doesn't
  return a state.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
