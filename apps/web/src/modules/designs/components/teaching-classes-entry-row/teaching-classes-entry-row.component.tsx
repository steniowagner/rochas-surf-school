import { appT } from "@/modules/designs/i18n/app-t";
import { entryRowContainerClassName } from "@/modules/designs/utils/entry-row-container";

import { AppIcon } from "../app-icon";

import type { TeachingClassesEntryRowProps } from "./teaching-classes-entry-row.types";

/** The "Minhas aulas" row of the instructor's and the admin's home, with how many classes are assigned. */
export function TeachingClassesEntryRow({ locale, grouped, count }: TeachingClassesEntryRowProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const subtitle = count === null ? null : count === 0 ? t("teachingClasses.row.none") : t("teachingClasses.row.assigned", { count });

  return (
    <div className={entryRowContainerClassName(grouped)}>
      <div role="button" className="flex min-h-11 items-center gap-3 py-3">
        <AppIcon name="MaterialCommunityIcons:surfing" size={20} className="text-lagoon" />
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="ds-text-list-title text-ink">{t("teachingClasses.title")}</p>
          {subtitle ? <p className="ds-text-list-subtitle text-ink-2">{subtitle}</p> : null}
        </div>
        <AppIcon name="Ionicons:chevron-forward" size={18} className="text-ink-2" />
      </div>
    </div>
  );
}
