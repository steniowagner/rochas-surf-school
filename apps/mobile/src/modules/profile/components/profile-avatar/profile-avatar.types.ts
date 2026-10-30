export type ProfileAvatarProps = {
  name: string;
  photoUrl: string | null;
  /** Shows a camera button over the avatar; pressing it calls this. */
  onChangePhoto?: () => void;
};
