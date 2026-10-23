import { buildClassItem } from "@/modules/classes/classes.test-utils";
import type { ClassItem } from "@/modules/classes/classes.types";
import i18n from "@/i18n";

import type { EnrolmentStatus } from "../enrolment.types";

import { filterMyClasses, getMyClassFilter, MY_CLASSES_FILTERS } from "./my-classes-filter";

const START = "2026-10-15T11:00:00.000Z";
const END = "2026-10-15T12:00:00.000Z";

const withStatus = (id: string, status: EnrolmentStatus, overrides: Partial<ClassItem> = {}) =>
  buildClassItem(id, START, END, {
    myEnrolment: { id: `e-${id}`, status, requestedAt: START, reason: null },
    ...overrides,
  });

describe("my classes filter", () => {
  it("lists the four chips in order, all first", () => {
    expect(MY_CLASSES_FILTERS).toEqual(["all", "pending", "confirmed", "ended"]);
  });

  it.each([
    ["en-US", ["All", "Pending", "Confirmed", "Ended"]],
    ["pt-BR", ["Todas", "Pendentes", "Confirmadas", "Encerradas"]],
    ["es-ES", ["Todas", "Pendientes", "Confirmadas", "Cerradas"]],
  ])("labels the four chips in every language (%s)", (locale, labels) => {
    const t = i18n.getFixedT(locale);

    expect(MY_CLASSES_FILTERS.map((filter) => t(`myClasses.filters.${filter}`))).toEqual(labels);
  });

  it.each([
    ["pending", "pending"],
    ["approved", "confirmed"],
    ["denied", "ended"],
    ["withdrawn", "ended"],
    ["cancelled", "ended"],
    ["takenOut", "ended"],
    ["expired", "ended"],
    ["classCancelled", "ended"],
  ] as const)("puts a %s request under %s", (status, filter) => {
    expect(getMyClassFilter(withStatus("c", status))).toBe(filter);
  });

  it("puts any request of a cancelled class under ended, an approved or pending one included", () => {
    expect(getMyClassFilter(withStatus("a", "approved", { cancelledAt: START }))).toBe("ended");
    expect(getMyClassFilter(withStatus("b", "pending", { cancelledAt: START }))).toBe("ended");
  });

  it("puts a class without a request under no chip", () => {
    expect(getMyClassFilter(buildClassItem("c", START, END))).toBeNull();
  });

  it("keeps every class for all and only the chip's classes otherwise, in order", () => {
    const items = [
      withStatus("1", "pending"),
      withStatus("2", "approved"),
      withStatus("3", "withdrawn"),
      withStatus("4", "pending"),
      withStatus("5", "approved", { cancelledAt: START }),
      buildClassItem("6", START, END),
    ];

    expect(filterMyClasses(items, "all")).toBe(items);
    expect(filterMyClasses(items, "pending").map((item) => item.id)).toEqual(["1", "4"]);
    expect(filterMyClasses(items, "confirmed").map((item) => item.id)).toEqual(["2"]);
    expect(filterMyClasses(items, "ended").map((item) => item.id)).toEqual(["3", "5"]);
    expect(filterMyClasses([withStatus("1", "pending")], "ended")).toEqual([]);
  });
});
