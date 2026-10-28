import type { ReactNode } from "react";

export type TextInputProps = {
  icon?: ReactNode;
  value?: string;
  placeholder?: string;
  status?: "neutral" | "error";
  errorMessage?: string;
  clearable?: boolean;
  /** `false` draws the disabled field. */
  editable?: boolean;
};
