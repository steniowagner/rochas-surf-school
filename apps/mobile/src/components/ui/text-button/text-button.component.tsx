import { useState } from "react";
import { Text } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";

import { TextButtonProps } from "./text-button.types";

/**
 * A pressable piece of text, for links inside a sentence. It's a nested `Text` because a
 * `TouchableOpacity` can't wrap part of a line of text.
 */
export function TextButton({
  onPress,
  className = "",
  style,
  ...props
}: TextButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Text
      accessibilityRole="link"
      className={`font-body-800 underline ${className}`}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[isPressed ? { opacity: BUTTON_ACTIVE_OPACITY } : null, style]}
      suppressHighlighting
      {...props}
    />
  );
}
