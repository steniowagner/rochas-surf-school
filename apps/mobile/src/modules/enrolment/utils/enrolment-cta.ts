import type { ButtonVariant } from "@/components/ui/button/button.types";

import type { MyEnrolment } from "../enrolment.types";

export type EnrolmentCtaAction = "request" | "withdraw" | "leaveWaitingList" | "cancelSeat";

export type EnrolmentCta = {
  /** The translation key under `enrolment.cta`. */
  key: "request" | "joinWaitingList" | "withdraw" | "leaveWaitingList" | "requestAgain" | "cancelSeat";
  variant: ButtonVariant;
  action: EnrolmentCtaAction;
};

const CTAS = {
  request: { key: "request", variant: "primary", action: "request" },
  joinWaitingList: { key: "joinWaitingList", variant: "dark", action: "request" },
  requestAgainFree: { key: "requestAgain", variant: "primary", action: "request" },
  requestAgainFull: { key: "requestAgain", variant: "dark", action: "request" },
  withdraw: { key: "withdraw", variant: "outline", action: "withdraw" },
  cancelSeat: { key: "cancelSeat", variant: "outline", action: "cancelSeat" },
  leaveWaitingList: { key: "leaveWaitingList", variant: "ghost", action: "leaveWaitingList" },
} as const satisfies Record<string, EnrolmentCta>;

/**
 * The one button of the student's footer on a class that hasn't started, or `null` for none: no enrolment, or an
 * ended or denied one the student can ask again after, gives a request (the waiting list when the class is full); a pending
 * request gives a withdrawal; a cancelled seat or a taken-out student can ask again like an ended one. An approved seat gives the
 * cancellation only while the deadline is ahead (`canCancel`); the one of a cancelled class gives none. While the
 * waiting list is closed (`waitingListEnabled` false) a full class gives no request to someone without an open one.
 */
export const getEnrolmentCta = (
  enrolment: MyEnrolment | null,
  classIsFull: boolean,
  canCancel = false,
  waitingListEnabled = true,
): EnrolmentCta | null => {
  const closed = classIsFull && !waitingListEnabled;

  switch (enrolment?.status) {
    case undefined:
      if (closed) return null;

      return classIsFull ? CTAS.joinWaitingList : CTAS.request;
    case "pending":
      return classIsFull ? CTAS.leaveWaitingList : CTAS.withdraw;
    case "withdrawn":
    case "expired":
    case "denied":
    case "cancelled":
    case "takenOut":
      if (closed) return null;

      return classIsFull ? CTAS.requestAgainFull : CTAS.requestAgainFree;
    case "approved":
      return canCancel ? CTAS.cancelSeat : null;
    default:
      return null;
  }
};
