import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "react-native";

import { useClass } from "@/modules/classes/hooks/use-class.hook";
import { useNow } from "@/modules/classes/hooks/use-now.hook";
import { todayInSchoolZone } from "@/modules/classes/utils/calendar";
import { classMessageRecipients } from "@/modules/classes/utils/class-message";
import { personLabel } from "@/modules/classes/utils/person-label";
import { formatDateLine, schoolDayOf, schoolTimeOf } from "@/modules/classes/utils/week";
import { useAlertMessage } from "@/providers/alert-message";
import { useSession } from "@/providers/session";
import { getDateLocale } from "@/utils/calendar-dates";

import { useNoticeRecipientsCounts } from "../hooks/use-notice-recipients-counts.hook";
import { useSendClassMessage } from "../hooks/use-send-class-message.hook";
import { useSendNotice } from "../hooks/use-send-notice.hook";
import { NOTICE_AUDIENCES } from "../notices.constants";
import { ClassMessageView, NoticeAudience } from "../notices.types";

import { UseSendNoticeScreenResult } from "./send-notice.screen.types";

/**
 * The Send notice screen's state. With a `classId` route param it is the message to that class (spec 069, D-09): the
 * class's people replace the audience, and the text goes to `POST /classes/:id/message`. Without it, the school-wide
 * notice of spec 063.
 */
export const useSendNoticeScreen = (): UseSendNoticeScreenResult => {
  const { t, i18n } = useTranslation();
  const { classId } = useLocalSearchParams<{ classId?: string }>();
  const isClassMode = typeof classId === "string" && classId !== "";
  const { user } = useSession();
  const now = useNow();
  const alertMessage = useAlertMessage();
  const sendNotice = useSendNotice();
  const sendClassMessage = useSendClassMessage(classId ?? "");
  const [audience, setAudience] = useState<NoticeAudience>("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const counts = useNoticeRecipientsCounts(!isClassMode);
  const recipients = counts[NOTICE_AUDIENCES.indexOf(audience)]!;
  const classQuery = useClass(classId ?? "", { enabled: isClassMode });
  const item = isClassMode ? classQuery.data : undefined;
  const classRecipients = item ? classMessageRecipients(item, user?.id) : null;

  // A second press in the same frame must not send twice, before `isPending` has re-rendered.
  const sending = useRef(false);

  const isSending = isClassMode ? sendClassMessage.isPending : sendNotice.isPending;
  const count = isClassMode ? classRecipients?.count : recipients.data?.count;
  const canSend =
    title.trim() !== "" &&
    message.trim() !== "" &&
    count !== undefined &&
    count > 0 &&
    !isSending;

  const name = item
    ? `${t(`newClass.discipline.${item.discipline}`)} ${t(`newClass.level.${item.level}`)}`
    : "";
  const dateLine = item
    ? formatDateLine(schoolDayOf(item.startsAt), todayInSchoolZone(now), getDateLocale(i18n.language), {
        today: t("classDetails.today"),
        tomorrow: t("classDetails.tomorrow"),
        yesterday: t("classDetails.yesterday"),
      })
    : "";

  const classView: ClassMessageView | null =
    item && classRecipients
      ? {
          name,
          when: `${dateLine} · ${schoolTimeOf(item.startsAt)} – ${schoolTimeOf(item.endsAt)}`,
          locationName: item.location.name,
          groups: [
            {
              key: "instructors" as const,
              label: t("notices.classMessage.instructors"),
              names: classRecipients.instructors.map((person) => personLabel(person.name, "instructor", t)),
            },
            {
              key: "students" as const,
              label: t("notices.classMessage.students"),
              names: classRecipients.students.map((person) => personLabel(person.name, "student", t)),
            },
          ].filter((group) => group.names.length > 0),
          pendingLine:
            classRecipients.pendingCount > 0
              ? t("notices.classMessage.pending", { count: classRecipients.pendingCount })
              : null,
        }
      : null;

  const confirmDescription = isClassMode
    ? t("notices.classMessage.confirm", {
        classLine: item ? `${name} · ${dateLine}, ${schoolTimeOf(item.startsAt)}` : "",
      })
    : t(`notices.confirm.description.${audience}`);

  const askToConfirm = () => {
    if (!canSend) {
      return;
    }

    Keyboard.dismiss();
    setIsConfirming(true);
  };

  const closeConfirm = () => {
    if (!isSending) {
      setIsConfirming(false);
    }
  };

  const onSent = (sentKey: string) => {
    setIsConfirming(false);
    router.back();
    alertMessage.show(t(sentKey), { tone: "success" });
  };

  const confirm = () => {
    if (!canSend || sending.current) {
      return;
    }

    sending.current = true;

    const callbacks = {
      // The text stays: only the sheet closes, so the admin can try again.
      onError: () => setIsConfirming(false),
      onSettled: () => {
        sending.current = false;
      },
    };
    const text = { title: title.trim(), message: message.trim() };

    if (isClassMode) {
      sendClassMessage.mutate(text, {
        ...callbacks,
        onSuccess: () => onSent("notices.classMessage.sent"),
      });

      return;
    }

    sendNotice.mutate(
      { audience, ...text },
      { ...callbacks, onSuccess: () => onSent("notices.sent") },
    );
  };

  return {
    isClassMode,
    classView,
    confirmDescription,
    audience,
    title,
    message,
    count,
    isCountLoading: isClassMode ? classQuery.isPending : recipients.isPending,
    isCountError: isClassMode ? classQuery.isError : recipients.isError,
    canSend,
    isSending,
    isConfirming,
    setAudience,
    setTitle,
    setMessage,
    askToConfirm,
    closeConfirm,
    confirm,
  };
};
