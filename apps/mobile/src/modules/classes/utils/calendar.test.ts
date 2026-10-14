import {
  addMonths,
  buildMonthGrid,
  getDateLocale,
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
  it("starts on Monday and pads the weeks with nulls", () => {
    const grid = buildMonthGrid({ year: 2026, month: 10 });

    expect(grid).toHaveLength(5);
    expect(grid[0]).toEqual([null, null, null, "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(grid[4]).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", null]);
  });

  it("needs no padding for a month that fills its weeks", () => {
    const grid = buildMonthGrid({ year: 2027, month: 2 });

    expect(grid).toHaveLength(4);
    expect(grid.flat().every((day) => day !== null)).toBe(true);
  });
});

describe("pressDay", () => {
  const empty = { startDate: null, endDate: null };

  it("sets the start on the first tap", () => {
    expect(pressDay(empty, "2026-10-15")).toEqual({ startDate: "2026-10-15", endDate: null });
  });

  it("sets the end on a later day", () => {
    expect(pressDay({ startDate: "2026-10-15", endDate: null }, "2026-10-17")).toEqual({
      startDate: "2026-10-15",
      endDate: "2026-10-17",
    });
  });

  it("moves the start on an earlier day and keeps a tap on the same day as the start", () => {
    expect(pressDay({ startDate: "2026-10-15", endDate: null }, "2026-10-14")).toEqual({
      startDate: "2026-10-14",
      endDate: null,
    });
    expect(pressDay({ startDate: "2026-10-15", endDate: null }, "2026-10-15")).toEqual({
      startDate: "2026-10-15",
      endDate: null,
    });
  });

  it("starts over after a complete range", () => {
    expect(
      pressDay({ startDate: "2026-10-15", endDate: "2026-10-17" }, "2026-10-20"),
    ).toEqual({ startDate: "2026-10-20", endDate: null });
  });
});
