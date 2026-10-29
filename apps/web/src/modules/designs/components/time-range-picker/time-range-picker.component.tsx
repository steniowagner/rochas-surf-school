import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { TimeRangeHint } from "../time-range-hint";

import type { TimeRangePickerProps } from "./time-range-picker.types";

/** The time ranges of the batch as chips: tap to pick, "Novo horário" to add one that isn't suggested. */
export function TimeRangePicker({ locale, chips, showSuggestionsHint, showPastHint, showOverlapHint }: TimeRangePickerProps) {
  const t = (key: string) => appT(locale, key);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {chips.map(({ label, selected, blocked }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            aria-pressed={selected}
            disabled={blocked}
            className={`flex min-h-11 items-center rounded-full border px-4 ${selected ? "border-grape bg-grape" : "border-line bg-surface"} ${blocked ? "opacity-50" : ""}`}
          >
            <span className={`ds-text-chip ${selected ? "text-on-color" : "text-ink"} ${blocked ? "line-through" : ""}`}>{label}</span>
          </button>
        ))}
        <button type="button" aria-label={t("newClass.timeRanges.add")} className="flex min-h-11 items-center gap-1.5 rounded-full border border-dashed border-input-line px-4">
          <AppIcon name="Ionicons:add" size={16} className="text-grape" />
          <span className="ds-text-chip text-grape">{t("newClass.timeRanges.add")}</span>
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {showSuggestionsHint ? <TimeRangeHint>{t("newClass.timeRanges.hint")}</TimeRangeHint> : null}
        {showPastHint ? <TimeRangeHint>{t("newClass.timeRanges.hintPast")}</TimeRangeHint> : null}
        {showOverlapHint ? <TimeRangeHint>{t("newClass.timeRanges.hintOverlap")}</TimeRangeHint> : null}
      </div>
    </div>
  );
}
