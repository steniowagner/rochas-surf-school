import { AppIcon } from "../app-icon";

import type { StudentAvatarProps } from "./student-avatar.types";

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

export function StudentAvatar({ name, size, ringed = false, erased = false }: StudentAvatarProps) {
  return (
    <span
      aria-label={name}
      role="img"
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-sand text-ink-2 ${ringed ? "border-2 border-surface" : ""}`}
    >
      {erased ? (
        <AppIcon name="Feather:user" size={Math.round(size * 0.5)} />
      ) : (
        <span className="ds-text-chip text-ink" style={{ fontSize: Math.round(size * 0.38) }}>{getInitials(name)}</span>
      )}
    </span>
  );
}
