import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

const DAYS = [0, 1, 2, 3, 4, 5, 6];
const ROWS = [0, 1, 2, 3];

/** The stats card and the OccupancyMap while the week loads: the card, the header row and 4 rows of cells with the map's measures. */
export function OccupancyMapSkeleton() {
  const { t } = useTranslation();

  return (
    <View
      testID="occupancy-map-skeleton"
      accessible
      accessibilityLabel={t("weeklyOccupancy.loading")}
      className="gap-5"
    >
      <View testID="occupancy-stats-skeleton">
        <Skeleton className="h-[72px] w-full rounded-card" />
      </View>
      <View className="gap-1">
        <View className="flex-row gap-1">
          <View className="w-11" />
          {DAYS.map((day) => (
            <View key={day} className="flex-1 items-center">
              <Skeleton className="h-[38px] w-full rounded" />
            </View>
          ))}
        </View>
        {ROWS.map((row) => (
          <View key={row} className="flex-row gap-1">
            <View className="h-11 w-11 justify-center">
              <Skeleton className="h-4 w-9 rounded" />
            </View>
            {DAYS.map((day) => (
              <Skeleton
                key={day}
                className="h-11 flex-1 rounded-occupancy-cell"
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
