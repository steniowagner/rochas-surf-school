# Prisma Init Checklist (apps/backend)

## Goal

Standardize the Prisma bootstrap in the NestJS backend with:

- a multi-file schema in `apps/backend/prisma/models/*.model.prisma`;
- the ESM `prisma-client` generator writing to `apps/backend/src/generated/prisma` (gitignored);
- a neutral seed entrypoint at `apps/backend/prisma/seed/main.ts`, with no module seeds;
- a Nest database module in `apps/backend/src/db/*` with a plain `PrismaService`;
- the existing Docker Compose Postgres and `DATABASE_*` env vars.

## Prerequisites

- A workspace with `apps/backend/package.json`.
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD` and `DATABASE_NAME` in `apps/backend/.env` (copied from `.env.example`). The script appends any that are missing.
- Node.js and npm.
- Docker with Docker Compose.

## Steps

1. Preview the changes.
2. Apply them and install the dependencies.
3. Start Postgres with Docker Compose.
4. Generate the Prisma Client.
5. Create the first migration.

```bash
SKILL_SCRIPT="$(find . -maxdepth 6 -path "*/config-prisma/scripts/init-prisma-backend.js" ! -path "*/node_modules/*" | head -1)"
node "$SKILL_SCRIPT" --dry-run
node "$SKILL_SCRIPT" --apply --install
npm --workspace backend run db:start
npm --workspace backend run prisma:generate
npm --workspace backend run prisma:migrate:dev -- --name init
```

## Module Prisma files

```bash
SKILL_SCRIPT="$(find . -maxdepth 6 -path "*/config-prisma/scripts/init-prisma-backend.js" ! -path "*/node_modules/*" | head -1)"
node "$SKILL_SCRIPT" --apply --module auth --module lessons --module billing
```

## Key files

- `apps/backend/package.json`
- `apps/backend/.env`
- `apps/backend/.env.example`
- `apps/backend/.gitignore`
- `apps/backend/.oxlintrc.json`
- `apps/backend/docker-compose.yml` (read-only for this skill)
- `apps/backend/prisma.config.ts`
- `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma/seed/main.ts`
- `apps/backend/src/db/database-url.ts`
- `apps/backend/src/db/db.module.ts`
- `apps/backend/src/db/prisma.service.ts`
- `apps/backend/src/app.module.ts`

## Scope rules

- Do not add per-module data seeds (`prisma/seed/tasks/*`) at this stage; the seed entrypoint stays neutral until modules register their tasks.
- `prisma/models/bootstrap.model.prisma` exists only while no module file defines a model.
- Do not overwrite an existing `prisma/seed/main.ts`, `src/db/*` file or module file.
- Do not rewrite `docker-compose.yml` or change existing `DATABASE_*` values.

## Flags

- `--apply`: write the changes to disk.
- `--dry-run`: preview the changes. This is the default when `--apply` is not given.
- `--install`: run `npm install --workspace <backend-workspace>`, using the name in `apps/backend/package.json` (fallback `apps/backend`).
- `--start-db`: run `docker compose up -d postgres` in `apps/backend`.
- `--module <name>`: create `prisma/models/<name>.model.prisma` (repeatable).
- `--prisma-version <semver>`: force a Prisma version. Without it, the skill keeps the backend's current Prisma version (fallback `7.10.0`).

## After the bootstrap

- Add real models to `prisma/models/<module-name>.model.prisma`.
- Delete `prisma/models/bootstrap.model.prisma`, then create a migration (`prisma:migrate:dev`).
- Implement module seeds and register them in `seedTasks` in `prisma/seed/main.ts`.
- Inject `PrismaService` where needed; `DbModule` is global, so modules don't need to import it.
- In production (the Docker image), run `prisma:migrate:deploy` against the target database before starting the backend.
