# Mandatory Readings

Read these files before creating or updating any controller with this skill:

1. `apps/backend/src/modules/auth/auth.controller.ts`
2. `apps/backend/src/modules/auth/auth.module.ts`
3. `apps/backend/src/modules/auth/auth.integration.http`
4. The target use case inside `modules/<module>/src/**/usecase/*.usecase.ts`
5. The `index.ts` of the corresponding aggregate
6. The `index.ts` of the corresponding module
7. `apps/backend/src/app.module.ts`

After the base readings above, locate and read the backend's shared infrastructure related to authentication and error handling, if it exists, such as:

- `apps/backend/src/shared/**`
- global filters
- guards
- decorators
- authentication utilities
- `apps/backend/src/main.ts`, when it influences filters, pipes or relevant bootstrap

Suggested search:

```bash
rg -n --hidden -S "CurrentUser|currentUser|request.user|req.user|jwt|token|Bearer|Authorization|AuthGuard|UseGuards|guard|decorator|filter|exception|DomainError|ValidationException" apps/backend/src modules packages/shared --glob '!**/node_modules/**'
```

Purpose of the readings:

- Confirm the real controller and module pattern used in the backend.
- Confirm the real pattern of HTTP integration tests in Rest Client format.
- Find out whether the project already has centralized error handling.
- Find out whether the project already has shared authentication, a JWT guard or an authenticated user decorator.
- Identify how the use case receives `In`, produces `Out` and which concrete backend dependencies it requires.
- Find out how the project reuses responses between HTTP requests, temporary variables and authentication in the `*.integration.http` files.
- Confirm whether the aggregate and module exports allow importing the use case and its types without unnecessary deep imports.

If any mandatory file does not exist:

- stop to reassess the project's real structure
- locate the equivalent before editing
- record the assumption made in the final result
