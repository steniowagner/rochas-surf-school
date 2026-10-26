import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { CalendarMonthGrid } from "@/components/calendar-month-grid";
import { BottomModal } from "@/components/ui/bottom-modal";
import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import { useWeekPickerSheet } from "./week-picker-sheet.hook";
import type { WeekPickerSheetProps } from "./week-picker-sheet.types";

// The arrows are drawn at the designs' size, smaller than a touch target: this makes up the 44 pt.
const ARROW_HIT_SLOP = 4;

/** A month to pick a day from; the week of the day picked becomes the selected one, drawn as a band across its row. */
export function WeekPickerSheet(props: WeekPickerSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { month, markedDates, caption, goPrevious, goNext, selectDate } =
    useWeekPickerSheet(props);

  return (
    <BottomModal visible={props.visible} onClose={props.onClose}>
      <View className="gap-4">
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("weekMonthCalendar.previousMonth")}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={goPrevious}
            hitSlop={ARROW_HIT_SLOP}
            className="h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
          >
            <Ionicons name="chevron-back" size={18} color={theme.ink} />
          </TouchableOpacity>
          <Text
            testID="week-picker-month"
            numberOfLines={1}
            className="ds-text-button flex-1 text-center text-ink"
          >
            {caption}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("weekMonthCalendar.nextMonth")}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={goNext}
            hitSlop={ARROW_HIT_SLOP}
            className="h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
          >
            <Ionicons name="chevron-forward" size={18} color={theme.ink} />
          </TouchableOpacity>
        </View>
        <CalendarMonthGrid
          month={month}
          selectedDate={null}
          selectedWeekStart={props.weekStart}
          dotPlacement="overlap"
          today={props.today}
          markedDates={markedDates}
          markedLabel={t("classesWeek.hasClasses")}
          onSelectDate={selectDate}
        />
      </View>
    </BottomModal>
  );
}
