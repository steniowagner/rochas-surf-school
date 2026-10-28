import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type RemovalInfoRowProps = {
  icon: ComponentProps<typeof Ionicons>["name"];
  text: string;
  /** `danger` draws the row in the bad colors, for what can't be undone. */
  tone?: "default" | "danger";
};
