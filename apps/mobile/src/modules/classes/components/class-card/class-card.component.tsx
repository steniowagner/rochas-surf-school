import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { useClassCard } from "./class-card.hook";
import type { ClassCardProps } from "./class-card.types";

export function ClassCard({ item, now, onPress, showFlags = false }: ClassCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { state, timeRange, instructors, withoutInstructor, withoutDeadline } = useClassCard({
    item,
    now,
  });

  const started = state === "started";
  const border = started ? "border-sun" : "border-line";
  const opacity =
    state === "finished" ? "opacity-[.55]" : state === "cancelled" ? "opacity-[.78]" : "";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(`newClass.discipline.${item.discipline}`)}, ${timeRange}`}
      onPress={() => onPress(item.id)}
      style={shadowStyle(started ? "primary" : "card", theme)}
      className={`overflow-hidden rounded-card border bg-surface ${border} ${opacity}`}
    >
      <View className="px-3.5 pb-3.5 pt-[13px]">
        <View className="mb-2.5 flex-row flex-wrap items-center gap-2">
          <Chip
            tone={item.discipline === "surf" ? "surf" : "skate"}
            icon={item.discipline === "surf" ? "water-outline" : "disc-outline"}
          >
            {t(`newClass.discipline.${item.discipline}`)}
          </Chip>
          <Chip tone="info">{t(`newClass.level.${item.level}`)}</Chip>
          <View className="ml-auto items-end gap-2">
            {state === "started" ? (
              <Chip tone="sun" icon="time-outline">{t("classesWeek.state.started")}</Chip>
            ) : null}
            {state === "finished" ? (
              <Chip tone="muted" icon="checkmark-outline">{t("classesWeek.state.finished")}</Chip>
            ) : null}
            {state === "cancelled" ? (
              <Chip tone="bad" icon="close-circle-outline">{t("classesWeek.cancelled")}</Chip>
            ) : null}
            {showFlags && withoutInstructor ? (
              <Chip tone="warn" icon="person-remove-outline">{t("classesWeek.noInstructor")}</Chip>
            ) : null}
            {showFlags && withoutDeadline ? (
              <Chip tone="warn" icon="calendar-clear-outline">{t("classesWeek.noDeadline")}</Chip>
            ) : null}
          </View>
        </View>
        <Text
          className={`ds-text-lesson-time mb-[11px] ${state === "cancelled" ? "text-ink-2 line-through" : "text-ink"}`}
        >
          {timeRange}
        </Text>
        <View className="flex-row items-center gap-[7px] self-start rounded-full border border-line bg-dim px-[13px] py-[7px]">
          <Ionicons name="location-outline" size={14} color={theme.ink2} />
          <Text className="ds-text-card-meta text-ink-2">{item.location.name}</Text>
        </View>
      </View>
      <View className="border-t border-line bg-dim px-3.5 py-2.5">
        <Text className="ds-text-chip text-ink-2">
          {instructors.length > 0 ? instructors : t("classesWeek.noInstructor")}
        </Text>
      </View>
    </Pressable>
  );
}
