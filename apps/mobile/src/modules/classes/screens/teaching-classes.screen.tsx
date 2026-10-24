import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { StackHeaderTitle } from "@/navigation/stack-header";

import { ClassCard } from "../components/class-card";
import { ClassCardSkeleton } from "../components/class-card-skeleton";
import { DisciplineFilter } from "../components/discipline-filter";
import { DISCIPLINE_FILTER_CLEARANCE } from "../components/discipline-filter/discipline-filter.constants";
import { OngoingClassCard } from "../components/ongoing-class-card";
import { TeachingDayHeader } from "../components/teaching-day-header";

import { useTeachingClassesScreen } from "./teaching-classes.screen.hook";
import type { TeachingClassesScreenProps } from "./teaching-classes.screen.types";

const LOADING_CARDS = [0, 1, 2, 3];

/** "Minhas aulas" of an instructor or an admin who teaches: the classes under way, then the rest by day. */
export function TeachingClassesScreen({ role }: TeachingClassesScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const screen = useTeachingClassesScreen({ role });

  const renderEmpty = () => {
    if (screen.isLoading) {
      // Enough cards to fill the screen, read out as one loading state.
      return (
        <View
          testID="teaching-classes-loading"
          accessible
          accessibilityLabel={t("teachingClasses.loading")}
          className="gap-3"
        >
          {LOADING_CARDS.map((key) => (
            <ClassCardSkeleton key={key} />
          ))}
        </View>
      );
    }

    // The states below are `flex-1`: in a row they only fill the width, so they don't collapse in the list's column.
    if (screen.isError) {
      return (
        <View className="flex-row pt-4">
          <ErrorState
            title={t("teachingClasses.loadError.title")}
            description={t("teachingClasses.loadError.description")}
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

    return (
      <View className="flex-row pt-4">
        <EmptyState
          icon="calendar-outline"
          title={t("teachingClasses.empty.title")}
          description={t("teachingClasses.empty.description")}
        />
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => <StackHeaderTitle title={t("teachingClasses.title")} />,
        }}
      />
      <View className="flex-1 bg-page">
        <FlatList
          testID="teaching-classes-list"
          className="flex-1"
          data={screen.rows}
          keyExtractor={(row) => row.key}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="gap-3 px-screen"
          // The last card scrolls clear of the floating sport filter.
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 24) + DISCIPLINE_FILTER_CLEARANCE,
          }}
          refreshControl={
            <RefreshControl refreshing={screen.isRefreshing} onRefresh={screen.refresh} />
          }
          renderItem={({ item: row }) =>
            row.type === "ongoing" ? (
              <OngoingClassCard item={row.item} onPress={screen.openClass} />
            ) : row.type === "day" ? (
              <TeachingDayHeader label={row.label} date={row.date} />
            ) : (
              <ClassCard item={row.item} now={screen.now} onPress={screen.openClass} isNext={row.isNext} />
            )
          }
          ListEmptyComponent={renderEmpty()}
        />
        {/* Over the list in every state: loading, error, empty and the classes. */}
        <DisciplineFilter value={screen.discipline} onChange={screen.selectDiscipline} />
      </View>
    </>
  );
}
