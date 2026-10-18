import { PendingRequestCounter } from "../../src";

export class FakePendingRequestCounter implements PendingRequestCounter {
  constructor(private pendingRequests = 0) {}

  async countPendingRequests(): Promise<number> {
    return this.pendingRequests;
  }
}
