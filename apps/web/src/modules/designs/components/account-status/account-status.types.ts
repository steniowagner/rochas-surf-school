import type { ReactNode } from "react";

import type { AppIconName } from "../app-icon";

export type AccountStatusTone = "bad" | "dim" | "sand";

export type AccountStatusProps = {
  tone: AccountStatusTone;
  icon: AppIconName;
  eyebrow: string;
  title: string;
  description: ReactNode;
  note?: { title: string; text: string };
  primaryAction?: ReactNode;
  useAnotherEmailLabel: string;
};
