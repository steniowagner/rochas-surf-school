import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StackHeaderTitle } from "@/navigation/stack-header";

import { ClassCard } from "../components/class-card";
import { OccupancyMap } from "../components/occupancy-map";
import { OccupancyWeekBar } from "../components/occupancy-week-bar";

import { useWeeklyOccupancyScreen } from "./weekly-occupancy.screen.hook";

/** "Ocupação semanal" of an admin: a week of classes as a map of how full each one is, and the selected class's card. */
export function WeeklyOccupancyScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const screen = useWeeklyOccupancyScreen();

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
      >
        <OccupancyWeekBar
          caption={screen.caption}
          onPrevious={screen.goPrevious}
          onNext={screen.goNext}
        />
        {screen.classes.length > 0 ? (
          <>
            <OccupancyMap
              weekStart={screen.weekStart}
              today={screen.today}
              classes={screen.classes}
              selectedId={screen.selectedId}
              onSelect={screen.selectClass}
            />
            {screen.selected ? (
              <View>
                <ClassCard
                  item={screen.selected}
                  now={screen.now}
                  onPress={screen.openClass}
                  showFlags
                />
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </>
  );
}
