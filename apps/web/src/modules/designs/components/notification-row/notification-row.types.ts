export type NotificationTone = "info" | "ok" | "bad" | "warn";

export type NotificationRowProps = {
  /** The backend's notification type: it picks the glyph and the tone. */
  type: string;
  title: string;
  body?: string;
  /** "Agora", "há 2 h"… */
  time: string;
  read: boolean;
};
