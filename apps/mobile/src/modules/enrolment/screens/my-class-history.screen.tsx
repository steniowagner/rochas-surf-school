import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { WeekMonthCalendar } from "@/components/week-month-calendar";
import { ClassCard } from "@/modules/classes/components/class-card";
import { ClassCardSkeleton } from "@/modules/classes/components/class-card-skeleton";
import { DisciplineFilter } from "@/modules/classes/components/discipline-filter";
import { DISCIPLINE_FILTER_CLEARANCE } from "@/modules/classes/components/discipline-filter/discipline-filter.constants";
import { StackHeaderTitle } from "@/navigation/stack-header";

import { HistoryDayLabel } from "../components/history-day-label";
import { HistoryListHeader } from "../components/history-list-header";

import { useMyClassHistoryScreen } from "./my-class-history.screen.hook";

const LOADING_CARDS = [0, 1, 2];

/**
 * "Histórico": a calendar of the month (or the week) with a dot per class taken, and the period's classes under a
 * label for each day, newest first. Tapping a day narrows the list to it.
 */
export function MyClassHistoryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const screen = useMyClassHistoryScreen();

  const renderEmpty = () => {
    if (screen.isLoading) {
      // Enough cards to fill the screen under the calendar, read out as one loading state.
      return (
        <View
          testID="my-history-loading"
          accessible
          accessibilityLabel={t("myHistory.loading")}
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
            title={t("myHistory.loadError.title")}
            description={t("myHistory.loadError.description")}
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

    const copy =
      screen.selectedDay === null
        ? "myHistory.emptyPeriod"
        : "myHistory.emptyDay";

    return (
      <View className="flex-row pt-4">
        <EmptyState
          icon="calendar-outline"
          title={t(`${copy}.title`)}
          description={t(
            screen.discipline === "all"
              ? `${copy}.description`
              : `${copy}.descriptionSport`,
            { sport: t(`classesWeek.disciplineFilter.${screen.discipline}`) },
          )}
        />
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitleAlign: "center",
          headerTitle: () => <StackHeaderTitle title={t("myHistory.title")} />,
        }}
      />
      <View className="flex-1 bg-page">
        <FlatList
          testID="my-history-list"
          className="flex-1"
          data={screen.rows}
          keyExtractor={(row) => row.key}
          // On iOS the safe areas and the header are added by the scroll view.
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="gap-3 px-screen"
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom:
              Math.max(insets.bottom, 24) + DISCIPLINE_FILTER_CLEARANCE,
          }}
          refreshControl={
            <RefreshControl
              refreshing={screen.isRefreshing}
              onRefresh={screen.refresh}
            />
          }
          ListHeaderComponent={
            <View className="gap-5">
              <View
                testID="my-history-calendar"
                className="gap-3 rounded-card border border-line bg-surface p-3"
              >
                <WeekMonthCalendar
                  selectedDate={screen.selectedDay}
                  today={screen.today}
                  markedDates={screen.markedDates}
                  markedLabel={t("myHistory.hasClasses")}
                  onSelectDate={screen.selectDay}
                  initialView="month"
                  clearable
                  onClearSelection={screen.clearDay}
                  onPeriodChange={screen.updatePeriod}
                />
                <View className="flex-row items-center gap-2 px-1.5">
                  <View className="h-1.5 w-1.5 rounded-full bg-lagoon" />
                  <Text className="ds-text-list-subtitle text-ink-2">
                    {t("myHistory.legend")}
                  </Text>
                </View>
              </View>
              <HistoryListHeader
                title={t("myHistory.allClasses")}
                caption={screen.caption}
                dayLabel={screen.dayLabel}
                clearDayLabel={t("myHistory.clearDay", {
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
        <DisciplineFilter
          value={screen.discipline}
          onChange={screen.selectDiscipline}
        />
      </View>
    </>
  );
}
