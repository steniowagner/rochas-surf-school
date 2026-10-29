import { AppIcon } from "../app-icon";

import type { HistoryListHeaderProps } from "./history-list-header.types";

/** Above the history's classes: the title at the left, and the period's caption or the selected day's chip at the right. */
export function HistoryListHeader({ title, caption, dayLabel, clearDayLabel }: HistoryListHeaderProps) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <h3 className="ds-text-section-label text-ink-2">{title}</h3>
      {dayLabel === null ? (
        <p className="ds-text-chip truncate text-ink-2">{caption}</p>
      ) : (
        <span role="button" aria-label={clearDayLabel} className="flex min-h-11 min-w-11 items-center">
          <span data-testid="history-day-chip" className="ds-text-chip flex items-center gap-1 rounded-full bg-info-tint px-2.5 py-1 text-lagoon">
            {dayLabel}
            <AppIcon name="Ionicons:close" size={13} />
          </span>
        </span>
      )}
    </div>
  );
}
