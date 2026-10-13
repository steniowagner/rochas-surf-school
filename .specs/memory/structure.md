# Project Structure

Turbo monorepo (npm workspaces) with three groups of workspaces: `apps/*` (the executables: backend, mobile,
web), `modules/*` (framework-free business modules) and `packages/*` (shared kernel, design tokens and unused
Turbo configs). Workspace npm namespace: `@rochas-surf-school`.

## Root

```
package.json          # workspaces, root scripts (dev, build, lint, check-types, format), React/TypeScript overrides
turbo.json            # build / lint / check-types / dev tasks
CLAUDE.md, AGENTS.md  # agent instructions: commands, layout, design system, native builds
.docs/                # source documents: user-journeys.md, requirements.md, designs/*.html
.specs/               # project specs and memory (see below)
.claude/skills/       # project generator skills (module-*, backend-*, config-*) and the spec-* workflow
.github/workflows/    # spec-check.yml — CI gate for spec pull requests
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
  - `user/` — `model/user.entity.ts`, `provider/user.repository.ts` (with `addRulesAcceptance`, `findPending`
    and `updateIfPending`, the conditional write of a registration decision),
    `provider/rules-version.provider.ts` (`RulesVersionProvider`: the current school rules version, read
    without depending on `school-rules`), `provider/registration-notifier.provider.ts` (`RegistrationNotifier`:
    tells admins and the person about a registration, without depending on `notifications`),
    `usecase/{create-user,update-user,delete-user,find-user-by-id,get-current-user,set-whatsapp,request-reactivation,find-user-page,search-users-by-name}.usecase.ts`
    and `usecase/account.out.ts` (`AccountOut` / `toAccountOut`: the account shape every answer carries, with
    `rulesAccepted`, `denialReason` and `reactivationStatus`);
    `usecase/{list-registrations,approve-registration,deny-registration}.usecase.ts` with
    `usecase/registration-access.ts` (approved-admin check, status first) and `usecase/pending-registration.ts`
    (`findPendingRegistration`: UUID check, 404, 409).
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
    `usecase/{register-push-token,remove-push-token,check-push-receipts}.usecase.ts`. Fakes of every port and
    entity factories are in `test/mock/`.

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
  seed/main.ts                  # seed runner, one task per module
  seed/review-accounts.seed.ts  # upserts the REVIEW_ACCOUNTS users and their email identities
src/
  main.ts                       # bootstrap (PORT, CORS)
  app.module.ts                 # ConfigModule (global), ScheduleModule, DbModule, JwtAuthModule, AuthModule,
                                # SchoolRulesModule, SchoolSettingsModule, NotificationsModule
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
                                # PUT /auth/me/whatsapp and POST /auth/me/reactivation-request (200) (protected)
    auth.integration.http       # manual REST Client requests
    registrations.controller.ts # GET /registrations, POST /registrations/:id/approve and /deny (200) — protected
    registrations.integration.http  # manual REST Client requests
    auth.config.ts              # AuthConfig: AUTH_CODE_PEPPER, refresh TTL, REVIEW_ACCOUNTS parser, GOOGLE_WEB_CLIENT_ID
    {user,identity,sign-in-code,refresh-token}.prisma.ts   # Prisma repositories
    rules-version.prisma.ts     # PrismaRulesVersionProvider (reads the single rules_versions row)
    hmac.sign-in-code.ts        # HmacSignInCodeProvider (code generation + HMAC)
    jwt.token.ts                # JwtTokenProvider (access JWT, refresh token + hash)
    resend.email.ts             # ResendEmailProvider (pt-BR/es/en copy, dev log fallback)
    google.id-token.ts          # GoogleAuthIdTokenProvider (google-auth-library verifyIdToken, web client id audience)
    system.clock.ts             # SystemClockProvider
    sign-in-code-cleanup.job.ts # every-minute cron deleting expired codes
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
    notifications.module.ts     # wiring (DbModule); exports the two adapters of auth's ports
    notifications.controller.ts # PUT /notifications/push-token (204) — protected
    notifications.integration.http  # manual REST Client requests
    {notification,push-token,push-ticket,recipients}.prisma.ts  # Prisma repositories; PrismaRecipientsProvider
                                # (role admin and status approved)
    expo.push.ts                # ExpoPushProvider (expo-server-sdk: chunks, tickets, receipts)
    push-messages.ts            # renderPush: the push copy in pt-BR / es / en
    notifications.registration-notifier.ts  # RegistrationNotifier adapter (Notify / NotifyApprovedAdmins; logs
                                # and swallows every error)
    notifications.push-token-remover.ts     # PushTokenRemover adapter (RemovePushToken)
    push-receipt-check.job.ts   # every-minute cron running CheckPushReceipts
    system.clock.ts             # SystemClockProvider
test/
  auth-email.e2e-spec.ts        # e2e suite of the email sign-in routes (Resend replaced by a capturing fake)
  auth-session.e2e-spec.ts      # e2e suite of GET /auth/me, POST /auth/refresh and POST /auth/sign-out
  auth-whatsapp.e2e-spec.ts     # e2e suite of PUT /auth/me/whatsapp (approved accounts created through Prisma)
  auth-reactivation.e2e-spec.ts # e2e suite of POST /auth/me/reactivation-request (accounts in each state through Prisma)
  auth-google.e2e-spec.ts       # e2e suite of POST /auth/google (GoogleAuthIdTokenProvider replaced by a fake)
  registrations.e2e-spec.ts     # e2e suite of the /registrations routes (accounts through Prisma; concurrency)
  school-rules.e2e-spec.ts      # e2e suite of the /school-rules routes (tokens minted with JwtTokenProvider)
  school-rules-acceptance.e2e-spec.ts  # e2e suite of POST /school-rules/acceptances (rows checked through Prisma)
  school-settings.e2e-spec.ts   # e2e suite of the /school-settings routes (accounts in each status and role through Prisma)
  notifications.e2e-spec.ts     # e2e suite of push tokens, sign-out with a push token and the registration
                                # notifications (ExpoPushProvider replaced by a recording fake)
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
    (private)/{student,instructor,admin}/{_layout,index}.tsx # role experiences (/student, /instructor, /admin)
    (private)/admin/registrations.tsx                # "Join the school" tool (/admin/registrations)
  navigation/
    resolve-flow.ts             # Flow, resolveFlow (session user → flow), isOnboardingCompleted (number +
                                # rulesAccepted; rulesAcceptedBefore picks rules-update), onboardingStep (whatsapp / school-rules), flowEntryRoute
                                # (flow + user → entry route)
    root-navigator/             # RootNavigator: root Stack with one Stack.Protected per flow group; useRootNavigator;
                                # mounts useSessionExpired and the three notification hooks
    splash-gate/                # SplashGate: keeps the native splash screen until the fonts are ready and the
                                # stored session was restored, then renders its children (StatusBar, RootNavigator)
    rules-update-layout.test.tsx  # layout test of the rules-update group (a test under src/app would be a route)
  modules/{student,instructor}/screens/
                                # each role's screens (placeholders showing the flow's name for now)
  modules/admin/
    screens/admin.screen.tsx    # admin home: "School tools" with the "Join the school" row and its pending count
    screens/registrations.screen.tsx  # "Join the school": DecisionCards (pull-to-refresh, loading, empty,
                                # error + retry), DecidedList, one DenySheet
    registrations.types.ts      # Registration, RegistrationsResponse, RegistrationDecision (mirror the API)
    hooks/                      # use-registrations (query ["registrations"]), use-approve-registration,
                                # use-deny-registration (mutations), use-registrations-screen (the screen's logic:
                                # decisions, "Decided just now", the sheet, toasts)
    utils/                      # registration-error.ts (API error → translation key), registrations-cache.ts
                                # (removeRegistration: drop a decided item from the cache and invalidate)
  modules/notifications/
    hooks/                      # use-push-registration (PUT /notifications/push-token for pending / approved),
                                # use-notification-response (a tapped push → refresh → "Join the school" or "/"),
                                # use-notification-received (a push with the app open → refresh or invalidate
                                # ["registrations"])
    utils/refresh-account.ts    # GET /auth/me → updateUser; null on failure, rethrows SessionExpiredError
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
    components/                 # whatsapp (welcome, country chip + number, hide switch, save), country-picker
                                # (searchable bottom sheet of countries with their dial codes)
                                # school-rules.screen.tsx renders SchoolRulesAcceptance with the schoolRules.* copy
    hooks/use-save-whatsapp.hook.ts  # PUT /auth/me/whatsapp; updates the session; toast
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
                                # SchoolRulesList, fixed footer with the Checkbox and the CTA)
    utils/countries.ts          # country options (localized names, dial codes), filter, default country BR
    utils/brazilian-phone.ts    # toBrazilianDigits, formatBrazilianPhone: the Brazilian number mask
  modules/pending/
    screens/pending.screen.tsx  # Pending screen (waiting for approval, sign-out)
    components/                 # pending (header, timeline, sign-out; ticks every 60 s), pending-step (one row)
  modules/auth/
    screens/                    # auth.screen.tsx, email-choice.screen.tsx, email-sign-in.screen.tsx,
                                # create-account.screen.tsx, confirm-code.screen.tsx, google-name.screen.tsx
    components/                 # auth (sign-in), auth-button, language-sheet, email-choice (+ its row,
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
                                # chip, bottom-modal, otp-input, text-button, back-button, screen-intro,
                                # text-input, text-area, toast, checkbox
  components/decision/          # the admin tools' shared pieces: decision-card (DecisionCard), decided-list
                                # ("Decided just now"), deny-sheet (DenySheet: optional reason in a bottom sheet)
  utils/                        # app-wide helpers: format-created-at.ts ("now", relative up to 7 days, then the
                                # date), get-initials.ts
  providers/alert-message/      # AlertMessageProvider + useAlertMessage (toast for API errors)
  providers/session/            # SessionProvider + useSession: the session store exposed to React
                                # (user, tokens, isRestoring, setSession, updateUser, clearSession); starts the restore
  components/flow-placeholder/  # FlowPlaceholder: a flow's name on an empty screen
  components/account-status/    # AccountStatus: the shared layout of every closed-account state (icon tile by
                                # tone, eyebrow, title, description, optional note card and primary action,
                                # "Use another email")
  services/google-sign-in.ts    # configures GoogleSignin once; the only import point of the Google library
  services/push/push.service.ts # expo-notifications: foreground handler and Android channel at load,
                                # getPushToken(), the token registered in this session
  services/api/                 # fetch client (apiGet, apiPost, apiPut with { authenticated, timeoutMs }: token,
                                # renewal and one retry after a 401), api.request.ts (rawRequest: the bare HTTP call),
                                # ApiError, NetworkError, SessionExpiredError
  services/session/             # the session, React-free: session.store.ts (state, sign-out generation, the single
                                # in-flight refresh, signOut — which sends the registered push token), session.storage.ts (expo-secure-store keys
                                # session.tokens / session.user), session.refresh.ts (getAccessToken with the
                                # 60 s margin, refreshSession), session.restore.ts (launch restore via GET /auth/me)
  i18n/                         # i18next setup; messages/{en-US,es-ES,pt-BR}.ts (en-US is the source of the keys);
                                # backend-locale.ts (toBackendLocale: app locale → en / es / pt-BR)
  constants/                    # routes.ts (every app path; routes.home is "/"), theme.ts (design tokens), theme-variables.ts
                                # (--ds-* per scheme), fonts
  hooks/                        # useTheme, color scheme
plugins/with-ios-scene-lifecycle.js    # config plugin (UIScene life cycle for iOS 27)
jest.config.js, jest.setup.ts   # jest-expo + RNTL; mocks localization, reanimated, safe-area, bottom sheet,
                                # expo-notifications, expo-device, expo-constants
```

Components follow one folder per component (`*.component.tsx`, `*.hook.ts`, `*.types.ts`, `index.ts`), with
the test next to it. `ios/` and `android/` are generated by `expo prebuild` and gitignored.

## `apps/web` (Next.js — public pages)

```
src/
  app/{layout.tsx,page.tsx,globals.css}   # template page (design-token preview); globals.css maps the tokens to Tailwind
  components/ui/{button,chip}.tsx         # design-system components (same names/props as mobile)
```

The privacy policy and account-deletion pages don't exist yet.
