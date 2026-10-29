import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";

import type { GuestsWarningProps } from "./guests-warning.types";

/** Tells an admin that the trial guests of a class have no account, so they won't hear about an edit or a cancellation. */
export function GuestsWarning({ locale, count }: GuestsWarningProps) {
  if (count === 0) {
    return null;
  }

  return (
    <div data-testid="guests-warning" className="flex items-center gap-3 rounded-card bg-warn-tint p-4">
      <AppIcon name="Ionicons:alert-circle-outline" size={20} className="text-ink" />
      <p className="ds-text-list-subtitle flex-1 text-ink">{appT(locale, "classDetails.guestsWarning", { count })}</p>
    </div>
  );
}
