import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { useTheme } from "@/hooks/use-theme";

import { useClassDayHeader } from "./class-day-header.hook";
import type { ClassDayHeaderProps } from "./class-day-header.types";

/** A class at a glance: its day block, then the chips, the time range and the location. */
export function ClassDayHeader({
  discipline,
  level,
  startsAt,
  endsAt,
  locationName,
  showYear = false,
}: ClassDayHeaderProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const header = useClassDayHeader({ startsAt, endsAt, showYear });

  return (
    <View className="flex-row items-center gap-3">
      <View className="w-16 items-center justify-center rounded-control py-3 border border-line bg-dim">
        <Text className="ds-text-chip text-lagoon">{header.weekday}</Text>
        <Text className="ds-text-calendar-day text-ink">{header.day}</Text>
        <Text className={`ds-text-chip text-ink-2 ${showYear ? "lowercase" : ""}`}>
          {header.month}
        </Text>
      </View>
      <View className="flex-1 gap-2.5">
        <View className="flex-row flex-wrap items-center gap-2">
          <Chip size="compact" tone={discipline === "surf" ? "surf" : "skate"}>
            {t(`newClass.discipline.${discipline}`)}
          </Chip>
          <Chip size="compact" tone="info">
            {t(`newClass.level.${level}`)}
          </Chip>
        </View>
        <Text className="ds-text-day-number text-ink">{header.timeRange}</Text>
        <View className="flex-row items-center gap-1 self-start rounded-full border border-line bg-dim px-2.5 py-1">
          <Ionicons name="location-outline" size={12} color={theme.ink2} />
          <Text className="ds-text-occupancy text-ink-2">{locationName}</Text>
        </View>
      </View>
    </View>
  );
}
