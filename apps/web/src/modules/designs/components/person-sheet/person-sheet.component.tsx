import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { BottomModal } from "../bottom-modal";
import { Checkbox } from "../checkbox";
import { Chip } from "../chip";
import { PersonAvatar } from "../person-avatar";
import { PersonRoleActions } from "../person-role-actions";
import { roleChips } from "../person-row/person-row.component";
import { RemoveConfirmation } from "../remove-confirmation";
import { RoleChangeConfirmation } from "../role-change-confirmation";

import type { PersonSheetProps } from "./person-sheet.types";

/** A person of the directory in a sheet: who they are, how to reach them, and for an admin what they can change. */
export function PersonSheet({ locale, name, role, whatsapp, email, canChangeRole = false, instructorFlag, step }: PersonSheetProps) {
  const t = (key: string) => appT(locale, key);
  // The name up to its first space, in the confirmations' titles.
  const firstName = name.split(" ")[0] ?? name;

  if (step) {
    return (
      <BottomModal>
        {step === "remove" ? (
          <RemoveConfirmation locale={locale} role={role} name={firstName} />
        ) : (
          <RoleChangeConfirmation locale={locale} action={step.roleAction} name={firstName} showSeatsNote={step.roleAction === "promoteAdmin" && role === "student"} />
        )}
      </BottomModal>
    );
  }

  return (
    <BottomModal>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <PersonAvatar name={name} size="lg" />
          <div className="flex flex-1 flex-col items-start gap-2">
            <h3 className="ds-text-sheet-title text-ink">{name}</h3>
            <Chip tone={roleChips[role]}>{t(`profile.role.${role}`)}</Chip>
          </div>
        </div>
        <div className="h-px bg-line" />
        {email ? (
          <div className="flex min-h-12 items-center gap-3">
            <AppIcon name="Feather:mail" size={20} className="text-ink-3" />
            <div className="flex flex-1 flex-col">
              <p className="ds-text-list-title text-ink">{t("people.email")}</p>
              <p className="ds-text-list-subtitle text-ink-2">{email}</p>
            </div>
          </div>
        ) : whatsapp ? (
          <div role="button" aria-label={t("people.whatsapp")} className="flex min-h-12 items-center gap-3">
            <AppIcon name="FontAwesome:whatsapp" size={20} className="text-lagoon" />
            <div className="flex flex-1 flex-col">
              <p className="ds-text-list-title text-ink">{t("people.whatsapp")}</p>
              <p className="ds-text-list-subtitle text-ink-2">{whatsapp}</p>
            </div>
            <AppIcon name="Feather:arrow-up-right" size={18} className="text-ink-3" />
          </div>
        ) : (
          <div aria-disabled="true" className="flex min-h-12 items-center gap-3">
            <AppIcon name="FontAwesome:whatsapp" size={20} className="text-ink-3" />
            <div className="flex flex-1 flex-col">
              <p className="ds-text-list-title text-ink-2">{t("people.whatsapp")}</p>
              <p className="ds-text-list-subtitle text-ink-2">{t("people.whatsappNotShared")}</p>
            </div>
          </div>
        )}
        {instructorFlag === undefined ? null : <Checkbox checked={instructorFlag} label={t("people.instructorFlag.label")} helper={t("people.instructorFlag.helper")} variant="boxed" />}
        {canChangeRole ? <PersonRoleActions locale={locale} role={role} /> : null}
        <span role="button" aria-label={t("common.close")} className="ds-text-button flex min-h-11 items-center justify-center text-ink">
          {t("common.close")}
        </span>
      </div>
    </BottomModal>
  );
}
