import { describe, expect, it } from "vitest";

import { designHref, designPageOf } from "./design-href";

describe("designHref", () => {
  it("picks the design page from the id's prefix", () => {
    expect(designPageOf("AF-01-01")).toBe("auth-flow");
    expect(designPageOf("ST-01-01")).toBe("student-app");
    expect(designPageOf("IN-01-01")).toBe("instructor-app");
    expect(designPageOf("AD-01-01")).toBe("admin-app");
  });

  it("links the frame in the page's language", () => {
    expect(designHref("en", "AF-02-12")).toBe("/en/designs/auth-flow#AF-02-12");
    expect(designHref("es", "IN-03-10")).toBe("/es/designs/instructor-app#IN-03-10");
    expect(designHref("pt-br", "AD-11-08")).toBe("/pt-br/designs/admin-app#AD-11-08");
  });

  it("sends AU-17's ST-05-07 to the student app page", () => {
    expect(designHref("pt-br", "ST-05-07")).toBe("/pt-br/designs/student-app#ST-05-07");
  });

  it("throws on an unknown prefix", () => {
    expect(() => designHref("en", "DS-01-01")).toThrow('No design page for "DS-01-01"');
  });
});
