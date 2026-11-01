import { enUS, ptBR } from "date-fns/locale";

import { formatAskedAt } from "./class-requests";

describe("formatAskedAt", () => {
  it("reads the time and the day in Fortaleza", () => {
    expect(formatAskedAt("2026-10-19T12:12:00.000Z", enUS)).toEqual({ time: "09:12", date: "19 Oct" });
    expect(formatAskedAt("2026-10-19T12:12:00.000Z", ptBR)).toEqual({ time: "09:12", date: "19 out" });
  });

  it("keeps the previous day before 03:00 UTC", () => {
    expect(formatAskedAt("2026-10-20T01:30:00.000Z", enUS)).toEqual({ time: "22:30", date: "19 Oct" });
  });
});
