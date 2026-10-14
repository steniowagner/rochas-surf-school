import { formatSince } from "./format-since";

describe("formatSince", () => {
  it("formats the month and year in the app's locale", () => {
    expect(formatSince("2026-07-15T12:00:00.000Z", "pt-BR")).toBe("jul 2026");
    expect(formatSince("2026-07-15T12:00:00.000Z", "en-US")).toBe("Jul 2026");
    expect(formatSince("2026-01-15T12:00:00.000Z", "es-ES")).toBe("ene 2026");
  });

  it("uses the school's time zone at a month boundary", () => {
    // 01:00 UTC on Aug 1st is still July 31st in Fortaleza (UTC-3).
    expect(formatSince("2026-08-01T01:00:00.000Z", "en-US")).toBe("Jul 2026");
  });

  it("answers an empty text for an invalid date", () => {
    expect(formatSince("not a date", "en-US")).toBe("");
  });
});
