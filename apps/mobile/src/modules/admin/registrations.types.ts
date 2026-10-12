/** One pending registration, as `GET /registrations` answers it (`createdAt` an ISO 8601 string in UTC). */
export type Registration = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type RegistrationsResponse = {
  items: Registration[];
};

export type RegistrationDecision = {
  id: string;
  status: "approved" | "denied";
};

export type DenyRegistrationVariables = {
  id: string;
  /** Trimmed by the backend; blank means no reason. */
  reason: string;
};
