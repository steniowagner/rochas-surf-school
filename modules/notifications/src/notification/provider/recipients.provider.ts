export interface RecipientsProvider {
  /** Ids of every user with role admin and status approved. */
  findApprovedAdminIds(): Promise<string[]>;
}
