import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

import { SchoolRuleRow } from "../school-rule-row";

import { useSchoolRulesList } from "./school-rules-list.hook";

/** The numbered school rules in the admins' order, with its own loading, empty and error states. */
export function SchoolRulesList() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { status, rules, retry } = useSchoolRulesList();

  return (
    <View className="rounded-card border border-line bg-surface px-4">
      {status === "loading" ? (
        <View className="items-center py-8">
          <ActivityIndicator color={theme.ink2} />
        </View>
      ) : null}
      {status === "error" ? (
        <View className="items-center gap-3 py-6">
          <Text className="ds-text-body text-center text-ink-2">
            {t("schoolRules.loadError")}
          </Text>
          <Button variant="subtle" onPress={() => retry()}>
            {t("schoolRules.retry")}
          </Button>
        </View>
      ) : null}
      {status === "empty" ? (
        <Text className="ds-text-body py-6 text-center text-ink-2">
          {t("schoolRules.empty")}
        </Text>
      ) : null}
      {status === "ready"
        ? rules.map((rule, index) => (
            <SchoolRuleRow
              key={rule.id}
              rule={rule}
              position={index + 1}
              showDivider={index < rules.length - 1}
            />
          ))
        : null}
    </View>
  );
}
