import { appT } from "@/modules/designs/i18n/app-t";

import { BottomModal } from "../bottom-modal";
import { Button } from "../button";
import { ClassSummaryCard } from "../class-summary-card";

import type { SendNoticeConfirmSheetProps } from "./send-notice-confirm-sheet.types";

/** The final check before a notice or a class message goes out: how many people receive it, who they are, and the text itself. */
export function SendNoticeConfirmSheet({ locale, classSummary, description, count, title, message }: SendNoticeConfirmSheetProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);

  return (
    <BottomModal>
      <div>
        <h3 className="ds-text-sheet-title text-ink">{t("notices.confirm.title", { count })}</h3>
        {classSummary ? (
          <div className="mt-3">
            <ClassSummaryCard locale={locale} {...classSummary} />
          </div>
        ) : null}
        <p className="ds-text-sheet-description mt-2.5 text-ink-2">{description}</p>
        <div data-testid="notice-preview" className="mt-3.5 max-h-45 overflow-hidden rounded-control border border-line bg-surface px-3.75 py-3.25">
          <p className="ds-text-preview-title text-ink">{title}</p>
          <p className="ds-text-preview-body mt-1 text-ink-2">{message}</p>
        </div>
        <div className="mt-3.5 flex flex-col gap-2.5">
          <Button>{t("notices.confirm.send")}</Button>
          <Button variant="ghost">{t("notices.confirm.cancel")}</Button>
        </div>
      </div>
    </BottomModal>
  );
}
