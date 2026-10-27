import { AccountRemovalNotifier } from "../../src";

export class FakeAccountRemovalNotifier implements AccountRemovalNotifier {
  readonly removed: string[] = [];
  readonly restored: string[] = [];
  failWith: Error | null = null;

  async accountRemoved(userId: string): Promise<void> {
    this.removed.push(userId);
    if (this.failWith) throw this.failWith;
  }

  async accountRestored(userId: string): Promise<void> {
    this.restored.push(userId);
    if (this.failWith) throw this.failWith;
  }
}
