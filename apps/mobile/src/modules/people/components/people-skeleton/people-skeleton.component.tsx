import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

const LOADING_ROWS = [0, 1, 2, 3, 4];

/** Rows shaped like the people of the directory, read out as one loading state. */
export function PeopleSkeleton() {
  const { t } = useTranslation();

  return (
    <View
      testID="people-loading"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("people.loading")}
      className="rounded-card border border-line bg-surface"
    >
      {LOADING_ROWS.map((key) => (
        <View
          key={key}
          className={`min-h-16 flex-row items-center gap-3 px-4 py-3 ${key === 0 ? "" : "border-t border-line"}`}
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-3.5 w-1/2 rounded-full" />
            <Skeleton className="h-3 w-1/3 rounded-full" />
          </View>
          <Skeleton className="h-[22px] w-16 rounded-full" />
        </View>
      ))}
    </View>
  );
}
