import type { ClassState } from "@rochas-surf-school/classes";

import type { ClassItem } from "../../classes.types";

export type ClassCardProps = {
  item: ClassItem;
  /** The clock the state is computed with. */
  now: Date;
  onPress: (id: string) => void;
  /** Shows the admins' flags (the "no instructor" and "no deadline" chips). */
  showFlags?: boolean;
};

export type UseClassCardProps = Pick<ClassCardProps, "item" | "now">;

export type UseClassCardResult = {
  state: ClassState;
  /** "08:00 – 09:30", America/Fortaleza. */
  timeRange: string;
  /** The instructors' names: two joined by " · ", then "+N". */
  instructors: string;
  /** No instructor and not started yet (`isWithoutInstructor`). */
  withoutInstructor: boolean;
  /** No cancellation deadline and not started yet (`isWithoutDeadline`). */
  withoutDeadline: boolean;
};
