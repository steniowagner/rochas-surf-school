/** Deletes what other modules keep about a registration; implemented by the backend module that owns notifications. */
export interface RegistrationNotificationEraser {
  /** Deletes the admins' "new registration" notifications about these (erased) accounts. */
  erase(userIds: string[]): Promise<void>;
}
