import type { Locale } from "@/i18n/locales";

import type { ClassCardEnrolmentKey } from "@/modules/designs/components/class-card/class-card.types";

export type ClassDetailsState =
  | "open"
  | "pending"
  | "fullWaitingList"
  | "waitingList"
  | "fullClosed"
  | "approved"
  | "approvedPassed"
  | "approvedNoDeadline"
  | "denied"
  | "withdrawn"
  | "cancelled"
  | "expired"
  | "takenOut"
  | "started"
  | "finished"
  | "classCancelled"
  | "noInstructor"
  | "loading"
  | "notFound"
  | "error";

export type ClassDetailsSheet = "request" | "requestNoDeadline" | "requestNoRule" | "requestSending" | "requestWaitingList" | "withdraw" | "cancelSeat" | "denial";

export type ClassDetailsScreenProps = {
  locale: Locale;
  state: ClassDetailsState;
  /** A sheet open over the screen. */
  sheet?: ClassDetailsSheet;
  /** A toast over the top: the app message's key. */
  toast?: { key: string; tone: "success" | "error" };
  /** Texts the school typed (spec 073 D-04): not app copy. */
  texts: { denialReason: string; takeOutReason: string; notes: string };
  /** The denial sheet without the school's reason. */
  withoutReason?: boolean;
};

export type EnrolmentCtaKey = "request" | "joinWaitingList" | "withdraw" | "leaveWaitingList" | "requestAgain" | "cancelSeat";

export type EnrolmentCta = { key: EnrolmentCtaKey; variant: "primary" | "outline" | "ghost" };

export type Scenario = {
  status: ClassCardEnrolmentKey | null;
  full: boolean;
  canCancel: boolean;
  waitingListEnabled: boolean;
  deadline: "ahead" | "passed" | "none";
  classState: "not-started" | "started" | "finished" | "cancelled";
  noInstructor?: boolean;
  /** The student holds a seat: they are among the people of the class. */
  inClass?: boolean;
};
