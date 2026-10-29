import { appT } from "@/modules/designs/i18n/app-t";

import { Chip } from "../chip";
import { ProfileAvatar } from "../profile-avatar";

import type { ProfileHeaderProps } from "./profile-header.types";

/** The avatar, the name and a chip with the role. */
export function ProfileHeader({ locale, name, role }: ProfileHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <ProfileAvatar name={name} />
      <h2 className="ds-text-screen-title text-center text-ink">{name}</h2>
      <Chip tone="info">{appT(locale, `profile.role.${role}`)}</Chip>
    </div>
  );
}
