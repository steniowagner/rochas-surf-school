import {
  addMonths,
  buildMonthGrid,
  formatIsoDate,
  getDateLocale,
  initialRange,
  isoWeekdayOf,
  isSameMonth,
  minutesInSchoolZone,
  monthOf,
  pressDay,
  toIsoDate,
  todayInSchoolZone,
  toLocalDate,
} from "./calendar";

describe("school-zone clock", () => {
  it("reads the date and the minutes in America/Fortaleza", () => {
    const lateEvening = new Date("2026-10-15T02:30:00.000Z"); // 23:30 on the 14th in Fortaleza

    expect(todayInSchoolZone(lateEvening)).toBe("2026-10-14");
    expect(minutesInSchoolZone(lateEvening)).toBe(23 * 60 + 30);
    expect(minutesInSchoolZone(new Date("2026-10-14T03:00:00.000Z"))).toBe(0);
  });

  it("defaults to now", () => {
    expect(todayInSchoolZone()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(minutesInSchoolZone()).toBeGreaterThanOrEqual(0);
  });
});

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

describe("initialRange", () => {
  it("is a single day for a real date that is today or later", () => {
    expect(initialRange("2026-10-14", "2026-10-14")).toEqual({
      startDate: "2026-10-14",
      endDate: null,
      excludedDates: [],
    });
    expect(initialRange("2027-01-01", "2026-10-14").startDate).toBe("2027-01-01");
  });

  it.each(["2026-10-13", "2026-02-30", "14/10/2026", undefined, ["2026-10-20"]])(
    "is empty for %p",
    (date) => {
      expect(initialRange(date, "2026-10-14")).toEqual({
        startDate: null,
        endDate: null,
        excludedDates: [],
      });
    },
  );
});

describe("pressDay", () => {
  const empty = { startDate: null, endDate: null, excludedDates: [] };
  const single = { startDate: "2026-10-15", endDate: null, excludedDates: [] };
  const complete = { startDate: "2026-10-15", endDate: "2026-10-20", excludedDates: [] };

  it("sets the start on the first tap", () => {
    expect(pressDay(empty, "2026-10-15")).toEqual({ ...single });
  });

  it("sets the end on a later day", () => {
    expect(pressDay(single, "2026-10-17")).toEqual({
      startDate: "2026-10-15",
      endDate: "2026-10-17",
      excludedDates: [],
    });
  });

  it("moves the start on an earlier day and keeps a tap on the same day as the start", () => {
    expect(pressDay(single, "2026-10-14")).toEqual({
      startDate: "2026-10-14",
      endDate: null,
      excludedDates: [],
    });
    expect(pressDay(single, "2026-10-15")).toEqual(single);
  });

  it("removes a day inside a complete range, and puts it back on the next tap", () => {
    const removed = pressDay(complete, "2026-10-17");

    expect(removed).toEqual({ ...complete, excludedDates: ["2026-10-17"] });
    expect(pressDay(removed, "2026-10-17")).toEqual(complete);
  });

  it("keeps the removed days sorted", () => {
    const first = pressDay(complete, "2026-10-19");
    const second = pressDay(first, "2026-10-16");

    expect(second.excludedDates).toEqual(["2026-10-16", "2026-10-19"]);
    expect(second).toMatchObject({ startDate: "2026-10-15", endDate: "2026-10-20" });
  });

  it.each(["2026-10-15", "2026-10-20"])("removes the whole range, and what was taken out of it, on its end %s", (end) => {
    const removed = { ...complete, excludedDates: ["2026-10-17"] };

    expect(pressDay(removed, end)).toEqual({ startDate: null, endDate: null, excludedDates: [] });
  });

  it("starts over, with nothing removed, on a day outside a complete range", () => {
    const removed = { ...complete, excludedDates: ["2026-10-17"] };

    expect(pressDay(removed, "2026-10-21")).toEqual({
      startDate: "2026-10-21",
      endDate: null,
      excludedDates: [],
    });
    expect(pressDay(removed, "2026-10-14")).toEqual({
      startDate: "2026-10-14",
      endDate: null,
      excludedDates: [],
    });
  });
});

describe("formatIsoDate", () => {
  it("formats a date with the locale", () => {
    expect(formatIsoDate("2026-10-15", "d MMM", getDateLocale("pt-BR"))).toBe("15 out");
    expect(formatIsoDate("2026-10-15", "d MMM", getDateLocale("en-US"))).toBe("15 Oct");
  });
});
