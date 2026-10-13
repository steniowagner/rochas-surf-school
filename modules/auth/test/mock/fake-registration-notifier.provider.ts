import { RegistrationNotifier } from "../../src";

export class FakeRegistrationNotifier implements RegistrationNotifier {
  readonly pending: { id: string; name: string }[] = [];
  readonly approved: string[] = [];
  readonly denied: { userId: string; reason?: string }[] = [];

  async registrationPending(account: { id: string; name: string }): Promise<void> {
    this.pending.push(account);
  }

  async registrationApproved(userId: string): Promise<void> {
    this.approved.push(userId);
  }

  async registrationDenied(userId: string, reason?: string): Promise<void> {
    this.denied.push({ userId, reason });
  }
}
