import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import { CalendarDay } from "../calendar-day";
import { WeekdayFilter } from "../weekday-filter";

import { useDateRangeCalendar } from "./date-range-calendar.hook";
import { DateRangeCalendarProps } from "./date-range-calendar.types";

/** A month grid (Monday first) where the admin taps the first and the last day of the batch. */
export function DateRangeCalendar(props: DateRangeCalendarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    weeks,
    monthLabel,
    weekdayInitials,
    canGoPrevious,
    dayState,
    hint,
    isRange,
    goPrevious,
    goNext,
    selectDay,
    clear,
  } = useDateRangeCalendar(props);

  return (
    <View className="gap-3">
      <View className="gap-2 rounded-card border border-line bg-surface p-3">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("newClass.calendar.previousMonth")}
            accessibilityState={{ disabled: !canGoPrevious }}
            disabled={!canGoPrevious}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={goPrevious}
            className="h-11 w-11 items-center justify-center"
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={canGoPrevious ? theme.ink : theme.ink3}
            />
          </TouchableOpacity>
          <Text className="ds-text-list-title text-ink">{monthLabel}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("newClass.calendar.nextMonth")}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={goNext}
            className="h-11 w-11 items-center justify-center"
          >
            <Ionicons name="chevron-forward" size={20} color={theme.ink} />
          </TouchableOpacity>
        </View>
        <View className="flex-row">
          {weekdayInitials.map((initial, index) => (
            <Text
              key={index}
              className="ds-text-section-label flex-1 text-center text-ink-2"
            >
              {initial}
            </Text>
          ))}
        </View>
        {weeks.map((week) => (
          <View key={week.find((day) => day !== null)} className="flex-row">
            {week.map((date, index) =>
              date === null ? (
                <View key={`empty-${index}`} className="h-11 flex-1" />
              ) : (
                <CalendarDay
                  key={date}
                  date={date}
                  onPress={selectDay}
                  {...dayState(date)}
                />
              ),
            )}
          </View>
        ))}
      </View>
      <View className="min-h-11 flex-row items-center justify-between gap-3">
        <Text className="ds-text-list-subtitle flex-1 text-ink-2">
          {hint.kind === "start"
            ? t("newClass.calendar.start")
            : hint.kind === "pickEnd"
              ? t("newClass.calendar.pickEnd", { date: hint.date })
              : hint.text}
        </Text>
        {props.startDate !== null ? (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={clear}
            className="min-h-11 justify-center px-2"
          >
            <Text className="ds-text-chip text-grape">
              {t("newClass.calendar.clear")}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {isRange ? (
        <WeekdayFilter
          weekdays={props.weekdays}
          onChange={props.onWeekdaysChange}
        />
      ) : null}
    </View>
  );
}
