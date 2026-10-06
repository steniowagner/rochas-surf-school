# Technical Interview Guide

The areas of `.specs/templates/technical-context-model.md`: where to find evidence in an existing repo (most
of it is in the `detect-stack.mjs` inventory), what the code cannot tell you and must be asked, and what a
greenfield project has to decide. The code is the authority on **facts** (what is installed, which version);
the user is the authority on **intent** (what stays, what is the standard, where it is going).

## Contents

1. Repository and tooling → `Monorepo` / `Repository`
2. Applications → `Applications`
3. Persistence → `Persistence`
4. Architecture → `Architecture`
5. Fixed conventions → `Fixed conventions`
6. Authentication → `Authentication`
7. Error handling → `Error handling`
8. External integrations → `External integrations`
9. Automated validation → `Automated validation`
10. Deployment and environments
11. Red flags

## 1. Repository and tooling → `Monorepo` / `Repository`

- Evidence: lockfile and `packageManager`, workspaces, `turbo.json`/`nx.json`, root scripts, `engines` /
  `.nvmrc`, TypeScript version, lint and format configs, version overrides.
- Ask: only what the files leave open (e.g. which formatter is the standard when several are configured).
- Name the section `Repository` when it is a single package.

## 2. Applications → `Applications`

- Evidence: each workspace's framework and installed version, dev/build scripts, entry points (ports live in
  `main.ts`, dev scripts, `.env.example` or `CLAUDE.md`), config files, test config.
- Ask what each app is **for** in the product, using the roles and platforms from `product.md` (who uses the
  web app? who uses mobile? is the web app a public site, an admin, or both?), whether the template or example
  code stays, and the target platforms (iOS, Android, web).
- Greenfield: for each platform the product needs, recommend a framework that fits the user's preferences and
  experience; give the trade-off in one line.

## 3. Persistence → `Persistence`

- Evidence: ORM schema files, migrations, the database image in compose, connection variable names, seed
  scripts.
- Ask: how the schema is organized and how migrations are named (if not evident), what seeds contain
  (technical data only, or demo data), and how tenancy is enforced if the product is multi-tenant.

## 4. Architecture → `Architecture`

- Evidence: the folder layout (e.g. framework-free business modules vs. framework apps), import directions,
  and the project skills in `.claude/skills/` — generator skills usually encode the layers and their rules.
- Ask: confirm the style's name and the dependency rule, where business rules live, and what each layer must
  not depend on.

## 5. Fixed conventions → `Fixed conventions`

- Evidence: `CLAUDE.md` / `AGENTS.md`, lint configs, the naming of existing files, and the project skills
  that generate files (their templates show the suffixes in use).
- Cover at least: languages (code identifiers, UI, documentation); naming — the project's file suffixes as
  a short table, and any exception to the general rules in `../shared/naming-rules.md`;
  API contracts (DTOs or not, validation library); where business validation happens; how data ownership is
  enforced; error format; i18n; design system and tokens (when there is UI); dependency constraints (pins,
  overrides).
- Every rule gets its reason. A rule without a reason is the first one to be "fixed".

## 6. Authentication → `Authentication`

- Evidence: auth libraries, guards, auth models and migrations, secret variable names, social sign-in SDKs.
- Ask: sign-in methods (email/password, Google, Apple…), how the session is kept per client (cookie on web,
  secure storage on mobile), how roles are enforced, and whether password reset and email verification exist.

## 7. Error handling → `Error handling`

- Evidence: exception filters, error classes, response types.
- Ask: the error contract (shape, i18n keys or messages, status codes) and how each client displays errors.
- Greenfield: recommend one contract now; it is expensive to change after several specs depend on it.

## 8. External integrations → `External integrations`

Start from the product: push notifications, email/SMS, payments, file and photo storage, maps, analytics,
AI. For each one, either a decision — provider, SDK, variable names, where the implementation lives, the port
the domain depends on — or an explicit deferral ("provider chosen by the first spec that needs it").

## 9. Automated validation → `Automated validation`

- Evidence: test runners and configs per workspace, test file counts, e2e setups, `*.http` files, CI.
- Ask: the standard going forward **per layer** (domain unit tests? API integration tests? UI automated or
  manual? mobile?), the exact commands, whether CI enforces them, and — when two runners coexist — which one
  is the standard.
- **Coverage is fixed at 100%** of every source file a spec changes; what you decide with the user is how it
  is produced and what is excluded: the coverage command per workspace (and where its report lands), and the
  files that can't be meaningfully unit-tested — each with its reason — for the `coverage-exclude` block. A
  workspace with source code but no test runner can't pass the gate: either a runner is added (often the
  first spec) or its files are excluded on purpose. Make that an explicit decision.
- **End-to-end**: which apps have an e2e suite and its command, and which user journeys a reviewer must drive
  by hand or with a browser or simulator.
- Why it matters: `spec-review` verifies every Expected Result with exactly these tools. "We test some
  things" turns every review into a judgment call.

## 10. Deployment and environments

Add a `Deployment` section only when something is decided: where each app runs, environments, CI/CD, how
secrets are managed. Otherwise record an explicit deferral in the closest section or leave it out.

## 11. Red flags

- Two tools for the same job (Jest and Vitest, ESLint and oxlint, two ORMs) without a stated standard.
- Docs that disagree with the code (versions, ports, commands): the code wins for facts, the user decides
  intent, and the stale doc gets reported.
- Stock template or example code that could be mistaken for product code.
- Generated folders (native projects after prebuild, generated clients) treated as source.
- Secrets committed or sitting in example files — tell the user; never copy the value anywhere.
- "Later" on a decision the first spec will need (database, auth method, error contract).
- A product capability with no technical home (push notifications with no provider decision or deferral).
