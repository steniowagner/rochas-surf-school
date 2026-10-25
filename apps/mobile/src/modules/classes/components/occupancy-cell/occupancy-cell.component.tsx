import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";

import { schoolTimeOf } from "../../utils/week";
import { getOccupancyCellLook } from "../../utils/weekly-occupancy";
import {
  CELL_CLASSES,
  SELECTED_BORDER_CLASSES,
} from "./occupancy-cell.constants";
import { OccupancyCellProps } from "./occupancy-cell.types";

export function OccupancyCell({
  item,
  weekday,
  dayNumber,
  selected,
  onPress,
}: OccupancyCellProps) {
  const { t } = useTranslation();
  const { tone, percent } = getOccupancyCellLook(item);
  const { fill, border, text } = CELL_CLASSES[tone];
  const cancelled = tone === "cancelled";
  const labelParams = {
    date: `${weekday} ${dayNumber}`,
    time: schoolTimeOf(item.startsAt),
    discipline: t(`newClass.discipline.${item.discipline}`),
    percent,
  };

  return (
    <TouchableOpacity
      testID={`occupancy-cell-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={t(
        cancelled
          ? "weeklyOccupancy.cell.cancelled"
          : "weeklyOccupancy.cell.active",
        labelParams,
      )}
      accessibilityState={{ selected }}
      activeOpacity={BUTTON_ACTIVE_OPACITY}
      onPress={() => onPress(item.id)}
      className="h-11 flex-1"
    >
      <View
        testID={`occupancy-cell-box-${item.id}`}
        className={`h-11 items-center justify-center rounded-occupancy-cell ${fill} ${
          selected ? SELECTED_BORDER_CLASSES : border
        }`}
      >
        <Text className={`ds-text-occupancy-cell ${text}`}>
          {cancelled ? t("weeklyOccupancy.cancelledCell") : `${percent}%`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
