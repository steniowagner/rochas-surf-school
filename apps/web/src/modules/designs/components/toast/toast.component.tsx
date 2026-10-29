import { AppIcon } from "../app-icon";

import type { ToastProps } from "./toast.types";

const toneStyles = {
  success: { background: "bg-ok", icon: "Ionicons:checkmark-circle-outline" },
  error: { background: "bg-bad", icon: "Ionicons:alert-circle-outline" },
} as const;

export function Toast({ message, tone = "error" }: ToastProps) {
  const { background, icon } = toneStyles[tone];

  return (
    <div role="alert" className={`flex items-center gap-2.5 rounded-control px-4 py-3.5 text-on-color shadow-card ${background}`}>
      <AppIcon name={icon} size={22} />
      <p className="ds-text-list-title flex-1">{message}</p>
    </div>
  );
}
