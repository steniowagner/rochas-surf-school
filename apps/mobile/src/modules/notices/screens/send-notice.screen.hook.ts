import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, LayoutChangeEvent } from "react-native";
import type Animated from "react-native-reanimated";

import { useAlertMessage } from "@/providers/alert-message";
import { useHeaderInset } from "@/navigation/stack-header";

import { useNoticeRecipientsCount } from "../hooks/use-notice-recipients-count.hook";
import { useSendNotice } from "../hooks/use-send-notice.hook";
import { NoticeAudience } from "../notices.types";

import { NoticeField, UseSendNoticeScreenResult } from "./send-notice.screen.types";

// Space left above a field scrolled into view.
const FIELD_SCROLL_MARGIN = 16;

export const useSendNoticeScreen = (): UseSendNoticeScreenResult => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const sendNotice = useSendNotice();
  const [audience, setAudience] = useState<NoticeAudience>("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const recipients = useNoticeRecipientsCount(audience);
  const headerInset = useHeaderInset();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const fieldTops = useRef<Record<NoticeField, number>>({ title: 0, message: 0 });
  const keyboardListener = useRef<{ remove: () => void } | null>(null);

  useEffect(() => () => keyboardListener.current?.remove(), []);

  const onFieldLayout = (field: NoticeField, event: LayoutChangeEvent) => {
    fieldTops.current[field] = event.nativeEvent.layout.y;
  };

  const scrollToField = (field: NoticeField) =>
    scrollRef.current?.scrollTo({
      y: Math.max(fieldTops.current[field] - headerInset - FIELD_SCROLL_MARGIN, 0),
      animated: true,
    });

  // The keyboard avoidance only grows the scrollable area once the keyboard is up: scrolling before it would stop short.
  const onFieldFocus = (field: NoticeField) => {
    keyboardListener.current?.remove();

    if (Keyboard.isVisible()) {
      scrollToField(field);

      return;
    }

    keyboardListener.current = Keyboard.addListener("keyboardDidShow", () => {
      keyboardListener.current?.remove();
      keyboardListener.current = null;
      scrollToField(field);
    });
  };

  // A second press in the same frame must not send twice, before `isPending` has re-rendered.
  const sending = useRef(false);

  const count = recipients.data?.count;
  const canSend =
    title.trim() !== "" &&
    message.trim() !== "" &&
    count !== undefined &&
    count > 0 &&
    !sendNotice.isPending;

  const askToConfirm = () => {
    if (!canSend) {
      return;
    }

    Keyboard.dismiss();
    setIsConfirming(true);
  };

  const closeConfirm = () => {
    if (!sendNotice.isPending) {
      setIsConfirming(false);
    }
  };

  const confirm = () => {
    if (!canSend || sending.current) {
      return;
    }

    sending.current = true;

    sendNotice.mutate(
      { audience, title: title.trim(), message: message.trim() },
      {
        onSuccess: () => {
          setIsConfirming(false);
          router.back();
          alertMessage.show(t("notices.sent"));
        },
        // The text stays: only the sheet closes, so the admin can try again.
        onError: () => setIsConfirming(false),
        onSettled: () => {
          sending.current = false;
        },
      },
    );
  };

  return {
    scrollRef,
    onFieldLayout,
    onFieldFocus,
    audience,
    title,
    message,
    count,
    isCountLoading: recipients.isPending,
    isCountError: recipients.isError,
    canSend,
    isSending: sendNotice.isPending,
    isConfirming,
    setAudience,
    setTitle,
    setMessage,
    askToConfirm,
    closeConfirm,
    confirm,
  };
};
