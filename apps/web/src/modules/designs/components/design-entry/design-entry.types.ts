import type { ReactNode } from "react";

export type DesignEntryProps = {
  /** `DS-<section>-<entry>`, from the design system inventory. */
  id: string;
  title: string;
  note?: string;
  children: ReactNode;
};
