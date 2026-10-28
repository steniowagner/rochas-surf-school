import type { ClassMessageView, NoticeAudience } from "../notices.types";

export type UseSendNoticeScreenResult = {
  /** Opened with a class id: the message to that class instead of a notice (spec 069). */
  isClassMode: boolean;
  /** The class and its people, once loaded; `null` in notice mode and while the class loads or fails. */
  classView: ClassMessageView | null;
  /** The confirm sheet's line about who receives it. */
  confirmDescription: string;
  audience: NoticeAudience;
  title: string;
  message: string;
  /** The count for the audience or the class; `undefined` while loading or after an error. */
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
