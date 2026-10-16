import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { TimeRangeHintProps } from "./time-range-hint.types";

/** One rule under the time ranges: a small info icon beside the text. */
export function TimeRangeHint({ children }: TimeRangeHintProps) {
  const theme = useTheme();

  return (
    <View className="flex-row items-start gap-2">
      <View className="h-4 justify-center">
        <Ionicons
          name="information-circle-outline"
          size={14}
          color={theme.ink2}
        />
      </View>
      <Text className="ds-text-list-subtitle flex-1 text-ink-2">
        {children}
      </Text>
    </View>
  );
}
