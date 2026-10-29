import type { Locale } from "@/i18n/locales";

export type ConfirmCodeState = "counting" | "resend" | "wrongCode" | "verifying" | "errorToast";

export type ConfirmCodeScreenProps = {
  locale: Locale;
  state: ConfirmCodeState;
};
