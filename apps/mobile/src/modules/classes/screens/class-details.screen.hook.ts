import {
  getClassState,
  isWithoutDeadline,
  isWithoutInstructor,
} from "@rochas-surf-school/classes";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { routes } from "@/constants/routes";
import { useSchoolSettings } from "@/hooks/use-school-settings.hook";
import { useAlertMessage } from "@/providers/alert-message";
import { useSession } from "@/providers/session";
import { ApiError, SessionExpiredError } from "@/services/api";
import { getDateLocale } from "@/utils/calendar-dates";

import { useClassEnrolment } from "@/modules/enrolment/hooks/use-class-enrolment.hook";
import { useTakeGuestOut } from "@/modules/enrolment/hooks/use-take-guest-out.hook";
import { useTakeOut } from "@/modules/enrolment/hooks/use-take-out.hook";
import { useSchoolRules } from "@/modules/school-rules/hooks/use-school-rules.hook";

import type { ClassDetailsStudent, Named } from "../classes.types";
import { useCancelClass } from "../hooks/use-cancel-class.hook";
import { useClass } from "../hooks/use-class.hook";
import { useDeleteClass } from "../hooks/use-delete-class.hook";
import { useNow } from "../hooks/use-now.hook";
import { todayInSchoolZone } from "../utils/calendar";
import { classMessageRecipients } from "../utils/class-message";
import {
  getCancelClassErrorKey,
  getDeleteClassErrorKey,
  isClassCancelledError,
  isClassFinishedError,
  isClassNotEmptyError,
  isClassNotFoundError,
  isClassStartedError,
} from "../utils/class-error";
import { toMapPoint } from "../utils/map";
import { isClassFull } from "../utils/occupancy";
import {
  formatDateLine,
  formatDeadline,
  schoolDayOf,
  schoolTimeOf,
} from "../utils/week";

import type {
  ClassDetailsInstructor,
  ClassDetailsPerson,
  ClassDetailsRole,
  DeleteSheetVariant,
  UseClassDetailsScreenProps,
} from "./class-details.screen.types";

export const useClassDetailsScreen = ({
  canEdit,
  canEnrol,
}: UseClassDetailsScreenProps) => {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const now = useNow();
  const alertMessage = useAlertMessage();
  const query = useClass(id);
  const { data: schoolSettings } = useSchoolSettings();
  // Loading, failed or empty: the school rules row shows its title only.
  const { data: schoolRules } = useSchoolRules();
  const schoolRuleCount = schoolRules?.rules.length ?? 0;
  // Not loaded or failed counts as on: the backend decides.
  const waitingListEnabled = schoolSettings?.waitingListEnabled !== false;
  const cancelClass = useCancelClass(id);
  const deleteClass = useDeleteClass(id);
  const item = query.data;
  // With no class loaded, a fetch after an error goes back to pending: while "Try again" runs, the error stays on
  // screen with the spinner in its button, instead of the loading state.
  const isRetrying = query.isPending && query.errorUpdateCount > 0;
  const [toolsVisible, setToolsVisible] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);
  // A second press in the same frame must not send twice, before `isPending` has re-rendered.
  const cancelling = useRef(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteVariant, setDeleteVariant] =
    useState<DeleteSheetVariant>("confirm");
  const deleting = useRef(false);
  const [rulesVisible, setRulesVisible] = useState(false);
  // Kept while the sheet slides away, so its content doesn't vanish before it is gone.
  const [selectedPerson, setSelectedPerson] =
    useState<ClassDetailsPerson | null>(null);
  const [personVisible, setPersonVisible] = useState(false);

  const instructors: ClassDetailsInstructor[] = (item?.instructors ?? []).map(
    (instructor) => ({
      ...instructor,
      isViewer: instructor.id === user?.id,
    }),
  );
  const instructorCount = instructors.filter(
    (instructor) => !instructor.isViewer,
  ).length;
  const start = item ? schoolTimeOf(item.startsAt) : "";
  const end = item ? schoolTimeOf(item.endsAt) : "";
  const state = item
    ? getClassState(
        new Date(item.startsAt),
        new Date(item.endsAt),
        now,
        item.cancelledAt ? new Date(item.cancelledAt) : null,
      )
    : null;

  const enrolment = useClassEnrolment({
    item,
    state,
    canEnrol,
    now,
    waitingListEnabled,
    reload: () => void query.refetch(),
  });

  const takeOut = useTakeOut(() => void query.refetch());
  const takeGuestOut = useTakeGuestOut(() => void query.refetch());

  const showCancelError = (error: unknown) => {
    if (isClassCancelledError(error) || isClassFinishedError(error)) {
      setCancelVisible(false);
      void query.refetch();
    }

    if (isClassNotFoundError(error)) {
      router.back();
    }

    const messageKey = getCancelClassErrorKey(error);

    if (messageKey !== null) {
      alertMessage.show(t(messageKey));
    }
  };

  const cancel = async (message: string | undefined) => {
    if (cancelling.current) {
      return;
    }

    cancelling.current = true;

    try {
      await cancelClass.mutateAsync(message === undefined ? {} : { message });

      alertMessage.show(t("cancelClass.done"), { tone: "success" });
      setCancelVisible(false);
    } catch (error) {
      showCancelError(error);
    } finally {
      cancelling.current = false;
    }
  };

  const showDeleteError = (error: unknown) => {
    if (isClassNotEmptyError(error)) {
      setDeleteVariant("notEmpty");
    }

    if (isClassStartedError(error) || isClassCancelledError(error)) {
      setDeleteVisible(false);
      void query.refetch();
    }

    if (isClassNotFoundError(error)) {
      router.back();
    }

    const messageKey = getDeleteClassErrorKey(error);

    if (messageKey !== null) {
      alertMessage.show(t(messageKey));
    }
  };

  const remove = async () => {
    if (deleting.current) {
      return;
    }

    deleting.current = true;

    try {
      await deleteClass.mutateAsync();

      alertMessage.show(t("deleteClass.done"), { tone: "success" });
      setDeleteVisible(false);
      router.back();
    } catch (error) {
      showDeleteError(error);
    } finally {
      deleting.current = false;
    }
  };

  const openPerson = (person: ClassDetailsPerson) => {
    setSelectedPerson(person);
    setPersonVisible(true);
  };

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

  // Students (and everyone) see until when the class can be cancelled, unless it was cancelled itself.
  const cancellationDeadline =
    item?.cancellationDeadline && state !== "cancelled"
      ? formatDeadline(item.cancellationDeadline, getDateLocale(i18n.language))
      : null;

  return {
    item,
    // The point of the class's location, or none for a location saved before the map.
    locationPoint: item ? toMapPoint(item.location) : null,
    instructors,
    cancellationDeadline,
    // Every seat is taken and the class is still to come; the started and cancelled banners come first.
    // The banner of the viewer's own enrolment, when there is one, says it better.
    showFullBanner:
      item !== undefined &&
      state === "not-started" &&
      isClassFull(item.seatsTaken, item.capacity) &&
      enrolment.display === null,
    enrolment,
    waitingListEnabled,
    timeRange: `${start} – ${end}`,
    start,
    end,
    dateLine,
    state,
    // The state the people group draws with; nothing is drawn while the class isn't loaded.
    peopleState: state ?? ("not-started" as const),
    // A finished or cancelled class can't change, and nothing is shown for one that isn't loaded.
    showTools:
      canEdit &&
      item !== undefined &&
      state !== "finished" &&
      state !== "cancelled",
    // A class can be deleted only before it starts and while nobody holds a seat; otherwise it can only be cancelled.
    deleteState:
      item === undefined || state !== "not-started"
        ? ("started" as const)
        : item.seatsTaken > 0
          ? ("enrolled" as const)
          : ("available" as const),
    // Admins only: the class hasn't started and nobody teaches it; the banner opens the editor.
    showNoInstructor:
      canEdit &&
      state !== null &&
      isWithoutInstructor(instructors.length, state),
    // Admins only: the class hasn't started and its deadline couldn't be worked out; the banner opens the rules.
    showNoDeadline:
      canEdit &&
      item !== undefined &&
      state !== null &&
      isWithoutDeadline(item.cancellationDeadline, state),
    openCancellationRules: () => router.push(routes.admin.cancellationRules),
    // Admins only: a student of a class that hasn't started (and isn't cancelled) can be taken out of it.
    canTakeOut: canEdit && state === "not-started",
    takeOut,
    takeGuestOut,
    // The trial guests of the class get no notice of a cancellation.
    guestCount: item?.guests.length ?? 0,
    // Who the cancellation notifies: the students with a seat, the pending requests and the other instructors.
    studentCount: item?.students.length ?? 0,
    pendingCount: item?.pendingRequests ?? 0,
    instructorCount,
    // The tools' "Send message" and "Cancel class" reach the same people: each person once, never the admin who sends
    // it, even when they teach the class (spec 069, D-07).
    messageCount: item ? classMessageRecipients(item, user?.id).count : 0,
    takeOutFirstName: takeOut.target?.name.split(" ")[0] ?? "",
    // The line under the banner's title: a taken-out student reads the reason, if the admin gave one.
    enrolmentDescription: !enrolment.display
      ? ""
      : enrolment.display.key !== "takenOut"
        ? t(`enrolment.status.${enrolment.display.key}.description`)
        : enrolment.takenOutReason
          ? t("enrolment.status.takenOut.reason", {
              reason: enrolment.takenOutReason,
            })
          : t("enrolment.status.takenOut.noReason"),
    // "Surf Beginner · Tomorrow, 08:00 – 09:00": the class the student leaves.
    takeOutSummary: item
      ? `${t(`newClass.discipline.${item.discipline}`)} ${t(`newClass.level.${item.level}`)} · ${dateLine}, ${start} – ${end}`
      : "",
    // Instructors only read: the note says whether the class is theirs. Nobody else gets it.
    readOnlyNoteKey:
      user?.role !== "instructor" || item === undefined
        ? null
        : instructors.some((instructor) => instructor.isViewer)
          ? ("classDetails.readOnly.teaches" as const)
          : ("classDetails.readOnly.notAssigned" as const),
    // A cancelled class has nothing left to cancel.
    showRules: state !== null && state !== "cancelled",
    schoolRulesValue:
      schoolRuleCount > 0
        ? t("classDetails.rules.schoolCount", { count: schoolRuleCount })
        : null,
    rulesVisible,
    openRules: () => setRulesVisible(true),
    closeRules: () => setRulesVisible(false),
    // Everyone reads the school rules in their own flow.
    openSchoolRules: () =>
      router.push(
        routes[(user?.role ?? "student") as ClassDetailsRole].schoolRules,
      ),
    selectedPerson,
    personVisible,
    openInstructor: ({
      name,
      photoUrl,
      role,
      whatsappNumber,
    }: Named<ClassDetailsInstructor>) =>
      openPerson({ name, photoUrl, role, whatsappNumber }),
    // Only students hold seats, so the sheet's chip is always "Student".
    openStudent: ({
      name,
      photoUrl,
      whatsappNumber,
    }: Named<ClassDetailsStudent>) =>
      openPerson({ name, photoUrl, role: "student", whatsappNumber }),
    closePerson: () => setPersonVisible(false),
    toolsVisible,
    openTools: () => setToolsVisible(true),
    closeTools: () => setToolsVisible(false),
    edit: () => router.push(routes.admin.editClass(id)),
    // The message to this class: the Send notice screen in its class mode (spec 069).
    notify: () => router.push(routes.admin.sendNotice({ classId: id })),
    cancelVisible,
    openCancel: () => setCancelVisible(true),
    closeCancel: () => setCancelVisible(false),
    deleteVisible,
    deleteVariant,
    classLine: item
      ? `${t(`newClass.discipline.${item.discipline}`)} ${t(`newClass.level.${item.level}`)} · ${dateLine}, ${start} – ${end} · ${item.location.name}`
      : "",
    openDelete: () => {
      setDeleteVariant("confirm");
      setDeleteVisible(true);
    },
    closeDelete: () => setDeleteVisible(false),
    deleting: deleteClass.isPending,
    remove,
    cancelInstead: () => {
      setDeleteVisible(false);
      setCancelVisible(true);
    },
    cancelling: cancelClass.isPending,
    cancel,
    isLoading: query.isPending && !isRetrying,
    isNotFound: query.error instanceof ApiError && query.error.status === 404,
    // An expired session is handled by the session flow: nothing to show here.
    isError:
      isRetrying ||
      (query.isError &&
        !(query.error instanceof ApiError && query.error.status === 404) &&
        !(query.error instanceof SessionExpiredError)),
    isRetrying,
    retry: () => void query.refetch(),
  };
};
