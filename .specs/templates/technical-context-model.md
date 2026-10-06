# Global Technical Context

> Template for the **global technical context** file (`.specs/memory/technical-context.md`): the stack,
> constraints and cross-cutting technical decisions that apply to the whole project.
> Before using it, replace the placeholders below and remove this instructions section.
>
> **Purpose of this file:**
> - It is the **single source** of technical decisions. Specs **reference** it instead of repeating it;
>   a spec's "Technical Context" only adds what is local to that change.
> - It records **decisions and constraints**, not folder maps (→ [Project structure](../memory/structure.md))
>   nor business rules (→ [Modules](../memory/modules.md)).
> - Every item must be **precise and verifiable**: exact library names, major versions, ports,
>   file paths, environment variable **names** (never their values or secrets).
> - When a rule is not obvious, state the **reason** right after it (e.g.: "…because entities serialize
>   as `{}`"). A rule without a reason is the first one to be broken.
> - It must be **updated** by the spec that introduces or changes a stack item or a convention.
> - **Required by `spec-plan`**: `Applications`, `Architecture`, `Fixed conventions` and `Automated validation`
>   must exist with real content, and no `{{placeholder}}` may remain. Otherwise `spec-plan` refuses to run.
>   `Automated validation` matters most: it tells the reviewer agent how results can be verified.
> - Keep only the sections that apply. Add a section when a new cross-cutting concern appears
>   (e.g.: caching, queues, observability).
>
> **Placeholders:**
> - `{{tool}}` / `{{version}}` — tool or library and its major version (e.g.: `turbo` 2.x, NestJS 11).
> - `{{npm-namespace}}` — npm namespace of the workspaces (e.g.: `@ideias`).
> - `{{app-id}}` / `{{port}}` — application folder and its local port (e.g.: `apps/backend` / 4000).
> - `{{module-id}}` — business module folder name, kebab-case.
> - `{{ENV_VAR}}` — environment variable name, with its default when it has one.
> - `{{rule}}` / `{{reason}}` — a convention and why it exists.

Stack, constraints and cross-cutting decisions that apply to the whole project. Individual specs
reference this file instead of repeating the content.

## Monorepo

- **{{monorepo-tool}}** (`{{tool}}` {{version}}), managed by **{{package-manager}}** (`{{package-manager-version}}`,
  {{runtime}} {{runtime-version}}). Workspace npm namespace: **`{{npm-namespace}}`**.
- Workspaces: {{workspace-globs}}.
- Root scripts: {{root-scripts}} (what each one delegates to).
- Language: {{language-and-version}}. {{lint-and-format-tools}} configured.

## Applications

> One bullet per application: framework + major version, port, main libraries by concern
> (UI, forms, charts, session…), build command and test setup.

- **`apps/{{app-id}}`** — {{framework}} {{version}}, port **{{port}}**. {{app-cross-cutting-setup}}.
  Build with `{{build-command}}`. Tests with {{test-stack}} (`{{test-file-pattern}}`).

## Persistence

- **{{database}}** via **{{orm}} {{version}}** (`{{orm-packages}}`).
- {{schema-organization}} (e.g.: modular schema by domain in `apps/backend/prisma/models/{{module-id}}.model.prisma`).
- {{migration-rule}} (e.g.: incremental migrations named by module).
- {{seed-rule}}.
- Connection: `{{ENV_VAR}}` in {{env-file-location}}; local database starts via `{{db-start-command}}`.

## Architecture

> Name the architectural style, then one bullet per layer: where it lives, what it may contain and
> what it must **not** depend on.

- **{{layer}}** live in `{{path}}` — {{allowed-content}}. **Must not** depend on {{forbidden-dependencies}}.

## Fixed conventions

> Rules every spec must follow. Bold the rule, then give the reason or the consequence of breaking it.
> Cover at least: language of code / UI / documentation, naming (link to the naming rules),
> input/output contracts, use case shape, where validation happens, data ownership.

- **{{rule}}**: {{detail}}. {{reason}}.
- **Naming**: {{naming-summary}} — the project's file suffixes (a short table) and any exception to the
  general rules in [Naming rules](../shared/naming-rules.md).

## Authentication

- {{auth-mechanism}} (libraries, global guard, how public endpoints are marked).
- {{auth-boundary}} (which layer knows about tokens/sessions and which does not).
- Secret/config: `{{ENV_VAR}}`, {{expiration}}.
- Front-end session: {{session-storage}} and how private routes are protected.

## Error handling

- {{domain-error-shape}} (how the domain signals errors and what the message represents, e.g.: an i18n key).
- {{api-error-conversion}} (global filter and the response contract).
- {{frontend-error-display}} (how the client translates and displays errors).

## External integrations

> One subsection per external service (e.g.: AI provider, payments, email). Remove if there is none.

### {{integration-name}}

- Provider: **{{provider}}** via `{{sdk}}`. Variables: `{{ENV_VAR}}` (mandatory/optional, default).
  **Never** commit real keys.
- Concrete implementation in `{{path}}`; the domain depends only on the abstract port `{{port-name}}`.
- Exposed endpoints: `{{method}} {{route}}` — {{purpose}}.
- Behavior and limits: {{sync-or-streaming}}, {{cache-policy}}, error mapping (`{{error-key}}`, {{status}}).

## Automated validation

{{validation-standard}}: which layers have automated tests and with which tools
(e.g.: unit tests of the modules + `*.integration.http` scenarios), and which are validated
**manually** (e.g.: "There is no automated UI verification — the interface is validated manually.").

- Tests, per workspace: {{test-runner}} (e.g.: Jest in `modules/*`, Vitest in `apps/backend`). Specs run only
  the tests related to their change, with `.specs/scripts/run-related-tests.mjs`, which supports Jest and
  Vitest; for another runner, give its "related tests" command here.
- End-to-end, per app: {{e2e-commands}} (e.g.: `npm run test:e2e --workspace apps/backend`), and which user
  journeys still need someone driving the app (a browser, a simulator).

### Coverage

Every line a spec adds or changes must be **covered**: the statements, branches and functions on it, and the
line itself — a new file counts in full. `.specs/scripts/check-coverage.mjs` enforces it on the spec's change
set, from the reports `run-related-tests.mjs` writes (`coverage/coverage-final.json` or `coverage/lcov.info`).
{{coverage-notes}} (e.g.: anything special about how a workspace produces coverage).

Files that can't be meaningfully unit-tested are listed below, each with its reason — nothing else is
excluded. Tests, type declarations, type-only files and tool configuration are always excluded.

```coverage-exclude
# one path or glob per line, followed by its reason, e.g.:
# apps/backend/src/main.ts  # bootstrap only; exercised by the e2e suite
```
