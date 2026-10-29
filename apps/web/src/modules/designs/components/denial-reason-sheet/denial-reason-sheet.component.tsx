import { appT } from "@/modules/designs/i18n/app-t";

import { BottomModal } from "../bottom-modal";
import { Button } from "../button";

import type { DenialReasonSheetProps } from "./denial-reason-sheet.types";

/** Shows the reason the school gave for denying a request, as written. */
export function DenialReasonSheet({ locale, discipline, level, start, reason }: DenialReasonSheetProps) {
  const t = (key: string) => appT(locale, key);

  return (
    <BottomModal>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="ds-text-sheet-title text-ink">{t("enrolment.denialSheet.title")}</h3>
          <p className="ds-text-body text-ink-2">{`${t(`newClass.discipline.${discipline}`)} · ${t(`newClass.level.${level}`)} · ${start}`}</p>
        </div>
        <div className="flex flex-col gap-1 rounded-card bg-dim p-4">
          <p className="ds-text-section-label text-ink-2">{t("enrolment.denialSheet.label")}</p>
          <p className="ds-text-body text-ink">{reason ?? t("enrolment.denialSheet.noReason")}</p>
        </div>
        <Button variant="subtle">{t("enrolment.denialSheet.close")}</Button>
      </div>
    </BottomModal>
  );
}
