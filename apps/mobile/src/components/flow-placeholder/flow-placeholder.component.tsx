import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FlowPlaceholderProps } from "./flow-placeholder.types";

// The entry screen of a flow whose real screens don't exist yet: only the flow's name.
export function FlowPlaceholder({ title }: FlowPlaceholderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 items-center justify-center bg-page px-screen"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Text
        accessibilityRole="header"
        className="ds-text-screen-title text-center text-ink"
      >
        {title}
      </Text>
    </View>
  );
}
