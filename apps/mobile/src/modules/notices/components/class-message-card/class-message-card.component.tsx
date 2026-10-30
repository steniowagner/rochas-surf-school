import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ClassSummaryCard } from "@/modules/classes/components/class-summary-card";
import { GuestAvatar } from "@/modules/classes/components/guest-avatar";
import { StudentAvatar } from "@/modules/classes/components/student-avatar";

import { ClassMessageCardProps } from "./class-message-card.types";

const STACK_AVATAR_SIZE = 32;
const ROW_AVATAR_SIZE = 40;
const STACK_AVATARS = 3;

const roleTone = {
  instructor: "muted",
  student: "info",
  pending: "warn",
} as const;

/**
 * The class a message goes to and the people who receive it (spec 069, D-09): the class in short, then a row that opens the list of the instructors and the students with a seat, each with their role.
 */
export function ClassMessageCard({
  view,
  onOpenPerson,
}: ClassMessageCardProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const stacked = view.people.slice(0, STACK_AVATARS);
  const canExpand = view.people.length > 0;

  return (
    <View
      testID="class-message-card"
      className="overflow-hidden rounded-card bg-surface"
      style={shadowStyle("card", theme)}
    >
      <View className="px-3.5 pb-3.5 pt-[13px]">
        <ClassSummaryCard
          embedded
          discipline={view.discipline}
          level={view.level}
          dateLabel={view.dateLabel}
          timeRange={view.timeRange}
          locationName={view.locationName}
        />
      </View>
      <View className="border-t border-line">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canExpand, expanded }}
          disabled={!canExpand}
          onPress={() => setExpanded((current) => !current)}
          className="min-h-11 flex-row items-center gap-3 px-4 py-3"
        >
          {stacked.length > 0 ? (
            <View className="flex-row items-center">
              {stacked.map((person, index) => (
                <View key={person.id} className={index === 0 ? "" : "-ml-2"}>
                  {person.erased ? (
                    <GuestAvatar size={STACK_AVATAR_SIZE} ringed />
                  ) : (
                    <StudentAvatar
                      name={person.label}
                      photoUrl={person.photoUrl}
                      size={STACK_AVATAR_SIZE}
                      ringed
                    />
                  )}
                </View>
              ))}
            </View>
          ) : null}
          <View className="flex-1 gap-0.5">
            <Text className="ds-text-list-title text-ink">{view.title}</Text>
            {view.summary !== "" ? (
              <Text className="ds-text-list-subtitle text-ink-2">
                {view.summary}
              </Text>
            ) : null}
          </View>
          {canExpand ? (
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.ink2}
            />
          ) : null}
        </Pressable>
        {expanded
          ? view.people.map((person) => (
              <Pressable
                key={person.id}
                testID={`class-message-${person.role}-${person.id}`}
                accessibilityRole="button"
                accessibilityLabel={person.label}
                disabled={person.sheetPerson === null}
                onPress={() => {
                  if (person.sheetPerson) {
                    onOpenPerson(person.sheetPerson);
                  }
                }}
                className="min-h-11 flex-row items-center gap-3 border-t border-line px-4 py-3"
              >
                {person.erased ? (
                  <GuestAvatar size={ROW_AVATAR_SIZE} />
                ) : (
                  <StudentAvatar
                    name={person.label}
                    photoUrl={person.photoUrl}
                    size={ROW_AVATAR_SIZE}
                  />
                )}
                <View className="flex-1 items-start gap-1">
                  <Text
                    numberOfLines={1}
                    className="ds-text-list-title text-ink"
                  >
                    {person.label}
                  </Text>
                  <Chip tone={roleTone[person.role]} size="compact">
                    {person.roleLabel}
                  </Chip>
                </View>
                {person.sheetPerson ? (
                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color={theme.ink3}
                  />
                ) : null}
              </Pressable>
            ))
          : null}
      </View>
    </View>
  );
}
