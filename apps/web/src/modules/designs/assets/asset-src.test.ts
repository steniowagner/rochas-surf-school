import { describe, expect, it } from "vitest";

import { assetSrc } from "./asset-src";

describe("assetSrc", () => {
  it("reads the src of a static image object", () => {
    expect(assetSrc({ src: "/_next/static/media/team.jpg" })).toBe("/_next/static/media/team.jpg");
  });

  it("returns a plain URL as it is", () => {
    expect(assetSrc("/team.jpg")).toBe("/team.jpg");
  });
});
