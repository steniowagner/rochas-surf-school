import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { useTheme } from "@/hooks/use-theme";
import { SchoolRulesList } from "@/modules/school-rules/components/school-rules-list";

import { useSchoolRulesStep } from "./school-rules.hook";

export function SchoolRules() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isChecked, setIsChecked, canAccept, canSubmit, isAccepting, submit } =
    useSchoolRulesStep();

  return (
    <View className="flex-1 bg-page">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-[22px] pb-6"
        contentContainerStyle={{ paddingTop: insets.top + 36 }}
      >
        <ScreenIntro
          icon={
            <Ionicons name="shield-outline" size={30} color={theme.grape} />
          }
          eyebrow={t("schoolRules.eyebrow")}
          title={t("schoolRules.title")}
          description={t("schoolRules.description")}
        />
        <SchoolRulesList />
      </ScrollView>

      <View
        className="gap-3.5 border-t border-line bg-surface px-[22px] pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Checkbox
          checked={isChecked}
          onChange={setIsChecked}
          label={t("schoolRules.accept")}
          disabled={!canAccept}
        />
        <Button disabled={!canSubmit} loading={isAccepting} onPress={submit}>
          {t("schoolRules.submit")}
        </Button>
      </View>
    </View>
  );
}
