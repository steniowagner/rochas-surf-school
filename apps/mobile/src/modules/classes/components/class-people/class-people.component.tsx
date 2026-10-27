import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { ClassGuestRow } from "../class-guest-row";
import { ClassStudentRow } from "../class-student-row";
import { GuestAvatar } from "../guest-avatar";
import { InstructorPill } from "../instructor-pill";
import { StudentAvatar } from "../student-avatar";

import { useClassPeople } from "./class-people.hook";
import type { ClassPeopleProps } from "./class-people.types";

const STUDENT_AVATAR_SIZE = 30;

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
  onOpenStudent,
  onTakeOut,
  onTakeGuestOut,
}: ClassPeopleProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const people = useClassPeople({
    instructors,
    students,
    guests,
    seatsTaken,
    capacity,
    state,
    onOpenInstructor,
    onOpenStudent,
    onTakeOut,
  });

  const label = t(`classesWeek.students.${people.studentsLabel.key}`, {
    count: people.studentsLabel.count,
  });

  return (
    <View className="gap-2">
      <View className="flex-row items-start justify-between gap-3">
        <Text className="ds-text-section-label text-ink-2">
          {t("classDetails.theClass")}
        </Text>
        {people.showCapacityLine ? (
          <Text
            className={`ds-text-section-label shrink text-right ${people.full ? "text-bad" : "text-ink-2"}`}
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
      <View className="overflow-hidden rounded-card border border-line bg-surface">
        <View className="gap-2 bg-dim px-3.5 py-3">
          <Text className="ds-text-section-label text-ink-2">
            {t("classDetails.instructor", { count: instructors.length })}
          </Text>
          {instructors.length === 0 ? (
            <Text className="ds-text-list-title text-ink">
              {t("classDetails.noInstructorAssigned")}
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {people.instructorPills.map((pill) => (
                <InstructorPill
                  key={pill.id}
                  name={pill.label}
                  isViewer={pill.isViewer}
                  erased={pill.erased}
                  onPress={pill.onPress}
                />
              ))}
            </View>
          )}
        </View>
        <View className="border-t border-line">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: !people.canExpand,
              expanded: people.expanded,
            }}
            disabled={!people.canExpand}
            onPress={people.toggle}
            className="min-h-11 flex-row items-center gap-3 px-4 py-3"
          >
            {people.shown.length > 0 || people.hiddenSeats > 0 ? (
              <View className="flex-row items-center">
                {people.shown.map((seat, index) => (
                  <View key={seat.id} className={index === 0 ? "" : "-ml-2"}>
                    {seat.kind === "student" ? (
                      <StudentAvatar
                        name={seat.label}
                        photoUrl={seat.photoUrl}
                        size={STUDENT_AVATAR_SIZE}
                        ringed
                        erased={seat.erased}
                      />
                    ) : (
                      <GuestAvatar size={STUDENT_AVATAR_SIZE} ringed />
                    )}
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
            <Text className="ds-text-section-label flex-1 text-ink-2">
              {label}
            </Text>
            {people.canExpand ? (
              <Ionicons
                name={people.expanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.ink2}
              />
            ) : null}
          </Pressable>
          {people.expanded
            ? people.studentRows.map((row) => (
                <ClassStudentRow
                  key={row.id}
                  name={row.label}
                  photoUrl={row.photoUrl}
                  erased={row.erased}
                  onPress={row.onPress}
                  onTakeOut={row.onTakeOut}
                />
              ))
            : null}
          {people.expanded
            ? guests.map((guest) => (
                <ClassGuestRow
                  key={guest.id}
                  name={guest.name}
                  onTakeOut={
                    onTakeGuestOut ? () => onTakeGuestOut(guest) : undefined
                  }
                />
              ))
            : null}
        </View>
      </View>
    </View>
  );
}
