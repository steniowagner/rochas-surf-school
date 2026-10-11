import { Text, View } from "react-native";

import { SchoolRuleRowProps } from "./school-rule-row.types";

export function SchoolRuleRow({
  rule,
  position,
  showDivider,
}: SchoolRuleRowProps) {
  return (
    <View
      className={`flex-row gap-3 py-3.5 ${showDivider ? "border-b border-line" : ""}`}
    >
      <Text className="ds-text-sheet-title w-9 text-sun">
        {String(position).padStart(2, "0")}
      </Text>
      <View className="flex-1 gap-0.5">
        <Text className="ds-text-list-title text-ink">{rule.title}</Text>
        <Text className="ds-text-body text-ink-2">{rule.description}</Text>
      </View>
    </View>
  );
}
