import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { BottomModal } from "../bottom-modal";
import { CalendarMonthGrid } from "../calendar-month-grid";

import type { WeekPickerSheetProps } from "./week-picker-sheet.types";

/** A month to pick a day from; the week of the day picked becomes the selected one, drawn as a band across its row. */
export function WeekPickerSheet({ locale, caption, initials, weeks, selectedWeekIndex }: WeekPickerSheetProps) {
  const t = (key: string) => appT(locale, key);

  return (
    <BottomModal>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span role="button" aria-label={t("weekMonthCalendar.previousMonth")} className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink">
            <AppIcon name="Ionicons:chevron-back" size={18} />
          </span>
          <p data-testid="week-picker-month" className="ds-text-button flex-1 truncate text-center text-ink">
            {caption}
          </p>
          <span role="button" aria-label={t("weekMonthCalendar.nextMonth")} className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink">
            <AppIcon name="Ionicons:chevron-forward" size={18} />
          </span>
        </div>
        <CalendarMonthGrid initials={initials} weeks={weeks} selectedWeekIndex={selectedWeekIndex} dotPlacement="overlap" />
      </div>
    </BottomModal>
  );
}
