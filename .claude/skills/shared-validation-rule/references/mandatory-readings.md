# Mandatory Readings

Read these project files before creating a new rule:

1. `packages/shared/src/validation/validation-rule.interface.ts`
2. `packages/shared/src/validation/validation-field.interface.ts`
3. `packages/shared/src/validation/validator.ts`
4. `packages/shared/src/validation/rule.utils.ts`
5. `packages/shared/src/validation/index.ts`
6. `packages/shared/src/validation/rules/index.ts`
7. `packages/shared/src/validation/rules/required.rule.ts`
8. `packages/shared/src/validation/rules/email.rule.ts`
9. `packages/shared/src/validation/rules/min-length.rule.ts`
10. `packages/shared/src/validation/rules/range-length.rule.ts`
11. `packages/shared/src/validation/rules/strong-password.rule.ts`
12. `packages/shared/src/validation/rules/person-name.rule.ts`
13. `packages/shared/test/validation/rules/required.rule.test.ts`
14. `packages/shared/test/validation/rules/email.rule.test.ts`
15. `packages/shared/test/validation/rules/min-length.rule.test.ts`
16. `packages/shared/test/validation/rules/range-length.rule.test.ts`
17. `packages/shared/test/validation/rules/security-rules.test.ts`
18. `packages/shared/test/validation/rules/string-rules.test.ts`

Purpose of each block:

- Interfaces and `Validator`: confirm the public contract and the final error format.
- `rule.utils.ts`: identify reusable helpers and avoid duplication.
- `rules/index.ts`, `validation/index.ts` and `src/index.ts`: keep exports consistent.
- Reference rules: replicate the style of constructor, validation, error and empty handling.
- Reference tests: replicate the project style and close observable coverage.

If the implementation requires a new helper in `rule.utils.ts`, also read and update:

- `packages/shared/test/validation/rule.utils.test.ts`

If you need to prove the integration with the error builder:

- `packages/shared/test/validation/validator.test.ts`
- `packages/shared/src/index.ts` to confirm the package's final export chain
