import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextArea } from "@/components/ui/text-area";
import { useTheme } from "@/hooks/use-theme";
import { StackHeaderTitle } from "@/navigation/stack-header";

import { CapacityStepper } from "../components/capacity-stepper";
import { DateRangeCalendar } from "../components/date-range-calendar";
import { FormSection } from "../components/form-section";
import { GuestsWarning } from "../components/guests-warning";
import { InstructorPicker } from "../components/instructor-picker";
import { LocationPicker } from "../components/location-picker";
import { LocationSheet } from "../components/location-sheet";
import { TimeRangePicker } from "../components/time-range-picker";
import { TimeRangeSheet } from "../components/time-range-sheet";

import { useEditClassScreen } from "./edit-class.screen.hook";

export function EditClassScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const screen = useEditClassScreen();
  const { form } = screen;

  const disciplineOptions = [
    { value: "surf" as const, label: t("newClass.discipline.surf") },
    { value: "skate" as const, label: t("newClass.discipline.skate") },
  ];
  const levelOptions = [
    { value: "beginner" as const, label: t("newClass.level.beginner") },
    { value: "advanced" as const, label: t("newClass.level.advanced") },
    { value: "expert" as const, label: t("newClass.level.expert") },
  ];

  const header = (
    <Stack.Screen
      options={{
        headerTitle: () => <StackHeaderTitle title={t("editClass.title")} />,
      }}
    />
  );

  if (form === null || screen.isFinished || screen.isCancelled) {
    return (
      <View className="flex-1 bg-page">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="grow gap-6 px-screen pt-3"
        >
          {header}
          {screen.isLoading ? (
            <ActivityIndicator
              testID="edit-class-loading"
              color={theme.grape}
            />
          ) : screen.isNotFound ? (
            <Text className="ds-text-body text-center text-ink-2">
              {t("classDetails.notFound")}
            </Text>
          ) : screen.isError ? (
            <View className="items-center gap-3">
              <Text className="ds-text-body text-center text-ink-2">
                {t("classDetails.loadError")}
              </Text>
              <Button variant="outline" onPress={screen.retry}>
                {t("classDetails.retry")}
              </Button>
            </View>
          ) : screen.isCancelled ? (
            <Text className="ds-text-body text-center text-ink-2">
              {t("editClass.errors.cancelled")}
            </Text>
          ) : screen.isFinished ? (
            <Text className="ds-text-body text-center text-ink-2">
              {t("editClass.errors.finished")}
            </Text>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-page">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-6 px-screen pb-6"
      >
        {header}
        {screen.isStarted ? (
          <View className="gap-1 rounded-card bg-sun p-4">
            <Text className="ds-text-list-title text-on-color">
              {t("editClass.started.title")}
            </Text>
            <Text className="ds-text-list-subtitle text-on-color">
              {t("editClass.started.description")}
            </Text>
          </View>
        ) : (
          <>
            <FormSection label={t("newClass.discipline.label")}>
              <SegmentedControl
                options={disciplineOptions}
                value={form.discipline}
                onChange={screen.setDiscipline}
              />
            </FormSection>
            <FormSection
              label={t("newClass.level.label")}
              hint={t("newClass.level.hint")}
            >
              <SegmentedControl
                options={levelOptions}
                value={form.level}
                onChange={screen.setLevel}
              />
            </FormSection>
            <FormSection
              label={t("editClass.day.label")}
              hint={t("editClass.day.hint")}
            >
              <DateRangeCalendar
                single
                today={screen.today}
                startDate={form.date}
                endDate={null}
                excludedDates={[]}
                onRangeChange={screen.selectDate}
              />
            </FormSection>
            <FormSection label={t("editClass.time.label")}>
              <TimeRangePicker
                single
                suggestions={screen.suggestions}
                added={screen.addedRanges}
                selected={[form.range]}
                ownRange={screen.ownRange}
                nowMinutes={screen.nowMinutes}
                onToggle={screen.selectRange}
                onAddPress={screen.openTimeSheet}
              />
            </FormSection>
            <FormSection
              label={t("newClass.location.label")}
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
                selectedId={form.locationId}
                managing={screen.managingLocations}
                onSelect={screen.setLocationId}
                onEditPress={screen.openLocationEdit}
                onAddPress={screen.openLocationSheet}
              />
            </FormSection>
            <FormSection label={t("newClass.capacity.label")}>
              <CapacityStepper
                value={form.capacity}
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
                value={form.notes}
                maxLength={screen.notesMaxLength}
                onChangeText={screen.setNotes}
              />
            </FormSection>
          </>
        )}
        <FormSection
          label={t("newClass.instructors.label")}
          hint={
            form.instructorIds.length === 0
              ? t("newClass.instructors.pickOne")
              : undefined
          }
        >
          <InstructorPicker
            teachers={screen.teachers}
            loading={screen.teachersLoading}
            error={screen.teachersError}
            selectedIds={form.instructorIds}
            onToggle={screen.toggleInstructor}
            onRetry={screen.retryTeachers}
          />
        </FormSection>
      </ScrollView>
      <View
        className="gap-2 border-t border-line bg-page px-screen pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <GuestsWarning count={screen.guestCount} />
        <Text className="ds-text-list-subtitle text-center text-ink-2">
          {screen.note}
        </Text>
        <Button
          variant="primary"
          loading={screen.loading}
          disabled={!screen.canSubmit}
          onPress={screen.submit}
        >
          {t("editClass.submit")}
        </Button>
      </View>
      <TimeRangeSheet
        visible={screen.timeSheetVisible}
        onClose={screen.closeTimeSheet}
        onSubmit={screen.addTimeRange}
      />
      <LocationSheet
        visible={screen.locationSheetVisible}
        locations={screen.activeLocations}
        location={screen.editingLocation}
        onClose={screen.closeLocationSheet}
        onCreated={screen.selectLocation}
        onRemoved={screen.unselectLocation}
      />
    </View>
  );
}
