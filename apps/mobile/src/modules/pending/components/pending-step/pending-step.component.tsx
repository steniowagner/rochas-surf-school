import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { PendingStepProps } from "./pending-step.types";

export function PendingStep({ state, title, trailing }: PendingStepProps) {
  const theme = useTheme();

  return (
    <View className="min-h-[54px] flex-row items-center gap-3">
      {state === "done" ? (
        <View className="h-6 w-6 items-center justify-center rounded-full bg-ok">
          <Ionicons name="checkmark" size={14} color={theme.onColor} />
        </View>
      ) : null}
      {state === "current" ? (
        <View className="h-6 w-6 items-center justify-center rounded-full border-2 border-warn">
          <View className="h-2 w-2 rounded-full bg-warn" />
        </View>
      ) : null}
      {state === "future" ? (
        <View className="h-6 w-6 rounded-full border-2 border-dashed border-ink-3" />
      ) : null}
      <Text
        className={`ds-text-list-title flex-1 ${state === "future" ? "text-ink-3" : "text-ink"}`}
      >
        {title}
      </Text>
      {trailing}
    </View>
  );
}
