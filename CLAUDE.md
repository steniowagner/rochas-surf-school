# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Turbo monorepo (npm workspaces) scaffolded by the `config-project-fullstack` skill. The apps are still the stock framework templates. The product brief and its detailed requirements are in `.docs/` (`user-journeys.md`, `requirements.md`); specs live in `.specs/`.

## Layout

- `apps/web`: Next.js (App Router, `src/` dir), port 3000. Reads `NEXT_PUBLIC_API_URL`.
- `apps/backend`: NestJS 12 (ESM, so relative imports need the `.js` suffix), port 4000 via `PORT`. `@nestjs/config` is global, and CORS is enabled.
- `apps/mobile`: Expo 57 / React Native with Expo Router (`src/app`). The root `_layout.tsx` is a Stack that loads the fonts, hides the splash screen and sets the theme variables. `src/app/index.tsx` redirects to the sign-in screen (`(private)/auth`); add a `(tabs)` group for the signed-in area. i18n (en-US, es-ES, pt-BR, picked from the OS language) lives in `src/i18n`. Reads `EXPO_PUBLIC_API_URL`. `localhost` only works on the iOS simulator. Use the machine's LAN IP for a physical device, or `10.0.2.2` for the Android emulator.
- `packages/design-tokens` (`@rochas-surf-school/design-tokens`): the design system's tokens (colors for light/dark, typography, radii, spacing, elevation), taken from `.docs/designs/design-system.html`. `src/tokens.ts` is the source of truth; `src/tokens.css` is generated from it (`npm run build -w @rochas-surf-school/design-tokens`) and committed. `check-types` fails if the CSS is stale.
- `packages/eslint-config`, `packages/typescript-config`: Turbo's shared configs. No app uses them yet; each app has its own ESLint and tsconfig.
- Each app has `.env.example` (committed) and `.env` (ignored).

## Commands

Run from the repo root:

- `npm run dev`: all three apps (`turbo run dev`)
- `npm run build` / `npm run lint` / `npm run check-types`
- `npx turbo run <task> --filter=@rochas-surf-school/<web|backend|mobile>`: one app only

Backend tests (Vitest), from `apps/backend`:

- `npm test`: unit tests. `npm run test:e2e`: e2e tests
- `npx vitest run src/app.controller.spec.ts`: a single file. Add `-t "<name>"` to run a single test

Mobile component tests (Jest + `jest-expo` + React Native Testing Library), from `apps/mobile`:

- `npm test`: all tests. `npx jest src/modules/auth/components/auth`: one folder or file. Add `-t "<name>"` to run a single test
- Tests sit next to the component as `<name>.component.test.tsx` and run in English (US) by default (`jest.setup.ts`). `jest.setup.ts` also mocks the native pieces (localization, reanimated, safe-area, the bottom sheet). In RNTL 14 `render` and `userEvent` are async, so `await` them.

Spec skills (`.claude/skills/spec-*`): after changing one of them or the framework bundled in `spec-init/assets/`, run their evals with `node .claude/evals/spec-workflow/run.mjs` (see its README; it runs `claude -p`, so it costs tokens).

Backend + PostgreSQL in Docker, from `apps/backend`: `docker compose up --build`. The compose file reads its credentials from `apps/backend/.env` (`DATABASE_HOST/PORT/USER/PASSWORD/NAME`) and points the backend at the `postgres` service. Postgres is also published on `DATABASE_PORT`, so `npm run dev` on the host can use it with `DATABASE_HOST=localhost`.

## Design system

Never hard-code colors, fonts or radii; use the tokens so light and dark themes both work. The usage rules (one primary action per screen, grape only for highlights, numbers in Barlow Condensed, 44px touch targets) are in section 08 of `.docs/designs/design-system.html`.

- Web: `globals.css` imports `@rochas-surf-school/design-tokens/tokens.css` and maps it to Tailwind utilities (`bg-page`, `text-ink-2`, `rounded-card`, `shadow-primary`…). Type styles are classes such as `ds-text-screen-title`. Fonts come from `next/font` in `layout.tsx`.
- Mobile: styled with NativeWind (Tailwind v3), using the same utility names as web (`bg-page`, `text-ink-2`, `rounded-card`, `gap-card-gap`, `ds-text-screen-title`…). `tailwind.config.ts` builds the theme from the tokens; colors are `--ds-*` variables that the root layout sets to the light or dark palette (`src/constants/theme-variables.ts`). `inlineRem` is 16 (as on web), so a class means the same size on both platforms. Use `useTheme()` only for colors passed as props (icon `color`, third-party style props) and `shadowStyle()` for elevation. Fonts load in `src/app/_layout.tsx`; custom fonts select weight by family name, so don't rely on `fontWeight`. After changing `tailwind.config.ts` or the tokens, restart Metro with `--clear`.
- Components have the same names and props on both platforms: `src/components/ui/{button,chip}.tsx` in each app.

## React rules (apps/web and apps/mobile)

`.claude/rules/react.md` holds the component conventions for both apps: one folder per component split into `*.component.tsx`, `*.hook.ts`, `*.types.ts` and `index.ts`; import order; function style; when to use `useCallback`/`useMemo`/`React.memo`; and extracting child components. Follow it for every component you write or review.

## Rules for apps/mobile

- Before writing or reviewing any code under `apps/mobile`, load the `vercel-react-native-skills` and `vercel-react-best-practices` skills and follow their rules.
- Every design MUST be built from `@rochas-surf-school/design-tokens` (colors, type, radii, spacing, elevation). If a value is missing, add a token to `packages/design-tokens/src/tokens.ts`; never inline a raw value.
- Style with NativeWind `className`. Use `StyleSheet` or a `style` prop only when a class can't express it: values computed at runtime (safe-area insets, measured sizes), Reanimated styles, elevation (`shadowStyle()`), and props of third-party components that take style objects or colors.
- Build buttons with `TouchableOpacity` (press feedback through `activeOpacity`, not `active:` classes). This overrides the skill's `ui-pressable` rule for buttons; other pressable elements, such as list rows, keep using `Pressable`. One exception: a link inside a sentence uses `TextButton` (`src/components/ui/text-button`), a nested `Text` with `onPress`, because a touchable can't wrap part of a line of text.

## Native builds (apps/mobile)

`ios/` and `android/` are generated by `npx expo prebuild` and gitignored, so never edit them by hand. Use config plugins instead.

- iOS (needs Xcode + CocoaPods): `npx expo prebuild --platform ios`, then `npx expo run:ios`, or `xcodebuild -workspace ios/RochasSurfSchool.xcworkspace -scheme RochasSurfSchool -configuration Release`
- Android (needs JDK 17 + Android SDK 36): `npx expo prebuild --platform android`, then `cd android && ./gradlew assembleRelease`

## Dependency constraints

- `react`, `react-dom`, `@types/react` and `typescript` are pinned to Expo's versions in every workspace and enforced by root `overrides`. When upgrading Expo, update these together. A second React copy breaks the mobile app at runtime.
- The root `@babel/core` devDependency keeps Babel 7 at the root for Metro. Don't remove it.
- `apps/mobile/plugins/with-ios-scene-lifecycle.js` adopts the UIScene life cycle during prebuild. Without it the iOS app crashes at launch on iOS 27, because Expo SDK 57's template doesn't adopt scenes. Remove it after upgrading to Expo SDK 58, which adopts them natively; the plugin no-ops once the template does.
