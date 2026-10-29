import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { BottomModal } from "../bottom-modal";
import { Button } from "../button";

import type { DeleteSchoolRuleSheetProps } from "./delete-school-rule-sheet.types";

/** "Excluir esta regra?": the second step before a rule is gone for good and everyone accepts the rules again. */
export function DeleteSchoolRuleSheet({ locale, title }: DeleteSchoolRuleSheetProps) {
  const t = (key: string) => appT(locale, key);

  return (
    <BottomModal>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="ds-text-sheet-title text-ink">{t("manageSchoolRules.deleteSheet.title")}</h3>
          <p className="ds-text-list-title text-ink">{title}</p>
        </div>
        <div className="flex gap-2 rounded-control bg-sand p-3">
          <AppIcon name="Ionicons:information-circle-outline" size={18} className="text-ink-2" />
          <p className="ds-text-list-subtitle flex-1 text-ink-2">{t("manageSchoolRules.deleteSheet.note")}</p>
        </div>
        <Button variant="danger">{t("manageSchoolRules.sheet.delete")}</Button>
        <Button variant="ghost">{t("manageSchoolRules.sheet.cancel")}</Button>
      </div>
    </BottomModal>
  );
}
