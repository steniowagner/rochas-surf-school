import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { HeaderButton } from "@/components/ui/header-button";
import { WeekMonthCalendar } from "@/components/week-month-calendar";
import { useTheme } from "@/hooks/use-theme";
import {
  StackHeaderTitle,
  useHeaderInset,
  useLeftTitleHeader,
} from "@/navigation/stack-header";

import { ClassCard } from "../components/class-card";

import { useClassesWeekScreen } from "./classes-week.screen.hook";
import type { ClassesWeekScreenProps } from "./classes-week.screen.types";

export function ClassesWeekScreen({
  titleKey,
  classRoute,
  canCreate = false,
  showFlags = false,
  showEnrolment = false,
}: ClassesWeekScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerInset = useHeaderInset();
  const screen = useClassesWeekScreen({ classRoute, canCreate });
  const headerOptions = useLeftTitleHeader(() => (
    <StackHeaderTitle title={t(titleKey)} />
  ));

  return (
    <>
      <Stack.Screen
        options={{
          ...headerOptions,
          headerRight: screen.canCreateOnDay
            ? () => (
                <HeaderButton
                  icon="add"
                  label={t("classesWeek.newClass")}
                  onPress={screen.createClass}
                />
              )
            : undefined,
        }}
      />
      <View className="flex-1 bg-page">
        {/* The calendar stays put: only the day's classes scroll under it. */}
        <View
          className="px-screen pb-4"
          style={{ paddingTop: headerInset + 8 }}
        >
          <WeekMonthCalendar
            selectedDate={screen.selectedDate}
            today={screen.today}
            markedDates={screen.markedDates}
            markedLabel={t("classesWeek.hasClasses")}
            onSelectDate={screen.selectDate}
            onVisibleRangeChange={screen.updateVisibleRange}
          />
        </View>
        <ScrollView
          testID="classes-week-list"
          className="flex-1"
          // On iOS the bottom safe area and the floating tab bar are added by the scroll view.
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="px-screen"
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 24),
          }}
          refreshControl={
            <RefreshControl
              refreshing={screen.isRefreshing}
              onRefresh={screen.refresh}
            />
          }
        >
          {screen.isLoading ? (
            <ActivityIndicator
              testID="classes-week-loading"
              color={theme.grape}
              className="py-8"
            />
          ) : screen.isError ? (
            // Just under the calendar, as the empty day.
            <View className="pt-8">
              <ErrorState
                title={t("classesWeek.loadError.title")}
                description={t("classesWeek.loadError.description", {
                  date: screen.selectedDayName,
                })}
                onRetry={screen.retry}
                retrying={screen.isRetrying}
              />
            </View>
          ) : screen.dayItems.length === 0 ? (
            // Just under the calendar, not centered in the space left.
            <View className="pt-8">
              <EmptyState
                icon="calendar-outline"
                title={t("classesWeek.emptyDay.title")}
                description={t("classesWeek.emptyDay.description", {
                  date: screen.selectedDayName,
                })}
                action={
                  screen.canCreateOnDay
                    ? {
                        label: t("classesWeek.create"),
                        icon: "add",
                        onPress: screen.createClass,
                      }
                    : undefined
                }
              />
            </View>
          ) : (
            <View className="gap-3">
              {screen.dayItems.map((item) => (
                <ClassCard
                  key={item.id}
                  item={item}
                  now={screen.now}
                  onPress={screen.openClass}
                  showFlags={showFlags}
                  showEnrolment={showEnrolment}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}
