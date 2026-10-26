import type { ClassState } from "@rochas-surf-school/classes";

import type { ClassItem, ClassStudent } from "../../classes.types";
import type { EnrolmentDisplay } from "../../../enrolment/utils/enrolment-status";
import type { OccupancyTone, StudentsLabel } from "../../utils/occupancy";

export type ClassCardProps = {
  item: ClassItem;
  /** The clock the state is computed with. */
  now: Date;
  onPress: (id: string) => void;
  /** Shows the admins' flags (the "no instructor" and "no deadline" chips). */
  showFlags?: boolean;
  /** Students only: the chip of the viewer's own enrolment (pending, on the waiting list, withdrawn, expired). */
  showEnrolment?: boolean;
  /** "Minhas aulas": the teacher's next class, drawn with the sun border and the "Próxima" chip while it hasn't started. */
  isNext?: boolean;
};

export type UseClassCardProps = Pick<
  ClassCardProps,
  "item" | "now" | "showEnrolment" | "isNext"
>;

export type UseClassCardResult = {
  state: ClassState;
  /** `isNext` and not started: the "Próxima" chip, the sun border and the primary shadow. */
  next: boolean;
  /** "08:00 – 09:30", America/Fortaleza. */
  timeRange: string;
  /** The occupancy bar is shown: not for a finished or cancelled class. */
  showOccupancy: boolean;
  /** 0 to 100. */
  occupancyPercent: number;
  occupancyTone: OccupancyTone;
  full: boolean;
  /** The "Sem vagas" chip: a full class that hasn't started, with no enrolment chip (the state chips win). */
  showFullChip: boolean;
  /** The chip of the viewer's enrolment, in the place of "Sem vagas"; the state chips win. */
  enrolment: EnrolmentDisplay | null;
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
