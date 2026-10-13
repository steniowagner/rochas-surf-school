export type SignOutSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export type UseSignOutSheetProps = Pick<SignOutSheetProps, "onClose">;
