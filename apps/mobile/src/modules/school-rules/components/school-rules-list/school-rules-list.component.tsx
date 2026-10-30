import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

import { SchoolRuleRow } from "../school-rule-row";
import { SchoolRulesSkeleton } from "../school-rules-skeleton";

import { useSchoolRulesList } from "./school-rules-list.hook";

/**
 * The numbered school rules in the admins' order, with its own loading, empty and error states. The empty and error
 * states fill the space the parent leaves for the list.
 */
export function SchoolRulesList() {
  const { t } = useTranslation();
  const { status, rules, retrying, retry } = useSchoolRulesList();

  if (status === "loading") {
    return <SchoolRulesSkeleton />;
  }

  if (status === "error") {
    return (
      <View className="flex-1">
        <ErrorState
          title={t("schoolRulesScreen.loadError.title")}
          description={t("schoolRulesScreen.loadError.description")}
          onRetry={retry}
          retrying={retrying}
        />
      </View>
    );
  }

  if (status === "empty") {
    return (
      <View className="flex-1">
        <EmptyState
          icon="shield-outline"
          title={t("schoolRulesScreen.empty.title")}
          description={t("schoolRulesScreen.empty.description")}
        />
      </View>
    );
  }

  return (
    <View className="rounded-card border border-line bg-surface px-4">
      {rules.map((rule, index) => (
        <SchoolRuleRow
          key={rule.id}
          rule={rule}
          position={index + 1}
          showDivider={index < rules.length - 1}
        />
      ))}
    </View>
  );
}
