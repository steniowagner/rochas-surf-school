import { CrudRepository, PageResult } from "@rochas-surf-school/shared";
import { RulesAcceptance, User, UserRole, UserStatus } from "../model";

export interface UserPageParams {
  page: number;
  perPage: number;
}

export interface DirectoryPageParams {
  page: number;
  perPage: number;
  /** Users with at least one of these roles; absent or empty means every role. */
  roles?: UserRole[];
  /** Already trimmed; matched as a "contains" on the name, ignoring case and accents. */
  search?: string;
}

/** The role and status a guarded write expects to find stored. */
export interface ExpectedUserState {
  role: UserRole;
  status: UserStatus;
}

/**
 * What a guarded write came to: written; not written because the stored role or status isn't the expected one (or
 * the user is gone); or not written because it would leave the school without an approved admin.
 */
export type KeepAdminResult = "updated" | "changed" | "lastAdmin";

export interface UserRepository extends CrudRepository<
  User,
  User,
  User,
  UserPageParams
> {
  /** Page of the `approved` users, filtered by roles and name and sorted A–Z by name (ignoring case and accents, ties broken by id). */
  findDirectoryPage(params: DirectoryPageParams): Promise<PageResult<User>>;
  searchByName(name: string): Promise<User[]>;
  findByEmail(email: string): Promise<User | null>;
  /** Users with status `pending`, oldest first. */
  findPending(): Promise<User[]>;
  /** Writes the user only while its stored status is `pending`; false when it wasn't written. */
  updateIfPending(user: User): Promise<boolean>;
  /** Deleted users whose reactivation is `requested`, oldest request first, ties broken by id. */
  findReactivationRequests(): Promise<User[]>;
  /**
   * Writes the user only while the stored one is `deleted` with a `requested` reactivation (one conditional update);
   * false when it wasn't written.
   */
  updateIfReactivationRequested(user: User): Promise<boolean>;
  /**
   * Users with status `removed` whose `removedAt` is after `cutoff`, most recent removal first, ties broken by id;
   * one without `removedAt` is never listed.
   */
  findRemovedSince(cutoff: Date): Promise<User[]>;
  /** Writes the user only while the stored one is still `removed` (one conditional update); false when it wasn't written. */
  updateIfRemoved(user: User): Promise<boolean>;
  /** Ids of the `denied` users whose `deniedAt` is at or before `cutoff`; one without `deniedAt` is never listed. */
  findDeniedBefore(cutoff: Date): Promise<string[]>;
  /** Deletes, with everything that hangs off them, those of these users that are still `denied`; returns how many. */
  deleteDenied(ids: string[]): Promise<number>;
  /** Stores the acceptance; one already stored for that version stays as it is. */
  addRulesAcceptance(userId: string, acceptance: RulesAcceptance): Promise<void>;
  /** How many users are approved admins. */
  countApprovedAdmins(): Promise<number>;
  /**
   * Writes the user only while its stored role and status are `expected` and, when the stored user is an approved
   * admin who stops being one, at least one other approved admin remains — all in one step, so two concurrent
   * writes can't both take away the last admins.
   */
  updateKeepingAnAdmin(user: User, expected: ExpectedUserState): Promise<KeepAdminResult>;
}
