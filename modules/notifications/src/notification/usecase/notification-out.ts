import { PUSH_LOCALES, PushLocale } from "../../push-token/model";
import { Notification, NotificationParams, NotificationType } from "../model";
import { MessageSender, MessageSenderReader } from "../provider";

const DEFAULT_LOCALE: PushLocale = "pt-BR";
const ADMIN_MESSAGE_TYPES: readonly NotificationType[] = ["broadcast", "class.message"];

export interface AdminMessageSender {
  id: string;
  name: string;
  photoUrl: string | null;
  role: string;
  /** The number when the viewer may see it, otherwise null. */
  whatsappNumber: string | null;
}

/** What an admin wrote, on its own, and who sent it; `sender` is null when it can't be read. */
export interface AdminMessage {
  title: string;
  text: string;
  sender: AdminMessageSender | null;
}

export interface NotificationOut {
  id: string;
  type: NotificationType;
  params: NotificationParams;
  createdAt: string;
  read: boolean;
  /** Only for `broadcast` and `class.message`. */
  adminMessage: AdminMessage | null;
}

export function parseLocale(value: unknown): PushLocale | null {
  if (value === undefined) return DEFAULT_LOCALE;

  return (PUSH_LOCALES as readonly unknown[]).includes(value) ? (value as PushLocale) : null;
}

function isAdminMessage(notification: Notification): boolean {
  return ADMIN_MESSAGE_TYPES.includes(notification.type);
}

function senderIdOf(notification: Notification): string | null {
  const { senderId } = notification.params;

  return typeof senderId === "string" ? senderId : null;
}

/** The directory's rule: an approved person's number, when they share it or the viewer is an admin. */
function visibleNumber(sender: MessageSender, viewerIsAdmin: boolean): string | null {
  if (sender.status !== "approved" || !sender.whatsappNumber) return null;

  return sender.whatsappVisible || viewerIsAdmin ? sender.whatsappNumber : null;
}

function toSender(sender: MessageSender, viewerIsAdmin: boolean): AdminMessageSender {
  return {
    id: sender.id,
    name: sender.name,
    photoUrl: sender.photoUrl,
    role: sender.role,
    whatsappNumber: visibleNumber(sender, viewerIsAdmin),
  };
}

function toAdminMessage(
  notification: Notification,
  senders: Map<string, MessageSender>,
  viewerIsAdmin: boolean,
): AdminMessage {
  const sender = senders.get(senderIdOf(notification) as string);

  return {
    title: notification.params.title as string,
    text: notification.params.message as string,
    sender: sender ? toSender(sender, viewerIsAdmin) : null,
  };
}

/** Maps notifications to what the API answers, reading the senders of the admin messages among them at once. */
export async function toNotificationsOut(
  notifications: Notification[],
  messageSenderReader: MessageSenderReader,
  viewerIsAdmin: boolean,
): Promise<NotificationOut[]> {
  const senderIds = [
    ...new Set(
      notifications
        .filter(isAdminMessage)
        .map(senderIdOf)
        .filter((id): id is string => id !== null),
    ),
  ];
  const senders = senderIds.length > 0 ? await messageSenderReader.findSenders(senderIds) : new Map();

  return notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    params: notification.params,
    createdAt: notification.createdAt.toISOString(),
    read: notification.readAt !== null,
    adminMessage: isAdminMessage(notification)
      ? toAdminMessage(notification, senders, viewerIsAdmin)
      : null,
  }));
}
