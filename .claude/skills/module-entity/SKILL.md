---
name: module-entity
description: Creates standardized domain entities for the application's modules, with typed state, inheritance from the base entity, explicit validation driven by the project's reusable rules and complete unit tests to ensure safe evolution.
---

# Module Entity

Use this skill when the request is to create or complete a domain entity inside an existing module in `modules/`, together with the entity's unit test and the coverage check.

This skill does not create a controller, Prisma repository, migration, seed or backend adaptations. The focus here is only:

- domain entity
- explicit and lazy validation
- reuse of shared rules
- strong unit tests
- 100% coverage for the created or changed entity

## Mandatory inputs

1. `module name`
2. `aggregate name` or `aggregate path`
3. `entity name`
4. `list of attributes with types`

Optional input:

5. `explicit rules per field`, when the user wants to force some validation

## Mandatory references

Before generating any code, mandatorily read:

1. `modules/auth/src/user/model/user.entity.ts`
2. `modules/auth/test/user/model/user.entity.test.ts`
3. `packages/shared/src/validation/rules/`
4. `packages/shared/src/validation/index.ts`
5. `packages/shared/src/validation/validator.ts`
6. `packages/shared/src/model/entity.ts`

Also read the internal references of this skill to speed up the structural reproduction:

- `references/user-entity-pattern.md`
- `references/validation-inference-guide.md`

## Initial validations

1. Validate that `modules/<module>` exists.
2. Resolve the aggregate:
   - If the user provides only the name, use `modules/<module>/src/<aggregate>`.
   - If the user provides a path, it must point to a real aggregate inside `modules/<module>/src/`.
3. If the provided path points to `model/` or to a file inside the aggregate, normalize to the aggregate folder.
4. If the aggregate does not exist, stop and ask for the correct aggregate.
5. Do not infer multiple destinations. If there is real ambiguity between two valid paths, stop and ask for confirmation.
6. Read `modules/<module>/package.json` to discover the real workspace name before running the tests.

## Mandatory destinations

- Entity:
  - `modules/<module>/src/<aggregate>/model/<entity>.entity.ts`
- Test:
  - `modules/<module>/test/<aggregate>/model/<entity>.entity.test.ts`

Mandatory conventions:

- File name in `kebab-case`
- State interface in `PascalCase` with the `State` suffix
- Class in `PascalCase`

Example:

- file: `customer.entity.ts`
- interface: `CustomerState`
- class: `Customer`

## Mandatory entity structure

Follow the project pattern exactly:

1. `export interface <EntityName>State extends EntityState`
2. `export class <EntityName> extends Entity<<EntityName>State>`
3. Constructor only passes `props` to `super(props)`
4. Explicit getters for all provided fields
5. `validate()` with `Validator.validate([...])`

Expected format:

```ts
export interface ExampleEntityState extends EntityState {
  field: string;
}

export class ExampleEntity extends Entity<ExampleEntityState> {
  constructor(props: ExampleEntityState) {
    super(props);
  }

  get field(): string {
    return this.props.field;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "exampleEntity.field",
        value: this.field,
        rules: [new RequiredRule()],
      },
    ]);
  }
}
```

## Central validation rule

- Do not do eager validation in the constructor.
- Do not call `validate()` inside the constructor.
- The entity may temporarily exist in an invalid state.
- This is intentional and mandatory.
- The only accepted automatic validation is that of the base `Entity` class, which validates `id` and timestamps.
- Every business rule of the entity itself must live inside `validate()`.

## Validation inference heuristic

The skill must infer the best possible set of rules based on:

- field name
- field type
- pattern observed in the existing rules
- real example in `User`
- explicit rules provided by the user

Priorities:

1. Explicit user rule
2. Shared rule already existing in `packages/shared/src/validation/rules`
3. New shared rule, only if it is clearly generic and reusable

Never:

- leave a relevant field unprotected by omission
- create a local rule inside the entity when a suitable shared rule already exists
- create a shared rule for hyper-specific behavior of a single entity

### Suggested rules by type and semantics

Use the existing shared rules whenever it makes sense:

- required `string`:
  - `RequiredRule`
- personal names:
  - `RequiredRule`
  - `MinLengthRule`
  - `MaxLengthRule`
  - `PersonNameRule`
- email:
  - `RequiredRule`
  - `EmailRule`
- slug:
  - `RequiredRule`
  - `SlugRule`
- url:
  - `RequiredRule`
  - `UrlRule`
- domain:
  - `RequiredRule`
  - `DomainRule`
- hashed password:
  - `BcryptHashRule`
- plain-text password:
  - `RequiredRule`
  - `StrongPasswordRule`
  - `NoCommonPasswordRule`
- UUID in a reference field:
  - `RequiredRule`
  - `UuidRule`
- integer number:
  - `RequiredRule`
  - `IntegerRule`
- positive number:
  - `PositiveRule`
- negative number:
  - `NegativeRule`
- numeric limit:
  - `MinValueRule`
  - `MaxValueRule`
  - `RangeValueRule`
- `Date`:
  - `RequiredRule`
  - `DateRule`
- past or future date:
  - `PastDateRule`
  - `FutureDateRule`
- arrays:
  - `RequiredRule` when the field cannot be missing
  - `MinItemsRule`
  - `MaxItemsRule`
  - `UniqueItemsRule`
- strings without spaces or with a special format:
  - `NoWhitespaceRule`
  - `RegexRule`
  - `AlphaRule`
  - `AlphaNumericRule`
  - `StartsWithRule`
  - `EndsWithRule`
  - `ContainsRule`

### Error code convention

- Use a semantically stable lowercase prefix.
- Follow the pattern observed in `user.entity.ts`.
- Prefer `<aggregate>.<field>` when the entity represents the main aggregate.
- For child entities, use a clear and consistent prefix, for example `<entity>.<field>`.
- Keep the same prefix in all fields of the entity.

## Creating a new shared rule

If there is no sufficient shared rule for a recurring and generic case:

1. Create the new rule in `packages/shared/src/validation/rules/<rule>.rule.ts`
2. Export it in `packages/shared/src/validation/rules/index.ts`
3. Confirm that `packages/shared/src/validation/index.ts` already exposes it via `export * from "./rules"`
4. Create or update the test of the new rule in `packages/shared/test/validation/rules/`
5. Use the new rule in the entity

This new rule should only exist when the behavior is clearly reusable by other modules.

## Barrel updates

To reduce later manual adjustment, keep the exports consistent with the local pattern:

1. If `modules/<module>/src/<aggregate>/model/index.ts` exists, export the new entity in it.
2. If this file does not exist and the aggregate already has other entities or model, create `model/index.ts`.
3. If `modules/<module>/src/index.ts` already exports `./<aggregate>/model`, preserve the pattern.
4. If the module uses a broader barrel per aggregate, update only the minimum necessary for the entity to be accessible through the pattern already adopted in the module itself.

Do not invent structural reorganization.

## Unit test rules

The entity test must aim for 100% coverage of the entity file.

Mandatory minimum coverage:

1. creation of a valid entity
2. correct reading of all getters
3. lazy behavior, ensuring the entity can exist invalid before `validate()`
4. success of `validate()` for valid data
5. failure of `validate()` for invalid data
6. expected messages or error codes when it makes sense
7. boundary scenarios of the applied rules
8. relevant inherited behavior of the base class, when it is part of the observable surface
9. internal branches of `validate()`
10. `clone`, `deletedAt`, `createdAt` and `updatedAt` flows, when the entity exposes them observably

Test quality rules:

- follow the style of `modules/auth/test/user/model/user.entity.test.ts`
- create a helper to extract messages from `ValidationException` when this simplifies assertions
- avoid superficial tests that only instantiate the class without verifying behavior
- especially test the combinations that may leave a branch uncovered
- if the entity has only getters and a linear `validate()`, still cover success, failure and limits of each important rule

## Recommended workflow

1. Validate module, aggregate and destination.
2. Read the mandatory references.
3. Identify already existing shared rules for each field.
4. Decide the prefix of the validation codes.
5. Create or update the entity.
6. Create or update the entity test.
7. Update the aggregate's minimal barrels, if necessary.
8. If there is a new shared rule, create the rule and its test before validating the entity.
9. Run tests with coverage targeting the entity.
10. If the entity's coverage is below 100%, adjust the tests and run again.

## Verification commands

Prefer running from the project root.

For the affected module:

```bash
npm run test --workspace <workspace-name-read-from-package-json> -- --runTestsByPath test/<aggregate>/model/<entity>.entity.test.ts --collectCoverageFrom=src/<aggregate>/model/<entity>.entity.ts
```

If the implementation creates a new shared rule:

```bash
npm run test --workspace <shared-workspace-name> -- --runTestsByPath test/validation/rules/<rule>.test.ts --collectCoverageFrom=src/validation/rules/<rule>.rule.ts
```

When it makes sense, also run the module's full suite:

```bash
npm run test --workspace @<scope>/<module>
```

Mandatory objective:

- 100% coverage for the created or changed entity
- when there is a new shared rule, 100% coverage for that rule as well

## Guardrails

- Do not create a controller, repository, migration, seed or backend adaptations.
- Do not change the project's base entity pattern.
- Do not put business logic outside `validate()` without a real structural need.
- Do not trigger `validate()` in the constructor.
- Do not ignore `clone`, timestamps or `deletedAt` when they are relevant to the observable surface.
- Do not use an ad hoc local rule if there is an equivalent shared rule.
- Do not stop early with partial coverage; adjust the tests until the entity is completely covered.

## Expected output

- entity created or updated in `modules/<module>/src/<aggregate>/model/<entity>.entity.ts`
- test created or updated in `modules/<module>/test/<aggregate>/model/<entity>.entity.test.ts`
- minimal barrels adjusted when necessary
- new shared rule created only if truly generic
- final validation executed with coverage

## Few-shot

To quickly reproduce the structural pattern:

- see `references/user-entity-pattern.md`
- see `references/validation-inference-guide.md`
