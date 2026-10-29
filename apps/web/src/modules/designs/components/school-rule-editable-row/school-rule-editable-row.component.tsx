import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";

import type { SchoolRuleEditableRowProps } from "./school-rule-editable-row.types";

/** A rule of "Regras da escola": its text opens "Editar regra", and ↑ / ↓ move it one place. */
export function SchoolRuleEditableRow({ locale, rule, position, showDivider, moveUpDisabled, moveDownDisabled }: SchoolRuleEditableRowProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);

  return (
    <div className={`flex items-start gap-3 px-4 ${showDivider ? "border-b border-line" : ""}`}>
      <div role="button" aria-label={rule.title} className="flex flex-1 gap-3 py-3.5">
        <span className="ds-text-sheet-title w-9 text-sun">{String(position).padStart(2, "0")}</span>
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="ds-text-list-title text-ink">{rule.title}</p>
          <p className="ds-text-body text-ink-2">{rule.description}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 py-3.5">
        <button type="button" aria-label={t("manageSchoolRules.moveUp", { position })} disabled={moveUpDisabled} className="flex size-9 items-center justify-center rounded-icon-button border border-line bg-surface">
          <AppIcon name="Ionicons:chevron-up" size={18} className={moveUpDisabled ? "text-ink-3" : "text-ink"} />
        </button>
        <button type="button" aria-label={t("manageSchoolRules.moveDown", { position })} disabled={moveDownDisabled} className="flex size-9 items-center justify-center rounded-icon-button border border-line bg-surface">
          <AppIcon name="Ionicons:chevron-down" size={18} className={moveDownDisabled ? "text-ink-3" : "text-ink"} />
        </button>
      </div>
    </div>
  );
}
