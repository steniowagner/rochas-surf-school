import { ReactivationNotifier } from "../../src";

export class FakeReactivationNotifier implements ReactivationNotifier {
  readonly requested: { id: string; name: string }[] = [];
  readonly approved: string[] = [];
  readonly denied: { userId: string; reason?: string }[] = [];

  async reactivationRequested(account: { id: string; name: string }): Promise<void> {
    this.requested.push(account);
  }

  async reactivationApproved(userId: string): Promise<void> {
    this.approved.push(userId);
  }

  async reactivationDenied(userId: string, reason?: string): Promise<void> {
    this.denied.push({ userId, reason });
  }
}
