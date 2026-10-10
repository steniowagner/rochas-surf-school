import { Ionicons } from "@expo/vector-icons";
import { ComponentProps } from "react";

export type ChoiceRowProps = {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
  onPress: () => void;
};
