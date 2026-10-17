# Project Structure

Turbo monorepo (npm workspaces) with three groups of workspaces: `apps/*` (the executables: backend, mobile,
web), `modules/*` (framework-free business modules) and `packages/*` (shared kernel, design tokens and unused
Turbo configs). Workspace npm namespace: `@rochas-surf-school`.

## Root

```
package.json          # workspaces, root scripts (dev, build, lint, check-types, format), React/TypeScript overrides
turbo.json            # build / lint / check-types / test / test:e2e / dev tasks
CLAUDE.md, AGENTS.md  # agent instructions: commands, layout, design system, native builds
.docs/                # source documents: user-journeys.md, requirements.md, designs/*.html
.specs/               # project specs and memory (see below)
.claude/skills/       # project generator skills (module-*, backend-*, config-*) and the spec-* workflow
.github/workflows/    # ci.yml — runs the test suites of the affected apps on pull requests and pushes to main
.github/scripts/      # affected.mjs (which CI jobs a change needs, from turbo ls --affected) and its node --test tests
apps/  modules/  packages/
```

## `.specs/`

```
.specs/
  memory/      # living memory of the project: product, technical context, structure, modules
  scripts/     # the spec workflow's checks
  shared/      # rules every spec skill follows
  templates/   # models for specs and memory files
  changes/     # specs in progress
  finished/    # finished specs (prefix = finishing timestamp)
```

## `packages/`

- **`packages/shared`** (`@rochas-surf-school/shared`) — the shared kernel every module and the backend use:
  - `src/model/` — `Entity` base class (`EntityState`: UUID `id`, timestamps).
  - `src/usecase/` — the `UseCase<In, Out>` contract.
  - `src/db/` — repository contracts (`CrudRepository`, `CreateRepository`, `FindPageRepository`, `PageResult`…).
  - `src/error/` — `DomainError` and its HTTP-mapped subclasses (`validation`, `not-found`, `unauthorized`,
    `forbidden`, `conflict`, `too-many-requests`, `bad-gateway`).
  - `src/validation/rules/phone-number.rule.ts` — `PhoneNumberRule` (E.164, valid for its country, with
    `libphonenumber-js`).
  - `src/validation/` — `Validator` and the reusable rules in `rules/`.
  - `test/` — Jest tests mirroring `src/`.
- **`packages/design-tokens`** (`@rochas-surf-school/design-tokens`) — `src/tokens.ts` (source of truth) and
  the generated, committed `src/tokens.css`; `scripts/` holds the CSS generator.
- **`packages/eslint-config`**, **`packages/typescript-config`** — Turbo's stock shared configs, unused.

## `modules/` (pure business — no NestJS, Prisma, React or SDKs)

Organized by **aggregate**: each has `model/` (entities), `provider/` (repository and technical ports),
`usecase/`, and an `index.ts` barrel; tests in `modules/<m>/test/` mirror `src/`, with fakes in `test/mock/`.

- **`modules/auth`** (`@rochas-surf-school/auth`) — 4 aggregates:
  - `user/` — `model/user.entity.ts`, `provider/user.repository.ts` (with `addRulesAcceptance`, `findPending`,
    `updateIfPending`, the conditional write of a registration decision, and `findDirectoryPage`, the people
    directory's page),
    `provider/rules-version.provider.ts` (`RulesVersionProvider`: the current school rules version, read
    without depending on `school-rules`), `provider/registration-notifier.provider.ts` (`RegistrationNotifier`:
    tells admins and the person about a registration, without depending on `notifications`),
    `usecase/{create-user,update-user,delete-user,find-user-by-id,get-current-user,set-whatsapp,set-name,delete-account,request-reactivation,find-user-page,search-users-by-name}.usecase.ts`
    (`SetName`: an approved account renames itself; `DeleteAccount`: an approved account closes itself → `deleted`)
    and `usecase/account.out.ts` (`AccountOut` / `toAccountOut`: the account shape every answer carries, with
    `rulesAccepted`, `denialReason` and `reactivationStatus`);
    `usecase/{list-registrations,approve-registration,deny-registration}.usecase.ts` with
    `usecase/registration-access.ts` (approved-admin check, status first) and `usecase/pending-registration.ts`
    (`findPendingRegistration`: UUID check, 404, 409); `usecase/list-people.usecase.ts` (`ListPeople`: the people
    directory — access, query parsing, WhatsApp visibility).
  - `identity/` — `model/identity.entity.ts`, `provider/identity.repository.ts`,
    `provider/google-id-token.provider.ts` (`GoogleIdTokenProvider`: verifies a Google ID token),
    `usecase/{create-identity,sign-in-with-google}.usecase.ts`.
  - `sign-in-code/` — `model/sign-in-code.entity.ts` (also the TTL / cooldown / max-attempts constants and
    `normalizeEmail`), `provider/{sign-in-code.repository,sign-in-code.provider,email.provider,clock.provider}.ts`,
    `usecase/{request-sign-in-code,verify-sign-in-code,delete-expired-sign-in-codes}.usecase.ts`.
  - `session/` — `model/refresh-token.entity.ts`,
    `provider/{refresh-token.repository,token.provider,push-token-remover.provider}.ts` (`PushTokenRemover`:
    deletes a user's push token on sign-out),
    `usecase/{start-session,refresh-session,sign-out}.usecase.ts` and `usecase/refresh-token-input.ts` (the
    shared `refreshToken.token.required` check).
- **`modules/school-rules`** (`@rochas-surf-school/school-rules`; depends on `@rochas-surf-school/auth` for
  `UserRole` / `UserStatus`, and for `User`, `UserRepository`, `ClockProvider` and `toAccountOut` when accepting) —
  1 aggregate:
  - `school-rule/` — `model/school-rule.entity.ts`, `provider/school-rule.repository.ts` (`findAll`,
    `findById`, `getVersion`, `apply(change)` — one atomic change of saves, deletes and the version bump),
    `usecase/{list-school-rules,create-school-rule,update-school-rule,delete-school-rule,reorder-school-rules,accept-school-rules}.usecase.ts`,
    `usecase/school-rule-access.ts` (approved / approved-admin checks, status first),
    `usecase/school-rule-text.ts` (trimming) and `usecase/school-rules.out.ts` (`{ version, rules }`).
- **`modules/school-settings`** (`@rochas-surf-school/school-settings`; no dependency on `auth`) — 1 aggregate:
  - `school-settings/` — `model/school-settings.entity.ts` (also `SCHOOL_SETTINGS_ID`, the fixed id of the
    single row), `provider/school-settings.repository.ts` (`get`, `save`),
    `usecase/{get-school-settings,set-school-whatsapp}.usecase.ts`, `usecase/school-settings-actor.ts` and
    `usecase/school-settings.out.ts` (`{ whatsappNumber }`). Its in-memory repository and test actors are in
    `test/mock/`.
- **`modules/notifications`** (`@rochas-surf-school/notifications`; no dependency on `auth`) — 2 aggregates:
  - `notification/` — `model/notification.entity.ts` (`Notification` and `NOTIFICATION_TYPES`: `type` + `params`,
    no text), `provider/{notification.repository,push.provider,recipients.provider,clock.provider}.ts`
    (`PushProvider`: `send` → tickets, `getReceipts`; `RecipientsProvider.findApprovedAdminIds()`),
    `usecase/{notify,notify-approved-admins}.usecase.ts` (store every notification, then push to each device).
  - `push-token/` — `model/push-token.entity.ts` (`PushToken`, `PUSH_TOKEN_PATTERN`, `PUSH_LOCALES`),
    `model/push-ticket.ts` (a plain interface: its id is Expo's ticket id),
    `provider/{push-token.repository,push-ticket.repository}.ts`,
    `usecase/{register-push-token,remove-push-token,unregister-push-token,check-push-receipts}.usecase.ts`
    (`RemovePushToken` on sign-out; `UnregisterPushToken` when a phone turns pushes off). Fakes of every port and
    entity factories are in `test/mock/`.
- **`modules/classes`** (`@rochas-surf-school/classes`; depends on `@rochas-surf-school/auth` for `UserRole` /
  `UserStatus` only, and on `date-fns` + `@date-fns/tz`; also imported by `apps/mobile`) — 2 aggregates and an
  access helper:
  - `access/class-actor.ts` — `ClassActor`, `assertCanReadClasses` (approved) and `assertCanManageClasses`
    (approved admin; status first).
  - `location/` — `model/location.entity.ts` (`Location`, `LOCATION_NAME_MAX` / `LOCATION_ADDRESS_MAX`),
    `model/location-name.ts` (`normalizeLocationName`: NFD, accents removed, lower case — the stored `nameKey`),
    `provider/location.repository.ts` (`findAll`, `findById`, `existsByNameKey`, `create` — a duplicate is a
    `ConflictError`), `usecase/{list-locations,create-location}.usecase.ts`, `usecase/location.out.ts`.
  - `school-class/` — `model/class-limits.ts` (disciplines, levels, capacity / notes / batch limits,
    `CLASS_TIME_ZONE`), `model/time-range.ts` (`HH:mm` parsing, end after start, overlap),
    `model/class-batch.ts` (date, weekday and excluded-date checks, `listBatchDates`, `listBatchClasses`: the batch expanded
    to UTC instants from America/Fortaleza, with an optional `max` that stops early),
    `model/school-class.entity.ts` (`SchoolClass`), `model/class-state.ts` (`ClassState`, `getClassState`: the
    state by the clock, also used by the app),
    `provider/{school-class.repository,teacher-lookup.provider,class-assignment-notifier.provider,class-change-notifier.provider,seat-counter.provider,clock.provider,class-view-reader.provider}.ts`
    (`createMany` atomic, `findStartingBetween`, `findById`, `update` atomic; `TeacherLookup.findTeachers`;
    `ClassAssignmentNotifier.classAssigned` / `classUnassigned`; `ClassChangeNotifier.classEdited`;
    `SeatCounter.countSeatsTaken`; `ClassViewReader.findStartingBetween` / `findById` → `ClassView`, the read model
    with the location and the instructors' names),
    `usecase/{create-class-batch,list-time-range-suggestions,list-week-classes,get-class,edit-class}.usecase.ts`, and
    `usecase/class-item.ts` (`ClassItem`, `toClassItem`: the answer shape both reads share). Fakes of every port and entity
    factories are in `test/mock/`.

## `apps/backend` (NestJS — adapters)

```
prisma/
  schema.prisma                 # generator + datasource
  models/auth.model.prisma      # users, user_rules_acceptances, identities, sign_in_codes, refresh_tokens
  models/school-rules.model.prisma  # rules (created_by → users, SET NULL), rules_versions (one row, inserted
                                    # at version 0 by the school_rules migration)
  migrations/                   # <timestamp>_<module>[_<change>]/migration.sql
  models/school-settings.model.prisma  # school_settings (at most one row, created by the first save)
  models/notifications.model.prisma    # notifications, push_tokens (→ users, cascade), push_tickets (no foreign key)
  models/classes.model.prisma   # locations (unique name_key), classes (starts_at indexed; location_id → locations,
                                # created_by → users, both RESTRICT), class_instructors (class_id + user_id key;
                                # → classes and → users, cascade); enums class_discipline, class_level
  seed/main.ts                  # seed runner, one task per module
  seed/review-accounts.seed.ts  # upserts the REVIEW_ACCOUNTS users and their email identities
src/
  main.ts                       # bootstrap (PORT, CORS)
  app.module.ts                 # ConfigModule (global), ScheduleModule, DbModule, JwtAuthModule, AuthModule,
                                # SchoolRulesModule, SchoolSettingsModule, NotificationsModule, ClassesModule
  db/                           # DbModule + PrismaService (global), database URL from DATABASE_*
  generated/prisma/             # Prisma client (generated, gitignored)
  shared/                       # generated by backend-nest-config — never edit by hand
    auth/                       # JwtAuthModule, JwtStrategy (reloads the user per request), JwtAuthGuard
                                # (every 401 → auth.token.invalid), auth-user mapper
    decorators/                 # @Public(), @CurrentUser()
    errors/                     # ApiExceptionFilter, error response type
    types/                      # JwtPayload, CurrentUser, AuthenticatedRequest
  modules/auth/
    auth.module.ts              # wiring; ThrottlerModule for the auth routes; imports NotificationsModule (the
                                # RegistrationNotifier and PushTokenRemover adapters)
    auth.controller.ts          # POST /auth/email/code (202), POST /auth/email/verify (200), POST /auth/refresh (200),
                                # POST /auth/google (200), POST /auth/sign-out (204) — all @Public, throttled; GET /auth/me,
                                # PUT /auth/me/whatsapp, PUT /auth/me/name and POST /auth/me/reactivation-request
                                # (200), DELETE /auth/me (204) (protected)
    auth.integration.http       # manual REST Client requests
    registrations.controller.ts # GET /registrations, POST /registrations/:id/approve and /deny (200) — protected
    registrations.integration.http  # manual REST Client requests
    people.controller.ts        # GET /people (200) — protected; the people directory (ListPeople)
    people.integration.http     # manual REST Client requests
    auth.config.ts              # AuthConfig: AUTH_CODE_PEPPER, refresh TTL, REVIEW_ACCOUNTS parser, GOOGLE_WEB_CLIENT_ID
    {user,identity,sign-in-code,refresh-token}.prisma.ts   # Prisma repositories
    rules-version.prisma.ts     # PrismaRulesVersionProvider (reads the single rules_versions row)
    hmac.sign-in-code.ts        # HmacSignInCodeProvider (code generation + HMAC)
    jwt.token.ts                # JwtTokenProvider (access JWT, refresh token + hash)
    resend.email.ts             # ResendEmailProvider (pt-BR/es/en copy, dev log fallback)
    google.id-token.ts          # GoogleAuthIdTokenProvider (google-auth-library verifyIdToken, web client id audience)
    system.clock.ts             # SystemClockProvider
    sign-in-code-cleanup.job.ts # every-minute cron deleting expired codes
    account-erasure.job.ts      # every-minute cron running EraseDeniedRegistrations (logs only the count)
  modules/school-rules/
    school-rules.module.ts      # wiring (DbModule; also provides PrismaUserRepository and SystemClockProvider)
    school-rules.controller.ts  # GET /school-rules (200), POST /school-rules (201), PUT /school-rules/order,
                                # PUT /school-rules/:id, DELETE /school-rules/:id (200) — all protected;
                                # every route answers { version, rules }; POST /school-rules/acceptances (200,
                                # protected) answers the account
    school-rule.prisma.ts       # PrismaSchoolRuleRepository (apply runs in one $transaction)
    school-rules.integration.http  # manual REST Client requests
  modules/school-settings/
    school-settings.module.ts   # wiring (DbModule)
    school-settings.controller.ts  # GET /school-settings and PUT /school-settings/whatsapp (200) — protected;
                                # both answer { whatsappNumber }
    school-settings.prisma.ts   # PrismaSchoolSettingsRepository (get reads the fixed row, save upserts it)
    school-settings.integration.http  # manual REST Client requests
  modules/notifications/
    notifications.module.ts     # wiring (DbModule); exports the adapters of auth's and classes' ports
    notifications.controller.ts # PUT and DELETE /notifications/push-token (204) — protected
    notifications.integration.http  # manual REST Client requests
    {notification,push-token,push-ticket,recipients}.prisma.ts  # Prisma repositories; PrismaRecipientsProvider
                                # (role admin and status approved)
    expo.push.ts                # ExpoPushProvider (expo-server-sdk: chunks, tickets, receipts)
    push-messages.ts            # renderPush: the push copy in pt-BR / es / en
    notifications.registration-notifier.ts  # RegistrationNotifier adapter (Notify / NotifyApprovedAdmins; logs
                                # and swallows every error)
    notifications.push-token-remover.ts     # PushTokenRemover adapter (RemovePushToken)
    notifications.registration-notification-eraser.ts  # RegistrationNotificationEraser adapter
                                # (DeleteRegistrationNotifications)
    notifications.class-assignment-notifier.ts  # ClassAssignmentNotifier adapter of classes (Notify
                                # class.assigned / class.unassigned; logs and swallows every error)
    notifications.class-change-notifier.ts  # ClassChangeNotifier adapter of classes (Notify class.edited; logs
                                # and swallows every error)
    push-receipt-check.job.ts   # every-minute cron running CheckPushReceipts
    system.clock.ts             # SystemClockProvider
  modules/classes/
    classes.module.ts           # wiring (DbModule; imports NotificationsModule for the class-assignment and
                                # class-change notifiers)
    locations.controller.ts     # GET /locations (200), POST /locations (201) — protected
    classes.controller.ts       # POST /classes/batch (201 { count }), GET /classes/time-range-suggestions (200),
                                # GET /classes?date= (200, one week), GET /classes/:id (200), in that order, and
                                # PUT /classes/:id (200 ClassItem) — protected
    {location,school-class}.prisma.ts  # Prisma repositories (P2002 on name_key → location.name.duplicate;
                                # createMany and update write classes and instructors in one $transaction)
    no-enrolment.seat-counter.ts  # NoEnrolmentSeatCounter (SeatCounter answering 0 until enrolment)
    teacher-lookup.prisma.ts    # PrismaTeacherLookup (id, role and status of the given users)
    class-view-reader.prisma.ts # PrismaClassViewReader (one query per read, with the location and instructors' names)
    system.clock.ts             # SystemClockProvider of the module (the e2e suite overrides it)
    {locations,classes}.integration.http  # manual REST Client requests
test/
  auth-email.e2e-spec.ts        # e2e suite of the email sign-in routes (Resend replaced by a capturing fake)
  auth-session.e2e-spec.ts      # e2e suite of GET /auth/me, POST /auth/refresh and POST /auth/sign-out
  auth-whatsapp.e2e-spec.ts     # e2e suite of PUT /auth/me/whatsapp (approved accounts created through Prisma)
  auth-profile.e2e-spec.ts      # e2e suite of PUT /auth/me/name and DELETE /auth/me (accounts in each status through Prisma)
  auth-reactivation.e2e-spec.ts # e2e suite of POST /auth/me/reactivation-request (accounts in each state through Prisma)
  auth-google.e2e-spec.ts       # e2e suite of POST /auth/google (GoogleAuthIdTokenProvider replaced by a fake)
  registrations.e2e-spec.ts     # e2e suite of the /registrations routes (accounts through Prisma; concurrency)
  people.e2e-spec.ts            # e2e suite of GET /people (accounts through Prisma, isolated by a per-test name tag)
  school-rules.e2e-spec.ts      # e2e suite of the /school-rules routes (tokens minted with JwtTokenProvider)
  school-rules-acceptance.e2e-spec.ts  # e2e suite of POST /school-rules/acceptances (rows checked through Prisma)
  school-settings.e2e-spec.ts   # e2e suite of the /school-settings routes (accounts in each status and role through Prisma)
  notifications.e2e-spec.ts     # e2e suite of push tokens, sign-out with a push token and the registration
                                # notifications (ExpoPushProvider replaced by a recording fake)
  account-erasure.e2e-spec.ts   # e2e suite of AccountErasureJob (accounts through Prisma; signing up again by
                                # email code and Google)
  locations.e2e-spec.ts         # e2e suite of /locations (order, duplicates, concurrency, validation, access)
  classes.e2e-spec.ts           # e2e suite of /classes (batches, refusals, past, suggestions, week, class, access,
                                # notifications; the clock and ExpoPushProvider replaced by fakes)
Dockerfile, docker-compose.yml  # backend + Postgres
```

`AppModule` registers `JwtAuthGuard` as `APP_GUARD` and `ApiExceptionFilter` as `APP_FILTER` (both global);
open routes opt out with `@Public()`.

## `apps/mobile` (Expo / React Native — the product app)

```
src/
  app/                          # Expo Router routes only (each renders a screen)
    _layout.tsx                 # fonts, theme variables, bottom sheets, QueryClientProvider, AlertMessageProvider,
                                # SessionProvider; renders RootNavigator inside SplashGate
    index.tsx                   # redirects to the entry route of the resolved flow
    (public)/auth/_layout.tsx   # Stack of the signed-out flow
    (public)/auth/index.tsx     # sign-in screen
    (public)/auth/email.tsx             # Choose screen: "I have an account" / "I'm new here" (/auth/email)
    (public)/auth/email-sign-in.tsx     # Sign in with email screen (/auth/email-sign-in)
    (public)/auth/create-account.tsx    # Create account screen (optional param: email, prefilled)
    (public)/auth/confirm-code.tsx      # Confirm email screen (params: email, optional name — absent on the
                                        # sign-in path)
    (public)/auth/google-name.tsx       # "Your name" screen of a Google sign-up (params: idToken, optional name)
    (pending)/pending/{_layout,index}.tsx            # pending flow: waiting for approval (/pending)
    (onboarding)/onboarding/_layout.tsx              # onboarding flow of an approved account
    (onboarding)/onboarding/index.tsx                # WhatsApp step (/onboarding)
    (onboarding)/onboarding/school-rules.tsx         # School rules step (/onboarding/school-rules)
    (rules-update)/rules-update/{_layout,index}.tsx  # rules-update flow: "Regras atualizadas" (/rules-update;
                                                     # swipe-back off)
    (reactivation)/reactivation/{_layout,index}.tsx  # reactivation flow of a deleted account (/reactivation)
    (offboarding)/offboarding/{_layout,denied,removed}.tsx   # denied / removed screens, each guarded by its flow
    (private)/{student,instructor,admin}/_layout.tsx # the role's Stack: its (tabs) group and the inner screens
    (private)/<role>/(tabs)/_layout.tsx              # the role's native tab bar (RoleTabs)
    (private)/student/(tabs)/{index,my-classes,school,profile}.tsx  # Agenda (/student, the week of classes),
                                                     # Minhas aulas, Escola, Perfil
    (private)/{instructor,admin}/(tabs)/{index,classes,profile}.tsx # Início (/instructor, /admin), Aulas (the week
                                                     # of classes; the admin's with canCreate), Perfil
    (private)/<role>/{edit-profile,whatsapp,school-rules}.tsx  # the Profile's inner screens, above the tab bar
    (private)/admin/registrations.tsx                # "Join the school" tool (/admin/registrations), above the tab bar
    (private)/admin/new-class.tsx                    # "Nova aula" (/admin/new-class, optional ?date=), above the tab bar
    (private)/admin/edit-class/[id].tsx              # "Editar aula" (/admin/edit-class/<id>), above the tab bar
    (private)/{student,instructor,admin}/class/[id].tsx  # class details (/<role>/class/<id>), above the tab bar
    (private)/{admin,instructor}/people.tsx          # the People screen with a back button (/admin/people,
                                                     # /instructor/people), above the tab bar; the student's
                                                     # (tabs)/school.tsx renders it without one
  navigation/
    resolve-flow.ts             # Flow, resolveFlow (session user → flow), isOnboardingCompleted (number +
                                # rulesAccepted; rulesAcceptedBefore picks rules-update), onboardingStep (whatsapp / school-rules), flowEntryRoute
                                # (flow + user → entry route)
    root-navigator/             # RootNavigator: root Stack with one Stack.Protected per flow group; useRootNavigator;
                                # mounts useSessionExpired and the three notification hooks
    splash-gate/                # SplashGate: keeps the native splash screen until the fonts are ready and the
                                # stored session was restored, then renders its children (StatusBar, RootNavigator)
    rules-update-layout.test.tsx  # layout test of the rules-update group (a test under src/app would be a route)
  modules/instructor/screens/instructor.screen.tsx  # the instructor's Início: "Painel" with the Escola section
                                # and the People row
  modules/{student,instructor,admin}/*-tabs.navigation.test.tsx  # route tests of each role's tab bar
  modules/admin/
    screens/admin.screen.tsx    # admin home: "School tools"; "Tools" with the "Join the school" row and its
                                # pending count and the "Criar aulas" row, "School" with the People row
    screens/registrations.screen.tsx  # "Join the school": DecisionCards (pull-to-refresh, loading, empty,
                                # error + retry), DecidedList, one DenySheet
    registrations.types.ts      # Registration, RegistrationsResponse, RegistrationDecision (mirror the API)
    hooks/                      # use-registrations (query ["registrations"]), use-approve-registration,
                                # use-deny-registration (mutations), use-registrations-screen (the screen's logic:
                                # decisions, "Decided just now", the sheet, toasts)
    utils/                      # registration-error.ts (API error → translation key), registrations-cache.ts
                                # (removeRegistration: drop a decided item from the cache and invalidate)
  modules/people/               # the people directory, the same for every role
    screens/people.screen.tsx   # PeopleScreen (showBackButton): count eyebrow, title, search, RoleFilters, FlatList
                                # grouped by first letter (end-reached paging, footer spinner, empty, loading,
                                # error + retry, pull-to-refresh), PersonSheet
    people.types.ts             # Person, PeoplePage, PeopleRole, PeopleFilters (mirror the API)
    constants/people.ts         # PEOPLE_PAGE_SIZE (20), PEOPLE_ROLES (fixed order), PEOPLE_COUNT_PLACEHOLDER (9)
    hooks/                      # use-people (infinite query ["people", { roles, search }]), use-people-count
                                # (["people", "count"]), use-people-screen (debounce, roles, sheet, toasts)
    components/                 # role-filters (one toggle button per role), person-avatar (initials), person-row,
                                # person-sheet (WhatsApp row or "not shared", Close), people-entry-row (the
                                # homes' "People · N on the platform" row)
    utils/                      # people-query.ts (buildPeoplePagePath), group-by-initial.ts, format-since.ts
                                # ("MMM yyyy"), format-whatsapp-number.ts, role-chip.ts (role → chip tone and label)
  modules/classes/              # the week of classes and their details (every role), creating and editing classes
                                # (admins);
                                # imports @rochas-surf-school/classes for the batch expansion, time-range checks,
                                # limits and getClassState
    screens/new-class.screen.tsx  # NewClassScreen + new-class.screen.hook.ts (useNewClassScreen: form state, D-15
                                # defaults, the optional date param, count, summary, submit and its errors)
    screens/classes-week.screen.tsx  # ClassesWeekScreen + hook (the week, the selected day, states,
                                # pull-to-refresh, the admin's entry points); the Agenda and Aulas tabs
    screens/class-details.screen.tsx  # ClassDetailsScreen + hook (one class by the route's id, banners, "Você",
                                # the admin's pencil with canEdit)
    screens/edit-class.screen.tsx  # EditClassScreen + hook (useEditClassScreen: the class's values plus the
                                # changes, single day and time, started mode, states, submit and its errors)
    classes.types.ts            # ClassLocation, Teacher, NewClassForm, BatchRequest, EditClassRequest,
                                # CalendarMonth, ClassItem, WeekClasses and the answers (mirror the API)
    components/                 # form-section, date-range-calendar (+ calendar-day), date-range-summary (the
                                # range and its removed days), time-range-picker, time-range-hint (the chips' hint),
                                # time-range-sheet (two @expo/ui DateTimePickers in time mode),
                                # location-picker, location-sheet, capacity-stepper, instructor-picker,
                                # week-nav (arrows, caption, "Hoje"), day-strip (seven days, dots), class-card
    hooks/                      # use-locations (["locations"]), use-create-location (adds to that cache),
                                # use-time-range-suggestions (["classes", "time-range-suggestions"]), use-teachers
                                # (["people", "teachers"], every page of GET /people?role=instructor,admin&perPage=50),
                                # use-create-classes (POST /classes/batch, no retry; invalidates ["classes", "week"]),
                                # use-edit-class (PUT /classes/:id, no retry; invalidates the weeks and the details),
                                # use-week-classes (["classes", "week", weekStart]), use-class (["classes", "detail",
                                # id]), use-now (the clock, every 60 s)
    utils/                      # calendar.ts (Fortaleza today and minutes, month grid, pressDay: ranges and their
                                # removed days, initialRange), week.ts (Monday of a day, relative week, captions,
                                # the date line), time-ranges.ts (incl. startsByNow),
                                # batch-request.ts (form → request body), class-error.ts (API error → translation
                                # key, for Nova aula and Editar aula), locations-cache.ts
    classes.test-utils.tsx      # shared test helpers of the module
  modules/notifications/
    hooks/                      # use-push-registration (PUT /notifications/push-token for pending / approved;
                                # the DELETE instead while pushes are off), use-push-preference (the Profile's switch),
                                # use-notification-response (a tapped push → refresh → "Join the school", the
                                # Aulas tab for class.assigned, or "/"), use-notification-received (a push with the
                                # app open → refresh, or invalidate ["registrations"] / ["classes", "week"])
    utils/refresh-account.ts    # GET /auth/me → updateUser; null on failure, rethrows SessionExpiredError
    utils/unregister-push-token.ts  # DELETE /notifications/push-token without asking the permission; failures ignored
  modules/offboarding/
    screens/                    # denied.screen.tsx (reason card when given), removed.screen.tsx — both on
                                # AccountStatus with ContactSchoolButton and "Use another email" (sign-out)
    components/contact-school-button/  # ContactSchoolButton: WhatsApp button, only when the school has a number;
                                # opens https://wa.me/<digits>, toast when the link fails
    hooks/use-school-whatsapp.hook.ts  # useSchoolWhatsapp: GET /school-settings (authenticated) → number or null
  modules/reactivation/
    screens/reactivation.screen.tsx  # Account deleted: one AccountStatus per reactivationStatus (not requested,
                                # requested, denied)
    hooks/use-request-reactivation.hook.ts  # POST /auth/me/reactivation-request; updates the session (denied on
                                # a 409); toast; signs out on a 403
  modules/onboarding/
    screens/                    # whatsapp.screen.tsx, school-rules.screen.tsx
    components/                 # whatsapp (welcome header around the shared WhatsappNumberForm)
                                # school-rules.screen.tsx renders SchoolRulesAcceptance with the schoolRules.* copy
    hooks/use-save-whatsapp.hook.ts  # PUT /auth/me/whatsapp; updates the session; toast (also used by the Profile)
  modules/rules-update/
    screens/rules-update.screen.tsx  # "Regras atualizadas": SchoolRulesAcceptance with the rulesUpdate.* copy
  modules/school-rules/         # the rules shown in the app, reused by every screen that shows them
    school-rules.types.ts       # SchoolRule, SchoolRules (mirror the API; no dependency on the module workspace)
    hooks/use-school-rules.hook.ts  # useSchoolRules: GET /school-rules, query key ["school-rules"]
    hooks/use-accept-school-rules.hook.ts  # POST /school-rules/acceptances; updates the session; on a 409
                                # reloads the rules (onOutdated); toast
    components/                 # school-rules-list (card: loading, error + retry, empty, numbered rows),
                                # school-rule-row (number, title, description), school-rules-acceptance
                                # (SchoolRulesAcceptance: icon, eyebrow/title/description/submitLabel props,
                                # SchoolRulesList, fixed footer with the Checkbox and the CTA), school-rules-reader
                                # (read-only: BackButton, shield ScreenIntro, SchoolRulesList)
    screens/school-rules.screen.tsx  # the rules read from the Profile (/<role>/school-rules)
  modules/profile/              # the Profile tab, the same for every role
    screens/                    # profile.screen.tsx (rendered by every (tabs)/profile.tsx), edit-profile.screen.tsx,
                                # profile-whatsapp.screen.tsx
    components/                 # profile (rows, sheets and their state), profile-header (avatar, name, role chip),
                                # profile-avatar (initials; camera button on Edit profile), profile-card, profile-row,
                                # edit-profile, profile-whatsapp, sign-out-sheet, delete-account-sheet, about-sheet
    hooks/                      # use-update-name (PUT /auth/me/name), use-delete-account (DELETE /auth/me, then
                                # sign-out), use-open-url (in-app browser, toast on failure)
    constants/about.ts          # the About sheet's mocked content (version, creator, links)
    utils/web-pages.ts          # getWebPageUrl: privacy policy / terms of use from EXPO_PUBLIC_WEB_URL and the language
  modules/pending/
    screens/pending.screen.tsx  # Pending screen (waiting for approval, sign-out)
    components/                 # pending (header, timeline, sign-out; ticks every 60 s), pending-step (one row)
  modules/auth/
    screens/                    # auth.screen.tsx, email-choice.screen.tsx, email-sign-in.screen.tsx,
                                # create-account.screen.tsx, confirm-code.screen.tsx, google-name.screen.tsx
    components/                 # auth (sign-in), auth-button, email-choice (+ its row,
                                # choice-row), email-sign-in, create-account, confirm-code (code entry, verify,
                                # resend countdown, both paths), google-name ("Your name") — each component + hook
    email-auth.navigation.test.tsx  # navigation tests of the email paths against the real auth route files
    hooks/                      # use-request-sign-in-code.hook.ts (POST /auth/email/code),
                                # use-verify-sign-in-code.hook.ts (POST /auth/email/verify),
                                # use-sign-in-with-google.hook.ts (POST /auth/google),
                                # use-google-sign-in.hook.ts (Google picker → POST /auth/google → session or
                                # "Your name"), use-sign-out.hook.ts (the store's signOut(): clears the session
                                # at once, then POST /auth/sign-out with the newest refresh token; GoogleSignin.signOut()),
                                # use-session-expired.hook.ts (useSessionExpired: the "session expired" toast once,
                                # clears the query cache, signs out of Google)
    utils/                      # sign-in-code-error.ts, verify-code-error.ts (API error → translation key,
                                # and inline or toast for the code check; on the sign-in path a name error
                                # sends the person to Create account), field-validation.ts (isValid with the
                                # shared rules, getStatus: error only after blur and when not empty, nameRules),
                                # google-sign-in-error.ts (Google / API error → translation key, or null to ignore)
  components/ui/                # design-system components (same names/props as web), one folder each: button,
                                # chip, bottom-modal (optional contentPanningEnabled, off in the time sheet so the
                                # wheels can be dragged), otp-input, text-button, back-button, screen-intro,
                                # text-input, text-area, toast, checkbox, segmented-control
  components/decision/          # the admin tools' shared pieces: decision-card (DecisionCard), decided-list
                                # ("Decided just now"), deny-sheet (DenySheet: optional reason in a bottom sheet)
  utils/                        # app-wide helpers: format-created-at.ts ("now", relative up to 7 days, then the
                                # date), get-initials.ts, countries.ts (country options with localized names and
                                # dial codes, filter, default BR), brazilian-phone.ts (toBrazilianDigits,
                                # formatBrazilianPhone: the Brazilian number mask)
  providers/alert-message/      # AlertMessageProvider + useAlertMessage (toast for API errors)
  providers/session/            # SessionProvider + useSession: the session store exposed to React
                                # (user, tokens, isRestoring, setSession, updateUser, clearSession); starts the restore
  components/flow-placeholder/  # FlowPlaceholder: a flow's name on an empty screen (also the placeholder tabs)
  components/role-tabs/         # RoleTabs: a role's NativeTabs (tint sun / ink-3, background page)
  components/language-sheet/    # LanguageSheet: sign-in screen and Profile; stores the choice
  components/theme-sheet/       # ThemeSheet: same as phone / light / dark
  components/whatsapp-number-form/  # WhatsappNumberForm: country, number (Brazilian mask), share switch, submit
  components/country-picker/    # CountryPicker: searchable bottom sheet of countries with their dial codes
  components/account-status/    # AccountStatus: the shared layout of every closed-account state (icon tile by
                                # tone, eyebrow, title, description, optional note card and primary action,
                                # "Use another email")
  services/google-sign-in.ts    # configures GoogleSignin once; the only import point of the Google library
  services/push/push.service.ts # expo-notifications: foreground handler and Android channel at load,
                                # getPushToken({ askPermission }), isPushPermissionDenied(), the token registered
                                # in this session
  services/preferences/         # device preferences in SecureStore (prefs.theme / prefs.locale / prefs.pushEnabled,
                                # synchronous reads); theme-preference.ts (Appearance.setColorScheme,
                                # useThemePreference)
  services/api/                 # fetch client (apiGet, apiPost, apiPut, apiDelete with { authenticated, timeoutMs }: token,
                                # renewal and one retry after a 401), api.request.ts (rawRequest: the bare HTTP call),
                                # ApiError, NetworkError, SessionExpiredError
  services/session/             # the session, React-free: session.store.ts (state, sign-out generation, the single
                                # in-flight refresh, signOut — which sends the registered push token), session.storage.ts (expo-secure-store keys
                                # session.tokens / session.user), session.refresh.ts (getAccessToken with the
                                # 60 s margin, refreshSession), session.restore.ts (launch restore via GET /auth/me)
  i18n/                         # i18next setup (starts from the stored locale, else the phone's); messages/{en-US,es-ES,pt-BR}.ts (en-US is the source of the keys);
                                # backend-locale.ts (toBackendLocale: app locale → en / es / pt-BR)
  constants/                    # routes.ts (every app path; routes.home is "/"), theme.ts (design tokens), theme-variables.ts
                                # (--ds-* per scheme), fonts
  hooks/                        # useTheme, color scheme
plugins/with-ios-scene-lifecycle.js    # config plugin (UIScene life cycle for iOS 27)
jest.config.js, jest.setup.ts   # jest-expo + RNTL; mocks localization, reanimated, safe-area, bottom sheet,
                                # expo-notifications, expo-device, expo-constants, @expo/ui's DateTimePicker
```

Components follow one folder per component (`*.component.tsx`, `*.hook.ts`, `*.types.ts`, `index.ts`), with
the test next to it. `ios/` and `android/` are generated by `expo prebuild` and gitignored.

## `apps/web` (Next.js — public pages)

```
src/
  app/
    globals.css                 # maps the design tokens to Tailwind utilities; theme toggle icon swap
    favicon.ico
    [lang]/                     # lang: pt-br | es | en (any other → 404); every page statically generated
      layout.tsx                # root layout: <html lang>, pre-paint theme script, fonts, SiteHeader, 640px column, footer
      page.tsx                  # home: ScreenIntro + LinkRows to the three pages
      privacy-policy/page.tsx   # the privacy policy (fourteen cards: controller, encarregado, bases, retention, rights…)
      terms-of-use/page.tsx     # the terms of use (ten cards)
      account-deletion/page.tsx # how to delete an account; primary Button to the school's WhatsApp
  proxy.ts                      # redirects /, /privacy-policy, /terms-of-use, /account-deletion to the browser's language
  i18n/
    locales.ts                  # locales, defaultLocale (pt-br), hasLocale, matchLocale, html lang, names, flags
    dictionary.types.ts         # Dictionary: every string of the site
    dictionaries/{pt-br,es,en}.ts
    get-dictionary.ts           # server-side loader
  config/school-whatsapp.ts     # SCHOOL_WHATSAPP_NUMBER → formatted number + wa.me link; throws at build if invalid
  config/school-legal.ts        # SCHOOL_LEGAL_NAME, SCHOOL_CNPJ (optional), DPO_NAME, DPO_EMAIL; throws at build if invalid
  components/                   # one folder each: site-header, language-picker and theme-toggle (the only client
                                # components), screen-intro, content-card, link-row
  components/ui/{button,chip}/  # design-system components (same names/props as mobile; Button also takes href)
  **/*.test.{ts,tsx}            # Vitest + React Testing Library tests, next to the file (locales, theme-toggle,
                                # language-picker, button, chip)
e2e/                            # Playwright suite (*.e2e.ts): pages, redirect, theme-toggle, language-picker
vitest.config.ts                # jsdom, @/ alias, src/**/*.test.{ts,tsx}, v8 coverage; vitest.setup.ts (jest-dom, cleanup)
playwright.config.ts            # Chromium; webServer builds and starts the app on port 3100
```

No `public/` folder. `README.md` describes the site, its routes and `SCHOOL_WHATSAPP_NUMBER` and the legal variables.
