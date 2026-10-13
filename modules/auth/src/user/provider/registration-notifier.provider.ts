/** Tells the people involved about a registration; implemented by the backend module that owns notifications. */
export interface RegistrationNotifier {
  /** A new account started waiting for approval: every approved admin is told. */
  registrationPending(account: { id: string; name: string }): Promise<void>;
  registrationApproved(userId: string): Promise<void>;
  /** `reason` is the admin's trimmed reason, when one was given. */
  registrationDenied(userId: string, reason?: string): Promise<void>;
}
