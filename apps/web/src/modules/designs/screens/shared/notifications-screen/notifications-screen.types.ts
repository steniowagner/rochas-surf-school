import type { Locale } from "@/i18n/locales";

export type NotificationsState = "list" | "loading" | "empty" | "error" | "markAllFailed";

export type NotificationItem = { type: string; title: string; body?: string; time: string; read: boolean };

export type NotificationsScreenProps = {
  locale: Locale;
  state: NotificationsState;
  /** The in-app texts the backend writes for each type (spec 073 D-05). */
  items: NotificationItem[];
};
