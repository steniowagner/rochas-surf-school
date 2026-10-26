import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { RefreshControl, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { WeekMonthCalendar } from "@/components/week-month-calendar";
import { useTheme } from "@/hooks/use-theme";
import {
  StackHeaderTitle,
  useCollapsingTitleHeader,
} from "@/navigation/stack-header";

import { ClassCard } from "../class-card";
import { ClassCardSkeleton } from "../class-card-skeleton";
import { DisciplineFilter } from "../discipline-filter";
import { DISCIPLINE_FILTER_CLEARANCE } from "../discipline-filter/discipline-filter.constants";
import { HistoryDayLabel } from "../history-day-label";
import { HistoryListHeader } from "../history-list-header";

import type { ClassHistoryProps } from "./class-history.types";

const LOADING_CARDS = [0, 1, 2];
const CONTENT_PADDING_TOP = 8;

/**
 * "Aulas anteriores": a calendar of the month (or the week) with a dot per class, and the period's classes under a
 * label for each day, newest first. Tapping a day narrows the list to it. `copy` is the i18n namespace of its texts.
 */
export function ClassHistory({
  history: screen,
  copy,
  withIntro = false,
}: ClassHistoryProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  // The intro gives way to the plain title on the error and empty states, which have their own icon and text.
  const showIntro = withIntro && !screen.isError && !screen.isEmpty;
  const header = useCollapsingTitleHeader({
    title: t(`${copy}.title`),
    contentTop: CONTENT_PADDING_TOP,
  });

  const renderEmpty = () => {
    if (screen.isLoading) {
      // Enough cards to fill the screen under the calendar, read out as one loading state.
      return (
        <View
          testID="my-history-loading"
          accessible
          accessibilityLabel={t(`${copy}.loading`)}
          className="gap-3"
        >
          {LOADING_CARDS.map((key) => (
            <ClassCardSkeleton key={key} />
          ))}
        </View>
      );
    }

    // The states below are `flex-1`: in a row they only fill the width, so they keep their height when the calendar
    // switches view (in the list's column they collapsed after it).
    if (screen.isError) {
      return (
        <View className="flex-row pt-4">
          <ErrorState
            title={t(`${copy}.loadError.title`)}
            description={t(`${copy}.loadError.description`)}
            onRetry={screen.retry}
            retrying={screen.isRetrying}
          />
        </View>
      );
    }

    // Nothing after an expired session: it is handled once, centrally.
    if (!screen.isEmpty) {
      return null;
    }

    const emptyCopy =
      screen.selectedDay === null ? `${copy}.emptyPeriod` : `${copy}.emptyDay`;

    return (
      <View className="flex-row pt-4">
        <EmptyState
          icon="calendar-outline"
          title={t(`${emptyCopy}.title`)}
          description={t(
            screen.discipline === "all"
              ? `${emptyCopy}.description`
              : `${emptyCopy}.descriptionSport`,
            { sport: t(`classesWeek.disciplineFilter.${screen.discipline}`) },
          )}
        />
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={
          showIntro
            ? header.headerOptions
            : {
                headerTitleAlign: "center",
                headerTitle: () => (
                  <StackHeaderTitle title={t(`${copy}.title`)} />
                ),
              }
        }
      />
      {/* The list is the screen's first view, so the header can find it for the scroll-edge blur: the filter floats beside it. */}
      <Animated.FlatList
        testID="my-history-list"
        className="flex-1 bg-page"
        data={screen.rows}
        keyExtractor={(row) => row.key}
        // On iOS the safe areas and the header are added by the scroll view.
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-3 px-screen"
        contentContainerStyle={{
          paddingTop: CONTENT_PADDING_TOP,
          paddingBottom:
            Math.max(insets.bottom, 24) + DISCIPLINE_FILTER_CLEARANCE,
        }}
        onScroll={showIntro ? header.scrollHandler : undefined}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={screen.isRefreshing}
            onRefresh={screen.refresh}
          />
        }
        ListHeaderComponent={
          <View className="gap-5">
            {showIntro ? (
              <ScreenIntro
                icon={
                  <Ionicons name="time-outline" size={28} color={theme.grape} />
                }
                title={t(`${copy}.title`)}
                description={t(`${copy}.description`)}
                onTitleLayout={header.onTitleBottomChange}
              />
            ) : null}
            <View
              testID="my-history-calendar"
              className="gap-3 rounded-card border border-line bg-surface p-3"
            >
              <WeekMonthCalendar
                selectedDate={screen.selectedDay}
                today={screen.today}
                markedDates={screen.markedDates}
                markedLabel={t(`${copy}.hasClasses`)}
                onSelectDate={screen.selectDay}
                initialView="month"
                clearable
                onClearSelection={screen.clearDay}
                onPeriodChange={screen.updatePeriod}
              />
              <View className="flex-row items-center gap-2 px-1.5">
                <View className="h-1.5 w-1.5 rounded-full bg-lagoon" />
                <Text className="ds-text-list-subtitle text-ink-2">
                  {t(`${copy}.legend`)}
                </Text>
              </View>
            </View>
            <HistoryListHeader
              title={t(`${copy}.allClasses`)}
              caption={screen.caption}
              dayLabel={screen.dayLabel}
              clearDayLabel={t(`${copy}.clearDay`, {
                date: screen.dayLabel,
              })}
              onClearDay={screen.clearDay}
            />
          </View>
        }
        renderItem={({ item: row }) =>
          row.type === "day" ? (
            <HistoryDayLabel label={row.label} />
          ) : (
            <ClassCard
              item={row.item}
              now={screen.now}
              onPress={screen.openClass}
            />
          )
        }
        ListEmptyComponent={renderEmpty()}
      />
      {showIntro ? header.backdrop : null}
      <DisciplineFilter
        value={screen.discipline}
        onChange={screen.selectDiscipline}
      />
    </>
  );
}
