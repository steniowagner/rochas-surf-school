import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { BottomModal } from "../bottom-modal";
import { Button } from "../button";
import { TextArea } from "../text-area";
import { TextInput } from "../text-input";

import type { SchoolRuleSheetProps } from "./school-rule-sheet.types";

// The app's `SCHOOL_RULE_TITLE_MAX` and `SCHOOL_RULE_DESCRIPTION_MAX`.
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 300;

/** "Nova regra" / "Editar regra": a title and an explanation; saving asks everyone to accept the rules again. */
export function SchoolRuleSheet({ locale, mode, rule = { title: "", description: "" } }: SchoolRuleSheetProps) {
  const t = (key: string) => appT(locale, key);
  const editing = mode === "edit";

  return (
    <BottomModal>
      <div className="flex flex-col gap-4">
        <h3 className="ds-text-sheet-title text-ink">{t(editing ? "manageSchoolRules.sheet.editTitle" : "manageSchoolRules.sheet.addTitle")}</h3>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="ds-text-list-subtitle px-1 text-ink-2">{t("manageSchoolRules.sheet.titleLabel")}</p>
            <TextInput value={rule.title} placeholder={t("manageSchoolRules.sheet.titlePlaceholder")} />
            <p className="ds-text-list-subtitle px-1 text-right text-ink-2">{`${rule.title.length}/${TITLE_MAX}`}</p>
          </div>
          <TextArea label={t("manageSchoolRules.sheet.descriptionLabel")} placeholder={t("manageSchoolRules.sheet.descriptionPlaceholder")} value={rule.description} maxLength={DESCRIPTION_MAX} />
        </div>
        <div className="flex gap-2 rounded-control bg-sand p-3">
          <AppIcon name="Ionicons:information-circle-outline" size={18} className="text-ink-2" />
          <p className="ds-text-list-subtitle flex-1 text-ink-2">{t("manageSchoolRules.sheet.saveNote")}</p>
        </div>
        {/* "Salvar" waits for a change, so the edit form opens with it disabled; "Adicionar" waits for both fields. */}
        <Button variant="primary" disabled>
          {t(editing ? "manageSchoolRules.sheet.save" : "manageSchoolRules.sheet.add")}
        </Button>
        {editing ? <Button variant="outline">{t("manageSchoolRules.sheet.delete")}</Button> : null}
        <Button variant="ghost">{t("manageSchoolRules.sheet.cancel")}</Button>
      </div>
    </BottomModal>
  );
}
