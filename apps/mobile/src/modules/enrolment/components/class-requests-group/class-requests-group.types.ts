import type { PendingRequest, PendingRequestsClass } from "../../enrolment.types";

export type RequestAction = "approve" | "deny";

export type ClassRequestsGroupProps = {
  item: PendingRequestsClass;
  /** The requests being sent, by id, and what is being sent. */
  sending: Record<string, RequestAction>;
  onApprove: (request: PendingRequest, item: PendingRequestsClass) => void;
  onDeny: (request: PendingRequest) => void;
};
