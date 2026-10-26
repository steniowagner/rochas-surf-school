import { joinAudience } from "./audience";

describe("joinAudience", () => {
  it.each([
    [[], ""],
    [["2 students"], "2 students"],
    [["2 students", "1 request"], "2 students and 1 request"],
    [
      ["2 students", "1 request", "1 instructor"],
      "2 students, 1 request and 1 instructor",
    ],
  ])("joins %j", (parts, expected) => {
    expect(joinAudience(parts, "and")).toBe(expected);
  });
});
