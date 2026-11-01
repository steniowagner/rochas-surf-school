import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { useTheme } from "@/hooks/use-theme";

import { useRequestSeatClassCard } from "./request-seat-class-card.hook";
import type { RequestSeatClassCardProps } from "./request-seat-class-card.types";

/** The class the student asks to join: the chips, its day and time range, and the location. */
export function RequestSeatClassCard({
  discipline,
  level,
  startsAt,
  endsAt,
  locationName,
}: RequestSeatClassCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const card = useRequestSeatClassCard({ startsAt, endsAt });

  return (
    <View className="items-start gap-3 rounded-card border border-line bg-surface p-4">
      <View className="flex-row flex-wrap gap-2">
        <Chip tone={discipline === "surf" ? "surf" : "skate"}>
          {t(`newClass.discipline.${discipline}`)}
        </Chip>
        <Chip tone="info">{t(`newClass.level.${level}`)}</Chip>
      </View>
      <View className="flex-row self-stretch">
        <View className="gap-1 pr-4">
          <Text className="ds-text-section-label text-ink-2">{card.weekday}</Text>
          <Text className="ds-text-lesson-time text-sun" numberOfLines={1}>
            {card.date}
          </Text>
        </View>
        <View className="w-px bg-line" />
        <View className="flex-1 gap-1 pl-4">
          <Text className="ds-text-section-label text-ink-2">{card.duration}</Text>
          <Text className="ds-text-lesson-time text-ink" adjustsFontSizeToFit numberOfLines={1}>
            {card.timeRange}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-[7px] rounded-full border border-line bg-dim px-[13px] py-[7px]">
        <Ionicons name="location-outline" size={14} color={theme.ink2} />
        <Text className="ds-text-card-meta shrink text-ink-2" numberOfLines={1}>
          {locationName}
        </Text>
      </View>
    </View>
  );
}
