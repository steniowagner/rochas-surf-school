import { appT } from "@/modules/designs/i18n/app-t";

import { BottomModal } from "../bottom-modal";
import { Button } from "../button";

import type { DeleteClassSheetProps } from "./delete-class-sheet.types";

/** Asks before an empty class is deleted, or says one with people can only be cancelled. */
export function DeleteClassSheet({ locale, variant, classLine }: DeleteClassSheetProps) {
  const t = (key: string) => appT(locale, key);
  const notEmpty = variant === "notEmpty";

  return (
    <BottomModal>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="ds-text-sheet-title text-ink">{t(notEmpty ? "deleteClass.notEmpty.title" : "deleteClass.title")}</h3>
          <p className="ds-text-list-title text-ink">{classLine}</p>
          <p className="ds-text-body text-ink-2">{t(notEmpty ? "deleteClass.notEmpty.description" : "deleteClass.description")}</p>
        </div>
        <Button variant="danger">{t(notEmpty ? "classTools.cancel" : "deleteClass.confirm")}</Button>
        <Button variant="ghost">{t("cancelClass.keep")}</Button>
      </div>
    </BottomModal>
  );
}
