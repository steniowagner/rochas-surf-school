---
name: backend-prisma-sync-module
description: 'Synchronize a domain module with the backend Prisma. Use when the request involves analyzing entities in `modules/<module>/src`, creating or updating `apps/backend/prisma/models/<module>.model.prisma`, generating an incremental migration named after the module, applying the migration and keeping the Prisma schema aligned with the entities that inherit from `Entity`.'
---

# Backend Sync Module Prisma

## Objective

Exclusively synchronize the Prisma persistence structure of a monorepo module based on the entities declared in `modules/<module>`.
This skill receives a module, analyzes classes that inherit from `Entity<TState>`, generates or updates the corresponding Prisma file in `apps/backend/prisma/models/<module>.model.prisma`, creates an incremental migration with the module name, runs the migration and keeps the database aligned with the current state of the module.
This skill should only proceed with execution when the target module is explicitly provided by the user or by the immediate context of the task.

Do not create DTOs, Prisma adapters, repositories, seeds, controllers or use cases, unless the request makes this explicit outside this skill.
The skill instructions must remain in Brazilian Portuguese. Generated files and code must follow the language, conventions and style already adopted in the project.

## When to use

- When the request is to synchronize a module's entities with Prisma.
- When there is creation or change of entities in `modules/<module>` and this needs to become schema and migration.
- When it is necessary to review whether a module's Prisma schema became outdated relative to the domain.
- When it is necessary to create incremental migrations focused on a single module.

## Reading scope

- Read the provided module in `modules/<module>`.
- Look for entities in `**/*.entity.ts` files.
- Prioritize `class Xxx extends Entity<...>` classes.
- Read the `State` associated with each entity to discover the fields persisted by the domain.
- Consider the fields inherited from `EntityState` in `packages/shared/src/model/entity.ts`:
  - `id?: string`
  - `createdAt?: Date`
  - `updatedAt?: Date`
  - `deletedAt?: Date | null`

## Mandatory lock

- Before any reading, schema edit or migration run, check whether there is a clearly provided target module.
- Valid inputs are:
  - module name, such as `auth`
  - module path inside `modules/`
  - unambiguous context pointing to a single module already mentioned in the current task
- If the module has not been clearly provided, stop execution immediately.
- In that situation, the skill must ask the user to state which module they want to synchronize with the backend Prisma.
- Without that information, it must not infer the module, must not edit files and must not run Prisma commands.

## Workflow

1. Resolve the target module.
   - First check whether the module was provided explicitly or unambiguously.
   - If the module has not been provided, stop immediately and ask the user for the name of the module they want to synchronize.
   - Accept module name, path inside `modules/` or equivalent context.
   - Normalize to the real folder name and to the Prisma file name `<module>.model.prisma`.
2. Map the persistable domain.
   - Read all the module's entities.
   - List the fields declared in each entity's `State`.
   - Also include the fields inherited from `EntityState`.
   - Identify relations only when they are clear in the module code.
3. Update the module's Prisma schema.
   - Create or edit only `apps/backend/prisma/models/<module>.model.prisma`.
   - Keep one Prisma model per persistable domain entity.
   - Preserve the modular organization of Prisma: each module lives in its own file.
   - Keep the Prisma model and field names consistent with the domain entity (PascalCase models, camelCase fields), but name everything in the database in `snake_case`: tables (lowercase, preferably plural) and columns.
   - Always use `@@map("<table_name>")` on every model and `@map("<column_name>")` on every field whose name is not already snake_case. Example: entity `User` -> model `User` with `@@map("users")`, field `createdAt` -> `createdAt DateTime @map("created_at")`.
   - Remove `apps/backend/prisma/models/bootstrap.model.prisma` when the first real domain model enters the project and it is no longer needed. Write the module's `.model.prisma` file first: deleting the last file in `prisma/models/` with `git rm` also removes the folder.
4. Generate an incremental migration.
   - If it is the module's first synchronization, use a migration named the same as the module in kebab-case.
   - If the module already exists in Prisma and there are differences, create a new migration with `<module>-<short-suffix>`.
   - The suffix must describe the change briefly and objectively, for example: `auth-add-user-table`, `auth-add-user-deleted-at`, `transactions-rename-status`.
5. Apply and validate.
   - Ensure the database is available before the migration.
   - Run `npm --workspace apps/backend run prisma:migrate:dev -- --name <migration-name>`.
   - Run `npm --workspace apps/backend run prisma:generate`.
   - Review the generated SQL when there is a risk of destructive change.
6. Report the result.
   - Report analyzed entities, changed Prisma file, name of the created migration and any assumption made.
   - If there is no difference between module and schema, explicitly say that the module was already synchronized.

## Mapping rules

- Assume that each persistable entity needs to reflect the `State` fields.
- Always consider the base fields inherited from `EntityState`.
- Database table names are always `snake_case`, in lowercase and preferably plural. Keep the idiomatic Prisma model name and map the table with `@@map`. Examples:
  - `User` -> `@@map("users")`
  - `UserProfile` -> `@@map("user_profiles")`
- Database column names are always `snake_case`. Keep the camelCase field name from the domain `State` and map the column with `@map`. This includes the inherited fields and relation scalars. Examples:
  - `createdAt` -> `createdAt DateTime @default(now()) @map("created_at")`
  - `deletedAt` -> `deletedAt DateTime? @map("deleted_at")`
  - `userId` -> `userId String @map("user_id")`
  - single-word fields such as `id`, `name` or `email` are already snake_case and need no `@map`.
- Enum types also live in the database, so map them to `snake_case` with `@@map`. Example: `enum UserRole { ... @@map("user_role") }`.
- Constraint and index names derive from the table and column names, so they come out in `snake_case` too. Do not rename them by hand.
- Map primitive types conservatively:
  - `string` -> `String`
  - `boolean` -> `Boolean`
  - `Date` -> `DateTime`
  - `number` -> choose `Int`, `BigInt` or `Decimal` only when the context makes it clear
- In case of ambiguity of numeric type, cardinality, nullability, enum or relation, make the doubt explicit before consolidating a destructive schema.
- Avoid inferring structures that do not appear in the module. If the relation is not clear in the domain, do not invent it.

## Guardrails

- Do not proceed without an explicitly provided target module.
- Do not change other Prisma modules without a direct need of the global schema.
- Do not touch seeds or persistence adapters as part of the default flow of this skill.
- Do not overwrite old migrations.
- When detecting a field rename, column removal, type change or nullability change, treat it as a risky change and carefully review the generated SQL.
- If the module has no entity that inherits from `Entity`, report that there is not enough basis for automatic synchronization.

## Base commands

- Start the database, when necessary:
  - `npm --workspace apps/backend run db:start`
- Generate/apply the module's migration:
  - `npm --workspace apps/backend run prisma:migrate:dev -- --name <migration-name>`
- Update the Prisma client:
  - `npm --workspace apps/backend run prisma:generate`

## References

- Consult `references/module-prisma-sync.md` for the operational checklist and common pitfalls.
