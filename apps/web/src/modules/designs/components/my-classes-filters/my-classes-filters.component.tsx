import { appT } from "@/modules/designs/i18n/app-t";

import type { MyClassesFilter, MyClassesFiltersProps } from "./my-classes-filters.types";

const filters: MyClassesFilter[] = ["all", "pending", "confirmed", "ended"];

/** The status chips of "Minhas aulas", in one row; exactly one is selected. */
export function MyClassesFilters({ locale, selected }: MyClassesFiltersProps) {
  return (
    <div className="flex gap-2">
      {filters.map((filter) => {
        const isSelected = filter === selected;

        return (
          <button
            key={filter}
            type="button"
            aria-pressed={isSelected}
            className={`ds-text-chip flex min-h-11 items-center rounded-full border px-4 ${isSelected ? "border-grape bg-grape text-on-color" : "border-line bg-surface text-ink"}`}
          >
            {appT(locale, `myClasses.filters.${filter}`)}
          </button>
        );
      })}
    </div>
  );
}
