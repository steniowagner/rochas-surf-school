import type { ReactNode } from "react";

export type FormSectionProps = {
  label: string;
  /** Small text on the right of the label: a count, "só informativo", "escolha pelo menos 1"… */
  hint?: string;
  /** A link on the right of the label, such as "Gerir". */
  actionLabel?: string;
  children: ReactNode;
};
