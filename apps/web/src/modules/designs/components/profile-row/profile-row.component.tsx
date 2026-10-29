import { AppIcon } from "../app-icon";

import type { ProfileRowProps } from "./profile-row.types";

/** One row of a profile card: a lagoon icon, the label, an optional value and a chevron; at least 48 points tall. */
export function ProfileRow({ icon, label, value, trailing, pressable = true, hideChevron = false, destructive = false }: ProfileRowProps) {
  return (
    <div role={pressable && !trailing ? "button" : undefined} aria-label={pressable && !trailing ? label : undefined} className="flex min-h-12 items-center gap-3 px-4">
      <AppIcon name={icon} size={20} className={destructive ? "text-bad" : "text-lagoon"} />
      <p className={`ds-text-list-title flex-1 ${destructive ? "text-bad" : "text-ink"}`}>{label}</p>
      {trailing}
      {!trailing && value ? <p className="ds-text-list-subtitle text-ink-2">{value}</p> : null}
      {!trailing && pressable && !hideChevron ? <AppIcon name="Ionicons:chevron-forward" size={18} className="text-ink-3" /> : null}
    </div>
  );
}
