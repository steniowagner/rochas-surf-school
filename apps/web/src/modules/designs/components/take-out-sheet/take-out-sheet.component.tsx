import { appT } from "@/modules/designs/i18n/app-t";

import { DenySheet } from "../deny-sheet";

import type { TakeOutSheetProps } from "./take-out-sheet.types";

const TAKE_OUT_REASON_MAX_LENGTH = 300;

/** Asks an admin to confirm taking a student out of a class, with an optional reason the student receives. */
export function TakeOutSheet({ locale, trial = false, firstName, summary, reason }: TakeOutSheetProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);

  return (
    <DenySheet
      title={t(trial ? "takeOutSheet.guestTitle" : "takeOutSheet.title", { name: firstName })}
      hint={t(trial ? "takeOutSheet.guestHint" : "takeOutSheet.hint", { summary })}
      hideReason={trial}
      label={t("takeOutSheet.label")}
      showLabel
      placeholder={t("takeOutSheet.placeholder")}
      reason={reason}
      backLabel={t("takeOutSheet.back")}
      confirmLabel={t("takeOutSheet.confirm")}
      maxLength={TAKE_OUT_REASON_MAX_LENGTH}
    />
  );
}
