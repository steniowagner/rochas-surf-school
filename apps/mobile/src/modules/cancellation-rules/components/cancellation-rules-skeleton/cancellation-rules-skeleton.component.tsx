import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

/** The form of a rule (discipline switch, tips, text and save button), read out as one loading state. */
export function CancellationRulesSkeleton() {
  const { t } = useTranslation();

  return (
    <View
      testID="cancellation-rules-loading"
      accessible
      accessibilityLabel={t("cancellationRules.screen.loading")}
      className="gap-6"
    >
      <Skeleton className="h-12 w-full rounded-full" />
      <View className="gap-3 rounded-card bg-dim p-4">
        <Skeleton className="h-3.5 w-5/6 rounded-full" tone="surface" />
        <Skeleton className="h-3.5 w-2/3 rounded-full" tone="surface" />
      </View>
      <View className="gap-1.5">
        <Skeleton className="h-48 w-full rounded-card" />
        <Skeleton className="h-3 w-1/3 rounded-full" />
      </View>
      <Skeleton className="h-12 w-full rounded-full" />
    </View>
  );
}
