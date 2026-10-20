import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TextButton } from "@/components/ui/text-button";
import { CancellationRulesSheet } from "@/modules/cancellation-rules/components/cancellation-rules-sheet";

import { useRequestSeatSheet } from "./request-seat-sheet.hook";
import type { RequestSeatSheetProps } from "./request-seat-sheet.types";

/** AGENDA-03: the class, the deadline and the cancellation rule to accept before the request is sent. */
export function RequestSeatSheet({
  visible,
  loading,
  waitingList,
  summary,
  discipline,
  deadline,
  onConfirm,
  onClose,
}: RequestSeatSheetProps) {
  const { t } = useTranslation();
  const sheet = useRequestSeatSheet({ visible, discipline, onClose });
  const title = waitingList
    ? t("enrolment.requestSheet.waitingListTitle")
    : t("enrolment.requestSheet.title");

  return (
    <>
      <BottomModal visible={sheet.sheetVisible} onClose={sheet.handleClose}>
        <View className="gap-4">
          <View className="gap-1">
            <Text className="ds-text-sheet-title text-ink">{title}</Text>
            <Text className="ds-text-body text-ink-2">
              {t(
                waitingList
                  ? "enrolment.requestSheet.waitingListLine"
                  : "enrolment.requestSheet.line",
                { summary },
              )}
            </Text>
          </View>
          <View className="gap-2">
            <Text className="ds-text-section-label text-ink-2">
              {t("enrolment.requestSheet.ruleLabel", {
                discipline: t(`newClass.discipline.${discipline}`),
              })}
            </Text>
            <View className="gap-1 rounded-card border border-line bg-surface p-4">
              <Text className="ds-text-list-title text-ink">
                {!sheet.hasRule
                  ? t("enrolment.requestSheet.noRule")
                  : deadline
                    ? t("enrolment.requestSheet.deadline", { when: deadline })
                    : t("enrolment.requestSheet.noDeadline")}
              </Text>
              {sheet.hasRule ? (
                <View className="flex-row items-center gap-2">
                  <View className="flex-1">
                    <Checkbox
                      checked={sheet.accepted}
                      onChange={sheet.setAccepted}
                      label={t("enrolment.requestSheet.accept")}
                    />
                  </View>
                  <TextButton className="ds-text-list-subtitle text-grape" onPress={sheet.openRules}>
                    {t("enrolment.requestSheet.read")}
                  </TextButton>
                </View>
              ) : null}
            </View>
          </View>
          <Button
            variant={waitingList ? "dark" : "primary"}
            loading={loading}
            disabled={!sheet.canSubmit}
            onPress={onConfirm}
          >
            {waitingList
              ? t("enrolment.requestSheet.submitWaitingList")
              : t("enrolment.requestSheet.submit")}
          </Button>
          <Button variant="ghost" onPress={onClose}>
            {t("enrolment.requestSheet.later")}
          </Button>
        </View>
      </BottomModal>
      <CancellationRulesSheet visible={sheet.rulesVisible} onClose={sheet.closeRules} />
    </>
  );
}
