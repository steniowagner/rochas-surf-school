---
name: shared-validation-rule
description: Creates reusable validation rules in the application's shared package, following the existing pattern of contracts, utilities, error codes, exports and complete unit tests.
---

# Shared Validation Rule

Use this skill when the request is to create or update a reusable rule in `packages/shared/src/validation/rules`.

## Objective

- Create new reusable validation rules inside `packages/shared`.
- Follow exactly the structural, semantic and testing pattern already adopted in the project.
- Reuse `packages/shared/src/validation/rule.utils.ts` whenever it makes sense.
- Create robust and short unit tests, focused on the observable contract of the rule.
- Ensure correct integration with the shared package exports.
- Deliver a simple, predictable, reusable and easy-to-maintain rule.

## Mandatory inputs

Only run the implementation when these inputs are clear in the request or can be inferred with low risk:

1. Name of the rule to be created.
2. Purpose of the validation.
3. Main type of the validated value: `string`, `number`, `date`, `array` or `mixed`.
4. Expected error code when the rule fails.

## Optional inputs

- Rule parameters, when there are any: minimum, maximum, list of values, regex, behavior settings.
- Examples of valid and invalid values.
- Whether the rule should ignore empty values or treat them as invalid.

## Mandatory reading

Before creating the rule, mandatorily read the files below, in this order:

1. `packages/shared/src/validation/validation-rule.interface.ts`
2. `packages/shared/src/validation/validation-field.interface.ts`
3. `packages/shared/src/validation/validator.ts`
4. `packages/shared/src/validation/rule.utils.ts`
5. `packages/shared/src/validation/index.ts`
6. `packages/shared/src/validation/rules/index.ts`
7. Reference rules:
   - `packages/shared/src/validation/rules/required.rule.ts`
   - `packages/shared/src/validation/rules/email.rule.ts`
   - `packages/shared/src/validation/rules/min-length.rule.ts`
   - `packages/shared/src/validation/rules/range-length.rule.ts`
   - `packages/shared/src/validation/rules/strong-password.rule.ts`
   - `packages/shared/src/validation/rules/person-name.rule.ts`
8. Reference tests:
   - `packages/shared/test/validation/rules/required.rule.test.ts`
   - `packages/shared/test/validation/rules/email.rule.test.ts`
   - `packages/shared/test/validation/rules/min-length.rule.test.ts`
   - `packages/shared/test/validation/rules/range-length.rule.test.ts`
   - `packages/shared/test/validation/rules/security-rules.test.ts`
   - `packages/shared/test/validation/rules/string-rules.test.ts`

If the new rule requires a new utility or changes utility behavior, also read and update:

- `packages/shared/test/validation/rule.utils.test.ts`
- `packages/shared/test/validation/validator.test.ts` when the integration with `Validator.validate(...)` needs additional coverage
- `packages/shared/src/index.ts` when there is doubt about the package's final export chain

Also consult `references/mandatory-readings.md` and this skill's local few-shots before writing new code.

## Internal few-shots

The few-shots of this skill live in `references/few-shots/` and must be used as an immediate practical reference:

- `required.rule.example.ts`
- `required.rule.test.example.ts`
- `email.rule.example.ts`
- `email.rule.test.example.ts`
- `min-length.rule.example.ts`
- `min-length.rule.test.example.ts`
- `range-length.rule.example.ts`
- `range-length.rule.test.example.ts`
- `strong-password.rule.example.ts`
- `strong-password.rule.test.example.ts`

They exist to show the real implementation and test pattern without depending on external files for the didactic role.

## Deterministic flow

1. Normalize the rule name to `kebab-case` for the file and to PascalCase with the `Rule` suffix for the class.
2. Read all the project's mandatory references.
3. Read the internal few-shots closest to the case.
4. Define the rule contract:
   - implement `ValidationRule`;
   - expose `validate(value: unknown): string | null`;
   - return `null` when valid;
   - return only the error suffix when invalid;
   - never build `<field.code>.<errorCode>` inside the rule;
   - never throw an exception directly;
   - never create side effects.
5. Decide the behavior for empty values:
   - by default, optional rules ignore empty and return `null`;
   - leave requiredness to `RequiredRule`;
   - only treat empty as invalid when this comes explicitly from the request and is consistent with the existing pattern.
6. Reuse existing utilities before creating your own logic:
   - `validateStringValues`
   - `validateNumberValues`
   - `validateDateValues`
   - `validateEachValue`
   - `isEmptyValue`
   - `getValueLength`
   - `toValidDate`
   - `testPattern`
7. Only create a new function in `rule.utils.ts` when it is clearly generic and reusable by other rules.
8. Implement the rule in `packages/shared/src/validation/rules/<rule-name>.rule.ts`.
9. Update `packages/shared/src/validation/rules/index.ts`.
10. Check that the aggregated exports remain accessible through:
    - `packages/shared/src/validation/index.ts`
    - `packages/shared/src/index.ts`
    - preserve existing exports and add only what is necessary
11. Create or update `packages/shared/test/validation/rules/<rule-name>.rule.test.ts`.
12. If there is a new utility, create or update its tests in `packages/shared/test/validation/rule.utils.test.ts`.
13. Run the relevant tests of the shared package and complement coverage until the new rule reaches 100%.

## Implementation rules

- The rule file must always be `packages/shared/src/validation/rules/<rule-name>.rule.ts`.
- The file name must always be in `kebab-case`.
- The class name must be in PascalCase with the `Rule` suffix.
- Every rule must implement `ValidationRule`.
- The method must follow exactly `validate(value: unknown): string | null`.
- The rule must return only the error suffix, for example:
  - `required`
  - `invalid.email`
  - `min.length`
  - `range.length`
  - `strong.password`
  - `person.name`
- The `Validator` is what builds the full error in the `<field.code>.<errorCode>` format.
- Do not duplicate logic already existing in `rule.utils.ts`.
- Keep the implementation short, predictable and readable.
- When the rule accepts parameters, receive them through the constructor, in the same style as the existing rules.
- When the rule validates collections or multiple values, follow the style of the current rules based on `validateEachValue` and derivatives.

## Rules for the tests

- The rule test must live in `packages/shared/test/validation/rules/<rule-name>.rule.test.ts`.
- Follow the project style:
  - imports from `../../../src/index`;
  - `describe("<ClassName>Rule", ...)`;
  - short, clear and contract-oriented tests;
  - avoid unnecessary indirection.
- Cover, at a minimum:
  - valid scenario;
  - invalid scenario;
  - behavior with empty values, when applicable;
  - behavior with invalid types, when applicable;
  - behavior of the parameters, when they exist;
  - relevant boundary scenarios.
- If the rule reuses a utility with relevant branches, test the observable behavior of the rule without duplicating the utility test beyond what is necessary.
- If there is a new utility function, create direct tests for it in `packages/shared/test/validation/rule.utils.test.ts`.
- If the user provides examples of valid and invalid values, reproduce these examples in the tests whenever it makes sense.
- The expected coverage for the new rule is 100%.

## Verification

Run the verification from the monorepo root:

```bash
SHARED_PKG=$(node -p "require('./packages/shared/package.json').name")
npm run test --workspace "$SHARED_PKG" -- --runInBand --runTestsByPath "packages/shared/test/validation/rules/<rule-name>.rule.test.ts"
npm run test --workspace "$SHARED_PKG" -- --runInBand
```

If there was a change in `rule.utils.ts`, also validate:

```bash
SHARED_PKG=$(node -p "require('./packages/shared/package.json').name")
npm run test --workspace "$SHARED_PKG" -- --runInBand --runTestsByPath "packages/shared/test/validation/rule.utils.test.ts"
```

Do not finish the task while:

- the rule is not exported correctly;
- the rule test does not exist;
- the observable coverage of the new rule is not complete;
- the behavior is not consistent with `Validator.validate(...)`.

## Expected output

When completing an implementation based on this skill, the minimum result must include:

- `packages/shared/src/validation/rules/<rule-name>.rule.ts`
- update of `packages/shared/src/validation/rules/index.ts`
- test in `packages/shared/test/validation/rules/<rule-name>.rule.test.ts`
- additional updates to aggregated exports only if really necessary
- update of `rule.utils.ts` and `rule.utils.test.ts` only when a new and clearly reusable helper arises

## Restrictions

- This skill does not create entities, use cases or controllers.
- This skill exists only to create reusable rules in the shared package.
- Do not invent a new pattern if the project already has one.
- Do not create extra documentation outside this skill folder.
- Do not skip reading the mandatory references.
- Do not change unrelated rules, exports or tests beyond what is necessary to integrate the new rule.
