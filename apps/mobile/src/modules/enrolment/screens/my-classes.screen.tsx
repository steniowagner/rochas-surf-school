import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { HeaderButton } from "@/components/ui/header-button";
import { ClassCard } from "@/modules/classes/components/class-card";
import { ClassCardSkeleton } from "@/modules/classes/components/class-card-skeleton";
import { DisciplineFilter } from "@/modules/classes/components/discipline-filter";
import { DISCIPLINE_FILTER_CLEARANCE } from "@/modules/classes/components/discipline-filter/discipline-filter.constants";
import { StackHeaderTitle } from "@/navigation/stack-header";

import { MyClassesFilters } from "../components/my-classes-filters";

import { useMyClassesScreen } from "./my-classes.screen.hook";

const LOADING_CARDS = [0, 1, 2, 3];

/** The student's "Minhas aulas" tab: every class they asked for that hasn't finished, by status. */
export function MyClassesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const screen = useMyClassesScreen();

  const renderEmpty = () => {
    if (screen.isLoading) {
      // Enough cards to fill the screen under the chips, read out as one loading state.
      return (
        <View
          testID="my-classes-loading"
          accessible
          accessibilityLabel={t("myClasses.loading")}
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
        <View className="flex-row pt-12">
          <ErrorState
            title={t("myClasses.loadError.title")}
            description={t("myClasses.loadError.description")}
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
      <View className="flex-row pt-12">
        <EmptyState
          icon="calendar-outline"
          title={t("myClasses.empty.title")}
          description={t(screen.emptyKey, {
            sport: t(`classesWeek.disciplineFilter.${screen.discipline}`),
          })}
        />
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitleAlign: "center",
          headerTitle: () => <StackHeaderTitle title={t("myClasses.title")} />,
          headerRight: () => (
            <HeaderButton
              icon="time-outline"
              label={t("myClasses.history")}
              onPress={screen.openHistory}
            />
          ),
        }}
      />
      <View className="flex-1 bg-page">
        <FlatList
          testID="my-classes-list"
          className="flex-1"
          data={screen.items}
          keyExtractor={(item) => item.id}
          // On iOS the safe areas, the header and the floating tab bar are added by the scroll view.
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
            <View className="gap-4 pb-1">
              <MyClassesFilters
                selected={screen.filter}
                onSelect={screen.selectFilter}
              />
            </View>
          }
          renderItem={({ item }) => (
            <ClassCard
              item={item}
              now={screen.now}
              onPress={screen.openClass}
              showEnrolment
            />
          )}
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
