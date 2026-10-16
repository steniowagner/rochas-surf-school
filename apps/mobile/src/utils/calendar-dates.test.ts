import { enUS, ptBR } from "date-fns/locale";

import {
  addDays,
  addMonths,
  addWeeks,
  buildMonthGrid,
  formatIsoDate,
  getDateLocale,
  isoWeekdayOf,
  isSameMonth,
  mondayOf,
  monthOf,
  toIsoDate,
  toLocalDate,
  weekCaption,
  weekdayAbbreviation,
  weekdayName,
  weekDays,
} from "./calendar-dates";

describe("months and dates", () => {
  it("converts between strings and months", () => {
    expect(monthOf("2026-10-14")).toEqual({ year: 2026, month: 10 });
    expect(toIsoDate({ year: 2026, month: 3 }, 5)).toBe("2026-03-05");
    expect(toLocalDate("2026-10-14").getDate()).toBe(14);
  });

  it("moves between months across years", () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths({ year: 2026, month: 5 }, 0)).toEqual({ year: 2026, month: 5 });
    expect(isSameMonth({ year: 2026, month: 5 }, { year: 2026, month: 5 })).toBe(true);
    expect(isSameMonth({ year: 2026, month: 5 }, { year: 2027, month: 5 })).toBe(false);
    expect(isSameMonth({ year: 2026, month: 5 }, { year: 2026, month: 6 })).toBe(false);
  });

  it("gives ISO weekdays", () => {
    expect(isoWeekdayOf("2026-10-12")).toBe(1);
    expect(isoWeekdayOf("2026-10-17")).toBe(6);
    expect(isoWeekdayOf("2026-10-18")).toBe(7);
  });

  it("picks the date-fns locale of the app language, English for anything else", () => {
    expect(getDateLocale("pt-BR").code).toBe("pt-BR");
    expect(getDateLocale("es-ES").code).toBe("es");
    expect(getDateLocale("en-US").code).toBe("en-US");
    expect(getDateLocale("fr").code).toBe("en-US");
  });
});

describe("buildMonthGrid", () => {
  it("starts on Monday, leaves the days before the 1st empty and fills the last week with the next month", () => {
    const grid = buildMonthGrid({ year: 2026, month: 10 });

    expect(grid).toHaveLength(5);
    expect(grid[0]).toEqual([null, null, null, "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(grid[4]).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
  });

  it("shows both neighbors in a full six-week grid when asked", () => {
    const grid = buildMonthGrid({ year: 2026, month: 11 }, true);

    expect(grid).toHaveLength(6);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid[0]).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
    expect(grid[5]).toEqual(["2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06"]);
    expect(grid.flat().every((date) => date !== null)).toBe(true);
  });

  it("fills six weeks even for a month that starts on a Monday and fits in four", () => {
    const grid = buildMonthGrid({ year: 2027, month: 2 }, true);

    expect(grid).toHaveLength(6);
    expect(grid[0]?.[0]).toBe("2027-02-01");
    expect(grid[5]).toEqual(["2027-03-08", "2027-03-09", "2027-03-10", "2027-03-11", "2027-03-12", "2027-03-13", "2027-03-14"]);
  });

  it("carries the fill over to the next year", () => {
    const grid = buildMonthGrid({ year: 2026, month: 12 });

    expect(grid.at(-1)).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
  });

  it("needs no padding for a month that fills its weeks", () => {
    const grid = buildMonthGrid({ year: 2027, month: 2 });

    expect(grid).toHaveLength(4);
    expect(grid.flat().every((day) => day !== null)).toBe(true);
  });
});

describe("formatIsoDate", () => {
  it("formats a date with the locale", () => {
    expect(formatIsoDate("2026-10-15", "d MMM", getDateLocale("pt-BR"))).toBe("15 out");
    expect(formatIsoDate("2026-10-15", "d MMM", getDateLocale("en-US"))).toBe("15 Oct");
  });
});

describe("mondayOf", () => {
  it.each([
    ["2026-10-12", "2026-10-12"],
    ["2026-10-14", "2026-10-12"],
    ["2026-10-18", "2026-10-12"],
    ["2026-10-19", "2026-10-19"],
    ["2026-01-01", "2025-12-29"],
  ])("%s is in the week of %s", (date, monday) => {
    expect(mondayOf(date)).toBe(monday);
  });
});

describe("week arithmetic", () => {
  it("moves days and weeks across months and years", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addWeeks("2026-10-12", 1)).toBe("2026-10-19");
    expect(addWeeks("2026-10-12", -3)).toBe("2026-09-21");
  });

  it("lists the seven days Monday first", () => {
    expect(weekDays("2026-10-12")).toEqual([
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ]);
  });
});

describe("captions and names", () => {
  it("writes the week caption in the locale", () => {
    expect(weekCaption("2026-10-12", ptBR)).toBe("12 out – 18 out");
    expect(weekCaption("2026-10-12", enUS)).toBe("12 Oct – 18 Oct");
  });

  it("names and abbreviates a weekday", () => {
    expect(weekdayName("2026-10-14", enUS)).toBe("Wednesday");
    expect(weekdayAbbreviation("2026-10-14", enUS)).toBe("WED");
    expect(weekdayAbbreviation("2026-10-14", ptBR)).toBe("QUA");
  });
});
