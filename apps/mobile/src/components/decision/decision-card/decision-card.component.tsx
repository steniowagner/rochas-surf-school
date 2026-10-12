import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";

import { DecisionCardProps } from "./decision-card.types";

export function DecisionCard({
  title,
  subtitle,
  details,
  initials,
  approveLabel,
  denyLabel,
  onApprove,
  onDeny,
  disabled,
  loading,
}: DecisionCardProps) {
  return (
    <View className="gap-4 rounded-card border border-line bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-sand">
          <Text className="ds-text-list-title text-grape">{initials}</Text>
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="ds-text-list-title text-ink">{title}</Text>
          {subtitle ? (
            <Text className="ds-text-list-subtitle text-ink-2">{subtitle}</Text>
          ) : null}
          {details.map((detail) => (
            <Text key={detail} className="ds-text-list-subtitle text-ink-2">
              {detail}
            </Text>
          ))}
        </View>
      </View>
      <View className="flex-row gap-3">
        <Button
          variant="ghost"
          className="flex-1"
          disabled={disabled && loading !== "deny"}
          loading={loading === "deny"}
          onPress={onDeny}
        >
          {denyLabel}
        </Button>
        <Button
          className="flex-1"
          disabled={disabled && loading !== "approve"}
          loading={loading === "approve"}
          onPress={onApprove}
        >
          {approveLabel}
        </Button>
      </View>
    </View>
  );
}
