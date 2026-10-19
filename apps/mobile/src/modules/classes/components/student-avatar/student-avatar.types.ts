export type StudentAvatarProps = {
  name: string;
  /** `null` shows the initials. */
  photoUrl: string | null;
  /** Width and height, in points. */
  size: number;
  /** Draws the 2px `surface` ring that separates stacked avatars. */
  ringed?: boolean;
};
