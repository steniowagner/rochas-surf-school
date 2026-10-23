import type { NotificationItem } from "../../notifications.types";

export type NotificationRowProps = {
  notification: NotificationItem;
  /** The time the relative label is counted from. */
  now: Date;
  onPress: (notification: NotificationItem) => void;
};

export type UseNotificationRowProps = Pick<NotificationRowProps, "notification" | "now">;
