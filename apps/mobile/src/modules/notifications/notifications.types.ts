/** A notification as `GET /notifications` lists it: its text is already written in the requested language. */
export type NotificationItem = {
  id: string;
  // A type this version of the app may not know yet: it still shows its text.
  type: string;
  classId: string | null;
  title: string;
  // Empty when the notification has only a title.
  body: string;
  // ISO 8601, UTC.
  createdAt: string;
  read: boolean;
};

export type NotificationsPage = {
  items: NotificationItem[];
  page: number;
  perPage: number;
  total: number;
};

export type UnreadNotificationsCount = {
  count: number;
};
