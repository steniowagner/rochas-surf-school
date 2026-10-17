import type { TimeRange } from "@rochas-surf-school/classes";

import type { NewClassForm } from "../classes.types";

/** What the admin can change on a class that hasn't started. */
export type EditClassForm = Pick<
  NewClassForm,
  "discipline" | "level" | "capacity" | "notes" | "instructorIds"
> & {
  /** `YYYY-MM-DD` in America/Fortaleza. */
  date: string;
  range: TimeRange;
  locationId: string;
};
