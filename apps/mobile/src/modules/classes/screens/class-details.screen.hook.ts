import { getClassState, isWithoutDeadline, isWithoutInstructor } from "@rochas-surf-school/classes";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { routes } from "@/constants/routes";
import { useAlertMessage } from "@/providers/alert-message";
import { useSession } from "@/providers/session";
import { ApiError, SessionExpiredError } from "@/services/api";
import { getDateLocale } from "@/utils/calendar-dates";

import { useClassEnrolment } from "@/modules/enrolment/hooks/use-class-enrolment.hook";

import { useCancelClass } from "../hooks/use-cancel-class.hook";
import { useClass } from "../hooks/use-class.hook";
import { useDeleteClass } from "../hooks/use-delete-class.hook";
import { useNow } from "../hooks/use-now.hook";
import { todayInSchoolZone } from "../utils/calendar";
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
import { formatDateLine, formatDeadline, schoolDayOf, schoolTimeOf } from "../utils/week";

import type {
  ClassDetailsInstructor,
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
  const cancelClass = useCancelClass(id);
  const deleteClass = useDeleteClass(id);
  const item = query.data;
  const [toolsVisible, setToolsVisible] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);
  // A second press in the same frame must not send twice, before `isPending` has re-rendered.
  const cancelling = useRef(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteVariant, setDeleteVariant] =
    useState<DeleteSheetVariant>("confirm");
  const deleting = useRef(false);
  const [rulesVisible, setRulesVisible] = useState(false);

  const instructors: ClassDetailsInstructor[] = (item?.instructors ?? []).map(
    (instructor) => ({
      ...instructor,
      isViewer: instructor.id === user?.id,
    }),
  );
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
    reload: () => void query.refetch(),
  });

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

      alertMessage.show(t("cancelClass.done"));
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

      alertMessage.show(t("deleteClass.done"));
      setDeleteVisible(false);
      router.back();
    } catch (error) {
      showDeleteError(error);
    } finally {
      deleting.current = false;
    }
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
    // A class can be deleted only before it starts; a started one can only be cancelled.
    canDelete: state === "not-started",
    // Admins only: the class hasn't started and nobody teaches it; the banner opens the editor.
    showNoInstructor:
      canEdit && state !== null && isWithoutInstructor(instructors.length, state),
    // Admins only: the class hasn't started and its deadline couldn't be worked out; the banner opens the rules.
    showNoDeadline:
      canEdit &&
      item !== undefined &&
      state !== null &&
      isWithoutDeadline(item.cancellationDeadline, state),
    openCancellationRules: () => router.push(routes.admin.cancellationRules),
    // Instructors only read: the note says whether the class is theirs. Nobody else gets it.
    readOnlyNoteKey:
      user?.role !== "instructor" || item === undefined
        ? null
        : instructors.some((instructor) => instructor.isViewer)
          ? ("classDetails.readOnly.teaches" as const)
          : ("classDetails.readOnly.notAssigned" as const),
    // A cancelled class has nothing left to cancel.
    showRules: state !== null && state !== "cancelled",
    rulesVisible,
    openRules: () => setRulesVisible(true),
    closeRules: () => setRulesVisible(false),
    // Everyone reads the school rules in their own flow.
    openSchoolRules: () =>
      router.push(routes[(user?.role ?? "student") as ClassDetailsRole].schoolRules),
    toolsVisible,
    openTools: () => setToolsVisible(true),
    closeTools: () => setToolsVisible(false),
    edit: () => router.push(routes.admin.editClass(id)),
    cancelVisible,
    openCancel: () => setCancelVisible(true),
    closeCancel: () => setCancelVisible(false),
    deleteVisible,
    deleteVariant,
    // "Surf Beginner · Tomorrow · 08:00": the class in the request sheet.
    requestSummary: item
      ? `${t(`newClass.discipline.${item.discipline}`)} ${t(`newClass.level.${item.level}`)} · ${dateLine} · ${start}`
      : "",
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
    isLoading: query.isPending,
    isNotFound: query.error instanceof ApiError && query.error.status === 404,
    // An expired session is handled by the session flow: nothing to show here.
    isError:
      query.isError &&
      !(query.error instanceof ApiError && query.error.status === 404) &&
      !(query.error instanceof SessionExpiredError),
    retry: () => void query.refetch(),
  };
};
