import { router } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "react-native";

import { useAlertMessage } from "@/providers/alert-message";

import { useNoticeRecipientsCount } from "../hooks/use-notice-recipients-count.hook";
import { useSendNotice } from "../hooks/use-send-notice.hook";
import { NoticeAudience } from "../notices.types";

import { UseSendNoticeScreenResult } from "./send-notice.screen.types";

export const useSendNoticeScreen = (): UseSendNoticeScreenResult => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const sendNotice = useSendNotice();
  const [audience, setAudience] = useState<NoticeAudience>("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const recipients = useNoticeRecipientsCount(audience);

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
