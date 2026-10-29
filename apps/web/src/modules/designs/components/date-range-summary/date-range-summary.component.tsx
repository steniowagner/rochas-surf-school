import { appT } from "@/modules/designs/i18n/app-t";

import type { DateRangeSummaryProps } from "./date-range-summary.types";

/** What the calendar holds once a range is picked: the days taken out of it and how to take one out; before that, what to tap next. */
export function DateRangeSummary({ locale, from, to, excluded }: DateRangeSummaryProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const clear = (
    <span role="button" className="ds-text-chip flex items-center px-2 text-grape">
      {t("newClass.calendar.clear")}
    </span>
  );

  if (from === null) {
    return (
      <div className="flex min-h-11 items-center rounded-card border border-line bg-surface px-3">
        <p className="ds-text-list-subtitle text-ink-2">{t("newClass.calendar.start")}</p>
      </div>
    );
  }

  if (to === null) {
    return (
      <div className="flex min-h-11 items-center justify-between gap-3 rounded-card border border-line bg-surface pl-3 pr-1">
        <p className="ds-text-list-subtitle flex-1 text-ink-2">{t("newClass.calendar.pickEnd", { date: from })}</p>
        {clear}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="ds-text-section-label text-ink-2">{t("newClass.range.excluded")}</p>
          {clear}
        </div>
        {excluded.length === 0 ? (
          <p className="ds-text-list-subtitle text-ink-2">{t("newClass.range.noneExcluded")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {excluded.map(({ date, label }) => (
              <span key={date} data-testid={`excluded-${date}`} className="ds-text-chip rounded-full bg-sand px-3 py-1 text-ink-2 line-through">
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
      <p className="ds-text-list-subtitle text-ink-2">{t("newClass.range.description")}</p>
    </div>
  );
}
