import type { Locale } from "@/i18n/locales";

import type { AppIconName } from "../app-icon";

export type ClassCardState = "notStarted" | "started" | "finished" | "cancelled";

export type ClassCardStudent = { id: string; label: string; erased: boolean };

export type ClassCardEnrolmentKey = "pending" | "waitingList" | "approved" | "denied" | "withdrawn" | "expired" | "cancelled" | "takenOut";

export type ClassCardProps = {
  locale: Locale;
  discipline: "surf" | "skate";
  level: "beginner" | "intermediate" | "advanced";
  state: ClassCardState;
  /** "08:00 – 09:30" */
  timeRange: string;
  locationName: string;
  seatsTaken: number;
  capacity: number;
  /** The teacher's next class: the sun border, the primary shadow and the "Next" chip. */
  isNext?: boolean;
  /** The admins' flags. */
  showFlags?: boolean;
  withoutInstructor?: boolean;
  withoutDeadline?: boolean;
  /** The viewer's enrolment chip, in the place of "Sem vagas". */
  enrolment?: ClassCardEnrolmentKey;
  students: ClassCardStudent[];
};

export type EnrolmentChip = { tone: "warn" | "info" | "muted" | "ok" | "bad"; icon: AppIconName };
