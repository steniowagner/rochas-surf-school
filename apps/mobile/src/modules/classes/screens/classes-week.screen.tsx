import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { HeaderButton } from "@/components/ui/header-button";
import { WeekMonthCalendar } from "@/components/week-month-calendar";
import { useTheme } from "@/hooks/use-theme";
import {
  StackHeaderTitle,
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
  const screen = useClassesWeekScreen({ classRoute, canCreate });
  const headerOptions = useLeftTitleHeader(() => (
    <StackHeaderTitle title={t(titleKey)} />
  ));

  return (
    <>
      <Stack.Screen
        options={{
          ...headerOptions,
          headerRight: screen.canCreate
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
      <ScrollView
        testID="classes-week-list"
        className="flex-1 bg-page"
        // On iOS the safe areas, the header and the floating tab bar are added by the scroll view.
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-screen"
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
        refreshControl={
          <RefreshControl
            refreshing={screen.isRefreshing}
            onRefresh={screen.refresh}
          />
        }
      >
        <WeekMonthCalendar
          selectedDate={screen.selectedDate}
          today={screen.today}
          markedDates={screen.markedDates}
          markedLabel={t("classesWeek.hasClasses")}
          onSelectDate={screen.selectDate}
          onVisibleRangeChange={screen.updateVisibleRange}
        />
        {screen.isLoading ? (
          <ActivityIndicator
            testID="classes-week-loading"
            color={theme.grape}
            className="py-8"
          />
        ) : screen.isError ? (
          <View className="items-center gap-3 py-8">
            <Text className="ds-text-body text-center text-ink-2">
              {t("classesWeek.loadError")}
            </Text>
            <Button variant="outline" onPress={screen.retry}>
              {t("classesWeek.retry")}
            </Button>
          </View>
        ) : (
          <View className="gap-3">
            {screen.dayItems.length === 0 ? (
              <View className="items-center gap-3 rounded-card border border-line bg-surface p-6">
                <Text className="ds-text-body text-center text-ink-2">
                  {t("classesWeek.empty")}
                </Text>
                {screen.canCreateOnDay ? (
                  <Button variant="outline" onPress={screen.createClass}>
                    {t("classesWeek.create")}
                  </Button>
                ) : null}
              </View>
            ) : (
              <>
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
                {screen.canCreateOnDay ? (
                  <Button variant="ghost" onPress={screen.createClass}>
                    {t("classesWeek.createOnDay")}
                  </Button>
                ) : null}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}
