# Instructor app inventory (spec 074)

Every frame `instructor-app.html` and `/{lang}/designs/instructor-app` must show. Each entry has a stable id
(`IN-<section number>-<entry number>`): the `.html` prints it in the entry's label, and the web page puts it in the
entry's `data-design-id` attribute. Every entry is one iOS phone frame of the whole screen as an **instructor** sees it
(D-01), with the stack header or the user header the app draws and, on the tab screens, the instructor tab bar
(Início, Aulas, Pessoas, Perfil) with the current tab selected.

**Tall frames** (spec 073 D-02): a frame marked *tall* grows to the whole scrolled content with the mock data, the tab
bar or footer at its bottom; every other frame is 402 × 874. Sheets and toasts are drawn over a phone-height frame.

An entry "matches the code" by the fidelity rule of spec 071 (D-08). The mock account is an instructor from
`apps/web/src/modules/designs/data/fortaleza.ts`; the classes are its Fortaleza classes.

"Other messages" are the texts the same element can show in that state (spec 072 D-02). "Same states as ST-…" points
at the student page's frames of a screen the instructor sees exactly as a student does (D-02); the instructor page
draws that screen's main frame only.

Sources: the route files under `apps/mobile/src/app/(private)/instructor/`, `apps/mobile/src/modules/instructor/`, the
screens and components of `apps/mobile/src/modules/{classes,people,profile,notifications,school-rules}/` as they render
for an approved instructor (`role` props and `user.role` checks, for example `readOnlyNoteKey` in
`class-details.screen.hook.ts`), `apps/mobile/src/components/**`, the toasts of `apps/mobile/src/providers/alert-message/`
and the copy in `packages/app-messages`.

## 01 — Home

| Id | Entry | State |
| --- | --- | --- |
| IN-01-01 | Home | The user header (avatar, greeting, bell with the unread badge), the "Escola" section label and its card with the three entry rows: "Minhas aulas" with `teachingClasses.row.assigned`, "Regras da escola" with the rule count, "Ocupação semanal" with its subtitle; the tab bar. |
| IN-01-02 | Home — nothing assigned | The "Minhas aulas" row with `teachingClasses.row.none`. |
| IN-01-03 | Home — loading | The entry rows without their counts, as while the counts load (or after they fail). |

## 02 — Classes

The instructor's "Aulas" tab: the calendar without the user header or band, the day's class cards without an
enrolment, the sport filter, no "create" button.

| Id | Entry | State |
| --- | --- | --- |
| IN-02-01 | Classes — week | The week row with the marked days, today selected, the day's class cards (one the instructor teaches, one by another instructor, one full, one started, one cancelled), the sport filter button, the tab bar. *Tall.* |
| IN-02-02 | Classes — month | The calendar opened to the month grid. |
| IN-02-03 | Classes — sport filter open | The filter menu open over IN-02-01. |
| IN-02-04 | Classes — filtered | Skate selected: only skate classes listed. |
| IN-02-05 | Classes — loading | The class card skeletons. |
| IN-02-06 | Classes — empty day | The empty state `classesWeek.emptyDay` with the date; no "create" button. |
| IN-02-07 | Classes — load error | The error state `classesWeek.loadError` with the retry button. |

## 03 — Class

The instructor's class details (`/instructor/class/[id]`): read-only, with the note `readOnlyNoteKey` gives, the
people of the class (students and trial guests), the rules card, the location card; no enrolment banner, no footer
button and no tools (those are the student's and the admin's). Every class-details frame is *tall*.

| Id | Entry | State |
| --- | --- | --- |
| IN-03-01 | A class the instructor teaches | Not started, with students: the note `classDetails.readOnly.teaches`, the people group (the instructor rows with "you", the seats line, the student rows). |
| IN-03-02 | A class of another instructor | The note `classDetails.readOnly.notAssigned`. |
| IN-03-03 | Nobody teaches it | The people group with `classDetails.noInstructorAssigned`; the note `classDetails.readOnly.notAssigned`. |
| IN-03-04 | Full class | The full banner with its title only (its waiting-list lines are the student's and the admin's), the seats line `classDetails.soldOut`. |
| IN-03-05 | With trial guests | The guest rows and `classDetails.includesTrial`. |
| IN-03-06 | No students yet | The people group with every seat free (`classDetails.spotsLeft`). |
| IN-03-07 | Started | The started card (`classDetails.started`). |
| IN-03-08 | Finished | The finished card (`classDetails.finished`). |
| IN-03-09 | Class cancelled | The cancelled card (`classDetails.cancelled`); no rules card. |
| IN-03-10 | Person sheet — student | The person sheet of a student of the class (student chip, WhatsApp shared, e-mail, "Fechar"); no admin actions. Other messages: `people.whatsappNotShared`. |
| IN-03-11 | Cancellation rule sheet | The class's cancellation rule opened from "Ler a regra". |
| IN-03-12 | Loading | The class details skeleton. |
| IN-03-13 | Not found | The empty state `classDetails.notFoundState`. |
| IN-03-14 | Load error | The error state `classDetails.errorState` with the retry button. |

## 04 — My classes and history

| Id | Entry | State |
| --- | --- | --- |
| IN-04-01 | My classes | The intro (`teachingClasses.description`), the history header button, the ongoing class card on top (started, with its students), the classes grouped by day ("Hoje", "Amanhã", dates) with "Próxima" on the next one, the sport filter. *Tall.* |
| IN-04-02 | My classes — nothing ongoing | The same list without the ongoing card. |
| IN-04-03 | My classes — filtered | Surf selected: only surf classes. |
| IN-04-04 | My classes — empty | The empty state `teachingClasses.empty`. |
| IN-04-05 | My classes — empty filter | The empty state `teachingClasses.emptyFiltered.surf`. Other messages: `teachingClasses.emptyFiltered.skate`. |
| IN-04-06 | My classes — loading | The skeletons. |
| IN-04-07 | My classes — load error | The error state `teachingClasses.loadError` with the retry button. |
| IN-04-08 | History | The intro (`teachingHistory.description`), the calendar with the days the instructor taught marked and its legend, the classes grouped by day, the sport filter. *Tall.* |
| IN-04-09 | History — day selected | One day selected and the "clear" link with the date. |
| IN-04-10 | History — empty period | The empty state `teachingHistory.emptyPeriod`. Other messages: its sport variant, `teachingHistory.emptyDay` and its sport variant. |
| IN-04-11 | History — loading | The skeletons. |
| IN-04-12 | History — load error | The error state `teachingHistory.loadError` with the retry button. |

## 05 — Weekly occupancy

| Id | Entry | State |
| --- | --- | --- |
| IN-05-01 | Weekly occupancy | The week bar ("Esta semana", previous and next, the calendar button), the stats (occupancy, seats, free, full), the occupancy map with its legend and cells by tone (under 50 %, 50–89 %, 90 %+, full) and one cancelled cell, the selected class's card. *Tall.* |
| IN-05-02 | Another class selected | A full class's cell selected and its card below. |
| IN-05-03 | Another week | The week bar showing `weeklyOccupancy.relativeWeek.next`. Other messages: the other `relativeWeek` texts. |
| IN-05-04 | Week picker sheet | The week picker sheet open, the current week selected. |
| IN-05-05 | Loading | The occupancy map skeleton. |
| IN-05-06 | Empty week | The empty state `weeklyOccupancy.empty`. |
| IN-05-07 | Load error | The error state `weeklyOccupancy.loadError` with the retry button. |

## 06 — People, profile and notifications

| Id | Entry | State |
| --- | --- | --- |
| IN-06-01 | People | The people tab as an instructor sees it (the student's form, ST-04-01), on the instructor tab bar. Same states as ST-04-02 to ST-04-08. *Tall.* |
| IN-06-02 | Profile | The profile with "Instrutor" under the name, on the instructor tab bar. Same sheets and states as ST-05-02 to ST-05-12. *Tall.* |
| IN-06-03 | Edit profile | Same states as ST-05-13 to ST-05-15. |
| IN-06-04 | WhatsApp | Same states as ST-05-16 to ST-05-18. |
| IN-06-05 | School rules | Opened from the home's entry row. Same states as ST-05-19 to ST-05-22. *Tall.* |
| IN-06-06 | Notifications | One row for each notification type the backend sends an instructor (`apps/backend/src/modules/notifications/`), with its in-app text (073 D-05), unread and read. Same states as ST-06-02 to ST-06-05. *Tall.* |
