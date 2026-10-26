import type { NoticeAudience } from "../../notices.types";

export type SendNoticeConfirmSheetProps = {
  visible: boolean;
  audience: NoticeAudience;
  count: number;
  sending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};
