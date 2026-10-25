import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { StackHeaderTitle } from "@/navigation/stack-header";

import { ClassCard } from "../components/class-card";
import { OccupancyMap } from "../components/occupancy-map";
import { OccupancyMapSkeleton } from "../components/occupancy-map-skeleton";
import { OccupancyStats } from "../components/occupancy-stats";
import { OccupancyWeekBar } from "../components/occupancy-week-bar";

import { useWeeklyOccupancyScreen } from "./weekly-occupancy.screen.hook";

/** "Ocupação semanal" of an admin: a week of classes as a map of how full each one is, and the selected class's card. */
export function WeeklyOccupancyScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const screen = useWeeklyOccupancyScreen();

  const renderContent = () => {
    if (screen.isLoading) {
      return <OccupancyMapSkeleton />;
    }

    // The states below are `flex-1`: in a row they only fill the width, so they don't collapse in the column.
    if (screen.isError) {
      return (
        <View className="flex-row pt-4">
          <ErrorState
            title={t("weeklyOccupancy.loadError.title")}
            description={t("weeklyOccupancy.loadError.description")}
            onRetry={screen.retry}
            retrying={screen.isRetrying}
          />
        </View>
      );
    }

    if (screen.isEmpty) {
      return (
        <View className="flex-row pt-4">
          <EmptyState
            icon="calendar-outline"
            title={t("weeklyOccupancy.empty.title")}
            description={t("weeklyOccupancy.empty.description")}
          />
        </View>
      );
    }

    // Nothing after an expired session: it is handled once, centrally.
    if (!screen.selected) {
      return null;
    }

    return (
      <>
        <OccupancyStats stats={screen.stats} />
        <OccupancyMap
          weekStart={screen.weekStart}
          today={screen.today}
          classes={screen.classes}
          selectedId={screen.selectedId}
          onSelect={screen.selectClass}
        />
        <View>
          <ClassCard
            item={screen.selected}
            now={screen.now}
            onPress={screen.openClass}
            showFlags
          />
        </View>
      </>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitleAlign: "center",
          headerTitle: () => (
            <StackHeaderTitle title={t("weeklyOccupancy.title")} />
          ),
        }}
      />
      {/* The scroll view is the screen's first view, so the header can find it for the scroll-edge blur. */}
      <ScrollView
        testID="weekly-occupancy-scroll"
        className="flex-1 bg-page"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-5 px-screen"
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
        <OccupancyWeekBar
          relativeLabel={screen.relativeLabel}
          isCurrentWeek={screen.isCurrentWeek}
          caption={screen.caption}
          onPrevious={screen.goPrevious}
          onNext={screen.goNext}
        />
        {renderContent()}
      </ScrollView>
    </>
  );
}
