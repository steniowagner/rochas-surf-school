import { formatRemovalDates } from "./format-removal-dates";

describe("formatRemovalDates", () => {
  it("gives the removal day and the last day to restore it, in the app's language", () => {
    expect(formatRemovalDates("2026-10-02T15:00:00.000Z", "pt-BR")).toEqual({ date: "2 out", until: "1 nov" });
    expect(formatRemovalDates("2026-10-02T15:00:00.000Z", "es-ES")).toEqual({ date: "2 oct", until: "1 nov" });
    expect(formatRemovalDates("2026-10-02T15:00:00.000Z", "en-US")).toEqual({ date: "Oct 2", until: "Nov 1" });
  });

  it("uses the school's time zone", () => {
    // 02:00 UTC on Oct 3 is still Oct 2 in Fortaleza (UTC-3).
    expect(formatRemovalDates("2026-10-03T02:00:00.000Z", "pt-BR").date).toBe("2 out");
  });

  it("answers empty texts for an invalid date", () => {
    expect(formatRemovalDates("not a date", "en-US")).toEqual({ date: "", until: "" });
  });
});
