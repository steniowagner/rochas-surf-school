export type ProfileAvatarProps = {
  name: string;
  /** Shows a camera button over the avatar; pressing it calls this. */
  onChangePhoto?: () => void;
};
