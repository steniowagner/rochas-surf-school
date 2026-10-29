import { AppIcon } from "../app-icon";
import { StudentAvatar } from "../student-avatar";

import type { ClassStudentRowProps } from "./class-student-row.types";

/** A student in the class's list: the row opens their person sheet (an erased one can't be opened). */
export function ClassStudentRow({ name, erased = false }: ClassStudentRowProps) {
  return (
    <div role={erased ? undefined : "button"} aria-label={erased ? undefined : name} className="flex min-h-11 items-center gap-3 border-t border-line px-3.5 py-2.5">
      <StudentAvatar name={name} size={32} erased={erased} />
      <p className="ds-text-list-title flex-1 truncate text-ink">{name}</p>
      {erased ? null : <AppIcon name="Ionicons:chevron-forward" size={16} className="text-ink-3" />}
    </div>
  );
}
