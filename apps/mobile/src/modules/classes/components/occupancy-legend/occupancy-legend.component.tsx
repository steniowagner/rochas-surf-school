import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { LEGEND_ITEMS } from "./occupancy-legend.constants";

export function OccupancyLegend() {
  const { t } = useTranslation();

  return (
    <View
      testID="occupancy-legend"
      className="flex-row flex-wrap gap-x-3.5 gap-y-1.5"
    >
      {LEGEND_ITEMS.map(({ swatch, key }) => (
        <View key={key} className="flex-row items-center gap-1.5">
          <View
            testID={`occupancy-legend-swatch-${key}`}
            className={`h-2.5 w-2.5 rounded-swatch ${swatch}`}
          />
          <Text className="ds-text-occupancy text-ink-2">
            {t(`weeklyOccupancy.legend.${key}`)}
          </Text>
        </View>
      ))}
    </View>
  );
}
