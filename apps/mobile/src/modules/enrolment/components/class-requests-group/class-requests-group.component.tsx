import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

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

/** One upcoming class of the admins' tool: its header with the occupancy, then a card per pending request. */
export function ClassRequestsGroup({ item, sending, onApprove, onDeny }: ClassRequestsGroupProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale = getDateLocale(i18n.language);
  const block = formatDayBlock(item.startsAt, locale);
  const full = isClassFull(item.seatsTaken, item.capacity);
  const tone = getOccupancyTone(item.seatsTaken, item.capacity, item.discipline);

  return (
    <View className="gap-3">
      <View
        className="gap-3 rounded-card border border-line bg-surface p-4"
        style={shadowStyle("card", theme)}
      >
        <View className="flex-row items-center gap-3">
          <View className="h-14 w-12 items-center justify-center rounded-card bg-sand">
            <Text className="ds-text-pill text-ink-2">{block.weekday}</Text>
            <Text className="ds-text-calendar-day text-ink">{block.day}</Text>
            <Text className="ds-text-pill text-ink-2">{block.month}</Text>
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="ds-text-list-title text-ink">
              {`${t(`newClass.discipline.${item.discipline}`)} · ${t(`newClass.level.${item.level}`)}`}
            </Text>
            <Text className="ds-text-list-subtitle text-ink-2">
              {`${schoolTimeOf(item.startsAt)} – ${schoolTimeOf(item.endsAt)}`}
            </Text>
            <View className="flex-row items-center gap-1">
              <Ionicons name="location-outline" size={14} color={theme.ink2} />
              <Text className="ds-text-card-meta text-ink-2">{item.location.name}</Text>
            </View>
          </View>
        </View>
        <View className="gap-1.5">
          <View className="h-1.5 overflow-hidden rounded-full bg-sand">
            <View
              testID="occupancy-fill"
              style={{ width: `${getOccupancyPercent(item.seatsTaken, item.capacity)}%` }}
              className={`h-full rounded-full ${FILL_CLASSES[tone]}`}
            />
          </View>
          <View className="flex-row justify-between">
            <Text className="ds-text-occupancy text-ink-2">
              {t("classRequests.maxStudents", { count: item.capacity })}
            </Text>
            <Text className={`ds-text-occupancy ${full ? "text-bad" : "text-ink-2"}`}>
              {full
                ? t("classRequests.full")
                : t("classRequests.spotsLeft", { count: getFreeSeats(item.seatsTaken, item.capacity) })}
            </Text>
          </View>
        </View>
      </View>
      {full ? (
        <View className="gap-1">
          <Text className="ds-text-section-label text-ink-2">{t("classRequests.waitingList")}</Text>
          <Text className="ds-text-list-subtitle text-ink-2">{t("classRequests.fullNote")}</Text>
        </View>
      ) : null}
      {item.requests.map((request, index) => {
        const asked = formatAskedAt(request.requestedAt, locale);
        const position = t("classRequests.position", { position: index + 1 });

        return (
          <DecisionCard
            key={request.id}
            title={full ? `${position} ${request.student.name}` : request.student.name}
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
            onApprove={() => onApprove(request, item)}
            onDeny={() => onDeny(request)}
            approveDisabled={full}
            disabled={request.id in sending}
            loading={sending[request.id]}
          />
        );
      })}
    </View>
  );
}
