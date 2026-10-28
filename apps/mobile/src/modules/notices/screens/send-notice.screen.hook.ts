import type { Locale } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "react-native";

import { useClass } from "@/modules/classes/hooks/use-class.hook";
import { useNow } from "@/modules/classes/hooks/use-now.hook";
import { todayInSchoolZone } from "@/modules/classes/utils/calendar";
import { classMessageRecipients } from "@/modules/classes/utils/class-message";
import { personLabel } from "@/modules/classes/utils/person-label";
import {
  formatDateLine,
  schoolDayOf,
  schoolTimeOf,
} from "@/modules/classes/utils/week";
import type { ClassDetailsPerson } from "@/modules/classes/screens/class-details.screen.types";
import { useAlertMessage } from "@/providers/alert-message";
import { useSession } from "@/providers/session";
import { formatIsoDate, getDateLocale } from "@/utils/calendar-dates";

import { usePendingRequests } from "@/modules/enrolment/hooks/use-pending-requests.hook";

import { useNoticeRecipientsCounts } from "../hooks/use-notice-recipients-counts.hook";
import { useSendClassMessage } from "../hooks/use-send-class-message.hook";
import { useSendNotice } from "../hooks/use-send-notice.hook";
import { NOTICE_AUDIENCES } from "../notices.constants";
import { ClassMessageView, NoticeAudience } from "../notices.types";

import { UseSendNoticeScreenResult } from "./send-notice.screen.types";

/** "Quarta, 28 Out": the weekday's first word, the day and the month's abbreviation. */
const formatClassDate = (classDay: string, locale: Locale): string => {
  const capitalize = (text: string) =>
    text.charAt(0).toUpperCase() + text.slice(1);
  const weekday = formatIsoDate(classDay, "EEEE", locale).split("-")[0]!;
  const month = formatIsoDate(classDay, "MMM", locale).replace(".", "");

  return `${capitalize(weekday)}, ${formatIsoDate(classDay, "d", locale)} ${capitalize(month)}`;
};

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
  // Kept while the sheet slides away, so its content doesn't vanish before it is gone.
  const [selectedPerson, setSelectedPerson] =
    useState<ClassDetailsPerson | null>(null);
  const [personVisible, setPersonVisible] = useState(false);
  const counts = useNoticeRecipientsCounts(!isClassMode);
  const recipients = counts[NOTICE_AUDIENCES.indexOf(audience)]!;
  const classQuery = useClass(classId ?? "", { enabled: isClassMode });
  const item = isClassMode ? classQuery.data : undefined;
  // The class details carry only the number of pending requests: their people come from the admins' list.
  const pendingQuery = usePendingRequests({ enabled: isClassMode });
  const pendingRequests = isClassMode
    ? (pendingQuery.data?.classes.find((entry) => entry.id === classId)
        ?.requests ?? [])
    : [];
  const classRecipients = item ? classMessageRecipients(item, user?.id) : null;

  // A second press in the same frame must not send twice, before `isPending` has re-rendered.
  const sending = useRef(false);

  const isSending = isClassMode
    ? sendClassMessage.isPending
    : sendNotice.isPending;
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
    ? formatDateLine(
        schoolDayOf(item.startsAt),
        todayInSchoolZone(now),
        getDateLocale(i18n.language),
        {
          today: t("classDetails.today"),
          tomorrow: t("classDetails.tomorrow"),
          yesterday: t("classDetails.yesterday"),
        },
      )
    : "";

  const classView: ClassMessageView | null =
    item && classRecipients
      ? {
          discipline: item.discipline,
          disciplineLabel: t(`newClass.discipline.${item.discipline}`),
          levelLabel: t(`newClass.level.${item.level}`),
          dateLabel: formatClassDate(
            schoolDayOf(item.startsAt),
            getDateLocale(i18n.language),
          ),
          timeRange: `${schoolTimeOf(item.startsAt)} – ${schoolTimeOf(item.endsAt)}`,
          locationName: item.location.name,
          title: t("notices.classMessage.receive", {
            count: classRecipients.count,
          }),
          summary: [
            [classRecipients.instructors.length, "instructors"],
            [classRecipients.students.length, "students"],
            [classRecipients.pendingCount, "pending"],
          ]
            .filter(([count]) => count !== 0)
            .map(([count, key]) =>
              t(`notices.classMessage.summary.${key}`, { count }),
            )
            .join(" · "),
          people: [
            ...classRecipients.instructors.map((person) => ({
              id: person.id,
              label: personLabel(person.name, "instructor", t),
              erased: person.name === null,
              photoUrl: null,
              role: "instructor" as const,
              roleLabel: t("notices.classMessage.roles.instructor"),
              sheetPerson:
                person.name === null
                  ? null
                  : {
                      name: person.name,
                      role: person.role,
                      whatsappNumber: person.whatsappNumber,
                    },
            })),
            ...classRecipients.students.map((person) => ({
              id: person.id,
              label: personLabel(person.name, "student", t),
              erased: person.name === null,
              photoUrl: person.photoUrl,
              role: "student" as const,
              roleLabel: t("notices.classMessage.roles.student"),
              sheetPerson:
                person.name === null
                  ? null
                  : {
                      name: person.name,
                      role: "student" as const,
                      whatsappNumber: person.whatsappNumber,
                    },
            })),
            ...pendingRequests.map((request) => ({
              id: `pending-${request.id}`,
              label: request.student.name,
              erased: false,
              photoUrl: request.student.photoUrl,
              role: "pending" as const,
              roleLabel: t("notices.classMessage.roles.pending"),
              sheetPerson: {
                name: request.student.name,
                role: "student" as const,
                whatsappNumber: null,
              },
            })),
          ],
        }
      : null;

  const confirmDescription = isClassMode
    ? t("notices.classMessage.confirm", {
        classLine: item
          ? `${name} · ${dateLine}, ${schoolTimeOf(item.startsAt)}`
          : "",
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
    selectedPerson,
    personVisible,
    openPerson: (person: ClassDetailsPerson) => {
      setSelectedPerson(person);
      setPersonVisible(true);
    },
    closePerson: () => setPersonVisible(false),
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
