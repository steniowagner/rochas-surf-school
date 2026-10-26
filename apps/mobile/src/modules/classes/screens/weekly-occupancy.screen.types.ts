import type { ClassItem } from "../classes.types";
import type { OccupancyStatsFigures } from "../utils/weekly-occupancy";

export type WeeklyOccupancyScreenProps = {
  role: "instructor" | "admin";
};

export type UseWeeklyOccupancyScreenProps = WeeklyOccupancyScreenProps;

export type UseWeeklyOccupancyScreenResult = {
  now: Date;
  /** Today, `YYYY-MM-DD` in America/Fortaleza. */
  today: string;
  /** The Monday of the week on screen. */
  weekStart: string;
  /** "This week", "Next week", "2 weeks ago"… */
  relativeLabel: string;
  isCurrentWeek: boolean;
  /** "19 – 25 OCT". */
  caption: string;
  classes: ClassItem[];
  /** The week's figures for the stats card. */
  stats: OccupancyStatsFigures;
  selectedId: string | null;
  selected: ClassItem | null;
  isLoading: boolean;
  isError: boolean;
  /** "Try again" is loading the week: the error stays, with the spinner in its button. */
  isRetrying: boolean;
  /** Loaded, with no class in the week (never after an expired session). */
  isEmpty: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  retry: () => void;
  isCalendarOpen: boolean;
  openCalendar: () => void;
  closeCalendar: () => void;
  /** Selects the week the day is in. */
  selectWeekOf: (date: string) => void;
  selectClass: (id: string) => void;
  openClass: (id: string) => void;
};
