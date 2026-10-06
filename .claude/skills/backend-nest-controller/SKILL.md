---
name: backend-nest-controller
description: Creates standardized controllers in the NestJS backend to expose the use cases of the business modules, reusing existing contracts, integrating authentication when necessary, respecting the application's centralized error handling and generating HTTP integration tests in Rest Client format.
---

# Backend Nest Controller

## Objective

Create or update NestJS backend controllers in `apps/backend/src/modules/<module>/` to expose use cases defined in `modules/<module>/src/**/usecase/*.usecase.ts`.

This skill must keep the controller thin, simple and focused only on the adaptation between HTTP and the use case. Whenever possible, it must directly reuse the use case's `In` interface and output, avoid redundant DTOs, integrate authentication only when it makes sense and rely on the shared error and auth infrastructure the project already has.

Whenever it creates or updates a controller, the skill must also create or update the module's HTTP integration test file in the format understood by the Visual Studio Code Rest Client plugin. The file must sit next to the controller, use the same base name as the module and end with `.integration.http`.

## Mandatory inputs

1. Module name, or unambiguous path inside `modules/`.
2. Aggregate name, or unambiguous path of the aggregate.
3. Name of the use case to be exposed.
4. Desired HTTP method:
   - `get`
   - `post`
   - `put`
   - `patch`
   - `delete`
5. Route path, when the user wants to define it explicitly.

## Optional inputs

6. Whether the route should be authenticated or public.
7. Whether the HTTP input can directly reuse the use case's `In` interface.
8. Whether the use case depends on the authenticated user.
9. Specific binding rules, such as use of `@Body`, `@Param`, `@Query` or combinations of them.

## Mandatory lock

- This skill cannot proceed if the target use case is not clearly identified.
- If there is ambiguity between more than one module, aggregate or `*.usecase.ts` file, stop and ask the user for the correct identification.
- Before editing any file, locate the real use case and read its input, its output and its dependencies.
- This skill creates a NestJS controller. It does not create the use case, does not change the domain contract without an explicit request and does not invent infrastructure outside the scope.

## Mandatory readings

Before implementing, mandatorily read the files listed in `references/mandatory-readings.md`.

This includes, at a minimum:

- `apps/backend/src/modules/auth/auth.controller.ts`
- `apps/backend/src/modules/auth/auth.module.ts`
- `apps/backend/src/modules/auth/auth.integration.http`
- the target use case in `modules/<module>/src/**/usecase/*.usecase.ts`
- the `index.ts` of the corresponding aggregate
- the `index.ts` of the corresponding module
- `apps/backend/src/app.module.ts`

It is also mandatory to locate and read the real backend infrastructure related to:

- authentication
- guards
- decorators
- global filters
- error handling
- `request.user`, `req.user`, `CurrentUser`, `Jwt`, `AuthGuard`, `Bearer`

If `apps/backend/src/shared/` does not exist, look for the real equivalents before assuming another architecture.

## Workflow

1. Validate the mandatory input.
   - Confirm module, aggregate and use case unambiguously.
   - Resolve the target use case file in `modules/<module>/src/**/usecase/*.usecase.ts`.
   - If the use case cannot be safely identified, stop.
2. Read the mandatory context.
   - Open `auth.controller.ts`, `auth.module.ts`, the target use case, the aggregate and module `index.ts` files and `app.module.ts`.
   - Look for shared authentication and error infrastructure in `apps/backend/src/**`.
   - If there is relevant bootstrap in `apps/backend/src/main.ts`, read it too to understand global filters and pipes.
3. Inspect the real use case.
   - Identify `In`, `Out`, class name and `execute` signature.
   - Identify constructor dependencies.
   - Confirm whether the use case needs an authenticated context or whether the user asked for an authenticated route.
4. Define the HTTP contract.
   - Map the HTTP method and the endpoint path.
   - Prefer using the use case's `In` interface directly when the HTTP payload is compatible.
   - Only create a controller-specific DTO when there is a real adaptation between HTTP and the use case contract.
   - Choose the simplest binding among `@Body`, `@Param`, `@Query` or a minimal composition of them.
5. Create or update the module's controller.
   - Edit `apps/backend/src/modules/<module>/<module>.controller.ts`.
   - Preserve existing endpoints and add the new endpoint without overwriting the others.
   - Follow the project's real pattern for instantiating the use case:
     - if the project instantiates the use case inside the endpoint with concrete providers injected into the controller, keep that pattern
     - if the project already wraps the use case in a Nest provider, reuse the existing pattern
6. Create or update the module's HTTP integration test.
   - Edit `apps/backend/src/modules/<module>/<module>.integration.http`.
   - Preserve existing scenarios and add the new endpoint without overwriting the others.
   - Follow the Visual Studio Code Rest Client plugin format, with variables declared at the top, requests separated by `###` and short comments with the expected behavior.
   - When a request needs to reuse data from another, use `# @name` and variables derived from the response instead of copying values manually.
7. Integrate authentication when necessary.
   - Reuse the existing guard, decorator and authenticated context.
   - If the use case depends on the authenticated user, obtain that data from the backend's shared infrastructure, never by manually parsing the header.
8. Update the Nest module.
   - Ensure that `apps/backend/src/modules/<module>/<module>.module.ts` registers the controller.
   - Check whether the concrete providers used by the controller are already registered.
   - If a concrete provider required for the use case to work is missing, integrate only what exists and clearly report the gap.
9. Validate the result.
   - Review imports, decorators, route and HTTP status.
   - Review the `.integration.http` to confirm that the scenarios can be run in sequence, with reusable data and without hardcoded sensitive values.
   - When it makes sense, run the backend build or tests.
   - Report changed files and any dependency that must be resolved by another skill.

## Controller implementation rules

- The controller must be thin and simple.
- The controller must only:
  - receive the HTTP request
  - build or pass along the use case input
  - instantiate or inject dependencies following the pattern already used by the project
  - execute the use case
  - return the appropriate HTTP response
- Prioritize a flow in which the controller input is the same `In` interface as the use case.
- Avoid business logic, domain validation and unnecessary transformations in the controller.
- Prefer importing the use case and its types through the existing exports of the module or aggregate when they are already published by the `index.ts` files.
- Do not change the domain `index.ts` files just to accommodate the controller, unless explicitly requested by the user.

## Rules for contracts and DTOs

- Reuse the use case's input interface whenever the HTTP payload can map directly to it.
- Do not create a redundant DTO, interface or type just to repeat the same shape as `In`.
- Create a controller-specific DTO only when there is a real need, for example:
  - combining `@Param()` with `@Body()`
  - combining `@Query()` with the authenticated user
  - adapting field names coming from the route
  - separating HTTP concerns from the domain contract
- When the use case returns data, return the output directly, except for a simple shape or status adjustment required by the HTTP context.
- When there is no relevant return, return a lean response consistent with the HTTP method used.

## Rules for error handling

- If the backend already has a global filter, interceptor, shared helper or any centralized error infrastructure, rely on that structure.
- Do not duplicate unnecessary `try/catch` inside endpoints.
- If there is no centralized structure yet, follow the project's current pattern with as little repetition as possible.
- Avoid spreading new manual error handling across several endpoints.
- If the absence of this infrastructure compromises the controller's quality, point out that the `$backend-nest-config` skill can consolidate the shared base.

## Rules for authentication

- Check whether the route should be authenticated based on the user's request, the use case context and the existing infrastructure.
- If the route is authenticated, integrate the endpoint with the guard and decorators already existing in the backend.
- If the project already has a JWT guard and an authenticated user decorator, reuse them.
- If the use case needs the authenticated user, obtain the data from the request through the backend's shared structure.
- If the authentication infrastructure does not exist yet, do not invent a parallel architecture. Leave the integration prepared in the way most consistent with the project and report the gap.

## Rules for HTTP integration tests

- Always create or update `apps/backend/src/modules/<module>/<module>.integration.http` together with the controller.
- The file name must be exactly the same base name as the module's controller, replacing only `.controller.ts` with `.integration.http`.
- The file must follow the Rest Client format:
  - variables at the top with `@name = value`
  - scenarios separated by `###`
  - short comments describing the purpose and the expected status
  - `Content-Type: application/json` when there is a JSON body
- Declare a reusable variable to differentiate test data between runs, such as `@scenarioVersion = {{$timestamp}}`, and use it in email, name, slug, code or any identifier that needs to be unique.
- When the endpoint creates several similar entities, use the version variable to generate small predictable variations and avoid collisions between requests.
- When a request produces a value used by another test, name the request with `# @name` and capture the value via variables derived from the response.
- For authentication:
  - if the API is closed, include at the beginning of the flow a user creation scenario when necessary and a login scenario
  - store the returned token in a temporary variable
  - reuse that token in the protected endpoints with `Authorization: Bearer {{variableName}}`
  - never leave a fixed JWT token hardcoded in the file
- For protected endpoints, cover at least:
  - access without a token, when it makes sense
  - access with an invalid token, when it makes sense
  - access with a valid token
- For public write endpoints, include at least one valid scenario and one or more invalid scenarios relevant to the exposed business rule or validation.
- Whenever possible, keep the scenarios runnable from top to bottom, so that data creation and authentication feed the later requests.
- Do not invent asserts outside the format supported by Rest Client. Prioritize clear requests, descriptive names and objective comments about the expected result.

## HTTP binding rules

- Use `@Body()` for write payloads.
- Use `@Param()` for identifiers and route segments.
- Use `@Query()` for filters, pagination and searches.
- When it is possible to build the use case input without extra structures, do it directly.
- When it is necessary to combine bindings, keep the assembly of the `In` object local, explicit and lean.
- Use `@HttpCode()` only when the context really requires a status different from Nest's default for that method.

## Rules for integration with the Nest module

- Ensure the controller is registered in the corresponding Nest module.
- Check whether the concrete providers used by the controller already exist in the module's `providers`, `imports` or `exports`.
- If concrete implementations required for the use case to work are missing, do not invent persistence, auth or providers outside the scope.
- In these cases, integrate what already exists and clearly report what depends on another skill, such as `$backend-prisma-repository` or `$backend-nest-config`.

## Determinism

- Target controller: `apps/backend/src/modules/<module>/<module>.controller.ts`
- Target integration test: `apps/backend/src/modules/<module>/<module>.integration.http`
- Target module: `apps/backend/src/modules/<module>/<module>.module.ts`
- Names, paths and organization must follow the real module discovered in `modules/<module>`.
- Preserve what already exists and add only what is necessary to expose the new use case and its HTTP integration scenarios.
- Do not move files, do not recreate entire controllers and do not overwrite existing endpoints.

## Few-shots

Consult the local examples only after the mandatory readings:

- `references/few-shots/public-endpoint.example.ts`
- `references/few-shots/authenticated-endpoint.example.ts`
- `apps/backend/src/modules/auth/auth.integration.http`

The first shows a public endpoint reusing `In` directly.
The second shows an authenticated endpoint in which the logged-in user goes into the use case input object without manual header parsing.
The third shows the expected format for HTTP integration tests with Rest Client, including variable reuse and an authenticated flow.

## Expected output

- Backend module controller created or updated in `apps/backend/src/modules/<module>/<module>.controller.ts`
- HTTP integration test created or updated in `apps/backend/src/modules/<module>/<module>.integration.http`
- Corresponding Nest module updated in `apps/backend/src/modules/<module>/<module>.module.ts` when necessary
- New endpoint integrated with the real use case, with simple HTTP bindings, authentication consistent with the project, without unnecessary contract duplication and with basic Rest Client coverage for the corresponding public or authenticated flow
