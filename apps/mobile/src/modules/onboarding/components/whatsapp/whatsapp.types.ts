import type { TextInputStatus } from "@/components/ui/text-input/text-input.types";

export type WhatsappNumberField = {
  value: string;
  status: TextInputStatus;
  errorMessage: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
};
