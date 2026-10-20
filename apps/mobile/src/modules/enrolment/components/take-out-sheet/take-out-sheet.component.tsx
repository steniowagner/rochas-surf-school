import { useTranslation } from "react-i18next";

import { DenySheet } from "@/components/decision/deny-sheet";

import type { TakeOutSheetProps } from "./take-out-sheet.types";

const TAKE_OUT_REASON_MAX_LENGTH = 300;

/** Asks an admin to confirm taking a student out of a class, with an optional reason the student receives. */
export function TakeOutSheet({
  visible,
  firstName,
  summary,
  loading,
  onConfirm,
  onClose,
}: TakeOutSheetProps) {
  const { t } = useTranslation();

  return (
    <DenySheet
      visible={visible}
      title={t("takeOutSheet.title", { name: firstName })}
      hint={t("takeOutSheet.hint", { summary })}
      label={t("takeOutSheet.label")}
      placeholder={t("takeOutSheet.placeholder")}
      backLabel={t("takeOutSheet.back")}
      confirmLabel={t("takeOutSheet.confirm")}
      maxLength={TAKE_OUT_REASON_MAX_LENGTH}
      loading={loading}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
