import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StackHeaderTitle } from "@/navigation/stack-header";

import { SchoolRulesList } from "../school-rules-list";

/** The school rules to read at any time: no checkbox and no button, only the back button. */
export function SchoolRulesReader() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-page">
      <Stack.Screen
        options={{
          headerTitle: () => (
            <StackHeaderTitle title={t("schoolRulesScreen.title")} />
          ),
        }}
      />
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-screen"
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        <Text className="ds-text-body text-ink-2">
          {t("schoolRulesScreen.description")}
        </Text>
        <SchoolRulesList />
      </ScrollView>
    </View>
  );
}
