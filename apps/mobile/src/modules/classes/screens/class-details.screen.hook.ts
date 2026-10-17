import { getClassState } from "@rochas-surf-school/classes";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { routes } from "@/constants/routes";
import { useSession } from "@/providers/session";
import { ApiError, SessionExpiredError } from "@/services/api";
import { getInitials } from "@/utils/get-initials";

import { useClass } from "../hooks/use-class.hook";
import { useNow } from "../hooks/use-now.hook";
import { getDateLocale, todayInSchoolZone } from "../utils/calendar";
import { formatDateLine, schoolDayOf, schoolTimeOf } from "../utils/week";

import type {
  ClassDetailsInstructor,
  UseClassDetailsScreenProps,
} from "./class-details.screen.types";

export const useClassDetailsScreen = ({
  canEdit = false,
}: UseClassDetailsScreenProps = {}) => {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const now = useNow();
  const query = useClass(id);
  const item = query.data;

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
    ? getClassState(new Date(item.startsAt), new Date(item.endsAt), now)
    : null;

  return {
    item,
    instructors,
    timeRange: `${start} – ${end}`,
    start,
    end,
    dateLine: item
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
      : "",
    state,
    // A finished class can't change, and nothing is shown for one that isn't loaded.
    showEdit: canEdit && item !== undefined && state !== "finished",
    edit: () => router.push(routes.admin.editClass(id)),
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
