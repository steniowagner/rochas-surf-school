import {
  initialRange,
  minutesInSchoolZone,
  pressDay,
  todayInSchoolZone,
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

describe("initialRange", () => {
  it("is a single day for a real date that is today or later", () => {
    expect(initialRange("2026-10-14", "2026-10-14")).toEqual({
      startDate: "2026-10-14",
      endDate: null,
      excludedDates: [],
    });
    expect(initialRange("2027-01-01", "2026-10-14").startDate).toBe(
      "2027-01-01",
    );
  });

  it.each([
    "2026-10-13",
    "2026-02-30",
    "14/10/2026",
    undefined,
    ["2026-10-20"],
  ])("is empty for %p", (date) => {
    expect(initialRange(date, "2026-10-14")).toEqual({
      startDate: null,
      endDate: null,
      excludedDates: [],
    });
  });
});

describe("pressDay", () => {
  const empty = { startDate: null, endDate: null, excludedDates: [] };
  const single = { startDate: "2026-10-15", endDate: null, excludedDates: [] };
  const complete = {
    startDate: "2026-10-15",
    endDate: "2026-10-20",
    excludedDates: [],
  };

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
    expect(second).toMatchObject({
      startDate: "2026-10-15",
      endDate: "2026-10-20",
    });
  });

  it.each(["2026-10-15", "2026-10-20"])(
    "removes the whole range, and what was taken out of it, on its end %s",
    (end) => {
      const removed = { ...complete, excludedDates: ["2026-10-17"] };

      expect(pressDay(removed, end)).toEqual({
        startDate: null,
        endDate: null,
        excludedDates: [],
      });
    },
  );

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
