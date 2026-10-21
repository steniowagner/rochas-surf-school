import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { useSchoolSettings } from "@/hooks/use-school-settings.hook";
import { useTheme } from "@/hooks/use-theme";

import { SchoolSettingsForm } from "../components/school-settings-form";

export function SchoolSettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isError, refetch } = useSchoolSettings();

  return (
    <ScrollView
      className="flex-1 bg-page"
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-6 px-screen"
      contentContainerStyle={{
        paddingBottom: Math.max(insets.bottom, 24),
      }}
    >
      <ScreenIntro
        icon={
          <Ionicons name="settings-outline" size={30} color={theme.grape} />
        }
        title={t("schoolSettings.title")}
        description={null}
      />
      {data ? <SchoolSettingsForm settings={data} /> : null}
      {!data && !isError ? (
        <View className="items-center py-8">
          <ActivityIndicator
            testID="school-settings-loading"
            color={theme.grape}
          />
        </View>
      ) : null}
      {!data && isError ? (
        <View className="items-center gap-3 py-6">
          <Text className="ds-text-body text-center text-ink-2">
            {t("schoolSettings.loadError")}
          </Text>
          <Button variant="subtle" onPress={() => void refetch()}>
            {t("schoolSettings.retry")}
          </Button>
        </View>
      ) : null}
    </ScrollView>
  );
}
