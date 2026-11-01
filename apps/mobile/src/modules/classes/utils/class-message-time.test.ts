import { enUS, es, ptBR } from "date-fns/locale";

import { classMessageTime } from "./class-message-time";

// Saturday 2026-10-31, 12:00 in Fortaleza.
const NOW = new Date("2026-10-31T15:00:00.000Z");

describe("classMessageTime", () => {
  it("shows the time for today, in Fortaleza", () => {
    expect(classMessageTime("2026-10-31T13:24:00.000Z", NOW, ptBR)).toBe("10:24");
  });

  it("counts the day in Fortaleza, not in UTC", () => {
    // 22:30 on Friday in Fortaleza, already Saturday in UTC.
    expect(classMessageTime("2026-10-31T01:30:00.000Z", NOW, ptBR)).toBe("Sex");
  });

  it.each([
    [ptBR, "Qui"],
    [es, "Jue"],
    [enUS, "Thu"],
  ])("shows the short weekday in the app's language (%#)", (locale, expected) => {
    expect(classMessageTime("2026-10-29T15:00:00.000Z", NOW, locale)).toBe(expected);
  });

  it("shows the weekday up to 6 days before today", () => {
    expect(classMessageTime("2026-10-25T15:00:00.000Z", NOW, ptBR)).toBe("Dom");
  });

  it("shows the date from the 7th day on, with no trailing dot", () => {
    expect(classMessageTime("2026-10-24T15:00:00.000Z", NOW, ptBR)).toBe("24 out");
    expect(classMessageTime("2026-10-12T15:00:00.000Z", NOW, es)).toBe("12 oct");
    expect(classMessageTime("2026-09-02T15:00:00.000Z", NOW, enUS)).toBe("2 Sep");
  });

  it("shows the date for a day ahead of today (clock skew)", () => {
    expect(classMessageTime("2026-11-02T15:00:00.000Z", NOW, ptBR)).toBe("2 nov");
  });
});
