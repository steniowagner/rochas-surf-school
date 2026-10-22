import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type ClassToolCardProps = {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  /** Drawn small under the title. */
  subtitle: string;
  /** `danger` draws the card on `bad-tint`, with the title and the icon in `bad`. */
  tone?: "default" | "danger";
  /** Faded, marked disabled, and pressing it does nothing. */
  disabled?: boolean;
  onPress?: () => void;
};
