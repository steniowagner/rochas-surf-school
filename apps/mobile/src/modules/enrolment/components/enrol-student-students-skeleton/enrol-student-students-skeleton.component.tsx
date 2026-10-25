import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

const LOADING_ROWS = [0, 1, 2, 3];

/** Rows shaped like the students to pick from, read out as one loading state. */
export function EnrolStudentStudentsSkeleton() {
  const { t } = useTranslation();

  return (
    <View
      testID="enrol-student-students-loading"
      accessible
      accessibilityLabel={t("enrolStudent.students.loading")}
      className="rounded-card border border-line bg-surface"
    >
      {LOADING_ROWS.map((key) => (
        <View
          key={key}
          className={`min-h-14 flex-row items-center gap-3 px-4 py-2 ${key === 0 ? "" : "border-t border-line"}`}
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-3.5 flex-1 rounded-full" />
          <Skeleton className="h-[22px] w-[22px] rounded-full" />
        </View>
      ))}
    </View>
  );
}
