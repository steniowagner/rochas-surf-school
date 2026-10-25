import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PhoneNumberField } from "@/components/phone-number-field";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextInput } from "@/components/ui/text-input";
import { WeekMonthCalendar } from "@/components/week-month-calendar";
import { useTheme } from "@/hooks/use-theme";
import { ClassCard } from "@/modules/classes/components/class-card";
import { ClassCardSkeleton } from "@/modules/classes/components/class-card-skeleton";
import { PersonAvatar } from "@/modules/people/components/person-avatar";
import { useCollapsingTitleHeader } from "@/navigation/stack-header";

import { EnrolStudentStudentsSkeleton } from "../components/enrol-student-students-skeleton";

import { useEnrolStudentScreen } from "./enrol-student.screen.hook";

const LOADING_CLASSES = [0, 1];
const CONTENT_PADDING_TOP = 8;

export function EnrolStudentScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const screen = useEnrolStudentScreen();
  const header = useCollapsingTitleHeader({
    title: t("enrolStudent.title"),
    contentTop: CONTENT_PADDING_TOP,
  });

  const renderStudents = () => {
    if (screen.isLoadingStudents) {
      return <EnrolStudentStudentsSkeleton />;
    }

    if (screen.isStudentsError) {
      return (
        <View className="flex-row">
          <ErrorState
            title={t("enrolStudent.students.loadError.title")}
            description={t("enrolStudent.students.loadError.description")}
            onRetry={screen.retryStudents}
          />
        </View>
      );
    }

    if (screen.hasNoStudents) {
      return (
        <View className="flex-row">
          <EmptyState
            icon="people-outline"
            title={t("enrolStudent.students.empty.title")}
            description={t("enrolStudent.students.empty.description")}
          />
        </View>
      );
    }

    return (
      <ScrollView
        testID="enrol-student-students"
        nestedScrollEnabled
        scrollEventThrottle={100}
        onScroll={screen.loadMoreOnScroll}
        className="max-h-72 rounded-card border border-line bg-surface"
      >
        {screen.students.map((student, index) => {
          const { selected } = student;

          return (
            <Pressable
              key={student.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={student.name}
              onPress={() => screen.selectStudent(student)}
              className={`min-h-14 flex-row items-center gap-3 px-4 py-2 ${index === 0 ? "" : "border-t border-line"}`}
            >
              <PersonAvatar name={student.name} />
              <Text numberOfLines={1} className="ds-text-list-title flex-1 text-ink">
                {student.name}
              </Text>
              <Ionicons
                name={selected ? "radio-button-on" : "radio-button-off"}
                size={22}
                color={selected ? theme.grape : theme.ink3}
              />
            </Pressable>
          );
        })}
        {screen.isFetchingMoreStudents ? (
          <ActivityIndicator testID="enrol-student-more-loading" color={theme.ink2} className="py-3" />
        ) : null}
      </ScrollView>
    );
  };

  const renderClasses = () => {
    if (screen.isLoadingClasses) {
      return (
        <View
          testID="enrol-student-classes-loading"
          accessible
          accessibilityLabel={t("enrolStudent.classes.loading")}
          className="gap-3"
        >
          {LOADING_CLASSES.map((key) => (
            <ClassCardSkeleton key={key} />
          ))}
        </View>
      );
    }

    if (screen.isClassesError) {
      return (
        <View className="flex-row">
          <ErrorState
            title={t("enrolStudent.classes.loadError.title")}
            description={t("enrolStudent.classes.loadError.description")}
            onRetry={screen.retryClasses}
          />
        </View>
      );
    }

    if (screen.dayItems.length === 0) {
      return (
        <View className="flex-row">
          <EmptyState
            icon="calendar-outline"
            title={t("enrolStudent.classes.empty.title")}
            description={t("enrolStudent.classes.empty.description")}
          />
        </View>
      );
    }

    return (
      <View className="gap-3">
        {screen.classCards.map(({ item, full, selected }) => (
          <View
            key={item.id}
            accessibilityState={{ selected, disabled: full }}
            pointerEvents={full ? "none" : "auto"}
            className={`rounded-card border-2 ${selected ? "border-grape" : "border-transparent"} ${full ? "opacity-50" : ""}`}
          >
            <ClassCard item={item} now={screen.now} onPress={screen.selectClass} />
          </View>
        ))}
      </View>
    );
  };

  const renderTrialGuest = () => (
    <View className="gap-3">
      <View className="gap-2">
        <Text className="ds-text-section-label text-ink-2">{t("enrolStudent.trial.nameLabel")}</Text>
        <TextInput
          icon={null}
          value={screen.guestName}
          onChangeText={screen.setGuestName}
          onBlur={screen.touchGuestName}
          status={screen.guestNameStatus}
          errorMessage={t("enrolStudent.trial.invalidName")}
          placeholder={t("enrolStudent.trial.namePlaceholder")}
          accessibilityLabel={t("enrolStudent.trial.nameLabel")}
          autoCapitalize="words"
          autoComplete="name"
        />
      </View>
      <View className="gap-2">
        <Text className="ds-text-section-label text-ink-2">
          {t("enrolStudent.trial.whatsappLabel")}
        </Text>
        <PhoneNumberField
          country={screen.phone.country}
          dialCode={screen.phone.dialCode}
          numberInput={screen.phone.numberInput}
          onSelectCountry={screen.phone.onSelectCountry}
          label={t("enrolStudent.trial.whatsappLabel")}
        />
      </View>
      <Text className="ds-text-list-subtitle text-ink-2">{t("enrolStudent.trial.note")}</Text>
    </View>
  );

  return (
    <>
      <Stack.Screen options={header.headerOptions} />
      <Animated.ScrollView
        testID="enrol-student-screen"
        className="flex-1 bg-page"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-5 px-screen"
        onScroll={header.scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: CONTENT_PADDING_TOP, paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <ScreenIntro
          icon={<Ionicons name="person-add-outline" size={28} color={theme.grape} />}
          title={t("enrolStudent.title")}
          description={t("enrolStudent.description")}
          onTitleLayout={header.onTitleBottomChange}
        />
        <SegmentedControl
          options={[
            { value: "trial", label: t("enrolStudent.modeTrial") },
            { value: "student", label: t("enrolStudent.modeStudent") },
          ]}
          value={screen.mode}
          onChange={screen.setMode}
        />
        <View className="gap-3">
          <Text className="ds-text-section-label text-ink-2">{t("enrolStudent.whoStep")}</Text>
          {screen.mode === "trial" ? (
            renderTrialGuest()
          ) : (
            <>
              <TextInput
                icon={<Ionicons name="search" size={20} color={theme.ink2} />}
                value={screen.searchText}
                onChangeText={screen.setSearchText}
                placeholder={t("enrolStudent.searchPlaceholder")}
                accessibilityLabel={t("enrolStudent.searchLabel")}
                clearable
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {renderStudents()}
            </>
          )}
        </View>
        <View className="gap-3">
          <Text className="ds-text-section-label text-ink-2">{t("enrolStudent.classStep")}</Text>
          <WeekMonthCalendar
            selectedDate={screen.selectedDate}
            today={screen.today}
            markedDates={screen.markedDates}
            markedLabel={t("enrolStudent.hasClasses")}
            onSelectDate={screen.selectDate}
            onVisibleRangeChange={screen.updateVisibleRange}
          />
          {renderClasses()}
        </View>
        <Button
          disabled={!screen.submit}
          loading={screen.isSubmitting}
          onPress={screen.submit}
        >
          {screen.submitName
            ? t("enrolStudent.submit", { name: screen.submitName })
            : t("enrolStudent.submitEmpty")}
        </Button>
      </Animated.ScrollView>
      {header.backdrop}
    </>
  );
}
