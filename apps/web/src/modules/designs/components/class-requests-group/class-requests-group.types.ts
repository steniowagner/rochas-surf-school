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
  /** "Quarta" */
  weekday: string;
  /** "9 SET" */
  date: string;
  /** "1 h 30 min" */
  duration: string;
  /** "08:00 – 09:30". */
  timeRange: string;
  locationName: string;
  seatsTaken: number;
  capacity: number;
  /** The pending requests, oldest first: their order is the waiting list's when the class is full. */
  requests: ClassRequestsGroupRequest[];
};
