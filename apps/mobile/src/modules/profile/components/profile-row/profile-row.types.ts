import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";

export type ProfileRowProps = {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  /** A short value on the right, in the secondary ink. */
  value?: string;
  /** Makes the row pressable. Without it the row is static (a switch row). */
  onPress?: () => void;
  /** Hides the chevron of a pressable row (the sign-out row). */
  hideChevron?: boolean;
  /** Draws the icon and the label in the danger color (removing the account). */
  destructive?: boolean;
  /** Replaces the value and the chevron (a switch). */
  trailing?: ReactNode;
};
