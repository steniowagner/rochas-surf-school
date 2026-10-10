import { formatCreatedAt } from "./format-created-at";

const NOW = new Date("2026-10-10T15:00:00.000Z");

const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatCreatedAt", () => {
  it.each([
    ["en-US", "5 minutes ago"],
    ["pt-BR", "há 5 minutos"],
    ["es-ES", "hace 5 minutos"],
  ] as const)("writes 5 min 59 s as relative time in %s", (locale, text) => {
    expect(formatCreatedAt(ago(5 * MINUTE + 59 * SECOND), NOW, locale)).toEqual(
      { type: "text", text },
    );
  });

  it.each(["en-US", "pt-BR", "es-ES"] as const)(
    "says now under 60 s in %s",
    (locale) => {
      expect(formatCreatedAt(ago(59 * SECOND), NOW, locale)).toEqual({
        type: "now",
      });
      expect(formatCreatedAt(ago(0), NOW, locale)).toEqual({ type: "now" });
    },
  );

  it("says now when createdAt is in the future", () => {
    expect(formatCreatedAt(ago(-5 * MINUTE), NOW, "en-US")).toEqual({
      type: "now",
    });
  });

  it.each([
    ["exactly 60 s", 60 * SECOND, "1 minute ago"],
    ["3 h 59 min", 3 * HOUR + 59 * MINUTE, "3 hours ago"],
    ["6 days 23 h", 6 * DAY + 23 * HOUR, "6 days ago"],
  ])("writes %s as relative time", (_case, elapsed, text) => {
    expect(formatCreatedAt(ago(elapsed), NOW, "en-US")).toEqual({
      type: "text",
      text,
    });
  });

  it.each([
    ["en-US", "3 Oct"],
    ["pt-BR", "3 out"],
    ["es-ES", "3 oct"],
  ] as const)(
    "writes exactly 7 days as the date without the year in %s",
    (locale, text) => {
      expect(formatCreatedAt(ago(7 * DAY), NOW, locale)).toEqual({
        type: "text",
        text,
      });
    },
  );

  it("adds the year when it isn't the current one", () => {
    expect(formatCreatedAt("2025-12-28T15:00:00.000Z", NOW, "en-US")).toEqual({
      type: "text",
      text: "28 Dec 2025",
    });
  });

  it("uses the date in America/Fortaleza, with its year", () => {
    // 01:30 UTC on 1 Jan is still 31 Dec in Fortaleza (UTC-3).
    expect(formatCreatedAt("2026-01-01T01:30:00.000Z", NOW, "en-US")).toEqual({
      type: "text",
      text: "31 Dec 2025",
    });
  });

  it("compares the year in America/Fortaleza too", () => {
    // 01:30 UTC on 1 Jan 2027 is still 2026 in Fortaleza, so the year stays out.
    const newYear = new Date("2027-01-01T01:30:00.000Z");

    expect(
      formatCreatedAt("2026-12-01T12:00:00.000Z", newYear, "en-US"),
    ).toEqual({ type: "text", text: "1 Dec" });
  });

  it("returns nothing for an invalid createdAt", () => {
    expect(formatCreatedAt("not a date", NOW, "en-US")).toBeNull();
  });
});
