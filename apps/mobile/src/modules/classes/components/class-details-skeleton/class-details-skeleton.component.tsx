import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * The class details while the class loads: the same blocks and gaps (the chips, date and time, "A aula" and
 * "Onde e como"), with a block of each element's measures in its place.
 */
export function ClassDetailsSkeleton() {
  return (
    <View testID="class-details-skeleton" className="gap-6">
      <View className="gap-2">
        {/* The discipline and level chips: px-2.5 py-1 around a 14px line. */}
        <View className="mb-1 flex-row items-center gap-2">
          <Skeleton className="h-[22px] w-[52px] rounded-full" />
          <Skeleton className="h-[22px] w-20 rounded-full" />
        </View>
        {/* The date: one 20px line of ds-text-list-title. */}
        <Skeleton className="h-5 w-40 rounded" />
        {/* The time range: one 47px line of ds-text-kpi. */}
        <Skeleton className="h-[47px] w-[220px] rounded-lg" />
      </View>
      {/* "A aula": its 15px label over the card, the instructors on a dim band, then the students' row. */}
      <View className="gap-2">
        <Skeleton className="h-[15px] w-16 rounded" />
        <View className="overflow-hidden rounded-card border border-line bg-surface">
          <View className="gap-2 bg-dim px-3.5 py-3">
            <Skeleton className="h-[15px] w-20 rounded" tone="surface" />
            <Skeleton className="h-11 w-36 rounded-full" tone="surface" />
          </View>
          {/* Overlapping 30px avatars and the 15px label; the surface ring keeps the gap between the avatars. */}
          <View className="min-h-11 flex-row items-center gap-3 border-t border-line px-4 py-3">
            <View className="flex-row items-center">
              <Skeleton className="h-[30px] w-[30px] rounded-full border-2 border-surface" />
              <Skeleton className="-ml-2 h-[30px] w-[30px] rounded-full border-2 border-surface" />
              <Skeleton className="-ml-2 h-[30px] w-[30px] rounded-full border-2 border-surface" />
            </View>
            <Skeleton className="h-[15px] w-24 rounded" />
          </View>
        </View>
      </View>
      {/* "Onde e como": its label over the card, the 96px map, then the place's name and address. */}
      <View className="gap-2">
        <Skeleton className="h-[15px] w-24 rounded" />
        <View className="overflow-hidden rounded-card border border-line bg-surface">
          <Skeleton className="h-24" />
          <View className="min-h-11 flex-row items-center gap-2.5 border-t border-line px-3.5 py-3">
            <Skeleton className="h-4 w-4 rounded-full" />
            <View className="flex-1 gap-1">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-4 w-48 rounded" />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
