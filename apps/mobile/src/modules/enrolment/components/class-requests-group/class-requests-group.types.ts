import type { PendingRequest, PendingRequestsClass } from "../../enrolment.types";

export type RequestAction = "approve" | "deny";

export type ClassRequestsGroupProps = {
  item: PendingRequestsClass;
  /** The requests being sent, by id, and what is being sent. */
  sending: Record<string, RequestAction>;
  onApprove: (request: PendingRequest, item: PendingRequestsClass) => void;
  onDeny: (request: PendingRequest) => void;
  /** The class header: the details of the class. */
  onOpenClass: (item: PendingRequestsClass) => void;
  /** The chevron of a request: the student's details. */
  onOpenStudent: (request: PendingRequest) => void;
};
