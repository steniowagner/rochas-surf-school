import type { Locale } from "@/i18n/locales";

import type { ClassCardStudent } from "../class-card/class-card.types";

export type OngoingClassCardProps = {
  locale: Locale;
  discipline: "surf" | "skate";
  level: "beginner" | "advanced" | "expert";
  /** "08:00 – 09:30" */
  timeRange: string;
  locationName: string;
  seatsTaken: number;
  capacity: number;
  students: ClassCardStudent[];
};
