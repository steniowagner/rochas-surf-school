import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { OccupancyStat } from "../occupancy-stat";

import { OccupancyStatsProps } from "./occupancy-stats.types";

/** The week's stats card: occupancy, seats taken out of the total, free seats and full classes. */
export function OccupancyStats({ stats }: OccupancyStatsProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-row rounded-card border border-line bg-surface">
      <OccupancyStat
        testID="occupancy-stat-occupancy"
        value={`${stats.percent}%`}
        label={t("weeklyOccupancy.stats.occupancy")}
        accessibilityLabel={t("weeklyOccupancy.stats.a11y.occupancy", {
          percent: stats.percent,
        })}
        valueClassName="text-grape"
        hasDivider={false}
      />
      <OccupancyStat
        testID="occupancy-stat-seats"
        value={`${stats.taken}/${stats.total}`}
        label={t("weeklyOccupancy.stats.seats")}
        accessibilityLabel={t("weeklyOccupancy.stats.a11y.seats", {
          taken: stats.taken,
          total: stats.total,
        })}
        valueClassName="text-ink"
        hasDivider
      />
      <OccupancyStat
        testID="occupancy-stat-free"
        value={String(stats.free)}
        label={t("weeklyOccupancy.stats.free")}
        accessibilityLabel={t("weeklyOccupancy.stats.a11y.free", {
          count: stats.free,
        })}
        valueClassName="text-lagoon"
        hasDivider
      />
      <OccupancyStat
        testID="occupancy-stat-full"
        value={String(stats.fullClasses)}
        label={t("weeklyOccupancy.stats.full")}
        accessibilityLabel={t("weeklyOccupancy.stats.a11y.full", {
          count: stats.fullClasses,
        })}
        valueClassName="text-bad"
        hasDivider
      />
    </View>
  );
}
