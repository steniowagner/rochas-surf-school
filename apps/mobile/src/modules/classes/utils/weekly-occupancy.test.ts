import { enUS } from "date-fns/locale";

import { buildClassItem } from "../classes.test-utils";
import type { ClassItem } from "../classes.types";
import {
  buildOccupancyDays,
  buildOccupancyRows,
  getDefaultSelectedClassId,
  getOccupancyCellLook,
} from "./weekly-occupancy";

// 2026-10-19 is a Monday; 08:00 in Fortaleza (UTC-3) is 11:00Z.
const at = (date: string, time: string, taken = 0, overrides: Partial<ClassItem> = {}) =>
  buildClassItem(
    `${date}-${time}-${overrides.id ?? ""}`,
    `${date}T${time}:00.000Z`,
    `${date}T${time}:00.000Z`,
    { seatsTaken: taken, ...overrides },
  );

describe("buildOccupancyDays", () => {
  it("lists the seven days, Monday first, and marks today", () => {
    const days = buildOccupancyDays("2026-10-19", "2026-10-21", enUS);

    expect(days.map((day) => day.date)).toEqual([
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
    expect(days[0]).toEqual({ date: "2026-10-19", weekday: "MON", dayNumber: "19", isToday: false });
    expect(days.filter((day) => day.isToday).map((day) => day.dayNumber)).toEqual(["21"]);
  });

  it("marks no day when the week does not hold today", () => {
    const days = buildOccupancyDays("2026-10-19", "2026-10-28", enUS);

    expect(days.some((day) => day.isToday)).toBe(false);
  });
});

describe("buildOccupancyRows", () => {
  const A = buildClassItem("A", "2026-10-19T11:00:00.000Z", "2026-10-19T12:00:00.000Z");
  const B = buildClassItem("B", "2026-10-19T11:00:00.000Z", "2026-10-19T12:30:00.000Z", { discipline: "skate" });
  const C = buildClassItem("C", "2026-10-21T11:00:00.000Z", "2026-10-21T12:00:00.000Z");
  const D = buildClassItem("D", "2026-10-23T19:00:00.000Z", "2026-10-23T20:00:00.000Z");
  const E = buildClassItem("E", "2026-10-24T19:00:00.000Z", "2026-10-24T20:00:00.000Z", {
    cancelledAt: "2026-10-20T10:00:00.000Z",
  });

  const slotIds = (row: ReturnType<typeof buildOccupancyRows>[number]) =>
    row.slots.map((slot) => (slot.kind === "class" ? slot.item.id : "-"));

  it("builds a row per start time with sub-rows for classes sharing a day and time", () => {
    const rows = buildOccupancyRows("2026-10-19", [A, B, C, D, E]);

    expect(rows.map((row) => [row.time, row.showsTime])).toEqual([
      ["08:00", true],
      ["08:00", false],
      ["16:00", true],
    ]);
    expect(slotIds(rows[0])).toEqual(["A", "-", "C", "-", "-", "-", "-"]);
    expect(slotIds(rows[1])).toEqual(["B", "-", "-", "-", "-", "-", "-"]);
    expect(slotIds(rows[2])).toEqual(["-", "-", "-", "-", "D", "E", "-"]);
  });

  it("gives every slot its day, empty ones included", () => {
    const [row] = buildOccupancyRows("2026-10-19", [A]);

    expect(row.slots.map((slot) => slot.date)).toEqual([
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
    expect(row.slots[1].kind).toBe("empty");
  });

  it("orders times ascending whatever the order of the classes", () => {
    const rows = buildOccupancyRows("2026-10-19", [D, A]);

    expect(rows.map((row) => row.time)).toEqual(["08:00", "16:00"]);
  });

  it("keeps the given order for classes that match on start and end", () => {
    const first = buildClassItem("a", "2026-10-19T11:00:00.000Z", "2026-10-19T12:00:00.000Z");
    const second = buildClassItem("b", "2026-10-19T11:00:00.000Z", "2026-10-19T12:00:00.000Z");
    const rows = buildOccupancyRows("2026-10-19", [first, second]);

    expect([slotIds(rows[0])[0], slotIds(rows[1])[0]]).toEqual(["a", "b"]);
  });

  it("uses the Fortaleza day and time, not the UTC ones", () => {
    // 01:30Z on Tuesday is Monday 22:30 in Fortaleza.
    const late = buildClassItem("late", "2026-10-20T01:30:00.000Z", "2026-10-20T02:30:00.000Z");
    const [row] = buildOccupancyRows("2026-10-19", [late]);

    expect(row.time).toBe("22:30");
    expect(slotIds(row)[0]).toBe("late");
  });

  it("ignores a class outside the week and is empty without classes", () => {
    const outside = buildClassItem("x", "2026-10-26T11:00:00.000Z", "2026-10-26T12:00:00.000Z");

    expect(buildOccupancyRows("2026-10-19", [outside])).toEqual([]);
    expect(buildOccupancyRows("2026-10-19", [])).toEqual([]);
  });
});

describe("getOccupancyCellLook", () => {
  it.each([
    [3, 10, "low", 30],
    [0, 10, "low", 0],
    [5, 10, "mid", 50],
    [89, 100, "mid", 89],
    [9, 10, "high", 90],
    [199, 200, "high", 100],
    [4, 4, "full", 100],
    [12, 10, "full", 100],
  ])("%i of %i seats is %s at %i%%", (taken, capacity, tone, percent) => {
    const item = at("2026-10-19", "11:00", taken, { capacity });

    expect(getOccupancyCellLook(item)).toEqual({ tone, percent });
  });

  it("is cancelled whatever the seats", () => {
    const item = at("2026-10-19", "11:00", 10, {
      capacity: 10,
      cancelledAt: "2026-10-20T10:00:00.000Z",
    });

    expect(getOccupancyCellLook(item).tone).toBe("cancelled");
  });
});

describe("getDefaultSelectedClassId", () => {
  const make = (id: string, taken: number, capacity: number, cancelled = false) =>
    buildClassItem(id, "2026-10-19T11:00:00.000Z", "2026-10-19T12:00:00.000Z", {
      seatsTaken: taken,
      capacity,
      cancelledAt: cancelled ? "2026-10-20T10:00:00.000Z" : null,
    });

  it("is the least occupied class that is not cancelled", () => {
    const classes = [make("A", 3, 10), make("B", 4, 4), make("E", 0, 10, true)];

    expect(getDefaultSelectedClassId(classes)).toBe("A");
  });

  it("takes the first of two classes with the same ratio", () => {
    const classes = [make("A", 5, 10), make("B", 1, 2)];

    expect(getDefaultSelectedClassId(classes)).toBe("A");
  });

  it("is the first class when all are cancelled", () => {
    const classes = [make("A", 3, 10, true), make("B", 0, 10, true)];

    expect(getDefaultSelectedClassId(classes)).toBe("A");
  });

  it("treats a class without capacity as full", () => {
    expect(getDefaultSelectedClassId([make("A", 0, 0), make("B", 9, 10)])).toBe("B");
  });

  it("is null for a week without classes", () => {
    expect(getDefaultSelectedClassId([])).toBeNull();
  });
});
