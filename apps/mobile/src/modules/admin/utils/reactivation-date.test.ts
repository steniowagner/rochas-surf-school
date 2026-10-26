import { formatReactivationDate } from "./reactivation-date";

describe("formatReactivationDate", () => {
  it.each([
    ["pt-BR", "12 de out. de 2026"],
    ["en-US", "Oct 12, 2026"],
    ["es-ES", "12 oct 2026"],
  ])("writes the day in %s", (language, text) => {
    expect(formatReactivationDate("2026-10-12T15:00:00.000Z", language)).toBe(
      text,
    );
  });

  it("uses the school's time zone, whatever the phone's", () => {
    // 01:00 UTC is still the day before in Fortaleza (UTC-3).
    expect(formatReactivationDate("2026-10-13T01:00:00.000Z", "en-US")).toBe(
      "Oct 12, 2026",
    );
  });

  it("reuses the formatter of a language", () => {
    const spy = jest.spyOn(Intl, "DateTimeFormat");

    formatReactivationDate("2026-10-12T15:00:00.000Z", "pt-BR");
    formatReactivationDate("2026-10-13T15:00:00.000Z", "pt-BR");

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
