import { appT } from "@/modules/designs/i18n/app-t";

import { Button } from "../button";

import type { RemoveConfirmationProps } from "./remove-confirmation.types";

/** The person sheet's second step before someone is removed from the platform. */
export function RemoveConfirmation({ locale, role, name }: RemoveConfirmationProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="ds-text-sheet-title text-ink">{t("people.removeConfirm.title", { name })}</h3>
        <p className="ds-text-body text-ink-2">{t(role === "student" ? "people.removeConfirm.student" : "people.removeConfirm.staff")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Button variant="danger">{t("people.removeConfirm.confirm")}</Button>
        <Button variant="ghost">{t("people.removeConfirm.back")}</Button>
      </div>
    </div>
  );
}
