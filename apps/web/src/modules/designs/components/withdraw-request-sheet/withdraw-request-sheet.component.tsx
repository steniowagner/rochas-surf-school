import { appT } from "@/modules/designs/i18n/app-t";

import { BottomModal } from "../bottom-modal";
import { Button } from "../button";

import type { WithdrawRequestSheetProps } from "./withdraw-request-sheet.types";

/** Asks before a pending request is withdrawn. */
export function WithdrawRequestSheet({ locale, loading = false }: WithdrawRequestSheetProps) {
  return (
    <BottomModal>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="ds-text-sheet-title text-ink">{appT(locale, "enrolment.withdrawSheet.title")}</h3>
          <p className="ds-text-body text-ink-2">{appT(locale, "enrolment.withdrawSheet.description")}</p>
        </div>
        <Button variant="danger" loading={loading}>{appT(locale, "enrolment.withdrawSheet.confirm")}</Button>
        <Button variant="ghost">{appT(locale, "enrolment.withdrawSheet.keep")}</Button>
      </div>
    </BottomModal>
  );
}
