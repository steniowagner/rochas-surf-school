import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";

import { useWeekdayFilter } from "./weekday-filter.hook";
import { WeekdayFilterProps } from "./weekday-filter.types";

/** "Nos dias": seven toggles, one per weekday; the days left on are the ones that get classes. */
export function WeekdayFilter({ weekdays, onChange }: WeekdayFilterProps) {
  const { t } = useTranslation();
  const { options, toggle } = useWeekdayFilter({ weekdays, onChange });

  return (
    <View className="gap-2">
      <Text className="ds-text-section-label text-ink-2">
        {t("newClass.weekdays.label")}
      </Text>
      <View className="flex-row gap-1">
        {options.map(({ weekday, label }) => {
          const selected = weekdays.includes(weekday);

          return (
            <TouchableOpacity
              key={weekday}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              activeOpacity={BUTTON_ACTIVE_OPACITY}
              onPress={() => toggle(weekday)}
              className={`min-h-11 flex-1 items-center justify-center rounded-full border ${
                selected ? "border-grape bg-grape" : "border-line bg-surface"
              }`}
            >
              <Text
                numberOfLines={1}
                className={`ds-text-chip ${selected ? "text-on-color" : "text-ink-2"}`}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
