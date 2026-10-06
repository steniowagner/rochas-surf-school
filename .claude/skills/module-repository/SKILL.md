---
name: module-repository
description: Creates standardized repository contracts for the aggregates of the business modules, reusing shared persistence interfaces and also generating an in-memory implementation to support use case tests.
---

# Module Repository

Use this skill when the request is to create or complete the repository contract of an aggregate inside `modules/`, together with a reusable fake/in-memory implementation for use case tests.

This skill covers only:

- repository interface in the domain
- minimal auxiliary types of the contract
- exports of the aggregate and of the test module
- simple and functional fake/in-memory implementation

This skill does not create:

- Prisma
- Nest backend
- controller
- migration
- seed
- real infrastructure adapters

## Mandatory inputs

1. `module` or an unambiguous `path` inside `modules/<module>/`
2. `aggregate` or the explicit `path` of the destination repository file
3. `repository type`
   - `crud`
   - `custom`
4. `main entity` handled by the repository

## Mandatory inputs when `type=custom`

5. list of desired methods
6. expected signature or intent of each method when there is relevant ambiguity

Without these inputs, stop and ask only for the missing data.

Allowed objective questions:

- `Provide the module or a path inside modules/.`
- `Provide the aggregate or the explicit path of the repository.`
- `Do you want a "crud" or "custom" repository?`
- `Which main entity does this repository handle?`
- `List the custom methods and the expected signature of each one.`

## Mandatory readings

Before generating any file, mandatorily read:

1. `packages/shared/src/db/create.repository.ts`
2. `packages/shared/src/db/update.repository.ts`
3. `packages/shared/src/db/delete.repository.ts`
4. `packages/shared/src/db/find-by-id.repository.ts`
5. `packages/shared/src/db/find-page.repository.ts`
6. `packages/shared/src/db/crud.repository.ts`
7. `packages/shared/src/db/index.ts`
8. `modules/auth/src/user/provider/user.repository.ts`
9. `modules/auth/src/user/model/user.entity.ts`
10. `modules/auth/test/mock/fake-user.repository.ts`

After that, also consult the internal materials of this skill:

- `references/mandatory-readings.md`
- `references/repository-pattern.md`
- `references/few-shots/user.repository.example.ts`
- `references/few-shots/fake-user.repository.example.ts`

## Destination resolution

Accept exactly two modes:

1. By convention:
   - `modules/<module>/src/<aggregate>/provider/<aggregate>.repository.ts`
2. By explicit path provided by the user

Rules:

- Validate that `modules/<module>` exists.
- If the aggregate comes by name, validate that `modules/<module>/src/<aggregate>` exists or that the minimal aggregate structure has already been created.
- If the user provides a path inside the aggregate, normalize to the target file in `provider/<aggregate>.repository.ts` when the intent is clear.
- If the destination is by convention, the file name must always be `<aggregate>.repository.ts` in `kebab-case`.
- The repository must live inside the `provider` folder.
- Preserve already existing local conventions when there is a valid explicit path.

## Files the skill must create or update

- `modules/<module>/src/<aggregate>/provider/<aggregate>.repository.ts`
- `modules/<module>/src/<aggregate>/provider/index.ts`
- `modules/<module>/src/<aggregate>/index.ts` when necessary to expose `./provider`
- `modules/<module>/test/mock/fake-<aggregate>.repository.ts`
- `modules/<module>/test/mock/index.ts`

Preserve existing exports. Never delete a valid export to simplify.

## Workflow

1. Validate mandatory inputs.
2. Resolve `module`, `aggregate` and the final repository path.
3. Confirm that the module exists and that the aggregate is valid.
4. Read the project's mandatory references and this skill's internal references.
5. Read the aggregate's current files:
   - `modules/<module>/src/<aggregate>/model/**`
   - `modules/<module>/src/<aggregate>/provider/index.ts`, if it exists
   - `modules/<module>/src/<aggregate>/index.ts`, if it exists
   - `modules/<module>/test/mock/index.ts`, if it exists
6. Discover the real names already used for entity, auxiliary types and exports.
7. Generate the repository interface following the rules below.
8. Generate the fake/in-memory implementing the newly created contract.
9. Update the necessary `index.ts` files without losing existing exports.
10. Report what was created or adjusted and any placeholder introduced.

## Interface rules

- The contract must follow the `export interface <EntityName>Repository` pattern.
- Reuse contracts from `@<scope>/shared` whenever there is a clear fit.
- Avoid rewriting signatures that already exist in `CreateRepository`, `UpdateRepository`, `DeleteRepository`, `FindByIdRepository`, `FindPageRepository` or `CrudRepository`.
- Use the real types of the entity and of the parameters related to the aggregate when they exist.
- If auxiliary types do not exist yet and cannot be safely inferred, create small and didactic typed placeholders in the repository file itself.
- Do not invent business rules nor detailed domain fields.
- The file must be structural: contract and minimal types, without real infrastructure.

### When `type=crud`

Prefer:

```ts
export interface <EntityName>Repository extends CrudRepository<
  <CreateInput>,
  <UpdateInput>,
  <EntityName>,
  <PageParams>,
  <IdType>
> {}
```

Rules:

- Ask for or safely infer:
  - main entity
  - creation input type
  - update input type
  - pagination parameters type, when there is `findPage`
- If it is not possible to infer safely, create placeholders such as:
  - `<EntityName>CreateInput`
  - `<EntityName>UpdateInput`
  - `<EntityName>PageParams`
- Prefer a lean contract that is easy to evolve.
- If the repository does not need `findPage`, do not force `CrudRepository`; compose granular interfaces when this makes the contract more faithful to the request.

### When `type=custom`

Rules:

- Require the list of desired methods.
- Create each method with a name, parameters and return consistent with the provided intent.
- If there is relevant ambiguity about parameters or return, stop and ask for clarification before inventing a signature.
- If a method described by the user clearly corresponds to `create`, `update`, `delete`, `findById` or `findPage`, prefer composing the interface with the shared contracts instead of duplicating a manual signature.
- When it makes sense, combine shared contracts with additional methods in the same `interface`.

## Fake/in-memory rules

- Always also generate a fake/in-memory.
- The fake does not use a mock framework.
- The fake must be a simple, concrete and functional class.
- The goal is to support real use case tests without a backend.
- The preferred destination is `modules/<module>/test/mock/fake-<aggregate>.repository.ts`.
- If the module already has a more specific testing convention, preserve it.
- The fake class must implement the newly created repository interface.
- Prioritize `Map`, `Array` or a simple combination of both for storage.
- Prioritize clarity and predictability, not infrastructure realism.

### Fake for `crud`

- Implement functional behavior for the contract methods.
- For `create`, persist in memory and return the saved entity.
- For `update`, replace the existing item and fail simply when the record does not exist.
- For `delete`, remove the item from memory.
- For `findById`, return the entity or `null`.
- For `findPage`, build a simple `PageResult<TEntity>`, consistent with the project pattern.
- Use `entity.id` as the key when the id is a string, following the project's current pattern.

### Fake for `custom`

- Implement simple and consistent versions of the defined methods.
- If the method represents a search, filter the data in memory.
- If the method represents a command, update the storage and return the minimum necessary for tests.
- Do not simulate external integrations nor framework dependencies.

## Import and export conventions

- Reuse the shared namespace exposed by the project, for example `@<scope>/shared`.
- In the domain repository, prefer importing the entity from `../model`.
- In the fake, prefer importing contract, entity and types from the module itself from `../../src` when this local convention exists.
- Update `provider/index.ts` with `export * from "./<aggregate>.repository";`
- Ensure that `src/<aggregate>/index.ts` exposes `./provider` when necessary.
- Update `test/mock/index.ts` with `export * from "./fake-<aggregate>.repository";`

## Guardrails

- Do not proceed without module, aggregate and type clearly defined.
- Do not assume every repository is CRUD.
- Do not create a Prisma implementation, backend or any real persistence.
- Do not edit files outside the target module, except the skill itself when it is being created or updated.
- Do not duplicate contracts that already exist in `packages/shared`.
- Do not create arbitrary signatures when there is relevant ambiguity.
- Do not remove existing exports.
- Do not introduce framework dependencies in the fake.

## Expected output

- Repository interface consistent with the aggregate
- Minimal auxiliary types when necessary
- Functional fake/in-memory for future tests
- Exports of the aggregate and of `test/mock` updated

Consult `references/mandatory-readings.md` for the reading checklist and `references/repository-pattern.md` for the pattern observed in the project.
