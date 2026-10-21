import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { WeekMonthCalendar } from "@/components/week-month-calendar";
import { useTheme } from "@/hooks/use-theme";
import { ClassCard } from "@/modules/classes/components/class-card";
import { PersonAvatar } from "@/modules/people/components/person-avatar";
import { StackHeaderTitle, useLeftTitleHeader } from "@/navigation/stack-header";

import { useEnrolStudentScreen } from "./enrol-student.screen.hook";

export function EnrolStudentScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const screen = useEnrolStudentScreen();
  const headerOptions = useLeftTitleHeader(() => (
    <StackHeaderTitle title={t("enrolStudent.title")} />
  ));

  const renderStudents = () => {
    if (screen.isLoadingStudents) {
      return <ActivityIndicator testID="enrol-student-students-loading" color={theme.ink2} className="py-6" />;
    }

    if (screen.isStudentsError) {
      return (
        <View className="items-center gap-3 py-4">
          <Text className="ds-text-body text-center text-ink-2">{t("enrolStudent.loadError")}</Text>
          <Button variant="outline" onPress={screen.retryStudents}>
            {t("enrolStudent.retry")}
          </Button>
        </View>
      );
    }

    if (screen.hasNoStudents) {
      return <Text className="ds-text-body py-4 text-center text-ink-2">{t("enrolStudent.noStudents")}</Text>;
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
      return <ActivityIndicator testID="enrol-student-classes-loading" color={theme.ink2} className="py-6" />;
    }

    if (screen.isClassesError) {
      return (
        <View className="items-center gap-3 py-4">
          <Text className="ds-text-body text-center text-ink-2">{t("enrolStudent.loadError")}</Text>
          <Button variant="outline" onPress={screen.retryClasses}>
            {t("enrolStudent.retry")}
          </Button>
        </View>
      );
    }

    if (screen.dayItems.length === 0) {
      return (
        <View className="items-center rounded-card border border-line bg-surface p-6">
          <Text className="ds-text-body text-center text-ink-2">{t("enrolStudent.noClasses")}</Text>
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

  return (
    <View className="flex-1 bg-page">
      <Stack.Screen options={headerOptions} />
      <ScrollView
        testID="enrol-student-screen"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-5 px-screen"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <Text className="ds-text-body text-ink-2">{t("enrolStudent.description")}</Text>
        <View className="gap-3">
          <Text className="ds-text-section-label text-ink-2">{t("enrolStudent.whoStep")}</Text>
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
          {screen.selectedStudent
            ? t("enrolStudent.submit", { name: screen.selectedStudent.name })
            : t("enrolStudent.submitEmpty")}
        </Button>
      </ScrollView>
    </View>
  );
}
