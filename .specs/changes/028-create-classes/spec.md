---
id: "028"
slug: create-classes
title: Admins create classes in a batch
status: in-progress
created: 2026-10-14
started: 2026-10-14
base_commit: 5c4c69b936ec934e6c920189d268a1f1ad2b2156
fronts: [classes, notifications, backend, mobile]
depends_on: []
---

# 028 — Admins create classes in a batch

## Goal

An approved admin opens "Criar aulas" from the Ferramentas section of the admin home and, on the Nova aula screen,
creates one class or a whole batch: one class for every chosen day and time range, all sharing the discipline,
level, location, instructors, capacity and notes. Time ranges are suggested from last week's classes, and a location
is picked from the saved ones or added on the spot with a name and an address. Each assigned instructor is told once
per batch. Today no class, location or scheduling concept exists in the product: this spec is the first one, and the
base that the class list, editing, enrolment, ratings and photos build on.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: Class (discipline, level, date, start and end,
  location, instructors, capacity, notes; created one at a time or in a batch that isn't kept), Location, User (role,
  status), Notification; decisions "A batch isn't kept", "All times are America/Fortaleza", "The level is a label
  only".
- Requirements:
  [requirements.md → Class details](../../../.docs/requirements.md#class-details) — discipline, level, date, start and
  end, one location, at least one instructor, capacity, notes up to 300 characters; the level is a label.
  [requirements.md → Time zone](../../../.docs/requirements.md#time-zone) — every class time is America/Fortaleza.
  [requirements.md → Batch creation](../../../.docs/requirements.md#batch-creation) — date range, weekdays, time
  ranges; one class per included day and time range.
  [requirements.md → Time range suggestions](../../../.docs/requirements.md#time-range-suggestions) — suggested from
  the previous week's classes, no saved list.
  [requirements.md → Valid time ranges](../../../.docs/requirements.md#valid-time-ranges) — end after start, no
  overlap within a batch, batches may overlap each other.
  [requirements.md → No classes in the past](../../../.docs/requirements.md#no-classes-in-the-past).
  [requirements.md → Assigning instructors](../../../.docs/requirements.md#assigning-instructors) — only assigning at
  creation, with the notification; unassigning comes with editing.
  [requirements.md → Capacity](../../../.docs/requirements.md#capacity) — admins set it; the "not below seats taken"
  rule applies to editing, which this spec doesn't build.
  [requirements.md → Saved locations](../../../.docs/requirements.md#saved-locations) — partially: name and address
  only, without suggestions or a map (D-04).
- Designs: `.docs/designs/admin-app.html` **AULAS-03A** (New class: the editor in "novo" mode, with the "Novo
  horário" and "Novo local" sheets). The file is a bundled page; its screens live in the embedded "App Admin" document
  (`editorScreen`, `calendario`, and the `novaHora` / `novoLocal` sheets). Parts of the design are out of scope (see
  Scope and D-02, D-09).
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Architecture (ports and
  adapters; who may do what is checked in use cases), Persistence (Prisma 7, migrations named after the module),
  Fixed conventions (error keys, Mobile shared UI, Mobile routes, CTA labels, generator skills, naming), External
  integrations → Push notifications, Applications → `apps/mobile` (TanStack Query, `apiGet` / `apiPost`, `date-fns` +
  `@date-fns/tz`), Automated validation.
- Modules: [modules/auth.md](../../memory/modules/auth.md) (users, roles, statuses; `GET /people`),
  [modules/notifications.md](../../memory/modules/notifications.md) (stored notifications, push catalog, ports from
  the module where the event happens).
- Existing code this builds on:
  - `apps/mobile/src/modules/admin/screens/admin.screen.tsx` — the admin home: "Ferramentas" with the "Entrar na
    escola" row, "Escola" with the "Pessoas" row.
  - `apps/mobile/src/modules/people/hooks/use-people.hook.ts` — the `GET /people` infinite query (`role`, `perPage`).
  - `apps/mobile/src/components/ui/{segmented-control,bottom-modal,text-input,text-area,button,back-button,chip,screen-intro}`
    and `apps/mobile/src/utils/get-initials.ts`.
  - `modules/notifications/src/notification/model/notification.entity.ts` — `NOTIFICATION_TYPES`;
    `modules/notifications/src/notification/usecase/notify.usecase.ts` — `Notify` (store, then push).
  - `apps/backend/src/modules/notifications/notifications.registration-notifier.ts` — the pattern of a notifier
    adapter that logs and swallows every error; `push-messages.ts` — the push catalog.
  - `apps/backend/src/modules/auth/registrations.controller.ts` and `people.controller.ts` — protected controllers
    with admin checks in use cases; `modules/school-rules/src/school-rule/usecase/school-rule-access.ts` — a module
    importing `UserRole` / `UserStatus` from `@rochas-surf-school/auth`.
  - `node_modules/@expo/ui` 57 — `@expo/ui/community/datetime-picker` (`DateTimePicker`), already a dependency of the
    app.

## Scope

### In scope

- A new business module `modules/classes` with the `location` and `school-class` aggregates.
- Locations: `GET /locations` (any approved account) and `POST /locations` (admins) — name and address.
- Classes: `POST /classes/batch` (admins), creating every class of a batch in one transaction, and
  `GET /classes/time-range-suggestions` (admins).
- The `class.assigned` notification (stored and pushed) to each assigned instructor, once per batch.
- The Prisma models and the `classes` migration.
- Mobile: the "Criar aulas" row on the admin home, the `/admin/new-class` route and the Nova aula screen with the
  calendar and weekday filter, time ranges and the "Novo horário" sheet, locations and the "Novo local" sheet, the
  capacity stepper, notes and the instructor picker.
- Copy in pt-BR, es-ES and en-US.

### Out of scope

- The map, address suggestions (Google Maps Platform), editing and archiving locations, the "Gerir" control on
  locations, and the location-change notification — the class-locations spec.
- The "Gerir" control on time ranges (editing or removing a suggestion): there is no saved list of time ranges.
- The Aulas tab (week view, the "+" / "Criar aula" buttons of the design, "Criar aula neste dia") and the class
  detail screen.
- Editing, cancelling and deleting classes; unassigning instructors; the "Class without an instructor" flag.
- Enrolment of any kind: requests, seats taken, guests, the waiting list.
- The instructors' "Surf" / "Skate" subtitle of the design and profile photos (initials only).
- A real count on the "Criar aulas" row, and a "My classes" view for admins who teach.
- The web app (`apps/web`) and the privacy policy: no new provider or kind of personal data.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | This spec delivers creating classes only. Full locations (map, suggestions, edit, archive), the Aulas tab and class details, and editing / cancelling / deleting classes are follow-up specs. | Agreed split: creating classes is valuable alone and reviewable as one unit. |
| D-02 | The entry point is a row "Criar aulas" under "Ferramentas" on the admin home, below "Entrar na escola", built like that row (title and chevron) with no count. The design's entry points on the Aulas tab are not built. | The user's choice; the Aulas tab is still a placeholder. |
| D-03 | A new module `modules/classes` (`@rochas-surf-school/classes`), scaffolded with `config-new-module --skip-web --skip-mobile`, keeping the NestJS module it creates in `apps/backend/src/modules/classes/`. Aggregates `location` (entity `Location`) and `school-class` (entity `SchoolClass` — `Class` is avoided as an identifier). Database tables `locations`, `classes` and `class_instructors` (composite key `class_id` + `user_id`). The module depends on `@rochas-surf-school/shared`, `@rochas-surf-school/auth` (`UserRole`, `UserStatus`), `date-fns` and `@date-fns/tz`. | Scheduling is a product area of its own (`modules.md`); same scaffolding as specs 010 and 015. |
| D-04 | A Location here has a **name** (trimmed, 1–40 characters; unique among all locations ignoring case and accents) and an **address** (trimmed, 1–200 characters, free text). Uniqueness is enforced by a stored `nameKey` (NFD, accents removed, lowercase, trimmed) with a unique index; the use case checks it first (409 `location.name.duplicate`) and the repository maps a unique-constraint violation to the same 409. No map point, no suggestions, no edit, no archive. | The class needs a saved location now; Google Maps (kept as the provider) comes with the class-locations spec. A departure from Saved locations, recorded here. |
| D-05 | `GET /locations` → 200 `{ items: [{ id, name, address }] }`, every location, sorted by `nameKey` then `id`, unpaginated; any account with status `approved`. `POST /locations` body `{ name, address }` → 201 `{ id, name, address }`; admins only. Validation keys: `location.name.required`, `location.name.max.length`, `location.address.required`, `location.address.max.length` (collected into one 422; a non-string counts as missing). | Locations will be shown to every approved user with the classes; creating them is an admin action. |
| D-06 | `POST /classes/batch` body `{ discipline, level, startDate, endDate, weekdays, timeRanges, locationId, instructorIds, capacity, notes? }`: `discipline` `surf` \| `skate`; `level` `beginner` \| `advanced` \| `expert`; `startDate` / `endDate` `YYYY-MM-DD` (inclusive, `endDate` ≥ `startDate`); `weekdays` a non-empty array of ISO weekdays 1 (Monday)–7 (Sunday); `timeRanges` a non-empty array of `{ start, end }` in `HH:mm` (24 h); `instructorIds` a non-empty array of user ids (repeats dropped); `capacity` an integer; `notes` a string or absent. Dates and times are America/Fortaleza; the backend expands the batch — every date of the range whose weekday is listed, times every time range — and stores each class's `startsAt` / `endsAt` in UTC. Answer: 201 `{ count }`. The app sends all seven weekdays for a one-day batch. | Batch expansion is a business rule, so it lives in the domain; the client sends what the admin chose, not instants. |
| D-07 | Validation of a batch, after access, every failure collected into one 422: `class.discipline.invalid`, `class.level.invalid`, `class.dates.invalid` (malformed, impossible date, or `endDate` before `startDate`), `class.weekdays.invalid`, `class.timeRanges.required` (missing or empty), `class.timeRanges.invalid` (malformed time), `class.timeRanges.endBeforeStart` (end not after start), `class.timeRanges.overlap` (two ranges overlap; touching ends such as 08:00–09:00 and 09:00–10:00 don't), `class.capacity.invalid` (not an integer from 1 to 20), `class.notes.max.length` (over 300 characters after trimming; blank notes are stored as none), `class.instructors.required`, `class.location.required` (missing or not a string). When the shape is valid, then, in this order, each answered alone: `class.location.notFound` (422, no location with that id), `class.instructors.invalid` (422, an id that isn't a user with status `approved` and role `instructor` or `admin`), `class.batch.empty` (422, the weekdays exclude every date), `class.batch.tooLarge` (422, more than 200 classes, with `details: { max: 200 }`), `class.startsAt.past` (422, a class would start at or before the clock's now). | One set of rules in the domain, keys of the form `<concept>.<field>.<code>`; the limits are the agreed ones (capacity 1–20 as in the design, at most 200 classes per batch). |
| D-08 | A batch is all-or-nothing: every class and its instructors are written in one Prisma transaction (`SchoolClassRepository.createMany`), and nothing is stored on any refusal. | "Criar N aulas" must mean N, never a partial batch. |
| D-09 | `GET /classes/time-range-suggestions` → 200 `{ items: [{ start, end }] }`: the distinct (start, end) pairs, as `HH:mm` in America/Fortaleza, of the classes whose `startsAt` falls in the previous Monday–Sunday week relative to the clock's now (Monday 00:00 of last week inclusive to Monday 00:00 of this week exclusive, Fortaleza), sorted by start then end. Ranges added with "Novo horário" live only in the form's state and are never sent except as part of a batch. No "Gerir" on time ranges. | Requirements → Time range suggestions; product.md rules out a saved list. |
| D-10 | Access for creating a batch, creating a location and reading suggestions: status other than `approved` → 403 `user.status.notApproved` (checked first), then a role other than `admin` → 403 `user.role.notAdmin`; listing locations needs only `approved`. An unknown user is the guard's 401 `auth.token.invalid`. | Same rule and keys as the other admin routes (registrations). |
| D-11 | Instructors are validated through a `TeacherLookup` port in `modules/classes` (`findTeachers(ids)` → `{ id, role, status }[]` for the ids that exist), implemented in the backend with Prisma. The mobile picker lists approved instructors and admins from the existing `GET /people?role=instructor,admin&perPage=50`, loading every page; each row shows the initials avatar, the name and the role chip (`profile.role.*`); nobody is preselected. | Users live in `auth`; a port keeps `classes` independent of its storage, and the directory route already answers the list. |
| D-12 | New notification type `class.assigned`, details `{ count, discipline }` (`count` = classes of the batch, `discipline` `surf` \| `skate`). After the batch is stored, each assigned instructor except the admin who created it gets one, through a `ClassAssignmentNotifier` port (`classAssigned({ instructorIds, count, discipline })`) implemented by `NotificationsClassAssignmentNotifier`, which logs and swallows every error — a failed notification never changes the 201. Tapping the push uses the app's existing default (reload the account, open `/`). Push copy: see Copy. | Requirements → Assigning instructors; one push per batch avoids flooding an instructor; the creator knows already. |
| D-13 | The app imports from `@rochas-surf-school/classes` the batch expansion (`listBatchClasses`), the time-range checks and the limits (`CLASS_CAPACITY_MIN = 1`, `CLASS_CAPACITY_MAX = 20`, `CLASS_NOTES_MAX = 300`, `CLASS_BATCH_MAX = 200`, `LOCATION_NAME_MAX = 40`, `LOCATION_ADDRESS_MAX = 200`), so "Criar N aulas" counts exactly what the backend creates. `apps/mobile/package.json` declares the dependency. | Technical context: the app uses the same rules as the domain instead of re-implementing them. |
| D-14 | The "Novo horário" sheet uses `DateTimePicker` from `@expo/ui/community/datetime-picker` in time mode for the start and the end (opening at 12:00 and 13:00, as in the design). The calendar is a custom component built from the tokens: Monday first, weekday initials and month names from the date-fns locale of the app language, days before today (Fortaleza) disabled, today ringed in `sun`, the range ends filled in `grape`, the days between on `info-tint`, days excluded by the weekday filter struck through; the previous-month button is disabled on the current month. Tapping a first day sets the start; a later day sets the end; an earlier day moves the start; tapping again after a range starts over; "Limpar" clears both. The weekday filter ("Nos dias", seven toggles, all on by default) shows only when the range spans more than one day. | Matches AULAS-03A; `@expo/ui` is already installed, so no new native dependency. |
| D-15 | Form defaults: discipline Surf, level Iniciante, no dates, no time ranges selected, no location, no instructor, capacity 8, empty notes. The button reads "Criar aula" while the batch has 0 or 1 class, "Criar N aulas" above, and is enabled only when the batch has 1–200 classes, a location and at least one instructor are chosen, and no selected range is past today. Above it, once the batch has classes, the summary "N dias × M horários · <local>". A time range chip is disabled (struck through) when it overlaps a selected one, or when today is among the batch's dates and the range starts at or before now; selecting it is impossible, and a selected range that becomes past stays selected but blocks the button. Above 200 classes the button is disabled and `newClass.tooMany` shows. | AULAS-03A behavior, adjusted to the agreed limits. |
| D-16 | On 201 the app shows the toast `newClass.created` (with `count`) and goes back to the admin home (`router.back()`). Errors: `class.startsAt.past` → `newClass.errors.past`; `class.instructors.invalid` → `newClass.errors.instructors` and the instructors query is refetched; `class.location.notFound` → `newClass.errors.location` and the locations query is refetched; `NetworkError` → `createAccount.errors.noConnection`; `SessionExpiredError` → nothing; anything else → `createAccount.errors.generic`. The form keeps its values on any error. In the "Novo local" sheet a name that matches a loaded location ignoring case and accents shows `locationSheet.duplicate` under the name and disables the button; a 409 `location.name.duplicate` shows the same message and refetches the list; a 201 adds the location to the cached list, selects it and closes the sheet; other errors are toasts as above. | One error mapping per route, as the technical context requires; the design shows the duplicate inline. |
| D-17 | Mobile structure: a new module `apps/mobile/src/modules/classes/` (screens, components, hooks, utils); the route file `apps/mobile/src/app/(private)/admin/new-class.tsx` renders `NewClassScreen`; `routes.admin.newClass = "/admin/new-class"`, an inner route of the admin Stack (above the tab bar, `BackButton`). Discipline and level use the shared `SegmentedControl`; notes use the shared `TextArea` (`maxLength` 300); the sheets use `BottomModal`, `TextInput` and `Button`. Queries: `["locations"]`, `["classes", "time-range-suggestions"]`, `["people", "teachers"]` (all pages); mutations without retry. | Follows Mobile routes and Mobile shared UI; one screen per module folder. |

### Copy

New translation keys (pt-BR / es-ES / en-US), in `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`. Plurals use
i18next's `_one` / `_other` suffixes with `count`. Role chips reuse `profile.role.*`; "Tentar novamente" reuses the
existing retry copy; the generic and no-connection toasts reuse `createAccount.errors.generic` / `.noConnection`.
Weekday and month names come from the date-fns locale.

| Key | pt-BR | es-ES | en-US |
| --- | --- | --- | --- |
| `admin.home.newClassRow` | Criar aulas | Crear clases | Create classes |
| `common.cancel` | Cancelar | Cancelar | Cancel |
| `newClass.title` | Nova aula | Nueva clase | New class |
| `newClass.discipline.label` | Modalidade | Modalidad | Discipline |
| `newClass.discipline.surf` | Surf | Surf | Surf |
| `newClass.discipline.skate` | Skate | Skate | Skate |
| `newClass.level.label` | Nível | Nivel | Level |
| `newClass.level.hint` | só informativo | solo informativo | label only |
| `newClass.level.beginner` | Iniciante | Principiante | Beginner |
| `newClass.level.advanced` | Avançado | Avanzado | Advanced |
| `newClass.level.expert` | Expert | Experto | Expert |
| `newClass.days.label` | Dias | Días | Days |
| `newClass.days.count_one` / `_other` | 1 dia / {{count}} dias | 1 día / {{count}} días | 1 day / {{count}} days |
| `newClass.days.pickOne` | escolha pelo menos 1 | elige al menos 1 | pick at least 1 |
| `newClass.calendar.start` | Toque em um dia para começar | Toca un día para empezar | Tap a day to start |
| `newClass.calendar.pickEnd` | {{date}} · toque em outro dia para um intervalo | {{date}} · toca otro día para un rango | {{date}} · tap another day for a range |
| `newClass.calendar.clear` | Limpar | Borrar | Clear |
| `newClass.calendar.previousMonth` | Mês anterior | Mes anterior | Previous month |
| `newClass.calendar.nextMonth` | Próximo mês | Mes siguiente | Next month |
| `newClass.weekdays.label` | Nos dias | En los días | On |
| `newClass.timeRanges.label` | Horários | Horarios | Times |
| `newClass.timeRanges.pickOne` | escolha pelo menos 1 | elige al menos 1 | pick at least 1 |
| `newClass.timeRanges.hint` | Sugeridos a partir das aulas da semana passada. | Sugeridos a partir de las clases de la semana pasada. | Suggested from last week's classes. |
| `newClass.timeRanges.hintPast` | Os horários que já passaram hoje estão bloqueados. | Los horarios que ya pasaron hoy están bloqueados. | Times that already passed today are blocked. |
| `newClass.timeRanges.hintOverlap` | Horários sobrepostos não podem ir no mesmo lote. | Los horarios superpuestos no pueden ir en el mismo lote. | Overlapping times can't go in the same batch. |
| `newClass.timeRanges.add` | Novo horário | Nuevo horario | New time |
| `timeRangeSheet.title` | Novo horário | Nuevo horario | New time |
| `timeRangeSheet.description` | Defina a hora de início e de fim. Vale só para este lote — não fica nas sugestões. | Define la hora de inicio y de fin. Vale solo para este lote: no queda en las sugerencias. | Set the start and end time. It's for this batch only — it isn't kept as a suggestion. |
| `timeRangeSheet.start` | Início | Inicio | Start |
| `timeRangeSheet.end` | Fim | Fin | End |
| `timeRangeSheet.duration` | Duração: {{duration}} | Duración: {{duration}} | Duration: {{duration}} |
| `timeRangeSheet.hours` | {{hours}} h | {{hours}} h | {{hours}} h |
| `timeRangeSheet.hoursMinutes` | {{hours}} h {{minutes}} min | {{hours}} h {{minutes}} min | {{hours}} h {{minutes}} min |
| `timeRangeSheet.endBeforeStart` | O fim precisa ser depois do início. | El fin debe ser después del inicio. | The end must be after the start. |
| `timeRangeSheet.submit` | Adicionar horário | Añadir horario | Add time |
| `newClass.location.label` | Local | Lugar | Location |
| `newClass.location.pickOne` | escolha um local | elige un lugar | pick a location |
| `newClass.location.add` | Novo local | Nuevo lugar | New location |
| `locationSheet.title` | Novo local | Nuevo lugar | New location |
| `locationSheet.description` | Os alunos veem o nome e o endereço. | Los alumnos ven el nombre y la dirección. | Students see the name and the address. |
| `locationSheet.name` | Nome | Nombre | Name |
| `locationSheet.namePlaceholder` | Ex.: Praia do Futuro | Ej.: Praia do Futuro | E.g. Praia do Futuro |
| `locationSheet.address` | Endereço | Dirección | Address |
| `locationSheet.addressPlaceholder` | Ex.: Av. Zezé Diogo, 5000 – Fortaleza | Ej.: Av. Zezé Diogo, 5000 – Fortaleza | E.g. Av. Zezé Diogo, 5000 – Fortaleza |
| `locationSheet.duplicate` | Já existe um local com este nome. | Ya existe un lugar con este nombre. | A location with this name already exists. |
| `locationSheet.submit` | Salvar local | Guardar lugar | Save location |
| `newClass.capacity.label` | Lotação máxima | Capacidad máxima | Maximum capacity |
| `newClass.capacity.unit` | alunos por aula | alumnos por clase | students per class |
| `newClass.capacity.decrease` | Diminuir | Disminuir | Decrease |
| `newClass.capacity.increase` | Aumentar | Aumentar | Increase |
| `newClass.notes.label` | Notas | Notas | Notes |
| `newClass.notes.optional` | opcional | opcional | optional |
| `newClass.notes.placeholder` | Ex.: Ponto de encontro em frente à barraca do salva-vidas. Traga protetor solar. | Ej.: Punto de encuentro frente a la caseta del socorrista. Trae protector solar. | E.g. Meet in front of the lifeguard tower. Bring sunscreen. |
| `newClass.notes.hint` | Aparece nos detalhes da aula | Aparece en los detalles de la clase | Shown in the class details |
| `newClass.instructors.label` | Instrutores | Instructores | Instructors |
| `newClass.instructors.pickOne` | pelo menos 1 | al menos 1 | at least 1 |
| `newClass.instructors.loadError` | Não foi possível carregar os instrutores. | No se pudo cargar a los instructores. | Couldn't load the instructors. |
| `newClass.summary.days_one` / `_other` | 1 dia / {{count}} dias | 1 día / {{count}} días | 1 day / {{count}} days |
| `newClass.summary.times_one` / `_other` | 1 horário / {{count}} horários | 1 horario / {{count}} horarios | 1 time / {{count}} times |
| `newClass.summary.line` | {{days}} × {{times}} · {{location}} | {{days}} × {{times}} · {{location}} | {{days}} × {{times}} · {{location}} |
| `newClass.submit_one` / `_other` | Criar aula / Criar {{count}} aulas | Crear clase / Crear {{count}} clases | Create class / Create {{count}} classes |
| `newClass.tooMany` | Máximo de {{max}} aulas por vez. | Máximo de {{max}} clases por vez. | At most {{max}} classes at a time. |
| `newClass.created_one` / `_other` | Aula criada / {{count}} aulas criadas | Clase creada / {{count}} clases creadas | Class created / {{count}} classes created |
| `newClass.errors.past` | Um dos horários já passou. Revise as datas e os horários. | Uno de los horarios ya pasó. Revisa las fechas y los horarios. | One of the times has already passed. Check the dates and times. |
| `newClass.errors.instructors` | Um dos instrutores não pode mais dar aulas. | Uno de los instructores ya no puede dar clases. | One of the instructors can no longer teach. |
| `newClass.errors.location` | O local escolhido não existe mais. | El lugar elegido ya no existe. | The chosen location no longer exists. |

Push copy of `class.assigned`, in `apps/backend/src/modules/notifications/push-messages.ts` (`{discipline}` is
"Surf" or "Skate" in every language):

| Locale | Title | Body (count = 1) | Body (count > 1) |
| --- | --- | --- | --- |
| pt-BR | Novas aulas na sua escala | Você foi escalado para 1 aula de {discipline}. | Você foi escalado para {count} aulas de {discipline}. |
| es | Nuevas clases en tu agenda | Te asignaron 1 clase de {discipline}. | Te asignaron {count} clases de {discipline}. |
| en | New classes on your schedule | You've been assigned 1 {discipline} class. | You've been assigned {count} {discipline} classes. |

## Expected Results

### ER-01 — A batch creates one class per included day and time range

- **Front:** backend
- **Behavior:** Given an approved admin, an existing location and an approved instructor, and a clock on
  2026-10-14 10:00 (Fortaleza), when the admin calls `POST /classes/batch` with `startDate` 2026-10-15 (Thursday),
  `endDate` 2026-10-17 (Saturday), `weekdays` [3, 4, 5], `timeRanges` [08:00–09:00, 16:00–17:00], `discipline`
  `surf`, `level` `beginner`, `capacity` 8 and `notes` "  Bring sunscreen  ", then the API answers 201
  `{ count: 4 }` and four classes are stored — Thursday and Friday at 08:00–09:00 and 16:00–17:00 Fortaleza, i.e.
  `startsAt` 11:00Z / 19:00Z — each with the batch's discipline, level, location, capacity, the notes "Bring
  sunscreen", and the instructor.
- **Edge and error cases:** a one-day batch (`startDate` = `endDate`, all weekdays) creates one class per time range;
  repeated instructor ids create one assignment; blank notes are stored as none; classes that overlap classes of an
  earlier batch are created.
- **Verify by:** `cd apps/backend && npx vitest run --config vitest.config.e2e.ts test/classes.e2e-spec.ts -t "creates one class per day and time range"`
  and `cd modules/classes && npx jest test/school-class/usecase/create-class-batch.usecase.test.ts -t "creates"`.

### ER-02 — An invalid batch is refused and nothing is stored

- **Front:** backend
- **Behavior:** Given an approved admin, when `POST /classes/batch` has any shape error of D-07 — e.g. a time range
  10:00–09:00, two ranges 08:00–09:00 and 08:30–09:30, capacity 0 or 21, notes of 301 characters, no instructors,
  an invalid discipline — then the API answers 422 with every key of D-07 that applies in `errors` and no class is
  stored.
- **Edge and error cases:** 08:00–09:00 with 09:00–10:00 is valid; an unknown `locationId` → 422
  `class.location.notFound`; a student's id or a pending instructor's id in `instructorIds` → 422
  `class.instructors.invalid`; weekdays that exclude every date → 422 `class.batch.empty`; 201 classes → 422
  `class.batch.tooLarge` with `details.max` 200; nothing is stored in any of these cases.
- **Verify by:** `cd apps/backend && npx vitest run --config vitest.config.e2e.ts test/classes.e2e-spec.ts -t "refuses"`
  and `cd modules/classes && npx jest test/school-class` (batch rules and use case tests).

### ER-03 — A batch with a class in the past is refused whole

- **Front:** backend
- **Behavior:** Given the clock at 2026-10-14 10:00 Fortaleza, when an admin sends a batch from 2026-10-14 to
  2026-10-16 with ranges 08:00–09:00 and 16:00–17:00, then the API answers 422 `class.startsAt.past` and none of the
  six classes is stored.
- **Edge and error cases:** a class starting exactly at the clock's now is refused; the same batch starting
  2026-10-15 is created (2 days × 2 ranges = 4 classes); the check uses the server clock, not the phone's.
- **Verify by:** `cd modules/classes && npx jest test/school-class/usecase/create-class-batch.usecase.test.ts -t "past"`
  and `cd apps/backend && npx vitest run --config vitest.config.e2e.ts test/classes.e2e-spec.ts -t "past"`.

### ER-04 — Only approved admins create classes and locations or read suggestions

- **Front:** backend
- **Behavior:** Given accounts of each role and status, when they call `POST /classes/batch`, `POST /locations` or
  `GET /classes/time-range-suggestions`, then a non-approved account gets 403 `user.status.notApproved`, an approved
  student or instructor gets 403 `user.role.notAdmin`, and only an approved admin succeeds; `GET /locations`
  answers 200 to any approved account and 403 `user.status.notApproved` to the others.
- **Edge and error cases:** a request without a token → 401 `auth.token.invalid`; a refused request writes nothing.
- **Verify by:** `cd apps/backend && npx vitest run --config vitest.config.e2e.ts test/classes.e2e-spec.ts test/locations.e2e-spec.ts -t "access"`.

### ER-05 — Time-range suggestions come from last week's classes

- **Front:** backend
- **Behavior:** Given the clock on Wednesday 2026-10-14 (Fortaleza) and classes stored on 2026-10-06 08:00–09:00,
  2026-10-08 08:00–09:00 and 2026-10-10 16:00–17:00, when an admin calls `GET /classes/time-range-suggestions`, then
  the answer is 200 `{ items: [{ start: "08:00", end: "09:00" }, { start: "16:00", end: "17:00" }] }`.
- **Edge and error cases:** classes of the current week (from Monday 2026-10-12) or of two weeks ago are ignored; a
  class on Sunday 2026-10-11 23:00 Fortaleza counts; no classes last week → `{ items: [] }`; same start with a
  different end gives two items, sorted by end.
- **Verify by:** `cd modules/classes && npx jest test/school-class/usecase/list-time-range-suggestions.usecase.test.ts`
  and `cd apps/backend && npx vitest run --config vitest.config.e2e.ts test/classes.e2e-spec.ts -t "suggestions"`.

### ER-06 — Admins create locations with a unique name

- **Front:** backend
- **Behavior:** Given an approved admin, when they call `POST /locations` with `{ name: " Praia do Futuro ",
  address: "Av. Zezé Diogo, 5000 – Fortaleza" }`, then the API answers 201 `{ id, name: "Praia do Futuro", address }`
  and `GET /locations` lists it, sorted by name ignoring case and accents.
- **Edge and error cases:** "praia do futuro" or "Práia do Futuro" afterwards → 409 `location.name.duplicate`; an
  empty or 41-character name → 422 `location.name.required` / `location.name.max.length`; an empty or 201-character
  address → 422 `location.address.required` / `location.address.max.length`, collected together; two concurrent
  creations of the same name leave one location and the other gets 409.
- **Verify by:** `cd apps/backend && npx vitest run --config vitest.config.e2e.ts test/locations.e2e-spec.ts` and
  `cd modules/classes && npx jest test/location`.

### ER-07 — Each assigned instructor is told once per batch

- **Front:** backend
- **Behavior:** Given an admin A creates a batch of 4 surf classes assigned to instructor I and to A, when the batch
  is stored, then exactly one `class.assigned` notification with `params { count: 4, discipline: "surf" }` is stored
  for I and pushed to I's phones with the copy of the Copy table, and none is stored for A.
- **Edge and error cases:** a notifier that throws or a push provider that fails leaves the answer 201 and the
  classes stored; a refused batch notifies nobody; an instructor without phones gets the stored notification only.
- **Verify by:** `cd apps/backend && npx vitest run --config vitest.config.e2e.ts test/classes.e2e-spec.ts -t "notifies"`,
  `cd apps/backend && npx vitest run src/modules/notifications/notifications.class-assignment-notifier.spec.ts src/modules/notifications/push-messages.spec.ts`.

### ER-08 — "Criar aulas" on the admin home opens the Nova aula screen

- **Front:** mobile
- **Behavior:** Given an approved admin on the home tab, when they see the Ferramentas section, then it has "Entrar na
  escola" and below it "Criar aulas"; pressing "Criar aulas" opens `/admin/new-class`, which shows the "Nova aula"
  title, a back button that returns to the home, and no tab bar.
- **Edge and error cases:** students and instructors have no such row or route (the route belongs to the admin
  flow).
- **Verify by:** `cd apps/mobile && npx jest src/modules/admin/admin-tabs.navigation.test.tsx -t "new class"` and
  `npx jest src/modules/admin/screens/admin.screen.test.tsx -t "Criar aulas"`.

### ER-09 — The calendar and weekday filter build the batch and its count

- **Front:** mobile
- **Behavior:** Given the Nova aula screen with today 2026-10-14, when the admin taps the 15th then the 17th, turns
  off Saturday in "Nos dias", selects two time ranges, a location and an instructor, then the "Dias" label reads
  "2 dias", the 17th (a Saturday) is struck through, the summary reads "2 dias × 2 horários · <location>" and the
  button reads "Criar 4 aulas" and is enabled.
- **Edge and error cases:** days before today and the previous-month button are disabled; a single selected day hides
  "Nos dias" and counts one class per selected time range ("Criar aula" with one range); "Limpar" clears the range and disables the button;
  without a location, an instructor or a time range the button is disabled; a range giving 201 classes disables it
  and shows "Máximo de 200 aulas por vez.".
- **Verify by:** `cd apps/mobile && npx jest src/modules/classes/components/date-range-calendar src/modules/classes/screens/new-class.screen.test.tsx -t "batch"`.

### ER-10 — Time ranges: suggestions, new ones, and blocked ones

- **Front:** mobile
- **Behavior:** Given suggestions 08:00–09:00 and 16:00–17:00, when the screen opens, then both show as chips with
  the hint "Sugeridos a partir das aulas da semana passada."; "Novo horário" opens a sheet with Início and Fim and the
  duration ("Duração: 1 h"); "Adicionar horário" adds and selects the new range; selecting 08:00–09:00 disables an
  added 08:30–09:30.
- **Edge and error cases:** an end at or before the start shows "O fim precisa ser depois do início." and disables
  "Adicionar horário"; when today is among the dates, ranges that start at or before now are disabled; no suggestions
  → only "Novo horário"; a failed suggestions load shows only "Novo horário" (no toast).
- **Verify by:** `cd apps/mobile && npx jest src/modules/classes/components/time-range-picker src/modules/classes/components/time-range-sheet`.

### ER-11 — Locations: pick one or add one in place

- **Front:** mobile
- **Behavior:** Given saved locations, when the screen opens, then each shows its name and address and none is
  selected ("escolha um local"); tapping one selects it; "Novo local" opens a sheet with Nome and Endereço, and
  "Salvar local" creates it, closes the sheet and selects the new location.
- **Edge and error cases:** a name equal to a listed one ignoring case and accents shows "Já existe um local com este
  nome." and disables the button; a 409 shows the same message; an empty name or address disables the button; other
  failures show a toast and keep the sheet and its text.
- **Verify by:** `cd apps/mobile && npx jest src/modules/classes/components/location-picker src/modules/classes/components/location-sheet src/modules/classes/hooks`.

### ER-12 — Instructors, capacity and notes

- **Front:** mobile
- **Behavior:** Given approved instructors and admins in the directory, when the screen opens, then the Instrutores
  section lists them all (initials, name, role chip), none selected; tapping a row toggles it; the capacity stepper
  starts at 8 and goes from 1 to 20 (the matching button disabled at each end); notes accept up to 300 characters
  with a "n/300" counter.
- **Edge and error cases:** more than 50 teachers are all listed (every page loaded); a failed load shows
  "Não foi possível carregar os instrutores." with "Tentar novamente"; while loading, a loading state.
- **Verify by:** `cd apps/mobile && npx jest src/modules/classes/components/instructor-picker src/modules/classes/components/capacity-stepper src/modules/classes/hooks/use-teachers.hook.test.tsx`.

### ER-13 — Creating: success and failure

- **Front:** mobile
- **Behavior:** Given a valid form for 4 classes, when the admin presses "Criar 4 aulas", then the app sends
  `POST /classes/batch` with the D-06 body (Fortaleza dates, ISO weekdays, `HH:mm` ranges, trimmed notes omitted when
  blank), shows "4 aulas criadas" and returns to the home; for one class the toast reads "Aula criada".
- **Edge and error cases:** while sending the button shows its loading state and a second press sends nothing; 422
  `class.startsAt.past` → "Um dos horários já passou. Revise as datas e os horários."; `class.instructors.invalid` →
  its toast and the instructors reload; `class.location.notFound` → its toast and the locations reload; no answer →
  the no-connection toast; any other error → the generic toast; the form keeps its values.
- **Verify by:** `cd apps/mobile && npx jest src/modules/classes/screens/new-class.screen.test.tsx -t "submit"` and
  `npx jest src/modules/classes/utils/class-error.test.ts`; user journey in the iOS simulator (Verification Plan).

## Tasks

### Classes (`modules/classes`)

- [x] **T-01** — Scaffold `modules/classes` (`@rochas-surf-school/classes`) with `config-new-module --skip-web
  --skip-mobile`, keeping the NestJS module it creates in `apps/backend/src/modules/classes/`; add `.oxlintrc.json`
  and the `check-types` script like `modules/school-rules`; declare `@rochas-surf-school/shared`,
  `@rochas-surf-school/auth`, `date-fns` and `@date-fns/tz` (the mobile app's versions) in its `package.json`.
  Skill: [`config-new-module`](../../../.claude/skills/config-new-module).
  Covers: enabling · Done when: `npm run build --workspace @rochas-surf-school/classes`, its `test`, `lint` and
  `check-types` pass, and the backend builds with the empty `ClassesModule` registered.
  > ✅ 2026-10-14 10:53 — Scaffolded `modules/classes` with `config-new-module --skip-web --skip-mobile` (workspace, NestJS module + controller stub, AppModule registration, backend dependency); added `.oxlintrc.json`, the `lint` and `check-types` scripts and the dependencies on `@rochas-surf-school/shared`, `@rochas-surf-school/auth`, `date-fns` ^4.4.0 and `@date-fns/tz` ^1.5.0 (the mobile app's versions); files: `modules/classes/**`, `apps/backend/src/modules/classes/classes.module.ts`, `apps/backend/src/modules/classes/classes.controller.ts`, `apps/backend/src/app.module.ts`, `apps/backend/package.json`, `package-lock.json`; verified: build, lint, check-types and test of the workspace pass (1 test), `nest build` of the backend passes with `ClassesModule`; deviations: none

- [x] **T-02** — The `location` aggregate: `Location` entity (`name`, `address`, `nameKey`; trims, validates the
  D-04 limits with the shared `Validator`, keys `location.name.*` / `location.address.*`), the
  `LocationRepository` port (`findAll`, `findById`, `existsByNameKey`, `create` — the last rejecting a duplicate with
  a `ConflictError('location.name.duplicate')`) with its in-memory fake, the `ListLocations` (approved, any role) and
  `CreateLocation` (approved admin; 409 on duplicate) use cases, a `normalizeLocationName` helper and the
  `LOCATION_NAME_MAX` / `LOCATION_ADDRESS_MAX` constants, all exported; tests in `test/location/`.
  Skills: [`module-aggregate`](../../../.claude/skills/module-aggregate),
  [`module-entity`](../../../.claude/skills/module-entity),
  [`module-repository`](../../../.claude/skills/module-repository),
  [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-04, ER-06 · Done when: `cd modules/classes && npx jest test/location --coverage` passes with every new
  line covered.
  > ✅ 2026-10-14 10:55 — Added the `location` aggregate: `Location` entity, `normalizeLocationName` and the limits, `LocationRepository` + in-memory fake, `ListLocations`, `CreateLocation` and the shared access helpers (`src/access/class-actor.ts`: `assertCanReadClasses`, `assertCanManageClasses`, keys per D-10);
  > files: `modules/classes/src/access/**`, `modules/classes/src/location/**`, `modules/classes/src/index.ts`, `modules/classes/test/mock/{fake-location.repository,location.factory,index}.ts`, `modules/classes/test/access/class-actor.test.ts`, `modules/classes/test/location/**`;
  > verified: `cd modules/classes && npx jest test/location test/access --coverage` (29 passed, every new line covered), lint and check-types pass; deviations: none

- [x] **T-03** — The pure batch rules in `src/school-class/model/`: `listBatchClasses({ startDate, endDate,
  weekdays, timeRanges })` → `{ startsAt, endsAt }[]` in UTC from America/Fortaleza (`@date-fns/tz`), the time-range
  parsing / end-after-start / overlap checks, and the constants `CLASS_CAPACITY_MIN`, `CLASS_CAPACITY_MAX`,
  `CLASS_NOTES_MAX`, `CLASS_BATCH_MAX`, `CLASS_DISCIPLINES`, `CLASS_LEVELS`, all exported for the app (D-13); tests in
  `test/school-class/model/` including the Thursday–Saturday example, touching ranges and an invalid date.
  Covers: ER-01, ER-02 · Done when: `cd modules/classes && npx jest test/school-class/model --coverage` passes.
  > ✅ 2026-10-14 10:56 — Added the pure batch rules: limits and enums (`class-limits.ts`), time-range parsing / end-after-start / overlap checks (`time-range.ts`), date and weekday validation, `listBatchDates` and `listBatchClasses` (UTC instants from America/Fortaleza via `@date-fns/tz`, optional `max` that stops early so a huge range can't loop long) (`class-batch.ts`);
  > files: `modules/classes/src/school-class/model/{class-limits,time-range,class-batch,index}.ts`, `modules/classes/src/school-class/index.ts`, `modules/classes/src/index.ts`, `modules/classes/test/school-class/model/{time-range,class-batch}.test.ts`;
  > verified: `cd modules/classes && npx jest test/school-class/model --coverage` (28 passed, 100% of the new files), lint and check-types pass; deviations: added the `listBatchDates` / `max` helpers and the date / weekday validators so the use case and the app share the rules (D-13)

- [x] **T-04** — The `school-class` aggregate: `SchoolClass` entity (discipline, level, `startsAt`, `endsAt`,
  `locationId`, `instructorIds`, capacity, notes, `createdBy`; self-validating with the D-07 limits), the ports
  `SchoolClassRepository` (`createMany(classes)` atomic, `findStartingBetween(from, to)`), `TeacherLookup`
  (`findTeachers(ids)`), `ClassAssignmentNotifier` (`classAssigned({ instructorIds, count, discipline })`) and
  `ClockProvider` (`now()`), with in-memory fakes in `test/mock/`; entity tests.
  Skills: [`module-aggregate`](../../../.claude/skills/module-aggregate),
  [`module-entity`](../../../.claude/skills/module-entity),
  [`module-repository`](../../../.claude/skills/module-repository).
  Covers: ER-01, ER-02 · Done when: `cd modules/classes && npx jest test/school-class --coverage` passes.
  > ✅ 2026-10-14 10:56 — Added the `SchoolClass` entity (self-validating: discipline, level, dates with end after start, location, instructors, capacity 1–20, notes ≤ 300, creator) and the ports `SchoolClassRepository` (`createMany`, `findStartingBetween`), `TeacherLookup`, `ClassAssignmentNotifier` and `ClockProvider`, with fakes in `test/mock/` (repository, teacher lookup, notifier, clock, class factory);
  > files: `modules/classes/src/school-class/model/{school-class.entity,index}.ts`, `modules/classes/src/school-class/provider/*.ts`, `modules/classes/test/mock/{fake-school-class.repository,fake-teacher.lookup,fake-class-assignment.notifier,fake-clock.provider,school-class.factory,index}.ts`, `modules/classes/test/school-class/model/school-class.entity.test.ts`, `modules/classes/test/school-class/provider/fake-school-class.repository.test.ts`;
  > verified: `cd modules/classes && npx jest test/school-class --coverage` (46 passed; the entity and the repository fake are fully covered, the other fakes are exercised by the use case tests of T-05), lint and check-types pass;
  > deviations: the entity's own keys come from the shared rules (`class.discipline.in`, `class.capacity.range.value`…); the D-07 keys (`class.discipline.invalid`…) are produced by the use case's shape validation in T-05

- [x] **T-05** — The `CreateClassBatch` use case: access (D-10), the D-07 shape validation collected into one 422,
  then location, teachers, empty batch, size and past checks in that order, `createMany`, then `classAssigned` for
  every instructor except the caller (skipped when none is left), returning `{ count }`; tests for each key, the
  order, all-or-nothing (the fake stores nothing on refusal), repeated ids and the creator exclusion.
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-07 · Done when:
  `cd modules/classes && npx jest test/school-class/usecase/create-class-batch.usecase.test.ts --coverage` passes.
  > ✅ 2026-10-14 10:58 — Added `CreateClassBatch`: access (D-10), D-07 shape validation collected into one 422 (`ValidationException`), then in order location (`class.location.notFound`), teachers (`class.instructors.invalid`), empty batch, size (`details.max` 200) and past checks as 422 `DomainError`s, one `createMany`, then one `classAssigned` for every instructor except the caller (skipped when none is left; a throwing notifier is swallowed), returning `{ count }`;
  > files: `modules/classes/src/school-class/usecase/{create-class-batch.usecase,index}.ts`, `modules/classes/src/school-class/index.ts`, `modules/classes/test/school-class/usecase/create-class-batch.usecase.test.ts`;
  > verified: `cd modules/classes && npx jest test/school-class/usecase/create-class-batch.usecase.test.ts --coverage` (62 passed in the folder run, the use case file 100% lines, branches and functions), lint and check-types pass;
  > deviations: a non-string `notes` answers `class.notes.max.length` (D-07 has no other key for it); a location or instructor id that isn't a UUID is refused as not found / invalid without a lookup

- [x] **T-06** — The `ListTimeRangeSuggestions` use case (D-09): admin access, last Monday–Sunday week in
  Fortaleza from the clock, distinct sorted `HH:mm` pairs; tests for the week edges (Sunday 23:00, this Monday 00:00),
  duplicates, sorting and the empty case.
  Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-04, ER-05 · Done when:
  `cd modules/classes && npx jest test/school-class/usecase/list-time-range-suggestions.usecase.test.ts --coverage`
  passes.
  > ✅ 2026-10-14 10:58 — Added `ListTimeRangeSuggestions` (admin access; last Monday 00:00 inclusive to this Monday 00:00 exclusive in America/Fortaleza from the clock via `date-fns` + `@date-fns/tz`; distinct `HH:mm` pairs sorted by start then end);
  > files: `modules/classes/src/school-class/usecase/{list-time-range-suggestions.usecase,index}.ts`, `modules/classes/test/school-class/usecase/list-time-range-suggestions.usecase.test.ts`;
  > verified: `cd modules/classes && npx jest test/school-class/usecase/list-time-range-suggestions.usecase.test.ts --coverage` (6 passed, file 100%), lint, check-types and build pass; deviations: none

### Notifications (`modules/notifications`)

- [x] **T-07** — Add `class.assigned` to `NOTIFICATION_TYPES` in
  `modules/notifications/src/notification/model/notification.entity.ts`, with a test that a notification of that type
  and params `{ count, discipline }` is valid.
  Covers: ER-07 · Done when: `cd modules/notifications && npx jest --coverage` passes.
  > ✅ 2026-10-14 10:59 — Added `class.assigned` to `NOTIFICATION_TYPES` and a test that a notification of that type with params `{ count, discipline }` is valid;
  > files: `modules/notifications/src/notification/model/notification.entity.ts`, `modules/notifications/test/notification/model/notification.entity.test.ts`;
  > verified: `cd modules/notifications && npx jest --coverage` (88 passed, 11 suites); deviations: none (the backend's push catalog gets its `class.assigned` entry in T-10, so the backend type check is red between T-07 and T-10)

### Backend (`apps/backend`)

- [x] **T-08** — `apps/backend/prisma/models/classes.model.prisma` (`Location` → `locations` with a unique
  `name_key`; `SchoolClass` → `classes` with `starts_at` indexed, `location_id` FK, `created_by` FK to `users`;
  `ClassInstructor` → `class_instructors`, composite key, FKs to `classes` (cascade) and `users`), the migration
  `classes`, and `PrismaLocationRepository` (`apps/backend/src/modules/classes/location.prisma.ts`, P2002 →
  `ConflictError('location.name.duplicate')`) with its spec.
  Skills: [`backend-prisma-sync-module`](../../../.claude/skills/backend-prisma-sync-module),
  [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-06 · Done when: the migration applies on the local database and
  `cd apps/backend && npx vitest run src/modules/classes/location.prisma.spec.ts --coverage` passes.
  > ✅ 2026-10-14 11:00 — Added `apps/backend/prisma/models/classes.model.prisma` (`Location` → `locations` with a unique `name_key`; `SchoolClass` → `classes` with `starts_at` indexed, `location_id` FK, `created_by` FK to `users`; `ClassInstructor` → `class_instructors` with a composite key and FKs to `classes` (cascade) and `users` (cascade); enums `class_discipline`, `class_level`), the back-relations on `User` in `auth.model.prisma`, the migration `20261014135926_classes` (applied on the local database) and `PrismaLocationRepository` (P2002 → `ConflictError('location.name.duplicate')`; a non-UUID id is not looked up);
  > files: `apps/backend/prisma/models/classes.model.prisma`, `apps/backend/prisma/models/auth.model.prisma`, `apps/backend/prisma/migrations/20261014135926_classes/migration.sql`, `apps/backend/src/modules/classes/location.prisma.ts`, `apps/backend/src/modules/classes/location.prisma.spec.ts`;
  > verified: `npm run prisma:migrate:dev -- --name classes` applied the migration; `cd apps/backend && npx vitest run src/modules/classes/location.prisma.spec.ts --coverage` (7 passed, file fully covered except the Nest decorator-metadata branch the coverage policy skips); `tsc --noEmit` and oxlint pass; deviations: `class_instructors.user_id` and `classes.created_by` FK actions are cascade and restrict respectively

- [x] **T-09** — `PrismaSchoolClassRepository` (`school-class.prisma.ts`: `createMany` in one `$transaction` with the
  instructors, `findStartingBetween`) and `PrismaTeacherLookup` (`teacher-lookup.prisma.ts`: id, role and status of
  the given users), with specs.
  Skill: [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-01, ER-05 · Done when: `cd apps/backend && npx vitest run src/modules/classes --coverage` passes.
  > ✅ 2026-10-14 11:00 — Added `PrismaSchoolClassRepository` (`createMany` writes the classes then their instructors in one `$transaction`; `findStartingBetween` reads `[from, to)` with the instructors) and `PrismaTeacherLookup` (id, role and status of the given users), with specs;
  > files: `apps/backend/src/modules/classes/school-class.prisma.ts`, `apps/backend/src/modules/classes/school-class.prisma.spec.ts`, `apps/backend/src/modules/classes/teacher-lookup.prisma.ts`, `apps/backend/src/modules/classes/teacher-lookup.prisma.spec.ts`;
  > verified: `cd apps/backend && npx vitest run src/modules/classes --coverage` (11 passed; only the Nest decorator-metadata branch of each class line is uncovered, which the coverage policy skips), `tsc --noEmit` and oxlint pass; deviations: none

- [x] **T-10** — The `class.assigned` copy in `apps/backend/src/modules/notifications/push-messages.ts` (Copy table,
  singular and plural, discipline as "Surf" / "Skate") and `NotificationsClassAssignmentNotifier`
  (`notifications.class-assignment-notifier.ts`: `Notify` for each instructor with `{ count, discipline }`, every
  error logged and swallowed), exported by `NotificationsModule`, with specs.
  Skill: [`backend-provider-implementation`](../../../.claude/skills/backend-provider-implementation).
  Covers: ER-07 · Done when:
  `cd apps/backend && npx vitest run src/modules/notifications/push-messages.spec.ts src/modules/notifications/notifications.class-assignment-notifier.spec.ts --coverage`
  passes.
  > ✅ 2026-10-14 11:01 — Added the `class.assigned` push copy (pt-BR / es / en, singular and plural, discipline as "Surf" / "Skate") to the catalog and `NotificationsClassAssignmentNotifier` (one `Notify` for all the instructors with `{ count, discipline }`, every error logged and swallowed), registered and exported by `NotificationsModule`;
  > files: `apps/backend/src/modules/notifications/push-messages.ts`, `apps/backend/src/modules/notifications/push-messages.spec.ts`, `apps/backend/src/modules/notifications/notifications.class-assignment-notifier.ts`, `apps/backend/src/modules/notifications/notifications.class-assignment-notifier.spec.ts`, `apps/backend/src/modules/notifications/notifications.module.ts`;
  > verified: `cd apps/backend && npx vitest run src/modules/notifications/push-messages.spec.ts src/modules/notifications/notifications.class-assignment-notifier.spec.ts --coverage` (18 passed), the whole `src/modules/notifications` folder (54 passed), `tsc --noEmit` and oxlint pass (after rebuilding `modules/notifications`); deviations: none

- [x] **T-11** — `locations.controller.ts` (`GET /locations`, `POST /locations` → 201) in
  `apps/backend/src/modules/classes/`, wired in `ClassesModule`, with `locations.integration.http`, the controller spec
  and `apps/backend/test/locations.e2e-spec.ts` (create, list order, duplicates ignoring case and accents, validation,
  access).
  Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-04, ER-06 · Done when: `cd apps/backend && npx vitest run --config vitest.config.e2e.ts test/locations.e2e-spec.ts`
  and the controller spec pass.
  > ✅ 2026-10-14 11:02 — Added `LocationsController` (`GET /locations` → 200, `POST /locations` → 201, protected) wired in `ClassesModule` with `PrismaLocationRepository`; removed the scaffold's stub `ClassesController` (the real one comes in T-12); added `locations.integration.http`, the controller spec and the e2e suite (create and trim, list order ignoring case and accents, duplicates ignoring case and accents, concurrent creation, validation, access for every role and status; the suite deletes the locations it creates);
  > files: `apps/backend/src/modules/classes/locations.controller.ts`, `apps/backend/src/modules/classes/locations.controller.spec.ts`, `apps/backend/src/modules/classes/locations.integration.http`, `apps/backend/src/modules/classes/classes.module.ts`, `apps/backend/src/modules/classes/classes.controller.ts` (deleted), `apps/backend/test/locations.e2e-spec.ts`;
  > verified: `cd apps/backend && npx vitest run --config vitest.config.e2e.ts test/locations.e2e-spec.ts` (12 passed against the local Postgres) and `npx vitest run src/modules/classes/locations.controller.spec.ts` (8 passed), `tsc --noEmit` passes; deviations: none

- [x] **T-12** — `classes.controller.ts` (`POST /classes/batch` → 201, `GET /classes/time-range-suggestions`) in
  `apps/backend/src/modules/classes/`, `ClassesModule` importing `NotificationsModule` and injecting the Prisma
  repositories, the teacher lookup, the class-assignment notifier and a system clock; `classes.integration.http`, the
  controller spec and `apps/backend/test/classes.e2e-spec.ts` (ER-01 to ER-05 and ER-07, with the clock and
  `ExpoPushProvider` overridden by fakes; each test deletes the classes and locations it created).
  Skill: [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05, ER-07 · Done when:
  `cd apps/backend && npx vitest run --config vitest.config.e2e.ts test/classes.e2e-spec.ts` and the controller spec
  pass.
  > ✅ 2026-10-14 11:04 — Added `ClassesController` (`POST /classes/batch` → 201 `{ count }`, `GET /classes/time-range-suggestions` → 200, both protected), a module-local `SystemClockProvider` (so the e2e suite can fake the clock without touching auth's), `ClassesModule` importing `NotificationsModule` and providing the Prisma repositories, the teacher lookup and the clock, `classes.integration.http`, the controller spec and the e2e suite (creation and its stored fields, one-day batch, repeated instructors, blank notes, overlapping earlier batches, every refusal key, 200 vs 201 classes, the past rules, suggestions, access for every role and status, notifications with a fake `ExpoPushProvider` and a fake clock; each test deletes the classes, locations and users it created);
  > files: `apps/backend/src/modules/classes/{classes.controller,classes.controller.spec,classes.module,system.clock,system.clock.spec}.ts`, `apps/backend/src/modules/classes/classes.integration.http`, `apps/backend/test/classes.e2e-spec.ts`, `apps/backend/test/locations.e2e-spec.ts` (lint fix);
  > verified: `cd apps/backend && npx vitest run --config vitest.config.e2e.ts test/classes.e2e-spec.ts` (28 passed), the whole e2e suite (15 files, 373 passed), the whole unit suite (45 files, 298 passed), `tsc --noEmit` and oxlint pass; deviations: none

### Mobile (`apps/mobile`)

- [x] **T-13** — Data layer in `apps/mobile/src/modules/classes/`: declare `@rochas-surf-school/classes` in
  `apps/mobile/package.json`; mock `@expo/ui/community/datetime-picker` in `apps/mobile/jest.setup.ts`; hooks
  `useLocations`, `useCreateLocation` (adds to the `["locations"]` cache on 201), `useTimeRangeSuggestions`,
  `useTeachers` (every page of `GET /people?role=instructor,admin&perPage=50`), `useCreateClasses`; utils
  `class-error.ts` (D-16 mapping) and `batch-request.ts` (form → D-06 body); types; tests for each.
  Covers: ER-11, ER-12, ER-13 · Done when: `cd apps/mobile && npx jest src/modules/classes/hooks src/modules/classes/utils --coverage`
  passes.
  > ✅ 2026-10-14 11:07 — Declared `@rochas-surf-school/classes` in the app, mocked `@expo/ui/community/datetime-picker` in `jest.setup.ts` (a host view that keeps `value` and `onValueChange`), and added the data layer in `src/modules/classes/`: types, hooks `useLocations`, `useCreateLocation` (adds to the `["locations"]` cache on 201), `useTimeRangeSuggestions`, `useTeachers` (every page of `GET /people?role=instructor,admin&perPage=50`), `useCreateClasses`, and utils `class-error.ts` (D-16 mapping), `batch-request.ts` (form → D-06 body) and `locations-cache.ts`, each with tests;
  > files: `apps/mobile/package.json`, `package-lock.json`, `apps/mobile/jest.setup.ts`, `apps/mobile/src/modules/classes/classes.types.ts`, `apps/mobile/src/modules/classes/classes.test-utils.tsx`, `apps/mobile/src/modules/classes/hooks/use-{locations,create-location,time-range-suggestions,teachers,create-classes}.hook.ts` and their `.test.tsx`, `apps/mobile/src/modules/classes/utils/{batch-request,class-error,locations-cache}.ts` and their `.test.ts`;
  > verified: `cd apps/mobile && npx jest src/modules/classes/hooks src/modules/classes/utils --coverage` (27 passed, every new file 100% lines), `tsc --noEmit` and eslint pass; deviations: none

- [x] **T-14** — `DateRangeCalendar` (`src/modules/classes/components/date-range-calendar/`): the month grid, range
  selection, disabled past days and month navigation, "Limpar", and the "Nos dias" weekday toggles (D-14), with tests.
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-09 · Done when: `cd apps/mobile && npx jest src/modules/classes/components/date-range-calendar --coverage`
  passes.
  > ✅ 2026-10-14 11:10 — Added `DateRangeCalendar` (Monday-first month grid from the tokens, localized month and weekday initials via the date-fns locale, days before today and the previous-month button disabled, today ringed in `sun`, ends `grape`, days between `info-tint`, excluded days struck through, tap-to-range logic, "Limpar", and the "Nos dias" `WeekdayFilter` shown only for a range), its `CalendarDay` and `WeekdayFilter` child components, the pure calendar helpers (`utils/calendar.ts`: Fortaleza today and minutes, month grid, `pressDay`), a `CalendarMonth` type, and — ahead of T-18 — every Copy key in the pt-BR, es-ES and en-US message files, since the components read their copy from them;
  > files: `apps/mobile/src/modules/classes/components/{date-range-calendar,calendar-day,weekday-filter}/**`, `apps/mobile/src/modules/classes/utils/calendar.ts`, `apps/mobile/src/modules/classes/utils/calendar.test.ts`, `apps/mobile/src/modules/classes/classes.types.ts`, `apps/mobile/src/i18n/messages/{pt-BR,es-ES,en-US}.ts`;
  > verified: `cd apps/mobile && npx jest src/modules/classes/components/date-range-calendar src/modules/classes/components/calendar-day src/modules/classes/components/weekday-filter src/modules/classes/utils/calendar --coverage` (27 passed, every new component, hook and helper 100%), `tsc --noEmit` and eslint pass;
  > deviations: the Copy keys landed here instead of T-18 (the weekday toggles use "EEEEEE" in pt-BR because date-fns' abbreviated form is the whole name there)

- [x] **T-15** — `TimeRangePicker` (chips: selected, disabled for overlap and past today, the hints, "Novo horário")
  and `TimeRangeSheet` (`BottomModal` with two `DateTimePicker`s in time mode, duration, end-before-start error,
  "Adicionar horário", "Cancelar"), with tests.
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-10 · Done when: `cd apps/mobile && npx jest src/modules/classes/components/time-range-picker src/modules/classes/components/time-range-sheet --coverage`
  passes.
  > ✅ 2026-10-14 11:12 — Added `TimeRangePicker` (chips from the suggestions plus the ranges added on the spot, selected / blocked states, the three hints, "Novo horário") and `TimeRangeSheet` (`BottomModal` with two `DateTimePicker`s in time mode opening at 12:00 and 13:00, duration, end-before-start error, "Adicionar horário", "Cancelar", reset on close), with `utils/time-ranges.ts` (merge, overlap / past blocking, `HH:mm` building); the `DateTimePicker` mock in `jest.setup.ts` now exposes the named export too;
  > files: `apps/mobile/src/modules/classes/components/time-range-picker/**`, `apps/mobile/src/modules/classes/components/time-range-sheet/**`, `apps/mobile/src/modules/classes/utils/time-ranges.ts`, `apps/mobile/src/modules/classes/utils/time-ranges.test.ts`, `apps/mobile/jest.setup.ts`;
  > verified: `cd apps/mobile && npx jest src/modules/classes/components/time-range-picker src/modules/classes/components/time-range-sheet src/modules/classes/utils/time-ranges --coverage` (19 passed, every new file 100%), `tsc --noEmit` and eslint pass; deviations: none

- [x] **T-16** — `LocationPicker` (rows with name and address, the selected one marked, "Novo local") and
  `LocationSheet` (Nome, Endereço, inline duplicate error, "Salvar local", "Cancelar"; creates through
  `useCreateLocation` and selects the result), with tests.
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-11 · Done when: `cd apps/mobile && npx jest src/modules/classes/components/location-picker src/modules/classes/components/location-sheet --coverage`
  passes.
  > ✅ 2026-10-14 11:14 — Added `LocationPicker` (rows with name, address and a check on the selected one — `radio` rows built with `Pressable` — plus "Novo local") and `LocationSheet` (Nome and Endereço with the 40 / 200 limits, inline duplicate message from the loaded list ignoring case and accents, the same message after a 409 with the list reloaded, toasts for other failures keeping the sheet and its text, saves through `useCreateLocation`, hands the new location to the screen, resets on close);
  > files: `apps/mobile/src/modules/classes/components/location-picker/**`, `apps/mobile/src/modules/classes/components/location-sheet/**`;
  > verified: `cd apps/mobile && npx jest src/modules/classes/components/location-picker src/modules/classes/components/location-sheet --coverage` (14 passed, every new file 100%), `tsc --noEmit` and eslint pass; deviations: none (the location list has no loading or error state of its own: an empty list just shows "Novo local")

- [x] **T-17** — `CapacityStepper` (−/+ `TouchableOpacity` buttons of 44 pt, the number in Barlow Condensed, bounds
  1–20) and `InstructorPicker` (rows with initials, name, role chip and a check box; loading and error-with-retry
  states), with tests.
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-12 · Done when: `cd apps/mobile && npx jest src/modules/classes/components/capacity-stepper src/modules/classes/components/instructor-picker --coverage`
  passes.
  > ✅ 2026-10-14 11:14 — Added `CapacityStepper` (−/+ `TouchableOpacity` buttons of 44 pt, the number in Barlow Condensed via `ds-text-lesson-time`, each button off at its bound) and `InstructorPicker` (check rows with the people module's `PersonAvatar`, name and role `Chip`, loading state and error with retry reusing `registrations.retry`);
  > files: `apps/mobile/src/modules/classes/components/capacity-stepper/**`, `apps/mobile/src/modules/classes/components/instructor-picker/**`;
  > verified: `cd apps/mobile && npx jest src/modules/classes/components/capacity-stepper src/modules/classes/components/instructor-picker --coverage` (9 passed, both components 100%), `tsc --noEmit` and eslint pass; deviations: none

- [x] **T-18** — `NewClassScreen` (`src/modules/classes/screens/new-class.screen.tsx`) with `useNewClassScreen`:
  `BackButton`, `ScreenIntro` "Nova aula", the sections in the design's order (Modalidade, Nível, Dias, Horários,
  Local, Lotação máxima, Notas, Instrutores), the D-15 defaults, count, summary and button, submit with the D-16
  success and error handling; every Copy key in the three message files; tests.
  Skills: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills),
  [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-09, ER-13 · Done when: `cd apps/mobile && npx jest src/modules/classes/screens --coverage` passes.
  > ✅ 2026-10-14 11:28 — Added `NewClassScreen` with `useNewClassScreen` and the `FormSection` block: `BackButton`, `ScreenIntro` "Nova aula", the sections in the design's order (Modalidade, Nível, Dias, Horários, Local, Lotação máxima, Notas, Instrutores), the D-15 defaults (Surf, Iniciante, capacity 8), the day count, the "N dias × M horários · local" summary, the "Criar aula / Criar N aulas" button enabled only for 1–200 classes with a location, an instructor and no past range, the `tooMany` message, and the D-16 submit (toast and `router.back()` on 201; the past / instructors / location / no-connection / generic toasts; the instructors and locations reloaded when stale; nothing for an expired session; the form kept on any error; a ref guard against a double press); a new range from the sheet is selected unless it overlaps or has started; `sortTimeRanges` moved to `utils/time-ranges.ts`;
  > files: `apps/mobile/src/modules/classes/screens/new-class.screen.tsx`, `apps/mobile/src/modules/classes/screens/new-class.screen.hook.ts`, `apps/mobile/src/modules/classes/screens/new-class.screen.test.tsx`, `apps/mobile/src/modules/classes/components/form-section/**`, `apps/mobile/src/modules/classes/utils/time-ranges.ts`, `apps/mobile/src/modules/classes/utils/time-ranges.test.ts`;
  > verified: `cd apps/mobile && npx jest src/modules/classes --coverage` (21 suites, 132 tests passed, every file of the module 100% statements, branches, functions and lines), `tsc --noEmit` and eslint pass;
  > deviations: the Copy keys in the three message files were added in T-14 (the components needed them); the screen shows the day count as the right-hand hint of the "Dias" section

- [x] **T-19** — `routes.admin.newClass` in `src/constants/routes.ts`, the route file
  `src/app/(private)/admin/new-class.tsx`, and the "Criar aulas" row under Ferramentas in
  `src/modules/admin/screens/admin.screen.tsx`; tests in `admin.screen.test.tsx` and
  `src/modules/admin/admin-tabs.navigation.test.tsx`.
  Covers: ER-08 · Done when: `cd apps/mobile && npx jest src/modules/admin --coverage` passes.
  > ✅ 2026-10-14 11:30 — Added `routes.admin.newClass` (`/admin/new-class`), the route file in the admin Stack (so it opens above the tab bar and only the admin flow reaches it), and the "Criar aulas" row below "Entrar na escola" in the admin home's Ferramentas card (title and chevron, no count); tests in `admin.screen.test.tsx` (the row, opening the Nova aula screen, Back to the home) and `admin-tabs.navigation.test.tsx` (the route above the tabs, Back returns to Home with the tab bar);
  > files: `apps/mobile/src/constants/routes.ts`, `apps/mobile/src/app/(private)/admin/new-class.tsx`, `apps/mobile/src/modules/admin/screens/admin.screen.tsx`, `apps/mobile/src/modules/admin/screens/admin.screen.test.tsx`, `apps/mobile/src/modules/admin/admin-tabs.navigation.test.tsx`;
  > verified: `cd apps/mobile && npx jest src/modules/admin --coverage` (8 suites, 58 tests passed, `admin.screen.tsx` fully covered), `tsc --noEmit` and eslint pass; deviations: the "no tab bar" detail isn't asserted — the tab navigator stays mounted under inner routes (as the existing Join the school test shows), so the test checks the route, the screen, Back and the tab bar on return

### Verification

- [ ] **T-20** — Run every command in the Verification Plan from the repo root; all pass. Record the output summary
  as evidence, and follow the user journey in the iOS simulator.
  Covers: all · Done when: every automated command exits 0 and the journey is recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 028` — the tests this spec adds or changes, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 028` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 028` — the backend e2e suite passes, including `test/classes.e2e-spec.ts` and
    `test/locations.e2e-spec.ts` (Postgres up and migrations applied).
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/classes --filter=@rochas-surf-school/notifications --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
- User journeys (iOS simulator, backend running with the migration applied, signed in as the admin review account,
  with at least one approved instructor):
  - Home → "Criar aulas" → Nova aula. "Novo local": add "Praia do Futuro" with an address; it is selected. Pick
    tomorrow and the day after in the calendar, add the time range 08:00–09:00 with "Novo horário", pick the
    instructor, keep capacity 8 → the button reads "Criar 2 aulas" → press it → toast "2 aulas criadas", back on the
    home.
  - Open Nova aula again → 08:00–09:00 is not suggested yet (suggestions come from last week); "Novo local" with
    "praia do futuro" → "Já existe um local com este nome."; a range 10:00–09:00 → "O fim precisa ser depois do
    início.".
  - Switch the app to dark theme and English once: the screen follows the tokens and the copy changes.

## Memory Impact

- `memory/product.md` — Current state: classes can be created in batches by admins, with minimal locations (name and
  address) and the `class.assigned` notification; Class and Location concepts reflect what is stored (a location has
  no map point yet); out of scope: the class-locations follow-up (map, suggestions, edit, archive), the Aulas tab and
  class details, editing / cancelling / deleting classes.
- `memory/technical-context.md` — Applications (`modules/classes` exists; the app depends on it; `@expo/ui`
  `DateTimePicker` in use and mocked in `jest.setup.ts`), the classes and locations routes with their keys (a
  "Classes" subsection like the auth routes), External integrations → Push notifications (`class.assigned`), Mobile
  shared UI if the calendar or stepper move to `src/components/`.
- `memory/structure.md` — the `modules/classes` workspace with its `location` and `school-class` aggregates, the
  backend `classes` adapter, the `classes.model.prisma` file and tables, the mobile `classes` module and the
  `/admin/new-class` route.
- `memory/modules.md` — a new "Classes" module: scheduling classes and keeping locations.
- `memory/modules/classes.md` — new: Class and Location, the batch rules (expansion, limits, all-or-nothing, past
  check), suggestions, permissions, the `TeacherLookup` and `ClassAssignmentNotifier` ports, boundaries with `auth` and
  `notifications`.
- `memory/modules/notifications.md` — the `class.assigned` type, its details and push copy.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
