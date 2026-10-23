import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { CalendarMonthGrid } from "@/components/calendar-month-grid";
import { CalendarWeekRow } from "@/components/calendar-week-row";
import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import { useWeekMonthCalendar } from "./week-month-calendar.hook";
import type { WeekMonthCalendarProps } from "./week-month-calendar.types";

// The arrows and the pill are drawn at the designs' size, smaller than a touch target: this makes up the 44 pt.
const ARROW_HIT_SLOP = 4;
const PILL_HIT_SLOP = { top: 7, bottom: 7, left: 0, right: 0 };

/**
 * A week or a month to pick a day from. The pill in the middle of the header switches between the two; picking a day
 * never does, and the selected day is the one both views are drawn around. The parent owns the selection. With
 * `clearable`, the selection may be empty and the calendar keeps the week or month on screen itself.
 */
export function WeekMonthCalendar({
  selectedDate,
  today,
  markedDates,
  markedCounts,
  markedLabel,
  onSelectDate,
  onVisibleRangeChange,
  initialView,
  clearable,
  onClearSelection,
  onPeriodChange,
}: WeekMonthCalendarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { view, days, month, caption, toggleView, goPrevious, goNext, selectDate } =
    useWeekMonthCalendar({
      selectedDate,
      today,
      onSelectDate,
      onVisibleRangeChange,
      initialView,
      clearable,
      onClearSelection,
      onPeriodChange,
    });
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
          hitSlop={ARROW_HIT_SLOP}
          className="h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
        >
          <Ionicons name="chevron-back" size={18} color={theme.ink} />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-center justify-center gap-2">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t(isMonth ? "weekMonthCalendar.showWeek" : "weekMonthCalendar.showMonth")}
            accessibilityState={{ expanded: isMonth }}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={toggleView}
            hitSlop={PILL_HIT_SLOP}
            className={`shrink flex-row items-center justify-center gap-2 rounded-full border px-3 py-2 ${
              isMonth ? "border-grape bg-grape" : "border-line bg-dim"
            }`}
          >
            <Ionicons name="calendar-outline" size={15} color={pillColor} />
            <Text
              numberOfLines={1}
              className={`ds-text-pill shrink ${isMonth ? "text-on-color" : "text-ink"}`}
            >
              {caption}
            </Text>
            <Ionicons name={isMonth ? "chevron-up" : "chevron-down"} size={14} color={pillColor} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t(isMonth ? "weekMonthCalendar.nextMonth" : "weekMonthCalendar.nextWeek")}
          activeOpacity={BUTTON_ACTIVE_OPACITY}
          onPress={goNext}
          hitSlop={ARROW_HIT_SLOP}
          className="h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
        >
          <Ionicons name="chevron-forward" size={18} color={theme.ink} />
        </TouchableOpacity>
      </View>
      {isMonth ? (
        <CalendarMonthGrid
          month={month}
          selectedDate={selectedDate}
          today={today}
          markedDates={markedDates}
          markedCounts={markedCounts}
          markedLabel={markedLabel}
          onSelectDate={selectDate}
        />
      ) : (
        <CalendarWeekRow
          days={days}
          selectedDate={selectedDate}
          today={today}
          markedDates={markedDates}
          markedCounts={markedCounts}
          markedLabel={markedLabel}
          onSelectDate={selectDate}
        />
      )}
    </View>
  );
}
