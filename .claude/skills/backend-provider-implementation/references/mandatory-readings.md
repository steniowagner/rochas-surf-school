# Mandatory Readings

Read these files exactly in this order before implementing the provider:

1. the target file in `modules/<module>/src/**/provider/*.provider.ts`
2. the related types imported by the target provider
3. `modules/auth/src/user/provider/crypto.provider.ts`
4. `apps/backend/src/modules/auth/bcrypt.crypto.ts`
5. `apps/backend/src/modules/auth/auth.module.ts`
6. `apps/backend/src/modules/<module>/<module>.module.ts`
7. the controller or usage point in the backend, when it helps to understand the injection of the concrete class

Extract from these readings:

- the exact contract that needs to be fulfilled
- the real module name inferred from the path
- the local naming convention of the backend's concrete files
- how the backend injects concrete classes and passes them to domain use cases
- whether there is already an installed library that solves the problem

Before editing, also confirm:

- whether the target interface is unambiguous
- whether the corresponding backend module already exists
- whether the implementation should live at the root of the backend module
- whether there is a Nest consumer that will need to swap the abstraction for the concrete class

If any mandatory reading fails, stop and clearly report the blocker.
