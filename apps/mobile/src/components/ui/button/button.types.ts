import { TouchableOpacityProps } from "react-native";

export type ButtonVariant =
  "primary" | "dark" | "outline" | "subtle" | "danger" | "ghost";

export type ButtonProps = Omit<TouchableOpacityProps, "children"> & {
  variant?: ButtonVariant;
  className?: string;
  children: string;
  /** Shows a spinner instead of the label and ignores presses. */
  loading?: boolean;
};
