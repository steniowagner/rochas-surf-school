import { getClassState, isWithoutInstructor } from "@rochas-surf-school/classes";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { routes } from "@/constants/routes";
import { useAlertMessage } from "@/providers/alert-message";
import { useSession } from "@/providers/session";
import { ApiError, SessionExpiredError } from "@/services/api";
import { getDateLocale } from "@/utils/calendar-dates";
import { getInitials } from "@/utils/get-initials";

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
import { formatDateLine, schoolDayOf, schoolTimeOf } from "../utils/week";

import type {
  ClassDetailsInstructor,
  DeleteSheetVariant,
  UseClassDetailsScreenProps,
} from "./class-details.screen.types";

export const useClassDetailsScreen = ({
  canEdit,
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

  const instructors: ClassDetailsInstructor[] = (item?.instructors ?? []).map(
    (instructor) => ({
      ...instructor,
      initials: getInitials(instructor.name),
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

  return {
    item,
    instructors,
    timeRange: `${start} – ${end}`,
    start,
    end,
    dateLine,
    state,
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
    toolsVisible,
    openTools: () => setToolsVisible(true),
    closeTools: () => setToolsVisible(false),
    edit: () => router.push(routes.admin.editClass(id)),
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
