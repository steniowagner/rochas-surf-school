import type { ReactNode } from "react";

export type DesignSectionProps = {
  /** "01", "02"… as printed in the section title. */
  number: string;
  title: string;
  description?: string;
  children: ReactNode;
};
