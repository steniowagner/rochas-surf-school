export type DeleteAccountSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export type UseDeleteAccountSheetProps = Pick<
  DeleteAccountSheetProps,
  "onClose"
>;
