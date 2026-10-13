# Global Technical Context

Stack, constraints and cross-cutting decisions that apply to the whole project. Individual specs
reference this file instead of repeating the content. Day-to-day commands, ports and the native build steps
are in [CLAUDE.md](../../CLAUDE.md); this file records the decisions behind them.

## Monorepo

- **Turborepo** (`turbo` 2.x), managed by **npm** workspaces (Node ≥ 24, per `engines`). Workspace npm
  namespace: **`@rochas-surf-school`**.
- Workspaces: `apps/*` (backend, mobile, web), `modules/*` (framework-free business modules),
  `packages/*` (`shared`, `design-tokens`, and Turbo's unused `eslint-config` / `typescript-config`).
- Root scripts: `dev`, `build`, `lint`, `check-types` delegate to `turbo run <task>`; `format` runs Prettier.
- Turbo tasks: `build` (outputs `.next/**` and `dist/**` — `dist/**` so a cache hit restores the built
  `packages/shared` and `modules/*`, which the apps import from `dist/`), `lint`, `check-types`, `dev`, and since
  spec 025 `test` (`dependsOn: ["^build"]`, outputs `coverage/**`) and `test:e2e` (`dependsOn: ["^build"]`,
  `cache: false`). A workspace that imports another must declare it in its `package.json` so Turbo builds it
  first and counts it in `--affected` (`modules/auth` declares `@rochas-surf-school/shared` since spec 025).
- Language: **TypeScript 6** everywhere. Prettier for formatting; **oxlint** in the backend, **ESLint** in web
  and mobile.
- `react`, `react-dom`, `@types/react` and `typescript` are pinned to Expo's versions through root `overrides`
  — see [CLAUDE.md → Dependency constraints](../../CLAUDE.md#dependency-constraints): a second React copy
  breaks the mobile app at runtime.

## Applications

- **`apps/mobile`** — **Expo SDK 57** (React Native 0.86, **Expo Router 57**, Reanimated 4, React Compiler).
  The product: every role (student, instructor, admin) uses it, on iOS and Android. API base URL:
  `EXPO_PUBLIC_API_URL`. Libraries by concern:
  - Session: **`expo-secure-store`** 57 (no config plugin entry: plain key-value, no Face ID) keeps the session
    on the device under two keys, `session.tokens` (JSON of the four token fields) and `session.user` (JSON of
    the account); see Authentication → Mobile session. The Jest setup replaces it with an in-memory mock.
  - Sign-in: `@react-native-google-signin/google-signin` 16 (Google; in use since spec 017, its config plugin in
    `app.json` carries the iOS URL scheme) and `expo-apple-authentication` (Apple, iOS only; not installed yet,
    it comes with the Apple spec).
  - Server data: **TanStack Query 5** — every screen fetches, caches, retries and invalidates the same way.
    One `QueryClient` in the root layout, mutations without retry. Requests go through the `fetch` client in
    `src/services/api/` (`apiGet`, `apiPost`, `apiPut`): it builds the URL from `EXPO_PUBLIC_API_URL`, sends
    JSON for POST and PUT (a GET has no body and no Content-Type), and throws `ApiError` (`status`, `errors`,
    `details`; empty `errors` when the body isn't JSON) on a non-2xx answer or `NetworkError` when no answer
    arrives. Options on all three: `{ authenticated: true }` sends the session's access token (renewed first
    when needed, see Mobile session) — callers never read or pass tokens; `timeoutMs` aborts the request with an
    `AbortController` and throws `NetworkError` (no timeout unless asked). `SessionExpiredError` means the
    backend refused to renew the session. The bare HTTP call is `rawRequest` in `api.request.ts` (no session
    logic), which the client and the session store share so they don't import each other.
  - Phone numbers: **`libphonenumber-js`** (default metadata) turns what the person typed and the chosen
    country into E.164 and lists the countries with their dial codes; **`i18n-iso-countries`** gives their
    names in en, es and pt, following the app language. Both run under Jest without a transform. With Brazil
    selected, the WhatsApp field keeps only the digits (`toBrazilianDigits`: non-digits dropped, a leading `55`
    dropped when there are more than 11 digits, capped at 11) and shows them masked as `(XX) XXXX-XXXX` or
    `(XX) XXXXX-XXXX` (`formatBrazilianPhone`, `modules/onboarding/utils/brazilian-phone.ts`, a pure function
    rather than `AsYouType`); E.164 is built from those same digits. Other countries keep the typed text.
  - Translations: **i18next** + `react-i18next`, with `expo-localization` for the phone's language
    (pt-BR fallback).
  - Push: **`expo-notifications`** 57 (config plugin in `app.json` with `defaultChannel: "default"`; since spec
    020), with `expo-device` and `expo-constants`. `src/services/push/push.service.ts` sets the foreground
    handler at module load (banner, list and sound, no badge), creates the Android channel `default` (importance
    high), and `getPushToken()` returns the Expo push token or `null` — not a physical device, no EAS
    `projectId` (`Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId`), permission not
    granted, or the token call throwing; the OS dialog is asked only while the permission is `undetermined`. It
    also keeps the token this session registered (`get/set/clearRegisteredPushToken`, module state). Hooks in
    `src/modules/notifications/hooks/`, all mounted in `RootNavigator`: `usePushRegistration` (`PUT
    /notifications/push-token` with `{ token, locale }` for a `pending` or `approved` user, whenever the user id,
    its status or the i18n language changes; silent on any failure), `useNotificationResponse` (a tap — the
    launch response once the session is restored, then the listener; deduplicated by `notificationId`: refreshes
    the account with `refreshAccount()`, then `router.push(routes.admin.registrations)` for a
    `registration.pending` push when the account resolves to the `admin` flow, else `router.replace(routes.home)`
    (`"/"`), so `resolveFlow` alone decides access) and `useNotificationReceived` (a push with the app open:
    `registration.approved` / `.denied` refresh the account, `registration.pending` invalidates
    `["registrations"]`; no navigation). `refreshAccount()` (`src/modules/notifications/utils/`) is `GET
    /auth/me` → `updateUser`, `null` on failure, rethrowing only `SessionExpiredError`. The app → backend locale
    mapping (`en` / `es` / `pt-BR`) is `toBackendLocale` in `src/i18n/backend-locale.ts`, shared by the sign-in
    email and push registration. Pushes need the EAS `projectId` in `app.json` (`eas init`) and the APNs key /
    FCM service account (`eas credentials`) plus a native rebuild — not set up yet, so the app registers nothing
    until then.
  - Dates: `date-fns` 4 + `@date-fns/tz`, always displayed in `America/Fortaleza` (`format(…, { in: tz("America/Fortaleza") })`);
    relative times use date-fns locales `ptBR` / `es` / `enUS`, picked from the i18n language.
  - Design system: `@rochas-surf-school/design-tokens` through `src/constants/theme.ts` (see Fixed conventions).
  - Native folders (`ios/`, `android/`) are generated by `expo prebuild` and never edited; native changes go
    through config plugins in `apps/mobile/plugins/`.
  - Build: the workspace has no `build` script (Turbo skips it); `check-types` and `lint` are its checks, and
    native builds follow [CLAUDE.md → Native builds](../../CLAUDE.md#native-builds-appsmobile). Tests: **Jest via `jest-expo` + React Native Testing Library 14** (`*.test.tsx`, next to the file),
    with the React Compiler on in the transform as in the app; `jest.config.js` maps `uuid` to its CommonJS
    build so `@rochas-surf-school/shared` loads, and uses the `react-native-worklets` resolver Reanimated's
    mock needs.
- **`apps/backend`** — **NestJS 12** (ESM: relative imports end in `.js`), port **4000** (`PORT`). REST with
  JSON bodies; dates travel as ISO 8601 strings in UTC. `@nestjs/config` is global; CORS is on. Libraries by
  concern: Prisma 7 (persistence), `@nestjs/jwt` + `passport-jwt` (auth, see Authentication),
  `@nestjs/schedule` 12 (scheduled work), `@nestjs/throttler` 6 (rate limits, see Authentication), the
  providers' SDKs behind domain ports (`resend` 6 for email, `expo-server-sdk` 7 for pushes; see External
  integrations).
  Build with `nest build` (`prebuild`, `precheck-types`, `pretest` and `pretest:e2e` run `prisma generate`). Lint with `oxlint --type-aware`. Tests with
  **Vitest 4** — unit tests `src/**/*.spec.ts`, e2e tests `test/**/*.e2e-spec.ts` with supertest.
  Docker: `Dockerfile` + `docker-compose.yml` (backend + Postgres).
- **`apps/web`** — **Next.js 16** (App Router, `src/`), **Tailwind 4**, port **3000**. Only the public web
  pages the app stores require — the privacy policy, the terms of use and the account-deletion page, each in
  pt-BR, es and en.
  No sign-in, no private area and no API calls. Build with `next build`; it needs a **Node runtime**
  (`next start`, or a platform that runs Next) because of the proxy — no static export. Tests (spec 025):
  **Vitest 4** + React Testing Library + jsdom (`src/**/*.test.{ts,tsx}`, next to the file, `npm test`) and
  **Playwright** (Chromium only, `e2e/*.e2e.ts`, `npm run test:e2e`), see Automated validation.
  - Routes: `src/app/[lang]/` holds the root layout (`<html lang>` `pt-BR` / `es` / `en`, fonts, header, footer)
    and the pages `/{lang}`, `/{lang}/privacy-policy`, `/{lang}/terms-of-use` and `/{lang}/account-deletion`, with `lang` one of `pt-br`,
    `es`, `en` and English slugs in every language. Every page is statically generated (`generateStaticParams`,
    `dynamicParams = false`, so another `lang` answers 404) and sets its translated `<title>` and description
    with `generateMetadata`.
  - Language: `src/proxy.ts` (Next 16's replacement for middleware, matching only `/`, `/privacy-policy`,
    `/terms-of-use` and `/account-deletion`) redirects with 307 to the same path under the first `Accept-Language` entry, in quality
    order, whose language is `pt`, `es` or `en` (`matchLocale` in `src/i18n/locales.ts`), **pt-BR** when none
    matches or the header is missing. Copy lives in typed dictionaries (`src/i18n/dictionaries/{pt-br,es,en}.ts`,
    each `satisfies Dictionary` from `src/i18n/dictionary.types.ts`, loaded server-side by `getDictionary`), so a
    missing or extra key fails `check-types` and copy changes are text-only. The header's language picker is a
    `<details>` pill with plain links to the same page in each language, so it works without JavaScript. It and
    the theme toggle are the only client components.
  - Theme: the site follows the OS color scheme (the tokens' `prefers-color-scheme` palette) until the visitor
    presses the header's `ThemeToggle`, which sets `data-theme` (`light` or `dark`) on `<html>` and stores it in
    `localStorage` under `theme` (in a try/catch, so it still works for the page when storage is unavailable).
    An inline `<script>` in `<head>` of `[lang]/layout.tsx` applies a stored `light`/`dark` before first paint
    (any other value is ignored), so the choice survives page and language loads without a flash; `<html>` has
    `suppressHydrationWarning`. The sun/moon icon swap is CSS only (`.theme-toggle-sun` / `.theme-toggle-moon` in
    `globals.css`), because the server can't know the theme. There is no "system" option in the UI.
  - `SCHOOL_WHATSAPP_NUMBER` (server-only, E.164) is read by `src/config/school-whatsapp.ts`, validated with the
    shared `PhoneNumberRule`, formatted with **`libphonenumber-js`** `formatInternational()` and linked to
    `https://wa.me/<digits>`; a missing or invalid value throws an error naming the variable, so `next build`
    fails. It is a build-time copy of the school setting (spec 015): the site is rebuilt when the number changes.
  - `SCHOOL_LEGAL_NAME`, `SCHOOL_CNPJ` (optional), `DPO_NAME` and `DPO_EMAIL` (server-only) are read by
    `src/config/school-legal.ts`: the CNPJ needs 14 digits with valid check digits (masked input accepted, shown
    as `00.000.000/0000-00`), the email is validated with the shared `EmailRule`, and a missing or invalid value
    throws an error naming the variable, so `next build` fails. They fill the policy's controller and encarregado
    cards. Next loads `apps/web/.env` over an empty exported variable.
  - Icons: **`lucide-react`** with stroke width 2. Components follow `.claude/rules/react.md`
    (`src/components/<name>/`, `src/components/ui/{button,chip}/`); the web `Button` takes an optional `href`
    and then renders an `<a>` with the same classes.
- **`modules/<module>`** — business modules (`@rochas-surf-school/<module>`), plain TypeScript compiled with
  `tsc`. Tests with **Jest 30** + `ts-jest`, in `test/` mirroring `src/` (`*.test.ts`). Only `modules/auth`,
  `modules/school-rules`, `modules/school-settings` (`GET /school-settings` and
  `PUT /school-settings/whatsapp`, protected, both answer `{ whatsappNumber }`) and `modules/notifications`
  (spec 020; no dependency on `auth`, see External integrations → Push notifications) exist today.
- **`packages/shared`** — base classes and contracts every module uses: `Entity`, `UseCase`,
  `CrudRepository` and its parts, `DomainError` (with optional `details`) / `ValidationError` /
  `ValidationException` (422) / `NotFoundError` (404) / `UnauthorizedError` (401) / `ForbiddenError` (403) /
  `ConflictError` (409, for a stale write, e.g. accepting an outdated rules version) /
  `TooManyRequestsError` (429) / `BadGatewayError` (502), and the `Validator` with its reusable rules —
  among them `PhoneNumberRule` (key `phone`: an E.164 string, `^\+[1-9]\d{1,14}$`, that `libphonenumber-js`'s
  `isValidPhoneNumber` accepts for its country). Jest, like the modules.
- **`packages/design-tokens`** — the design system's tokens; `src/tokens.ts` is the source and `src/tokens.css`
  is generated and committed (`check-types` fails when it is stale).

## Persistence

- **PostgreSQL 18** via **Prisma 7** (`prisma`, `@prisma/client`, `@prisma/adapter-pg`). The client is
  generated as ESM into `apps/backend/src/generated/prisma` (gitignored) and used through `PrismaService`,
  provided globally by `DbModule` (`apps/backend/src/db/`).
- Modular schema: `apps/backend/prisma/schema.prisma` holds the generator and datasource, and each business
  module has its own `apps/backend/prisma/models/<module>.model.prisma`.
- Database names are `snake_case`: tables lowercase and plural (`@@map`), columns via `@map`; Prisma model and
  field names stay PascalCase / camelCase like the domain entities. Value-object lists may get a child table
  with a composite key (e.g. `user_rules_acceptances`).
- Migrations are incremental and named after the module: `<module>` for its first one, then
  `<module>-<short-change>` (e.g. `auth-add-refresh-tokens`). Generated with
  `npm run prisma:migrate:dev --workspace apps/backend -- --name <name>`; applied in CI and deploys with
  `prisma:migrate:deploy`. The `backend-prisma-sync-module` skill does this from a module's entities.
- Seeds (`apps/backend/prisma/seed/main.ts`, one task per module) hold only technical data and the three App
  Store / Google Play review accounts — never demo data.
- **`users.status` is the authority for deleted and removed accounts**, not the `deleted_at` column inherited
  from `EntityState`: the product distinguishes deleted from removed, and two sources would disagree.
- Connection: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` (or
  `DATABASE_URL`) in `apps/backend/.env`; local database with `npm run db:start --workspace apps/backend`.

## Architecture

**Ports and adapters, by business module.** Business rules live in framework-free modules; the apps adapt
them to HTTP, the database, the providers and the screens. Dependencies point inwards: apps → modules →
`packages/shared`.

- **Domain** lives in `modules/<module>/src/<aggregate>/` — `model/` (entities extending `Entity<State>`,
  self-validating with the shared `Validator`), `provider/` (repository and provider interfaces — the ports),
  `usecase/` (one class per use case implementing `UseCase<In, Out>`, dependencies in the constructor).
  **Who may do what** is checked here: use cases receive the current user (id, role, status) and enforce the
  role and state rules, so permissions are unit-tested with the rest of the business rules. **Must not**
  depend on NestJS, Prisma, React, any SDK, or another app. May depend on `@rochas-surf-school/shared` and on
  another module's public exports.
- **Shared kernel** lives in `packages/shared` — base classes, contracts, errors and validation rules only.
  **Must not** depend on any module or app, or contain product rules.
- **Backend adapters** live in `apps/backend/src/modules/<module>/` — the Nest module, thin controllers that
  reuse the use cases' `In`/`Out` types, `Prisma<Name>Repository` classes in `*.prisma.ts`, concrete provider
  classes (e.g. the push or email sender) injected directly without tokens, and scheduled jobs that call use
  cases. Cross-cutting backend code (auth guard, decorators, error filter) lives in `apps/backend/src/shared/`
  (generated by the `backend-nest-config` skill, whose templates in
  `.claude/skills/backend-nest-config/assets/` are ESM and carry their Vitest specs — rewritten on every run,
  so never edit it by hand: fix the templates and rerun). **Must
  not** contain business rules: a rule found in a controller, repository or job belongs in a use case.
- **Mobile** lives in `apps/mobile/src/` — `app/` holds Expo Router routes only (each renders a screen),
  `modules/<module>/screens` and `modules/<module>/components` hold the UI per module, `components/ui/` the
  design-system components shared with web. **Must not** duplicate business rules beyond what the UI needs to
  guide the user (the backend decides); talks to the backend only over HTTP.
- **Web** lives in `apps/web/src/app/` — static public pages. **Must not** call the API or import business
  modules.
- **Time**: a class's state (not started, started, finished) is **computed from the clock** and its times,
  never stored, so it can't go stale. Side effects due at a given time run as scheduled jobs (see Scheduled
  work).

## Fixed conventions

- **Languages**: code, identifiers, commits, specs and docs in English. The UI is in Brazilian Portuguese,
  Spanish and English through translation keys — no user-facing text is hard-coded in components or sent by
  the backend. Text written by admins (rules, notes, reasons, broadcasts) is stored and shown as written,
  never translated. **Two exceptions**, both texts the OS or a mail client draws without the app: the sign-in
  code email, whose pt-BR / es / en copy lives in `ResendEmailProvider` (the client sends the `locale` picked on
  the sign-in screen), and the push text, whose catalog (`renderPush(type, params, locale)`) lives in
  `apps/backend/src/modules/notifications/push-messages.ts` and is drawn per device in the locale that device
  registered (spec 020). A stored notification holds no text — only `type` and `params` — so the app can
  translate it.
- **Contracts**: controllers reuse the use case's `In` interface and return its output; a controller-specific
  DTO only when HTTP really differs from the use case. No `class-validator` / `ValidationPipe`: input is
  validated by the domain, so there is one set of rules.
- **Validation**: entities validate themselves in `validate()` with the shared `Validator` and rules; a new
  reusable rule goes into `packages/shared` (`shared-validation-rule` skill). Use cases check the rules that
  need other data (seats, states, roles).
- **Error messages are translation keys**: every `DomainError` message is a key of the form
  `<concept>.<field-or-reason>.<code>`, like the `Validator`'s `user.name.required` or
  `enrolment.class.full`. The mobile app translates them. Reason: the backend doesn't know the user's
  language, and the three locales must stay in one place.
- **Identifiers**: UUID v4, created by `Entity` in the domain, so ids exist before persistence.
- **Time**: timestamps are stored in UTC and shown in `America/Fortaleza` whatever the phone's time zone;
  date-only logic (days, weeks Monday to Sunday) is computed in `America/Fortaleza` too.
- **Data ownership**: one school, no tenancy. Visibility rules (unshared WhatsApp numbers, guest names,
  pending accounts) are enforced by use cases, never only hidden by the UI.
- **Design system**: never hard-code colors, fonts or radii — use the tokens (rules in
  [CLAUDE.md → Design system](../../CLAUDE.md#design-system) and section 08 of
  `.docs/designs/design-system.html`). Components keep the same names and props on web and mobile.
- **Mobile forms validate with the shared rules**: a form runs the same `Validator` rules as the entity the
  backend builds (e.g. `User.validate()`'s name and email rules), imported from `@rochas-surf-school/shared` —
  no regex or rule is re-implemented in the app, so what the app accepts the backend accepts. The backend
  still decides.
- **Mobile shared UI**: every screen that can go back uses `BackButton` (`src/components/ui/back-button`,
  44×44, `router.back()` by default); inner screens open with `ScreenIntro` (icon tile, optional eyebrow, title, description; the tile's
  background is `bg-sand` unless `iconTileClassName` passes another token class, and the eyebrow is `text-ink-2`
  unless `eyebrowClassName` passes another)
  and use the shared `TextInput` (leading icon, `neutral` / `error` border, error message below), `OtpInput`
  (digit boxes over a hidden native input that keeps only digits, so paste and one-time-code autofill work) and
  `Button` (variants, including `ghost`, plus `loading` and `disabled` states, and an optional `icon` — a glyph
  drawn before the label; the web `Button` takes the same `icon`). Every closed-account state (denied, deleted,
  removed) is drawn by `AccountStatus` (`src/components/account-status`): a `ScreenIntro` whose icon tile follows
  `tone` (`bad` → `bg-bad-tint`/`text-bad`, `dim` → `bg-dim`/`text-ink-2`, `sand` → `bg-sand`/`text-grape`), an
  optional note card (`{ title, text }`), an optional `primaryAction` node, and the ghost "Use another email"
  button (`onUseAnotherEmail`) always last; it lives outside the modules because `offboarding` and
  `reactivation` both use it. A tick box is the shared
  `Checkbox` (`src/components/ui/checkbox`: `checked`, `onChange(checked)`, `label`, `disabled`) — one
  `Pressable` row with role `checkbox`, so the box and its label toggle it, at least 44 pt tall. Multi-line text is
  the shared `TextArea` (`src/components/ui/text-area`: controlled `value` / `onChangeText`, required `maxLength`
  enforced by the native input, a "{length}/{maxLength}" counter under it, optional `label` also used as the
  accessibility label, no icon, the `TextInput` border tokens). `BottomModal` passes `onClose` to the sheet
  library too, so dragging the sheet down reaches the caller (a backdrop tap may call it twice; callers must
  tolerate that). The admin tools share `src/components/decision/` — `DecisionCard` (initials avatar on
  `bg-sand`/`text-grape`, title, optional subtitle, detail lines, ghost Deny and primary Approve; `disabled` and
  `loading: "approve" | "deny"`), `DecidedList` ("Decided just now": rows with a `Chip` tag, tone `ok` / `bad`;
  renders nothing when empty) and `DenySheet` (`BottomModal` + `TextArea` + `Button`; clears its text when it
  closes) — with generic props and no registration fields, so "Reactivate accounts" and "Class enrolments" plug in
  their own data and copy. App-wide helpers live in `src/utils/`: `formatCreatedAt` ("now", relative up to 7
  days, then the date in America/Fortaleza; used by the Pending screen and the registration cards) and
  `getInitials` (first letter of the first and of the last word, uppercase). API errors are shown in a toast
  through `useAlertMessage()` (`AlertMessageProvider` in the root layout; the toast hides by itself after 3 s).
  One exception: an error about what the person typed in a code field (a wrong, expired or locked code) is
  shown inline under the field, because the design shows it there.
- **Mobile routes**: every app path lives in `src/constants/routes.ts` (`routes.<module>.<screen>`, a function
  when the route takes params, optional ones included: `routes.auth.createAccount()` or
  `routes.auth.createAccount({ email })`). `router` and `Redirect` calls and their tests use it, never string literals,
  so a moved route changes in one place.
- **Mobile flows**: each account state has one flow — `auth`, `pending`, `onboarding`, `rules-update`, `reactivation`,
  `offboarding-denied`, `offboarding-removed`, `student`, `instructor`, `admin` — picked only by `resolveFlow`
  (`src/navigation/resolve-flow.ts`) from the session's user: no user, or an unknown role or status → `auth`;
  `pending` (any role) → `pending` (`/pending`, the waiting-for-approval screen, whose only way out is signing
  out); `approved` → `onboarding` until onboarding is completed, then its role — except an account with a
  `whatsappNumber`, `rulesAccepted: false` and `rulesAcceptedBefore: true`, which goes to `rules-update`
  (`routes.rulesUpdate.home` = `/rules-update`, the "Regras atualizadas" screen; its layout turns swipe-back
  off and the screen has no back or sign-out button, so accepting is the only way out); `deleted` →
  `reactivation`; `denied` / `removed` → their offboarding flow. `RootNavigator`
  (`src/navigation/root-navigator/`) wraps each flow's route group in `Stack.Protected` driven by that flow
  (the offboarding layout guards `denied` and `removed` the same way), and `src/app/index.tsx` redirects to
  `flowEntryRoute(flow, user)`. The onboarding flow has steps, decided in the same file: `onboardingStep(user)`
  is `whatsapp` while the user has no `whatsappNumber`, then `school-rules`, and `flowEntryRoute` opens the
  step's route (`routes.onboarding.whatsapp` = `/onboarding`, `routes.onboarding.schoolRules` =
  `/onboarding/school-rules`). `useRootNavigator` passes `onboardingCompleted: isOnboardingCompleted(user)`
  (same file): a WhatsApp number and `rulesAccepted === true`, so an account that hasn't accepted the current
  school rules version goes back to the School rules step (or to `rules-update` when it accepted before); the app has no version logic of its own, the
  backend's `rulesAccepted` decides. The onboarding group is guarded by flow, not by step. Reason: one tested function holds every access rule, so screens, layouts and hooks never
  decide access, and a flow change never strands a person on a screen they can no longer reach. A flow's
  screens go in `src/modules/<flow>/screens/` with a route file in that flow's folder under `src/app/`.
  Route tests use `renderRouter` from `expo-router/testing-library` with a route tree built from the real route
  files, and read the path with `getPathname()` (the `toHavePathname` matcher doesn't work with RNTL 14's async
  render).
- **CTA labels**: the `button` type style is Barlow Condensed 700, 18px, uppercase, on web and mobile.
- **Generator skills**: new modules, aggregates, entities, repositories, use cases, controllers, Prisma
  repositories and providers are created with the project skills in `.claude/skills/` so they follow one
  pattern. `config-new-module` always runs with `--skip-web`: modules have no web pages.
- **Template code**: the first spec that touches an app removes its framework template code — Expo's example
  screens and components (`npm run reset-project`), the web design-token preview, the stock
  `AppController`/`AppService` and its e2e test — so it is never mistaken for product code (done for the backend in
  spec 001, for mobile before the spec workflow, and for web in spec 022).
- **Lint**: each domain module gets oxlint (`.oxlintrc.json` mirroring the backend's) and a `check-types`
  script (`tsc --noEmit`) in the first spec that touches it, like the backend (`modules/auth` and `modules/school-rules` have both).
- **Naming**: `kebab-case` files with a role suffix; general rules in
  [Naming rules](../shared/naming-rules.md). The project's suffixes:

  | Suffix | Where | What |
  |---|---|---|
  | `.entity.ts` | `modules/*/src/<aggregate>/model/` | domain entity |
  | `.repository.ts` | `modules/*/src/<aggregate>/provider/` | repository port |
  | `.provider.ts` | `modules/*/src/<aggregate>/provider/` | technical port (email, push, AI…) |
  | `.usecase.ts` | `modules/*/src/<aggregate>/usecase/` | use case |
  | `.test.ts` | `modules/*/test/`, `packages/shared/test/` | Jest unit test |
  | `.module.ts` / `.controller.ts` | `apps/backend/src/modules/<module>/` | Nest wiring / HTTP adapter |
  | `.prisma.ts` | `apps/backend/src/modules/<module>/` | Prisma repository (`Prisma<Name>Repository`) |
  | `.model.prisma` | `apps/backend/prisma/models/` | the module's Prisma schema |
  | `.integration.http` | next to the controller | manual REST Client requests |
  | `.spec.ts` / `.e2e-spec.ts` | `apps/backend/src/`, `apps/backend/test/` | Vitest unit / e2e test |
  | `.screen.tsx` / `.component.tsx` | `apps/mobile/src/modules/<module>/` | screen / component |
  | `.test.tsx` | next to the mobile file | Jest + RNTL test |

  Provider implementations are named after their technology (`expo.push.ts`, class `ExpoPushProvider`).

## Authentication

- Passwordless sign-in: **Google** and **Apple** ID tokens obtained natively on the phone and **verified by
  the backend**, and **6-digit email codes** generated, stored hashed and verified by the backend. The backend
  then issues its own tokens; one account per email address.
- Google sign-in (`POST /auth/google`, `@Public()`, throttled 10 requests per 60 s, `SignInWithGoogle` in
  `modules/auth/src/identity/usecase/`): takes `{ idToken, name? }` and answers 200 with the same body as
  `POST /auth/email/verify` (session tokens + `user: AccountOut`). The token is verified behind the
  `GoogleIdTokenProvider` port (`modules/auth/src/identity/provider/google-id-token.provider.ts`,
  `verify(idToken)` → `{ sub, email, emailVerified, name? }`, rejecting any invalid token), implemented by
  `GoogleAuthIdTokenProvider` (`apps/backend/src/modules/auth/google.id-token.ts`) with `google-auth-library`'s
  `OAuth2Client.verifyIdToken({ idToken, audience: GOOGLE_WEB_CLIENT_ID })` — the native library issues tokens
  for the **web** client id on both platforms. Order: a missing, empty or non-string `idToken` → 422
  `idToken.token.required` (provider not called); a rejected token → 401 `auth.google.tokenInvalid`;
  `email_verified` not `true` → 401 `auth.google.emailNotVerified`, before any lookup. The account is then found
  by the `google` identity's `sub`, else by the normalized email (a `google` identity is added to it), else
  created as a `pending` `student` with a `google` identity; the account's email is never changed. A new
  account's name is the body `name`, else Google's, trimmed; when it fails `User.validate()` the answer is 422
  `user.name.*` and nothing is written (the app asks for a name and resends the same token). A body `name` is
  ignored for an existing account. Without `GOOGLE_WEB_CLIENT_ID` outside production every token is refused
  without calling Google.
- Tokens: a short-lived **access JWT (15 minutes)**, HS256 signed with `JWT_SECRET`, payload
  `{ sub: user id, email }`, plus a **refresh token (30 days)**: 32 random bytes (base64url), stored only as a
  plain SHA-256 hex in `refresh_tokens` with a `family_id` per sign-in; a token is looked up by hashing the
  plaintext (`TokenProvider.hashRefreshToken`), which is never stored or logged.
- Session renewal (`POST /auth/refresh`, `@Public()`): **rotation with reuse detection**. The sent token is
  revoked and its successor (same family) inserted in **one Prisma transaction** (`RefreshTokenRepository.rotate`:
  a conditional `updateMany` on `revoked_at IS NULL`, then `create`), so of two concurrent refreshes exactly one
  wins, and the loser — or any later use of an already-revoked token — revokes the whole family. The successor
  expires `REFRESH_TOKEN_EXPIRES_IN_DAYS` after the rotation (sliding), so an active user stays signed in. An
  unknown, expired, revoked or user-less token answers 401 `auth.refreshToken.invalid`; the account's status
  never refuses a refresh. Consequence for the app: one refresh at a time, and no sign-out while one is in
  flight.
- Sign-out (`POST /auth/sign-out`, `@Public()`): identified by the refresh token in the body (the access token
  carries no family and may have expired); it revokes the active tokens of that token's family only — the
  account's other sign-ins stay — and always answers 204, changing nothing for an unknown, expired or revoked
  token. Both routes answer 422 `refreshToken.token.required` for a missing, empty or non-string token.
  Sign-out also takes an optional `pushToken` (spec 020): when the refresh token is found, whatever its state,
  and `pushToken` is a non-empty string, `SignOut` deletes that push token if it belongs to the token's user,
  through the `PushTokenRemover` port (`modules/auth/src/session/provider/push-token-remover.provider.ts`,
  `remove(userId, token)`); anything else in `pushToken` is ignored.
- Registration notifications: `auth` declares the `RegistrationNotifier` port
  (`modules/auth/src/user/provider/registration-notifier.provider.ts`: `registrationPending({ id, name })`,
  `registrationApproved(userId)`, `registrationDenied(userId, reason?)`). `VerifySignInCode` and
  `SignInWithGoogle` call `registrationPending` only on the path that creates the account, after the user and
  identity are stored; `ApproveRegistration` / `DenyRegistration` call theirs only after `updateIfPending`
  returned `true` (the deny reason trimmed, `undefined` when blank). Both ports are implemented in
  `apps/backend/src/modules/notifications/` (`NotificationsRegistrationNotifier`, which catches and logs every
  error so notifying never changes the answer, and `NotificationsPushTokenRemover`); `AuthModule` imports
  `NotificationsModule`, never the reverse, and `modules/notifications` doesn't depend on `auth`.
- Erasure of denied registrations (spec 021): `EraseDeniedRegistrations` (`modules/auth/src/user/usecase/`)
  selects the ids of the `denied` users whose `deniedAt` is 30 × 24 h or more before the `ClockProvider`'s now
  (`UserRepository.findDeniedBefore(cutoff)`; a null `deniedAt` is never selected), stops when there are none,
  then deletes the admins' `registration.pending` notifications about them through the
  `RegistrationNotificationEraser` port (`modules/auth/src/user/provider/registration-notification-eraser.provider.ts`,
  `erase(userIds)`) and finally hard deletes the users (`UserRepository.deleteDenied(ids)`, a `deleteMany` on
  the ids **and** `status: 'denied'`), returning `{ erased }`. That order keeps the ids findable while a step
  fails, so the next run retries. The database cascade removes identities, refresh tokens, rules acceptances,
  the user's notifications and push tokens; nothing is anonymized (a denied account has no history).
  `registration.pending` params are `{ name, userId }` so those rows can be found; the port is implemented by
  `NotificationsRegistrationNotificationEraser` (running `DeleteRegistrationNotifications`, a JSON-path filter
  on `params.userId`) and exported by `NotificationsModule`.
- Email codes: `crypto.randomInt` padded to 6 digits, stored as hex HMAC-SHA256 keyed by `AUTH_CODE_PEPPER`
  over `` `${email}:${code}` `` and compared with `timingSafeEqual` — 10⁶ codes make a plain hash reversible,
  so the pepper protects them. One row per normalized email (trimmed, lowercase — emails are stored that way
  everywhere); a code is consumed with one atomic `deleteMany({ email, codeHash })`, which makes it single-use
  under concurrent verifies. A cleanup job deletes expired codes every minute.
- Rate limits: `@nestjs/throttler`, in-memory, by IP, bound per route with `@UseGuards(ThrottlerGuard)` and
  `@Throttle` (code request 5; code verify, Google sign-in, refresh and sign-out 10 requests per 60 s); its error key is
  `request.rate.limited`. How the client IP is read behind a proxy is decided by the first spec that deploys.
- Global `JwtAuthGuard` (from `backend-nest-config`, applied); open routes use `@Public()`; controllers get
  the user with `@CurrentUser()`. The guard **reloads the user on every request** (`JwtStrategy.validate` reads
  `id`, `email`, `role` and `status` by the token's `sub` through `PrismaService`), so a removal, denial,
  deletion or role change takes effect immediately rather than when the token expires; `AuthenticatedUser`
  carries those four fields plus the claims. The guard never refuses by status or role — use cases do. Every
  401 it answers (no token, malformed, wrong signature, expired, unknown user) is `auth.token.invalid`, so the
  app reacts the same way to each (renew, else sign in again). `GET /auth/me` returns the account
  (`{ id, name, email, role, status, createdAt, whatsappNumber, whatsappVisible, rulesAccepted, rulesAcceptedBefore,
  denialReason, reactivationStatus }`, `whatsappNumber` an E.164 string or `null`, `denialReason` the stored
  reason or `null`, `reactivationStatus` `"requested"` | `"denied"` or `null` — both as stored, whatever the
  status; the closed-account dates are never returned) for any status — the same `user` shape as verify and refresh, and
  the body of `PUT /auth/me/whatsapp` and `POST /school-rules/acceptances`. One mapper builds it:
  `toAccountOut(user, currentRulesVersion)` / `AccountOut` in `modules/auth/src/user/usecase/account.out.ts`.
- `rulesAccepted` is `true` when the current school rules version is 0 or the account has an acceptance of the
  current version, `false` otherwise, computed on every answer so the app's routing stays a function of the
  session's user. `rulesAcceptedBefore` is `true` when the account has an acceptance of any version
  (`user.rulesAcceptances.length > 0`), so the app tells a new version from a first acceptance. `auth` reads the version through the `RulesVersionProvider` port
  (`modules/auth/src/user/provider/rules-version.provider.ts`, `getCurrentVersion()`), implemented by
  `PrismaRulesVersionProvider` (`apps/backend/src/modules/auth/rules-version.prisma.ts`, the single
  `rules_versions` row) — a port because `modules/school-rules` depends on `auth`, so `auth` can't depend on
  it. Acceptances are written with `UserRepository.addRulesAcceptance` (`createMany` with
  `skipDuplicates: true`), never through `update()`, which rewrites every acceptance: a concurrent repeat is a
  no-op and the first `acceptedAt` stays.
- WhatsApp number: `PUT /auth/me/whatsapp` (`SetWhatsapp`) takes `{ whatsappNumber, whatsappVisible }`, always
  replaces both, and answers 200 with that same account shape. Only an `approved` account may call it (403
  `user.status.notApproved`); the number is required (422 `user.whatsappNumber.required`) and must pass
  `PhoneNumberRule` (422 `user.whatsappNumber.phone`). Numbers are stored in E.164 as sent: the backend
  validates, never normalizes, and the app sends `parsePhoneNumberFromString(typed, country).number` (for Brazil, of the field's digits). The same
  number may belong to several accounts.
- Reactivation request: `POST /auth/me/reactivation-request` (`RequestReactivation`, protected, no body)
  answers 200 with the account shape. It checks, in this order: the account exists (401 `auth.token.invalid`),
  its status is `deleted` (403 `user.status.notDeleted`), its request wasn't denied (409
  `user.reactivation.denied`); an account already `requested` gets the account and nothing is written;
  otherwise it stores `reactivationStatus = "requested"` and `reactivationRequestedAt` (the `ClockProvider`'s
  now, stored but never returned). The status stays `deleted`; the 30-day window isn't checked.
- Registrations (`registrations.controller.ts`, protected; use cases in `modules/auth/src/user/usecase/`):
  `GET /registrations` (`ListRegistrations`) → 200 `{ items: [{ id, name, email, createdAt }] }`, every
  `pending` user of any role, `createdAt` ascending, unpaginated; `POST /registrations/:id/approve`
  (`ApproveRegistration`, body ignored) and `POST /registrations/:id/deny` (`DenyRegistration`, body
  `{ reason? }` passed as is) → 200 `{ id, status }`. Checked in this order: access
  (`assertCanDecideRegistrations` in `registration-access.ts`: status other than `approved` → 403
  `user.status.notApproved`, then a non-admin → 403 `user.role.notAdmin`); then `findPendingRegistration`
  (`pending-registration.ts`): an id that isn't a UUID (tested by pattern, no lookup) or names no user → 404
  `registration.notFound`, a user that isn't `pending` → 409 `registration.status.notPending`; then, on deny, a
  `reason` present and not a string → 422 `registration.reason.invalid`, trimmed, blank or `null` → none, over 500
  characters → 422 `user.denialReason.max.length` (the entity's rule). Approve changes only `status`; deny sets
  `status`, `denialReason` and `deniedAt` (the `ClockProvider`'s now). Decisions are written with
  `UserRepository.updateIfPending(user)` — Prisma `updateMany({ where: { id, status: 'pending' } })`, `true` when
  a row changed — never `update()`, which is unconditional: of two concurrent decisions exactly one wins and the
  other gets the 409. `UserRepository.findPending()` reads the list. A decision re-validates the whole user, so a
  stored row the current entity rules reject can't be decided.
- Boundary: only `apps/backend/src/shared/auth` and the auth adapters know about tokens; use cases receive a
  plain current-user value and enforce permissions.
- Variables (names in `apps/backend/.env.example`, values never committed): `JWT_SECRET`, `JWT_EXPIRES_IN`
  (`15m`), `AUTH_CODE_PEPPER` (required: the backend refuses to start without it),
  `REFRESH_TOKEN_EXPIRES_IN_DAYS` (default 30), `REVIEW_ACCOUNTS`, `RESEND_API_KEY`, `EMAIL_FROM`,
  `GOOGLE_WEB_CLIENT_ID` (the audience of Google ID tokens; required in production — the backend refuses to
  start without it — optional elsewhere). They are read and validated in
  `apps/backend/src/modules/auth/auth.config.ts` (`AuthConfig`) and the providers. The Apple client id comes
  with its sign-in spec. The app reads `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
  (`apps/mobile/.env.example`; not secret).
- Mobile session: the session logic lives in a plain, React-free module store in
  `apps/mobile/src/services/session/` (`session.store.ts`: `{ session, restoring, expired }`, a sign-out
  generation counter and the single in-flight refresh promise; `session.storage.ts`: the two SecureStore keys;
  `session.refresh.ts`; `session.restore.ts`). Reason: the one-refresh-at-a-time lock must be shared by every
  caller, the API client included. `SessionProvider` / `useSession` (`apps/mobile/src/providers/session/`) read
  it with `useSyncExternalStore` and expose `user` — `{ id, name, email, role, status, createdAt,
  whatsappNumber, whatsappVisible, rulesAccepted, rulesAcceptedBefore, denialReason, reactivationStatus }`
  (`createdAt` an ISO 8601 string in UTC; `denialReason` and `reactivationStatus` plain strings or `null`, as the
  backend sends them) or `null` —, `tokens` — `{ accessToken, accessTokenExpiresAt, refreshToken,
  refreshTokenExpiresAt }` or `null` —, `isRestoring`, `setSession({ user, tokens })`, `updateUser(user)` (an
  answer that carries the account) and `clearSession()`. The Confirm email screen sets it from the verify
  response, and the sign-in and "Your name" screens from the `POST /auth/google` response. Every change is
  written to SecureStore; a read or parse that throws, or only one key present, counts as no session and both
  keys are deleted (an Android backup restored to a new Keystore can't be decrypted).
  - Launch restore (`restoreSession()`, started once by `SessionProvider`): with a stored session it calls
    `GET /auth/me` (authenticated, `timeoutMs: 8000`, including the refresh it may need) while the native
    splash screen stays up — `SplashGate` (`src/navigation/splash-gate/`, rendered by the root layout inside
    `SessionProvider`) hides it and renders `RootNavigator` only once the fonts are ready and `isRestoring` is
    `false`. 200 → the returned account; no answer, timeout, 5xx or 429 → the stored session as it was (routed
    by the stored account; every backend request reloads role and status anyway); refused refresh → expired.
  - Renewal: before each authenticated request, an access token less than **60 s** from expiry (or past it) is
    renewed first (no timer: timers don't run in the background and would hit the refresh throttle); a request
    answered 401 `auth.token.invalid` triggers one refresh and one retry, and a second 401 expires the session.
    One refresh at a time: every caller that needs one awaits the same promise (the backend's reuse detection
    would revoke the whole sign-in otherwise). A successful refresh stores the new tokens **and** the returned
    account, so routing follows the account's current state.
  - Only a refresh answered with a 4xx other than 429 expires the session; no answer, a timeout, a 5xx or a 429
    keeps the session and stored tokens and throws `NetworkError`. Expiry clears memory and both keys, sets the
    `expired` notice and throws `SessionExpiredError`. `useSessionExpired`
    (`modules/auth/hooks/use-session-expired.hook.ts`, mounted in `RootNavigator`) consumes the notice: the toast
    `session.expired` ("Your session expired. Sign in again."), the TanStack Query cache cleared,
    `GoogleSignin.signOut()` unawaited; no `POST /auth/sign-out`. The notice stays set until consumed, so an
    expiry during launch is shown once the navigator mounts. Protected hooks ignore `SessionExpiredError` in
    their error handling and never handle 401 themselves.
  - The app routes by account state before any private screen renders (see Mobile flows). On iOS the Keychain
    survives uninstalling the app, so a reinstall can restore a still-valid session.
- Mobile sign-out: `useSignOut` (`apps/mobile/src/modules/auth/hooks/use-sign-out.hook.ts`) is local first —
  it calls the store's `signOut()`, which clears the session and both stored keys at once and bumps the
  generation counter, and clears the TanStack Query cache; then, without the UI waiting, `signOut()` awaits a
  refresh in flight and sends `POST /auth/sign-out` with the newest refresh token (the one that refresh
  produced, else the current one), ignoring any failure (no request when there are no tokens). A refresh that
  finishes after a sign-out never writes the session back. It also calls
  `GoogleSignin.signOut()` without awaiting it and ignores its failure, so the next Google sign-in shows the
  account picker. No `router` call: the
  flow guards send a session-less app to `/auth`. Reason: signing out always works, offline included, and the
  backend answers 204 for any token. The Pending screen and the closed-account screens ("Use another email")
  offer it. An expired session is handled once, centrally (see Mobile session).
- Mobile Google sign-in: `src/services/google-sign-in.ts` calls `GoogleSignin.configure({ webClientId,
  iosClientId })` once at module load and re-exports `GoogleSignin`, `statusCodes` and `isErrorWithCode`; import
  the library only from there. `useGoogleSignIn` (`modules/auth/hooks/`) runs `hasPlayServices()` (Android only)
  and `signIn()`, sends the ID token with `useSignInWithGoogle` (a mutation on `POST /auth/google`), puts a 200
  answer in the session, and on a 422 `user.name.*` opens "Your name" (`routes.auth.googleName({ idToken, name })`,
  route `/auth/google-name`; the token and Google's name travel only as route params); a ref ignores a second tap
  while one runs. Errors map to toasts in `modules/auth/utils/google-sign-in-error.ts`: a `cancelled` answer,
  `SIGN_IN_CANCELLED` and `IN_PROGRESS` show nothing, `PLAY_SERVICES_NOT_AVAILABLE` → `googleSignIn.playServices`,
  `NetworkError` → no connection, the two 401 keys → their own toasts, anything else → generic. On "Your name" a
  401 `auth.google.tokenInvalid` also `router.replace`s to `/auth`, since only a new Google sign-in gets a new
  token. The name rules shared by Create account and "Your name" are `nameRules()` in
  `modules/auth/utils/field-validation.ts`, the same as `User.validate()`.
- Mobile closed-account calls: the Denied and Access removed screens read the school's number with a query on
  `GET /school-settings` (`useSchoolWhatsapp` in `modules/offboarding/hooks`, authenticated, no retry);
  the "Contact the school" button renders only with a non-null number and opens `https://wa.me/<digits>` with
  `Linking.openURL` (a toast when it rejects) — loading, an error and `null` all hide it, because the contact is
  an extra. The Account deleted screen picks its state from the session's `reactivationStatus` (`null` → not
  requested, `"requested"`, `"denied"`); `useRequestReactivation` (`modules/reactivation/hooks`) is a mutation
  on `POST /auth/me/reactivation-request` that puts the answer in the session (`updateUser`) on 200, sets
  `reactivationStatus: "denied"` on 409 `user.reactivation.denied`, and signs out with a toast on 403
  `user.status.notDeleted`, so every answer leaves the screen matching the account.
- Mobile admin calls (`modules/admin`): one query `["registrations"]` (`useRegistrations`, authenticated
  `GET /registrations`, no retry) feeds both the admin home's pending count and the "Join the school" screen.
  `useApproveRegistration` / `useDenyRegistration` are mutations without retry (deny sends `{}` for a blank
  reason); on 200 `removeRegistration` (`utils/registrations-cache.ts`) takes the item out of the cached list at
  once and invalidates the query, and a 409 `registration.status.notPending` invalidates it too. The mutations
  show nothing: the screen's hook (`useRegistrationsScreen`) calls `mutateAsync` and maps errors with
  `getRegistrationErrorKey` (`utils/registration-error.ts`: the 409 → `registrations.alreadyDecided`,
  `NetworkError` → no connection, `SessionExpiredError` → nothing, else generic), because it also keeps
  "Decided just now" in screen state (only for the visit; nothing on a 409), guards double taps per card with a
  ref, and closes the deny sheet only for the registration that was decided or found already decided — a
  failure keeps the sheet and its reason.
- Review accounts: seeded, pre-approved, one per role, each with a fixed code accepted only for its own email.
  `REVIEW_ACCOUNTS` is a JSON array of `{ "email", "code", "role", "name" }` (6-digit code; role `student` |
  `instructor` | `admin`), read by `AuthConfig` and by the seed through the same parser (`parseReviewAccounts`);
  a malformed value stops the backend at startup. Requesting a code for a review email stores the hash of its
  fixed code and sends no email; the cooldown and the lockout apply as for anyone.

## Error handling

- The domain throws `DomainError` subclasses (`ValidationException` 422 with a list of `ValidationError`s,
  `NotFoundError`, `UnauthorizedError`, …) whose messages are translation keys (see Fixed conventions).
- The global `ApiExceptionFilter` (from `backend-nest-config`) turns every error into
  `{ statusCode, errors: string[], message?, details?, path?, timestamp }`, with `errors` holding the keys and
  `details` the `DomainError.details` object (e.g. `resendAvailableAt` on a 429), so the app can show data
  such as a countdown.
  Unexpected errors become 500 with `INTERNAL_SERVER_ERROR` and are logged.
- The mobile app translates the first key of `errors` and shows it in a toast (code errors on the Confirm email
  screen go inline, see Mobile shared UI); unknown keys (and
  `NetworkError`) fall back to a generic or no-connection message. Each feature maps the keys its route can
  answer (e.g. `modules/auth/utils/sign-in-code-error.ts`).

## External integrations

Every provider sits behind a port in the domain (`*.provider.ts`); its implementation lives in the backend
module that uses it. Variable names are added to `apps/backend/.env.example` by the spec that introduces the
provider; real keys are never committed. The privacy policy page (`apps/web`, spec 022) names the providers
already chosen (Google, Apple, Resend, Expo) and describes the others by category, so a spec that chooses a
provider (hosting, language model, photo storage), changes a retention period or adds a kind of data also
updates the policy's legal bases and retention list (spec 023) in the three web dictionaries.

### Push notifications

- **Expo Push** (`expo-notifications` on the phone, see Applications; the backend sends through
  **`expo-server-sdk`** 7). Every notification is stored first (`Notify` in `modules/notifications`), then pushed
  to every device of its user; the future push setting will only control the push. The port is `PushProvider`
  (`modules/notifications/src/notification/provider/push.provider.ts`: `send(messages)` → tickets in the order
  of the messages, `getReceipts(ids)` → receipts by ticket id), implemented by `ExpoPushProvider`
  (`apps/backend/src/modules/notifications/expo.push.ts`): `chunkPushNotifications` +
  `sendPushNotificationsAsync`, messages with `sound: "default"`, `priority: "high"`, `channelId: "default"` and
  `data: { type, notificationId }`, title and body from `renderPush` in the device's locale. A chunk that throws
  doesn't stop the others; its error is rethrown at the end (so the caller stores no tickets for that send) and
  logged by the notifier. Variable: `EXPO_ACCESS_TOKEN` (optional; sent only when set, needed only with Expo's
  enhanced push security).
- Tokens (`push_tokens`, key `token`, one row per device, many per user): `PUT /notifications/push-token`
  (protected, body `{ token, locale }`, 204) upserts the token for the caller with its locale, moving a token
  another account held. Order: status not `pending` / `approved` → 403 `pushToken.status.notAllowed`; then
  `token` not matching `^Expo(nent)?PushToken\[[^\]]+\]$` → 422 `pushToken.token.invalid` and `locale` not
  `pt-BR` / `es` / `en` → 422 `pushToken.locale.invalid`, listed together. A token is deleted on sign-out (see
  Authentication) and when Expo reports `DeviceNotRegistered` in a ticket or a receipt — never when a session
  expires, the account changes status, or by age.
- Tickets and receipts: every `ok` ticket is stored in `push_tickets` (`id` = Expo ticket id, `token`, no foreign
  key); `PushReceiptCheckJob` runs `CheckPushReceipts` every minute — tickets 15 minutes old or more are asked
  about (`getPushNotificationReceiptsAsync` in chunks of up to 1000 ids), the token of each `DeviceNotRegistered`
  receipt is deleted and every asked ticket is deleted, receipt found or not; tickets older than 24 hours are
  deleted without asking.

### Email (sign-in codes)

- The only email the app sends. **Resend** (`resend` SDK), behind the `EmailProvider` port in
  `modules/auth`, implemented by `ResendEmailProvider` (`apps/backend/src/modules/auth/resend.email.ts`):
  `emails.send(payload, { idempotencyKey })` returns `{ data, error }` and never throws, so the provider rejects
  on `error`. Variables: `RESEND_API_KEY`, `EMAIL_FROM` (an address on the verified domain; required with a
  key). Without `RESEND_API_KEY` outside production, codes are logged instead of sent (local development); in
  production the backend refuses to start without it.

### Google sign-in

- **Google Identity** (OAuth clients in Google Cloud: Web, iOS and Android debug; consent screen in Testing).
  The phone gets an ID token with `@react-native-google-signin/google-signin`; the backend verifies it with
  `google-auth-library` behind the `GoogleIdTokenProvider` port (see Authentication). Variables:
  `GOOGLE_WEB_CLIENT_ID` (backend), `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
  (mobile). Tests never call Google: the backend e2e suite overrides `GoogleAuthIdTokenProvider` with a fake
  (`overrideProvider`), and the mobile tests mock the library in `apps/mobile/jest.setup.ts`. Android is
  configured (debug SHA-1) but not yet checked on an emulator.

### Language model (cancellation deadlines)

- Provider and model **chosen by the cancellation-rule spec**, behind a domain port. Fixed by the product:
  only the rule text and the class's details are sent, never personal data; the model describes the
  deadline and the backend computes the exact date itself, retrying when the answer can't be used.

### Photo storage

- **S3-compatible object storage** with presigned upload and download URLs, so files never pass through the
  backend. Provider **chosen by the class-photos spec**.

### Maps and address suggestions

- **Google Maps Platform** (Places Autocomplete; `react-native-maps` on the phone). Keys and setup **decided
  by the class-locations spec**.

### Scheduled work

- **`@nestjs/schedule`** in the backend (`ScheduleModule.forRoot()` in `AppModule`; today three jobs,
  `SignInCodeCleanupJob`, `PushReceiptCheckJob` (spec 020) and `AccountErasureJob` (spec 021, cron
  `account-erasure`, erases denied registrations; the deleted/removed erasures are to be added to it)): one job per kind of timed event (expired sign-in codes, pending enrolments expiring at the
  class start, 30-minute reminders, rating prompts, 30-day erasures of denied/deleted/removed accounts, guest
  data erasure, cancellation-deadline retries), each running every minute and **idempotent** — it records in
  the database what it already did, so a restart or a late tick never sends twice.
  An erasure is idempotent by the deletion itself: the erased row's absence is the record, and a second tick finds
  nothing (no marker table). Jobs catch and log every error and never throw; an erasure job logs only the count,
  never an email, name or id.
- Assumes **one backend instance**; running several needs a lock or a queue first (a decision for the spec
  that scales out).

## Deployment

- Not decided: where the backend, database and web pages run, and how secrets are managed, are **decided by
  the first spec that deploys**. Mobile releases go through the App Store and Google Play.

## Automated validation

Business rules are proven by **unit tests**: the domain (`modules/*`, `packages/shared`) with Jest, the
backend's adapters with Vitest. The API is proven end to end by the backend's **Vitest + supertest e2e
suite** against a real Postgres. The mobile app gets **Jest (`jest-expo`) + React Native Testing Library**
tests for screens and components from its first spec. The `.integration.http` files are manual aids, not
evidence.

There is **no automated end-to-end test of the mobile app**: user journeys are verified by driving the app in
the **iOS simulator** (and Android emulator when a spec is platform-specific — e.g. Apple sign-in is iOS only).
The public web pages have a **Playwright** suite (spec 025); what it doesn't cover is checked in a browser. A
Maestro suite for mobile would be a spec of its own.

- Tests, per workspace: **Jest** in `modules/*` and `packages/shared` (`npm test --workspace <name>`),
  **Vitest** in `apps/backend` (`npm test` unit, `npm run test:e2e` e2e), **Jest via `jest-expo`** in
  `apps/mobile` (`npm test --workspace @rochas-surf-school/mobile`), **Vitest + React Testing Library + jsdom** in
  `apps/web` (`npm test --workspace @rochas-surf-school/web`; `vitest.config.ts` passes
  `--no-experimental-webstorage` to the workers, because Node's experimental global `localStorage` shadows
  jsdom's). Specs run only the tests related to their change, with
  `.specs/scripts/run-related-tests.mjs`.
- Mobile test setup: `apps/mobile/jest.setup.ts` mocks the native pieces — among them `expo-secure-store` as
  `jest.fn`s over an in-memory `Map`, reset between tests — and calls `resetSessionStore()` before every test,
  since the session store is module state. It also mocks `expo-notifications` (permissions, token, listeners and
  `getLastNotificationResponse` as `jest.fn`s), `expo-device` (`isDevice: true`) and `expo-constants` (an EAS
  `projectId`), so tests drive push behavior through those mocks. Tests that need a signed-in app seed the real store
  (`hydrateSession`) with an access token far in the future, since one close to expiry triggers a refresh;
  `fetch` is mocked per test.
- End-to-end, per app: the suite below. It needs a Postgres reachable through `DATABASE_*` with the
  migrations applied (locally: `npm run db:start --workspace apps/backend`, then
  `npm run prisma:migrate:deploy --workspace apps/backend`; in CI the `backend` job provides both). The web
  suite is **Playwright** (Chromium) in `apps/web/e2e/*.e2e.ts`: its `webServer` runs `next build && next start`
  on port 3100 (reusing a running server outside CI) and needs `apps/web/.env` with the build-time values; it
  checks every page in the three languages, the language redirect, the theme toggle and the language picker.
  Chromium ignores `Accept-Language` in `extraHTTPHeaders`, so the redirect tests set the Playwright `locale`.
  `.specs/scripts/run-e2e.mjs` runs the suites of the apps a spec touches, `spec-plan` puts it in every
  Verification Plan, and `spec-review` runs it instead of driving the app for what the suite covers. The e2e files run one at a time (`fileParallelism: false` in
  `apps/backend/vitest.config.e2e.ts`) because they share the single `rules_versions` row; each suite that
  changes it resets it to 0 (and deletes the school rules) after every test. The suites never call Expo:
  `notifications.e2e-spec.ts` overrides `ExpoPushProvider` with a fake that records the messages and returns
  configurable tickets (`overrideProvider`).

```e2e
apps/backend: npm run test:e2e --workspace apps/backend   # the API (Nest app + Prisma) against Postgres via DATABASE_*, migrations applied
apps/web: npm run test:e2e --workspace apps/web           # the public pages (Playwright, Chromium) against the built app on port 3100
```

### Continuous integration

`.github/workflows/ci.yml` (spec 025) runs on every pull request into `main` and every push to `main`, one run
per ref (a newer one cancels the older). It runs **tests only** — lint, type check and build are not gates.

- `changes` runs `.github/scripts/affected.mjs`: it compares `HEAD` with the base (the pull request's
  `origin/<base>`, or the push's `before` commit; `--base` or `TURBO_SCM_BASE` override it), asks
  `turbo ls --affected` which workspaces changed or depend on a changed one, and outputs `backend`, `web`,
  `mobile`, `domain` (any affected `modules/*` / `packages/*` with a `test` script), `all` and `base`. A change
  under `.github/` or to the root `package.json`, `package-lock.json` or `turbo.json` runs everything; a change
  only under `.specs/` or `.docs/` runs nothing; no resolvable base runs everything; `turbo` failing fails the
  job. The mapping is pure and tested with `node --test ".github/scripts/*.test.mjs"`.
- `backend` (Postgres 18 service; migrations; `turbo run test` then `test:e2e`), `web` (Chromium install;
  Vitest then Playwright, `CI=true`), `mobile` (Jest) and `domain` (`turbo run test --affected` over
  `./modules/*` and `./packages/*` with `TURBO_SCM_BASE` set to the `changes` base — `actions/checkout` leaves no
  local base branch for Turbo to infer — or every domain suite when `all`) each run only when needed.
- Every job checks out the full history (`fetch-depth: 0`, which `--affected` needs), uses Node 24 with the npm
  cache and `npm ci`. CI copies `apps/backend/.env.example` and `apps/web/.env.example` to `.env`; the backend
  job's `DATABASE_*` point at the service. No GitHub secrets: the suites fake every external provider.
- `ci` always runs and fails when any job ended `failure` or `cancelled` (skipped passes). It is the one check
  to require in branch protection, which is configured in GitHub by hand.

### Coverage

Every line a spec adds or changes must be **covered**: the statements, branches and functions on it, and the
line itself — a new file counts in full. `.specs/scripts/check-coverage.mjs` enforces it on the spec's change
set, from the reports `run-related-tests.mjs` writes (`coverage/coverage-final.json` or `coverage/lcov.info`).
Jest workspaces write `coverage/` with `--coverage`; the backend uses `@vitest/coverage-v8`. The mobile app writes
`coverage/` with Jest's `--coverage`.

One branch never counts: the `typeof X === "undefined" ? Object : X` conditional that the Vitest transform
emits for `design:paramtypes` decorator metadata of a decorated class with constructor injection (every Nest
provider, guard and job); v8 reports it on the class decorator line. No test can reach it, so
`.specs/scripts/check-coverage.mjs` skips a one-line `cond-expr` branch on a class decorator or class declaration
line
(`.specs/scripts/lib/decorator-metadata.mjs`, tested with `node --test .specs/scripts/lib/decorator-metadata.test.mjs`);
every other branch on that line still counts. Decided with the user in spec 001.

Files that can't be meaningfully unit-tested are listed below, each with its reason — nothing else is
excluded. Tests, type declarations, type-only files and tool configuration are always excluded.

```coverage-exclude
apps/backend/src/main.ts                  # bootstrap only; exercised by the e2e suite
apps/backend/src/**/*.module.ts           # Nest wiring (imports/providers lists); exercised by the e2e suite
apps/backend/src/generated/**             # Prisma client, generated
apps/backend/prisma/seed/main.ts          # seed runner; the seed tasks themselves are tested
apps/mobile/jest.setup.ts                 # test setup (native mocks); loaded by Jest before every test, not as source
apps/mobile/src/app/**                    # Expo Router routes that only render a screen; screens are tested
apps/web/src/**                           # static public content pages; covered by the Playwright suite, unit-tested only in part (full coverage is a follow-up spec)
apps/web/vitest.setup.ts                  # test setup (matchers, cleanup); loaded by Vitest before every test, not as source
.github/scripts/affected.mjs              # CI helper; its logic is tested with `node --test` (affected.test.mjs), which the coverage tooling doesn't measure
packages/design-tokens/**                 # token data and the CSS generator, verified by its check-types (--check)
modules/*/src/**/index.ts                 # re-export barrels
packages/shared/src/**/index.ts           # re-export barrels
```
