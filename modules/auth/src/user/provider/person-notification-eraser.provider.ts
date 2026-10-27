/** Deletes the notifications about people in anyone's inbox; implemented by the backend module that owns notifications. */
export interface PersonNotificationEraser {
  /** Deletes the notifications that name these (erased) accounts in other people's inboxes. */
  erase(userIds: string[]): Promise<void>;
}
