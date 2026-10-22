import type { ComponentProps } from "react";

import type { Ionicons } from "@expo/vector-icons";

export type HeaderButtonProps = {
  /** The Ionicons glyph. */
  icon: ComponentProps<typeof Ionicons>["name"];
  /** The glyph's size in points; 24 by default. */
  iconSize?: number;
  /** What a screen reader says: the button has no visible label. */
  label: string;
  onPress?: () => void;
  /** A count in a `bad` pill over the icon's top right (unread notifications); `0` or none hides it. */
  badge?: number;
  /**
   * Outside a native header (the user header): draws the 44pt circle the header gives its items, Liquid Glass
   * where the system has it (iOS 26+) and just the icon elsewhere, so both look the same.
   */
  standalone?: boolean;
};

export type UseHeaderButtonProps = Pick<HeaderButtonProps, "badge" | "standalone">;
