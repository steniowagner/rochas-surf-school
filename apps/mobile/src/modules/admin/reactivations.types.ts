/** One deleted account asking to come back, as `GET /reactivation-requests` answers it (dates ISO 8601 in UTC). */
export type ReactivationRequest = {
  id: string;
  name: string;
  email: string;
  role: "student" | "instructor" | "admin";
  deletedAt: string;
  requestedAt: string;
  classesTaken: number;
};

export type ReactivationRequestsResponse = {
  items: ReactivationRequest[];
};

export type ReactivationDecision = {
  id: string;
  decision: "approved" | "denied";
};

export type DenyReactivationVariables = {
  id: string;
  /** Trimmed by the backend; blank means no reason. */
  reason: string;
};
