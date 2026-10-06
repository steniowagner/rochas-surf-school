---
name: config-prisma
description: "Set up and standardize Prisma in this monorepo's NestJS backend (`apps/backend`): a multi-file schema with one file per module (`apps/backend/prisma/models/<module-name>.model.prisma`), the ESM `prisma-client` generator writing to `src/generated/prisma`, `prisma.config.ts`, a neutral seed entrypoint at `prisma/seed/main.ts`, and a `DbModule` + `PrismaService` registered in `AppModule`. It reuses the existing Docker Compose Postgres and the `DATABASE_*` env vars. Use it for the initial Prisma setup, to add a Prisma file for a new module, or to re-bootstrap the backend's database layer."
---

# Config Prisma

## Overview

Deterministic, idempotent Prisma setup for `apps/backend`, fitted to this repo:

- **ES modules:** the backend is `"type": "module"` compiled with `"module": "nodenext"`, so the schema uses the `prisma-client` generator with `moduleFormat = "esm"` and `importFileExtension = "js"`, and every generated relative import ends in `.js`.
- **Generated client inside `src/`:** the client is written to `apps/backend/src/generated/prisma` (gitignored) and compiled into `dist/` with the rest of the backend, so the Docker image (`apps/backend/Dockerfile`) ships it without copying anything from `node_modules`.
- **Existing database setup:** Postgres runs from `apps/backend/docker-compose.yml` (service `postgres`), and the credentials stay in `DATABASE_HOST/PORT/USER/PASSWORD/NAME`. The connection string is built from them by `getDatabaseUrl()`. A `DATABASE_URL`, when set, takes precedence. Inside Docker Compose, `DATABASE_HOST` is overridden to `postgres`, so the same code works on the host and in the container.

## Workflow

1. Confirm the workspace contains `apps/backend/package.json`.
2. Run the skill's script from the repo root (resolve its path with `find . -maxdepth 6 -path "*/config-prisma/scripts/init-prisma-backend.js" ! -path "*/node_modules/*" | head -1`):
   - `node <script> --dry-run` to preview the changes;
   - `node <script> --apply --install` to write them and install the dependencies.
3. Add a Prisma file per module (repeatable):
   - `node <script> --apply --module auth --module lessons`
4. Start the database with the backend's Docker Compose:
   - `npm --workspace @rochas-surf-school/backend run db:start`
5. Generate the client and create the first migration:
   - `npm --workspace @rochas-surf-school/backend run prisma:generate`
   - `npm --workspace @rochas-surf-school/backend run prisma:migrate:dev -- --name init`

## What the script guarantees

- Dependencies in `apps/backend/package.json`: `@prisma/client`, `@prisma/adapter-pg` and `pg`; `prisma`, `tsx` and `dotenv` as dev dependencies. It keeps the backend's current Prisma version when there is one (no forced upgrade); otherwise it uses the default, or `--prisma-version`.
- npm scripts:
  - `db:start`, `db:stop`, `db:logs` for the `postgres` Compose service;
  - `prisma:generate`, `prisma:migrate:dev`, `prisma:migrate:deploy`, `prisma:seed`, `prisma:studio`;
  - `prebuild` and `precheck-types`, which run `prisma generate`, so `npm run build`, Turbo and the Docker build always have a client.
- `apps/backend/prisma.config.ts`: multi-file schema folder `prisma`, migrations in `prisma/migrations`, seed `tsx prisma/seed/main.ts`, and the datasource URL from `getDatabaseUrl()`.
- `apps/backend/prisma/schema.prisma`: the ESM `prisma-client` generator writing to `../src/generated/prisma`, and a `postgresql` datasource.
- `apps/backend/prisma/seed/main.ts`: a neutral seed entrypoint with an empty `seedTasks` list, using the generated `PrismaClient` with `PrismaPg`.
- `apps/backend/prisma/models/<module-name>.model.prisma` for each `--module`.
- `apps/backend/prisma/models/bootstrap.model.prisma`, a temporary model created only while no module file defines a model, so `prisma generate` has something to generate.
- `apps/backend/src/db/database-url.ts`, `prisma.service.ts` and `db.module.ts`. `DbModule` is `@Global()` and exports a plain `PrismaService`.
- `DbModule` imported and registered in `apps/backend/src/app.module.ts`, with the `.js` suffix.
- `/src/generated/` in `apps/backend/.gitignore`, and `src/generated/**` in the `ignorePatterns` of `apps/backend/.oxlintrc.json`.
- Any missing `DATABASE_*` variable appended to `apps/backend/.env.example` and `.env`. Existing values are never changed.

## Notes

- The script is idempotent: running it again changes nothing once the setup is in place.
- `prisma.config.ts` and `schema.prisma` are rewritten to the template on every run. The seed, `database-url.ts`, `prisma.service.ts`, `db.module.ts` and module files are only created when missing, so your edits are kept.
- `apps/backend/docker-compose.yml` is not touched; it already defines the `postgres` service and the backend's database variables.
- `getDatabaseUrl()` lives in `src/db/database-url.ts` and is duplicated in `prisma.config.ts`, because the Prisma CLI loads that file on its own. Keep both copies in sync.
- `PrismaService` connects in `onModuleInit`, so the backend and its e2e tests need the database running (`db:start`).
- After adding real models, delete `prisma/models/bootstrap.model.prisma` and create a new migration.
- Name tables and columns in `snake_case` in the database: `@@map` on every model and enum, `@map` on every camelCase field. Prisma model and field names stay PascalCase and camelCase.
- See `references/prisma-init-checklist.md` for the operational checklist.
