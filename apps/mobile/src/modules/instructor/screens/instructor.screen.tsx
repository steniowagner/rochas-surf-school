import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { routes } from "@/constants/routes";
import { PeopleEntryRow } from "@/modules/people/components/people-entry-row";

const openPeople = () => router.push(routes.instructor.people);

export function InstructorScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 gap-6 bg-page px-screen"
      style={{
        paddingTop: insets.top + 12,
        paddingBottom: Math.max(insets.bottom, 24),
      }}
    >
      <Text accessibilityRole="header" className="ds-text-screen-title text-ink">
        {t("instructor.home.title")}
      </Text>
      <View className="gap-2">
        <Text className="ds-text-section-label text-ink-2">
          {t("admin.home.schoolSection")}
        </Text>
        <PeopleEntryRow onPress={openPeople} />
      </View>
    </View>
  );
}
