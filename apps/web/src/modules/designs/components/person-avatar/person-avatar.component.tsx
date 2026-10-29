import type { PersonAvatarProps } from "./person-avatar.types";

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

/** The person's initials in a circle; no photo can be uploaded yet. */
export function PersonAvatar({ name, size = "md" }: PersonAvatarProps) {
  const large = size === "lg";

  return (
    <span role="img" aria-label={name} className={`flex shrink-0 items-center justify-center rounded-full bg-sand ${large ? "size-16" : "size-10"}`}>
      <span className={`text-grape ${large ? "ds-text-sheet-title" : "ds-text-list-title"}`}>{getInitials(name)}</span>
    </span>
  );
}
