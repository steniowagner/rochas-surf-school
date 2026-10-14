import type { ReactNode } from "react";

import type { TextInputStatus } from "@/components/ui/text-input/text-input.types";

export type WhatsappNumberValues = {
  /** E.164, the country code included. */
  whatsappNumber: string;
  whatsappVisible: boolean;
};

export type WhatsappNumberFormProps = {
  /** What sits above the card (an intro, usually). */
  header: ReactNode;
  /** The stored number in E.164; empty or missing starts with Brazil and an empty field. */
  initialNumber?: string | null;
  /** Whether the stored number is shown to students and instructors; missing starts hidden. */
  initialVisible?: boolean;
  /** Save is enabled only when the number or the switch differs from the initial values. */
  requireChange?: boolean;
  submitLabel: string;
  isSaving: boolean;
  onSubmit: (values: WhatsappNumberValues) => void;
};

export type UseWhatsappNumberFormProps = Pick<
  WhatsappNumberFormProps,
  "initialNumber" | "initialVisible" | "requireChange" | "isSaving" | "onSubmit"
>;

export type WhatsappNumberField = {
  value: string;
  status: TextInputStatus;
  errorMessage: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
};
