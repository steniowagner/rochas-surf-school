import { CrudRepository, PageResult } from "@rochas-surf-school/shared";
import { RulesAcceptance, User, UserRole } from "../model";

export interface UserPageParams {
  page: number;
  perPage: number;
}

export type DirectorySort = "recent" | "name";

export interface DirectoryPageParams {
  page: number;
  perPage: number;
  role?: UserRole;
  /** Already trimmed; matched as a "contains" on the name, ignoring case and accents. */
  search?: string;
  /** `recent`: newest first; `name`: A–Z ignoring case and accents. Ties are broken by id. */
  sort: DirectorySort;
}

export interface UserRepository extends CrudRepository<
  User,
  User,
  User,
  UserPageParams
> {
  /** Page of the `approved` users, filtered by role and name and sorted per `sort`. */
  findDirectoryPage(params: DirectoryPageParams): Promise<PageResult<User>>;
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
