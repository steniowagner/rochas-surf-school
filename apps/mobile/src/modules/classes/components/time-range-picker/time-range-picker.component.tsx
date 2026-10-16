import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import { TimeRangeHint } from "../time-range-hint";

import { useTimeRangePicker } from "./time-range-picker.hook";
import { TimeRangePickerProps } from "./time-range-picker.types";

/** The time ranges of the batch as chips: tap to pick, "Novo horário" to add one that isn't suggested. */
export function TimeRangePicker({
  suggestions,
  added,
  selected,
  nowMinutes,
  onToggle,
  onAddPress,
}: TimeRangePickerProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { chips, showSuggestionsHint, showPastHint, showOverlapHint } =
    useTimeRangePicker({ suggestions, added, selected, nowMinutes });

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {chips.map(({ range, label, selected: isSelected, blocked }) => (
          <TouchableOpacity
            key={label}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: isSelected, disabled: blocked }}
            disabled={blocked}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={() => onToggle(range)}
            className={`min-h-11 justify-center rounded-full border px-4 ${
              isSelected ? "border-grape bg-grape" : "border-line bg-surface"
            } ${blocked ? "opacity-50" : ""}`}
          >
            <Text
              className={`ds-text-chip ${isSelected ? "text-on-color" : "text-ink"} ${
                blocked ? "line-through" : ""
              }`}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("newClass.timeRanges.add")}
          activeOpacity={BUTTON_ACTIVE_OPACITY}
          onPress={onAddPress}
          className="min-h-11 flex-row items-center gap-1.5 rounded-full border border-dashed border-input-line px-4"
        >
          <Ionicons name="add" size={16} color={theme.grape} />
          <Text className="ds-text-chip text-grape">
            {t("newClass.timeRanges.add")}
          </Text>
        </TouchableOpacity>
      </View>
      <View className="gap-1.5">
        {showSuggestionsHint ? (
          <TimeRangeHint>{t("newClass.timeRanges.hint")}</TimeRangeHint>
        ) : null}
        {showPastHint ? (
          <TimeRangeHint>{t("newClass.timeRanges.hintPast")}</TimeRangeHint>
        ) : null}
        {showOverlapHint ? (
          <TimeRangeHint>{t("newClass.timeRanges.hintOverlap")}</TimeRangeHint>
        ) : null}
      </View>
    </View>
  );
}
