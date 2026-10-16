import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { useTheme } from "@/hooks/use-theme";

import { useClassCard } from "./class-card.hook";
import type { ClassCardProps } from "./class-card.types";

export function ClassCard({ item, now, onPress }: ClassCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { state, timeRange, instructors } = useClassCard({ item, now });

  const border = state === "started" ? "border-sun" : "border-line";
  const opacity = state === "finished" ? "opacity-60" : "";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(`newClass.discipline.${item.discipline}`)}, ${timeRange}`}
      onPress={() => onPress(item.id)}
      className={`overflow-hidden rounded-card border bg-surface ${border} ${opacity}`}
    >
      <View className="gap-3 p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 flex-row flex-wrap gap-2">
            <Chip
              tone={item.discipline === "surf" ? "surf" : "skate"}
              icon={item.discipline === "surf" ? "water-outline" : "disc-outline"}
            >
              {t(`newClass.discipline.${item.discipline}`)}
            </Chip>
            <Chip tone="info">{t(`newClass.level.${item.level}`)}</Chip>
          </View>
          {state === "started" ? (
            <Chip tone="sun" icon="time-outline">{t("classesWeek.state.started")}</Chip>
          ) : null}
          {state === "finished" ? (
            <Chip tone="muted">{t("classesWeek.state.finished")}</Chip>
          ) : null}
        </View>
        <Text className="ds-text-lesson-time text-ink">{timeRange}</Text>
        <View className="flex-row items-center gap-1 self-start rounded-full bg-dim px-2.5 py-1">
          <Ionicons name="location-outline" size={14} color={theme.ink2} />
          <Text className="ds-text-chip text-ink-2">{item.location.name}</Text>
        </View>
      </View>
      {instructors.length > 0 ? (
        <View className="bg-dim px-4 py-2">
          <Text className="ds-text-list-subtitle text-ink-2">{instructors}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
