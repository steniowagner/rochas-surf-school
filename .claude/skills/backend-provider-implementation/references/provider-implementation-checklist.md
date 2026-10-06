# Provider Implementation Checklist

## Name and destination

- infer `<module>` from the real path in `modules/<module>/...`
- create the file at the root of `apps/backend/src/modules/<module>/` by default
- choose a file name consistent with the technical responsibility
- choose a concrete and explicit class name

Naming examples:

- `bcrypt.crypto.ts` -> `BcryptCryptoProvider`
- `jwt.token.ts` -> `JwtTokenProvider`
- `system.clock.ts` -> `SystemClockProvider`
- `node.uuid.ts` -> `NodeUuidProvider`

## Library strategy

Order of preference:

1. already installed library that fits the contract well
2. Node runtime when it solves the contract safely
3. mature, simple and stable library

Suggestions by intent:

- password and hash: `bcrypt` when the contract is password encryption
- JWT: `jsonwebtoken` when signing and validating simple tokens is enough
- email: `nodemailer` for simple SMTP sending
- uuid: `randomUUID` from `node:crypto` before adding a dependency
- clock: `new Date()` or `Date.now()` wrapped in a simple provider

## Nest integration

- add `@Injectable()` to the concrete class
- register the class in `providers`
- export the class when other modules may need it
- prefer direct injection of the concrete class in Nest controllers and services
- pass the concrete class to use cases that depend on the domain interface

## Tests

Create tests when there is at least one of these signals:

- observable logic beyond mere passthrough
- the implementation's own configuration
- data normalization, fallback or transformation
- real risk of regression in the contract

If the external library does almost all the work, test the contract exposed by the class and document the coverage limits.

## What to avoid

- editing the domain interface
- creating tokens, symbols or wrappers without necessity
- adding public methods outside the contract
- pushing business rules into infrastructure
- installing a new dependency when the current one already solves it
- spreading the implementation across several files without necessity
