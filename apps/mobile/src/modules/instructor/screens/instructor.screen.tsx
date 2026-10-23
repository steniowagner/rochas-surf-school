import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenIntro } from "@/components/ui/screen-intro";
import { routes } from "@/constants/routes";
import { useTheme } from "@/hooks/use-theme";
import { TeachingClassesEntryRow } from "@/modules/classes/components/teaching-classes-entry-row";
import { PeopleEntryRow } from "@/modules/people/components/people-entry-row";
import { SchoolRulesEntryRow } from "@/modules/school-rules/components/school-rules-entry-row";
import { useHeaderInset } from "@/navigation/stack-header";

const openMyClasses = () => router.push(routes.instructor.myClasses);
const openPeople = () => router.push(routes.instructor.people);
const openSchoolRules = () => router.push(routes.instructor.schoolRules);

export function InstructorScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
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
      <ScreenIntro
        icon={
          <MaterialCommunityIcons
            name="view-dashboard-outline"
            size={30}
            color={theme.grape}
          />
        }
        title={t("instructor.home.title")}
        description={null}
      />
      <View className="gap-2">
        <Text className="ds-text-section-label text-ink-2">
          {t("admin.home.schoolSection")}
        </Text>
        <TeachingClassesEntryRow role="instructor" onPress={openMyClasses} />
        <SchoolRulesEntryRow role="instructor" onPress={openSchoolRules} />
        <PeopleEntryRow onPress={openPeople} />
      </View>
    </View>
  );
}
