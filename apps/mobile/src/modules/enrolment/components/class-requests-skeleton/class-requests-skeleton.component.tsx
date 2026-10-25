import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

const LOADING_GROUPS = [0, 1];

/** Class headers with a request card each, read out as one loading state. */
export function ClassRequestsSkeleton() {
  const { t } = useTranslation();

  return (
    <View
      testID="class-requests-loading"
      accessible
      accessibilityLabel={t("classRequests.loading")}
      className="gap-6"
    >
      {LOADING_GROUPS.map((key) => (
        <View key={key} className="gap-3">
          <View className="gap-3 rounded-card border border-line bg-surface p-4">
            <View className="flex-row items-center gap-3">
              <Skeleton className="h-14 w-12 rounded-card" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-3.5 w-1/2 rounded-full" />
                <Skeleton className="h-3 w-1/3 rounded-full" />
                <Skeleton className="h-3 w-2/3 rounded-full" />
              </View>
            </View>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </View>
          <View className="gap-4 rounded-card border border-line bg-surface p-4">
            <View className="flex-row items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-3.5 w-1/2 rounded-full" />
                <Skeleton className="h-3 w-2/3 rounded-full" />
              </View>
            </View>
            <View className="flex-row gap-3">
              <Skeleton className="h-11 flex-1 rounded-full" />
              <Skeleton className="h-11 flex-1 rounded-full" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
