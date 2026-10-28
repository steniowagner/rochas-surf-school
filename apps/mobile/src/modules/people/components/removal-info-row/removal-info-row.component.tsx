import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { RemovalInfoRowProps } from "./removal-info-row.types";

/** A line of a removed account's card: an icon in a tinted tile and the text beside it. */
export function RemovalInfoRow({
  icon,
  text,
  tone = "default",
}: RemovalInfoRowProps) {
  const theme = useTheme();
  const danger = tone === "danger";

  return (
    <View className="flex-row items-center gap-3">
      <View
        className={`h-7 w-7 items-center justify-center rounded-checkbox ${danger ? "bg-bad-tint" : "bg-sun-tint"}`}
      >
        <Ionicons
          name={icon}
          size={14}
          color={danger ? theme.bad : theme.lagoon}
        />
      </View>
      <Text
        className={`ds-text-list-subtitle flex-1 ${danger ? "text-bad" : "text-ink-2"}`}
      >
        {text}
      </Text>
    </View>
  );
}
