import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import type { MyEnrolment } from "../enrolment.types";

export type EnrolmentDisplayKey =
  | "pending"
  | "waitingList"
  | "approved"
  | "denied"
  | "withdrawn"
  | "expired"
  | "cancelled";

export type EnrolmentTone = "warn" | "info" | "dim" | "ok" | "bad";

/** How the student's latest enrolment is drawn: the banner on the details and the chip on the card. */
export type EnrolmentDisplay = {
  /** The translation key under `enrolment.status`, holding `chip`, `title` and `description`. */
  key: EnrolmentDisplayKey;
  tone: EnrolmentTone;
  icon: ComponentProps<typeof Ionicons>["name"];
};

const DISPLAYS: Record<EnrolmentDisplayKey, EnrolmentDisplay> = {
  pending: { key: "pending", tone: "warn", icon: "hourglass-outline" },
  waitingList: { key: "waitingList", tone: "info", icon: "list-outline" },
  approved: { key: "approved", tone: "ok", icon: "checkmark-circle-outline" },
  denied: { key: "denied", tone: "bad", icon: "close-circle-outline" },
  withdrawn: { key: "withdrawn", tone: "dim", icon: "arrow-undo-outline" },
  expired: { key: "expired", tone: "dim", icon: "time-outline" },
  cancelled: { key: "cancelled", tone: "dim", icon: "remove-circle-outline" },
};

/**
 * What to draw for the latest enrolment. "On the waiting list" is never stored: it is a pending request of a
 * class that is full. The student's own cancellation is drawn; the statuses of the later specs (taken out) and the one
 * of a cancelled class draw nothing yet.
 */
export const getEnrolmentDisplay = (
  enrolment: MyEnrolment | null,
  classIsFull: boolean,
): EnrolmentDisplay | null => {
  switch (enrolment?.status) {
    case "pending":
      return classIsFull ? DISPLAYS.waitingList : DISPLAYS.pending;
    case "approved":
      return DISPLAYS.approved;
    case "denied":
      return DISPLAYS.denied;
    case "withdrawn":
      return DISPLAYS.withdrawn;
    case "expired":
      return DISPLAYS.expired;
    case "cancelled":
      return DISPLAYS.cancelled;
    default:
      return null;
  }
};

/** The chip tone of a display tone. */
export const toChipTone = (tone: EnrolmentTone): "warn" | "info" | "muted" | "ok" | "bad" =>
  tone === "dim" ? "muted" : tone;

/** The banner background of a display tone. */
export const BANNER_CLASSES: Record<EnrolmentTone, string> = {
  warn: "bg-warn-tint",
  info: "bg-info-tint",
  dim: "bg-dim",
  ok: "bg-ok-tint",
  bad: "bg-bad-tint",
};
