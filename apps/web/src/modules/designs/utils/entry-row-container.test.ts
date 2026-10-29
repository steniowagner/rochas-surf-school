import { describe, expect, it } from "vitest";

import { entryRowContainerClassName } from "./entry-row-container";

describe("entryRowContainerClassName", () => {
  it("draws a card of its own without a grouping", () => {
    expect(entryRowContainerClassName()).toBe("rounded-card border border-line bg-surface px-4");
  });

  it("draws a slot of the shared card, with a divider above the next rows", () => {
    expect(entryRowContainerClassName("first")).toBe("px-4");
    expect(entryRowContainerClassName("next")).toBe("border-t border-line px-4");
  });
});
