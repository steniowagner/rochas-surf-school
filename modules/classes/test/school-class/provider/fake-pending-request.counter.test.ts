import { FakePendingRequestCounter } from "../../mock";

describe("FakePendingRequestCounter", () => {
  it("answers 0 by default and the configured count otherwise", async () => {
    expect(await new FakePendingRequestCounter().countPendingRequests()).toBe(0);
    expect(await new FakePendingRequestCounter(3).countPendingRequests()).toBe(3);
  });
});
