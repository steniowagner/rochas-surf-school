import type { RefObject } from "react";
import type { LayoutChangeEvent } from "react-native";
import type Animated from "react-native-reanimated";

import type { NoticeAudience } from "../notices.types";

export type NoticeField = "title" | "message";

export type UseSendNoticeScreenResult = {
  scrollRef: RefObject<Animated.ScrollView | null>;
  /** Reports where a field sits in the scroll content, so focusing it can scroll it into view. */
  onFieldLayout: (field: NoticeField, event: LayoutChangeEvent) => void;
  /** Scrolls the field above the keyboard, once the keyboard is up. */
  onFieldFocus: (field: NoticeField) => void;
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
