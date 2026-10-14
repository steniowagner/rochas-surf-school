import { ReactNode } from "react";

export type FormSectionProps = {
  label: string;
  /** Small text on the right of the label: a count, "só informativo", "pick at least 1"… */
  hint?: string;
  children: ReactNode;
};
