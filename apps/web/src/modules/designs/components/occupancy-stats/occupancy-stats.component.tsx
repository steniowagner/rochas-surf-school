import { appT } from "@/modules/designs/i18n/app-t";

import { OccupancyStat } from "../occupancy-stat";

import type { OccupancyStatsProps } from "./occupancy-stats.types";

/** The week's stats card: occupancy, seats taken out of the total, free seats and full classes. */
export function OccupancyStats({ locale, stats }: OccupancyStatsProps) {
  const t = (key: string) => appT(locale, key);

  return (
    <div className="flex rounded-card border border-line bg-surface">
      <OccupancyStat value={`${stats.percent}%`} label={t("weeklyOccupancy.stats.occupancy")} valueClassName="text-grape" hasDivider={false} />
      <OccupancyStat value={`${stats.taken}/${stats.total}`} label={t("weeklyOccupancy.stats.seats")} valueClassName="text-ink" hasDivider />
      <OccupancyStat value={String(stats.free)} label={t("weeklyOccupancy.stats.free")} valueClassName="text-lagoon" hasDivider />
      <OccupancyStat value={String(stats.fullClasses)} label={t("weeklyOccupancy.stats.full")} valueClassName="text-bad" hasDivider />
    </div>
  );
}
