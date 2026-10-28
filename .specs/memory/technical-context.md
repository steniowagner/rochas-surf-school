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
  - Device preferences (spec 026): theme, language and phone pushes belong to the phone, not the account, and
    survive signing out. `src/services/preferences/preferences.storage.ts` reads them with the synchronous
    `SecureStore.getItem` (no frame in the wrong theme or language) and writes them on every change, under
    `prefs.theme` (`"system"` | `"light"` | `"dark"`, absent → `"system"`), `prefs.locale` (`"en-US"` | `"es-ES"`
    | `"pt-BR"`, absent → the phone's language) and `prefs.pushEnabled` (`"true"` | `"false"`, absent → on); an
    unreadable or unknown value counts as absent. `theme-preference.ts` applies the theme app-wide with
    `Appearance.setColorScheme` (`"system"` → `"unspecified"`, back to the OS), so `useColorScheme()` follows the
    choice: `applyStoredThemePreference()` runs in the root layout before the first render, and
    `useThemePreference()` (`useSyncExternalStore`) gives `{ theme, setTheme }`. `src/i18n/index.ts` starts from
    the stored locale, else the phone's.
  - Web pages: **`expo-web-browser`** `openBrowserAsync` opens the privacy policy, the terms of use and the About
    links in the in-app browser (`useOpenUrl` in `src/modules/profile/hooks/`, generic toast on a rejected open).
    The site's address is `EXPO_PUBLIC_WEB_URL` (`apps/mobile/.env.example`: `http://localhost:3000`; a trailing
    `/` is dropped); `getWebPageUrl` (`src/modules/profile/utils/web-pages.ts`) builds
    `{EXPO_PUBLIC_WEB_URL}/{pt-br|es|en}/{privacy-policy|terms-of-use}` from the app language, and without the
    variable the Profile hides both rows.
  - Tab bars: Expo Router's native tabs (`NativeTabs` from `expo-router/unstable-native-tabs`), drawn by the
    system, through the shared `RoleTabs` (`src/components/role-tabs/`: selected `sun`, unselected `ink-3`, bar
    `page`, from `useTheme()`; label key, SF Symbol and Material icon per tab). iOS 26+ draws unselected labels
    and icons in its own color, whatever `ink-3` says.
  - Sign-in: `@react-native-google-signin/google-signin` 16 (Google; in use since spec 017, its config plugin in
    `app.json` carries the iOS URL scheme) and `expo-apple-authentication` (Apple, iOS only; not installed yet,
    it comes with the Apple spec).
  - Server data: **TanStack Query 5** — every screen fetches, caches, retries and invalidates the same way.
    One `QueryClient` in the root layout, mutations without retry. Requests go through the `fetch` client in
    `src/services/api/` (`apiGet`, `apiPost`, `apiPut`, `apiDelete`): it builds the URL from `EXPO_PUBLIC_API_URL`, sends
    JSON for POST, PUT and DELETE (a DELETE takes a body; a GET has no body and no Content-Type), and throws `ApiError` (`status`, `errors`,
    `details`; empty `errors` when the body isn't JSON) on a non-2xx answer or `NetworkError` when no answer
    arrives. Options on all four: `{ authenticated: true }` sends the session's access token (renewed first
    when needed, see Mobile session) — callers never read or pass tokens; `timeoutMs` aborts the request with an
    `AbortController` and throws `NetworkError` (no timeout unless asked). `SessionExpiredError` means the
    backend refused to renew the session. The bare HTTP call is `rawRequest` in `api.request.ts` (no session
    logic), which the client and the session store share so they don't import each other. A paginated list is one
    `useInfiniteQuery` per filter combination (key `[<list>, filters]`), the next page while `page * perPage <
    total`, rows repeated across pages dropped by `id`, no retry (spec 027: `usePeople`).
  - Phone numbers: **`libphonenumber-js`** (default metadata) turns what the person typed and the chosen
    country into E.164 and lists the countries with their dial codes; **`i18n-iso-countries`** gives their
    names in en, es and pt, following the app language. Both run under Jest without a transform. With Brazil
    selected, the WhatsApp field keeps only the digits (`toBrazilianDigits`: non-digits dropped, a leading `55`
    dropped when there are more than 11 digits, capped at 11) and shows them masked as `(XX) XXXX-XXXX` or
    `(XX) XXXXX-XXXX` (`formatBrazilianPhone`, `src/utils/brazilian-phone.ts`, a pure function
    rather than `AsYouType`); E.164 is built from those same digits. Other countries keep the typed text. The
    country list is `src/utils/countries.ts`.
  - Translations: **i18next** + `react-i18next`, with `expo-localization` for the phone's language
    (pt-BR fallback).
  - Push: **`expo-notifications`** 57 (config plugin in `app.json` with `defaultChannel: "default"`; since spec
    020), with `expo-device` and `expo-constants`. `src/services/push/push.service.ts` sets the foreground
    handler at module load (banner, list and sound, no badge), creates the Android channel `default` (importance
    high), and `getPushToken()` returns the Expo push token or `null` — not a physical device, no EAS
    `projectId` (`Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId`), permission not
    granted, or the token call throwing; the OS dialog is asked only while the permission is `undetermined`, and
    never with `getPushToken({ askPermission: false })`; `isPushPermissionDenied()` reads a refusal. It
    also keeps the token this session registered (`get/set/clearRegisteredPushToken`, module state). Hooks in
    `src/modules/notifications/hooks/`, all mounted in `RootNavigator`: `usePushRegistration` (`PUT
    /notifications/push-token` with `{ token, locale }` for a `pending` or `approved` user, whenever the user id,
    its status or the i18n language changes; silent on any failure — while `prefs.pushEnabled` is off it sends
    nothing of the kind and calls `unregisterPushToken()` instead, so a failed DELETE heals at the next launch or
    sign-in), `useNotificationResponse` (a tap — the
    launch response once the session is restored, then the listener; deduplicated by `notificationId`: with a
    session and a string `data.notificationId` it first sends `POST /notifications/<id>/read`, not awaited, failures
    ignored (spec 055); refreshes the account with `refreshAccount()`, then routes to
    `notificationTarget(type, classId, flow)` (`src/modules/notifications/utils/notification-target.ts`, an href or
    `null`, shared with the notifications screen since spec 055): `router.push(routes.admin.registrations)` for a
    `registration.pending` push when the account resolves to the `admin` flow, `router.push(routes.instructor.classes)`
    / `router.push(routes.admin.classes)` for a `class.assigned`, `class.deleted` or `location.changed` push when it
    resolves to the `instructor` / `admin` flow (specs 030, 034, 037), `router.push(routes.instructor.classDetail(classId))` / `router.push(routes.admin.classDetail(classId))`
    for a `class.edited` / `class.unassigned` / `class.cancelled` / `class.reminder` / `class.message` push with a
    string `data.classId` (specs 032, 033, 054, 069), `router.push(routes.admin.classDetail(classId))` for a `class.noInstructor` push with a string
    `data.classId` when it resolves to the `admin` flow (spec 035), `router.push(routes.student.classDetail(classId))`
    for an `enrolment.expired` / `enrolment.approved` / `enrolment.denied` / `enrolment.enrolled` /
    `enrolment.takenOut` / `class.cancelled` / `class.edited` / `class.reminder` / `class.message` push in the
    `student` flow (specs 041, 042, 044, 047, 054, 069),
    `router.push(routes.student.home)` for a `location.changed` push in the `student` flow (spec 047), `router.push(routes.instructor.classDetail(classId))` for an `enrolment.requested` push in
    the `instructor` flow and `router.push(routes.admin.classRequests)` for one in the `admin` flow, with or without a
    class id (spec 042), `router.push(routes.instructor.classDetail(classId))` /
    `router.push(routes.admin.classDetail(classId))` for an `enrolment.cancelled` push with a string `data.classId`
    in the `instructor` / `admin` flow (spec 043), else (`null`)
    `router.replace(routes.home)` (`"/"`), so `resolveFlow` alone decides access) and
    `useNotificationReceived` (a push with the app open: every push invalidates `["notifications", "list"]` and
    `["notifications", "unread-count"]` (spec 055), then `registration.approved` / `.denied` refresh the account,
    `registration.pending` invalidates `["registrations"]`, `class.assigned` invalidates `["classes", "week"]`,
    `class.edited` / `class.unassigned` / `class.cancelled` / `class.deleted` / `class.noInstructor` invalidate
    `["classes"]` (weeks and details), `location.changed` invalidates `["classes"]` and `["locations"]` (spec 037; for every role, students included),
    the seven enrolment pushes invalidate `["classes"]` and `enrolment.requested` / `enrolment.cancelled` also
    `["enrolments", "pending"]` (specs 041–044); `class.reminder` invalidates nothing else (spec 054); no navigation). `refreshAccount()` (`src/modules/notifications/utils/`) is `GET
    /auth/me` → `updateUser`, `null` on failure, rethrowing only `SessionExpiredError`. The app → backend locale
    mapping (`en` / `es` / `pt-BR`) is `toBackendLocale` in `src/i18n/backend-locale.ts`, shared by the sign-in
    email and push registration. The Profile's push switch is `usePushPreference` (same folder): off → store
    `false` and `unregisterPushToken()` (`src/modules/notifications/utils/`: the token without asking for the
    permission, `DELETE /notifications/push-token` `{ token }`, any failure ignored, then
    `clearRegisteredPushToken()`); on → store `true` and register at once (the OS dialog shows while
    undetermined); a refused permission stores `false` again and shows the `profile.pushDenied` toast. Only removing
    the token stops pushes: the OS shows background pushes without asking the app. Pushes need the EAS `projectId` in `app.json` (`eas init`) and the APNs key /
    FCM service account (`eas credentials`) plus a native rebuild — not set up yet, so the app registers nothing
    until then.
  - Notifications screen (spec 055): `NotificationsScreen` (`src/modules/notifications/screens/`) is the route
    `notifications` of each role's Stack, outside `(tabs)` (`routes.<role>.notifications`, `/<role>/notifications`),
    with `headerTitle` and, while rows show and the unread count is above 0, a `headerRight` `HeaderButton`
    (`checkmark-done-outline`) for "mark all". Hooks in `src/modules/notifications/hooks/`: `useNotifications`
    (`useInfiniteQuery` `["notifications", "list"]` — no locale in the key —, `GET
    /notifications?page&perPage=20&locale=<toBackendLocale>`, rows repeated across pages dropped by `id`),
    `useUnreadNotificationsCount` (`["notifications", "unread-count"]`, `count` 0 while unknown or failed),
    `useMarkNotificationRead` (optimistic: the row read and the cached count down by one; silent on failure) and
    `useMarkAllNotificationsRead` (optimistic: every row read and the count 0; the snapshot back on failure, and
    the screen toasts unless the session expired); both invalidate the count when settled. Keys, page size and
    `markReadInPages` live in `utils/notifications-cache.ts`, the per-type glyph and tone in
    `utils/notification-icon.ts`. Pull to refresh trims the cache to page 1 before refetching. The home bell
    (`UserHeader`, `src/components/user-header/`) pushes the signed-in role's route and shows
    `useUnreadNotificationsCount`, refetched by `useFocusEffect` (`cancelRefetch: false`); `HeaderButton`'s badge
    reads "9+" above 9 (`MAX_BADGE_COUNT`).
  - Dates: `date-fns` 4 + `@date-fns/tz`, always displayed in `America/Fortaleza` (`format(…, { in: tz("America/Fortaleza") })`);
    relative times use date-fns locales `ptBR` / `es` / `enUS`, picked from the i18n language. The general
    `YYYY-MM-DD` helpers live in `src/utils/calendar-dates.ts` (spec 031; `CalendarMonth` in
    `calendar-dates.types.ts`): the date-fns locale of the app language, months and ISO weekdays, adding days, weeks
    and months (`addMonthsKeepingDay`), the Monday and the seven days of a week, the month grids (`buildMonthGrid`
    for Nova aula, `buildFittedMonthGrid` and `monthRange` for only the weeks a month needs, `monthPeriod` for its
    1st to its last day — spec 053), the captions (`weekCaption` "12 – 18 OCT" / "28 SEP – 4 OCT", `monthCaption`
    "OCTOBER 2026", `dayAndMonth` "18 OCT", upper-cased, a trailing "." dropped from month abbreviations), weekday names, abbreviations and initials, and a day's accessibility label.
    The class calendar (spec 028) is a custom component built from the tokens (Monday first, month names and weekday
    initials from the date-fns locale); "today" and the current minutes are computed in Fortaleza
    (`src/modules/classes/utils/calendar.ts`, with the date-range helpers). Since spec 029 it marks a range as a band (`bg-grape-tint`, the
    `grapeTint` token, light and dark) and has no weekday filter: once a range is complete, pressing one of its
    ends clears it, pressing a day between them removes it (struck through) or puts it back, and pressing a day
    outside starts a new range with nothing removed (`pressDay`); `DateRangeSummary` lists the removed days
    ("Dias removidos" / "Nenhum dia removido" and how to remove one). The classes' own week helpers (spec 030) are
    `src/modules/classes/utils/week.ts`: the Fortaleza day and `HH:mm` of an instant, and the class's date line
    (Hoje / Amanhã / Ontem, else the weekday, plus the year when it isn't the current one).
  - Time pickers: **`@expo/ui`** 57's `DateTimePicker` (`@expo/ui/community/datetime-picker`, native wheels in
    time mode; spec 028's "Novo horário" sheet). No other native picker is installed. Inside a `BottomModal`,
    a picker needs `contentPanningEnabled={false}` so the sheet's content pan doesn't take the drag.
  - Maps (spec 037): **`react-native-maps`** 1.27 — Apple Maps on iOS (no key), Google Maps on Android
    (`PROVIDER_GOOGLE`, `getMapProvider()` in `src/modules/classes/utils/map.ts`). Its config plugin is added by
    `apps/mobile/app.config.ts`, which takes the `app.json` config Expo passes in (still the source of everything
    else) and appends `["react-native-maps", { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY }]`
    (`apps/mobile/.env`, empty in `.env.example`); `app.config.test.ts` checks it, and `jest.config.js`'s
    `testMatch` also covers that root file. A map inside a `BottomModal` needs `contentPanningEnabled={false}`,
    like a picker. Directions open the phone's maps app with `Linking.openURL` (`getDirectionsUrl`: Apple Maps on
    iOS, Google Maps on Android), no extra library. Only Google Maps reports taps on its labelled places
    (`onPoiClick`), so place taps exist on Android only. `mapPadding` is measured differently: Apple Maps from the
    map's safe area (which already holds a transparent header and the home indicator), Google Maps from the map's
    edges; neither recentres a camera already placed when the padding changes, and Google Maps crashes on a padding
    given before `onMapReady` (spec 065). A zoom that must not depend on the map's size (the Android keyboard shrinks
    it) uses `setCamera` with `zoom` (Google) and `altitude` (Apple), not a region span.
  - Device location (spec 065): **`expo-location`** 57, its config plugin in `app.json` with the
    `locationWhenInUsePermission` text. The foreground permission is asked only when the admin taps "Minha
    localização" (never at launch); the position is read with `Accuracy.Balanced` and `mayShowUserSettingsDialog:
    false` (declining Google's accuracy prompt left the read pending forever); `reverseGeocodeAsync` gives a tapped
    point's address on the phone, free and with no backend call.
  - Business rules from a module: the app depends on **`@rochas-surf-school/classes`** (spec 028) and imports
    its batch expansion (`listBatchClasses` / `listBatchDates`), time-range checks, limits and `getClassState`
    (spec 030), so the "Criar N aulas" count is exactly what the backend creates and a class's state has the same
    boundaries everywhere — the same reason forms use the shared `Validator` rules.
    Metro reads the module's built `dist/`, like `packages/shared`.
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
  providers' SDKs behind domain ports (`resend` 6 for email, `expo-server-sdk` 7 for pushes, `@anthropic-ai/sdk`
  0.135 with `zod` 4 for the language model; see External integrations).
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
  `modules/school-rules`, `modules/school-settings` (`GET /school-settings`, `PUT /school-settings/whatsapp` and,
  since spec 046, `PUT /school-settings/waiting-list` `{ enabled }` — 422 `schoolSettings.waitingList.invalid` for
  anything but a boolean —, protected, all answer `{ whatsappNumber, waitingListEnabled }`, the switch `true` while
  no row exists; column `school_settings.waiting_list_enabled`, default true), `modules/notifications`
  (spec 020; no dependency on `auth`, see External integrations → Push notifications) and `modules/classes`
  (spec 028; depends on `auth` for `UserRole` / `UserStatus` only, and on `date-fns` 4 + `@date-fns/tz` at the
  app's versions; see Classes) exist today.
- **`packages/shared`** — base classes and contracts every module uses: `Entity`, `UseCase`,
  `CrudRepository` and its parts, `DomainError` (with optional `details`) / `ValidationError` /
  `ValidationException` (422) / `NotFoundError` (404) / `UnauthorizedError` (401) / `ForbiddenError` (403) /
  `ConflictError` (409, for a stale write, e.g. accepting an outdated rules version) /
  `TooManyRequestsError` (429) / `BadGatewayError` (502), and the `Validator` with its reusable rules —
  among them `PhoneNumberRule` (key `phone`: an E.164 string, `^\+[1-9]\d{1,14}$`, that `libphonenumber-js`'s
  `isValidPhoneNumber` accepts for its country). Jest, like the modules.
- **`packages/design-tokens`** — the design system's tokens; `src/tokens.ts` is the source and `src/tokens.css`
  is generated and committed (`check-types` fails when it is stale). Among the type styles, the week and month
  calendar (spec 031) uses `pill` (`ds-text-pill`, Nunito 12.5, 800, uppercase: the pill's caption),
  `calendarDay` (`ds-text-calendar-day`, Barlow Condensed 24: the week row's numbers) and `calendarMonthDay`
  (`ds-text-calendar-month-day`, Barlow Condensed 19: the month grid's numbers). The class card (spec 040) uses
  `cardMeta` (`ds-text-card-meta`, Nunito 12.5, 400: the location pill) and `occupancy` (`ds-text-occupancy`, Nunito
  11, 800, not uppercase: the "N/M vagas" line). `dayNumber`
  (`ds-text-day-number`, 26 px; spec 030's day strip) is used again by spec 061. The week screen's
  sport filter (spec 050) adds the colors `scrim` (the backdrop that dims the screen under a floating menu) and
  `shadowGrape` (a `grape` button's shadow), both light and dark, and the elevations `fab` (`offsetY` 12, blur 26,
  `shadowGrape`: a floating action button) and `menuOption` (`offsetY` 8, blur 22, `shadow`: a floating menu's
  option). The grape card of a class under way (spec 057) adds the colors `onGrapeTint` (white at 18%: borders and
  the avatars' ring), `onGrapeFill` (white at 12%: the location pill), `onGrapeTrack` (white at 22%: the occupancy
  track), `onGrapeShade` (black at 14%: the students footer) and `onGrapeBad` (`#FFD2CC`: "full" text over grape),
  the same in light and dark. The weekly occupancy map (spec 061) adds the color `sunTint` (`bg-sun-tint`, light
  `rgba(240,116,43,.28)`, dark `rgba(245,138,69,.30)`: the 50–89% cell), the type style `occupancyCell`
  (`ds-text-occupancy-cell`, Barlow Condensed 15, 700: the cells' percentages, "canc." and the times) and the radii
  `occupancyCell` (10, `rounded-occupancy-cell`) and `swatch` (3, `rounded-swatch`: the legend's swatches), both
  mapped by hand in the mobile `tailwind.config.ts`; the week bar's caption and the stats' numbers use `dayNumber`.
  The confirm sheet of a notice (spec 063) adds the type styles `sheetDescription` (`ds-text-sheet-description`,
  Nunito 13.5, 400, line 1.55: the line under a sheet's title), `previewTitle` (`ds-text-preview-title`, Nunito 14.5,
  800) and `previewBody` (`ds-text-preview-body`, Nunito 14, 400): the notice's title and message in its preview card.

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
- Accent-insensitive text: the Postgres **`unaccent`** extension (migration `auth-enable-unaccent`, spec 027).
  Prisma's `contains` / `mode: insensitive` doesn't ignore accents, so a search or sort that must ("joao" finds
  "João") is raw SQL through `$queryRaw` with `Prisma.sql` fragments — bound parameters only, `%`, `_` and `\`
  escaped in `LIKE` patterns — that selects the ids in order, then loads the rows with their relations through the
  normal client and maps them in that order (`PrismaUserRepository.findDirectoryPage`).
- Accent- and case-insensitive **uniqueness** is a stored key instead (spec 028): `locations.name_key` holds the
  name in NFD without accents, lower case and trimmed (`normalizeLocationName` in `modules/classes`) under a unique
  index; the use case checks it first and the repository maps Prisma's `P2002` to the same 409, so concurrent
  creations leave one row. Since spec 037 the column is nullable: archiving a location sets `archived_at` and
  `name_key` to `NULL` in the same write, so the unique index (kept as it is; Postgres treats NULLs as distinct)
  binds only active locations and an archived location's name can be taken again — no partial index.
- A **partial** unique index, which Prisma can't express, is written by hand in the migration's SQL and documented
  in a comment of the module's `.model.prisma` (spec 041): `enrolments_one_open_per_student_class` on `(class_id,
  student_id) WHERE status IN ('pending', 'approved')` (migration `20261019191737_enrolment`). `prisma migrate diff`
  doesn't see it, and `prisma migrate dev` would drop it if the migration were regenerated, so the migration is the
  source of truth. The repository maps Prisma's `P2002` on it to 409 `enrolment.alreadyOpen`, so two concurrent
  requests leave one row.
- Writes that must be all or nothing go through one `$transaction` in the repository (`PrismaSchoolClassRepository.createMany`:
  the classes, then their `class_instructors`; `PrismaSchoolClassRepository.update`: the class row, then its
  `class_instructors` deleted and recreated). A write that must not happen after a concurrent one is
  **conditional** instead of locked (spec 033): one `updateMany` whose `where` holds the condition, reading the
  count — `PrismaSchoolClassRepository.cancel` (`where: { id, cancelledAt: null }`, `true` when one row matched, so
  of two simultaneous cancels exactly one wins) and `update` (the class row written the same way inside the
  transaction, the instructors replaced only when it matched; `false` for a cancelled class), and deleting the same
  way with `deleteMany` (spec 034): `PrismaSchoolClassRepository.delete` (`where: { id, cancelledAt: null,
  startsAt: { gt: now } }`, the `class_instructors` rows going with it by their `ON DELETE CASCADE`, `true` when
  one row matched), and marking a class as reminded (spec 054): `PrismaSchoolClassRepository.markReminded`
  (`where: { id, reminderSentAt: null, cancelledAt: null }`, `true` when one row matched, so of two runs at once
  exactly one reminds the class). Releasing a person from their upcoming classes (spec 035) is one `$transaction` running
  `classInstructor.deleteMany({ userId, classId: { in } })` (`PrismaSchoolClassRepository.removeInstructor`; an
  empty list writes nothing); a concurrent edit adding the person back isn't prevented, the last write wins.
  Cancellation deadlines (spec 036) use both: saving a rule is one `$transaction` (`PrismaCancellationRuleRepository.save`:
  the `cancellation_rules` upsert, then one `updateMany` clearing the discipline's classes with `startsAt > now`
  and `cancelledAt` null), `update` clears the deadline in the same write when asked, and the job stores a result
  or a failure only with `updateMany({ where: { id, deadlineRevision, cancelledAt: null } })`, so an edit or a rule
  change during a model call wins (the write matches nothing and is dropped). Every clearing sets
  `cancellation_deadline` and `deadline_next_attempt_at` to null, `deadline_attempts` to 0 and bumps
  `deadline_revision`. Locations (spec 037) follow the same patterns: `PrismaLocationRepository.update` writes the
  location and, when asked (`clearDeadlinesFrom`), clears the deadlines of its classes with `startsAt` after that
  instant and `cancelledAt` null, in one `$transaction`; `archive(id)` is one `updateMany({ where: { id,
  archivedAt: null } })`, `true` when a row matched, so of two concurrent archives one wins. `update` isn't
  conditional on `archived_at`: an edit racing an archive can write `name_key` back on the archived row.
  Enrolments (spec 041) are conditional on their status: withdrawing and expiring are `updateMany({ where: { id,
  status: 'pending' } })` (`true` when one row matched, so a racing withdrawal or a second expiry tick changes
  nothing), and closing a cancelled class's open enrolments is one `updateManyAndReturn` over its `pending` /
  `approved` rows. Denying (spec 042) is conditional the same way. Approving is the one **locked** write (spec 042,
  D-01): one `$transaction` reads the enrolment, takes the class row with `SELECT … FOR UPDATE` (`$queryRaw`),
  counts the `approved` enrolments, answers `full` at capacity and otherwise writes conditional on `pending`, so two
  approvals for the last seat run one after the other and leave exactly one. Direct enrolment (spec 044,
  `enrolDirectly`) takes the same lock: in one `$transaction` it locks the class row, reads the student's open
  enrolment (`alreadyApproved` when approved), counts the `approved` rows (`full` at capacity), then approves the
  pending row or inserts an approved one. Adding a guest (spec 045, `PrismaGuestRepository.create`) takes it too.
  The lock and the count are shared helpers in `seats-taken.prisma.ts`: `lockClassCapacity(tx, classId)` (the
  `FOR UPDATE` read, `null` when the class is gone) and `countSeatsTaken(tx, classId)` (the `approved` enrolments
  plus the `guests` rows), so every seat writer counts guests. Erasing guest data is one conditional `updateMany`
  (`erasedAt: null`). Taking out (spec 044) is conditional on
  `approved`, like cancelling. `cancellation_rules` is keyed by `discipline` (the `class_discipline` enum), with `updated_by`
  → `users.id` `ON DELETE SET NULL`.
  `classes.created_by` and `classes.location_id` are `ON DELETE
  RESTRICT`: the planned erasure of deleted / removed accounts must decide what happens to an admin who created
  classes before it can delete the row.
- Seeds (`apps/backend/prisma/seed/main.ts`, one task per module) hold only technical data and the three App
  Store / Google Play review accounts — never demo data.
- **`users.status` is the authority for deleted and removed accounts**, not the `deleted_at` column inherited
  from `EntityState`: the product distinguishes deleted from removed, and two sources would disagree.
- **An erased account is a storage-only status** (spec 067, migration `20261027184122_users_erasure` — named
  `users_erasure` by the spec rather than `auth-<change>`): the Prisma `UserStatus` has `erased` and `users` has
  `erased_at`, while `users.name` and `users.email` are nullable (email still unique; Postgres treats NULLs as
  distinct). The domain's `USER_STATUSES` doesn't have it: `PrismaUserRepository` filters `status: { not: 'erased' }`
  in `findById`, `findByEmail`, `findPage` (rows and count) and `searchByName` (`findDirectoryPage` and the other
  status-specific reads never match it), `PrismaIdentityRepository.findByProvider` skips an identity whose user is
  erased, and `PrismaTeacherLookup` and `PrismaClassContactReader` leave erased users out; so `toDomain` casts the
  name, email and status. Readers that select people for a class (`PrismaClassViewReader`,
  `PrismaClassRosterReader`) pass the stored `null` name through.
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
  never stored, so it can't go stale. The one exception is `cancelled` (spec 033): set by an admin, stored as
  `classes.cancelled_at`, and winning over the clock — `getClassState(startsAt, endsAt, now, cancelledAt?)` returns
  `"cancelled"` whenever it is set. Side effects due at a given time run as scheduled jobs (see Scheduled
  work).

## Fixed conventions

- **Languages**: code, identifiers, commits, specs and docs in English. The UI is in Brazilian Portuguese,
  Spanish and English through translation keys — no user-facing text is hard-coded in components or sent by
  the backend. Text written by admins (rules, notes, reasons, broadcasts) is stored and shown as written,
  never translated. **Two exceptions**, both texts the OS or a mail client draws without the app: the sign-in
  code email, whose pt-BR / es / en copy lives in `ResendEmailProvider` (the client sends the `locale` picked on
  the sign-in screen), and the push text, whose catalog (`renderPush(type, params, locale)`) lives in
  `apps/backend/src/modules/notifications/push-messages.ts` and is drawn per device in the locale that device
  registered (spec 020). The same catalog also writes the notifications screen's text (`renderInApp(type, params,
  locale)`, in the `locale` the app sends to `GET /notifications`; spec 055), so an installed app still shows the
  text of a type it doesn't know. A stored notification holds no text — only `type` and `params`.
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
- **Mobile shared UI**: screens that can go back get the native Stack header (spec 038): the auth layout and the
  three role layouts pass `useStackHeader()` (`src/navigation/stack-header/`) as `screenOptions`, with `index`
  (auth) and `(tabs)` (roles) at `headerShown: false`. It draws the platform back button (no label, tinted `ink`,
  no shadow); screens never build one (`BackButton` no longer exists). Where `isLiquidGlassAvailable()`
  (`expo-glass-effect`) is true (iOS 26+) the header is transparent (`headerTransparent`, `headerStyle` background
  `transparent`, so iOS doesn't draw an opaque band) with `scrollEdgeEffects: { top: "soft" }`, so content
  scrolling under it fades; elsewhere (Android, iOS < 26) it is opaque `page`. A screen sets its title and
  `headerRight` with `<Stack.Screen options>`, giving the title as `headerTitle: () => <StackHeaderTitle
  title={…} />` (uppercase `ds-text-screen-title-with-back`), never a plain string: on iOS 26+ a string title makes
  the transparent header draw a frosted band with a line instead of the soft fade. Content under the header: a
  scrolling screen's `ScrollView` / `FlatList` is the screen's first descendant (the scroll-edge effect only finds
  that one) with `contentInsetAdjustmentBehavior="automatic"`; a fixed screen adds `useHeaderInset()` as top
  padding (the header's height under the transparent header, 0 under the opaque one); a scrolling screen under the
  role homes' custom user header (not the native bar, so the automatic inset clears only the safe area) pads its top
  by `Math.max(useHeaderInset() - insets.top, 0)` plus its own spacing — the admin home (`AdminScreen`, a
  `ScrollView` since spec 061, so its cards clear the floating tab bar); a `KeyboardAvoidingView`
  below the header passes `useKeyboardOffset()` as `keyboardVerticalOffset` (0 under the transparent header, the
  header's height under the opaque one). `jest.setup.ts` mocks `isLiquidGlassAvailable` (false),
  `useHeaderInset` (0) and `useKeyboardOffset` (64) for components rendered without a navigator. Inner screens
  open with `ScreenIntro` (icon tile, optional eyebrow, title, description; the tile's
  background is `bg-sand` unless `iconTileClassName` passes another token class, and the eyebrow is `text-ink-2`
  unless `eyebrowClassName` passes another)
  and use the shared `TextInput` (leading icon, `neutral` / `error` border, error message below), `OtpInput`
  (digit boxes over a hidden native input that keeps only digits, so paste and one-time-code autofill work) and
  `Button` (variants, including `ghost` and, on mobile only, a green `success` — `bg-ok`, `text-on-color`, no
  shadow; spec 039 — plus `loading` and `disabled` states, and an optional `icon` — a glyph
  drawn before the label; the web `Button` takes the same `icon`). Every closed-account state (denied, deleted,
  removed) is drawn by `AccountStatus` (`src/components/account-status`): a `ScreenIntro` whose icon tile follows
  `tone` (`bad` → `bg-bad-tint`/`text-bad`, `dim` → `bg-dim`/`text-ink-2`, `sand` → `bg-sand`/`text-grape`), an
  optional note card (`{ title, text }`), an optional `primaryAction` node, and the ghost "Use another email"
  button (`onUseAnotherEmail`) always last; it lives outside the modules because `offboarding` and
  `reactivation` both use it. A tag is the shared `Chip` (`src/components/ui/chip`:
  `tone` and the label, plus an optional `icon` drawn before it — an Ionicons name on mobile, coloured like the
  tone's label, and a `ReactNode` on web, which has no icon set; spec 030). A tick box is the shared
  `Checkbox` (`src/components/ui/checkbox`: `checked`, `onChange(checked)`, `label`, `disabled`, optional `helper`
  — a second line stacked under the label, read as the accessibility hint — and `variant`: `plain` by default, or
  `boxed`, inside the subtle button's fill and radius, `rounded-control bg-dim`, spec 070) — one
  `Pressable` row with role `checkbox`, so the box and its label toggle it, at least 44 pt tall. Multi-line text is
  the shared `TextArea` (`src/components/ui/text-area`: controlled `value` / `onChangeText`, required `maxLength`
  enforced by the native input, a "{length}/{maxLength}" counter under it, optional `label` also used as the
  accessibility label, no icon, the `TextInput` border tokens; `inBottomSheet` renders gorhom's
  `BottomSheetTextInput`, wrapped in NativeWind's `cssInterop` so `className` still styles it, because a sheet only
  rises above the keyboard for its own input — set it whenever a `TextArea` sits in a `BottomModal`); a `TextInput` with `editable={false}` takes the
  disabled look (`bg-dim`, `border-line`, secondary ink). `BottomModal` is a `BottomSheetModal` presented by the
  root layout's `BottomSheetModalProvider`, so it opens above the screens and above a native tab bar (a plain sheet
  sat under the floating tab bar); it presents on `visible` and only dismisses a sheet it presented, its scrim is
  the light palette's ink at 45% so it is dark in both themes, it takes only the room its content needs plus the
  home-indicator inset, and it passes `onClose` to the sheet library too, so dragging the sheet down reaches the
  caller (a backdrop tap may call it twice; callers must tolerate that); it sets `keyboardBehavior="interactive"`,
  `keyboardBlurBehavior="restore"` and `android_keyboardInputMode="adjustResize"`, so a sheet with a focused
  `inBottomSheet` field rises above the keyboard and goes back down when it closes (spec 039); a sheet dragged or tapped away counts as
  no longer presented, so the caller's next `visible` opens it again. A switcher between a few options is the
  shared `SegmentedControl` (`src/components/ui/segmented-control`: generic `options: { value, label }[]`, `value`,
  `onChange(value)`; equal-width `TouchableOpacity` segments with role `tab` and `accessibilityState.selected`, at
  least 44 pt tall, a `bg-sand` track with the selected segment on `bg-surface` with `shadowStyle()`; pressing the
  selected one does nothing; the Nova aula screen uses it for the discipline and the level). Steps of a flow shown as
  tabs are `StepTabs` (spec 060, `src/components/ui/step-tabs`, no hook: generic `steps: { key, label, value, done,
  disabled? }[]`, `selected`, `onChange(key)`; a `bg-sand` `rounded-card` track of equal-width `TouchableOpacity`
  cards with role `tab` and `accessibilityState` `{ selected, disabled }`, the selected one on `bg-surface` with
  `shadowStyle("iconButton")`; each card a round badge — the step number on `bg-tan` in `text-on-color`, or a
  `checkmark` on `bg-ok` once done —, the uppercase label and the value line; a disabled card is dimmed and ignores
  presses, and pressing the selected one does nothing; used by "Inscrever aluno"). `BottomModal` also takes
  `contentPanningEnabled` (default `true`; off when the content has its own vertical gestures, such as time
  wheels — the handle, the scrim and a Cancel button still close it). Shared pieces used by more than one
  module live in `src/components/`: `LanguageSheet` (sign-in screen and Profile; choosing stores the locale),
  `ThemeSheet` (the three choices with a check on the current one), `WhatsappNumberForm` (country picker,
  Brazilian mask, share switch, validation and submit button, its number input being `PhoneNumberField` since spec
  045; header slot, `initialNumber` / `initialVisible`,
  `requireChange`, `onSubmit` — used by onboarding and the Profile's WhatsApp screen), `PhoneNumberField` (spec 045,
  `src/components/phone-number-field/`: the controlled country button, `CountryPicker` and masked input, with
  `usePhoneNumberField()` holding the country, the mask, the E.164 value and its validity; used by
  `WhatsappNumberForm` and the trial mode of "Inscrever aluno"), `CountryPicker` and
  `RoleTabs`. The admin tools share `src/components/decision/` — `DecisionCard` (an `avatar` node, title, optional
  subtitle, detail lines and `shadowStyle("card")`; an optional `onPress` makes the upper row — avatar, text and an
  Ionicons `chevron-forward` — one `Pressable` with role `button` labelled by the title, and without it there is no
  chevron; an `outline` Deny with a Feather `x` and a `success` Approve with a Feather `check`; `disabled`,
  `approveDisabled` (the Approve alone, spec 042) and `loading: "approve" | "deny"`) and `DenySheet` (`BottomModal` + an `inBottomSheet` `TextArea` with a
  `placeholder` and `label` — its accessibility label, also drawn above the field with `showLabel` (spec 044) —, a `danger` confirm with a Feather `x-circle` and a
  `subtle` back button (`backLabel`) that closes like a swipe; clears its text when it closes) — with generic props and no registration fields, so "Reactivate accounts", "Class enrolments" and the take-out
  sheet (spec 044) plug in their own data and copy. A week or a month to pick a day from is the shared `WeekMonthCalendar`
  (`src/components/week-month-calendar`, spec 031), drawn with `CalendarWeekRow` and `CalendarMonthGrid` in sibling
  folders; none of them imports from `src/modules/`. It is controlled for the selection and owns only the view
  (`"week"` | `"month"`, starting on the week; the pill in the header is the only switch). Props: `selectedDate`
  and `today` (`YYYY-MM-DD`, the parent decides the zone), `markedDates` (one dot each), `onSelectDate`,
  `onVisibleRangeChange?({ from, to })` (the first and last day drawn, on mount and on change, through
  `useEffectEvent`), `markedLabel?` (appended to a marked day's accessibility label) and `dotPlacement?` (spec 062,
  passed on to `CalendarMonthGrid`: `"below"`, the default, draws a marked day's dot under the day's circle, selected
  or not; `"overlap"` tucks it into the bottom of the day's slot, over a selected circle — only `WeekPickerSheet`, the
  weekly occupancy's week picker, uses it; a month with no marked day has no dot row). Everything shown derives
  from `selectedDate` and the view, so the arrows select ±7 days or ±1 month (`addMonthsKeepingDay`, capped at the
  month's last day). Optional props for the class history (spec 053), none used by the classes screen:
  `initialView` (`"month"` to open on the month), `clearable` (`selectedDate` may be `null`; the calendar keeps the
  week or month on screen itself, the arrows move that period and call `onClearSelection?()`, pressing the selected
  day calls it too, a faded day opens its month selected, and switching view opens the selected day's week or month —
  with none, today's week when today is in the month, else the week of its 1st, or the month of the week's Monday)
  and `onPeriodChange?({ from, to })` (`CalendarPeriod`: Monday to Sunday, or the month's 1st to last day, never the
  faded days; on mount and on change). Days are buttons labelled with date-fns `PPPP` and `accessibilityState.selected`, `testID`
  `calendar-day-<date>` (dot `calendar-day-<date>-dot`); the pill has `accessibilityState.expanded` on the month;
  the 36 pt arrows and the pill reach 44 pt through `hitSlop`. Copy under `weekMonthCalendar`. App-wide helpers
  live in `src/utils/`: `formatCreatedAt` ("now", relative up to 7 days, then the date in America/Fortaleza; used
  by the Pending screen), `getInitials` (first letter of the first and of the last
  word, uppercase) and the date helpers of `calendar-dates.ts` (see Dates). API errors are shown in a toast
  through `useAlertMessage()` (`AlertMessageProvider` in the root layout; the toast hides by itself after 3 s).
  `show(message, { tone })` takes `"error"` (the default: `bg-bad`, `alert-circle-outline`) or `"success"`
  (`bg-ok`, `checkmark-circle-outline`, same colors as the `success` `Button`). Only the toasts shown after an
  action completed pass `{ tone: "success" }` (a class created, saved, cancelled or deleted, a location saved or
  removed, a notice sent, a school rule added, saved or deleted, cancellation rules or school settings saved, a
  student enrolled, a request approved or denied, a seat requested, withdrawn or cancelled, a student taken out);
  everything else, `profile.comingSoon` included, keeps the error tone (spec 068). `Toast` takes the same `tone`
  prop (`toast.constants.ts` maps it to the class and icon). NativeWind compiles the classes away in tests, so a
  test that checks the tone mocks `@/components/ui/toast` with `toast.test-utils.tsx`, which also renders a
  `tone:<tone>` text. One exception: an error about what the person typed in a code field (a wrong, expired or locked code) is
  shown inline under the field, because the design shows it there.
- **Mobile routes**: every app path lives in `src/constants/routes.ts` (`routes.<module>.<screen>`, a function
  when the route takes params, optional ones included: `routes.auth.createAccount()` or
  `routes.auth.createAccount({ email })`, `routes.admin.newClass()` / `routes.admin.newClass({ date })`, or
  `routes.admin.sendNotice()` / `routes.admin.sendNotice({ classId })`). `router` and `Redirect` calls and their tests use it, never string literals,
  so a moved route changes in one place. Each role's folder (`src/app/(private)/<role>/`) has a `Stack` whose
  `(tabs)` group holds the tab bar (`(tabs)/_layout.tsx` renders `RoleTabs`, one route file per tab; the first tab
  is the role's `index`, so `/student`, `/instructor` and `/admin` stay the flows' entry routes); inner screens
  (`/admin/registrations`, `/admin/class-requests` — `routes.admin.classRequests`, spec 042 —, `/admin/people`, `/admin/new-class`, `/admin/edit-class/[id]` —
  `routes.admin.editClass(id)` —, `/instructor/people`, `/<role>/edit-profile`,
  `/<role>/whatsapp`, `/<role>/school-rules`, `/<role>/class/[id]` — `routes.<role>.classDetail(id)` —, `/student/my-history` —
  `routes.student.myHistory`, spec 048) are routes of the
  role's `Stack`, outside `(tabs)`, so they open above the tab bar, without it, and go back with the native header's back button (and the iOS
  swipe-back / Android back); navigation tests go back with `router.back()`, since that button is a native view.
  Route tests that render a role live in `src/modules/<role>/*-tabs.navigation.test.tsx`, never under `src/app/`
  (Expo Router would read a test file there as a route).
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
  script (`tsc --noEmit`) in the first spec that touches it, like the backend (`modules/auth`, `modules/school-rules`
  and `modules/classes` have both).
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
- Erasure of deleted and removed accounts (spec 067): `EraseClosedAccounts` (`modules/auth/src/user/usecase/`)
  takes the cutoff now − 30 × 24 h, reads the ids with `UserRepository.findClosedBefore(cutoff)` (`deleted` with
  `deletedAt` ≤ cutoff, or `removed` with `removedAt` ≤ cutoff; a null date never matches), stops when there are
  none, then calls the `PersonNotificationEraser` port (`provider/person-notification-eraser.provider.ts`,
  `erase(userIds)`) and finally `UserRepository.eraseClosed(ids, cutoff)`, returning `{ erased }`; a failing eraser
  leaves the accounts due for the next run. `PrismaUserRepository.eraseClosed` is one `$transaction`: it reads the
  old emails of the ids still due, writes the anonymous record with one conditional `updateManyAndReturn` on the
  same condition (`status: erased`, `erasedAt: now`, `name`, `email`, `photoUrl`, `whatsappNumber`, `denialReason`,
  `deniedAt`, `reactivationStatus`, `reactivationRequestedAt` null, `whatsappVisible: false`; id, role, dates kept),
  so an account reactivated or restored between the read and the write is left alone, then deletes, for the rows it
  wrote, their identities, refresh tokens, push tokens, rules acceptances and notifications, and the sign-in codes of
  the old emails. The port is implemented by `NotificationsPersonNotificationEraser` (running
  `DeleteNotificationsAbout`: `registration.pending` / `reactivation.requested` by `params.userId`,
  `enrolment.requested` / `enrolment.cancelled` by `params.studentId`, one `deleteMany` per param) and exported by
  `NotificationsModule`. The enrolment notices `SeatRequested` / `SeatCancelled` carry `studentId`, stored in those
  params since spec 067.
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
  carries those four fields plus the claims. The guard never refuses by status or role — use cases do — except an
  erased account (or one with no email), which it treats as unknown (spec 067; also in the `backend-nest-config`
  template). Every 401 it answers (no token, malformed, wrong signature, expired, unknown or erased user) is
  `auth.token.invalid`, so the
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
  number may belong to several accounts. The app calls it from onboarding and from the Profile's WhatsApp screen;
  the visibility the Profile shows comes from the session's account, never from the access token.
- Name: `PUT /auth/me/name` (`SetName`, protected, body `{ name }`, 200 with the account shape). Unknown user →
  401 `auth.token.invalid`; not `approved` → 403 `user.status.notApproved`; `name` not a string → 422
  `user.name.required`; otherwise the name is trimmed, set with `clone()` and `validate()`d (422 `user.name.*` from
  the entity). Only the name changes.
- Closing one's own account: `DELETE /auth/me` (`DeleteAccount`, protected, no body, 204). Unknown user → 401
  `auth.token.invalid`; not `approved` → 403 `user.status.notApproved`; otherwise status `deleted` and
  `deletedAt` from the clock. Between the checks and the update it awaits the auth port `TeachingReleaser`
  (`modules/auth/src/user/provider/teaching-releaser.provider.ts`, `releaseUpcomingClasses(userId)`; spec 035), for
  every role, while the account is still approved: an error from it propagates, so the request fails and the
  account stays approved (releasing is idempotent, so a retry is safe). It is implemented by
  `ClassesTeachingReleaser` (`apps/backend/src/modules/classes/classes.teaching-releaser.ts`, running
  `ReleaseUpcomingClasses`, see Classes), provided and exported by `ClassesModule`, which `AuthModule` imports
  (classes imports `DbModule`, `EnrolmentModule` and `NotificationsModule`, none of which imports auth, so there is
  no cycle); the role-change and removal
  use cases are meant to take the same port. Right after it, still before the update, it awaits the auth port
  `SeatReleaser` (`modules/auth/src/user/provider/seat-releaser.provider.ts`, `releaseSeats(userId)`; spec 043),
  with the same failure rule. It is implemented by `EnrolmentSeatReleaser`
  (`apps/backend/src/modules/enrolment/enrolment.seat-releaser.ts`, running `ReleaseStudentEnrolments`, see
  Enrolment), provided and exported by `EnrolmentModule`, which `AuthModule` also imports (enrolment imports only
  `DbModule` and `NotificationsModule`). It doesn't end the account's sessions: the app signs out right after
  (`useSignOut`), and other devices move to the reactivation flow at their next account read. It doesn't yet
  refuse the only admin.
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
- People directory (`people.controller.ts`, protected, spec 027): `GET /people` passes the raw query strings
  `page`, `perPage`, `role`, `search` to `ListPeople` (`modules/auth/src/user/usecase/`), which checks in this order:
  status other than `approved` → 403 `user.status.notApproved` (any role may read; an unknown user is the guard's
  401 `auth.token.invalid`); then the query, every failure collected into one 422: `page` (digits only, ≥ 1,
  default 1) → `people.page.invalid`; `perPage` (digits only, 1–50, default 20) → `people.perPage.invalid`; `role`
  (comma-separated `student` | `instructor` | `admin`, repeats dropped; absent or blank = every role; an unknown
  name or a repeated parameter → `people.role.invalid`); `search` (trimmed, blank = none, over 80 characters →
  `people.search.max.length`). There is no `sort` parameter. `UserRepository.findDirectoryPage({ page, perPage,
  roles?, search? })` returns only `approved` users with any of the roles, the name containing the search ignoring
  case and accents, ordered by `lower(unaccent(name))` then `id` (see Persistence). 200 `{ items: [{ id, name, role,
  createdAt, whatsappNumber }], page, perPage, total }`: `whatsappNumber` is the stored number when the owner's
  `whatsappVisible` is true or the viewer is an admin, else `null` — decided in the use case, so a hidden number
  never leaves the backend; email, photo, status and the visibility flag are never returned. The scaffold's
  `findPage` / `searchByName` (`FindUserPage`, `SearchUsersByName`) filter by neither status nor role and stay unused.
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
  `GET /school-settings` (`useSchoolWhatsapp` in `src/hooks/use-school-whatsapp.hook.ts`, which reads
  `useSchoolSettings`, see Mobile school settings);
  the "Contact the school" button (`ContactSchoolButton`, `src/components/contact-school-button/`, shared with the
  class details' deadline notes since spec 043) renders only with a non-null number and opens `https://wa.me/<digits>` with
  `Linking.openURL` (a toast when it rejects) — loading, an error and `null` all hide it, because the contact is
  an extra. The Account deleted screen picks its state from the session's `reactivationStatus` (`null` → not
  requested, `"requested"`, `"denied"`); `useRequestReactivation` (`modules/reactivation/hooks`) is a mutation
  on `POST /auth/me/reactivation-request` that puts the answer in the session (`updateUser`) on 200, sets
  `reactivationStatus: "denied"` on 409 `user.reactivation.denied`, and signs out with a toast on 403
  `user.status.notDeleted`, so every answer leaves the screen matching the account.
- Mobile school settings (spec 046): one query `["school-settings"]` (`SCHOOL_SETTINGS_QUERY_KEY`, `useSchoolSettings`
  in `src/hooks/use-school-settings.hook.ts`, authenticated `GET /school-settings`, no retry; type
  `SchoolSettings` in `use-school-settings.types.ts`) is shared by `useSchoolWhatsapp` and the class details.
  `src/modules/school-settings/`: `SchoolSettingsScreen` (route `admin/school-settings`,
  `routes.admin.schoolSettings`, reached from the admin home's "Escola" row) shows a spinner
  (`testID="school-settings-loading"`), the error with "Tentar novamente", or `SchoolSettingsForm`
  (`components/school-settings-form/` + hook), which starts its state from the loaded settings: a `Switch` and
  `PhoneNumberField`, and one `Button` enabled when the switch or a typed number differs from the saved values and
  the number, when typed, is valid (an emptied field counts as no change: the number can be replaced, not
  cleared); a ref guards a double send. `useSaveSchoolSettings` (`hooks/`, no retry) sends only what changed — the
  switch, then the number — puts the last answer in the cache, and maps errors to the shared no-connection /
  generic toasts (an expired session shows nothing); success shows `schoolSettings.saved`. Copy under
  `schoolSettings` and `admin.home.schoolSettingsRow`.
- Mobile admin calls (`modules/admin`): one query `["registrations"]` (`useRegistrations`, authenticated
  `GET /registrations`, no retry) feeds both the admin home's pending count and the "Join the school" screen.
  `useApproveRegistration` / `useDenyRegistration` are mutations without retry (deny sends `{}` for a blank
  reason); on 200 `removeRegistration` (`utils/registrations-cache.ts`) takes the item out of the cached list at
  once and invalidates the query, and a 409 `registration.status.notPending` invalidates it too. The mutations
  show nothing: the screen's hook (`useRegistrationsScreen`) calls `mutateAsync` and maps errors with
  `getRegistrationErrorKey` (`utils/registration-error.ts`: the 409 → `registrations.alreadyDecided`,
  `NetworkError` → no connection, `SessionExpiredError` → nothing, else generic), because it also guards double
  taps per card with a ref, keeps the registration whose detail sheet is open (`selected`, kept while the sheet
  slides away, and `isSheetVisible`), and closes the deny sheet only for the registration that was decided or found already decided — a
  failure keeps the sheet and its reason.
- Mobile people calls (`modules/people`, spec 027): `usePeople({ roles, search })` is the infinite query
  `["people", { roles, search }]` (authenticated `GET /people?page=&perPage=20`, `role` as a comma list in the fixed
  order student, instructor, admin and `search` sent only when set; `buildPeoplePagePath`), and `usePeopleCount` is
  `["people", "count"]` (`GET /people?perPage=1`, `total`: the unfiltered number for the eyebrow, nothing shown while
  loading or after an error). `usePeopleScreen` debounces the search by 300 ms, toggles the roles, and maps a
  failed next page to a toast with `getRegistrationErrorKey` (nothing for `SessionExpiredError`). The list keeps the
  backend's order and only groups it by first letter (`groupByInitial`: NFD without accents, "#" for a non-letter).
  The sheet shows the number with `libphonenumber-js` `formatInternational()` (as sent when unparsable) and opens
  `https://wa.me/<digits>` with `Linking.openURL`, toast `people.whatsappUnavailable` on a rejection. `PersonSheet`
  also takes an optional `email`: with it, a non-pressable email row (Feather `mail`, `people.email`) replaces the
  WhatsApp row — the "Join the school" screen opens it for a registration as a `student` with no number (spec 039).
  Since spec 049 its `person` is `Pick<Person, "name" | "role" | "whatsappNumber"> | null`, so a class's details
  open the same sheet for an instructor (their `role`) or a student (`"student"`).
  The home rows'
  "N na plataforma" is the constant `PEOPLE_COUNT_PLACEHOLDER = 9` (`constants/people.ts`) until a backend route
  gives the count.
- Review accounts: seeded, pre-approved, one per role, each with a fixed code accepted only for its own email.
  `REVIEW_ACCOUNTS` is a JSON array of `{ "email", "code", "role", "name" }` (6-digit code; role `student` |
  `instructor` | `admin`), read by `AuthConfig` and by the seed through the same parser (`parseReviewAccounts`);
  a malformed value stops the backend at startup. Requesting a code for a review email stores the hash of its
  fixed code and sends no email; the cooldown and the lockout apply as for anyone.

## Classes

Routes of `apps/backend/src/modules/classes/` (spec 028), all protected. Access is checked in the use cases
(`assertCanReadClasses` / `assertCanManageClasses` in `modules/classes/src/access/`): status not `approved` → 403
`user.status.notApproved` first, then a role other than `admin` → 403 `user.role.notAdmin`; an unknown user is the
guard's 401 `auth.token.invalid`.

- Locations (specs 028, 037; `LocationsController`, use cases in `modules/classes/src/location/usecase/`). The
  item is `{ id, name, address, latitude, longitude, upcomingClasses }` (`toLocationOut`; the point `null` for a
  location saved before spec 037; `upcomingClasses` counts its classes with `startsAt` after now and not
  cancelled). `GET /locations` (any approved account; `ListLocations`) → 200 `{ items }`, only **active**
  locations, sorted by `nameKey` then `id`, unpaginated (`LocationRepository.findActive(now)`). `POST /locations`
  (admins; `CreateLocation`) `{ name, address, latitude, longitude }` → 201 the item (`upcomingClasses` 0; name
  and address trimmed); 422 with `location.name.required` / `.max.length` (40), `location.address.required` /
  `.max.length` (200) and `location.point.required` (latitude or longitude absent or `null`) /
  `location.point.invalid` (not a finite number, latitude outside −90..90 or longitude outside −180..180)
  collected (a non-string name or address counts as missing); 409 `location.name.duplicate`. `PUT /locations/:id`
  (admins; `EditLocation`) `{ name, address, latitude, longitude, notify? }` → 200 the item. Order: access; a
  non-UUID id (no lookup) or no location → 404 `location.notFound`; the shape keys plus `location.notify.invalid`
  (present and not a boolean) in one 422; 409 `location.archived`; 409 `location.name.duplicate` (another active
  location with the same `nameKey`; its own name in another case is fine). Nothing differing (name, address,
  latitude, longitude after trimming) → 200 with no write and nobody told. Otherwise `LocationRepository.update(location,
  { clearDeadlinesFrom })` — `now` when the name or the address changed (the details the language model reads),
  else `null`, so a moved point keeps the deadlines — then, with `notify: true`,
  `findUpcomingInstructorCounts(locationId, now)` merged with the students of spec 047 — the `ClassAudienceReader`
  port's `findLocationAudience(locationId, now)` (`EditLocation`'s fourth constructor argument; a failed read tells
  the instructors only) — each person once with the larger count, minus the caller, goes to
  `LocationChangeNotifier.locationChanged({ recipients: [{ userId, count }], locationName })`
  (`provider/location-change-notifier.provider.ts`; `userId` was `instructorId` before spec 047; skipped when nobody
  is left; any error swallowed in the use case). `POST /locations/:id/archive` (admins; `ArchiveLocation`) → 204; order: access, 404 `location.notFound`,
  409 `location.archived` (already archived, or the conditional `archive(id)` lost a race). The last active
  location can be archived; nothing restores one. Address suggestions (admins): `GET
  /locations/address-suggestions?q=&sessionToken=&language=` (`SuggestAddresses`) → 200 `{ items: [{ placeId,
  title, description }] }` (at most 5) and `GET /locations/address-suggestions/:placeId?sessionToken=&language=`
  (`FindAddressPlace`) → 200 `{ address, latitude, longitude, name }`, both declared before the `:id` routes.
  `q` trimmed 3–100 characters, else `location.suggestions.query.invalid`, and `sessionToken` matching
  `^[A-Za-z0-9_-]{1,64}$`, else `location.suggestions.sessionToken.invalid` (one 422); `language` `pt-BR` / `es` /
  `en`, anything else `pt-BR`; the provider throwing → 502 `BadGatewayError` `location.suggestions.unavailable`; no
  place (or a blank `placeId`) → 404 `location.place.notFound`. They go through the `AddressSuggestionProvider` port
  (see External integrations → Maps and address suggestions).
- `POST /classes/batch` (admins) `{ discipline, level, startDate, endDate, weekdays, excludedDates?, skipPast?,
  timeRanges, locationId, instructorIds, capacity, notes? }` → 201 `{ count }`. Dates `YYYY-MM-DD` and times
  `HH:mm` are America/Fortaleza; `CreateClassBatch` expands them (`listBatchClasses`) and stores `startsAt` /
  `endsAt` in UTC. `excludedDates` (absent or `null` = none; `class.excludedDates.invalid`) are left out by
  `listBatchDates` whatever their weekday; `skipPast` (boolean; `class.skipPast.invalid`) lists the batch from the
  later of `startDate` and today in Fortaleza (by the clock), caps the listing at `CLASS_BATCH_MAX +
  timeRanges.length` (so only today's classes can have started, one per range), then drops the classes starting
  at or before now. Shape errors are one 422 `ValidationException` (keys in
  [modules/classes.md](modules/classes.md)); then, alone and in order, `class.location.notFound`,
  `class.location.archived` (spec 037), `class.instructors.invalid`, `class.batch.empty`, `class.batch.tooLarge` (`details: { max: 200 }`, judged after
  the skip) and `class.startsAt.past` (only without `skipPast`), each a 422 `DomainError`. A location or instructor id that
  isn't a UUID is refused as not found / invalid without a lookup. Instructors are checked through the
  `TeacherLookup` port (`PrismaTeacherLookup`: id, role, status). The batch is written by
  `SchoolClassRepository.createMany` in one transaction; then `ClassAssignmentNotifier.classAssigned({
  instructorIds, count, discipline })` for every instructor except the caller (skipped when none is left; a
  throwing notifier is swallowed in the use case and in the adapter).
- `GET /classes/time-range-suggestions` (admins) → 200 `{ items: [{ start, end }] }`: distinct `HH:mm` pairs of the
  classes starting in last week (Monday 00:00 inclusive to this Monday 00:00 exclusive, Fortaleza), sorted by start
  then end (`SchoolClassRepository.findStartingBetween`).
- `GET /classes?date=YYYY-MM-DD` (any approved account; spec 030, `ListWeekClasses`) → 200 `{ weekStart, items:
  ClassItem[] }`: the classes starting from the Monday 00:00 of the date's week (inclusive) to the next Monday
  00:00 (exclusive), Fortaleza, sorted by `startsAt`, `endsAt`, `id`. `ClassItem` is `{ id, discipline, level,
  startsAt, endsAt, capacity, notes, location: { id, name, address, latitude, longitude }, instructors: [{ id,
  name }], cancelledAt, cancellationMessage, cancellationDeadline, seatsTaken, students: [{ id, name, photoUrl }],
  myEnrolment: { id, status, requestedAt } | null }` (ISO UTC dates, the location's point `null`
  when it has none and an archived location read like an active one (spec 037), `notes` `null` when none, `cancelledAt` /
  `cancellationMessage` `null` for a class never cancelled (spec 033), `cancellationDeadline` `null` while it can't
  be worked out (spec 036), instructors sorted by name with `Intl.Collator` `sensitivity: "base"`, then
  `id`; `toClassItem` in `usecase/class-item.ts`). Access first, then a `date` that is missing, not a string,
  malformed or impossible → 422 `ValidationException` `class.date.invalid`. `GET /classes/:id` (any approved
  account; `GetClass`) → 200 one `ClassItem`; a non-UUID id (no lookup) or no class → 404 `class.notFound`. Since
  spec 047 `GetClassOut` is the `ClassItem` plus `pendingRequests` — `PendingRequestCounter.countPendingRequests`
  for an admin, `null` for every other role (`GetClass`'s fourth constructor argument) — so the answers of
  `PUT /classes/:id` and `POST /classes/:id/cancel` carry it too; the week list's items have no such key. Since
  spec 049 `GetClassOut`'s `students` are `GetClassStudent` (`ClassStudent` + `whatsappNumber: string | null`) and
  its `instructors` `GetClassInstructor` (`{ id, name, role: "instructor" | "admin", whatsappNumber }`), read through
  the `ClassContactReader` port (`provider/class-contact-reader.provider.ts`, `findContacts(userIds)` →
  `Map<userId, ClassContact>` with `role`, `status`, `whatsappNumber`, `whatsappVisible`; `GetClass`'s fifth
  constructor argument, one call for the roster's students and the view's instructors, chained after
  `findRosters`), implemented by `PrismaClassContactReader` (`apps/backend/src/modules/classes/class-contact-reader.prisma.ts`:
  one `user.findMany` by ids, nothing read for no ids). `visibleNumber` applies `ListPeople`'s rule — the number of an
  `approved` person who has one and shares it, or every such number for an admin reader, else `null` (a person
  missing from the map too); an instructor missing from the map reads `role: "instructor"`. Only `GetClass` uses it:
  `toClassItem`, `ClassRosterReader` and `ClassViewReader` don't change, so the week, "mine" and "mine/history" items
  carry no `whatsappNumber` or `role`, and guests stay `{ id, name }`. It is
  declared after `GET /classes/time-range-suggestions`, so that path keeps its handler. Both read through the
  `ClassViewReader` port (`findStartingBetween(from, to)`, `findById(id)`, and since spec 048 `findByIds(ids)` → `ClassView`, `ClassItem` with
  `Date`s), implemented by `PrismaClassViewReader` (`class-view-reader.prisma.ts`): one `findMany` / `findUnique`
  with the location and the instructors' `user` id and name. `seatsTaken` (approved students plus guests, never
  capped) and `students` (the approved students, `{ id, name, photoUrl, enrolmentId }`: `photoUrl` `null` while
  photos can't be uploaded, `enrolmentId` the approved enrolment since spec 044) come from the
  `ClassRosterReader` port (spec 040; `provider/class-roster-reader.provider.ts`, `findRosters(classIds,
  studentsLimit?)` → `Map<classId, ClassRoster>` in one read; students in the order they were approved, then by
  user id; a class missing from the map reads `seatsTaken: 0`, `students: []` and `guests: []` in
  `toClassItem(view, roster, myEnrolment, showGuestNames)`). Since spec 045 the roster also carries `guests`
  (`ClassGuest` `{ id, name }`, uncapped, in the order they were added, then by id; `name` `null` once erased), and
  the class item answers `guests: [{ id, name }]` with the name only when `canSeeGuestNames(actor, view)` — an
  admin, or an instructor of the class — and `null` for everyone else (visibility in the use cases, D-03).
  `ListWeekClasses` asks once for the whole week with `CLASS_CARD_STUDENTS_LIMIT` (4, what a card shows);
  `GetClass` — and so the answers of `PUT /classes/:id` and `POST /classes/:id/cancel` — asks for one class with
  every student. It is implemented by `PrismaClassRosterReader` (`apps/backend/src/modules/enrolment/`, spec 041:
  the `approved` enrolments, students by `decidedAt` then user id, the cap applied per class while `seatsTaken`
  counts them all; spec 045: a second read of the classes' `guests`, counted in `seatsTaken`). `myEnrolment` (spec 041) is the caller's latest enrolment in the class, any role, from the
  `ViewerEnrolmentReader` port (`provider/viewer-enrolment-reader.provider.ts`, `findLatest(viewerId, classIds)` →
  `Map<classId, ViewerEnrolment>`, one read; `toClassItem(view, roster?, myEnrolment?)`, `null` when missing),
  implemented by `PrismaViewerEnrolmentReader` (newest by `requestedAt` desc then `id` desc); `GetClass` and
  `ListWeekClasses` take it as their third constructor argument. The API never returns a state: `getClassState(startsAt,
  endsAt, now, cancelledAt?)` (`model/class-state.ts`, `not-started` / `started` / `finished`, or `cancelled`
  whenever `cancelledAt` is set — spec 033) is computed by the caller, which always passes the cancellation.
- A student's own classes (spec 048), both declared before `GET /classes/:id`: `GET /classes/mine` (`ListMyClasses`) →
  200 `{ items: ClassItem[] }`, unpaged: the classes whose `endsAt` is after now (cancelled ones included) where the
  caller has any enrolment, by `startsAt` then `id`, each with `myEnrolment` (the latest). `GET
  /classes/mine/history?from=YYYY-MM-DD&to=YYYY-MM-DD` (`ListMyClassHistory`; by period since spec 053) → 200
  `{ items }`, unpaged: the classes that ended (`endsAt <= now`), aren't cancelled, and where the caller's latest
  enrolment (by `requestedAt` desc, then `id` desc) is `approved`, whose start falls on an America/Fortaleza day from
  `from` to `to` (`startsAt >= toInstant(from, 0)` and `< toInstant(to + 1 day, 0)`), newest `startsAt` first, then
  `id` desc. Both are required: a missing or unreal date → 422 `class.from.invalid` / `class.to.invalid` (`isValidIsoDate`,
  collected); then `to` before `from` or more than `MY_CLASS_HISTORY_MAX_DAYS` (42, the largest month grid) days
  counting both ends → 422 `class.range.invalid`. Both routes are for approved students: `assertIsStudent` (exported
  from `list-my-classes.usecase.ts`) answers 403 `user.status.notApproved`, then `enrolment.role.notStudent` for other
  roles, before the query is checked. The ids come from the `MyClassesReader` port
  (`provider/my-classes-reader.provider.ts`: `findCurrentClassIds(studentId, now)` → `string[]`,
  `findHistoryClassIds(studentId, now, from, to)` → `string[]`, `to` exclusive), implemented by
  `PrismaMyClassesReader` (`apps/backend/src/modules/enrolment/my-classes-reader.prisma.ts`: one `findMany` for the
  current ids; for the history, one raw query on the student's latest enrolment per class by
  `DISTINCT ON (class_id)`, with `c.starts_at >= from AND c.starts_at < to`). The classes are then loaded with
  `ClassViewReader.findByIds(ids)` (one `findMany`, nothing read for no ids; any order, a missing id left out) and
  built by `toMyClassItems` as cards (`CLASS_CARD_STUDENTS_LIMIT`, the viewer's latest enrolment, guests' names
  hidden); the history keeps the reader's order.
- The classes a person teaches (spec 057): `GET /classes/teaching` (`ListTeachingClasses` in
  `usecase/list-teaching-classes.usecase.ts`), declared after `mine/history` and before `GET /classes/:id` → 200
  `{ items: ClassItem[], teachesAny: boolean }`, unpaged: `items` are the classes whose `endsAt` is after now (the
  classes clock; cancelled ones included) where the caller is one of the instructors, by `startsAt` then `id`, built
  with `toClassItem` as cards (`CLASS_CARD_STUDENTS_LIMIT`, guests' names shown, `myEnrolment: null`); `teachesAny`
  says whether the caller is an instructor of any class in any state (a deleted class's `class_instructors` rows go
  with it by cascade). For approved instructors and admins: `assertIsTeacher` (exported from the use case) answers
  403 `user.status.notApproved`, then 403 `user.role.notTeacher` for students; no token → 401. The port
  `TeachingClassesReader` (`provider/teaching-classes-reader.provider.ts`: `findCurrentClassIds(teacherId, now)` →
  `string[]`, `teachesAny(teacherId)` → `boolean`) is implemented by `PrismaTeachingClassesReader`
  (`apps/backend/src/modules/classes/teaching-classes-reader.prisma.ts`: one `schoolClass.findMany` with
  `instructors: { some: { userId } }`, and one `classInstructor.findFirst` by `userId`), a provider of
  `ClassesModule`; both reads run together, then the views come from `ClassViewReader.findByIds` sorted by start then
  id. Fake `FakeTeachingClassesReader` in `modules/classes/test/mock/`; e2e in
  `apps/backend/test/teaching-classes.e2e-spec.ts` (fixed classes clock).
- The classes a person taught (spec 062): `GET /classes/teaching/history?from=YYYY-MM-DD&to=YYYY-MM-DD`
  (`ListTeachingClassHistory` in `usecase/list-teaching-class-history.usecase.ts`), declared after `GET
  /classes/teaching` and before `GET /classes/:id` → 200 `{ items: ClassItem[] }`, unpaged: the classes where the
  caller is one of the instructors, that ended (`endsAt <= now`, the classes clock; a class under way isn't listed),
  aren't cancelled, and whose start falls on an America/Fortaleza day from `from` to `to`, newest `startsAt` first,
  then `id` desc; built with `toClassItem(view, roster, undefined, true)` as cards (`CLASS_CARD_STUDENTS_LIMIT`,
  guests' names shown, `myEnrolment: null`). Access is `assertIsTeacher`'s, checked before the period (403
  `user.status.notApproved`, 403 `user.role.notTeacher`, no token 401). The period is checked exactly as the student's
  history, by the shared `toHistoryPeriod(from, to)` (`usecase/class-history-period.ts`, also home of
  `MY_CLASS_HISTORY_MAX_DAYS`, still exported from the package; `ListMyClassHistory` uses it too): 422
  `class.from.invalid` / `class.to.invalid` (collected), then 422 `class.range.invalid`; it answers the instants
  `[00:00 Fortaleza on from, 00:00 on the day after to)`. The ids come from
  `TeachingClassesReader.findHistoryClassIds(teacherId, now, from, to)` (`to` exclusive), implemented by
  `PrismaTeachingClassesReader` with one `schoolClass.findMany` (`endsAt <= now`, `cancelledAt: null`, `startsAt` in
  `[from, to)`, `instructors: { some: { userId } }`, ordered by `startsAt` desc then `id` desc); the views come from
  `ClassViewReader.findByIds` in the reader's order (a missing id left out, nothing read for no ids). The fake takes the
  history as a third constructor argument (`historyCalls`); e2e in the "history" describe of
  `teaching-classes.e2e-spec.ts`.
- `PUT /classes/:id` (admins; spec 032, `EditClass` in `usecase/edit-class.usecase.ts`) `{ discipline, level, date,
  start, end, locationId, instructorIds, capacity, notes? }` (`date` `YYYY-MM-DD`, `start` / `end` `HH:mm`,
  Fortaleza, turned into `startsAt` / `endsAt` with `toInstant` from `model/class-batch.ts`; the whole class every
  time) → 200 the updated `ClassItem` (the controller runs `EditClass`, which returns `{ id }`, then `GetClass`).
  Order: access; a non-UUID id (no lookup) or no class (`SchoolClassRepository.findById`) → 404 `class.notFound`;
  shape errors in one 422 `ValidationException` (keys in [modules/classes.md](modules/classes.md)); then, alone and
  in order, 409 `class.cancelled` (spec 033, whatever the clock), 409 `class.finished` (now ≥ `endsAt`), 409 `class.started` (now ≥ `startsAt` and a class field
  differs), 422 `class.location.notFound`, 422 `class.location.archived` (spec 037: only when the location changes;
  keeping a class's archived location is accepted), 422 `class.instructors.invalid` (only the ids not already on the class
  go through `TeacherLookup`), 422 `class.startsAt.past` (not started and the new start ≤ now), 422
  `class.capacity.belowSeatsTaken` (`details: { seatsTaken }`). "Differs" compares discipline, level, `startsAt`,
  `endsAt`, location id, capacity and trimmed notes (`null` for none), and the instructors as a set; nothing
  differing → 200 with no write (not even `updatedAt`) and no notification. Otherwise
  `SchoolClassRepository.update(schoolClass, { clearDeadline, clearReminder })` (one `$transaction`, see
  Persistence; `clearDeadline` is true when a class field differs — exactly the details the language model reads —
  so the deadline is cleared in the same write, and kept when only the instructors change, spec 036;
  `clearReminder` is true only when `startsAt` changes, so the same write sets `reminder_sent_at` to null and the
  new start is reminded, spec 054 — the stored mark is never written from the entity, so an edit can't undo a mark
  the reminder job set meanwhile; last save wins; it returns `false` when the
  class was cancelled after it was read, which `EditClass` turns into 409 `class.cancelled` with nobody
  notified), then, all except the
  caller and each swallowed when it throws: `ClassChangeNotifier.classEdited({ instructorIds, studentIds?, classId,
  discipline, startsAt })` when a class field differs, to the kept instructors and, since spec 047, the students of
  the `ClassAudienceReader` port (`provider/class-audience-reader.provider.ts`, `EditClass`'s eighth constructor
  argument: `findClassAudience(classId)` → the ids with an `approved` or `pending` enrolment, each once;
  `findLocationAudience(locationId, now)` → `{ userId, count }[]` over the location's upcoming, not cancelled
  classes; `studentIds` absent when none; a failed read tells the instructors only; skipped when nobody is left), `ClassAssignmentNotifier.classAssigned({
  count: 1, … })` to the added ones and `classUnassigned({ instructorIds, classId, discipline, startsAt })` to the
  removed ones. Seats taken come from the `SeatCounter` port (`provider/seat-counter.provider.ts`,
  `countSeatsTaken(classId)`), implemented by `PrismaSeatCounter` (`apps/backend/src/modules/enrolment/`, spec 041:
  the class's `approved` enrolments, plus its guests since spec 045), so deleting a class with a guest answers 409
  `class.delete.notEmpty` and an edit can't lower the capacity below the seats taken including guests (422
  `class.capacity.belowSeatsTaken`).
- `POST /classes/:id/cancel` (admins; spec 033, `CancelClass` in `usecase/cancel-class.usecase.ts`) `{ message? }`
  → 200 the cancelled `ClassItem` (the controller runs `CancelClass`, then `GetClass`). Order: access; a non-UUID
  id (no lookup) or no class → 404 `class.notFound`; a `message` that is present, not `null` and not a string, or
  longer than 300 characters after trimming (`CLASS_CANCELLATION_MESSAGE_MAX` in `model/class-limits.ts`) → 422
  `ValidationException` `class.cancellationMessage.max.length`; then 409 `class.cancelled` (already cancelled,
  whatever the clock), then 409 `class.finished` (now ≥ `endsAt`); a started class is cancelled. The message is
  trimmed, blank or absent stored as `null`. `SchoolClassRepository.cancel(id, now, message)` is the conditional
  write of Persistence; `false` (a concurrent cancel won) → 409 `class.cancelled`. Then (spec 041) the
  `ClassEnrolmentsCloser` port (`provider/class-enrolments-closer.provider.ts`, `closeOpenEnrolments(classId)` →
  student ids; `CancelClass`'s third constructor argument), implemented by `EnrolmentClassEnrolmentsCloser`
  (`apps/backend/src/modules/enrolment/`, running enrolment's `CloseClassEnrolments`), ends the class's open
  enrolments as `classCancelled`; a throwing closer is swallowed (the class stays cancelled, the enrolments open).
  Then `ClassChangeNotifier.classCancelled({ instructorIds, studentIds?, classId, discipline, startsAt, message })`
  — the instructors except the caller, and the closed students in `studentIds` (absent when none; the adapter
  notifies the union, each person once) — skipped when nobody is left, swallowed when it throws. Stored as
  `classes.cancelled_at` / `classes.cancellation_message` (migration `classes-add-cancellation`); `SchoolClass` and
  `ClassView` carry `cancelledAt` / `cancellationMessage`. Nobody stores who cancelled.
- `DELETE /classes/:id` (admins; spec 034, `DeleteClass` in `usecase/delete-class.usecase.ts`, handler `remove`), no
  body → 204 with no content. Order: access; a non-UUID id (no lookup) or no class → 404 `class.notFound`; 409
  `class.cancelled` (whatever the clock); 409 `class.started` (now ≥ `startsAt`, so a finished class too); 409
  `class.delete.notEmpty` with `details: { seatsTaken, pendingRequests }` when either count is above 0 — seats
  from `SeatCounter`, pending requests from the `PendingRequestCounter` port
  (`provider/pending-request-counter.provider.ts`, `countPendingRequests(classId)`), implemented by
  `PrismaPendingRequestCounter` (`apps/backend/src/modules/enrolment/`, spec 041: the class's `pending`
  enrolments). Then
  `SchoolClassRepository.delete(id, now)`, the conditional delete of Persistence; on `false` the class is read
  again: gone → 404 `class.notFound` (a concurrent delete won), cancelled → 409 `class.cancelled`, else 409
  `class.started`. Then `ClassChangeNotifier.classDeleted({ instructorIds, discipline, startsAt })` (the values
  read before deleting) to the class's instructors except the caller (skipped when none is left; swallowed when it
  throws). Nothing of the class is kept; notifications already sent about it stay.
- Releasing a person's upcoming classes (spec 035): `ReleaseUpcomingClasses`
  (`usecase/release-upcoming-classes.usecase.ts`, input `{ userId }`, output `{ released, withoutInstructor }`)
  has no actor — it runs for an account event, never through HTTP. It reads
  `SchoolClassRepository.findUpcomingTaughtBy(userId, now)` (the person among the instructors, `startsAt > now`,
  `cancelledAt` null, sorted by `startsAt` then `id`), returns zeros with no write when there is none, else takes
  the person off all of them in one `removeInstructor(userId, classIds)`. The classes whose instructors were only
  that person are counted, and when there is at least one, `NoInstructorNotifier.classesWithoutInstructor({ count,
  classId, discipline, startsAt, excludeUserIds: [userId] })` (`provider/no-instructor-notifier.provider.ts`) runs
  once with the earliest of them, swallowed when it throws; a failed write propagates and tells nobody. Started,
  finished and cancelled classes keep the person. The "no instructor" flag is computed, never stored:
  `isWithoutInstructor(instructorCount, state)` (`model/class-flags.ts`) is true only for 0 instructors and
  `not-started`.
- Cancellation rules and deadlines (spec 036). `GET /cancellation-rules` (any approved account;
  `ListCancellationRules`) → 200 `{ surf: string | null, skate: string | null }`. `PUT
  /cancellation-rules/:discipline` (admins; `SaveCancellationRule`) `{ text }` → 200 the same shape; order: access,
  a discipline other than `surf` / `skate` → 422 `cancellationRule.discipline.invalid`, a missing, non-string or
  blank text → 422 `cancellationRule.text.required`, over 2000 characters after trimming → 422
  `cancellationRule.text.max.length`; the text is stored trimmed, and the same trimmed text writes nothing. The
  `cancellation-rule` aggregate (`modules/classes/src/cancellation-rule/`: `CancellationRule` with `discipline`,
  `text`, `updatedBy`, `updatedAt`; `CancellationRuleRepository` with `findAll()` and `save(rule, now)`) lives in
  the classes module because a rule change clears classes; `CancellationRulesController` and
  `PrismaCancellationRuleRepository` sit in `apps/backend/src/modules/classes/`. The deadline: the
  `CancellationDeadlineDescriber` port (`provider/cancellation-deadline-describer.provider.ts`) takes a
  `CancellationDeadlineRequest` — `{ rule, class: { discipline, level, date, weekday, start, end, locationName,
  locationAddress, capacity, notes } }`, Fortaleza `YYYY-MM-DD` / English weekday / `HH:mm`, never an id or a person
  — and answers a `CancellationDeadlineDescription` (`{ kind: "minutesBefore", minutes }` 0–43200 | `{ kind:
  "daysBeforeAt", days, time }` 0–30 days, `HH:mm` | `{ kind: "classStart" }` | `{ kind: "unclear" }`);
  `computeCancellationDeadline(description, startsAt)` (`model/cancellation-deadline.ts`) turns it into an instant
  in Fortaleza, capped at the start, or `null` when unusable. `WorkOutCancellationDeadlines`
  (`usecase/work-out-cancellation-deadlines.usecase.ts`, no actor, output `{ workedOut, failed }`) reads the
  rules, asks `SchoolClassRepository.findNeedingDeadline({ now, disciplines, limit: 20 })` (disciplines with a
  rule; `startsAt > now`, not cancelled, no deadline, next attempt null or due; never-tried first, then `startsAt`,
  `id` — two queries in Prisma), describes 5 at a time, and writes through `saveDeadline(id, revision, deadline)`
  (attempts reset) or `recordDeadlineFailure(id, revision, attempts, nextAttemptAt)` with the wait
  `deadlineBackoffMinutes(n) = min(2^(n−1), 60)`; a describer that throws, a missing location or an unusable answer
  is a failure, and a dropped write counts as neither. A discipline without a rule is never sent. The "no
  cancellation deadline" flag is computed, never stored: `isWithoutDeadline(cancellationDeadline, state)` (in
  `model/class-flags.ts`) is true only for a `null` deadline and `not-started`.
- The clock is the module's `ClockProvider` port, implemented by a `SystemClockProvider` local to
  `ClassesModule`, so the e2e suite fakes the time without touching auth's clock.
- Mobile (`src/modules/classes`): queries `["locations"]` (`useLocations`), `["classes", "time-range-suggestions"]`
  (`useTimeRangeSuggestions`; a failed load shows only "Novo horário", no toast) and `["people", "teachers"]`
  (`useTeachers`: every page of `GET /people?role=instructor,admin&perPage=50`); mutations `useCreateLocation`
  (adds the new location to the `["locations"]` cache) and `useCreateClasses`, both without retry. `useNewClassScreen`
  builds the body with `buildBatchRequest` (always all seven weekdays; `excludedDates` only when not empty;
  `skipPast: true` only when a selected time has already started today and today is among the dates — the count
  leaves those classes out, and the chip stays selectable with the `timeRanges.hintPast` hint; trimmed notes,
  omitted when blank),
  guards a double press with a ref, and maps errors with `getClassErrorKey` (`utils/class-error.ts`):
  `class.startsAt.past` → `newClass.errors.past`; `class.instructors.invalid` → its toast and the teachers query
  refetched; `class.location.notFound` → its toast and the locations refetched; `class.location.archived` (spec
  037, Nova aula and Editar aula) → `newClass.errors.locationArchived`, the locations refetched and the selection
  cleared; 409 `location.name.duplicate` →
  `locationSheet.duplicate` inline on the location screen (the list refetched); `NetworkError` → no connection;
  `SessionExpiredError` → nothing; else generic. On 201: toast `newClass.created` and `router.back()`;
  `useCreateClasses` invalidates `["classes", "week"]` on success only. Nova aula reads an optional `date` route
  param (`initialRange` in `utils/calendar.ts`): a real `YYYY-MM-DD` today or later becomes a single-day range and
  the calendar opens on its month; anything else is ignored.
- Mobile week and details (spec 030): one `ClassesWeekScreen` (`screens/classes-week.screen.tsx`; props
  `titleKey`, `classRoute`, `canCreate`) is the student's Agenda (`(tabs)/index.tsx`) and the Aulas tab of
  instructors and admins (`canCreate` for admins only: the header "+", "Criar aula" and "Criar aula neste dia",
  the two buttons only on today or later, each opening `routes.admin.newClass({ date })` — without `date` on a
  past day). Since spec 031 its selection is one `selectedDate` (opening on Fortaleza's today) shown in the shared
  `WeekMonthCalendar`; the list loads `useWeekClasses(mondayOf(selectedDate))` (`["classes", "week", <Monday>]`,
  `GET /classes?date=<Monday>`, built by the exported `weekClassesOptions(weekStart)`), which alone drives the
  loading and error-with-retry states. The dots come from `useVisibleWeeksClasses({ from, to })`
  (`hooks/use-visible-weeks-classes.hook.ts`): `useQueries` over each Monday of the range the calendar reports
  (`onVisibleRangeChange`; one week, or the 4 to 6 weeks of the month grid) with the same options, so the week and
  the month share the cache; a failed week just contributes no items. `markedDates` is the Fortaleza days with a
  class, `markedLabel` `classesWeek.hasClasses`. Pull-to-refresh refetches every visible week; its spinner is local
  state around that refetch, not the queries' `isRefetching` (a month mounting cached weeks refetches them in the
  background and must not show it). Whenever the screen is focused again (`useFocusEffect`), it refetches every
  `["classes", "week"]` query that is invalidated (spec 033): a class cancelled or edited on a screen above it
  invalidated its week while its observers weren't refetching, so without this the card stayed stale. The cards are `ClassCard` (`components/class-card/`).
  Since spec 050 the screen filters by sport in the app, with no API parameter: `useClassesWeekScreen` keeps
  `discipline` (`DisciplineFilterValue`, `"all" | ClassDiscipline` in `classes.types.ts`; local state starting at
  `"all"`, so it lasts across days, weeks, the month and a refresh, and resets when the screen mounts again) and
  filters both `dayItems` and `markedDates` with it; changing it sends no request. It is set by `DisciplineFilter`
  (`components/discipline-filter/`, props `value` / `onChange`), rendered after the list outside its state branches,
  so every role sees it while loading, on an error and on an empty day. `DisciplineFilter` is its own
  `SafeAreaProvider` (absolute over the screen), so the bottom inset includes the native tab bar the screen extends
  under, and renders `DisciplineFilterMenu` (`components/discipline-filter-menu/`), whose hook
  (`useDisciplineFilterMenu`: `isOpen`, `open`, `close`, `select`, `buttonTurnStyle`) holds the open state. Both
  buttons are `DisciplineFilterButton` (`components/discipline-filter-button/`): a 56×56 `grape` `TouchableOpacity`
  (`h-14 w-14 rounded-card`, `shadowStyle("fab")`, Ionicons `filter` / `close`) inside the `Animated.View` that
  turns. Closed, only the `filter` button is drawn, in the screen, at the bottom right. Open (spec 051), the backdrop,
  the options and the `close` button are drawn in a transparent, full-window React Native `Modal`
  (`animationType="none"`, `statusBarTranslucent`, `navigationBarTranslucent`, `onRequestClose` closes, so Android's
  back button closes it), because the native Stack header and `NativeTabs` sit above the screen's views and the
  scrim must cover them too. The `Modal` holds a `bg-scrim` `Pressable` backdrop over the whole window and a layer
  placed at the provider's frame (`useSafeAreaFrame()`) with its bottom inset, so the `close` button lands exactly on
  the closed one; the closed button stays in the screen, hidden from accessibility while open. The three label-only
  options ("all", "surf", "skate"; `h-11 px-4 rounded-control`, `ds-text-pill`, `surface` + `line`, or `grape` +
  `text-on-color` when selected, `accessibilityState.selected`, `shadowStyle("menuOption")`) stack above the button;
  choosing one closes and calls `onChange`, and the button or the backdrop close without it. The motion uses
  Reanimated: on opening the backdrop fades in (`FadeIn`, 180 ms) and each option rises 14 px while fading in
  (`FadeInDown`, 220 ms, 40 ms apart), the `entering` builders in `discipline-filter.constants.ts` (one builder per
  option, since a builder's methods change it in place); both buttons share one turn to −90° and back over 200 ms
  (`buttonTurnStyle`); closing is instant, since the `Modal` goes at once. The list's
  `paddingBottom` adds `DISCIPLINE_FILTER_CLEARANCE` (the button's 56 plus its 16 gap) so the last card scrolls clear
  of it. Copy under `classesWeek.disciplineFilter`. `ClassDetailsScreen`
  (`screens/class-details.screen.tsx`, route `/<role>/class/[id]`) loads `useClass(id)` (`["classes", "detail",
  id]`, no retry on a 404 or a `SessionExpiredError`) and names the session's user "Você". Both compute the state
  with `getClassState` from `@rochas-surf-school/classes` and `useNow()` (`hooks/use-now.hook.ts`, the phone's
  clock re-read every 60 s while mounted). Loading is a `grape` `ActivityIndicator`; a failed load shows the
  error with "Tentar novamente", a 404 on the details "Esta aula não existe mais." without retry, and a
  `SessionExpiredError` nothing. Copy lives under `classesWeek` and `classDetails`.
- Mobile editing (spec 032): `ClassDetailsScreen` takes `canEdit` (set only by `admin/class/[id].tsx`); "Editar
  aula" in its class tools (spec 033, below) opens `routes.admin.editClass(id)`. `EditClassScreen` (`screens/edit-class.screen.tsx` + hook, route
  `/admin/edit-class/[id]`) loads `useClass(id)`, `useLocations`, `useTimeRangeSuggestions` and `useTeachers`, and
  keeps only the admin's changes over the class's values. The day is `DateRangeCalendar` with `single` (a press
  selects only that day, no summary) and the time `TimeRangePicker` with `single` (a press selects only that chip,
  the selected one stays; on today a chip starting at or before now is blocked except `ownRange`, the class's own
  range while it hasn't started); the class's own range and location are always listed, and its instructors who
  aren't in `useTeachers` are listed too. A started class (by `getClassState` and `useNow`, or after the server
  answers `class.started` — `startedByServer`) shows the `sun` banner and only the instructors, and sends the
  stored values back with them. The submit is enabled when the form is valid and a field differs (the same
  comparison as the backend), guarded by a ref against a double press, and sent by `useEditClass`
  (`apiPut`, no retry; invalidates `["classes", "week"]` and `["classes", "detail", id]` on success); then toast
  `editClass.saved` and `router.back()`. Errors map with `getEditClassErrorKey` (`utils/class-error.ts`, with
  `isClassStartedError`, `isClassFinishedError`, `isClassNotFoundError` and `getSeatsTaken`): `class.started` →
  its toast and the class refetched; `class.finished` and 404 → their toast and back; `class.cancelled` (spec 033) →
  `editClass.errors.cancelled`, `["classes"]` invalidated and back; seats taken → `editClass.errors.seatsTaken`
  with `count`; the rest as Nova aula's `getClassErrorKey` (with the same refetches). A loaded class with
  `cancelledAt` shows `editClass.errors.cancelled` instead of the form and its footer. Since spec 047 the footer's
  `note` (from the hook) lists `editClass.audience.instructors`, `.students` and `.pending` (from `students.length`
  and `pendingRequests`, only the non-zero ones) in `editClass.noteWithAudience`, joined by `joinAudience`
  (`utils/audience.ts`: "a", "a and b", "a, b and c" with the locale's `audience.and`), or `editClass.note` when
  there is no student and no request. Copy lives under `editClass`.
- Mobile class tools and cancelling (spec 033): with `canEdit`, a loaded class that is neither finished nor
  cancelled (a started one included) shows a round 44×44 tools button (`construct-outline`, `bg-surface`,
  `shadowStyle`, label `classDetails.tools`) at the right of the details' header, opening `ClassToolsSheet`
  (`components/class-tools-sheet/`: a `BottomModal` titled `classTools.title`; since spec 049 its actions are four
  `ClassToolCard`s, see "Mobile class details design" below; edit and cancel close the sheet first, the message
  card has no action). "Cancelar aula" opens `CancelClassSheet` (`components/cancel-class-sheet/`:
  `BottomModal` with the description — since spec 047 built by its hook from the `studentCount`, `pendingCount` and
  `instructorCount` props (the details' hook passes `students.length`, `pendingRequests` and the instructors other
  than the viewer) as `cancelClass.descriptionWithAudience` with the non-zero `cancelClass.audience.*` parts joined
  by `joinAudience`, or `cancelClass.description` when all are zero —, a `TextArea` with `maxLength` 300 and its counter, a `danger` confirm with
  `loading` and a `ghost` "Manter aula"; the text clears on close; it confirms with the trimmed message, or none
  when blank). The details' hook sends it once (a ref guards a double press) through `useCancelClass`
  (`hooks/use-cancel-class.hook.ts`: `apiPost` to `/classes/{id}/cancel`, no retry, invalidating `["classes"]` on
  success); on 200 toast `cancelClass.done`, the sheet closes and the details stay. Errors map with
  `getCancelClassErrorKey` (`utils/class-error.ts`, with `isClassCancelledError`): `class.cancelled` /
  `class.finished` → their toast, the sheet closes and the class is refetched; 404 → `classDetails.notFound` and
  `router.back()`; `NetworkError` → no connection; `SessionExpiredError` → nothing; else generic. A cancelled class
  (`ClassItem.cancelledAt`) draws, on `ClassCard`, the `Chip` `classesWeek.cancelled` on `bad-tint` (text `bad`,
  `close-circle-outline`) instead of the clock chips, the time range `line-through` in `ink-2`, with no `sun`
  border and no fading; on the details, one `bad-tint` banner `classDetails.cancelled.title` with the
  `cancellationMessage` under it as stored, or `classDetails.cancelled.description`. Copy lives under
  `classTools`, `cancelClass`, `classDetails.cancelled` and `classDetails.tools`.
- Mobile deleting (spec 034): `ClassToolsSheet` takes `onDelete` and, since spec 049, `deleteState` (`available`
  only while the class is `not-started` and `seatsTaken` is 0; `started` / `enrolled` disable the "Apagar aula"
  card, `classTools.delete`, which closes the sheet first when enabled). It opens `DeleteClassSheet` (`components/delete-class-sheet/`:
  component, types and index, no hook — the variant is a prop the details control): a `BottomModal` with the
  title, the class line (`{discipline} {level} · {dateLine}, {timeRange} · {location}`) and the description, then
  in the `confirm` variant a `danger` "Excluir aula" with `loading`, in the `notEmpty` variant a `danger` "Cancelar
  aula" (`onCancelInstead`), and in both a `ghost` "Manter aula"; it always opens in `confirm`. The details' hook
  sends it once (a ref guards a double press) through `useDeleteClass` (`hooks/use-delete-class.hook.ts`:
  `apiDelete` to `/classes/{id}`, no retry; on success it removes `["classes", "detail", id]` from the cache and
  invalidates `["classes", "week"]`); on 204 toast `deleteClass.done`, the sheet closes and `router.back()`.
  Errors: `isClassNotEmptyError` (409 `class.delete.notEmpty`) switches the sheet to `notEmpty` with no toast, and
  its "Cancelar aula" closes it and opens `CancelClassSheet`; the toasts map with `getDeleteClassErrorKey`
  (`utils/class-error.ts`): `class.started` / `class.cancelled` → their toast, the sheet closes and the class is
  refetched; 404 → `classDetails.notFound` and `router.back()`; `NetworkError` → no connection;
  `SessionExpiredError` → nothing; else generic. Copy lives under `deleteClass` (and `classTools.delete`).
- Mobile "no instructor" flag (spec 035): `ClassCard` takes `showFlags` (default `false`) and its hook returns
  `withoutInstructor` (`isWithoutInstructor` with the state it computes); with `showFlags`, a flagged class shows
  the `warn` `Chip` `classesWeek.noInstructor` (`person-remove-outline`) in the right chip slot. (The card's
  instructors footer of spec 035 left the card in spec 040; instructors are shown only on the details.)
  `ClassesWeekScreen` takes `showFlags` and passes it to each card; only the admin's Aulas route sets it. The
  details' hook returns `showNoInstructor` (`canEdit` and `isWithoutInstructor`); the screen draws it first among
  the state banners: a `Pressable` row (role `button`, `min-h-11`) on `bg-warn-tint` with `person-remove-outline`
  and `classDetails.noInstructor.title` / `.description`, opening `routes.admin.editClass(id)`. The instructors
  section shows `classDetails.noInstructorAssigned` in `text-ink-2` when the list is empty, for every role.
- Mobile cancellation rules and deadlines (spec 036). The `src/modules/cancellation-rules/` module: queries
  `["cancellation-rules"]` (`useCancellationRules`, `GET /cancellation-rules`, optional `enabled`) and the mutation
  `useSaveCancellationRule` (`apiPut` to `/cancellation-rules/{discipline}`, no retry, writes the answer to the
  cache; errors toast no-connection or generic, an expired session nothing). `CancellationRulesSheet`
  (`components/cancellation-rules-sheet/`, loads only while visible) is opened by the Profile's "Regras de
  cancelamento" row for every role. `CancellationRulesScreen` (`screens/`, route
  `src/app/(private)/admin/cancellation-rules.tsx`, `routes.admin.cancellationRules`) is opened by the admin
  home's row after "Criar aulas": a `SegmentedControl` with one draft per discipline, the tips card, a `TextArea`
  with `maxLength` 2000 (`CANCELLATION_RULE_TEXT_MAX`), the status note and the primary save `Button`, enabled while
  the trimmed draft is non-blank and differs from the saved text. `ClassCard`'s hook also returns
  `withoutDeadline` (`isWithoutDeadline`); with `showFlags` the right-hand chips stack in one column (state chips,
  then "Sem instrutor", then the `warn` `Chip` `classesWeek.noDeadline` with `calendar-clear-outline`). The
  details' hook returns `showNoDeadline` (`canEdit` and the flag) — a `bg-warn-tint` banner after the no-instructor
  one, opening `routes.admin.cancellationRules` — and `cancellationDeadline`, formatted for every role unless the
  class is cancelled by `formatDeadline` (`utils/week.ts`: the first three letters of date-fns `EEEE`, then `d MMM`
  and `HH:mm`, Fortaleza, the app's locale, because pt-BR `EEE` spells out "segunda"), drawn as
  `classDetails.cancellationDeadline` under the date line. Copy under `cancellationRules`, `admin.home`,
  `classesWeek.noDeadline` and `classDetails.noDeadline` / `.cancellationDeadline`.
- Mobile locations (spec 037). `ClassLocation` carries `latitude`, `longitude` and `upcomingClasses`, and the class
  item's location the point (`MapPoint`, `toMapPoint`). Hooks (`hooks/`, no retry): `useCreateLocation` sends the
  point; `useEditLocation` (`apiPut` to `/locations/{id}`; on 200 replaces the row in `["locations"]` with
  `replaceLocation` and invalidates `["classes"]` without awaiting, since the edit applies to every class and may
  clear their deadlines); `useArchiveLocation` (`apiPost` to `/locations/{id}/archive`; on 204 drops the row with
  `removeLocation`); `useAddressSuggestions(text, sessionToken)` (a query keyed `["locations", "suggestions",
  sessionToken, query]`, the trimmed text debounced 300 ms by `useDebouncedValue`, enabled from 3 characters,
  `staleTime: Infinity`, the app language through `toBackendLocale`) and `useAddressPlace(sessionToken)` (a mutation
  that GETs the place). `newSessionToken()` (`utils/session-token.ts`) makes a UUID v4 from `Math.random` (no crypto
  polyfill) once per opening of the location screen. Since spec 065, "Novo local" and "Editar local" are the
  screen `LocationFormScreen` (`screens/location-form.screen.tsx`, route `(private)/admin/location-form.tsx`,
  `routes.admin.locationForm(id?)`), which reads the edited location and the duplicate list from `useLocations()`
  (an `id` not among the active locations, or a failed list → toast `locationSheet.errors.gone` and back, once). The
  map is a full-screen uncontrolled `MapView` moved through its ref (`initialRegion`: the edited point at
  `PLACE_DELTA` 0.004°, else `FORTALEZA` at `MAP_DELTA`; mounted again with a `key` when an edited location arrives;
  `mapPadding` only after `onMapReady`, then the camera set once on the opening point), on the transparent shared
  header. `LocationSearchHeader` (`components/location-search-header/`) sets the header's `headerTitle` to the search
  field through `<Stack.Screen options>` and draws the floating suggestions in the screen body (a native header view
  would clip them and not take their touches): from 3 characters, `slice(0, 6)`, the match in `font-body-800`, hidden
  after a pick or a clear. `useMapPlace` (`hooks/`) turns a map tap into a point and the phone's address
  (`formatPoint`, 4 decimals, when the geocoder fails or finds nothing), an Android `onPoiClick` into the place from
  `useAddressPlace` (a point tap when that fails) and a suggestion into its place; the pin moves at once
  (`pendingPoint`), Save stays off while an address is looked up, and an answer a newer tap replaced is dropped. A
  picked place (not a tap) closes the keyboard and calls `setCamera({ center, zoom: PLACE_ZOOM 17, altitude:
  PLACE_ALTITUDE 1000 })`. `LocationAddressCard` shows the empty hint, the looking-up state, or the address over
  "<name> · <lat>, <lng>" ("Ponto escolhido no mapa" for a tap). `MyLocationButton` + `useDeviceLocation` (toast
  `locationSheet.locationDenied` on a denial or a failed read) recentre with `animateToRegion` and turn on
  `showsUserLocation`. The bottom panel is fixed, flush with the screen's bottom (`rounded-t-sheet`, the bottom inset
  as its padding) and lifted by `useKeyboardLift` (`hooks/`): it follows `useAnimatedKeyboard().height` only while
  React Native sees the keyboard (`keyboardDidShow` / `keyboardDidHide`) or Reanimated animates it, because on
  Android a screen that leaves with the keyboard open leaves Reanimated stuck at that height. The panel keeps the
  sheet's rules: Nome with the inline duplicate against the loaded list ignoring the edited location, the notify
  `Checkbox` only when editing a location with `upcomingClasses` > 0, the stacked primary button (enabled with a
  name, a point, no lookup running and no duplicate), "Cancelar" and, when editing, "Remover local", which opens
  `ArchiveLocationSheet` (`components/archive-location-sheet/`). Errors: duplicate inline (list refetched);
  `location.archived` / `location.notFound` (`isLocationGoneError`) → toast `locationSheet.errors.gone`, list
  refetched, back; else `getLocationErrorKey`. A pushed route can't call the class form back, so the screen emits
  `emitLocationCreated` / `emitLocationRemoved` (`utils/location-events.ts`) and Nova aula and Editar aula
  `subscribeLocationEvents` while mounted (`useEffectEvent`) to select the new location or clear a removed one.
  `LocationPicker` gains the managing mode (pencil rows that push "Editar local", "Novo local" hidden) and the
  `locationPicker.archived` chip; `FormSection` takes an `action` link ("Gerir" / "Concluir");
  `useLocationManagement` (`hooks/`) holds that mode, shared by Nova aula and Editar aula. A removed location that
  was selected clears the selection
  (Nova aula `locationId: null`; Editar aula `""`, so Save turns off). On Editar aula a class whose location isn't in
  the loaded list keeps it as its selected row, marked archived once the list has loaded. On the details,
  `LocationMapPreview` (`components/location-map-preview/`) shows, only for a location with a point, a fixed 96 pt
  `MapView` (scroll, zoom, rotate and pitch off, `PREVIEW_DELTA` 0.01°) with a `Marker`, for every role and for
  cancelled classes; since spec 049 it is the map alone, inside `ClassLocationCard` (below), whose hook holds
  "Direções" (`Linking.openURL(getDirectionsUrl(point))`, toast `classDetails.directionsUnavailable` on failure). Copy under `locationSheet`, `locationPicker`, `archiveLocation`,
  `newClass.errors.locationArchived` and `classDetails.directions*`.
- Mobile seats and students (spec 040). `ClassItem` carries `seatsTaken` and `students` (`ClassStudent`: `id`,
  `name`, `photoUrl`). `utils/occupancy.ts`: `getOccupancyPercent` (0–100, rounded), `isClassFull` (seats taken ≥
  capacity), `getOccupancyTone` (`bad` when full, `sun` above 80%, else `lagoon` for surf / `tan` for skate),
  `getFreeSeats`, `getHiddenSeats` (seats taken minus the avatars shown: the "+N", so guests count) and
  `getStudentsLabel` (`none` / `confirmed` / `present` once finished, with the count; keys under
  `classesWeek.students`, plural `_one` / `_other`). `StudentAvatar` (`components/student-avatar/`): an `expo-image`
  photo, or the initials (`getInitials`) on `bg-sand` when `photoUrl` is `null` or the image fails (`onError`);
  `size` in points and an optional `ringed` 2 px `border-surface` for stacked avatars. `ClassCard` (AGENDA-01: card
  shadow, `line` border, the location pill, opacity .55 finished / .78 cancelled, `sun` border and primary shadow
  while started) has no instructors line; its hook returns `showOccupancy` (not started or started: a 6 px
  `bg-sand` track with the tone's fill and `classesWeek.occupancy`, in `text-bad` when full), `showFullChip` (full
  and not started: the `bad-tint` `Chip` `classesWeek.full` in the state chips' slot), `showFooter` (not cancelled:
  top border `line`, `bg-dim`, up to `CLASS_CARD_AVATARS` 4 ringed 26 pt avatars overlapping by 8, the "+N" circle
  on `sand` and the uppercase label). On the details, `ClassPeople` (`components/class-people/` + hook) is the
  `classDetails.theClass` group (rebuilt by spec 049, see "Mobile class details design" below): the instructors
  (`classDetails.you` for the viewer, `classDetails.noInstructorAssigned` when none), the students row (up to
  `CLASS_PEOPLE_AVATARS` 5 ringed avatars, "+N", the label; a `Pressable` with `accessibilityState.expanded` that
  opens the list of every student, disabled with none; with the optional `onTakeOut` (spec 044) each row of the list
  gets a "Retirar" `TouchableOpacity`, outline with `text-bad`), and `classDetails.capacity` · `spotsLeft` (plural) or
  `soldOut` in `text-bad`, hidden when finished or cancelled. The details' hook adds `showFullBanner` (loaded, `not-started`,
  full: a `bad-tint` banner `classDetails.full.title` after the cancelled / started ones), `readOnlyNoteKey`
  (instructors only: `classDetails.readOnly.teaches` when they teach the class, `.notAssigned` otherwise; a `bg-dim`
  note with `eye-outline` under the group), and `showRules` (loaded and not cancelled): a `classDetails.rules`
  group with two rows — `rules.cancellation`, opening `CancellationRulesSheet` on the details (`rulesVisible`), and
  `rules.school`, pushing `routes[<role>].schoolRules` (since spec 049 `ClassRuleRow`s, below). The instructors'
  `initials` field left the details' types (the avatar draws them).
- Mobile class details design (spec 049). `classes.types.ts` adds `ClassDetailsTeacher` (`ClassInstructor` +
  `role` + `whatsappNumber`), `ClassDetailsStudent` (`ClassStudent` + `whatsappNumber`) and `ClassDetails` (`ClassItem`
  with those lists), the answer of `useClass`, `useEditClass` and `useCancelClass`. `ClassPeople` opens with a
  `flex-row justify-between` header: the label and the capacity line in `ds-text-section-label` (`shrink text-right`,
  `text-bad` / `text-ink-2`, plus `includesTrial` for admins); the card starts with a `bg-dim` header
  (`classDetails.instructor`, plural) holding one `InstructorPill` per instructor (`components/instructor-pill/`: a
  `TouchableOpacity` `min-h-11` `rounded-full` `bg-surface`, `border-lagoon` for the viewer else `border-line`, a 32 pt
  `StudentAvatar`, labelled with the name; `onOpenInstructor`). The stacked avatars (30 pt) are the first 5 seats,
  students then guests (`ClassPeopleSeat`), a guest drawn as `GuestAvatar` (`components/guest-avatar/`: Feather
  `user` in `ink-2` on a `bg-sand` circle, labelled `classDetails.trialChip`, optional ring). The expanded list renders
  `ClassStudentRow` (`components/class-student-row/`: a `Pressable` with role `button` named after the student, 32 pt
  avatar, name, `chevron-forward` in `ink3`, or the "Retirar" button in its place, which never presses the row;
  `onOpenStudent`) and `ClassGuestRow` (`components/class-guest-row/`: not pressable, `GuestAvatar`, the name then a
  `muted` "Trial" `Chip`, or the chip alone for a `null` name; "Retirar" for admins). The details' hook keeps
  `selectedPerson` (`ClassDetailsPerson` = `Pick<Person, "name" | "role" | "whatsappNumber">`, kept after closing so the
  content stays while the sheet slides away) and `personVisible`, with `openInstructor` (the instructor's `role`),
  `openStudent` (`"student"`) and `closePerson`, and renders the People module's `PersonSheet`. "Regras" is a
  `rounded-card` `bg-surface` card of two `ClassRuleRow`s (`components/class-rule-row/`: a `Pressable` `min-h-11` with
  role `button` labelled by its title, a 34 pt `rounded-checkbox` `bg-dim` tile with a `lagoon` Ionicon, the title in
  `ds-text-section-label`, the optional value in `ds-text-list-title`, `chevron-forward`) split by a `h-px bg-line`:
  `close-circle-outline` "Cancelamento" with `rules.until` (`{{when}}`) or `rules.read`, and `shield-outline` "Regras
  da escola" with `rules.schoolCount` (plural) from `useSchoolRules` once it has at least one rule, title only while
  loading, on error or with none (`schoolRulesValue`). The notes sit in a `rounded-card` `border-line` `bg-surface`
  card with a `lagoon` `reader-outline` and the text in `ds-text-body`. `ClassLocationCard`
  (`components/class-location-card/` + hook, under `classDetails.location`, "Onde e como"): an `overflow-hidden`
  card with `LocationMapPreview` across the top when there is a point, then a row with a Feather `map-pin` in `lagoon`,
  the name (`ds-text-list-title`) and address (`ds-text-list-subtitle`), and with a point a `min-h-11` "Direções"
  `TouchableOpacity` (`ds-text-section-label text-lagoon`, Feather `arrow-up-right`). The "finished" banner is a row
  with a 24 pt `checkmark` in `ink-2` at the left of its title and line. `ClassToolsSheet` keeps its title and lays
  out four `ClassToolCard`s in two rows (`components/class-tool-card/`: a `TouchableOpacity` `min-h-11 flex-1` with
  role `button` labelled by its title and `accessibilityState.disabled`; inside, a `rounded-card` surface — `border-line
  bg-surface`, or `bg-bad-tint` for the `danger` tone, `opacity-50` when disabled — with a 40 pt `rounded-checkbox`
  tile, `bg-dim` with a `lagoon` Ionicon or `bg-surface` with a `bad` one for `danger`, the title in
  `ds-text-list-title`, `text-bad` for `danger`, and the subtitle in `ds-text-list-subtitle`): `pencil-outline` "Editar
  aula" (`classTools.editHint`), `chatbubble-outline` "Enviar mensagem" (`classTools.people` plural, or `nobody`; no
  action), `close-circle-outline` `danger` "Cancelar aula" (`notifies` plural, or `nobodyToNotify`) and
  `trash-outline` "Apagar aula" (`deleteEmpty`, or disabled with `deleteEnrolled` / `deleteStarted`). The sheet takes
  `messageCount` — the details' hook's instructors other than the viewer + `students.length` + `pendingRequests`, the
  same people the cancel sheet names (guests have no account) — and `deleteState`.

## Enrolment

Specs 041–046. The domain is `modules/enrolment` (`@rochas-surf-school/enrolment`, aggregates `src/enrolment/` and,
since spec 045, `src/guest/`), which
depends on `@rochas-surf-school/shared`, `@rochas-surf-school/auth` and `@rochas-surf-school/classes` (`ClassActor`,
`assertCanReadClasses`, the discipline type); classes never imports it. The backend adapters live in
`apps/backend/src/modules/enrolment/`: `EnrolmentModule` imports `NotificationsModule` (never `ClassesModule`),
provides the controllers (`EnrolmentController`, `GuestsController`), `EnrolmentExpiryJob`, `GuestErasureJob` and
every adapter (since spec 046 `PrismaWaitingListSetting`, `waiting-list-setting.prisma.ts`, which reads
`school_settings.waiting_list_enabled` directly — on while no row exists — so enrolment never imports the
school-settings module's code), and exports the adapters, including the six
that implement classes ports (`PrismaClassRosterReader`, `PrismaSeatCounter`, `PrismaPendingRequestCounter`,
`PrismaViewerEnrolmentReader`, `EnrolmentClassEnrolmentsCloser`, and since spec 047 `PrismaClassAudienceReader`,
`class-audience-reader.prisma.ts`: `approved` and `pending` enrolments, distinct per student, and per student and
class for a location's classes that start after `now` and aren't cancelled); `ClassesModule` imports it, so there is no Nest
import cycle.

- Model: `Enrolment` (`model/enrolment.entity.ts`) with `ENROLMENT_STATUSES` (`pending`, `approved`, `denied`,
  `withdrawn`, `expired`, `cancelled`, `takenOut`, `classCancelled`), `OPEN_ENROLMENT_STATUSES` (`pending`,
  `approved`), `ENROLMENT_REASON_MAX` 500, the fields `classId`, `studentId`, `status`, `requestedAt`,
  `ruleAcceptedAt`, `decidedAt`, `reason`, `endedAt`, and the transitions `withdraw(now)` / `expire(now)` (from
  `pending`, else 409 `enrolment.notPending`) and `closeForCancelledClass(now)` (from an open status, else 409
  `enrolment.notOpen`), each setting `endedAt`, and `approve(now)` / `deny(reason, now)` (spec 042; from `pending`,
  else 409 `enrolment.notPending`), which set `decidedAt` (and `reason`) but not `endedAt`, `cancel(now)` (spec
  043; from `approved`, else 409 `enrolment.notApproved`), which sets `endedAt`, and `takeOut(reason, now)` (spec 044;
  from `approved`, else 409 `enrolment.notApproved`), which sets `reason` and `endedAt`; `TAKE_OUT_REASON_MAX` 300. Ports (`provider/`):
  `EnrolmentRepository` (`create`, `findById`, `withdraw(id, now)` and `expire(id, now)` → `boolean`, conditional on
  `pending`, `findExpirable(now)`, `closeOpenForClass(classId, now)` → the closed enrolments; spec 042:
  `findPendingByClass(now)` → `PendingRequestsClass[]`, `approve(id, now)` → `"approved" | "full" | "notPending"`
  (locked, see Persistence), `deny(id, reason, now)` → `boolean`; spec 043: `cancel(id, now)` → `boolean`,
  conditional on `approved`, `countPendingForClass(classId)`, `releaseForStudent(studentId, now)` → the cancelled
  enrolments; spec 044: `enrolDirectly(enrolment, now)` → `DirectEnrolResult` (`enrolled` / `approved` with the
  enrolment, `alreadyApproved`, `full`; locked), `takeOut(id, reason, now)` → `boolean`, conditional on `approved`),
  `StudentLookup` (spec 044, `isApprovedStudent(id)`), `EnrolmentClassReader` (`findById` → `{ id, discipline, startsAt, endsAt, capacity, cancelledAt,
  cancellationDeadline, instructorIds, hasCancellationRule }`), `StudentNameReader`
  (`findName(id)`), `EnrolmentNotifier` (`seatRequested`, `requestExpired`, `requestApproved` / `requestDenied`
  since spec 042, `seatCancelled` since spec 043, `studentEnrolled` / `studentTakenOut` since spec 044) and
  `ClockProvider`, and since spec 046 `WaitingListSetting` (`isEnabled()`); `RequestSeat` also takes classes'
  `SeatCounter`; fakes and a factory under `test/mock/`.
- Table `enrolments` (`prisma/models/enrolment.model.prisma`, migration `20261019191737_enrolment`): `id`,
  `class_id` → `classes` `ON DELETE CASCADE`, `student_id` → `users` `ON DELETE RESTRICT`, `status` (Postgres enum
  `enrolment_status`, values exactly as `ENROLMENT_STATUSES`, camelCase), `requested_at`, `rule_accepted_at`,
  `decided_at`, `reason`, `ended_at`, timestamps; indexes on `(class_id, status)` and `student_id`, plus the partial
  unique index of Persistence. `SchoolClass` and `User` carry the inverse relation.
- `POST /classes/:id/enrolments` (`RequestSeat`) `{ acceptCancellationRule? }` → 201 `EnrolmentOut` `{ id, classId,
  status: "pending", requestedAt }`. Order: 403 `user.status.notApproved`, 403 `enrolment.role.notStudent`, 404
  `class.notFound` (non-UUID id without a lookup, or no class), 409 `class.cancelled`, 409 `class.started` (now ≥
  `startsAt`), 409 `enrolment.waitingList.closed` (spec 046: the switch is off and the seats taken reach the
  capacity — counted only while it is off), 422 `enrolment.rule.notAccepted` (the discipline has a rule — `PrismaEnrolmentClassReader` reads the
  `cancellation_rules` row — and the flag isn't exactly `true`), 409 `enrolment.alreadyOpen` (the partial index).
  `ruleAcceptedAt` is now when there is a rule, else `null`. Then `StudentNameReader` and
  `EnrolmentNotifier.seatRequested({ classId, studentName, discipline, startsAt, instructorIds })`, both swallowed.
- `POST /enrolments/:id/withdraw` (`WithdrawRequest`, no body) → 200 `EnrolmentOut` with `withdrawn`. Order: 403
  `user.status.notApproved` (any role), 404 `enrolment.notFound` (non-UUID, none, another person's, or its class is
  gone), 409 `enrolment.notPending`, 409 `class.started`; the conditional write losing → 409
  `enrolment.notPending`. Nobody is notified.
- Decisions (spec 042; admins only, `assertCanManageClasses`). `GET /enrolments/pending` (`ListPendingRequests`,
  declared before the `:id` routes) → 200 `{ total, classes }`: the classes with `startsAt > now`, `cancelledAt`
  null and a pending enrolment, by `startsAt` then `id`, each `{ id, discipline, level, startsAt, endsAt, capacity,
  seatsTaken, location: { name }, requests }` (`seatsTaken` from one `groupBy` of the approved enrolments), the
  requests by `requestedAt` then `id`, each `{ id, requestedAt, student: { id, name, photoUrl } }`; `total` counts
  the requests. `POST /enrolments/:id/approve` (`ApproveRequest`, no body) and `POST /enrolments/:id/deny`
  (`DenyRequest`, `{ reason? }`) → 200 `EnrolmentOut` with `approved` / `denied`. Order: 403
  `user.status.notApproved`, 403 `user.role.notAdmin`, 404 `enrolment.notFound` (non-UUID, none, or its class is
  gone), deny only 422 `enrolment.reason.max.length` (not a string, or over 500 after trimming; a blank one is
  `null`), 409 `enrolment.notPending`, 409 `class.started`, approve only 409 `enrolment.class.full` (the locked
  write answered `full`); a conditional write losing → 409 `enrolment.notPending`. Shared lookups in
  `usecase/decision.ts`. Then `requestApproved({ studentId, classId, discipline, startsAt })` /
  `requestDenied({ …, reason? })`, swallowed. `myEnrolment` carries `reason` (`PrismaViewerEnrolmentReader` selects
  it; `ViewerEnrolment.reason?` is optional on the port).
- Cancelling a seat (spec 043): `POST /enrolments/:id/cancel` (`CancelSeat`, no body, any approved role) → 200
  `EnrolmentOut` with `cancelled`. Order: 403 `user.status.notApproved`, 404 `enrolment.notFound` (non-UUID, none,
  another person's, or its class is gone), 409 `enrolment.notApproved` (`Enrolment.cancel(now)`, from `approved`
  only), 409 `class.started`, 409 `enrolment.deadline.missing` (the class reader's `cancellationDeadline` is
  `null`), 409 `enrolment.deadline.passed` (`now ≥ cancellationDeadline`: the deadline is exclusive); the
  conditional write (`cancel(id, now)`, `updateMany` where `status = 'approved'`) losing → 409
  `enrolment.notApproved`. Then `seatCancelled({ classId, studentName, discipline, startsAt, waitingCount,
  instructorIds })`, `waitingCount` being `countPendingForClass` after the write; name lookup and notifier errors
  swallowed. `ReleaseStudentEnrolments` (no actor, `{ studentId }` → `{ cancelled }`) backs the `SeatReleaser`
  adapter: `releaseForStudent(studentId, now)` in one transaction — `updateManyAndReturn` of the approved
  enrolments whose class has `startsAt > now` and `cancelledAt` null to `cancelled` (no deadline check), then the
  pending ones to `withdrawn` — returning the cancelled ones by `requestedAt` then `id`; one `seatCancelled` per
  cancelled class (notifier errors swallowed, a failed write propagates); withdrawals tell nobody.
- Direct enrolment and taking out (spec 044; admins only, `assertCanManageClasses`). `POST
  /classes/:id/enrolments/direct` (`EnrolStudent`, `{ studentId }`) → 201 `EnrolmentOut` with `approved` for a new
  enrolment, or 200 with the id of the student's pending request it approved (`@Res({ passthrough: true })` sets the
  status). Order: 403 `user.status.notApproved`, 403 `user.role.notAdmin`, 404 `class.notFound` (non-UUID or none),
  422 `enrolment.student.invalid` (non-UUID, or `PrismaStudentLookup` finds no approved account with role
  `student`), 409 `class.cancelled`, 409 `class.started`, then the locked `enrolDirectly`: 409
  `enrolment.alreadyApproved`, 409 `enrolment.class.full`; a P2002 race on the partial index → 409
  `enrolment.alreadyOpen`. A new row has `requestedAt` = `decidedAt` = now and `ruleAcceptedAt` null. Then
  `studentEnrolled` (new) or `requestApproved` (from pending) with `{ studentId, classId, discipline, startsAt }`,
  swallowed. `POST /enrolments/:id/take-out` (`TakeStudentOut`, `{ reason? }`) → 200 `EnrolmentOut` with
  `takenOut`. Order: 403 `user.status.notApproved`, 403 `user.role.notAdmin`, 404 `enrolment.notFound`
  (`findDecisionTarget`), 422 `enrolment.reason.max.length` (not a string, or over 300 after trimming; blank is
  `null`), 409 `enrolment.notApproved`, 409 `class.started`; the conditional write losing → 409
  `enrolment.notApproved`. Then `studentTakenOut({ …, reason? })`, swallowed. Roster students carry `enrolmentId`
  (`PrismaClassRosterReader` selects the enrolment's id).
- Trial guests (spec 045; `src/guest/`, never linked to a user). Model: `Guest` (`model/guest.entity.ts`: `classId`,
  `name` and `whatsappNumber` (`null` once erased), `createdBy`, `erasedAt`; `validate()` reports every problem
  together — `guest.name.*` under the user name rules (`GUEST_NAME_MIN` 3, `GUEST_NAME_MAX` 80, `PersonNameRule`)
  and `guest.whatsappNumber.invalid` (missing or not E.164, `PhoneNumberRule`) — and checks nothing on an erased
  guest; `erase(now)`). Port `GuestRepository` (`provider/guest.repository.ts`): `create(guest)` → `"added" |
  "full"` (locked, see Persistence), `findById`, `delete(id)` → `boolean`, `eraseEndedBefore(cutoff, now)` → the
  count; `FakeGuestRepository` under `test/mock/`. Table `guests` (migration `20261020120000_enrolment_add_guests`,
  hand-written): `id`, `class_id` → `classes` `ON DELETE CASCADE` (indexed), `name`, `whatsapp_number` (both
  nullable), `created_by` → `users` `ON DELETE SET NULL`, `erased_at`, timestamps. `POST /classes/:id/guests`
  (`AddGuest`, `{ name, whatsappNumber }`) → 201 `{ id, classId, name }`. Order: 403 `user.status.notApproved`, 403
  `user.role.notAdmin`, 404 `class.notFound` (non-UUID or none), 422 with every shape error together, 409
  `class.cancelled`, 409 `class.started`, then the locked write: 409 `enrolment.class.full`. `DELETE /guests/:id`
  (`RemoveGuest`) → 204: 403 as above, 404 `guest.notFound` (non-UUID, none, or already gone at the delete), 409
  `class.started`. Nobody is told on either route. `EraseGuestData` (no actor, `{ erased }`;
  `GUEST_DATA_RETENTION_DAYS` 30) runs `eraseEndedBefore(now − 30 days, now)`: nulls the name and the number and sets
  `erased_at` on the guests not erased yet whose class's `endsAt` or `cancelledAt` is at or before the cutoff. The
  pending list's `seatsTaken` (`findPendingByClass`) adds a `guest.groupBy`. REST Client requests in
  `guests.integration.http`.
- `EnrolmentExpiryJob` (see Scheduled work) runs `ExpirePendingEnrolments` (no actor, output `{ expired }`):
  `findExpirable(now)` (pending enrolments of classes with `startsAt ≤ now` and `cancelledAt` null, joined in SQL),
  then `expire` each and `requestExpired({ studentId, classId, discipline, startsAt })` only for a row that changed;
  notifier errors swallowed. `CloseClassEnrolments` (no actor, `{ classId }` → `{ studentIds }`, each once) backs the
  classes closer.
- REST Client requests in `enrolment.integration.http`; e2e in `apps/backend/test/enrolment.e2e-spec.ts` (fixed
  clocks for classes and enrolment, a faked `ExpoPushProvider`, the job run through `app.get(EnrolmentExpiryJob).run()`)
  and `apps/backend/test/enrolment-decisions.e2e-spec.ts` (spec 042: the list, approve, deny, the concurrent approve
  for the last seat, the refusals and the notifications) and `apps/backend/test/seat-cancellation.e2e-spec.ts`
  (spec 043: cancel, the concurrent cancel, every refusal in order, the notifications) and
  `apps/backend/test/direct-enrolment.e2e-spec.ts` (spec 044: direct enrolment new and from pending, every refusal,
  the races for the last seat and of the same student, the roster's `enrolmentId`, take-out with its reasons and
  refusals, the notifications and a failing push) and `apps/backend/test/guests.e2e-spec.ts` (spec 045: add, the
  shape errors together, every refusal, the race of a guest and an approval for the last seat, visibility per role
  on the class and the week list, delete and capacity counting guests, remove, and the 30-day erasure through
  `app.get(GuestErasureJob).run()`); the account-deletion release
  is a case of `apps/backend/test/auth-profile.e2e-spec.ts`, which also fixes the enrolment clock.
- Mobile (`apps/mobile/src/modules/enrolment/`): `enrolment.types.ts` (`MyEnrolment` with `reason`,
  `EnrolmentStatus`, `EnrolmentResponse`, `RequestSeatRequest`, `PendingRequestsResponse`, `DenyRequestVariables`,
  and since spec 044 `EnrolStudentVariables`, `TakeStudentOutVariables`, `TakeOutTarget`);
  `ClassItem.myEnrolment` in the classes types.
  Mutations `useRequestSeat(classId)` and `useWithdrawRequest()` (`apiPost`, no retry — a repeat would notify the
  admins twice — invalidating `["classes"]` on success). `utils/enrolment-cta.ts` (`getEnrolmentCta(myEnrolment,
  full)`: none or `withdrawn` / `expired` → `request` / `requestAgain` (`primary`) or `joinWaitingList` /
  `requestAgain` (`dark`) when full; `pending` → `withdraw` (`outline`) or `leaveWaitingList` (`ghost`) when full;
  `denied`, `cancelled` and `takenOut` (spec 044) → `requestAgain`; `approved` → `cancelSeat` (`outline`) only with `canCancel`, the
  third argument; since spec 046 the fourth, `waitingListEnabled` (default true), gives none on a full class to
  a student without an open enrolment while it is false; any other status → none), `utils/enrolment-status.ts`
  (`getEnrolmentDisplay`: `pending` on a full class reads `waitingList` — never stored —, with the banner and chip
  tone, icon and `enrolment.status.*` keys for `pending`, `waitingList`, `withdrawn`, `expired`, `approved` (`ok`),
  `denied` (`bad`, its banner pressable), `cancelled` (`dim`, chip "Você cancelou") and `takenOut` (`bad`, chip
  "Retirado", spec 044); `BANNER_CLASSES` per tone, `toChipTone`), `utils/enrolment-error.ts` (`getRequestSeatErrorKey`,
  `getWithdrawRequestErrorKey`, `getCancelSeatErrorKey` → `enrolment.errors.*`, `classDetails.notFound` or the shared no-connection /
  generic keys, `null` for an expired session and, on a cancel, for a closed deadline; `shouldReloadClass` for `class.started`, `class.cancelled`,
  `enrolment.alreadyOpen`, `enrolment.notPending`, `enrolment.notApproved` and `isDeadlineClosedError`
  (`enrolment.deadline.passed` / `.missing`); `isRuleNotAcceptedError`, which refetches the rules; spec 044: `getEnrolStudentErrorKey` → `enrolStudent.errors.*`,
  `isWaitingListClosedError` (spec 046: 409 `enrolment.waitingList.closed` → `enrolment.errors.waitingListClosed`,
  and a reload); `shouldReloadEnrolClasses` for `enrolment.class.full`, `class.started`, `class.cancelled`,
  `enrolment.alreadyApproved` and `enrolment.student.invalid`, and `getTakeOutErrorKey` → `takeOutSheet.errors.*`). The
  flow lives in `hooks/use-class-enrolment.hook.ts` (`useClassEnrolment({ item, state, canEnrol, now, reload,
  waitingListEnabled })`, which exposes `waitingListClosed` and, on the closed refusal, also invalidates
  `["school-settings"]`; called
  by the details' hook with the screen's minute clock): the CTA and banner only while `canEnrol` and `not-started`,
  `canCancel` (`now` before `cancellationDeadline`, exclusive like the backend) and `deadlineNote` (`"passed"` /
  `"missing"` for an approved seat that can't be cancelled), the three sheets' visibility, one
  ref guarding a double press for every send, the toasts and the reloads. `useCancelSeat()` (`POST
  /enrolments/:id/cancel`, no retry, invalidating `["classes"]`); `CancelSeatSheet`
  (`components/cancel-seat-sheet/`, no hook): the deadline line, confirm (`danger`, `loading`) / keep (`ghost`). The
  details' footer shows the CTA and/or the `enrolment.cancelSeatNote.*` note with `ContactSchoolButton`. `RequestSeatSheet`
  (`components/request-seat-sheet/` + hook): a `BottomModal` with the rule block (the deadline card or
  `noDeadline`, `Checkbox` and the "Ler" `TextButton` while the discipline has a rule — it loads
  `useCancellationRules` while visible — else `noRule`), the primary / dark submit with `loading`, disabled until
  ticked, and a `ghost` "Agora não"; it renders `CancellationRulesSheet` itself and steps aside for it (`idle →
  leaving → open`): the rules are presented only once the request sheet has been dismissed, that dismissal isn't
  forwarded to `onClose` (the step is read from a ref because the sheet library keeps calling the `onClose` it had
  when presented), and closing the rules brings it back with the box as it was; closing the request sheet resets the
  box. `WithdrawRequestSheet` (`components/withdraw-request-sheet/`, no hook): confirm (`danger`, `loading`) / keep.
  `ClassDetailsScreen` takes `canEnrol` (set only by `src/app/(private)/student/class/[id].tsx`): a sticky footer
  `Button` with the CTA, the status banner after the state banners (it replaces "Turma cheia"; started, finished and
  cancelled classes show none), and `classDetails.full.waitingList` under "Turma cheia" while the CTA is
  `joinWaitingList`, or `classDetails.full.waitingListClosed` while `waitingListClosed` (spec 046); the details'
  hook reads `useSchoolSettings` (not loaded or failed counts as on: the backend decides) and, for admins
  (`canEdit`), adds `classDetails.full.newRequestsWait` or `classDetails.full.waitingListOff` under "Turma cheia";
  instructors get neither. `ClassesWeekScreen` and `ClassCard` take `showEnrolment` (set only by the student's
  `(tabs)/index.tsx`, and on `ClassCard` by `MyClassesScreen` since spec 048): the card's status chip in the right slot, in place of "Sem vagas" (the started, finished and
  cancelled chips win). Copy under `enrolment` (`cta`, `status`, `requestSheet`, `withdrawSheet`, `cancelSeatSheet`,
  `cancelSeatNote`, `errors`) and
  `classDetails.full.waitingList`. Since spec 042 a denial's banner stays on a started or cancelled class (without
  the CTA) and opens `DenialReasonSheet` (`components/denial-reason-sheet/`, a `BottomModal`: the class line, "Motivo
  da escola", the reason or `noReason`, "Fechar"), while an approved banner yields to the started one. Since spec 044
  a taken-out banner stays the same way (`takenOutReason`), and the details' hook gives its line as
  `enrolmentDescription` ("Motivo: “…”", or `noReason`).
- Mobile tool (spec 042): `ClassRequestsScreen` (`screens/class-requests.screen.tsx`, route
  `src/app/(private)/admin/class-requests.tsx`, `routes.admin.classRequests`) with its logic in
  `hooks/use-class-requests-screen.hook.ts` (the admin module's pattern): `usePendingRequests()` (`GET
  /enrolments/pending`, key `PENDING_REQUESTS_QUERY_KEY` = `["enrolments", "pending"]`), `useApproveRequest()` /
  `useDenyRequest()` (no retry; invalidate the pending list and `["classes"]`), approve at once, one `DenySheet`
  ("Recusar inscrição?"), a ref guarding a double press, the toasts, and `shouldReloadRequests` (`enrolment.notPending`,
  `class.started`, `enrolment.class.full`) refetching the list; `getDecideRequestErrorKey` maps errors to
  `classRequests.errors.*`. `ClassRequestsGroup` (`components/class-requests-group/`) draws a class: the day block
  and the "Pediu às …" line from `utils/class-requests.ts` (`formatDayBlock`, `formatAskedAt`, Fortaleza time), the
  occupancy bar, and on a full class the waiting-list label, the positions and the note, with `approveDisabled` on
  each `DecisionCard` (avatars are `StudentAvatar` at 40pt, whose line height scales with the font). The admin home
  (`admin.screen.tsx`) shows the "Inscrições em aulas" row with `total` from the same query, hidden while loading,
  after an error and at zero. Copy under `classRequests` and `admin.home.classRequestsRow*`.
- Mobile, spec 044: `useEnrolStudent()` (`POST /classes/:id/enrolments/direct`) and `useTakeStudentOut()` (`POST
  /enrolments/:id/take-out`, a blank reason sends `{}`), no retry, invalidating the pending list and `["classes"]`
  on success. `EnrolStudentScreen` (`screens/enrol-student.screen.tsx` + `.hook.ts` / `.types.ts`, route
  `src/app/(private)/admin/enrol-student.tsx`, `routes.admin.enrolStudent`): "1 · Quem" — a debounced (300 ms)
  search over `usePeople({ roles: ["student"], search })` in a bounded inner `ScrollView` (`max-h-72`) that loads the
  next page near its end (an inner `FlatList` would nest virtualized lists in the page scroll), radio rows with
  initials; "2 · Aula" — `WeekMonthCalendar` with the days marked from `useVisibleWeeksClasses` and the selected
  day's classes from `useWeekClasses` (not started, not cancelled) as `ClassCard`s, full ones faded and disabled.
  The hook returns the students with their `selected` flag, the class cards with `full` / `selected` and the scroll
  check, so the screen only draws them. The sticky "Inscrever <nome>" enrols once (a ref guard), toasts and goes
  back; `shouldReloadEnrolClasses` clears the class and refetches the weeks. The admin home shows the "Inscrever
  aluno" row after "Inscrições em aulas". `TakeOutSheet` (`components/take-out-sheet/`, no hook) is a `DenySheet`
  with `showLabel`, a 300 limit and the `takeOutSheet` copy; `useTakeOut(reload)` (`hooks/use-take-out.hook.ts`)
  holds the target (`TakeOutTarget`, the roster student), a ref guard, the toast and, for `enrolment.notApproved` /
  `class.started` (`shouldReloadClass`), closes the sheet and reloads the class. The details' hook passes
  `onTakeOut` to `ClassPeople` and renders the sheet only with `canTakeOut` (`canEdit` and `not-started`, so never
  for students, instructors, or started, finished and cancelled classes), with `takeOutFirstName` and
  `takeOutSummary`. Copy under `enrolStudent`, `takeOutSheet`, `enrolment.status.takenOut` and
  `admin.home.enrolStudentRow`.
- Mobile, spec 045: `useAddGuest()` (`POST /classes/:id/guests`) and `useRemoveGuest()` (`DELETE /guests/:id`), no
  retry, invalidating `["classes"]`; error keys `getAddGuestErrorKey` / `getRemoveGuestErrorKey` and
  `shouldReloadAddGuestClasses` in `utils/enrolment-error.ts`. `EnrolStudentScreen` has a `SegmentedControl`
  ("Aula experimental" / "Aluno da escola", the latter first): in trial mode "1 · Quem" draws the labelled "Nome"
  `TextInput` (user name rules) and the labelled "WhatsApp" `PhoneNumberField` (Brazil preselected) with the
  no-history note, and the button adds the guest once (a ref guard), toasts "<nome> inscrito" and goes back.
  `ClassItem` (`classes.types.ts`) carries `guests`. `ClassPeople` lists the guests after the students (since spec 049
  `ClassGuestRow`: `GuestAvatar`, the name when known, a `muted` `Chip` "Trial"), opens for a class with only
  guests, takes `onTakeGuestOut`, and ends the admin's capacity line with "· inclui N trial" (`showTrialCount`).
  `useTakeGuestOut(reload)` (`hooks/use-take-guest-out.hook.ts`) holds the guest target and, for `class.started` /
  `guest.notFound`, closes and reloads; `TakeOutSheet` takes `trial` (the guest copy, no reason field, through
  `DenySheet`'s `hideReason`). `GuestsWarning` (`classes/components/guests-warning/`, `warn` tint, plural and
  singular, nothing at zero) sits in Editar aula's footer and in `CancelClassSheet` (`guestCount`). Copy under
  `enrolStudent.trial`, `takeOutSheet.guest*`, `classDetails.trialChip` / `includesTrial` / `guestsWarning`.
- Mobile, spec 060: `EnrolStudentScreen` is two steps. The hook holds `step` (`EnrolStep`, `"who" | "class"`,
  starting at `"who"`) and `goToStep`, which ignores `"class"` until `isWhoDone`; `whoValue` is the picked
  student's name (student mode) or the trimmed trial name once it and the WhatsApp number are valid (trial mode),
  else `null`, and `isWhoDone = whoValue !== null`; `isClassDone` / `classValue` come from the picked class with a
  free seat — `classValue` is the school day's weekday (the first three letters of date-fns' `"EEEE"`, capitalized,
  because pt-BR `"EEE"` spells out "Quarta"), the day of the month and `schoolTimeOf(startsAt)` ("Qua 16 · 09:00").
  It also holds `discipline` / `selectDiscipline` (`DisciplineFilterValue`, starting at `all`), which narrows
  `dayItems` (not the marked days), so a picked class of the other sport isn't `freeClass`. Leaving a step keeps
  every selection. The screen has no `ScreenIntro` and no collapsing title: the header title is `StackHeaderTitle`
  and the page is a plain `ScrollView` with `StepTabs` on top and only the current step's content (the mode switch
  and the students or trial fields; or `WeekMonthCalendar` and the class cards), with `DisciplineFilter` over the
  scroll area on the class step (the scroll adds `DISCIPLINE_FILTER_CLEARANCE` at the bottom). The footer is fixed
  under the scroll (`border-t border-line bg-page px-screen pt-3`, bottom padding `Math.max(insets.bottom, 16)`,
  as in Editar aula) with one primary `Button` and no icon: `enrolStudent.next` ("Escolher aula", disabled until
  `isWhoDone`, moves to the class step) or `enrolStudent.submitEmpty` ("Inscrever", disabled until `submit`, with
  `loading` while sending). Copy: `enrolStudent.steps.{who,class,pending}` and `enrolStudent.next` were added;
  `enrolStudent.description`, `whoStep`, `classStep` and `submit` ("Inscrever <nome>") and the hook's
  `submitName` were removed.
- Mobile, spec 048: `useMyClasses()` (`hooks/use-my-classes.hook.ts`, `MY_CLASSES_QUERY_KEY` = `["classes", "mine"]`,
  `GET /classes/mine`, no retry) and `useMyClassHistory({ from, to })` (`hooks/use-my-class-history.hook.ts`, spec
  053: a `useQuery` keyed `["classes", "mine", "history", from, to]` (`myClassHistoryQueryKey`), `GET
  /classes/mine/history?from=…&to=…`, no retry; each period cached on its own, a period not in the cache has no data
  until it loads); both sit under `["classes"]`, so every existing `["classes"]` invalidation refreshes them. Types
  `MyClassesResponse`, `MyClassHistoryResponse` (`{ items }`), `MyClassHistoryPeriod` and `MyClassesFilter` in
  `enrolment.types.ts` (`ClassHistoryDay` moved to the classes module's `classes.types.ts` in spec 062).
  `utils/class-history.ts` (spec 053; in `src/modules/classes/utils/` since spec 062): `daysWithClasses` (each Fortaleza day
  with classes once, for the dots), `filterClassesByDay`, `groupClassesByDay` (newest day first, a day's classes newest
  first then `id` desc), `historyDayLabel` ("WED, 21 OCT") and `historyChipLabel` ("21 OCT"). `utils/my-classes-filter.ts`:
  `MY_CLASSES_FILTERS` (the chips in order: `all`, `pending`, `approved`, `denied`, `withdrawn`, `cancelled`,
  `takenOut`, `expired`, `classCancelled`), `getMyClassFilter(item)` (a cancelled class or a `classCancelled` request
  → `classCancelled`, else the request's status — `pending` covers the waiting list —, `null` without a request) and
  `filterMyClasses(items, filter)`. `MyClassesScreen` (`screens/my-classes.screen.tsx` + `.hook.ts` / `.types.ts`,
  rendered by the student's `(tabs)/my-classes.tsx`): one `FlatList` (`my-classes-list`) whose header holds the
  `ds-text-screen-title` "Minhas aulas", a round 44 pt history button (`h-11 w-11`, `bg-surface`,
  `shadowStyle("iconButton")`, Ionicons `time-outline`, pushing `routes.student.myHistory`) and `MyClassesFilters`
  (`components/my-classes-filters/`: a horizontal `ScrollView` of `min-h-11` `TouchableOpacity` chips with
  `accessibilityState.selected`, the selected one `bg-grape` / `text-on-color`); items are `ClassCard`s with
  `showEnrolment`, a card pushing `routes.student.classDetail(id)`. `useFocusEffect` refetches on focus
  (`cancelRefetch: false`) and its cleanup puts the chips back on `all`, so any blur — another tab, or a screen pushed
  above — resets them. States: grape spinner, error with "Tentar novamente" only while nothing is loaded (a failed
  refetch keeps the list), nothing after an expired session, the empty card (`myClasses.empty.all` / `.filtered`),
  pull-to-refresh with its own spinner. `MyClassHistoryScreen` (`screens/my-class-history.screen.tsx`, route
  `src/app/(private)/student/my-history.tsx`, `routes.student.myHistory` = `/student/my-history`, in the student
  `Stack`; rebuilt in spec 053, and since spec 062 a thin wrapper over the classes module's `useClassHistory` and
  `ClassHistory` with the `myHistory` copy and `routes.student.classDetail` — below is what `ClassHistory` draws; its
  header is the centered `StackHeaderTitle` and the back button, no intro): one
  `FlatList` (`my-history-list`, `contentInsetAdjustmentBehavior="automatic"`) whose header holds the calendar card
  (`WeekMonthCalendar` with `initialView="month"`, `clearable`, `onPeriodChange`, the days with classes marked and
  `myHistory.hasClasses` as `markedLabel`), the legend (a `bg-lagoon` dot) and `HistoryListHeader`
  (`components/history-list-header/`: "Todas as aulas" with the period's caption, or the selected day's
  `bg-info-tint` / `text-lagoon` chip in a 44 pt target that clears it); its rows are `HistoryDayLabel`s
  (`components/history-day-label/`) and `ClassCard`s (both components in `src/modules/classes/` since spec 062). The
  hook keeps the period (the current Fortaleza month on
  open), the selected day (none) and the refresh spinner as local state; the day filter runs on the loaded period.
  States through `ListEmptyComponent`, each under the calendar and the legend: three `ClassCardSkeleton`s read as one
  loading state, `ErrorState` with retry (`isRetrying` keeps it on screen with the button's spinner while a period
  with no data reloads), `EmptyState` `calendar-outline` for a day or a period, nothing after an expired session; a
  failed refresh keeps the classes. The error and empty states sit in a `flex-row` wrapper: as `flex-1` children of
  the list's auto-height cell they collapsed when the calendar switched view. Pull-to-refresh reloads the period. `buildClassItem(id, startsAt, endsAt, overrides)` in `classes.test-utils.tsx` builds a
  test `ClassItem`. Copy under `myClasses` and `myHistory`.
- Mobile, spec 057 ("Minhas aulas" for instructors and admins, in `src/modules/classes/`): `useTeachingClasses()`
  (`hooks/use-teaching-classes.hook.ts`, `TEACHING_CLASSES_QUERY_KEY` = `["classes", "teaching"]`, authenticated `GET
  /classes/teaching`, no retry; `TeachingClassesResponse` in `classes.types.ts`), under `["classes"]` so every class
  invalidation refreshes it, and shared by the home row and the screen, which each refetch it on focus
  (`useFocusEffect`, `refetch({ cancelRefetch: false })`). `utils/teaching-classes.ts`: `layoutTeachingClasses(items,
  now)` → `{ ongoing, days, nextId }` (items ended at `now` dropped; `started` ones in `ongoing`; the rest grouped by
  `schoolDayOf` with the label `today` / `tomorrow` / `weekday`; `nextId` the first `not-started`), `countAssignedClasses`
  (items not cancelled), `formatShortDate` ("17 set", without a trailing dot) and `formatDayName` (`weekdayName`
  without the pt-BR "-feira"). `TeachingClassesEntryRow` (`components/teaching-classes-entry-row/`, prop `role`): a
  `rounded-card` row with the MaterialCommunityIcons `surfing` in `lagoon`, the title, the subtitle (`null` until
  data) and a chevron; always rendered for `instructor`, for `admin` only when the data has `teachesAny: true`; it is
  the first row of the Escola section of `InstructorScreen` and `AdminScreen`, opening `routes.<role>.myClasses`
  (`/instructor/my-classes`, `/admin/my-classes`; route files in each role's stack, outside `(tabs)`).
  `TeachingClassesScreen` (`screens/teaching-classes.screen.tsx` + hook, types; prop `role`): since spec 062 the
  list's header is a `ScreenIntro` (grape `calendar-outline`, `teachingClasses.title`, `teachingClasses.description`)
  whose title collapses into the header through `useCollapsingTitleHeader`; on the error and empty states the intro is
  dropped and the header shows `StackHeaderTitle` (centered); `headerRight` is a `HeaderButton` (`time-outline`,
  label `teachingHistory.title`) pushing `routes[role].myHistory` (`openHistory`) in every state; one
  `Animated.FlatList` (`teaching-classes-list`)
  of rows built at `useNow()`: `OngoingClassCard`s, then per day a `TeachingDayHeader`
  (`components/teaching-day-header/`: role `header`, label left and date right in `ds-text-section-label`) and its
  `ClassCard`s, `isNext` on the next one. States as `MyClassesScreen` (four `ClassCardSkeleton`s as one loading
  state, `ErrorState` kept with the spinner while retrying, `EmptyState`, nothing after an expired session,
  pull-to-refresh). `ClassCard` takes `isNext`: while not started and not cancelled, the `sun` "Próxima" `Chip`
  (`time-outline`) first in the state slot, the `sun` border and the primary shadow. `OngoingClassCard`
  (`components/ongoing-class-card/`): a `bg-grape` card with `shadowStyle("primary")` and `text-on-color`, the
  chips on `Chip`'s `onHighlight` tone, the location pill on `onGrapeFill`, the occupancy track `onGrapeTrack` with
  a white fill (`onGrapeBad` text when full), the footer on `onGrapeShade` with avatars ringed in grape. Copy under
  `teachingClasses` (the under-way chip reuses `classesWeek.state.started`). Since spec 059 the screen filters by
  sport: `useTeachingClassesScreen` keeps `discipline` (`DisciplineFilterValue`, local state starting at `"all"`,
  set through `selectDiscipline`) and filters the loaded items before `layoutTeachingClasses`, so `ongoing`, the days
  and `nextId` are all of the chosen sport; `emptyDiscipline` is the chosen sport when the filtered list is empty while
  an item of any sport hasn't ended at `useNow()`, else `null`. The `FlatList` sits in a `flex-1 bg-page` view with
  spec 050's `DisciplineFilter` over it in every state, and its bottom padding adds `DISCIPLINE_FILTER_CLEARANCE`;
  `ListEmptyComponent` renders `EmptyState` (`calendar-outline`, no action) with
  `teachingClasses.emptyFiltered.<sport>.{title,description}` when `emptyDiscipline` is set. The home row's count
  doesn't read the filter.
- Mobile, spec 062 ("Aulas anteriores" for instructors and admins, in `src/modules/classes/`): the history pieces the
  student's and the teaching history share live in the classes module, since the enrolment module imports from
  classes and not the other way round — `components/history-day-label/`, `components/history-list-header/`,
  `utils/class-history.ts`, and `components/class-history/`: `useClassHistory({ useHistoryQuery, classRoute })`
  (`class-history.hook.ts`; the screen's state — period, day, sport, rows, loading / error / empty / refresh — over
  the period query it is given, a card pushing `classRoute(id)`) and `ClassHistory({ history, copy, withIntro })`
  (`class-history.component.tsx`; the calendar, the legend, `HistoryListHeader`, the list, the states and the
  floating `DisciplineFilter`, with the texts of the i18n namespace `copy`, `myHistory` or `teachingHistory`, and the
  testIDs `my-history-*`). `withIntro` (off by default, so the student's history has none) adds a `ScreenIntro` (grape
  `time-outline`, the title and `<copy>.description`) as the first part of the list's header, its title collapsing
  into the header through `useCollapsingTitleHeader`; on the error and empty states the intro is dropped and the
  header shows the centered `StackHeaderTitle`. Types `ClassHistoryDay`, `ClassHistoryPeriod` (`{ from, to }`) and
  `TeachingClassHistoryResponse` (`{ items }`) in `classes.types.ts`. `useTeachingClassHistory(period)`
  (`hooks/use-teaching-class-history.hook.ts`): a `useQuery` keyed `["classes", "teaching", "history", from, to]`
  (`teachingClassHistoryQueryKey`), authenticated `GET /classes/teaching/history?from=…&to=…`, no retry; under
  `["classes"]`, so every class invalidation refreshes it. `TeachingClassHistoryScreen`
  (`screens/teaching-class-history.screen.tsx` + types, prop `role`; no hook file, it only wires `useClassHistory`
  with `routes[role].classDetail`) renders `ClassHistory` with `copy="teachingHistory"` and `withIntro`; routes
  `src/app/(private)/{instructor,admin}/my-history.tsx`, `routes.instructor.myHistory` = `/instructor/my-history`,
  `routes.admin.myHistory` = `/admin/my-history`, in each role's stack outside `(tabs)`. Copy under
  `teachingHistory` (title, description, legend, `hasClasses`, `allClasses`, `clearDay`, `loading`, `loadError`,
  `emptyDay`, `emptyPeriod`) and `teachingClasses.description`.
- Mobile, spec 061 (weekly occupancy for admins, in `src/modules/classes/`; no API change): `utils/weekly-occupancy.ts`
  holds the pure logic — `buildOccupancyDays(weekStart, today, locale)` (the 7 days, weekday abbreviation, number,
  `isToday`), `buildOccupancyRows(weekStart, classes)` (one row per Fortaleza start time, `schoolTimeOf`, cancelled
  included, ascending; classes sharing a day and a start time take sub-rows in the API's order, the time label only on
  the first, `empty` slots elsewhere), `getOccupancyCellLook(item)` (tone `cancelled` / `full` (`isClassFull`) /
  `high` (≥ 90) / `mid` (50–89) / `low` by `getOccupancyPercent`, with the percent; deliberately not the card bar's
  80% step), `getDefaultSelectedClassId` (the non-cancelled class with the lowest `seatsTaken / capacity`, ties to the
  first, else the first class), `getRelativeWeek(currentWeekStart, weekStart)` (`current` / `next` / `previous` /
  `ahead` / `ago` with a count) and `getOccupancyStats(classes)` (percent, taken, total, free, full classes over the
  non-cancelled classes, seats capped at capacity). `WeeklyOccupancyScreen` (`screens/weekly-occupancy.screen.tsx` +
  hook, types; route `src/app/(private)/admin/weekly-occupancy.tsx`, `routes.admin.weeklyOccupancy`) reads
  `useQuery(weekClassesOptions(weekStart))` — the Aulas tab's key, so both share the cache — starting at
  `mondayOf(todayInSchoolZone(now))`; centered `StackHeaderTitle`, a first-view `ScrollView` with
  `RefreshControl`; the selection is the tapped id while it is still in the week, else the default, and resets on a
  week change. Children: `OccupancyWeekBar` (`components/occupancy-week-bar/`: 44 pt round `bg-surface` arrows with
  `shadowStyle("iconButton")`, labels `weekMonthCalendar.previousWeek` / `nextWeek`, the relative label in
  `ds-text-section-label` — `text-sun` only for this week — over the `weekCaption`), `OccupancyStats`
  (`components/occupancy-stats/`, four `OccupancyStat`s from `components/occupancy-stat/`, each one `accessible`
  element), `OccupancyMap` (`components/occupancy-map/` + hook: header row, time column, sub-rows, dashed empty slots
  hidden from accessibility, each on a borderless `flex-1` wrapper so the columns stay equal) with `OccupancyCell`
  (`components/occupancy-cell/`: a `TouchableOpacity` with the look on an inner view, `accessibilityState.selected`,
  the grape border when selected) and `OccupancyLegend` (`components/occupancy-legend/`), and
  `OccupancyMapSkeleton` (`components/occupancy-map-skeleton/`: the stats card, header and 4 rows as one labelled
  element); under the legend the selected `ClassCard` (`showFlags`) opens `routes.admin.classDetail(id)`. States as
  `TeachingClassesScreen` (`ErrorState` kept with its spinner while retrying, `EmptyState` `calendar-outline` for a
  week with no class at all, nothing after an expired session, a failed refetch keeps the map, refetch on focus with
  `cancelRefetch: false`, local pull-to-refresh spinner); the week bar shows in every state, the stats card only with
  the map. The admin home's "Escola" section opens it from its own card after `PeopleEntryRow`. Copy under
  `weeklyOccupancy` (relative weeks and stats' accessibility labels with i18next `count` plurals).

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
already chosen (Google — sign-in, maps and address suggestions —, Apple — sign-in and Apple Maps —, Resend, Expo,
Anthropic) and describes the others by category, so a spec that
chooses a provider (hosting, photo storage), changes a retention period or adds a kind of data also
updates the policy's legal bases and retention list (spec 023) in the three web dictionaries.

### Push notifications

- **Expo Push** (`expo-notifications` on the phone, see Applications; the backend sends through
  **`expo-server-sdk`** 7). Every notification is stored first (`Notify` in `modules/notifications`), then pushed
  to every device of its user; the phone's push switch (see Applications) only controls the push, never the stored
  notification. The port is `PushProvider`
  (`modules/notifications/src/notification/provider/push.provider.ts`: `send(messages)` → tickets in the order
  of the messages, `getReceipts(ids)` → receipts by ticket id), implemented by `ExpoPushProvider`
  (`apps/backend/src/modules/notifications/expo.push.ts`): `chunkPushNotifications` +
  `sendPushNotificationsAsync`, messages with `sound: "default"`, `priority: "high"`, `channelId: "default"` and
  `data: { type, notificationId, classId? }` (`classId` copied from the notification's params when it is a
  string; spec 032), title and body from `renderPush` in the device's locale (dates in the copy, such as the class
  start of `class.edited` / `class.unassigned` / `class.cancelled` / `class.deleted` / `class.noInstructor` /
  `enrolment.requested` / `enrolment.expired` / `enrolment.approved` / `enrolment.denied` / `enrolment.cancelled` /
  `enrolment.enrolled` / `enrolment.takenOut`, are formatted by hand in Fortaleza time — fixed UTC-3, no
  `Intl` — so the text is the same on every machine). A chunk that throws
  doesn't stop the others; its error is rethrown at the end (so the caller stores no tickets for that send) and
  logged by the notifier. Variable: `EXPO_ACCESS_TOKEN` (optional; sent only when set, needed only with Expo's
  enhanced push security).
- Tokens (`push_tokens`, key `token`, one row per device, many per user): `PUT /notifications/push-token`
  (protected, body `{ token, locale }`, 204) upserts the token for the caller with its locale, moving a token
  another account held. Order: status not `pending` / `approved` / `deleted` / `removed` (a deleted account hears its reactivation decision, spec 064; a removed one its restore, spec 066) → 403 `pushToken.status.notAllowed`; then
  `token` not matching `^Expo(nent)?PushToken\[[^\]]+\]$` → 422 `pushToken.token.invalid` and `locale` not
  `pt-BR` / `es` / `en` → 422 `pushToken.locale.invalid`, listed together. A token is deleted on sign-out (see
  Authentication), when its phone turns pushes off — `DELETE /notifications/push-token` (`UnregisterPushToken`,
  protected, body `{ token }`, 204, any status; `token` missing, empty or not a string → 422
  `pushToken.token.required`; `deleteForUser(userId, token)`, so another account's token or an unknown one
  changes nothing) — and when Expo reports `DeviceNotRegistered` in a ticket or a receipt; never when a session
  expires, the account changes status, or by age.
- Read state and the notifications screen (spec 055): `notifications.read_at` (nullable; null = unread; migration
  `notifications_add_read_at`). Four protected endpoints, any status, own notifications only:
  `GET /notifications` (`ListNotifications`: `page` digits ≥ 1, default 1 → else `notifications.page.invalid`;
  `perPage` digits 1–50, default 20 → else `notifications.perPage.invalid`; `locale` `pt-BR` / `es` / `en`, default
  `pt-BR` → else `notifications.locale.invalid`; all in one 422; ordered `created_at` then `id` descending) →
  `{ items: [{ id, type, classId, title, body, createdAt, read }], page, perPage, total }` (`classId` from a string
  `params.classId`, else `null`; `title` / `body` from `renderInApp`; `params` not returned);
  `GET /notifications/unread-count` (`CountUnreadNotifications`) → `{ count }`; `POST /notifications/read-all`
  (`MarkAllNotificationsRead`, 204) and `POST /notifications/:id/read` (`MarkNotificationRead`, 204; an id that isn't
  a UUID, is unknown or someone else's → 404 `notification.notFound`). Marks use the clock and set `read_at` only
  while it is null (`PrismaNotificationRepository.markRead`: one conditional `updateMany`, then an existence
  count), so a repeat keeps the first time. `renderInApp` is `renderPush` except where a catalog entry has an
  `inAppBody` (`class.edited` without "open the app", `registration.denied` and `reactivation.denied` with the reason or `""`).
- Tickets and receipts: every `ok` ticket is stored in `push_tickets` (`id` = Expo ticket id, `token`, no foreign
  key); `PushReceiptCheckJob` runs `CheckPushReceipts` every minute — tickets 15 minutes old or more are asked
  about (`getPushNotificationReceiptsAsync` in chunks of up to 1000 ids), the token of each `DeviceNotRegistered`
  receipt is deleted and every asked ticket is deleted, receipt found or not; tickets older than 24 hours are
  deleted without asking.
- Other modules notify through their own ports, each with an adapter in `apps/backend/src/modules/notifications/`
  that runs `Notify` and logs and swallows every error: `RegistrationNotifier` (auth), `ReactivationNotifier` (auth,
  `NotificationsReactivationNotifier`, spec 064: `reactivationRequested` → `reactivation.requested` with `{ name, userId }`
  to the approved admins through `NotifyApprovedAdmins`, which takes the type; `reactivationApproved` →
  `reactivation.approved`; `reactivationDenied` → `reactivation.denied` with `{ reason? }`, both to the person),
  `AccountRemovalNotifier` (auth, `NotificationsAccountRemovalNotifier`, spec 066: `accountRemoved` →
  `account.removed` and `accountRestored` → `account.restored`, both with no params, to the person only), `ClassAssignmentNotifier`
  (classes, `NotificationsClassAssignmentNotifier`: `classAssigned` → `class.assigned` with `{ count, discipline }`,
  spec 028; `classUnassigned` → `class.unassigned` with `{ classId, discipline, startsAt }`, spec 032) and
  `ClassChangeNotifier` (classes, `NotificationsClassChangeNotifier`: `classEdited` → `class.edited` with
  `{ classId, discipline, startsAt }`, `startsAt` as ISO text, spec 032; `classCancelled` → `class.cancelled` with
  `{ classId, discipline, startsAt, message? }`, `message` only when there is one, spec 033; `classDeleted` →
  `class.deleted` with `{ discipline, startsAt }`, no `classId` since the class is gone, spec 034) and
  `NoInstructorNotifier` (classes, `NotificationsNoInstructorNotifier`: `classesWithoutInstructor` runs the
  notifications use case `NotifyClassesWithoutInstructor` — `RecipientsProvider.findApprovedAdminIds()` minus
  `excludeUserIds`, nothing stored or sent when none is left — which notifies `class.noInstructor` with
  `{ count, classId, discipline, startsAt }` for the earliest class; spec 035) and `LocationChangeNotifier` (classes,
  `NotificationsLocationChangeNotifier`: `locationChanged({ recipients, locationName })` → one `location.changed`
  per recipient (`{ userId, count }`, instructor or student since spec 047) with `{ count, locationName }`, no `classId` since it concerns several classes; one failure doesn't
  stop the next recipient; spec 037) and `EnrolmentNotifier` (enrolment, `NotificationsEnrolmentNotifier`, spec 041:
  `seatRequested` → `enrolment.requested` with `{ classId, studentName, discipline, startsAt }` to
  `RecipientsProvider.findApprovedAdminIds()` plus the class's instructors, deduplicated; `requestExpired` →
  `enrolment.expired` with `{ classId, discipline, startsAt }` to the student; spec 042: `requestApproved` →
  `enrolment.approved` with `{ classId, discipline, startsAt }` and `requestDenied` → `enrolment.denied` with
  `{ classId, discipline, startsAt, reason? }`, `reason` only when written and used as the push body, both to the
  student only; spec 043: `seatCancelled` → `enrolment.cancelled` with `{ classId, studentName, discipline,
  startsAt, waitingCount }` to the approved admins plus the class's instructors, deduplicated, the "N na lista de
  espera." sentence only when `waitingCount` > 0; spec 044: `studentEnrolled` → `enrolment.enrolled` with `{ classId,
  discipline, startsAt }` and `studentTakenOut` → `enrolment.takenOut` with `{ classId, discipline, startsAt,
  reason? }`, `reason` only when written and used as the push body, both to the student only) and
  `ClassReminderNotifier` (classes, `NotificationsClassReminderNotifier`, spec 054: `classReminder({ recipientIds,
  classId, discipline, startsAt, locationName })` → `class.reminder` with `{ classId, discipline, startsAt,
  locationName }`, `startsAt` as ISO text and `locationName` read when the reminder is sent; the copy shows the
  start time in Fortaleza with no day, since a class just after midnight is reminded the evening before). Since
  spec 041 `NotificationsClassChangeNotifier.classCancelled` notifies the union of `instructorIds` and `studentIds`, and
  since spec 047 `classEdited` does the same. A
  catalog entry's `title` in
  `push-messages.ts` is a string or a function of the params (`class.noInstructor`'s depends on the count; a
  missing count counts as one).
  `NotificationsModule` exports them; a push type without a catalog entry in `push-messages.ts` fails the backend's
  type check.

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

- **Anthropic** (spec 036), behind the `CancellationDeadlineDescriber` port in `modules/classes`, implemented by
  `AnthropicDeadlineDescriber` (`apps/backend/src/modules/classes/anthropic.deadline-describer.ts`) with
  `@anthropic-ai/sdk`: model `claude-opus-5-5` (a constant, not configuration), `output_config.effort: "low"`,
  adaptive thinking left at its default, `max_tokens` 4096, structured outputs through `client.beta.messages.parse`
  with `zodOutputFormat` (a flat `{ kind, minutes, days, time }` object mapped to the domain union), and the
  server-side refusal fallback (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`). The client has a
  30 s timeout and `maxRetries: 0`: the job is the retry. One fixed English system prompt (`DEADLINE_SYSTEM_PROMPT`)
  and one user message holding the `CancellationDeadlineRequest` as JSON — only the rule and the class's details,
  never personal data. A refusal, an answer that doesn't parse, an API or network error and a missing key all
  answer `unclear`; the logs carry only the stop reason or the HTTP status, never the rule or the class.
- Variable `ANTHROPIC_API_KEY` (in `apps/backend/.env.example`, empty): without it the adapter warns once
  naming the variable and answers every request `unclear` (classes stay flagged), except with
  `NODE_ENV=production`, where its constructor throws so the backend refuses to start — the same pattern as
  `ResendEmailProvider`. Tests never call Anthropic: the unit spec mocks the SDK with `vi.mock`, and the e2e
  suite overrides `AnthropicDeadlineDescriber` with a fake.
- The installed SDK's `zodOutputFormat` sends the `kind` enum as a plain string (the allowed values moved into its
  description), so the API doesn't constrain it; a value outside the four kinds fails the zod parse and counts as
  `unclear`.

### Photo storage

- **S3-compatible object storage** with presigned upload and download URLs, so files never pass through the
  backend. Provider **chosen by the class-photos spec**.

### Maps and address suggestions

- **Google Places API (New)** for address suggestions (spec 037), called only by the backend so the key stays on
  the server, behind the `AddressSuggestionProvider` port (`modules/classes/src/location/provider/address-suggestion.provider.ts`:
  `suggest({ query, sessionToken, language })` → `{ placeId, title, description }[]`, `findPlace({ placeId,
  sessionToken, language })` → `{ address, latitude, longitude, name }` or `null`), implemented with `fetch` by
  `GooglePlacesAddressSuggestionProvider` (`apps/backend/src/modules/classes/google-places.address-suggestions.ts`):
  `POST https://places.googleapis.com/v1/places:autocomplete` with a location bias (a 50 km circle around
  Fortaleza, −3.7319, −38.5267) and `GET https://places.googleapis.com/v1/places/{placeId}` with the field mask
  `formattedAddress,location,displayName`, both with the `X-Goog-Api-Key` header, the `sessionToken` (Google bills
  autocomplete by session) and `languageCode`. A non-2xx or network error rejects (the use cases answer 502); a 404
  or an incomplete place answers `null`. Google answers 400, not 404, for a malformed place id, so a forged id gets
  the 502. Variable `GOOGLE_MAPS_API_KEY` (backend, empty in `.env.example`): without it outside production the
  provider warns once and answers no suggestions and no place; with `NODE_ENV=production` its constructor throws so
  the backend refuses to start — the Resend and Anthropic pattern.
- **Maps on the phone**: `react-native-maps` (see Applications) — Apple Maps on iOS needs no key; Google Maps on
  Android needs `GOOGLE_MAPS_ANDROID_API_KEY` (Maps SDK for Android) at prebuild, through `app.config.ts`. Android
  maps were checked on the emulator in spec 065 (the emulator's own geocoder may be down, so a tapped point falls back
  to its coordinates there).
- Tests never call Google: the e2e suite overrides `GooglePlacesAddressSuggestionProvider` with a fake, its unit
  spec mocks `fetch`, and the mobile tests mock `react-native-maps` in `jest.setup.ts`.

### Scheduled work

- **`@nestjs/schedule`** in the backend (`ScheduleModule.forRoot()` in `AppModule`; today six jobs,
  `SignInCodeCleanupJob`, `PushReceiptCheckJob` (spec 020), `AccountErasureJob` (spec 021, cron
  `account-erasure`, `waitForCompletion`: runs `EraseDeniedRegistrations`, then `EraseClosedAccounts` (spec 067),
  each in its own `try` so one failing doesn't stop the other, logging one count line per kind
  (`Erased N denied registration(s)`, `Erased N closed account(s)`) and answering
  `{ deniedRegistrations, closedAccounts }`) and
  `CancellationDeadlineJob` (spec 036, cron `cancellation-deadline`, `waitForCompletion`: runs
  `WorkOutCancellationDeadlines`, at most 20 classes per tick and 5 model calls at a time, idempotent by the
  stored deadline, attempts and next attempt, and logs only the counts) and `EnrolmentExpiryJob` (spec 041, cron
  `enrolment-expiry`, `waitForCompletion`: runs `ExpirePendingEnrolments`, idempotent by the stored status — a
  request is written only while `pending` and only a changed row is pushed —, logs only the count) and
  `GuestErasureJob` (spec 045, cron `guest-erasure`, `waitForCompletion`: runs `EraseGuestData`, idempotent by the
  write — it only touches guests not erased yet —, logs only the count) and `ClassReminderJob` (spec 054, cron
  `class-reminder`, `waitForCompletion`, in `apps/backend/src/modules/classes/`: runs `SendClassReminders` —
  classes not cancelled, not reminded and starting in (now, now + `CLASS_REMINDER_LEAD_MINUTES` = 30] are marked
  with one conditional `updateMany` (`reminder_sent_at` and `cancelled_at` null → now), and only a class whose write
  changed the row notifies its approved students (`ClassRosterReader`) and instructors, each once; a class whose
  location can't be found stays due; a failed push isn't retried —, idempotent by `classes.reminder_sent_at`,
  which an edit that moves the start clears, logs only the count)): one job per kind of timed event (expired sign-in codes, pending enrolments expiring at the
  class start, 30-minute reminders, rating prompts, 30-day erasures of denied/deleted/removed accounts, guest
  data erasure, cancellation-deadline retries), each running every minute and **idempotent** — it records in
  the database what it already did, so a restart or a late tick never sends twice.
  An erasure is idempotent by its write: a denied registration's absence is the record, and an erased account's
  `erased` status (a deleted or removed one, a guest's `erased_at`), so a second tick finds nothing (no marker table). Jobs catch and log every error and never throw; an erasure job logs only the count,
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
  `jest.fn`s over an in-memory `Map`, reset between tests (the async trio for the session and the synchronous
  `getItem` / `setItem` for the device preferences) — and calls `resetSessionStore()` before every test,
  since the session store is module state. It also mocks `expo-notifications` (permissions, token, listeners and
  `getLastNotificationResponse` as `jest.fn`s), `expo-device` (`isDevice: true`) and `expo-constants` (an EAS
  `projectId`), so tests drive push behavior through those mocks. `@expo/ui/community/datetime-picker` is a host
  `View` that keeps `value` and `onValueChange` (default and named export), so tests change a time by calling
  `onValueChange`; the native wheels can't be moved by the simulator's injected touches either.
  `react-native-maps` (spec 037) is `MapView` and `Marker` as host elements that keep their props (default and named
  exports, `PROVIDER_GOOGLE` `"google"`), so tests fire `onPress` with a coordinate and read the marker's
  `coordinate`; its ref has `setCamera` and `animateToRegion` as `jest.fn`s (spec 065). `expo-location` is mocked
  (permission granted, a Fortaleza position, no address by default), and Reanimated's `useAnimatedKeyboard` answers
  shared-value-like objects for a closed keyboard. Tests that need a signed-in app seed the real store
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
  configurable tickets (`overrideProvider`); `classes.e2e-spec.ts` overrides it the same way and the classes
  module's `SystemClockProvider` with a fixed clock, and each test deletes the classes, locations and users it
  created. `my-classes.e2e-spec.ts` (spec 048) does the same, its clock fixed at 2026-10-14 10:00 Fortaleza, with the
  classes created relative to it. `people-roles.e2e-spec.ts` (spec 058) fixes the classes and enrolment clocks the
  same way; where an exact number of admins matters, it sets the shared database's own approved admins aside (role
  set to `instructor` by raw SQL, so `updated_at` isn't touched) and puts them back after every test, and it forces
  the last-admin races by holding the approved admins' rows `FOR UPDATE` until both requests wait on the lock
  (`pg_stat_activity`). `people-removal.e2e-spec.ts` (spec 066) does the same for removals and restores (fixed
  clocks, the database's own admins set aside for the last-admin race, the same `FOR UPDATE` race), fakes
  `ExpoPushProvider` and deletes every user, class and token it created. `locations.e2e-spec.ts` (spec 037) overrides `ExpoPushProvider`, `GooglePlacesAddressSuggestionProvider`
  and the classes clock (fixed in 2037, like the deadline suites) the same way. `cancellation-rules.e2e-spec.ts` and `cancellation-deadlines.e2e-spec.ts` (spec 036) fix the classes
  clock in 2037, so the job only meets the test's own classes and never writes fake deadlines to real ones in a
  shared dev database, snapshot the stored cancellation rules before and put them back after, and the second
  overrides `AnthropicDeadlineDescriber` with a configurable fake and runs the job through
  `app.get(CancellationDeadlineJob).run()`. Mobile tests that open a sheet can't assert a closed sheet is
  hidden: the bottom-sheet mock keeps its content mounted. `expo-web-browser` is mocked per test.

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
.docs/designs/**                          # design prototypes (checked by opening them) and their pack script (tested with `node --test`, which the coverage tooling doesn't measure); decided with the user in spec 071
modules/*/src/**/index.ts                 # re-export barrels
packages/shared/src/**/index.ts           # re-export barrels
```
