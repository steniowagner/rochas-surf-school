import { TextProps } from "react-native";

export type TextButtonProps = Omit<TextProps, "onPress"> & {
  onPress?: () => void;
};
