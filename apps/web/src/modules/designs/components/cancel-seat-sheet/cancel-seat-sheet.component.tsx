import { appT } from "@/modules/designs/i18n/app-t";

import { BottomModal } from "../bottom-modal";
import { Button } from "../button";

import type { CancelSeatSheetProps } from "./cancel-seat-sheet.types";

/** Asks before an approved seat is given up, with the deadline it can be cancelled until. */
export function CancelSeatSheet({ locale, deadline, loading = false }: CancelSeatSheetProps) {
  return (
    <BottomModal>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="ds-text-sheet-title text-ink">{appT(locale, "enrolment.cancelSeatSheet.title")}</h3>
          <p className="ds-text-body text-ink-2">{appT(locale, "enrolment.cancelSeatSheet.description", { deadline })}</p>
        </div>
        <Button variant="danger" loading={loading}>{appT(locale, "enrolment.cancelSeatSheet.confirm")}</Button>
        <Button variant="ghost">{appT(locale, "enrolment.cancelSeatSheet.keep")}</Button>
      </div>
    </BottomModal>
  );
}
