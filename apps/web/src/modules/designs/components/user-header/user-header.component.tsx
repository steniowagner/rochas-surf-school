import { HeaderButton } from "../header-button";
import { StudentAvatar } from "../student-avatar";

import type { UserHeaderProps } from "./user-header.types";

export function UserHeader({ name, firstName, greeting, notificationsLabel, unreadCount }: UserHeaderProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="rounded-full shadow-icon-button">
        <StudentAvatar name={name} size={44} ringed />
      </span>
      <div className="flex-1">
        <p className="ds-text-greeting text-ink-2">{greeting}</p>
        <h2 className="ds-text-greeting-name truncate text-ink">{firstName}</h2>
      </div>
      <HeaderButton icon="Ionicons:notifications-outline" iconSize={22} label={notificationsLabel} badge={unreadCount} standalone />
    </div>
  );
}
