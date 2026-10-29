import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { BottomModal } from "../bottom-modal";
import { Button } from "../button";

import type { DeleteAccountSheetProps } from "./delete-account-sheet.types";

/** Asks before the account is removed: it closes at once and can be reactivated for 30 days. */
export function DeleteAccountSheet({ locale, removing = false }: DeleteAccountSheetProps) {
  return (
    <BottomModal>
      <div className="mb-4 flex flex-col gap-1">
        <h3 className="ds-text-sheet-title text-ink">{appT(locale, "deleteAccountSheet.title")}</h3>
        <p className="ds-text-body text-ink-2">{appT(locale, "deleteAccountSheet.description")}</p>
      </div>
      <div className="flex flex-col gap-2.5">
        <Button variant="danger" loading={removing} icon={<AppIcon name="Ionicons:trash-outline" size={20} />}>{appT(locale, "deleteAccountSheet.confirm")}</Button>
        <Button variant="ghost">{appT(locale, "deleteAccountSheet.cancel")}</Button>
      </div>
    </BottomModal>
  );
}
