import { appT } from "@/modules/designs/i18n/app-t";

import { BottomModal } from "../bottom-modal";
import { Button } from "../button";
import { TimeWheel } from "../time-wheel";

import type { TimeRangeSheetProps } from "./time-range-sheet.types";

const NOON = { hour: 12, minute: 0 };
const ONE_PM = { hour: 13, minute: 0 };

/** "Novo horário": the start and the end of a range that is only for this batch, on the native time spinners. */
export function TimeRangeSheet({ locale, start = NOON, end = ONE_PM }: TimeRangeSheetProps) {
  const t = (key: string) => appT(locale, key);
  const valid = end.hour * 60 + end.minute > start.hour * 60 + start.minute;

  return (
    <BottomModal>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="ds-text-sheet-title text-ink">{t("timeRangeSheet.title")}</h3>
          <p className="ds-text-body text-ink-2">{t("timeRangeSheet.description")}</p>
        </div>
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col items-center gap-1">
            <p className="ds-text-section-label text-ink-2">{t("timeRangeSheet.start")}</p>
            <TimeWheel label={t("timeRangeSheet.start")} {...start} />
          </div>
          <div className="flex flex-1 flex-col items-center gap-1">
            <p className="ds-text-section-label text-ink-2">{t("timeRangeSheet.end")}</p>
            <TimeWheel label={t("timeRangeSheet.end")} {...end} />
          </div>
        </div>
        {valid ? null : <p className="ds-text-list-subtitle text-center text-bad">{t("timeRangeSheet.endBeforeStart")}</p>}
        <Button variant="primary" disabled={!valid}>
          {t("timeRangeSheet.submit")}
        </Button>
        <Button variant="ghost">{t("common.cancel")}</Button>
      </div>
    </BottomModal>
  );
}
