export type StudentAvatarProps = {
  /** The accessibility label, and the source of the initials. */
  name: string;
  /** `null` shows the initials. */
  photoUrl: string | null;
  /** Width and height, in points. */
  size: number;
  /** Draws the 2px `surface` ring that separates stacked avatars. */
  ringed?: boolean;
  /** An erased person: a person icon, as for a guest, instead of the photo or initials. */
  erased?: boolean;
};
