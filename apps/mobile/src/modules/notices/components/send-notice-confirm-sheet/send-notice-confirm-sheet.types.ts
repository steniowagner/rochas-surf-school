export type SendNoticeConfirmSheetProps = {
  visible: boolean;
  /** Who receives it: the audience of a notice, or the class's people for a class message (spec 069). */
  description: string;
  count: number;
  /** The notice as it will be sent, shown in the preview card. */
  title: string;
  message: string;
  sending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};
