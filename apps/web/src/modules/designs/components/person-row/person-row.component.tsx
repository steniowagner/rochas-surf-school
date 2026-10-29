import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { Chip } from "../chip";
import type { ChipTone } from "../chip/chip.types";
import { PersonAvatar } from "../person-avatar";

import type { PersonRole, PersonRowProps } from "./person-row.types";

export const roleChips: Record<PersonRole, ChipTone> = { student: "muted", instructor: "info", admin: "grape" };

/** One person of the directory: avatar, name, "since <month year>", role chip and a chevron. */
export function PersonRow({ locale, name, role, since, isFirst = false, isLast = false }: PersonRowProps) {
  return (
    <div
      role="button"
      aria-label={name}
      className={`flex min-h-16 items-center gap-3 border-x border-b border-line bg-surface px-4 py-3 ${isFirst ? "rounded-t-card border-t" : ""} ${isLast ? "rounded-b-card" : ""}`}
    >
      <PersonAvatar name={name} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="ds-text-list-title truncate text-ink">{name}</p>
        <p className="ds-text-list-subtitle text-ink-2">{appT(locale, "people.since", { date: since })}</p>
      </div>
      <Chip tone={roleChips[role]}>{appT(locale, `profile.role.${role}`)}</Chip>
      <AppIcon name="Ionicons:chevron-forward" size={18} className="text-ink-3" />
    </div>
  );
}
