import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/components/ui/back-button";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { useTheme } from "@/hooks/use-theme";

import { SchoolRulesList } from "../school-rules-list";

/** The school rules to read at any time: no checkbox and no button, only the back button. */
export function SchoolRulesReader() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-page">
      <View className="px-[22px]" style={{ paddingTop: insets.top + 12 }}>
        <BackButton />
      </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-[22px] pt-6"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <ScreenIntro
          icon={
            <Ionicons name="shield-outline" size={30} color={theme.grape} />
          }
          title={t("schoolRulesScreen.title")}
          description={t("schoolRulesScreen.description")}
        />
        <SchoolRulesList />
      </ScrollView>
    </View>
  );
}
