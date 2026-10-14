import {
  includesRange,
  isRangeBlocked,
  isSameRange,
  mergeTimeRanges,
  rangeLabel,
  rangeOf,
  sortTimeRanges,
  startsByNow,
  toHHmm,
} from "./time-ranges";

const morning = { start: "08:00", end: "09:00" };
const afternoon = { start: "16:00", end: "17:00" };

describe("time range helpers", () => {
  it("compares ranges by their times", () => {
    expect(isSameRange(morning, { ...morning })).toBe(true);
    expect(isSameRange(morning, afternoon)).toBe(false);
    expect(includesRange([afternoon, morning], { ...morning })).toBe(true);
    expect(includesRange([afternoon], morning)).toBe(false);
  });

  it("sorts by start, then by end, without touching the input", () => {
    const input = [afternoon, { start: "08:00", end: "10:00" }, morning];

    expect(sortTimeRanges(input)).toEqual([morning, { start: "08:00", end: "10:00" }, afternoon]);
    expect(input[0]).toBe(afternoon);
  });

  it("merges suggestions and added ranges without repeats, by start and then end", () => {
    const merged = mergeTimeRanges(
      [afternoon, { start: "08:00", end: "10:00" }],
      [morning, { ...afternoon }, { start: "08:30", end: "09:30" }],
    );

    expect(merged).toEqual([
      morning,
      { start: "08:00", end: "10:00" },
      { start: "08:30", end: "09:30" },
      afternoon,
    ]);
  });

  it("knows when a range has started by now", () => {
    expect(startsByNow(morning, 8 * 60)).toBe(true);
    expect(startsByNow(morning, 8 * 60 - 1)).toBe(false);
  });

  it("blocks a range that overlaps a selected one, never the selected one itself", () => {
    const overlapping = { start: "08:30", end: "09:30" };

    expect(isRangeBlocked(overlapping, [morning], null)).toBe(true);
    expect(isRangeBlocked(morning, [morning], null)).toBe(false);
    expect(isRangeBlocked({ start: "09:00", end: "10:00" }, [morning], null)).toBe(false);
    expect(isRangeBlocked(afternoon, [morning], null)).toBe(false);
  });

  it("blocks a range that has started when today is among the dates", () => {
    expect(isRangeBlocked(morning, [], 10 * 60)).toBe(true);
    expect(isRangeBlocked(afternoon, [], 10 * 60)).toBe(false);
    expect(isRangeBlocked(morning, [], null)).toBe(false);
  });

  it("labels and builds ranges", () => {
    expect(rangeLabel(morning)).toBe("08:00 – 09:00");
    expect(toHHmm(new Date(2000, 0, 1, 7, 5))).toBe("07:05");
    expect(rangeOf(new Date(2000, 0, 1, 8, 0), new Date(2000, 0, 1, 9, 30))).toEqual({
      range: { start: "08:00", end: "09:30" },
      valid: true,
      minutes: 90,
    });
    expect(rangeOf(new Date(2000, 0, 1, 9, 0), new Date(2000, 0, 1, 9, 0)).valid).toBe(false);
  });
});
