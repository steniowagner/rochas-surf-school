# Admin app inventory (spec 075)

Every frame `admin-app.html` and `/{lang}/designs/admin-app` must show. Each entry has a stable id
(`AD-<section number>-<entry number>`): the `.html` prints it in the entry's label, and the web page puts it in the
entry's `data-design-id` attribute. Every entry is one iOS phone frame of the whole screen as an **admin** sees it
(D-01), with the stack header or the user header the app draws and, on the tab screens, the admin tab bar (Início,
Aulas, Pessoas, Perfil) with the current tab selected.

**Tall frames** (spec 073 D-02): a frame marked *tall* grows to the whole scrolled content with the mock data, the tab
bar or footer at its bottom; every other frame is 402 × 874. Sheets and toasts are drawn over a phone-height frame.

An entry "matches the code" by the fidelity rule of spec 071 (D-08). The mock account is an admin who also teaches
(spec 070's instructor flag) from `apps/web/src/modules/designs/data/fortaleza.ts`, unless the entry says otherwise;
the classes are its Fortaleza classes.

"Other messages" are the texts the same element can show in that state (spec 072 D-02). "Same states as ST-…" and
"Same states as IN-…" point at the student or instructor page's frames of a screen the admin sees exactly as that role
does (D-02); the admin page draws that screen's main frame only.

Sources: the route files under `apps/mobile/src/app/(private)/admin/`, `apps/mobile/src/modules/admin/`, the screens
and components of `apps/mobile/src/modules/{classes,enrolment,people,profile,notifications,notices,school-rules,school-settings,cancellation-rules}/`
as they render for an approved admin (`canEdit`, `canCreate`, `showFlags`, `role="admin"`, `canChangeRole`,
`canSetInstructorFlag` and `user.role` checks), `apps/mobile/src/components/**`, the toasts of
`apps/mobile/src/providers/alert-message/` and the copy in `packages/app-messages`.

## 01 — Home

| Id | Entry | State |
| --- | --- | --- |
| AD-01-01 | Home | The user header, the "Ferramentas" section with its six tool rows ("Criar aulas", "Inscrições em aulas", "Entrar na escola", "Inscrever aluno", "Contas removidas", "Reativar contas") with the pending counts as badges, the "Escola" section with "Minhas aulas", "Regras da escola", "Ocupação semanal", "Regras de cancelamento", "Enviar aviso" and "Configurações da escola"; the tab bar. *Tall.* |
| AD-01-02 | Home — doesn't teach | An admin without the instructor flag: no "Minhas aulas" row; nothing waiting, so no badges. |
| AD-01-03 | Home — loading | The rows without badges or counts, as while they load (or after they fail). |

## 02 — Classes

The admin's "Aulas" tab: the `tabs.classes` title in the stack header, the "+" header button (`classesWeek.newClass`) on today and later days, the
class cards with the admin's flags (no instructor, no deadline), the sport filter.

| Id | Entry | State |
| --- | --- | --- |
| AD-02-01 | Classes — week | The week row with the marked days, today selected, the "+" header button, the day's class cards (one with the `classesWeek.noInstructor` chip, one with `classesWeek.noDeadline`, one full, one started, one cancelled), the sport filter, the tab bar. *Tall.* |
| AD-02-02 | Classes — month | The calendar opened to the month. |
| AD-02-03 | Classes — filter open | The sport filter menu open. |
| AD-02-04 | Classes — filtered | Skate selected: only skate classes. |
| AD-02-05 | Classes — empty day | The empty state `classesWeek.emptyDay` with the `classesWeek.create` action. |
| AD-02-06 | Classes — past empty day | A past day with no classes: the empty state without the action and no "+" button. |
| AD-02-07 | Classes — loading | The class card skeletons. |
| AD-02-08 | Classes — load error | The error state `classesWeek.loadError` with the retry button. |

## 03 — Class

The class details with `canEdit`: the tools header button while the class can change, no enrolment banner or footer
for the admin, `takeOutSheet.action` on the students of a class that hasn't started.

| Id | Entry | State |
| --- | --- | --- |
| AD-03-01 | Class — open | The tools header button, the date and time, the instructors, the people with their `takeOutSheet.action` buttons and `classDetails.includesTrial`, the trial guests with their chip, the rules, the notes, the location card. *Tall.* |
| AD-03-02 | Class — no instructor | The `classDetails.noInstructor` banner and `classDetails.noInstructorAssigned` in the people. |
| AD-03-03 | Class — no deadline | The `classDetails.noDeadline` banner (with the sport in it). |
| AD-03-04 | Class — full | The full banner with `classDetails.full.newRequestsWait`. Other messages: `classDetails.full.waitingListOff`. |
| AD-03-05 | Class — no students yet | No people yet, `classDetails.spotsLeft`. |
| AD-03-06 | Class — started | The `classDetails.started` banner, the tools button, no `takeOutSheet.action`. |
| AD-03-07 | Class — finished | The `classDetails.finished` banner, no tools button. |
| AD-03-08 | Class — cancelled | The `classDetails.cancelled` banner, no tools button. |
| AD-03-09 | Tools sheet — people enrolled | The class tools sheet: `classTools.edit`, `classTools.notify` with `classTools.notifies`, `classTools.cancel`, and `classTools.delete` disabled with `classTools.deleteEnrolled`. Other messages: `classTools.nobodyToNotify`, `classTools.deleteStarted`. |
| AD-03-10 | Tools sheet — nobody enrolled | `classTools.delete` enabled with `classTools.deleteEmpty`. |
| AD-03-11 | Cancel class sheet | `cancelClass` with the audience list, the guests warning and the optional message. Other messages: `cancelClass.description` (only instructors to notify). |
| AD-03-12 | Delete class sheet | `deleteClass` with its confirm button. |
| AD-03-13 | Delete class — not empty | The `deleteClass.notEmpty` state. |
| AD-03-14 | Take out sheet — student | `takeOutSheet` for a student, with the summary and the optional reason. |
| AD-03-15 | Take out sheet — trial guest | `takeOutSheet.guestTitle` and `takeOutSheet.guestHint`, no reason field if the code draws none. |
| AD-03-16 | Person sheet | A student's person sheet opened from the class. |
| AD-03-17 | Toast — taken out | The class after a take-out with the `takeOutSheet.done` toast. Other messages: `takeOutSheet.guestDone`, `takeOutSheet.errors.*`, `cancelClass.done`, `cancelClass.errors.*`, `deleteClass.done`, `deleteClass.errors.*`. |
| AD-03-18 | Class — loading | The class details skeleton. |
| AD-03-19 | Class — not found | The `classDetails.notFoundState` state. |
| AD-03-20 | Class — load error | The `classDetails.errorState` state with the retry button. |

## 04 — Create and edit classes

| Id | Entry | State |
| --- | --- | --- |
| AD-04-01 | New class — empty | The form with surf selected and nothing picked: discipline, level, the days calendar (`newClass.calendar.start`), times, location, capacity, notes, instructors, each section with its "pick" hint; the submit button. *Tall.* |
| AD-04-02 | New class — filled | A range of days with one removed day, two times picked, a location, the capacity, notes, two instructors, the summary line and `newClass.submit_other`. *Tall.* |
| AD-04-03 | New time sheet | `timeRangeSheet` with its start and end. Other messages: `timeRangeSheet.endBeforeStart`. |
| AD-04-04 | Locations — managing | The location picker in its `locationPicker.manage` mode, with a removed location. |
| AD-04-05 | Remove location sheet | `archiveLocation` with `archiveLocation.kept`. |
| AD-04-06 | Toast — classes created | The `newClass.created_other` toast. Other messages: `newClass.created_one`, `newClass.tooMany`, `newClass.errors.*`, `newClass.instructors.loadError`. |
| AD-04-07 | New location | The full-screen map (drawn with tokens, D-07), the search header, `locationSheet.myLocation`, the panel with `locationSheet.title`, `locationSheet.pointHintEmpty` and the name field. Other messages: `locationSheet.resolving`, `locationSheet.locationDenied`. |
| AD-04-08 | New location — point picked | The pin on the map, the address card with `locationSheet.pointPicked`, the name filled, the save button. |
| AD-04-09 | Edit location | `locationSheet.editTitle`, the notify checkbox with `locationSheet.notifyCount`, `locationSheet.remove`. Other messages: `locationSheet.updated`, `locationSheet.errors.gone`. |
| AD-04-10 | New location — duplicate name | The name field in its error state, `locationSheet.duplicate`. |
| AD-04-11 | Edit class | The class's form with its values, the guests warning, `editClass.noteWithAudience` and `editClass.submit`. *Tall.* |
| AD-04-12 | Edit class — started | The `editClass.started` banner, only the instructors editable. |
| AD-04-13 | Edit class — loading | The form while the class loads. Other messages: `editClass.saved`, `editClass.errors.*`. |

## 05 — Notices

| Id | Entry | State |
| --- | --- | --- |
| AD-05-01 | Send notice | The intro, the audience control on `notices.audience.all` with `notices.count.people`, the empty title and description fields, the send button. |
| AD-05-02 | Send notice — filled | `notices.audience.students` selected, the title and description filled. Other messages: `notices.count.loading`, `notices.count.error`, `notices.count.none`. |
| AD-05-03 | Confirm sheet | `notices.confirm` for the students. Other messages: the `all` and `instructors` descriptions. |
| AD-05-04 | Toast — sent | The `notices.sent` toast. Other messages: `notices.sendError`. |
| AD-05-05 | Message to the class | Opened from the class tools: `notices.classMessage.title`, the class message card with its people summary, the fields. Other messages: `notices.classMessage.count.loading`, `notices.classMessage.count.error`. |
| AD-05-06 | Message to the class — confirm | The confirm sheet with `notices.classMessage.confirm`. Other messages: `notices.classMessage.sent`, `notices.classMessage.sendError`, `notices.classMessage.errors.*`. |

## 06 — Class enrolments

| Id | Entry | State |
| --- | --- | --- |
| AD-06-01 | Class enrolments | The intro with the request and class counts, the requests grouped by class (capacity, spots left), each with `classRequests.approve` and `classRequests.deny`, the sport filter. *Tall.* |
| AD-06-02 | Full class | A full class's group: `classRequests.full`, `classRequests.waitingList` with the positions, `classRequests.fullNote`, enrol blocked. |
| AD-06-03 | Filtered | Surf selected. |
| AD-06-04 | Deny sheet | `classRequests.denySheet`. |
| AD-06-05 | Toast — enrolled | The `classRequests.approved` toast. Other messages: `classRequests.denied`, `classRequests.errors.*`. |
| AD-06-06 | Empty | The empty state `classRequests.empty`. |
| AD-06-07 | Empty filter | `classRequests.emptyFiltered.surf`. Other messages: `classRequests.emptyFiltered.skate`. |
| AD-06-08 | Loading | The skeletons. |
| AD-06-09 | Load error | The error state with the retry button. |

## 07 — Accounts

| Id | Entry | State |
| --- | --- | --- |
| AD-07-01 | Join the school | The intro with `registrations.waiting`, the decision cards of the new accounts with `registrations.approve` and `registrations.deny`. Other messages: `registrations.alreadyDecided`. *Tall.* |
| AD-07-02 | Join the school — deny sheet | `registrations.denySheet`. |
| AD-07-03 | Join the school — person sheet | A new account's person sheet with its e-mail. |
| AD-07-04 | Join the school — empty | `registrations.empty`. |
| AD-07-05 | Join the school — loading | The skeletons. |
| AD-07-06 | Join the school — load error | `registrations.loadError` with the retry button. |
| AD-07-07 | Reactivate accounts | The intro with `reactivations.waiting`, the decision cards with `reactivations.details`, `reactivations.approve` and `reactivations.deny`. Other messages: `reactivations.alreadyDecided`. *Tall.* |
| AD-07-08 | Reactivate — deny sheet | `reactivations.denySheet`. |
| AD-07-09 | Reactivate — empty | `reactivations.empty`. |
| AD-07-10 | Reactivate — loading | The skeletons. |
| AD-07-11 | Reactivate — load error | `reactivations.loadError` with the retry button. |
| AD-07-12 | Removed accounts | The intro with `removedAccounts.count`, the rows with `people.removed.removedOn`, `people.removed.deletedOn` and `people.removed.restore`. Other messages: `people.removed.errors.*`. *Tall.* |
| AD-07-13 | Removed accounts — empty | `removedAccounts.empty`. |
| AD-07-14 | Removed accounts — loading | The skeletons. |
| AD-07-15 | Removed accounts — load error | `removedAccounts.loadError` with the retry button. |

## 08 — Enrol a student

| Id | Entry | State |
| --- | --- | --- |
| AD-08-01 | Who — students | The step tabs on `enrolStudent.steps.who` (class `enrolStudent.steps.pending`), the `enrolStudent.modeStudent` mode, the search, the students list, `enrolStudent.next` disabled. *Tall.* |
| AD-08-02 | Who — student chosen | A student selected and `enrolStudent.next` enabled. |
| AD-08-03 | Who — no students found | A search with no match: `enrolStudent.students.empty`. |
| AD-08-04 | Who — loading | The students skeleton. Other messages: `enrolStudent.students.loadError`. |
| AD-08-05 | Who — trial class | The `enrolStudent.modeTrial` mode: the name and WhatsApp fields and `enrolStudent.trial.note`. Other messages: `enrolStudent.trial.invalidName`. |
| AD-08-06 | Class | The step tabs with the chosen student, the calendar with `enrolStudent.hasClasses`, the day's class cards, the sport filter, the `enrolStudent.submitEmpty` button. *Tall.* |
| AD-08-07 | Class — no classes this day | `enrolStudent.classes.empty`. |
| AD-08-08 | Class — loading | The class card skeletons. Other messages: `enrolStudent.classes.loadError`. |
| AD-08-09 | Toast — enrolled | The `enrolStudent.done` toast. Other messages: `enrolStudent.doneTrial`, `enrolStudent.errors.*`. |

## 09 — People

| Id | Entry | State |
| --- | --- | --- |
| AD-09-01 | People | The people tab as an admin sees it, on the admin tab bar. Same list states as ST-04-02 to ST-04-08. *Tall.* |
| AD-09-02 | Person sheet — student | A student's sheet with `people.roleActions.promoteInstructor`, `people.roleActions.promoteAdmin` and `people.removeAction`. |
| AD-09-03 | Person sheet — instructor | An instructor's sheet with its role actions. |
| AD-09-04 | Person sheet — admin | Another admin's sheet with the `people.instructorFlag` checkbox and `people.roleActions.adminToInstructor`. |
| AD-09-05 | Role change confirm | `people.roleConfirm.promoteAdmin` for a student, with `seatsNote`. Other messages: `promoteInstructor`, `demoteStudent`, `adminToInstructor`, `people.roleErrors.*`. |
| AD-09-06 | Remove confirm | `people.removeConfirm` for a student. Other messages: `people.removeConfirm.staff`. |

## 10 — School

| Id | Entry | State |
| --- | --- | --- |
| AD-10-01 | School settings | The intro, the waiting list switch on with `schoolSettings.waitingList.on`, the school WhatsApp field with its helper, `schoolSettings.save`. Other messages: `schoolSettings.saved`. |
| AD-10-02 | School settings — waiting list off | The switch off with `schoolSettings.waitingList.off`. |
| AD-10-03 | School settings — loading | The skeleton. |
| AD-10-04 | School settings — load error | `schoolSettings.loadError` with the retry button. |
| AD-10-05 | Cancellation rules | The intro and tips, the surf and skate control on surf, the surf rule filled, `cancellationRules.screen.save`. Other messages: `cancellationRules.screen.saved`. *Tall.* |
| AD-10-06 | Cancellation rules — empty rule | Skate selected with an empty rule and its placeholder. |
| AD-10-07 | Cancellation rules — loading | The skeleton. |
| AD-10-08 | Cancellation rules — load error | `cancellationRules.screen.loadError` with the retry button. |
| AD-10-09 | School rules | The intro, the rules in order with their move up and down buttons, `manageSchoolRules.add`. Other messages: `manageSchoolRules.toasts.*`. *Tall.* |
| AD-10-10 | New rule sheet | `manageSchoolRules.sheet.addTitle` with its fields and `saveNote`. |
| AD-10-11 | Edit rule sheet | `manageSchoolRules.sheet.editTitle` with a rule's values and `manageSchoolRules.sheet.delete`. |
| AD-10-12 | Delete rule sheet | `manageSchoolRules.deleteSheet`. |
| AD-10-13 | School rules — empty | `manageSchoolRules.empty`. |
| AD-10-14 | School rules — loading | The skeletons. |
| AD-10-15 | School rules — load error | `manageSchoolRules.loadError` with the retry button. |

## 11 — Teaching, profile and notifications

| Id | Entry | State |
| --- | --- | --- |
| AD-11-01 | My classes | The admin's "Minhas aulas" (the instructor's form). Same states as IN-04-02 to IN-04-07. *Tall.* |
| AD-11-02 | History | The admin's "Aulas anteriores". Same states as IN-04-09 to IN-04-12. *Tall.* |
| AD-11-03 | Weekly occupancy | Same states as IN-05-02 to IN-05-07. *Tall.* |
| AD-11-04 | Profile | The profile with "Admin" under the name, on the admin tab bar. Same sheets and states as ST-05-02 to ST-05-12. *Tall.* |
| AD-11-05 | Edit profile | Same states as ST-05-13 to ST-05-15. |
| AD-11-06 | WhatsApp | Same states as ST-05-16 to ST-05-18. |
| AD-11-07 | School rules (read) | Opened from the profile. Same states as ST-05-19 to ST-05-22. *Tall.* |
| AD-11-08 | Notifications | One row for each notification type the backend sends an admin (`apps/backend/src/modules/notifications/`), with its in-app text (073 D-05), unread and read. Same states as ST-06-02 to ST-06-05. *Tall.* |
