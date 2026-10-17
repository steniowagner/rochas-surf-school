import { getClassState } from "@rochas-surf-school/classes";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { useSession } from "@/providers/session";
import { ApiError, SessionExpiredError } from "@/services/api";
import { getDateLocale } from "@/utils/calendar-dates";
import { getInitials } from "@/utils/get-initials";

import { useClass } from "../hooks/use-class.hook";
import { useNow } from "../hooks/use-now.hook";
import { todayInSchoolZone } from "../utils/calendar";
import { formatDateLine, schoolDayOf, schoolTimeOf } from "../utils/week";

import type { ClassDetailsInstructor } from "./class-details.screen.types";

export const useClassDetailsScreen = () => {
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
    state: item
      ? getClassState(new Date(item.startsAt), new Date(item.endsAt), now)
      : null,
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
