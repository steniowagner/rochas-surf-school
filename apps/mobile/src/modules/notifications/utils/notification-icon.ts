import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type NotificationTone = "info" | "ok" | "bad" | "warn";

export type NotificationIcon = {
  name: ComponentProps<typeof Ionicons>["name"];
  tone: NotificationTone;
};

// Spec 055, D-11: one glyph and tone per type.
const ICONS: Record<string, NotificationIcon> = {
  "registration.pending": { name: "person-add-outline", tone: "info" },
  "registration.approved": { name: "checkmark-circle-outline", tone: "ok" },
  "registration.denied": { name: "close-circle-outline", tone: "bad" },
  "reactivation.requested": { name: "refresh-circle-outline", tone: "info" },
  "reactivation.approved": { name: "checkmark-circle-outline", tone: "ok" },
  "reactivation.denied": { name: "close-circle-outline", tone: "bad" },
  "class.assigned": { name: "calendar-outline", tone: "info" },
  "class.edited": { name: "create-outline", tone: "info" },
  "class.unassigned": { name: "remove-circle-outline", tone: "bad" },
  "class.cancelled": { name: "calendar-outline", tone: "bad" },
  "class.deleted": { name: "trash-outline", tone: "bad" },
  "class.noInstructor": { name: "alert-circle-outline", tone: "warn" },
  "class.reminder": { name: "time-outline", tone: "warn" },
  "location.changed": { name: "location-outline", tone: "info" },
  "enrolment.requested": { name: "hand-left-outline", tone: "info" },
  "enrolment.expired": { name: "hourglass-outline", tone: "warn" },
  "enrolment.approved": { name: "checkmark-circle-outline", tone: "ok" },
  "enrolment.denied": { name: "close-circle-outline", tone: "bad" },
  "enrolment.cancelled": { name: "person-remove-outline", tone: "warn" },
  "enrolment.enrolled": { name: "person-add-outline", tone: "ok" },
  "enrolment.takenOut": { name: "person-remove-outline", tone: "bad" },
  "role.changed": { name: "shield-checkmark-outline", tone: "info" },
  "account.removed": { name: "person-remove-outline", tone: "bad" },
  "account.restored": { name: "person-add-outline", tone: "ok" },
  broadcast: { name: "megaphone-outline", tone: "info" },
};

const FALLBACK: NotificationIcon = { name: "notifications-outline", tone: "info" };

/** The glyph and tone of a notification's row; a type this version doesn't know gets a bell on the info tone. */
export const notificationIcon = (type: string): NotificationIcon =>
  Object.hasOwn(ICONS, type) ? ICONS[type] : FALLBACK;
