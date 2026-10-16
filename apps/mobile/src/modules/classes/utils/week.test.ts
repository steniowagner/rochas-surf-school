import { enUS } from "date-fns/locale";

import {
  formatDateLine,
  relativeWeek,
  schoolDayOf,
  schoolTimeOf,
  weeksBetween,
} from "./week";

const LABELS = { today: "Today", tomorrow: "Tomorrow", yesterday: "Yesterday" };

describe("weeksBetween", () => {
  it("counts the weeks between two Mondays", () => {
    expect(weeksBetween("2026-10-12", "2026-10-12")).toBe(0);
    expect(weeksBetween("2026-10-12", "2026-11-02")).toBe(3);
    expect(weeksBetween("2026-10-12", "2026-09-21")).toBe(-3);
  });
});

describe("relativeWeek", () => {
  it.each([
    [0, { key: "current", count: 0 }],
    [-1, { key: "previous", count: 1 }],
    [1, { key: "next", count: 1 }],
    [-3, { key: "past", count: 3 }],
    [3, { key: "future", count: 3 }],
  ])("offset %s", (offset, expected) => {
    expect(relativeWeek(offset)).toEqual(expected);
  });
});

describe("school time", () => {
  it("reads the day and time in America/Fortaleza", () => {
    expect(schoolDayOf("2026-10-15T02:30:00.000Z")).toBe("2026-10-14");
    expect(schoolTimeOf("2026-10-14T11:00:00.000Z")).toBe("08:00");
  });
});

describe("formatDateLine", () => {
  it("says Today, Tomorrow and Yesterday", () => {
    expect(formatDateLine("2026-10-14", "2026-10-14", enUS, LABELS)).toBe("Today · 14 Oct");
    expect(formatDateLine("2026-10-15", "2026-10-14", enUS, LABELS)).toBe("Tomorrow · 15 Oct");
    expect(formatDateLine("2026-10-13", "2026-10-14", enUS, LABELS)).toBe("Yesterday · 13 Oct");
  });

  it("uses the weekday name for other days", () => {
    expect(formatDateLine("2026-10-16", "2026-10-14", enUS, LABELS)).toBe("Friday · 16 Oct");
  });

  it("adds the year when it isn't the current one", () => {
    expect(formatDateLine("2027-01-05", "2026-12-31", enUS, LABELS)).toBe("Tuesday · 5 Jan 2027");
  });
});
