export type LanguageSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export type UseLanguageSheetProps = Pick<LanguageSheetProps, "onClose">;
