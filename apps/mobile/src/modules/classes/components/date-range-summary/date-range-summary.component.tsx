import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";

import { useDateRangeSummary } from "./date-range-summary.hook";
import { DateRangeSummaryProps } from "./date-range-summary.types";

/**
 * What the calendar holds once a range is picked: the days taken out of it and how to take one out. Before the
 * range is complete it says what to tap next.
 */
export function DateRangeSummary(props: DateRangeSummaryProps) {
  const { t } = useTranslation();
  const { from, to, excluded } = useDateRangeSummary(props);

  const clearButton = (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={BUTTON_ACTIVE_OPACITY}
      onPress={props.onClear}
      className="justify-center px-2"
    >
      <Text className="ds-text-chip text-grape">
        {t("newClass.calendar.clear")}
      </Text>
    </TouchableOpacity>
  );

  if (from === null) {
    return (
      <View className="min-h-11 justify-center rounded-card border border-line bg-surface px-3">
        <Text className="ds-text-list-subtitle text-ink-2">
          {t("newClass.calendar.start")}
        </Text>
      </View>
    );
  }

  if (to === null) {
    return (
      <View className="min-h-11 flex-row items-center justify-between gap-3 rounded-card border border-line bg-surface pl-3 pr-1">
        <Text className="ds-text-list-subtitle flex-1 text-ink-2">
          {t("newClass.calendar.pickEnd", { date: from })}
        </Text>
        {clearButton}
      </View>
    );
  }

  return (
    <View className="gap-3 rounded-card border border-line bg-surface p-3">
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="ds-text-section-label text-ink-2">
            {t("newClass.range.excluded")}
          </Text>
          {clearButton}
        </View>
        {excluded.length === 0 ? (
          <Text className="ds-text-list-subtitle text-ink-2">
            {t("newClass.range.noneExcluded")}
          </Text>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {excluded.map(({ date, label }) => (
              <View
                key={date}
                testID={`excluded-${date}`}
                className="rounded-full bg-sand px-3 py-1"
              >
                <Text className="ds-text-chip text-ink-2 line-through">
                  {label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Text className="ds-text-list-subtitle text-ink-2">
        {t("newClass.range.description")}
      </Text>
    </View>
  );
}
