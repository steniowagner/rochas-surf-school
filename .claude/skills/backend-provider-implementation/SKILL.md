---
name: backend-provider-implementation
description: Implements in the NestJS backend the technical providers defined in the business modules, creating simple concrete classes, integrating external dependencies when necessary and registering these implementations for use by controllers and use cases.
---

# Backend Provider Implementation

Use this skill when the request is to implement, in the NestJS backend, a provider interface defined in `modules/<module>/src/**/provider/*.provider.ts`.

The focus of this skill is to create a simple, direct and easy-to-maintain concrete class in the backend, register that class in the corresponding Nest module and allow direct injection of the concrete class itself in the backend, without inventing tokens, symbols, wrappers or unnecessary extra layers.

## Objective

- create the concrete implementation of a technical provider defined in the domain
- keep the original domain interface intact
- integrate the concrete class into the corresponding Nest module
- allow use via direct injection of the concrete class in the backend
- install external dependencies when the implementation really needs them
- avoid excessive architecture to solve a simple technical provider

## Mandatory inputs

This skill can only proceed when the target provider is clearly identified by one of the modes below:

1. explicit path of the interface file, such as `modules/auth/src/user/provider/crypto.provider.ts`
2. unambiguous interface name, such as `CryptoProvider`, only when there is a single clear target in the project

Additional information mandatory only when it cannot be safely inferred:

3. module name, when the path is not enough to infer `modules/<module>`
4. provider type or implementation intent, when this is necessary to choose library, strategy or naming

## Optional inputs

- preferred library for the implementation
- constraints such as:
  - avoid extra dependencies
  - reuse an already installed library
  - use a synchronous or asynchronous approach
  - compatibility with a specific external API

## Mandatory lock

- This skill can only run when the target provider interface is clearly identified.
- If there is ambiguity about which interface to implement, stop and ask the user for the exact provider.
- Do not modify, rewrite or expand the original domain interface.
- Treat any interface in `modules/<module>/src/**` as an immutable contract.
- If the contract does not give enough information to choose a safe strategy, ask for clarification instead of inventing risky behavior.

## Mandatory readings

Before editing any file, mandatorily read:

1. the target interface inside `modules/<module>/src/**/provider/*.provider.ts`
2. the related types required by that interface
3. `modules/auth/src/user/provider/crypto.provider.ts`
4. `apps/backend/src/modules/auth/bcrypt.crypto.ts`
5. `apps/backend/src/modules/auth/auth.module.ts`
6. `apps/backend/src/modules/<module>/<module>.module.ts`
7. the controller or usage point in the backend, when this helps to understand how the implementation will be consumed

After that, also read the internal materials of this skill:

- `references/mandatory-readings.md`
- `references/provider-implementation-checklist.md`
- `references/few-shots/bcrypt-crypto.provider.example.ts`
- `references/few-shots/auth-module.provider-registration.example.ts`
- `references/few-shots/uuid.provider.example.ts`

If any mandatory reading fails, stop and report the blocker clearly.

## Scope

- read the target interface and the related types
- infer the module from the real path in `modules/<module>/...`
- create the concrete implementation in `apps/backend/src/modules/<module>/`
- update `apps/backend/src/modules/<module>/<module>.module.ts`
- install external dependencies when necessary
- adjust backend consumers only to the minimum necessary to allow direct injection of the concrete class

## Out of scope

- modifying the provider contract in the domain
- creating symbolic tokens by default
- creating adapters, wrappers, factories or extra layers without practical gain
- refactoring the domain just to accommodate the backend implementation
- spreading new abstractions when the concrete class is enough

## Mandatory conventions

- Create the implementation by default at the root of `apps/backend/src/modules/<module>/`.
- Only create subfolders if there is a strong local convention or an explicit user request.
- The file name must reflect the technical responsibility of the provider.
- The class name must be explicit and oriented to the concrete implementation.
  - Example: `BcryptCryptoProvider`
- The implementation must fulfill exactly the contract of the original interface.
- Do not add extra public methods outside the contract, except strictly necessary private helpers.
- Prefer `@Injectable()` and direct injection of the concrete class in Nest controllers or services.
- The backend may receive the concrete class and pass it to the use cases that depend on the domain interface.

## Deterministic workflow

1. Validate the input.
   - Confirm that there is exactly one target interface.
   - Confirm that the file belongs to `modules/<module>/src/`.
   - If there is ambiguity, stop.
2. Read the contract and the minimum context.
   - Open the target interface.
   - Read types, DTOs, enums and returns used by the contract.
   - Read the corresponding backend module.
   - Read the usage point in the backend when this helps to understand how the class will be injected.
3. Read the project's real example.
   - Use `CryptoProvider` + `BcryptCryptoProvider` + `AuthModule` as the base reference.
4. Infer destination and naming.
   - Infer `<module>` from the real path.
   - Create the file at the root of `apps/backend/src/modules/<module>/` by default.
   - Choose a concrete and predictable class name.
5. Choose the implementation strategy.
   - Reuse already installed libraries when they cover the contract.
   - If more than one library is reasonable and the user has no preference, choose the simplest and most stable option.
   - If the choice is still risky, stop and ask for confirmation.
6. Implement the concrete class.
   - Create a simple Nest class.
   - Implement exactly the interface methods.
   - Keep the technical logic concentrated in the file itself.
   - Use private helpers only when this improves clarity or reduces real repetition.
7. Integrate with Nest.
   - Update `apps/backend/src/modules/<module>/<module>.module.ts`.
   - Register the class in `providers`.
   - Export the class when it makes sense for other modules.
8. Adjust backend consumers.
   - Prefer constructors such as `constructor(private readonly cryptoProvider: BcryptCryptoProvider)`.
   - Allow Nest controllers and services to pass the concrete class to use cases that depend on the interface.
   - Do not change the domain contract.
9. Install external dependencies when necessary.
   - Prefer installing in the `@<scope>/backend` workspace.
   - Examples:
     - `npm install --workspace @<scope>/backend nodemailer`
     - `npm install --workspace @<scope>/backend jsonwebtoken`
   - Add `@types/*` when the library requires separate types.
10. Test and verify.
   - Create tests when there is relevant observable logic.
   - Follow the backend's test pattern if it exists.
   - When there is no clear pattern, create a simple `*.spec.ts` next to the implementation.
   - Run at least the backend build and the relevant backend tests when possible.
11. Report the result.
   - Report the implemented interface, inferred module, files created or changed and dependencies added.

## Implementation rules

- Prioritize a simple, direct and easy-to-maintain implementation.
- The concrete class must live in the backend.
- The backend must be able to inject the concrete class directly.
- Do not require a symbol, token or extra abstraction for the implementation to work in the backend.
- Do not add behavior outside the contract, except unavoidable technical details of the library used.
- Do not move business rules into the technical provider.
- If there is small and stable technical configuration, keep it in the file itself with clear local constants.
- If the provider needs sensitive or variable configuration, follow the backend's existing pattern for `ConfigService` or `.env`, without reinventing infrastructure.

## Rules for external dependencies

- Identify whether the implementation requires an external library.
- First reuse what is already installed in the project.
- When it is necessary to install something new, prefer mature, simple libraries compatible with the project.
- If there are several reasonable options and no user preference, choose the simplest and most stable option.
- Clearly report which dependencies were added and why.
- Avoid extra dependencies when the Node runtime or an already present library solves the contract.

## Nest integration rules

- Register the concrete implementation in `apps/backend/src/modules/<module>/<module>.module.ts`.
- Include the class in `providers`.
- Include it in `exports` when other modules may need it.
- Adjust consumption in the backend to use the concrete class directly.
- The preferred pattern is:
  - concrete class registered in the module
  - concrete class injected directly into Nest controllers or services
  - concrete class passed to the use cases that depend on the domain interface

## Context adaptation rules

This skill must adapt to technical providers such as:

- cryptography
- JWT
- email
- token generation
- clock and date
- uuid
- storage
- simple external integrations

When the interface does not bring enough context to define the behavior safely, stop and ask for clarification.

## Test rules

- When the implementation has relevant observable logic, create tests.
- When the implementation depends heavily on an external library, create at least useful tests for the expected behavior and report coverage limits.
- Follow the test pattern of the backend or the module, when it exists.
- Prefer small and direct tests, focused on the implemented contract.

## Guardrails

- Do not run without an unambiguous target.
- Do not edit the domain provider.
- Do not expand domain interfaces.
- Do not create unnecessary tokens or symbols.
- Do not install libraries without real need.
- Do not adjust consumers beyond what is necessary for injection to work in the backend.
- Do not invent behavior when the contract is incomplete.

## Expected output

- concrete implementation created in `apps/backend/src/modules/<module>/`
- `apps/backend/src/modules/<module>/<module>.module.ts` updated
- backend consumers adjusted only as necessary for direct injection
- external dependencies installed only when they are really needed
- tests added when there is relevant observable behavior

