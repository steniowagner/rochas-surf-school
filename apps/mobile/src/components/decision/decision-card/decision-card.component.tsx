import { Feather, Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { DecisionCardProps } from "./decision-card.types";

export function DecisionCard({
  title,
  subtitle,
  details,
  avatar,
  approveLabel,
  denyLabel,
  onApprove,
  onDeny,
  onPress,
  disabled,
  loading,
}: DecisionCardProps) {
  const theme = useTheme();

  const content = (
    <>
      {avatar}
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
      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color={theme.ink3} />
      ) : null}
    </>
  );

  return (
    <View
      className="gap-4 rounded-card border border-line bg-surface p-4"
      style={shadowStyle("card", theme)}
    >
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          onPress={onPress}
          className="flex-row items-center gap-3"
        >
          {content}
        </Pressable>
      ) : (
        <View className="flex-row items-center gap-3">{content}</View>
      )}
      <View className="flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1"
          icon={<Feather name="x" size={16} color={theme.ink} />}
          disabled={disabled && loading !== "deny"}
          loading={loading === "deny"}
          onPress={onDeny}
        >
          {denyLabel}
        </Button>
        <Button
          variant="success"
          className="flex-1"
          icon={<Feather name="check" size={16} color={theme.onColor} />}
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
