import type { Locale } from "@/i18n/locales";

export type ClassRequestsGroupRequest = {
  id: string;
  name: string;
  /** "Pediu às {{time}} · {{date}}": when the request was sent. */
  askedAt: { time: string; date: string };
};

export type ClassRequestsGroupProps = {
  locale: Locale;
  discipline: "surf" | "skate";
  level: "beginner" | "advanced" | "expert";
  /** The day block on the left of the class header: "QUA", "9", "set" and "2026". */
  block: { weekday: string; day: string; month: string; year: string };
  /** "08:00 – 09:30". */
  timeRange: string;
  locationName: string;
  seatsTaken: number;
  capacity: number;
  /** The pending requests, oldest first: their order is the waiting list's when the class is full. */
  requests: ClassRequestsGroupRequest[];
};
