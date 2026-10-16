import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import { ClassCard } from "../components/class-card";
import { DayStrip } from "../components/day-strip";
import { WeekNav } from "../components/week-nav";

import { useClassesWeekScreen } from "./classes-week.screen.hook";
import type { ClassesWeekScreenProps } from "./classes-week.screen.types";

export function ClassesWeekScreen({
  titleKey,
  classRoute,
  canCreate = false,
}: ClassesWeekScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const screen = useClassesWeekScreen({ classRoute, canCreate });

  return (
    <ScrollView
      testID="classes-week-list"
      className="flex-1 bg-page"
      contentContainerClassName="gap-4 px-screen"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: Math.max(insets.bottom, 24),
      }}
      refreshControl={
        <RefreshControl
          refreshing={screen.isRefreshing}
          onRefresh={screen.refresh}
        />
      }
    >
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1">
          <Text
            accessibilityRole="header"
            className="ds-text-screen-title text-ink"
          >
            {t(titleKey)}
          </Text>
          <Text className="ds-text-list-subtitle text-ink-2">
            {screen.weekLabel}
          </Text>
        </View>
        {screen.canCreate ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("classesWeek.newClass")}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={screen.createClass}
            className="h-11 w-11 items-center justify-center rounded-full bg-sun"
          >
            <Ionicons name="add" size={24} color={theme.onColor} />
          </TouchableOpacity>
        ) : null}
      </View>
      <WeekNav
        caption={screen.caption}
        showToday={screen.showToday}
        onPrevious={screen.goToPreviousWeek}
        onNext={screen.goToNextWeek}
        onToday={screen.goToToday}
      />
      <DayStrip
        days={screen.days}
        selected={screen.selectedDay}
        today={screen.today}
        counts={screen.counts}
        onSelect={screen.selectDay}
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
          <View className="flex-row items-center justify-between">
            <Text className="ds-text-section-label text-ink-2">
              {screen.dayTitle}
            </Text>
            <Text className="ds-text-list-subtitle text-ink-2">
              {t("classesWeek.classCount", { count: screen.dayItems.length })}
            </Text>
          </View>
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
  );
}
