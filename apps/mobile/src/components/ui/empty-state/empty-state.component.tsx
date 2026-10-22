import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { iconSizes } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { EmptyStateProps } from "./empty-state.types";

/** A list with nothing to show: fills the space its parent leaves for it. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View className="flex-1 items-center justify-center px-9 pb-10">
      {/* The tile leans back and the glyph leans forward, so the glyph stays upright. */}
      <View className="h-24 w-24 -rotate-6 items-center justify-center rounded-[32px] bg-info-tint">
        <View className="rotate-6">
          <Ionicons
            name={icon}
            size={iconSizes.emptyState}
            color={theme.lagoon}
          />
        </View>
      </View>
      <Text
        accessibilityRole="header"
        className="ds-text-sheet-title mt-6 text-center text-ink"
      >
        {title}
      </Text>
      <Text className="ds-text-body mt-2.5 max-w-72 text-center text-ink-2">
        {description}
      </Text>
      {action ? (
        <Button
          className="mt-7 self-center"
          icon={
            action.icon ? (
              <Ionicons
                name={action.icon}
                size={iconSizes.button}
                color={theme.onColor}
              />
            ) : undefined
          }
          onPress={action.onPress}
        >
          {action.label}
        </Button>
      ) : null}
    </View>
  );
}
