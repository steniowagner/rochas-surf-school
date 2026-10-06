# Prisma Synchronization per Module

## Objective

Synchronize a single domain module with the backend Prisma layer, keeping the modular schema and the incremental migrations aligned with the module's entities.

## Main paths

- Domain modules:
  - `modules/<module>/src/**/*.entity.ts`
- Entity base:
  - `packages/shared/src/model/entity.ts`
- Root Prisma schema:
  - `apps/backend/prisma/schema.prisma`
- Prisma models per module:
  - `apps/backend/prisma/models/<module>.model.prisma`
- SQL migration:
  - `apps/backend/prisma/migrations/*/migration.sql`
- Prisma commands:
  - `apps/backend/package.json`

## Operational checklist

### 1. Read the module

- [ ] Confirm that the module was explicitly provided by the user or by unambiguous context.
- [ ] If the module is not clear, stop execution and ask the user for the target module before continuing.
- [ ] Confirm the module name and path in `modules/<module>`.
- [ ] List the `*.entity.ts` entities.
- [ ] Identify the classes that inherit from `Entity<TState>`.
- [ ] Extract the `State` fields and those inherited from `EntityState`.

### 2. Update the Prisma schema

- [ ] Create or edit only `apps/backend/prisma/models/<module>.model.prisma`.
- [ ] Ensure one Prisma model per persistable entity.
- [ ] For a list of value objects inside an entity (no identity of its own), decide with the user between a child table and a `Json` column. A child table has a foreign key to the owner with `onDelete: Cascade`, a composite `@@id` and no `id` or timestamps.
- [ ] Include `id`, `createdAt`, `updatedAt` and `deletedAt` when they are part of the shared base.
- [ ] Keep names and types consistent with the domain.
- [ ] Map every table to `snake_case` with `@@map`, every non-snake_case field to a `snake_case` column with `@map`, and every enum with `@@map`.
- [ ] Review relations, nullability and indexes only when this is clear in the code.

### 3. Generate migration

- [ ] If it is the module's first migration, use `<module>`.
- [ ] If it is an incremental adjustment, use `<module>-<short-suffix>`.
- [ ] Start the database if it is not available:
  - `npm --workspace apps/backend run db:start`
- [ ] Run the migration:
  - `npm --workspace apps/backend run prisma:migrate:dev -- --name <migration-name>`
- [ ] Run the client generation:
  - `npm --workspace apps/backend run prisma:generate`

### 4. Validate the result

- [ ] Review the generated SQL when there is a rename, drop, type change or nullability change.
- [ ] Confirm that the module's Prisma file is consistent with the entities read.
- [ ] If the schema was already synchronized, record this explicitly instead of forcing changes.

## Recommended conventions

- Keep one Prisma file per module.
- Name migrations in kebab-case.
- Use short and descriptive suffixes for incremental migrations.
- Preserve the language and code style already adopted by the project.
- Name everything in the database in `snake_case`: tables and enums with `@@map`, columns with `@map`. Prisma model and field names stay as in the domain.

## Common pitfalls

- Proceeding by inferring a module when the user has not yet stated which module they want to synchronize.
- Ignoring fields inherited from `EntityState`.
- Creating Prisma schema for classes that are not persistable entities. The exception is a child table for a list of value objects that belongs to an entity.
- Inferring relations that do not clearly appear in the domain.
- Generating a migration with a name that is too generic, such as `update` or `fix`.
- Changing files of other modules without necessity.
- Keeping `bootstrap.model.prisma` when the project already has enough real models to replace it.
- Deleting `bootstrap.model.prisma` before writing the module's file: `git rm` of the last file removes `prisma/models/`, and the migration then runs with no models.
- Leaving a camelCase column (missing `@map`) or a PascalCase table (missing `@@map`) in the generated SQL.
