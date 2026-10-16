import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";

import { getDateLocale } from "../../utils/calendar";
import { weekdayAbbreviation } from "../../utils/week";

import type { DayStripProps } from "./day-strip.types";

const MAX_DOTS = 3;

export function DayStrip({ days, selected, today, counts, onSelect }: DayStripProps) {
  const { i18n } = useTranslation();
  const locale = getDateLocale(i18n.language);

  return (
    <View className="flex-row gap-1">
      {days.map((day) => {
        const isSelected = day === selected;
        const isToday = day === today;
        const dots = Math.min(counts[day] ?? 0, MAX_DOTS);
        const number = isSelected
          ? "text-on-color"
          : isToday
            ? "text-sun"
            : "text-ink";

        return (
          <TouchableOpacity
            key={day}
            testID={`day-${day}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={() => onSelect(day)}
            className={`min-h-[64px] flex-1 items-center justify-center gap-1 rounded-card ${isSelected ? "bg-grape" : "bg-surface"}`}
          >
            <Text
              className={`ds-text-chip ${isSelected ? "text-on-color" : "text-ink-2"}`}
            >
              {weekdayAbbreviation(day, locale)}
            </Text>
            <Text className={`ds-text-day-number ${number}`}>{Number(day.slice(8))}</Text>
            <View className="h-1.5 flex-row gap-0.5">
              {Array.from({ length: dots }, (_, index) => (
                <View
                  key={index}
                  testID={`day-${day}-dot`}
                  className="h-1.5 w-1.5 rounded-full bg-lagoon"
                />
              ))}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
