import type { PushLocale } from "../../push-token/model";
import type { NotificationParams, NotificationType } from "../model";

export interface PushMessage {
  token: string;
  locale: PushLocale;
  type: NotificationType;
  params: NotificationParams;
  notificationId: string;
}

/** The result of one message, in Expo's shape: `ok` carries the ticket id, `error` may say why. */
export type PushSendTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message?: string; details?: { error?: string } };

export type PushReceipt =
  | { status: "ok" }
  | { status: "error"; message?: string; details?: { error?: string } };

export const DEVICE_NOT_REGISTERED = "DeviceNotRegistered";

export interface PushProvider {
  /** Sends every message; the tickets come back in the order of the messages. */
  send(messages: PushMessage[]): Promise<PushSendTicket[]>;
  /** The receipts Expo has for the ticket ids, by ticket id (an id with no receipt is absent). */
  getReceipts(ticketIds: string[]): Promise<Record<string, PushReceipt>>;
}
