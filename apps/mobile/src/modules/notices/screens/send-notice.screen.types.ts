import type { NoticeAudience } from "../notices.types";

export type UseSendNoticeScreenResult = {
  audience: NoticeAudience;
  title: string;
  message: string;
  /** The count for the audience; `undefined` while loading or after an error. */
  count: number | undefined;
  isCountLoading: boolean;
  isCountError: boolean;
  canSend: boolean;
  isSending: boolean;
  isConfirming: boolean;
  setAudience: (audience: NoticeAudience) => void;
  setTitle: (title: string) => void;
  setMessage: (message: string) => void;
  askToConfirm: () => void;
  closeConfirm: () => void;
  confirm: () => void;
};
