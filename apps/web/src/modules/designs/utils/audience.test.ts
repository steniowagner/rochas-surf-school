import { describe, expect, it } from "vitest";

import { joinAudience } from "./audience";

describe("joinAudience", () => {
  it("joins one, two and three pieces with the language's and", () => {
    expect(joinAudience([], "e")).toBe("");
    expect(joinAudience(["a"], "e")).toBe("a");
    expect(joinAudience(["a", "b"], "e")).toBe("a e b");
    expect(joinAudience(["a", "b", "c"], "e")).toBe("a, b e c");
  });
});
