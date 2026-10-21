import { WaitingListSetting } from "../../src";

export class FakeWaitingListSetting implements WaitingListSetting {
  constructor(private enabled = true) {}

  async isEnabled(): Promise<boolean> {
    return this.enabled;
  }
}
