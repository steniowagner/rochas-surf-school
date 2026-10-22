import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { toChipTone } from "@/modules/enrolment/utils/enrolment-status";

import { StudentAvatar } from "../student-avatar";

import { useClassCard } from "./class-card.hook";
import type { ClassCardProps } from "./class-card.types";

const AVATAR_SIZE = 34;

const FILL_CLASSES = {
  bad: "bg-bad",
  sun: "bg-sun",
  lagoon: "bg-lagoon",
  tan: "bg-tan",
} as const;

export function ClassCard({
  item,
  now,
  onPress,
  showFlags = false,
  showEnrolment = false,
}: ClassCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const card = useClassCard({ item, now, showEnrolment });
  const { state, timeRange } = card;

  const started = state === "started";
  const border = started ? "border-sun" : "border-line";
  const opacity =
    state === "finished"
      ? "opacity-[.55]"
      : state === "cancelled"
        ? "opacity-[.78]"
        : "";

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
          <Chip tone={item.discipline === "surf" ? "surf" : "skate"}>
            {t(`newClass.discipline.${item.discipline}`)}
          </Chip>
          <Chip tone="info">{t(`newClass.level.${item.level}`)}</Chip>
          <View className="ml-auto items-end gap-2">
            {state === "started" ? (
              <Chip tone="sun" icon="time-outline">
                {t("classesWeek.state.started")}
              </Chip>
            ) : null}
            {state === "finished" ? (
              <Chip tone="muted" icon="checkmark-outline">
                {t("classesWeek.state.finished")}
              </Chip>
            ) : null}
            {state === "cancelled" ? (
              <Chip tone="bad" icon="close-circle-outline">
                {t("classesWeek.cancelled")}
              </Chip>
            ) : null}
            {card.enrolment ? (
              <Chip
                tone={toChipTone(card.enrolment.tone)}
                icon={card.enrolment.icon}
              >
                {t(`enrolment.status.${card.enrolment.key}.chip`)}
              </Chip>
            ) : null}
            {card.showFullChip ? (
              <Chip tone="bad">{t("classesWeek.full")}</Chip>
            ) : null}
            {showFlags && card.withoutInstructor ? (
              <Chip tone="warn" icon="person-remove-outline">
                {t("classesWeek.noInstructor")}
              </Chip>
            ) : null}
            {showFlags && card.withoutDeadline ? (
              <Chip tone="warn" icon="calendar-clear-outline">
                {t("classesWeek.noDeadline")}
              </Chip>
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
          <Text className="ds-text-card-meta text-ink-2">
            {item.location.name}
          </Text>
        </View>
        {card.showOccupancy ? (
          <View className="mt-3 gap-1.5">
            <View className="h-1.5 overflow-hidden rounded-full bg-sand">
              <View
                testID="occupancy-fill"
                style={{ width: `${card.occupancyPercent}%` }}
                className={`h-full rounded-full ${FILL_CLASSES[card.occupancyTone]}`}
              />
            </View>
            <Text
              className={`ds-text-occupancy ${card.full ? "text-bad" : "text-ink-2"}`}
            >
              {t("classesWeek.occupancy", {
                taken: item.seatsTaken,
                capacity: item.capacity,
              })}
            </Text>
          </View>
        ) : null}
      </View>
      {card.showFooter ? (
        <View className="flex-row items-center gap-2.5 border-t border-line bg-dim px-3.5 py-2.5">
          {card.avatars.length > 0 || card.hiddenSeats > 0 ? (
            <View className="flex-row items-center">
              {card.avatars.map((student, index) => (
                <View key={student.id} className={index === 0 ? "" : "-ml-2"}>
                  <StudentAvatar
                    name={student.name}
                    photoUrl={student.photoUrl}
                    size={AVATAR_SIZE}
                    ringed
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
                  className="-ml-2 items-center justify-center border-2 border-surface bg-sand"
                >
                  <Text className="ds-text-chip text-ink">{`+${card.hiddenSeats}`}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <Text className="ds-text-section-label flex-1 text-ink-2">
            {t(`classesWeek.students.${card.studentsLabel.key}`, {
              count: card.studentsLabel.count,
            })}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
