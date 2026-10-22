import type {
  ClassDiscipline,
  ClassLevel,
  TimeRange,
} from "@rochas-surf-school/classes";

import type { MyEnrolment } from "../enrolment/enrolment.types";

/** A point on the map. */
export type MapPoint = {
  latitude: number;
  longitude: number;
};

/** The location of a class, as `GET /classes` answers it; the point is `null` for a location saved without one. */
export type ClassItemLocation = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

/** A saved, active location, as `GET /locations` answers it. */
export type ClassLocation = ClassItemLocation & {
  /** Classes at the location that start later and aren't cancelled. */
  upcomingClasses: number;
};

export type LocationsResponse = {
  items: ClassLocation[];
};

export type NewLocationVariables = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

/** The body of `PUT /locations/:id`: the whole location every time. */
export type EditLocationVariables = NewLocationVariables & {
  id: string;
  /** Tells the instructors of the upcoming classes; only sent when the location has some. */
  notify?: boolean;
};

/** A suggestion of `GET /locations/address-suggestions`. */
export type AddressSuggestion = {
  placeId: string;
  title: string;
  description: string;
};

export type AddressSuggestionsResponse = {
  items: AddressSuggestion[];
};

/** The place behind a suggestion. */
export type AddressPlace = {
  address: string;
  latitude: number;
  longitude: number;
  name: string;
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

/** The body of `POST /classes/:id/cancel`; a blank message is left out. */
export type CancelClassRequest = {
  message?: string;
};

export type CreateClassesResponse = {
  count: number;
};

/** A person teaching a class. */
export type ClassInstructor = {
  id: string;
  name: string;
};

/** An approved student of a class. */
export type ClassStudent = {
  id: string;
  name: string;
  /** `null` until profile photos can be uploaded. */
  photoUrl: string | null;
  /** The student's approved enrolment in the class, which an admin can take them out of. */
  enrolmentId: string;
};

/** A trial guest of a class: `name` is `null` ("Trial") for who may not see it, and once the data was erased. */
export type ClassGuest = {
  id: string;
  name: string | null;
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
  /** When an admin cancelled the class (ISO 8601 UTC), or `null`. */
  cancelledAt: string | null;
  /** The admin's message, as written, or `null`. */
  cancellationMessage: string | null;
  /** Until when students can cancel (ISO 8601 UTC), or `null` while it can't be worked out. */
  cancellationDeadline: string | null;
  location: ClassItemLocation;
  instructors: ClassInstructor[];
  /** All the seats taken: approved students plus guests. */
  seatsTaken: number;
  /** The approved students: the first 4 in the week list, all of them in the class itself. */
  students: ClassStudent[];
  /** The trial guests, all of them in both answers. */
  guests: ClassGuest[];
  /** The caller's latest enrolment in the class, or `null`; always `null` for instructors and admins. */
  myEnrolment: MyEnrolment | null;
  /** The enrolment requests still waiting for an answer: only in the class itself, and `null` unless the caller is an admin. */
  pendingRequests?: number | null;
};

/** The sport the week screen shows: every class, or only one discipline's. */
export type DisciplineFilterValue = "all" | ClassDiscipline;

/** A person teaching a class, as the class itself answers it. */
export type ClassDetailsTeacher = ClassInstructor & {
  /** Picks the person sheet's chip. */
  role: "instructor" | "admin";
  /** E.164; `null` unless they share it or the viewer is an admin. */
  whatsappNumber: string | null;
};

/** An approved student of a class, as the class itself answers it. */
export type ClassDetailsStudent = ClassStudent & {
  /** E.164; `null` unless they share it or the viewer is an admin. */
  whatsappNumber: string | null;
};

/** A class as `GET /classes/:id`, `PUT /classes/:id` and `POST /classes/:id/cancel` answer it: each person's number too. */
export type ClassDetails = Omit<ClassItem, "instructors" | "students"> & {
  instructors: ClassDetailsTeacher[];
  students: ClassDetailsStudent[];
};

/** The answer of `GET /classes?date=`: `weekStart` is the Monday, `YYYY-MM-DD`. */
export type WeekClasses = {
  weekStart: string;
  items: ClassItem[];
};
