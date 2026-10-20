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

/** The answer of the enrolment routes that change one (request, withdraw, approve, deny). */
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
