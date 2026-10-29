import type { Locale } from "@/i18n/locales";

import type { ClassCardStudent } from "../class-card/class-card.types";

export type ClassPeopleProps = {
  locale: Locale;
  instructors: { id: string; name: string; isViewer?: boolean; erased?: boolean }[];
  students: ClassCardStudent[];
  seatsTaken: number;
  capacity: number;
  state: "not-started" | "started" | "finished" | "cancelled";
};
