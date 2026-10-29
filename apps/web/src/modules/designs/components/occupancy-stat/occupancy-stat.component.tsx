import type { OccupancyStatProps } from "./occupancy-stat.types";

/** One figure of the week's stats card, with its label under it. */
export function OccupancyStat({ value, label, valueClassName, hasDivider }: OccupancyStatProps) {
  return (
    <div data-testid="occupancy-stat" className={`flex min-w-0 flex-1 flex-col items-center py-3 ${hasDivider ? "border-l border-line" : ""}`}>
      <p className={`ds-text-day-number truncate ${valueClassName}`}>{value}</p>
      <p className="ds-text-chip truncate text-ink-2">{label}</p>
    </div>
  );
}
