# Mandatory Readings

Read these project files before creating or updating any use case with this skill:

1. `modules/auth/src/user/usecase/register-user.usecase.ts`
2. `modules/auth/src/user/usecase/index.ts`
3. `modules/auth/test/user/usecase/register-user.usecase.test.ts`
4. `modules/auth/test/mock/fake-user.repository.ts`
5. `modules/auth/test/mock/fake-crypto.provider.ts`
6. `modules/auth/test/mock/index.ts`
7. `packages/shared/src/usecase/use-case.ts`
8. `packages/shared/src/usecase/index.ts`

Purpose of each block:

- `register-user.usecase.ts`: main reference for structure, contracts and orchestration.
- `usecase/index.ts`: export pattern of the aggregate.
- `register-user.usecase.test.ts`: test style and observation of side effects.
- `test/mock/*.ts`: style of the module's concrete fakes.
- `packages/shared/src/usecase/*`: base `UseCase<In, Out>` contract.

After the readings above, consult the local few-shots of this skill to speed up the materialization of the most common cases without departing from the project pattern.
