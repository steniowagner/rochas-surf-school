import type { ClassItem } from "@/modules/classes/classes.types";

/** The statuses an enrolment can have, as the API answers them. */
export type EnrolmentStatus =
  | "pending"
  | "approved"
  | "denied"
  | "withdrawn"
  | "expired"
  | "cancelled"
  | "takenOut"
  | "classCancelled";

/** The caller's latest enrolment in a class, as `myEnrolment` of a class answers it; dates are ISO 8601 UTC. */
export type MyEnrolment = {
  id: string;
  status: EnrolmentStatus;
  requestedAt: string;
  /** The denial reason (or the take-out reason), when the school wrote one. */
  reason: string | null;
};

/** The answer of the enrolment routes that change one (request, withdraw, approve, deny, enrol, take out). */
export type EnrolmentResponse = Omit<MyEnrolment, "reason"> & {
  classId: string;
};

/** The body of `POST /classes/:id/enrolments`. */
export type RequestSeatRequest = {
  acceptCancellationRule: boolean;
};

/** One pending request in the admins' tool, as `GET /enrolments/pending` answers it. */
export type PendingRequest = {
  id: string;
  requestedAt: string;
  student: { id: string; name: string; photoUrl: string | null };
};

/** An upcoming class with pending requests, the requests in the order they were asked. */
export type PendingRequestsClass = {
  id: string;
  discipline: "surf" | "skate";
  level: "beginner" | "advanced" | "expert";
  startsAt: string;
  endsAt: string;
  capacity: number;
  seatsTaken: number;
  location: { name: string };
  requests: PendingRequest[];
};

export type PendingRequestsResponse = {
  /** The number of pending requests across the classes. */
  total: number;
  classes: PendingRequestsClass[];
};

export type DenyRequestVariables = {
  id: string;
  /** Trimmed by the backend; blank means no reason. */
  reason: string;
};

export type EnrolStudentVariables = {
  classId: string;
  studentId: string;
};

export type TakeStudentOutVariables = {
  /** The enrolment to end. */
  id: string;
  /** Trimmed by the backend; blank means no reason. */
  reason: string;
};

/** The student an admin is taking out of a class, and the enrolment that ends. */
export type TakeOutTarget = {
  name: string;
  enrolmentId: string;
};

/** The body of `POST /classes/:id/guests`; the number is E.164. */
export type AddGuestVariables = {
  classId: string;
  name: string;
  whatsappNumber: string;
};

/** The answer of `POST /classes/:id/guests`. */
export type AddGuestResponse = {
  id: string;
  classId: string;
  name: string;
};

export type RemoveGuestVariables = {
  id: string;
};

/** The trial guest an admin is taking out of a class. */
export type RemoveGuestTarget = {
  name: string;
  guestId: string;
};

/** The answer of `GET /classes/mine`: the student's classes that haven't finished, by start. */
export type MyClassesResponse = {
  items: ClassItem[];
};

/** One page of `GET /classes/mine/history`: the classes the student took, newest first. */
export type MyClassHistoryPage = {
  items: ClassItem[];
  total: number;
  page: number;
  perPage: number;
};

/** A status chip of "Minhas aulas"; `all` shows every class. */
export type MyClassesFilter =
  | "all"
  | "pending"
  | "approved"
  | "denied"
  | "withdrawn"
  | "cancelled"
  | "takenOut"
  | "expired"
  | "classCancelled";
