---
id: "025"
slug: ci-tests
title: CI test suites per affected app
status: in-review
created: 2026-10-13
started: 2026-10-13
base_commit: 502313a29309e521010178dfbf8617568d2f8f1e
fronts: [web, infra]
depends_on: []
---

# 025 — CI test suites per affected app

## Goal

Every push to `main` and every pull request into it runs, on GitHub Actions, the test suites of only the apps
the change affects — a file changed inside the app, or in a workspace it imports. The backend job runs its unit
and e2e suites, the web job its unit/integration and Playwright suites, the mobile job its Jest suite, and a
domain job the suites of the affected `modules/*` and `packages/*`; one `ci` check summarizes them. To make
the web job meaningful, `apps/web` gets its first test runners (Vitest and Playwright) and a first set of tests.

## Context

- Product: [product.md](../../memory/product.md) — no product concept changes; this is delivery tooling.
- Requirements: none — the source documents don't cover CI.
- Technical: [technical-context.md](../../memory/technical-context.md) — Monorepo (Turborepo 2.11.7, npm
  workspaces, Node ≥ 24), Automated validation (per-workspace runners, the backend e2e suite against Postgres,
  "`apps/web` has none") and Coverage (`apps/web/src/**` is excluded).
- Existing code this builds on:
  - No `.github/` folder exists: the former `.github/workflows/spec-check.yml` was deleted in commit `0ff48b5`,
    while `structure.md` and the technical context still mention it and "the CI `e2e` job".
  - `turbo.json` has `build`, `lint`, `check-types` and `dev` tasks only; no `test` task.
  - Internal dependencies (from each `package.json`): backend → `auth`, `notifications`, `school-rules`,
    `school-settings`, `shared`; mobile → `auth`, `design-tokens`, `shared`; web → `design-tokens`, `shared`;
    `notifications` and `school-settings` → `shared`; `school-rules` → `auth`, `shared`.
  - `packages/shared` and `modules/*` resolve to `dist/` (their `main`/`exports`), so they must be built before
    the apps' tests run; `packages/design-tokens` exports TypeScript source and needs no build.
  - The backend's Prisma client is generated into the git-ignored `apps/backend/src/generated/`; today only
    `prebuild` and `precheck-types` run `prisma generate`.
  - `apps/backend/.env.example` lists `PORT`, `DATABASE_*`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `RESEND_API_KEY`,
    `EMAIL_FROM`, `AUTH_CODE_PEPPER`, `REFRESH_TOKEN_EXPIRES_IN_DAYS`, `REVIEW_ACCOUNTS`,
    `GOOGLE_WEB_CLIENT_ID`, `EXPO_ACCESS_TOKEN`; `apps/web/.env.example` holds the build-time values the pages
    require (`SCHOOL_WHATSAPP_NUMBER`, `SCHOOL_LEGAL_NAME`, `DPO_NAME`, `DPO_EMAIL`…).
  - Web: locales `pt-br`, `es`, `en` with `matchLocale` (`apps/web/src/i18n/locales.ts`); `src/proxy.ts`
    redirects `/`, `/privacy-policy`, `/terms-of-use` and `/account-deletion` (307) to the
    `Accept-Language` locale, `pt-br` when none matches; pages under `src/app/[lang]/` (home, `privacy-policy`,
    `terms-of-use`, `account-deletion`); the theme toggle stores `theme` in `localStorage` and sets
    `data-theme` on `<html>` (spec 024); components in `src/components/` (`theme-toggle`, `language-picker`,
    `ui/button`, `ui/chip`, …).
  - `.specs/scripts/run-related-tests.mjs` detects Vitest from a workspace's `test` script or devDependencies,
    so the web Vitest suite is picked up by the spec workflow once it exists.
- Turbo docs (v2.11.7): `--affected` compares the PR base (`GITHUB_BASE_REF`) or, on push, the event's
  `before` commit with `HEAD`, and treats every package as changed when the checkout is too shallow;
  `TURBO_SCM_BASE` / `TURBO_SCM_HEAD` override base and head.

## Scope

### In scope

- `.github/workflows/ci.yml` with the jobs `changes`, `backend`, `web`, `mobile`, `domain` and `ci`.
- `.github/scripts/affected.mjs` (which jobs a change needs) and its `node --test` tests.
- Turbo `test` and `test:e2e` tasks; `pretest` / `pretest:e2e` scripts in the backend that run `prisma generate`.
- Vitest + React Testing Library + jsdom in `apps/web`, with unit/integration tests for `locales.ts` and the
  `theme-toggle`, `language-picker`, `button` and `chip` components.
- Playwright (Chromium) in `apps/web`, with e2e tests for the pages, the redirect, the theme toggle and the
  language picker.

### Out of scope

- A separate backend integration suite: backend "integration" is its unit + e2e suites (D-04).
- Any mobile e2e suite (Maestro or other).
- Lint, type check or build as CI gates (D-03).
- Restoring `.github/workflows/spec-check.yml` (D-11).
- Removing the `apps/web/src/**` coverage exclusion or backfilling full web coverage (follow-up spec, D-06).
- Configuring branch protection / required checks in GitHub (the user's manual step), deploys, Turbo remote
  caching, browsers other than Chromium.

## Decisions

| ID | Decision | Reason |
| --- | --- | --- |
| D-01 | "Affected" comes from Turbo's dependency graph: `affected.mjs` runs `npx turbo ls --affected --output=json` and maps the affected packages to jobs (backend → `backend`, web → `web`, mobile → `mobile`, any `modules/*` or `packages/*` package with a `test` script → `domain`). No hand-written path filters. | The graph already defines "used by"; a new module or dependency is picked up without editing the workflow. |
| D-02 | Triggers: `pull_request` targeting `main` and `push` to `main`. `concurrency` per ref cancels superseded runs. | The user commits directly to `main`; PR-only CI would rarely run. |
| D-03 | The workflow runs tests only — no lint, type check or build gates (the web job builds only because Playwright serves the built app). | Requested scope: tests. |
| D-04 | Backend "integration" = the existing unit (`npm test`) + e2e (`npm run test:e2e`) suites; no new suite. | The e2e suite already exercises Nest + Prisma + Postgres; another layer would be a new convention. |
| D-05 | Web: Vitest + `@testing-library/react` + jsdom for unit/integration, files `src/**/*.test.{ts,tsx}`, `test` script `vitest run`; Playwright (Chromium only) in `apps/web/e2e/*.e2e.ts`, `test:e2e` script `playwright test`, whose `webServer` runs `next build && next start` on port 3100 (`reuseExistingServer` off in CI). Vitest's `include` never matches `e2e/`. | Vitest is the backend's runner; Chromium-only keeps CI fast; port 3100 avoids clashing with `npm run dev` on 3000; separate globs keep the runners from loading each other's files. |
| D-06 | The `apps/web/src/**` coverage exclusion stays in this spec. | Removing it means testing every existing web line — a retrofit for its own spec. |
| D-07 | CI copies `apps/backend/.env.example` and `apps/web/.env.example` to `.env`, and the backend job's `DATABASE_*` point at the Postgres service (values set as job `env`, which override `.env`). No GitHub secrets. | The suites already replace every external provider with fakes; dummy values are enough and nothing secret is stored in the repo. |
| D-08 | Every job: `actions/checkout` with `fetch-depth: 0`, `actions/setup-node` with Node 24 and npm cache, `npm ci`. | `--affected` needs the history between base and head, or it marks everything changed. |
| D-09 | `turbo.json`: `test` depends on `^build`; `test:e2e` depends on `^build` with `cache: false`. Backend `pretest` and `pretest:e2e` run `prisma generate`. | `shared` and `modules/*` resolve to `dist/`; the backend imports the generated Prisma client. |
| D-10 | Root-level changes run every job: when `affected.mjs` sees a changed file under `.github/` or one of the root `package.json`, `package-lock.json`, `turbo.json`, it marks all four jobs needed, whatever Turbo reports. A change touching only `.specs/**` or `.docs/**` needs no job. | Root config and the workflow itself can break any suite; documentation can't. |
| D-11 | `spec-check.yml` is not restored; spec-finish removes the memory's mentions of it. | The user deleted it on purpose (`0ff48b5`). |
| D-12 | A final `ci` job (`needs` all others, `if: always()`) fails when any needed job's result is `failure` or `cancelled`, and passes otherwise (success or skipped). It is the one check to require in branch protection. | A required job that is skipped blocks a PR; one summary check avoids that. |

## Expected Results

### ER-01 — Changed files map to the right jobs

- **Front:** infra
- **Behavior:** Given a list of changed files and the packages Turbo reports affected, when `affected.mjs`
  computes the jobs, then it outputs `backend`, `web`, `mobile` and `domain` as `true`/`false` (to stdout as
  JSON and to `$GITHUB_OUTPUT` when set) by these rules: only `apps/mobile/**` → `mobile`; only `apps/web/**` →
  `web`; only `apps/backend/**` → `backend`; `packages/shared/**` → all four; `modules/auth/**` → `backend`,
  `mobile`, `domain`; `packages/design-tokens/**` → `web`, `mobile`; `.github/**`, root `package.json`,
  `package-lock.json` or `turbo.json` → all four; only `.specs/**` or `.docs/**` → none.
- **Edge and error cases:** an empty change set → none; `turbo ls` failing → the script exits non-zero (the
  workflow fails rather than silently skipping tests).
- **Verify by:** `node --test ".github/scripts/*.test.mjs"` (`affected.test.mjs`, one test per rule above).

### ER-02 — Backend job runs unit and e2e suites when backend is affected

- **Front:** infra
- **Behavior:** Given `backend` is `true`, when the workflow runs, then the `backend` job starts a Postgres
  service, applies the migrations (`npm run prisma:migrate:deploy -w @rochas-surf-school/backend`), runs
  `npx turbo run test --filter=@rochas-surf-school/backend` and then
  `npx turbo run test:e2e --filter=@rochas-surf-school/backend`, and fails if any test fails.
- **Edge and error cases:** `backend` is `false` → the job is skipped (no Postgres started).
- **Verify by:** `ci.yml` read against this behavior; actionlint passes; the same commands run locally with
  `npm run db:start -w @rochas-surf-school/backend` and the migrations applied pass.

### ER-03 — Web job runs Vitest and Playwright when web is affected

- **Front:** infra
- **Behavior:** Given `web` is `true`, when the workflow runs, then the `web` job installs Chromium
  (`npx playwright install --with-deps chromium` in `apps/web`), runs
  `npx turbo run test --filter=@rochas-surf-school/web` and then
  `npx turbo run test:e2e --filter=@rochas-surf-school/web`, and fails if any test fails.
- **Edge and error cases:** `web` is `false` → skipped.
- **Verify by:** `ci.yml` read against this behavior; actionlint passes; the same commands pass locally.

### ER-04 — Mobile job runs Jest when mobile is affected

- **Front:** infra
- **Behavior:** Given `mobile` is `true`, when the workflow runs, then the `mobile` job runs
  `npx turbo run test --filter=@rochas-surf-school/mobile` and fails if any test fails. No e2e runs.
- **Edge and error cases:** `mobile` is `false` → skipped.
- **Verify by:** `ci.yml` read against this behavior; actionlint passes; the same command passes locally.

### ER-05 — Domain job runs the suites of affected modules and packages only

- **Front:** infra
- **Behavior:** Given `domain` is `true`, when the workflow runs, then the `domain` job runs
  `npx turbo run test --affected --filter="./modules/*" --filter="./packages/*"` (the affected workspaces among
  `modules/*` and `packages/*`), and fails if any test fails. When D-10 applies (root change), it runs the same
  command without `--affected`, so every domain suite runs.
- **Edge and error cases:** `domain` is `false` → skipped; an affected package without a `test` script
  (`design-tokens`) runs nothing.
- **Verify by:** `ci.yml` read against this behavior; actionlint passes; the job's command run locally with
  `TURBO_SCM_BASE=HEAD~1` after a commit touching only `modules/auth` runs only the `auth` and `school-rules`
  suites among the domain workspaces.

### ER-06 — The `ci` summary check

- **Front:** infra
- **Behavior:** Given the `changes`, `backend`, `web`, `mobile` and `domain` jobs have finished, when the `ci`
  job runs (always), then it fails if any of them ended `failure` or `cancelled`, and passes when each ended
  `success` or `skipped`.
- **Edge and error cases:** `changes` failing (so every test job is skipped) → `ci` fails.
- **Verify by:** `ci.yml` read against this behavior (the `if: always()` and the result check over
  `needs.*.result`); actionlint passes.

### ER-07 — Web unit and integration tests

- **Front:** web
- **Behavior:** Given the web workspace, when `npm test -w @rochas-surf-school/web` runs, then Vitest passes
  tests that prove: `matchLocale` picks the first supported language by quality order, maps regional variants
  (`pt-PT` → `pt-br`, `es-MX` → `es`, `en-GB` → `en`) and falls back to `pt-br` for a missing, empty or
  unsupported header; `hasLocale` accepts only `pt-br`, `es`, `en`; pressing `ThemeToggle` flips `data-theme`
  on `<html>` from the effective theme and stores it under `localStorage` `theme`, and still flips when storage
  throws; `LanguagePicker` lists the three languages and links the current path under the chosen locale;
  `Button` and `Chip` render their label and forward their props.
- **Edge and error cases:** the ones listed (q=0 entries ignored, storage unavailable).
- **Verify by:** `npm test -w @rochas-surf-school/web` — `src/i18n/locales.test.ts`,
  `src/components/theme-toggle/theme-toggle.component.test.tsx`,
  `src/components/language-picker/language-picker.component.test.tsx`,
  `src/components/ui/button/button.component.test.tsx`, `src/components/ui/chip/chip.component.test.tsx`.

### ER-08 — Web Playwright e2e tests

- **Front:** web
- **Behavior:** Given the built web app served by Playwright's `webServer`, when
  `npm run test:e2e -w @rochas-surf-school/web` runs, then it passes tests that prove: each of the four pages
  (home, `privacy-policy`, `terms-of-use`, `account-deletion`) answers 200 under `/pt-br`, `/es` and `/en` with
  `<html lang>` `pt-BR`, `es`, `en` and a visible page heading; `/` with `Accept-Language: es` lands on `/es`,
  and with `Accept-Language: de` lands on `/pt-br`; after toggling the theme and reloading, `<html>` keeps the
  chosen `data-theme`; choosing English in the language picker on `/pt-br/terms-of-use` lands on
  `/en/terms-of-use`.
- **Edge and error cases:** the unsupported-language fallback above.
- **Verify by:** `npm run test:e2e -w @rochas-surf-school/web` — `e2e/pages.e2e.ts`, `e2e/redirect.e2e.ts`,
  `e2e/theme-toggle.e2e.ts`, `e2e/language-picker.e2e.ts`.

## Tasks

### Web (`apps/web`)

- [x] **T-01** — Add Vitest, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/user-event`,
  `@testing-library/jest-dom` and `jsdom` as devDependencies of `apps/web`; create `apps/web/vitest.config.ts`
  (jsdom, `@/*` alias as in `tsconfig.json`, `include: ["src/**/*.test.{ts,tsx}"]`, `@vitest/coverage-v8`
  coverage) and a setup file; add the `test` script `vitest run`; write `src/i18n/locales.test.ts`
  (`matchLocale`, `hasLocale`). Follow `.claude/rules/react.md` and the `vercel-react-best-practices` skill.
  Skill: [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-07 · Done when: `npm test -w @rochas-surf-school/web` passes with the locales tests and
  `npm run check-types -w @rochas-surf-school/web` exits 0.
  > ✅ 2026-10-13 12:00 — added Vitest 4, coverage-v8, plugin-react, RTL, user-event, jest-dom and jsdom 30 to
  > `apps/web` devDependencies, the config (jsdom, `@/` alias, `src/**/*.test.{ts,tsx}`, v8 coverage), the setup
  > file (jest-dom matchers, cleanup) and the `test` script; files: `apps/web/package.json`, `package-lock.json`,
  > `apps/web/vitest.config.ts`, `apps/web/vitest.setup.ts`, `apps/web/src/i18n/locales.test.ts`; verified:
  > `npm test -w @rochas-surf-school/web` (6 passed), `npm run check-types -w @rochas-surf-school/web` (exit 0);
  > deviations: none (Vite prints a harmless `configLoader: native` warning for the `.ts` config)

- [x] **T-02** — Component tests for `src/components/theme-toggle/theme-toggle.component.test.tsx`,
  `src/components/language-picker/language-picker.component.test.tsx`,
  `src/components/ui/button/button.component.test.tsx` and `src/components/ui/chip/chip.component.test.tsx`
  (behavior in ER-07). Skill: [`vercel-react-best-practices`](../../../.claude/skills/vercel-react-best-practices).
  Covers: ER-07 · Done when: `npm test -w @rochas-surf-school/web` passes with all five test files.
  > ✅ 2026-10-13 12:05 — component tests for the theme toggle (OS scheme, `<html>` theme, storage, storage
  > throwing), language picker (`next/navigation` mocked; three links, current page), button (variants, icon,
  > link form, forwarded props) and chip; files: `apps/web/src/components/theme-toggle/theme-toggle.component.test.tsx`,
  > `apps/web/src/components/language-picker/language-picker.component.test.tsx`,
  > `apps/web/src/components/ui/button/button.component.test.tsx`,
  > `apps/web/src/components/ui/chip/chip.component.test.tsx`; verified: `npm test -w @rochas-surf-school/web`
  > (5 files, 21 passed), type check and lint exit 0; deviations: `apps/web/vitest.config.ts` sets
  > `execArgv: ["--no-experimental-webstorage"]`, because Node 26's experimental global `localStorage` (undefined
  > without `--localstorage-file`) shadows jsdom's; `apps/web/eslint.config.mjs` ignores `coverage/**` so generated coverage reports aren't linted

- [x] **T-03** — Add `@playwright/test`; create `apps/web/playwright.config.ts` (Chromium project, `testDir:
  "e2e"`, `testMatch: "*.e2e.ts"`, `webServer` running `next build && next start -p 3100`, `baseURL`
  `http://localhost:3100`, `reuseExistingServer: !process.env.CI`); add the `test:e2e` script `playwright test`;
  ignore `test-results/` and `playwright-report/` in `apps/web/.gitignore`; write `e2e/pages.e2e.ts` and
  `e2e/redirect.e2e.ts` (ER-08 pages and redirect). Covers: ER-08 · Done when:
  `npm run test:e2e -w @rochas-surf-school/web` passes with both files.
  > ✅ 2026-10-13 12:15 — added `@playwright/test`, the Chromium project config (`webServer` builds and starts on
  > port 3100), the `test:e2e` script, the gitignore entries, the pages test (4 pages × 3 locales: 200, `<html
  > lang>`, `h1` visible) and the redirect test (`es` → `/es`, `de` → `/pt-br`); files: `apps/web/package.json`,
  > `package-lock.json`, `apps/web/playwright.config.ts`, `apps/web/.gitignore`, `apps/web/e2e/pages.e2e.ts`,
  > `apps/web/e2e/redirect.e2e.ts`; verified: `npm run test:e2e -w @rochas-surf-school/web` (14 passed), type check
  > and lint exit 0; deviations: the redirect tests set Accept-Language through the Playwright `locale` option,
  > because Chromium ignores it in `extraHTTPHeaders` (the first attempt failed with `/en`); the `webServer`
  > command uses `npx next build && npx next start`

- [x] **T-04** — Write `apps/web/e2e/theme-toggle.e2e.ts` (theme kept after reload) and
  `apps/web/e2e/language-picker.e2e.ts` (`/pt-br/terms-of-use` → English → `/en/terms-of-use`).
  Covers: ER-08 · Done when: `npm run test:e2e -w @rochas-surf-school/web` passes with all four files.
  > ✅ 2026-10-13 12:20 — theme test (toggle to dark, reload, `data-theme` kept) and language picker test
  > (opens the picker, English link, lands on `/en/terms-of-use`); files: `apps/web/e2e/theme-toggle.e2e.ts`,
  > `apps/web/e2e/language-picker.e2e.ts`; verified: `npm run test:e2e -w @rochas-surf-school/web` (16 passed,
  > four files), type check and lint exit 0; deviations: none

### Infra (repo root, `.github/`)

- [x] **T-05** — Add `test` (`dependsOn: ["^build"]`, `outputs: ["coverage/**"]`) and `test:e2e`
  (`dependsOn: ["^build"]`, `cache: false`) tasks to `turbo.json`; add `pretest` and `pretest:e2e`
  (`prisma generate`) to `apps/backend/package.json`. Covers: enabling · Done when: after
  `rm -rf packages/shared/dist modules/*/dist apps/backend/src/generated`,
  `npx turbo run test --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/mobile --filter=@rochas-surf-school/web`
  passes.
  > ✅ 2026-10-13 12:35 — added the `test` and `test:e2e` Turbo tasks and the backend `pretest` / `pretest:e2e`
  > (`prisma generate`); files: `turbo.json`, `apps/backend/package.json`, `modules/auth/package.json`,
  > `package-lock.json`; verified: after removing `packages/shared/dist`, `modules/*/dist` and
  > `apps/backend/src/generated`, `npx turbo run test --filter=@rochas-surf-school/backend
  > --filter=@rochas-surf-school/mobile --filter=@rochas-surf-school/web --force` ran 9 tasks successfully (web 21,
  > backend 247, mobile 897 tests passed) and again from the cache after deleting the outputs;
  > deviations: (1) `build` outputs gain `dist/**` — without it a Turbo cache hit skipped the build and left
  > `shared/dist` missing, so the mobile Jest run failed; (2) `modules/auth` imports `@rochas-surf-school/shared`
  > but didn't declare it, so Turbo built it in parallel with `shared` and failed: declared it as a dependency,
  > as its sibling modules do (this also makes `shared` changes affect `auth` in `turbo ls --affected`)

- [x] **T-06** — Write `.github/scripts/affected.mjs`: reads the changed files (`git diff --name-only
  <base>...HEAD`, base from `--base`, else `TURBO_SCM_BASE`, else the event: the PR base ref, or the push's
  `before`) and the affected packages (`npx turbo ls --affected --output=json` with the same base), applies D-01
  and D-10, prints the JSON and appends `backend=`, `web=`, `mobile=`, `domain=` to `$GITHUB_OUTPUT` when set.
  Keep the mapping a pure exported function; write `.github/scripts/affected.test.mjs` (`node:test`) with one
  test per ER-01 rule and edge case. Covers: ER-01 · Done when: `node --test ".github/scripts/*.test.mjs"` passes and
  `node .github/scripts/affected.mjs --base HEAD~1` prints the jobs for the last commit.
  > ✅ 2026-10-13 12:50 — `affected.mjs` with the pure `computeJobs`, `parseTurboList` and `resolveBase` exported;
  > it also outputs `all` (true on a root change, so the domain job can drop `--affected`, D-10) and runs every
  > job when no base can be resolved; files: `.github/scripts/affected.mjs`, `.github/scripts/affected.test.mjs`;
  > verified: `node --test ".github/scripts/*.test.mjs"` (19 passed); `node .github/scripts/affected.mjs --base
  > HEAD~1` prints all jobs (the last commit touched `package.json`); in a throwaway worktree a commit touching
  > only `modules/auth` printed backend/mobile/domain true, one touching only `apps/web` printed only web;
  > deviations: `node --test .github/scripts` (as written in ER-01 and the Verification Plan) fails on Node 26,
  > which takes the directory for a module — the glob spelling above works and is what the workflow and the
  > report should use; the spec text is unchanged pending the user's approval to amend it

- [x] **T-07** — Write `.github/workflows/ci.yml` (D-02, D-07, D-08, D-12): `changes` runs `affected.mjs` and
  exposes its outputs; `backend` (Postgres 18 service with the `.env.example` credentials, migrations, unit then
  e2e), `web` (Chromium install, Vitest then Playwright, `CI=true`), `mobile` (Jest) and `domain` (affected
  `modules/*`/`packages/*` suites; all of them on a root change) each `needs: changes` and run only when their
  output is `true`; `ci` needs all and checks their results. Covers: ER-02, ER-03, ER-04, ER-05, ER-06 ·
  Done when: `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest` reports no errors and each job's
  test commands pass locally.
  > ✅ 2026-10-13 13:00 — workflow with `changes`, `backend` (Postgres 18.6 service, migrations, unit then e2e),
  > `web` (Chromium, Vitest then Playwright, `CI=true`), `mobile`, `domain` (`--affected`, or every suite when
  > `all` is true) and `ci` (`if: always()`, fails on any `failure`/`cancelled` result); files:
  > `.github/workflows/ci.yml`; verified: actionlint exit 0 with no output; backend commands with
  > `apps/backend/.env` replaced by `.env.example` (migrations, 247 unit, 292 e2e passed; the previous `.env` was
  > restored); web and mobile commands passed in T-03/T-05; the domain command with `TURBO_SCM_BASE=HEAD~1` after
  > a `modules/auth`-only commit (throwaway worktree) ran only `auth` and `school-rules`;
  > deviations: none (`permissions: contents: read` added as a least-privilege default)

### Verification

- [x] **T-08** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every automated command in the Verification Plan exits 0
  (`COVERAGE OK`, `E2E PASSED`, actionlint without errors).
  > ✅ 2026-10-13 13:30 — every Verification Plan command passes: `run-related-tests.mjs 025` (web: 21 passed),
  > `check-coverage.mjs 025` (`COVERAGE OK`, after the two exclusions logged under Amendments), `run-e2e.mjs 025`
  > (backend: 292 passed, `E2E PASSED`), `node --test ".github/scripts/*.test.mjs"` (19), `npm test` and
  > `npm run test:e2e -w @rochas-surf-school/web` (21 and 16), actionlint (exit 0), the backend unit + e2e and
  > mobile Turbo commands, the domain command (only `auth` and `school-rules`), and web `lint`, `check-types`
  > and `build`; files: `.specs/memory/technical-context.md` (coverage-exclude); deviations: the exclusions

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 025` — the tests this spec added or changed, and the existing
    tests related to its changes, pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs 025` — every line this spec adds or changes is covered
  - `node .specs/scripts/run-e2e.mjs 025` — the declared e2e suites of the touched apps pass (the backend's;
    the web suite is declared by spec-finish, so it runs in the next line)
  - `node --test ".github/scripts/*.test.mjs"` — ER-01
  - `npm test -w @rochas-surf-school/web` — ER-07
  - `npm run test:e2e -w @rochas-surf-school/web` — ER-08
  - `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest` — the workflow is valid (ER-02 – ER-06)
  - With `npm run db:start -w @rochas-surf-school/backend` and
    `npm run prisma:migrate:deploy -w @rochas-surf-school/backend`: `npx turbo run test test:e2e
    --filter=@rochas-surf-school/backend` passes — ER-02's commands
  - `npx turbo run test --filter=@rochas-surf-school/mobile` passes — ER-04's command
  - The `domain` job's command with `TURBO_SCM_BASE` set to a commit before a `modules/auth`-only change runs
    only the affected domain suites — ER-05
  - `npm run lint -w @rochas-surf-school/web`, `npm run check-types -w @rochas-surf-school/web`,
    `npm run build -w @rochas-surf-school/web` — the web workspace still lints, type checks and builds
- Manual:
  - Read `.github/workflows/ci.yml` against ER-02 – ER-06 and D-02, D-07, D-08, D-12 (triggers, `fetch-depth:
    0`, job conditions, the `ci` result check).

## Memory Impact

- `memory/technical-context.md` — Automated validation: web has Vitest + RTL (`src/**/*.test.{ts,tsx}`,
  `npm test -w @rochas-surf-school/web`) and Playwright (`apps/web/e2e/*.e2e.ts`); add
  `apps/web: npm run test:e2e --workspace apps/web` to the `e2e` block; replace "the public web pages are
  checked in a browser" with the Playwright suite; add a CI section (workflow, jobs, Turbo `--affected`,
  `affected.mjs`, the `ci` summary check to require, `.env.example` values in CI); remove "in CI the `e2e` job
  provides both"; Monorepo: the `test` / `test:e2e` Turbo tasks.
- `memory/structure.md` — replace the `.github/workflows/` line (`spec-check.yml`) with `ci.yml` and
  `.github/scripts/affected.mjs`; add `apps/web/e2e/`, `vitest.config.ts`, `playwright.config.ts`.

## Assumptions

- GitHub-hosted `ubuntu-latest` runners with Docker service containers are available to the repository.
- Branch protection (requiring `ci`) is configured by the user after the spec ships.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

- 2026-10-13 — Verify by (ER-01), the T-06 `Done when` and the Verification Plan: `node --test .github/scripts` →
  `node --test ".github/scripts/*.test.mjs"`. Reason: on Node 26 the directory form is run as a module and fails;
  the glob form runs the same tests. Approved by the user.
- 2026-10-13 — Coverage policy (`memory/technical-context.md` → `coverage-exclude`): added
  `apps/web/vitest.setup.ts` (v8 never reports Vitest setup files, as with `apps/mobile/jest.setup.ts`) and
  `.github/scripts/affected.mjs` (tested with `node --test`, which the coverage tooling cannot measure). Approved
  by the user, who chose to also register a measured root runner; that needs `node:test` support in
  `.specs/scripts` (a framework change) and is left as a follow-up.

## Review
