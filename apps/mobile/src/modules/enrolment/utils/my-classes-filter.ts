import type { ClassItem } from "@/modules/classes/classes.types";

import type { EnrolmentStatus, MyClassesFilter } from "../enrolment.types";

/** The chips of "Minhas aulas", in the order they are drawn. */
export const MY_CLASSES_FILTERS: readonly MyClassesFilter[] = ["all", "pending", "confirmed", "ended"];

/** The group of each request status: Pendentes, Confirmadas, or Encerradas for every request that ended. */
const STATUS_FILTERS: Record<EnrolmentStatus, Exclude<MyClassesFilter, "all">> = {
  pending: "pending",
  approved: "confirmed",
  denied: "ended",
  withdrawn: "ended",
  cancelled: "ended",
  takenOut: "ended",
  expired: "ended",
  classCancelled: "ended",
};

/**
 * The one chip a class belongs to. Any request of a cancelled class is "Encerradas", as its card shows; a pending
 * request is "Pendentes", on the waiting list or not. A class without a request belongs to none.
 */
export const getMyClassFilter = (item: ClassItem): Exclude<MyClassesFilter, "all"> | null => {
  if (item.cancelledAt !== null) {
    return "ended";
  }

  return item.myEnrolment ? STATUS_FILTERS[item.myEnrolment.status] : null;
};

/** The classes the chip shows, in their order. */
export const filterMyClasses = (items: ClassItem[], filter: MyClassesFilter): ClassItem[] =>
  filter === "all" ? items : items.filter((item) => getMyClassFilter(item) === filter);
