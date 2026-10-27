import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { StudentAvatar } from "../student-avatar";

import { useOngoingClassCard } from "./ongoing-class-card.hook";
import type { OngoingClassCardProps } from "./ongoing-class-card.types";

const AVATAR_SIZE = 34;
// The avatars sit inside a 2pt grape ring, so the ring and the photo make AVATAR_SIZE together.
const RING = 2;

/** "Minhas aulas": a class under way, on a grape card, with the content of `ClassCard`. */
export function OngoingClassCard({ item, onPress }: OngoingClassCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const card = useOngoingClassCard({ item });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(`newClass.discipline.${item.discipline}`)}, ${card.timeRange}`}
      onPress={() => onPress(item.id)}
      style={shadowStyle("primary", theme)}
      className="overflow-hidden rounded-card border border-grape bg-grape"
    >
      <View className="px-3.5 pb-3.5 pt-[13px]">
        <View className="mb-2.5 flex-row flex-wrap items-center gap-2">
          <Chip tone={item.discipline === "surf" ? "surf" : "skate"}>
            {t(`newClass.discipline.${item.discipline}`)}
          </Chip>
          <Chip tone="onHighlight">{t(`newClass.level.${item.level}`)}</Chip>
          <View className="ml-auto">
            <Chip tone="onHighlight" icon="time-outline">
              {t("classesWeek.state.started")}
            </Chip>
          </View>
        </View>
        <Text className="ds-text-lesson-time mb-[11px] text-on-color">
          {card.timeRange}
        </Text>
        <View className="flex-row items-center gap-[7px] self-start rounded-full border border-on-grape-tint bg-on-grape-fill px-[13px] py-[7px]">
          <Ionicons name="location-outline" size={14} color={theme.onColor} />
          <Text className="ds-text-card-meta text-on-color">
            {item.location.name}
          </Text>
        </View>
        <View className="mt-3 gap-1.5">
          <View className="h-1.5 overflow-hidden rounded-full bg-on-grape-track">
            <View
              testID="occupancy-fill"
              style={{ width: `${card.occupancyPercent}%` }}
              className={`h-full rounded-full ${card.full ? "bg-bad" : "bg-on-color"}`}
            />
          </View>
          <Text
            className={`ds-text-occupancy ${card.full ? "text-on-grape-bad" : "text-on-color"}`}
          >
            {t("classesWeek.occupancy", {
              taken: item.seatsTaken,
              capacity: item.capacity,
            })}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-2.5 border-t border-on-grape-tint bg-on-grape-shade px-3.5 py-2.5">
        {card.avatars.length > 0 || card.hiddenSeats > 0 ? (
          <View className="flex-row items-center">
            {card.avatars.map((student, index) => (
              <View
                key={student.id}
                style={{ borderRadius: AVATAR_SIZE / 2 }}
                className={`border-2 border-grape ${index === 0 ? "" : "-ml-2"}`}
              >
                <StudentAvatar
                  name={student.label}
                  photoUrl={student.photoUrl}
                  size={AVATAR_SIZE - 2 * RING}
                  erased={student.erased}
                />
              </View>
            ))}
            {card.hiddenSeats > 0 ? (
              <View
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: AVATAR_SIZE / 2,
                }}
                className="-ml-2 items-center justify-center border-2 border-grape bg-sand"
              >
                <Text className="ds-text-chip text-ink">{`+${card.hiddenSeats}`}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <Text className="ds-text-section-label flex-1 text-on-color">
          {t(`classesWeek.students.${card.studentsLabel.key}`, {
            count: card.studentsLabel.count,
          })}
        </Text>
      </View>
    </Pressable>
  );
}
