import type { ReactNode } from "react";

export type StackHeaderProps = {
  title: string;
  /** The back button the stack header draws. */
  showBack?: boolean;
  /** `headerRight`: a HeaderButton. */
  right?: ReactNode;
};
