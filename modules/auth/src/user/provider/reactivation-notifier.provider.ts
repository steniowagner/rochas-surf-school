/** Tells the people involved about a reactivation request; implemented by the backend module that owns notifications. */
export interface ReactivationNotifier {
  /** A deleted account asked to come back: every approved admin is told. */
  reactivationRequested(account: { id: string; name: string }): Promise<void>;
  reactivationApproved(userId: string): Promise<void>;
  /** `reason` is the admin's trimmed reason, when one was given. */
  reactivationDenied(userId: string, reason?: string): Promise<void>;
}
