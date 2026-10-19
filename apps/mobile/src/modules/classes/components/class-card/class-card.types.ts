import type { ClassState } from "@rochas-surf-school/classes";

import type { ClassItem, ClassStudent } from "../../classes.types";
import type { OccupancyTone, StudentsLabel } from "../../utils/occupancy";

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
  /** The occupancy bar is shown: not for a finished or cancelled class. */
  showOccupancy: boolean;
  /** 0 to 100. */
  occupancyPercent: number;
  occupancyTone: OccupancyTone;
  full: boolean;
  /** The "Sem vagas" chip: a full class that hasn't started (the state chips win otherwise). */
  showFullChip: boolean;
  /** The students footer is shown: everything but a cancelled class. */
  showFooter: boolean;
  /** The students whose avatars the footer shows (up to 4). */
  avatars: ClassStudent[];
  /** The seats taken that no avatar shows ("+N"). */
  hiddenSeats: number;
  studentsLabel: StudentsLabel;
  /** No instructor and not started yet (`isWithoutInstructor`). */
  withoutInstructor: boolean;
  /** No cancellation deadline and not started yet (`isWithoutDeadline`). */
  withoutDeadline: boolean;
};
