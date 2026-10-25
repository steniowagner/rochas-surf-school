import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

/** The two sections of the settings and the save button, read out as one loading state. */
export function SchoolSettingsSkeleton() {
  const { t } = useTranslation();

  return (
    <View
      testID="school-settings-loading"
      accessible
      accessibilityLabel={t("schoolSettings.loading")}
      className="gap-6"
    >
      <View className="gap-2">
        <Skeleton className="h-3 w-24 rounded-full" />
        <View className="gap-3 rounded-card border border-line bg-surface p-4">
          <View className="min-h-11 flex-row items-center gap-3">
            <Skeleton className="h-3.5 flex-1 rounded-full" />
            <Skeleton className="h-8 w-[51px] rounded-full" />
          </View>
          <Skeleton className="h-3 w-5/6 rounded-full" />
        </View>
      </View>
      <View className="gap-2">
        <Skeleton className="h-3 w-28 rounded-full" />
        <View className="gap-3.5 rounded-card border border-line bg-surface p-4">
          <Skeleton className="h-3 w-4/5 rounded-full" />
          <Skeleton className="h-12 w-full rounded-full" />
        </View>
      </View>
      <Skeleton className="h-12 w-full rounded-full" />
    </View>
  );
}
