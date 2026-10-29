import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { BottomModal } from "../bottom-modal";
import { Button } from "../button";

import type { SignOutSheetProps } from "./sign-out-sheet.types";

/** Asks before the person leaves the account. */
export function SignOutSheet({ locale }: SignOutSheetProps) {
  return (
    <BottomModal>
      <div className="mb-4 flex flex-col gap-1">
        <h3 className="ds-text-sheet-title text-ink">{appT(locale, "signOutSheet.title")}</h3>
        <p className="ds-text-body text-ink-2">{appT(locale, "signOutSheet.description")}</p>
      </div>
      <div className="flex flex-col gap-2.5">
        <Button variant="danger" icon={<AppIcon name="Ionicons:log-out-outline" size={20} />}>{appT(locale, "signOutSheet.confirm")}</Button>
        <Button variant="ghost">{appT(locale, "signOutSheet.cancel")}</Button>
      </div>
    </BottomModal>
  );
}
