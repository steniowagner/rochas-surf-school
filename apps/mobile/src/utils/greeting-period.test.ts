import { getGreetingPeriod } from "./greeting-period";

const at = (hours: number, minutes = 0) => new Date(2026, 9, 22, hours, minutes);

describe("getGreetingPeriod", () => {
  it.each([
    [at(5), "morning"],
    [at(11, 59), "morning"],
    [at(12), "afternoon"],
    [at(17, 59), "afternoon"],
    [at(18), "evening"],
    [at(23, 59), "evening"],
    [at(0), "evening"],
    [at(4, 59), "evening"],
  ])("reads %p as %p", (date, period) => {
    expect(getGreetingPeriod(date)).toBe(period);
  });
});
