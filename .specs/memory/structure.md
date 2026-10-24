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
    `provider/teaching-releaser.provider.ts` (`TeachingReleaser`: takes a person off their upcoming classes,
    without depending on `classes`), `provider/seat-releaser.provider.ts` (`SeatReleaser`: gives up a person's
    upcoming seats and pending requests, without depending on `enrolment`; spec 043),
    `usecase/{create-user,update-user,delete-user,find-user-by-id,get-current-user,set-whatsapp,set-name,delete-account,request-reactivation,find-user-page,search-users-by-name}.usecase.ts`
    (`SetName`: an approved account renames itself; `DeleteAccount`: an approved account releases its upcoming
    classes, then its seats and requests, then closes itself → `deleted`)
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
    `usecase/{get-school-settings,set-school-whatsapp,set-waiting-list}.usecase.ts` (`set-waiting-list`, spec 046),
    `usecase/school-settings-actor.ts` and `usecase/school-settings.out.ts` (`{ whatsappNumber, waitingListEnabled }`). Its in-memory repository and test actors are in
    `test/mock/`.
- **`modules/notifications`** (`@rochas-surf-school/notifications`; no dependency on `auth`) — 2 aggregates:
  - `notification/` — `model/notification.entity.ts` (`Notification` and `NOTIFICATION_TYPES`: `type` + `params`,
    no text; `readAt`, null while unread), `provider/{notification.repository,push.provider,recipients.provider,clock.provider}.ts`
    (`PushProvider`: `send` → tickets, `getReceipts`; `RecipientsProvider.findApprovedAdminIds()`),
    `usecase/{notify,notify-approved-admins,notify-classes-without-instructor}.usecase.ts` (store every
    notification, then push to each device; the last one tells the approved admins minus the excluded ones),
    `usecase/{list-notifications,count-unread-notifications,mark-notification-read,mark-all-notifications-read}.usecase.ts`
    (the caller's own notifications on the notifications screen; spec 055).
  - `push-token/` — `model/push-token.entity.ts` (`PushToken`, `PUSH_TOKEN_PATTERN`, `PUSH_LOCALES`),
    `model/push-ticket.ts` (a plain interface: its id is Expo's ticket id),
    `provider/{push-token.repository,push-ticket.repository}.ts`,
    `usecase/{register-push-token,remove-push-token,unregister-push-token,check-push-receipts}.usecase.ts`
    (`RemovePushToken` on sign-out; `UnregisterPushToken` when a phone turns pushes off). Fakes of every port and
    entity factories are in `test/mock/`.
- **`modules/classes`** (`@rochas-surf-school/classes`; depends on `@rochas-surf-school/auth` for `UserRole` /
  `UserStatus` only, and on `date-fns` + `@date-fns/tz`; also imported by `apps/mobile`) — 3 aggregates and an
  access helper:
  - `access/class-actor.ts` — `ClassActor`, `assertCanReadClasses` (approved) and `assertCanManageClasses`
    (approved admin; status first).
  - `location/` — `model/location.entity.ts` (`Location`: name, address, the point and `archivedAt`;
    `LOCATION_NAME_MAX` / `LOCATION_ADDRESS_MAX`; the point rule), `model/location-name.ts` (`normalizeLocationName`:
    NFD, accents removed, lower case — the stored `nameKey`), `provider/location.repository.ts` (`findActive(now)`
    with the upcoming counts, `findById`, `existsByNameKey`, `create` — a duplicate is a `ConflictError` —,
    `update(location, { clearDeadlinesFrom })` atomic, `archive(id)` conditional, `findUpcomingInstructorCounts`),
    `provider/location-change-notifier.provider.ts` (`LocationChangeNotifier.locationChanged`),
    `provider/address-suggestion.provider.ts` (`AddressSuggestionProvider.suggest` / `findPlace`; spec 037),
    `usecase/{list-locations,create-location,edit-location,archive-location,suggest-addresses,find-address-place}.usecase.ts`,
    `usecase/address-suggestion.rules.ts` (the query, session-token and language checks), `usecase/location.out.ts`.
  - `cancellation-rule/` (spec 036) — `model/cancellation-rule.entity.ts` (`CancellationRule`,
    `CANCELLATION_RULE_TEXT_MAX`), `provider/cancellation-rule.repository.ts` (`findAll`, `save(rule, now)`: the
    rule and the clearing of its discipline's upcoming deadlines in one write),
    `usecase/{list-cancellation-rules,save-cancellation-rule}.usecase.ts`, `usecase/cancellation-rules.out.ts`
    (`{ surf, skate }`).
  - `school-class/` — `model/class-limits.ts` (disciplines, levels, capacity / notes / batch limits,
    `CLASS_TIME_ZONE`), `model/time-range.ts` (`HH:mm` parsing, end after start, overlap),
    `model/class-batch.ts` (date, weekday and excluded-date checks, `listBatchDates`, `listBatchClasses`: the batch expanded
    to UTC instants from America/Fortaleza, with an optional `max` that stops early),
    `model/school-class.entity.ts` (`SchoolClass`), `model/class-state.ts` (`ClassState`, `getClassState`: the
    state by the clock, or `cancelled` when the class has `cancelledAt`; also used by the app),
    `model/class-flags.ts` (`isWithoutInstructor` and `isWithoutDeadline`: the computed "no instructor" and "no
    cancellation deadline" flags; also used by the app), `model/cancellation-deadline.ts`
    (`CancellationDeadlineDescription`, `computeCancellationDeadline`: the instant from the model's description),
    `provider/{school-class.repository,teacher-lookup.provider,class-assignment-notifier.provider,class-change-notifier.provider,seat-counter.provider,pending-request-counter.provider,clock.provider,class-view-reader.provider,no-instructor-notifier.provider,cancellation-deadline-describer.provider,class-roster-reader.provider,viewer-enrolment-reader.provider,class-enrolments-closer.provider,class-audience-reader.provider,my-classes-reader.provider,class-contact-reader.provider,class-reminder-notifier.provider,teaching-classes-reader.provider}.ts`
    (`createMany` atomic, `findStartingBetween`, `findById`, `update` atomic and conditional (clearing the deadline
    and, spec 054, the reminder mark when asked; the mark is never written from the entity), `cancel` and `delete` conditional, `findUpcomingTaughtBy`, `removeInstructor` atomic,
    `findNeedingDeadline`, `saveDeadline` and `recordDeadlineFailure` conditional on the deadline revision;
    `CancellationDeadlineDescriber.describe` (the language-model port);
    `TeacherLookup.findTeachers`; `ClassAssignmentNotifier.classAssigned` / `classUnassigned`;
    `ClassChangeNotifier.classEdited` / `classCancelled` / `classDeleted`;
    `NoInstructorNotifier.classesWithoutInstructor`; `SeatCounter.countSeatsTaken`; `PendingRequestCounter.countPendingRequests`; `ClassViewReader.findStartingBetween` / `findById` / `findByIds` (spec 048) → `ClassView`, the read model
    with the location and the instructors' names; `ClassRosterReader.findRosters` → `ClassRoster` per class id, the
    seats taken and the approved students, with `CLASS_CARD_STUDENTS_LIMIT`; `ViewerEnrolmentReader.findLatest` → the
    reader's latest enrolment per class id; `ClassEnrolmentsCloser.closeOpenEnrolments` → the students whose
    enrolment a cancellation ended — the last three answered by enrolment's adapters, spec 041;
    `ClassAudienceReader.findClassAudience` / `findLocationAudience` → the students with a seat or a pending request,
    of one class or of a location's upcoming classes with their counts, spec 047;
    `MyClassesReader.findCurrentClassIds` / `findHistoryClassIds` → a student's class ids, spec 048;
    `findDueForReminder` and the conditional `markReminded` of the repository and
    `ClassReminderNotifier.classReminder`, spec 054; `TeachingClassesReader.findCurrentClassIds` / `teachesAny` → the
    classes a person teaches, spec 057),
    `usecase/{create-class-batch,list-time-range-suggestions,list-week-classes,get-class,edit-class,cancel-class,delete-class,release-upcoming-classes,work-out-cancellation-deadlines,list-my-classes,list-my-class-history,send-class-reminders,list-teaching-classes}.usecase.ts`
    (`list-my-classes` also exports `assertIsStudent` and `toMyClassItems`, shared with the history;
    `list-teaching-classes` exports `assertIsTeacher`, spec 057), and
    `usecase/class-item.ts` (`ClassItem`, `toClassItem`: the answer shape both reads share, with the seats taken,
    the students, the guests — names only for `canSeeGuestNames`, spec 045 — and `myEnrolment`). Fakes of every port and entity
    factories are in `test/mock/`.
- **`modules/enrolment`** (`@rochas-surf-school/enrolment`, spec 041; depends on `@rochas-surf-school/shared`,
  `@rochas-surf-school/auth` and `@rochas-surf-school/classes` — `ClassActor`, `assertCanReadClasses` and the
  discipline; classes never imports it) — 2 aggregates. `enrolment/`: `model/enrolment.entity.ts` (`Enrolment`,
  `ENROLMENT_STATUSES`, `OPEN_ENROLMENT_STATUSES`, `ENROLMENT_REASON_MAX`, `TAKE_OUT_REASON_MAX`; `approve`, `deny`
  (spec 042), `cancel` (spec 043), `takeOut` (spec 044), `withdraw`, `expire`, `closeForCancelledClass`), `provider/{enrolment.repository,enrolment-class-reader.provider,student-name-reader.provider,student-lookup.provider,enrolment-notifier.provider,clock.provider,waiting-list-setting.provider}.ts`
  (`create` — a second open enrolment is `enrolment.alreadyOpen` —, `findById`, `withdraw` and `expire` conditional
  on pending, `findExpirable`, `closeOpenForClass`, `findPendingByClass(now)` (the `PendingRequestsClass` read
  model), the locked `approve` → `approved | full | notPending` and `deny` conditional on pending, `cancel`
  conditional on approved, `countPendingForClass`, `releaseForStudent` (spec 043), the locked `enrolDirectly` and
  `takeOut` conditional on approved (spec 044); the class as enrolment reads it, with its cancellation deadline; the
  student's name; whether a user is an approved student (`StudentLookup`, spec 044); the school's waiting-list switch
  (`WaitingListSetting.isEnabled`, spec 046); `seatRequested` /
  `requestExpired` / `requestApproved` / `requestDenied` / `seatCancelled` / `studentEnrolled` / `studentTakenOut`),
  `usecase/{request-seat,withdraw-request,expire-pending-enrolments,close-class-enrolments,list-pending-requests,approve-request,deny-request,cancel-seat,release-student-enrolments,enrol-student,take-student-out}.usecase.ts`,
  `usecase/decision.ts` (the decided enrolment and its class, or 404; the not-started check) and
  `usecase/enrolment.out.ts` (`EnrolmentOut`: `{ id, classId, status, requestedAt }`). Fakes of every port (the
  fake repository takes the classes, to join them in `findExpirable`) and an entity factory are in `test/mock/`.
  `guest/` (spec 045): `model/guest.entity.ts` (`Guest`: name and WhatsApp number rules, every error together,
  `erase(now)`), `provider/guest.repository.ts` (`GuestRepository`: the locked `create` → `added | full`, `findById`,
  `delete`, `eraseEndedBefore(cutoff, now)`), `usecase/{add-guest,remove-guest,erase-guest-data}.usecase.ts`;
  `FakeGuestRepository` in `test/mock/`.

## `apps/backend` (NestJS — adapters)

```
prisma/
  schema.prisma                 # generator + datasource
  models/auth.model.prisma      # users, user_rules_acceptances, identities, sign_in_codes, refresh_tokens
  models/school-rules.model.prisma  # rules (created_by → users, SET NULL), rules_versions (one row, inserted
                                    # at version 0 by the school_rules migration)
  migrations/                   # <timestamp>_<module>[_<change>]/migration.sql
  models/school-settings.model.prisma  # school_settings (at most one row, created by the first save; whatsapp_number,
                                       # waiting_list_enabled default true since spec 046)
  models/notifications.model.prisma    # notifications, push_tokens (→ users, cascade), push_tickets (no foreign key)
  models/classes.model.prisma   # locations (unique nullable name_key — null once archived —, nullable latitude,
                                # longitude and archived_at), classes (starts_at indexed; cancelled_at and
                                # cancellation_message nullable; cancellation_deadline, deadline_revision,
                                # deadline_attempts, deadline_next_attempt_at, indexed for the job; location_id →
                                # locations, created_by → users, both RESTRICT), class_instructors (class_id +
                                # user_id key; → classes and → users, cascade), cancellation_rules (keyed by
                                # discipline; updated_by → users, SET NULL); enums class_discipline, class_level
  models/enrolment.model.prisma # enrolments (class_id → classes CASCADE, student_id → users RESTRICT; indexed on
                                # class_id + status and on student_id); enum enrolment_status. The migration adds
                                # the partial unique index enrolments_one_open_per_student_class in SQL
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
                                # RegistrationNotifier and PushTokenRemover adapters) and ClassesModule (the
                                # TeachingReleaser adapter)
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
    school-settings.controller.ts  # GET /school-settings, PUT /school-settings/whatsapp and
                                # PUT /school-settings/waiting-list (200; spec 046) — protected; all answer
                                # { whatsappNumber, waitingListEnabled }
    school-settings.prisma.ts   # PrismaSchoolSettingsRepository (get reads the fixed row, save upserts it)
    school-settings.integration.http  # manual REST Client requests
  modules/notifications/
    notifications.module.ts     # wiring (DbModule); exports the adapters of auth's and classes' ports
    notifications.controller.ts # PUT and DELETE /notifications/push-token (204); GET /notifications,
                                # GET /notifications/unread-count, POST /notifications/read-all and
                                # POST /notifications/:id/read (spec 055) — protected
    notifications.integration.http  # manual REST Client requests
    {notification,push-token,push-ticket,recipients}.prisma.ts  # Prisma repositories; PrismaRecipientsProvider
                                # (role admin and status approved)
    expo.push.ts                # ExpoPushProvider (expo-server-sdk: chunks, tickets, receipts)
    push-messages.ts            # renderPush: the push copy in pt-BR / es / en; renderInApp: the notifications
                                # screen's text, the push's minus "open the app" (spec 055)
    notifications.registration-notifier.ts  # RegistrationNotifier adapter (Notify / NotifyApprovedAdmins; logs
                                # and swallows every error)
    notifications.push-token-remover.ts     # PushTokenRemover adapter (RemovePushToken)
    notifications.registration-notification-eraser.ts  # RegistrationNotificationEraser adapter
                                # (DeleteRegistrationNotifications)
    notifications.class-assignment-notifier.ts  # ClassAssignmentNotifier adapter of classes (Notify
                                # class.assigned / class.unassigned; logs and swallows every error)
    notifications.class-change-notifier.ts  # ClassChangeNotifier adapter of classes (Notify class.edited /
                                # class.cancelled / class.deleted; logs and swallows every error)
    notifications.class-reminder-notifier.ts  # ClassReminderNotifier adapter of classes (Notify class.reminder;
                                # logs and swallows every error; spec 054)
    notifications.no-instructor-notifier.ts  # NoInstructorNotifier adapter of classes
                                # (NotifyClassesWithoutInstructor; logs and swallows every error)
    notifications.location-change-notifier.ts  # LocationChangeNotifier adapter of classes (one Notify
                                # location.changed per recipient; logs and swallows every error)
    push-receipt-check.job.ts   # every-minute cron running CheckPushReceipts
    system.clock.ts             # SystemClockProvider
  modules/classes/
    classes.module.ts           # wiring (DbModule; imports NotificationsModule for the class-assignment,
                                # class-change, location-change and class-reminder notifiers, and EnrolmentModule for the roster,
                                # seat, pending-request, viewer-enrolment and enrolments-closer adapters); provides the Google Places provider;
                                # provides and exports ClassesTeachingReleaser
    locations.controller.ts     # GET /locations (200), POST /locations (201), GET /locations/address-suggestions
                                # and /address-suggestions/:placeId (200), PUT /locations/:id (200), POST
                                # /locations/:id/archive (204), in that order — protected
    google-places.address-suggestions.ts  # GooglePlacesAddressSuggestionProvider: the AddressSuggestionProvider
                                # adapter (Places API (New) with fetch; GOOGLE_MAPS_API_KEY required in production)
    classes.controller.ts       # POST /classes/batch (201 { count }), GET /classes/time-range-suggestions (200),
                                # GET /classes?date= (200, one week), GET /classes/mine and GET
                                # /classes/mine/history?from=&to= (200, students only; spec 048, by period since
                                # 053), GET /classes/teaching (200 { items, teachesAny }, instructors and admins;
                                # spec 057), GET /classes/:id (200), in that order, and
                                # PUT /classes/:id (200 ClassItem), POST /classes/:id/cancel (200 ClassItem),
                                # DELETE /classes/:id (204) — protected
    cancellation-rules.controller.ts  # GET /cancellation-rules (200), PUT /cancellation-rules/:discipline (200)
                                # — protected
    cancellation-rule.prisma.ts # PrismaCancellationRuleRepository (save: the upsert and the clearing in one
                                # $transaction)
    anthropic.deadline-describer.ts  # AnthropicDeadlineDescriber: the CancellationDeadlineDescriber adapter (Claude,
                                # structured outputs; ANTHROPIC_API_KEY required in production)
    cancellation-deadline.job.ts  # CancellationDeadlineJob (every minute, cron cancellation-deadline): runs
                                # WorkOutCancellationDeadlines, logs counts only, never throws
    class-reminder.job.ts       # ClassReminderJob (every minute, cron class-reminder, spec 054): runs
                                # SendClassReminders, logs only the count, never throws
    {location,school-class}.prisma.ts  # Prisma repositories (P2002 on name_key → location.name.duplicate; a
                                # location's update and the clearing of its upcoming deadlines in one $transaction,
                                # archive only an active one and null its name_key;
                                # createMany and update write classes and instructors in one $transaction;
                                # update and cancel write only a class that isn't cancelled; delete only one
                                # that isn't cancelled and hasn't started)
    classes.teaching-releaser.ts  # ClassesTeachingReleaser: auth's TeachingReleaser, running
                                # ReleaseUpcomingClasses (errors propagate)
    teacher-lookup.prisma.ts    # PrismaTeacherLookup (id, role and status of the given users)
    teaching-classes-reader.prisma.ts  # PrismaTeachingClassesReader (TeachingClassesReader over class_instructors;
                                # spec 057)
    class-view-reader.prisma.ts # PrismaClassViewReader (one query per read, with the location and instructors' names)
    class-contact-reader.prisma.ts  # PrismaClassContactReader (spec 049: role, status and WhatsApp number of the
                                # given users, for GetClass only)
    system.clock.ts             # SystemClockProvider of the module (the e2e suite overrides it)
    {locations,classes,cancellation-rules}.integration.http  # manual REST Client requests
  modules/enrolment/            # spec 041; never imports ClassesModule (ClassesModule imports it)
    enrolment.module.ts         # wiring (imports NotificationsModule); provides and exports the adapters below
    enrolment.controller.ts     # POST /classes/:id/enrolments (201), POST /enrolments/:id/withdraw (200);
                                # GET /enrolments/pending (declared before the :id routes), POST
                                # /enrolments/:id/approve and /deny (200; spec 042), POST /enrolments/:id/cancel
                                # (200; spec 043), POST /classes/:id/enrolments/direct (201, or 200 from pending)
                                # and POST /enrolments/:id/take-out (200; spec 044) — protected
    guests.controller.ts        # POST /classes/:id/guests (201), DELETE /guests/:id (204; spec 045) — protected
    guest.prisma.ts             # PrismaGuestRepository (locked create; deleteMany; one updateMany erasure; spec 045)
    seats-taken.prisma.ts       # lockClassCapacity (SELECT … FOR UPDATE on the class row) and countSeatsTaken
                                # (approved enrolments plus guests), shared by every seat writer (spec 045)
    enrolment.prisma.ts         # PrismaEnrolmentRepository (P2002 on the partial index → enrolment.alreadyOpen;
                                # withdraw / expire / deny conditional on pending, cancel on approved;
                                # releaseForStudent in one $transaction; closeOpenForClass in one
                                # updateManyAndReturn; findExpirable joins the class; findPendingByClass with one
                                # groupBy for the seats; approve and enrolDirectly (spec 044) in a $transaction
                                # with SELECT … FOR UPDATE on the class row; takeOut conditional on approved)
    enrolment-class-reader.prisma.ts  # PrismaEnrolmentClassReader (the class with its cancellation deadline, its
                                # instructors, whether its discipline has a cancellation rule)
    student-name-reader.prisma.ts  # PrismaStudentNameReader
    my-classes-reader.prisma.ts # PrismaMyClassesReader (classes' MyClassesReader: the student's current class ids;
                                # the history of a period in one raw query on the latest enrolment per class;
                                # specs 048, 053)
    waiting-list-setting.prisma.ts  # PrismaWaitingListSetting (reads school_settings.waiting_list_enabled; on with no
                                # row; spec 046)
    student-lookup.prisma.ts    # PrismaStudentLookup (an approved account with role student; spec 044)
    enrolment-expiry.job.ts     # EnrolmentExpiryJob (every minute, cron enrolment-expiry): runs
                                # ExpirePendingEnrolments, logs the count only, never throws
    guest-erasure.job.ts        # GuestErasureJob (every minute, cron guest-erasure): runs EraseGuestData,
                                # logs the count only, never throws (spec 045)
    {class-roster-reader,seat-counter,pending-request-counter,viewer-enrolment-reader,class-audience-reader}.prisma.ts  # classes' ports
                                # read from enrolments (approved for the roster — with each enrolmentId, spec 044
                                # — and the seats, plus the guests since spec 045, pending for the requests, the caller's latest for myEnrolment,
                                # approved and pending for the audience of an edit or a location change, spec 047)
    enrolment.class-enrolments-closer.ts  # EnrolmentClassEnrolmentsCloser: classes' ClassEnrolmentsCloser, running
                                # CloseClassEnrolments
    enrolment.seat-releaser.ts  # EnrolmentSeatReleaser: auth's SeatReleaser, running ReleaseStudentEnrolments
                                # (errors propagate; spec 043)
    system.clock.ts             # SystemClockProvider of the module (the e2e suite overrides it)
    {enrolment,guests}.integration.http  # manual REST Client requests
test/
  auth-email.e2e-spec.ts        # e2e suite of the email sign-in routes (Resend replaced by a capturing fake)
  auth-session.e2e-spec.ts      # e2e suite of GET /auth/me, POST /auth/refresh and POST /auth/sign-out
  auth-whatsapp.e2e-spec.ts     # e2e suite of PUT /auth/me/whatsapp (approved accounts created through Prisma)
  auth-profile.e2e-spec.ts      # e2e suite of PUT /auth/me/name and DELETE /auth/me (accounts in each status through Prisma;
                                # the deletion releasing seats and requests, spec 043)
  auth-reactivation.e2e-spec.ts # e2e suite of POST /auth/me/reactivation-request (accounts in each state through Prisma)
  auth-google.e2e-spec.ts       # e2e suite of POST /auth/google (GoogleAuthIdTokenProvider replaced by a fake)
  registrations.e2e-spec.ts     # e2e suite of the /registrations routes (accounts through Prisma; concurrency)
  people.e2e-spec.ts            # e2e suite of GET /people (accounts through Prisma, isolated by a per-test name tag)
  teaching-classes.e2e-spec.ts  # e2e suite of GET /classes/teaching (fixed classes clock; spec 057)
  school-rules.e2e-spec.ts      # e2e suite of the /school-rules routes (tokens minted with JwtTokenProvider)
  school-rules-acceptance.e2e-spec.ts  # e2e suite of POST /school-rules/acceptances (rows checked through Prisma)
  school-settings.e2e-spec.ts   # e2e suite of the /school-settings routes (accounts in each status and role through Prisma)
  notifications.e2e-spec.ts     # e2e suite of push tokens, sign-out with a push token and the registration
                                # notifications (ExpoPushProvider replaced by a recording fake)
  account-erasure.e2e-spec.ts   # e2e suite of AccountErasureJob (accounts through Prisma; signing up again by
                                # email code and Google)
  locations.e2e-spec.ts         # e2e suite of /locations (order, duplicates, concurrency, validation, access, the
                                # point, editing, deadlines, notifying, archiving, suggestions; ExpoPushProvider,
                                # the Google provider and the clock replaced by fakes)
  classes.e2e-spec.ts           # e2e suite of /classes (batches, refusals, past, suggestions, week, class, access,
                                # notifications; the clock and ExpoPushProvider replaced by fakes)
  cancellation-rules.e2e-spec.ts  # e2e suite of /cancellation-rules (access, validation, the clearing of the
                                # deadlines; clock in 2037, stored rules snapshotted and restored)
  enrolment.e2e-spec.ts         # e2e suite of requesting, refusing, requesting again, concurrent requests,
                                # withdrawing, expiring (the job run directly), notifying, the counts and myEnrolment
                                # (the clocks and ExpoPushProvider replaced by fakes)
  seat-cancellation.e2e-spec.ts # e2e suite of POST /enrolments/:id/cancel: cancelling, the concurrent cancel, the
                                # refusals in order (deadline missing, passed, exactly at it), the notifications
                                # (spec 043)
  direct-enrolment.e2e-spec.ts  # e2e suite of direct enrolment and take-out: new and from pending, the refusals,
                                # the races, the roster's enrolmentId, the reasons, the notifications (spec 044)
  guests.e2e-spec.ts            # e2e suite of trial guests (spec 045): add and its refusals, the last-seat race with
                                # an approval, visibility per role, delete and capacity, remove, the 30-day erasure
  cancellation-deadlines.e2e-spec.ts  # e2e suite of CancellationDeadlineJob (AnthropicDeadlineDescriber replaced by
                                # a configurable fake; works out, retries, without a rule, edits, stale results)
  class-reminders.e2e-spec.ts   # e2e suite of ClassReminderJob (spec 054; clock in 2037, ExpoPushProvider faked):
                                # recipients, only once, cancelled and started, start moved through PUT /classes/:id
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
    (private)/student/(tabs)/{index,my-classes,school,profile}.tsx  # Agenda (/student, the week of classes, with showEnrolment),
                                                     # Minhas aulas (MyClassesScreen, spec 048), Escola, Perfil
    (private)/student/my-history.tsx                 # "Histórico" (/student/my-history, spec 048), above the tab bar
    (private)/{instructor,admin}/(tabs)/{index,classes,profile}.tsx # Início (/instructor, /admin), Aulas (the week
                                                     # of classes; the admin's with canCreate), Perfil
    (private)/<role>/{edit-profile,whatsapp,school-rules}.tsx  # the Profile's inner screens, above the tab bar
    (private)/admin/registrations.tsx                # "Join the school" tool (/admin/registrations), above the tab bar
    (private)/admin/class-requests.tsx               # "Inscrições em aulas" tool (/admin/class-requests, spec 042),
                                                     # above the tab bar
    (private)/admin/enrol-student.tsx                # "Inscrever aluno" tool (/admin/enrol-student, spec 044),
                                                     # above the tab bar
    (private)/admin/school-settings.tsx              # "Configurações da escola" (/admin/school-settings, spec 046),
                                                     # above the tab bar
    (private)/{instructor,admin}/my-classes.tsx      # "Minhas aulas" of the classes they teach (/instructor/my-classes,
                                                     # /admin/my-classes; TeachingClassesScreen, spec 057), above the tab bar
    (private)/admin/manage-school-rules.tsx          # "Regras da escola" management (/admin/manage-school-rules,
                                                     # spec 056), above the tab bar
    (private)/admin/new-class.tsx                    # "Nova aula" (/admin/new-class, optional ?date=), above the tab bar
    (private)/admin/edit-class/[id].tsx              # "Editar aula" (/admin/edit-class/<id>), above the tab bar
    (private)/admin/cancellation-rules.tsx           # "Regras de cancelamento" (/admin/cancellation-rules), above
                                                     # the tab bar
    (private)/{student,instructor,admin}/class/[id].tsx  # class details (/<role>/class/<id>), above the tab bar;
                                                     # the student's sets canEnrol
    (private)/{admin,instructor}/people.tsx          # the People screen under the native header (/admin/people,
                                                     # /instructor/people), above the tab bar; the student's
                                                     # (tabs)/school.tsx renders it as a tab with no header
    (private)/{student,instructor,admin}/notifications.tsx  # "Avisos" (/<role>/notifications, spec 055), opened
                                                     # from the home bell, above the tab bar
  navigation/
    resolve-flow.ts             # Flow, resolveFlow (session user → flow), isOnboardingCompleted (number +
                                # rulesAccepted; rulesAcceptedBefore picks rules-update), onboardingStep (whatsapp / school-rules), flowEntryRoute
                                # (flow + user → entry route)
    root-navigator/             # RootNavigator: root Stack with one Stack.Protected per flow group; useRootNavigator;
                                # mounts useSessionExpired and the three notification hooks
    splash-gate/                # SplashGate: keeps the native splash screen until the fonts are ready and the
                                # stored session was restored, then renders its children (StatusBar, RootNavigator)
    rules-update-layout.test.tsx  # layout test of the rules-update group (a test under src/app would be a route)
    stack-header/               # the native Stack header of the screens that go back (spec 038): useStackHeader
                                # (the layouts' screenOptions: transparent + soft scroll edge on Liquid Glass,
                                # opaque page elsewhere), useHeaderInset (fixed screens' top padding),
                                # useKeyboardOffset (keyboardVerticalOffset), StackHeaderTitle (a screen's
                                # headerTitle), test utils; stack-header.layouts.test.tsx tests the four layouts
  modules/instructor/screens/instructor.screen.tsx  # the instructor's Início: "Painel" with the Escola section:
                                # the "Minhas aulas" row (spec 057), the Rules row (read-only rules, spec 056) and
                                # the People row
  modules/{student,instructor,admin}/*-tabs.navigation.test.tsx  # route tests of each role's tab bar
  modules/admin/
    screens/admin.screen.tsx    # admin home: "School tools"; "Tools" with the "Join the school" row and its
                                # pending count, the "Inscrições em aulas" row and its request count (spec 042),
                                # the "Criar aulas" row and the "Regras de cancelamento" row,
                                # "School" with the "Minhas aulas" row once they teach (spec 057), the Rules row
                                # (management screen, spec 056), the People row and the
                                # "Configurações da escola" row (spec 046)
    screens/registrations.screen.tsx  # "Join the school": count, title and description in the list header,
                                # DecisionCards (pull-to-refresh, loading, empty, error + retry), one DenySheet,
                                # the People PersonSheet (with the email) for a pressed card
    registrations.types.ts      # Registration, RegistrationsResponse, RegistrationDecision (mirror the API)
    hooks/                      # use-registrations (query ["registrations"]), use-approve-registration,
                                # use-deny-registration (mutations), use-registrations-screen (the screen's logic:
                                # decisions, the deny sheet, the detail sheet, toasts)
    utils/                      # registration-error.ts (API error → translation key), registrations-cache.ts
                                # (removeRegistration: drop a decided item from the cache and invalidate)
  modules/people/               # the people directory, the same for every role
    screens/people.screen.tsx   # PeopleScreen: count eyebrow, title, search, RoleFilters, FlatList
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
  modules/cancellation-rules/   # the cancellation rules (spec 036): reading them (every role) and editing them
                                # (admins)
    screens/cancellation-rules.screen.tsx  # CancellationRulesScreen + hook + types (the Surf / Skate drafts, the
                                # note, the save button)
    components/cancellation-rules-sheet/  # CancellationRulesSheet: both rules, opened from the Profile
    hooks/                      # use-cancellation-rules (["cancellation-rules"]), use-save-cancellation-rule
                                # (PUT /cancellation-rules/:discipline, no retry; writes the answer to the cache)
    cancellation-rules.types.ts # CancellationRules, CancellationDiscipline (mirror the API)
    cancellation-rules.constants.ts  # CANCELLATION_RULE_TEXT_MAX (2000)
    cancellation-rules.test-utils.tsx  # shared test helpers of the module

  modules/classes/              # the week of classes and their details (every role), creating, editing,
                                # cancelling and deleting classes (admins);
                                # imports @rochas-surf-school/classes for the batch expansion, time-range checks,
                                # limits and getClassState
    screens/new-class.screen.tsx  # NewClassScreen + new-class.screen.hook.ts (useNewClassScreen: form state, D-15
                                # defaults, the optional date param, count, summary, submit and its errors)
    screens/classes-week.screen.tsx  # ClassesWeekScreen + hook (WeekMonthCalendar, the selected day, its cards,
                                # states, pull-to-refresh, the admin's entry points, refetching invalidated weeks
                                # on focus); the Agenda and Aulas tabs
    screens/class-details.screen.tsx  # ClassDetailsScreen + hook (one class by the route's id, banners — the
                                # cancelled one with its message, "Turma cheia" —, the "A aula" group and the
                                # people's PersonSheet, the instructors' read-only note, the "Regras" card with the
                                # school-rules count and the cancellation rules sheet, the "Notas" and "Onde e como" cards, the student's request footer (with the deadline note and
                                # ContactSchoolButton once a seat can't be cancelled), status banner and sheets
                                # with canEnrol,
                                # the admin's tools button with canEdit,
                                # the tools, cancel and delete sheets, the cancel and delete requests and their
                                # errors)
    screens/teaching-classes.screen.tsx  # TeachingClassesScreen + hook, types (spec 057): "Minhas aulas" of an
                                # instructor or a teaching admin — the classes under way on grape cards, then by day
                                # with TeachingDayHeaders, the next class highlighted; loading, empty, error + retry,
                                # pull-to-refresh, refetch on focus
    screens/edit-class.screen.tsx  # EditClassScreen + hook (useEditClassScreen: the class's values plus the
                                # changes, single day and time, started mode, states — a cancelled class shows
                                # only a message —, submit and its errors)
    classes.types.ts            # ClassLocation (with the point and upcomingClasses), MapPoint, Teacher, NewClassForm, BatchRequest, EditClassRequest, ClassItem, ClassDetails (the one-class answer, with numbers),
                                # WeekClasses and the answers (mirror the API)
    components/                 # form-section, date-range-calendar (+ calendar-day), date-range-summary (the
                                # range and its removed days), time-range-picker, time-range-hint (the chips' hint),
                                # time-range-sheet (two @expo/ui DateTimePickers in time mode),
                                # location-picker (with the "Gerir" mode), location-sheet ("Novo local" / "Editar
                                # local"), address-search-field (Endereço and its suggestions), location-map-picker
                                # (the sheet's map), archive-location-sheet ("Remover local?"), location-map-preview
                                # (the details' fixed map), class-location-card (the details' "Onde e como": map,
                                # place and "Direções"), capacity-stepper, instructor-picker, class-card
                                # (occupancy bar, "Sem vagas" or the student's enrolment chip, students footer), class-people (the details' "A aula":
                                # the capacity line beside the label, instructor pills, stacked seats, the list), instructor-pill,
                                # class-student-row (opens the person sheet; "Retirar"), class-guest-row (not pressable, "Trial"),
                                # guest-avatar (person icon on sand), student-avatar (photo or initials),
                                # class-rule-row (a "Regras" row: icon tile, title, value, chevron),
                                # class-tools-sheet (the admin's four tool cards of one class), class-tool-card
                                # (icon tile, title, subtitle; danger tone, disabled), cancel-class-sheet (the cancel confirmation with its optional message),
                                # delete-class-sheet (the delete confirmation and its "can't delete" variant),
                                # guests-warning (spec 045: the admin's "N alunos trial …" note on Editar aula and
                                # the cancel sheet); spec 057: ongoing-class-card (a class under way on grape),
                                # teaching-day-header (a day's label and short date), teaching-classes-entry-row (the
                                # homes' "Minhas aulas" row and its count; class-card's isNext draws "Próxima")
    hooks/                      # use-locations (["locations"]), use-create-location (adds to that cache),
                                # use-edit-location (PUT /locations/:id; replaces the row, reloads ["classes"]),
                                # use-archive-location (POST /locations/:id/archive; drops the row),
                                # use-address-suggestions (["locations", "suggestions", token, query], debounced),
                                # use-address-place, use-debounced-value, use-location-management (the "Gerir" mode
                                # and the open sheet, shared by Nova aula and Editar aula),
                                # use-time-range-suggestions (["classes", "time-range-suggestions"]), use-teachers
                                # (["people", "teachers"], every page of GET /people?role=instructor,admin&perPage=50),
                                # use-create-classes (POST /classes/batch, no retry; invalidates ["classes", "week"]),
                                # use-edit-class (PUT /classes/:id, no retry; invalidates the weeks and the details),
                                # use-cancel-class (POST /classes/:id/cancel, no retry; invalidates ["classes"]),
                                # use-delete-class (DELETE /classes/:id, no retry; drops the details from the
                                # cache and invalidates the weeks),
                                # use-week-classes (["classes", "week", weekStart], weekClassesOptions),
                                # use-visible-weeks-classes (useQueries over every week a calendar draws, same key),
                                # use-class (["classes", "detail", id]), use-now (the clock, every 60 s),
                                # use-teaching-classes (GET /classes/teaching, ["classes", "teaching"]; spec 057)
    utils/                      # calendar.ts (Fortaleza today and minutes, pressDay: ranges and their removed
                                # days, initialRange), week.ts (an instant's Fortaleza day and time, the date line,
                                # formatDeadline for "Cancelamento até …"),
                                # time-ranges.ts (incl. startsByNow),
                                # batch-request.ts (form → request body), class-error.ts (API error → translation
                                # key, for Nova aula, Editar aula, the cancel and the delete sheets),
                                # locations-cache.ts (add, replace, remove), map.ts (Fortaleza, regions, the
                                # provider per platform, directions URL), session-token.ts (UUID v4 per sheet),
                                # occupancy.ts (percent, tone, full, free and hidden seats, the students label),
                                # audience.ts (joinAudience: who will be told, for the cancel sheet and Editar aula's
                                # footer; spec 047), teaching-classes.ts (the layout of "Minhas aulas", the count,
                                # the day header's date and weekday; spec 057)
    classes.test-utils.tsx      # shared test helpers of the module
  modules/enrolment/            # the student's requests (spec 041), shown on the classes' details and cards, the
                                # admins' "Inscrições em aulas" tool (spec 042), direct enrolment and take-out
                                # (spec 044), and the student's "Minhas aulas" and history (spec 048)
    enrolment.types.ts          # EnrolmentStatus, MyEnrolment (with reason), EnrolmentResponse, RequestSeatRequest,
                                # PendingRequestsResponse, DenyRequestVariables, MyClassesResponse,
                                # MyClassHistoryResponse, MyClassHistoryPeriod, ClassHistoryDay, MyClassesFilter
                                # (mirror the API)
    screens/my-classes.screen.tsx  # "Minhas aulas" (+ .hook.ts, .types.ts; spec 048): title, round history button,
                                # the group chips, the classes as ClassCards with their chip; refetch on focus,
                                # chips back on "Todas" on blur, pull-to-refresh, loading, error + retry, empty
    screens/my-class-history.screen.tsx  # "Histórico" (+ .hook.ts, .types.ts; spec 048, rebuilt in 053): the month or
                                # week calendar, the legend, "Todas as aulas" with the period or the day's chip, the
                                # period's classes under a label per day; skeleton, error + retry, empty, refresh
    components/history-list-header/  # HistoryListHeader ("Todas as aulas", the caption or the day chip; spec 053)
    components/history-day-label/  # HistoryDayLabel (the label above a day's classes; spec 053)
    components/my-classes-filters/  # MyClassesFilters (the horizontal row of chips; spec 048; four groups since 052)
    screens/class-requests.screen.tsx  # "Inscrições em aulas": header with requests · classes, one group per class,
                                # pull-to-refresh, loading, error + retry, "Nada à espera"
    screens/enrol-student.screen.tsx  # "Inscrever aluno" (+ .hook.ts, .types.ts; spec 044): "1 · Quem" (search, the
                                # students with radios, more on scroll) and "2 · Aula" (calendar, the day's upcoming
                                # classes as cards), "Inscrever <nome>"; spec 045: the "Aula experimental" /
                                # "Aluno da escola" switch and the trial mode (name, PhoneNumberField, note)
    components/take-out-sheet/  # TakeOutSheet ("Retirar <nome> da aula?": a DenySheet with the visible "Motivo
                                # (opcional)" of 300; no hook; spec 044; `trial`: the guest copy, no reason)
    components/class-requests-group/  # ClassRequestsGroup (the class card — day block, time, location, capacity,
                                # free seats or "Esgotado", occupancy bar —, the waiting-list label, positions and
                                # full-class note, one DecisionCard per request)
    components/denial-reason-sheet/  # DenialReasonSheet (the student's "Pedido recusado": class line, "Motivo da
                                # escola", the reason or "Sem motivo indicado.", "Fechar")
    components/request-seat-sheet/  # RequestSeatSheet + hook (AGENDA-03: the class line, the deadline, the rule to
                                # accept with "Ler" — it steps aside for CancellationRulesSheet —, send / not now)
    components/withdraw-request-sheet/  # WithdrawRequestSheet ("Anular pedido": confirm / keep; no hook)
    components/cancel-seat-sheet/  # CancelSeatSheet ("Cancelar inscrição": the deadline, "Sim, cancelar" / "Manter
                                # inscrição"; no hook; spec 043)
    hooks/                      # use-request-seat (POST /classes/:id/enrolments), use-withdraw-request (POST
                                # /enrolments/:id/withdraw), use-cancel-seat (POST /enrolments/:id/cancel) — no
                                # retry, invalidate ["classes"] —, use-class-enrolment (the details' CTA, banner,
                                # sheets, deadline note, sends and errors); use-pending-requests (GET
                                # /enrolments/pending, ["enrolments", "pending"]), use-approve-request /
                                # use-deny-request (no retry; invalidate the pending list and ["classes"]),
                                # use-class-requests-screen (the tool's logic: approve, deny sheet, toasts, reloads);
                                # use-enrol-student (POST /classes/:id/enrolments/direct), use-take-student-out
                                # (POST /enrolments/:id/take-out) — no retry; invalidate the pending list and
                                # ["classes"] —, use-take-out (the details' take-out: target, toasts, reloads; spec 044);
                                # use-add-guest (POST /classes/:id/guests), use-remove-guest (DELETE /guests/:id) — no
                                # retry; invalidate ["classes"] —, use-take-guest-out (the details' guest removal;
                                # spec 045); use-my-classes (GET /classes/mine, ["classes", "mine"]) and
                                # use-my-class-history (GET /classes/mine/history?from=&to=, ["classes", "mine",
                                # "history", from, to]; specs 048, 053)
    utils/                      # enrolment-cta.ts (the footer button by status and fullness; "Pedir novamente" after
                                # a denial, a cancel or a take-out; "Cancelar inscrição" before the deadline), enrolment-status.ts
                                # (the banner and chip: waitingList for pending on a full class, approved, denied,
                                # cancelled, takenOut), enrolment-error.ts (API error → translation key,
                                # which errors reload the class or the tool's list), class-requests.ts (the "Pediu
                                # às …" line and the day block), my-classes-filter.ts (the chips and which one a class
                                # belongs to; spec 048; each status mapped to its group since 052), class-history.ts
                                # (the days with classes, the day filter, grouping by day, the day and chip labels;
                                # spec 053)
  modules/notifications/
    hooks/                      # use-push-registration (PUT /notifications/push-token for pending / approved;
                                # the DELETE instead while pushes are off), use-push-preference (the Profile's switch),
                                # use-notification-response (a tapped push → refresh → "Join the school", the
                                # Aulas tab for class.assigned / location.changed, a class's details for the class
                                # pushes — the student's for enrolment.expired / approved / denied, class.cancelled and
                                # class.edited, the student's Agenda for location.changed (spec 047),
                                # the instructor's for enrolment.requested, the instructor's or the admin's for
                                # enrolment.cancelled —, the admin's "Inscrições em aulas" for
                                # enrolment.requested, or "/"), use-notification-received
                                # (a push with the app open → refresh, or invalidate ["registrations"] / ["classes",
                                # "week"], ["classes"] for the class and enrolment pushes (plus ["enrolments",
                                # "pending"] for enrolment.requested and enrolment.cancelled), and ["classes"] +
                                # ["locations"] for location.changed; every push also ["notifications", …]);
                                # use-notifications, use-unread-notifications-count, use-mark-notification-read,
                                # use-mark-all-notifications-read (the notifications screen and the bell; spec 055)
    screens/notifications.screen.tsx  # "Avisos": the list, its states, row taps and "mark all" (spec 055)
    components/notification-row/  # one notification: tinted icon, title, body, time, unread dot
    utils/notification-target.ts  # where a notification leads per type, class id and flow (push and row)
    utils/notifications-cache.ts  # query keys, page size, markReadInPages; utils/notification-icon.ts per type
    utils/refresh-account.ts    # GET /auth/me → updateUser; null on failure, rethrows SessionExpiredError
    utils/unregister-push-token.ts  # DELETE /notifications/push-token without asking the permission; failures ignored
  modules/offboarding/
    screens/                    # denied.screen.tsx (reason card when given), removed.screen.tsx — both on
                                # AccountStatus with the shared ContactSchoolButton and "Use another email" (sign-out)
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
                                # (read-only: shield ScreenIntro, SchoolRulesList); spec 056 adds
                                # school-rules-entry-row (the homes' "Regras" row, admin / instructor subtitle),
                                # school-rule-editable-row (number, text that opens the edit sheet, ↑ / ↓),
                                # school-rule-sheet (add / edit: title and explanation with counters, save note)
                                # and delete-school-rule-sheet (the confirmation, with the delete note)
    hooks/use-{create,update,delete}-school-rule.hook.ts  # POST /school-rules, PUT and DELETE /school-rules/:id:
                                # text trimmed, the answer cached; a 404 reloads the list; toasts (spec 056)
    hooks/use-reorder-school-rules.hook.ts  # PUT /school-rules/order with every id: optimistic, put back on a
                                # failure, reloads on schoolRule.order.mismatch (spec 056)
    utils/school-rules-error.ts  # the not-found / order-mismatch matchers and the toast keys
    school-rules.constants.ts   # the 60 / 300 limits of the title and the explanation
    screens/school-rules.screen.tsx  # the rules read from the Profile (/<role>/school-rules)
    screens/manage-school-rules.screen.tsx  # the admin's management screen (+ hook: status, moves, open sheet):
                                # loading, error + retry, empty, or the list with the bottom "Adicionar regra"
  modules/school-settings/      # "Configurações da escola" (spec 046, admins)
    screens/school-settings.screen.tsx  # loading, error + retry, or the form
    components/school-settings-form/  # SchoolSettingsForm + hook: the waiting-list switch, PhoneNumberField, one
                                # "Salvar" (only what changed, valid number, double-send guard)
    hooks/use-save-school-settings.hook.ts  # PUT /school-settings/waiting-list, then /whatsapp; caches the answer; toasts
    school-settings.types.ts    # SaveSchoolSettingsVariables
  modules/profile/              # the Profile tab, the same for every role
    screens/                    # profile.screen.tsx (rendered by every (tabs)/profile.tsx), edit-profile.screen.tsx,
                                # profile-whatsapp.screen.tsx
    components/                 # profile (rows, sheets and their state), profile-header (avatar, name, role chip),
                                # profile-avatar (initials; camera button on Edit profile), profile-card, profile-row
                                # (also used by the class details' "Regras"; valueBelow stacks the value),
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
                                # wheels can be dragged), otp-input, text-button, screen-intro,
                                # text-input, text-area, toast, checkbox, segmented-control
  components/decision/          # the admin tools' shared pieces: decision-card (DecisionCard: avatar, optional
                                # pressable upper row, Deny / Approve, approveDisabled), deny-sheet (DenySheet: optional reason in a
                                # bottom sheet, confirm and back; `showLabel` draws the label above the field)
  utils/                        # app-wide helpers: format-created-at.ts ("now", relative up to 7 days, then the
                                # date), get-initials.ts, countries.ts (country options with localized names and
                                # dial codes, filter, default BR), brazilian-phone.ts (toBrazilianDigits,
                                # formatBrazilianPhone: the Brazilian number mask), calendar-dates.ts (+ .types.ts:
                                # CalendarMonth; YYYY-MM-DD arithmetic, month grids and periods, captions, weekday
                                # names and initials, the date-fns locale)
  providers/alert-message/      # AlertMessageProvider + useAlertMessage (toast for API errors)
  providers/session/            # SessionProvider + useSession: the session store exposed to React
                                # (user, tokens, isRestoring, setSession, updateUser, clearSession); starts the restore
  components/flow-placeholder/  # FlowPlaceholder: a flow's name on an empty screen; no route renders it since spec
                                # 048 filled the last placeholder tab
  components/role-tabs/         # RoleTabs: a role's NativeTabs (tint sun / ink-3, background page)
  components/language-sheet/    # LanguageSheet: sign-in screen and Profile; stores the choice
  components/theme-sheet/       # ThemeSheet: same as phone / light / dark
  components/phone-number-field/  # PhoneNumberField + usePhoneNumberField: country button, picker, masked number,
                                # E.164 and validity (spec 045; used by the form below and the trial mode)
  components/whatsapp-number-form/  # WhatsappNumberForm: country, number (Brazilian mask), share switch, submit
  components/country-picker/    # CountryPicker: searchable bottom sheet of countries with their dial codes
  components/account-status/    # AccountStatus: the shared layout of every closed-account state (icon tile by
                                # tone, eyebrow, title, description, optional note card and primary action,
                                # "Use another email")
  components/contact-school-button/  # ContactSchoolButton: WhatsApp button, only when the school has a number;
                                # opens https://wa.me/<digits>, toast when the link fails (offboarding and the
                                # class details' deadline notes; spec 043)
  components/week-month-calendar/  # WeekMonthCalendar: header (arrows, the week/month pill), the view, the moves;
                                # draws calendar-week-row/ (CalendarWeekRow: seven days) or calendar-month-grid/
                                # (CalendarMonthGrid: the fitted month); controlled selection, one dot per marked day;
                                # optional month start, clearable selection and period reports (spec 053)
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
  hooks/                        # useTheme, color scheme, use-school-settings.hook.ts (+ .types.ts; useSchoolSettings:
                                # GET /school-settings, ["school-settings"], authenticated, no retry; spec 046),
                                # use-school-whatsapp.hook.ts (useSchoolWhatsapp: reads it → number or null; spec 043
                                # moved it here)
plugins/with-ios-scene-lifecycle.js    # config plugin (UIScene life cycle for iOS 27)
app.json                        # the Expo config
app.config.ts                   # takes app.json's config and appends the react-native-maps plugin with
                                # GOOGLE_MAPS_ANDROID_API_KEY (spec 037); app.config.test.ts next to it
jest.config.js, jest.setup.ts   # jest-expo + RNTL; mocks localization, reanimated, safe-area, bottom sheet,
                                # expo-notifications, expo-device, expo-constants, @expo/ui's DateTimePicker,
                                # react-native-maps
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
