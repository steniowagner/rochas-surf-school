import type { Locale } from "@/i18n/locales";

/**
 * The school-wide notice: `empty` (everyone, nothing typed), `filled` (the students, ready to send) and `confirm`; the
 * message to a class, opened from its tools: `classMessage` and `classConfirm`.
 */
export type SendNoticeState = "empty" | "filled" | "confirm" | "classMessage" | "classConfirm";

export type SendNoticeScreenProps = {
  locale: Locale;
  state: SendNoticeState;
  /** The notice as the admin typed it (spec 072 D-04): a title and a message. */
  notice: { title: string; message: string };
};
