export type ThemeSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export type UseThemeSheetProps = Pick<ThemeSheetProps, "onClose">;
