import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { Chip } from "@/components/ui/chip";
import { DecisionCard } from "@/components/decision/decision-card";
import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { StudentAvatar } from "@/modules/classes/components/student-avatar";
import {
  getFreeSeats,
  getOccupancyPercent,
  getOccupancyTone,
  isClassFull,
} from "@/modules/classes/utils/occupancy";
import { schoolTimeOf } from "@/modules/classes/utils/week";
import { getDateLocale } from "@/utils/calendar-dates";

import { formatAskedAt, formatDayBlock } from "../../utils/class-requests";

import type { ClassRequestsGroupProps } from "./class-requests-group.types";

const AVATAR_SIZE = 40;

const FILL_CLASSES = {
  bad: "bg-bad",
  sun: "bg-sun",
  lagoon: "bg-lagoon",
  tan: "bg-tan",
} as const;

/** One upcoming class of the admins' tool: a single card with the class header and occupancy, then its pending requests. */
export function ClassRequestsGroup({
  item,
  sending,
  onApprove,
  onDeny,
  onOpenClass,
  onOpenStudent,
}: ClassRequestsGroupProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale = getDateLocale(i18n.language);
  const block = formatDayBlock(item.startsAt, locale);
  const full = isClassFull(item.seatsTaken, item.capacity);
  const tone = getOccupancyTone(
    item.seatsTaken,
    item.capacity,
    item.discipline,
  );

  return (
    <View
      className="overflow-hidden rounded-card border border-line bg-surface"
      style={shadowStyle("card", theme)}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${t(`newClass.discipline.${item.discipline}`)}, ${schoolTimeOf(item.startsAt)} – ${schoolTimeOf(item.endsAt)}`}
        activeOpacity={BUTTON_ACTIVE_OPACITY}
        onPress={() => onOpenClass(item)}
        className="gap-3 bg-dim p-4"
      >
        <View className="flex-row items-center gap-3">
          <View className="w-16 items-center justify-center rounded-control py-3 border border-line bg-dim">
            <Text className="ds-text-chip text-lagoon">{block.weekday}</Text>
            <Text className="ds-text-calendar-day text-ink">{block.day}</Text>
            <Text className="ds-text-chip lowercase text-ink-2">{`${block.month} ${block.year}`}</Text>
          </View>
          <View className="flex-1 gap-2.5">
            <View className="flex-row flex-wrap items-center gap-2">
              <Chip
                size="compact"
                tone={item.discipline === "surf" ? "surf" : "skate"}
              >
                {t(`newClass.discipline.${item.discipline}`)}
              </Chip>
              <Chip size="compact" tone="info">
                {t(`newClass.level.${item.level}`)}
              </Chip>
            </View>
            <Text className="ds-text-day-number text-ink">
              {`${schoolTimeOf(item.startsAt)} – ${schoolTimeOf(item.endsAt)}`}
            </Text>
            <View className="flex-row items-center gap-1 self-start rounded-full border border-line bg-dim px-2.5 py-1">
              <Ionicons name="location-outline" size={12} color={theme.ink2} />
              <Text className="ds-text-occupancy text-ink-2">
                {item.location.name}
              </Text>
            </View>
          </View>
        </View>
        <View className="gap-1.5">
          <View className="h-1.5 overflow-hidden rounded-full bg-sand">
            <View
              testID="occupancy-fill"
              style={{
                width: `${getOccupancyPercent(item.seatsTaken, item.capacity)}%`,
              }}
              className={`h-full rounded-full ${FILL_CLASSES[tone]}`}
            />
          </View>
          <View className="flex-row justify-between">
            <Text className="ds-text-occupancy text-ink-2">
              {t("classRequests.maxStudents", { count: item.capacity })}
            </Text>
            <Text
              className={`ds-text-occupancy ${full ? "text-bad" : "text-ink-2"}`}
            >
              {full
                ? t("classRequests.full")
                : t("classRequests.spotsLeft", {
                    count: getFreeSeats(item.seatsTaken, item.capacity),
                  })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      {full ? (
        <View className="gap-1 border-t border-line px-4 py-3">
          <Text className="ds-text-section-label text-ink-2">
            {t("classRequests.waitingList")}
          </Text>
          <Text className="ds-text-list-subtitle text-ink-2">
            {t("classRequests.fullNote")}
          </Text>
        </View>
      ) : null}
      {item.requests.map((request, index) => {
        const asked = formatAskedAt(request.requestedAt, locale);
        const position = t("classRequests.position", { position: index + 1 });

        return (
          <View key={request.id} className="border-t border-line">
            <DecisionCard
              embedded
              title={
                full
                  ? `${position} ${request.student.name}`
                  : request.student.name
              }
              details={[t("classRequests.askedAt", asked)]}
              avatar={
                <StudentAvatar
                  name={request.student.name}
                  photoUrl={request.student.photoUrl}
                  size={AVATAR_SIZE}
                />
              }
              approveLabel={t("classRequests.approve")}
              denyLabel={t("classRequests.deny")}
              onPress={() => onOpenStudent(request)}
              onApprove={() => onApprove(request, item)}
              onDeny={() => onDeny(request)}
              approveDisabled={full}
              disabled={request.id in sending}
              loading={sending[request.id]}
            />
          </View>
        );
      })}
    </View>
  );
}
