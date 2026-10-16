import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

import { useTimeRangeSheet } from "./time-range-sheet.hook";
import { TimeRangeSheetProps } from "./time-range-sheet.types";

// The native picker only sizes itself to its content vertically; without a width inside a centered column its frame
// collapses to zero, so the wheels are drawn but never receive a touch.
const pickerStyle = { width: "100%" } as const;

/** "Novo horário": the start and the end of a range that is only for this batch. */
export function TimeRangeSheet(props: TimeRangeSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
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
            <DateTimePicker
              testID="time-range-start"
              style={pickerStyle}
              mode="time"
              display="spinner"
              is24Hour
              accentColor={theme.grape}
              value={start}
              onValueChange={changeStart}
            />
          </View>
          <View className="flex-1 items-center gap-1">
            <Text className="ds-text-section-label text-ink-2">
              {t("timeRangeSheet.end")}
            </Text>
            <DateTimePicker
              testID="time-range-end"
              style={pickerStyle}
              mode="time"
              display="spinner"
              is24Hour
              accentColor={theme.grape}
              value={end}
              onValueChange={changeEnd}
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
