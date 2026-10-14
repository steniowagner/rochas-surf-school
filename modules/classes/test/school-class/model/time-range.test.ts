import {
  hasOverlappingTimeRanges,
  isValidTimeRange,
  parseTimeOfDay,
  timeRangeEndsAfterStart,
  timeRangesOverlap,
} from "../../../src";

describe("parseTimeOfDay", () => {
  it.each([
    ["00:00", 0],
    ["08:30", 510],
    ["23:59", 1439],
  ])("reads %s", (value, minutes) => {
    expect(parseTimeOfDay(value)).toBe(minutes);
  });

  it.each(["24:00", "8:00", "08:60", "08:00:00", "", "ab:cd", null, 800, undefined])(
    "rejects %j",
    (value) => {
      expect(parseTimeOfDay(value)).toBeNull();
    },
  );
});

describe("isValidTimeRange", () => {
  it("needs two valid times", () => {
    expect(isValidTimeRange({ start: "08:00", end: "09:00" })).toBe(true);
    expect(isValidTimeRange({ start: "08:00", end: "9:00" })).toBe(false);
    expect(isValidTimeRange({ start: "08:00" })).toBe(false);
    expect(isValidTimeRange(null)).toBe(false);
    expect(isValidTimeRange("08:00-09:00")).toBe(false);
  });
});

describe("timeRangeEndsAfterStart", () => {
  it("requires the end to be after the start", () => {
    expect(timeRangeEndsAfterStart({ start: "08:00", end: "09:00" })).toBe(true);
    expect(timeRangeEndsAfterStart({ start: "09:00", end: "09:00" })).toBe(false);
    expect(timeRangeEndsAfterStart({ start: "10:00", end: "09:00" })).toBe(false);
  });
});

describe("overlap", () => {
  const a = { start: "08:00", end: "09:00" };

  it("detects ranges that share time", () => {
    expect(timeRangesOverlap(a, { start: "08:30", end: "09:30" })).toBe(true);
    expect(timeRangesOverlap({ start: "08:15", end: "08:45" }, a)).toBe(true);
    expect(timeRangesOverlap(a, a)).toBe(true);
  });

  it("lets ranges that only touch go together", () => {
    expect(timeRangesOverlap(a, { start: "09:00", end: "10:00" })).toBe(false);
    expect(timeRangesOverlap({ start: "07:00", end: "08:00" }, a)).toBe(false);
  });

  it("checks every pair of a list", () => {
    const c = { start: "16:00", end: "17:00" };

    expect(hasOverlappingTimeRanges([a, c])).toBe(false);
    expect(hasOverlappingTimeRanges([a, c, { start: "16:30", end: "18:00" }])).toBe(true);
    expect(hasOverlappingTimeRanges([])).toBe(false);
  });
});
