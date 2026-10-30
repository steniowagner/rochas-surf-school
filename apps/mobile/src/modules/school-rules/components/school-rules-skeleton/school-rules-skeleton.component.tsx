import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

const LOADING_ROWS = [0, 1, 2];

/** Rows shaped like rules while the school rules load, read out as one loading state. */
export function SchoolRulesSkeleton() {
  const { t } = useTranslation();

  return (
    <View
      testID="school-rules-loading"
      accessible
      accessibilityLabel={t("schoolRulesScreen.loading")}
      className="rounded-card border border-line bg-surface"
    >
      {LOADING_ROWS.map((key) => (
        <View
          key={key}
          className={`flex-row gap-3 px-4 py-3.5 ${key < LOADING_ROWS.length - 1 ? "border-b border-line" : ""}`}
        >
          <Skeleton className="h-[22px] w-7 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-3.5 w-1/2 rounded-full" />
            <Skeleton className="h-3 w-5/6 rounded-full" />
          </View>
        </View>
      ))}
    </View>
  );
}
