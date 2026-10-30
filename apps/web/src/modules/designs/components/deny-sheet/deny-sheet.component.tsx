import { AppIcon } from "../app-icon";
import { BottomModal } from "../bottom-modal";
import { Button } from "../button";
import { TextArea } from "../text-area";

import type { DenySheetProps } from "./deny-sheet.types";

export function DenySheet({ title, summary, hint, label, showLabel = false, hideReason = false, hideConfirmIcon = false, placeholder, reason = "", maxLength, backLabel, backVariant = "subtle", confirmLabel, loading = false }: DenySheetProps) {
  return (
    <BottomModal>
      <div className="flex flex-col gap-4">
        <div className={`flex flex-col ${summary ? "gap-3" : "gap-1"}`}>
          <h3 className="ds-text-sheet-title text-ink">{title}</h3>
          {summary}
          <p className="ds-text-body text-ink-2">{hint}</p>
        </div>
        {hideReason ? null : <TextArea value={reason} maxLength={maxLength} label={showLabel ? label : undefined} placeholder={placeholder} />}
        <div className="flex flex-col gap-2">
          <Button variant="danger" loading={loading} icon={hideConfirmIcon ? undefined : <AppIcon name="Feather:x-circle" size={16} />}>{confirmLabel}</Button>
          <Button variant={backVariant}>{backLabel}</Button>
        </div>
      </div>
    </BottomModal>
  );
}
