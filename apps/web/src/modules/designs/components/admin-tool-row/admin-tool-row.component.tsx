import { entryRowContainerClassName } from "@/modules/designs/utils/entry-row-container";

import { AppIcon } from "../app-icon";

import type { AdminToolRowProps } from "./admin-tool-row.types";

/** A row of the admin home's Tools card, laid out like the School rows: icon, title with its subtitle, a count of what waits and a chevron. */
export function AdminToolRow({ grouped, icon, title, subtitle, badge }: AdminToolRowProps) {
  return (
    <div className={entryRowContainerClassName(grouped)}>
      <div role="button" aria-label={title} className="flex min-h-11 items-center gap-3 py-3">
        <AppIcon name={icon} size={20} className="text-lagoon" />
        {subtitle ? (
          <div className="flex flex-1 flex-col gap-0.5">
            <p className="ds-text-list-title text-ink">{title}</p>
            <p className="ds-text-list-subtitle text-ink-2">{subtitle}</p>
          </div>
        ) : (
          // Two blank lines keep the row as tall as the ones with a subtitle, and the title sits centered over them.
          <div className="relative flex flex-1 flex-col justify-center gap-0.5">
            <div aria-hidden className="flex flex-col gap-0.5 opacity-0">
              <p className="ds-text-list-title">{" "}</p>
              <p className="ds-text-list-subtitle">{" "}</p>
            </div>
            <div className="absolute inset-0 flex items-center">
              <p className="ds-text-list-title text-ink">{title}</p>
            </div>
          </div>
        )}
        {badge ? (
          <span data-testid="admin-tool-row-badge" className="ds-text-badge flex h-5.5 min-w-5.5 items-center justify-center rounded-full bg-bad px-1.5 text-on-color">
            {badge}
          </span>
        ) : null}
        <AppIcon name="Ionicons:chevron-forward" size={18} className="text-ink-2" />
      </div>
    </div>
  );
}
