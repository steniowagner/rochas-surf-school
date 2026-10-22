import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";
import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/**
 * A ClassCard while the classes load: the same box, paddings and gaps, with a block of each element's measures in
 * its place (an upcoming class, with the occupancy bar and students in the footer).
 */
export function ClassCardSkeleton() {
  const theme = useTheme();

  return (
    <View
      testID="class-card-skeleton"
      style={shadowStyle("card", theme)}
      className="overflow-hidden rounded-card border border-line bg-surface"
    >
      <View className="px-3.5 pb-3.5 pt-[13px]">
        {/* The discipline and level chips: px-2.5 py-1 around a 14px line. */}
        <View className="mb-2.5 flex-row items-center gap-2">
          <Skeleton className="h-[22px] w-[52px] rounded-full" />
          <Skeleton className="h-[22px] w-20 rounded-full" />
        </View>
        {/* The time range: one 38px line of ds-text-lesson-time. */}
        <Skeleton className="mb-[11px] h-[38px] w-[180px] rounded-lg" />
        {/* The location pill: a 1px border and py-[7px] around a 16px line. */}
        <Skeleton className="h-8 w-[150px] rounded-full" />
        {/* The occupancy bar and its 15px line. */}
        <View className="mt-3 gap-1.5">
          <Skeleton className="h-1.5 rounded-full" />
          <Skeleton className="h-[15px] w-[72px] rounded" />
        </View>
      </View>
      {/* The students footer: overlapping 34px avatars and the 15px label, in surface on its dim band; the dim ring keeps the gap between the avatars. */}
      <View className="flex-row items-center gap-2.5 border-t border-line bg-dim px-3.5 py-2.5">
        <View className="flex-row items-center">
          <Skeleton
            className="h-[34px] w-[34px] rounded-full border-2 border-dim"
            tone="surface"
          />
          <Skeleton
            className="-ml-2 h-[34px] w-[34px] rounded-full border-2 border-dim"
            tone="surface"
          />
          <Skeleton
            className="-ml-2 h-[34px] w-[34px] rounded-full border-2 border-dim"
            tone="surface"
          />
        </View>
        <Skeleton className="h-[15px] w-24 rounded" tone="surface" />
      </View>
    </View>
  );
}
