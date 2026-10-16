import {
  isValidDateRange,
  isValidExcludedDates,
  isValidIsoDate,
  isValidWeekdays,
  listBatchClasses,
  listBatchDates,
} from "../../../src";

describe("isValidIsoDate / isValidDateRange", () => {
  it("accepts only real calendar dates", () => {
    expect(isValidIsoDate("2026-10-14")).toBe(true);
    expect(isValidIsoDate("2028-02-29")).toBe(true);
    expect(isValidIsoDate("2026-02-29")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("2026-1-1")).toBe(false);
    expect(isValidIsoDate("14/10/2026")).toBe(false);
    expect(isValidIsoDate(20261014)).toBe(false);
    expect(isValidIsoDate(undefined)).toBe(false);
  });

  it("needs the end on or after the start", () => {
    expect(isValidDateRange("2026-10-14", "2026-10-14")).toBe(true);
    expect(isValidDateRange("2026-10-14", "2026-10-15")).toBe(true);
    expect(isValidDateRange("2026-10-15", "2026-10-14")).toBe(false);
    expect(isValidDateRange("2026-10-15", "bad")).toBe(false);
    expect(isValidDateRange("bad", "2026-10-15")).toBe(false);
  });
});

describe("isValidWeekdays", () => {
  it("needs a non-empty list of ISO weekdays", () => {
    expect(isValidWeekdays([1, 7])).toBe(true);
    expect(isValidWeekdays([])).toBe(false);
    expect(isValidWeekdays([0])).toBe(false);
    expect(isValidWeekdays([8])).toBe(false);
    expect(isValidWeekdays([1.5])).toBe(false);
    expect(isValidWeekdays(["1"])).toBe(false);
    expect(isValidWeekdays(3)).toBe(false);
  });
});

describe("isValidExcludedDates", () => {
  it("is optional, and otherwise a list of real dates", () => {
    expect(isValidExcludedDates(undefined)).toBe(true);
    expect(isValidExcludedDates(null)).toBe(true);
    expect(isValidExcludedDates([])).toBe(true);
    expect(isValidExcludedDates(["2026-10-16", "2026-10-21"])).toBe(true);
    expect(isValidExcludedDates(["2026-02-30"])).toBe(false);
    expect(isValidExcludedDates(["16/10/2026"])).toBe(false);
    expect(isValidExcludedDates([20261016])).toBe(false);
    expect(isValidExcludedDates("2026-10-16")).toBe(false);
  });
});

describe("listBatchDates", () => {
  it("leaves out the excluded dates, whatever their weekday", () => {
    expect(
      listBatchDates({
        startDate: "2026-10-15",
        endDate: "2026-10-22",
        weekdays: [1, 2, 3, 4, 5, 6, 7],
        excludedDates: ["2026-10-16", "2026-10-21", "2026-12-25"],
      }),
    ).toEqual(["2026-10-15", "2026-10-17", "2026-10-18", "2026-10-19", "2026-10-20", "2026-10-22"]);
  });

  it("combines the weekdays and the excluded dates", () => {
    expect(
      listBatchDates({
        startDate: "2026-10-12",
        endDate: "2026-10-18",
        weekdays: [1, 7],
        excludedDates: ["2026-10-12"],
      }),
    ).toEqual(["2026-10-18"]);
  });

  it("lists the included weekdays of the range, ends included", () => {
    expect(
      listBatchDates({
        startDate: "2026-10-12",
        endDate: "2026-10-18",
        weekdays: [1, 7],
      }),
    ).toEqual(["2026-10-12", "2026-10-18"]);
  });

  it("stops after max + 1 dates", () => {
    const dates = listBatchDates(
      { startDate: "2026-10-01", endDate: "2036-10-01", weekdays: [1, 2, 3, 4, 5, 6, 7] },
      3,
    );

    expect(dates).toEqual(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
  });
});

describe("listBatchClasses", () => {
  const ranges = [
    { start: "16:00", end: "17:00" },
    { start: "08:00", end: "09:00" },
  ];

  it("creates one class per included day and time range in Fortaleza time", () => {
    const classes = listBatchClasses({
      startDate: "2026-10-15",
      endDate: "2026-10-17",
      weekdays: [3, 4, 5],
      timeRanges: ranges,
    });

    expect(classes.map((item) => [item.startsAt.toISOString(), item.endsAt.toISOString()]))
      .toEqual([
        ["2026-10-15T11:00:00.000Z", "2026-10-15T12:00:00.000Z"],
        ["2026-10-15T19:00:00.000Z", "2026-10-15T20:00:00.000Z"],
        ["2026-10-16T11:00:00.000Z", "2026-10-16T12:00:00.000Z"],
        ["2026-10-16T19:00:00.000Z", "2026-10-16T20:00:00.000Z"],
      ]);
  });

  it("creates one class per range for a one-day batch", () => {
    const classes = listBatchClasses({
      startDate: "2026-10-14",
      endDate: "2026-10-14",
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      timeRanges: ranges,
    });

    expect(classes).toHaveLength(2);
  });

  it("is empty when the weekdays exclude every date", () => {
    expect(
      listBatchClasses({
        startDate: "2026-10-15",
        endDate: "2026-10-16",
        weekdays: [7],
        timeRanges: ranges,
      }),
    ).toEqual([]);
  });

  it("stops once it passes max classes", () => {
    const classes = listBatchClasses(
      {
        startDate: "2026-10-01",
        endDate: "2026-12-31",
        weekdays: [1, 2, 3, 4, 5, 6, 7],
        timeRanges: ranges,
      },
      5,
    );

    expect(classes).toHaveLength(6);
  });

  it("orders ranges with the same start by their end", () => {
    const classes = listBatchClasses({
      startDate: "2026-10-14",
      endDate: "2026-10-14",
      weekdays: [3],
      timeRanges: [
        { start: "08:00", end: "10:00" },
        { start: "08:00", end: "09:00" },
      ],
    });

    expect(classes.map((item) => item.endsAt.toISOString())).toEqual([
      "2026-10-14T12:00:00.000Z",
      "2026-10-14T13:00:00.000Z",
    ]);
  });

  it("keeps a late-evening class on the Fortaleza day", () => {
    const [item] = listBatchClasses({
      startDate: "2026-10-14",
      endDate: "2026-10-14",
      weekdays: [3],
      timeRanges: [{ start: "23:00", end: "23:59" }],
    });

    expect(item.startsAt.toISOString()).toBe("2026-10-15T02:00:00.000Z");
  });
});
