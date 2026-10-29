import type { Locale } from "@/i18n/locales";

import type { ClassCardStudent } from "../class-card/class-card.types";

export type ClassPeopleGuest = {
  id: string;
  /** `null` for who may not see it: the row shows only the "Trial" chip. */
  name: string | null;
};

export type ClassPeopleProps = {
  locale: Locale;
  instructors: { id: string; name: string; isViewer?: boolean; erased?: boolean }[];
  students: ClassCardStudent[];
  /** The class's trial guests, after the students. */
  guests?: ClassPeopleGuest[];
  /** Students plus guests. */
  seatsTaken: number;
  capacity: number;
  state: "not-started" | "started" | "finished" | "cancelled";
  /** The list opened under the avatars: a row per student, then one per guest. */
  expanded?: boolean;
};
