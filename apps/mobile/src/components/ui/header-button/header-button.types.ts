import type { ComponentProps } from "react";

import type { Ionicons } from "@expo/vector-icons";

export type HeaderButtonProps = {
  /** The Ionicons glyph. */
  icon: ComponentProps<typeof Ionicons>["name"];
  /** What a screen reader says: the button has no visible label. */
  label: string;
  onPress: () => void;
};
