import { AppIcon } from "../app-icon";

import type { TimeRangeHintProps } from "./time-range-hint.types";

/** One rule under the time ranges: a small info icon beside the text. */
export function TimeRangeHint({ children }: TimeRangeHintProps) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex h-4 items-center">
        <AppIcon name="Ionicons:information-circle-outline" size={14} className="text-ink-2" />
      </span>
      <p className="ds-text-list-subtitle flex-1 text-ink-2">{children}</p>
    </div>
  );
}
