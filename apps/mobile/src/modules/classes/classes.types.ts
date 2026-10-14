import type {
  ClassDiscipline,
  ClassLevel,
  TimeRange,
} from "@rochas-surf-school/classes";

/** A saved location, as `GET /locations` answers it. */
export type ClassLocation = {
  id: string;
  name: string;
  address: string;
};

export type LocationsResponse = {
  items: ClassLocation[];
};

export type NewLocationVariables = {
  name: string;
  address: string;
};

export type TimeRangeSuggestionsResponse = {
  items: TimeRange[];
};

/** An approved instructor or admin who can be assigned to a class. */
export type Teacher = {
  id: string;
  name: string;
  role: "instructor" | "admin";
};

/** What the admin chose on the Nova aula screen; dates are `YYYY-MM-DD` in America/Fortaleza. */
export type NewClassForm = {
  discipline: ClassDiscipline;
  level: ClassLevel;
  startDate: string | null;
  /** `null` for a single day. */
  endDate: string | null;
  /** ISO weekdays, 1 (Monday) to 7 (Sunday). */
  weekdays: number[];
  timeRanges: TimeRange[];
  locationId: string | null;
  instructorIds: string[];
  capacity: number;
  notes: string;
};

/** The body of `POST /classes/batch`. */
export type BatchRequest = {
  discipline: ClassDiscipline;
  level: ClassLevel;
  startDate: string;
  endDate: string;
  weekdays: number[];
  timeRanges: TimeRange[];
  locationId: string;
  instructorIds: string[];
  capacity: number;
  notes?: string;
};

export type CreateClassesResponse = {
  count: number;
};

/** A month of the calendar: `month` is 1 (January) to 12. */
export type CalendarMonth = {
  year: number;
  month: number;
};
