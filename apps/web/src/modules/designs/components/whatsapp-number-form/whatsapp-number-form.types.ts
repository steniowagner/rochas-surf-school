import type { ReactNode } from "react";

export type WhatsappNumberFormProps = {
  /** What sits above the card (an intro, usually). */
  header: ReactNode;
  cardTitle: string;
  helper: string;
  hideNumberLabel: string;
  hideNumberHint: string;
  hidden: boolean;
  /** The country code the button prints, and its dial code. */
  country: string;
  dialCode: string;
  value?: string;
  placeholder: string;
  status?: "neutral" | "error";
  errorMessage?: string;
  submitLabel: string;
  canSubmit: boolean;
  saving?: boolean;
};
