import { useTranslation } from "react-i18next";

import { DenySheet } from "@/components/decision/deny-sheet";
import { ClassSummaryCard } from "@/modules/classes/components/class-summary-card";

import type { TakeOutSheetProps } from "./take-out-sheet.types";

const TAKE_OUT_REASON_MAX_LENGTH = 300;

/** Asks an admin to confirm taking a student out of a class, with an optional reason the student receives. */
export function TakeOutSheet({
  visible,
  trial = false,
  firstName,
  classSummary,
  loading,
  onConfirm,
  onClose,
}: TakeOutSheetProps) {
  const { t } = useTranslation();

  return (
    <DenySheet
      visible={visible}
      title={t(trial ? "takeOutSheet.guestTitle" : "takeOutSheet.title", { name: firstName })}
      summary={classSummary ? <ClassSummaryCard {...classSummary} /> : undefined}
      hint={t(trial ? "takeOutSheet.guestHint" : "takeOutSheet.hint")}
      hideReason={trial}
      hideConfirmIcon
      label={t("takeOutSheet.label")}
      showLabel
      placeholder={t("takeOutSheet.placeholder")}
      backLabel={t("takeOutSheet.back")}
      backVariant="ghost"
      confirmLabel={t("takeOutSheet.confirm")}
      maxLength={TAKE_OUT_REASON_MAX_LENGTH}
      loading={loading}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
