import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

const LOADING_CARDS = [0, 1, 2];

/** Cards shaped like registrations, read out as one loading state. */
export function RegistrationsSkeleton() {
  const { t } = useTranslation();

  return (
    <View
      testID="registrations-loading"
      accessible
      accessibilityLabel={t("registrations.loading")}
      className="gap-3"
    >
      {LOADING_CARDS.map((key) => (
        <View
          key={key}
          className="gap-4 rounded-card border border-line bg-surface p-4"
        >
          <View className="flex-row items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
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
      ))}
    </View>
  );
}
