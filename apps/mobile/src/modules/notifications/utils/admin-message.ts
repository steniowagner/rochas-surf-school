import { AdminMessage, NotificationItem } from "../notifications.types";

/** What the message sheet shows of a notification with `adminMessage`; `null` for any other. */
export const toAdminMessage = (notification: NotificationItem): AdminMessage | null =>
  notification.adminMessage && {
    ...notification.adminMessage,
    createdAt: notification.createdAt,
    classId: notification.classId,
  };
