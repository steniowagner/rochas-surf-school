# Student app inventory (spec 073)

Every frame `student-app.html` and `/{lang}/designs/student-app` must show. Each entry has a stable id
(`ST-<section number>-<entry number>`): the `.html` prints it in the entry's label, and the web page puts it in the
entry's `data-design-id` attribute. Every entry is one iOS phone frame of the whole screen as a **student** sees it
(D-01), with the stack header or the user header the app draws and, on the tab screens, the student tab bar
(Agenda, Minhas aulas, Escola, Perfil) with the current tab selected.

**Tall frames (D-02):** a frame marked *tall* grows to the whole scrolled content of the screen with the mock data, the
tab bar or footer at its bottom; every other frame is 402 × 874. Sheets and toasts are drawn over a phone-height frame.

An entry "matches the code" by the fidelity rule of spec 071 (D-08): the same elements in the same order, the same
copy, the same color, type and radius tokens and the same icon glyphs as the app renders for that state. Pixel-exact
sizes and the mock data's values aren't judged. The mock account is `people` of
`apps/web/src/modules/designs/data/fortaleza.ts` (Ana Beatriz Lima), the classes are Fortaleza classes in the same file.

"Other messages" are the texts the same element can show in that state; they aren't frames of their own (spec 072,
D-02). The entry's note lists them, in the page's language, with the app's copy.

Sources: the route files under `apps/mobile/src/app/(private)/student/`, the screens and components of
`apps/mobile/src/modules/{classes,enrolment,people,profile,notifications,school-rules,cancellation-rules}/` as they
render for an approved student, `apps/mobile/src/components/**`, the toasts of `apps/mobile/src/providers/alert-message/`,
`apps/mobile/src/modules/enrolment/utils/enrolment-cta.ts` (which button each enrolment shows) and the copy in
`packages/app-messages`.

## 01 — Agenda

| Id | Entry | State |
| --- | --- | --- |
| ST-01-01 | Agenda — week | The user header on the band (avatar, greeting, bell with the unread badge), the week row of the calendar with the marked days, today selected, the day's class cards with the student's enrolment (one not started with seats, one full, one the student is approved in, one pending, one started), the sport filter button, the tab bar. *Tall.* |
| ST-01-02 | Agenda — month | The calendar opened to the month grid, the marked days and the selected day. |
| ST-01-03 | Agenda — sport filter open | The filter menu open over ST-01-01 (Todas, Surf, Skate), "Todas" selected. |
| ST-01-04 | Agenda — filtered | Surf selected: the filter button shows it and only surf classes are listed. |
| ST-01-05 | Agenda — loading | The class card skeletons. |
| ST-01-06 | Agenda — empty day | The empty state `classesWeek.emptyDay` with the day's date; no "create" button (students don't create classes). |
| ST-01-07 | Agenda — load error | The error state `classesWeek.loadError` with the day's date and the retry button. |

## 02 — Class

Every frame is the student's class details screen (`/student/class/[id]`): the stack header with the back button, the
class (sport, level, date and time, instructor), the enrolment banner when there is one, the people of the class, the
rules card (cancellation rule with its deadline, school rules), the notes when there are some, the location card and
the footer with the enrolment button that `getEnrolmentCta` gives. Every class-details frame is *tall*.

| Id | Entry | State |
| --- | --- | --- |
| ST-02-01 | Open class, not enrolled | No banner; footer "Pedir para entrar" (primary). |
| ST-02-02 | Request sheet | The request sheet over ST-02-01: title, note, the deadline line, the cancellation rule with "Ler", the unchecked acceptance checkbox, "Enviar pedido" disabled and "Agora não". |
| ST-02-03 | Request sheet — sending | The checkbox checked and the submit button showing its spinner. |
| ST-02-04 | Request sheet — no deadline | The sheet with `enrolment.requestSheet.noDeadline` and `enrolment.requestSheet.noRule` in place of the deadline and the rule. |
| ST-02-05 | Request sent | ST-02-06 with the toast `enrolment.requestSheet.done`. |
| ST-02-06 | Pending | The pending banner (`enrolment.status.pending`); footer "Anular pedido" (outline). |
| ST-02-07 | Withdraw sheet | The withdraw sheet over ST-02-06: title, description, "Sim, anular" (danger) and "Manter pedido". Other messages: the toast `enrolment.withdrawSheet.done`. |
| ST-02-08 | Full, waiting list open | The full banner with `classDetails.full.waitingList`; footer "Entrar na lista de espera". |
| ST-02-09 | Waiting-list request sheet | The request sheet in its waiting-list form (`waitingListTitle`, `waitingListNote`, `submitWaitingList`). Other messages: the toast `enrolment.requestSheet.doneWaitingList`. |
| ST-02-10 | On the waiting list | The waiting-list banner; footer "Sair da lista de espera" (ghost). Other messages: the toast `enrolment.withdrawSheet.doneWaitingList`. |
| ST-02-11 | Full, waiting list closed | The full banner with `classDetails.full.waitingListClosed`; no footer button. |
| ST-02-12 | Approved | The approved banner; footer "Cancelar inscrição" (outline). |
| ST-02-13 | Cancel seat sheet | The cancel sheet over ST-02-12: title, the description with the deadline, "Sim, cancelar" and "Manter inscrição". |
| ST-02-14 | Seat cancelled | ST-02-20's form with the toast `enrolment.cancelSeatSheet.done`. |
| ST-02-15 | Approved, deadline passed | The approved banner; no footer button, the note `enrolment.cancelSeatNote.passed` and "Falar com a escola". |
| ST-02-16 | Approved, no deadline | The "no deadline" card (`classDetails.noDeadline`); the note `enrolment.cancelSeatNote.missing` and "Falar com a escola". |
| ST-02-17 | Denied | The denied banner, pressable; footer "Pedir novamente". |
| ST-02-18 | Denial reason sheet | The denial sheet with the school's reason (mock text, D-04). Other messages: `enrolment.denialSheet.noReason` when there is no reason. |
| ST-02-19 | Withdrawn | The withdrawn banner; footer "Pedir novamente". |
| ST-02-20 | Cancelled by the student | The cancelled banner; footer "Pedir novamente". |
| ST-02-21 | Expired | The expired banner; footer "Pedir novamente". |
| ST-02-22 | Taken out | The taken-out banner with the reason (mock text); footer "Pedir novamente". Other messages: `enrolment.status.takenOut.noReason`. |
| ST-02-23 | Started | The started card (`classDetails.started`); no footer. |
| ST-02-24 | Finished | The finished card (`classDetails.finished`); no footer. |
| ST-02-25 | Class cancelled | The cancelled card (`classDetails.cancelled`); no footer. |
| ST-02-26 | No instructor | The "no instructor" card (`classDetails.noInstructor`) in place of the instructor. |
| ST-02-27 | Loading | The class details skeleton. |
| ST-02-28 | Not found | The empty state `classDetails.notFoundState`. |
| ST-02-29 | Load error | The error state `classDetails.errorState` with the retry button. |
| ST-02-30 | Enrolment error | ST-02-01 with the toast `enrolment.errors.ruleNotAccepted`. Other messages: the other keys of `enrolment.errors`, `createAccount.errors.noConnection`, `createAccount.errors.generic`. |

## 03 — My classes

| Id | Entry | State |
| --- | --- | --- |
| ST-03-01 | My classes — all | The header title and the history button, the status filters (Todas selected), the student's class cards with their enrolment chips, the sport filter button, the tab bar. *Tall.* |
| ST-03-02 | My classes — pending | "Pendentes" selected: only pending and waiting-list requests. |
| ST-03-03 | My classes — confirmed | "Confirmadas" selected. |
| ST-03-04 | My classes — ended | "Encerradas" selected: denied, withdrawn, expired, cancelled, taken out and finished ones. |
| ST-03-05 | My classes — sport | A sport selected in the sport filter, combined with "Todas". |
| ST-03-06 | My classes — empty | The empty state with `myClasses.empty.all`. Other messages: `myClasses.empty.allSport`. |
| ST-03-07 | My classes — empty filter | A status selected, the empty state with `myClasses.empty.filtered`. Other messages: `myClasses.empty.filteredSport`. |
| ST-03-08 | My classes — loading | The class card skeletons. |
| ST-03-09 | My classes — load error | The error state `myClasses.loadError` with the retry button. |
| ST-03-10 | History | The header title, the calendar with the days the student took a class marked and its legend, the classes grouped by day, the sport filter. *Tall.* |
| ST-03-11 | History — day selected | One day selected: only its classes and the "clear" link with the date. |
| ST-03-12 | History — empty period | The empty state `myHistory.emptyPeriod`. Other messages: `myHistory.emptyPeriod.descriptionSport`, `myHistory.emptyDay` and its sport variant. |
| ST-03-13 | History — loading | The skeletons. |
| ST-03-14 | History — load error | The error state `myHistory.loadError` with the retry button. |

## 04 — School

| Id | Entry | State |
| --- | --- | --- |
| ST-04-01 | People | The intro with the count, the search field, the role filters, the person rows (avatar, name, role, since), the tab bar. *Tall.* |
| ST-04-02 | People — filtered | A name typed and the "Instrutores" filter on: the matching rows only. |
| ST-04-03 | People — nobody found | The empty state `people.empty`. |
| ST-04-04 | People — loading | The people skeleton. |
| ST-04-05 | People — load error | The error state `people.loadError` with the retry button. |
| ST-04-06 | Person sheet | The person sheet of an instructor who shares their WhatsApp: avatar, name, role chip, the WhatsApp and e-mail rows, "Fechar". No admin actions. |
| ST-04-07 | Person sheet — number not shared | The WhatsApp row with `people.whatsappNotShared`. |
| ST-04-08 | WhatsApp unavailable | ST-04-06 with the toast `people.whatsappUnavailable`. |

## 05 — Profile

| Id | Entry | State |
| --- | --- | --- |
| ST-05-01 | Profile | The header (avatar, name, "Aluno"), the rows (edit profile, WhatsApp with "Visível" or "Oculto", theme, language), the push switch on with its note, the school rules, cancellation rules, about, privacy policy and terms rows, "Sair" and "Remover a conta", the tab bar. *Tall.* |
| ST-05-02 | Push denied | The push switch off and the toast `profile.pushDenied`. |
| ST-05-03 | Language sheet | The language sheet over the profile, the current language selected. |
| ST-05-04 | Theme sheet | The theme sheet, the current choice selected. |
| ST-05-05 | About sheet | The about sheet: description, creator and version, "Fechar". |
| ST-05-06 | Sign-out sheet | Title, description, "Sair" and "Cancelar". |
| ST-05-07 | Remove account sheet | The remove account sheet: its text, the confirm button (danger) and "Cancelar". |
| ST-05-08 | Remove account — removing | The confirm button showing its spinner. Other messages: the toasts `createAccount.errors.noConnection`, `createAccount.errors.generic`. |
| ST-05-09 | Cancellation rules sheet | The sheet with one rule per sport (mock text, D-04) and "Fechar". |
| ST-05-10 | Cancellation rules — loading | The sheet's spinner. |
| ST-05-11 | Cancellation rules — empty | `cancellationRules.sheet.empty` in place of a rule. |
| ST-05-12 | Cancellation rules — load error | `cancellationRules.sheet.loadError` and the retry button. |
| ST-05-13 | Edit profile | The avatar, the name field filled, the read-only e-mail with its hint, "Salvar". |
| ST-05-14 | Edit profile — invalid name | The name field in the error state with `createAccount.nameInvalid`; "Salvar" disabled. |
| ST-05-15 | Edit profile — saving | "Salvar" showing its spinner. Other messages: the toasts `createAccount.errors.noConnection`, `createAccount.errors.generic`. |
| ST-05-16 | WhatsApp | The intro (`profileWhatsapp.title`, `profileWhatsapp.description`) and the WhatsApp form with the current number and its visibility. |
| ST-05-17 | WhatsApp — invalid number | The phone field in the error state with `whatsapp.invalidNumber`. |
| ST-05-18 | WhatsApp — saving | The save button showing its spinner. Other messages: the toasts `whatsapp.invalidNumber`, `createAccount.errors.noConnection`, `createAccount.errors.generic`. |
| ST-05-19 | School rules | The intro and the numbered rules (mock rules, D-04). *Tall.* |
| ST-05-20 | School rules — loading | The skeleton. |
| ST-05-21 | School rules — empty | The empty state `schoolRulesScreen.empty`. |
| ST-05-22 | School rules — load error | The error state `schoolRulesScreen.loadError` with the retry button. |

## 06 — Notifications

| Id | Entry | State |
| --- | --- | --- |
| ST-06-01 | Notifications | The header title and "mark all as read", unread and read rows (tinted icon, title, body, time, unread dot) one row for each notification type the backend sends a student (`apps/backend/src/modules/notifications/`), with its in-app text (D-05). *Tall.* |
| ST-06-02 | Notifications — loading | The skeleton. |
| ST-06-03 | Notifications — empty | The empty state `notifications.empty`. |
| ST-06-04 | Notifications — load error | The error state `notifications.loadError` with the retry button. |
| ST-06-05 | Mark all failed | ST-06-01 with the toast `notifications.markAllError`. |
