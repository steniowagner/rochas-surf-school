import { AppIcon } from "../app-icon";

import type { ProfileAvatarProps } from "./profile-avatar.types";

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

/** The person's initials in a 112-point circle, with the camera button when the screen can change the photo. */
export function ProfileAvatar({ name, changePhotoLabel }: ProfileAvatarProps) {
  return (
    <div className="relative size-28">
      <span role="img" aria-label={name} className="flex size-28 items-center justify-center rounded-full bg-sand">
        <span className="ds-text-screen-title text-grape">{getInitials(name)}</span>
      </span>
      {changePhotoLabel ? (
        <span role="button" aria-label={changePhotoLabel} className="absolute bottom-0 right-0 flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink">
          <AppIcon name="Ionicons:camera-outline" size={20} />
        </span>
      ) : null}
    </div>
  );
}
