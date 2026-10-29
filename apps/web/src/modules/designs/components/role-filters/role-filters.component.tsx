import { appT } from "@/modules/designs/i18n/app-t";

import type { PersonRole } from "../person-row/person-row.types";

import type { RoleFiltersProps } from "./role-filters.types";

const roles: PersonRole[] = ["student", "instructor", "admin"];

/** One toggle per role: the list shows the people that have at least one of the selected roles. */
export function RoleFilters({ locale, selected }: RoleFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((role) => {
        const isSelected = selected.includes(role);

        return (
          <button
            key={role}
            type="button"
            aria-pressed={isSelected}
            className={`ds-text-chip flex min-h-11 items-center gap-1.5 rounded-full border px-4 ${isSelected ? "border-grape bg-grape text-on-color" : "border-line bg-surface text-ink"}`}
          >
            {appT(locale, `people.filter.${role}`)}
          </button>
        );
      })}
    </div>
  );
}
