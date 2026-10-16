import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { CalendarMonthGrid } from "@/components/calendar-month-grid";
import { CalendarWeekRow } from "@/components/calendar-week-row";
import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import { useWeekMonthCalendar } from "./week-month-calendar.hook";
import type { WeekMonthCalendarProps } from "./week-month-calendar.types";

/**
 * A week or a month to pick a day from. The pill in the middle of the header switches between the two; picking a day
 * never does, and the selected day is the one both views are drawn around. The parent owns the selection.
 */
export function WeekMonthCalendar({
  selectedDate,
  today,
  markedDates,
  markedLabel,
  onSelectDate,
  onVisibleRangeChange,
}: WeekMonthCalendarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { view, days, month, caption, showToday, toggleView, goPrevious, goNext, goToday } =
    useWeekMonthCalendar({ selectedDate, today, onSelectDate, onVisibleRangeChange });
  const isMonth = view === "month";
  const pillColor = isMonth ? theme.onColor : theme.ink;

  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t(isMonth ? "weekMonthCalendar.previousMonth" : "weekMonthCalendar.previousWeek")}
          activeOpacity={BUTTON_ACTIVE_OPACITY}
          onPress={goPrevious}
          className="h-11 w-11 items-center justify-center rounded-full border border-line bg-surface"
        >
          <Ionicons name="chevron-back" size={20} color={theme.ink} />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-center justify-center gap-2">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t(isMonth ? "weekMonthCalendar.showWeek" : "weekMonthCalendar.showMonth")}
            accessibilityState={{ expanded: isMonth }}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={toggleView}
            className={`min-h-11 shrink flex-row items-center justify-center gap-2 rounded-full px-4 ${
              isMonth ? "bg-grape" : "border border-line bg-surface"
            }`}
          >
            <Ionicons name="calendar-outline" size={18} color={pillColor} />
            <Text
              numberOfLines={1}
              className={`ds-text-button shrink ${isMonth ? "text-on-color" : "text-ink"}`}
            >
              {caption}
            </Text>
            <Ionicons name={isMonth ? "chevron-up" : "chevron-down"} size={16} color={pillColor} />
          </TouchableOpacity>
          {showToday ? (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={BUTTON_ACTIVE_OPACITY}
              onPress={goToday}
              className="min-h-11 justify-center rounded-full bg-grape-tint px-4"
            >
              <Text className="ds-text-button text-grape">{t("weekMonthCalendar.today")}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t(isMonth ? "weekMonthCalendar.nextMonth" : "weekMonthCalendar.nextWeek")}
          activeOpacity={BUTTON_ACTIVE_OPACITY}
          onPress={goNext}
          className="h-11 w-11 items-center justify-center rounded-full border border-line bg-surface"
        >
          <Ionicons name="chevron-forward" size={20} color={theme.ink} />
        </TouchableOpacity>
      </View>
      {isMonth ? (
        <CalendarMonthGrid
          month={month}
          selectedDate={selectedDate}
          today={today}
          markedDates={markedDates}
          markedLabel={markedLabel}
          onSelectDate={onSelectDate}
        />
      ) : (
        <CalendarWeekRow
          days={days}
          selectedDate={selectedDate}
          today={today}
          markedDates={markedDates}
          markedLabel={markedLabel}
          onSelectDate={onSelectDate}
        />
      )}
    </View>
  );
}
