---
name: module-use-case
description: Creates standardized use cases for the aggregates of the business modules, with consistent input and output contracts, a simple initial implementation, complete unit tests and a structure ready for evolution by the team.
---

# Module Use Case

Use this skill when the request is to create or update a use case inside an existing module in `modules/`, preserving the project's structural pattern, creating the corresponding unit tests and ensuring 100% coverage for the use case file.

This skill does not create a controller, Prisma, backend adapters, HTTP routes or any infrastructure integration. The focus here is only:

- input and output contract;
- basic domain orchestration;
- explicit dependencies of the use case;
- real tests with concrete fakes;
- correct exports;
- 100% coverage for the created or updated use case.

## Mandatory inputs

The skill can only proceed when this information is clear:

1. `module name` or an `unambiguous path` inside `modules/`.
2. `aggregate name` or the `aggregate path`.
3. `use case name`.
4. `scenario type`:
   - `crud`
   - `custom`
5. whether the use case `returns output` or `does not return output`.

## Optional inputs

- expected dependencies, such as repositories, providers or other contracts;
- input fields;
- output fields, when there is a return;
- explicit behavior rules;
- explicit path of the final destination, when the user wants to deviate from the convention mode.

## If information is missing

If any of this information is vague, stop and objectively ask only for what is missing:

- module or path;
- aggregate or path;
- use case name;
- `crud` or `custom`.
- whether the use case returns relevant output or uses `void`.

Do not invent this data. Do not proceed without it.

## Mandatory readings

Before generating any code, mandatorily read the files below in this order:

1. `modules/auth/src/user/usecase/register-user.usecase.ts`
2. `modules/auth/src/user/usecase/index.ts`
3. `modules/auth/test/user/usecase/register-user.usecase.test.ts`
4. `modules/auth/test/mock/fake-user.repository.ts`
5. `modules/auth/test/mock/fake-crypto.provider.ts`
6. `modules/auth/test/mock/index.ts`
7. `packages/shared/src/usecase/use-case.ts`
8. `packages/shared/src/usecase/index.ts`

After that, also read the internal materials of this skill:

- `references/mandatory-readings.md`
- `references/few-shots/custom-register-user.usecase.example.ts`
- `references/few-shots/custom-register-user.usecase.test.example.ts`
- `references/few-shots/crud-find-user-by-id.usecase.example.ts`
- `references/few-shots/crud-find-user-by-id.usecase.test.example.ts`
- `references/few-shots/crud-delete-user.usecase.example.ts`
- `references/few-shots/crud-delete-user.usecase.test.example.ts`

The few-shots exist to reinforce the pattern of structure, names, constructor dependency and tests with concrete fakes.

## Destination resolution

This skill accepts two resolution modes:

### 1. Convention mode

When the user provides module and aggregate by name, use:

- use case:
  - `modules/<module>/src/<aggregate>/usecase/<use-case>.usecase.ts`
- test:
  - `modules/<module>/test/<aggregate>/usecase/<use-case>.usecase.test.ts`

### 2. Explicit path mode

When the user provides paths, normalize to the real destinations inside the module:

- if a module path comes, discover `modules/<module>`;
- if an aggregate path comes, normalize to `modules/<module>/src/<aggregate>`;
- if a path of the `usecase/` folder comes, write the file in it;
- if the final path of the `<name>.usecase.ts` file comes, use it directly;
- the test continues in the module pattern in `modules/<module>/test/<aggregate>/usecase/`, except when the request itself brings an explicit and valid path for the test.

If there is real ambiguity between two valid destinations, stop and ask for objective confirmation.

## Mandatory conventions

- File name always in `kebab-case`.
- Main file always with the `.usecase.ts` suffix.
- Test file always with the `.usecase.test.ts` suffix.
- Class name always in `PascalCase`.
- The class must never end with `UseCase`.
- Input interface always with the `In` suffix.
- Output interface, when it exists, always with the `Out` suffix.

Example:

- file: `register-user.usecase.ts`
- class: `RegisterUser`
- input: `RegisterUserIn`
- output: `RegisterUserOut`

## Deterministic flow

1. Validate that `modules/<module>` exists.
2. Resolve the aggregate:
   - if the user provided only the name, use `modules/<module>/src/<aggregate>`;
   - if they provided a path, normalize to the real aggregate folder;
   - if the path points to `usecase/` or to a file inside it, go back to the aggregate root.
3. Confirm that the aggregate exists before continuing.
4. Read the module's `package.json` to discover the real name of the test workspace.
5. Read the aggregate's `usecase/` `index.ts`, if it exists.
6. Also read what is relevant for the concrete case:
   - `provider/index.ts`;
   - repository or provider contracts used by the use case;
   - `model/index.ts` and entities used;
   - `test/mock/index.ts`;
   - already existing module fakes.
7. First look for reusable concrete fakes in `modules/<module>/test/mock/`.
8. Create or update the use case.
9. Create or update the test.
10. Update necessary exports without removing existing exports.
11. Run the relevant tests and check coverage.
12. If the use case coverage is not 100%, complement the tests before finishing.

## Mandatory use case structure

The file must follow the project pattern:

1. import `UseCase` from `@<scope>/shared` when the local pattern remains valid;
2. declare `export interface <CaseName>In`;
3. declare `export interface <CaseName>Out` only when there is a relevant return;
4. declare `export class <CaseName> implements UseCase<<CaseName>In, <OutOrVoid>>`;
5. receive dependencies through the constructor;
6. expose `async execute(input: <CaseName>In): Promise<<OutOrVoid>>`.

Rules:

- when there is no relevant output, use `void` and omit the `Out` interface;
- when there is relevant output, create the local `Out` interface and return that contract;
- keep the implementation simple, readable and easy to evolve;
- do not invent business rules that were not requested;
- do not couple the use case to backend, controller, Prisma or HTTP;
- focus on the contract and on basic domain orchestration.

## Rules by scenario type

### `crud`

For `crud`, follow a minimal and predictable implementation, compatible with cases such as:

- create;
- update;
- delete;
- find by id;
- find page.

In these scenarios:

- prefer simple dependencies, usually repositories;
- reuse types and contracts already existing in the aggregate;
- keep a direct flow, without unnecessary extra conditions;
- only add extra validation when the request explicitly brings this need or when the module pattern already requires it.

### `custom`

For `custom`:

- build the use case based on what the user described;
- keep an initial implementation that is simple and not very opinionated;
- when there are gaps, prefer minimal contracts and useful placeholders instead of inventing detailed behavior;
- treat external dependencies as contracts injected through the constructor.

## Rules for dependencies

- First look for contracts and types already existing in the aggregate.
- Reuse repositories, providers and entities already exported by the module.
- Do not introduce a new dependency without necessity.
- If the request mentions expected dependencies, respect that.
- If the use case only orchestrates a simple call, do not create extra layers.

## Unit test rules

The use case test is mandatory.

Preferred destination:

- `modules/<module>/test/<aggregate>/usecase/<use-case>.usecase.test.ts`

Mandatory minimum coverage of the test:

1. happy path;
2. validation failures, when they exist;
3. dependencies called or not called according to the flow;
4. all existing branches and conditionals;
5. expected return, when there is output;
6. behavior when an error is propagated or handled;
7. absence of side effects when the flow fails before the critical point.

Quality rules:

- use real and concrete fake implementations, not framework mocks as the main strategy;
- prioritize existing module fakes before creating new ones;
- if a suitable fake exists, reuse it and do not duplicate it;
- if there is no suitable fake for an essential dependency, create a simple and reusable fake in `modules/<module>/test/mock/`;
- when creating a new fake, also export it in `modules/<module>/test/mock/index.ts`;
- use spies only as occasional support on concrete classes or prototypes, as in the `User.prototype.validate` example;
- write real and useful tests, not superficial ones.

## Fake reuse

Before creating a new fake, look for:

- `modules/<module>/test/mock/fake-<aggregate>.repository.ts`
- other `fake-*.ts` in `modules/<module>/test/mock/`
- existing exports in `modules/<module>/test/mock/index.ts`

If a fake covers the dependency:

- reuse the existing class;
- adapt the test to its contract;
- avoid duplication under another name.

If a fake does not exist and is essential:

- create a simple concrete class;
- keep in-memory storage or predictable behavior;
- avoid `jest.fn()` as the main structure of the fake;
- leave the fake ready to be reused by other tests of the module.

## Exports and integration

When finishing, ensure at least:

- creation or update of `modules/<module>/src/<aggregate>/usecase/<use-case>.usecase.ts`
- creation or update of `modules/<module>/src/<aggregate>/usecase/index.ts`

If necessary, also update the indispensable minimum to keep accessibility through the module pattern:

- aggregate barrel;
- module barrel;
- `modules/<module>/test/mock/index.ts`, when there is a new fake.

Preserve all existing exports.

## Mandatory verification

Run the verification from the monorepo root:

```bash
MODULE_PKG=$(node -p "require('./modules/<module>/package.json').name")
npm run test --workspace "$MODULE_PKG" -- --runInBand --runTestsByPath "modules/<module>/test/<aggregate>/usecase/<use-case>.usecase.test.ts"
npm run test --workspace "$MODULE_PKG" -- --runInBand --coverage --collectCoverageFrom="src/<aggregate>/usecase/<use-case>.usecase.ts" --runTestsByPath "modules/<module>/test/<aggregate>/usecase/<use-case>.usecase.test.ts"
```

If a new fake was created or changed and it has its own logic with an observable branch, also run the tests that exercise it.

Do not finish the task while:

- the use case does not compile in the module context;
- the test does not exist;
- the exports are not correct;
- the observable coverage of the use case has not reached 100%.

## Minimum expected delivery

When applying this skill correctly, the minimum result must include:

- the use case file;
- the corresponding unit test;
- the `usecase/` `index.ts` updated;
- update of `test/mock/index.ts`, if there is a new fake;
- real validation of the tests and the coverage.

## Restrictions

- Do not create a controller.
- Do not create Prisma.
- Do not create a backend adapter.
- Do not add unnecessary complexity.
- Do not invent business rules that were not requested.
- Do not skip the mandatory reading.
- Do not change files outside the target module and the skill itself beyond what is strictly necessary to integrate the use case.
