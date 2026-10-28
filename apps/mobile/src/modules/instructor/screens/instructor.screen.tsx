import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { routes } from "@/constants/routes";
import { TeachingClassesEntryRow } from "@/modules/classes/components/teaching-classes-entry-row";
import { WeeklyOccupancyEntryRow } from "@/modules/classes/components/weekly-occupancy-entry-row";
import { SchoolRulesEntryRow } from "@/modules/school-rules/components/school-rules-entry-row";
import { useHeaderInset } from "@/navigation/stack-header";

const openMyClasses = () => router.push(routes.instructor.myClasses);
const openWeeklyOccupancy = () =>
  router.push(routes.instructor.weeklyOccupancy);
const openSchoolRules = () => router.push(routes.instructor.schoolRules);

export function InstructorScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const headerInset = useHeaderInset();

  return (
    <View
      className="flex-1 gap-6 bg-page px-screen"
      style={{
        // Clears the user header, which the tab's stack draws above the screen.
        paddingTop: headerInset + 16,
        paddingBottom: Math.max(insets.bottom, 24),
      }}
    >
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="ds-text-section-label text-ink-2"
        >
          {t("admin.home.schoolSection")}
        </Text>
        <View className="overflow-hidden rounded-card border border-line bg-surface">
          <TeachingClassesEntryRow
            role="instructor"
            grouped="first"
            onPress={openMyClasses}
          />
          <SchoolRulesEntryRow
            role="instructor"
            grouped="next"
            onPress={openSchoolRules}
          />
          <WeeklyOccupancyEntryRow
            grouped="next"
            onPress={openWeeklyOccupancy}
          />
        </View>
      </View>
    </View>
  );
}
