import type { CalendarPeriod } from "@/components/week-month-calendar/week-month-calendar.types";
import type { ClassItem } from "@/modules/classes/classes.types";

/** A row of the history's list: a day's label, or one of its classes. */
export type HistoryRow =
  | { type: "day"; key: string; label: string }
  | { type: "class"; key: string; item: ClassItem };

export type UseMyClassHistoryScreenResult = {
  now: Date;
  /** Today in America/Fortaleza, `YYYY-MM-DD`. */
  today: string;
  /** The selected day, `YYYY-MM-DD`, or `null` for the whole period. */
  selectedDay: string | null;
  /** The days of the period with classes, and how many each has, for the calendar's dots. */
  markedDates: string[];
  markedCounts: Record<string, number>;
  /** The period on screen: "OUTUBRO 2026", "12 – 18 OUT". */
  caption: string;
  /** The selected day's chip, "14 AGO", or `null` without one. */
  dayLabel: string | null;
  /** The labels and classes of the period, or of the selected day, newest first. */
  rows: HistoryRow[];
  isLoading: boolean;
  isError: boolean;
  /** Loaded, with nothing to show for the period or the selected day. */
  isEmpty: boolean;
  isRetrying: boolean;
  isRefreshing: boolean;
  selectDay: (day: string) => void;
  clearDay: () => void;
  updatePeriod: (period: CalendarPeriod) => void;
  refresh: () => Promise<void>;
  retry: () => void;
  openClass: (id: string) => void;
};
