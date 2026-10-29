import type { Locale } from "@/i18n/locales";

import type { RequestSeatClassCardProps } from "../request-seat-class-card/request-seat-class-card.types";

export type RequestSeatSheetProps = {
  locale: Locale;
  /** The class is full: the sheet asks for a place on the waiting list. */
  waitingList?: boolean;
  /** The line of the cancellation rule: with the deadline, without one, or without a rule written by the school. */
  rule?: "deadline" | "noDeadline" | "noRule";
  /** "qua, 9 set às 08:00": when the student can cancel until. */
  deadline?: string;
  /** The acceptance checkbox is checked. */
  accepted?: boolean;
  /** The submit button shows its spinner. */
  sending?: boolean;
  classCard: Omit<RequestSeatClassCardProps, "locale">;
};
