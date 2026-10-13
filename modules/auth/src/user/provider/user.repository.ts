import { CrudRepository } from "@rochas-surf-school/shared";
import { RulesAcceptance, User } from "../model";

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
  findByEmail(email: string): Promise<User | null>;
  /** Users with status `pending`, oldest first. */
  findPending(): Promise<User[]>;
  /** Writes the user only while its stored status is `pending`; false when it wasn't written. */
  updateIfPending(user: User): Promise<boolean>;
  /** Ids of the `denied` users whose `deniedAt` is at or before `cutoff`; one without `deniedAt` is never listed. */
  findDeniedBefore(cutoff: Date): Promise<string[]>;
  /** Deletes, with everything that hangs off them, those of these users that are still `denied`; returns how many. */
  deleteDenied(ids: string[]): Promise<number>;
  /** Stores the acceptance; one already stored for that version stays as it is. */
  addRulesAcceptance(userId: string, acceptance: RulesAcceptance): Promise<void>;
}
