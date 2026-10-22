import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { Chip } from "@/components/ui/chip";
import { useTheme } from "@/hooks/use-theme";

import { InstructorPill } from "../instructor-pill";
import { StudentAvatar } from "../student-avatar";

import { useClassPeople } from "./class-people.hook";
import type { ClassPeopleProps } from "./class-people.types";

const STUDENT_AVATAR_SIZE = 28;

/** The "A aula" group of the class details: who teaches, who is enrolled, and how many seats are left. */
export function ClassPeople({
  instructors,
  students,
  guests,
  showTrialCount = false,
  seatsTaken,
  capacity,
  state,
  onOpenInstructor,
  onTakeOut,
  onTakeGuestOut,
}: ClassPeopleProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const people = useClassPeople({
    students,
    guests,
    seatsTaken,
    capacity,
    state,
  });

  const label = t(`classesWeek.students.${people.studentsLabel.key}`, {
    count: people.studentsLabel.count,
  });

  return (
    <View className="gap-2">
      <Text className="ds-text-section-label text-ink-2">{t("classDetails.theClass")}</Text>
      <View className="overflow-hidden rounded-card border border-line bg-surface">
        <View className="gap-2 bg-dim px-3.5 py-3">
          <Text className="ds-text-section-label text-ink-2">
            {t("classDetails.instructor", { count: instructors.length })}
          </Text>
          {instructors.length === 0 ? (
            <Text className="ds-text-list-title text-ink">{t("classDetails.noInstructorAssigned")}</Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {instructors.map((instructor) => (
                <InstructorPill
                  key={instructor.id}
                  name={instructor.name}
                  isViewer={instructor.isViewer}
                  onPress={() => onOpenInstructor?.(instructor)}
                />
              ))}
            </View>
          )}
        </View>
        <View className="border-t border-line">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !people.canExpand, expanded: people.expanded }}
            disabled={!people.canExpand}
            onPress={people.toggle}
            className="min-h-11 flex-row items-center gap-3 px-4 py-3"
          >
            {people.shown.length > 0 || people.hiddenSeats > 0 ? (
              <View className="flex-row items-center">
                {people.shown.map((student, index) => (
                  <View key={student.id} className={index === 0 ? "" : "-ml-2"}>
                    <StudentAvatar
                      name={student.name}
                      photoUrl={student.photoUrl}
                      size={STUDENT_AVATAR_SIZE}
                      ringed
                    />
                  </View>
                ))}
                {people.hiddenSeats > 0 ? (
                  <View
                    style={{
                      width: STUDENT_AVATAR_SIZE,
                      height: STUDENT_AVATAR_SIZE,
                      borderRadius: STUDENT_AVATAR_SIZE / 2,
                    }}
                    className="-ml-2 items-center justify-center border-2 border-surface bg-sand"
                  >
                    <Text className="ds-text-chip text-ink">{`+${people.hiddenSeats}`}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            <Text className="ds-text-section-label flex-1 text-ink-2">{label}</Text>
            {people.canExpand ? (
              <Ionicons
                name={people.expanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.ink2}
              />
            ) : null}
          </Pressable>
          {people.expanded
            ? students.map((student) => (
                <View
                  key={student.id}
                  className="flex-row items-center gap-3 border-t border-line px-4 py-2"
                >
                  <StudentAvatar
                    name={student.name}
                    photoUrl={student.photoUrl}
                    size={STUDENT_AVATAR_SIZE}
                  />
                  <Text className="ds-text-list-title flex-1 text-ink">{student.name}</Text>
                  {onTakeOut ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`${t("takeOutSheet.action")} ${student.name}`}
                      activeOpacity={BUTTON_ACTIVE_OPACITY}
                      onPress={() => onTakeOut(student)}
                      className="min-h-11 items-center justify-center rounded-full border border-line px-4"
                    >
                      <Text className="ds-text-chip text-bad">{t("takeOutSheet.action")}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))
            : null}
          {people.expanded
            ? guests.map((guest) => {
                const name = guest.name ?? t("classDetails.trialChip");

                return (
                  <View
                    key={guest.id}
                    className="flex-row items-center gap-3 border-t border-line px-4 py-2"
                  >
                    <StudentAvatar name={name} photoUrl={null} size={STUDENT_AVATAR_SIZE} />
                    <Text className="ds-text-list-title flex-1 text-ink">{name}</Text>
                    <View className="justify-center">
                      <Chip tone="muted">{t("classDetails.trialChip")}</Chip>
                    </View>
                    {onTakeGuestOut ? (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`${t("takeOutSheet.action")} ${name}`}
                        activeOpacity={BUTTON_ACTIVE_OPACITY}
                        onPress={() => onTakeGuestOut(guest)}
                        className="min-h-11 items-center justify-center rounded-full border border-line px-4"
                      >
                        <Text className="ds-text-chip text-bad">{t("takeOutSheet.action")}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })
            : null}
        </View>
      </View>
      {people.showCapacityLine ? (
        <Text
          className={`ds-text-list-subtitle ${people.full ? "text-bad" : "text-ink-2"}`}
        >
          {`${t("classDetails.capacity", { count: capacity })} · ${
            people.full
              ? t("classDetails.soldOut")
              : t("classDetails.spotsLeft", { count: people.freeSeats })
          }${
            showTrialCount && guests.length > 0
              ? ` · ${t("classDetails.includesTrial", { count: guests.length })}`
              : ""
          }`}
        </Text>
      ) : null}
    </View>
  );
}
