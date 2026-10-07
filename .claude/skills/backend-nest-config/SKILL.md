---
name: backend-nest-config
description: Configures the shared base of the NestJS backend with centralized error handling, JWT authentication, utility decorators and common infrastructure for the application's protected endpoints.
---

# Backend Nest Config

## Objective

Deterministically apply the shared layer of the NestJS backend in `apps/backend/src/shared/`, register the global error filter and the global JWT guard in the `AppModule`, install the required dependencies and adjust `.env` / `.env.example`.

The generated structure is a faithful mirror of `assets/shared-template/` and of the `assets/app-module*.template.ts` / `assets/app-controller.template.ts` templates.

## Workflow

Always run from the monorepo root:

```bash
node .claude/skills/backend-nest-config/scripts/apply-backend-shared.js
```

Optional:

- `--force`: overwrites `app.module.ts` and `app.controller.ts` even when they appear to be customized. Without this flag, the script does a safe fallback and skips with a `[RISK]` warning.

## What the script does (deterministic)

1. Validates that `apps/backend/package.json` and `apps/backend/src/app.module.ts` exist.
2. Detects the npm scope (`@<scope>`) from the root `package.json` (fallback: `apps/backend/package.json`).
3. Installs in the `apps/backend` workspace the dependencies that are missing:
   - runtime: `@nestjs/config`, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `@<scope>/shared`.
   - dev: `@types/passport-jwt`.
   - dependencies already present are preserved (no forced upgrade).
4. Copies `assets/shared-template/**` to `apps/backend/src/shared/`, replacing the `__SCOPE__` placeholder with the detected scope. Resulting structure:

```text
apps/backend/src/shared/
  auth/
    auth-user.mapper.ts
    index.ts
    jwt-auth.guard.ts (+ .spec.ts)
    jwt-auth.module.ts
    jwt.strategy.ts (+ .spec.ts)
  decorators/
    current-user.decorator.ts (+ .spec.ts, which also covers public.decorator.ts)
    index.ts
    public.decorator.ts
  errors/
    api-exception.filter.ts (+ .spec.ts)
    error-response.type.ts
    index.ts
  types/
    authenticated-request.type.ts
    current-user.type.ts
    index.ts
    jwt-payload.type.ts
  index.ts (+ .spec.ts)
```

   The templates are ESM: every relative import ends in `.js`. The specs (Vitest) keep the shared layer fully
   covered, and `ApiExceptionFilter` passes a `DomainError`'s `details` to the response's `details`.

5. Rewrites `apps/backend/src/app.module.ts` from `assets/app-module.template.ts` (when there is `src/db/db.module.ts`) or `assets/app-module-no-db.template.ts` (when there is not). Registers:
   - `ConfigModule.forRoot({ isGlobal: true })`
   - `JwtAuthModule`
   - `{ provide: APP_FILTER, useClass: ApiExceptionFilter }`
   - `{ provide: APP_GUARD, useClass: JwtAuthGuard }`
   - `DbModule` when present.
6. Rewrites `apps/backend/src/app.controller.ts` from `assets/app-controller.template.ts`, annotating the root endpoint with `@Public()`.
7. Adds `JWT_SECRET` and `JWT_EXPIRES_IN` to `apps/backend/.env` and `apps/backend/.env.example` only if absent (does not overwrite existing values).
8. Runs `npm --workspace apps/backend run build` to validate the integration.

## Safety guards

- If `app.module.ts` already contains `APP_FILTER`, `APP_GUARD`, `JwtAuthModule` and `ApiExceptionFilter`, the script skips the rewrite (`[SKIP]`).
- If `app.module.ts` appears to be customized (too large or without `AppController`/`AppService`), the script logs `[RISK]` and skips the rewrite. Use `--force` to overwrite consciously.
- If `app.controller.ts` is not the default Nest scaffold (with `getHello`), the script skips the rewrite with `[RISK]` unless `--force` is passed.
- `.env` is handled additively: existing keys are not changed.
- `apps/backend/src/shared/` is fully rewritten on every run — this is the fully deterministic part of the skill. Manual edits inside this folder will be lost on the next apply. Customizations must live outside it.

## Dependencies between skills

The skill assumes the monorepo has already been initialized by `config-project-fullstack` (which also already adds `@nestjs/config`). The `@<scope>/shared` package must exist (created by `config-package-shared`) because `errors/api-exception.filter.ts` imports `DomainError`, `ValidationError` and `ValidationException` from it.

It is not necessary to pre-install anything manually — the script resolves it via `npm install --workspace apps/backend`.

## Expected output

- Shared layer in `apps/backend/src/shared/` ready for use by any module.
- Global `ApiExceptionFilter` normalizing every API error response to the `ApiErrorResponse` shape (`statusCode`, `errors: string[]`, `message?`, `details?`, `path?`, `timestamp`), compatible with multi-code `ValidationException`.
- `JwtAuthGuard` applied globally; open routes use `@Public()`.
- `@CurrentUser()` available for protected controllers.
- Backend build validated at the end of the run.

## Skill maintenance

To update the generated structure:

1. Edit the real project in `apps/backend/src/shared/`, `apps/backend/src/app.module.ts` and/or `apps/backend/src/app.controller.ts`.
2. Copy back to the templates:
   - `cp -r apps/backend/src/shared/* .claude/skills/backend-nest-config/assets/shared-template/`
   - `cp apps/backend/src/app.module.ts .claude/skills/backend-nest-config/assets/app-module.template.ts`
   - `cp apps/backend/src/app.controller.ts .claude/skills/backend-nest-config/assets/app-controller.template.ts`
3. Replace references to `@<scope>/shared` with `__SCOPE__/shared` in the copied assets (today only in `errors/api-exception.filter.ts`).
4. Update `assets/app-module-no-db.template.ts` when the variant without Prisma changes.
