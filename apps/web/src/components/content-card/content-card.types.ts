import type { ReactNode } from "react";

export type ContentCardProps = {
  /** The card's label; a card without one shows only its content. */
  title?: string;
  children: ReactNode;
};
