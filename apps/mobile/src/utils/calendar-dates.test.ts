import { enUS, es, ptBR } from "date-fns/locale";

import {
  addDays,
  addMonths,
  addMonthsKeepingDay,
  addWeeks,
  buildFittedMonthGrid,
  buildMonthGrid,
  dayAccessibilityLabel,
  formatIsoDate,
  formatLongDay,
  getDateLocale,
  isoWeekdayOf,
  isSameMonth,
  markedDayDots,
  mondayOf,
  monthCaption,
  monthRange,
  monthOf,
  toIsoDate,
  toLocalDate,
  weekCaption,
  weekdayAbbreviation,
  weekdayInitials,
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
  it("names and abbreviates a weekday", () => {
    expect(weekdayName("2026-10-14", enUS)).toBe("Wednesday");
    expect(weekdayAbbreviation("2026-10-14", enUS)).toBe("WED");
    expect(weekdayAbbreviation("2026-10-14", ptBR)).toBe("QUA");
  });
});

describe("weekCaption", () => {
  it("shows the month once for a week inside one month", () => {
    expect(weekCaption("2026-10-12", enUS)).toBe("12 – 18 OCT");
    expect(weekCaption("2026-10-12", ptBR)).toBe("12 – 18 OUT");
  });

  it("shows both months for a week that spans two", () => {
    expect(weekCaption("2026-09-28", enUS)).toBe("28 SEP – 4 OCT");
    expect(weekCaption("2026-09-28", ptBR)).toBe("28 SET – 4 OUT");
  });

  it("leaves the year out for a week that spans two years", () => {
    expect(weekCaption("2026-12-28", enUS)).toBe("28 DEC – 3 JAN");
  });

  it("drops the trailing dot of a month abbreviation", () => {
    const dotted = { ...es, localize: { ...es.localize, month: () => "sep." } } as unknown as typeof es;

    expect(weekCaption("2026-09-14", dotted)).toBe("14 – 20 SEP");
    expect(weekCaption("2026-10-12", es)).toBe("12 – 18 OCT");
  });
});

describe("monthCaption", () => {
  it("writes the month and the year in capitals", () => {
    expect(monthCaption({ year: 2026, month: 10 }, enUS)).toBe("OCTOBER 2026");
    expect(monthCaption({ year: 2026, month: 10 }, ptBR)).toBe("OUTUBRO 2026");
  });
});

describe("addMonthsKeepingDay", () => {
  it("keeps the day number when the target month has it", () => {
    expect(addMonthsKeepingDay("2026-10-14", 1)).toBe("2026-11-14");
    expect(addMonthsKeepingDay("2026-10-14", -1)).toBe("2026-09-14");
  });

  it("caps the day at the last day of the target month", () => {
    expect(addMonthsKeepingDay("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonthsKeepingDay("2026-03-31", 1)).toBe("2026-04-30");
    expect(addMonthsKeepingDay("2027-03-31", -1)).toBe("2027-02-28");
    expect(addMonthsKeepingDay("2028-01-31", 1)).toBe("2028-02-29");
  });

  it("crosses years", () => {
    expect(addMonthsKeepingDay("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonthsKeepingDay("2026-01-15", -1)).toBe("2025-12-15");
  });
});

describe("weekdayInitials", () => {
  it("lists the initials Monday first, in capitals", () => {
    expect(weekdayInitials(enUS)).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
    expect(weekdayInitials(ptBR)).toEqual(["S", "T", "Q", "Q", "S", "S", "D"]);
  });
});

describe("fitted month grid", () => {
  it("has 4 rows for February 2027, all inside the month", () => {
    const grid = buildFittedMonthGrid({ year: 2027, month: 2 });

    expect(grid).toHaveLength(4);
    expect(grid[0]?.[0]).toBe("2027-02-01");
    expect(grid[3]?.[6]).toBe("2027-02-28");
  });

  it("has 5 rows for September 2026, from 31 Aug to 4 Oct", () => {
    const grid = buildFittedMonthGrid({ year: 2026, month: 9 });

    expect(grid).toHaveLength(5);
    expect(grid[0]?.[0]).toBe("2026-08-31");
    expect(grid[4]?.[6]).toBe("2026-10-04");
  });

  it("has 6 rows for August 2026, from 27 Jul to 6 Sep", () => {
    const grid = buildFittedMonthGrid({ year: 2026, month: 8 });

    expect(grid).toHaveLength(6);
    expect(grid[0]?.[0]).toBe("2026-07-27");
    expect(grid[5]?.[6]).toBe("2026-09-06");
  });

  it("draws October 2026 from 28 Sep to 1 Nov", () => {
    const grid = buildFittedMonthGrid({ year: 2026, month: 10 });

    expect(grid.flat()[0]).toBe("2026-09-28");
    expect(grid.flat().at(-1)).toBe("2026-11-01");
    expect(grid.every((week) => week.length === 7)).toBe(true);
  });
});

describe("formatLongDay", () => {
  it("is the weekday, day and month without the year, in each locale", () => {
    expect(formatLongDay("2026-10-17", enUS)).toBe("Saturday, October 17");
    expect(formatLongDay("2026-10-17", es)).toBe("sábado, 17 de octubre");
    expect(formatLongDay("2026-10-17", ptBR)).toBe("sábado, 17 de outubro");
  });
});

describe("dayAccessibilityLabel", () => {
  it("is the full date, followed by the marked label when there is one", () => {
    expect(dayAccessibilityLabel("2026-10-14", enUS, undefined)).toBe("Wednesday, October 14th, 2026");
    expect(dayAccessibilityLabel("2026-10-14", enUS, "with classes")).toBe(
      "Wednesday, October 14th, 2026, with classes",
    );
    expect(dayAccessibilityLabel("2026-10-14", ptBR, undefined)).toBe("quarta-feira, 14 de outubro de 2026");
  });
});

describe("monthRange", () => {
  it("is the first and the last day the fitted grid draws", () => {
    expect(monthRange({ year: 2026, month: 10 })).toEqual({ from: "2026-09-28", to: "2026-11-01" });
    expect(monthRange({ year: 2027, month: 2 })).toEqual({ from: "2027-02-01", to: "2027-02-28" });
    expect(monthRange({ year: 2026, month: 8 })).toEqual({ from: "2026-07-27", to: "2026-09-06" });
  });
});

describe("markedDayDots", () => {
  const marked = new Set(["2026-10-05", "2026-10-06", "2026-10-07"]);

  it("gives a marked day its count, up to 3, and one without a count", () => {
    expect(markedDayDots("2026-10-05", marked, { "2026-10-05": 2 })).toBe(2);
    expect(markedDayDots("2026-10-05", marked, { "2026-10-05": 9 })).toBe(3);
    expect(markedDayDots("2026-10-06", marked, {})).toBe(1);
    expect(markedDayDots("2026-10-07", marked, undefined)).toBe(1);
  });

  it("gives a day that isn't marked no dot, whatever its count", () => {
    expect(markedDayDots("2026-10-08", marked, { "2026-10-08": 2 })).toBe(0);
  });
});
