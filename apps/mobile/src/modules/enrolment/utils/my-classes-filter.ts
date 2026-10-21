import type { ClassItem } from "@/modules/classes/classes.types";

import type { MyClassesFilter } from "../enrolment.types";

/** The chips of "Minhas aulas", in the order they are drawn. */
export const MY_CLASSES_FILTERS: readonly MyClassesFilter[] = [
  "all",
  "pending",
  "approved",
  "denied",
  "withdrawn",
  "cancelled",
  "takenOut",
  "expired",
  "classCancelled",
];

/**
 * The one chip a class belongs to. A cancelled class is "Aula cancelada" whatever the request said, as its card
 * shows; a pending request is "Pendentes", on the waiting list or not. A class without a request belongs to none.
 */
export const getMyClassFilter = (item: ClassItem): Exclude<MyClassesFilter, "all"> | null => {
  if (item.cancelledAt !== null || item.myEnrolment?.status === "classCancelled") {
    return "classCancelled";
  }

  return item.myEnrolment?.status ?? null;
};

/** The classes the chip shows, in their order. */
export const filterMyClasses = (items: ClassItem[], filter: MyClassesFilter): ClassItem[] =>
  filter === "all" ? items : items.filter((item) => getMyClassFilter(item) === filter);
