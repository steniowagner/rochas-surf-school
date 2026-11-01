import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";

import { TimeField } from "../time-field";

import { useTimeRangeSheet } from "./time-range-sheet.hook";
import { TimeRangeSheetProps } from "./time-range-sheet.types";

/** "Novo horário": the start and the end of a range that is only for this batch. */
export function TimeRangeSheet(props: TimeRangeSheetProps) {
  const { t } = useTranslation();
  const { start, end, valid, changeStart, changeEnd, submit, close } =
    useTimeRangeSheet(props);

  return (
    <BottomModal
      visible={props.visible}
      onClose={close}
      contentPanningEnabled={false}
    >
      <View className="gap-4">
        <View className="gap-1">
          <Text className="ds-text-sheet-title text-ink">
            {t("timeRangeSheet.title")}
          </Text>
          <Text className="ds-text-body text-ink-2">
            {t("timeRangeSheet.description")}
          </Text>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1 items-center gap-1">
            <Text className="ds-text-section-label text-ink-2">
              {t("timeRangeSheet.start")}
            </Text>
            <TimeField
              testID="time-range-start"
              label={t("timeRangeSheet.start")}
              value={start}
              onChange={changeStart}
            />
          </View>
          <View className="flex-1 items-center gap-1">
            <Text className="ds-text-section-label text-ink-2">
              {t("timeRangeSheet.end")}
            </Text>
            <TimeField
              testID="time-range-end"
              label={t("timeRangeSheet.end")}
              value={end}
              onChange={changeEnd}
            />
          </View>
        </View>
        {valid ? null : (
          <Text className="ds-text-list-subtitle text-center text-bad">
            {t("timeRangeSheet.endBeforeStart")}
          </Text>
        )}
        <Button variant="primary" disabled={!valid} onPress={submit}>
          {t("timeRangeSheet.submit")}
        </Button>
        <Button variant="ghost" onPress={close}>
          {t("common.cancel")}
        </Button>
      </View>
    </BottomModal>
  );
}
