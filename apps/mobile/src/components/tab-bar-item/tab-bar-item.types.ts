import type { Feather, FontAwesome6, Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

/** A glyph of the Ionicons, Feather or FontAwesome 6 set (its regular style). */
export type TabBarIcon =
  | { set: "Ionicons"; name: ComponentProps<typeof Ionicons>["name"] }
  | { set: "Feather"; name: ComponentProps<typeof Feather>["name"] }
  | { set: "FontAwesome6"; name: ComponentProps<typeof FontAwesome6>["name"] };

export type TabBarItemProps = {
  label: string;
  icon: TabBarIcon;
  selected: boolean;
  onPress: () => void;
};
