# Repository Pattern

Pattern observed in the project:

- The repository contract lives in `modules/<module>/src/<aggregate>/provider/<aggregate>.repository.ts`
- The `provider/index.ts` file re-exports the contract
- The aggregate exposes `model`, `provider` and `usecase` through `src/<aggregate>/index.ts`
- The domain repository uses imports from `@<scope>/shared`
- The aggregate's entity comes from `../model`
- The test uses a fake in `modules/<module>/test/mock/fake-<aggregate>.repository.ts`
- The fake imports module types via `../../src` when this simplifies consumption

Minimal CRUD pattern observed in `auth`:

```ts
import { CrudRepository } from "@<scope>/shared";
import { User } from "../model";

export interface UserPageParams {
  page: number;
  perPage: number;
}

export interface UserRepository extends CrudRepository<
  User,
  User,
  User,
  UserPageParams
> {}
```

Fake pattern observed in `auth`:

- uses `Map<string, Entity>` for storage
- accepts initial data in the constructor
- exposes reading of the in-memory collection
- implements `findPage` returning `PageResult<TEntity>`
- fails on `update` when the record does not exist

Safe heuristics:

- If the entity already represents the creation and update payload, reuse the entity itself as the `CrudRepository` generic.
- If it is not safe to reuse the entity, create small and explicit local auxiliary types.
- If the request mentions only part of the CRUD operations, prefer composition with granular contracts instead of `CrudRepository`.
- In custom repositories, avoid manually declaring a method that already fits a shared contract.
