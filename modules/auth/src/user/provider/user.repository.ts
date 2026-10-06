import { CrudRepository } from "@rochas-surf-school/shared";
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
> {
  searchByName(name: string): Promise<User[]>;
}
