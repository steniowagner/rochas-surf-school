import { buildClassItem } from "@/modules/classes/classes.test-utils";
import type { ClassItem } from "@/modules/classes/classes.types";

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
  it("lists the chips in the design's order, all first", () => {
    expect(MY_CLASSES_FILTERS).toEqual([
      "all",
      "pending",
      "approved",
      "denied",
      "withdrawn",
      "cancelled",
      "takenOut",
      "expired",
      "classCancelled",
    ]);
  });

  it.each(["pending", "approved", "denied", "withdrawn", "cancelled", "takenOut", "expired"] as const)(
    "puts a %s request under its own chip",
    (status) => {
      expect(getMyClassFilter(withStatus("c", status))).toBe(status);
    },
  );

  it("puts a class closed by its cancellation, or any request of a cancelled class, under Aula cancelada", () => {
    expect(getMyClassFilter(withStatus("a", "classCancelled"))).toBe("classCancelled");
    expect(getMyClassFilter(withStatus("b", "withdrawn", { cancelledAt: START }))).toBe("classCancelled");
  });

  it("puts a class without a request under no chip", () => {
    expect(getMyClassFilter(buildClassItem("c", START, END))).toBeNull();
  });

  it("keeps every class for all and only the chip's classes otherwise, in order", () => {
    const items = [
      withStatus("1", "pending"),
      withStatus("2", "approved"),
      withStatus("3", "pending"),
      withStatus("4", "denied", { cancelledAt: START }),
    ];

    expect(filterMyClasses(items, "all")).toBe(items);
    expect(filterMyClasses(items, "pending").map((item) => item.id)).toEqual(["1", "3"]);
    expect(filterMyClasses(items, "classCancelled").map((item) => item.id)).toEqual(["4"]);
    expect(filterMyClasses(items, "denied")).toEqual([]);
  });
});
