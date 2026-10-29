# Design system inventory (spec 071)

Every entry `design-system.html` and `/{lang}/designs/design-system` must show. Each entry has a stable id
(`DS-<section number>-<entry number>`): the `.html` prints it in the entry's label, and the web page puts it in the entry's
`data-design-id` attribute. An entry "matches the code" by the fidelity rule of spec 071 (D-08): it shows the
same elements in the same order, the same copy, the same color, type and radius tokens and the same icon glyphs
as the app renders for that state. Pixel-exact sizes and the mock data's values aren't judged.

Sources: `packages/design-tokens/src/tokens.ts`, `apps/mobile/src/components/**` (with their `*.types.ts`
props), `apps/mobile/src/modules/classes/components/{class-card,class-card-skeleton}`, the role tab layouts in
`apps/mobile/src/app/(private)/<role>/(tabs)/_layout.tsx` and the copy in the app's messages. Where an entry
names a prop value, every value listed is its own frame or sample inside the entry.

Sections 01–08 keep the numbers they have today, because `CLAUDE.md` points at section 08 (the rules); section
09 holds the states that `empty-and-error-states.html` showed.

## 01 — Color

| Id | Entry | States / samples |
| --- | --- | --- |
| DS-01-01 | Color tokens | Every key of `colors.light` and `colors.dark`, grouped as in `tokens.ts`, each with its name, its value in the theme shown and its use. The `.html` shows the light and dark value of each token side by side; the web shows the swatch in the header's theme and prints both values. |

## 02 — Typography

| Id | Entry | States / samples |
| --- | --- | --- |
| DS-02-01 | Font families | `display` (Barlow Condensed, weights 400–700) and `body` (Nunito, weights 400–800), with their roles. |
| DS-02-02 | Type styles | Every key of `typography`, each with a sample line from the app's copy, its font, weight, size / line height, letter spacing and case. |

## 03 — Shape, space, elevation and icons

| Id | Entry | States / samples |
| --- | --- | --- |
| DS-03-01 | Radii | Every key of `radii`, drawn on a sample shape, with its value and use. |
| DS-03-02 | Spacing | Every key of `spacing`, with its value and use, and the 44 px touch target (`touchTarget`). |
| DS-03-03 | Elevation | Every key of `elevation`, drawn on a sample surface in the theme shown. |
| DS-03-04 | Icon sets | The sets the app draws (Ionicons, Feather, FontAwesome, FontAwesome6, MaterialCommunityIcons, SimpleLineIcons), with a few glyphs of each that the app uses and the sizes it uses them at. |

## 04 — Controls

| Id | Entry | States / samples |
| --- | --- | --- |
| DS-04-01 | Button | Variants `primary`, `dark`, `ink`, `outline`, `subtle`, `danger`, `success`, `ghost`; each default, disabled and loading, and one with an icon. |
| DS-04-02 | HeaderButton | Icon only; with a `badge` (a number); `standalone`. |
| DS-04-03 | TextButton | A link inside a sentence (the sign-in screen's terms line). |
| DS-04-04 | TextInput | Neutral with icon and placeholder; filled and `clearable`; `error` with its `errorMessage`. |
| DS-04-05 | TextArea | Empty with label; filled with its character counter; at `maxLength`. |
| DS-04-06 | OtpInput | Empty; partly filled; `error`; not `editable`. |
| DS-04-07 | Checkbox | `plain` and `boxed`, each unchecked, checked and disabled; one with `helper`. |
| DS-04-08 | SegmentedControl | Two and three options, one selected. |
| DS-04-09 | StepTabs | Steps done, selected, pending and disabled, with their values. |
| DS-04-10 | PhoneNumberField | Neutral with the country button and dial code; `error` with its message. |
| DS-04-11 | CountryPicker | The sheet open, with its search and country list. |

## 05 — Chips

| Id | Entry | States / samples |
| --- | --- | --- |
| DS-05-01 | Chip tones | Tones `surf`, `skate`, `info`, `sun`, `grape`, `warn`, `ok`, `bad`, `muted`, `onHighlight` (on its highlight background), each in size `default` and `compact`. |
| DS-05-02 | Chips with icons | A chip with an Ionicons glyph, as the class and enrolment chips draw them. |
| DS-05-03 | Chips in use | The labels the app shows: sports, levels, the class states and flags of the class card, and the enrolment statuses (`pending`, `waitingList`, `approved`, `denied`, `withdrawn`, `expired`, `cancelled`, `takenOut`) with their tone and icon. |

## 06 — Class card

| Id | Entry | States / samples |
| --- | --- | --- |
| DS-06-01 | ClassCard — not started | With seats left, occupancy bar and the students footer (avatars and "+N"). |
| DS-06-02 | ClassCard — full | Not started and full: the "Sem vagas" chip and the full occupancy tone. |
| DS-06-03 | ClassCard — next | `isNext`: the sun border, the primary shadow and the "Próxima" chip. |
| DS-06-04 | ClassCard — started | The class under way. |
| DS-06-05 | ClassCard — finished | No occupancy bar. |
| DS-06-06 | ClassCard — cancelled | No occupancy bar and no footer. |
| DS-06-07 | ClassCard — admin flags | `showFlags`: the "no instructor" and "no deadline" chips. |
| DS-06-08 | ClassCard — student enrolment | `showEnrolment`: the viewer's enrolment chip in the place of "Sem vagas". |
| DS-06-09 | ClassCard — guests and erased students | A footer with a trial guest and an erased student ("Former student" with the person icon). |
| DS-06-10 | ClassCardSkeleton | The loading placeholder of a card. |

## 07 — Structure

| Id | Entry | States / samples |
| --- | --- | --- |
| DS-07-01 | TabBar — student | Agenda, Reservas, Escola, Perfil with their icons; one selected. |
| DS-07-02 | TabBar — instructor and admin | Início, Aulas, Pessoas, Perfil with their icons; one selected. |
| DS-07-03 | Stack header | Title with the back button, and a `headerRight` HeaderButton. |
| DS-07-04 | ScreenIntro | Icon tile, eyebrow, title and description. |
| DS-07-05 | UserHeader | The greeting header of the homes. |
| DS-07-06 | Calendar — week | `CalendarWeekRow`: selected day, today, days with classes (the marked dots). |
| DS-07-07 | Calendar — month | `CalendarMonthGrid`: selected day, today, marked days, adjacent-month days, the selected week. |
| DS-07-08 | WeekMonthCalendar | The week view and the month view with the switch between them. |
| DS-07-09 | BottomModal | A sheet open over a screen: handle, radius, veil. |
| DS-07-10 | Toast | `success` and `error` tones. |
| DS-07-11 | LanguageSheet | The sheet open, with the three languages, one selected. |
| DS-07-12 | ThemeSheet | The sheet open, with its options, one selected. |
| DS-07-13 | DenySheet | With the reason field; with `hideReason`; loading. |
| DS-07-14 | DecisionCard | Default; `loading` approve; `loading` deny; `disabled`; `approveDisabled`. |
| DS-07-15 | AccountStatus | Tones `bad`, `dim` and `sand`, one with a `note` and one with a `primaryAction`. |

## 08 — Rules

| Id | Entry | States / samples |
| --- | --- | --- |
| DS-08-01 | Usage rules | The rules of today's section 08, brought in line with the code: one primary action per screen, grape only for highlights, numbers in Barlow Condensed, 44 px touch targets, buttons with press feedback by opacity, header actions as bare icons (`HeaderButton`), and any other rule `CLAUDE.md` → Design system and Rules for apps/mobile state about how screens look. |

## 09 — Loading, empty and error

| Id | Entry | States / samples |
| --- | --- | --- |
| DS-09-01 | Skeleton | Tones `sand` and `surface`, in a list-row and a card shape. |
| DS-09-02 | EmptyState | With an action; without an action. |
| DS-09-03 | ErrorState | Default; `retrying`. |
| DS-09-04 | States in a screen | A phone frame showing a list screen loading (skeletons), empty and failed, as `empty-and-error-states.html` showed them. |
