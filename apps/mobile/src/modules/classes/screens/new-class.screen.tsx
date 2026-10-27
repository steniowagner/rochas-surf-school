import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextArea } from "@/components/ui/text-area";
import { StackHeaderTitle } from "@/navigation/stack-header";

import { CapacityStepper } from "../components/capacity-stepper";
import { DateRangeCalendar } from "../components/date-range-calendar";
import { FormSection } from "../components/form-section";
import { InstructorPicker } from "../components/instructor-picker";
import { LocationPicker } from "../components/location-picker";
import { TimeRangePicker } from "../components/time-range-picker";
import { TimeRangeSheet } from "../components/time-range-sheet";

import { useNewClassScreen } from "./new-class.screen.hook";

export function NewClassScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const screen = useNewClassScreen();

  const disciplineOptions = [
    { value: "surf" as const, label: t("newClass.discipline.surf") },
    { value: "skate" as const, label: t("newClass.discipline.skate") },
  ];
  const levelOptions = [
    { value: "beginner" as const, label: t("newClass.level.beginner") },
    { value: "advanced" as const, label: t("newClass.level.advanced") },
    { value: "expert" as const, label: t("newClass.level.expert") },
  ];

  return (
    // No background on this view: a view that draws one is mounted ahead of the scroll view, and the header then
    // can't find the scroll view for its scroll-edge blur. The scroll view paints the page instead.
    <View className="flex-1">
      <Stack.Screen
        options={{
          headerTitle: () => <StackHeaderTitle title={t("newClass.title")} />,
        }}
      />
      <ScrollView
        className="flex-1 bg-page"
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-6 px-screen pb-6"
      >
        <FormSection label={t("newClass.discipline.label")}>
          <SegmentedControl
            options={disciplineOptions}
            value={screen.discipline}
            onChange={screen.setDiscipline}
          />
        </FormSection>
        <FormSection
          label={t("newClass.level.label")}
          hint={t("newClass.level.hint")}
        >
          <SegmentedControl
            options={levelOptions}
            value={screen.level}
            onChange={screen.setLevel}
          />
        </FormSection>
        <FormSection
          label={t("newClass.days.label")}
          hint={
            screen.dayCount > 0
              ? t("newClass.days.count", { count: screen.dayCount })
              : t("newClass.days.pickOne")
          }
        >
          <DateRangeCalendar
            today={screen.today}
            startDate={screen.range.startDate}
            endDate={screen.range.endDate}
            excludedDates={screen.range.excludedDates}
            onRangeChange={screen.setRange}
          />
        </FormSection>
        <FormSection
          label={t("newClass.timeRanges.label")}
          hint={
            screen.selectedRanges.length === 0
              ? t("newClass.timeRanges.pickOne")
              : undefined
          }
        >
          <TimeRangePicker
            suggestions={screen.suggestions}
            added={screen.addedRanges}
            selected={screen.selectedRanges}
            nowMinutes={screen.nowMinutes}
            onToggle={screen.toggleTimeRange}
            onAddPress={screen.openTimeSheet}
          />
        </FormSection>
        <FormSection
          label={t("newClass.location.label")}
          hint={
            screen.location === undefined
              ? t("newClass.location.pickOne")
              : undefined
          }
          action={
            screen.canManageLocations
              ? {
                  label: screen.managingLocations
                    ? t("locationPicker.done")
                    : t("locationPicker.manage"),
                  onPress: screen.toggleManagingLocations,
                }
              : undefined
          }
        >
          <LocationPicker
            locations={screen.locations}
            selectedId={screen.locationId}
            managing={screen.managingLocations}
            onSelect={screen.setLocationId}
            onEditPress={screen.openLocationEdit}
            onAddPress={screen.openNewLocation}
          />
        </FormSection>
        <FormSection label={t("newClass.capacity.label")}>
          <CapacityStepper
            value={screen.capacity}
            min={screen.capacityMin}
            max={screen.capacityMax}
            onChange={screen.changeCapacity}
          />
        </FormSection>
        <FormSection
          label={t("newClass.notes.label")}
          hint={t("newClass.notes.optional")}
        >
          <TextArea
            accessibilityLabel={t("newClass.notes.label")}
            placeholder={t("newClass.notes.placeholder")}
            value={screen.notes}
            maxLength={screen.notesMaxLength}
            onChangeText={screen.setNotes}
          />
        </FormSection>
        <FormSection
          label={t("newClass.instructors.label")}
          hint={
            screen.instructorIds.length === 0
              ? t("newClass.instructors.pickOne")
              : undefined
          }
        >
          <InstructorPicker
            teachers={screen.teachers}
            loading={screen.teachersLoading}
            error={screen.teachersError}
            selectedIds={screen.instructorIds}
            onToggle={screen.toggleInstructor}
            onRetry={screen.retryTeachers}
          />
        </FormSection>
      </ScrollView>
      <View
        className="gap-2 border-t border-line bg-page px-screen pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        {screen.classCount > 0 && !screen.tooMany ? (
          <Text className="ds-text-list-subtitle text-center text-ink-2">
            {t("newClass.summary.line", {
              days: t("newClass.summary.days", { count: screen.dayCount }),
              times: t("newClass.summary.times", {
                count: screen.selectedRanges.length,
              }),
              location: screen.location?.name ?? t("newClass.location.pickOne"),
            })}
          </Text>
        ) : null}
        {screen.tooMany ? (
          <Text className="ds-text-list-subtitle text-center text-bad">
            {t("newClass.tooMany", { max: screen.maxClasses })}
          </Text>
        ) : null}
        <Button
          variant="primary"
          loading={screen.loading}
          disabled={!screen.canSubmit}
          onPress={screen.submit}
        >
          {t("newClass.submit", { count: Math.max(screen.classCount, 1) })}
        </Button>
      </View>
      <TimeRangeSheet
        visible={screen.timeSheetVisible}
        onClose={screen.closeTimeSheet}
        onSubmit={screen.addTimeRange}
      />
    </View>
  );
}
