import { AppIcon } from "../app-icon";

import type { ClassRuleRowProps } from "./class-rule-row.types";

/** A row of the class's "Regras" card: an icon tile, an uppercase title, a bold value and a chevron. */
export function ClassRuleRow({ icon, title, value }: ClassRuleRowProps) {
  return (
    <div role="button" aria-label={title} className="flex min-h-11 items-center gap-3 px-3.5 py-3">
      <span className="flex size-8.5 items-center justify-center rounded-checkbox bg-dim text-lagoon">
        <AppIcon name={icon} size={17} />
      </span>
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="ds-text-section-label text-ink-2">{title}</p>
        {value ? <p className="ds-text-list-title truncate text-ink">{value}</p> : null}
      </div>
      <AppIcon name="Ionicons:chevron-forward" size={17} className="text-ink-3" />
    </div>
  );
}
