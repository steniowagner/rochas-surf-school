import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { useTheme } from "@/hooks/use-theme";

import type { ClassSummaryCardProps } from "./class-summary-card.types";

/** The class in short, for the sheets that act on it: its category, level, time, day and location. */
export function ClassSummaryCard({
  discipline,
  level,
  dateLabel,
  timeRange,
  locationName,
  embedded = false,
}: ClassSummaryCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      testID="class-summary-card"
      className={embedded ? "" : "rounded-card border border-line bg-surface p-3.5"}
    >
      <View className="mb-2.5 flex-row flex-wrap items-center gap-2">
        <Chip tone={discipline === "surf" ? "surf" : "skate"}>
          {t(`newClass.discipline.${discipline}`)}
        </Chip>
        <Chip tone="info">{t(`newClass.level.${level}`)}</Chip>
      </View>
      <Text className="ds-text-day-number mb-2.5 text-ink">{timeRange}</Text>
      <View className="gap-1.5">
        <View className="flex-row items-center gap-[7px]">
          <Ionicons name="calendar-outline" size={14} color={theme.lagoon} />
          <Text className="ds-text-card-meta flex-1 text-ink-2">{dateLabel}</Text>
        </View>
        <View className="flex-row items-center gap-[7px]">
          <Ionicons name="location-outline" size={14} color={theme.lagoon} />
          <Text className="ds-text-card-meta flex-1 text-ink-2">{locationName}</Text>
        </View>
      </View>
    </View>
  );
}
