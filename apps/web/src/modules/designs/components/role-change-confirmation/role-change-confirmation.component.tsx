import { appT } from "@/modules/designs/i18n/app-t";

import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { ROLE_ACTION_LOOK } from "../person-role-actions/person-role-actions.constants";

import type { RoleChangeConfirmationProps } from "./role-change-confirmation.types";

/** The person sheet's second step for a role change: what it does, and for a new admin whether they also teach. */
export function RoleChangeConfirmation({ locale, action, name, showSeatsNote }: RoleChangeConfirmationProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="ds-text-sheet-title text-ink">{t(`people.roleConfirm.${action}.title`, { name })}</h3>
        <p className="ds-text-body text-ink-2">{t(`people.roleConfirm.${action}.description`)}</p>
        {showSeatsNote ? <p className="ds-text-body text-ink-2">{t("people.roleConfirm.promoteAdmin.seatsNote")}</p> : null}
        {action === "promoteAdmin" ? <Checkbox checked={false} label={t("people.instructorFlag.label")} helper={t("people.instructorFlag.helper")} variant="boxed" /> : null}
      </div>
      <div className="flex flex-col gap-2">
        <Button variant={ROLE_ACTION_LOOK[action].danger ? "danger" : "primary"}>{t(`people.roleConfirm.${action}.confirm`)}</Button>
        <Button variant="ghost">{t("people.roleConfirm.back")}</Button>
      </div>
    </div>
  );
}
