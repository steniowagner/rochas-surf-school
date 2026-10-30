export type PersonAvatarProps = {
  name: string;
  photoUrl: string | null;
  /** `md` (48 pt) in the list, `lg` (64 pt) in the sheet. */
  size?: "md" | "lg";
};
