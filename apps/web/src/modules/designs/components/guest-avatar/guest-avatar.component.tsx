import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";

import type { GuestAvatarProps } from "./guest-avatar.types";

/** A trial guest: a person icon on a `sand` circle, since a guest has no account, photo or initials to show. */
export function GuestAvatar({ locale, size, ringed = false }: GuestAvatarProps) {
  return (
    <span
      role="img"
      aria-label={appT(locale, "classDetails.trialChip")}
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-sand text-ink-2 ${ringed ? "border-2 border-surface" : ""}`}
    >
      <AppIcon name="Feather:user" size={Math.round(size * 0.5)} />
    </span>
  );
}
