import { BottomModal } from "../bottom-modal";
import { Button } from "../button";

import type { ConfirmSheetProps } from "./confirm-sheet.types";

/** Asks before an accept decision is sent: the app's shared confirmation sheet. */
export function ConfirmSheet({ title, description, confirmLabel, confirmIcon, confirmVariant = "primary", cancelLabel, loading = false }: ConfirmSheetProps) {
  return (
    <BottomModal>
      <div className="mb-4 flex flex-col gap-1">
        <h3 className="ds-text-sheet-title text-ink">{title}</h3>
        <p className="ds-text-body text-ink-2">{description}</p>
      </div>
      <div className="flex flex-col gap-2.5">
        <Button variant={confirmVariant} loading={loading} icon={confirmIcon}>{confirmLabel}</Button>
        <Button variant="ghost">{cancelLabel}</Button>
      </div>
    </BottomModal>
  );
}
