import type { ReactNode } from "react";

import type { AppIconName } from "../app-icon";

export type ProfileRowProps = {
  icon: AppIconName;
  label: string;
  value?: string;
  /** A control in place of the value and the chevron (the push switch). */
  trailing?: ReactNode;
  /** The row opens something: it draws the chevron. */
  pressable?: boolean;
  hideChevron?: boolean;
  destructive?: boolean;
};
