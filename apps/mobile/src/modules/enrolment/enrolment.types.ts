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
};

/** The answer of `POST /classes/:id/enrolments` and `POST /enrolments/:id/withdraw`. */
export type EnrolmentResponse = MyEnrolment & {
  classId: string;
};

/** The body of `POST /classes/:id/enrolments`. */
export type RequestSeatRequest = {
  acceptCancellationRule: boolean;
};
