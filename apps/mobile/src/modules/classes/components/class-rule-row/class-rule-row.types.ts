import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type ClassRuleRowProps = {
  icon: ComponentProps<typeof Ionicons>["name"];
  /** Drawn small and uppercase. */
  title: string;
  /** Drawn bold under the title; the row shows the title alone without it. */
  value?: string | null;
  onPress: () => void;
};
