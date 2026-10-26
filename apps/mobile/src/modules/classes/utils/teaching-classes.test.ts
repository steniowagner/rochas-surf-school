import { getDateLocale } from "@/utils/calendar-dates";

import { buildClassItem } from "../classes.test-utils";
import {
  countAssignedClasses,
  formatDayName,
  formatShortDate,
  layoutTeachingClasses,
} from "./teaching-classes";

// Thursday 17 Sep 2026, 08:00 in Fortaleza (UTC−3).
const NOW = new Date("2026-09-17T11:00:00.000Z");
const CANCELLED_AT = "2026-09-10T12:00:00.000Z";

const B = buildClassItem(
  "b",
  "2026-09-17T10:30:00.000Z",
  "2026-09-17T12:00:00.000Z",
);
const N = buildClassItem(
  "n",
  "2026-09-17T12:00:00.000Z",
  "2026-09-17T13:00:00.000Z",
);
const L = buildClassItem(
  "l",
  "2026-09-17T22:00:00.000Z",
  "2026-09-17T23:00:00.000Z",
);
const T = buildClassItem(
  "t",
  "2026-09-18T14:00:00.000Z",
  "2026-09-18T15:00:00.000Z",
  { cancelledAt: CANCELLED_AT },
);
const F = buildClassItem(
  "f",
  "2026-09-19T12:00:00.000Z",
  "2026-09-19T13:00:00.000Z",
);

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("layoutTeachingClasses", () => {
  it("puts the class under way on top, groups the rest by day and picks the next class", () => {
    const layout = layoutTeachingClasses([B, N, L, T, F], NOW);

    expect(ids(layout.ongoing)).toEqual(["b"]);
    expect(
      layout.days.map((day) => [day.day, day.label, ids(day.items)]),
    ).toEqual([
      ["2026-09-17", "today", ["n", "l"]],
      ["2026-09-18", "tomorrow", ["t"]],
      ["2026-09-19", "weekday", ["f"]],
    ]);
    expect(layout.nextId).toBe("n");
  });

  it("drops a class that ended at the new clock, without a refetch", () => {
    const layout = layoutTeachingClasses(
      [B, N, L, T, F],
      new Date("2026-09-17T12:00:00.000Z"),
    );

    expect(ids(layout.ongoing)).toEqual(["n"]);
    expect(ids(layout.days[0]!.items)).toEqual(["l"]);
    expect(layout.nextId).toBe("l");
  });

  it("shows no class under way when none has started, and every class under way in start order", () => {
    expect(layoutTeachingClasses([N, F], NOW).ongoing).toEqual([]);

    const other = buildClassItem(
      "b2",
      "2026-09-17T10:45:00.000Z",
      "2026-09-17T11:45:00.000Z",
    );
    expect(ids(layoutTeachingClasses([B, other, N], NOW).ongoing)).toEqual([
      "b",
      "b2",
    ]);
  });

  it("never puts a cancelled class under way nor makes it the next one, even during its time slot", () => {
    const cancelledNow = buildClassItem("x", B.startsAt, B.endsAt, {
      cancelledAt: CANCELLED_AT,
    });

    const layout = layoutTeachingClasses([cancelledNow, T, F], NOW);

    expect(layout.ongoing).toEqual([]);
    expect(ids(layout.days[0]!.items)).toEqual(["x"]);
    expect(layout.nextId).toBe("f");
  });

  it("highlights a next class days away, and none when every remaining class is cancelled", () => {
    expect(layoutTeachingClasses([T, F], NOW).nextId).toBe("f");
    expect(layoutTeachingClasses([T], NOW).nextId).toBeNull();
    expect(layoutTeachingClasses([], NOW)).toEqual({
      ongoing: [],
      days: [],
      nextId: null,
    });
  });
});

describe("countAssignedClasses", () => {
  it("counts the classes that aren't cancelled", () => {
    expect(countAssignedClasses([B, N, L, T])).toBe(3);
    expect(countAssignedClasses([T])).toBe(0);
  });
});

describe("formatShortDate", () => {
  it("writes the day and the month's abbreviation in the app's language, without a trailing dot", () => {
    expect(formatShortDate("2026-09-17", getDateLocale("pt-BR"))).toBe(
      "17 set",
    );
    expect(formatShortDate("2026-09-17", getDateLocale("en-US"))).toBe(
      "17 Sep",
    );
    expect(formatShortDate("2026-09-17", getDateLocale("es-ES"))).not.toMatch(
      /\.$/,
    );
  });
});

describe("formatDayName", () => {
  it("writes the weekday's full name in the app's language, without the pt-BR \"-feira\"", () => {
    expect(formatDayName("2026-09-21", getDateLocale("pt-BR"))).toBe("Segunda");
    expect(formatDayName("2026-09-23", getDateLocale("pt-BR"))).toBe("Quarta");
    expect(formatDayName("2026-09-25", getDateLocale("pt-BR"))).toBe("Sexta");
    expect(formatDayName("2026-09-19", getDateLocale("pt-BR"))).toBe("Sábado");
    expect(formatDayName("2026-09-25", getDateLocale("es-ES"))).toBe("Viernes");
    expect(formatDayName("2026-09-25", getDateLocale("en-US"))).toBe("Friday");
  });
});
