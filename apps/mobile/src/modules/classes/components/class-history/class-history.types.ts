import type { UseQueryResult } from "@tanstack/react-query";
import type { Href } from "expo-router";

import type { CalendarPeriod } from "@/components/week-month-calendar/week-month-calendar.types";

import type {
  ClassHistoryPeriod,
  ClassItem,
  DisciplineFilterValue,
} from "../../classes.types";

/** A row of the history's list: a day's label, or one of its classes. */
export type HistoryRow =
  | { type: "day"; key: string; label: string }
  | { type: "class"; key: string; item: ClassItem };

export type UseClassHistoryProps = {
  /** The query of one period of the history: the screen's own, with its key and URL. */
  useHistoryQuery: (
    period: ClassHistoryPeriod,
  ) => UseQueryResult<{ items: ClassItem[] }>;
  /** The route of a class's details, for the role that reads the history. */
  classRoute: (id: string) => Href;
};

export type UseClassHistoryResult = {
  now: Date;
  /** Today in America/Fortaleza, `YYYY-MM-DD`. */
  today: string;
  /** The selected day, `YYYY-MM-DD`, or `null` for the whole period. */
  selectedDay: string | null;
  /** The sport filter: every sport, or the one picked. */
  discipline: DisciplineFilterValue;
  selectDiscipline: (discipline: DisciplineFilterValue) => void;
  /** The days of the period with one or more classes, for the calendar's dots. */
  markedDates: string[];
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

export type ClassHistoryProps = {
  history: UseClassHistoryResult;
  /** The i18n namespace of the copy: `myHistory` (student) or `teachingHistory` (instructor, admin). */
  copy: "myHistory" | "teachingHistory";
  /** Shows the title large, with an icon and a description, collapsing into the header as the list scrolls. */
  withIntro?: boolean;
};
