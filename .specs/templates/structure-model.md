# Project Structure

> Template for the **project structure** file (`.specs/memory/structure.md`): the map of where things
> physically live in the repository — workspaces, folders and the role of each one.
> Before using it, replace the placeholders below and remove this instructions section.
>
> **Purpose of this file:**
> - It answers **"where is X / where should X go?"** without opening the repository.
> - It describes **location and role**, not rules. Stack, versions and conventions belong in
>   [Global technical context](../memory/technical-context.md); business meaning belongs in
>   [Modules](../memory/modules.md).
> - It shows **representative paths**, not every file: go down only to the level that helps
>   locate an aggregate, a layer or an extension point. Use `{a,b}` to group sibling files.
> - `spec-finish` creates it when the first spec is finished, and updates it whenever a spec creates, moves
>   or removes a workspace, module, aggregate, route or top-level folder.
> - Adapt the sections to the repository: keep only the ones that apply (a single-package repository has no
>   `packages/` or `modules/` section).
>
> **Placeholders:**
> - `{{repo-type}}` — kind of repository and tool (e.g.: "Turbo monorepo").
> - `{{workspace-groups}}` — workspace groups and their role (e.g.: `apps/*` (executables), `modules/*` (pure business modules), `packages/*` (shared/config)).
> - `{{npm-namespace}}` — npm namespace of the workspaces (e.g.: `@ideias`).
> - `{{package-id}}` / `{{module-id}}` / `{{aggregate-id}}` — folder names, kebab-case.
> - `{{tree}}` — a fenced block with the folder tree and a short `# comment` per relevant line.

{{repo-type}} with {{workspace-count}} groups of workspaces: {{workspace-groups}}.

## Root

> List only the root files/folders with a project-wide role (workspace config, task runner, specs, skills).

```
package.json          # workspaces, root scripts
{{root-file}}         # {{role}} (e.g.: turbo.json — build/lint/check-types/dev tasks)
.specs/               # project specs and memory (see below)
.claude/skills/       # project generator/validator skills
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

> Keep this section as it is: what is in `changes/` and `finished/` is visible there, and listing it here would
> only drift.

## `packages/`

> One bullet per shared package: npm name, role and the main folders/files a spec is likely to reuse.

- **`packages/{{package-id}}`** (`{{npm-namespace}}/{{package-id}}`) — {{package-role}}:
  - `{{folder}}/` — {{what-lives-there}}.

## `modules/` (pure business — {{forbidden-dependencies}}, e.g.: no NestJS/Prisma/HTTP)

{{module-organization-rule}} (e.g.: organization by **aggregate**; each aggregate has `model/`,
`provider/` (interfaces + fakes), `usecase/`, optionally `constant/`; tests in `modules/<m>/test/`
mirroring `src/`).

> One bullet per module, with one sub-bullet per aggregate listing its representative files.

- **`modules/{{module-id}}`** (`{{npm-namespace}}/{{module-id}}`) — {{aggregate-count}} aggregate(s):
  - `{{aggregate-id}}/` — `model/{{aggregate-id}}.entity.ts`, `provider/{{aggregate-id}}.repository.ts`,
    `usecase/{{use-case-ids}}.usecase.ts`.

## `apps/{{app-id}}` ({{framework}} — {{app-role}}, e.g.: "NestJS — adapters")

> Repeat this section once per application. Show the `src/` tree with one comment per relevant folder,
> then add the global wiring that is not visible in the tree (e.g.: global guards/filters).

```
{{tree}}
```

{{app-global-wiring}} (e.g.: "`AppModule` registers `JwtAuthGuard` as `APP_GUARD` and
`ApiExceptionFilter` as `APP_FILTER` (both global).").

> For a front-end application, also record the navigation facts that specs depend on
> (e.g.: side menu order, public/private route groups, visual identity). Remove otherwise.

{{navigation-and-identity}}.
