---
id: "027"
slug: people-directory
title: People directory for every role
status: in-progress
started: 2026-10-13
base_commit: 305a8c311dd1d41b4093ab6a4d309be06d86ec3c
created: 2026-10-13
fronts: [auth, backend, mobile]
depends_on: []
---

# 027 — People directory for every role

## Goal

Every approved member of the school — student, instructor or admin — can browse the school's approved users on
one "Pessoas" screen: search by name (ignoring case and accents), filter by role with a reusable switcher, sort
A–Z, and scroll through the list 20 people at a time. Tapping a person opens a sheet with their WhatsApp chat
button when the backend lets the viewer see the number (the owner shares it, or the viewer is an admin). Students
reach it from their Escola tab; instructors and admins from a "Pessoas" row in the ESCOLA section of their home
tab. Today nobody can see the other members of the school in the app.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: User (role, status, WhatsApp number and
  visibility), People directory; data ownership ("a user's WhatsApp number, visible to other users only when its
  owner shares it, and always to admins").
- Requirements: [requirements.md → User directory](../../../.docs/requirements.md#user-directory) — approved,
  active users with name, photo and role, and the WhatsApp number when shared; pending, denied, deleted and removed
  accounts never appear. [requirements.md → Directory search and filter](../../../.docs/requirements.md#directory-search-and-filter)
  — search by name, filter by role. [requirements.md → WhatsApp number visibility](../../../.docs/requirements.md#whatsapp-number-visibility)
  — hidden by default; admins always see every number. [requirements.md → Contacting a user on WhatsApp](../../../.docs/requirements.md#contacting-a-user-on-whatsapp)
  — admins open a WhatsApp chat with any user, in WhatsApp on their own phone.
- Designs: `.docs/designs/admin-app.html` **PAINEL-12** (People) and **PAINEL-12A** (Person sheet) are the
  reference for all three roles (the same screen is PAINEL-06/06A in `instructor-app.html` and ESCOLA-01/02 in
  `student-app.html`). The entry points are the ESCOLA section of PAINEL-01 in `admin-app.html` and
  `instructor-app.html`, and the student's Escola tab. Parts of those designs are out of scope (see Scope).
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Architecture (who
  may do what is checked in use cases; visibility rules are enforced by use cases, never only hidden by the UI),
  Persistence (Prisma 7, migrations named after the module), Fixed conventions (error keys, Mobile shared UI,
  Mobile routes, CTA labels), Applications → `apps/mobile` (TanStack Query, `apiGet`, `date-fns` in
  America/Fortaleza, `libphonenumber-js`), Automated validation.
- Module: [modules/auth.md](../../memory/modules/auth.md) — users, their role, status and WhatsApp visibility
  live in the Authentication module.
- Existing code this builds on:
  - `modules/auth/src/user/provider/user.repository.ts` — `UserRepository` (`findPage` and `searchByName` exist
    from the scaffold, unused, filtering by neither status nor role); `modules/auth/test/mock/fake-user.repository.ts`
    — its in-memory fake.
  - `apps/backend/src/modules/auth/user.prisma.ts` — `PrismaUserRepository`;
    `apps/backend/src/modules/auth/registrations.controller.ts` — the pattern of a protected list controller.
  - `apps/mobile/src/modules/admin/screens/admin.screen.tsx` — the admin home ("Ferramentas da escola") with the
    single "Entrar na escola" row; `apps/mobile/src/modules/instructor/screens/instructor.screen.tsx` — a
    placeholder; `apps/mobile/src/app/(private)/student/(tabs)/school.tsx` — a placeholder Escola tab.
  - `apps/mobile/src/modules/offboarding/components/contact-school-button/` — opening `https://wa.me/<digits>`
    with `Linking.openURL` and a toast on failure; `apps/mobile/src/components/ui/{bottom-modal,chip,text-input,button,back-button}`;
    `apps/mobile/src/utils/get-initials.ts`.

## Scope

### In scope

- `GET /people`: the paginated directory of approved users, filtered by role and name, sorted newest first or
  A–Z, with the WhatsApp number only when the viewer may see it.
- A migration enabling the Postgres `unaccent` extension for accent-insensitive search and sort.
- The reusable `SegmentedControl` component (mobile).
- The People screen (header with the real count, search, role switcher, sort button, infinite list, states) and
  the Person sheet (WhatsApp chat button, "Fechar").
- Entry points: the student's Escola tab renders the People screen; the admin home gains the "Ferramentas" and
  "Escola" section labels and a "Pessoas" row; the instructor's Início tab becomes a minimal "Painel" with the
  ESCOLA section and its "Pessoas" row; the routes `/admin/people` and `/instructor/people`.
- Copy in pt-BR, es-ES and en-US.

### Out of scope

- The "Contas removidas" section and "Restaurar" of PAINEL-12 (removing and restoring accounts aren't built).
- The "Promover a admin", "Despromover a aluno" and "Remover da plataforma" actions of PAINEL-12A (role changes
  and removal are their own specs).
- Class counts in the rows ("6 aulas", "48 aulas dadas"), "Acesso total" / "Dono da escola" subtitles — classes
  don't exist.
- Profile photos: rows and the sheet show initials (no photo can be uploaded yet).
- A real count on the home rows: "9 na plataforma" stays hard-coded until a backend route for it exists (D-05).
- The rest of the PAINEL dashboards: greeting, avatar, bell, metrics cards and every other row ("As minhas aulas",
  "Regras", "Avaliações das aulas", "Ocupação semanal", "Reativar contas"…), and renaming the admin home's title.
- Searching by email or any field other than the name; showing anyone's email.
- The web app (`apps/web`): no page and no web `SegmentedControl`.
- Removing the scaffold's unused `FindUserPage` / `SearchUsersByName` use cases and repository methods.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | The directory lists only users with status `approved`, of every role, the viewer included, and approved accounts that haven't finished onboarding too (their number is `null`). | Requirements → User directory lists approved, active users; including the viewer keeps "N na plataforma" true. |
| D-02 | `whatsappNumber` is the stored number when the owner's `whatsappVisible` is `true` **or** the viewer's role is `admin`; otherwise `null`. Decided in the `ListPeople` use case, so a hidden number never leaves the backend. The visibility flag itself is never returned. | Product rule (admins always see every number) and the technical context: visibility is enforced by use cases, never only hidden by the UI. |
| D-03 | Search is a "contains" match on the name, ignoring case and accents (`joao` finds "João"), through Postgres `unaccent` enabled by the migration `auth-enable-unaccent`; the repository uses raw SQL (`$queryRaw` with bound parameters) for the search and for the name sort. The app debounces the search box by 300 ms. | People type names on the phone without accents; Prisma's `contains` / `mode: insensitive` doesn't ignore accents. |
| D-04 | Two sorts: `recent` (default; `created_at` descending, then `id`) and `name` (`lower(unaccent(name))` ascending, then `id`). The app's "A–Z" button switches between them; the choice lasts for the visit and survives search and filter changes. | The request asks for a button that sorts alphabetically, so the default must be another order; the `id` tie-breaker keeps pages stable. |
| D-05 | The home rows show "{{count}} na plataforma" with `count` from one constant, `PEOPLE_COUNT_PLACEHOLDER = 9`, in `apps/mobile/src/modules/people/constants/people.ts`. | The user's decision: a backend route for this number comes later, and it then replaces one constant. |
| D-06 | The People screen's eyebrow "N na plataforma" is the **unfiltered** total: `GET /people?perPage=1` with no role, search or sort, query key `["people", "count"]` (`usePeopleCount`). It shows nothing while loading or after an error. | The count names the platform, so it must not change with the search or the filter. |
| D-07 | The list is one TanStack `useInfiniteQuery` keyed `["people", { role, search, sort }]`, `perPage` 20, next page while `page * perPage < total`; rows repeated across pages (someone approved mid-scroll) are dropped by `id`. No retry on the query. | One cache entry per combination; offset paging can repeat a row when the list grows. |
| D-08 | `SegmentedControl` (`apps/mobile/src/components/ui/segmented-control/`) is generic — `options: { value: T; label: string }[]`, `value: T`, `onChange(value: T)` — with equal-width `TouchableOpacity` segments of role `tab` (with `accessibilityState.selected`), at least 44 pt tall, no animation, styled as PAINEL-12: a `bg-sand` track and the selected segment on `bg-surface` with `shadowStyle()`, labels in the uppercase chip type style (`ink` selected, `ink-2` otherwise). It knows nothing about roles. | The user wants it reused by other screens; CLAUDE.md requires `TouchableOpacity` for buttons. |
| D-09 | One `PeopleScreen` in a new mobile module `apps/mobile/src/modules/people/` serves the three roles. It takes `showBackButton`: `true` on `/admin/people` and `/instructor/people` (inner routes of the role's Stack, above the tab bar), `false` on the student's Escola tab (a tab root can't go back). | One screen, one design (PAINEL-12) for every role, as requested. |
| D-10 | Rows and the sheet show an initials avatar (`getInitials`, `bg-sand` / `text-grape`, like `DecisionCard`), the name, and the subtitle "desde <MMM yyyy>" from `createdAt` (date-fns, America/Fortaleza, the app's locale). Role chips reuse the `profile.role.*` labels: student `muted`, instructor `info`, admin `grape`. | No photos or class counts exist; the existing Chip tones avoid changing the web Chip. |
| D-11 | `GET /people` lives in the `auth` backend adapter (`people.controller.ts`), runs a new `ListPeople` use case over a new `UserRepository.findDirectoryPage(params)` method. The scaffold's `findPage`, `searchByName`, `FindUserPage` and `SearchUsersByName` are left untouched. | Users belong to the Authentication module; the scaffold methods filter by neither status nor role. |
| D-12 | Query validation is done by `ListPeople`, in this order after access: `page` (integer ≥ 1, default 1) → `people.page.invalid`; `perPage` (integer 1–50, default 20) → `people.perPage.invalid`; `role` (`student` \| `instructor` \| `admin`, absent = all) → `people.role.invalid`; `search` (trimmed; blank = none; over 80 characters after trimming → `people.search.max.length`); `sort` (`recent` \| `name`, default `recent`) → `people.sort.invalid`. All failures are collected into one 422 `ValidationException`. The controller passes the raw query strings; the use case parses them. | One set of rules in the domain (no `class-validator`), keys of the form `<concept>.<field>.<code>`. 80 is the name's maximum length. |
| D-13 | Access: an account whose status isn't `approved` → 403 `user.status.notApproved` (checked first); an unknown user → 401 `auth.token.invalid`. Any approved role may read the directory. | Same rule and keys as the other approved-only routes (`SetName`, `SetWhatsapp`). |
| D-14 | The sheet shows the number with `libphonenumber-js` `formatInternational()` (the raw E.164 if parsing fails) and opens `https://wa.me/<digits>` with `Linking.openURL`; a rejected open shows the toast `people.whatsappUnavailable`. | Same pattern as the contact-the-school button (spec 016). |
| D-15 | The admin home keeps its title and gains two section labels, "Ferramentas" above "Entrar na escola" and "Escola" above "Pessoas". The instructor's Início becomes `ScreenIntro` "Painel" with the "Escola" section and its single "Pessoas" row. | The smallest change that matches the designs' ESCOLA section without building dashboards whose data doesn't exist. |

### Copy

New translation keys (pt-BR / es-ES / en-US). Role chips reuse `profile.role.*`, "Fechar" reuses `common.close`, the
failure toasts reuse `createAccount.errors.generic` / `.noConnection`, and "Tentar novamente" reuses the existing
`retry` copy.

| Key | pt-BR | es-ES | en-US |
| --- | --- | --- | --- |
| `people.title` | Pessoas | Personas | People |
| `people.count` | {{count}} na plataforma | {{count}} en la plataforma | {{count}} on the platform |
| `people.searchPlaceholder` | Procurar pessoa | Buscar persona | Search people |
| `people.filter.all` | Todos | Todos | All |
| `people.filter.student` | Alunos | Alumnos | Students |
| `people.filter.instructor` | Instrutores | Instructores | Instructors |
| `people.filter.admin` | Admins | Admins | Admins |
| `people.sort.label` | A–Z | A–Z | A–Z |
| `people.sort.accessibility` | Ordenar por nome | Ordenar por nombre | Sort by name |
| `people.since` | desde {{date}} | desde {{date}} | since {{date}} |
| `people.empty` | Ninguém encontrado | No se encontró a nadie | No one found |
| `people.loadError` | Não foi possível carregar as pessoas. | No se pudo cargar a las personas. | Couldn't load people. |
| `people.whatsapp` | Conversar por WhatsApp | Chatear por WhatsApp | Chat on WhatsApp |
| `people.whatsappUnavailable` | Não foi possível abrir o WhatsApp. | No se pudo abrir WhatsApp. | Couldn't open WhatsApp. |
| `admin.home.toolsSection` | Ferramentas | Herramientas | Tools |
| `admin.home.schoolSection` | Escola | Escuela | School |
| `home.peopleRow` | Pessoas | Personas | People |
| `instructor.home.title` | Painel | Panel | Dashboard |

## Expected Results

### ER-01 — Only approved users are listed

- **Front:** backend
- **Behavior:** Given users with every status (`pending`, `approved`, `denied`, `deleted`, `removed`) and every
  role, when an approved account calls `GET /people`, then the API answers 200 with
  `{ items, page, perPage, total }` where `items` holds only the `approved` users (the caller included), each as
  exactly `{ id, name, role, createdAt, whatsappNumber }` — no `email`, `photoUrl`, `status` or
  `whatsappVisible` — and `total` counts only approved users.
- **Edge and error cases:** an approved account without a WhatsApp number appears with `whatsappNumber: null`;
  with no other approved user, `items` holds only the caller and `total` is 1.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- list-people` (`test/user/usecase/list-people.usecase.test.ts`),
  `npx vitest run src/modules/auth/user.prisma.spec.ts -t "findDirectoryPage"` (from `apps/backend`) and
  `test/people.e2e-spec.ts` → "lists only approved users" (`node .specs/scripts/run-e2e.mjs 027`).

### ER-02 — A WhatsApp number is sent only to who may see it

- **Front:** backend
- **Behavior:** Given approved user A with a number and `whatsappVisible: true`, and approved user B with a
  number and `whatsappVisible: false`, when an approved student or instructor calls `GET /people`, then A's
  `whatsappNumber` is A's E.164 number and B's is `null`; when an approved admin calls it, both numbers are
  returned.
- **Edge and error cases:** a user without a number is `null` for every viewer, admins included; the caller's own
  hidden number is `null` for a non-admin caller too (the rule doesn't depend on who the caller is, only on their role).
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- list-people` and `test/people.e2e-spec.ts` →
  "hides unshared numbers from non-admins" and "shows every number to admins".

### ER-03 — Role filter and name search combine

- **Front:** backend
- **Behavior:** Given approved users "João Pinto" (student), "Joana Rocha" (instructor) and "Ana Silva" (student),
  when an approved account calls `GET /people?search=joao`, then only "João Pinto" is listed; `?search=JOA` lists
  "João Pinto" and "Joana Rocha"; `?role=student&search=jo` lists only "João Pinto"; `?role=instructor` lists only
  instructors.
- **Edge and error cases:** `search` is trimmed and a blank one (`?search=%20%20`) means no search; a search that
  matches nobody answers 200 with `items: []` and `total: 0`; `%` and `_` in the search are matched literally,
  not as wildcards.
- **Verify by:** `npx vitest run src/modules/auth/user.prisma.spec.ts -t "findDirectoryPage"` (from
  `apps/backend`) and `test/people.e2e-spec.ts` → "filters by role and searches the name ignoring case and accents".

### ER-04 — Pages and sort order

- **Front:** backend
- **Behavior:** Given 25 approved users, when an approved account calls `GET /people`, then it answers `page: 1`,
  `perPage: 20`, 20 items and `total: 25`, newest `createdAt` first; `?page=2` answers the remaining 5;
  `?sort=name` orders by name A–Z ignoring case and accents ("Álvaro" before "Bruno", "ana" before "Bruno");
  `?perPage=50` is accepted.
- **Edge and error cases:** two users with the same `createdAt` (or the same name under `sort=name`) are ordered
  by `id`, so pages never overlap; a page past the end answers `items: []` with the real `total`.
- **Verify by:** `npx vitest run src/modules/auth/user.prisma.spec.ts -t "findDirectoryPage"` and
  `test/people.e2e-spec.ts` → "pages 20 at a time" and "sorts by name".

### ER-05 — Access and parameter validation

- **Front:** backend
- **Behavior:** When `GET /people` is called without a token, it answers 401 `auth.token.invalid`; by an account
  whose status is `pending`, `denied`, `deleted` or `removed` (any role), 403 `user.status.notApproved`; by an
  approved account with `page=0`, `perPage=51`, `role=guest`, an 81-character `search` and `sort=age`, 422 with
  `errors` holding `people.page.invalid`, `people.perPage.invalid`, `people.role.invalid`,
  `people.search.max.length` and `people.sort.invalid`.
- **Edge and error cases:** non-numeric `page` / `perPage` (`abc`, `1.5`) are invalid; the access check runs
  before validation, so a non-approved account with bad parameters gets the 403.
- **Verify by:** `npm test --workspace @rochas-surf-school/auth -- list-people`,
  `npx vitest run src/modules/auth/people.controller.spec.ts` (from `apps/backend`) and `test/people.e2e-spec.ts`
  → "refuses non-approved accounts" and "validates the query".

### ER-06 — The switcher is a reusable component

- **Front:** mobile
- **Behavior:** Given `<SegmentedControl options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} value="a" onChange={fn} />`,
  then it renders one tab per option with "A" selected (`accessibilityState.selected: true`) and "B" not; when
  "B" is pressed, `onChange` is called once with `"b"`; pressing the selected "A" doesn't call it.
- **Edge and error cases:** each segment is at least 44 pt tall; it renders any string `value` type (it has no
  role-specific code).
- **Verify by:** `npx jest src/components/ui/segmented-control` (from `apps/mobile`).

### ER-07 — The People screen shows the count and the rows

- **Front:** mobile
- **Behavior:** Given the backend answers 3 approved users unfiltered (`total: 3`), when the People screen opens,
  then it shows the title "Pessoas", the eyebrow "3 na plataforma", the search box "Procurar pessoa", the switcher
  "Todos / Alunos / Instrutores / Admins" with "Todos" selected, the "A–Z" button, and one row per user with the
  initials avatar, the name, "desde <mês ano>" (e.g. "desde jul 2026") and the role chip ("Aluno", "Instrutor",
  "Admin").
- **Edge and error cases:** with a filter or search applied, the eyebrow still shows the unfiltered total (D-06);
  while the count loads or after it fails, no eyebrow is shown and the list still works.
- **Verify by:** `npx jest src/modules/people` (from `apps/mobile`) — `people.screen.test.tsx` → "shows the
  unfiltered count and one row per person"; user journey 1.

### ER-08 — Scrolling to the end loads the next page

- **Front:** mobile
- **Behavior:** Given `total: 25`, when the list reaches its end, then `GET /people?page=2&perPage=20` is
  requested, a footer spinner shows while it loads, and the 5 new rows are appended after the first 20; at 25 rows
  reaching the end requests nothing more.
- **Edge and error cases:** a row already shown (same `id`) is not shown twice; a failed next page shows the toast
  `createAccount.errors.generic` (or `createAccount.errors.noConnection` for `NetworkError`, nothing for
  `SessionExpiredError`, as `getRegistrationErrorKey` maps them), keeps the
  rows already loaded, and reaching the end again retries it.
- **Verify by:** `npx jest src/modules/people` — `use-people.hook.test.ts` and `people.screen.test.tsx` →
  "loads the next page at the end"; user journey 1.

### ER-09 — Search and role filter drive the list

- **Front:** mobile
- **Behavior:** Given the People screen, when the person types "jo" and 300 ms pass, then the list reloads from
  page 1 with `search=jo`; when they then press "Instrutores", it reloads from page 1 with `role=instructor&search=jo`;
  "Todos" sends no `role`.
- **Edge and error cases:** typing faster than 300 ms sends one request for the final text; a search of only
  spaces sends no `search`; when the answer has no items, "Ninguém encontrado" is shown instead of rows.
- **Verify by:** `npx jest src/modules/people` — `people.screen.test.tsx` → "searches and filters by role" and
  "shows the empty state"; user journey 2.

### ER-10 — The A–Z button toggles the name order

- **Front:** mobile
- **Behavior:** Given the People screen in the default order (no `sort` sent, newest first), when "A–Z" is
  pressed, then the list reloads from page 1 with `sort=name` and the button shows its selected state
  (`accessibilityState.selected: true`, `bg-sand` / `text-grape`); pressing it again reloads with the default order
  and unselects it.
- **Edge and error cases:** the chosen order is kept when the search or the role changes during the visit; the
  button has the accessibility label "Ordenar por nome" and is at least 44 pt tall.
- **Verify by:** `npx jest src/modules/people` — `people.screen.test.tsx` → "toggles the name order"; user
  journey 2.

### ER-11 — Loading, error and refresh states

- **Front:** mobile
- **Behavior:** When the first page is loading, a spinner is shown instead of the list; when it fails, the
  message "Não foi possível carregar as pessoas." and the "Tentar novamente" button are shown, and pressing it
  requests page 1 again; pulling the list down reloads it from page 1 (and reloads the count).
- **Edge and error cases:** a `SessionExpiredError` shows neither the error nor a toast (the session-expired
  handling takes over).
- **Verify by:** `npx jest src/modules/people` — `people.screen.test.tsx` → "shows a spinner, then the error with
  retry" and "reloads on pull to refresh".

### ER-12 — The Person sheet opens a WhatsApp chat

- **Front:** mobile
- **Behavior:** Given a row whose `whatsappNumber` is `"+5585999998888"`, when it is pressed, then a bottom sheet
  shows the initials avatar, the name, the role chip, a "Conversar por WhatsApp" row with "+55 85 99999-8888", and
  the "Fechar" button; pressing the WhatsApp row calls `Linking.openURL("https://wa.me/5585999998888")`; pressing
  "Fechar" (or dragging the sheet down) closes it.
- **Edge and error cases:** with `whatsappNumber: null` the sheet has no WhatsApp row; when `openURL` rejects, the
  toast "Não foi possível abrir o WhatsApp." is shown; a number `libphonenumber-js` can't parse is shown as sent.
- **Verify by:** `npx jest src/modules/people` — `person-sheet.component.test.tsx`; user journey 3.

### ER-13 — Students open the directory from the Escola tab

- **Front:** mobile
- **Behavior:** Given an approved student who finished onboarding, when they select the Escola tab
  (`/student/school`), then the People screen is shown, without a back button.
- **Edge and error cases:** none beyond ER-07–ER-12 (same screen).
- **Verify by:** route test `apps/mobile/src/modules/student/student-tabs.navigation.test.tsx` → "the Escola tab
  shows the people directory"; user journey 1.

### ER-14 — Admins open the directory from the home

- **Front:** mobile
- **Behavior:** Given an approved admin on the home tab, then the screen shows the section label "Ferramentas"
  above the "Entrar na escola" row and the section label "Escola" above a "Pessoas" row reading "9 na plataforma";
  pressing "Pessoas" opens `/admin/people`, the People screen with a back button, above the tab bar; the back
  button returns to the home.
- **Edge and error cases:** "9 na plataforma" doesn't depend on any request (D-05); the "Entrar na escola" row
  and its waiting count behave as before.
- **Verify by:** `npx jest src/modules/admin/screens/admin.screen.test.tsx` → "opens the people directory" and
  route test `apps/mobile/src/modules/admin/admin-tabs.navigation.test.tsx` → "/admin/people shows the people
  directory"; user journey 4.

### ER-15 — Instructors open the directory from the Painel

- **Front:** mobile
- **Behavior:** Given an approved instructor on the Início tab, then the screen shows the title "Painel", the
  section label "Escola" and a "Pessoas" row reading "9 na plataforma"; pressing it opens `/instructor/people`,
  the People screen with a back button, above the tab bar.
- **Edge and error cases:** no other rows, greeting or bell are shown (out of scope).
- **Verify by:** `npx jest src/modules/instructor/screens/instructor.screen.test.tsx` → "opens the people
  directory" and route test `apps/mobile/src/modules/instructor/instructor-tabs.navigation.test.tsx` →
  "/instructor/people shows the people directory"; user journey 4.

## Tasks

### Auth module (`modules/auth`)

- [x] **T-01** — Add the directory read to the domain: `DirectoryPageParams` (`page`, `perPage`, `role?`,
  `search?`, `sort: "recent" | "name"`) and `UserRepository.findDirectoryPage(params): Promise<PageResult<User>>`
  (approved users only) in `src/user/provider/user.repository.ts`, implemented in
  `test/mock/fake-user.repository.ts` (accent folding with `normalize("NFD")`); the `ListPeople` use case in
  `src/user/usecase/list-people.usecase.ts` (In: the current user `{ id, role, status }` plus the raw query
  strings; Out: `{ items: PersonOut[], page, perPage, total }`, `PersonOut = { id, name, role, createdAt,
  whatsappNumber }`), checking access (D-13), parsing and validating the query (D-12) and mapping visibility
  (D-02); exported from `src/user/usecase/index.ts`; tests in `test/user/usecase/list-people.usecase.test.ts`
  for every rule, default and error key. Skill: [`module-use-case`](../../../.claude/skills/module-use-case).
  Covers: ER-01, ER-02, ER-04, ER-05 · Done when: `npm test --workspace @rochas-surf-school/auth -- list-people`
  passes and `npm run check-types --workspace @rochas-surf-school/auth` exits 0.
  > ✅ 2026-10-13 — added `DirectoryPageParams`/`DirectorySort` and `findDirectoryPage`, the fake implementation,
  > and the `ListPeople` use case (access, D-12 validation, D-02 visibility); the actor comes from the
  > controller's `@CurrentUser()` (the guard already answers 401 for an unknown user); files:
  > `modules/auth/src/user/provider/user.repository.ts`, `modules/auth/src/user/usecase/list-people.usecase.ts`,
  > `modules/auth/src/user/usecase/index.ts`, `modules/auth/test/mock/fake-user.repository.ts`,
  > `modules/auth/test/user/usecase/list-people.usecase.test.ts`; verified: `npm test --workspace
  > @rochas-surf-school/auth -- list-people` (19 passed, `list-people.usecase.ts` 100% covered),
  > `npm run check-types --workspace @rochas-surf-school/auth` (exit 0); deviations: none

### Backend (`apps/backend`)

- [ ] **T-02** — Create the migration `auth-enable-unaccent` in `apps/backend/prisma/migrations/` with
  `CREATE EXTENSION IF NOT EXISTS unaccent;` (`npm run prisma:migrate:dev --workspace apps/backend -- --create-only --name auth-enable-unaccent`,
  then apply it).
  Covers: enabling · Done when: `npm run prisma:migrate:deploy --workspace apps/backend` applies it on the local
  database and `SELECT unaccent('João')` returns `Joao`.

- [ ] **T-03** — Implement `PrismaUserRepository.findDirectoryPage` in `src/modules/auth/user.prisma.ts`: raw SQL
  with bound parameters over `users` — `status = 'approved'`, optional `role`, optional
  `unaccent(lower(name)) LIKE '%' || unaccent(lower($search)) || '%'` with `%`, `_` and `\` escaped, `ORDER BY`
  per D-04, `LIMIT` / `OFFSET`, and a `COUNT(*)` with the same filters — then load the page's users with their
  relations and map them to `User` in the query's order; tests in `src/modules/auth/user.prisma.spec.ts`
  (`describe("findDirectoryPage")`) for the filters, the escaping, both orders, paging and the total. Skill:
  [`backend-prisma-repository`](../../../.claude/skills/backend-prisma-repository).
  Covers: ER-01, ER-03, ER-04 · Done when: `npx vitest run src/modules/auth/user.prisma.spec.ts` (from
  `apps/backend`) passes.

- [ ] **T-04** — Add `GET /people` (protected) in `src/modules/auth/people.controller.ts`: `@CurrentUser()` plus
  `@Query()` `page`, `perPage`, `role`, `search`, `sort` passed as received to `ListPeople`, registered in
  `auth.module.ts`; `people.controller.spec.ts`; `people.integration.http` (default, filter + search, sort, page 2,
  non-approved, invalid query); and `test/people.e2e-spec.ts` with the cases named in ER-01–ER-05. Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01, ER-02, ER-03, ER-04, ER-05 · Done when: `npx vitest run src/modules/auth/people.controller.spec.ts`
  passes and `npm run test:e2e --workspace apps/backend -- people` passes against the local Postgres.

### Mobile (`apps/mobile`)

- [ ] **T-05** — Create `SegmentedControl` in `src/components/ui/segmented-control/`
  (`segmented-control.component.tsx`, `.types.ts`, `index.ts`) per D-08, with
  `segmented-control.component.test.tsx` (selected state, `onChange`, no call on the selected segment, generic
  values). Follows `.claude/rules/react.md`.
  Covers: ER-06 · Done when: `npx jest src/components/ui/segmented-control` passes.

- [ ] **T-06** — Create the people data layer in `src/modules/people/`: `people.types.ts` (`Person`,
  `PeoplePage`, `PeopleRole`, `PeopleSort`, mirroring the API), `constants/people.ts` (`PEOPLE_PAGE_SIZE = 20`,
  `PEOPLE_COUNT_PLACEHOLDER = 9`), `hooks/use-people.hook.ts` (`useInfiniteQuery` per D-07, authenticated `apiGet`
  with only the parameters set, deduplicated items) and `hooks/use-people-count.hook.ts` (D-06), with tests for the
  query string, the next-page rule, the end of the list and the deduplication.
  Covers: ER-07, ER-08 · Done when: `npx jest src/modules/people/hooks` passes.

- [ ] **T-07** — Create the people components in `src/modules/people/components/`: `person-avatar` (initials,
  D-10), `person-row` (avatar, name, "desde <MMM yyyy>", role chip, chevron; a `Pressable` row at least 44 pt tall),
  `person-sheet` (`BottomModal` with avatar, name, chip, the WhatsApp row per D-14 and the ghost "Fechar" `Button`)
  and `utils/role-chip.ts` (role → chip tone and label key), each with its test.
  Covers: ER-07, ER-12 · Done when: `npx jest src/modules/people/components src/modules/people/utils` passes.

- [ ] **T-08** — Create `PeopleScreen` in `src/modules/people/screens/people.screen.tsx` with its hook
  (`use-people-screen.hook.ts`: debounced search, role, sort, the selected person, error toasts): optional
  `BackButton` (`showBackButton`), eyebrow from `usePeopleCount`, title, `TextInput` search, `SegmentedControl`,
  the "A–Z" button, a `FlatList` of `PersonRow` with `onEndReached`, footer spinner, empty state, first-load
  spinner, error with retry, `RefreshControl`, and the `PersonSheet`; add every `people.*` key of the Copy table
  to `src/i18n/messages/{pt-BR,es-ES,en-US}.ts`; tests in `people.screen.test.tsx` for ER-07–ER-11.
  Covers: ER-07, ER-08, ER-09, ER-10, ER-11 · Done when: `npx jest src/modules/people` passes.

- [ ] **T-09** — Wire the routes: `src/app/(private)/student/(tabs)/school.tsx` renders `PeopleScreen` without a
  back button; new `src/app/(private)/admin/people.tsx` and `src/app/(private)/instructor/people.tsx` render it
  with one; add `routes.admin.people` (`/admin/people`) and `routes.instructor.people` (`/instructor/people`) to
  `src/constants/routes.ts`; route tests in `src/modules/{student,admin,instructor}/*-tabs.navigation.test.tsx`.
  Covers: ER-13, ER-14, ER-15 · Done when: `npx jest src/modules/student src/modules/admin src/modules/instructor`
  passes.

- [ ] **T-10** — Update the admin home `src/modules/admin/screens/admin.screen.tsx` per D-15: the "Ferramentas"
  section label above the "Entrar na escola" row, and the "Escola" section label above a "Pessoas" row (people icon,
  `t("people.count", { count: PEOPLE_COUNT_PLACEHOLDER })`, chevron) that pushes `routes.admin.people`; add
  `admin.home.toolsSection`, `admin.home.schoolSection` and `home.peopleRow` to the three message files; tests in
  `admin.screen.test.tsx`.
  Covers: ER-14 · Done when: `npx jest src/modules/admin/screens/admin.screen.test.tsx` passes.

- [ ] **T-11** — Replace the instructor placeholder `src/modules/instructor/screens/instructor.screen.tsx` with the
  "Painel" screen per D-15: `ScreenIntro` "Painel", the "Escola" section label and the "Pessoas" row (same look as
  the admin's, "9 na plataforma") pushing `routes.instructor.people`; add `instructor.home.title` to the three
  message files; tests in `instructor.screen.test.tsx`.
  Covers: ER-15 · Done when: `npx jest src/modules/instructor/screens/instructor.screen.test.tsx` passes.

### Verification

- [ ] **T-12** — Run every command in the Verification Plan from the repo root and follow the user journeys on
  the iOS simulator; all pass. Record the output summary as evidence. Covers: all · Done when:
  `run-related-tests.mjs 027` passes, `check-coverage.mjs 027` prints `COVERAGE OK`, `run-e2e.mjs 027` prints
  `E2E PASSED`, lint, type check and build exit 0, and the four journeys are recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 027` — the tests this spec added or changed, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 027` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 027` — the backend e2e suite passes, including `test/people.e2e-spec.ts`
    (Postgres up and migrations applied, `auth-enable-unaccent` included).
  - `npx turbo run lint check-types --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile`
    — no errors.
  - `npx turbo run build --filter=@rochas-surf-school/auth --filter=@rochas-surf-school/backend` — succeeds.
- User journeys (iOS simulator, backend running with at least 25 approved users of mixed roles — some with a shared
  number, some hidden, one with an accented name such as "João" — plus one pending account):
  1. Sign in as the student review account → Escola tab: "Pessoas", "N na plataforma" (N = approved users), no
     back button, 20 rows newest first; scroll to the end → the remaining rows load with a footer spinner; the
     pending account never appears.
  2. Type "joao" → "João …" is listed; press "Instrutores" → only instructors matching; clear the search → all
     instructors; press "A–Z" → instructors A–Z, button highlighted; press "Todos" → everyone A–Z; type "zzzz" →
     "Ninguém encontrado"; the eyebrow never changes.
  3. As the student, open a person who shares their number → "Conversar por WhatsApp" with the formatted number;
     tapping it tries to open WhatsApp (on the simulator without WhatsApp, the browser opens `wa.me` or the toast
     "Não foi possível abrir o WhatsApp." shows); open a person with a hidden number → no WhatsApp row; "Fechar"
     closes the sheet. Sign in as the admin review account and open the same hidden-number person → the WhatsApp row
     is shown.
  4. As the admin, home tab: "Ferramentas" / "Entrar na escola", "Escola" / "Pessoas · 9 na plataforma"; press
     "Pessoas" → the People screen with a back button, no tab bar; back returns home. Repeat as the instructor
     review account from "Painel".
  - Repeat 1 in dark mode and in en-US to check the tokens and the copy.

## Memory Impact

- `memory/product.md` — Current state: the People directory (approved users, search ignoring case and accents,
  role filter, A–Z, pages of 20, WhatsApp chat when the number is visible to the viewer) for every role; the
  student's Escola tab and the admin's and instructor's home "Pessoas" rows; out-of-scope items (removed accounts
  section, role actions, photos, class counts, the real home count) to the future evolution list; the People
  directory concept gains the sort and paging.
- `memory/technical-context.md` — Persistence: the `unaccent` extension and raw SQL for accent-insensitive search
  and sort; Authentication: `GET /people` (`ListPeople`, parameters, defaults, error keys, visibility rule);
  Fixed conventions → Mobile shared UI: `SegmentedControl`; Applications → `apps/mobile`: `useInfiniteQuery` for
  paginated lists (`usePeople`, key `["people", { role, search, sort }]`, `["people", "count"]`).
- `memory/structure.md` — `apps/mobile/src/modules/people/` (screens, components, hooks, constants, utils),
  `src/components/ui/segmented-control/`, the routes `/admin/people` and `/instructor/people`, the student's Escola
  tab rendering `PeopleScreen`, the instructor's Painel; `apps/backend/src/modules/auth/people.controller.ts` and
  the `auth-enable-unaccent` migration.
- `memory/modules/auth.md` — Accounts: the directory (who is listed, what each item carries, who sees a WhatsApp
  number, search, filter, sort, paging); Who can do what: any approved account reads the directory; In the app:
  the People screen and its entry points; spec history.

## Assumptions

- "9 na plataforma" on the admin and instructor home rows is a known fake number accepted by the user (D-05); it
  will be wrong for any school with another number of members until the follow-up route exists.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
