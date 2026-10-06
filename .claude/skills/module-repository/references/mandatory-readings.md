# Mandatory Readings

Read these files exactly in this order before generating the repository:

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

Extract from these readings:

- which generic contracts already exist in `shared`
- how the project imports these contracts
- how the aggregate exposes entity and repository
- how the fake uses `Map`, `PageResult` and imports from the module itself
- which naming convention the project uses for `PageParams`, `Repository` and `Fake...Repository`

Before editing files of the target module, also check:

- `modules/<module>/src/<aggregate>/provider/index.ts`, if it exists
- `modules/<module>/src/<aggregate>/index.ts`, if it exists
- `modules/<module>/test/mock/index.ts`, if it exists

If any mandatory reading fails, stop and clearly report the blocker.
