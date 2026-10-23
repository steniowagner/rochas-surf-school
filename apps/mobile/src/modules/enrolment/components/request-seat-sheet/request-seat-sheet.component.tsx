import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { Checkbox } from "@/components/ui/checkbox";
import { useTheme } from "@/hooks/use-theme";
import { CancellationRulesSheet } from "@/modules/cancellation-rules/components/cancellation-rules-sheet";

import { RequestSeatClassCard } from "../request-seat-class-card";

import { useRequestSeatSheet } from "./request-seat-sheet.hook";
import type { RequestSeatSheetProps } from "./request-seat-sheet.types";

/** AGENDA-03: the class, what happens to the request and the cancellation rule to accept before it is sent. */
export function RequestSeatSheet({
  visible,
  loading,
  waitingList,
  discipline,
  level,
  startsAt,
  endsAt,
  locationName,
  deadline,
  onConfirm,
  onClose,
}: RequestSeatSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const sheet = useRequestSeatSheet({ visible, discipline, onClose });

  return (
    <>
      <BottomModal visible={sheet.sheetVisible} onClose={sheet.handleClose}>
        <View className="gap-4">
          <Text className="ds-text-sheet-title text-ink">
            {waitingList
              ? t("enrolment.requestSheet.waitingListTitle")
              : t("enrolment.requestSheet.title")}
          </Text>
          <RequestSeatClassCard
            discipline={discipline}
            level={level}
            startsAt={startsAt}
            endsAt={endsAt}
            locationName={locationName}
          />
          <View className="flex-row items-center gap-3 rounded-card bg-warn-tint px-4 py-3">
            <Ionicons name="hourglass-outline" size={18} color={theme.warn} />
            <Text className="ds-text-list-title flex-1 text-ink">
              {waitingList
                ? t("enrolment.requestSheet.waitingListNote")
                : t("enrolment.requestSheet.note")}
            </Text>
          </View>
          <View className="overflow-hidden rounded-card border border-line bg-surface">
            <View className="flex-row items-center gap-3 px-4 py-3.5">
              {/* The tile of the class details' cancellation row. */}
              <View className="h-[34px] w-[34px] items-center justify-center rounded-checkbox bg-dim">
                <Ionicons name="close-circle-outline" size={17} color={theme.lagoon} />
              </View>
              <Text className="ds-text-body flex-1 text-ink">
                {!sheet.hasRule
                  ? t("enrolment.requestSheet.noRule")
                  : deadline
                    ? t("enrolment.requestSheet.deadline", { when: deadline })
                    : t("enrolment.requestSheet.noDeadline")}
              </Text>
            </View>
            {sheet.hasRule ? (
              <>
                <View className="h-px bg-line" />
                <View className="flex-row items-center gap-2 px-4 py-1.5">
                  <View className="flex-1">
                    <Checkbox
                      checked={sheet.accepted}
                      onChange={sheet.setAccepted}
                      label={t("enrolment.requestSheet.accept")}
                    />
                  </View>
                  <TouchableOpacity
                    accessibilityRole="link"
                    accessibilityLabel={t("enrolment.requestSheet.read")}
                    activeOpacity={BUTTON_ACTIVE_OPACITY}
                    onPress={sheet.openRules}
                    className="min-h-11 flex-row items-center gap-0.5 pl-2"
                  >
                    <Text className="ds-text-list-title text-lagoon">
                      {t("enrolment.requestSheet.read")}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.lagoon} />
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
          <Button
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
