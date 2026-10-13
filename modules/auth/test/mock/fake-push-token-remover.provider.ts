import { PushTokenRemover } from "../../src";

export class FakePushTokenRemover implements PushTokenRemover {
  readonly removed: { userId: string; token: string }[] = [];

  async remove(userId: string, token: string): Promise<void> {
    this.removed.push({ userId, token });
  }
}
