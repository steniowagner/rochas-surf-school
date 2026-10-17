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
  /** Days of the range taken out of it, `YYYY-MM-DD`. */
  excludedDates: string[];
  /** A selected time has started on today's date: leave those classes out instead of refusing the batch. */
  skipPast: boolean;
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
  /** ISO weekdays, 1 (Monday) to 7 (Sunday): the app always sends all seven. */
  weekdays: number[];
  /** Days of the range left out; absent when none is. */
  excludedDates?: string[];
  /** Only sent as `true`: the classes that have already started are left out. */
  skipPast?: boolean;
  timeRanges: TimeRange[];
  locationId: string;
  instructorIds: string[];
  capacity: number;
  notes?: string;
};

/** The body of `PUT /classes/:id`: the whole class every time; `date` is `YYYY-MM-DD`, `start` / `end` are `HH:mm`. */
export type EditClassRequest = {
  discipline: ClassDiscipline;
  level: ClassLevel;
  date: string;
  start: string;
  end: string;
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

/** A person teaching a class. */
export type ClassInstructor = {
  id: string;
  name: string;
};

/** A class as `GET /classes` and `GET /classes/:id` answer it; dates are ISO 8601 UTC. */
export type ClassItem = {
  id: string;
  discipline: ClassDiscipline;
  level: ClassLevel;
  startsAt: string;
  endsAt: string;
  capacity: number;
  notes: string | null;
  location: ClassLocation;
  instructors: ClassInstructor[];
};

/** The answer of `GET /classes?date=`: `weekStart` is the Monday, `YYYY-MM-DD`. */
export type WeekClasses = {
  weekStart: string;
  items: ClassItem[];
};
