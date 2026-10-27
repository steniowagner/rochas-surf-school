/** Tells a person an admin removed or restored their account; implemented by the backend module that owns notifications. */
export interface AccountRemovalNotifier {
  accountRemoved(userId: string): Promise<void>;
  accountRestored(userId: string): Promise<void>;
}
