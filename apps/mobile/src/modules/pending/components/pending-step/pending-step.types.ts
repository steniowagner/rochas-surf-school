import { ReactNode } from "react";

export type PendingStepState = "done" | "current" | "future";

export type PendingStepProps = {
  state: PendingStepState;
  title: string;
  /** Shown on the right of the row: a time label or a status pill. */
  trailing?: ReactNode;
};
