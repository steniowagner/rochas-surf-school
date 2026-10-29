import type { TeachingDayHeaderProps } from "./teaching-day-header.types";

/** The header of a day of "Minhas aulas": its name on the left and its short date on the right. */
export function TeachingDayHeader({ label, date }: TeachingDayHeaderProps) {
  return (
    <h4 aria-label={`${label}, ${date}`} className="flex items-baseline justify-between pt-4">
      <span className="ds-text-section-label text-ink-2">{label}</span>
      <span className="ds-text-list-subtitle text-ink-2">{date}</span>
    </h4>
  );
}
