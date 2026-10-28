import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

const LOADING_CARDS = [0, 1];

/** Cards shaped like the removed accounts, read out as one loading state. */
export function RemovedAccountsSkeleton() {
  const { t } = useTranslation();

  return (
    <View
      testID="removed-accounts-loading"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("removedAccounts.loading")}
      className="gap-3"
    >
      {LOADING_CARDS.map((key) => (
        <View
          key={key}
          className="gap-3 rounded-card border border-line bg-surface p-4"
        >
          <View className="flex-row items-center gap-3">
            <Skeleton className="h-16 w-16 rounded-full" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-3.5 w-1/2 rounded-full" />
              <Skeleton className="h-[22px] w-20 rounded-full" />
            </View>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="flex-1 gap-2">
              <Skeleton className="h-7 w-3/4 rounded-checkbox" />
              <Skeleton className="h-7 w-full rounded-checkbox" />
            </View>
            <Skeleton className="h-11 w-24 rounded-control" />
          </View>
        </View>
      ))}
    </View>
  );
}
