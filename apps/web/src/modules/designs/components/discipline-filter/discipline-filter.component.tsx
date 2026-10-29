import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";

import type { DisciplineFilterProps, DisciplineFilterValue } from "./discipline-filter.types";

const options: DisciplineFilterValue[] = ["all", "surf", "skate"];

/** The floating sport filter: a grape button at the bottom right, and the three options over a scrim while open. */
export function DisciplineFilter({ locale, value, open = false }: DisciplineFilterProps) {
  const t = (key: string) => appT(locale, key);

  return (
    <>
      {open ? <div data-testid="discipline-filter-scrim" className="absolute inset-0 z-10 bg-scrim" /> : null}
      <div className={`absolute bottom-28 right-5 z-10 flex flex-col items-end gap-2.5`}>
        {open
          ? options.map((option) => {
              const selected = option === value;

              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  className={`ds-text-pill flex h-11 items-center rounded-control border px-4 shadow-menu-option ${selected ? "border-grape bg-grape text-on-color" : "border-line bg-surface text-ink"}`}
                >
                  {t(`classesWeek.disciplineFilter.${option}`)}
                </button>
              );
            })
          : null}
        <button
          type="button"
          aria-label={t(open ? "classesWeek.disciplineFilter.close" : "classesWeek.disciplineFilter.open")}
          className="flex size-14 items-center justify-center rounded-card bg-grape text-on-color shadow-fab"
        >
          <AppIcon name={open ? "Ionicons:close" : "Ionicons:filter"} size={24} />
        </button>
      </div>
    </>
  );
}
