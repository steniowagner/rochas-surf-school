import { ReactNode } from "react";

export type FormSectionProps = {
  label: string;
  /** Small text on the right of the label: a count, "só informativo", "pick at least 1"… */
  hint?: string;
  /** A link on the right of the label, such as "Gerir". */
  action?: { label: string; onPress: () => void };
  children: ReactNode;
};
