import type { NoticeAudience } from "../../notices.types";

export type SendNoticeConfirmSheetProps = {
  visible: boolean;
  audience: NoticeAudience;
  count: number;
  /** The notice as it will be sent, shown in the preview card. */
  title: string;
  message: string;
  sending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};
