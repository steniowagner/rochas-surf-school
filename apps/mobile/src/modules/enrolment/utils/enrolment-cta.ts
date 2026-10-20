import type { ButtonVariant } from "@/components/ui/button/button.types";

import type { MyEnrolment } from "../enrolment.types";

export type EnrolmentCtaAction = "request" | "withdraw" | "leaveWaitingList";

export type EnrolmentCta = {
  /** The translation key under `enrolment.cta`. */
  key: "request" | "joinWaitingList" | "withdraw" | "leaveWaitingList" | "requestAgain";
  variant: ButtonVariant;
  action: EnrolmentCtaAction;
};

const CTAS = {
  request: { key: "request", variant: "primary", action: "request" },
  joinWaitingList: { key: "joinWaitingList", variant: "dark", action: "request" },
  requestAgainFree: { key: "requestAgain", variant: "primary", action: "request" },
  requestAgainFull: { key: "requestAgain", variant: "dark", action: "request" },
  withdraw: { key: "withdraw", variant: "outline", action: "withdraw" },
  leaveWaitingList: { key: "leaveWaitingList", variant: "ghost", action: "leaveWaitingList" },
} as const satisfies Record<string, EnrolmentCta>;

/**
 * The one button of the student's footer on a class that hasn't started, or `null` for none: no enrolment, or an
 * ended one the student can ask again after, gives a request (the waiting list when the class is full); a pending
 * request gives a withdrawal. The statuses of the later specs (approved, denied, cancelled, taken out) and the one
 * of a cancelled class give none.
 */
export const getEnrolmentCta = (
  enrolment: MyEnrolment | null,
  classIsFull: boolean,
): EnrolmentCta | null => {
  switch (enrolment?.status) {
    case undefined:
      return classIsFull ? CTAS.joinWaitingList : CTAS.request;
    case "pending":
      return classIsFull ? CTAS.leaveWaitingList : CTAS.withdraw;
    case "withdrawn":
    case "expired":
      return classIsFull ? CTAS.requestAgainFull : CTAS.requestAgainFree;
    default:
      return null;
  }
};
