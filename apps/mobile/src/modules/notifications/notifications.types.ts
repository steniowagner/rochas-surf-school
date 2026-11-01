import type { PeopleRole } from "@/modules/people/people.types";

export type AdminMessageSender = {
  id: string;
  name: string;
  photoUrl: string | null;
  role: PeopleRole;
  // Null when the viewer may not see it, or there is none.
  whatsappNumber: string | null;
};

/** What the message sheet shows: an admin's text, as written, and who sent it. */
export type AdminMessage = {
  title: string;
  text: string;
  // ISO 8601, UTC.
  createdAt: string;
  // The class it was sent to; null for a notice.
  classId: string | null;
  // Null when the sender can't be read: erased, or a message older than spec 082.
  sender: AdminMessageSender | null;
};

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
  // The admin's own text, without the class line of `body`; only for `broadcast` and `class.message`.
  adminMessage: Pick<AdminMessage, "title" | "text" | "sender"> | null;
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
