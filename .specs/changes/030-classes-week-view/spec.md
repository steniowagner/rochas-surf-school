---
id: "030"
slug: classes-week-view
title: "Aulas tab: week view and class details"
status: in-review
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

- [x] **T-08** — `WeekNav` and `DayStrip` in `src/modules/classes/components/{week-nav,day-strip}/` (D-06), with their
  copy keys and tests.
  Covers: ER-06 · Done when: `npx jest src/modules/classes/components/week-nav src/modules/classes/components/day-strip`
  passes.
  > ✅ 2026-10-16 — added `WeekNav` (44 pt arrows, caption, "Hoje" only for another week) and `DayStrip` (seven days Monday
  > first, weekday abbreviation and number, today's number in `sun`, selected day on `grape`, one `lagoon` dot per class,
  > at most 3); files: `apps/mobile/src/modules/classes/components/week-nav/{index.ts,week-nav.component.tsx,week-nav.types.ts,week-nav.component.test.tsx}`,
  > `apps/mobile/src/modules/classes/components/day-strip/{index.ts,day-strip.component.tsx,day-strip.types.ts,day-strip.component.test.tsx}`;
  > verified: `npx jest src/modules/classes/components/week-nav src/modules/classes/components/day-strip` from `apps/mobile`
  > (7 passed), `npm run check-types` exit 0, `npx eslint src/modules/classes` clean; deviations: none

- [x] **T-09** — `ClassesWeekScreen` with its hook in `src/modules/classes/screens/classes-week.screen.tsx` /
  `.hook.ts` (props: title key, detail route builder, `canCreate`; D-06, D-07, D-10, D-15: selection, states,
  pull-to-refresh, admin entry points), its copy keys and `classes-week.screen.test.tsx` with the tests named in
  ER-05–ER-08 and ER-11.
  Covers: ER-05, ER-06, ER-07, ER-08, ER-11 · Done when: `npx jest src/modules/classes/screens/classes-week.screen.test.tsx`
  passes.
  > ✅ 2026-10-16 — added `ClassesWeekScreen` and `useClassesWeekScreen` (selection kept across weeks, relative week label,
  > `WeekNav`, `DayStrip`, day section with its count, cards ticking with `useNow`, loading / error + retry / empty day,
  > pull-to-refresh, the admin "+", "Criar aula" and "Criar aula neste dia" entry points); files:
  > `apps/mobile/src/modules/classes/screens/classes-week.screen.tsx`, `.../classes-week.screen.hook.ts`,
  > `.../classes-week.screen.types.ts`, `.../classes-week.screen.test.tsx`; verified: `npx jest
  > src/modules/classes/screens/classes-week.screen.test.tsx` from `apps/mobile` (18 passed, 100% statements / lines /
  > functions on the screen and its hook), `npm run check-types` exit 0, eslint clean; deviations: none

- [x] **T-10** — `ClassDetailsScreen` with its hook in `src/modules/classes/screens/class-details.screen.tsx` /
  `.hook.ts` (reads `id` from the route; D-09, D-15; "Você" from the session user's id), its copy keys and
  `class-details.screen.test.tsx` with the tests named in ER-09 and ER-10.
  Covers: ER-09, ER-10 · Done when: `npx jest src/modules/classes/screens/class-details.screen.test.tsx` passes.
  > ✅ 2026-10-16 — added `ClassDetailsScreen` and `useClassDetailsScreen` (reads `id` from the route; chips, time range, date
  > line, started / finished banners ticking with `useNow`, instructors with initials avatars and "Você" from the session
  > user, capacity, notes only when present, location; loading, error + retry, 404 message, nothing on an expired
  > session); files: `apps/mobile/src/modules/classes/screens/class-details.screen.tsx`, `.../class-details.screen.hook.ts`,
  > `.../class-details.screen.types.ts`, `.../class-details.screen.test.tsx`,
  > `apps/mobile/src/modules/classes/hooks/use-class.hook.ts`, `.../use-class.hook.test.tsx`; verified: `npx jest
  > src/modules/classes/screens/class-details.screen.test.tsx src/modules/classes/hooks/use-class` from `apps/mobile`
  > (20 passed, 100% on the screen, its hook and `useClass`), `npm run check-types` exit 0, eslint clean; deviations:
  > `useClass` also skips retrying a `SessionExpiredError` (D-15 says nothing is shown for it, which a pending retry would
  > contradict)

- [x] **T-11** — Route files (D-14): `src/app/(private)/student/(tabs)/index.tsx`,
  `.../instructor/(tabs)/classes.tsx` and `.../admin/(tabs)/classes.tsx` render `ClassesWeekScreen` (admin with
  `canCreate`); `src/app/(private)/{student,instructor,admin}/class/[id].tsx` render `ClassDetailsScreen`; delete
  `src/modules/student/screens/student.screen.tsx` and its test; the three `*-tabs.navigation.test.tsx` cover the
  classes tab and opening a class.
  Covers: ER-05, ER-09 · Done when: `npx jest src/modules/student src/modules/instructor src/modules/admin` passes.
  > ✅ 2026-10-16 — the student's Agenda tab and the instructor's and admin's Aulas tabs now render `ClassesWeekScreen` (admin
  > with `canCreate`); `class/[id]` routes of the three roles render `ClassDetailsScreen`; `StudentScreen` and its test
  > deleted; the three `*-tabs.navigation.test.tsx` cover the classes tab, opening a class and back (and, for admin, the
  > "+" and the day's create button); files: `apps/mobile/src/app/(private)/student/(tabs)/index.tsx`,
  > `apps/mobile/src/app/(private)/instructor/(tabs)/classes.tsx`, `apps/mobile/src/app/(private)/admin/(tabs)/classes.tsx`,
  > `apps/mobile/src/app/(private)/{student,instructor,admin}/class/[id].tsx`,
  > `apps/mobile/src/modules/student/screens/student.screen.tsx` (deleted),
  > `apps/mobile/src/modules/student/screens/student.screen.test.tsx` (deleted),
  > `apps/mobile/src/modules/student/student-tabs.navigation.test.tsx`,
  > `apps/mobile/src/modules/instructor/instructor-tabs.navigation.test.tsx`,
  > `apps/mobile/src/modules/admin/admin-tabs.navigation.test.tsx`; verified: `npx jest src/modules/student
  > src/modules/instructor src/modules/admin` from `apps/mobile` (all pass), `npm run check-types` exit 0, eslint clean;
  > deviations: none

- [x] **T-12** — Nova aula's optional `date` param in `src/modules/classes/screens/new-class.screen.hook.ts` (and
  the calendar's initial month, D-11), and the invalidation of `["classes", "week"]` in
  `hooks/use-create-classes.hook.ts` (D-12), with the tests named in ER-11 and ER-12.
  Covers: ER-11, ER-12 · Done when: `npx jest src/modules/classes/screens/new-class.screen.test.tsx src/modules/classes/hooks/use-create-classes.hook.test.tsx`
  passes.
  > ✅ 2026-10-16 — Nova aula reads an optional `date` route param (`initialRange` in `utils/calendar.ts`: a real
  > `YYYY-MM-DD` that is today or later becomes a single-day range and the calendar opens on its month; anything else is
  > ignored), and `useCreateClasses` invalidates `["classes", "week"]` on success only; files:
  > `apps/mobile/src/modules/classes/utils/calendar.ts`, `apps/mobile/src/modules/classes/utils/calendar.test.ts`,
  > `apps/mobile/src/modules/classes/screens/new-class.screen.hook.ts`,
  > `apps/mobile/src/modules/classes/screens/new-class.screen.test.tsx`,
  > `apps/mobile/src/modules/classes/hooks/use-create-classes.hook.ts`,
  > `apps/mobile/src/modules/classes/hooks/use-create-classes.hook.test.tsx`; verified: `npx jest src/modules/classes
  > src/modules/admin` from `apps/mobile` (all pass), `npm run check-types` exit 0, eslint clean; deviations: test names
  > differ slightly from the spec's ("starts on the day passed by the week" and "ignores the past or malformed day …" sit
  > under "day from the week"; the invalidation also has an "invalidates nothing when creating fails" test)

- [x] **T-13** — `class.assigned` in `src/modules/notifications/hooks/use-notification-response.hook.ts` (D-13)
  and `use-notification-received.hook.ts` (D-12), with the tests named in ER-13.
  Covers: ER-13 · Done when: `npx jest src/modules/notifications` passes.
  > ✅ 2026-10-16 — a tap on a `class.assigned` push, after the account reload, opens `/instructor/classes` or `/admin/classes`
  > for those flows (anything else keeps `router.replace(routes.home)`); a `class.assigned` push received with the app open
  > invalidates `["classes", "week"]` (no account reload); files:
  > `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.ts`,
  > `apps/mobile/src/modules/notifications/hooks/use-notification-response.hook.test.tsx`,
  > `apps/mobile/src/modules/notifications/hooks/use-notification-received.hook.ts`,
  > `apps/mobile/src/modules/notifications/hooks/use-notification-received.hook.test.tsx`; verified: `npx jest
  > src/modules/notifications` from `apps/mobile` (53 passed), `npm run check-types` exit 0, eslint clean; deviations: none

### Verification

- [x] **T-14** — Run every command in the Verification Plan from the repo root and follow its user journeys on the
  iOS simulator; all pass. Record the output summary and what was seen as evidence. Covers: all · Done when: every
  command exits 0 and both journeys show what they describe.
  > ✅ 2026-10-16 — ran the Verification Plan from the repo root: `node .specs/scripts/run-related-tests.mjs 030` RELATED
  > TESTS PASSED (backend, mobile 65 suites / 777 tests, classes 16 suites / 180 tests); `node
  > .specs/scripts/check-coverage.mjs 030` COVERAGE OK (28 files); `node .specs/scripts/run-e2e.mjs 030` E2E PASSED;
  > `npx turbo run lint check-types` for classes, backend, mobile (and design-tokens, web) and `npx turbo run build` for
  > classes and backend: all successful. Fix-ups found while verifying: `student` / `rules-update` / `onboarding` /
  > `root-navigator` tests that expected the old "Student" placeholder header now expect "Schedule" (the Agenda), and the
  > day numbers of `DayStrip` overflowed their cell on the simulator, so a `dayNumber` typography token (26 px Barlow
  > Condensed) was added to `packages/design-tokens/src/tokens.ts` (`tokens.css` regenerated) and the strip uses it
  > (`ds-text-day-number`). Journeys driven on the iOS simulator (iPhone 18 Pro, local backend, signed in as the admin
  > review account, pt-BR): Aulas opens on "Esta semana" with today (Sex 16) selected, the day strip's dots (3 and 2 on
  > Sat/Sun) and today's card; the next arrow shows "Próxima semana" with the same weekday selected and "Hoje"; an empty
  > day shows "Sem aulas neste dia." with "Criar aula"; a card opens "Detalhe" ("Surf" / "Iniciante" chips, time range,
  > "Hoje · 16 out", "Instrutor" with an initials avatar, "Máx. 8 alunos", "Local" with name and address, no "Notas" as
  > it has none) and back returns to the week; "Criar aula neste dia" opens Nova aula with 16 out selected as a single
  > day and the calendar on its month. NOT driven here (left for the reviewer, steps below): creating a class from Nova
  > aula and seeing it appear on return (ER-12), "+" only on a past day, "Você" on the details, and the student and
  > instructor views (no sign-in with other accounts was done). Steps: as admin, on a future day without classes press
  > "Criar aula", pick a time, the location and an instructor, press "Criar aula": the toast shows, the app returns to
  > Aulas and the new card is on that day; select yesterday: only "+" shows; open the class you created as its
  > instructor: "Você" appears; sign in as a student and an instructor: the same week and cards, no "+";
  > files: `packages/design-tokens/src/tokens.ts`, `packages/design-tokens/src/tokens.css`,
  > `apps/mobile/src/modules/classes/components/day-strip/day-strip.component.tsx`,
  > `apps/mobile/src/navigation/root-navigator/root-navigator.component.test.tsx`,
  > `apps/mobile/src/modules/onboarding/screens/school-rules.screen.test.tsx`,
  > `apps/mobile/src/modules/rules-update/screens/rules-update.screen.test.tsx`; verified: the commands above;
  > deviations: journeys only partly driven, see above

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
- `memory/technical-context.md` — Mobile shared UI: `Chip` takes an optional `icon` (an Ionicons name on mobile, a
  `ReactNode` on web); design-tokens: the `dayNumber` type style (`ds-text-day-number`); Classes: `GET /classes?date=`
  and `GET /classes/:id` (answer shape, errors, route order), `PrismaClassViewReader`; the mobile part: `ClassesWeekScreen` / `ClassDetailsScreen`, the query
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

### Round 1 — 2026-10-16 — changes-requested

**Checks**

- lint ✅ · type check ✅ · build ✅ (classes, backend, mobile; `npx turbo run lint check-types` / `build`)
- related tests ✅ `RELATED TESTS PASSED` — mobile 65 suites / 777 tests, classes 16 suites / 180 tests, backend unit
- coverage of the changed lines ✅ `COVERAGE OK` (28 files); no coverage-ignore comments in the diff
- e2e: ✅ `E2E PASSED` — backend 15 files / 387 tests, web (imports design-tokens) 16 passed
- HTTP (local backend): `GET /classes?date=…` and `GET /classes/not-a-uuid` with an invalid token → 401
  `auth.token.invalid` ✅
- Phone in another time zone: `TZ=Pacific/Honolulu npx jest src/modules/classes src/modules/notifications` ✅ 306
  passed; `TZ=Asia/Tokyo` — classes-week and class-details suites ✅, Nova aula see Notes
- iOS simulator (iPhone 18 Pro, local backend, pt-BR), both user journeys of the Verification Plan: admin, student
  and instructor ✅ (details under the Expected Results)

**Expected Results**

- ER-01 ✅ — e2e `week` → "lists the classes of the week that holds the date…" and "answers an empty week";
  `list-week-classes.usecase.test.ts` covers the same-start order (`endsAt`, then `id`)
- ER-02 ✅ — e2e "lets every approved role read the week", "refuses a missing, malformed or impossible date", `access`
  → pending account 403 before the date; invalid token 401 checked by hand
- ER-03 ✅ — e2e `class` (one class equals its week item, 404 for unknown and malformed ids, suggestions route still
  answers 200 / 403); `get-class.usecase.test.ts`
- ER-04 ✅ — `class-state.test.ts` (1 ms before / at start, 1 ms before / at end, days away)
- ER-05 ✅ — screen test; simulator: admin Aulas, student Agenda and instructor Aulas open on "Esta semana", 12 out –
  18 out, Sex 16 selected, today's card
- ER-06 ✅ — screen test (next / previous keeping the weekday, "Há 3 semanas", "Daqui a 3 semanas", Hoje, dots ≤ 3);
  `use-week-classes.hook.test.tsx` → one cache entry per week; simulator: next arrow → "Próxima semana", Sex 23, "Hoje";
  "Hoje" → back to Sex 16, "Hoje" hidden
- ER-07 ✅ behavior (states, sun border, opacity, "Ana · Bruno +1", minute tick with fake timers) — but see F-01 (D-08
  icons)
- ER-08 ✅ — loading, error + retry, `SessionExpiredError` without error state, empty day, pull-to-refresh
- ER-09 ✅ — screen tests; simulator: the class created in the journey shows "Detalhe", Surf / Iniciante, "12:00 –
  13:00", "Sexta-feira · 23 out", "Instrutores" with "Você" (admin) and "Dev Instructor", "Máx. 8 alunos", "Notas",
  "Local"; as the student the same without "Você"; back returns to the week — see F-02 for the initials
- ER-10 ✅ — banners, loading, error + retry, 404 message, banner appearing on the minute tick
- ER-11 ✅ — screen tests and `new-class.screen.test.tsx` → "day from the week"; simulator: "Criar aula" on Sex 23 opens
  Nova aula with 23 out as a single day on October; on yesterday (Qui 15) only "+" shows and it opens Nova aula with no
  day; student and instructor see no "+" and no create buttons
- ER-12 ✅ — `use-create-classes.hook.test.tsx`; simulator: created 12:00–13:00 on Sex 23 → back on Aulas the new card
  ("Dev Admin · Dev Instructor") is there without pulling
- ER-13 ✅ — `use-notification-response.hook.test.tsx` (instructor, admin, now a student → home) and
  `use-notification-received.hook.test.tsx` → "reloads the weeks when a class assignment arrives"

**Findings**

- [x] **F-01** (D-08) — the card's discipline chip and its "Em andamento" chip have no icon; D-08 says "Surf on
  `lagoon`, Skate on `tan`, icon" and "'Em andamento' on `sun` with a clock icon". T-07 records the omission as a
  deviation (the shared `Chip` has no icon prop), but a change to a Decision needs the user's approval and an entry
  under `## Amendments`, and there is none. Reproduce: open Aulas with a class under way — `class-card.component.tsx`
  renders `<Chip>` with text only. Expected: the icons (e.g. an optional `icon` on `Chip`, added on web and mobile with
  the same props, per CLAUDE.md), or D-08 amended with the user's approval.
  > ✅ 2026-10-16 — added an optional `icon` to the shared `Chip` (mobile: an Ionicons name coloured like the tone's
  > label; web: a `ReactNode`) and used it on the `ClassCard`: `water-outline` (Surf), `disc-outline` (Skate) and
  > `time-outline` on "Em andamento". Files: `apps/mobile/src/components/ui/chip/{chip.component.tsx,chip.types.ts,
  > chip.component.test.tsx}`, `apps/web/src/components/ui/chip/{chip.component.tsx,chip.types.ts,
  > chip.component.test.tsx}`, `apps/mobile/src/modules/classes/components/class-card/class-card.component.tsx`.
  > `npx jest src/components/ui/chip src/modules/classes` ✅ 265 passed; web chip vitest ✅; lint + check-types ✅.
  > Deviation: web `icon` is a `ReactNode` (web has no icon set), mobile takes the icon name.
- [x] **F-02** (convention) — `class-details.screen.hook.ts` defines its own `initialsOf` (first letters of the first
  two words) instead of the app-wide `getInitials` from `src/utils/` (first and last word) that the technical context
  names and the other avatars use, so the same person gets different initials on different screens: "Ana Maria de
  Souza" is "AM" on the details and "AS" in the people directory. Expected: use `getInitials`.
  > ✅ 2026-10-16 — `class-details.screen.hook.ts` now uses `getInitials` from `@/utils/get-initials` (own `initialsOf`
  > removed). `npx jest src/modules/classes` ✅ (in the 265 above).
- [x] **F-03** (convention) — `.claude/rules/react.md` §2 import order: `classes-week.screen.hook.ts` imports
  `@/services/api` before `@/constants/routes`, and `classes-week.screen.tsx` imports
  `@/components/ui/button/button.constants` before `@/components/ui/button`. Expected: alphabetical by module path
  within each group.
  > ✅ 2026-10-16 — import order fixed in `classes-week.screen.hook.ts` and `classes-week.screen.tsx`. Lint ✅.

**Notes**

- D-06 quotes the section title as "Segunda · 12 out"; the screen shows the full weekday ("Segunda-feira · 12 out",
  upper-cased by the section-label style). The Decision's example and the implementation differ only in the weekday's
  length — worth aligning with the design when F-01 is fixed, not a finding on its own.
- `useClass` also skips retrying a `SessionExpiredError` (recorded in T-10); consistent with D-15's "shows nothing".
- A failed background refetch of a week that is already cached replaces its cards with the error state; acceptable
  under D-15, but keeping the cached cards would be friendlier.
- Memory Impact: add the new `dayNumber` typography token (`ds-text-day-number`, T-14) to the design-tokens part of the
  technical context.
- With the phone in `TZ=Asia/Tokyo`, `new-class.screen.test.tsx` → "submit › sends once when pressed twice in the same
  frame, and shows the loading state" failed 3 times out of 3 when the whole file ran ("Create 4 classes" still shown
  after the double press), and passed when run alone; it passes in the project's normal setup (related tests above).
  It is a spec-028 test in a file this spec touched; the comparison with the pre-spec files could not be completed
  (Jest hung on single-file runs in this session), so it is not a finding — worth a look by whoever touches Nova aula
  next.
- `npx turbo run lint check-types build` answered from Turbo's cache (same inputs as the executor's run).

### Round 2 — 2026-10-16 — changes-requested

**Checks**

- lint ✅ · type check ✅ (classes, backend, mobile, web; `npx turbo run lint check-types --force`) · build ✅ (classes,
  backend)
- related tests ✅ `RELATED TESTS PASSED` — backend, mobile, web, classes (16 suites / 180 tests)
- coverage of the changed lines ✅ `COVERAGE OK` (29 files, the mobile `Chip` included); no coverage-ignore comments in
  the diff
- e2e ✅ `E2E PASSED` — backend and web (16 passed)
- iOS simulator (iPhone 18 Pro, 402 pt wide, local backend, pt-BR, admin account): Aulas this week, Sáb 17 (three
  classes), a class under way on Sex 16, a card's details and back

**Round 1 findings**

- F-01 — the card's chips now carry the icons (Surf `water-outline`, Skate `disc-outline`, "Em andamento"
  `time-outline`), seen on the simulator and matching AULAS-01's `waves` / `disc` / `clock`; but the wider chips
  broke the card's layout (F-04) and the details screen's chip was left out (F-05).
- F-02 ✅ — the details use `getInitials`: "Dev Instructor" shows "DI".
- F-03 ✅ — import order fixed; lint clean.

**Expected Results**

- ER-01 ✅ · ER-02 ✅ · ER-03 ✅ — e2e `week`, `class`, `access` and `suggestions`; the use-case tests
- ER-04 ✅ — `class-state.test.ts`
- ER-05 ✅ · ER-06 ✅ · ER-08 ✅ — screen tests; simulator: "Esta semana", 12 out – 18 out, Sex 16 selected, dots on
  Sex 16 / Sáb 17 / Dom 18, selecting Sáb 17 shows "3 aulas"
- ER-07 ❌ — states, border and footer hold (tests; simulator: "Em andamento" with its clock icon and `sun` border on
  the 12:00 class), but the time range overflows the card — see F-04
- ER-09 ❌ — the screen tests pass; simulator: "Detalhe", the chips, "12:00 – 13:00", "Amanhã · 17 out", "Instrutor"
  with "DI" / "Você", "Máx. 8 alunos", no "Notas", "Local"; back returns to the week — but the discipline chip has no
  icon, see F-05
- ER-10 ✅ · ER-11 ✅ · ER-12 ✅ · ER-13 ✅ — their tests; code unchanged since round 1, which exercised ER-11 and ER-12
  on the simulator

**Findings**

- [x] **F-04** (ER-07) — since the icons were added (F-01), the chips row is wider and the card's time range no
  longer fits beside it: the chips group doesn't shrink, so the time column runs past the card's right padding and is
  cut by `overflow-hidden`. Reproduce: simulator iPhone 18 Pro (402 pt), admin → Aulas → this week → Sáb 17: the
  "00:00 – 01:00" card and the Skate "12:00 – 13:00" card lose the last digit at the right border; the Surf ·
  Iniciante "12:00 – 13:00" cards end about 4 pt from the border against 16 pt on the left. A longer level
  ("Intermediário") or a narrower phone (375 pt) clips more. Expected: the whole time range stays inside the card's
  padding for every discipline and level on a 375 pt phone — e.g. let the chip group shrink and wrap, or put the time
  on its own row under the chips as AULAS-01's `aulaCard` does.
  > ✅ 2026-10-16 — the time range moved out of the chips' row to its own row under it (as AULAS-01's card), and the
  > chips group is `flex-1 flex-row flex-wrap`, so the discipline and level chips shrink and wrap and the state
  > chip ("Em andamento" / "Finalizada") stays at the right of the row; nothing is wider than the card's padding on a
  > 375 pt phone. Test: the card now asserts which icon each chip draws (`water-outline` / `disc-outline`,
  > `time-outline` only on "Em andamento"), through a `glyph()` helper added to `classes.test-utils.tsx`. Files:
  > `apps/mobile/src/modules/classes/components/class-card/class-card.component.tsx`,
  > `apps/mobile/src/modules/classes/components/class-card/class-card.component.test.tsx`,
  > `apps/mobile/src/modules/classes/classes.test-utils.tsx`. Verified: iOS simulator (iPhone 18 Pro, local backend):
  > Aulas → Sáb 17, the "00:00 – 01:00" and "12:00 – 13:00" cards and the Skate card show the whole range inside the
  > padding; `npx jest src/modules/classes/components/class-card` ✅; `tsc --noEmit` and ESLint ✅.
  > Deviation: none (the 375 pt width was reasoned from the layout, not run on a simulator).
- [x] **F-05** (D-09) — the details screen's discipline chip has no icon: D-09's "the two chips" are D-08's chips
  (discipline with its icon), and AULAS-02's `dHeader` draws the same `waves` / `disc` icon as the card. Reproduce:
  open any class → the "SURF" chip is text only (`class-details.screen.tsx`, the `<Chip>` for the discipline).
  Expected: the same icon as on the card.
  > ✅ 2026-10-16 — the details' discipline chip takes the same icon as the card (`water-outline` for Surf,
  > `disc-outline` for Skate). Tests: "draws the surf icon on the discipline chip" and the skate test now assert the
  > icon. Files: `apps/mobile/src/modules/classes/screens/class-details.screen.tsx`,
  > `apps/mobile/src/modules/classes/screens/class-details.screen.test.tsx`. Verified: iOS simulator: the details of
  > the "00:00 – 01:00" class show the "SURF" chip with its icon; `npx jest src/modules/classes/screens/class-details`
  > ✅ (26 passed with the card tests); deviations: none.

**Notes**

- The mobile `Chip` icon test only checks that the chip has two children, and the `ClassCard` tests don't check which
  icon each chip carries; asserting the icon name (e.g. by the Ionicons `name` prop) would catch a swapped or dropped
  icon.
- `Chip` now takes an `icon` on both platforms (an Ionicons name on mobile, a `ReactNode` on web): add it to the
  Memory Impact for the technical context's Mobile shared UI, next to the round 1 note about the `dayNumber` token.
- Round 1's notes still apply (the section title's full weekday, a failed background refetch replacing cached cards,
  the Nova aula double-press test under `TZ=Asia/Tokyo`).
