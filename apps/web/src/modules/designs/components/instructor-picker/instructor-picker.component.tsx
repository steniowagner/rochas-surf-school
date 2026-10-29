import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { Button } from "../button";
import { PersonAvatar } from "../person-avatar";

import type { InstructorPickerProps } from "./instructor-picker.types";

/** Every approved instructor and admin as a row to tick; the ticked ones teach the batch. */
export function InstructorPicker({ locale, teachers, selectedIds, loading = false, error = false }: InstructorPickerProps) {
  const t = (key: string) => appT(locale, key);

  if (loading) {
    return (
      <div data-testid="instructors-loading" className="flex items-center justify-center py-6">
        <span role="status" className="size-5 animate-spin rounded-full border-2 border-grape border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <p className="ds-text-body text-center text-ink-2">{t("newClass.instructors.loadError")}</p>
        <Button variant="outline">{t("registrations.retry")}</Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      {teachers.map((teacher, index) => {
        const checked = selectedIds.includes(teacher.id);

        return (
          <div key={teacher.id} role="checkbox" aria-checked={checked} aria-label={teacher.name} className={`flex min-h-14 items-center gap-3 px-4 py-2 ${index > 0 ? "border-t border-line" : ""}`}>
            <PersonAvatar name={teacher.name} />
            <p className="ds-text-list-title flex-1 truncate text-ink">{teacher.name}</p>
            <span className={`flex size-6.5 items-center justify-center rounded-checkbox border-2 ${checked ? "border-grape bg-grape" : "border-input-line bg-input"}`}>
              {checked ? <AppIcon name="Ionicons:checkmark" size={18} className="text-on-color" /> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
