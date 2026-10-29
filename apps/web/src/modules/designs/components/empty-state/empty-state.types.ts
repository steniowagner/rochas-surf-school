import type { AppIconName } from "../app-icon";

export type EmptyStateProps = {
  icon: AppIconName;
  title: string;
  description: string;
  action?: { label: string; icon?: AppIconName };
};
