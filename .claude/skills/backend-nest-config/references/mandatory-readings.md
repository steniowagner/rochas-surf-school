# Mandatory Readings

Read these files before implementing the shared configuration of the NestJS backend:

1. `packages/shared/src/error/index.ts`
2. `packages/shared/src/error/domain.error.ts`
3. `packages/shared/src/error/validation.error.ts`
4. `packages/shared/src/error/validation.exception.ts`
5. `apps/backend/src/app.module.ts`
6. `apps/backend/src/main.ts`
7. `apps/backend/src/modules/auth/auth.controller.ts`

After these base readings, locate and read any existing project file that deals with:

- authentication
- JWT
- token
- claims
- logged-in user
- `request.user` or `req.user`
- authentication guards
- authenticated context decorators
- request context

Suggested search:

```bash
rg -n --hidden -S "jwt|token|claims|CurrentUser|currentUser|request.user|req.user|passport|AuthGuard|Bearer|Authorization|authenticated user|user context" apps/backend/src modules packages/shared --glob '!**/node_modules/**'
```

Purpose of the readings:

- Confirm how the shared error hierarchy works and which HTTP statuses must be respected.
- Identify whether the current backend bootstrap already has global filters, pipes, interceptors or related configurations.
- Detect repeated `try/catch` in controllers in order to converge everything into a global filter.
- Reuse any existing authentication infrastructure before creating a new one.
- Infer, when possible, the local shape of `request.user` and of the authenticated payload.

If any mandatory file does not exist in the target project:

- stop to reassess the real structure
- locate the equivalent file before editing
- record the assumption made in the final result of the run
