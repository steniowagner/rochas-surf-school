import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";

import { ROLE_ACTION_LOOK, ROLE_ACTIONS } from "./person-role-actions.constants";
import type { PersonRoleActionsProps } from "./person-role-actions.types";

/** The admin's actions on a person's sheet: the role changes their role allows, then removing them from the platform. */
export function PersonRoleActions({ locale, role }: PersonRoleActionsProps) {
  const t = (key: string) => appT(locale, key);

  return (
    <div className="flex flex-col gap-1">
      {ROLE_ACTIONS[role].map((action) => {
        const { icon, danger } = ROLE_ACTION_LOOK[action];

        return (
          <div key={action} role="button" aria-label={t(`people.roleActions.${action}.title`)} className="flex min-h-12 items-center gap-3">
            <AppIcon name={icon} size={20} className={danger ? "text-bad" : "text-ink-2"} />
            <div className="flex flex-1 flex-col">
              <p className={`ds-text-list-title ${danger ? "text-bad" : "text-ink"}`}>{t(`people.roleActions.${action}.title`)}</p>
              <p className="ds-text-list-subtitle text-ink-2">{t(`people.roleActions.${action}.subtitle`)}</p>
            </div>
            <AppIcon name="Feather:chevron-right" size={18} className="text-ink-3" />
          </div>
        );
      })}
      <div role="button" aria-label={t("people.removeAction.title")} className="flex min-h-12 items-center gap-3">
        <AppIcon name="Feather:trash-2" size={20} className="text-bad" />
        <div className="flex flex-1 flex-col">
          <p className="ds-text-list-title text-bad">{t("people.removeAction.title")}</p>
          <p className="ds-text-list-subtitle text-ink-2">{t("people.removeAction.subtitle")}</p>
        </div>
        <AppIcon name="Feather:chevron-right" size={18} className="text-ink-3" />
      </div>
    </div>
  );
}
