import type { ClassDetailsState, EnrolmentCta, Scenario } from "./class-details-screen.types";

const CTAS = {
  request: { key: "request", variant: "primary" },
  joinWaitingList: { key: "joinWaitingList", variant: "primary" },
  requestAgain: { key: "requestAgain", variant: "primary" },
  withdraw: { key: "withdraw", variant: "outline" },
  cancelSeat: { key: "cancelSeat", variant: "outline" },
  leaveWaitingList: { key: "leaveWaitingList", variant: "ghost" },
} as const satisfies Record<string, EnrolmentCta>;

/**
 * The one button of the student's footer on a class that hasn't started, with the rules of the app's `getEnrolmentCta`:
 * a request (the waiting list when the class is full) without an enrolment or after an ended one; a withdrawal for a
 * pending request (leaving the waiting list when full); the cancellation of an approved seat only before the deadline.
 */
export const getEnrolmentCta = (status: Scenario["status"], full: boolean, canCancel: boolean, waitingListEnabled: boolean): EnrolmentCta | null => {
  const closed = full && !waitingListEnabled;

  switch (status) {
    case null:
      return closed ? null : full ? CTAS.joinWaitingList : CTAS.request;
    case "pending":
    case "waitingList":
      return full ? CTAS.leaveWaitingList : CTAS.withdraw;
    case "withdrawn":
    case "expired":
    case "denied":
    case "cancelled":
    case "takenOut":
      return closed ? null : CTAS.requestAgain;
    case "approved":
      return canCancel ? CTAS.cancelSeat : null;
    default:
      return null;
  }
};

const base = { status: null, full: false, canCancel: false, waitingListEnabled: true, deadline: "ahead", classState: "not-started" } as const;

/** What each state of the class details is made of. */
export const scenarios: Record<Exclude<ClassDetailsState, "loading" | "notFound" | "error">, Scenario> = {
  open: base,
  pending: { ...base, status: "pending" },
  fullWaitingList: { ...base, full: true },
  waitingList: { ...base, full: true, status: "pending" },
  fullClosed: { ...base, full: true, waitingListEnabled: false },
  approved: { ...base, status: "approved", canCancel: true, inClass: true },
  approvedPassed: { ...base, status: "approved", deadline: "passed", inClass: true },
  approvedNoDeadline: { ...base, status: "approved", deadline: "none", inClass: true },
  denied: { ...base, status: "denied" },
  withdrawn: { ...base, status: "withdrawn" },
  cancelled: { ...base, status: "cancelled" },
  expired: { ...base, status: "expired" },
  takenOut: { ...base, status: "takenOut" },
  started: { ...base, classState: "started" },
  finished: { ...base, classState: "finished" },
  classCancelled: { ...base, classState: "cancelled" },
  noInstructor: { ...base, noInstructor: true },
};
