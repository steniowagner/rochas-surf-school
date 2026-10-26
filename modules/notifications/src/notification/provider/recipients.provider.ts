export const BROADCAST_AUDIENCES = ["all", "students", "instructors"] as const;

export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number];

export interface RecipientsProvider {
  /** Ids of every user with role admin and status approved. */
  findApprovedAdminIds(): Promise<string[]>;
  /**
   * Ids of the approved users of an audience: `all` is students, instructors and admins; `students` and
   * `instructors` follow the role.
   */
  findApprovedUserIdsByAudience(audience: BroadcastAudience): Promise<string[]>;
}
