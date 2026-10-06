---
name: module-aggregate
description: Creates the standardized structure of an aggregate inside a business module, organizing folders, base files and naming of model, provider and usecase to accelerate the consistent evolution of the project.
---

# Module Aggregate

Use the `scripts/create-aggregate.js` script to deterministically create the base structure of an aggregate inside an existing module in `modules/<module>`.

## Mandatory inputs

1. `module name`, corresponding to an already existing folder in `modules/<module>`.
2. `aggregate name`.

## Optional, but recommended input

3. `initial structure type of the use cases`:
   - `crud`
   - `example`

If the request does not provide this third input, stop and ask objectively:

`Do you want to create the usecases base in "crud" or "example"?`

Without this answer, do not run the skill.

## Flow

1. Validate that the request explicitly provides the module and the aggregate.
2. Validate that `modules/<module>` already exists and contains `src/index.ts`.
3. Normalize the aggregate name to `kebab-case` in folders and files.
4. If `mode` does not come in the request, ask the objective question above and wait.
5. Run from the project root:

```bash
node "$(find . -maxdepth 6 -path "*/module-aggregate/scripts/create-aggregate.js" ! -path "*/node_modules/*" | head -1)" --module auth --aggregate user-profile --mode crud
```

6. Check at the end:
   - `modules/<module>/src/<aggregate>/model/<aggregate>.entity.ts`
   - `modules/<module>/src/<aggregate>/provider/<aggregate>.repository.ts`
   - `modules/<module>/src/<aggregate>/usecase/index.ts`
   - `modules/<module>/src/<aggregate>/index.ts`
   - `modules/<module>/src/index.ts` exporting `./<aggregate>` without removing existing exports

## What the skill creates

- Aggregate structure in `modules/<module>/src/<aggregate>/`
- `model`, `provider` and `usecase` folders
- Base entity with `Entity` and `EntityState`
- Initial repository contract with `CrudRepository`
- `index.ts` files necessary to export the aggregate
- Minimal use cases according to the requested mode

## Use case modes

### `crud`

Creates the standardized base:

- `create-<aggregate>.usecase.ts`
- `update-<aggregate>.usecase.ts`
- `delete-<aggregate>.usecase.ts`
- `find-<aggregate>-by-id.usecase.ts`
- `find-<aggregate>-page.usecase.ts`

### `example`

Creates only a minimal and generic use case to demonstrate the structure:

- `create-<aggregate>.usecase.ts`

## Mandatory conventions

- Do not implement real business rules.
- Do not invent attributes specific to the aggregate.
- Do not assume an opinionated DDD approach beyond the organization by aggregate already used in the project.
- Do not create a controller, adapter, Prisma implementation, migration or any additional infrastructure.
- Preserve existing exports in `modules/<module>/src/index.ts`.
- Use only resources contained in this skill (scripts, templates and references of this skill's directory).

## Internal resources

- `scripts/create-aggregate.js`: materializes the aggregate structure.
- `assets/common/`: base templates for `model`, `provider` and `index.ts`.
- `assets/usecase/crud/`: templates of the CRUD use cases.
- `assets/usecase/example/`: template of the minimal example use case.

## Guardrails

- Do not run when the provided module does not exist.
- Do not run when the aggregate already exists.
- Do not infer the `crud` or `example` mode when it does not come in the request.
- Do not edit files outside `modules/<module>/src/**`, except the skill itself.
- Do not add extra documentation outside the skill's files.
