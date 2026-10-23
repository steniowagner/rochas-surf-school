import { enUS, es, ptBR } from "date-fns/locale";

import { buildClassItem } from "@/modules/classes/classes.test-utils";

import {
  countClassesByDay,
  filterClassesByDay,
  groupClassesByDay,
  historyChipLabel,
  historyDayLabel,
} from "./class-history";

const item = (id: string, startsAt: string) => buildClassItem(id, startsAt, startsAt);

// 14 August 2026 in Fortaleza runs from 03:00 UTC on the 14th to 02:59 UTC on the 15th.
const MORNING_14 = item("c-a", "2026-08-14T11:00:00.000Z");
const LATE_14 = item("c-b", "2026-08-15T02:59:00.000Z");
const EARLY_15 = item("c-c", "2026-08-15T03:00:00.000Z");
const SAME_START_14 = item("c-z", "2026-08-14T11:00:00.000Z");
const ITEMS = [MORNING_14, EARLY_15, LATE_14, SAME_START_14];

describe("countClassesByDay", () => {
  it("counts the classes per Fortaleza day", () => {
    expect(countClassesByDay(ITEMS)).toEqual({ "2026-08-14": 3, "2026-08-15": 1 });
    expect(countClassesByDay([])).toEqual({});
  });
});

describe("filterClassesByDay", () => {
  it("keeps the classes of the Fortaleza day", () => {
    expect(filterClassesByDay(ITEMS, "2026-08-15")).toEqual([EARLY_15]);
    expect(filterClassesByDay(ITEMS, "2026-08-16")).toEqual([]);
  });

  it("keeps every class without a day", () => {
    expect(filterClassesByDay(ITEMS, null)).toBe(ITEMS);
  });
});

describe("groupClassesByDay", () => {
  it("groups by Fortaleza day, newest day first, the classes of a day newest first then by id", () => {
    expect(groupClassesByDay(ITEMS)).toEqual([
      { day: "2026-08-15", items: [EARLY_15] },
      { day: "2026-08-14", items: [LATE_14, SAME_START_14, MORNING_14] },
    ]);
  });

  it("leaves the classes it was given in their order", () => {
    const items = [...ITEMS];

    groupClassesByDay(items);

    expect(items).toEqual(ITEMS);
  });

  it("answers no days without classes", () => {
    expect(groupClassesByDay([])).toEqual([]);
  });
});

describe("history captions", () => {
  it.each([
    [ptBR, "SEX, 14 AGO", "14 AGO"],
    [es, "VIE, 14 AGO", "14 AGO"],
    [enUS, "FRI, 14 AUG", "14 AUG"],
  ])("labels the day and the chip in %s", (locale, label, chip) => {
    expect(historyDayLabel("2026-08-14", locale)).toBe(label);
    expect(historyChipLabel("2026-08-14", locale)).toBe(chip);
  });
});
