import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { useTeachingClasses } from "../../hooks/use-teaching-classes.hook";
import { countAssignedClasses } from "../../utils/teaching-classes";

import type {
  UseTeachingClassesEntryRowProps,
  UseTeachingClassesEntryRowResult,
} from "./teaching-classes-entry-row.types";

export const useTeachingClassesEntryRow = ({
  role,
}: UseTeachingClassesEntryRowProps): UseTeachingClassesEntryRowResult => {
  const { t } = useTranslation();
  const { data, refetch } = useTeachingClasses();

  // Back on the home, the classes may have changed (an admin may have just assigned themselves one): read them again,
  // without restarting a load already running.
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch]),
  );

  // An admin's row never shows while loading or after an error, so it can't flash.
  const visible = role === "instructor" || data?.teachesAny === true;

  if (!data) {
    return { visible, subtitle: null };
  }

  const count = countAssignedClasses(data.items);

  return {
    visible,
    subtitle: count === 0 ? t("teachingClasses.row.none") : t("teachingClasses.row.assigned", { count }),
  };
};
