# Validation Inference Guide

Use this guide together with the real rules in `packages/shared/src/validation/rules/`.

## Selection process

1. Identify the field semantics by its name.
2. Cross-check with the TypeScript type.
3. First look for an existing shared rule.
4. Combine simple rules instead of creating a new rule too early.
5. Only create a new shared rule when the need is generic and recurring.

## Common mappings

- `name`, `fullName`, `ownerName`
  - `RequiredRule`
  - `MinLengthRule`
  - `MaxLengthRule`
  - `PersonNameRule`
- `email`
  - `RequiredRule`
  - `EmailRule`
- `passwordHash`, `hashedPassword`
  - `BcryptHashRule`
- `password`
  - `RequiredRule`
  - `StrongPasswordRule`
  - `NoCommonPasswordRule`
- `slug`
  - `RequiredRule`
  - `SlugRule`
- `url`, `website`
  - `RequiredRule`
  - `UrlRule`
- `domain`
  - `RequiredRule`
  - `DomainRule`
- `phone`
  - `RequiredRule`
  - `PhoneRule`
  - `PhoneBrRule` when the semantics are Brazilian
- `cpf`, `cnpj`, `cep`, `rg`
  - use the existing specific rule
- `id`, `userId`, `customerId`, `transactionId`
  - `RequiredRule`
  - `UuidRule`
- `quantity`, `count`, `installments`
  - `RequiredRule`
  - `IntegerRule`
  - `PositiveRule`
- `amount`, `price`, `total`
  - `RequiredRule`
  - `PositiveRule`
  - `PrecisionRule` when there is a defined monetary scale
- `createdOn`, `expiresAt`, `birthDate`
  - `RequiredRule`
  - `DateRule`
  - `PastDateRule` or `FutureDateRule` as appropriate
- arrays such as `tags`, `items`, `emails`
  - `RequiredRule` if it cannot be missing
  - `MinItemsRule`
  - `MaxItemsRule`
  - `UniqueItemsRule`

## Signs that it is worth creating a new shared rule

- the validation does not depend on the current entity
- the rule name makes sense in any module
- the rule can be tested in isolation in `shared`
- the rule represents a generic format, range, combination or policy

## Signs that it is not worth creating a new shared rule

- the rule mentions context exclusive to an aggregate
- the error would make sense only for one entity
- the need can be met by combining existing rules
